import Link from "next/link";
import type { MDXContent } from "@/lib/mdx";

interface BlogCardProps {
  post: MDXContent;
  locale: string;
}

const TAG_COLORS: Record<string, string> = {
  armonía: "rgba(139,92,246,0.2)",
  contrapunto: "rgba(59,130,246,0.2)",
  satb: "rgba(6,182,212,0.2)",
  shostakovich: "rgba(16,185,129,0.2)",
  teoría: "rgba(245,158,11,0.2)",
  análisis: "rgba(239,68,68,0.2)",
  harmony: "rgba(139,92,246,0.2)",
  counterpoint: "rgba(59,130,246,0.2)",
  theory: "rgba(245,158,11,0.2)",
  analysis: "rgba(239,68,68,0.2)",
};

export function BlogCard({ post, locale }: BlogCardProps) {
  const { frontmatter, slug } = post;
  const href = `/${locale}/blog/${slug}`;

  const formattedDate = frontmatter.date
    ? new Date(frontmatter.date).toLocaleDateString(
        locale === "es" ? "es-MX" : "en-US",
        { year: "numeric", month: "long", day: "numeric" }
      )
    : null;

  return (
    <Link href={href} className="block group">
      <article
        className="ss-glass ss-card rounded-2xl p-7 h-full flex flex-col gap-4"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Tags */}
        {frontmatter.tags && frontmatter.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {frontmatter.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="ss-mono text-xs px-2 py-0.5 rounded-full uppercase tracking-widest"
                style={{
                  background: TAG_COLORS[tag.toLowerCase()] ?? "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title — clase CSS maneja el gradient en hover, sin doble span */}
        <h2 className="ss-serif text-xl leading-snug ss-blog-card-title">
          {frontmatter.title}
        </h2>

        {/* Description */}
        {frontmatter.description && (
          <p
            className="ss-mono text-sm leading-relaxed flex-1"
            style={{ color: "rgba(240,238,255,0.55)" }}
          >
            {frontmatter.description}
          </p>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between ss-mono text-xs pt-3"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(240,238,255,0.35)",
          }}
        >
          {formattedDate && <span>{formattedDate}</span>}
          <span style={{ color: "rgba(139,92,246,0.8)" }}>
            {locale === "es" ? "Leer →" : "Read →"}
          </span>
        </div>
      </article>
    </Link>
  );
}
