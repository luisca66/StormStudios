import { defineConfig } from 'vite';

// public/ solo trae favicon.svg e icons.svg, que el bundle publicado sirve en la raíz.
export default defineConfig({
  base: '/apps/intervalos-reconocimiento-juego/',
  server: {
    proxy: {
      '/api/audio': {
        target: 'https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/audio/, '')
      }
    }
  }
});
