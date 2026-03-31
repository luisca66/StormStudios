import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { getPageContent } from "@/lib/mdx";
import DarkMDXRenderer from "@/components/DarkMDXRenderer";
import { DarkPageLayout } from "@/components/layout/DarkPageLayout";
import { type Locale } from "@/i18n/routing";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";

type Props = { params: Promise<{ locale: string }> };

const SLUG_MAP: Record<string, string> = { es: "mi-metodo", en: "my-method" };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const page = await getPageContent(locale, SLUG_MAP[locale] || SLUG_MAP["es"]);
  if (!page) return {};
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/mi-metodo"),
    title:
      locale === "es"
        ? "Método Integral para Armonía, Oído y Músicos"
        : "An Integral Method for Harmony, Ear Training and Musicianship",
    description:
      locale === "es"
        ? "Descubre el método de Storm Studios Learning: armonía tradicional, entrenamiento auditivo, cuerpo, memoria y enfoque musical integrados."
        : "Discover the Storm Studios Learning method: traditional harmony, ear training, body awareness, memory and musical focus in one integrated approach.",
    keywords:
      locale === "es"
        ? ["método de armonía", "entrenamiento auditivo", "teoría musical", "Storm Studios Learning"]
        : ["harmony method", "ear training method", "music theory", "Storm Studios Learning"],
  });
}

export default async function MiMetodoPage({ params }: Props) {
  const { locale } = await params;
  const page = await getPageContent(locale, SLUG_MAP[locale] || SLUG_MAP["es"]);
  if (!page) notFound();

  return (
    <DarkPageLayout maxWidth="960px">
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
      <div className="mb-10 flex justify-center">
        <Image src="/images/metodologia.png" alt="Diagrama del Camino de la Señal"
          width={700} height={400} priority
          className="rounded-xl w-full h-auto"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }} />
      </div>
      <DarkMDXRenderer content={page.content} />
    </DarkPageLayout>
  );
}
