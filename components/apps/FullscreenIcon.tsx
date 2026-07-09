/** Ícono de pantalla completa: esquinas hacia afuera (entrar) o hacia adentro (salir). */
export function FullscreenIcon({ exit = false, size = 15 }: { exit?: boolean; size?: number }) {
  return exit ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3v3a2 2 0 0 1-2 2H4" />
      <path d="M20 9h-3a2 2 0 0 1-2-2V4" />
      <path d="M4 15h3a2 2 0 0 1 2 2v3" />
      <path d="M15 20v-3a2 2 0 0 1 2-2h3" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8V5a2 2 0 0 1 2-2h3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
    </svg>
  );
}
