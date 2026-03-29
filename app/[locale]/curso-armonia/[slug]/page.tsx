import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllLessonSlugs, getLessonBySlug, getLessonNav } from "@/lib/course";
import { getLessonContent } from "@/lib/mdx";
import LessonLayout from "@/components/course/LessonLayout";
import { MDXRemote } from "next-mdx-remote/rsc";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams() {
  const slugs = getAllLessonSlugs();
  const locales = ["es", "en"];
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const lesson = getLessonBySlug(slug);
  if (!lesson) return {};

  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/curso-armonia/[slug]", { slug }),
    title: lesson.title[locale as "es" | "en"],
    description: lesson.description[locale as "es" | "en"],
    keywords: lesson.tags,
    image: locale === "es" ? "/og/course-es.jpg" : "/og/course-en.jpg",
  });
}

export default async function LessonPage({ params }: Props) {
  const { locale, slug } = await params;
  const lesson = getLessonBySlug(slug);
  if (!lesson) notFound();

  const { prev, next } = getLessonNav(slug);
  const mdxContent = await getLessonContent(locale, slug);

  return (
    <LessonLayout lesson={lesson} prev={prev} next={next} locale={locale}>
      {mdxContent
        ? <MDXRemote source={mdxContent.content} />
        : <LessonPlaceholder locale={locale} />}
    </LessonLayout>
  );
}

function LessonPlaceholder({ locale }: { locale: string }) {
  const es = locale === "es";
  return (
    <div className="ss-glass rounded-2xl p-8 text-center"
      style={{ border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.05)" }}>
      <div className="text-4xl mb-4">📝</div>
      <h2 className="ss-serif mb-3" style={{ fontSize: "1.2rem", color: "#f0eeff" }}>
        {es ? "Contenido próximamente" : "Content coming soon"}
      </h2>
      <p className="ss-mono text-sm" style={{ color: "rgba(240,238,255,0.45)", lineHeight: 1.6 }}>
        {es
          ? "El contenido detallado estará disponible pronto. Mientras tanto, revisa el ejercicio y las reglas activas."
          : "Detailed content will be available soon. In the meantime, review the exercise and active rules below."}
      </p>
    </div>
  );
}
