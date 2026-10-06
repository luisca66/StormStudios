import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { POST } from './route';
import * as satbChords from '@/lib/maestro-virtual/satb-chords-validator';
import type { MaestroFeedback } from '@/types/course';
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


describe('Lesson 7 melodic line review', () => {
  function request(fixture: string, locale: 'es' | 'en') {
    const bytes = new Uint8Array(readFileSync(join(process.cwd(), 'lib/maestro-virtual/__fixtures__', fixture)));
    const form = new FormData();
    form.append('midi', new Blob([bytes]), fixture);
    form.append('lessonId', '08-leccion-7');
    form.append('locale', locale);
    return new NextRequest('http://localhost/api/maestro-virtual/check', {
      method: 'POST', body: form, headers: { 'x-forwarded-for': '198.51.100.77' },
    });
  }

  it.each([
    ['Leccion_7_Soprano_Do_mayor_correcta.mid', 'es', 'Voz: soprano. Tonalidad reconocida: Do mayor.'],
    ['Leccion_7_Contralto_Sol_mayor_correcta.mid', 'es', 'Voz: contralto. Tonalidad reconocida: Sol mayor.'],
    ['Leccion_7_Tenor_Re_mayor_correcta.mid', 'en', 'Voice: tenor. Detected key: D major.'],
    ['Leccion_7_Bajo_Sib_mayor_correcta.mid', 'es', 'Voz: bajo. Tonalidad reconocida: Si bemol mayor.'],
  ] as const)('accepts %s and returns melody descriptions', async (fixture, locale, title) => {
    const response = await POST(request(fixture, locale));
    expect(response.status).toBe(200);
    const feedback: MaestroFeedback = await response.json();
    expect(feedback).toMatchObject({ lessonId: '08-leccion-7', passed: true, score: 100, violations: [], suggestions: [] });
    expect(feedback.descriptions?.map(item => item.ruleId)).toEqual(['MELODY_KEY', 'MELODY_SUMMARY']);
    expect(feedback.descriptions![0].ruleName[locale]).toBe(title);
    expect(feedback.descriptions![1].message.es).toBeTruthy();
    expect(feedback.descriptions![1].message.en).toBeTruthy();
  });

  it.each([
    ['Leccion_7_Soprano_Do_mayor_errores.mid', 25, [
      ['MELODIC_FORBIDDEN_INTERVAL', 3], ['MELODIC_REPEATED_NOTE', 4],
      ['MELODY_RANGE', 7], ['MELODIC_SUCCESSIVE_LEAPS', 7], ['MELODY_END_TONIC', 8],
    ]],
    ['Leccion_7_Tenor_Re_mayor_errores.mid', 55, [
      ['MELODIC_LEADING_TONE_OCTAVE', 3], ['MELODY_ENHARMONIC', 6], ['MELODIC_DIMINISHED_UNRESOLVED', 6],
    ]],
  ] as const)('reports the expected errors in %s', async (fixture, score, errors) => {
    const response = await POST(request(fixture, 'es'));
    expect(response.status).toBe(200);
    const feedback: MaestroFeedback = await response.json();
    expect(feedback).toMatchObject({ passed: false, score });
    expect(feedback.violations.map(item => [item.ruleId, item.measure])).toEqual(errors);
    expect(feedback.descriptions?.map(item => item.ruleId)).toEqual(['MELODY_KEY', 'MELODY_SUMMARY']);
  });
});

describe('Lesson 6 SATB chord review', () => {
  function request(fixture: string, locale = 'es') {
    const bytes = new Uint8Array(readFileSync(join(process.cwd(), 'lib/maestro-virtual/__fixtures__', fixture)));
    const form = new FormData();
    form.append('midi', new Blob([bytes]), fixture);
    form.append('lessonId', '07-leccion-6');
    form.append('locale', locale);
    return new NextRequest('http://localhost/api/maestro-virtual/check', {
      method: 'POST', body: form, headers: { 'x-forwarded-for': '198.51.100.76' },
    });
  }

  it.each([
    ['Leccion_6_Do_mayor_correcta.mid', 'es', 'Tonalidad reconocida: Do mayor.'],
    ['Leccion_6_Re_mayor_desordenada_correcta.mid', 'en', 'Detected key: D major.'],
  ])('accepts %s and returns bilingual chord descriptions', async (fixture, locale, title) => {
    const response = await POST(request(fixture, locale));
    expect(response.status).toBe(200);
    const feedback: MaestroFeedback = await response.json();
    expect(feedback).toMatchObject({ lessonId: '07-leccion-6', passed: true, score: 100, violations: [], suggestions: [] });
    expect(feedback.descriptions).toHaveLength(8);
    expect(feedback.descriptions![0].ruleName[locale as 'es' | 'en']).toBe(title);
    expect(feedback.descriptions!.every(item => item.severity === 'info')).toBe(true);
    expect(feedback.descriptions!.filter(item => item.ruleId === 'SATB_CHORD_INFO').map(item => item.measure)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(feedback.descriptions![1].message.es).toContain('Estado:');
    expect(feedback.descriptions![1].message.en).toContain('State:');
  });

  it('scores only the eight errors and also returns the analysis', async () => {
    const response = await POST(request('Leccion_6_Do_mayor_errores.mid'));
    expect(response.status).toBe(200);
    const feedback: MaestroFeedback = await response.json();
    expect(feedback).toMatchObject({ passed: false, score: 0 });
    expect(feedback.violations).toHaveLength(8);
    expect(feedback.violations.every(item => item.severity === 'error')).toBe(true);
    expect(feedback.summary.es).toContain('8 errores');
    expect(feedback.descriptions!.length).toBeGreaterThan(0);
  });

  it.each([1, 95, 120])('prioritizes errors within the shared report limit (%i errors)', async (count) => {
    const item = (severity: 'error' | 'info'): satbChords.SatbFeedback => ({
      rule: severity === 'error' ? 'SATB_RANGE' : 'SATB_CHORD_INFO', severity,
      position: 1, titleEs: 'Título', titleEn: 'Title', detailEs: 'Detalle', detailEn: 'Detail',
    });
    const validator = vi.spyOn(satbChords, 'validateLesson6SatbChords').mockReturnValueOnce([
      ...Array.from({ length: 8 }, () => item('info')),
      ...Array.from({ length: count }, () => item('error')),
    ]);
    try {
      const response = await POST(request('Leccion_6_Do_mayor_correcta.mid'));
      expect(response.status).toBe(200);
      const feedback: MaestroFeedback = await response.json();
      expect(feedback.violations).toHaveLength(Math.min(count, 100));
      expect(feedback.descriptions).toHaveLength(Math.min(8, Math.max(0, 100 - count)));
      expect(feedback.score).toBe(Math.max(0, 100 - count * 15));
      expect(feedback.passed).toBe(false);
      expect(feedback.suggestions.some(item => item.ruleId === 'FEEDBACK_TRUNCATED')).toBe(count > 100);
      expect(feedback.suggestions.some(item => item.ruleId === 'DESCRIPTIONS_TRUNCATED')).toBe(count > 92 && count <= 100);
      expect(feedback.suggestions.length).toBeLessThanOrEqual(1);
      if (count > 92) expect(feedback.suggestions[0].message.en).toContain('descriptions');
    } finally {
      validator.mockRestore();
    }
  });
});
