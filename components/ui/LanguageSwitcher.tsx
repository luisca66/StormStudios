"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import type { Pathnames } from "@/i18n/routing";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const pathname = usePathname() as Pathnames;
  const [isPending, startTransition] = useTransition();

  const handleSwitch = () => {
    const nextLocale = locale === "es" ? "en" : "es";
    startTransition(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace(pathname as any, { locale: nextLocale });
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
