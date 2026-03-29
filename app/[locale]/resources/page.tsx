import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { DarkPageLayout } from "@/components/layout/DarkPageLayout";
import { getAllResources } from "@/data/resources/resources-catalog";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/resources"),
    title:
      locale === "es"
        ? "Guías de Armonía, Entrenamiento Auditivo y Teoría Musical"
        : "Harmony, Ear Training and Music Theory Guides",
    description:
      locale === "es"
        ? "Explora guías temáticas sobre curso de armonía tradicional, entrenamiento auditivo, reconocimiento de intervalos y teoría musical."
        : "Explore topic guides on traditional harmony, ear training, interval recognition and music theory basics.",
    keywords:
      locale === "es"
        ? ["curso de armonía tradicional", "entrenamiento auditivo", "reconocimiento de intervalos", "teoría musical"]
        : ["traditional harmony course", "ear training exercises", "interval recognition", "music theory basics"],
  });
}

export default async function ResourcesIndexPage({ params }: Props) {
  const { locale } = await params;
  const es = locale === "es";
  const resources = getAllResources();

  return (
    <DarkPageLayout maxWidth="1100px">
      <div className="mb-10">
        <span
          className="ss-mono text-xs uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-5"
          style={{
            background: "rgba(59,130,246,0.15)",
            border: "1px solid rgba(59,130,246,0.3)",
            color: "rgba(147,197,253,0.95)",
          }}
        >
          {es ? "Guías de estudio" : "Study guides"}
        </span>
        <h1
          className="ss-serif mb-4"
          style={{ fontSize: "clamp(2.2rem,5vw,3.8rem)", color: "#f0eeff", lineHeight: 1.08 }}
        >
          {es ? "Armonía, oído y teoría musical" : "Harmony, ear training and music theory"}
        </h1>
        <p
          className="ss-mono"
          style={{ maxWidth: "720px", color: "rgba(240,238,255,0.56)", lineHeight: 1.8 }}
        >
          {es
            ? "Estas páginas resumen los temas que más suelen buscar los estudiantes y los conectan con el curso, las apps y el método de Storm Studios Learning."
            : "These pages summarize the topics students search for most often and connect them with the course, apps and method inside Storm Studios Learning."}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {resources.map((resource) => (
          <Link
            key={resource.key}
            href={{ pathname: "/resources/[slug]", params: { slug: resource.slugs[locale as Locale] } }}
            className="ss-glass ss-card rounded-2xl p-7"
            style={{ border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none" }}
          >
            <p
              className="ss-mono text-xs uppercase tracking-widest mb-4"
              style={{ color: "rgba(147,197,253,0.9)" }}
            >
              {es ? "Guía indexable" : "Indexable guide"}
            </p>
            <h2 className="ss-serif mb-3" style={{ fontSize: "1.55rem", color: "#f0eeff", lineHeight: 1.2 }}>
              {resource.title[locale as Locale]}
            </h2>
            <p className="ss-mono text-sm" style={{ color: "rgba(240,238,255,0.54)", lineHeight: 1.8 }}>
              {resource.metaDescription[locale as Locale]}
            </p>
            <span className="ss-mono text-sm mt-6 inline-block" style={{ color: "rgba(147,197,253,0.92)" }}>
              {es ? "Leer guía" : "Read guide"}
            </span>
          </Link>
        ))}
      </div>

      <div className="ss-glass rounded-2xl p-8 mt-12" style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
        <h2 className="ss-serif mb-3" style={{ fontSize: "1.4rem", color: "#f0eeff" }}>
          {es ? "Siguiente paso" : "Next step"}
        </h2>
        <p className="ss-mono text-sm mb-6" style={{ color: "rgba(240,238,255,0.52)", lineHeight: 1.8 }}>
          {es
            ? "Usa estas guías como puerta de entrada y después trabaja con las lecciones, las apps o el método completo."
            : "Use these guides as an entry point, then continue with the lessons, the apps or the full method."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/curso-armonia" className="ss-mono text-sm px-5 py-3 rounded-xl" style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
            {es ? "Ir al curso" : "Go to the course"}
          </Link>
          <Link href="/apps" className="ss-mono text-sm px-5 py-3 rounded-xl" style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }}>
            {es ? "Ver apps" : "See the apps"}
          </Link>
          <Link href="/blog" className="ss-mono text-sm px-5 py-3 rounded-xl" style={{ background: "rgba(16,185,129,0.15)", color: "#86efac", border: "1px solid rgba(16,185,129,0.3)" }}>
            {es ? "Leer blog" : "Read the blog"}
          </Link>
        </div>
      </div>
    </DarkPageLayout>
  );
}
