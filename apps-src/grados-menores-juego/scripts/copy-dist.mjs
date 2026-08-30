import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const here = import.meta.dirname;

/**
 * Raíz del repo del sitio. Tres fuentes, en orden:
 *   1. STORM_WEBSITE_ROOT, si está.
 *   2. `../../..` — cuando este proyecto vive en `apps-src/<slug>/`, esa es la raíz.
 *      Se comprueba que exista `public/apps` antes de creerselo.
 *   3. La ruta de la máquina de Luis, para cuando se compila desde la carpeta de
 *      trabajo del juego, que está fuera del repo del sitio.
 * Barras normales a propósito: Node las resuelve bien en Windows.
 */
async function resolveWebsiteRoot() {
  if (process.env.STORM_WEBSITE_ROOT) return process.env.STORM_WEBSITE_ROOT;

  const inRepo = path.resolve(here, "..", "..", "..");
  try {
    if ((await stat(path.join(inRepo, "public", "apps"))).isDirectory()) return inRepo;
  } catch {
    // No estamos dentro del repo del sitio: se usa el default de abajo.
  }

  return "C:/Users/Luis/Documents/Claude Cowork/nuevo_website/storm-studios/StormStudios";
}

const websiteRoot = await resolveWebsiteRoot();
const dist = path.resolve(here, "..", "dist");
const target = path.resolve(websiteRoot, "public", "apps", "grados-menores-juego");

await mkdir(path.dirname(target), { recursive: true });
await rm(target, { recursive: true, force: true });
await cp(dist, target, { recursive: true });

const files = await readdir(target);
console.log(`Copiado dist -> ${target} (${files.length} entradas)`);
