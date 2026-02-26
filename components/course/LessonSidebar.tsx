"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { getAllLessons, getCourseConfig } from "@/lib/course";
import type { LessonConfig } from "@/types/course";

type Props = {
  currentSlug: string;
  locale: string;
};

export default function LessonSidebar({ currentSlug, locale }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const lessons = getAllLessons();
  const course = getCourseConfig();
  const es = locale === "es";

  return (
    <>
      {/* Botón móvil para abrir el índice */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-40 bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-blue-700 transition"
        aria-label={es ? "Ver índice del curso" : "View course index"}
      >
        <span className="text-xl">☰</span>
      </button>

      {/* Overlay móvil */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 md:top-20 z-50 md:z-auto
          h-full md:h-auto md:max-h-[calc(100vh-5rem)]
          w-72 md:w-64
          bg-white border-r md:border border-gray-200 md:rounded-xl
          overflow-y-auto
          transition-transform md:transition-none
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          shadow-xl md:shadow-none
          flex-shrink-0
        `}
      >
        {/* Header del sidebar */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h2 className="font-bold text-sm text-gray-900 uppercase tracking-wide">
            {course.title[locale as "es" | "en"]}
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden text-gray-400 hover:text-gray-600 p-1"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Lista de lecciones por módulo */}
        <nav className="p-3">
          {course.modules.map((mod) => {
            const modLessons = lessons.filter((l) => l.module === mod.id);
            if (modLessons.length === 0) return null;
            return (
              <div key={mod.id} className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
                  {mod.title[locale as "es" | "en"]}
                </p>
                {modLessons.map((lesson) => (
                  <LessonLink
                    key={lesson.slug}
                    lesson={lesson}
                    locale={locale}
                    isActive={lesson.slug === currentSlug}
                    onNavigate={() => setIsOpen(false)}
                  />
                ))}
              </div>
            );
          })}

          {/* Próximas lecciones */}
          <div className="mt-2 px-2 py-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <p className="text-xs text-gray-400 text-center">
              {es
                ? "📚 Más lecciones próximamente"
                : "📚 More lessons coming soon"}
            </p>
          </div>
        </nav>
      </aside>
    </>
  );
}

function LessonLink({
  lesson,
  locale,
  isActive,
  onNavigate,
}: {
  lesson: LessonConfig;
  locale: string;
  isActive: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={{
        pathname: "/curso-armonia/[slug]",
        params: { slug: lesson.slug },
      }}
      onClick={onNavigate}
      className={`
        flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all
        ${
          isActive
            ? "bg-blue-50 text-blue-700 font-semibold"
            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        }
      `}
    >
      <span
        className={`
          w-6 h-6 rounded-full text-xs flex items-center justify-center flex-shrink-0 font-bold
          ${isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}
        `}
      >
        {lesson.order}
      </span>
      <span className="line-clamp-2">
        {lesson.title[locale as "es" | "en"]}
      </span>
    </Link>
  );
}
