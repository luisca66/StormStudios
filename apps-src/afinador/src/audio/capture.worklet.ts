// The render thread only assembles overlapping mono windows; no pitch detection here.
declare const sampleRate: number;
declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: unknown);
  process(inputs: Float32Array[][]): boolean;
}
class CaptureProcessor extends AudioWorkletProcessor {
  private frame = new Float32Array(8192);
  private cursor = 0;
  private hop = 2048;
  private busy = false;
  constructor() {
    super();
    this.port.onmessage = () => { this.busy = false; };
  }
  process(inputs: Float32Array[][]) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    for (let i = 0; i < channel.length; i++) {
      this.frame[this.cursor++] = channel[i];
      if (this.cursor === this.frame.length) {
        // One frame in flight: a slow device drops analysis windows rather than building latency.
        if (!this.busy) {
          const samples = this.frame.slice();
          this.port.postMessage({ samples, sampleRate }, [samples.buffer]);
          this.busy = true;
        }
        this.frame.copyWithin(0, this.hop); this.cursor -= this.hop;
      }
    }
    return true;
  }
}
registerProcessor('tuner-capture', CaptureProcessor);
export {};
