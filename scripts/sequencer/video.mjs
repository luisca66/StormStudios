#!/usr/bin/env node
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { concatFile, docxParagraphs, nearestPause, silenceMidpoints, srtTime, validateAudioMap, partialSubtitle } from "./video-utils.mjs";

import { externalMusic, externalMusicFilter, externalMusicPreparation, musicNormalization, normalizationFilter, peakLimiter } from "./external-music.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
async function run(command, args, capture = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ["ignore", capture ? "pipe" : "inherit", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout?.on("data", data => { stdout += data; });
    child.stderr.on("data", data => { stderr += data; });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${command} (${code}): ${stderr.slice(-6000)}`)));
  });
}
async function exists(file) { try { await access(file); return true; } catch { return false; } }
async function probe(file) { return JSON.parse((await run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], true)).stdout); }
async function duration(file) { return Number((await probe(file)).format.duration); }
const ffmpeg = args => run("ffmpeg", ["-hide_banner", "-loglevel", "warning", "-y", ...args], true);

async function analyze(file, filter, targetI) {
  // Flush loudnorm's three-second lookahead into analysis silence, trimmed from output.
  const analysis = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", `${filter},apad=pad_dur=3,loudnorm=I=${targetI}:TP=-1.5:LRA=50:print_format=json`, "-f", "null", "-"], true);
  const measured = JSON.parse(analysis.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0] ?? "null");
  if (!measured || !Number.isFinite(Number(measured.input_i))) throw new Error(`Audio sin sonoridad medible: ${file}`);
  return measured;
}

async function meter(file) {
  const result = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"], true);
  const summary = result.stderr.slice(result.stderr.lastIndexOf("Summary:"));
  const integrated = Number(/I:\s*([-\d.]+) LUFS/.exec(summary)?.[1]);
  const truePeak = Number(/Peak:\s*([-\d.]+) dBFS/.exec(summary)?.[1]);
  if (![integrated, truePeak].every(Number.isFinite)) throw new Error(`Medición EBU R128 fallida: ${file}`);
  return { integrated, truePeak };
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === "--help") {
    console.log("Uso: npm run video -- <storyboard.json> --audio <mapa.json> --clips <dir> [--out <dir>] [--base http://localhost:3100]");
    return;
  }
  const input = path.resolve(args.shift()), options = {};
  while (args.length) {
    const flag = args.shift(), value = args.shift();
    if (!["--audio", "--clips", "--out", "--base"].includes(flag) || !value || value.startsWith("--")) throw new Error(`Opción inválida: ${flag}`);
    options[flag] = value;
  }
  if (!options["--audio"] || !options["--clips"]) throw new Error("Faltan --audio y --clips");
  const board = JSON.parse(await readFile(input, "utf8"));
  const map = JSON.parse(await readFile(path.resolve(options["--audio"]), "utf8"));
  validateAudioMap(board, map);
  const external = new Map();
  for (const still of board.stills) {
    if (still.audio && still.musicFile) throw new Error(`Still "${still.id}": audio y musicFile son excluyentes`);
    if (still.musicFile) {
      if (still.cursor) throw new Error(`Still "${still.id}": musicFile no admite cursores`);
      external.set(still.id, await externalMusic(still, input, duration));
    }
  }
  const clips = path.resolve(options["--clips"]);
  const stills = path.resolve("stills", board.locale, board.lesson);
  const out = path.resolve(options["--out"] ?? path.join(stills, "video"));
  const work = path.join(out, "work");
  await mkdir(work, { recursive: true });
  const baseArgs = options["--base"] ? ["--base", options["--base"]] : [];
  const manifestFile = path.join(stills, "manifest.json");
  let manifest = await exists(manifestFile) ? JSON.parse(await readFile(manifestFile, "utf8")) : null;
  let complete = manifest?.width === 1920 && manifest?.height === 1080 && manifest.stills.length === board.stills.length;
  if (complete) for (const still of board.stills) {
    const entry = manifest.stills.find(s => s.id === still.id);
    if (!entry || !await exists(path.join(stills, entry.file)) || (still.audio && (!entry.audio || !entry.music || !await exists(path.join(stills, entry.audio))))) complete = false;
  }
  if (!complete) {
    await run(process.execPath, [path.join(here, "stills.mjs"), input, "--out", stills, ...baseArgs]);
    manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  }
  if (manifest.width !== 1920 || manifest.height !== 1080) throw new Error("El video requiere stills de 1920×1080");
  const paragraphs = docxParagraphs(await readFile(map.source.script));
  if (paragraphs.length !== map.source.clips) throw new Error(`Guion: ${paragraphs.length} párrafos, esperaba ${map.source.clips}`);
  const officialText = await readFile(map.source.durations, "utf8");
  const durations = new Map([...officialText.matchAll(/^\s*\d+\s+(\d+)_Chapter_1\.mp3\s+([\d.]+)\s*$/gm)].map(m => [Number(m[1]), Number(m[2])]));
  if (durations.size !== map.source.clips) throw new Error("Tabla de duraciones incompleta");
  const roundedVoice = [...durations.values()].reduce((a, b) => a + b, 0);
  const declared = /Suma de duraciones:\s*([\d.]+)/.exec(officialText);
  const officialVoice = declared ? Number(declared[1]) : roundedVoice;
  if (Math.abs(roundedVoice - officialVoice) > map.source.clips * .0005) throw new Error("Suma oficial inconsistente");
  const clipFile = n => path.join(clips, map.source.clipPattern.replace("{n}", String(n)));
  const decoded = new Map();
  for (let n = 1; n <= map.source.clips; n++) {
    const file = path.join(work, `source-${n}.wav`);
    await ffmpeg(["-i", clipFile(n), "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", file]);
    const actual = await duration(file);
    if (Math.abs(actual - durations.get(n)) > .002) throw new Error(`Clip ${n}: duración ${actual}, tabla ${durations.get(n)}`);
    durations.set(n, actual); decoded.set(n, file);
  }
  const pauses = new Map(), cuts = new Map();
  for (const entry of map.stills) for (const point of [entry.start, entry.end]) if (point.at !== 0 && point.at !== 1) {
    if (!pauses.has(point.clip)) {
      const detection = await run("ffmpeg", ["-hide_banner", "-i", clipFile(point.clip), "-af", "silencedetect=noise=-35dB:d=0.12", "-f", "null", "-"], true);
      pauses.set(point.clip, silenceMidpoints(detection.stderr));
    }
    cuts.set(`${point.clip}:${point.at}`, nearestPause(pauses.get(point.clip), point.at, durations.get(point.clip)));
  }
  const atTime = point => point.at === 0 ? 0 : point.at === 1 ? durations.get(point.clip) : cuts.get(`${point.clip}:${point.at}`);

  // Derive cursor captures without changing the original storyboard or its numbering.
  const derived = structuredClone(board), cursorIds = new Map();
  for (const source of Object.values(derived.projects)) if (source.file) source.file = path.resolve(path.dirname(input), source.file);
  derived.stills = [];
  for (const [index, still] of board.stills.entries()) {
    const music = manifest.stills[index].music;
    if (!still.audio) continue;
    const ids = music.beats.map((beat, i) => {
      const id = `${still.id}-cursor-${i + 1}`;
      derived.stills.push({ ...still, id, audio: false, cursor: beat.cursor });
      return id;
    });
    cursorIds.set(still.id, ids);
  }
  let cursorManifest = { stills: [] };
  const cursorDir = path.join(work, "cursors");
  if (derived.stills.length) {
    const derivedFile = path.join(work, "cursor-storyboard.json");
    await writeFile(derivedFile, JSON.stringify(derived, null, 2) + "\n");
    await run(process.execPath, [path.join(here, "stills.mjs"), derivedFile, "--out", cursorDir, "--context", input, ...baseArgs]);
    cursorManifest = JSON.parse(await readFile(path.join(cursorDir, "manifest.json"), "utf8"));
  }
  // Credit captures are shown exclusively during external music; voice keeps the original PNG.
  const credited = structuredClone(board);
  for (const source of Object.values(credited.projects)) if (source.file) source.file = path.resolve(path.dirname(input), source.file);
  credited.stills = board.stills.filter(s => s.musicFile && s.musicCredit).map(s => ({ ...s, id: `${s.id}-music-credit` }));
  let creditManifest = { stills: [] };
  const creditDir = path.join(work, "credits");
  if (credited.stills.length) {
    const creditFile = path.join(work, "credit-storyboard.json");
    await writeFile(creditFile, JSON.stringify(credited, null, 2) + "\n");
    await run(process.execPath, [path.join(here, "stills.mjs"), creditFile, "--out", creditDir, "--context", input, "--music", "true", ...baseArgs]);
    creditManifest = JSON.parse(await readFile(path.join(creditDir, "manifest.json"), "utf8"));
  }
  const silence = new Map();
  async function silent(seconds) {
    if (!silence.has(seconds)) {
      const file = path.join(work, `silence-${seconds}.wav`);
      await ffmpeg(["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", String(seconds), "-c:a", "pcm_s16le", file]);
      silence.set(seconds, file);
    }
    return silence.get(seconds);
  }
  const audioFiles = [], frames = [], timeline = [], subtitles = [];
  let time = 0, voiceSeconds = 0, musicSeconds = 0, pauseSeconds = 0;
  const image = (file, seconds) => { if (seconds > 0) frames.push({ file, duration: seconds }); };
  const addSilence = async seconds => { audioFiles.push(await silent(seconds)); time += seconds; pauseSeconds += seconds; };
  for (const [index, still] of board.stills.entries()) {
    const entry = map.stills[index], capture = manifest.stills[index], png = path.join(stills, capture.file);
    const segment = { id: still.id, start: time, clips: [], music: null };
    const prefix = index === 0 ? 1.5 : .4;
    await addSilence(prefix);
    for (let n = entry.start.clip; n <= entry.end.clip; n++) {
      if (n > entry.start.clip) await addSilence(.25);
      const from = n === entry.start.clip ? atTime(entry.start) : 0;
      const to = n === entry.end.clip ? atTime(entry.end) : durations.get(n);
      const length = to - from;
      if (!(length > 0)) throw new Error(`Corte inválido en ${still.id}, clip ${n}`);
      const file = path.join(work, `${index + 1}-clip-${n}.wav`);
      await ffmpeg(["-i", decoded.get(n), "-af", `atrim=start=${from}:end=${to},asetpts=PTS-STARTPTS,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,asetpts=N/SR/TB,apad,atrim=end_sample=${Math.round(length * 48000)}`, "-ac", "2", "-c:a", "pcm_s16le", file]);
      const actual = await duration(file);
      segment.clips.push({ clip: n, file: clipFile(n), sourceStart: from, sourceEnd: to, start: time, end: time + actual });
      const text = partialSubtitle(entry, n, paragraphs[n - 1], from, to, durations.get(n));
      subtitles.push({ start: time, end: time + actual, text });
      audioFiles.push(file); time += actual; voiceSeconds += actual;
    }
    image(png, time - segment.start);
    if (still.audio) {
      const wav = path.join(stills, capture.audio), file = path.join(work, `${index + 1}-music.wav`);
      const sourceLength = await duration(wav);
      await ffmpeg(["-i", wav, "-af", `loudnorm=I=-19:TP=-4.5:LRA=11,aresample=48000,asetpts=N/SR/TB,apad,atrim=end_sample=${Math.round(sourceLength * 48000)}`, "-ac", "2", "-c:a", "pcm_s16le", file]);
      const length = await duration(file);
      segment.music = { file: wav, start: time, end: time + length, tempo: capture.music.tempo, cursors: [] };
      const beats = capture.music.beats, ids = cursorIds.get(still.id);
      for (let i = 0; i < beats.length; i++) {
        const start = beats[i].time, end = Math.min(length, beats[i + 1]?.time ?? length);
        const cursorPng = path.join(cursorDir, cursorManifest.stills.find(s => s.id === ids[i]).file);
        image(cursorPng, end - start);
        segment.music.cursors.push({ ...beats[i], file: cursorPng, start: time + start, end: time + end });
      }
      audioFiles.push(file); time += length; musicSeconds += length;
    }
    if (still.musicFile) {
      const source = external.get(still.id), file = path.join(work, `${index + 1}-external-music.wav`);
      const preparation = `${externalMusicPreparation(source)},aresample=192000`;
      const before = await analyze(source.file, preparation, -19);
      const measured = await analyze(source.file, `${preparation},${peakLimiter(-6)}`, -19);
      const normalization = musicNormalization(measured);
      if (normalization.mode !== "linear") throw new Error(`Still "${still.id}": el limitador previo no permite −19 LUFS en modo lineal`);
      normalization.limiter = { ceiling: -6, attackMs: 5, releaseMs: 50, autoLevel: false, latencyCompensated: true,
        beforeTP: Number(before.input_tp), afterTP: Number(measured.input_tp), peakReductionDb: Math.max(0, Number(before.input_tp) - Number(measured.input_tp)) };
      const applied = await run("ffmpeg", ["-hide_banner", "-nostats", "-y", "-i", source.file, "-af", externalMusicFilter(source, normalization), "-ac", "2", "-c:a", "pcm_s16le", file], true);
      if (normalization.mode === "linear") {
        const result = JSON.parse(applied.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0] ?? "null");
        if (result?.normalization_type !== "linear") throw new Error(`Still "${still.id}": loudnorm no aplicó modo lineal`);
        normalization.output = result;
      }
      normalization.verified = await meter(file);
      if (Math.abs(normalization.verified.integrated + 19) > .3 || normalization.verified.truePeak > -1.5) throw new Error(`Still "${still.id}": fragmento fuera de objetivo ${JSON.stringify(normalization.verified)}`);
      const length = await duration(file);
      if (Math.abs(length - source.seconds) > 1 / 48000) throw new Error(`Still "${still.id}": duración musical inesperada ${length}`);
      const credit = creditManifest.stills.find(s => s.id === `${still.id}-music-credit`);
      const musicPng = credit ? path.join(creditDir, credit.file) : png;
      segment.music = { file: source.file, sourceStart: source.sourceStart, sourceEnd: source.sourceEnd, start: time, end: time + length, credit: still.musicCredit, image: musicPng, normalization, cursors: [] };
      image(musicPng, length);
      audioFiles.push(file); time += length; musicSeconds += length;
    }
    await addSilence(.6); image(png, .6);
    segment.end = time; timeline.push(segment);
    console.log(`${index + 1}/${board.stills.length} ${still.id}: ${segment.start.toFixed(3)}–${time.toFixed(3)} s`);
  }
  if (Math.abs(voiceSeconds - officialVoice) > .01) throw new Error(`Voz ${voiceSeconds}, oficial ${officialVoice}`);
  const audioList = path.join(work, "audio-concat.txt"), imagesList = path.join(work, "images-concat.txt");
  await writeFile(audioList, audioFiles.map(concatFile).join("\n") + "\n");
  await writeFile(imagesList, "ffconcat version 1.0\n" + frames.map(f => `${concatFile(f.file)}\noption framerate 30\nduration ${f.duration.toFixed(9)}`).join("\n") + "\n" + concatFile(frames.at(-1).file) + "\noption framerate 30\n");
  const premix = path.join(work, "premix.wav");
  await ffmpeg(["-f", "concat", "-safe", "0", "-i", audioList, "-c:a", "copy", premix]);
  const measured = await analyze(premix, "aresample=192000", -16);
  const normalization = musicNormalization(measured, -16, -1.5);
  const normalize = `aresample=192000,apad=pad_dur=3,${normalizationFilter(normalization)},aresample=48000,atrim=end_sample=${Math.round(time * 48000)}`;
  const stem = `leccion-${/(?:leccion|lesson)-(\d+)/.exec(board.lesson)?.[1] ?? board.lesson}-v1`;
  const mp4 = path.join(out, stem + ".mp4");
  console.log(`Codificando ${time.toFixed(3)} segundos…`);
  const encoded = await run("ffmpeg", ["-hide_banner", "-nostats", "-y", "-f", "concat", "-safe", "0", "-i", imagesList, "-i", premix, "-map", "0:v:0", "-map", "1:a:0", "-t", String(time), "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-af", normalize, "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", mp4], true);
  if (normalization.mode === "linear") {
    normalization.output = JSON.parse(encoded.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0] ?? "null");
    if (normalization.output?.normalization_type !== "linear") throw new Error("La mezcla final no aplicó modo lineal");
  }
  normalization.measured = measured;
  normalization.verified = await meter(mp4);
  normalization.targetMet = Math.abs(normalization.verified.integrated + 16) <= .5 && normalization.verified.truePeak <= -1;
  const info = await probe(mp4), actual = Number(info.format.duration);
  if (info.streams.filter(s => s.codec_type === "video").length !== 1 || info.streams.filter(s => s.codec_type === "audio").length !== 1) throw new Error("MP4: se esperaba una pista de video y una de audio");
  if (Math.abs(actual - time) > .1) throw new Error(`Duración MP4 ${actual}, timeline ${time}`);
  const report = { lesson: board.lesson, duration: time, mp4Duration: actual, officialVoiceSeconds: officialVoice, voiceSeconds, musicSeconds, pauseSeconds, cuts: Object.fromEntries(cuts), normalization, stills: timeline };
  await writeFile(path.join(out, "timeline.json"), JSON.stringify(report, null, 2) + "\n");
  await writeFile(path.join(out, stem + ".srt"), subtitles.map((s, i) => `${i + 1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.text}\n`).join("\n"));
  console.log(`Video: ${mp4}\nDuración verificada: ${actual.toFixed(3)} s (voz ${voiceSeconds.toFixed(3)} + música ${musicSeconds.toFixed(3)} + pausas ${pauseSeconds.toFixed(3)})`);
}
main().catch(error => { console.error(`Video: ${error.message}`); process.exitCode = 1; });
