import { Link } from "@/i18n/navigation";
import Navigation from "./Navigation";
import MobileMenu from "./MobileMenu";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg text-gray-900 hover:text-blue-600 transition-colors shrink-0"
          >
            <span>Storm Studios</span>
            <span className="text-blue-600">Learning</span>
          </Link>

          {/* Navegación desktop */}
          <Navigation />

          {/* Acciones derecha: idioma + menú móvil */}
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
