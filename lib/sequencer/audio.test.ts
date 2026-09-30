/* eslint-disable @typescript-eslint/no-explicit-any -- VM test doubles span the legacy DOM and Web Audio APIs. */
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";

// Execute the actual legacy engine from both HTML entry points, without R2/DOM.
function engine(file: string, fetcher = vi.fn<(...args: any[]) => Promise<any>>(async () => ({
  ok: true, arrayBuffer: async () => new ArrayBuffer(8),
}))) {
  const elements = new Map<string, any>();
  const starts: any[] = [];
  const gain = () => ({
    value: 0.8, setValueAtTime() {}, linearRampToValueAtTime() {},
    cancelScheduledValues() {},
  });
  const node = (kind: string) => ({
    kind, frequency: { value: 0 }, playbackRate: { value: 1 }, gain: gain(), connect() {},
    start() { starts.push(this); }, stop: vi.fn(),
  });
  const audio = {
    state: "running", currentTime: 1, destination: {},
    resume: vi.fn(async () => { audio.state = "running"; }),
    createGain: () => node("gain"),
    createBufferSource: () => node("sample"),
    createOscillator: () => node("synth"),
    decodeAudioData: vi.fn(async () => ({ duration: 2 })),
  };
  const document = {
    addEventListener() {},
    getElementById(id: string) {
      if (!elements.has(id)) elements.set(id, {
        value: id === "tempo-slider" ? "100" : "Piano", hidden: true,
        style: {}, classList: { toggle: vi.fn(), add() {}, remove() {} },
        addEventListener() {}, getBoundingClientRect: () => ({ width: 900 }),
      });
      return elements.get(id);
    },
  };
  const context = vm.createContext({
    document, window: { addEventListener() {}, AudioContext: function () { return audio; } },
    fetch: fetcher, console: { warn: vi.fn() }, AbortController, Date,
    setTimeout, clearTimeout, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  });
  const html = readFileSync("public/tools/" + file, "utf8");
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)![1];
  vm.runInContext(script, context);
  // Rendering is tested in the browser; these tests isolate timing/audio.
  vm.runInContext("setPlaybackStartTick = () => {}; renderCurrentView = () => {}; syncModeUI = () => {};", context);
  return {
    run: (code: string) => vm.runInContext(code, context),
    fetcher, starts, audio, elements,
  };
}

afterEach(() => vi.useRealTimers());

for (const file of ["secuenciador.html", "sequencer.html"]) {
  describe(file, () => {
    it("loads nothing on script evaluation and shares concurrent requests, then decoded cache", async () => {
      const e = engine(file);
      expect(e.fetcher).not.toHaveBeenCalled();
      await e.run("Promise.all([loadSample('Piano','F#4'), loadSample('Piano','F#4')])");
      expect(e.fetcher).toHaveBeenCalledTimes(1);
      expect(e.fetcher.mock.calls[0]).toEqual([
        "https://samples.stormstudios.com.mx/Piano/F%234.mp3",
        expect.objectContaining({ cache: "no-cache", signal: expect.any(AbortSignal) }),
      ]);
      await e.run("loadSample('Piano','F#4')");
      expect(e.fetcher).toHaveBeenCalledTimes(1);
      expect(e.audio.decodeAudioData).toHaveBeenCalledTimes(1);
    });

    it("reports missing audio, uses synth without refetching during scheduling, and permits retry", async () => {
      vi.useFakeTimers();
      const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 404 });
      const e = engine(file, fetcher);
      await e.run("loadSample('Piano','C4')");
      expect(e.elements.get("sample-status").hidden).toBe(false);
      e.run("initAudio(); playSampleNote('Piano','c/4',1,2)");
      expect(e.starts.map(n => n.kind)).toEqual(["synth"]);
      await e.run("loadSample('Piano','C4')");
      expect(fetcher).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(10001);
      fetcher.mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
      await e.run("loadSample('Piano','C4')");
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(e.elements.get("sample-status").hidden).toBe(true);
    });

    it("aborts stalled requests after ten seconds and clears the loading state", async () => {
      vi.useFakeTimers();
      const fetcher = vi.fn((_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new Error("aborted")));
      }));
      const e = engine(file, fetcher as any);
      const pending = e.run("loadSample('Piano','C4')");
      await vi.advanceTimersByTimeAsync(10000);
      expect(await pending).toBeNull();
      expect(e.run("sampleLoadingCount")).toBe(0);
      expect(e.run("pendingSamples.size")).toBe(0);
    });

    it("does not sound a preview released while downloading", async () => {
      let resolve!: (value: any) => void;
      const fetcher = vi.fn(() => new Promise<any>(r => { resolve = r; }));
      const e = engine(file, fetcher);
      const preview = e.run("startPreviewSound('c/4')");
      e.run("stopPreviewSound()");
      resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
      await preview;
      expect(e.starts).toEqual([]);
    });

    it("Stop cancels Play during loading, and a subsequent Play uses the sample", async () => {
      let resolve!: (value: any) => void;
      const e = engine(file, vi.fn(() => new Promise<any>(r => { resolve = r; })));
      e.run("projectData.tracks.melody.set(0, {type:'note', keys:['c/4'], duration:'q'})");
      const playing = e.run("playScore()");
      e.run("stopPlayback()");
      resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
      await playing;
      expect(e.run("playbackState.isPlaying")).toBe(false);
      expect(e.starts).toEqual([]);
      await e.run("playScore()");
      expect(e.starts.map(n => n.kind)).toEqual(["sample"]);
      e.run("stopPlayback()");
      expect(e.starts[0].stop).toHaveBeenCalled();
    });

    it("bounds score downloads to six and cancels the remaining queue", async () => {
      const resolvers: Array<(value: any) => void> = [];
      const e = engine(file, vi.fn(() => new Promise<any>(r => { resolvers.push(r); })));
      const loading = e.run("loadScoreSamples('Piano', new Set(NOTES.map(n => n+'4')), playbackRequest)");
      expect(e.fetcher).toHaveBeenCalledTimes(6);
      e.run("stopPlayback()");
      resolvers.forEach(r => r({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
      await loading;
      expect(e.fetcher).toHaveBeenCalledTimes(6);
    });

    it("reuses enharmonic samples with correct octave crossings", () => {
      const e = engine(file);
      for (const [key, expected] of [
        ["db/4", "C#4"], ["cb/4", "B3"], ["b#/4", "C5"],
        ["cbb/4", "A#3"], ["b##/4", "C#5"], ["en/4", "E4"],
      ]) expect(e.run("getSampleKey(" + JSON.stringify(key) + ")")).toBe(expected);
    });

    it("plays notes outside the R2 bank with the right pitch using an existing sample", async () => {
      const e = engine(file);
      expect(e.run("getSamplePlayback('c/1').sampleKey")).toBe("C2");
      expect(e.run("getSamplePlayback('c/1').playbackRate")).toBe(0.5);
      expect(e.run("getSamplePlayback('c/7').sampleKey")).toBe("B6");
      await e.run("loadSample('Piano', 'C2')");
      e.run("playSampleNote('Piano','c/1',1,2)");
      expect(e.starts[0].kind).toBe("sample");
      expect(e.starts[0].playbackRate.value).toBe(0.5);
    });

    it("expands Piano Roll for low/high notes without deleting the composition", () => {
      const e = engine(file);
      e.run("projectData.tracks.melody.set(0,{type:'note',keys:['c/1'],duration:'q'}); projectData.tracks.melody.set(4,{type:'note',keys:['c/7'],duration:'q'})");
      const before = e.run("serializeState()");
      e.run("updatePianoRollRange()");
      expect(e.run("serializeState()")).toBe(before);
      expect(e.run("PIANO_ROLL_CONFIG.MIN_MIDI")).toBe(24);
      expect(e.run("PIANO_ROLL_CONFIG.MAX_MIDI")).toBe(96);
      expect(e.run("PIANO_ROLL_CONFIG.SEMITONES")).toBe(73);
    });
  });
}
