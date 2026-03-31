import Link from "next/link";
import type { MDXFrontmatter } from "@/lib/mdx";

interface BlogLayoutProps {
  frontmatter: MDXFrontmatter;
  locale: string;
  children: React.ReactNode;
}

export function BlogLayout({ frontmatter, locale, children }: BlogLayoutProps) {
  const formattedDate = frontmatter.date
    ? new Date(frontmatter.date).toLocaleDateString(
        locale === "es" ? "es-MX" : "en-US",
        { year: "numeric", month: "long", day: "numeric" }
      )
    : null;

  const backHref = `/${locale}/blog`;
  const backLabel = locale === "es" ? "← Blog" : "← Blog";

  return (
    <div className="ss-root" style={{ minHeight: "100vh" }}>
      {/* Orbs */}
      <div className="ss-orb ss-orb-a" aria-hidden />
      <div className="ss-orb ss-orb-b" aria-hidden />

      <div
        className="relative z-10"
        style={{ maxWidth: "780px", margin: "0 auto", padding: "120px 24px 80px" }}
      >
        {/* Back link */}
        <Link
          href={backHref}
          className="ss-mono text-sm transition-colors duration-200 mb-10 inline-block"
          style={{ color: "rgba(139,92,246,0.8)" }}
        >
          {backLabel}
        </Link>

        {/* Header */}
        <header className="mb-12 mt-6">
          {/* Tags */}
          {frontmatter.tags && frontmatter.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {frontmatter.tags.map((tag) => (
                <span
                  key={tag}
                  className="ss-mono text-xs px-3 py-1 rounded-full uppercase tracking-widest"
                  style={{
                    background: "rgba(139,92,246,0.15)",
                    color: "rgba(196,181,253,0.9)",
                    border: "1px solid rgba(139,92,246,0.25)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="ss-serif ss-reveal" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", lineHeight: 1.1, color: "#f0eeff", marginBottom: "1.5rem" }}>
            {frontmatter.title}
          </h1>

          {frontmatter.description && (
            <p className="ss-mono ss-reveal" style={{ fontSize: "1.1rem", color: "rgba(240,238,255,0.55)", lineHeight: 1.7, animationDelay: "0.1s" }}>
              {frontmatter.description}
            </p>
          )}

          {/* Meta */}
          <div
            className="flex items-center gap-6 ss-mono text-sm mt-8 pt-6"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)", color: "rgba(240,238,255,0.35)" }}
          >
            {frontmatter.author && <span>{frontmatter.author}</span>}
            {formattedDate && <span>{formattedDate}</span>}
          </div>
        </header>

        {/* Divider */}
        <div className="ss-divider mb-12" />

        {/* MDX Content */}
        <div className="blog-prose">
          {children}
        </div>

        {/* Footer CTA */}
        <div
          className="ss-glass rounded-2xl p-8 mt-16 text-center ss-reveal"
          style={{ border: "1px solid rgba(139,92,246,0.2)" }}
        >
          <p className="ss-serif mb-2" style={{ fontSize: "1.3rem", color: "#f0eeff" }}>
            {locale === "es" ? "¿Listo para practicar?" : "Ready to practice?"}
          </p>
          <p className="ss-mono text-sm mb-6" style={{ color: "rgba(240,238,255,0.5)" }}>
            {locale === "es"
              ? "Aplica estos conceptos en el Curso de Armonía con retroalimentación de IA."
              : "Apply these concepts in the Harmony Course with AI feedback."}
          </p>
          <Link
            href={`/${locale}/curso-armonia`}
            className="inline-block px-6 py-3 rounded-xl ss-mono text-sm font-medium transition-all duration-300"
            style={{ background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", color: "#fff" }}
          >
            {locale === "es" ? "Ir al Curso →" : "Go to Course →"}
          </Link>
        </div>
      </div>
    </div>
  );
}
