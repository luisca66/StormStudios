import type { MetadataRoute } from "next";
import { getBlogPosts } from "@/lib/mdx";
import { getAllLessonSlugs } from "@/lib/course";
import { routing } from "@/i18n/routing";

const BASE_URL = "https://www.stormstudios.com.mx";
const LOCALES = routing.locales;
const STATIC_LAST_MODIFIED = process.env.VERCEL_GIT_COMMIT_DATE
  ? new Date(process.env.VERCEL_GIT_COMMIT_DATE)
  : new Date("2025-01-01T00:00:00.000Z");

const STATIC_ROUTES = [
  { route: "/", priority: 1.0, changeFrequency: "weekly" },
  { route: "/blog", priority: 0.9, changeFrequency: "weekly" },
  { route: "/curso-armonia", priority: 0.9, changeFrequency: "monthly" },
  { route: "/apps", priority: 0.8, changeFrequency: "monthly" },
  { route: "/el-libro", priority: 0.8, changeFrequency: "monthly" },
  { route: "/quien-soy", priority: 0.7, changeFrequency: "monthly" },
  { route: "/mi-metodo", priority: 0.7, changeFrequency: "monthly" },
  { route: "/clases-taller", priority: 0.7, changeFrequency: "monthly" },
  { route: "/contacto", priority: 0.6, changeFrequency: "yearly" },
] as const;

type KnownStaticRoute = (typeof STATIC_ROUTES)[number]["route"];

function getLocalizedPath(route: KnownStaticRoute, locale: (typeof LOCALES)[number]): string {
  const mapping = routing.pathnames[route];

  if (typeof mapping === "string") {
    return mapping;
  }

  return mapping[locale];
}

function buildLanguageAlternates(route: KnownStaticRoute): Record<string, string> {
  return Object.fromEntries(
    LOCALES.map((locale) => [locale === "es" ? "es-MX" : "en-US", `${BASE_URL}/${locale}${getLocalizedPath(route, locale)}`])
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // 1. Rutas estáticas por locale usando pathnames localizados
  for (const locale of LOCALES) {
    for (const route of STATIC_ROUTES) {
      const localizedPath = getLocalizedPath(route.route, locale);

      entries.push({
        url: `${BASE_URL}/${locale}${localizedPath}`,
        lastModified: STATIC_LAST_MODIFIED,
        changeFrequency: route.changeFrequency as MetadataRoute.Sitemap[number]["changeFrequency"],
        priority: route.priority,
        alternates: {
          languages: buildLanguageAlternates(route.route),
        },
      });
    }
  }

  // 2. Lecciones del curso con ruta localizada
  const lessonSlugs = getAllLessonSlugs();
  const lessonRoute = routing.pathnames["/curso-armonia/[slug]"];

  for (const locale of LOCALES) {
    for (const slug of lessonSlugs) {
      const localizedTemplate = typeof lessonRoute === "string" ? lessonRoute : lessonRoute[locale];
      const localizedPath = localizedTemplate.replace("[slug]", slug);

      entries.push({
        url: `${BASE_URL}/${locale}${localizedPath}`,
        lastModified: STATIC_LAST_MODIFIED,
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => {
              const template = typeof lessonRoute === "string" ? lessonRoute : lessonRoute[l];
              return [l === "es" ? "es-MX" : "en-US", `${BASE_URL}/${l}${template.replace("[slug]", slug)}`];
            })
          ),
        },
      });
    }
  }

  // 3. Posts del blog (usamos ES como fuente de verdad)
  const blogPosts = await getBlogPosts("es");
  const blogRoute = getLocalizedPath("/blog", "es");
  const blogRouteEn = getLocalizedPath("/blog", "en");

  for (const post of blogPosts) {
    entries.push({
      url: `${BASE_URL}/es${blogRoute}/${post.slug}`,
      lastModified: post.frontmatter.date ? new Date(post.frontmatter.date) : STATIC_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.75,
      alternates: {
        languages: {
          "es-MX": `${BASE_URL}/es${blogRoute}/${post.slug}`,
          "en-US": `${BASE_URL}/en${blogRouteEn}/${post.slug}`,
        },
      },
    });
  }

  return entries;
}
