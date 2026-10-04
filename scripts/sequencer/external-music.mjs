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

export function musicNormalization(measured) {
  const inputI = Number(measured.input_i), inputTP = Number(measured.input_tp);
  const inputLRA = Number(measured.input_lra), threshold = Number(measured.input_thresh);
  if (![inputI, inputTP, inputLRA, threshold].every(Number.isFinite)) throw new Error("Música externa sin sonoridad medible");
  const targetI = -19, targetTP = -4.5;
  const requestedGain = targetI - inputI, peakGain = targetTP - inputTP;
  const gain = Math.min(requestedGain, peakGain);
  return { mode: requestedGain <= peakGain ? "linear" : "peak-limited-gain", targetI, targetTP,
    inputI, inputTP, inputLRA, threshold, requestedGain, gain, expectedI: inputI + gain,
    expectedTP: inputTP + gain, targetLRA: Math.max(11, inputLRA) };
}

export function externalMusicPreparation(window) {
  const samples = Math.round(window.seconds * 48000);
  return `atrim=start=${window.sourceStart}:end=${window.sourceEnd},asetpts=PTS-STARTPTS,aresample=48000,asetpts=N/SR/TB,apad,atrim=end_sample=${samples},afade=t=in:st=0:d=0.5,afade=t=out:st=${Math.max(0, window.seconds - .5)}:d=0.5`;
}

export function externalMusicFilter(window, normalization) {
  const n = normalization;
  const filter = n.mode === "linear"
    ? `loudnorm=I=${n.targetI}:TP=${n.targetTP}:LRA=${n.targetLRA}:measured_I=${n.inputI}:measured_TP=${n.inputTP}:measured_LRA=${n.inputLRA}:measured_thresh=${n.threshold}:linear=true:print_format=json`
    : `volume=${n.gain}dB`;
  return `${externalMusicPreparation(window)},${filter},aresample=48000,apad,atrim=end_sample=${Math.round(window.seconds * 48000)}`;
}
