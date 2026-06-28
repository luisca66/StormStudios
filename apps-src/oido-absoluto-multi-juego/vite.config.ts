import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dev keeps base "./" + local public/assets; the production build targets the
// Storm Studios website path and skips bundling the ~840 MB of local audio
// (it streams from Cloudflare R2 via VITE_ASSET_BASE/VITE_NOTES_BASE).
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/apps/oido-absoluto-multi/" : "./",
  publicDir: command === "build" ? false : "public",
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  plugins: [
    {
      name: "decode-sharp-middleware",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url.includes("%23") || req.url.includes("%2523"))) {
            const decodedPath = decodeURIComponent(req.url.split("?")[0]);
            const fsPath = path.join(__dirname, "public", decodedPath);
            if (fs.existsSync(fsPath)) {
              res.writeHead(200, {
                "Content-Type": "audio/mpeg",
                "Content-Length": fs.statSync(fsPath).size
              });
              fs.createReadStream(fsPath).pipe(res);
              return;
            }
          }
          next();
        });
      }
    }
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    modulePreload: {
      polyfill: false,
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
}));
