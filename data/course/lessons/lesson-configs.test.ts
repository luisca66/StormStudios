import { describe, expect, it } from 'vitest';
import { getLessonConfig } from './lesson-configs';
import { lesson as lesson7 } from './08-leccion-7';
import { readFileSync } from 'node:fs';

describe('getLessonConfig', () => {
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
