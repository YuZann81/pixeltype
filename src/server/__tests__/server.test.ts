import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import type { AddressInfo } from "net";
import type { Server } from "http";
import { createApp } from "../index.ts";
import { clearGameTokenCache } from "../gameTokenService.ts";

describe("PixelType Production Express Runtime", () => {
  let tempDistDir: string;
  let server: Server;
  let baseUrl: string;
  let upstreamCalls: Array<{ url: string; method: string; headers: Record<string, string> }> = [];

  const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = String(url);
    const method = (init?.method || "GET").toUpperCase();
    const headers = (init?.headers as Record<string, string>) || {};
    upstreamCalls.push({ url: urlStr, method, headers });

    if (urlStr === "https://p2r.test/api/v1/auth/me") {
      if (headers.Authorization === "Bearer valid_player_token") {
        return new Response(
          JSON.stringify({ success: true, data: { id: 1, name: "Tester" } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, message: "Unauthenticated." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (urlStr === "https://p2r.test/api/v1/games/pixeltype/auth/token") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Game access token issued successfully.",
          data: {
            token_type: "Bearer",
            expires_in: 900,
            access_token: "runtime_game_jwt_123",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (urlStr === "https://p2r.test/api/v1/games/pixeltype/leaderboard") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Leaderboard retrieved successfully.",
          data: {
            game: { id: "g1", slug: "pixeltype", title: "PixelType" },
            event: null,
            direction: "higher_is_better",
            total_players: 0,
            leaderboard: [],
            my_rank: null,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: "Not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  before(async () => {
    tempDistDir = fs.mkdtempSync(path.join(os.tmpdir(), "pixeltype-dist-"));
    fs.mkdirSync(path.join(tempDistDir, "assets"), { recursive: true });
    fs.writeFileSync(
      path.join(tempDistDir, "index.html"),
      "<!doctype html><html><body><div id='root'>PIXELTYPE_SPA</div></body></html>",
      "utf8"
    );
    fs.writeFileSync(
      path.join(tempDistDir, "assets", "bundle.js"),
      "console.log('pixeltype-static-asset');",
      "utf8"
    );

    const app = createApp({
      distPath: tempDistDir,
      tokenConfig: {
        apiBaseUrl: "https://p2r.test/api/v1",
        gameSlug: "pixeltype",
        platform: "web",
        clientId: "test_runtime_client",
        clientSecret: "super_secret_never_expose",
      },
      fetchFn: mockFetch,
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tempDistDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    clearGameTokenCache();
    upstreamCalls = [];
  });

  test("serves /health and /api/health with HTTP 200 JSON", async () => {
    for (const endpoint of ["/health", "/api/health"]) {
      const res = await fetch(`${baseUrl}${endpoint}`);
      assert.equal(res.status, 200);
      const body = (await res.json()) as { status: string; service: string; timestamp: string };
      assert.equal(body.status, "ok");
      assert.equal(body.service, "pixeltype-server");
      assert.ok(typeof body.timestamp === "string" && body.timestamp.length > 0);
    }
  });

  test("serves static Vite assets from dist/assets with immutable cache header", async () => {
    const res = await fetch(`${baseUrl}/assets/bundle.js`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes("pixeltype-static-asset"));
    assert.ok((res.headers.get("cache-control") || "").includes("immutable"));
  });

  test("serves SPA index.html for root and client-side routes", async () => {
    for (const route of ["/", "/gameplay", "/leaderboard", "/overview", "/login"]) {
      const res = await fetch(`${baseUrl}${route}`);
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.ok(html.includes("PIXELTYPE_SPA"), `Expected SPA HTML for ${route}`);
    }
  });

  test("returns JSON 404 for unknown /api/* routes instead of SPA HTML", async () => {
    const res = await fetch(`${baseUrl}/api/does-not-exist`);
    assert.equal(res.status, 404);
    const body = (await res.json()) as { success: boolean; message: string };
    assert.equal(body.success, false);
  });

  test("rejects unauthenticated and invalid-token POST /api/bff/game-token with HTTP 401", async () => {
    const unauth = await fetch(`${baseUrl}/api/bff/game-token`, { method: "POST" });
    assert.equal(unauth.status, 401);
    const unauthBody = (await unauth.json()) as { success: boolean };
    assert.equal(unauthBody.success, false);

    const invalid = await fetch(`${baseUrl}/api/bff/game-token`, {
      method: "POST",
      headers: { Authorization: "Bearer invalid_token" },
    });
    assert.equal(invalid.status, 401);
  });

  test("issues game token for valid player Bearer token without exposing P2R_CLIENT_SECRET", async () => {
    const res = await fetch(`${baseUrl}/api/bff/game-token`, {
      method: "POST",
      headers: { Authorization: "Bearer valid_player_token" },
    });

    assert.equal(res.status, 200);
    const raw = await res.text();
    assert.equal(raw.includes("super_secret_never_expose"), false);
    const body = JSON.parse(raw) as { success: boolean; data: { access_token: string } };
    assert.equal(body.success, true);
    assert.equal(body.data.access_token, "runtime_game_jwt_123");
  });

  test("proxies /api/p2r/* to upstream P2R API without attaching client secret", async () => {
    const res = await fetch(`${baseUrl}/api/p2r/games/pixeltype/leaderboard`, {
      headers: { Authorization: "Bearer valid_player_token" },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; data: { game: { slug: string } } };
    assert.equal(body.success, true);
    assert.equal(body.data.game.slug, "pixeltype");
    assert.equal(upstreamCalls.length, 1);
    assert.equal(upstreamCalls[0].url, "https://p2r.test/api/v1/games/pixeltype/leaderboard");
    assert.equal(JSON.stringify(upstreamCalls[0].headers).includes("super_secret_never_expose"), false);
  });
});
