import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    // Todo *.test.ts del sitio. Los sub-proyectos Vite (apps-src) usan su propio
    // toolchain; solo se incluyen los que importan con rutas relativas.
    include: [
      "**/*.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      ".next/**",
      "archive/**",
      "public/**",
      "apps-src/!(ap-guitar|ap-multi|intervalos-cantados)/**",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
