import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { APPS, getAppBySlug } from "@/data/apps/apps-catalog";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  return APPS.map((app) => ({ slug: app.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const app = getAppBySlug(slug);
  if (!app) return {};
  return {
    title: app.name[locale as "es" | "en"] || app.name.es,
    description: app.description[locale as "es" | "en"] || app.description.es,
  };
}

export default async function AppDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const app = getAppBySlug(slug);
  if (!app) notFound();

  const name = app.name[locale as "es" | "en"] || app.name.es;
  const description = app.description[locale as "es" | "en"] || app.description.es;
  const longDescription = app.longDescription?.[locale as "es" | "en"];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                🎮 {locale === "es" ? "Jugar en el navegador" : "Play in browser"}
              </Link>
            )}
            {app.apkUrl && (
              <a
                href={app.apkUrl}
                className="inline-flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium shadow-md"
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

      {/* Descripción larga */}
      {longDescription && (
        <div className="mt-12 prose prose-lg prose-gray max-w-none">
          <p>{longDescription}</p>
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
    </div>
  );
}
