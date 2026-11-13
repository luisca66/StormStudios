import { afterEach, describe, expect, it, vi } from "vitest";
import { AssetAudioPlayer, toAudioUrl } from "./audio-player";
import { pitchFromMidi } from '../../ap-core/progression';

describe("toAudioUrl", () => {
  it("serves samples from the shared Storm Studios R2 bucket by default", () => {
    expect(toAudioUrl("Piano/A2.mp3")).toBe(
      "https://samples.stormstudios.com.mx/Piano/A2.mp3",
    );
  });

  it("encodes sharp notes as URL data", () => {
    expect(toAudioUrl("Cello/C#3.mp3")).toBe(
      "https://samples.stormstudios.com.mx/Cello/C%233.mp3",
    );
  });
});

class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];
  src: string;
  loop = false;
  volume = 1;
  currentTime = 0;
  paused = true;
  preload = '';
  error: unknown = null;
  onended: (() => void) | null = null;
  play = vi.fn(async () => { this.paused = false; });
  pause = vi.fn(() => { this.paused = true; });
  load = vi.fn(() => { queueMicrotask(() => this.dispatchEvent(new Event('canplaythrough'))); });
  constructor(src = '') { super(); this.src = src; FakeAudio.instances.push(this); }
}

afterEach(() => { vi.unstubAllGlobals(); FakeAudio.instances = []; });
describe('audio playback', () => {
  it('preloads all six timbres, reuses the sample, and stops loops on response or navigation', async () => {
    vi.stubGlobal('Audio', FakeAudio);
    const player = new AssetAudioPlayer();
    await player.preload([pitchFromMidi(54)]);
    expect(FakeAudio.instances).toHaveLength(6);
    expect(new Set(FakeAudio.instances.map(a => a.src.split('/')[3]))).toEqual(new Set(['Piano', 'Cello', 'Corno', 'Coro', 'Fagot', 'Guitarra']));
    player.setVolume(.35);
    await player.play('Piano/F#3.mp3', true);
    const audio = FakeAudio.instances[0];
    expect(audio.src).toContain('F%233.mp3'); expect(audio.loop).toBe(true); expect(audio.volume).toBe(.35);
    expect(FakeAudio.instances).toHaveLength(6);
    player.setLooping(false); expect(audio.loop).toBe(false);
    player.stop(); expect(audio.pause).toHaveBeenCalled(); expect(player.isPlaying()).toBe(false);
  });
  it('does not let an interrupted cached playback clear a newer playback', async () => {
    vi.stubGlobal('Audio', FakeAudio);
    const player = new AssetAudioPlayer(); await player.preload([pitchFromMidi(52)]);
    const audio = FakeAudio.instances[0];
    let rejectOld!: (error: Error) => void;
    audio.play.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { rejectOld = reject; }));
    const old = player.play('Piano/E3.mp3');
    await player.play('Piano/E3.mp3', true);
    rejectOld(new Error('interrupted')); await old;
    player.stop(); expect(audio.pause).toHaveBeenCalledTimes(2);
    expect(player.isPlaying()).toBe(false);
  });
  it('reports blocked and failed samples without throwing', async () => {
    vi.stubGlobal('Audio', FakeAudio);
    const player = new AssetAudioPlayer(); await player.preload([pitchFromMidi(52)]);
    const audio = FakeAudio.instances[0];
    audio.play.mockRejectedValue(new Error('blocked'));
    expect(await player.play('Piano/E3.mp3')).toBe('blocked');
    audio.error = new Error('network');
    expect(await player.play('Piano/E3.mp3')).toBe('failed');
  });
});
