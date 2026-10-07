import { describe, expect, it } from 'vitest';
import { checkProgression, chordSymbol, MAJOR_LINKS, MANDATORY_CONTINUATIONS } from './harmonic-material';
import { LESSON8_LINKS } from './satb-links-validator';

describe('major harmonic material', () => {
  it('matches every entry of the confirmed table, without free 6/4 chords', () => {
    const rows: Record<string, string> = {
      I: 'II II6/3 III IV IV6/3 VI V V6/3 VII6/3',
      'I6/3': 'II II6/3 III IV IV6/3 VI V V6/3 VII6/3',
      II: 'V V6/3 VII6/3 IV IV6/3', 'II6/3': 'V V6/3 VII6/3 IV IV6/3',
      III: 'IV V V6/3 VI VII6/3',
      IV: 'I I6/3 II II6/3 V V6/3 VII6/3', 'IV6/3': 'I I6/3 II II6/3 V V6/3 VII6/3',
      V: 'I I6/3 VI VII6/3 IV6/3', 'V6/3': 'I I6/3 VI VII6/3',
      VI: 'I I6/3 II II6/3 III IV IV6/3 V V6/3 VII6/3',
      'VII6/3': 'I III VI V V6/3',
    };
    for (let a = 1; a <= 7; a++) for (let ai = 0; ai < 3; ai++) {
      const from = { degree: a, inversion: ai };
      const actual = MAJOR_LINKS.filter(l => chordSymbol(l.from) === chordSymbol(from)).map(l => chordSymbol(l.to));
      expect([...new Set(actual)].sort()).toEqual((rows[chordSymbol(from)]?.split(' ') ?? []).sort());
      for (let b = 1; b <= 7; b++) for (let bi = 0; bi < 3; bi++) {
        const to = { degree: b, inversion: bi };
        expect(checkProgression([from, to]).some(i => i.rule === 'PROGRESSION_FORBIDDEN_LINK'))
          .toBe(!actual.includes(chordSymbol(to)));
      }
    }
  });
  it('allows all eight assigned links', () => {
    for (const { from, to } of LESSON8_LINKS) expect(checkProgression([from, to])).toEqual([]);
  });
  it('enforces each mandatory continuation including an unfinished final link', () => {
    for (const rule of MANDATORY_CONTINUATIONS) for (const from of rule.from) for (const to of rule.to) {
      expect(checkProgression([from, to])).toContainEqual({ rule: 'PROGRESSION_REQUIRED_CONTINUATION', index: 0, expected: rule.next });
      for (const next of rule.next) expect(checkProgression([from, to, next])).toEqual([]);
      expect(checkProgression([from, to, { degree: 7, inversion: 0 }])).toEqual(expect.arrayContaining([
        expect.objectContaining({ rule: 'PROGRESSION_REQUIRED_CONTINUATION', index: 0 }),
      ]));
    }
  });
  it('does not apply root-only arrows to their first inversions', () => {
    for (const [a, b, bi] of [[1, 3, 0], [2, 4, 1], [5, 7, 1]]) {
      expect(checkProgression([{ degree: a, inversion: 1 }, { degree: b, inversion: bi }])).toEqual([]);
    }
  });
});
