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

export function useMicInput(enabled: boolean, paused: boolean, onNote: (midi: number) => void, onAutoOff?: () => void) {
  const [state, setState] = useState<{ status: MicStatus; heard: number | null }>({ status: "off", heard: null });
  const handler = useRef(onNote), hold = useRef(paused), autoOff = useRef(onAutoOff);
  useEffect(() => { handler.current = onNote; hold.current = paused; autoOff.current = onAutoOff; });
  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) { queueMicrotask(() => setState({ status: "unsupported", heard: null })); return; }
    let cancelled = false, frame = 0, stream: MediaStream | null = null, context: AudioContext | null = null, lastHeard: number | null = null;
    const segmenter = new NoteSegmenter(note => handler.current(note));
    const release = (notifyParent: boolean) => {
      if (cancelled) return;
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
      stream = null;
      void context?.close();
      context = null;
      setState({ status: "off", heard: null });
      if (notifyParent) autoOff.current?.();
    };
    const onHide = () => { if (document.hidden) release(true); };
    const onPageHide = () => release(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    queueMicrotask(() => { if (!cancelled) setState({ status: "asking", heard: null }); });
    // Sin cancelación de eco ni reducción de ruido: alteran la altura de voces e instrumentos.
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(granted => {
      if (cancelled || document.hidden) { granted.getTracks().forEach(track => track.stop()); if (document.hidden) release(true); return; }
      stream = granted; context = new AudioContext();
      for (const track of stream.getTracks()) track.onended = () => release(true);
      const analyser = context.createAnalyser(); analyser.fftSize = 4096;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      setState({ status: "listening", heard: null });
      const tick = () => {
        if (cancelled) return;
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
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      release(false);
    };
  }, [enabled]);
  return state;
}
