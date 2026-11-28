#!/usr/bin/env node
/**
 * alinear-narracion.mjs — Tiempo de cada palabra de la narración (ElevenLabs Forced Alignment).
 *
 * Para que cada acción del mouse ocurra justo cuando la voz la nombra, el plan del tutorial puede
 * anclar sus acciones a palabras («atWord»). Este script lee `guion-clips.txt` (un párrafo por clip,
 * el que escribe narracion-elevenlabs.mjs) y cada `N_Chapter_1.mp3`, y deja junto a cada audio
 * `N_Chapter_1.words.json`: [{ "text": "arrástrala", "start": 3.12, "end": 3.71 }, ...] en segundos.
 *
 * Uso:
 *   node scripts/sequencer/alinear-narracion.mjs <carpeta-audio> [--solo N] [--forzar]
 *
 * Requiere ELEVENLABS_API_KEY en el entorno (nunca se imprime ni se escribe en archivos).
 */
import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

const API = "https://api.elevenlabs.io/v1/forced-alignment";

function parseArgs(argv) {
  const options = { folder: "", solo: null, forzar: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--forzar") options.forzar = true;
    else if (arg === "--solo") options.solo = Number(argv[++i]);
    else if (!options.folder) options.folder = arg;
    else throw new Error(`Argumento desconocido: ${arg}`);
  }
  if (!options.folder) throw new Error("Uso: node scripts/sequencer/alinear-narracion.mjs <carpeta-audio> [--solo N] [--forzar]");
  if (options.solo !== null && !(Number.isInteger(options.solo) && options.solo >= 1)) throw new Error("--solo requiere un número de clip.");
  return options;
}

const exists = file => access(file).then(() => true, () => false);

async function align(key, mp3, text) {
  const form = new FormData();
  form.append("file", new Blob([await readFile(mp3)], { type: "audio/mpeg" }), path.basename(mp3));
  form.append("text", text);
  const response = await fetch(API, { method: "POST", headers: { "xi-api-key": key }, body: form });
  if (!response.ok) throw new Error(`ElevenLabs respondió ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const data = await response.json();
  if (!Array.isArray(data.words)) throw new Error("La respuesta no trae palabras.");
  return data.words
    .filter(word => word.text.trim())
    .map(word => ({ text: word.text.trim(), start: Math.round(word.start * 1000) / 1000, end: Math.round(word.end * 1000) / 1000 }));
}

const { folder, solo, forzar } = parseArgs(process.argv.slice(2));
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("Falta ELEVENLABS_API_KEY en el entorno.");
const texts = (await readFile(path.join(folder, "guion-clips.txt"), "utf8")).split(/\r?\n/).filter(line => line.trim());
const clips = solo ? [solo] : texts.map((_, index) => index + 1);
for (const n of clips) {
  const mp3 = path.join(folder, `${n}_Chapter_1.mp3`), out = path.join(folder, `${n}_Chapter_1.words.json`);
  if (!forzar && await exists(out)) continue;
  if (!await exists(mp3)) throw new Error(`No existe ${mp3}`);
  const words = await align(key, mp3, texts[n - 1]);
  await writeFile(out, JSON.stringify(words, null, 1) + "\n", "utf8");
  console.log(`Clip ${n}: ${words.length} palabras (${words.at(-1)?.end ?? 0} s)`);
}
