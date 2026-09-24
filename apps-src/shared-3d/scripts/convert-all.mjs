// Convierte todos los modelos de los juegos (JSON de `kit.export_parts`) a GLB en los tres modos y
// deja una tabla de pesos. Los GLB van a `.cache/glb/` (fuera de git) y los usa el inspector.
//
//   node scripts/convert-all.mjs            -> .cache/glb/<juego>/<modelo>.<modo>.glb + .cache/glb/pesos.json

import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { gzipSync, brotliCompressSync } from "node:zlib";
import path from "node:path";
import { realpathSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { jsonToGlb, packGlb } from "./json-to-glb.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const appsSrc = path.resolve(here, "../..");
const out = path.resolve(here, "../.cache/glb");
const MODES = ["none", "meshopt", "meshopt-q"];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith(".json") && full.includes(`${path.sep}assets${path.sep}`)) yield full;
  }
}

export async function partModels() {
  const found = [];
  for (const game of (await readdir(appsSrc)).sort()) {
    if (game === "shared-3d") continue;
    const src = path.join(appsSrc, game, "src");
    try { await stat(src); } catch { continue; }
    for await (const file of walk(src)) {
      const json = JSON.parse(await readFile(file, "utf8"));
      if (Array.isArray(json.meshes)) found.push({ game, file, json });
    }
  }
  return found;
}

const sizes = (buffer) => ({ bytes: buffer.length, gzip: gzipSync(buffer, { level: 9 }).length, brotli: brotliCompressSync(buffer).length });

async function main() {
  await rm(out, { recursive: true, force: true });
  const rows = [];
  for (const { game, file, json } of await partModels()) {
    const name = path.basename(file, ".json");
    const dir = path.join(out, game);
    await mkdir(dir, { recursive: true });
    const row = { game, model: name, source: path.relative(appsSrc, file), json: sizes(await readFile(file)) };
    const raw = await jsonToGlb(json);
    for (const mode of MODES) {
      const target = path.join(dir, `${name}.${mode}.glb`);
      if (mode === "none") await writeFile(target, raw);
      else {
        const rawPath = `${target}.raw.glb`;
        await writeFile(rawPath, raw);
        packGlb(rawPath, target, mode);
        await rm(rawPath);
      }
      row[mode] = sizes(await readFile(target));
    }
    rows.push(row);
    console.log(`${game}/${name}`);
  }
  await writeFile(path.join(out, "pesos.json"), JSON.stringify(rows, null, 2));
  const total = (key, field) => rows.reduce((sum, row) => sum + row[key][field], 0);
  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
  console.log(`\n${rows.length} modelos`);
  for (const key of ["json", ...MODES]) {
    console.log(`${key.padEnd(10)} crudo ${kb(total(key, "bytes")).padStart(9)}  gzip ${kb(total(key, "gzip")).padStart(8)}  brotli ${kb(total(key, "brotli")).padStart(8)}`);
  }
}

// Ejecutado directo (no importado). Se compara como URL real: en Windows y con enlaces la ruta
// de argv no coincide letra por letra con import.meta.url.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) await main();
