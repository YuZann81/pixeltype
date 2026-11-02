/**
 * P2R API Endpoints - Typed endpoints for P2R API integration.
 * All endpoints use the base API client.
 */

import {
  apiGet,
  apiPost,
  apiPostForm,
  apiDelete,
  ApiRequestOptions,
  ApiError,
} from "./client.js";

/**
 * Authentication
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: P2RUser;
}

export interface P2RUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  user_type: string | null;
  class_grade: string | null;
  major: string | null;
  teacher_role: string | null;
  wallet?: {
    id: string;
    balance: number;
  };
  created_at: string;
  updated_at: string;
}

export interface MeResponse {
  user: P2RUser;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: P2RUser;
  };
}

export async function login(credentials: LoginRequest, options?: ApiRequestOptions) {
  const formData = new URLSearchParams();
  formData.append("email", credentials.email);
  formData.append("password", credentials.password);

  return apiPostForm<LoginResponse>("/auth/login", formData, options);
}

export async function logout(options?: ApiRequestOptions) {
  return apiPost<LogoutResponse>("/auth/logout", {}, options);
}

export async function getMe(options?: ApiRequestOptions) {
  return apiGet<MeResponse>("/auth/me", options);
}

export async function getMeAlias(options?: ApiRequestOptions) {
  return apiGet<MeResponse>("/me", options);
}

/**
 * Game Token Exchange
 */

export interface GameTokenProxyRequest {
  game_slug: string;
}

export interface GameTokenProxyResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  expires_at: string;
  game: {
    id: string;
    slug: string;
    title: string;
  };
  credential: {
    id: string;
    name: string;
    allowed_platforms: string[];
  };
}

/**
 * Get game access token via server-side proxy.
 * This endpoint should be implemented on the server side (not in browser).
 * The browser calls this proxy, which then exchanges credentials with P2R.
 */
/**
 * Browser-facing path for the Panel BFF token exchange.
 *
 * Deliberately NOT under `/api/p2r/`: in the P2R proxy topology that prefix
 * belongs to the Laravel API (`location /api/p2r/ -> api`), so a BFF path there
 * is shadowed and resolves to the API instead. `/api/bff/*` is disjoint from
 * the API prefix.
 *
 * The Panel serves this same path on its own origin; a reverse proxy on the
 * game host maps this origin-relative path across to it, keeping the browser
 * request same-origin.
 */
const GAME_TOKEN_PATH = "/api/bff/game-token";

export async function getGameAccessTokenViaProxy(
  gameSlug: string,
  options?: ApiRequestOptions
) {
  return apiPost<GameTokenProxyResponse>(
    GAME_TOKEN_PATH,
    { game_slug: gameSlug },
    options
  );
}

/**
 * Game Discovery
 */

export interface GameKarya {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: string;
  version: string | null;
  description: string | null;
  creators: string | null;
  tech_stack: string[];
  media_urls: string[];
  live_url: string | null;
  repo_url: string | null;
  is_featured: boolean;
  votes_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  distributions: unknown[] | null;
  leaderboard_direction: string;
}

export interface GameDiscoveryResponse {
  success: boolean;
  message: string;
  data: GameKarya;
}

export async function getGameBySlug(slug: string, options?: ApiRequestOptions) {
  return apiGet<GameDiscoveryResponse>(`/games/${slug}`, options);
}

export async function getGamesList(params?: {
  category?: string;
  sort?: "newest" | "votes";
  limit?: number;
}, options?: ApiRequestOptions) {
  return apiGet<{ success: boolean; message: string; data: GameKarya[] }>("/karyas", {
    ...options,
    searchParams: params,
  });
}

/**
 * Events
 */

export interface Event {
  id: string;
  slug: string;
  name: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

export interface EventsResponse {
  success: boolean;
  message: string;
  data: Event[];
}

export async function getEventsForGame(gameSlug: string, options?: ApiRequestOptions) {
  return apiGet<EventsResponse>("/events", {
    ...options,
    searchParams: { game: gameSlug },
  });
}

/**
 * Game Sessions
 */

export interface StartSessionRequest {
  event_id?: string | null;
  platform?: string;
  game_version?: string;
  idempotency_key: string;
  metadata?: Record<string, unknown>;
}

export interface StartSessionResponse {
  success: boolean;
  message: string;
  data: {
    session: {
      id: string;
      status: string;
      game: string;
      event_id: string | null;
      platform: string;
      started_at: string;
      expires_at: string;
    };
    session_token: string;
    is_replayed: boolean;
  };
}

export interface StartSessionOptions extends ApiRequestOptions {
  gameToken: string;
  playerToken: string;
}

export async function startSession(
  gameSlug: string,
  payload: StartSessionRequest,
  options: StartSessionOptions
) {
  return apiPost<StartSessionResponse>(`/games/${gameSlug}/sessions/start`, payload, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${options.playerToken}`,
      "X-Game-Access-Token": options.gameToken,
    },
  });
}

export interface CompleteSessionRequest {
  session_token: string;
  best_score?: number;
  score?: number;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CompleteSessionResult {
  id: string;
  score: number;
  score_scale: number;
  display_score: number;
  formula_version: string;
  data: Record<string, unknown>;
}

export interface CompleteSessionResponse {
  success: boolean;
  message: string;
  data: {
    session: {
      id: string;
      status: string;
      completed_at: string | null;
    };
    result: CompleteSessionResult | null;
  };
}

export async function completeSession(
  gameSlug: string,
  sessionId: string,
  payload: CompleteSessionRequest,
  options: StartSessionOptions
) {
  return apiPost<CompleteSessionResponse>(`/games/${gameSlug}/sessions/${sessionId}/complete`, payload, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${options.playerToken}`,
      "X-Game-Access-Token": options.gameToken,
    },
  });
}

/**
 * Economy
 */

export interface SpendActionRequest {
  action_code: string;
  session_id?: string;
  event_id?: string;
  idempotency_key?: string;
}

export interface SpendActionResponse {
  success: boolean;
  message: string;
  data: {
    transaction: {
      id: string;
      action_code: string;
      amount: number;
      balance_after: number;
    };
  };
}

export interface WalletResponse {
  success: boolean;
  message: string;
  data: {
    wallet_id: string;
    balance: number;
    transactions: Array<{
      id: string;
      type: string;
      amount: number;
      balance_before: number;
      balance_after: number;
      description: string | null;
      created_at: string;
    }>;
  };
}

export async function getWallet(options?: ApiRequestOptions) {
  return apiGet<WalletResponse>("/me/wallet", options);
}

export async function spendAction(
  gameSlug: string,
  payload: SpendActionRequest,
  options: StartSessionOptions
) {
  return apiPost<SpendActionResponse>(`/games/${gameSlug}/economy/spend`, payload, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${options.playerToken}`,
      "X-Game-Access-Token": options.gameToken,
    },
  });
}

/**
 * Leaderboard
 */

export interface LeaderboardEntry {
  rank: number;
  player: {
    id: number;
    name: string;
  };
  score: number;
  data: Record<string, unknown>;
  submitted_at: string;
}

export interface LeaderboardResponse {
  success: boolean;
  message: string;
  data: {
    game: {
      id: string;
      slug: string;
      title: string;
    };
    event: {
      id: string;
      slug: string;
      name: string;
    } | null;
    direction: "higher_is_better" | "lower_is_better";
    total_players: number;
    leaderboard: Array<{
      rank: number;
      player: {
        id: number;
        name: string;
      };
      score: number;
      data: Record<string, unknown>;
      submitted_at: string;
    }>;
    my_rank?: {
      rank: number;
      score: number;
      data: Record<string, unknown>;
      submitted_at: string;
    } | null;
  };
}

export async function getLeaderboard(
  gameSlug: string,
  params?: {
    event_id?: string;
    limit?: number;
    offset?: number;
  },
  options?: ApiRequestOptions
) {
  return apiGet<LeaderboardResponse>(`/games/${gameSlug}/leaderboard`, {
    ...options,
    searchParams: params,
    headers: {
      ...options?.headers,
      "X-Game-Access-Token": options?.gameToken || "",
    },
  });
}

/**
 * Utility: Check if error is a P2R API error
 */
export { isApiError } from "./client.js";

/**
 * Utility: Extract user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Terjadi kesalahan yang tidak diketahui.";
}

/**
 * Utility: Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && (error as ApiError & { isNetworkError?: boolean }).isNetworkError === true;
}

/**
 * Utility: Check if error is a timeout
 */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof ApiError && (error as ApiError & { isTimeout?: boolean }).isTimeout === true;
}