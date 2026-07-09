import { describe, expect, it } from 'vitest';
import { getLessonConfig } from './lesson-configs';

describe('getLessonConfig', () => {
  it('only returns own configured lesson IDs', () => {
    expect(getLessonConfig('04-leccion-3')?.validator).toBe('minor-scales');
    expect(getLessonConfig('__proto__')).toBeNull();
    expect(getLessonConfig('constructor')).toBeNull();
  });
});
