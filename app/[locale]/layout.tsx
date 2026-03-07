import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const es = locale === "es";

  const title = "Storm Studios Learning";
  const description = es
    ? "Domina la Armonía Tradicional con el método Shostakovich. Curso gratuito, apps educativas y retroalimentación de IA."
    : "Master Traditional Harmony with the Shostakovich method. Free course, educational apps, and AI feedback.";

  return {
    metadataBase: new URL("https://storm-studios.vercel.app"),
    title: { default: title, template: `%s — ${title}` },
    description,
    keywords: es
      ? ["armonía", "música", "Shostakovich", "teoría musical", "SATB", "curso de armonía", "IA", "contrapunto"]
      : ["harmony", "music", "Shostakovich", "music theory", "SATB", "harmony course", "AI", "counterpoint"],
    authors: [{ name: "Luis Cárdenas", url: "https://www.stormstudios.com.mx" }],
    creator: "Storm Studios Learning",
    publisher: "Storm Studios Learning",
    openGraph: {
      type: "website",
      siteName: title,
      title,
      description,
      locale: es ? "es_MX" : "en_US",
      alternateLocale: es ? "en_US" : "es_MX",
      url: `https://www.stormstudios.com.mx/${locale}`,
      images: [{ url: "/images/og-default.jpg", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/images/og-default.jpg"],
      creator: "@StormStudiosLearning",
    },
    alternates: {
      canonical: `https://www.stormstudios.com.mx/${locale}`,
      languages: {
        "es-MX": "https://www.stormstudios.com.mx/es",
        "en-US": "https://www.stormstudios.com.mx/en",
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "es" | "en")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </NextIntlClientProvider>
  );
}
