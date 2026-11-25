/**
 * Standalone Production Server Entrypoint for PixelType
 *
 * Bundled via esbuild into dist-server/index.cjs for zero-dependency Node 24 execution.
 */

import { createApp } from "./app.ts";

const app = createApp();
const port = parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOSTNAME || "0.0.0.0";

const server = app.listen(port, hostname, () => {
  const release = process.env.PIXELTYPE_RELEASE_SHA || "dev";
  console.log(`[PixelType Server] Listening on http://${hostname}:${port} (release=${release})`);
});

const shutdown = (signal: string) => {
  console.log(`[PixelType Server] Received ${signal}, shutting down gracefully...`);
  server.close(() => process.exit(0));
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export { app, createApp };
