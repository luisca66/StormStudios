import { defineConfig } from "vite";

export default defineConfig({
  base: "/apps/ap-multi/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    modulePreload: {
      polyfill: false,
    },
    target: "es2022",
  },
});
