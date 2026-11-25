/**
 * Production / Standalone Server for PixelType
 *
 * Serves static build assets and provides the secure server-side game token endpoint.
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { handleGameTokenRequest } from "./gameTokenService.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (.env.local takes precedence over .env)
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const port = parseInt(process.env.PORT || "3000", 10);

app.use(express.json());

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "pixeltype-server" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "pixeltype-server" });
});

// Secure server-side game token endpoints (requires valid player Bearer auth)
const handleGameToken = async (req: express.Request, res: express.Response) => {
  const forceRefresh = req.query.force === "true";
  const result = await handleGameTokenRequest({
    authHeader: req.headers.authorization,
    forceRefresh,
  });

  if (result.status >= 500) {
    console.error("[P2R Token Server] Error acquiring token:", result.body.message);
  }

  res.status(result.status).json(result.body);
};

app.post("/api/bff/game-token", handleGameToken);
app.post("/api/game-token", handleGameToken);

// Serve static assets from dist
const distPath = path.resolve(__dirname, "../../dist");
app.use(express.static(distPath));

// SPA fallback for client-side routing
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) {
      res.status(404).send("PixelType dist bundle not found. Run 'npm run build' first.");
    }
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, "0.0.0.0", () => {
    console.log(`[PixelType Server] Running on http://0.0.0.0:${port}`);
  });
}

export { app };
