import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  resolveConfig,
  clearGameTokenCache,
  getCachedToken,
  requestGameTokenFromApi,
  getOrFetchGameToken,
  handleGameTokenRequest,
  type GameTokenServiceConfig,
} from "../gameTokenService.ts";

describe("P2R Game Token Service & Auth Guard", () => {
  beforeEach(() => {
    clearGameTokenCache();
  });

  test("resolveConfig resolves defaults and overrides correctly", () => {
    const config = resolveConfig({
      apiBaseUrl: "https://example.com/api/v1/",
      gameSlug: "custom-game",
      platform: "desktop",
      clientId: "client_123",
      clientSecret: "secret_abc",
    });

    assert.equal(config.apiBaseUrl, "https://example.com/api/v1");
    assert.equal(config.gameSlug, "custom-game");
    assert.equal(config.platform, "desktop");
    assert.equal(config.clientId, "client_123");
    assert.equal(config.clientSecret, "secret_abc");
  });

  test("requestGameTokenFromApi throws clear error if client credentials are missing", async () => {
    const config: GameTokenServiceConfig = {
      apiBaseUrl: "https://example.com/api/v1",
      gameSlug: "pixeltype",
      platform: "web",
      clientId: "",
      clientSecret: "",
    };

    await assert.rejects(
      async () => {
        await requestGameTokenFromApi(config);
      },
      {
        message: /Missing server-side P2R credentials/,
      }
    );
  });

  test("requestGameTokenFromApi exchanges credentials and never exposes client_secret", async () => {
    const mockToken = "mock_jwt_signed_game_access_token_xyz123";
    const mockExpiresIn = 900;

    let requestedUrl = "";
    let requestedMethod = "";
    let requestedBody: any = null;

    const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      requestedUrl = String(url);
      requestedMethod = init?.method || "GET";
      requestedBody = JSON.parse(String(init?.body || "{}"));

      return new Response(
        JSON.stringify({
          success: true,
          message: "Game access token issued successfully.",
          data: {
            token_type: "Bearer",
            expires_in: mockExpiresIn,
            access_token: mockToken,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    const config: GameTokenServiceConfig = {
      apiBaseUrl: "https://pameran.devsaka.id/api/v1",
      gameSlug: "pixeltype",
      platform: "web",
      clientId: "test_client_id",
      clientSecret: "test_client_secret",
    };

    const before = Date.now();
    const result = await requestGameTokenFromApi(config, mockFetch);
    const after = Date.now();

    assert.equal(requestedUrl, "https://pameran.devsaka.id/api/v1/games/pixeltype/auth/token");
    assert.equal(requestedMethod, "POST");
    assert.equal(requestedBody.client_id, "test_client_id");
    assert.equal(requestedBody.client_secret, "test_client_secret");
    assert.equal(requestedBody.platform, "web");

    assert.equal(result.access_token, mockToken);
    assert.equal(result.token_type, "Bearer");
    assert.equal(result.expires_in, 900);
    assert.equal(result.game.slug, "pixeltype");
    assert.equal((result as any).client_secret, undefined);

    const expiryDate = new Date(result.expires_at).getTime();
    assert.ok(expiryDate >= before + 900 * 1000);
    assert.ok(expiryDate <= after + 900 * 1000);

    const cached = getCachedToken();
    assert.ok(cached !== null);
    assert.equal(cached.access_token, mockToken);
  });

  test("getOrFetchGameToken caches token, deduplicates concurrent in-flight requests, and supports forceRefresh", async () => {
    let fetchCount = 0;
    const mockFetch = (async () => {
      fetchCount++;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            token_type: "Bearer",
            expires_in: 900,
            access_token: `token_v${fetchCount}`,
          },
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const config: Partial<GameTokenServiceConfig> = {
      clientId: "test_client",
      clientSecret: "test_secret",
    };

    // 3 concurrent calls share a single upstream request
    const [a, b, c] = await Promise.all([
      getOrFetchGameToken({ config, fetchFn: mockFetch }),
      getOrFetchGameToken({ config, fetchFn: mockFetch }),
      getOrFetchGameToken({ config, fetchFn: mockFetch }),
    ]);
    assert.equal(fetchCount, 1);
    assert.equal(a.access_token, "token_v1");
    assert.equal(b.access_token, "token_v1");
    assert.equal(c.access_token, "token_v1");

    // Subsequent call hits cache without fetching
    const cached = await getOrFetchGameToken({ config, fetchFn: mockFetch });
    assert.equal(fetchCount, 1);
    assert.equal(cached.access_token, "token_v1");

    // forceRefresh fetches fresh token
    const refreshed = await getOrFetchGameToken({ forceRefresh: true, config, fetchFn: mockFetch });
    assert.equal(fetchCount, 2);
    assert.equal(refreshed.access_token, "token_v2");
  });

  test("handleGameTokenRequest rejects missing, malformed, or invalid player Bearer tokens with HTTP 401", async () => {
    let authCalls = 0;
    let tokenCalls = 0;

    const mockFetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.endsWith("/auth/me")) {
        authCalls++;
        return new Response(JSON.stringify({ success: false, message: "Unauthenticated." }), {
          status: 401,
        });
      }
      tokenCalls++;
      return new Response(JSON.stringify({ success: true, data: { access_token: "should_not_issue" } }), {
        status: 200,
      });
    }) as typeof fetch;

    const config: Partial<GameTokenServiceConfig> = {
      apiBaseUrl: "https://example.com/api/v1",
      clientId: "test_client",
      clientSecret: "test_secret",
    };

    const missing = await handleGameTokenRequest({ authHeader: undefined, config, fetchFn: mockFetch });
    assert.equal(missing.status, 401);
    assert.equal(missing.body.success, false);
    assert.equal(authCalls, 0);
    assert.equal(tokenCalls, 0);

    const malformed = await handleGameTokenRequest({ authHeader: "Basic abc", config, fetchFn: mockFetch });
    assert.equal(malformed.status, 401);
    assert.equal(authCalls, 0);
    assert.equal(tokenCalls, 0);

    const invalid = await handleGameTokenRequest({ authHeader: "Bearer invalid_tok", config, fetchFn: mockFetch });
    assert.equal(invalid.status, 401);
    assert.equal(authCalls, 1);
    assert.equal(tokenCalls, 0);
  });

  test("handleGameTokenRequest issues game token after verifying valid player Bearer token via /auth/me", async () => {
    const calls: string[] = [];

    const mockFetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      calls.push(urlStr);
      if (urlStr.endsWith("/auth/me")) {
        return new Response(
          JSON.stringify({ success: true, data: { id: 42, name: "PlayerOne" } }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            token_type: "Bearer",
            expires_in: 900,
            access_token: "game_tok_valid_1",
          },
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const config: Partial<GameTokenServiceConfig> = {
      apiBaseUrl: "https://example.com/api/v1",
      gameSlug: "pixeltype",
      clientId: "test_client",
      clientSecret: "test_secret",
    };

    const first = await handleGameTokenRequest({
      authHeader: "Bearer valid_player_tok",
      config,
      fetchFn: mockFetch,
    });
    assert.equal(first.status, 200);
    assert.equal(first.body.success, true);
    assert.equal(first.body.data?.access_token, "game_tok_valid_1");
    assert.equal(JSON.stringify(first.body).includes("test_secret"), false);
    assert.deepEqual(calls, [
      "https://example.com/api/v1/auth/me",
      "https://example.com/api/v1/games/pixeltype/auth/token",
    ]);

    // Subsequent call within TTL reuses both player auth cache and game token cache
    const second = await handleGameTokenRequest({
      authHeader: "Bearer valid_player_tok",
      config,
      fetchFn: mockFetch,
    });
    assert.equal(second.status, 200);
    assert.equal(calls.length, 2);
  });

  test("requestGameTokenFromApi handles server errors cleanly", async () => {
    const mockFetch = (async () => {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid client credentials provided.",
        }),
        { status: 401 }
      );
    }) as typeof fetch;

    const config: GameTokenServiceConfig = {
      apiBaseUrl: "https://example.com/api/v1",
      gameSlug: "pixeltype",
      platform: "web",
      clientId: "wrong_id",
      clientSecret: "wrong_secret",
    };

    await assert.rejects(
      async () => {
        await requestGameTokenFromApi(config, mockFetch);
      },
      {
        message: /Invalid client credentials provided/,
      }
    );
  });
});
