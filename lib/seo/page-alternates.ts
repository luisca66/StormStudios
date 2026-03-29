import type { Metadata } from "next";
import { routing, type Locale, type Pathnames } from "@/i18n/routing";

export const BASE_URL = "https://www.stormstudios.com.mx";
export const SITE_NAME = "Storm Studios Learning";
export const DEFAULT_SOCIAL_IMAGE = "/images/og-default.jpg";
export const TWITTER_HANDLE = "@StormStudiosLearning";

export type LocalizedUrlMap = Record<Locale, string>;

type MetadataConfig = {
  locale: Locale;
  urls: LocalizedUrlMap;
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  imageAlt?: string;
  type?: "website" | "article" | "book" | "profile";
  noIndex?: boolean;
  xDefault?: string;
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  tags?: string[];
};

type RouteParams = Record<string, string>;

export type MainRoute =
  | "/"
  | "/quien-soy"
  | "/mi-metodo"
  | "/clases-taller"
  | "/curso-armonia"
  | "/contacto"
  | "/apps"
  | "/blog"
  | "/el-libro"
  | "/privacidad"
  | "/resources";

export function getAbsoluteUrl(pathname: string) {
  return new URL(pathname, BASE_URL).toString();
}

export function getLanguageCode(locale: Locale) {
  return locale === "es" ? "es-MX" : "en-US";
}

export function getOpenGraphLocale(locale: Locale) {
  return locale === "es" ? "es_MX" : "en_US";
}

export function getLocalizedPathname(
  route: Pathnames,
  locale: Locale,
  params?: RouteParams
) {
  const mapping = routing.pathnames[route];
  let pathname: string = typeof mapping === "string" ? mapping : mapping[locale];

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      pathname = pathname.replaceAll(`[${key}]`, value);
    }
  }

  return pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
}

export function getLocalizedRouteUrls(route: Pathnames, params?: RouteParams): LocalizedUrlMap {
  return {
    es: getLocalizedPathname(route, "es", params),
    en: getLocalizedPathname(route, "en", params),
  };
}

export function buildAlternates(
  urls: LocalizedUrlMap,
  locale: Locale,
  xDefault = urls.es
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: getAbsoluteUrl(urls[locale]),
    languages: {
      "es-MX": getAbsoluteUrl(urls.es),
      "en-US": getAbsoluteUrl(urls.en),
      "x-default": getAbsoluteUrl(xDefault),
    },
  };
}

export function createPageMetadata({
  locale,
  urls,
  title,
  description,
  keywords,
  image = DEFAULT_SOCIAL_IMAGE,
  imageAlt,
  type = "website",
  noIndex = false,
  xDefault,
  publishedTime,
  modifiedTime,
  authors,
  tags,
}: MetadataConfig): Metadata {
  const alternates = buildAlternates(urls, locale, xDefault);
  const canonicalUrl = getAbsoluteUrl(urls[locale]);
  const imageUrl = getAbsoluteUrl(image);
  const robots = noIndex
    ? {
        index: false,
        follow: true,
        googleBot: {
          index: false,
          follow: true,
          "max-image-preview": "large" as const,
          "max-snippet": -1,
        },
      }
    : {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large" as const,
          "max-snippet": -1,
        },
      };

  return {
    title,
    description,
    keywords,
    alternates,
    robots,
    openGraph: {
      type,
      url: canonicalUrl,
      siteName: SITE_NAME,
      title,
      description,
      locale: getOpenGraphLocale(locale),
      alternateLocale: locale === "es" ? "en_US" : "es_MX",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt ?? title,
        },
      ],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      ...(authors ? { authors } : {}),
      ...(tags ? { tags } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
      creator: TWITTER_HANDLE,
    },
  };
}

export function getMainPageAlternates(route: MainRoute, locale: Locale) {
  return buildAlternates(getLocalizedRouteUrls(route), locale, route === "/" ? "/es" : undefined);
}
