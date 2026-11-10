import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const images = path.join(root, "public/images");
const archive = path.join(root, "archive/public-unused/images");
const quality = 80;
const isIcon = (name) => /^app-.*\.(png|jpe?g)$/i.test(name) || name === "secuenciador.png";
const widths = new Map([
  ["portada-libro.jpg", 520],
  ["shostakovich.jpg", 320],
  ["medrano.jpg", 320],
  // DarkPageLayout: 960px minus padding; w-full. Retina capped at 1200px.
  ["metodologia.png", 1200],
  // DarkMDXRenderer renders img at full content width (860px minus padding).
  ["musclemania-2018.jpg", 1200],
]);

// Archived originals remain the source on subsequent runs, including when a
// generated WebP needs to be recreated. Public originals take precedence.
const sources = new Map();
for (const directory of [archive, images]) {
  const names = await readdir(directory).catch((error) => {
    if (error.code === "ENOENT" && directory === archive) return [];
    throw error;
  });
  for (const name of names) {
    if (isIcon(name) || widths.has(name)) sources.set(name, path.join(directory, name));
  }
}
for (const name of ["secuenciador.png", ...widths.keys()]) {
  if (!sources.has(name)) throw new Error(`Original missing: ${name}`);
}

const rows = [];
let beforeTotal = 0;
let afterTotal = 0;
for (const [name, source] of [...sources].sort(([a], [b]) => a.localeCompare(b))) {
  const width = isIcon(name) ? 320 : widths.get(name);
  const output = path.join(images, name.replace(/\.[^.]+$/, ".webp"));
  const optimized = await sharp(source)
    .rotate()
    .resize({ width, ...(isIcon(name) ? { height: 320, fit: "inside" } : {}), withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
  const existing = await readFile(output).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!existing?.equals(optimized)) await writeFile(output, optimized);
  const before = (await stat(source)).size;
  beforeTotal += before;
  afterTotal += optimized.length;
  rows.push({
    Archivo: name,
    "Antes (KB)": (before / 1024).toFixed(1),
    "Después (KB)": (optimized.length / 1024).toFixed(1),
    "Ahorro (%)": ((1 - optimized.length / before) * 100).toFixed(1),
  });
}
console.table(rows);
console.log(`Total: ${(beforeTotal / 1024).toFixed(1)} → ${(afterTotal / 1024).toFixed(1)} KB (1 KB = 1024 bytes)`);
