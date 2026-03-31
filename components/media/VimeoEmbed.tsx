"use client";

type Props = {
  id: string;
  hash?: string;
  title?: string;
  className?: string;
};

export default function VimeoEmbed({ id, hash, title = "Video", className = "" }: Props) {
  const src = hash
    ? `https://player.vimeo.com/video/${id}?h=${hash}&title=0&byline=0&portrait=0&badge=0&autopause=0`
    : `https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0&badge=0&autopause=0`;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl shadow-md bg-black ${className}`}
      style={{ paddingBottom: "56.25%" }} // 16:9
    >
      <iframe
        src={src}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
        allowFullScreen
        loading="lazy"
        className="absolute inset-0 w-full h-full border-0"
      />
    </div>
  );
}
