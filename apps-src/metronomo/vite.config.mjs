import { defineConfig } from "vite";

// Metrónomo Pro: un solo index.html (script clásico con su propio programador de audio en un Worker).
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/apps/metronomo/" : "./",
  build: { outDir: "dist", emptyOutDir: true, target: "es2020" },
  server: { host: "127.0.0.1", port: 5191, strictPort: true },
}));
