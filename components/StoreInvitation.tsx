import { storeLinks } from "@/lib/store-links";

export default function StoreInvitation({ locale }: { locale: string }) {
  const app = storeLinks.apSuper;
  if (!app.enabled || (!app.playUrl && !app.appStoreUrl)) return null;
  const es = locale === "es";
  return (
    <section className="ss-glass ss-mono rounded-2xl p-6 my-6" style={{ border: "1px solid rgba(139,92,246,0.25)", color: "#f0eeff", background: "#14121d" }}>
      <h2 className="ss-serif text-xl mb-3">{es ? "Llévala en tu teléfono" : "Take it on your phone"}</h2>
      <p className="text-sm mb-4" style={{ color: "var(--ss-muted)", lineHeight: 1.8 }}>
        {es ? "AP Super es la versión para Android de este entrenamiento: funciona sin conexión, guarda tu progreso y está siempre en tu bolsillo. La web sigue siendo gratis." : "AP Super is the Android version of this training: it works offline, keeps your progress and is always in your pocket. The web version stays free."}
      </p>
      <div className="flex flex-wrap gap-3">
        {app.playUrl && <a href={app.playUrl} data-measure="store_click" data-destination="play:apsuper" className="inline-block rounded-lg px-4 py-3 underline" style={{ color: "#c4b5fd" }}>{es ? "Ver en Google Play" : "Get it on Google Play"}</a>}
        {app.appStoreUrl && <a href={app.appStoreUrl} data-measure="store_click" data-destination="appstore:apsuper" className="inline-block rounded-lg px-4 py-3 underline" style={{ color: "#c4b5fd" }}>{es ? "Ver en App Store" : "Get it on the App Store"}</a>}
      </div>
    </section>
  );
}
