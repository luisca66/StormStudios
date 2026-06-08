/**
 * spelling.ts — Grafía enarmónica para el Maestro Virtual.
 *
 * El número MIDI no distingue enarmonías: La## y Si son ambos 71. Por eso el
 * secuenciador Storm Studios incrusta la grafía de cada nota en el .mid
 * (meta-texto 'SP:<grafía>', ej. 'SP:a##'). Aquí parseamos esa grafía,
 * calculamos la grafía CORRECTA de cada grado de una escala y comparamos, para
 * detectar errores como escribir La## donde corresponde Si.
 *
 * La grafía correcta de una escala se calcula con el principio de letras
 * consecutivas: cada grado usa la siguiente letra del ciclo Do–Si, y la
 * alteración (♭♭ … ♯♯) se deduce para que la letra llegue a la altura objetivo.
 * Esto da la grafía estándar de cualquier escala, incluso con dobles sostenidos
 * (ej. el VII de Sol# menor armónica es Fa𝄪).
 */

export type Letter = 'c' | 'd' | 'e' | 'f' | 'g' | 'a' | 'b';

export interface Spelling {
  letter: Letter;
  alter: number; // -2..+2  (♭♭, ♭, ♮, ♯, 𝄪)
}

const LETTERS: Letter[] = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
const LETTER_PC: Record<Letter, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const SOLFEGE: Record<Letter, string> = {
  c: 'Do', d: 'Re', e: 'Mi', f: 'Fa', g: 'Sol', a: 'La', b: 'Si',
};

/** Índice 0–6 de una letra en el ciclo Do–Si. */
export function letterIndex(letter: Letter): number {
  return LETTERS.indexOf(letter);
}

/** Letra (Do–Si) a partir de un índice, con wrap-around. */
export function letterFromIndex(idx: number): Letter {
  return LETTERS[((idx % 7) + 7) % 7];
}

/**
 * Parsea un token de grafía del secuenciador (ej. 'a##', 'bb', 'c#', 'gn', 'cb').
 * Acepta 'n' (natural) y 'x' (doble sostenido). Devuelve null si no es válido.
 */
export function parseSpelling(token: string | undefined | null): Spelling | null {
  if (!token) return null;
  const t = token.trim().toLowerCase();
  const letter = t[0] as Letter;
  if (!(letter in LETTER_PC)) return null;
  const acc = t.slice(1);
  const alter =
    acc === '' || acc === 'n' ? 0 :
    acc === '#' ? 1 :
    acc === '##' || acc === 'x' ? 2 :
    acc === 'b' ? -1 :
    acc === 'bb' ? -2 :
    NaN;
  if (Number.isNaN(alter)) return null;
  return { letter, alter };
}

/** Clase de altura (0–11) de una grafía. */
export function spellingToPc(s: Spelling): number {
  return (((LETTER_PC[s.letter] + s.alter) % 12) + 12) % 12;
}

/**
 * Grafía correcta para una letra (por índice) y una clase de altura objetivo.
 * Calcula la alteración mínima (-2..+2) que lleva esa letra al pitch class.
 */
export function spellWithLetter(letterIdx: number, targetPc: number): Spelling {
  const letter = letterFromIndex(letterIdx);
  let alter = (((targetPc - LETTER_PC[letter]) % 12) + 12) % 12;
  if (alter > 6) alter -= 12; // rango -5..+6; las escalas válidas dan -2..+2
  return { letter, alter };
}

/** ¿Son la misma grafía (misma letra y alteración)? */
export function sameSpelling(a: Spelling, b: Spelling): boolean {
  return a.letter === b.letter && a.alter === b.alter;
}

const ACC_WORDS: Record<'es' | 'en', Record<string, string>> = {
  es: { '-2': ' doble bemol', '-1': ' bemol', '0': '', '1': ' sostenido', '2': ' doble sostenido' },
  en: { '-2': ' double flat', '-1': ' flat', '0': '', '1': ' sharp', '2': ' double sharp' },
};
const ACC_SYM: Record<string, string> = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };

/** Nombre legible en palabras (ej. 'La doble sostenido' / 'A double sharp'). */
export function spellingName(s: Spelling, locale: 'es' | 'en'): string {
  const base = locale === 'en' ? s.letter.toUpperCase() : SOLFEGE[s.letter];
  return base + (ACC_WORDS[locale][String(s.alter)] ?? '');
}

/** Nombre corto con símbolo (ej. 'La𝄪', 'Si'). */
export function spellingSymbol(s: Spelling, locale: 'es' | 'en'): string {
  const base = locale === 'en' ? s.letter.toUpperCase() : SOLFEGE[s.letter];
  return base + (ACC_SYM[String(s.alter)] ?? '');
}
