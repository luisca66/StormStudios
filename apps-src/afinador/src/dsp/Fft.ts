/** Iterative radix-2 FFT, same correlation convention as Kotlin. Buffers are reused. */
export class Fft {
  private cos: Float64Array;
  private sin: Float64Array;
  private reversed: Uint32Array;
  constructor(public size: number) {
    if (size < 2 || (size & (size - 1)) !== 0) throw new Error('FFT size must be a power of two');
    this.cos = Float64Array.from({ length: size / 2 }, (_, i) => Math.cos(2 * Math.PI * i / size));
    this.sin = Float64Array.from({ length: size / 2 }, (_, i) => Math.sin(2 * Math.PI * i / size));
    const bits = Math.log2(size);
    this.reversed = Uint32Array.from({ length: size }, (_, i) => {
      let r = 0;
      for (let b = 0; b < bits; b++) { r = (r << 1) | (i & 1); i >>>= 1; }
      return r;
    });
  }
  static nextPowerOfTwo(value: number) { let n = 1; while (n < value) n *= 2; return n; }
  transform(re: Float64Array, im: Float64Array, inverse = false) {
    for (let i = 0; i < this.size; i++) {
      const j = this.reversed[i];
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let length = 2; length <= this.size; length *= 2) {
      const half = length / 2, step = this.size / length;
      for (let start = 0; start < this.size; start += length) for (let k = 0; k < half; k++) {
        const wr = this.cos[k * step], wi = this.sin[k * step] * (inverse ? 1 : -1);
        const a = start + k, b = a + half;
        const vr = re[b] * wr - im[b] * wi, vi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi;
      }
    }
    if (inverse) for (let i = 0; i < this.size; i++) { re[i] /= this.size; im[i] /= this.size; }
  }
}
