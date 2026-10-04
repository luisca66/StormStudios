import { access } from "node:fs/promises";
import path from "node:path";

/** Preserve source offsets; reject trims that ffmpeg would silently shorten. */
export function musicWindow(still, seconds) {
  const fail = message => { throw new Error(`Still "${still.id}": ${message}`); };
  if (still.audio && still.musicFile) fail("audio y musicFile son excluyentes");
  if (!Number.isFinite(seconds) || seconds <= 0) fail("duración musical inválida");
  const trim = still.musicTrim ?? [0, seconds];
  if (!Array.isArray(trim) || trim.length !== 2 || !trim.every(Number.isFinite) || trim[0] < 0 || trim[1] <= trim[0] || trim[1] > seconds) fail(`musicTrim fuera de rango (0..${seconds})`);
  return { sourceStart: trim[0], sourceEnd: trim[1], seconds: trim[1] - trim[0] };
}

export async function externalMusic(still, storyboardFile, duration) {
  const file = path.resolve(path.dirname(storyboardFile), still.musicFile);
  try { await access(file); }
  catch { throw new Error(`Still "${still.id}": falta musicFile "${file}"`); }
  try { return { file, ...musicWindow(still, await duration(file)) }; }
  catch (error) { throw new Error(`Still "${still.id}", musicFile "${file}": ${error.message}`); }
}

export function externalMusicFilter(window) {
  const samples = Math.round(window.seconds * 48000);
  return `atrim=start=${window.sourceStart}:end=${window.sourceEnd},asetpts=PTS-STARTPTS,loudnorm=I=-19:TP=-4.5:LRA=11,aresample=48000,asetpts=N/SR/TB,apad,atrim=end_sample=${samples},afade=t=in:st=0:d=0.5,afade=t=out:st=${Math.max(0, window.seconds - .5)}:d=0.5`;
}
