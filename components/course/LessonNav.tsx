import { Link } from "@/i18n/navigation";
import type { LessonConfig } from "@/types/course";

type Props = {
  prev: LessonConfig | null;
  next: LessonConfig | null;
  locale: string;
};

export default function LessonNav({ prev, next, locale }: Props) {
  const es = locale === "es";

  return (
    <nav className="flex items-center justify-between gap-4 pt-8 mt-8 border-t border-gray-200">
      {/* Anterior */}
      <div className="flex-1">
        {prev ? (
          <Link
            href={{
              pathname: "/curso-armonia/[slug]",
              params: { slug: prev.slug },
            }}
            className="group flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
          >
            <span className="text-2xl text-gray-400 group-hover:text-blue-500 transition">←</span>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                {es ? "Anterior" : "Previous"}
              </p>
              <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition truncate">
                {prev.title[locale as "es" | "en"]}
              </p>
            </div>
          </Link>
        ) : (
          <div />
        )}
      </div>

      {/* Siguiente */}
      <div className="flex-1 flex justify-end">
        {next ? (
          <Link
            href={{
              pathname: "/curso-armonia/[slug]",
              params: { slug: next.slug },
            }}
            className="group flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-right"
          >
            <div className="min-w-0">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                {es ? "Siguiente" : "Next"}
              </p>
              <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition truncate">
                {next.title[locale as "es" | "en"]}
              </p>
            </div>
            <span className="text-2xl text-gray-400 group-hover:text-blue-500 transition">→</span>
          </Link>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-sm text-gray-400">
            {es ? "🎓 ¡Fin del contenido actual!" : "🎓 End of current content!"}
          </div>
        )}
      </div>
    </nav>
  );
}
