import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
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
         * Panel BFF. Same-origin in development, matching production: the
         * browser calls /api/bff/* on this dev server and Vite forwards it to
         * the Panel. Deliberately NOT under /api/p2r/, which belongs to the API.
         *
         * Target is the stack's single origin (nginx, :8080) rather than the
         * Panel port directly. The Panel container is built with
         * NEXT_PUBLIC_BASE_PATH=/panel, so its BFF route handler only answers
         * at /panel/api/bff/game-token; nginx already maps origin /api/* to that
         * upstream path. Forwarding to nginx therefore needs NO rewrite here -
         * /api/bff/game-token is passed through verbatim and nginx applies
         * `location /api/ -> proxy_pass http://p2r_panel/panel/api/`.
         * Targeting :3001 directly would 404 on the missing /panel prefix.
         */
        '/api/bff': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
          secure: false,
        },
        /*
         * Laravel API. The dev proxy mirrors the P2R proxy convention:
         * /api/p2r/<rest> -> /p2r/v1/<rest>, so VITE_P2R_API_BASE_URL must be
         * '/api/p2r' here. Including '/v1' would yield /p2r/v1/v1/... and 404.
         */
        '/api/p2r': {
          target: 'http://127.0.0.1:8090',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/p2r/, '/p2r/v1'),
        },
      },
    },
  };
});
