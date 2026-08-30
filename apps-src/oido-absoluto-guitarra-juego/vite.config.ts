import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/apps/oido-absoluto-guitarra-juego/" : "./",
  publicDir: command === "build" ? false : "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
  server: {
    host: "127.0.0.1",
    port: 5178,
    strictPort: true,
  },
}));
