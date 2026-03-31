import { Inter } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Root layout — Next.js 15 requiere <html> y <body> aquí.
 * Usamos getLocale() de next-intl para el atributo lang correcto.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={inter.variable}>
      <body className="font-sans antialiased bg-white text-gray-900 flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}
