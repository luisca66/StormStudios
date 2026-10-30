"use client";

import LiteYouTube from "@/components/media/LiteYouTube";
import { PAUSAR_MUSICA } from "@/components/MusicPlayer";

type Props = {
  youtubeId: string;
  title: string;
  playLabel: string;
};

/** Video principal de una pieza de Maestría. Al darle play se pausa la música de fondo. */
export function MasteryVideo({ youtubeId, title, playLabel }: Props) {
  return (
    <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: "1.25rem", overflow: "hidden", border: "1px solid rgba(139,92,246,0.3)", boxShadow: "0 0 80px rgba(139,92,246,0.18)" }}>
      <LiteYouTube
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`}
        title={title}
        playLabel={playLabel}
        onPlay={() => window.dispatchEvent(new Event(PAUSAR_MUSICA))}
      />
    </div>
  );
}
