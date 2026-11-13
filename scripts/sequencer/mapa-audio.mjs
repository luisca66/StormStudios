#!/usr/bin/env node
// Builds the still -> voice-clip map that `npm run video` needs.
// The narration of every still is aligned, character by character, with the paragraphs of the script DOCX
// (one paragraph = one ElevenLabs clip). Small differences (a typo recorded in the audio, punctuation,
// accents) are tolerated; a real divergence stops with the still id and both texts.
//
// Uso: npm run mapa-audio -- <storyboard.json> --docx <guion.docx> [--durations <Duraciones.txt>] [--zip <ElevenLabs.zip>] [--out <mapa.json>]
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { docxParagraphs, validateAudioMap } from "./video-utils.mjs";

const fold = text => text.normalize("NFD").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Maps every index of `narration` (plus its end) to an index of `script`, resyncing after small differences. */
export function alignStreams(narration, script, { window = 48, anchor = 12 } = {}) {
  const map = new Int32Array(narration.length + 1);
  let i = 0, j = 0;
  while (i < narration.length) {
    if (j < script.length && narration[i] === script[j]) { map[i++] = j++; continue; }
    let found = null;
    search: for (let reach = 1; reach <= window * 2; reach++) {
      for (let di = 0; di <= Math.min(reach, window); di++) {
        const dj = reach - di;
        if (dj > window) continue;
        // A resync needs a full anchor; only the very end of the narration may use a shorter one.
        const a = narration.slice(i + di, i + di + anchor);
        if (a.length < Math.min(anchor, narration.length - i)) continue;
        if (a.length && a === script.slice(j + dj, j + dj + a.length)) { found = [di, dj]; break search; }
      }
    }
    if (!found) return { map: null, at: i, scriptAt: j };
    for (let k = 0; k < found[0]; k++) map[i + k] = j;
    i += found[0]; j += found[1];
  }
  map[narration.length] = script.length;
  return { map, at: -1, scriptAt: j };
}

export function buildAudioMap(board, paragraphs) {
  let script = "";
  const owner = [], offset = [], size = [];
  paragraphs.forEach((text, index) => {
    const folded = fold(text);
    size[index + 1] = folded.length;
    for (let k = 0; k < folded.length; k++) { owner.push(index + 1); offset.push(k); }
    script += folded;
  });
  let narration = "";
  const bounds = board.stills.map(still => {
    const from = narration.length;
    narration += fold(still.narration ?? "");
    return { id: still.id, from, to: narration.length };
  });
  const { map, at, scriptAt } = alignStreams(narration, script);
  if (!map) {
    const still = bounds.find(b => at >= b.from && at < b.to) ?? bounds.at(-1);
    throw new Error(`La narración del still "${still.id}" no coincide con el guion.\n  guion:     …${script.slice(scriptAt, scriptAt + 70)}\n  narración: …${narration.slice(at, at + 70)}`);
  }
  if (narration.length && map[narration.length] - map[narration.length - 1] > 60) throw new Error("El guion tiene texto al final que ningún still narra.");
  const point = index => {
    if (index >= script.length) return { clip: paragraphs.length, at: 1 };
    const clip = owner[index], at = offset[index] / size[clip];
    return at < 0.02 ? { clip, at: 0 } : at > 0.98 ? { clip: clip + 1, at: 0 } : { clip, at: Number(at.toFixed(3)) };
  };
  const stills = bounds.map((b, n) => {
    if (b.from === b.to) throw new Error(`El still "${b.id}" no tiene narración: todo still debe cubrir parte del audio.`);
    const start = n === 0 ? { clip: 1, at: 0 } : point(map[b.from]);
    let end = n === bounds.length - 1 ? { clip: paragraphs.length, at: 1 } : point(map[b.to]);
    if (end.at === 0) end = { clip: end.clip - 1, at: 1 }; // an end at the start of a clip is the end of the previous one
    return { id: b.id, start, end };
  });
  // Starts must equal the previous end exactly, even when rounding moved them to a clip boundary.
  for (let n = 1; n < stills.length; n++) {
    const prev = stills[n - 1].end;
    stills[n].start = prev.at === 1 ? { clip: prev.clip + 1, at: 0 } : { ...prev };
  }
  return stills;
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === "--help") {
    console.log("Uso: npm run mapa-audio -- <storyboard.json> --docx <guion.docx> [--durations <txt>] [--zip <zip>] [--out <mapa.json>]");
    return;
  }
  const input = path.resolve(args[0]);
  const options = {};
  for (let i = 1; i < args.length; i += 2) {
    if (!["--docx", "--durations", "--zip", "--out"].includes(args[i]) || !args[i + 1]) throw new Error(`Opción inválida: ${args[i]}`);
    options[args[i]] = args[i + 1];
  }
  if (!options["--docx"]) throw new Error("Falta --docx con el guion (un párrafo por clip de ElevenLabs)");
  const board = JSON.parse(await readFile(input, "utf8"));
  const docx = path.resolve(options["--docx"]);
  const paragraphs = docxParagraphs(await readFile(docx));
  const stills = buildAudioMap(board, paragraphs);
  const map = {
    lesson: board.lesson,
    source: { zip: options["--zip"] ?? "", durations: options["--durations"] ?? "", script: docx.replaceAll("\\", "/"), clipPattern: "{n}_Chapter_1.mp3", clips: paragraphs.length },
    note: "Generado por npm run mapa-audio. `at` es la fracción del clip (por caracteres del guion); las fracciones internas se ajustan a la pausa más cercana al montar el video.",
    stills,
  };
  validateAudioMap(board, map);
  const out = path.resolve(options["--out"] ?? input.replace(/\.json$/, ".audio.json"));
  await writeFile(out, JSON.stringify(map, null, 1) + "\n");
  const splits = stills.filter(s => s.start.at > 0);
  console.log(`${stills.length} stills, ${paragraphs.length} clips → ${path.relative(process.cwd(), out)}`);
  if (splits.length) console.log(`Clips repartidos entre stills: ${[...new Set(splits.map(s => s.start.clip))].join(", ")} (el SRT necesita su texto parcial).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exit(1); });
}
