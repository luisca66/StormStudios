import { Link } from "@/i18n/navigation";
import type { MDXContent } from "@/lib/mdx";

interface MasteryCardProps {
  piece: MDXContent;
  locale: string;
  heading?: "h2" | "h3";
}

export function MasteryCard({ piece, locale, heading: Heading = "h2" }: MasteryCardProps) {
  const { frontmatter, slug } = piece;
  const es = locale === "es";
  const minutes = frontmatter.duration?.match(/^PT(\d+)M/)?.[1];

  return (
    <Link href={{ pathname: "/maestria/[slug]", params: { slug } }} className="block group">
      <article
        className="ss-glass ss-card rounded-2xl h-full flex flex-col overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {frontmatter.youtubeId && (
          <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#000" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura remota de YouTube, igual que LiteYouTube */}
            <img
              src={`https://i.ytimg.com/vi/${frontmatter.youtubeId}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
            {minutes && (
              <span
                className="ss-mono text-xs"
                style={{ position: "absolute", right: 10, bottom: 10, padding: "0.15rem 0.5rem", borderRadius: 6, background: "rgba(0,0,0,0.75)", color: "#fff" }}
              >
                {minutes} min
              </span>
            )}
          </div>
        )}

        <div className="p-7 flex flex-col gap-4 flex-1">
          <Heading className="ss-serif text-xl leading-snug ss-blog-card-title">
            {frontmatter.title}
          </Heading>

          {frontmatter.description && (
            <p className="ss-mono text-sm leading-relaxed flex-1" style={{ color: "var(--ss-muted)" }}>
              {frontmatter.description}
            </p>
          )}

          <span className="ss-mono text-xs" style={{ color: "var(--ss-violet-text)" }}>
            {frontmatter.youtubeId
              ? (es ? "Ver y leer →" : "Watch and read →")
              : (es ? "Leer →" : "Read →")}
          </span>
        </div>
      </article>
    </Link>
  );
}
