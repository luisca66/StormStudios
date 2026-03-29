import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPageContent } from "@/lib/mdx";
import DarkMDXRenderer from "@/components/DarkMDXRenderer";
import { DarkPageLayout } from "@/components/layout/DarkPageLayout";
import { Link } from "@/i18n/navigation";
import { type Locale } from "@/i18n/routing";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";

type Props = { params: Promise<{ locale: string }> };

const SLUG_MAP: Record<string, string> = { es: "clases-taller", en: "classes-workshop" };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const page = await getPageContent(locale, SLUG_MAP[locale] || SLUG_MAP["es"]);
  if (!page) return {};
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/clases-taller"),
    title:
      locale === "es"
        ? "Clases de Armonía, Entrenamiento Auditivo y Taller Musical"
        : "Harmony Classes, Ear Training and Music Workshop",
    description:
      locale === "es"
        ? "Conoce las modalidades de formación de Storm Studios Learning: clases presenciales, acompañamiento y herramientas digitales para armonía y entrenamiento auditivo."
        : "Explore Storm Studios Learning training options: in-person classes, guided study and digital tools for harmony and ear training.",
    keywords:
      locale === "es"
        ? ["clases de armonía", "entrenamiento auditivo", "taller musical", "clases de música ciudad de méxico"]
        : ["harmony classes", "ear training classes", "music workshop", "music lessons Mexico City"],
  });
}

export default async function ClasesTallerPage({ params }: Props) {
  const { locale } = await params;
  const page = await getPageContent(locale, SLUG_MAP[locale] || SLUG_MAP["es"]);
  if (!page) notFound();

  return (
    <DarkPageLayout>
      <h1 className="ss-serif ss-reveal mb-6"
        style={{ fontSize: "clamp(2rem,5vw,3rem)", color: "#f0eeff", lineHeight: 1.1 }}>
        {page.frontmatter.title}
      </h1>
      {page.frontmatter.description && (
        <p className="ss-mono ss-reveal mb-10"
          style={{ fontSize: "1.05rem", color: "rgba(240,238,255,0.5)", animationDelay: "0.1s" }}>
          {page.frontmatter.description}
        </p>
      )}
      <div className="ss-divider mb-10" />
      <DarkMDXRenderer content={page.content} />

      {/* CTA */}
      <div className="ss-glass rounded-2xl p-8 mt-14 text-center"
        style={{ border: "1px solid rgba(139,92,246,0.2)" }}>
        <p className="ss-serif mb-2" style={{ fontSize: "1.3rem", color: "#f0eeff" }}>
          {locale === "es" ? "¿Te interesa alguna modalidad?" : "Interested in any option?"}
        </p>
        <p className="ss-mono text-sm mb-6" style={{ color: "rgba(240,238,255,0.5)" }}>
          {locale === "es" ? "Escríbenos y encontramos el formato ideal para ti." : "Write to us and we'll find the ideal format for you."}
        </p>
        <Link href="/contacto"
          className="inline-block px-6 py-3 rounded-xl ss-mono text-sm font-medium"
          style={{ background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", color: "#fff" }}>
          {locale === "es" ? "Contactar →" : "Contact →"}
        </Link>
      </div>
    </DarkPageLayout>
  );
}
