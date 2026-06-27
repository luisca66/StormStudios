import { defineConfig } from "vite";

export default defineConfig({
  base: "/apps/acordes/",
  publicDir: false,
  build: {
    target: "es2022",
  },
});
