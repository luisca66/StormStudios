import ToneExample from "@/components/media/ToneExample";

const examples = {
  "traditional-harmony-course": {
    notes: [60, 64, 67], simultaneous: true,
    es: ["Escucha una tríada", "Do–Mi–Sol (C4–E4–G4)", "Escucha el acorde. Después intenta cantar sus tres notas por separado, empezando por la más grave.", "Do–Mi forma una tercera mayor y Mi–Sol una tercera menor. Juntas forman la tríada de Do mayor. Un error habitual es confundir el acorde completo con su nota más aguda: intenta seguir cada nota por separado."],
    en: ["Listen to a triad", "C4–E4–G4", "Listen to the chord, then try singing its three notes separately, starting with the lowest.", "C–E is a major third and E–G is a minor third. Together they form a C major triad. A common mistake is to confuse the whole chord with its highest note: try following each note separately."],
  },
  "ear-training-exercises": {
    notes: [60, 62, 64, 62, 60], simultaneous: false,
    es: ["Escucha, recuerda y reproduce", "Do–Re–Mi–Re–Do (C4–D4–E4–D4–C4)", "Escucha una vez sin cantar. Espera un momento e intenta reproducir la secuencia con la voz o tu instrumento. Repite el audio para comparar.", "La melodía sube dos pasos y regresa por las mismas notas. Si recuerdas solo el inicio, trabaja primero Do–Re–Mi y luego agrega el regreso. Comparar la dirección es un primer paso; después revisa las alturas."],
    en: ["Listen, remember and reproduce", "C4–D4–E4–D4–C4", "Listen once without singing. Pause, then reproduce the sequence with your voice or instrument. Replay the audio to compare.", "The melody rises two steps and returns through the same notes. If you only remember the start, work on C–D–E first, then add the return. Comparing direction is a first step; next check the pitches."],
  },
  "interval-recognition": {
    notes: [60, 67], simultaneous: false,
    es: ["Identifica una quinta", "Do–Sol (C4–G4), ascendente", "Escucha las dos notas y cántalas. Cuenta los nombres de nota desde Do hasta Sol, incluyendo los dos extremos.", "Do–Re–Mi–Fa–Sol da cinco nombres: una quinta. De Do a Sol hay siete semitonos, por eso es una quinta justa. Contar solo los espacios entre nombres produce el error de llamarla cuarta."],
    en: ["Identify a fifth", "C4–G4, ascending", "Listen to the two notes and sing them. Count the note names from C to G, including both endpoints.", "C–D–E–F–G gives five names: a fifth. C to G spans seven semitones, making it a perfect fifth. Counting only the gaps between names leads to the mistake of calling it a fourth."],
  },
  "music-theory-basics": {
    notes: [60, 62, 64, 65, 67, 69, 71, 72], simultaneous: false,
    es: ["Construye una escala mayor", "Do–Re–Mi–Fa–Sol–La–Si–Do", "Escucha la escala y localiza sus dos pasos de semitono. Comprueba la distancia entre notas en un teclado si tienes uno.", "Los semitonos están entre Mi–Fa y Si–Do. El patrón completo es tono–tono–semitono–tono–tono–tono–semitono. Un error habitual es suponer que todas las notas consecutivas están separadas por un tono."],
    en: ["Build a major scale", "C–D–E–F–G–A–B–C", "Listen to the scale and locate its two semitone steps. Check the distances on a keyboard if you have one.", "The semitones are E–F and B–C. The full pattern is tone–tone–semitone–tone–tone–tone–semitone. A common mistake is assuming all adjacent notes are a whole tone apart."],
  },
};

export default function PracticeExample({ resourceKey, locale }: { resourceKey: string; locale: string }) {
  const example = examples[resourceKey as keyof typeof examples];
  if (!example) return null;
  const es = locale === "es";
  const [title, notation, task, solution] = example[es ? "es" : "en"];
  return <section className="ss-glass rounded-xl p-6 mb-10">
    <h2 className="ss-serif text-2xl mb-4">{title}</h2>
    <p style={{ color: "var(--ss-muted)" }}>{task}</p>
    <ToneExample notes={example.notes} simultaneous={example.simultaneous} locale={locale} />
    <p className="mb-4" style={{ color: "var(--ss-muted)" }}>{es ? "Notas del ejemplo: " : "Example notes: "}{notation}</p>
    <details><summary className="cursor-pointer underline" style={{ color: "var(--ss-violet-text)" }}>{es ? "Revisar la explicación" : "Review the explanation"}</summary><p className="mt-4" style={{ color: "var(--ss-muted)", lineHeight: 1.8 }}>{solution}</p></details>
  </section>;
}
