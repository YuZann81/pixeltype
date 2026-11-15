/**
 * Server-Side P2R Game Token Service
 *
 * Securely acquires and caches Game Runtime Access Tokens from P2R Core API.
 * Keeps P2R_CLIENT_SECRET strictly server-side and manages token lifecycle.
 */

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

interface CachedToken {
  data: GameTokenData;
  expiresAtMs: number;
}

// Proactive refresh window: refresh 60 seconds before token expires
const REFRESH_BUFFER_MS = 60 * 1000;

let memoryCache: CachedToken | null = null;

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
 * Reset memory cache (useful for testing or manual invalidation).
 */
export function clearGameTokenCache(): void {
  memoryCache = null;
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
        "Accept": "application/json",
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
  const expiresAtMs = now + (expiresIn * 1000);
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
 * Returns cached token if still within validity window; otherwise fetches a fresh one.
 */
export async function getOrFetchGameToken(
  options: {
    forceRefresh?: boolean;
    config?: Partial<GameTokenServiceConfig>;
    fetchFn?: typeof fetch;
  } = {}
): Promise<GameTokenData> {
  const config = resolveConfig(options.config);

  if (!options.forceRefresh && memoryCache) {
    const remainingMs = memoryCache.expiresAtMs - Date.now();
    if (remainingMs > REFRESH_BUFFER_MS) {
      return memoryCache.data;
    }
  }

  return requestGameTokenFromApi(config, options.fetchFn);
}
