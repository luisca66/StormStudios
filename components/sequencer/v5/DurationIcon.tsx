import type { Duration } from "@/lib/sequencer/types";

/** Fixed vector geometry keeps the flags together without relying on music fonts. */
export default function DurationIcon({ value }: { value: Duration }) {
  const flags = value === "8" ? 1 : value === "16" ? 2 : value === "32" ? 3 : 0;
  const hollow = value === "w" || value === "h";
  return <svg width="22" height="26" viewBox="0 0 22 28" fill="currentColor" aria-hidden="true">
    {value === "w"
      ? <ellipse cx="11" cy="19" rx="6" ry="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      : <>
        <ellipse cx="7" cy="22" rx="4" ry="2.8" transform="rotate(-20 7 22)" fill={hollow ? "none" : "currentColor"} stroke="currentColor" strokeWidth="1.5" />
        <path d="M10.5 21V3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        {Array.from({ length: flags }, (_, i) => <path key={i} transform={`translate(0 ${i * 4})`} d="M10.5 3C11 6 18 6 17 12C16.8 9 12.5 9 10.5 7Z" />)}
      </>}
  </svg>;
}
