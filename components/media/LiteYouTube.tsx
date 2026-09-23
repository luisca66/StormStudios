"use client";

import { useState } from "react";

type Props = {
  /** URL de embed (youtube-nocookie). */
  src: string;
  title: string;
  playLabel: string;
};

/**
 * Muestra la miniatura del video y solo carga el reproductor de YouTube al
 * pulsar play: evita descargar cientos de KB de terceros en cada lección.
 */
export default function LiteYouTube({ src, title, playLabel }: Props) {
  const [active, setActive] = useState(false);
  const videoId = src.match(/\/embed\/([\w-]{6,})/)?.[1];

  const frameStyle = { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" } as const;

  if (active || !videoId) {
    const url = new URL(src);
    if (active) url.searchParams.set("autoplay", "1");
    return (
      <iframe
        src={url.toString()}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        style={frameStyle}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setActive(true)}
      aria-label={`${playLabel}: ${title}`}
      className="group"
      style={{ ...frameStyle, padding: 0, cursor: "pointer", background: "#000" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- miniatura remota ligera; next/image no aporta aquí */}
      <img
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
      />
      <span
        aria-hidden="true"
        className="transition-transform group-hover:scale-110"
        style={{
          position: "absolute", top: "50%", left: "50%", width: 68, height: 48, marginTop: -24, marginLeft: -34,
          borderRadius: 12, background: "#ff0033", display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><polygon points="7,4 20,12 7,20" /></svg>
      </span>
    </button>
  );
}
