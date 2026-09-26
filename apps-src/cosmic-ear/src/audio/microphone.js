// Micrófono → AudioWorklet `pitch-processor` → un callback por cuadro de análisis.
// Extraído de main.jsx en la fase 1b paso 2 (PLAN-COSMIC-EAR.md); la cadena de audio no cambió.

export class Microphone {
    constructor() {
        this.stream = null;
        this.source = null;
        this.worklet = null;
        this.sink = null;
    }

    /** Pide el micrófono y conecta el worklet; `onFrame({ frequency, rms, ... })` por cada cuadro. */
    async open(ctx, onFrame) {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
            throw new Error('microphone-unsupported');
        }
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            await ctx.audioWorklet.addModule('/apps/cosmic-ear/pitch-processor.js?v=2');

            this.source = ctx.createMediaStreamSource(this.stream);
            this.worklet = new AudioWorkletNode(ctx, 'pitch-processor');
            this.sink = ctx.createGain();
            this.sink.gain.value = 0;     // el worklet necesita llegar al destino para procesar, pero en silencio
            this.source.connect(this.worklet);
            this.worklet.connect(this.sink).connect(ctx.destination);
            this.worklet.port.onmessage = ({ data }) => onFrame(data);
        } catch (err) {
            this.close();
            throw err;
        }
    }

    close() {
        try { this.source?.disconnect(); } catch (e) {}
        try { this.worklet?.disconnect(); } catch (e) {}
        try { this.sink?.disconnect(); } catch (e) {}
        if (this.stream) this.stream.getTracks().forEach(track => track.stop());
        this.stream = this.source = this.worklet = this.sink = null;
    }
}
