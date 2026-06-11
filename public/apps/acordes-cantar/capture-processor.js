class CaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];

    if (channel && channel.length > 0) {
      // The browser reuses the input buffer between callbacks.
      this.port.postMessage(new Float32Array(channel));
    }

    return true;
  }
}

registerProcessor("capture-processor", CaptureProcessor);
