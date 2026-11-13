import type { ParsedNote, VoiceData } from './midi-parser';
import { parseSpelling, sameSpelling, spellingName } from './spelling';
import { nameToPitch } from './music-theory-core';
import { lesson4TriadPattern, TRIAD_ROOTS, TRIAD_VARIANTS, type TriadVariant, type TriadError } from './triads-validator';

type Pattern = ReturnType<typeof lesson4TriadPattern>;
type Group = { tick: number; notes: ParsedNote[] };
type Candidate = { root: string; variant: TriadVariant; pattern: Pattern };
type Match = { candidate: Candidate; shift: number; score: number };
type Edge = { start: number; length: number; matches: Match[] };
const GAP_COST = 6;
const EPSILON = 0.00001;

const CANDIDATES: Candidate[] = TRIAD_ROOTS.flatMap(root =>
  (Object.keys(TRIAD_VARIANTS) as TriadVariant[]).map(variant => ({
    root, variant, pattern: lesson4TriadPattern(root, variant, nameToPitch(root)),
  })),
);

function pairCost(group: Group, expected: Pattern[number], shift: number): number {
  let cost = Math.abs(group.notes.length - 3) * 3;
  for (let j = 0; j < Math.min(group.notes.length, 3); j++) {
    const got = group.notes[j], exp = expected.notes[j];
    if (got.midi !== exp.midi + shift) cost += 2;
    else {
      const spelling = parseSpelling(got.spelling);
      if (spelling && !sameSpelling(spelling, parseSpelling(exp.name)!)) cost += 0.5;
    }
  }
  return cost;
}

/** Alinea grados aunque falte/sobre un acorde, para no desplazar el resto del archivo. */
function align(groups: Group[], pattern: Pattern, shift: number, trace = false, omitInitialTonic = false) {
  const table: number[][] = Array.from({ length: 9 }, () => Array(groups.length + 1).fill(0));
  for (let i = 0; i <= 8; i++) table[i][0] = (i - (omitInitialTonic && i > 0 ? 1 : 0)) * GAP_COST;
  for (let j = 0; j <= groups.length; j++) table[0][j] = j * GAP_COST;
  for (let i = 1; i <= 8; i++) for (let j = 1; j <= groups.length; j++) {
    table[i][j] = Math.min(
      table[i - 1][j - 1] + pairCost(groups[j - 1], pattern[i - 1], shift),
      table[i - 1][j] + (omitInitialTonic && i === 1 ? 0 : GAP_COST),
      table[i][j - 1] + GAP_COST,
    );
  }
  const steps: { expected?: number; actual?: number }[] = [];
  if (trace) {
    let i = 8, j = groups.length;
    while (i || j) {
      if (i && j && Math.abs(table[i][j] - table[i - 1][j - 1] - pairCost(groups[j - 1], pattern[i - 1], shift)) < EPSILON) {
        steps.push({ expected: --i, actual: --j });
      } else if (i && Math.abs(table[i][j] - table[i - 1][j] - (omitInitialTonic && i === 1 ? 0 : GAP_COST)) < EPSILON) {
        steps.push({ expected: --i });
      } else steps.push({ actual: --j });
    }
    steps.reverse();
  }
  return { score: table[8][groups.length], steps };
}

function bestMatches(groups: Group[]): Match[] {
  let best = Infinity;
  const matches: Match[] = [];
  for (const candidate of CANDIDATES) {
    // La mediana evita que una fundamental equivocada imponga el registro.
    const shifts = groups.map((group, i) => group.notes[0].midi - candidate.pattern[Math.min(i, 7)].notes[0].midi).sort((a, b) => a - b);
    const shift = Math.round(shifts[Math.floor(shifts.length / 2)] / 12) * 12;
    const score = align(groups, candidate.pattern, shift, false, candidate.variant === 'MELODIC_MINOR_DESC').score;
    if (score < best - EPSILON) { best = score; matches.length = 0; }
    if (Math.abs(score - best) < EPSILON) matches.push({ candidate, shift, score });
  }
  return matches;
}

/**
 * Reconoce las 72 series sin selección del alumno ni orden entre series.
 * Cada serie conserva el recorrido por grados. Las series incompletas se
 * alinean por sus notas; las coincidencias ambiguas se explican, no se adivinan.
 */
export function validateCompleteLesson4Triads(data: VoiceData): TriadError[] {
  const errors: TriadError[] = [];
  const add = (rule: string, position: number, es: string, en: string, detailEs = es, detailEn = en) => {
    errors.push({ rule, severity: 'error', position, titleEs: es, titleEn: en, detailEs, detailEn });
  };
  const byTick = new Map<number, ParsedNote[]>();
  for (const notes of Object.values(data.voices)) for (const note of notes ?? []) {
    const group = byTick.get(note.tick) ?? [];
    group.push(note); byTick.set(note.tick, group);
  }
  const groups: Group[] = [...byTick].sort(([a], [b]) => a - b).map(([tick, notes]) => ({ tick, notes: notes.sort((a, b) => a.midi - b.midi) }));
  if (groups.length > 1200) {
    add('TRIAD_FILE_LIMIT', 0, 'El archivo excede 1200 posiciones de acorde.', 'The file exceeds 1200 chord positions.');
    return errors;
  }
  // Busca límites globales, tolerando uno o dos acordes omitidos/añadidos.
  // Esto evita el corrimiento en cascada de una simple partición cada 8 notas.
  const distance = new Float64Array(groups.length + 1).fill(Infinity);
  const previous: (Edge | undefined)[] = Array(groups.length + 1);
  distance[0] = 0;
  for (let start = 0; start < groups.length; start++) {
    if (distance[start] + 10 < distance[start + 1]) {
      distance[start + 1] = distance[start] + 10;
      previous[start + 1] = { start, length: 1, matches: [] };
    }
    for (const length of [8, 7, 9, 6, 10]) {
      if (start + length > groups.length) continue;
      const matches = bestMatches(groups.slice(start, start + length));
      const cost = distance[start] + matches[0].score + Math.abs(length - 8) * 0.001;
      if (cost < distance[start + length] - EPSILON) {
        distance[start + length] = cost;
        previous[start + length] = { start, length, matches };
      }
    }
  }
  const edges: Edge[] = [];
  for (let end = groups.length; end > 0;) {
    const edge = previous[end]!;
    edges.push(edge); end = edge.start;
  }
  edges.reverse();
  const found = new Map<string, number>();
  for (const edge of edges) {
    const matches = edge.matches;
    if (!matches.length || matches[0].score > 16) {
      add('TRIAD_UNRECOGNIZED', edge.start + 1, 'No se pudo reconocer esta serie de acordes.', 'This chord series could not be recognized.',
        `Desde el acorde ${edge.start + 1}: revisa las tres notas simultáneas, las fundamentales y el recorrido por grados.`,
        `From chord ${edge.start + 1}: check the three simultaneous notes, roots and degree sequence.`);
      continue;
    }
    if (matches.length !== 1) {
      const names = matches.map(m => `${m.candidate.root} · ${TRIAD_VARIANTS[m.candidate.variant].es}`).join(' / ');
      const namesEn = matches.map(m => `${m.candidate.root} · ${TRIAD_VARIANTS[m.candidate.variant].en}`).join(' / ');
      add('TRIAD_AMBIGUOUS_SCALE', edge.start + 1, 'La variante de esta serie no es inequívoca.', 'The variant of this series is ambiguous.',
        `Desde el acorde ${edge.start + 1}: las notas coinciden por igual con ${names}. Revisa los grados alterados; no se cuenta como una variante confirmada.`,
        `From chord ${edge.start + 1}: the notes match ${namesEn} equally. Check the altered degrees; this is not counted as a confirmed variant.`);
      continue;
    }
    const { candidate, shift } = matches[0];
    const key = `${candidate.root}|${candidate.variant}`;
    const label = `${candidate.root} · ${TRIAD_VARIANTS[candidate.variant].es}`;
    const labelEn = `${candidate.root} · ${TRIAD_VARIANTS[candidate.variant].en}`;
    found.set(key, (found.get(key) ?? 0) + 1);
    const series = groups.slice(edge.start, edge.start + edge.length);
    const { steps } = align(series, candidate.pattern, shift, true, candidate.variant === 'MELODIC_MINOR_DESC');
    for (const step of steps) {
      const position = edge.start + (step.actual ?? 0) + 1;
      if (step.expected === undefined) {
        add('TRIAD_EXTRA_CHORD', position, `${label}: acorde adicional.`, `${labelEn}: extra chord.`);
        continue;
      }
      const expected = candidate.pattern[step.expected];
      const title = `${label}, grado ${expected.degree}`;
      const titleEn = `${labelEn}, degree ${expected.degree}`;
      if (step.actual === undefined) {
        // La bajada puede continuar después de la subida sin repetir I′.
        if (candidate.variant === 'MELODIC_MINOR_DESC' && step.expected === 0) continue;
        add('TRIAD_MISSING_CHORD', edge.start + 1, `${title}: falta el acorde.`, `${titleEn}: missing chord.`,
          `Se esperan ${expected.notes.map(n => n.name).join('–')} en esta serie.`, `Expected ${expected.notes.map(n => n.name).join('–')} in this series.`);
        continue;
      }
      const actual = series[step.actual].notes;
      if (actual.length !== 3) {
        add('TRIAD_NOTE_COUNT', position, `${title}: ${actual.length} notas; se esperan 3.`, `${titleEn}: ${actual.length} notes; expected 3.`,
          `El acorde debe tener fundamental, tercera y quinta: ${expected.notes.map(n => n.name).join('–')}, simultáneas y sin duplicaciones.`,
          `The chord must contain root, third and fifth: ${expected.notes.map(n => n.name).join('–')}, simultaneous and without doubling.`);
        continue;
      }
      for (let j = 0; j < 3; j++) {
        const got = actual[j], exp = expected.notes[j], midi = exp.midi + shift;
        const spelling = parseSpelling(got.spelling);
        if (got.midi !== midi) {
          add('TRIAD_WRONG_NOTE', position, `${title}: nota incorrecta.`, `${titleEn}: wrong note.`,
            `Se esperaba ${spellingName(parseSpelling(exp.name)!, 'es')} (MIDI ${midi}) y se recibió ${spelling ? spellingName(spelling, 'es') : 'MIDI ' + got.midi} (MIDI ${got.midi}). Revisa el grado, la octava y el estado fundamental.`,
            `Expected ${exp.name} (MIDI ${midi}), received ${spelling ? spellingName(spelling, 'en') : 'MIDI ' + got.midi} (MIDI ${got.midi}). Check the degree, octave and root position.`);
        } else if (!spelling) {
          add('TRIAD_MISSING_SPELLING', position, `${title}: falta la grafía.`, `${titleEn}: missing spelling.`,
            'Exporta desde Storm Sequencer para conservar las grafías de las notas.', 'Export from Storm Sequencer to preserve note spellings.');
        } else if (!sameSpelling(spelling, parseSpelling(exp.name)!)) {
          add('TRIAD_ENHARMONIC', position, `${title}: grafía incorrecta.`, `${titleEn}: wrong spelling.`,
            `Escribiste ${spellingName(spelling, 'es')}; corresponde ${spellingName(parseSpelling(exp.name)!, 'es')}.`,
            `You wrote ${spellingName(spelling, 'en')}; expected ${exp.name}.`);
        }
      }
    }
  }
  for (const candidate of CANDIDATES) {
    const count = found.get(`${candidate.root}|${candidate.variant}`) ?? 0;
    const label = `${candidate.root} · ${TRIAD_VARIANTS[candidate.variant].es}`;
    const labelEn = `${candidate.root} · ${TRIAD_VARIANTS[candidate.variant].en}`;
    if (!count) add('TRIAD_MISSING_SCALE', 0, `Falta ${label}.`, `Missing ${labelEn}.`);
    else if (count > 1) add('TRIAD_DUPLICATE_SCALE', 0, `${label} aparece ${count} veces.`, `${labelEn} appears ${count} times.`);
  }
  // Todas las faltantes deben aparecer incluso si el endpoint resume errores.
  return errors.sort((a, b) => Number(b.rule === 'TRIAD_MISSING_SCALE') - Number(a.rule === 'TRIAD_MISSING_SCALE'));
}
