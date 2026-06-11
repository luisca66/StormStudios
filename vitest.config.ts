import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "components/rhythm-reading/_tests/**/*.test.ts",
      "lib/acordes-cantar/**/*.test.ts",
      "lib/maestro-virtual/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
