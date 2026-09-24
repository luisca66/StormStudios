import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// El inspector lee los modelos directo de las carpetas de cada juego (apps-src/<juego>/src/**/assets).
const appsSrc = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL("./inspector", import.meta.url)),
  server: {
    host: "127.0.0.1",
    port: 5190,
    strictPort: true,
    fs: { allow: [appsSrc] },
  },
});
