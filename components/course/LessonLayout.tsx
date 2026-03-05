import type { LessonConfig } from "@/types/course";
import LessonNav from "./LessonNav";
import LessonSidebar from "./LessonSidebar";
import RulesReference from "./RulesReference";
import ProgressTracker from "./ProgressTracker";
import ExerciseUpload from "./ExerciseUpload";
import { getCourseConfig } from "@/lib/course";
import { Link } from "@/i18n/navigation";

type Props = {
  lesson: LessonConfig;
  prev: LessonConfig | null;
  next: LessonConfig | null;
  locale: string;
  children: React.ReactNode;
};

export default function LessonLayout({ lesson, prev, next, locale, children }: Props) {
  const es = locale === "es";
  const course = getCourseConfig();

  return (
    <div className="ss-root" style={{ minHeight: "100vh" }}>
      <div className="ss-orb ss-orb-a" aria-hidden />
      <div className="ss-orb ss-orb-b" aria-hidden />

      {/* Breadcrumb */}
      <div className="relative z-10 px-4 pt-20 pb-0">
        <div className="max-w-7xl mx-auto flex items-center gap-2 ss-mono text-xs"
          style={{ color: "rgba(240,238,255,0.35)" }}>
          <Link href="/" className="transition-colors hover:text-violet-400">{es ? "Inicio" : "Home"}</Link>
          <span>›</span>
          <Link href="/curso-armonia" className="transition-colors hover:text-violet-400">
            {course.title[locale as "es" | "en"]}
          </Link>
          <span>›</span>
          <span style={{ color: "rgba(240,238,255,0.6)" }} className="truncate max-w-xs">
            {lesson.title[locale as "es" | "en"]}
          </span>
        </div>
      </div>

      {/* Layout principal */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <LessonSidebar currentSlug={lesson.slug} locale={locale} />

        {/* Contenido */}
        <article className="flex-1 min-w-0" style={{ maxWidth: "780px" }}>
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center ss-mono text-sm font-bold flex-shrink-0"
                style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
                {lesson.lessonNumber ?? lesson.order}
              </div>
              <p className="ss-mono text-xs uppercase tracking-widest"
                style={{ color: "rgba(139,92,246,0.8)" }}>
                {es ? "Lección" : "Lesson"} {lesson.lessonNumber ?? lesson.order}
              </p>
              {lesson.estimatedMinutes && (
                <span className="ss-mono text-xs ml-auto" style={{ color: "rgba(240,238,255,0.3)" }}>
                  ⏱ ~{lesson.estimatedMinutes} min
                </span>
              )}
            </div>
            <h1 className="ss-serif mb-3"
              style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", color: "#f0eeff", lineHeight: 1.1 }}>
              {lesson.title[locale as "es" | "en"]}
            </h1>
            <p className="ss-mono" style={{ fontSize: "1rem", color: "rgba(240,238,255,0.5)", lineHeight: 1.65 }}>
              {lesson.description[locale as "es" | "en"]}
            </p>
          </header>

          <div className="ss-divider mb-8" />

          {/* Videos de la lección */}
          {lesson.videos && lesson.videos.length > 0 && (
            <div className="mb-10">
              {lesson.videos.map((video) => (
                <div key={video.youtubeId} className="mb-6">
                  <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(139,92,246,0.2)" }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${locale === "en" && video.youtubeIdEn ? video.youtubeIdEn : video.youtubeId}`}
                      title={video.title?.[locale as "es" | "en"] ?? "Video"}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MDX content */}
          <div className="blog-prose">{children}</div>

          {/* Reglas activas */}
          {lesson.activeRules.length > 0 && (
            <RulesReference activeRuleIds={lesson.activeRules} locale={locale} />
          )}

          {/* Ejercicio MIDI */}
          {lesson.exercise && (
            <ExerciseUpload lessonId={lesson.id} locale={locale} />
          )}

          {/* Progreso */}
          <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <ProgressTracker lessonSlug={lesson.slug} locale={locale} />
          </div>

          {/* Acceso rápido al Secuenciador */}
          <div className="ss-glass rounded-xl p-4 mt-6 flex items-center gap-4"
            style={{ border: "1px solid rgba(16,185,129,0.18)" }}>
            <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>🎹</span>
            <div className="flex-1 min-w-0">
              <p className="ss-mono text-xs font-medium" style={{ color: "#f0eeff" }}>
                Storm Sequencer v3.0
              </p>
              <p className="ss-mono text-xs" style={{ color: "rgba(240,238,255,0.4)" }}>
                {es ? "Compón y exporta MIDI para el Maestro Virtual" : "Compose and export MIDI for the Virtual Teacher"}
              </p>
            </div>
            <Link
              href="/sequencer"
              className="ss-mono text-xs px-4 py-2 rounded-lg flex-shrink-0"
              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "rgba(52,211,153,0.9)" }}
            >
              {es ? "Abrir →" : "Open →"}
            </Link>
          </div>

          {/* Navegación prev/next */}
          <LessonNav prev={prev} next={next} locale={locale} />
        </article>
      </div>
    </div>
  );
}
