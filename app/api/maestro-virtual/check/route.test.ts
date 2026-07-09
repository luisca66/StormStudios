import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { POST } from './route';

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
  it('does not treat prototype properties as lesson configurations', async () => {
    const response = await POST(midiRequest('__proto__'));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Lección desconocida' });
  });

  it('bounds unknown lesson identifiers without reflecting them', async () => {
    const response = await POST(midiRequest('x'.repeat(81)));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Faltan parámetros: midi y lessonId',
    });
  });

  it('normalizes unsupported locale values before returning SATB feedback', async () => {
    const response = await POST(midiRequest('05-leccion-4', 'en\nforged-log-line'));

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({
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
