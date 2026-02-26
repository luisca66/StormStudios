import { getBlogPosts } from "@/lib/mdx";
import { BlogCard } from "@/components/blog/BlogCard";

interface BlogPageProps {
  params: Promise<{ locale: string }>;
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale } = await params;
  const es = locale === "es";

  const posts = await getBlogPosts(locale);

  return (
    <div className="ss-root" style={{ minHeight: "100vh" }}>
      {/* Orbs */}
      <div className="ss-orb ss-orb-a" aria-hidden />
      <div className="ss-orb ss-orb-b" aria-hidden />
      <div className="ss-orb ss-orb-c" aria-hidden />

      <div
        className="relative z-10"
        style={{ maxWidth: "1100px", margin: "0 auto", padding: "120px 24px 80px" }}
      >
        {/* Header */}
        <div className="mb-16 ss-reveal">
          <span
            className="ss-mono text-xs uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-6"
            style={{
              background: "rgba(139,92,246,0.12)",
              border: "1px solid rgba(139,92,246,0.25)",
              color: "rgba(196,181,253,0.8)",
            }}
          >
            {es ? "• Artículos" : "• Articles"}
          </span>

          <h1
            className="ss-serif"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              lineHeight: 1.05,
              color: "#f0eeff",
              marginBottom: "1rem",
            }}
          >
            {es ? (
              <>
                Ideas sobre{" "}
                <span className="ss-text-gradient">Armonía</span>
              </>
            ) : (
              <>
                Ideas about{" "}
                <span className="ss-text-gradient">Harmony</span>
              </>
            )}
          </h1>

          <p
            className="ss-mono"
            style={{
              fontSize: "1.05rem",
              color: "rgba(240,238,255,0.5)",
              maxWidth: "560px",
              lineHeight: 1.7,
            }}
          >
            {es
              ? "Análisis, técnica y reflexiones sobre el método Shostakovich y la armonía tonal."
              : "Analysis, technique, and reflections on the Shostakovich method and tonal harmony."}
          </p>
        </div>

        <div className="ss-divider mb-14" />

        {/* Posts grid */}
        {posts.length === 0 ? (
          <div
            className="ss-glass rounded-2xl p-16 text-center"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="ss-serif mb-3" style={{ fontSize: "1.4rem", color: "#f0eeff" }}>
              {es ? "Próximamente" : "Coming Soon"}
            </p>
            <p className="ss-mono text-sm" style={{ color: "rgba(240,238,255,0.4)" }}>
              {es
                ? "Los artículos están en camino."
                : "Articles are on their way."}
            </p>
          </div>
        ) : (
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            }}
          >
            {posts.map((post) => (
              <BlogCard key={post.slug} post={post} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function generateMetadata({ params }: BlogPageProps) {
  return params.then(({ locale }) => ({
    title: locale === "es" ? "Blog — Storm Studios Learning" : "Blog — Storm Studios Learning",
    description:
      locale === "es"
        ? "Artículos sobre armonía, teoría musical y el método Shostakovich."
        : "Articles about harmony, music theory, and the Shostakovich method.",
  }));
}
