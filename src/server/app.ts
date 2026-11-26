/**
 * Express Application Factory for PixelType Production Runtime
 *
 * Single Node.js process responsibilities:
 * - Health probes: GET /health and GET /api/health (includes PIXELTYPE_RELEASE_SHA)
 * - Authenticated BFF token exchange: POST /api/bff/game-token (and /api/game-token)
 * - Same-origin P2R Core API proxy: /api/p2r/* -> ${P2R_API_BASE_URL}/* (never attaches client secret)
 * - Static Vite frontend bundle from dist/
 * - SPA fallback to dist/index.html for non-API routes
 */

import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import {
  handleGameTokenRequest,
  resolveConfig,
  type GameTokenServiceConfig,
} from "./gameTokenService.ts";

// Load local env files when present (in Docker/production, runtime env vars take precedence)
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export interface CreateAppOptions {
  distPath?: string;
  releaseSha?: string;
  tokenConfig?: Partial<GameTokenServiceConfig>;
  fetchFn?: typeof fetch;
}

function resolveDefaultDistPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "dist"),
    path.resolve(process.cwd(), "../dist"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  return candidates[0];
}

export function createApp(options: CreateAppOptions = {}): express.Express {
  const app = express();
  const distPath = options.distPath || resolveDefaultDistPath();
  const fetchFn = options.fetchFn || fetch;
  const releaseSha =
    options.releaseSha || process.env.PIXELTYPE_RELEASE_SHA || "dev";

  app.disable("x-powered-by");
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // 1. Health check endpoints (always take precedence over static & SPA fallback)
  const handleHealth = (_req: express.Request, res: express.Response) => {
    res.status(200).json({
      status: "ok",
      service: "pixeltype-server",
      release: releaseSha,
      timestamp: new Date().toISOString(),
    });
  };
  app.get("/health", handleHealth);
  app.get("/api/health", handleHealth);

  // 2. Authenticated server-side BFF game token endpoints (P2R_CLIENT_SECRET stays server-side)
  const handleGameToken = async (req: express.Request, res: express.Response) => {
    const forceRefresh = req.query.force === "true";
    const result = await handleGameTokenRequest({
      authHeader: req.headers.authorization,
      forceRefresh,
      config: options.tokenConfig,
      fetchFn,
    });

    if (result.status >= 500) {
      console.error("[P2R Token Server] Error acquiring token:", result.body.message);
    }

    res.status(result.status).json(result.body);
  };
  app.post("/api/bff/game-token", handleGameToken);
  app.post("/api/game-token", handleGameToken);

  // 3. Same-origin P2R Core API proxy (/api/p2r/* -> ${P2R_API_BASE_URL}/*)
  // Forwards only caller headers (Authorization, X-Game-Access-Token, Content-Type, Accept).
  // Never injects P2R_CLIENT_ID or P2R_CLIENT_SECRET.
  app.use("/api/p2r", async (req: express.Request, res: express.Response) => {
    const config = resolveConfig(options.tokenConfig);
    const upstreamPath = req.url.startsWith("/") ? req.url : `/${req.url}`;
    const targetUrl = `${config.apiBaseUrl}${upstreamPath}`;

    const forwardHeaders: Record<string, string> = {
      Accept: typeof req.headers.accept === "string" ? req.headers.accept : "application/json",
      "User-Agent": "PixelType-ExpressProxy/1.0",
    };

    if (typeof req.headers.authorization === "string") {
      forwardHeaders.Authorization = req.headers.authorization;
    }
    if (typeof req.headers["x-game-access-token"] === "string") {
      forwardHeaders["X-Game-Access-Token"] = req.headers["x-game-access-token"];
    }

    const method = req.method.toUpperCase();
    const hasBody = !["GET", "HEAD"].includes(method);
    let body: string | undefined;

    if (hasBody && req.body !== undefined) {
      if (
        typeof req.headers["content-type"] === "string" &&
        req.headers["content-type"].includes("application/x-www-form-urlencoded")
      ) {
        forwardHeaders["Content-Type"] = "application/x-www-form-urlencoded";
        body = new URLSearchParams(req.body as Record<string, string>).toString();
      } else {
        forwardHeaders["Content-Type"] = "application/json";
        body = JSON.stringify(req.body);
      }
    }

    try {
      const upstream = await fetchFn(targetUrl, {
        method,
        headers: forwardHeaders,
        body,
      });

      const contentType = upstream.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      const payload = await upstream.text();
      res.status(upstream.status).send(payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reach upstream P2R API";
      console.error("[P2R Proxy] Upstream request failed:", message);
      res.status(502).json({
        success: false,
        message: "Gagal terhubung ke P2R API.",
      });
    }
  });

  // 4. Unknown /api/* routes return JSON 404 rather than SPA HTML
  app.use("/api", (_req: express.Request, res: express.Response) => {
    res.status(404).json({
      success: false,
      message: "API endpoint not found.",
    });
  });

  // 5. Static Vite assets from dist/
  app.use(
    "/assets",
    express.static(path.join(distPath, "assets"), {
      immutable: true,
      maxAge: "1y",
    })
  );
  app.use(express.static(distPath, { index: false }));

  // 6. SPA fallback for client-side routes
  app.get("*", (_req: express.Request, res: express.Response) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) {
        res.status(404).send("PixelType dist bundle not found. Run 'npm run build' first.");
      }
    });
  });

  return app;
}
