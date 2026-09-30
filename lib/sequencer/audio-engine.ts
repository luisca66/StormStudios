import { activeVoices, durationTicks, measureTicks, midiToPitch, pitchToMidi, scoreTicks } from "./model";
import { PPQ, type Instrument, type Score, type Voice } from "./types";

export type AudioState = "stopped" | "loading" | "playing" | "exporting";
type Sound = { voice: Voice; pitch: string; start: number; ticks: number };

/** Merge only compatible contiguous ties, never merge neighboring untied notes. */
export function scoreSounds(score: Score): Sound[] {
  const voices = activeVoices(score).filter(v => !v.mute);
  const audible = voices.some(v => v.solo) ? voices.filter(v => v.solo) : voices;
  const result: Sound[] = [];
  for (const voice of audible) {
    const events = [...voice.events].sort((a, b) => a.start - b.start);
    const consumed = new Set<string>();
    for (let index = 0; index < events.length; index++) {
      const event = events[index];
      if (consumed.has(event.id) || !event.pitches.length) continue;
      let ticks = durationTicks(event), current = event, nextIndex = index + 1;
      while (current.tie && nextIndex < events.length) {
        const next = events[nextIndex];
        if (next.start !== event.start + ticks || next.pitches.join() !== event.pitches.join()) break;
        ticks += durationTicks(next);
        consumed.add(next.id); current = next; nextIndex++;
      }
      for (const pitch of event.pitches) result.push({ voice, pitch, start: event.start, ticks });
    }
  }
  return result;
}

export function sampleForPitch(pitch: string) {
  const midi = pitchToMidi(pitch), sampled = Math.max(36, Math.min(95, midi));
  return { name: midiToPitch(sampled), rate: 2 ** ((midi - sampled) / 12) };
}

export class SequencerAudio {
  private context: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private pending = new Map<string, Promise<AudioBuffer | null>>();
  private nodes: AudioScheduledSourceNode[] = [];
  private master: GainNode | null = null;
  private masterVolume = 1;
  private epoch = 0;
  private animation = 0;
  private previewEpoch = 0;
  private previews: AudioScheduledSourceNode[] = [];
  private previewMaster: GainNode | null = null;
  private previewTimer: ReturnType<typeof setTimeout> | null = null;
  constructor(
    private state: (state: AudioState) => void,
    private progress: (tick: number) => void,
    private warning: (message: string) => void,
  ) {}

  private async initialize() {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === "suspended") await this.context.resume();
    return this.context;
  }

  private async load(instrument: Instrument, pitch: string): Promise<AudioBuffer | null> {
    if (instrument === "Synth") return null;
    const { name } = sampleForPitch(pitch), key = instrument + "/" + name;
    if (this.buffers.has(key)) return this.buffers.get(key)!;
    if (this.pending.has(key)) return this.pending.get(key)!;
    const task = (async () => {
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000);
      try {
        // Local preview uses the existing same-origin proxy; production uses R2 directly.
        const base = ["localhost", "127.0.0.1", "::1"].includes(location.hostname)
          ? "/api/audio" : "https://samples.stormstudios.com.mx";
        const response = await fetch(base + "/" + instrument + "/" + encodeURIComponent(name) + ".mp3",
          { cache: "no-cache", signal: controller.signal });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const bytes = await response.arrayBuffer();
        const context = this.context ?? await this.initialize();
        const buffer = await context.decodeAudioData(bytes);
        this.buffers.set(key, buffer);
        return buffer;
      } catch {
        this.warning("samples");
        return null;
      } finally { clearTimeout(timer); }
    })();
    this.pending.set(key, task);
    try { return await task; } finally { this.pending.delete(key); }
  }

  private async preload(sounds: Sound[], request: number) {
    const unique = new Map(sounds.map(s => [s.voice.instrument + "/" + sampleForPitch(s.pitch).name, s]));
    const queue = [...unique.values()];
    await Promise.all(Array.from({ length: Math.min(6, queue.length) }, async () => {
      while (queue.length && request === this.epoch) {
        const sound = queue.shift()!;
        await this.load(sound.voice.instrument, sound.pitch);
      }
    }));
  }

  private cachedSample(instrument: Instrument, pitch: string, nearest = false) {
    if (instrument === "Synth") return null;
    const sample = sampleForPitch(pitch);
    const exact = this.buffers.get(instrument + "/" + sample.name);
    if (exact) return { buffer: exact, rate: sample.rate };
    if (!nearest) return null;
    const midi = pitchToMidi(pitch);
    let closest: { buffer: AudioBuffer; rate: number; distance: number } | null = null;
    for (const [key, buffer] of this.buffers) {
      if (!key.startsWith(instrument + "/")) continue;
      const sampled = pitchToMidi(key.slice(instrument.length + 1)), distance = Math.abs(midi - sampled);
      if (!closest || distance < closest.distance) closest = { buffer, rate: 2 ** ((midi - sampled) / 12), distance };
    }
    return closest;
  }

  private sound(context: BaseAudioContext, destination: AudioNode, sound: Sound, start: number, duration: number, nearest = false) {
    const sample = this.cachedSample(sound.voice.instrument, sound.pitch, nearest);
    const buffer = sample?.buffer;
    const gain = context.createGain();
    const volume = sound.voice.volume * (buffer ? 0.55 : 0.16);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + Math.min(0.008, duration / 4));
    gain.gain.setValueAtTime(volume, start + Math.max(0.01, duration - 0.04));
    gain.gain.linearRampToValueAtTime(0, start + duration);
    gain.connect(destination);
    let source: AudioBufferSourceNode | OscillatorNode;
    if (buffer && sound.voice.instrument !== "Synth") {
      source = context.createBufferSource(); source.buffer = buffer; source.playbackRate.value = sample!.rate;
    } else {
      source = context.createOscillator(); source.type = "triangle";
      source.frequency.value = 440 * 2 ** ((pitchToMidi(sound.pitch) - 69) / 12);
    }
    source.connect(gain); source.start(start); source.stop(start + duration + 0.02);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    return source;
  }

  stop() {
    this.epoch++; cancelAnimationFrame(this.animation);
    this.master?.disconnect(); this.master=null;
    for (const node of this.nodes) { try { node.stop(); } catch {} }
    this.nodes = []; this.stopPreview(); this.state("stopped");
  }

  /** Change the live mix without rebuilding the playback schedule or cursor. */
  setMasterVolume(volume: number) {
    if (!Number.isFinite(volume)) return;
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.master && this.context) this.master.gain.setValueAtTime(this.masterVolume, this.context.currentTime);
  }

  async play(score: Score, from = 0, to = scoreTicks(score), metronome = false, loop = false) {
    this.stop(); const request = this.epoch;
    this.masterVolume = score.masterVolume;
    this.warning(""); this.state("loading");
    try {
      const context = await this.initialize();
      if (request !== this.epoch) return;
      const sounds = scoreSounds(score).filter(s => s.start < to && s.start + s.ticks > from);
      await this.preload(sounds, request);
      if (request !== this.epoch) return;
      const secondsPerTick = 60 / score.tempo / PPQ, began = context.currentTime + 0.08;
      const master = context.createGain(); this.master=master; master.gain.value = this.masterVolume; master.connect(context.destination);
      for (const sound of sounds) {
        const startTick = Math.max(sound.start, from);
        const endTick = Math.min(sound.start + sound.ticks, to);
        this.nodes.push(this.sound(context, master, sound, began + (startTick - from) * secondsPerTick,
          (endTick - startTick) * secondsPerTick));
      }
      if (metronome) {
        let measureStart = 0;
        for (const measure of score.measures) {
          const beatTicks = PPQ * 4 / measure.time[1];
          for (let beat = 0; beat < measure.time[0]; beat++) {
            const tick = measureStart + beat * beatTicks;
            if (tick < from || tick >= to) continue;
            const oscillator = context.createOscillator(), gain = context.createGain();
            const when = began + (tick - from) * secondsPerTick;
            oscillator.type = "square"; oscillator.frequency.value = beat === 0 ? 1000 : 800;
            gain.gain.setValueAtTime(0, when);
            gain.gain.linearRampToValueAtTime(beat === 0 ? 0.3 : 0.15, when + 0.005);
            gain.gain.linearRampToValueAtTime(0, when + 0.055);
            oscillator.connect(gain); gain.connect(master); oscillator.start(when); oscillator.stop(when + 0.075);
            oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
            this.nodes.push(oscillator);
          }
          measureStart += measureTicks(measure);
          if (measureStart >= to) break;
        }
      }
      this.state("playing");
      const animate = () => {
        if (request !== this.epoch) { master.disconnect(); return; }
        const tick = from + Math.max(0, context.currentTime - began) / secondsPerTick;
        this.progress(Math.min(to, tick));
        if (tick >= to) {
          master.disconnect(); this.stop();
          if (loop) void this.play({ ...score, masterVolume: this.masterVolume }, from, to, metronome, true);
        } else this.animation = requestAnimationFrame(animate);
      };
      this.animation = requestAnimationFrame(animate);
    } catch { if (request === this.epoch) { this.stop(); this.warning("audio"); } }
  }

  stopPreview() {
    this.previewEpoch++;
    for (const node of this.previews) { try { node.stop(); } catch {} }
    this.previews = [];
    if (this.previewTimer !== null) clearTimeout(this.previewTimer);
    this.previewTimer = null;
    this.previewMaster?.disconnect(); this.previewMaster = null;
  }

  async preview(voice: Voice, pitches: string[], volume: number, held = false) {
    this.stopPreview(); const request = this.previewEpoch;
    const context = await this.initialize();
    if (request !== this.previewEpoch) return;
    // Once this instrument is heard, dragging reuses its nearest cached sample
    // immediately. Exact samples warm in the background and never retrigger an
    // old pitch when a slow response arrives after the pointer moved/released.
    await Promise.all(pitches.map(p => {
      const loading = this.load(voice.instrument, p);
      return this.cachedSample(voice.instrument, p, true) ? undefined : loading;
    }));
    if (request !== this.previewEpoch) return;
    const master = context.createGain(); master.gain.value = volume; master.connect(context.destination);
    this.previewMaster = master;
    for (const pitch of pitches) this.previews.push(this.sound(context, master,
      { voice, pitch, start: 0, ticks: PPQ }, context.currentTime, held ? 300 : 0.45, true));
    // Mouse-held auditions retain the instrument's full sample decay; oscillators
    // sustain until release. Buffer sources finish naturally, without looping.
    if (!held) this.previewTimer = setTimeout(() => {
        master.disconnect();
        if (this.previewMaster === master) { this.previewMaster = null; this.previewTimer = null; }
      }, 600);
  }

  async wav(score: Score, from = 0, to = scoreTicks(score)): Promise<Blob | null> {
    this.stop(); const request = this.epoch; this.warning(""); this.state("exporting");
    try {
      await this.initialize();
      const sounds = scoreSounds(score).filter(s => s.start < to && s.start + s.ticks > from);
      await this.preload(sounds, request);
      if (request !== this.epoch) return null;
      const secondsPerTick = 60 / score.tempo / PPQ, seconds = (to - from) * secondsPerTick + 0.2;
      if (seconds > 600) throw new Error("Export too long");
      const context = new OfflineAudioContext(2, Math.ceil(seconds * 44100), 44100);
      const master = context.createGain(); master.gain.value = score.masterVolume; master.connect(context.destination);
      for (const sound of sounds) {
        const start = Math.max(sound.start, from), end = Math.min(sound.start + sound.ticks, to);
        this.sound(context, master, sound, (start - from) * secondsPerTick, (end - start) * secondsPerTick);
      }
      const buffer = await context.startRendering();
      if (request !== this.epoch) return null;
      const bytes = new ArrayBuffer(44 + buffer.length * 4), view = new DataView(bytes);
      const ascii = (at: number, text: string) => [...text].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
      ascii(0, "RIFF"); view.setUint32(4, bytes.byteLength - 8, true); ascii(8, "WAVE"); ascii(12, "fmt ");
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
      view.setUint32(24, 44100, true); view.setUint32(28, 176400, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true);
      ascii(36, "data"); view.setUint32(40, bytes.byteLength - 44, true);
      for (let i = 0; i < buffer.length; i++) for (let ch = 0; ch < 2; ch++) {
        const value = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
        view.setInt16(44 + (i * 2 + ch) * 2, value * (value < 0 ? 32768 : 32767), true);
      }
      this.state("stopped");
      return new Blob([bytes], { type: "audio/wav" });
    } catch { if (request === this.epoch) { this.stop(); this.warning("audio"); } return null; }
  }

  dispose() { this.stop(); void this.context?.close(); }
}
