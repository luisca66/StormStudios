"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBlogPostSlug } from "@/data/seo/blog-post-translations";
import { getResourceBySlug } from "@/data/resources/resources-catalog";

type DynamicPathname =
  | "/apps/[slug]"
  | "/blog/[slug]"
  | "/curso-armonia/[slug]"
  | "/resources/[slug]";

function isDynamicPathname(pathname: string): pathname is DynamicPathname {
  return ["/apps/[slug]", "/blog/[slug]", "/curso-armonia/[slug]", "/resources/[slug]"].includes(pathname);
}

export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ slug?: string | string[] }>();
  const [isPending, startTransition] = useTransition();

  const handleSwitch = () => {
    const nextLocale: Locale = locale === "es" ? "en" : "es";
    const currentLocale = locale as Locale;
    const currentSlug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
    startTransition(() => {
      if (isDynamicPathname(pathname) && currentSlug) {
        let nextSlug = currentSlug;

        if (pathname === "/blog/[slug]") {
          nextSlug = getBlogPostSlug(currentLocale, currentSlug, nextLocale) ?? currentSlug;
        }

        if (pathname === "/resources/[slug]") {
          nextSlug = getResourceBySlug(currentLocale, currentSlug)?.slugs[nextLocale] ?? currentSlug;
        }

        router.replace({ pathname, params: { slug: nextSlug } }, { locale: nextLocale });
        return;
      }

      router.replace(pathname as Parameters<typeof router.replace>[0], { locale: nextLocale });
    });
  };

  return (
    <button
      onClick={handleSwitch}
      disabled={isPending}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
      aria-label={`${t("ariaLabel")} ${t("switch")}`}
    >
      <span className="text-xs font-bold text-gray-500">{t("current")}</span>
      <span className="text-gray-400">|</span>
      <span className="text-gray-700">{t("switch")}</span>
    </button>
  );
}
