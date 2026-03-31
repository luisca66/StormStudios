"use client";

type Props = {
  id: string;
  title?: string;
  className?: string;
};

export default function YouTubeEmbed({ id, title = "Video", className = "" }: Props) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl shadow-md bg-black ${className}`}
      style={{ paddingBottom: "56.25%" }} // 16:9
    >
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        className="absolute inset-0 w-full h-full border-0"
      />
    </div>
  );
}
