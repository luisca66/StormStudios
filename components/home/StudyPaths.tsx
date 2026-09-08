import { Link } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export async function StudyPaths() {
  const es = (await getLocale()) === "es";
  const paths = [
    { href: "/curso-armonia" as const, title: es ? "Estoy empezando" : "I am starting out", text: es ? "Empieza por el propedéutico: notas, ritmo, intervalos y secuenciador. Después continúa con armonía." : "Start with the preparatory units: notes, rhythm, intervals and sequencer. Then continue with harmony." },
    { href: "/apps" as const, title: es ? "Quiero entrenar el oído" : "I want to train my ear", text: es ? "Elige una habilidad auditiva, practica con su app y prueba el modo juego cuando quieras aplicar lo trabajado." : "Choose a listening skill, practice with its app and try game mode to apply what you have practiced." },
    { href: "/resources" as const, title: es ? "Busco profundizar" : "I want to go deeper", text: es ? "Consulta las guías de armonía, teoría musical y entrenamiento auditivo para conectar conceptos con la práctica." : "Explore harmony, music theory and ear training guides to connect concepts with practice." },
  ];
  return <section className="relative z-10 max-w-6xl mx-auto px-6 py-10">
    <h2 className="ss-serif text-3xl mb-6">{es ? "Encuentra tu punto de partida" : "Find your starting point"}</h2>
    <div className="grid md:grid-cols-3 gap-5">{paths.map((path) => <Link key={path.href} href={path.href} className="ss-glass rounded-xl p-6">
      <h3 className="text-lg mb-3" style={{ color: "var(--ss-violet-text)" }}>{path.title} →</h3>
      <p style={{ color: "var(--ss-muted)", lineHeight: 1.7 }}>{path.text}</p>
    </Link>)}</div>
  </section>;
}
