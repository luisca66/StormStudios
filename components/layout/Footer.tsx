import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Footer() {
  const locale = useLocale();
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Columna 1: Branding */}
          <div>
            <h2 className="text-white font-bold text-lg mb-3">
              Storm Studios Learning
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              {t("description")}
              <br />
              {t("location")}
            </p>
            <div className="mt-4 space-y-1 text-sm text-gray-400">
              <p><a href="tel:+525551031758" className="underline">55 5103 1758</a></p>
              <p><a href="mailto:info@stormstudios.com.mx" className="underline">info@stormstudios.com.mx</a></p>
            </div>
          </div>

          {/* Columna 2: Navegación */}
          <div>
            <h3 className="text-white font-semibold mb-3">
              {nav("home")}
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/quien-soy" className="hover:text-white transition-colors">{nav("about")}</Link>
              <Link href="/mi-metodo" className="hover:text-white transition-colors">{nav("method")}</Link>
              <Link href="/clases-taller" className="hover:text-white transition-colors">{nav("classes")}</Link>
              <Link href="/curso-armonia" className="hover:text-white transition-colors">{nav("course")}</Link>
              <Link href="/apps" className="hover:text-white transition-colors">{nav("apps")}</Link>
              <Link href="/resources" className="hover:text-white transition-colors">{nav("resources")}</Link>
              <Link href="/el-libro" className="hover:text-white transition-colors">{nav("book")}</Link>
            </nav>
          </div>

          {/* Columna 3: Legal */}
          <div>
            <h3 className="text-white font-semibold mb-3">
              {t("legal")}
            </h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/blog" className="hover:text-white transition-colors">{nav("blog")}</Link>
              <Link href="/contacto" className="hover:text-white transition-colors">{nav("contact")}</Link>
              <Link href="/privacidad" className="hover:text-white transition-colors">{t("privacy")}</Link>
              <a href="/catalog.json" className="hover:text-white transition-colors">{locale === "es" ? "Catálogo público (JSON)" : "Public catalog (JSON)"}</a>
            </nav>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-400">
          <p>
            © {currentYear} Storm Studios Learning. {t("rights")}.
          </p>
          <p>{t("madeWithLocation")} ♥ {t("location")}</p>
        </div>
      </div>
    </footer>
  );
}
