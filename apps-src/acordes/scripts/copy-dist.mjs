// Copia el build de Vite (dist/) a public/apps/acordes/ del sitio Next.
// El dist publicado se versiona porque lo sirve el iframe; la fuente vive aqui.
import { cp, readdir, rm } from "node:fs/promises";
import path from "node:path";

const here = import.meta.dirname;
const dist = path.resolve(here, "..", "dist");
const target = path.resolve(here, "..", "..", "..", "public", "apps", "acordes");

await rm(target, { recursive: true, force: true });
await cp(dist, target, { recursive: true });

const files = await readdir(target);
console.log(`Copiado dist -> public/apps/acordes/ (${files.length} entradas)`);
