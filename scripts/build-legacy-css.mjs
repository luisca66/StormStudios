// Precompila el CSS de Tailwind para las herramientas HTML heredadas, que antes
// usaban el Play CDN (cdn.tailwindcss.com) y compilaban las clases en el navegador.
// Usa Tailwind 3.4.17, la misma versión que cargaba el CDN; el sitio usa Tailwind 4
// y no comparte configuración con estas páginas.
// Vuelve a ejecutarlo (`npm run legacy:css`) después de cambiar clases en esos archivos.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TARGETS = [
  {
    output: "public/tools/sequencer-tailwind.css",
    content: ["public/tools/sequencer.html", "public/tools/secuenciador.html"],
  },
  {
    output: "public/apps/gemini-games-tailwind.css",
    content: [
      "public/apps/burbujas-gemini.html",
      "public/apps/laberinto-gemini.html",
      "public/apps/ranita-gemini.html",
      "public/apps/tetris-gemini.html",
    ],
  },
  {
    output: "public/apps/cosmic-ear/css/tailwind.css",
    content: ["public/apps/cosmic-ear/index.html", "public/apps/cosmic-ear/js/app.jsx"],
  },
];

const dir = mkdtempSync(join(tmpdir(), "legacy-css-"));
const input = join(dir, "input.css");
writeFileSync(input, "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n");

try {
  for (const { output, content } of TARGETS) {
    console.log(`tailwind: ${output}`);
    execFileSync(
      "npx",
      ["-y", "tailwindcss@3.4.17", "-i", input, "-o", output, "--content", content.join(","), "--minify"],
      { stdio: "inherit", shell: process.platform === "win32" }
    );
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
