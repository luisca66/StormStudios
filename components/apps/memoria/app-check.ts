import type { FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// Public site key; domain verification remains enabled in Google Cloud.
const SITE_KEY = '6LfDvREuAAAAACM9gSB1q3YeF4XL59k8WquZ-W1r';
const initialized = new WeakSet<FirebaseApp>();

export function initializeMnemonicAppCheck(app: FirebaseApp): boolean {
  if (typeof window === 'undefined' || window.location.protocol !== 'https:' ||
      !['stormstudios.com.mx', 'www.stormstudios.com.mx'].includes(window.location.hostname)) {
    return false;
  }
  if (initialized.has(app)) return true;

  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(SITE_KEY),
      // Refresh on Firebase requests, rather than spending the free quota on
      // background refreshes while someone leaves the game open.
      isTokenAutoRefreshEnabled: false,
    });
    initialized.add(app);
    return true;
  } catch {
    // Observation only: an unavailable attestation must not disable the game.
    // Firebase rules and authentication still enforce access independently.
    console.warn('Memory app attestation is unavailable');
    return false;
  }
}
