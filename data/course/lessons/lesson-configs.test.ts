import { describe, expect, it } from 'vitest';
import { getLessonConfig } from './lesson-configs';
import { lesson as lesson7 } from './08-leccion-7';
import { lesson as lesson8 } from './09-leccion-8';
import { validateLesson8SatbLinks } from '@/lib/maestro-virtual/satb-links-validator';
import { parseMidiBuffer } from '@/lib/maestro-virtual/midi-parser';
import { readFileSync } from 'node:fs';
import { getAllLessons } from '@/lib/course';

describe('getLessonConfig', () => {
  it('registers every Lesson 8 feedback rule for the published lesson', () => {
    const config = getLessonConfig('09-leccion-8');
    expect(config).toMatchObject({ validator: 'satb-links', voiceCount: 4 });
    expect(lesson8.status).toBe('published');
    expect(lesson8.exercise).toMatchObject({ type: 'four-voice-chorale', voiceCount: 4 });
    const files = ['Leccion_8_Do_mayor_correcta.mid', 'Leccion_8_tonalidades_variadas_correcta.mid', 'Leccion_8_sin_armaduras_ambiguo.mid', 'Leccion_8_Re_mayor_errores.mid'];
    for (const file of files) {
      const bytes = new Uint8Array(readFileSync(new URL(`../../../lib/maestro-virtual/__fixtures__/${file}`, import.meta.url)));
      for (const item of validateLesson8SatbLinks(parseMidiBuffer(bytes.buffer))) expect(config!.activeRules).toContain(item.rule);
    }
    expect(config!.activeRules).not.toContain('MELODIC_REPEATED_NOTE');
    expect(config!.activeRules).not.toContain('MELODIC_SUCCESSIVE_LEAPS');
  });
  it('registers every Lesson 7 feedback rule for the published lesson', () => {
    const config = getLessonConfig('08-leccion-7');
    expect(config).toMatchObject({ validator: 'melodic-lines', voiceCount: 1 });
    const emittedRules = new Set(
      ['melodic-lines-validator.ts', 'voice-leading.ts'].flatMap(file =>
        [...readFileSync(new URL(`../../../lib/maestro-virtual/${file}`, import.meta.url), 'utf8')
          .matchAll(/'(MELODY_[A-Z_]+|MELODIC_[A-Z_]+)'/g)].map(match => match[1])
      )
    );
    expect(new Set(config!.activeRules)).toEqual(emittedRules);
    expect(lesson7.status).toBe('published');
  });
  it('shows the MIDI upload on every published lesson that has a validator', () => {
    // LessonLayout only renders ExerciseUpload when the lesson declares an exercise.
    const missing = getAllLessons()
      .filter(lesson => lesson.status === 'published' && getLessonConfig(lesson.id) && !lesson.exercise)
      .map(lesson => lesson.id);
    expect(missing).toEqual([]);
  });
  it('only returns own configured lesson IDs', () => {
    expect(getLessonConfig('04-leccion-3')?.validator).toBe('minor-scales');
    expect(getLessonConfig('__proto__')).toBeNull();
    expect(getLessonConfig('constructor')).toBeNull();
  });
});
