import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "es" ? "Elefantito Matemático – Jugar" : "Math Elephant – Play",
    description:
      locale === "es"
        ? "Entrena tu mente con aritmética cronometrada. Llena la repisa del elefantito antes de que se acabe el tiempo."
        : "Train your mind with timed arithmetic. Fill the elephant's shelf before time runs out.",
  };
}

export default async function JugarPage({ params }: Props) {
  const { locale } = await params;
  const es = locale === "es";

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <Link
          href={{ pathname: "/apps/[slug]", params: { slug: "matematicas-mentales" } }}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          ← {es ? "Volver a la app" : "Back to app"}
        </Link>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-semibold text-gray-700">
          {es ? "Elefantito Matemático" : "Math Elephant"}
        </span>
        <span className="ml-auto text-xs text-gray-400">
          {es ? "Tip: usa el teclado numérico" : "Tip: use your number keys"}
        </span>
      </div>

      {/* Game iframe */}
      <div className="flex-1 overflow-hidden bg-gray-900">
        <iframe
          src={`/apps/elefantito.html?lang=${locale}`}
          title={es ? "Elefantito Matemático" : "Math Elephant"}
          className="w-full border-0"
          style={{ height: "100%" }}
          allow="autoplay"
        />
      </div>
    </div>
  );
}
