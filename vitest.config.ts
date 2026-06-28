import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "components/rhythm-reading/_tests/**/*.test.ts",
      "lib/acordes-cantar/**/*.test.ts",
      "lib/desglose/**/*.test.ts",
      "lib/maestro-virtual/**/*.test.ts",
      // Tests de lógica pura de los sub-proyectos Vite (apps-src). Solo usan
      // imports relativos, así que corren bien bajo este runner raíz. Tests que
      // usen el alias "@" propio del sub-proyecto deben quedarse en su toolchain.
      "apps-src/ap-guitar/src/**/*.test.ts",
      "apps-src/intervalos-cantados/src/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
