class CaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length > 0) {
      // Copia: el buffer de entrada se reutiliza entre llamadas.
      this.port.postMessage(new Float32Array(ch));
    }
    return true;
  }
}

registerProcessor("capture-processor", CaptureProcessor);
