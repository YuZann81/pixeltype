import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  resolveConfig,
  clearGameTokenCache,
  getCachedToken,
  requestGameTokenFromApi,
  getOrFetchGameToken,
  type GameTokenServiceConfig,
} from "../gameTokenService.ts";

describe("P2R Game Token Service", () => {
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

  test("requestGameTokenFromApi exchanges credentials and returns token data with expiry", async () => {
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
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }) as typeof fetch;

    const config: GameTokenServiceConfig = {
      apiBaseUrl: "https://pameran.devsaka.id/api/v1",
      gameSlug: "pixeltype",
      platform: "web",
      clientId: "p2r_game_testclient",
      clientSecret: "sec_testsecret123",
    };

    const before = Date.now();
    const result = await requestGameTokenFromApi(config, mockFetch);
    const after = Date.now();

    assert.equal(requestedUrl, "https://pameran.devsaka.id/api/v1/games/pixeltype/auth/token");
    assert.equal(requestedMethod, "POST");
    assert.equal(requestedBody.client_id, "p2r_game_testclient");
    assert.equal(requestedBody.client_secret, "sec_testsecret123");
    assert.equal(requestedBody.platform, "web");

    assert.equal(result.access_token, mockToken);
    assert.equal(result.token_type, "Bearer");
    assert.equal(result.expires_in, 900);
    assert.equal(result.game.slug, "pixeltype");

    // Verify client_secret is NOT exposed in result
    assert.equal((result as any).client_secret, undefined);

    // Verify ISO string date validity
    const expiryDate = new Date(result.expires_at).getTime();
    assert.ok(expiryDate >= before + 900 * 1000);
    assert.ok(expiryDate <= after + 900 * 1000);

    // Verify token was cached
    const cached = getCachedToken();
    assert.ok(cached !== null);
    assert.equal(cached.access_token, mockToken);
  });

  test("getOrFetchGameToken returns cached token on subsequent calls without re-fetching", async () => {
    let fetchCount = 0;
    const mockFetch = (async () => {
      fetchCount++;
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

    const first = await getOrFetchGameToken({ config, fetchFn: mockFetch });
    assert.equal(fetchCount, 1);
    assert.equal(first.access_token, "token_v1");

    // Second call should return cached token without invoking fetch again
    const second = await getOrFetchGameToken({ config, fetchFn: mockFetch });
    assert.equal(fetchCount, 1);
    assert.equal(second.access_token, "token_v1");

    // With forceRefresh: true, should fetch fresh token
    const refreshed = await getOrFetchGameToken({ forceRefresh: true, config, fetchFn: mockFetch });
    assert.equal(fetchCount, 2);
    assert.equal(refreshed.access_token, "token_v2");
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
