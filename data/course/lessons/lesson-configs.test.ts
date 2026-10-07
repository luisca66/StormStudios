import { describe, expect, it } from 'vitest';
import { getLessonConfig } from './lesson-configs';
import { lesson as lesson7 } from './08-leccion-7';
import { lesson as lesson8 } from './09-leccion-8';
import { validateLesson8SatbLinks } from '@/lib/maestro-virtual/satb-links-validator';
import { parseMidiBuffer } from '@/lib/maestro-virtual/midi-parser';
import { readFileSync } from 'node:fs';

describe('getLessonConfig', () => {
  it('registers Lesson 8 without publishing it and covers every emitted rule', () => {
    const config = getLessonConfig('09-leccion-8');
    expect(config).toMatchObject({ validator: 'satb-links', voiceCount: 4 });
    expect(lesson8.status).toBe('construction');
    const files = ['Leccion_8_Do_mayor_correcta.mid', 'Leccion_8_tonalidades_variadas_correcta.mid', 'Leccion_8_sin_armaduras_ambiguo.mid', 'Leccion_8_Re_mayor_errores.mid'];
    for (const file of files) {
      const bytes = new Uint8Array(readFileSync(new URL(`../../../lib/maestro-virtual/__fixtures__/${file}`, import.meta.url)));
      for (const item of validateLesson8SatbLinks(parseMidiBuffer(bytes.buffer))) expect(config!.activeRules).toContain(item.rule);
    }
    expect(config!.activeRules).not.toContain('MELODIC_REPEATED_NOTE');
    expect(config!.activeRules).not.toContain('MELODIC_SUCCESSIVE_LEAPS');
  });
  it('registers every Lesson 7 feedback rule while keeping the lesson in construction', () => {
    const config = getLessonConfig('08-leccion-7');
    expect(config).toMatchObject({ validator: 'melodic-lines', voiceCount: 1 });
    const emittedRules = new Set(
      ['melodic-lines-validator.ts', 'voice-leading.ts'].flatMap(file =>
        [...readFileSync(new URL(`../../../lib/maestro-virtual/${file}`, import.meta.url), 'utf8')
          .matchAll(/'(MELODY_[A-Z_]+|MELODIC_[A-Z_]+)'/g)].map(match => match[1])
      )
    );
    expect(new Set(config!.activeRules)).toEqual(emittedRules);
    expect(lesson7.status).toBe('construction');
  });
  it('only returns own configured lesson IDs', () => {
    expect(getLessonConfig('04-leccion-3')?.validator).toBe('minor-scales');
    expect(getLessonConfig('__proto__')).toBeNull();
    expect(getLessonConfig('constructor')).toBeNull();
  });
});
