import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  startSession,
  completeSession,
  getLeaderboard,
  type StartSessionRequest,
  type CompleteSessionRequest,
} from "../p2r.ts";
import {
  formatPixelTypeTelemetry,
  validatePixelTypeTelemetry,
  MAX_P2R_SESSION_SCORE,
} from "../scoringAdapter.ts";

describe("Session Lifecycle, Global Event & Leaderboard Request Contracts", () => {
  test("startSession sends Authorization + X-Game-Access-Token and omits event_id for server-side global event resolution", async () => {
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
              event_id: "global_evt_1",
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
      assert.equal("event_id" in capturedBody, false);

      assert.equal(result.data.session.id, "sess_12345");
      assert.equal(result.data.session.event_id, "global_evt_1");
      assert.equal(result.data.session_token, "plain_session_token_abc987");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("completeSession submits bounded authoritative score (<= 600) and valid 3x30s telemetry", async () => {
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
              score: Math.round((capturedBody.best_score || 0) * 100),
              score_scale: 100,
              display_score: capturedBody.best_score,
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
        { language: "IND" }
      );

      validatePixelTypeTelemetry(telemetry);
      assert.ok((telemetry.score ?? 0) >= 0 && (telemetry.score ?? 0) <= MAX_P2R_SESSION_SCORE);

      const payload: CompleteSessionRequest = {
        session_token: "plain_session_token_abc987",
        best_score: telemetry.score,
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
      assert.equal(capturedBody.best_score, telemetry.score);

      const rounds = capturedBody.data.rounds;
      assert.equal(rounds.length, 3);
      for (const r of rounds) {
        assert.equal(r.duration, 30);
        assert.equal(r.characters_typed, r.correct_characters + r.incorrect_characters);
      }

      assert.equal(result.data.session.status, "completed");
      assert.equal(result.data.result?.display_score, telemetry.score);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("getLeaderboard queries /games/pixeltype/leaderboard without event_id or empty game token header", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedHeaders = (init?.headers as Record<string, string>) || {};

      return new Response(
        JSON.stringify({
          success: true,
          message: "Leaderboard retrieved successfully.",
          data: {
            game: { id: "g-1", slug: "pixeltype", title: "PixelType" },
            event: { id: "ev-1", slug: "p2r-2026", name: "P2R 2026" },
            direction: "higher_is_better",
            total_players: 0,
            leaderboard: [],
            my_rank: null,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    try {
      await getLeaderboard("pixeltype", undefined, { token: "player_sanctum_token_456" });

      assert.ok(capturedUrl.includes("/games/pixeltype/leaderboard"));
      assert.equal(capturedUrl.includes("event_id"), false);
      assert.equal(capturedHeaders["Authorization"], "Bearer player_sanctum_token_456");
      assert.equal(capturedHeaders["X-Game-Access-Token"], undefined);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
