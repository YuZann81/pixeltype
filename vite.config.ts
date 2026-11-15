import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';
import dotenv from 'dotenv';
import { getOrFetchGameToken } from './src/server/gameTokenService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables for Vite server (.env.local takes precedence)
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Development middleware to handle game token acquisition server-side
 * without exposing P2R_CLIENT_SECRET to the client browser.
 */
function p2rGameTokenDevPlugin(): Plugin {
  return {
    name: 'p2r-game-token-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || '';
        const pathname = rawUrl.split('?')[0];

        if (req.method === 'POST' && (pathname === '/api/bff/game-token' || pathname === '/api/game-token')) {
          try {
            const queryParams = new URL(rawUrl, 'http://localhost').searchParams;
            const forceRefresh = queryParams.get('force') === 'true';
            const tokenData = await getOrFetchGameToken({ forceRefresh });

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: true,
                message: 'Game access token issued successfully.',
                data: tokenData,
              })
            );
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to acquire game access token';
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                success: false,
                message,
              })
            );
          }
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  const rawApiBase = process.env.P2R_DEV_PROXY_TARGET || process.env.P2R_API_BASE_URL || 'https://pameran.devsaka.id/api/v1';
  let targetOrigin = 'https://pameran.devsaka.id';
  let targetPathPrefix = '/api/v1';

  try {
    const parsed = new URL(rawApiBase);
    targetOrigin = parsed.origin;
    targetPathPrefix = parsed.pathname.replace(/\/+$/, '');
  } catch {
    // fallback defaults
  }

  return {
    plugins: [react(), tailwindcss(), p2rGameTokenDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        /*
         * Panel BFF. Fallback proxy for non-token BFF endpoints if any.
         * The /api/bff/game-token endpoint is intercepted above by p2rGameTokenDevPlugin.
         */
        '/api/bff': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
          secure: false,
        },
        /*
         * P2R Core API proxy. Maps /api/p2r/<rest> to ${targetOrigin}${targetPathPrefix}/<rest>.
         */
        '/api/p2r': {
          target: targetOrigin,
          changeOrigin: true,
          secure: false,
          rewrite: (pathStr) => pathStr.replace(/^\/api\/p2r/, targetPathPrefix),
        },
      },
    },
  };
});
