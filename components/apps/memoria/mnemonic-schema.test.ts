import { describe, expect, it } from 'vitest';
import { GAME_DATA_EN, GAME_DATA_ES } from '@/data/apps/memoria-data';
import { MAX_MNEMONIC_WORD_LENGTH, mergeMnemonicWords, parseMnemonicRange } from './mnemonic-schema';

describe('mnemonic data at the client boundary', () => {
  it.each([['es', GAME_DATA_ES], ['en', GAME_DATA_EN]] as const)('accepts every default range in %s', (locale, defaults) => {
    for (const [range, words] of Object.entries(defaults)) expect(parseMnemonicRange(range, words, locale)).toEqual(words);
  });

  it('keeps partial maps, empty words, leading zeroes and localized code keys', () => {
    expect(parseMnemonicRange('00-09', { '00': '', '09': 'café' }, 'es')).toEqual({ '00': '', '09': 'café' });
    expect(parseMnemonicRange('Code', { '0': 's, z' }, 'en')).toEqual({ '0': 's, z' });
    expect(parseMnemonicRange('Código', { '0': 's, z' }, 'es')).toEqual({ '0': 's, z' });
    expect(parseMnemonicRange('90-99', {}, 'en')).toEqual({});
  });

  it.each([
    ['0-9', { '00': 'wrong key' }, 'es'],
    ['00-09', { '0': 'missing zero' }, 'es'],
    ['10-19', { '20': 'wrong decade' }, 'en'],
    ['00-19', { '00': 'wrong range' }, 'es'],
    ['Code', { '0': 'wrong language' }, 'es'],
    ['Código', { '0': 'wrong language' }, 'en'],
    ['0-9', { '0': { nested: true } }, 'es'],
    ['0-9', { '0': 17 }, 'es'],
    ['0-9', { '0': null }, 'es'],
    ['0-9', { '0': 'a\u0000b' }, 'es'],
    ['0-9', ['word'], 'es'],
    ['0-9', null, 'es'],
    ['0-9', { '0': 'x'.repeat(MAX_MNEMONIC_WORD_LENGTH + 1) }, 'es'],
  ])('rejects malformed range %#', (range, words, locale) => {
    expect(parseMnemonicRange(range as string, words, locale as string)).toBeNull();
  });

  it('accepts the word limit without modifying text', () => {
    const words = { '0': 'é'.repeat(MAX_MNEMONIC_WORD_LENGTH) };
    expect(parseMnemonicRange('0-9', words, 'es')).toEqual(words);
  });

  it('preserves valid saved words and uses defaults for malformed legacy entries without mutating either source', () => {
    const saved = { '0-9': { '0': 'Mi oso', '1': 42, '2': 'x'.repeat(101), other: 'ignored' }, '10-19': ['bad'], evil: {} };
    const original = structuredClone(saved);
    const merged = mergeMnemonicWords(GAME_DATA_ES, saved, 'es');
    expect(merged['0-9']['0']).toBe('Mi oso');
    expect(merged['0-9']['1']).toBe(GAME_DATA_ES['0-9']['1']);
    expect(merged['0-9']['2']).toBe(GAME_DATA_ES['0-9']['2']);
    expect(merged['0-9']).not.toHaveProperty('other');
    expect(merged['10-19']).toEqual(GAME_DATA_ES['10-19']);
    expect(merged).not.toHaveProperty('evil');
    expect(saved).toEqual(original);
    expect(GAME_DATA_ES['0-9']['0']).toBe('Oso');
  });
});
