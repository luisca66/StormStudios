import type { Metadata } from "next";
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
  const es = locale === "es";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {es ? "Política de Privacidad" : "Privacy Policy"}
      </h1>
      <div className="prose prose-gray max-w-none">
        <p className="text-gray-600 mb-6">
          {es
            ? "Última actualización: febrero de 2026"
            : "Last updated: February 2026"}
        </p>
        <p>
          {es
            ? "Storm Studios Learning (stormstudios.com.mx) respeta tu privacidad. Esta política describe cómo recopilamos, usamos y protegemos tu información personal."
            : "Storm Studios Learning (stormstudios.com.mx) respects your privacy. This policy describes how we collect, use and protect your personal information."}
        </p>
        {/* TODO: Completar política de privacidad completa */}
        <p className="text-gray-500 mt-8 text-sm italic">
          {es
            ? "Política de privacidad completa próximamente."
            : "Full privacy policy coming soon."}
        </p>
      </div>
    </div>
  );
}
