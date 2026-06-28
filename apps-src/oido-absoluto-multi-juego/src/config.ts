// ============================================================================
// Asset configuration
// ----------------------------------------------------------------------------
// All game audio (background music + note samples + SFX) is loaded relative to
// ASSET_BASE. By default it points at the bundled files under public/assets, so
// local dev keeps working with no setup.
//
// To serve the audio from Cloudflare R2 instead, set VITE_ASSET_BASE at build
// time (e.g. in a .env file or the deploy environment):
//
//   VITE_ASSET_BASE=https://<your-r2-public-host>/music/oido-absoluto-multi
//
// The code then requests:
//   ${ASSET_BASE}/nivel-1/jazz-01.mp3
//   ${ASSET_BASE}/samples/Piano/C3.mp3
//   ${ASSET_BASE}/samples/acierto.mp3
//
// So ASSET_BASE must directly contain `nivel-1/`…`nivel-5/` and `samples/`,
// matching both public/assets locally and storm-samples/music/oido-absoluto-multi
// on R2. (This is the single place to adjust if the layout ever changes.)
// ============================================================================

const strip = (s: string) => s.replace(/\/+$/, ""); // strip trailing slashes
const PRODUCTION_ASSET_BASE =
  "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev/music/oido-absoluto-multi";
const PRODUCTION_NOTES_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";

// ASSET_BASE: background music (nivel-X/) and game SFX/loops (samples/).
// Local default = ./assets. On R2 = .../music/oido-absoluto-multi
const rawBase = (import.meta.env.VITE_ASSET_BASE as string | undefined)?.trim();
export const ASSET_BASE: string =
  rawBase && rawBase.length > 0
    ? strip(rawBase)
    : import.meta.env.PROD
      ? PRODUCTION_ASSET_BASE
      : "./assets";

// NOTES_BASE: the instrument note samples (Piano/, Cello/, …). These are SHARED
// across every Storm ear-training app and live at the BUCKET ROOT on R2
// (e.g. https://…r2.dev/Piano/C3.mp3, same as reconocimiento-acordes-webapp).
// Locally they sit under ./assets/samples, so that's the default.
// For R2 set VITE_NOTES_BASE to the bucket root.
const rawNotes = (import.meta.env.VITE_NOTES_BASE as string | undefined)?.trim();
export const NOTES_BASE: string =
  rawNotes && rawNotes.length > 0
    ? strip(rawNotes)
    : import.meta.env.PROD
      ? PRODUCTION_NOTES_BASE
      : `${ASSET_BASE}/samples`;
