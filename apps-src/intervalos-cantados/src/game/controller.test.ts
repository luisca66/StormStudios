import { afterEach, describe, expect, it, vi } from "vitest";
import type { AudioEngine } from "../audio/engine";
import type { MicPitchDetector } from "../audio/pitch";
import { GameController } from "./controller";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function harness() {
  vi.stubGlobal("window", { setTimeout, clearTimeout, setInterval, clearInterval });
  vi.stubGlobal("localStorage", { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn() });
  const audio = {
    unlock: vi.fn().mockResolvedValue(undefined), stopAll: vi.fn(),
    playNote: vi.fn().mockResolvedValue(undefined), playFeedback: vi.fn().mockResolvedValue(undefined),
  };
  const mic = { listen: vi.fn().mockResolvedValue([]), dispose: vi.fn() };
  const controller = new GameController("es", audio as unknown as AudioEngine, mic as unknown as MicPitchDetector);
  controller.startTraining("FIFTH");
  controller.inputNoteKey("G");
  return { controller, audio, mic };
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("recording navigation and cancellation", () => {
  it.each(["openMenu", "openSetup", "openStats"] as const)("%s releases the microphone and discards a late result", async (navigate) => {
    const h = harness();
    const recording = deferred<number[]>();
    h.mic.listen.mockReturnValue(recording.promise);
    const pending = h.controller.submitAnswer();
    await Promise.resolve();
    expect(h.controller.getState().recording).toBe(true);
    h.controller[navigate]();
    expect(h.mic.dispose).toHaveBeenCalledTimes(2);
    recording.resolve([440]);
    await pending;
    expect(h.controller.getState().recording).toBe(false);
    expect(h.controller.getState().processing).toBe(false);
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(h.audio.playFeedback).not.toHaveBeenCalled();
    h.controller.dispose();
  });

  it("does not acquire a mic if navigation happens while audio unlock is pending", async () => {
    const h = harness();
    const unlock = deferred<void>();
    h.audio.unlock.mockReturnValue(unlock.promise);
    const pending = h.controller.submitAnswer();
    h.controller.openMenu();
    unlock.resolve();
    await pending;
    expect(h.mic.listen).not.toHaveBeenCalled();
  });

  it("suspending cancels capture; a late answer cannot grade a replacement session", async () => {
    const h = harness();
    const old = deferred<number[]>();
    h.mic.listen.mockReturnValueOnce(old.promise);
    const pending = h.controller.submitAnswer();
    await Promise.resolve();
    h.controller.suspend();
    expect(h.controller.getState().processing).toBe(false);
    h.controller.startTraining("FOURTH");
    old.resolve([440]);
    await pending;
    expect(h.controller.getState().selectedIntervalId).toBe("FOURTH");
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(h.audio.playFeedback).not.toHaveBeenCalled();
    h.controller.dispose();
  });

  it("finishing a timed session releases capture and ignores its pending result", async () => {
    vi.useFakeTimers();
    const h = harness();
    h.controller.openMode("time");
    h.controller.setDuration(1);
    h.controller.startTraining("FIFTH");
    h.controller.inputNoteKey("G");
    const recording = deferred<number[]>();
    h.mic.listen.mockReturnValue(recording.promise);
    const pending = h.controller.submitAnswer();
    await Promise.resolve();
    const before = h.mic.dispose.mock.calls.length;
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.controller.getState().session?.ended).toBe(true);
    expect(h.mic.dispose).toHaveBeenCalledTimes(before + 1);
    recording.resolve([440]);
    await pending;
    expect(localStorage.setItem).not.toHaveBeenCalled();
    h.controller.dispose();
  });
});
