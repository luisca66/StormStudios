/** Major-mode material (Medrano pp. 15–17). Degrees are one-based. */
export type ProgressionChord = { degree: number; inversion: number };
export const chordSymbol = (c: ProgressionChord) =>
  `${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][c.degree - 1] ?? '?'}${c.inversion === 1 ? '6/3' : c.inversion === 2 ? '6/4' : ''}`;

const both = (degree: number): ProgressionChord[] => [0, 1].map(inversion => ({ degree, inversion }));
const root = (degree: number): ProgressionChord[] => [{ degree, inversion: 0 }];
const seventh = [{ degree: 7, inversion: 1 }];
const families = [
  [both(1), [...both(2), ...root(3), ...both(4), ...root(6), ...both(5), ...seventh]],
  [both(2), [...both(5), ...seventh, ...both(4)]],
  [root(3), [...root(4), ...both(5), ...root(6), ...seventh]],
  [both(4), [...both(1), ...both(2), ...both(5), ...seventh]],
  [both(5), [...both(1), ...root(6), ...seventh]],
  [root(5), [{ degree: 4, inversion: 1 }]],
  [root(6), [...both(1), ...both(2), ...root(3), ...both(4), ...both(5), ...seventh]],
  [seventh, [...root(1), ...root(3), ...root(6), ...both(5)]],
];
export const MAJOR_LINKS = families.flatMap(([from, to]) =>
  from.flatMap(a => to.map(b => ({ from: a, to: b }))));
const equal = (a: ProgressionChord, b: ProgressionChord) => a.degree === b.degree && a.inversion === b.inversion;

export const MANDATORY_CONTINUATIONS = [
  { from: root(1), to: root(3), next: root(4) },
  { from: root(2), to: both(4), next: both(5) },
  { from: root(3), to: both(5), next: root(6) },
  { from: root(6), to: both(1), next: both(2) },
  { from: root(5), to: seventh, next: root(1) },
];
export type ProgressionIssue = {
  rule: 'PROGRESSION_FORBIDDEN_LINK' | 'PROGRESSION_REQUIRED_CONTINUATION';
  /** Zero-based index of the first chord of the triggering link. */
  index: number;
  expected?: ProgressionChord[];
};
/** A terminal mandatory link is unresolved too; two-chord tasks only name material. */
export function checkProgression(chords: ProgressionChord[]): ProgressionIssue[] {
  const issues: ProgressionIssue[] = [];
  for (let i = 0; i + 1 < chords.length; i++) {
    const a = chords[i], b = chords[i + 1];
    if (!MAJOR_LINKS.some(link => equal(link.from, a) && equal(link.to, b))) {
      issues.push({ rule: 'PROGRESSION_FORBIDDEN_LINK', index: i });
    }
    for (const continuation of MANDATORY_CONTINUATIONS) {
      if (continuation.from.some(c => equal(c, a)) && continuation.to.some(c => equal(c, b)) &&
          (!chords[i + 2] || !continuation.next.some(c => equal(c, chords[i + 2])))) {
        issues.push({ rule: 'PROGRESSION_REQUIRED_CONTINUATION', index: i, expected: continuation.next });
      }
    }
  }
  return issues;
}
