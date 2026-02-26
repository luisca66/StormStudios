type Props = {
  url: string;
  locale: string;
};

export default function DownloadBadge({ url, locale }: Props) {
  const es = locale === "es";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 px-5 py-3 bg-black hover:bg-gray-900 text-white rounded-xl transition-colors shadow-md"
    >
      {/* Google Play icon (simplified SVG) */}
      <svg
        className="w-6 h-6 flex-shrink-0"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M3.18 23.76c.37.2.8.24 1.2.1l11.53-6.65-2.54-2.55L3.18 23.76z" />
        <path d="M22.47 10.37c-.5-.3-4.87-2.81-5.9-3.4L13.37 10l3.21 3.21 5.89-3.4c.43-.25.7-.7.7-1.19 0-.49-.27-.94-.7-1.25z" />
        <path d="M2.01 1.13C1.72 1.4 1.56 1.82 1.56 2.38v19.24c0 .56.16.98.45 1.25l.07.06 10.78-10.78v-.25L2.08 1.07l-.07.06z" />
        <path d="M16.57 7.03l-3.2-3.2L1.84.18c-.4-.14-.83-.1-1.2.1l10.17 10.17 5.76-3.42z" />
      </svg>
      <div className="text-left">
        <p className="text-xs opacity-70 leading-none">
          {es ? "Disponible en" : "Get it on"}
        </p>
        <p className="text-sm font-semibold leading-tight">Google Play</p>
      </div>
    </a>
  );
}
