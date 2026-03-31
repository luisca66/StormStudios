"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const locale = useLocale();
  const es = locale === "es";

  // Aparece con un pequeño retardo para no distraer al cargar
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1800);
    return () => clearTimeout(t);
  }, []);

  // Crea el elemento audio solo en el cliente
  useEffect(() => {
    const audio = new Audio("/audio/background-theme.mp3");
    audio.loop = true;
    audio.volume = 0.25;
    audio.preload = "metadata";
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  return (
    <button
      onClick={toggle}
      title={playing ? (es ? "Pausar música" : "Pause music") : (es ? "Reproducir música de ambiente" : "Play ambient music")}
      aria-label={playing ? (es ? "Pausar música de fondo" : "Pause background music") : (es ? "Reproducir música de fondo" : "Play background music")}
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        zIndex: 50,
        height: "40px",
        padding: "0 16px 0 12px",
        borderRadius: "999px",
        border: "1px solid rgba(139,92,246,0.45)",
        background: playing
          ? "linear-gradient(135deg,rgba(139,92,246,0.6),rgba(59,130,246,0.5))"
          : "rgba(15,23,42,0.82)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        color: "rgba(255,255,255,0.9)",
        fontSize: "0.75rem",
        fontFamily: "monospace",
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        boxShadow: playing
          ? "0 0 22px rgba(139,92,246,0.55)"
          : "0 4px 18px rgba(0,0,0,0.4)",
        transition: "all 0.3s ease",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        whiteSpace: "nowrap",
      }}
    >
      {playing ? (
        <>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
            <rect x="2" y="1" width="4" height="12" rx="1"/>
            <rect x="8" y="1" width="4" height="12" rx="1"/>
          </svg>
          <span>Pausar demo</span>
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
          <span>▸ Play demo</span>
        </>
      )}

      {/* Ondas animadas cuando está reproduciendo */}
      {playing && (
        <span style={{
          position: "absolute",
          inset: "-4px",
          borderRadius: "999px",
          border: "1px solid rgba(139,92,246,0.4)",
          animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
          pointerEvents: "none",
        }} />
      )}
    </button>
  );
}
