// Copia el build de Vite (dist/) a public/apps/desglose/ del sitio Next.
// El dist publicado SÍ se versiona (lo sirve el iframe); la fuente vive aquí.
import { cp, rm, readdir } from "node:fs/promises";
import path from "node:path";

const here = import.meta.dirname;
const dist = path.resolve(here, "..", "dist");
const target = path.resolve(here, "..", "..", "..", "public", "apps", "desglose");

await rm(target, { recursive: true, force: true });
await cp(dist, target, { recursive: true });

const files = await readdir(target);
console.log(`✓ Copiado dist → public/apps/desglose/ (${files.length} entradas)`);
