import { afterEach, describe, expect, it, vi } from "vitest";
import { FakePitchDetector, MicPitchDetector } from "./mic";

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
  const worklets: Array<ReturnType<typeof node> & { port: { onmessage: unknown } }> = [];
  const ctx = {
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

describe("microphone resource lifecycle", () => {
  it("shares initialization and releases every audio node and track, then can reopen", async () => {
    const h = harness();
    await Promise.all([h.detector.ensureReady(), h.detector.ensureReady()]);
    expect(h.getUserMedia).toHaveBeenCalledTimes(1);
    h.detector.startListening(440);
    h.detector.dispose();
    expect(h.track.stop).toHaveBeenCalledTimes(1);
    expect(h.source.disconnect).toHaveBeenCalledOnce();
    expect(h.sink.disconnect).toHaveBeenCalledOnce();
    expect(h.worklets[0].disconnect).toHaveBeenCalledOnce();
    expect(h.worklets[0].port.onmessage).toBeNull();
    expect(h.detector.getCurrentState().holdProgress).toBe(0);
    await h.detector.ensureReady();
    expect(h.getUserMedia).toHaveBeenCalledTimes(2);
    h.detector.dispose();
    expect(h.track.stop).toHaveBeenCalledTimes(2);
  });

  it("stops a permission result arriving after disposal without building a graph", async () => {
    const h = harness();
    const permission = deferred<MediaStream>();
    h.getUserMedia.mockReturnValue(permission.promise);
    const result = expect(h.detector.ensureReady()).rejects.toMatchObject({ name: "AbortError" });
    h.detector.dispose();
    permission.resolve(h.stream);
    await result;
    expect(h.track.stop).toHaveBeenCalledOnce();
    expect(h.ctx.createMediaStreamSource).not.toHaveBeenCalled();
  });

  it("releases permission immediately while the worklet is loading", async () => {
    const h = harness();
    const module = deferred<void>();
    h.ctx.audioWorklet.addModule.mockReturnValue(module.promise);
    const pending = h.detector.ensureReady();
    const result = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await Promise.resolve();
    h.detector.dispose();
    expect(h.track.stop).toHaveBeenCalledOnce();
    module.resolve();
    await result;
    expect(h.ctx.createMediaStreamSource).not.toHaveBeenCalled();
  });

  it("cleans up a worklet failure and supports retry", async () => {
    const h = harness();
    h.ctx.audioWorklet.addModule.mockRejectedValueOnce(new Error("worklet unavailable"));
    await expect(h.detector.ensureReady()).rejects.toThrow("worklet unavailable");
    expect(h.track.stop).toHaveBeenCalledOnce();
    await h.detector.ensureReady();
    expect(h.getUserMedia).toHaveBeenCalledTimes(2);
    h.detector.dispose();
  });

  it("handles denied permission without allocating nodes, and can retry", async () => {
    const h = harness();
    h.getUserMedia.mockRejectedValueOnce(new DOMException("Denied", "NotAllowedError"));
    await expect(h.detector.ensureReady()).rejects.toMatchObject({ name: "MicDeniedError" });
    expect(h.ctx.createMediaStreamSource).not.toHaveBeenCalled();
    await h.detector.ensureReady();
    h.detector.dispose();
    expect(h.track.stop).toHaveBeenCalledOnce();
  });

  it("tears down partially constructed audio graphs", async () => {
    const h = harness();
    h.ctx.createGain.mockImplementationOnce(() => { throw new Error("gain failed"); });
    await expect(h.detector.ensureReady()).rejects.toThrow("gain failed");
    expect(h.source.disconnect).toHaveBeenCalledOnce();
    expect(h.worklets[0].disconnect).toHaveBeenCalledOnce();
    expect(h.track.stop).toHaveBeenCalledOnce();
  });

  it("does not let a stale permission result stop a newer capture", async () => {
    const h = harness();
    const permission = deferred<MediaStream>();
    const oldTrack = { stop: vi.fn() };
    h.getUserMedia.mockReturnValueOnce(permission.promise);
    const old = expect(h.detector.ensureReady()).rejects.toMatchObject({ name: "AbortError" });
    h.detector.dispose();
    await h.detector.ensureReady();
    permission.resolve({ getTracks: () => [oldTrack] } as unknown as MediaStream);
    await old;
    expect(oldTrack.stop).toHaveBeenCalledOnce();
    expect(h.track.stop).not.toHaveBeenCalled();
    h.detector.dispose();
    expect(h.track.stop).toHaveBeenCalledOnce();
  });
});

describe("calibrated pitch tracking", () => {
  it("retains the established hold and resets it when the activity stops", () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {
      setInterval, clearInterval, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    });
    const detector = new FakePitchDetector();
    detector.startListening(440);
    expect(detector.pumpFrames(20).holdProgress).toBeLessThan(1);
    expect(detector.pumpFrames(60).holdProgress).toBe(1);
    detector.dispose();
    expect(detector.getCurrentState().holdProgress).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
