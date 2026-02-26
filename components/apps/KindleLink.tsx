type Props = {
  url: string;
  locale: string;
};

export default function KindleLink({ url, locale }: Props) {
  const es = locale === "es";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors shadow-md"
    >
      {/* Book icon */}
      <svg
        className="w-5 h-5 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
      <div className="text-left">
        <p className="text-xs opacity-80 leading-none">
          {es ? "Manual del usuario" : "User manual"}
        </p>
        <p className="text-sm font-semibold leading-tight">Kindle / Amazon</p>
      </div>
    </a>
  );
}
