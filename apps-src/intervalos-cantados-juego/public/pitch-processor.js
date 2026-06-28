class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.hop = 1024;
    this.buffer = new Float32Array(this.bufferSize);
    this.filled = 0;
    this.threshold = 0.12;
    this.minRms = 0.01;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel || channel.length === 0) return true;

    for (let i = 0; i < channel.length; i += 1) {
      this.buffer[this.filled] = channel[i];
      this.filled += 1;
      if (this.filled === this.bufferSize) {
        const frequency = this.detect(this.buffer, sampleRate);
        if (frequency > 0) this.port.postMessage(frequency);
        this.buffer.copyWithin(0, this.hop);
        this.filled = this.bufferSize - this.hop;
      }
    }
    return true;
  }

  detect(buffer, sampleRateValue) {
    const size = buffer.length;
    const half = size >> 1;
    let sumSquares = 0;

    for (let i = 0; i < size; i += 1) sumSquares += buffer[i] * buffer[i];
    if (Math.sqrt(sumSquares / size) < this.minRms) return -1;

    const yin = new Float32Array(half);

    for (let tau = 1; tau < half; tau += 1) {
      let sum = 0;
      for (let i = 0; i < half; i += 1) {
        const delta = buffer[i] - buffer[i + tau];
        sum += delta * delta;
      }
      yin[tau] = sum;
    }

    yin[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < half; tau += 1) {
      runningSum += yin[tau];
      yin[tau] = runningSum > 0 ? (yin[tau] * tau) / runningSum : 1;
    }

    let tauEstimate = -1;
    for (let tau = 2; tau < half; tau += 1) {
      if (yin[tau] < this.threshold) {
        while (tau + 1 < half && yin[tau + 1] < yin[tau]) tau += 1;
        tauEstimate = tau;
        break;
      }
    }
    if (tauEstimate === -1) return -1;

    let betterTau = tauEstimate;
    const x0 = tauEstimate > 0 ? tauEstimate - 1 : tauEstimate;
    const x2 = tauEstimate + 1 < half ? tauEstimate + 1 : tauEstimate;
    if (x0 !== tauEstimate && x2 !== tauEstimate) {
      const s0 = yin[x0];
      const s1 = yin[tauEstimate];
      const s2 = yin[x2];
      const denom = 2 * (2 * s1 - s2 - s0);
      if (denom !== 0) betterTau = tauEstimate + (s2 - s0) / denom;
    }

    const frequency = sampleRateValue / betterTau;
    if (frequency < 30 || frequency > 2100) return -1;
    return frequency;
  }
}

registerProcessor("pitch-processor", PitchProcessor);
