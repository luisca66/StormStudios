import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// base "./" es obligatorio: en producción el juego vive bajo /apps/grados-menores-juego/
export default defineConfig({
  base: "./",
  // Three.js concentra casi todo el peso; 600 kB es el presupuesto intencional desktop.
  build: { chunkSizeWarningLimit: 600 },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    host: "127.0.0.1",
    port: 5176,
    // Los sfx propios del juego vivirán en R2 (ver SFX_BASE en src/config.ts). La lista
    // CORS del bucket no incluye este origen de desarrollo, y el cometa enruta su audio
    // por WebAudio, que sin CORS suena a silencio. Servirlos por aquí los vuelve del
    // mismo origen. (Lección heredada del Expreso Tonal.)
    proxy: {
      "/r2": {
        target: "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/r2/, ""),
      },
    },
  },
});
