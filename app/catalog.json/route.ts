import { APPS } from "@/data/apps/apps-catalog";
import { getAllLessons, getLessonUrlSlug } from "@/lib/course";
import { BASE_URL, getLocalizedPathname } from "@/lib/seo/page-alternates";
import { routing, type Pathnames } from "@/i18n/routing";

/** Public catalog only. Never imports the private knowledge base or learner data. */
export function GET() {
  return Response.json({
    version: 1,
    name: "Storm Studios Learning",
    url: BASE_URL,
    author: { name: "Luis Cárdenas", id: `${BASE_URL}/#luis-cardenas` },
    languages: routing.locales,
    purpose: { es: "Preservar y compartir conocimiento musical", en: "Preserve and share musical knowledge" },
    apps: APPS.map((app) => ({
      slug: app.slug, name: app.name, description: app.description,
      category: app.category, features: app.features,
      webAccess: app.webUrl ? "free" : undefined,
      urls: Object.fromEntries(routing.locales.map((locale) => [locale, {
        description: BASE_URL + getLocalizedPathname("/apps/[slug]", locale, { slug: app.slug }),
        practice: app.webUrl ? BASE_URL + getLocalizedPathname(app.webUrl as Pathnames, locale) : undefined,
        game: app.gameUrl ? BASE_URL + getLocalizedPathname(app.gameUrl as Pathnames, locale) : undefined,
      }])),
    })),
    course: {
      status: "in-development", webAccess: "free",
      virtualTeacher: "Rule-based MIDI feedback for lessons 1–3; not generative AI.",
      lessons: getAllLessons().filter((lesson) => lesson.status !== "construction").map((lesson) => ({
        id: lesson.slug, title: lesson.title,
        urls: Object.fromEntries(routing.locales.map((locale) => [locale,
          BASE_URL + getLocalizedPathname("/curso-armonia/[slug]", locale, { slug: getLessonUrlSlug(lesson, locale) }),
        ])),
      })),
    },
  }, { headers: { "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
