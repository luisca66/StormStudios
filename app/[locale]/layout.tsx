import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { BASE_URL, SITE_NAME, TWITTER_HANDLE } from "@/lib/seo/page-alternates";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await params;

  return {
    metadataBase: new URL(BASE_URL),
    title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
    authors: [{ name: "Luis Cárdenas", url: BASE_URL }],
    creator: "Storm Studios Learning",
    publisher: "Storm Studios Learning",
    twitter: {
      creator: TWITTER_HANDLE,
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

  // Habilita el render estático (next-intl): debe llamarse antes de usar
  // cualquier API de next-intl como getMessages().
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable}>
      <body className="font-sans antialiased bg-white text-gray-900 flex flex-col min-h-screen">
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
