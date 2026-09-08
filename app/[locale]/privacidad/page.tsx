import { getPageContent } from "@/lib/mdx";
import DarkMDXRenderer from "@/components/DarkMDXRenderer";
import { DarkPageLayout } from "@/components/layout/DarkPageLayout";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/privacidad"),
    title: locale === "es" ? "Politica de Privacidad" : "Privacy Policy",
    description:
      locale === "es"
        ? "Politica de privacidad de Storm Studios Learning y tratamiento basico de datos de contacto."
        : "Storm Studios Learning privacy policy and basic information about contact data handling.",
    noIndex: true,
  });
}

export default async function PrivacidadPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPageContent(locale, "privacy-notice");
  if (!page) return null;
  return <DarkPageLayout>
    <h1 className="ss-serif text-3xl mb-8">{page.frontmatter.title}</h1>
    <DarkMDXRenderer content={page.content} />
  </DarkPageLayout>;
}
