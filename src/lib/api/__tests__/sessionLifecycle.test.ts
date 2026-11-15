import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { startSession, completeSession, type StartSessionRequest, type CompleteSessionRequest } from "../p2r.ts";
import { formatPixelTypeTelemetry } from "../scoringAdapter.ts";

describe("Session Lifecycle & Request Contracts", () => {
  test("startSession formats request with both Authorization and X-Game-Access-Token headers", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedMethod = init?.method || "";
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      capturedBody = JSON.parse(String(init?.body || "{}"));

      return new Response(
        JSON.stringify({
          success: true,
          message: "Game session started successfully.",
          data: {
            session: {
              id: "sess_12345",
              status: "active",
              game: "pixeltype",
              event_id: null,
              platform: "web",
              started_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 600000).toISOString(),
            },
            session_token: "plain_session_token_abc987",
            is_replayed: false,
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    try {
      const payload: StartSessionRequest = {
        platform: "web",
        game_version: "1.0",
        idempotency_key: "idem_key_start_1",
        metadata: { language: "IND" },
      };

      const result = await startSession("pixeltype", payload, {
        playerToken: "player_sanctum_token_456",
        gameToken: "game_jwt_token_789",
      });

      assert.equal(capturedMethod, "POST");
      assert.ok(capturedUrl.includes("/games/pixeltype/sessions/start"));
      assert.equal(capturedHeaders["Authorization"], "Bearer player_sanctum_token_456");
      assert.equal(capturedHeaders["X-Game-Access-Token"], "game_jwt_token_789");
      assert.equal(capturedBody.platform, "web");
      assert.equal(capturedBody.idempotency_key, "idem_key_start_1");

      assert.equal(result.data.session.id, "sess_12345");
      assert.equal(result.data.session_token, "plain_session_token_abc987");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("completeSession submits authoritative scoring telemetry conforming to PixelType adapter", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedMethod = init?.method || "";
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      capturedBody = JSON.parse(String(init?.body || "{}"));

      return new Response(
        JSON.stringify({
          success: true,
          message: "Session completed and score recorded.",
          data: {
            session: {
              id: "sess_12345",
              status: "completed",
              completed_at: new Date().toISOString(),
            },
            result: {
              id: "res_999",
              score: 3500,
              score_scale: 100,
              display_score: 3500,
              formula_version: "v1.0",
              data: capturedBody.data,
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    try {
      const telemetry = formatPixelTypeTelemetry(
        [
          { duration: 30, characters_typed: 120, correct_characters: 115, incorrect_characters: 5 },
          { duration: 30, characters_typed: 130, correct_characters: 125, incorrect_characters: 5 },
          { duration: 30, characters_typed: 140, correct_characters: 135, incorrect_characters: 5 },
        ],
        { language: "IND", finalScore: 3500 }
      );

      const payload: CompleteSessionRequest = {
        session_token: "plain_session_token_abc987",
        best_score: 3500,
        data: telemetry as unknown as Record<string, unknown>,
      };

      const result = await completeSession("pixeltype", "sess_12345", payload, {
        playerToken: "player_sanctum_token_456",
        gameToken: "game_jwt_token_789",
      });

      assert.equal(capturedMethod, "POST");
      assert.ok(capturedUrl.includes("/games/pixeltype/sessions/sess_12345/complete"));
      assert.equal(capturedHeaders["Authorization"], "Bearer player_sanctum_token_456");
      assert.equal(capturedHeaders["X-Game-Access-Token"], "game_jwt_token_789");
      assert.equal(capturedBody.session_token, "plain_session_token_abc987");
      assert.equal(capturedBody.best_score, 3500);

      // Verify rounds in data payload
      const rounds = capturedBody.data.rounds;
      assert.equal(rounds.length, 3);
      for (const r of rounds) {
        assert.equal(r.duration, 30);
        assert.equal(r.characters_typed, r.correct_characters + r.incorrect_characters);
      }

      assert.equal(result.data.session.status, "completed");
      assert.equal(result.data.result?.display_score, 3500);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
