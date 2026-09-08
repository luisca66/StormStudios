import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { DarkPageLayout } from "@/components/layout/DarkPageLayout";
import { Link } from "@/i18n/navigation";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({ locale: locale as Locale, urls: getLocalizedRouteUrls("/maestro-virtual"),
    title: locale === "es" ? "Cómo funciona el Maestro Virtual" : "How the Virtual Teacher works",
    description: locale === "es" ? "Revisión automática de ejercicios MIDI en las lecciones 1–3: escalas mayores, modos y escalas menores." : "Automatic MIDI exercise feedback in lessons 1–3: major scales, modes and minor scales." });
}
export default async function VirtualTeacherPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";
  return <DarkPageLayout><div className="blog-prose">
    <h1>{es ? "El Maestro Virtual" : "The Virtual Teacher"}</h1>
    <p>{es ? "Es una herramienta de práctica del Curso de Armonía de Luis Cárdenas. Comprueba tu archivo MIDI con reglas musicales programadas y señala qué revisar en tu ejercicio." : "A practice tool for Luis Cárdenas’s Harmony Course. It checks your MIDI file against programmed musical rules and identifies what to review in your exercise."}</p>
    <h2>{es ? "Qué puedes revisar hoy" : "What you can check today"}</h2>
    <ul><li>{es ? "Lección 1: escalas mayores." : "Lesson 1: major scales."}</li><li>{es ? "Lección 2: modos." : "Lesson 2: modes."}</li><li>{es ? "Lección 3: escalas menores." : "Lesson 3: minor scales."}</li></ul>
    <h2>{es ? "Cómo usarlo" : "How to use it"}</h2>
    <ol><li>{es ? "Lee las instrucciones de la lección y prepara el ejercicio indicado." : "Read the lesson instructions and prepare the specified exercise."}</li><li>{es ? "Exporta tu trabajo como MIDI y súbelo en el apartado Maestro Virtual de esa lección." : "Export your work as MIDI and upload it in that lesson’s Virtual Teacher section."}</li><li>{es ? "Revisa los errores señalados, corrige el archivo y vuelve a comprobarlo." : "Review the reported errors, correct the file and check it again."}</li></ol>
    <h2>{es ? "Alcance y límites" : "Scope and limitations"}</h2>
    <p>{es ? "La IA apoya el desarrollo del software. La revisión de cada ejercicio utiliza validadores deterministas, no una conversación con un modelo generativo. La puntuación refleja las reglas comprobadas; no es una evaluación completa de tu musicalidad ni garantiza que cualquier composición sea correcta. La validación de las futuras lecciones sigue en desarrollo." : "AI supports software development. Each exercise is checked by deterministic validators, not a conversation with a generative model. Scores reflect the rules checked; they are not a complete assessment of musicianship or a guarantee that any composition is correct. Validation for future lessons is still in development."}</p>
    <p><Link href="/curso-armonia">{es ? "Ir al curso y elegir una lección →" : "Go to the course and choose a lesson →"}</Link></p>
    <p><Link href="/privacidad">{es ? "Cómo se procesan tus archivos MIDI" : "How your MIDI files are processed"}</Link></p>
  </div></DarkPageLayout>;
}
