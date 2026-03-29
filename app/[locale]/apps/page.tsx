import type { Metadata } from "next";
import { APPS } from "@/data/apps/apps-catalog";
import AppCard from "@/components/apps/AppCard";
import { type Locale } from "@/i18n/routing";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/apps"),
    title:
      locale === "es"
        ? "Apps de Entrenamiento Auditivo y Educación Musical"
        : "Ear Training Apps and Music Education Tools",
    description:
      locale === "es"
        ? "Explora apps gratis de entrenamiento auditivo, memoria musical, teoría y secuenciación dentro de Storm Studios Learning."
        : "Explore free ear training apps, music memory tools, theory practice and sequencing tools inside Storm Studios Learning.",
    keywords:
      locale === "es"
        ? ["apps de entrenamiento auditivo", "apps de teoría musical", "apps educativas musicales", "entrenamiento auditivo"]
        : ["ear training apps", "music education apps", "music theory apps", "interval training apps"],
  });
}

export default async function AppsPage({ params }: Props) {
  const { locale } = await params;
  const es = locale === "es";

  const androidApps = APPS.filter((a) => !a.isWeb);
  const webApps = APPS.filter((a) => a.isWeb);

  return (
    <div className="ss-root" style={{ minHeight: "100vh" }}>
      <div className="ss-orb ss-orb-a" aria-hidden />
      <div className="ss-orb ss-orb-b" aria-hidden />
      <div className="ss-orb ss-orb-c" aria-hidden />

      <div className="relative z-10" style={{ maxWidth: "1100px", margin: "0 auto", padding: "120px 24px 80px" }}>

        {/* Header */}
        <div className="text-center mb-16 ss-reveal">
          <span className="ss-mono text-xs uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-6"
            style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "rgba(52,211,153,0.9)" }}>
            {es ? "• Completamente gratuitas" : "• Completely free"}
          </span>
          <h1 className="ss-serif mb-4"
            style={{ fontSize: "clamp(2.5rem,6vw,4rem)", lineHeight: 1.05, color: "#f0eeff" }}>
            {es ? <>Apps de <span className="ss-text-gradient">Entrenamiento Auditivo</span></> : <>Ear Training <span className="ss-text-gradient">Apps</span></>}
          </h1>
          <p className="ss-mono" style={{ fontSize: "1rem", color: "rgba(240,238,255,0.5)", maxWidth: "520px", margin: "0 auto", lineHeight: 1.7 }}>
            {es
              ? "Herramientas gratis para entrenamiento auditivo, teoría musical, memoria y práctica musical dentro del ecosistema de Storm Studios Learning."
              : "Free tools for ear training, music theory, memory and practical musicianship inside the Storm Studios Learning ecosystem."}
          </p>
        </div>

        <div className="ss-divider mb-14" />

        {/* Apps Android */}
        <section className="mb-14">
          <h2 className="ss-serif mb-8 flex items-center gap-3"
            style={{ fontSize: "1.4rem", color: "#f0eeff" }}>
            <span>📱</span>
            {es ? "Apps para Android" : "Android Apps"}
            <span className="ss-mono text-xs px-2 py-0.5 rounded-full ml-2"
              style={{ background: "rgba(139,92,246,0.12)", color: "rgba(196,181,253,0.8)", border: "1px solid rgba(139,92,246,0.2)", fontSize: "0.7rem" }}>
              {androidApps.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {androidApps.map((app) => (
              <AppCard key={app.slug} app={app} locale={locale} />
            ))}
          </div>
        </section>

        {/* Apps Web */}
        {webApps.length > 0 && (
          <section className="mb-14">
            <h2 className="ss-serif mb-8 flex items-center gap-3"
              style={{ fontSize: "1.4rem", color: "#f0eeff" }}>
              <span>🌐</span>
              {es ? "Herramientas Web" : "Web Tools"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {webApps.map((app) => (
                <AppCard key={app.slug} app={app} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {/* Filosofía */}
        <div className="ss-glass rounded-2xl p-8 mt-4"
          style={{ border: "1px solid rgba(139,92,246,0.15)" }}>
          <p className="ss-serif mb-2" style={{ fontSize: "1.2rem", color: "#f0eeff" }}>
            {es ? "Herramientas profesionales. Acceso gratuito." : "Professional tools. Free access."}
          </p>
          <p className="ss-mono text-sm" style={{ color: "rgba(240,238,255,0.45)", lineHeight: 1.7 }}>
            {es
              ? "Siguiendo nuestro compromiso con la formación accesible, estas aplicaciones están disponibles completamente gratis — basadas en los principios del método, incluyendo entrenamiento multi-tímbrico."
              : "Following our commitment to accessible training, these apps are available completely free — based on the method's principles, including multi-timbral training."}
          </p>
        </div>

        <section className="mt-12">
          <div className="ss-glass rounded-2xl p-8" style={{ border: "1px solid rgba(59,130,246,0.15)" }}>
            <h2 className="ss-serif mb-3" style={{ fontSize: "1.4rem", color: "#f0eeff" }}>
              {es ? "Conecta estas apps con tu curso" : "Connect these apps with your course"}
            </h2>
            <p className="ss-mono text-sm mb-6" style={{ color: "rgba(240,238,255,0.5)", lineHeight: 1.7 }}>
              {es
                ? "Las apps rinden mejor cuando se combinan con el curso de armonía, el método y nuestras guías temáticas de estudio."
                : "The apps work best when combined with the harmony course, the method and our topic guides."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/curso-armonia" className="ss-mono text-sm px-5 py-3 rounded-xl" style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
                {es ? "Ver curso de armonia" : "See the harmony course"}
              </Link>
              <Link href="/resources" className="ss-mono text-sm px-5 py-3 rounded-xl" style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }}>
                {es ? "Explorar guias de estudio" : "Explore study guides"}
              </Link>
              <Link href="/mi-metodo" className="ss-mono text-sm px-5 py-3 rounded-xl" style={{ background: "rgba(16,185,129,0.15)", color: "#86efac", border: "1px solid rgba(16,185,129,0.3)" }}>
                {es ? "Leer sobre el metodo" : "Read about the method"}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
