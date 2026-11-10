import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { DarkPageLayout } from "@/components/layout/DarkPageLayout";
import { Link } from "@/i18n/navigation";
import { getLessonUrlSlug, getVirtualTeacherLessons } from "@/lib/course";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

/** "1, 2, 3, 4, 6, 7 y 8" a partir de las lecciones con revisión. */
function lessonNumberList(locale: Locale) {
  const numbers = getVirtualTeacherLessons(locale).map((lesson) => String(lesson.lessonNumber));
  if (numbers.length <= 1) return numbers.join("");
  return `${numbers.slice(0, -1).join(", ")} ${locale === "es" ? "y" : "and"} ${numbers.at(-1)}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale as Locale;
  return createPageMetadata({ locale: lang, urls: getLocalizedRouteUrls("/maestro-virtual"),
    title: lang === "es" ? "Cómo funciona el Maestro Virtual" : "How the Virtual Teacher works",
    description: lang === "es"
      ? `Revisión automática de ejercicios MIDI en las lecciones ${lessonNumberList(lang)} del Curso de Armonía: escalas, modos, acordes y escritura a cuatro voces.`
      : `Automatic MIDI exercise feedback in Harmony Course lessons ${lessonNumberList(lang)}: scales, modes, chords and four-part writing.` });
}

export default async function VirtualTeacherPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lang = locale as Locale;
  const es = lang === "es";
  const lessons = getVirtualTeacherLessons(lang);
  return <DarkPageLayout><div className="blog-prose">
    <h1>{es ? "El Maestro Virtual" : "The Virtual Teacher"}</h1>
    <p>{es ? "Es una herramienta de práctica del Curso de Armonía de Luis Cárdenas. Comprueba tu archivo MIDI con reglas musicales programadas y señala qué revisar en tu ejercicio." : "A practice tool for Luis Cárdenas’s Harmony Course. It checks your MIDI file against programmed musical rules and identifies what to review in your exercise."}</p>
    <h2>{es ? "Qué puedes revisar hoy" : "What you can check today"}</h2>
    <ul>
      {lessons.map((lesson) => (
        <li key={lesson.id}>
          <Link href={{ pathname: "/curso-armonia/[slug]", params: { slug: getLessonUrlSlug(lesson, lang) } }}>
            {lesson.title[lang]}
          </Link>
        </li>
      ))}
    </ul>
    <h2>{es ? "Cómo usarlo" : "How to use it"}</h2>
    <ol><li>{es ? "Lee las instrucciones de la lección y prepara el ejercicio indicado." : "Read the lesson instructions and prepare the specified exercise."}</li><li>{es ? "Exporta tu trabajo como MIDI y súbelo en el apartado Maestro Virtual de esa lección." : "Export your work as MIDI and upload it in that lesson’s Virtual Teacher section."}</li><li>{es ? "Revisa los errores señalados, corrige el archivo y vuelve a comprobarlo." : "Review the reported errors, correct the file and check it again."}</li></ol>
    <h2>{es ? "Alcance y límites" : "Scope and limitations"}</h2>
    <p>{es ? "La IA apoya el desarrollo del software. La revisión de cada ejercicio utiliza validadores deterministas, no una conversación con un modelo generativo. La puntuación refleja las reglas comprobadas; no es una evaluación completa de tu musicalidad ni garantiza que cualquier composición sea correcta. La validación de las futuras lecciones sigue en desarrollo." : "AI supports software development. Each exercise is checked by deterministic validators, not a conversation with a generative model. Scores reflect the rules checked; they are not a complete assessment of musicianship or a guarantee that any composition is correct. Validation for future lessons is still in development."}</p>
    <p><Link href="/curso-armonia">{es ? "Ir al curso y elegir una lección →" : "Go to the course and choose a lesson →"}</Link></p>
    <p><Link href="/privacidad">{es ? "Cómo se procesan tus archivos MIDI" : "How your MIDI files are processed"}</Link></p>
  </div></DarkPageLayout>;
}
