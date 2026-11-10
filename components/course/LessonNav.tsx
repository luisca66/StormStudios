import { Link } from "@/i18n/navigation";
import { getLessonUrlSlug } from "@/lib/course";
import type { Locale } from "@/i18n/routing";
import type { LessonConfig } from "@/types/course";

type Props = {
  prev: LessonConfig | null;
  next: LessonConfig | null;
  locale: string;
};

const CARD_CLASS =
  "group flex w-full items-center gap-3 p-4 rounded-xl transition-colors ss-mono";
const CARD_STYLE = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(139,92,246,0.3)",
  color: "#f0eeff",
  textDecoration: "none",
} as const;

export default function LessonNav({ prev, next, locale }: Props) {
  const es = locale === "es";
  const currentLocale = locale as Locale;

  return (
    // En el teléfono las tarjetas se apilan: en una sola fila, «Siguiente»
    // quedaba fuera de la pantalla.
    <nav
      aria-label={es ? "Lección anterior y siguiente" : "Previous and next lesson"}
      className="flex flex-col sm:flex-row sm:items-stretch gap-3 sm:gap-4 pt-8 mt-8"
      style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex-1 min-w-0 flex">
        {prev ? (
          <Link
            href={{
              pathname: "/curso-armonia/[slug]",
              params: { slug: getLessonUrlSlug(prev, currentLocale) },
            }}
            className={`${CARD_CLASS} hover:border-violet-400`}
            style={CARD_STYLE}
          >
            <span aria-hidden className="text-2xl" style={{ color: "#a78bfa" }}>←</span>
            <span className="min-w-0">
              <span className="block text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--ss-muted)" }}>
                {es ? "Anterior" : "Previous"}
              </span>
              <span className="block text-sm font-semibold truncate">
                {prev.title[locale as "es" | "en"]}
              </span>
            </span>
          </Link>
        ) : null}
      </div>

      <div className="flex-1 min-w-0 flex">
        {next ? (
          <Link
            href={{
              pathname: "/curso-armonia/[slug]",
              params: { slug: getLessonUrlSlug(next, currentLocale) },
            }}
            className={`${CARD_CLASS} justify-end text-right hover:border-violet-400`}
            style={CARD_STYLE}
          >
            <span className="min-w-0">
              <span className="block text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--ss-muted)" }}>
                {es ? "Siguiente" : "Next"}
              </span>
              <span className="block text-sm font-semibold truncate">
                {next.title[locale as "es" | "en"]}
              </span>
            </span>
            <span aria-hidden className="text-2xl" style={{ color: "#a78bfa" }}>→</span>
          </Link>
        ) : (
          <div
            className="w-full p-4 rounded-xl text-center text-sm ss-mono"
            style={{ border: "1px dashed rgba(255,255,255,0.2)", color: "var(--ss-muted)" }}
          >
            {es ? "🎓 ¡Fin del contenido actual!" : "🎓 End of current content!"}
          </div>
        )}
      </div>
    </nav>
  );
}
