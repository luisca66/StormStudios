import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// base "./" es obligatorio: en producción el juego vive bajo /apps/acordes-cantar-juego/
export default defineConfig({
  base: "./",
  // Three.js concentra casi todo el peso; 600 kB es el presupuesto intencional desktop.
  build: { chunkSizeWarningLimit: 600 },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { host: "127.0.0.1", port: 5174 },
});
