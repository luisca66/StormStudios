import captureUrl from './capture.worklet.ts?worker&url';
import type { SmoothedTunerState } from '../dsp/SmoothingFilter';
export interface Reading extends SmoothedTunerState { hasPitch: boolean; rms: number; confidence: number }
export class Microphone {
  private stream?: MediaStream;
  private context?: AudioContext;
  private source?: MediaStreamAudioSourceNode;
  private node?: AudioWorkletNode;
  private worker?: Worker;
  private generation = 0;
  private timer?: ReturnType<typeof setInterval>;
  private lastFrame = 0;
  async start(onReading: (reading: Reading) => void, onFailure: (code: string) => void) {
    this.stop();
    const generation = this.generation;
    if (!window.isSecureContext) throw new Error('insecure');
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext || !window.AudioWorkletNode) throw new Error('unsupported');
    try {
      // Resume during the user gesture, before the permission prompt resolves (Safari).
      const context = new AudioContext({ latencyHint: 'interactive' }); this.context = context;
      await context.resume();
      if (generation !== this.generation) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false,
      }, video: false });
      if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      const fail = (code: string) => { if (generation === this.generation) { this.stop(); onFailure(code); } };
      stream.getAudioTracks().forEach(track => { track.onended = () => fail('ended'); });
      await context.audioWorklet.addModule(captureUrl);
      if (generation !== this.generation) return;
      const worker = new Worker(new URL('./pitch.worker.ts', import.meta.url), { type: 'module' }); this.worker = worker;
      const node = new AudioWorkletNode(context, 'tuner-capture', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] }); this.node = node;
      const source = context.createMediaStreamSource(stream); this.source = source;
      node.port.onmessage = (event: MessageEvent<{ samples: Float32Array; sampleRate: number }>) => {
        if (generation === this.generation) worker.postMessage(event.data, [event.data.samples.buffer]);
      };
      worker.onmessage = (event: MessageEvent<Reading>) => {
        if (generation !== this.generation) return;
        this.lastFrame = performance.now(); node.port.postMessage('ready'); onReading(event.data);
      };
      worker.onerror = () => fail('capture'); node.onprocessorerror = () => fail('capture');
      // The processor's output is silence. Connecting keeps the capture graph scheduled.
      source.connect(node); node.connect(context.destination);
      this.lastFrame = performance.now();
      this.timer = setInterval(() => { if (performance.now() - this.lastFrame > 3000) fail('capture'); }, 1000);
    } catch (error) {
      if (generation !== this.generation) return;
      this.stop();
      throw error;
    }
  }
  stop() {
    this.generation++;
    clearInterval(this.timer); this.timer = undefined;
    this.worker?.terminate(); this.worker = undefined;
    if (this.node) { this.node.port.onmessage = null; this.node.port.close(); this.node.disconnect(); this.node = undefined; }
    this.source?.disconnect(); this.source = undefined;
    this.stream?.getTracks().forEach(track => { track.onended = null; track.stop(); }); this.stream = undefined;
    void this.context?.close().catch(() => {}); this.context = undefined;
  }
}
