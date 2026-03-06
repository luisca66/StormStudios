import { routing, type Locale } from "@/i18n/routing";

const BASE_URL = "https://www.stormstudios.com.mx";

type MainRoute =
  | "/"
  | "/quien-soy"
  | "/mi-metodo"
  | "/clases-taller"
  | "/curso-armonia"
  | "/contacto"
  | "/apps"
  | "/blog"
  | "/el-libro";

function getLocalizedPath(route: MainRoute, locale: Locale): string {
  const pathname = routing.pathnames[route];
  if (typeof pathname === "string") {
    return pathname;
  }

  return pathname[locale];
}

export function getMainPageAlternates(route: MainRoute, locale: Locale) {
  return {
    canonical: `${BASE_URL}/${locale}${getLocalizedPath(route, locale)}`,
    languages: {
      "es-MX": `${BASE_URL}/es${getLocalizedPath(route, "es")}`,
      "en-US": `${BASE_URL}/en${getLocalizedPath(route, "en")}`,
    },
  };
}
