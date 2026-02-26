"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const navLinks = [
  { key: "about", href: "/quien-soy" as const },
  { key: "method", href: "/mi-metodo" as const },
  { key: "classes", href: "/clases-taller" as const },
  { key: "course", href: "/curso-armonia" as const },
  { key: "apps", href: "/apps" as const },
  { key: "book", href: "/el-libro" as const },
  { key: "blog", href: "/blog" as const },
  { key: "contact", href: "/contacto" as const },
] as const;

export default function Navigation({ mobile = false }: { mobile?: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(mobile ? "flex flex-col gap-1" : "hidden md:flex items-center gap-1")}
    >
      {navLinks.map(({ key, href }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={key}
            href={href}
            className={cn(
              "px-3 py-2 text-sm font-medium rounded-md transition-colors",
              isActive
                ? "text-blue-600 bg-blue-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            {t(key as keyof typeof t)}
          </Link>
        );
      })}
    </nav>
  );
}
