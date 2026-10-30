import Link from "next/link";
import type { MDXFrontmatter } from "@/lib/mdx";

interface BlogLayoutProps {
  frontmatter: MDXFrontmatter;
  locale: string;
  children: React.ReactNode;
  /** Enlace de regreso; por defecto, el blog. */
  back?: { href: string; label: string };
  /** Se muestra entre el encabezado y el texto, p. ej. un video. */
  media?: React.ReactNode;
  /** Cierre de la página; por defecto, la invitación al curso. */
  cta?: { title: string; text: string; href: string; label: string };
}

export function BlogLayout({ frontmatter, locale, children, back, media, cta }: BlogLayoutProps) {
  const formattedDate = frontmatter.date
    ? new Date(frontmatter.date).toLocaleDateString(
        locale === "es" ? "es-MX" : "en-US",
        { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }
      )
    : null;

  const backHref = back?.href ?? `/${locale}/blog`;
  const backLabel = back?.label ?? "← Blog";

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
          style={{ color: "var(--ss-violet-text)" }}
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
            <p className="ss-mono ss-reveal" style={{ fontSize: "1.1rem", color: "var(--ss-muted)", lineHeight: 1.7, animationDelay: "0.1s" }}>
              {frontmatter.description}
            </p>
          )}

          {/* Meta */}
          <div
            className="flex items-center gap-6 ss-mono text-sm mt-8 pt-6"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)", color: "var(--ss-muted)" }}
          >
            {frontmatter.author && <span>{frontmatter.author}</span>}
            {formattedDate && <span>{formattedDate}</span>}
          </div>
        </header>

        {media && <div className="mb-12">{media}</div>}

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
            {cta?.title ?? (locale === "es" ? "¿Listo para practicar?" : "Ready to practice?")}
          </p>
          <p className="ss-mono text-sm mb-6" style={{ color: "var(--ss-muted)" }}>
            {cta?.text ?? (locale === "es"
              ? "Aplica estos conceptos en el Curso de Armonía con revisión automática de ejercicios MIDI."
              : "Apply these concepts in the Harmony Course with automatic MIDI exercise feedback.")}
          </p>
          <Link
            href={cta?.href ?? "/curso-armonia"}
            className="inline-block px-6 py-3 rounded-xl ss-mono text-sm font-medium transition-all duration-300"
            style={{ background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", color: "#fff" }}
          >
            {cta?.label ?? (locale === "es" ? "Ir al Curso →" : "Go to Course →")}
          </Link>
        </div>
      </div>
    </div>
  );
}
