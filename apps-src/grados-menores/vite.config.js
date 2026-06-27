import { defineConfig } from "vite";

export default defineConfig({
  base: "/apps/grados-menores/",
  publicDir: false,
  build: {
    target: "es2022",
  },
});
