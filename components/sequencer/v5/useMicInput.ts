"use client";
/**
 * useMicInput — escribir cantando o tocando. Pide el micrófono solo cuando el
 * usuario lo enciende; el audio no sale de la computadora ni se graba.
 * `paused` (p. ej. mientras suena la partitura) evita escribir lo que el propio
 * secuenciador reproduce por las bocinas.
 */
import { useEffect, useRef, useState } from "react";
import { detectPitch, NoteSegmenter } from "@/lib/sequencer/mic-input";

export type MicStatus = "off" | "unsupported" | "asking" | "listening" | "denied";

export function useMicInput(enabled: boolean, paused: boolean, onNote: (midi: number) => void) {
  const [state, setState] = useState<{ status: MicStatus; heard: number | null }>({ status: "off", heard: null });
  const handler = useRef(onNote), hold = useRef(paused);
  useEffect(() => { handler.current = onNote; hold.current = paused; });
  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) { queueMicrotask(() => setState({ status: "unsupported", heard: null })); return; }
    let cancelled = false, frame = 0, stream: MediaStream | null = null, context: AudioContext | null = null, lastHeard: number | null = null;
    const segmenter = new NoteSegmenter(note => handler.current(note));
    queueMicrotask(() => { if (!cancelled) setState({ status: "asking", heard: null }); });
    // Sin cancelación de eco ni reducción de ruido: alteran la altura de voces e instrumentos.
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(granted => {
      if (cancelled) { granted.getTracks().forEach(track => track.stop()); return; }
      stream = granted; context = new AudioContext();
      const analyser = context.createAnalyser(); analyser.fftSize = 4096;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      setState({ status: "listening", heard: null });
      const tick = () => {
        frame = requestAnimationFrame(tick);
        if (hold.current) { segmenter.reset(); return; }
        analyser.getFloatTimeDomainData(samples);
        const reading = detectPitch(samples, context!.sampleRate);
        segmenter.push(reading ? reading.midi : null, performance.now());
        const heard = reading ? Math.round(reading.midi) : null;
        if (heard !== lastHeard) { lastHeard = heard; setState({ status: "listening", heard }); }
      };
      tick();
    }).catch(() => { if (!cancelled) setState({ status: "denied", heard: null }); });
    return () => {
      cancelled = true; cancelAnimationFrame(frame);
      stream?.getTracks().forEach(track => track.stop()); void context?.close();
      setState({ status: "off", heard: null });
    };
  }, [enabled]);
  return state;
}
