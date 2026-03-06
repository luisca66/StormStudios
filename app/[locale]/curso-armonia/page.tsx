import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { type Locale } from "@/i18n/routing";
import { JsonLd } from "@/components/JsonLd";
import { getMainPageAlternates } from "@/lib/seo/page-alternates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "es" ? "Curso de Armonía" : "Harmony Course",
    description: locale === "es"
      ? "Curso completo y gratuito de Armonía Tradicional con el método Shostakovich."
      : "Complete free Traditional Harmony course using the Shostakovich method.",
    alternates: getMainPageAlternates("/curso-armonia", locale as Locale),
  };
}

const CURRENT_LESSONS = [
  { slug: "00-introduccion", lessonNumber: null, title: { es: "Introducción al Curso", en: "Course Introduction" } },
  { slug: "01-propedeutico", lessonNumber: null, title: { es: "Módulo Propedéutico",   en: "Preparatory Module" } },
  { slug: "02-leccion-1",    lessonNumber: 1,    title: { es: "Lección 1",              en: "Lesson 1" } },
  { slug: "03-leccion-2",    lessonNumber: 2,    title: { es: "Lección 2",              en: "Lesson 2" } },
  { slug: "04-leccion-3",    lessonNumber: 3,    title: { es: "Lección 3",              en: "Lesson 3" } },
  { slug: "05-leccion-4",    lessonNumber: 4,    title: { es: "Lección 4",              en: "Lesson 4" } },
  { slug: "06-leccion-5",    lessonNumber: 5,    title: { es: "Lección 5",              en: "Lesson 5" } },
];

export default async function CursoArmoniaPage({ params }: Props) {
  const { locale } = await params;
  const es = locale === "es";

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
          style={{ fontSize: "1rem", color: "rgba(240,238,255,0.5)", maxWidth: "560px", margin: "0 auto 3.5rem", lineHeight: 1.7, animationDelay: "0.1s" }}>
          {es
            ? "El Legado Shostakovich–Hernández Medrano, ahora accesible en línea con retroalimentación de IA."
            : "The Shostakovich–Hernández Medrano Legacy, now accessible online with AI feedback."}
        </p>

        {/* Retratos */}
        <div className="flex justify-center gap-10 mb-14 ss-reveal" style={{ animationDelay: "0.15s" }}>
          {[
            { src: "/images/shostakovich.jpg", name: "Dmitri Shostakovich" },
            { src: "/images/medrano.jpg",         name: "Humberto Hernández Medrano" },
          ].map((p) => (
            <div key={p.name} className="text-center">
              <div className="w-40 h-40 rounded-full overflow-hidden mx-auto mb-3 ss-glass flex items-center justify-center"
                style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
                {p.src
                  ? <Image src={p.src} alt={p.name} width={160} height={160} className="object-cover w-full h-full" />
                  : <span style={{ fontSize: "2rem" }}>🎓</span>}
              </div>
              <p className="ss-mono text-xs" style={{ color: "rgba(240,238,255,0.5)" }}>{p.name}</p>
            </div>
          ))}
        </div>

        <div className="ss-divider mb-12" />

        {/* Lista de lecciones */}
        <h2 className="ss-serif mb-6" style={{ fontSize: "1.5rem", color: "#f0eeff" }}>
          {es ? "Lecciones del Curso" : "Course Lessons"}
        </h2>
        <div className="flex flex-col gap-3">
          {CURRENT_LESSONS.map((lesson) => (
            <Link
              key={lesson.slug}
              href={{ pathname: "/curso-armonia/[slug]", params: { slug: lesson.slug } }}
              className="ss-glass ss-card flex items-center gap-4 p-4 rounded-xl group"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center ss-mono text-sm font-bold flex-shrink-0"
                style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}>
                {lesson.lessonNumber ?? "·"}
              </div>
              <span className="ss-mono text-sm" style={{ color: "rgba(240,238,255,0.8)" }}>
                {lesson.title[locale as "es" | "en"] || lesson.title.es}
              </span>
              <span className="ml-auto ss-mono text-sm" style={{ color: "rgba(139,92,246,0.7)" }}>→</span>
            </Link>
          ))}
          <div className="rounded-xl p-4 text-center ss-mono text-sm"
            style={{ border: "1px dashed rgba(255,255,255,0.12)", color: "rgba(240,238,255,0.3)" }}>
            {es ? "📚 Más lecciones próximamente (hasta 60 en total)" : "📚 More lessons coming soon (up to 60 total)"}
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
            <p className="ss-mono text-sm" style={{ color: "rgba(240,238,255,0.45)", lineHeight: 1.6 }}>
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

      </div>

      {/* JSON-LD — Course */}
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Course",
        "name": es ? "Curso de Armonía Tradicional" : "Traditional Harmony Course",
        "description": es
          ? "Curso completo y gratuito de Armonía Tradicional con el método Shostakovich. Incluye Maestro Virtual con IA para corrección de ejercicios MIDI."
          : "Complete free Traditional Harmony course using the Shostakovich method. Includes AI-powered Virtual Teacher for MIDI exercise feedback.",
        "url": `https://www.stormstudios.com.mx/${es ? "es" : "en"}/curso-armonia`,
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
