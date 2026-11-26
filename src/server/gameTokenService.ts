/**
 * Server-Side P2R Game Token Service
 *
 * Securely acquires and caches Game Runtime Access Tokens from P2R Core API.
 * Keeps P2R_CLIENT_SECRET strictly server-side, verifies caller player Bearer
 * authentication against P2R `/auth/me`, and deduplicates concurrent refreshes.
 */

import crypto from "crypto";
import dotenv from "dotenv";
import path from "path";

export interface GameTokenData {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  expires_at: string;
  game: {
    slug: string;
  };
}

export interface GameTokenServiceConfig {
  apiBaseUrl: string;
  gameSlug: string;
  platform: string;
  clientId: string;
  clientSecret: string;
}

export interface GameTokenHttpResult {
  status: number;
  body: {
    success: boolean;
    message: string;
    data?: GameTokenData;
  };
}

export class PlayerAuthError extends Error {
  public readonly status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "PlayerAuthError";
    this.status = status;
  }
}

interface CachedToken {
  data: GameTokenData;
  expiresAtMs: number;
}

// Proactive refresh window: refresh 60 seconds before token expires
const REFRESH_BUFFER_MS = 60 * 1000;
// Short-lived cache for verified player Bearer tokens to avoid spamming /auth/me
const PLAYER_AUTH_CACHE_TTL_MS = 30 * 1000;

let memoryCache: CachedToken | null = null;
let inFlightTokenRequest: Promise<GameTokenData> | null = null;
const verifiedPlayerCache = new Map<string, number>();

/**
 * Resolves current server-side configuration from environment variables.
 */
export function resolveConfig(overrides?: Partial<GameTokenServiceConfig>): GameTokenServiceConfig {
  if (typeof process !== "undefined" && !process.env.P2R_CLIENT_ID) {
    try {
      dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
      dotenv.config({ path: path.resolve(process.cwd(), ".env") });
    } catch {
      // ignore
    }
  }

  return {
    apiBaseUrl: (overrides?.apiBaseUrl || process.env.P2R_API_BASE_URL || "https://pameran.devsaka.id/api/v1").replace(/\/+$/, ""),
    gameSlug: overrides?.gameSlug || process.env.P2R_GAME_SLUG || "pixeltype",
    platform: overrides?.platform || process.env.P2R_PLATFORM || "web",
    clientId: overrides?.clientId || process.env.P2R_CLIENT_ID || "",
    clientSecret: overrides?.clientSecret || process.env.P2R_CLIENT_SECRET || "",
  };
}

/**
 * Reset memory cache and in-flight state (useful for testing or manual invalidation).
 */
export function clearGameTokenCache(): void {
  memoryCache = null;
  inFlightTokenRequest = null;
  verifiedPlayerCache.clear();
}

/**
 * Inspect currently cached token (if still valid).
 */
export function getCachedToken(): GameTokenData | null {
  if (memoryCache && Date.now() < memoryCache.expiresAtMs - REFRESH_BUFFER_MS) {
    return memoryCache.data;
  }
  return null;
}

function hashTokenKey(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function extractBearerToken(authHeader?: string | null): string | null {
  if (typeof authHeader !== "string") {
    return null;
  }
  const match = authHeader.trim().match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

/**
 * Verifies an incoming player Authorization Bearer token against P2R `/auth/me`.
 * Reuses P2R Sanctum authentication without creating a parallel auth system.
 */
export async function verifyPlayerBearerToken(
  authHeader: string | null | undefined,
  config: Pick<GameTokenServiceConfig, "apiBaseUrl">,
  fetchFn: typeof fetch = fetch
): Promise<void> {
  const bearerToken = extractBearerToken(authHeader);
  if (!bearerToken) {
    throw new PlayerAuthError("Authentication required. Provide a valid Bearer player token.", 401);
  }

  const cacheKey = hashTokenKey(bearerToken);
  const now = Date.now();
  const cachedExpiry = verifiedPlayerCache.get(cacheKey);
  if (cachedExpiry && now < cachedExpiry) {
    return;
  }

  // Opportunistic cleanup of expired auth entries
  for (const [key, exp] of verifiedPlayerCache.entries()) {
    if (exp <= now) {
      verifiedPlayerCache.delete(key);
    }
  }

  const endpoint = `${config.apiBaseUrl.replace(/\/+$/, "")}/auth/me`;

  let response: Response;
  try {
    response = await fetchFn(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${bearerToken}`,
        "User-Agent": "PixelType-GameEngine/1.0",
      },
    });
  } catch (netErr) {
    const errorMsg = netErr instanceof Error ? netErr.message : "Network error";
    throw new PlayerAuthError(`Failed to verify player authentication with P2R API: ${errorMsg}`, 502);
  }

  if (response.status === 401 || response.status === 403) {
    verifiedPlayerCache.delete(cacheKey);
    throw new PlayerAuthError("Invalid or expired player authentication token.", 401);
  }

  if (!response.ok) {
    throw new PlayerAuthError(`P2R player authentication check failed (HTTP ${response.status}).`, 502);
  }

  verifiedPlayerCache.set(cacheKey, Date.now() + PLAYER_AUTH_CACHE_TTL_MS);
}

/**
 * Performs token exchange with P2R Core API.
 */
export async function requestGameTokenFromApi(
  config: GameTokenServiceConfig,
  fetchFn: typeof fetch = fetch
): Promise<GameTokenData> {
  if (!config.clientId || !config.clientSecret) {
    throw new Error(
      "Missing server-side P2R credentials. Ensure P2R_CLIENT_ID and P2R_CLIENT_SECRET are configured in the server environment."
    );
  }

  const endpoint = `${config.apiBaseUrl}/games/${encodeURIComponent(config.gameSlug)}/auth/token`;

  const payload = {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    platform: config.platform,
  };

  let response: Response;
  try {
    response = await fetchFn(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "PixelType-GameEngine/1.0",
      },
      body: JSON.stringify(payload),
    });
  } catch (netErr) {
    const errorMsg = netErr instanceof Error ? netErr.message : "Network error";
    throw new Error(`Failed to reach P2R API token endpoint: ${errorMsg}`);
  }

  const responseText = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(responseText);
  } catch {
    // If not JSON, handle cleanly
  }

  if (!response.ok || (json && json.success === false)) {
    const statusMsg = json?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(`P2R Game Token acquisition failed: ${statusMsg}`);
  }

  const tokenData = json?.data;
  if (!tokenData || !tokenData.access_token) {
    throw new Error("P2R API returned successful status but missing access_token in response body.");
  }

  const expiresIn = typeof tokenData.expires_in === "number" ? tokenData.expires_in : 900;
  const now = Date.now();
  const expiresAtMs = now + expiresIn * 1000;
  const expiresAt = new Date(expiresAtMs).toISOString();

  const result: GameTokenData = {
    access_token: tokenData.access_token,
    token_type: "Bearer",
    expires_in: expiresIn,
    expires_at: expiresAt,
    game: {
      slug: config.gameSlug,
    },
  };

  // Cache token in memory
  memoryCache = {
    data: result,
    expiresAtMs,
  };

  return result;
}

/**
 * Get a valid Game Access Token.
 * Returns cached token if still within validity window; otherwise deduplicates
 * concurrent upstream token exchanges via a shared in-flight promise.
 */
export async function getOrFetchGameToken(
  options: {
    forceRefresh?: boolean;
    config?: Partial<GameTokenServiceConfig>;
    fetchFn?: typeof fetch;
  } = {}
): Promise<GameTokenData> {
  const config = resolveConfig(options.config);

  if (options.forceRefresh) {
    memoryCache = null;
  } else if (memoryCache) {
    const remainingMs = memoryCache.expiresAtMs - Date.now();
    if (remainingMs > REFRESH_BUFFER_MS) {
      return memoryCache.data;
    }
  }

  if (inFlightTokenRequest) {
    return inFlightTokenRequest;
  }

  const request = requestGameTokenFromApi(config, options.fetchFn).finally(() => {
    inFlightTokenRequest = null;
  });

  inFlightTokenRequest = request;
  return request;
}

/**
 * Shared HTTP handler for `POST /api/bff/game-token` (Express & Vite dev middleware).
 * Enforces valid P2R player Bearer auth (HTTP 401 when missing/invalid) before
 * issuing a server-cached game access token.
 */
export async function handleGameTokenRequest(options: {
  authHeader?: string | null;
  forceRefresh?: boolean;
  config?: Partial<GameTokenServiceConfig>;
  fetchFn?: typeof fetch;
}): Promise<GameTokenHttpResult> {
  const config = resolveConfig(options.config);

  try {
    await verifyPlayerBearerToken(options.authHeader, config, options.fetchFn);
  } catch (err: unknown) {
    if (err instanceof PlayerAuthError) {
      return {
        status: err.status,
        body: {
          success: false,
          message: err.message,
        },
      };
    }
    return {
      status: 401,
      body: {
        success: false,
        message: "Authentication required.",
      },
    };
  }

  try {
    const tokenData = await getOrFetchGameToken({
      forceRefresh: options.forceRefresh,
      config,
      fetchFn: options.fetchFn,
    });

    return {
      status: 200,
      body: {
        success: true,
        message: "Game access token issued successfully.",
        data: tokenData,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to acquire game access token";
    return {
      status: 500,
      body: {
        success: false,
        message,
      },
    };
  }
}
