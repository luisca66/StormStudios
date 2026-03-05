"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const pathname = usePathname(); // e.g. /es/curso-armonia/02-leccion-1
  const [isPending, startTransition] = useTransition();

  const handleSwitch = () => {
    const nextLocale = locale === "es" ? "en" : "es";
    // Swap the locale prefix in the raw pathname
    const newPath = pathname.replace(`/${locale}`, `/${nextLocale}`);
    startTransition(() => {
      router.push(newPath);
    });
  };

  return (
    <button
      onClick={handleSwitch}
      disabled={isPending}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
      aria-label={`Switch to ${t("switch")}`}
    >
      <span className="text-xs font-bold text-gray-500">{t("current")}</span>
      <span className="text-gray-400">|</span>
      <span className="text-gray-700">{t("switch")}</span>
    </button>
  );
}
