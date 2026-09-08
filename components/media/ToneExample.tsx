"use client";

import { useEffect, useRef, useState } from "react";

/** Short, user-triggered examples synthesized locally; no microphone or uploads. */
export default function ToneExample({ notes, simultaneous = false, locale }: { notes: number[]; simultaneous?: boolean; locale: string }) {
  const context = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const es = locale === "es";
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    void context.current?.close();
    context.current = null;
  }, []);
  async function play() {
    if (context.current && !playing) return;
    if (playing) {
      if (timer.current) clearTimeout(timer.current);
      void context.current?.close();
      context.current = null;
      setPlaying(false);
      return;
    }
    try {
      const audio = new AudioContext();
      context.current = audio;
      await audio.resume();
      if (context.current !== audio) return;
      const duration = simultaneous ? 1.5 : notes.length * 0.65;
      notes.forEach((midi, i) => {
        const start = audio.currentTime + (simultaneous ? 0 : i * 0.65);
        const length = simultaneous ? 1.4 : 0.55;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.1 / (simultaneous ? notes.length : 1), start + 0.02);
        gain.gain.setValueAtTime(0.1 / (simultaneous ? notes.length : 1), start + length - 0.05);
        gain.gain.linearRampToValueAtTime(0, start + length);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start(start);
        oscillator.stop(start + length);
      });
      setPlaying(true);
      setError(false);
      timer.current = setTimeout(() => {
        void audio.close();
        if (context.current === audio) { context.current = null; setPlaying(false); }
      }, duration * 1000 + 100);
    } catch {
      void context.current?.close();
      context.current = null;
      setError(true);
      setPlaying(false);
    }
  }
  return <div className="my-4"><button type="button" onClick={() => void play()} className="px-5 py-3 rounded-lg bg-blue-800 text-white">
    {playing ? (es ? "Detener ejemplo" : "Stop example") : (es ? "Escuchar ejemplo" : "Play example")}
  </button>{error && <p role="alert">{es ? "No se pudo iniciar el audio. Revisa el permiso de sonido del navegador." : "Could not start audio. Check your browser’s sound permission."}</p>}</div>;
}
