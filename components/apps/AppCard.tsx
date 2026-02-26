import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { AppEntry } from "@/data/apps/apps-catalog";

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

export default function AppCard({ app, locale }: Props) {
  const name = app.name[locale as "es" | "en"] || app.name.es;
  const description = app.description[locale as "es" | "en"] || app.description.es;
  const categoryLabel = CATEGORY_LABELS[app.category]?.[locale] || app.category;

  return (
    <Link
      href={{ pathname: "/apps/[slug]", params: { slug: app.slug } }}
      className="group block ss-glass ss-card rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Ícono + info */}
      <div className="p-6 pb-4 flex items-start gap-4">
        <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
          {app.icon ? (
            <Image src={app.icon} alt={name} width={64} height={64} className="object-cover w-full h-full" />
          ) : (
            <span className="text-2xl">🎵</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            <span className="ss-mono text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(59,130,246,0.15)", color: "rgba(147,197,253,0.9)", border: "1px solid rgba(59,130,246,0.2)" }}>
              {categoryLabel}
            </span>
            {app.isWeb && (
              <span className="ss-mono text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(16,185,129,0.12)", color: "rgba(52,211,153,0.9)", border: "1px solid rgba(16,185,129,0.2)" }}>
                Web
              </span>
            )}
          </div>
          <h3 className="ss-mono text-sm font-medium leading-tight transition-colors duration-200"
            style={{ color: "#f0eeff" }}>
            {name}
          </h3>
        </div>
      </div>

      {/* Descripción */}
      <div className="px-6 pb-4">
        <p className="ss-mono text-xs leading-relaxed line-clamp-2"
          style={{ color: "rgba(240,238,255,0.45)" }}>
          {description}
        </p>
      </div>

      {/* Footer */}
      <div className="px-6 pb-5 flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {app.playStoreUrl && (
            <span className="ss-mono text-xs px-2 py-1 rounded-md flex items-center gap-1"
              style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(240,238,255,0.35)" }}>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 20.5v-17c0-.83 1-.98 1.4-.38l14.6 8.5c.4.23.4.87 0 1.1L4.4 20.88C4 21.48 3 21.33 3 20.5z" />
              </svg>
              Play
            </span>
          )}
          {app.kindleManualUrl && (
            <span className="ss-mono text-xs px-2 py-1 rounded-md"
              style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(240,238,255,0.35)" }}>
              📖 Kindle
            </span>
          )}
        </div>
        <span className="ss-mono text-xs" style={{ color: "rgba(139,92,246,0.7)" }}>→</span>
      </div>
    </Link>
  );
}
