import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

// Raíz REAL del repo del sitio (PLAN Aerostato §15.1: el default del script de
// Walking AP Multi apuntaba a una ruta vieja de Cowork — no copiarlo tal cual).
const websiteRoot =
  process.env.STORM_WEBSITE_ROOT ??
  path.resolve(import.meta.dirname, "..", "..", "..");

const here = import.meta.dirname;
const dist = path.resolve(here, "..", "dist");
const target = path.resolve(websiteRoot, "public", "apps", "acordes-cantar-juego");

await mkdir(path.dirname(target), { recursive: true });
await rm(target, { recursive: true, force: true });
await cp(dist, target, { recursive: true });

const files = await readdir(target);
console.log(`Copiado dist -> ${target} (${files.length} entradas)`);
