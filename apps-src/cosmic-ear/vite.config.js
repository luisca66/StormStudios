import { defineConfig } from "vite";

// public/ solo contiene pitch-processor.js: el AudioWorklet se carga por URL
// (/apps/cosmic-ear/pitch-processor.js), así que debe copiarse sin hash.
export default defineConfig({
  base: "/apps/cosmic-ear/",
  build: {
    target: "es2022",
  },
});
