import { MDXRemote } from "next-mdx-remote/rsc";
import Image from "next/image";
import AudioPlayer from "@/components/media/AudioPlayer";
import YouTubeEmbed from "@/components/media/YouTubeEmbed";

const components = {
  AudioPlayer,
  YouTubeEmbed,
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    <Image
      src={src || ""}
      alt={alt || ""}
      width={800}
      height={450}
      className="rounded-xl my-6 w-full h-auto"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
    />
  ),
};

type Props = { content: string };

/**
 * MDX renderer para páginas con fondo oscuro (ss-root).
 * Usa las clases .blog-prose definidas en storm-studios.css.
 */
export default function DarkMDXRenderer({ content }: Props) {
  return (
    <div className="blog-prose">
      <MDXRemote source={content} components={components} />
    </div>
  );
}
