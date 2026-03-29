import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { DarkPageLayout } from "@/components/layout/DarkPageLayout";
import { JsonLd } from "@/components/JsonLd";
import {
  getAllResources,
  getResourceBySlug,
  getResourceUrls,
} from "@/data/resources/resources-catalog";
import { createPageMetadata } from "@/lib/seo/page-alternates";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  const locales: Locale[] = ["es", "en"];

  return locales.flatMap((locale) =>
    getAllResources().map((resource) => ({
      locale,
      slug: resource.slugs[locale],
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const resource = getResourceBySlug(locale as Locale, slug);

  if (!resource) return {};

  return createPageMetadata({
    locale: locale as Locale,
    urls: getResourceUrls(resource),
    title: resource.metaTitle[locale as Locale],
    description: resource.metaDescription[locale as Locale],
    keywords:
      locale === "es"
        ? [resource.title.es, "Storm Studios Learning", "armonía", "entrenamiento auditivo"]
        : [resource.title.en, "Storm Studios Learning", "music theory", "ear training"],
  });
}

export default async function ResourcePage({ params }: Props) {
  const { locale, slug } = await params;
  const es = locale === "es";
  const resource = getResourceBySlug(locale as Locale, slug);

  if (!resource) {
    notFound();
  }

  return (
    <DarkPageLayout maxWidth="960px">
      <Link
        href="/resources"
        className="ss-mono text-sm inline-flex items-center gap-2 mb-8"
        style={{ color: "rgba(147,197,253,0.9)", textDecoration: "none" }}
      >
        ← {es ? "Volver a las guías" : "Back to guides"}
      </Link>

      <header className="mb-10">
        <span
          className="ss-mono text-xs uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-5"
          style={{
            background: "rgba(139,92,246,0.15)",
            border: "1px solid rgba(139,92,246,0.3)",
            color: "rgba(196,181,253,0.95)",
          }}
        >
          {es ? "Recurso SEO" : "SEO resource"}
        </span>
        <h1
          className="ss-serif mb-4"
          style={{ fontSize: "clamp(2.2rem,5vw,3.6rem)", color: "#f0eeff", lineHeight: 1.08 }}
        >
          {resource.title[locale as Locale]}
        </h1>
        <p className="ss-mono" style={{ color: "rgba(240,238,255,0.56)", lineHeight: 1.85 }}>
          {resource.intro[locale as Locale]}
        </p>
      </header>

      <div className="ss-divider mb-10" />

      <div className="flex flex-col gap-10">
        {resource.sections.map((section) => (
          <section key={section.title.en}>
            <h2 className="ss-serif mb-4" style={{ fontSize: "1.65rem", color: "#f0eeff", lineHeight: 1.2 }}>
              {section.title[locale as Locale]}
            </h2>
            <div className="flex flex-col gap-4">
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph.en}
                  className="ss-mono"
                  style={{ color: "rgba(240,238,255,0.56)", lineHeight: 1.9 }}
                >
                  {paragraph[locale as Locale]}
                </p>
              ))}
            </div>
            {section.bullets && (
              <ul className="mt-5 flex flex-col gap-3">
                {section.bullets.map((bullet) => (
                  <li
                    key={bullet.en}
                    className="ss-mono flex items-start gap-3"
                    style={{ color: "rgba(240,238,255,0.64)", lineHeight: 1.75 }}
                  >
                    <span style={{ color: "#93c5fd" }}>•</span>
                    <span>{bullet[locale as Locale]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="ss-glass rounded-2xl p-8 mt-12" style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
        <h2 className="ss-serif mb-3" style={{ fontSize: "1.45rem", color: "#f0eeff" }}>
          {resource.cta.title[locale as Locale]}
        </h2>
        <p className="ss-mono text-sm mb-6" style={{ color: "rgba(240,238,255,0.54)", lineHeight: 1.8 }}>
          {resource.cta.description[locale as Locale]}
        </p>
        <Link
          href={resource.cta.href}
          className="ss-mono text-sm px-5 py-3 rounded-xl inline-block"
          style={{ background: "rgba(16,185,129,0.15)", color: "#86efac", border: "1px solid rgba(16,185,129,0.3)", textDecoration: "none" }}
        >
          {resource.cta.label[locale as Locale]}
        </Link>
      </div>

      <section className="mt-12">
        <h2 className="ss-serif mb-4" style={{ fontSize: "1.45rem", color: "#f0eeff" }}>
          {es ? "Sigue explorando" : "Keep exploring"}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {resource.relatedLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="ss-glass ss-card rounded-2xl p-6"
              style={{ border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none" }}
            >
              <h3 className="ss-serif mb-2" style={{ fontSize: "1.2rem", color: "#f0eeff" }}>
                {link.label[locale as Locale]}
              </h3>
              <p className="ss-mono text-sm" style={{ color: "rgba(240,238,255,0.54)", lineHeight: 1.75 }}>
                {link.description[locale as Locale]}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: resource.title[locale as Locale],
          description: resource.metaDescription[locale as Locale],
          inLanguage: locale === "es" ? "es-MX" : "en-US",
          author: {
            "@type": "Organization",
            "@id": "https://www.stormstudios.com.mx/#organization",
            name: "Storm Studios Learning",
          },
          publisher: {
            "@type": "Organization",
            "@id": "https://www.stormstudios.com.mx/#organization",
            name: "Storm Studios Learning",
            logo: "https://www.stormstudios.com.mx/images/logo-storm.png",
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `https://www.stormstudios.com.mx${getResourceUrls(resource)[locale as Locale]}`,
          },
        }}
      />
    </DarkPageLayout>
  );
}
