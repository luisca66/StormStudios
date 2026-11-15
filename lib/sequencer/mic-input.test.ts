import { describe, expect, it } from "vitest";
import { detectPitch, NoteSegmenter } from "./mic-input";

const RATE = 44100;
/** Tono con armónicos (como una voz o una cuerda), no un seno puro. */
function tone(hz: number, harmonics = [1, 0.6, 0.4, 0.25], size = 4096, gain = 0.3) {
  const samples = new Float32Array(size);
  for (let i = 0; i < size; i++) samples[i] = gain * harmonics.reduce((sum, amplitude, k) => sum + amplitude * Math.sin(2 * Math.PI * hz * (k + 1) * i / RATE), 0);
  return samples;
}
const hzOf = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

describe("detector de altura", () => {
  it("encuentra la fundamental de Do2 a Do6 con menos de 10 cents de error", () => {
    for (let midi = 36; midi <= 84; midi++) {
      const reading = detectPitch(tone(hzOf(midi)), RATE);
      expect(reading, `midi ${midi}`).not.toBeNull();
      expect(Math.abs(reading!.midi - midi) * 100, `midi ${midi}`).toBeLessThan(10);
    }
  });
  it("no confunde la fundamental con su octava cuando el segundo armónico es más fuerte", () => {
    const reading = detectPitch(tone(196, [0.5, 1, 0.3]), RATE);
    expect(Math.round(reading!.midi)).toBe(55); // Sol3, no Sol4
  });
  it("mide la desafinación", () => {
    const reading = detectPitch(tone(hzOf(60) * 2 ** (30 / 1200)), RATE);
    expect((reading!.midi - 60) * 100).toBeGreaterThan(22);
    expect((reading!.midi - 60) * 100).toBeLessThan(38);
  });
  it("calla ante el silencio y el ruido", () => {
    expect(detectPitch(new Float32Array(2048), RATE)).toBeNull();
    expect(detectPitch(tone(220, [1], 2048, 0.004), RATE)).toBeNull();
    let seed = 7; const noise = Float32Array.from({ length: 2048 }, () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647 - 0.5) * 0.6; });
    expect(detectPitch(noise, RATE)).toBeNull();
  });
});

describe("separador de notas", () => {
  const run = (frames: Array<[number | null, number]>) => { const notes: number[] = []; const segmenter = new NoteSegmenter(note => notes.push(note)); let time = 0; for (const [midi, ms] of frames) for (let t = 0; t < ms; t += 20) { segmenter.push(midi, time); time += 20; } return notes; };
  it("entrega una nota sostenida una sola vez", () => {
    expect(run([[60.05, 800]])).toEqual([60]);
  });
  it("ignora notas de paso demasiado breves y deslizamientos", () => {
    expect(run([[60, 300], [61, 60], [62, 300]])).toEqual([60, 62]);
    expect(run([[60, 300], [60.5, 300], [61, 300]])).toEqual([60, 61]);
  });
  it("repite la misma nota solo después de un silencio", () => {
    expect(run([[60, 300], [null, 40], [60, 300]])).toEqual([60]); // un respiro mínimo no corta
    expect(run([[60, 300], [null, 200], [60, 300]])).toEqual([60, 60]);
  });
  it("no escribe nada con lecturas desafinadas o sueltas", () => {
    expect(run([[60.48, 600]])).toEqual([]);
    expect(run([[60, 100], [null, 100], [64, 100], [null, 100]])).toEqual([]);
  });
});
