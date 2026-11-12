import { defineConfig } from "vite";

export default defineConfig({
  base: "/apps/ap-multi/",
  server: { fs: { allow: [".", "../ap-core"] } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    modulePreload: {
      polyfill: false,
    },
    target: "es2022",
  },
});
