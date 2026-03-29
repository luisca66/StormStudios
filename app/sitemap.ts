import type { MetadataRoute } from "next";
import { APPS } from "@/data/apps/apps-catalog";
import { BLOG_POST_TRANSLATIONS } from "@/data/seo/blog-post-translations";
import { getAllResources, getResourceUrls } from "@/data/resources/resources-catalog";
import { getBlogPosts, getLessonContent, getPageContent, getBlogPost } from "@/lib/mdx";
import { getAllLessonSlugs } from "@/lib/course";
import { getLocalizedRouteUrls, BASE_URL } from "@/lib/seo/page-alternates";
import { routing, type Locale } from "@/i18n/routing";

const LOCALES = routing.locales;
const STATIC_LAST_MODIFIED = process.env.VERCEL_GIT_COMMIT_DATE
  ? new Date(process.env.VERCEL_GIT_COMMIT_DATE)
  : new Date("2026-03-29T00:00:00.000Z");

const STATIC_ROUTES = [
  { route: "/", priority: 1.0, changeFrequency: "weekly" },
  { route: "/blog", priority: 0.9, changeFrequency: "weekly" },
  { route: "/resources", priority: 0.88, changeFrequency: "weekly" },
  { route: "/curso-armonia", priority: 0.9, changeFrequency: "monthly" },
  { route: "/apps", priority: 0.8, changeFrequency: "monthly" },
  { route: "/el-libro", priority: 0.8, changeFrequency: "monthly" },
  { route: "/quien-soy", priority: 0.7, changeFrequency: "monthly" },
  { route: "/mi-metodo", priority: 0.7, changeFrequency: "monthly" },
  { route: "/clases-taller", priority: 0.7, changeFrequency: "monthly" },
  { route: "/contacto", priority: 0.6, changeFrequency: "yearly" },
] as const;

type KnownStaticRoute = (typeof STATIC_ROUTES)[number]["route"];
const CONTENT_PAGE_SLUGS: Partial<Record<KnownStaticRoute, Record<Locale, string>>> = {
  "/quien-soy": { es: "quien-soy", en: "about-me" },
  "/mi-metodo": { es: "mi-metodo", en: "my-method" },
  "/clases-taller": { es: "clases-taller", en: "classes-workshop" },
  "/el-libro": { es: "el-libro", en: "the-book" },
};

function buildLanguageAlternates(urls: Record<Locale, string>) {
  return {
    "es-MX": `${BASE_URL}${urls.es}`,
    "en-US": `${BASE_URL}${urls.en}`,
  };
}

function getMostRecentDate(dates: Array<Date | undefined>) {
  const validDates = dates.filter((date): date is Date => Boolean(date));
  if (validDates.length === 0) {
    return STATIC_LAST_MODIFIED;
  }

  return new Date(Math.max(...validDates.map((date) => date.getTime())));
}

async function getStaticRouteLastModified(route: KnownStaticRoute) {
  if (route === "/blog") {
    const posts = await Promise.all(LOCALES.map((locale) => getBlogPosts(locale)));
    return getMostRecentDate(posts.flat().map((post) => post.lastModified));
  }

  if (route === "/curso-armonia") {
    const lessons = await Promise.all(
      getAllLessonSlugs().flatMap((slug) => LOCALES.map((locale) => getLessonContent(locale, slug)))
    );
    return getMostRecentDate(lessons.map((lesson) => lesson?.lastModified));
  }

  const slugMap = CONTENT_PAGE_SLUGS[route];
  if (slugMap) {
    const pages = await Promise.all(
      LOCALES.map((locale) => getPageContent(locale, slugMap[locale]))
    );
    return getMostRecentDate(pages.map((page) => page?.lastModified));
  }

  return STATIC_LAST_MODIFIED;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // 1. Rutas estáticas por locale usando pathnames localizados
  for (const route of STATIC_ROUTES) {
    const urls = getLocalizedRouteUrls(route.route);
    const lastModified = await getStaticRouteLastModified(route.route);

    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}${urls[locale]}`,
        lastModified,
        changeFrequency: route.changeFrequency as MetadataRoute.Sitemap[number]["changeFrequency"],
        priority: route.priority,
        alternates: {
          languages: buildLanguageAlternates(urls),
        },
      });
    }
  }

  // 2. Lecciones del curso con ruta localizada
  const lessonSlugs = getAllLessonSlugs();

  for (const slug of lessonSlugs) {
    const urls = getLocalizedRouteUrls("/curso-armonia/[slug]", { slug });
    const lessonVariants = await Promise.all(LOCALES.map((locale) => getLessonContent(locale, slug)));
    const lastModified = getMostRecentDate(lessonVariants.map((lesson) => lesson?.lastModified));

    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}${urls[locale]}`,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: {
          languages: buildLanguageAlternates(urls),
        },
      });
    }
  }

  // 3. Detalles de apps indexables
  for (const app of APPS) {
    const urls = getLocalizedRouteUrls("/apps/[slug]", { slug: app.slug });

    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}${urls[locale]}`,
        lastModified: STATIC_LAST_MODIFIED,
        changeFrequency: "monthly",
        priority: 0.72,
        alternates: {
          languages: buildLanguageAlternates(urls),
        },
      });
    }
  }

  // 4. Posts del blog con slugs traducidos reales
  for (const translation of BLOG_POST_TRANSLATIONS) {
    const postEs = await getBlogPost("es", translation.slugs.es);
    const postEn = await getBlogPost("en", translation.slugs.en);
    const lastModified = getMostRecentDate([
      postEs?.lastModified,
      postEn?.lastModified,
      postEs?.frontmatter.date ? new Date(postEs.frontmatter.date) : undefined,
      postEn?.frontmatter.date ? new Date(postEn.frontmatter.date) : undefined,
    ]);

    const urls = {
      es: `/es/blog/${translation.slugs.es}`,
      en: `/en/blog/${translation.slugs.en}`,
    };

    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}${urls[locale]}`,
        lastModified,
        changeFrequency: "monthly",
        priority: 0.76,
        alternates: {
          languages: buildLanguageAlternates(urls),
        },
      });
    }
  }

  // 5. Guías temáticas indexables
  for (const resource of getAllResources()) {
    const urls = getResourceUrls(resource);

    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}${urls[locale]}`,
        lastModified: STATIC_LAST_MODIFIED,
        changeFrequency: "monthly",
        priority: 0.74,
        alternates: {
          languages: buildLanguageAlternates(urls),
        },
      });
    }
  }

  return entries;
}
