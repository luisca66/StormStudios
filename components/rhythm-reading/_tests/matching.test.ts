import { describe, it, expect } from 'vitest';
import { matchOnsets, patronToExpectedMs } from '../_lib/evaluacion/matching';
import type { PatronRitmico } from '../_lib/generador/tipos';

// ── matchOnsets ───────────────────────────────────────────────────────────────

describe('matchOnsets', () => {
  const VENTANA = 100; // ±100 ms
  const LATENCIA = 0;  // sin latencia para los tests base
  const T0 = 1000;     // tiempo de referencia

  // ── Aciertos perfectos ────────────────────────────────────────────────────

  it('onsets perfectos → 100% de aciertos', () => {
    const expected = [T0, T0 + 1000, T0 + 2000, T0 + 3000];
    const received = [...expected]; // exactamente iguales
    const result = matchOnsets(expected, received, VENTANA, LATENCIA);

    expect(result.totalBeats).toBe(4);
    expect(result.aciertos).toBe(4);
    expect(result.score).toBe(100);
    result.beats.forEach((b) => {
      expect(b.acierto).toBe(true);
      expect(b.errorMs).toBe(0);
    });
  });

  it('onsets dentro de la ventana pero no perfectos → aciertos', () => {
    const expected = [T0, T0 + 1000, T0 + 2000];
    const received = [T0 + 50, T0 + 1000 - 80, T0 + 2000 + 99]; // todos ≤ 100 ms de error
    const result = matchOnsets(expected, received, VENTANA, LATENCIA);

    expect(result.aciertos).toBe(3);
    expect(result.score).toBe(100);
    result.beats.forEach((b) => expect(b.acierto).toBe(true));
  });

  // ── Fuera de ventana ──────────────────────────────────────────────────────

  it('onsets fuera de ventana → 0% de aciertos', () => {
    const expected = [T0, T0 + 1000, T0 + 2000];
    const received = [T0 + 200, T0 + 1200, T0 + 2200]; // 200 ms > 100 ms ventana
    const result = matchOnsets(expected, received, VENTANA, LATENCIA);

    expect(result.aciertos).toBe(0);
    expect(result.score).toBe(0);
    result.beats.forEach((b) => expect(b.acierto).toBe(false));
  });

  it('onsets justo en el límite de la ventana → acierto', () => {
    const expected = [T0];
    const received = [T0 + VENTANA]; // exactamente en el límite: ≤ ventana → acierto
    const result = matchOnsets(expected, received, VENTANA, LATENCIA);
    expect(result.aciertos).toBe(1);
  });

  it('onsets justo un ms fuera de la ventana → fallo', () => {
    const expected = [T0];
    const received = [T0 + VENTANA + 1]; // 1 ms más allá
    const result = matchOnsets(expected, received, VENTANA, LATENCIA);
    expect(result.aciertos).toBe(0);
  });

  // ── Sin onsets ────────────────────────────────────────────────────────────

  it('sin onsets recibidos → 0 aciertos', () => {
    const expected = [T0, T0 + 1000];
    const result = matchOnsets(expected, [], VENTANA, LATENCIA);

    expect(result.aciertos).toBe(0);
    expect(result.score).toBe(0);
    result.beats.forEach((b) => {
      expect(b.acierto).toBe(false);
      expect(b.matchedOnsetMs).toBeNull();
    });
  });

  it('sin beats esperados → score 0 y array vacío', () => {
    const result = matchOnsets([], [T0, T0 + 500], VENTANA, LATENCIA);
    expect(result.totalBeats).toBe(0);
    expect(result.score).toBe(0);
    expect(result.beats).toHaveLength(0);
  });

  // ── Cada onset se usa una sola vez ────────────────────────────────────────

  it('un onset no puede ganar dos beats distintos', () => {
    // Dos beats cercanos; un solo onset en medio de los dos
    const expected = [T0, T0 + 100]; // muy juntos (100 ms entre beats)
    const received = [T0 + 50];       // equidistante: 50 ms de cada beat
    const ventana = 80;
    const result = matchOnsets(expected, received, ventana, LATENCIA);

    // Solo un beat puede ganar ese onset
    expect(result.aciertos).toBe(1);
  });

  // ── Corrección de latencia ────────────────────────────────────────────────

  it('resta outputLatency a los tiempos esperados antes de comparar', () => {
    const LATENCIA_MS = 30;
    // El alumno oye el beat 30 ms tarde, así que toca 30 ms después del expected raw.
    // Con latencia correcta, eso debe ser acierto perfecto (error = 0).
    const expected = [T0];
    const received = [T0 + LATENCIA_MS]; // tocó 30 ms "tarde" según el reloj crudo

    const result = matchOnsets(expected, received, VENTANA, LATENCIA_MS);
    expect(result.aciertos).toBe(1);
    expect(result.beats[0].errorMs).toBe(0);
  });

  it('sin corrección de latencia, un onset tardío por la latencia falla', () => {
    const LATENCIA_MS = 30;
    const ventanaEstricta = 10; // ventana muy pequeña
    const expected = [T0];
    const received = [T0 + LATENCIA_MS]; // 30 ms tarde

    // Sin corrección de latencia y ventana 10 ms → falla
    const result = matchOnsets(expected, received, ventanaEstricta, 0);
    expect(result.aciertos).toBe(0);

    // Con corrección → acierto perfecto
    const result2 = matchOnsets(expected, received, ventanaEstricta, LATENCIA_MS);
    expect(result2.aciertos).toBe(1);
  });

  // ── Información de error (errorMs) ────────────────────────────────────────

  it('errorMs positivo cuando el alumno toca tarde', () => {
    const expected = [T0];
    const received = [T0 + 40];
    const result = matchOnsets(expected, received, VENTANA, LATENCIA);
    expect(result.beats[0].errorMs).toBe(40);
  });

  it('errorMs negativo cuando el alumno toca temprano', () => {
    const expected = [T0];
    const received = [T0 - 40];
    const result = matchOnsets(expected, received, VENTANA, LATENCIA);
    expect(result.beats[0].errorMs).toBe(-40);
  });

  it('errorMs es null cuando no hay match', () => {
    const expected = [T0];
    const received = [T0 + 500]; // fuera de ventana
    const result = matchOnsets(expected, received, VENTANA, LATENCIA);
    expect(result.beats[0].errorMs).toBeNull();
    expect(result.beats[0].matchedOnsetMs).toBeNull();
  });

  // ── Score parcial ─────────────────────────────────────────────────────────

  it('score parcial 50% con 2 de 4 beats acertados', () => {
    const expected = [T0, T0 + 1000, T0 + 2000, T0 + 3000];
    const received = [T0, T0 + 2000]; // solo beats 0 y 2
    const result = matchOnsets(expected, received, VENTANA, LATENCIA);

    expect(result.aciertos).toBe(2);
    expect(result.score).toBe(50);
  });
});

// ── patronToExpectedMs ────────────────────────────────────────────────────────

describe('patronToExpectedMs', () => {
  const BPM = 60; // beat = 1000 ms
  const T0 = 5000;

  it('4 negras en 4/4 → 4 tiempos separados por 1000 ms', () => {
    const patron: PatronRitmico = {
      compas: '4/4',
      compases: [['q', 'q', 'q', 'q']],
    };
    const result = patronToExpectedMs(patron, T0, BPM);
    expect(result).toEqual([T0, T0 + 1000, T0 + 2000, T0 + 3000]);
  });

  it('blanca + negra en 3/4 → [t0, t0+2000] (inicio de cada nota)', () => {
    // La función retorna el tiempo de INICIO de cada nota.
    // h (blanca) → inicia en T0; q (negra) → inicia en T0+2000.
    // El final de la negra (T0+3000) no aparece en el array.
    const patron: PatronRitmico = {
      compas: '3/4',
      compases: [['h', 'q']],
    };
    const result = patronToExpectedMs(patron, T0, BPM);
    expect(result).toEqual([T0, T0 + 2000]);
  });

  it('corcheas a 120 bpm → separadas por 500 ms', () => {
    const patron: PatronRitmico = {
      compas: '2/4',
      compases: [['8', '8', '8', '8']],
    };
    const BPM120 = 120; // beat = 500 ms
    const result = patronToExpectedMs(patron, T0, BPM120);
    expect(result).toEqual([T0, T0 + 250, T0 + 500, T0 + 750]);
  });

  it('múltiples compases se encadenan correctamente', () => {
    const patron: PatronRitmico = {
      compas: '4/4',
      compases: [
        ['q', 'q'],
        ['h'],
      ],
    };
    const result = patronToExpectedMs(patron, T0, BPM);
    // q=1000, q=1000 → compas 1 termina en T0+2000
    // h=2000 → T0+2000
    expect(result).toEqual([T0, T0 + 1000, T0 + 2000]);
  });

  it('semicorchea a 60 bpm dura 250 ms', () => {
    const patron: PatronRitmico = {
      compas: '4/4',
      compases: [['16', '16']],
    };
    const result = patronToExpectedMs(patron, T0, BPM);
    expect(result).toEqual([T0, T0 + 250]);
  });
});
