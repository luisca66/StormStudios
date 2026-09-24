// Prueba visual: renderiza cada modelo desde el JSON y desde cada GLB en Chromium (WebGL por
// software, determinista) y los compara píxel a píxel. Requiere `npm run convert-all` antes.
//
//   node scripts/compare-renders.mjs [--models=<filtro>] [--views=front,three-quarter,side]
//
// Salida en .cache/renders/: <juego>__<modelo>__<vista>.png (JSON | GLB exacto | GLB ligero | diferencia)
// y resumen.json. Sale con código 1 si algún GLB exacto no es idéntico al JSON.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { openInspector, strip } from "./browser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".cache/renders");
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const filter = arg("models", "");
const views = arg("views", "front,three-quarter,side").split(",");
const FORMATS = ["json", "none", "meshopt", "meshopt-q"];

const weights = JSON.parse(await readFile(path.join(root, ".cache/glb/pesos.json"), "utf8"));
const models = weights.map((w) => `${w.game}/${w.model}`).filter((id) => id.includes(filter));
const inspector = await openInspector({ width: 480, height: 360 });

async function render(model, format, view, frame) {
  const result = await inspector.render({ model, format, view, ...(frame && { frame: frame.join(",") }) });
  return { image: result.image, frame: result.stats.frame };
}

function compare(a, b) {
  const diff = new PNG({ width: a.width, height: a.height });
  const pixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
  let maxChannel = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    for (let c = 0; c < 3; c++) maxChannel = Math.max(maxChannel, Math.abs(a.data[i + c] - b.data[i + c]));
  }
  return { pixels, percent: (100 * pixels) / (a.width * a.height), maxChannel, diff };
}

await mkdir(out, { recursive: true });
const summary = [];
let failed = false;
for (const model of models) {
  for (const view of views) {
    // Todos con el encuadre del JSON: así solo cuenta la geometría, no el tamaño de la caja.
    const reference = await render(model, "json", view);
    const shots = { json: reference.image };
    for (const format of FORMATS.slice(1)) shots[format] = (await render(model, format, view, reference.frame)).image;
    const row = { model, view };
    for (const format of FORMATS.slice(1)) {
      const { diff, ...result } = compare(shots.json, shots[format]);
      row[format] = result;
      if (format === "meshopt-q") row.diffImage = diff;
    }
    // GLB sin comprimir y GLB exacto: deben dar la misma imagen que el JSON.
    const exact = row.none.pixels === 0 && row.meshopt.pixels === 0;
    if (!exact) failed = true;
    await writeFile(path.join(out, `${model.replace("/", "__")}__${view}.png`), strip([shots.json, shots.meshopt, shots["meshopt-q"], row.diffImage]));
    delete row.diffImage;
    summary.push(row);
    const fmt = (r) => `${r.pixels} px (${r.percent.toFixed(3)} %, máx ${r.maxChannel})`;
    console.log(`${exact ? "ok " : "DIF"} ${model} ${view} | GLB ${fmt(row.none)} | exacto ${fmt(row.meshopt)} | ligero ${fmt(row["meshopt-q"])}`);
  }
}
await writeFile(path.join(out, "resumen.json"), JSON.stringify(summary, null, 2));
await inspector.close();
process.exit(failed ? 1 : 0);
