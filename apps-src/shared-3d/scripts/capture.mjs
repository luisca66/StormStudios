// Capturas de aprobación y reporte de presupuestos (fase C del plan de renovación).
//
// Renderiza cada modelo con la luz de su nivel desde varias vistas y arma un reporte con
// triángulos, draw calls, peso y tiempo de lectura, marcando lo que pase del presupuesto
// (presupuestos.json). Sustituye a los renders de Cycles para aprobar un modelo: se ve como en el juego.
//
//   node scripts/capture.mjs [--models=<filtro>] [--preset=multi-2-oceano] [--views=front,three-quarter,side]
//                            [--distance=<u>] [--src=<ruta a .glb/.json dentro de apps-src>] [--out=.cache/capturas] [--strict]
//
// Sin --src usa el GLB ligero de .cache/glb (npm run convert-all) o, si no existe, el JSON del juego.
// --strict sale con código 1 si algún modelo pasa del presupuesto.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { brotliCompressSync, gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openInspector, strip } from "./browser.mjs";
import { partModels } from "./convert-all.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const filter = arg("models", "");
const preset = arg("preset", "neutro");
const views = arg("views", "front,three-quarter,side").split(",");
const distance = arg("distance", "");
const src = arg("src", "");
const out = path.resolve(root, arg("out", ".cache/capturas"));
const strict = process.argv.includes("--strict");
const budgets = JSON.parse(await readFile(path.join(root, "presupuestos.json"), "utf8"));

// Modelos a capturar: un archivo suelto (--src) o los de los juegos.
const targets = [];
if (src) {
  const file = path.resolve(src);
  // Vite sirve archivos de apps-src con /@fs/<ruta absoluta> (en Windows: /@fs/C:/...).
  const fsPath = file.split(path.sep).join("/").replace(/^\//, "");
  targets.push({ id: path.basename(file).replace(/\.(glb|json)$/, ""), file, query: { src: `/@fs/${fsPath}` } });
} else {
  for (const { game, file } of await partModels()) {
    const name = path.basename(file, ".json");
    const id = `${game}/${name}`;
    if (!id.includes(filter)) continue;
    const glb = path.join(root, ".cache/glb", game, `${name}.meshopt-q.glb`);
    let format = "json";
    try { await readFile(glb); format = "meshopt-q"; } catch { /* sin convertir: JSON */ }
    targets.push({ id, file: format === "json" ? file : glb, query: { model: id, format } });
  }
}

const inspector = await openInspector({ width: 560, height: 420 });
await mkdir(out, { recursive: true });
const rows = [];
for (const target of targets) {
  const shots = [];
  let stats;
  for (const view of views) {
    const query = { ...target.query, view, preset, ...(distance && { distance }) };
    const result = await inspector.render(query);
    shots.push(result.image);
    stats = result.stats;
  }
  const bytes = await readFile(target.file);
  const type = budgets.modelos[target.id];
  const limit = type ? budgets.tipos[type] : undefined;
  const over = limit ? [
    limit.porPieza
      ? stats.maxPartTriangles > limit.triangulos && `pieza de ${stats.maxPartTriangles} triángulos > ${limit.triangulos}`
      : stats.triangles > limit.triangulos && `triángulos ${stats.triangles} > ${limit.triangulos}`,
    stats.drawCalls > limit.drawCalls && `draw calls ${stats.drawCalls} > ${limit.drawCalls}`,
  ].filter(Boolean) : [];
  const image = `${target.id.replace("/", "__")}__${preset}.png`;
  await writeFile(path.join(out, image), strip(shots));
  rows.push({
    id: target.id,
    format: target.query.format ?? path.extname(target.file).slice(1),
    type: type ?? "—",
    triangles: stats.triangles,
    drawCalls: stats.drawCalls,
    materials: stats.materials,
    kb: bytes.length / 1024,
    gzipKb: gzipSync(bytes, { level: 9 }).length / 1024,
    brotliKb: brotliCompressSync(bytes).length / 1024,
    parseMs: stats.parseMs,
    over,
    image,
  });
  console.log(`${over.length ? "EXCEDE" : "ok    "} ${target.id}  ${stats.triangles} tri · ${stats.drawCalls} dc${over.length ? " · " + over.join(", ") : ""}`);
}
await inspector.close();

const fmt = (n) => n.toLocaleString("es-MX", { maximumFractionDigits: 0 });
const report = [
  `# Capturas y presupuestos`,
  ``,
  `Luz: \`${preset}\` · vistas: ${views.join(", ")}${distance ? ` · distancia ${distance} u` : ""} · ${new Date().toISOString().slice(0, 10)}`,
  ``,
  `| Modelo | Formato | Tipo | Triángulos | Draw calls | Materiales | Peso | brotli | Lectura | Presupuesto |`,
  `|---|---|---|---:|---:|---:|---:|---:|---:|---|`,
  ...rows.map((r) => `| ${r.id} | ${r.format} | ${r.type} | ${fmt(r.triangles)} | ${r.drawCalls} | ${r.materials} | ${fmt(r.kb)} KB | ${fmt(r.brotliKb)} KB | ${r.parseMs.toFixed(0)} ms | ${r.over.length ? "⚠️ " + r.over.join("; ") : r.type === "—" ? "sin tipo" : "✅"} |`),
  ``,
  `La lectura se mide en Chromium con WebGL por software; en la PC de Luis será menor. Los FPS se miden en el juego.`,
  ``,
  ...rows.map((r) => `### ${r.id}\n\n![${r.id}](${r.image})\n`),
].join("\n");
await writeFile(path.join(out, "reporte.md"), report);
await writeFile(path.join(out, "reporte.json"), JSON.stringify(rows, null, 2));
console.log(`\nReporte: ${path.relative(process.cwd(), path.join(out, "reporte.md"))}`);
process.exit(strict && rows.some((r) => r.over.length) ? 1 : 0);
