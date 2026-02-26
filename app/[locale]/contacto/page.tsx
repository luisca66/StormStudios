import type { Metadata } from "next";
import { DarkPageLayout } from "@/components/layout/DarkPageLayout";
import ContactForm from "@/components/ContactForm";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "es" ? "Contacto — Storm Studios Learning" : "Contact — Storm Studios Learning",
    description: locale === "es" ? "Contáctanos para clases, talleres o cualquier pregunta." : "Contact us for classes, workshops, or any question.",
  };
}

export default async function ContactoPage({ params }: Props) {
  const { locale } = await params;
  const es = locale === "es";

  return (
    <DarkPageLayout maxWidth="900px">
      <h1 className="ss-serif ss-reveal mb-4"
        style={{ fontSize: "clamp(2rem,5vw,3rem)", color: "#f0eeff", lineHeight: 1.1 }}>
        {es ? "Hablemos" : "Let's Talk"}
      </h1>
      <p className="ss-mono ss-reveal mb-10"
        style={{ fontSize: "1rem", color: "rgba(240,238,255,0.5)", animationDelay: "0.1s" }}>
        {es ? "Clases privadas, talleres grupales o cualquier pregunta sobre el método." : "Private lessons, group workshops, or any question about the method."}
      </p>
      <div className="ss-divider mb-12" />

      <div className="grid md:grid-cols-2 gap-12">
        {/* Info */}
        <div className="flex flex-col gap-6">
          <div className="ss-glass rounded-xl p-5 flex items-start gap-4"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <span style={{ fontSize: "1.4rem" }}>📍</span>
            <div>
              <p className="ss-mono text-sm font-medium" style={{ color: "#f0eeff" }}>Ciudad de México</p>
              <p className="ss-mono text-xs mt-1" style={{ color: "rgba(240,238,255,0.4)" }}>México</p>
            </div>
          </div>
          <div className="ss-glass rounded-xl p-5 flex items-start gap-4"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <span style={{ fontSize: "1.4rem" }}>📞</span>
            <div>
              <a href="tel:5551031758" className="ss-mono text-sm font-medium transition-colors"
                style={{ color: "#60a5fa" }}>
                55 5103 1758
              </a>
              <p className="ss-mono text-xs mt-1" style={{ color: "rgba(240,238,255,0.4)" }}>
                {es ? "Lunes–Viernes, 9am–7pm" : "Mon–Fri, 9am–7pm"}
              </p>
            </div>
          </div>
          <div className="ss-glass rounded-xl p-5 flex items-start gap-4"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            <span style={{ fontSize: "1.4rem" }}>✉️</span>
            <div>
              <a href="mailto:info@stormstudios.com.mx" className="ss-mono text-sm font-medium transition-colors break-all"
                style={{ color: "#60a5fa" }}>
                info@stormstudios.com.mx
              </a>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <ContactForm locale={locale} />
      </div>
    </DarkPageLayout>
  );
}
