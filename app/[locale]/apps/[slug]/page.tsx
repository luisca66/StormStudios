import { DarkPageLayout } from "@/components/layout/DarkPageLayout";
import { JsonLd } from "@/components/JsonLd";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { APPS, getAppBySlug } from "@/data/apps/apps-catalog";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";
import type { Locale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

// Slugs fuera de generateStaticParams caen en el 404 raíz prerenderizado. Con
// dynamicParams activo, notFound() en runtime devolvía un HTML vacío (auditoría P2-08).
export const dynamicParams = false;

export async function generateStaticParams() {
  return ["es", "en"].flatMap((locale) =>
    APPS.map((app) => ({ locale, slug: app.slug }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const app = getAppBySlug(slug);
  if (!app) return {};

  const appName = app.name[locale as "es" | "en"] || app.name.es;
  const appDescription = app.description[locale as "es" | "en"] || app.description.es;

  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/apps/[slug]", { slug }),
    title: appName,
    description: appDescription,
    keywords:
      locale === "es"
        ? [appName, "app musical", "entrenamiento auditivo", "educación musical"]
        : [appName, "music education app", "ear training app", "music practice tool"],
    image: `/og/apps/${locale}/${slug}`,
  });
}

export default async function AppDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const app = getAppBySlug(slug);
  if (!app) notFound();

  const name = app.name[locale as "es" | "en"] || app.name.es;
  const description = app.description[locale as "es" | "en"] || app.description.es;
  const longDescription = app.longDescription?.[locale as "es" | "en"];
  const longDescriptionParagraphs = longDescription
    ? longDescription.split(/\n\s*\n/).filter(Boolean)
    : [];
  const apkUrl = app.apkUrls?.[locale as "es" | "en"] || app.apkUrl;
  const gameLabel = app.gameLabel?.[locale as "es" | "en"] || (locale === "es" ? "Modo juego" : "Game mode");

  return (
    <DarkPageLayout maxWidth="1000px"><div className="ss-content">
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [{ "@type": "SoftwareApplication", "@id": `https://www.stormstudios.com.mx/${locale}/apps/${slug}#app`, name, description, applicationCategory: "EducationalApplication", operatingSystem: "Web browser", url: `https://www.stormstudios.com.mx/${locale}/apps/${slug}`, inLanguage: locale, author: { "@id": "https://www.stormstudios.com.mx/#luis-cardenas" }, ...(app.webUrl ? { isAccessibleForFree: true } : {}), offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, featureList: app.features?.map((feature) => feature[locale as "es" | "en"]) }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Apps", item: `https://www.stormstudios.com.mx/${locale}/apps` }, { "@type": "ListItem", position: 2, name, item: `https://www.stormstudios.com.mx/${locale}/apps/${slug}` }] }] }} />
      {/* Back link */}
      <Link
        href="/apps"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-8 transition-colors"
      >
        ← {locale === "es" ? "Todas las apps" : "All apps"}
      </Link>

      <div className="grid md:grid-cols-[200px_1fr] gap-10 items-start">
        {/* Ícono */}
        <div className="flex justify-center">
          <div className="w-40 h-40 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center shadow-md">
            {app.icon ? (
              <Image
                src={app.icon}
                alt={name}
                width={160}
                height={160}
                priority
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-5xl">🎵</span>
            )}
          </div>
        </div>

        {/* Info principal */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{name}</h1>
          <p className="text-lg text-gray-600 mb-6">{description}</p>

          {/* Botones de descarga */}
          <div className="flex flex-wrap gap-3">
            {app.webUrl && (
              <Link
                href={app.webUrl as Parameters<typeof Link>[0]["href"]}
                className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-md"
              >
                🎮 {app.isUtility
                  ? (locale === "es" ? "Abrir app" : "Open app")
                  : (locale === "es" ? "Abrir práctica" : "Open practice")}
              </Link>
            )}
            {app.gameUrl && (
              <Link
                href={app.gameUrl as Parameters<typeof Link>[0]["href"]}
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-800 to-blue-800 text-white rounded-xl hover:from-purple-700 hover:to-cyan-700 transition font-medium shadow-md"
              >
                🚀 {gameLabel}
              </Link>
            )}
            {app.appStoreUrl && (
              <a
                href={app.appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-measure="store_click"
                data-destination="appstore:apsuper"
                className="inline-flex items-center gap-2 px-5 py-3 bg-slate-800 border border-white/20 text-white rounded-xl hover:bg-slate-700 hover:border-white/35 transition font-medium shadow-md"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                {locale === "es" ? "Ver en App Store" : "Get it on the App Store"}
              </a>
            )}
            {apkUrl && (
              <a
                href={apkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 bg-green-800 text-white rounded-xl hover:bg-green-700 transition font-medium shadow-md"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 15.341l-1.86-1.055A6.95 6.95 0 0 0 17 11a7 7 0 0 0-7-7 7 7 0 0 0-7 7 7 7 0 0 0 7 7c1.657 0 3.179-.578 4.373-1.532l1.873 1.064A9 9 0 0 1 10 20a9 9 0 0 1-9-9 9 9 0 0 1 9-9 9 9 0 0 1 9 9 8.964 8.964 0 0 1-1.477 4.341zM14 11l-4 4-4-4h2.5V7h3v4H14z"/>
                </svg>
                {locale === "es" ? "Descargar para Android" : "Download for Android"}
              </a>
            )}
            {app.playStoreUrl && (
              <a
                href={app.playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 20.5v-17c0-.83 1-.98 1.4-.38l14.6 8.5c.4.23.4.87 0 1.1L4.4 20.88C4 21.48 3 21.33 3 20.5z" />
                </svg>
                {locale === "es" ? "Ver en Google Play" : "View on Google Play"}
              </a>
            )}
            {app.kindleManualUrl && (
              <a
                href={app.kindleManualUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
              >
                📖 {locale === "es" ? "Manual Kindle" : "Kindle Manual"}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="ss-glass rounded-xl p-5 mt-8"><h2 className="text-xl mb-3">{locale === "es" ? "Antes de empezar" : "Before you start"}</h2><p>{app.isUtility
        ? (locale === "es" ? "Es una herramienta de uso libre: ábrela cuando la necesites mientras estudias. Funciona en el navegador, en computadora y en teléfono, y recuerda tu configuración en este dispositivo." : "It is a free-use tool: open it whenever you need it while you practice. It runs in the browser on computers and phones, and remembers your settings on this device.")
        : (locale === "es" ? "Abre la práctica, lee sus instrucciones y comienza con una dificultad que puedas resolver. Activa el sonido desde la app y ajusta el volumen a un nivel cómodo." : "Open practice, read its instructions and start at a manageable difficulty. Enable sound within the app and set a comfortable volume.")}</p>{app.gameUrl && <p className="mt-3">{locale === "es" ? "La práctica y el modo juego son dos experiencias distintas: usa la primera para trabajar la habilidad y la segunda para aplicarla en el juego." : "Practice and game mode are separate experiences: use the first to work on the skill and the second to apply it in the game."}</p>}<p className="mt-3"><Link href="/privacidad" className="underline">{locale === "es" ? "Permisos y datos de las apps" : "App permissions and data"}</Link></p></div>
      {/* Descripción larga */}
      {longDescriptionParagraphs.length > 0 && (
        <div className="mt-12 prose prose-lg prose-gray max-w-none">
          {longDescriptionParagraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      )}

      {/* Features */}
      {app.features && app.features.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {locale === "es" ? "Características" : "Features"}
          </h2>
          <ul className="space-y-2">
            {app.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <span className="text-blue-500 mt-1">✓</span>
                {feature[locale as "es" | "en"] || feature.es}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div></DarkPageLayout>
  );
}
