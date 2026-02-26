import { MDXRemote } from "next-mdx-remote/rsc";
import Image from "next/image";
import AudioPlayer from "@/components/media/AudioPlayer";
import YouTubeEmbed from "@/components/media/YouTubeEmbed";

// Componentes personalizados disponibles en archivos MDX
const components = {
  AudioPlayer,
  YouTubeEmbed,
  // Wrapper para imágenes con next/image
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    <Image
      src={src || ""}
      alt={alt || ""}
      width={800}
      height={450}
      className="rounded-lg my-6 w-full h-auto"
    />
  ),
};

type Props = {
  content: string;
};

export default function MDXRenderer({ content }: Props) {
  return (
    <div className="prose prose-lg prose-gray max-w-none
      prose-headings:font-bold prose-headings:text-gray-900
      prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
      prose-p:text-gray-700 prose-p:leading-relaxed
      prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
      prose-strong:text-gray-900
      prose-ul:text-gray-700 prose-ol:text-gray-700
      prose-hr:border-gray-200
      prose-blockquote:border-l-blue-500 prose-blockquote:text-gray-600
    ">
      <MDXRemote source={content} components={components} />
    </div>
  );
}
