import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { AppEntry } from "@/data/apps/apps-catalog";
import DownloadBadge from "./DownloadBadge";
import KindleLink from "./KindleLink";

type Props = {
  app: AppEntry;
  locale: string;
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  "ear-training": { es: "Entrenamiento Auditivo", en: "Ear Training" },
  cognitive: { es: "Cognitivo", en: "Cognitive" },
  theory: { es: "Teoría Musical", en: "Music Theory" },
  sequencer: { es: "Secuenciador", en: "Sequencer" },
  other: { es: "Otro", en: "Other" },
};

export default function AppDetail({ app, locale }: Props) {
  const es = locale === "es";
  const name = app.name[locale as "es" | "en"] || app.name.es;
  const description =
    app.description[locale as "es" | "en"] || app.description.es;
  const longDescription = app.longDescription
    ? app.longDescription[locale as "es" | "en"] || app.longDescription.es
    : null;
  const categoryLabel = CATEGORY_LABELS[app.category]?.[locale] || app.category;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-8 flex items-center gap-2">
        <Link href="/" className="hover:text-blue-600 transition">
          {es ? "Inicio" : "Home"}
        </Link>
        <span>›</span>
        <Link href="/apps" className="hover:text-blue-600 transition">
          Apps
        </Link>
        <span>›</span>
        <span className="text-gray-700">{name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-6 mb-8">
        <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center shadow-md">
          {app.icon ? (
            <Image
              src={app.icon}
              alt={name}
              width={96}
              height={96}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-4xl">🎵</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {categoryLabel}
            </span>
            {app.isWeb && (
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Web
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{name}</h1>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>

      {/* Botones de descarga */}
      <div className="flex flex-wrap gap-3 mb-10">
        {app.playStoreUrl && (
          <DownloadBadge url={app.playStoreUrl} locale={locale} />
        )}
        {app.kindleManualUrl && (
          <KindleLink url={app.kindleManualUrl} locale={locale} />
        )}
        {app.webUrl && (
          <Link
            href={app.webUrl as Parameters<typeof Link>[0]["href"]}
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-md font-medium"
          >
            🌐 {es ? "Abrir en el navegador" : "Open in browser"}
          </Link>
        )}
      </div>

      {/* Descripción larga */}
      {longDescription && (
        <div className="prose prose-lg max-w-none mb-8 text-gray-700">
          <p>{longDescription}</p>
        </div>
      )}

      {/* Características */}
      {app.features && app.features.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {es ? "Características" : "Features"}
          </h2>
          <ul className="space-y-2">
            {app.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-blue-500 mt-0.5 flex-shrink-0">✓</span>
                {feature[locale as "es" | "en"] || feature.es}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Screenshots */}
      {app.screenshots && app.screenshots.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {es ? "Capturas de pantalla" : "Screenshots"}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {app.screenshots.map((src, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden bg-gray-100 aspect-[9/16]"
              >
                <Image
                  src={src}
                  alt={`${name} screenshot ${i + 1}`}
                  width={300}
                  height={533}
                  className="object-cover w-full h-full"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Volver al catálogo */}
      <div className="border-t border-gray-200 pt-8">
        <Link
          href="/apps"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition"
        >
          ← {es ? "Ver todas las apps" : "See all apps"}
        </Link>
      </div>
    </div>
  );
}
