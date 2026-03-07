import type { MetadataRoute } from "next";
import { getBlogPosts } from "@/lib/mdx";
import { getAllLessonSlugs } from "@/lib/course";

const BASE_URL = "https://www.stormstudios.com.mx";
const LOCALES = ["es", "en"] as const;

// Rutas estáticas del nav (sin locale prefix)
const STATIC_ROUTES = [
  { path: "",              priority: 1.0,  changeFrequency: "weekly"  },
  { path: "/blog",         priority: 0.9,  changeFrequency: "weekly"  },
  { path: "/curso-armonia",priority: 0.9,  changeFrequency: "monthly" },
  { path: "/apps",         priority: 0.8,  changeFrequency: "monthly" },
  { path: "/el-libro",     priority: 0.8,  changeFrequency: "monthly" },
  { path: "/quien-soy",    priority: 0.7,  changeFrequency: "monthly" },
  { path: "/mi-metodo",    priority: 0.7,  changeFrequency: "monthly" },
  { path: "/clases-taller",priority: 0.7,  changeFrequency: "monthly" },
  { path: "/contacto",     priority: 0.6,  changeFrequency: "yearly"  },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // 1. Rutas estáticas por locale
  for (const locale of LOCALES) {
    for (const route of STATIC_ROUTES) {
      entries.push({
        url: `${BASE_URL}/${locale}${route.path}`,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency as MetadataRoute.Sitemap[number]["changeFrequency"],
        priority: route.priority,
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => [l === "es" ? "es-MX" : "en-US", `${BASE_URL}/${l}${route.path}`])
          ),
        },
      });
    }
  }

  // 2. Lecciones del curso
  const lessonSlugs = getAllLessonSlugs();
  for (const locale of LOCALES) {
    for (const slug of lessonSlugs) {
      entries.push({
        url: `${BASE_URL}/${locale}/curso-armonia/${slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => [l === "es" ? "es-MX" : "en-US", `${BASE_URL}/${l}/curso-armonia/${slug}`])
          ),
        },
      });
    }
  }

  // 3. Posts del blog (usamos ES como fuente de verdad)
  const blogPosts = await getBlogPosts("es");
  for (const post of blogPosts) {
    entries.push({
      url: `${BASE_URL}/es/blog/${post.slug}`,
      lastModified: post.frontmatter.date ? new Date(post.frontmatter.date) : new Date(),
      changeFrequency: "monthly",
      priority: 0.75,
      alternates: {
        languages: {
          "es-MX": `${BASE_URL}/es/blog/${post.slug}`,
          "en-US": `${BASE_URL}/en/blog/${post.slug}`,
        },
      },
    });
  }

  return entries;
}
