import type { GameData, MnemonicSet } from '@/data/apps/memoria-data';

export const MAX_MNEMONIC_WORD_LENGTH = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function mnemonicRangeKeys(range: string, locale: string): string[] | null {
  if (range === (locale === 'en' ? 'Code' : 'Código') || range === '0-9') {
    return Array.from({ length: 10 }, (_, index) => String(index));
  }
  const match = /^([0-9])0-([0-9])9$/.exec(range);
  if (!match || match[1] !== match[2]) return null;
  return Array.from({ length: 10 }, (_, index) => `${match[1]}${index}`);
}

function isWord(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_MNEMONIC_WORD_LENGTH && !value.includes('\u0000');
}

/** Validate before creating an anonymous account or sending a Firestore write. */
export function parseMnemonicRange(range: string, value: unknown, locale: string): MnemonicSet | null {
  const allowedKeys = mnemonicRangeKeys(range, locale);
  if (!allowedKeys || !isRecord(value)) return null;
  const entries = Object.entries(value);
  if (!entries.every(([key, word]) => allowedKeys.includes(key) && isWord(word))) return null;
  return Object.fromEntries(entries) as MnemonicSet;
}

/** Keep valid saved words; malformed legacy entries fall back without changing stored data. */
export function mergeMnemonicWords(defaults: GameData, saved: unknown, locale: string): GameData {
  return Object.fromEntries(Object.entries(defaults).map(([range, defaultWords]) => {
    const words = { ...defaultWords };
    const allowedKeys = mnemonicRangeKeys(range, locale);
    const savedWords = isRecord(saved) ? saved[range] : undefined;
    if (allowedKeys && isRecord(savedWords)) {
      for (const key of allowedKeys) {
        if (Object.hasOwn(savedWords, key) && isWord(savedWords[key])) words[key] = savedWords[key];
      }
    }
    return [range, words];
  }));
}
