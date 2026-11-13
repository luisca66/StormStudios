import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FirebaseApp } from 'firebase/app';

const mocks = vi.hoisted(() => ({ initialize: vi.fn(), provider: vi.fn() }));
vi.mock('firebase/app-check', () => ({
  initializeAppCheck: mocks.initialize,
  ReCaptchaEnterpriseProvider: class {
    constructor(key: string) { mocks.provider(key); }
  },
}));
import { initializeMnemonicAppCheck } from './app-check';

function setOrigin(hostname: string, protocol = 'https:') {
  vi.stubGlobal('window', { location: { hostname, protocol } });
}
const newApp = () => ({ name: 'memoria-app' }) as FirebaseApp;

describe('Memoria App Check observation', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it.each(['localhost', '127.0.0.1', 'storm-studios.vercel.app', 'evil.stormstudios.com.mx'])('does not consume production quota on %s', (hostname) => {
    setOrigin(hostname);
    expect(initializeMnemonicAppCheck(newApp())).toBe(false);
    expect(mocks.initialize).not.toHaveBeenCalled();
  });

  it('does not initialize during server rendering or over HTTP', () => {
    expect(initializeMnemonicAppCheck(newApp())).toBe(false);
    setOrigin('www.stormstudios.com.mx', 'http:');
    expect(initializeMnemonicAppCheck(newApp())).toBe(false);
    expect(mocks.initialize).not.toHaveBeenCalled();
  });

  it.each(['stormstudios.com.mx', 'www.stormstudios.com.mx'])('initializes once on %s without background refresh', (hostname) => {
    setOrigin(hostname);
    const app = newApp();
    expect(initializeMnemonicAppCheck(app)).toBe(true);
    expect(initializeMnemonicAppCheck(app)).toBe(true);
    expect(mocks.initialize).toHaveBeenCalledExactlyOnceWith(app, {
      provider: expect.anything(), isTokenAutoRefreshEnabled: false,
    });
    expect(mocks.provider).toHaveBeenCalledWith(expect.stringMatching(/^6L/));
  });

  it('keeps an initialization failure recoverable in observation mode', () => {
    setOrigin('www.stormstudios.com.mx');
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const app = newApp();
    mocks.initialize.mockImplementationOnce(() => { throw new Error('unavailable'); });
    expect(initializeMnemonicAppCheck(app)).toBe(false);
    expect(initializeMnemonicAppCheck(app)).toBe(true);
    warning.mockRestore();
  });
});
