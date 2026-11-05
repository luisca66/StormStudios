import { afterEach, describe, expect, it, vi } from "vitest";
import { MicPitchDetector } from "./pitch";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function harness() {
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  const node = () => ({ connect: vi.fn((target: unknown) => target), disconnect: vi.fn() });
  const source = node();
  const sink = { ...node(), gain: { value: 1 } };
  const worklets: Array<ReturnType<typeof node> & { port: { onmessage: ((event: { data: number }) => void) | null } }> = [];
  const ctx = {
    state: "running",
    resume: vi.fn().mockResolvedValue(undefined),
    audioWorklet: { addModule: vi.fn().mockResolvedValue(undefined) },
    createMediaStreamSource: vi.fn(() => source),
    createGain: vi.fn(() => sink),
    destination: {},
  };
  vi.stubGlobal("window", { isSecureContext: true });
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.stubGlobal("AudioWorkletNode", class {
    constructor() {
      const worklet = { ...node(), port: { onmessage: null } };
      worklets.push(worklet);
      return worklet;
    }
  });
  return { track, stream, getUserMedia, ctx, source, sink, worklets,
    detector: new MicPitchDetector(ctx as unknown as AudioContext) };
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("bounded microphone capture", () => {
  it("returns the captured pitches and releases hardware at the end of each answer", async () => {
    vi.useFakeTimers();
    const h = harness();
    const listening = h.detector.listen(3000);
    await vi.advanceTimersByTimeAsync(0);
    h.worklets[0].port.onmessage?.({ data: 440 });
    h.worklets[0].port.onmessage?.({ data: -1 });
    h.worklets[0].port.onmessage?.({ data: 442 });
    await vi.advanceTimersByTimeAsync(3000);
    await expect(listening).resolves.toEqual([440, 442]);
    expect(h.track.stop).toHaveBeenCalledOnce();
    expect(h.source.disconnect).toHaveBeenCalledOnce();
    expect(h.sink.disconnect).toHaveBeenCalledOnce();
    expect(h.worklets[0].port.onmessage).toBeNull();
    const next = h.detector.listen(100);
    await vi.advanceTimersByTimeAsync(100);
    await expect(next).resolves.toEqual([]);
    expect(h.getUserMedia).toHaveBeenCalledTimes(2);
    expect(h.track.stop).toHaveBeenCalledTimes(2);
  });

  it("cancels a recording immediately without leaving its timer running", async () => {
    vi.useFakeTimers();
    const h = harness();
    const pending = h.detector.listen(3000);
    const cancelled = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(0);
    h.detector.dispose();
    await cancelled;
    expect(h.track.stop).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops authorization arriving after cancellation and does not touch a newer stream", async () => {
    const h = harness();
    const permission = deferred<MediaStream>();
    const oldTrack = { stop: vi.fn() };
    h.getUserMedia.mockReturnValueOnce(permission.promise);
    const old = expect(h.detector.listen(3000)).rejects.toMatchObject({ name: "AbortError" });
    h.detector.dispose();
    await Promise.all([h.detector.ensureReady(), h.detector.ensureReady()]);
    permission.resolve({ getTracks: () => [oldTrack] } as unknown as MediaStream);
    await old;
    expect(h.getUserMedia).toHaveBeenCalledTimes(2);
    expect(oldTrack.stop).toHaveBeenCalledOnce();
    expect(h.track.stop).not.toHaveBeenCalled();
    h.detector.dispose();
  });

  it("releases the track immediately if hidden while the worklet loads", async () => {
    const h = harness();
    const module = deferred<void>();
    h.ctx.audioWorklet.addModule.mockReturnValue(module.promise);
    const cancelled = expect(h.detector.ensureReady()).rejects.toMatchObject({ name: "AbortError" });
    await Promise.resolve();
    h.detector.dispose();
    expect(h.track.stop).toHaveBeenCalledOnce();
    module.resolve();
    await cancelled;
    expect(h.ctx.createMediaStreamSource).not.toHaveBeenCalled();
  });

  it("releases granted permission if preparing the worklet or resuming audio fails", async () => {
    const h = harness();
    h.ctx.audioWorklet.addModule.mockRejectedValueOnce(new Error("module failed"));
    await expect(h.detector.listen(3000)).rejects.toThrow("module failed");
    expect(h.track.stop).toHaveBeenCalledOnce();
    h.ctx.state = "suspended";
    h.ctx.resume.mockRejectedValueOnce(new Error("resume failed"));
    await expect(h.detector.listen(3000)).rejects.toThrow("resume failed");
    expect(h.track.stop).toHaveBeenCalledTimes(2);
  });

  it("recovers from denied permission and cleans up a partially constructed graph", async () => {
    const h = harness();
    h.getUserMedia.mockRejectedValueOnce(new DOMException("Denied", "NotAllowedError"));
    await expect(h.detector.listen(3000)).rejects.toMatchObject({ name: "MicDeniedError" });
    expect(h.ctx.createMediaStreamSource).not.toHaveBeenCalled();
    h.ctx.createGain.mockImplementationOnce(() => { throw new Error("gain failed"); });
    await expect(h.detector.listen(3000)).rejects.toThrow("gain failed");
    expect(h.source.disconnect).toHaveBeenCalledOnce();
    expect(h.worklets[0].disconnect).toHaveBeenCalledOnce();
    expect(h.track.stop).toHaveBeenCalledOnce();
  });
});
