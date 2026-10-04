import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { POST } from './route';
import * as lessonConfigs from '@/data/course/lessons/lesson-configs';

function midiRequest(lessonId: string, locale = 'es', ip?: string) {
  const formData = new FormData();
  formData.append('midi', new Blob([new Uint8Array([0])]), 'exercise.mid');
  formData.append('lessonId', lessonId);
  formData.append('locale', locale);

  return new NextRequest('http://localhost/api/maestro-virtual/check', {
    method: 'POST',
    headers: ip ? { 'x-forwarded-for': ip } : undefined,
    body: formData,
  });
}

describe('POST /api/maestro-virtual/check', () => {
  function triadRequest(wrongNote = false) {
    const fixture = wrongNote ? 'leccion4-errores.mid' : 'leccion4-completa.mid';
    const bytes = new Uint8Array(readFileSync(join(process.cwd(), 'lib/maestro-virtual/__fixtures__', fixture)));
    const form = new FormData();
    form.append('midi', new Blob([bytes]), 'triads.mid');
    form.append('lessonId', '05-leccion-4');
    return new NextRequest('http://localhost/api/maestro-virtual/check', { method: 'POST', body: form });
  }
  it('evaluates Lesson 4 through the real MIDI parser and triad validator', async () => {
    const response = await POST(triadRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ lessonId: '05-leccion-4', score: 100, passed: true, violations: [] });
  });
  it('returns pedagogical errors for a wrong triad note', async () => {
    const response = await POST(triadRequest(true));
    expect(response.status).toBe(200);
    const feedback = await response.json();
    expect(feedback.passed).toBe(false);
    expect(feedback.violations.some((v: { ruleId: string }) => v.ruleId === 'TRIAD_WRONG_NOTE')).toBe(true);
    expect(feedback.violations.some((v: { ruleId: string }) => v.ruleId === 'TRIAD_MISSING_SCALE')).toBe(true);
  });
  it('requires no root or variant fields and reports every missing series in a partial MIDI', async () => {
    const bytes = new Uint8Array([77,84,104,100,0,0,0,6,0,1,0,1,0,128,77,84,114,107,0,0,0,4,0,255,47,0]);
    const form = new FormData();
    form.append('midi', new Blob([bytes]), 'empty.mid');
    form.append('lessonId', '05-leccion-4');
    const response = await POST(new NextRequest('http://localhost/api/maestro-virtual/check', { method:'POST', body:form }));
    expect(response.status).toBe(200);
    const feedback = await response.json();
    expect(feedback.passed).toBe(false);
    expect(feedback.violations.filter((v: {ruleId: string}) => v.ruleId === 'TRIAD_MISSING_SCALE')).toHaveLength(72);
  });
  it('does not treat prototype properties as lesson configurations', async () => {
    const response = await POST(midiRequest('__proto__'));

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ code: 'unknown_lesson', error: 'Lección desconocida' });
  });

  it('bounds unknown lesson identifiers without reflecting them', async () => {
    const response = await POST(midiRequest('x'.repeat(81)));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: 'missing_params',
      error: 'Faltan parámetros: midi y lessonId',
    });
  });

  it('normalizes unsupported locale values before returning SATB feedback', async () => {
    const config = vi.spyOn(lessonConfigs, 'getLessonConfig').mockReturnValueOnce({
      id: 'satb-test', validator: 'satb', voiceCount: 4, activeRules: [],
    });
    const response = await POST(midiRequest('satb-test', 'en\nforged-log-line'));
    config.mockRestore();

    expect(response.status).toBe(501);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      code: 'satb_unavailable',
      error: 'La retroalimentación SATB todavía no está disponible.',
    });
  });

  it('limits repeated MIDI reviews before reading more request bodies', async () => {
    const ip = '198.51.100.75';

    for (let index = 0; index < 10; index++) {
      expect((await POST(midiRequest('__proto__', 'es', ip))).status).toBe(404);
    }

    const limitedResponse = await POST(midiRequest('__proto__', 'es', ip));
    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.headers.get('retry-after')).toBeTruthy();
  });
});
