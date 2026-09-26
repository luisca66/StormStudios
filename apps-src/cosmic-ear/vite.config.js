import { defineConfig } from "vite";

// public/ solo contiene pitch-processor.js: el AudioWorklet se carga por URL
// (/apps/cosmic-ear/pitch-processor.js), así que debe copiarse sin hash.
export default defineConfig({
  base: "/apps/cosmic-ear/",
  // Una sola copia de Three cuando los modelos vienen de apps-src/shared-3d (MANUAL-RENOVACION-3D.md).
  resolve: { dedupe: ["three"] },
  build: {
    target: "es2022",
  },
});
