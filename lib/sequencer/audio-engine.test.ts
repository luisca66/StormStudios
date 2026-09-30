/* eslint-disable @typescript-eslint/no-explicit-any -- Web Audio test doubles. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { SequencerAudio, sampleForPitch, scoreSounds, type AudioState } from "./audio-engine";
import { createScore, newId } from "./model";
import type { Duration, Instrument, NoteEvent, Score, VoiceId } from "./types";

const note = (start: number, pitches: string[], duration: Duration = "q", extra: Partial<NoteEvent> = {}): NoteEvent => ({
  id: newId(), start, duration, dotted: false, triplet: false, pitches, tie: false, ...extra,
});
const voiceOf = (score: Score, id: VoiceId) => score.voices.find(voice => voice.id === id)!;
/** A score at 120 bpm (one quarter = 0.5 s = 960 ticks) with the given events per voice. */
function scoreWith(mode: "single" | "satb", events: Partial<Record<VoiceId, NoteEvent[]>>): Score {
  const score = createScore(mode);
  score.tempo = 120;
  for (const [id, list] of Object.entries(events)) voiceOf(score, id as VoiceId).events = list!;
  return score;
}
const heard = (score: Score) => scoreSounds(score).map(sound => [sound.voice.id, sound.pitch, sound.start, sound.ticks]);
/** Lets pending promise continuations run; works with real and fake timers. */
const flush = async () => { for (let turn = 0; turn < 30; turn++) await Promise.resolve(); };

const SAMPLES = "https://samples.stormstudios.com.mx";
const response = (url: string) => ({ ok: true, status: 200, arrayBuffer: async () => ({ url }) });
type Fetcher = (url: string, options: { cache: string; signal: AbortSignal }) => Promise<any>;
type Started = { node: any; kind: string; when: number; until: number; rate: number; frequency: number; buffer: unknown; gain: any };

/** Installs Web Audio, fetch, location and animation-frame doubles and builds an engine on them. */
function harness(options: { hostname?: string; suspended?: boolean; fetcher?: Fetcher; rendered?: Float32Array[] } = {}) {
  const contexts: any[] = [];
  const offline: any[] = [];
  const frames: Array<() => void> = [];
  const param = (value: number) => ({
    value, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(),
  });
  const graph = () => {
    const nodes: any[] = [];
    const add = (kind: "gain" | "sample" | "synth") => {
      const node = {
        kind, gain: param(1), frequency: param(0), playbackRate: param(1), buffer: null as unknown, type: "",
        connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as unknown,
      };
      nodes.push(node);
      return node;
    };
    return {
      nodes, destination: { destination: true },
      createGain: () => add("gain"), createBufferSource: () => add("sample"), createOscillator: () => add("synth"),
    };
  };

  let release = () => {};
  vi.stubGlobal("AudioContext", function AudioContext() {
    const context: any = {
      ...graph(), currentTime: 1, state: options.suspended ? "suspended" : "running",
      resume: vi.fn(() => new Promise<void>(resolve => { release = () => { context.state = "running"; resolve(); }; })),
      decodeAudioData: vi.fn(async (bytes: { url: string }) => ({ sample: bytes.url })),
      close: vi.fn(async () => {}),
    };
    contexts.push(context);
    return context;
  });
  let finishRendering = (): void => {};
  vi.stubGlobal("OfflineAudioContext", function OfflineAudioContext(channels: number, length: number, rate: number) {
    const channelData = options.rendered ?? [new Float32Array(2), new Float32Array(2)];
    const context: any = {
      ...graph(), channels, length, rate,
      startRendering: vi.fn(() => new Promise(resolve => {
        finishRendering = () => resolve({ length: channelData[0].length, getChannelData: (channel: number) => channelData[channel] });
      })),
    };
    offline.push(context);
    return context;
  });
  const fetcher = vi.fn<Fetcher>(options.fetcher ?? (async url => response(url)));
  vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("location", { hostname: options.hostname ?? "stormstudios.com.mx" });
  const cancelFrame = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);

  const states: AudioState[] = [];
  const progress = vi.fn<(tick: number) => void>();
  const warnings: string[] = [];
  const audio = new SequencerAudio(state => states.push(state), progress, message => warnings.push(message));
  /** Sources that were told to start, in scheduling order. */
  const started = (context: any = contexts[0]): Started[] => ((context?.nodes ?? []) as any[])
    .filter(node => node.kind !== "gain" && node.start.mock.calls.length > 0)
    .map(node => ({
      node, kind: node.kind as string, when: node.start.mock.calls[0][0] as number, until: node.stop.mock.calls[0][0] as number,
      rate: node.playbackRate.value as number, frequency: node.frequency.value as number, buffer: node.buffer,
      gain: node.connect.mock.calls[0][0],
    }));
  const masters = (context: any = contexts[0]) => context.nodes
    .filter((node: any) => node.kind === "gain" && node.connect.mock.calls.some((call: any[]) => call[0] === context.destination));
  return {
    audio, contexts, offline, frames, fetcher, cancelFrame, states, progress, warnings, started, masters,
    urls: () => fetcher.mock.calls.map(call => call[0]),
    resume: () => release(),
    render: () => finishRendering(),
  };
}

/** A fetch double whose responses are delivered by hand. */
function deferredFetch() {
  const pending: Array<{ url: string; signal: AbortSignal; resolve: (value: any) => void }> = [];
  const fetcher: Fetcher = (url, { signal }) => new Promise(resolve => { pending.push({ url, signal, resolve }); });
  return { fetcher, pending, deliver: () => pending.splice(0).forEach(request => request.resolve(response(request.url))) };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("scoreSounds", () => {
  it("returns one sound per chord pitch and skips rests and voices outside the mode", () => {
    const score = scoreWith("satb", {
      melody: [note(0, ["C6"], "w")],
      soprano: [note(0, ["E4", "G4", "Bb4"], "h"), note(1920, []), note(2880, ["A4"], "8", { dotted: true })],
      bass: [note(3840, ["C2", "C3"], "w")],
    });
    expect(heard(score)).toEqual([
      ["soprano", "E4", 0, 1920], ["soprano", "G4", 0, 1920], ["soprano", "Bb4", 0, 1920], ["soprano", "A4", 2880, 720],
      ["bass", "C2", 3840, 3840], ["bass", "C3", 3840, 3840],
    ]);
    score.mode = "single";
    expect(heard(score)).toEqual([["melody", "C6", 0, 3840]]);
    expect(scoreSounds(createScore("satb"))).toEqual([]);
  });

  it("silences muted voices and, with any solo, everything that is not solo", () => {
    const score = scoreWith("satb", {
      soprano: [note(0, ["C5"])], alto: [note(0, ["G4"])], tenor: [note(0, ["E4"])], bass: [note(0, ["C3"])],
    });
    const voices = () => scoreSounds(score).map(sound => sound.voice.id);
    voiceOf(score, "alto").mute = true;
    expect(voices()).toEqual(["soprano", "tenor", "bass"]);
    voiceOf(score, "tenor").solo = true;
    expect(voices()).toEqual(["tenor"]);
    voiceOf(score, "bass").solo = true;
    expect(voices()).toEqual(["tenor", "bass"]);
    // Mute wins over solo on the same voice.
    voiceOf(score, "bass").mute = true;
    expect(voices()).toEqual(["tenor"]);
    // A solo in a voice outside the mode does not silence the mode's voices.
    voiceOf(score, "tenor").solo = false;
    voiceOf(score, "bass").solo = false;
    voiceOf(score, "melody").solo = true;
    expect(voices()).toEqual(["soprano", "tenor"]);
  });

  it("merges a chain of effective ties into one sound per pitch", () => {
    const score = scoreWith("single", {
      melody: [
        // Given out of order on purpose: a tie runs over the bar line and through three events.
        note(3840, ["C4", "E4"], "h", { tie: true }), note(1920, ["C4", "E4"], "h", { tie: true }), note(5760, ["C4", "E4"]),
        note(6720, ["C4", "E4"]),
      ],
    });
    expect(heard(score)).toEqual([
      ["melody", "C4", 1920, 4800], ["melody", "E4", 1920, 4800],
      // The chain ended on an untied event, so its equal neighbour sounds again.
      ["melody", "C4", 6720, 960], ["melody", "E4", 6720, 960],
    ]);
  });

  it("ignores a tie that the next event cannot continue", () => {
    const tied = { tie: true };
    expect(heard(scoreWith("single", { melody: [
      note(0, ["C4"], "q", tied), note(960, ["D4"], "q", tied),      // different pitch
      note(2880, ["D4"], "q", tied),                                 // after a gap
      note(3840, ["Db4"], "q", tied), note(4800, ["C#4"], "q", tied), // same sound, different spelling
      note(5760, ["C#4", "E4"], "q", tied),                           // a chord is not its own root
      note(6720, [], "q"), note(7680, ["C#4", "E4"], "q", tied),      // across a rest; last one has no next
    ] }))).toEqual([
      ["melody", "C4", 0, 960], ["melody", "D4", 960, 960], ["melody", "D4", 2880, 960],
      ["melody", "Db4", 3840, 960], ["melody", "C#4", 4800, 960],
      ["melody", "C#4", 5760, 960], ["melody", "E4", 5760, 960],
      ["melody", "C#4", 7680, 960], ["melody", "E4", 7680, 960],
    ]);
  });

  it("never merges untied neighbours and keeps triplet lengths exact", () => {
    expect(heard(scoreWith("single", { melody: [
      note(0, ["G4"]), note(960, ["G4"]),
      note(1920, ["G4"], "8", { triplet: true, tie: true }), note(2240, ["G4"], "8", { triplet: true }), note(2560, ["G4"], "8", { triplet: true }),
    ] }))).toEqual([
      ["melody", "G4", 0, 960], ["melody", "G4", 960, 960], ["melody", "G4", 1920, 640], ["melody", "G4", 2560, 320],
    ]);
  });
});

describe("sampleForPitch", () => {
  it("uses the note's own sample inside the bank (C2..B6)", () => {
    expect(sampleForPitch("C4")).toEqual({ name: "C4", rate: 1 });
    expect(sampleForPitch("C2")).toEqual({ name: "C2", rate: 1 });
    expect(sampleForPitch("B6")).toEqual({ name: "B6", rate: 1 });
  });

  it("maps every spelling to the sharp-named sample of its sound, across octave lines", () => {
    for (const [pitch, name] of [
      ["Db4", "C#4"], ["Eb3", "D#3"], ["Bb5", "A#5"], ["Cb4", "B3"], ["B#3", "C4"], ["Fb4", "E4"], ["E#4", "F4"],
      ["Cbb4", "A#3"], ["B##4", "C#5"], ["Dbb4", "C4"], ["F##2", "G2"],
    ]) expect(sampleForPitch(pitch), pitch).toEqual({ name, rate: 1 });
  });

  it("repitches the nearest edge sample for notes outside the bank", () => {
    expect(sampleForPitch("C1")).toEqual({ name: "C2", rate: 0.5 });
    expect(sampleForPitch("B1")).toEqual({ name: "C2", rate: 2 ** (-1 / 12) });
    expect(sampleForPitch("Cb2")).toEqual({ name: "C2", rate: 2 ** (-1 / 12) });
    expect(sampleForPitch("C7")).toEqual({ name: "B6", rate: 2 ** (1 / 12) });
    expect(sampleForPitch("B#6")).toEqual({ name: "B6", rate: 2 ** (1 / 12) });
    expect(sampleForPitch("B7")).toEqual({ name: "B6", rate: 2 });
    expect(sampleForPitch("C-1").name).toBe("C2");
    expect(sampleForPitch("G9").name).toBe("B6");
    expect(() => sampleForPitch("H4")).toThrow();
  });
});

describe("SequencerAudio playback", () => {
  it("loads each sample once and schedules every note at its time, rate and volume", async () => {
    const h = harness();
    const score = scoreWith("single", { melody: [note(0, ["C4"]), note(960, ["E4", "G#4"], "h"), note(2880, ["C1"])] });
    score.masterVolume = 0.7;
    voiceOf(score, "melody").volume = 0.5;
    await h.audio.play(score);

    expect(h.states).toEqual(["stopped", "loading", "playing"]);
    expect(h.warnings).toEqual([""]);
    expect(h.contexts).toHaveLength(1);
    expect(h.urls()).toEqual([`${SAMPLES}/Piano/C4.mp3`, `${SAMPLES}/Piano/E4.mp3`, `${SAMPLES}/Piano/G%234.mp3`, `${SAMPLES}/Piano/C2.mp3`]);
    for (const [, init] of h.fetcher.mock.calls) {
      expect(init.cache).toBe("no-cache");
      expect(init.signal).toBeInstanceOf(AbortSignal);
      expect(init.signal.aborted).toBe(false);
    }

    const [master] = h.masters();
    expect(h.masters()).toHaveLength(1);
    expect(master.gain.value).toBe(0.7);
    const began = 1 + 0.08; // currentTime + lead-in
    const sources = h.started();
    expect(sources.map(source => source.kind)).toEqual(["sample", "sample", "sample", "sample"]);
    expect(sources.map(source => source.buffer)).toEqual([
      { sample: `${SAMPLES}/Piano/C4.mp3` }, { sample: `${SAMPLES}/Piano/E4.mp3` },
      { sample: `${SAMPLES}/Piano/G%234.mp3` }, { sample: `${SAMPLES}/Piano/C2.mp3` },
    ]);
    expect(sources.map(source => source.rate)).toEqual([1, 1, 1, 0.5]);
    [[0, 0.5], [0.5, 1], [0.5, 1], [1.5, 0.5]].forEach(([offset, length], index) => {
      expect(sources[index].when, `start ${index}`).toBeCloseTo(began + offset, 9);
      expect(sources[index].until, `stop ${index}`).toBeCloseTo(began + offset + length + 0.02, 9);
      // Each note has its own envelope, feeding the master.
      const envelope = sources[index].gain;
      expect(envelope.connect).toHaveBeenCalledWith(master);
      expect(envelope.gain.linearRampToValueAtTime.mock.calls[0][0]).toBeCloseTo(0.5 * 0.55, 9);
      expect(envelope.gain.linearRampToValueAtTime.mock.calls[1]).toEqual([0, expect.closeTo(began + offset + length, 9)]);
    });
  });

  it("asks the local proxy on localhost and the sample bucket elsewhere", async () => {
    for (const [hostname, base] of [["localhost", "/api/audio"], ["127.0.0.1", "/api/audio"], ["www.stormstudios.com.mx", SAMPLES]]) {
      const h = harness({ hostname });
      await h.audio.play(scoreWith("single", { melody: [note(0, ["Bb3"])] }));
      expect(h.urls(), hostname).toEqual([`${base}/Piano/A%233.mp3`]);
      expect(h.fetcher.mock.calls[0][1].cache).toBe("no-cache");
      vi.unstubAllGlobals();
    }
  });

  it("shares one download per instrument and sample, also between enharmonics and later plays", async () => {
    const h = harness();
    const score = scoreWith("satb", {
      soprano: [note(0, ["C#4"]), note(960, ["C#4"])],
      alto: [note(0, ["Db4"])],
      tenor: [note(0, ["C#4"])],
      bass: [note(0, ["C1"]), note(960, ["C2"])],
    });
    voiceOf(score, "tenor").instrument = "Cello";
    await h.audio.play(score);
    expect(h.urls().sort()).toEqual([`${SAMPLES}/Cello/C%234.mp3`, `${SAMPLES}/Piano/C%234.mp3`, `${SAMPLES}/Piano/C2.mp3`]);
    const first = h.started();
    expect(first).toHaveLength(6);
    const bufferOf = (voice: number) => first[voice].buffer;
    expect(bufferOf(0)).toEqual({ sample: `${SAMPLES}/Piano/C%234.mp3` });
    expect(bufferOf(1)).toBe(bufferOf(0)); // soprano, second note
    expect(bufferOf(2)).toBe(bufferOf(0)); // alto Db4
    expect(bufferOf(3)).toEqual({ sample: `${SAMPLES}/Cello/C%234.mp3` });
    expect(bufferOf(5)).toBe(bufferOf(4)); // bass C1 and C2 share C2
    expect([first[4].rate, first[5].rate]).toEqual([0.5, 1]);

    await h.audio.play(score);
    expect(h.fetcher).toHaveBeenCalledTimes(3);
    expect(h.contexts[0].decodeAudioData).toHaveBeenCalledTimes(3);
    expect(h.contexts).toHaveLength(1);
  });

  it("shares a download that is still in flight between concurrent requests", async () => {
    vi.useFakeTimers();
    const net = deferredFetch();
    const h = harness({ fetcher: net.fetcher });
    const voice = voiceOf(createScore(), "melody");
    const previews = Promise.all([h.audio.preview(voice, ["F#4"], 1), h.audio.preview(voice, ["Gb4"], 1)]);
    await flush();
    expect(h.urls()).toEqual([`${SAMPLES}/Piano/F%234.mp3`]);
    net.deliver();
    await previews;
    expect(h.fetcher).toHaveBeenCalledTimes(1);
    expect(h.contexts[0].decodeAudioData).toHaveBeenCalledTimes(1);
    // Only the latest preview sounds.
    expect(h.started().map(source => source.kind)).toEqual(["sample"]);
  });

  it("plays Synth voices with oscillators at the written pitch and downloads nothing", async () => {
    const h = harness();
    const score = scoreWith("single", { melody: [note(0, ["A4", "Bb2"]), note(960, ["B#3"])] });
    voiceOf(score, "melody").instrument = "Synth";
    await h.audio.play(score);
    expect(h.fetcher).not.toHaveBeenCalled();
    expect(h.warnings).toEqual([""]);
    const sources = h.started();
    expect(sources.map(source => [source.kind, source.node.type])).toEqual([["synth", "triangle"], ["synth", "triangle"], ["synth", "triangle"]]);
    expect(sources[0].frequency).toBeCloseTo(440, 6);
    expect(sources[1].frequency).toBeCloseTo(116.5409, 3);
    expect(sources[2].frequency).toBeCloseTo(261.6256, 3);
    expect(sources[0].gain.gain.linearRampToValueAtTime.mock.calls[0][0]).toBeCloseTo(0.8 * 0.16, 9);
  });

  it("plays only the requested range, clips notes to it and adds a click per quarter", async () => {
    const h = harness();
    const score = scoreWith("single", { melody: [note(0, ["C4"], "w"), note(3840, ["D4"]), note(4800, ["E4"])] });
    await h.audio.play(score, 960, 4320, true);
    expect(h.urls()).toEqual([`${SAMPLES}/Piano/C4.mp3`, `${SAMPLES}/Piano/D4.mp3`]);
    const began = 1.08;
    const notes = h.started().filter(source => source.kind === "sample");
    expect(notes).toHaveLength(2);
    expect([notes[0].when, notes[0].until]).toEqual([expect.closeTo(began, 9), expect.closeTo(began + 1.5 + 0.02, 9)]);
    expect([notes[1].when, notes[1].until]).toEqual([expect.closeTo(began + 1.5, 9), expect.closeTo(began + 1.75 + 0.02, 9)]);
    const clicks = h.started().filter(source => source.kind === "synth");
    expect(clicks.map(click => click.frequency)).toEqual([800, 800, 800, 1000]);
    clicks.forEach((click, index) => expect(click.when).toBeCloseTo(began + index * 0.5, 9));
  });

  it("reports progress from the audio clock and stops at the end of the range", async () => {
    const h = harness();
    await h.audio.play(scoreWith("single", { melody: [note(0, ["C4"], "w")] }), 960, 4320);
    const [context] = h.contexts;
    const [master] = h.masters();
    expect(h.frames).toHaveLength(1);

    context.currentTime = 1.0; // still inside the lead-in
    h.frames[0]();
    expect(h.progress).toHaveBeenLastCalledWith(960);
    context.currentTime = 1.08 + 0.5;
    h.frames[1]();
    expect(h.progress.mock.calls[1][0]).toBeCloseTo(1920, 6);
    expect(h.states.at(-1)).toBe("playing");
    expect(h.frames).toHaveLength(3);

    context.currentTime = 1.08 + 5; // past the end: the position never exceeds the range
    h.frames[2]();
    expect(h.progress).toHaveBeenLastCalledWith(4320);
    expect(h.states).toEqual(["stopped", "loading", "playing", "stopped"]);
    expect(master.disconnect).toHaveBeenCalled();
    expect(h.frames).toHaveLength(3);
  });

  it("starts over when looping", async () => {
    const h = harness();
    await h.audio.play(scoreWith("single", { melody: [note(0, ["C4"])] }), 0, 960, false, true);
    h.contexts[0].currentTime = 1.6; // just past the end (1.08 + 0.5)
    h.frames[0]();
    await flush();
    expect(h.states).toEqual(["stopped", "loading", "playing", "stopped", "stopped", "loading", "playing"]);
    expect(h.started()).toHaveLength(2);
    expect(h.started()[1].when).toBeCloseTo(1.6 + 0.08, 9);
    expect(h.fetcher).toHaveBeenCalledTimes(1);
    h.audio.stop();
    expect(h.states.at(-1)).toBe("stopped");
  });

  it("changes the master gain during playback without restarting sources or cursor", async () => {
    const h = harness();
    await h.audio.play(scoreWith("single", { melody: [note(0, ["C4"], "w")] }), 0, 960, false, true);
    const [master] = h.masters(), [source] = h.started();
    h.contexts[0].currentTime = 1.3;
    h.audio.setMasterVolume(0.24);
    expect(master.gain.setValueAtTime).toHaveBeenLastCalledWith(0.24, 1.3);
    expect(h.states.at(-1)).toBe("playing");
    expect(source.node.stop).toHaveBeenCalledTimes(1); // Only its original scheduled stop.
    expect(h.frames).toHaveLength(1);
    h.contexts[0].currentTime = 1.6;
    h.frames[0](); await flush();
    expect(h.masters()[1].gain.value).toBe(0.24); // The next loop retains the live mix.
    h.audio.setMasterVolume(2);
    expect(h.masters()[1].gain.setValueAtTime).toHaveBeenLastCalledWith(1, 1.6);
    h.audio.stop();
  });

  it("retains volume changes made while samples are loading", async () => {
    const net = deferredFetch(), h = harness({ fetcher: net.fetcher });
    const playing = h.audio.play(scoreWith("single", { melody: [note(0, ["C4"])] }));
    await flush(); h.audio.setMasterVolume(0.12); net.deliver(); await playing;
    expect(h.masters()[0].gain.value).toBe(0.12);
  });

  it("clicks on the denominator beats with a downbeat accent across meter changes", async () => {
    const h = harness();
    const score = scoreWith("single", {});
    score.tempo = 60;
    score.measures = score.measures.slice(0, 2);
    score.measures[0].time = [6, 8]; score.measures[1].time = [3, 4];
    // Start between beats: do not create an artificial downbeat at the playback origin.
    await h.audio.play(score, 240, 5760, true);
    const clicks = h.started();
    expect(clicks.map(click => click.frequency)).toEqual([800, 800, 800, 800, 800, 1000, 800, 800]);
    expect(clicks.map(click => click.when)).toEqual([0.25, 0.75, 1.25, 1.75, 2.25, 2.75, 3.75, 4.75]
      .map(offset => expect.closeTo(1.08 + offset, 9)));
    expect(clicks[5].node.type).toBe("square");
    expect(clicks[5].gain.gain.linearRampToValueAtTime.mock.calls[0][0]).toBe(0.3);
    expect(clicks[0].gain.gain.linearRampToValueAtTime.mock.calls[0][0]).toBe(0.15);
  });

  it("Stop silences what was scheduled and freezes the cursor", async () => {
    const h = harness();
    await h.audio.play(scoreWith("single", { melody: [note(0, ["C4", "E4"]), note(960, ["G4"])] }), 0, 1920, true);
    const sources = h.started();
    expect(sources).toHaveLength(5);
    h.audio.stop();
    for (const source of sources) expect(source.node.stop.mock.calls.at(-1)).toEqual([]);
    expect(h.cancelFrame).toHaveBeenLastCalledWith(1);
    expect(h.states.at(-1)).toBe("stopped");
    // A frame that was already queued does nothing but release the master.
    h.contexts[0].currentTime = 1.5;
    h.frames[0]();
    expect(h.progress).not.toHaveBeenCalled();
    expect(h.frames).toHaveLength(1);
    expect(h.masters()[0].disconnect).toHaveBeenCalled();
    // Stopping twice is harmless.
    expect(() => h.audio.stop()).not.toThrow();
  });
});

describe("SequencerAudio cancellation", () => {
  it("never starts when Stop arrives while the suspended context is resuming", async () => {
    const h = harness({ suspended: true });
    const score = scoreWith("single", { melody: [note(0, ["C4"])] });
    const playing = h.audio.play(score);
    await flush();
    expect(h.contexts[0].resume).toHaveBeenCalledTimes(1);
    expect(h.states).toEqual(["stopped", "loading"]);

    h.audio.stop();
    h.resume();
    await playing;
    await flush();
    expect(h.states).toEqual(["stopped", "loading", "stopped"]);
    expect(h.fetcher).not.toHaveBeenCalled();
    expect(h.contexts[0].nodes).toEqual([]);
    expect(h.frames).toEqual([]);

    // The context is running now: the next Play goes through.
    await h.audio.play(score);
    expect(h.states.at(-1)).toBe("playing");
    expect(h.started()).toHaveLength(1);
    expect(h.contexts).toHaveLength(1);
  });

  it("never starts when Stop arrives while samples are downloading", async () => {
    const net = deferredFetch();
    const h = harness({ fetcher: net.fetcher });
    const score = scoreWith("single", { melody: [note(0, ["C4"]), note(960, ["D4"])] });
    const playing = h.audio.play(score);
    await flush();
    expect(h.fetcher).toHaveBeenCalledTimes(2);
    expect(h.states).toEqual(["stopped", "loading"]);

    h.audio.stop();
    net.deliver();
    await playing;
    await flush();
    expect(h.states).toEqual(["stopped", "loading", "stopped"]);
    expect(h.contexts[0].nodes).toEqual([]);
    expect(h.frames).toEqual([]);

    // The downloads that finished are kept: the next Play reuses them.
    await h.audio.play(score);
    expect(h.fetcher).toHaveBeenCalledTimes(2);
    expect(h.started().map(source => source.kind)).toEqual(["sample", "sample"]);
  });

  it("only the latest Play starts when one is requested during another's loading", async () => {
    const net = deferredFetch();
    const h = harness({ fetcher: net.fetcher });
    const first = h.audio.play(scoreWith("single", { melody: [note(0, ["C4"])] }));
    await flush();
    const second = h.audio.play(scoreWith("single", { melody: [note(0, ["G4"])] }));
    await flush();
    net.deliver();
    await Promise.all([first, second]);
    expect(h.started().map(source => source.buffer)).toEqual([{ sample: `${SAMPLES}/Piano/G4.mp3` }]);
    expect(h.states.filter(state => state === "playing")).toHaveLength(1);
    expect(h.frames).toHaveLength(1);
  });

  it("downloads at most six samples at a time and drops the queue on Stop", async () => {
    const net = deferredFetch();
    const h = harness({ fetcher: net.fetcher });
    const names = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6", "D6"];
    const score = scoreWith("single", { melody: names.map((name, index) => note(index * 960, [name])) });
    const playing = h.audio.play(score);
    await flush();
    expect(h.fetcher).toHaveBeenCalledTimes(6);
    // Each delivery frees one slot.
    net.pending.shift()!.resolve(response(`${SAMPLES}/Piano/C4.mp3`));
    await flush();
    expect(h.fetcher).toHaveBeenCalledTimes(7);

    h.audio.stop();
    net.deliver();
    await playing;
    await flush();
    expect(h.fetcher).toHaveBeenCalledTimes(7);
    expect(h.started()).toEqual([]);
    expect(h.states.at(-1)).toBe("stopped");
  });

  it("falls back to the synth when a sample is missing, warns, and retries next time", async () => {
    let ok = false;
    const h = harness({ fetcher: async url => (ok ? response(url) : { ok: false, status: 404 }) });
    const score = scoreWith("single", { melody: [note(0, ["C4"])] });
    await h.audio.play(score);
    expect(h.warnings).toEqual(["", "samples"]);
    expect(h.states).toEqual(["stopped", "loading", "playing"]);
    expect(h.started().map(source => source.kind)).toEqual(["synth"]);
    expect(h.started()[0].frequency).toBeCloseTo(261.6256, 3);
    expect(h.started()[0].gain.gain.linearRampToValueAtTime.mock.calls[0][0]).toBeCloseTo(0.8 * 0.16, 9);

    ok = true;
    await h.audio.play(score);
    expect(h.fetcher).toHaveBeenCalledTimes(2);
    expect(h.warnings).toEqual(["", "samples", ""]);
    expect(h.started().map(source => source.kind)).toEqual(["synth", "sample"]);
  });

  it("gives up on a stalled download after ten seconds and plays with the synth", async () => {
    vi.useFakeTimers();
    const h = harness({
      fetcher: (_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    });
    const playing = h.audio.play(scoreWith("single", { melody: [note(0, ["C4"])] }));
    await flush();
    await vi.advanceTimersByTimeAsync(9999);
    expect(h.states).toEqual(["stopped", "loading"]);
    expect(h.fetcher.mock.calls[0][1].signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await playing;
    expect(h.fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    expect(h.warnings).toEqual(["", "samples"]);
    expect(h.states.at(-1)).toBe("playing");
    expect(h.started().map(source => source.kind)).toEqual(["synth"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports an audio failure and ends stopped when the context cannot be created", async () => {
    const h = harness();
    vi.stubGlobal("AudioContext", function AudioContext() { throw new Error("not allowed"); });
    await h.audio.play(scoreWith("single", { melody: [note(0, ["C4"])] }));
    expect(h.states).toEqual(["stopped", "loading", "stopped"]);
    expect(h.warnings).toEqual(["", "audio"]);
    expect(h.fetcher).not.toHaveBeenCalled();
  });
});

describe("SequencerAudio preview", () => {
  it("holds a mouse audition beyond the normal preview until release, without looping samples", async () => {
    vi.useFakeTimers();
    const h = harness();
    const piano = voiceOf(createScore(), "melody");
    await h.audio.preview(piano, ["C4"], 0.4, true);
    const [sample] = h.started(), [master] = h.masters();
    expect(sample.until).toBeCloseTo(301.02, 9);
    expect(sample.node.loop).not.toBe(true); // Natural recorded decay, never repeated.
    await vi.advanceTimersByTimeAsync(2000);
    expect(master.disconnect).not.toHaveBeenCalled();
    expect(sample.node.stop).toHaveBeenCalledTimes(1);
    h.audio.stopPreview();
    expect(sample.node.stop.mock.calls.at(-1)).toEqual([]);
    expect(master.disconnect).toHaveBeenCalledTimes(1);
    await h.audio.preview({ ...piano, instrument: "Synth" }, ["G4"], 0.4, true);
    const oscillator = h.started()[1];
    await vi.advanceTimersByTimeAsync(2000);
    expect(oscillator.until).toBeCloseTo(301.02, 9);
    expect(oscillator.node.stop).toHaveBeenCalledTimes(1);
    h.audio.stopPreview();
    expect(oscillator.node.stop.mock.calls.at(-1)).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("sounds the pitches at once at the given volume and releases its gain", async () => {
    vi.useFakeTimers();
    const h = harness();
    const voice = voiceOf(createScore(), "melody");
    await h.audio.preview(voice, ["C4", "E4"], 0.4);
    const [master] = h.masters();
    expect(master.gain.value).toBe(0.4);
    const sources = h.started();
    expect(sources.map(source => [source.kind, source.when, source.until]))
      .toEqual([["sample", 1, expect.closeTo(1.47, 9)], ["sample", 1, expect.closeTo(1.47, 9)]]);
    expect(h.states).toEqual([]);
    expect(master.disconnect).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    expect(master.disconnect).toHaveBeenCalledTimes(1);
  });

  it("stays silent when released while its sample is downloading", async () => {
    const net = deferredFetch();
    const h = harness({ fetcher: net.fetcher });
    const voice = voiceOf(createScore(), "melody");
    const preview = h.audio.preview(voice, ["C4"], 1);
    await flush();
    h.audio.stopPreview();
    net.deliver();
    await preview;
    expect(h.contexts[0].nodes).toEqual([]);
  });

  it("auditions a dragged pitch immediately with the instrument's cached sample at the correct rate", async () => {
    vi.useFakeTimers();
    const h = harness();
    const voice = voiceOf(createScore(), "melody");
    await h.audio.preview(voice, ["C4"], 0.4);
    const initial = h.started()[0];
    let deliver!: () => void;
    h.fetcher.mockImplementation(url => new Promise(resolve => { deliver = () => resolve(response(url)); }));
    const moved = h.audio.preview(voice, ["G4"], 0.4);
    await flush();
    // The exact G4 download is still pending, but the pointer already sounds G4.
    const dragged = h.started()[1];
    expect(dragged.kind).toBe("sample");
    expect(dragged.buffer).toEqual({ sample: `${SAMPLES}/Piano/C4.mp3` });
    expect(dragged.rate).toBeCloseTo(2 ** (7 / 12), 10);
    expect(initial.node.stop.mock.calls.at(-1)).toEqual([]);
    await moved;
    h.audio.stopPreview(); deliver(); await flush();
    expect(dragged.node.stop.mock.calls.at(-1)).toEqual([]);
    expect(h.started()).toHaveLength(2); // A released pitch never sounds late.
    // The exact sample is warmed for subsequent auditions.
    await h.audio.preview(voice, ["G4"], 0.4);
    expect(h.started()[2].buffer).toEqual({ sample: `${SAMPLES}/Piano/G4.mp3` });
    expect(h.started()[2].rate).toBe(1);
    h.audio.stopPreview();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not borrow a cached timbre from a different instrument", async () => {
    vi.useFakeTimers();
    const net = deferredFetch(), h = harness();
    const piano = voiceOf(createScore(), "melody");
    await h.audio.preview(piano, ["C4"], 1);
    h.fetcher.mockImplementation(net.fetcher);
    const preview = h.audio.preview({ ...piano, instrument: "Cello" }, ["D4"], 1);
    await flush(); expect(h.started()).toHaveLength(1);
    h.audio.stopPreview(); net.deliver(); await preview;
    expect(h.started()).toHaveLength(1);
  });

  it("is silenced by Stop", async () => {
    vi.useFakeTimers();
    const h = harness();
    const voice = { ...voiceOf(createScore(), "melody"), instrument: "Synth" as Instrument };
    await h.audio.preview(voice, ["C4"], 1);
    const [source] = h.started();
    expect(source.kind).toBe("synth");
    h.audio.stop();
    expect(source.node.stop.mock.calls.at(-1)).toEqual([]);
    vi.advanceTimersByTime(600);
  });
});

describe("SequencerAudio WAV export", () => {
  const tag = (view: DataView, at: number) => String.fromCharCode(...new Uint8Array(view.buffer, at, 4));

  it("renders offline and writes a 16-bit stereo 44.1 kHz PCM file", async () => {
    const h = harness({ rendered: [new Float32Array([0, 1, -1, 2]), new Float32Array([0.5, -0.5, -2, 0])] });
    const score = scoreWith("single", { melody: [note(0, ["C4"], "w"), note(3840, ["D4"]), note(7680, ["E4"])] });
    score.masterVolume = 0.6;
    const exporting = h.audio.wav(score, 1920, 5760);
    await flush();
    expect(h.states).toEqual(["stopped", "exporting"]);
    expect(h.urls()).toEqual([`${SAMPLES}/Piano/C4.mp3`, `${SAMPLES}/Piano/D4.mp3`]);

    // Two seconds of music plus a 0.2 s tail.
    const [context] = h.offline;
    expect(h.offline).toHaveLength(1);
    expect([context.channels, context.rate]).toEqual([2, 44100]);
    expect(Math.abs(context.length - 2.2 * 44100)).toBeLessThanOrEqual(1);
    expect(h.masters(context).map((master: any) => master.gain.value)).toEqual([0.6]);
    const sources = h.started(context);
    expect(sources.map(source => source.kind)).toEqual(["sample", "sample"]);
    expect([sources[0].when, sources[0].until]).toEqual([0, expect.closeTo(1 + 0.02, 9)]);
    expect([sources[1].when, sources[1].until]).toEqual([expect.closeTo(1, 9), expect.closeTo(1.5 + 0.02, 9)]);
    // Nothing is scheduled on the live context.
    expect(h.contexts[0].nodes).toEqual([]);

    h.render();
    const blob = await exporting;
    expect(h.states).toEqual(["stopped", "exporting", "stopped"]);
    expect(h.warnings).toEqual([""]);
    expect(blob!.type).toBe("audio/wav");
    const view = new DataView(await blob!.arrayBuffer());
    expect(view.byteLength).toBe(44 + 4 * 4);
    expect([tag(view, 0), tag(view, 8), tag(view, 12), tag(view, 36)]).toEqual(["RIFF", "WAVE", "fmt ", "data"]);
    expect(view.getUint32(4, true)).toBe(view.byteLength - 8);
    expect(view.getUint32(16, true)).toBe(16);      // fmt chunk size
    expect(view.getUint16(20, true)).toBe(1);       // PCM
    expect(view.getUint16(22, true)).toBe(2);       // channels
    expect(view.getUint32(24, true)).toBe(44100);   // sample rate
    expect(view.getUint32(28, true)).toBe(176400);  // byte rate
    expect(view.getUint16(32, true)).toBe(4);       // block align
    expect(view.getUint16(34, true)).toBe(16);      // bits per sample
    expect(view.getUint32(40, true)).toBe(16);      // data bytes
    // Interleaved left/right, clipped to full scale.
    expect(Array.from({ length: 8 }, (_, index) => view.getInt16(44 + index * 2, true)))
      .toEqual([0, 16383, 32767, -16384, -32768, -32768, 32767, 0]);
  });

  it("returns nothing when Stop arrives while rendering", async () => {
    const h = harness();
    const exporting = h.audio.wav(scoreWith("single", { melody: [note(0, ["C4"])] }));
    await flush();
    expect(h.offline[0].startRendering).toHaveBeenCalledTimes(1);
    h.audio.stop();
    h.render();
    expect(await exporting).toBeNull();
    expect(h.states).toEqual(["stopped", "exporting", "stopped"]);
    expect(h.warnings).toEqual([""]);
  });

  it("does not even render when Stop arrives while samples are downloading", async () => {
    const net = deferredFetch();
    const h = harness({ fetcher: net.fetcher });
    const exporting = h.audio.wav(scoreWith("single", { melody: [note(0, ["C4"])] }));
    await flush();
    expect(h.fetcher).toHaveBeenCalledTimes(1);
    h.audio.stop();
    net.deliver();
    expect(await exporting).toBeNull();
    expect(h.offline).toEqual([]);
    expect(h.states).toEqual(["stopped", "exporting", "stopped"]);
  });

  it("cancels playback, and refuses exports longer than ten minutes", async () => {
    const h = harness();
    const score = scoreWith("single", { melody: [note(0, ["C4"])] });
    await h.audio.play(score);
    const [playing] = h.started();
    score.tempo = 20;
    score.measures.forEach(measure => { measure.time = [32, 1]; }); // 512 quarters at 3 s each
    expect(await h.audio.wav(score)).toBeNull();
    expect(playing.node.stop.mock.calls.at(-1)).toEqual([]);
    expect(h.offline).toEqual([]);
    expect(h.warnings.at(-1)).toBe("audio");
    expect(h.states.at(-1)).toBe("stopped");
  });

  it("closes the context on dispose", async () => {
    const h = harness();
    await h.audio.play(scoreWith("single", { melody: [note(0, ["C4"])] }));
    h.audio.dispose();
    expect(h.contexts[0].close).toHaveBeenCalledTimes(1);
    expect(h.states.at(-1)).toBe("stopped");
    expect(() => harness().audio.dispose()).not.toThrow();
  });
});
