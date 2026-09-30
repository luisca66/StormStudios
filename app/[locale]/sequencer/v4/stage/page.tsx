import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import StillStage from "@/components/sequencer/StillStage";

export const metadata = { title: "Storm Studios · Stills", robots: { index: false, follow: false } };
export default async function StagePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "es" && locale !== "en") notFound();
  setRequestLocale(locale);
  return <StillStage locale={locale} />;
}
