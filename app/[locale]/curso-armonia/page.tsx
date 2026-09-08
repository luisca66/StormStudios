import ProgressBackup from "@/components/course/ProgressBackup";
import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { type Locale } from "@/i18n/routing";
import { JsonLd } from "@/components/JsonLd";
import { setRequestLocale } from "next-intl/server";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";
import { getLessonUrlSlug, getLessonsByModule } from "@/lib/course";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/curso-armonia"),
    title: locale === "es" ? "Curso de Armonía Tradicional Gratis" : "Free Traditional Harmony Course",
    description:
      locale === "es"
        ? "Curso gratuito de armonía tradicional con el linaje Shostakovich-Medrano-Cárdenas, ejercicios MIDI, conducción de voces y entrenamiento auditivo."
        : "Free traditional harmony course rooted in the Shostakovich-Medrano-Cardenas lineage, with MIDI exercises, voice leading and ear training.",
    keywords:
      locale === "es"
        ? ["curso de armonía", "curso de armonía gratis", "armonía tradicional", "conducción de voces", "entrenamiento auditivo"]
        : ["traditional harmony course", "free harmony lessons", "voice leading course", "ear training", "music theory course"],
    image: locale === "es" ? "/og/course-es.jpg" : "/og/course-en.jpg",
  });
}

const INTRO_LESSON = { slug: "00-introduccion", lessonNumber: null, title: { es: "Introducción al Curso", en: "Course Introduction" } };

const PROPEDEUTICO_LESSONS = [
  { slug: "p01-notas",        title: { es: "P01 – Escritura de las Notas Musicales",  en: "P01 – Writing Musical Notes" } },
  { slug: "p02-ritmica",      title: { es: "P02 – Escritura de la Rítmica Musical",   en: "P02 – Writing Musical Rhythm" } },
  { slug: "p03-intervalos",   title: { es: "P03 – Intervalos",                        en: "P03 – Intervals" } },
  { slug: "p04-secuenciador", title: { es: "P04 – Uso del Secuenciador",              en: "P04 – Using the Sequencer" } },
];

// Las lecciones principales se leen del curso (excluye ocultas automáticamente).

export default async function CursoArmoniaPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";
  const currentLocale = locale as Locale;
  const mainLessons = getLessonsByModule("triadas-satb");

  return (
    <div className="ss-root" style={{ minHeight: "100vh" }}>
      <div className="ss-orb ss-orb-a" aria-hidden />
      <div className="ss-orb ss-orb-b" aria-hidden />
      <div className="ss-orb ss-orb-c" aria-hidden />

      <div className="relative z-10" style={{ maxWidth: "860px", margin: "0 auto", padding: "120px 24px 80px" }}>

        {/* Badge */}
        <div className="flex justify-center mb-8 ss-reveal">
          <span className="ss-mono text-xs uppercase tracking-widest px-4 py-1.5 rounded-full"
            style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "rgba(52,211,153,0.9)" }}>
            {es ? "• Completamente gratuito" : "• Completely free"}
          </span>
        </div>

        {/* Hero */}
        <h1 className="ss-serif ss-reveal text-center mb-4"
          style={{ fontSize: "clamp(2.2rem,6vw,3.8rem)", lineHeight: 1.05, color: "#f0eeff" }}>
          {es
            ? <>{`Curso de `}<span className="ss-text-gradient">Armonía</span>{` Tradicional`}</>
            : <>{`Traditional `}<span className="ss-text-gradient">Harmony</span>{` Course`}</>}
        </h1>
        <p className="ss-mono ss-reveal text-center"
          style={{ fontSize: "1rem", color: "var(--ss-muted)", maxWidth: "560px", margin: "0 auto 3.5rem", lineHeight: 1.7, animationDelay: "0.1s" }}>
          {es
            ? "El Legado Shostakovich–Hernández Medrano, ahora accesible en línea con revisión automática de ejercicios MIDI."
            : "The Shostakovich–Hernández Medrano Legacy, now accessible online with automatic MIDI exercise feedback."}
        </p>

        {/* Retratos */}
        <div className="flex justify-center gap-10 mb-14 ss-reveal" style={{ animationDelay: "0.15s" }}>
          {[
            { src: "/images/shostakovich.jpg", name: "Dmitri Shostakovich" },
            { src: "/images/medrano.jpg",       name: "Humberto Hernández Medrano" },
          ].map((p) => (
            <div key={p.name} className="text-center">
              <div className="w-40 h-40 rounded-full overflow-hidden mx-auto mb-3 ss-glass flex items-center justify-center"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
                {p.src
                  ? <Image src={p.src} alt={p.name} width={160} height={160} className="object-cover w-full h-full" />
                  : <span style={{ fontSize: "2rem" }}>🎓</span>}
              </div>
              <p className="ss-mono text-xs" style={{ color: "var(--ss-muted)" }}>{p.name}</p>
            </div>
          ))}
        </div>

        <div className="ss-divider mb-12" />

        {/* Lista de lecciones */}
        <h2 className="ss-serif mb-6" style={{ fontSize: "1.5rem", color: "#f0eeff" }}>
          {es ? "Lecciones del Curso" : "Course Lessons"}
        </h2>
        <div className="flex flex-col gap-3">

          {/* Introducción */}
          <Link
            href={{ pathname: "/curso-armonia/[slug]", params: { slug: getLessonUrlSlug(INTRO_LESSON.slug, currentLocale) } }}
            className="ss-glass ss-card flex items-center gap-4 p-4 rounded-xl group"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center ss-mono text-sm font-bold flex-shrink-0"
              style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}>
              ·
            </div>
            <span className="ss-mono text-sm" style={{ color: "var(--ss-muted)" }}>
              {INTRO_LESSON.title[locale as "es" | "en"]}
            </span>
            <span className="ml-auto ss-mono text-sm" style={{ color: "var(--ss-violet-text)" }}>→</span>
          </Link>

          {/* Módulo Propedéutico — acordeón */}
          <details className="ss-glass rounded-xl group" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <summary className="flex items-center gap-4 p-4 cursor-pointer list-none select-none">
              <div className="w-10 h-10 rounded-full flex items-center justify-center ss-mono text-sm font-bold flex-shrink-0"
                style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}>
                ·
              </div>
              <span className="ss-mono text-sm flex-1" style={{ color: "var(--ss-muted)" }}>
                {es ? "Módulo Propedéutico" : "Preparatory Module"}
              </span>
              <span className="ss-mono text-xs" style={{ color: "var(--ss-violet-text)" }}>
                4 {es ? "lecciones" : "lessons"} ▾
              </span>
            </summary>
            <div className="flex flex-col gap-1 px-4 pb-3 pt-1">
              {PROPEDEUTICO_LESSONS.map((lesson) => (
                <Link
                  key={lesson.slug}
                  href={{ pathname: "/curso-armonia/[slug]", params: { slug: getLessonUrlSlug(lesson.slug, currentLocale) } }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                  style={{ color: "var(--ss-muted)" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "rgba(139,92,246,0.5)" }} />
                  <span className="ss-mono text-sm">{lesson.title[locale as "es" | "en"]}</span>
                  <span className="ml-auto ss-mono text-xs" style={{ color: "var(--ss-violet-text)" }}>→</span>
                </Link>
              ))}
            </div>
          </details>

          {/* Lecciones principales */}
          {mainLessons.map((lesson) => (
            <Link
              key={lesson.slug}
              href={{ pathname: "/curso-armonia/[slug]", params: { slug: getLessonUrlSlug(lesson, currentLocale) } }}
              className="ss-glass ss-card flex items-center gap-4 p-4 rounded-xl group"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center ss-mono text-sm font-bold flex-shrink-0"
                style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}>
                {lesson.lessonNumber ?? lesson.order}
              </div>
              <span className="ss-mono text-sm" style={{ color: "var(--ss-muted)" }}>
                {lesson.title[locale as "es" | "en"]}
              </span>
              {lesson.status === "construction" ? (
                <span className="ml-auto ss-mono text-xs" style={{ color: "rgba(245,158,11,0.85)" }}>
                  🚧 {es ? "En construcción" : "Under construction"}
                </span>
              ) : (
                <span className="ml-auto ss-mono text-sm" style={{ color: "var(--ss-violet-text)" }}>→</span>
              )}
            </Link>
          ))}

          <div className="rounded-xl p-4 text-center ss-mono text-sm"
            style={{ border: "1px dashed rgba(255,255,255,0.12)", color: "var(--ss-muted)" }}>
            {es ? "📚 El curso continúa en desarrollo. Nuevas lecciones se publicarán aquí." : "📚 The course is being developed. New lessons will be published here."}
          </div>
        </div>

        {/* CTA Secuenciador */}
        <div className="ss-glass rounded-2xl p-8 mt-12 flex flex-col sm:flex-row items-center gap-6"
          style={{ border: "1px solid rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.04)" }}>
          <div className="text-4xl flex-shrink-0">🎹</div>
          <div className="flex-1 text-center sm:text-left">
            <p className="ss-serif mb-1" style={{ fontSize: "1.2rem", color: "#f0eeff" }}>
              {es ? "Storm Sequencer v3.0" : "Storm Sequencer v3.0"}
            </p>
            <p className="ss-mono text-sm" style={{ color: "var(--ss-muted)", lineHeight: 1.6 }}>
              {es
                ? "Compón tus ejercicios directamente en el navegador, exporta MIDI y súbelo al Maestro Virtual para recibir retroalimentación."
                : "Compose your exercises directly in the browser, export MIDI and upload it to the Virtual Teacher for feedback."}
            </p>
          </div>
          <Link
            href="/sequencer"
            className="ss-mono text-sm px-6 py-3 rounded-xl flex-shrink-0 transition-all duration-300"
            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)", color: "rgba(52,211,153,0.95)" }}
          >
            {es ? "Abrir Secuenciador →" : "Open Sequencer →"}
          </Link>
        </div>

        <section className="mt-12">
          <div className="ss-glass rounded-2xl p-8" style={{ border: "1px solid rgba(59,130,246,0.15)" }}>
            <h2 className="ss-serif mb-3" style={{ fontSize: "1.35rem", color: "#f0eeff" }}>
              {es ? "Sigue estudiando por tema" : "Keep studying by topic"}
            </h2>
            <p className="ss-mono text-sm mb-6" style={{ color: "var(--ss-muted)", lineHeight: 1.7 }}>
              {es
                ? "Complementa el curso con guias sobre armonia tradicional, teoria musical, intervalos y entrenamiento auditivo."
                : "Complement the course with guides on traditional harmony, music theory, intervals and ear training."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/resources" className="ss-mono text-sm px-5 py-3 rounded-xl" style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }}>
                {es ? "Ver guias de estudio" : "View study guides"}
              </Link>
              <Link href="/apps" className="ss-mono text-sm px-5 py-3 rounded-xl" style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
                {es ? "Practicar con apps" : "Practice with apps"}
              </Link>
              <Link href="/blog" className="ss-mono text-sm px-5 py-3 rounded-xl" style={{ background: "rgba(16,185,129,0.15)", color: "#86efac", border: "1px solid rgba(16,185,129,0.3)" }}>
                {es ? "Leer articulos" : "Read articles"}
              </Link>
            </div>
          </div>
        </section>

      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6"><ProgressBackup locale={locale} /></div>
      {/* JSON-LD — Course */}
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Course",
        "name": es ? "Curso de Armonía Tradicional" : "Traditional Harmony Course",
        "description": es
          ? "Curso gratuito de armonía tradicional en desarrollo. Incluye introducción, propedéutico y lecciones 1–3, con validación automática de ejercicios MIDI en las lecciones 1–3."
          : "Free traditional harmony course in development. Includes an introduction, preparatory units and lessons 1–3, with automatic MIDI exercise checks in lessons 1–3.",
        "url": `https://www.stormstudios.com.mx${es ? "/es/curso-armonia" : "/en/harmony-course"}`,
        "provider": {
          "@type": "Organization",
          "@id": "https://www.stormstudios.com.mx/#organization",
          "name": "Storm Studios Learning"
        },
        "courseMode": "online",
        "isAccessibleForFree": true,
        "inLanguage": es ? "es-MX" : "en-US",
        "educationalLevel": "Beginner to Intermediate",
        "teaches": es
          ? ["Armonía tonal", "Conducción de voces", "Escritura SATB", "Análisis armónico"]
          : ["Tonal harmony", "Voice leading", "SATB writing", "Harmonic analysis"],
        "image": "https://www.stormstudios.com.mx/images/og-default.jpg"
      }} />
    </div>
  );
}
