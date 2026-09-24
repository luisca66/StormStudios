import { defineConfig } from "vitest/config";

// Separado de vite.config.ts, que apunta la raíz al inspector.
export default defineConfig({
  test: { include: ["test/**/*.test.ts"], testTimeout: 60_000 },
});
