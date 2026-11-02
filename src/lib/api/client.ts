/**
 * P2R API Client - Native fetch wrapper with auth, timeout, and error handling.
 */

const DEFAULT_TIMEOUT_MS = 8000;

type ApiRequestOptions = {
  searchParams?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  token?: string | null;
  gameToken?: string | null;
  revalidate?: number | false;
  cache?: RequestCache;
  timeoutMs?: number;
};

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface P2RErrorResponse {
  success: false;
  message: string;
  code?: string;
  data?: unknown;
  errors?: Record<string, string[]>;
}

interface P2RSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

type P2RResponse<T> = P2RSuccessResponse<T> | P2RErrorResponse;

class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly isTimeout: boolean;
  public readonly isNetworkError: boolean;

  constructor(message: string, options: { status: number; code?: string; details?: unknown; isTimeout?: boolean; isNetworkError?: boolean } = { status: 0 }) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.isTimeout = options.isTimeout ?? false;
    this.isNetworkError = options.isNetworkError ?? false;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Browser-facing path for the Panel BFF. Kept in step with GAME_TOKEN_PATH in
 * p2r.ts.
 *
 * This is same-origin and must NOT be built from VITE_P2R_API_BASE_URL: the BFF
 * is a Panel route, not an API route, and the `/api/p2r/` prefix belongs to the
 * Laravel API.
 */
const BFF_GAME_TOKEN_PATH = "/api/bff/game-token";

function buildApiUrl(path: string, searchParams?: ApiRequestOptions["searchParams"]): string {
  const fallbackOrigin = typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "http://localhost";

  // Dedicated BFF proxy endpoint (hosted by p2r-panel, not under the API prefix)
  if (path === BFF_GAME_TOKEN_PATH) {
    const url = new URL(path, fallbackOrigin);
    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  // Already an absolute HTTP/HTTPS URL
  if (/^https?:\/\//i.test(path)) {
    const url = new URL(path);
    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  /*
   * VITE_P2R_API_BASE_URL is the EXACT prefix the browser calls for API
   * endpoints - it is used verbatim, never rewritten.
   *
   * The default matches the P2R proxy convention where the host serves
   * `/api/p2r/<rest>` and forwards to the API's `/p2r/v1/<rest>`. Including
   * `/v1` here would produce `/p2r/v1/v1/...` and 404.
   *
   * Callers pass version-less paths (e.g. `/games/pixeltype/contract`), so no
   * prefix stripping is performed or needed.
   */
  const rawBase = import.meta.env.VITE_P2R_API_BASE_URL?.trim() || "/api/p2r";
  const cleanBase = rawBase.replace(/\/+$/, "");

  const cleanPath = path.replace(/^\/+/, "");

  const fullPath = `${cleanBase}/${cleanPath}`;

  const url = /^https?:\/\//i.test(fullPath)
    ? new URL(fullPath)
    : new URL(fullPath, fallbackOrigin);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

function buildHeaders(options: ApiRequestOptions, hasBody = false): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token.trim()}`;
  }

  if (options.gameToken) {
    headers["X-Game-Access-Token"] = options.gameToken.trim();
  }

  return headers;
}

async function safeParseResponse<T>(response: Response): Promise<{ payload: P2RResponse<T> | null; text: string }> {
  let text = "";
  if (typeof response.text === "function") {
    try {
      text = await response.text();
    } catch {
      text = "";
    }
  }

  if (text && text.trim().length > 0) {
    try {
      const json = JSON.parse(text) as P2RResponse<T>;
      return { payload: json, text };
    } catch {
      return { payload: null, text };
    }
  }

  if (typeof response.json === "function") {
    try {
      const json = (await response.json()) as P2RResponse<T>;
      return { payload: json, text: JSON.stringify(json) };
    } catch {
      return { payload: null, text: "" };
    }
  }

  return { payload: null, text: "" };
}

async function executeRequest<T>(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<P2RSuccessResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (typeof timeoutId.unref === "function") {
    timeoutId.unref();
  }

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    const { payload, text } = await safeParseResponse<T>(response);

    if (!response.ok || (payload && payload.success === false)) {
      const errorMessage =
        payload?.message ||
        (response.status === 401
          ? "Sesi otentikasi tidak valid atau telah berakhir."
          : response.status === 403
            ? "Anda tidak memiliki izin untuk mengakses sumber daya ini."
            : response.status === 404
              ? "Data atau endpoint tidak ditemukan."
              : response.status === 422
                ? payload?.message || "Data yang dikirimkan tidak valid."
                : response.status >= 500
                  ? "Server sedang mengalami gangguan. Silakan coba lagi nanti."
                  : `Permintaan API gagal dengan status ${response.status}`);

      const errorPayload = payload as P2RErrorResponse;
      throw new ApiError(errorMessage, {
        status: response.status,
        code: errorPayload?.code,
        details: errorPayload?.data ?? null,
      });
    }

    if (payload) {
      return payload as P2RSuccessResponse<T>;
    }

    // HTTP 200/204 but empty body or non-JSON success
    return {
      success: true,
      message: response.statusText || "Success",
      data: (text as unknown) as T,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      const timeoutMsg = `Permintaan ke server memakan waktu terlalu lama (timeout ${timeoutMs}ms).`;
      throw new ApiError(timeoutMsg, { status: 0, isTimeout: true });
    }

    const networkMsg = error instanceof Error ? error.message : "Gagal terhubung ke server API.";
    throw new ApiError(networkMsg, { status: 0, isNetworkError: true });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiGet<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<P2RSuccessResponse<T>> {
  const url = buildApiUrl(path, options.searchParams);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  const init: RequestInit = {
    method: "GET",
    headers: buildHeaders(options, false),
  };

  if (options.cache) {
    init.cache = options.cache;
  }

  if (options.revalidate !== undefined && options.revalidate !== false) {
    (init as Record<string, unknown>).next = { revalidate: options.revalidate };
  }

  return executeRequest<T>(url, init, timeoutMs);
}

export async function apiPost<T, B = unknown>(
  path: string,
  body: B,
  options: ApiRequestOptions = {}
): Promise<P2RSuccessResponse<T>> {
  const url = buildApiUrl(path, options.searchParams);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  const init: RequestInit = {
    method: "POST",
    headers: buildHeaders(options, true),
    body: JSON.stringify(body),
  };

  if (options.cache) {
    init.cache = options.cache;
  }

  return executeRequest<T>(url, init, timeoutMs);
}

export async function apiPostForm<T>(
  path: string,
  formData: URLSearchParams,
  options: ApiRequestOptions = {}
): Promise<P2RSuccessResponse<T>> {
  const url = buildApiUrl(path, options.searchParams);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  const init: RequestInit = {
    method: "POST",
    headers: buildHeaders(options, false), // Don't set Content-Type, let browser set it with boundary
    body: formData,
  };

  if (options.cache) {
    init.cache = options.cache;
  }

  return executeRequest<T>(url, init, timeoutMs);
}

export async function apiPut<T, B = unknown>(
  path: string,
  body: B,
  options: ApiRequestOptions = {}
): Promise<P2RSuccessResponse<T>> {
  const url = buildApiUrl(path, options.searchParams);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  const init: RequestInit = {
    method: "PUT",
    headers: buildHeaders(options, true),
    body: JSON.stringify(body),
  };

  if (options.cache) {
    init.cache = options.cache;
  }

  return executeRequest<T>(url, init, timeoutMs);
}

export async function apiPatch<T, B = unknown>(
  path: string,
  body: B,
  options: ApiRequestOptions = {}
): Promise<P2RSuccessResponse<T>> {
  const url = buildApiUrl(path, options.searchParams);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  const init: RequestInit = {
    method: "PATCH",
    headers: buildHeaders(options, true),
    body: JSON.stringify(body),
  };

  if (options.cache) {
    init.cache = options.cache;
  }

  return executeRequest<T>(url, init, timeoutMs);
}

export async function apiDelete<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<P2RSuccessResponse<T>> {
  const url = buildApiUrl(path, options.searchParams);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  const init: RequestInit = {
    method: "DELETE",
    headers: buildHeaders(options, false),
  };

  if (options.cache) {
    init.cache = options.cache;
  }

  return executeRequest<T>(url, init, timeoutMs);
}

export { ApiError, type ApiRequestOptions };
export type { P2RResponse, P2RSuccessResponse, P2RErrorResponse };