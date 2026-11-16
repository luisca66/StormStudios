import { storeLinks } from "@/lib/store-links";

export default function StoreInvitation({ locale }: { locale: string }) {
  const app = storeLinks.apSuper;
  if (!app.enabled || (!app.playUrl && !app.appStoreUrl)) return null;
  const es = locale === "es";
  return (
    <section className="ss-glass ss-mono rounded-2xl p-6 my-6" style={{ border: "1px solid rgba(139,92,246,0.25)", color: "#f0eeff", background: "#14121d" }}>
      <h2 className="ss-serif text-xl mb-3">{es ? "AP Super ya está en App Store" : "AP Super is now on the App Store"}</h2>
      <p className="text-sm mb-4" style={{ color: "var(--ss-muted)", lineHeight: 1.8 }}>
        {es ? "Lleva tu entrenamiento de oído absoluto al iPhone con AP Super: 147 niveles, seis timbres y progreso guardado en tu dispositivo. Funciona sin conexión y es de pago único, sin suscripciones. Requiere iOS 17 o posterior. La versión web sigue siendo gratis." : "Take your pitch recognition practice to iPhone with AP Super: 147 levels, six timbres and progress saved on your device. It works offline with a one-time purchase and no subscription. Requires iOS 17 or later. The web version stays free."}
      </p>
      <div className="flex flex-wrap gap-3">
        {app.playUrl && <a href={app.playUrl} data-measure="store_click" data-destination="play:apsuper" className="inline-block rounded-lg px-4 py-3 underline" style={{ color: "#c4b5fd" }}>{es ? "Ver en Google Play" : "Get it on Google Play"}</a>}
        {app.appStoreUrl && <a href={app.appStoreUrl} data-measure="store_click" data-destination="appstore:apsuper" className="inline-block rounded-lg px-4 py-3 underline" style={{ color: "#c4b5fd" }}>{es ? "Ver en App Store" : "Get it on the App Store"}</a>}
      </div>
    </section>
  );
}
