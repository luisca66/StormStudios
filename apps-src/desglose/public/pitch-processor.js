/**
 * pitch-processor.js — AudioWorklet que detecta la frecuencia fundamental con YIN.
 *
 * Corre en el hilo de audio (no en el main thread): acumula ventanas de 2048
 * muestras con 50% de solape y publica la frecuencia estimada (Hz) por mensaje.
 * Es JS puro porque los worklets se cargan por URL en su propio realm.
 *
 * Referencia: de Cheveigné & Kawahara (2002), "YIN, a fundamental frequency
 * estimator for speech and music".
 */
class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.hop = 1024; // 50% de solape
    this.buffer = new Float32Array(this.bufferSize);
    this.filled = 0;
    this.threshold = 0.12; // umbral de claridad YIN
    this.minRms = 0.01; // ignora silencio/ruido de fondo
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel || channel.length === 0) return true;

    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.filled++] = channel[i];
      if (this.filled === this.bufferSize) {
        const freq = this.detect(this.buffer, sampleRate);
        if (freq > 0) this.port.postMessage(freq);
        // Desliza la ventana un "hop" para mantener el solape.
        this.buffer.copyWithin(0, this.hop);
        this.filled = this.bufferSize - this.hop;
      }
    }
    return true;
  }

  detect(buffer, sr) {
    const size = buffer.length;
    const half = size >> 1;

    // Puerta de energía: descarta tramos demasiado silenciosos.
    let sumSquares = 0;
    for (let i = 0; i < size; i++) sumSquares += buffer[i] * buffer[i];
    if (Math.sqrt(sumSquares / size) < this.minRms) return -1;

    const yin = new Float32Array(half);

    // Paso 1: función de diferencia.
    for (let tau = 1; tau < half; tau++) {
      let sum = 0;
      for (let i = 0; i < half; i++) {
        const delta = buffer[i] - buffer[i + tau];
        sum += delta * delta;
      }
      yin[tau] = sum;
    }

    // Paso 2: diferencia media acumulada normalizada.
    yin[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < half; tau++) {
      runningSum += yin[tau];
      yin[tau] = runningSum > 0 ? (yin[tau] * tau) / runningSum : 1;
    }

    // Paso 3: umbral absoluto (primer mínimo bajo el umbral).
    let tauEstimate = -1;
    for (let tau = 2; tau < half; tau++) {
      if (yin[tau] < this.threshold) {
        while (tau + 1 < half && yin[tau + 1] < yin[tau]) tau++;
        tauEstimate = tau;
        break;
      }
    }
    if (tauEstimate === -1) return -1;

    // Paso 4: interpolación parabólica para refinar tau.
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

    const freq = sr / betterTau;
    // Rango plausible para voz cantada / instrumentos (≈ B0 a C7).
    if (freq < 30 || freq > 2100) return -1;
    return freq;
  }
}

registerProcessor("pitch-processor", PitchProcessor);
