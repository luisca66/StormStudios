import { defineConfig } from "vite";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");

// La app se sirve desde /apps/desglose/ (estática, embebida en un iframe por Next).
// `base` asegura que las URLs de assets generadas apunten ahí.
export default defineConfig({
  base: "/apps/desglose/",
  resolve: {
    alias: {
      // Mismo alias que el repo Next: "@/lib/desglose/music" → fuente compartida.
      "@": repoRoot,
    },
  },
  server: {
    // Permite al dev-server leer la lógica compartida en /lib (fuera de esta raíz).
    fs: { allow: [repoRoot] },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
});
