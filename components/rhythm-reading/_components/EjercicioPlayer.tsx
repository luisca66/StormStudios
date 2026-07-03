'use client';

/**
 * EjercicioPlayer.tsx — Integración completa: notación + metrónomo + captura + evaluación.
 *
 * Flujo:
 *   idle → [Play] → conteo (1 compás de clicks sin captura)
 *        → tocando (loop: toca, evalúa, acumula rondas)
 *        → cerrado (umbral alcanzado → acierto.mp3 + mensaje)
 *
 * El cursor visual (barra de progreso) lee AudioContext.currentTime vía rAF.
 * El timing de audio NO usa setTimeout/setInterval para nada crítico.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { NotacionRitmica } from './NotacionRitmica';
import { attachInputCapture } from '../_lib/input/captura';
import { matchOnsets, patronToExpectedMs } from '../_lib/evaluacion/matching';
import { calcularVentana } from '../_lib/evaluacion/tolerancia';
import {
  calcularPorcentajeVentana,
  ejercicioCerrado,
  VENTANA_RONDAS,
} from '../_lib/evaluacion/ventana';
import { useEjercicioStore } from '../_store/ejercicio';
import { generarEjercicio, nuevaSemilla } from '../_lib/generador/generador';
import { REGLAS_V1 } from '../_lib/generador/reglas';
import type { ReglaNivel } from '../_lib/generador/reglas';
import { TIMBRES, DEFAULT_TIMBRE_ID, preloadTimbre, playTimbre, preloadAllTimbres } from '../_lib/audio/timbres';
import { DrumVisual } from './DrumVisual';
import type { RondaResult } from '../_lib/evaluacion/ventana';
import type { TimbreId } from '../_lib/audio/timbres';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DUR_BEATS: Record<string, number> = {
  w: 4,   wr: 4,
  h: 2,   hr: 2,
  hd: 3,  hdr: 3,
  q: 1,   qr: 1,
  qd: 1.5, qdr: 1.5,
  '8': 0.5,  '8r': 0.5,
  '8d': 0.75, '8dr': 0.75,
  '16': 0.25, '16r': 0.25,
};

function patronDurSecs(compas: string, compases: string[][], bpm: number): number {
  const beatSec = 60 / bpm;
  return compases.flat().reduce((s, d) => s + (DUR_BEATS[d] ?? 1) * beatSec, 0);
}

function patronTotalBeats(compas: string, compases: string[][]): number {
  return parseInt(compas.split('/')[0]) * compases.length;
}

const BPM_MIN = 40;
const BPM_MAX = 180;

type Fase = 'idle' | 'tocando' | 'cerrado';
type RhythmReadingLocale = 'es' | 'en';

const COPY = {
  es: {
    headerPrefix: 'Lectura rítmica',
    threshold: 'umbral',
    level: 'Nivel',
    newExercise: 'Nuevo ejercicio',
    completed: 'Ejercicio completado',
    stopped: 'Detenido',
    startPrompt: 'Pulsa Iniciar para comenzar',
    tapHint: 'toca aquí · barra espaciadora',
    timbre: 'Timbre de toque',
    round: 'Vuelta',
    repeat: 'Repetir',
    next: 'Siguiente',
    stop: 'Detener',
    start: 'Iniciar',
    completedLine: 'completado',
    rounds: 'vueltas',
    exercise: 'ejercicio',
    progressNoteStart: 'La evaluación cierra al mantener',
    in: 'en',
    progressNoteEnd:
      'vueltas consecutivas. El progreso vive en este navegador y se pierde al limpiar caché.',
  },
  en: {
    headerPrefix: 'Rhythm reading',
    threshold: 'threshold',
    level: 'Level',
    newExercise: 'New exercise',
    completed: 'Exercise completed',
    stopped: 'Stopped',
    startPrompt: 'Press Start to begin',
    tapHint: 'tap here · spacebar',
    timbre: 'Tap sound',
    round: 'Round',
    repeat: 'Repeat',
    next: 'Next',
    stop: 'Stop',
    start: 'Start',
    completedLine: 'completed',
    rounds: 'rounds',
    exercise: 'exercise',
    progressNoteStart: 'The evaluation closes when you maintain',
    in: 'for',
    progressNoteEnd:
      'consecutive rounds. Progress lives in this browser and is lost if cache is cleared.',
  },
};

const LEVEL_NAMES_EN: Record<number, string> = {
  1: 'Getting Started',
  2: 'Basic',
  3: 'Eighth Notes',
  4: 'Mixed',
  5: 'Advanced',
  6: 'Expert',
};

const TIMBRE_LABELS_EN: Partial<Record<TimbreId, string>> = {
  hh: 'Hi-Hat',
  sd: 'Snare',
  bd: 'Bass Drum',
  hho: 'Open HH',
  t1: 'Tom 1',
  ft: 'Floor Tom',
  ride: 'Ride',
  crash: 'Crash',
};

function getLevelName(regla: ReglaNivel, locale: RhythmReadingLocale) {
  return locale === 'en' ? LEVEL_NAMES_EN[regla.nivel] ?? regla.nombre : regla.nombre;
}

function getTimbreLabel(timbre: (typeof TIMBRES)[number], locale: RhythmReadingLocale) {
  return locale === 'en' ? TIMBRE_LABELS_EN[timbre.id] ?? timbre.label : timbre.label;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function EjercicioPlayer({
  locale = 'es',
}: {
  locale?: RhythmReadingLocale;
}) {
  const copy = COPY[locale];
  // ── UI state ──
  const [nivelIdx, setNivelIdx] = useState(0);
  // Seed estable en SSR (1); se reemplaza por un valor aleatorio real
  // después del montaje en el cliente para evitar mismatch de hidratación.
  const [seed, setSeed] = useState(1);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- swap único post-montaje; el re-render extra es intencional
  useEffect(() => { setSeed(nuevaSemilla()); }, []);
  const [bpm, setBpm] = useState(REGLAS_V1[0].bpmDefault);
  const [fase, setFaseLocal] = useState<Fase>('idle');
  const [beatInCompas, setBeatInCompas] = useState(-1);
  const [countdownNum, setCountdownNum] = useState<number | null>(null);
  const [rondas, setRondas] = useState<RondaResult[]>([]);
  const [score, setScore] = useState(0);
  const [closedBySuccess, setClosedBySuccess] = useState(false);
  const [timbreId, setTimbreId] = useState<TimbreId>(DEFAULT_TIMBRE_ID);
  const timbreIdRef = useRef<TimbreId>(DEFAULT_TIMBRE_ID);
  const [hitKey, setHitKey] = useState(0);

  // ── Regla y patrón actuales (derivados del nivel + seed) ──
  const regla: ReglaNivel = REGLAS_V1[nivelIdx];
  const patron = useMemo(
    () => generarEjercicio(seed, REGLAS_V1[nivelIdx]),
    [seed, nivelIdx],
  );

  // ── Store ──
  const storeIniciar = useEjercicioStore((s) => s.iniciar);
  const storeSetFase = useEjercicioStore((s) => s.setFase);
  const storePushRonda = useEjercicioStore((s) => s.pushRonda);
  const storeReset = useEjercicioStore((s) => s.reset);

  // ── Refs (timing crítico, sin re-render) ──────────────────────────────────
  const bpmRef = useRef(bpm);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  const patronRef = useRef(patron);
  useEffect(() => { patronRef.current = patron; }, [patron]);

  const reglaRef = useRef(regla);
  useEffect(() => { reglaRef.current = regla; }, [regla]);

  // Sincronizar timbre ref y pre-cargar al cambiar selección
  useEffect(() => {
    timbreIdRef.current = timbreId;
    preloadTimbre(timbreId);
  }, [timbreId]);

  const faseRef = useRef<Fase>('idle');
  const totalBeatsFiredRef = useRef(0);
  const roundStartAudioTimeRef = useRef(0);
  const roundStartPerfMsRef = useRef(0);
  const onsetsRef = useRef<number[]>([]);
  const rondasRef = useRef<RondaResult[]>([]);
  const outputLatencyMsRef = useRef(0);
  const captureActiveRef = useRef(false);

  const tapZoneRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const cleanupCaptureRef = useRef<(() => void) | null>(null);
  const rafRef = useRef<number | null>(null);

  // Cached audio module refs
  type EngineModule = typeof import('../_lib/audio/engine');
  type MetroModule = typeof import('../_lib/audio/metronomo');
  const engineRef = useRef<EngineModule | null>(null);
  const metroRef = useRef<MetroModule | null>(null);

  const getAudio = useCallback(async () => {
    if (!engineRef.current || !metroRef.current) {
      [engineRef.current, metroRef.current] = await Promise.all([
        import('../_lib/audio/engine'),
        import('../_lib/audio/metronomo'),
      ]);
    }
    return { engine: engineRef.current!, metro: metroRef.current! };
  }, []);

  // ── Cursor rAF ───────────────────────────────────────────────────────────

  const startCursorLoop = useCallback(() => {
    const loop = () => {
      if (!engineRef.current) return;
      const ctx = engineRef.current.getAudioContext();
      const p = patronRef.current;
      const durSecs = patronDurSecs(p.compas, p.compases, bpmRef.current);
      const elapsed = ctx.currentTime - roundStartAudioTimeRef.current;
      const pct = durSecs > 0 ? Math.min(Math.max(elapsed / durSecs, 0), 1) * 100 : 0;
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${pct}%`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const stopCursorLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (progressBarRef.current) progressBarRef.current.style.width = '0%';
  }, []);

  // ── Evaluación de vuelta ─────────────────────────────────────────────────

  const evaluateRound = useCallback(() => {
    const p = patronRef.current;
    const b = bpmRef.current;
    const r = reglaRef.current;
    const expected = patronToExpectedMs(p, roundStartPerfMsRef.current, b);
    const ventana = calcularVentana(b, r.porcentajeToleranacia);
    const result = matchOnsets(expected, onsetsRef.current, ventana, outputLatencyMsRef.current);

    const ronda: RondaResult = { aciertos: result.aciertos, totalBeats: result.totalBeats };
    const newRondas = [...rondasRef.current, ronda];
    rondasRef.current = newRondas;
    setRondas(newRondas);
    setScore(calcularPorcentajeVentana(newRondas));
    storePushRonda(ronda);

    return newRondas;
  }, [storePushRonda]);

  // ── Cierre del ejercicio ─────────────────────────────────────────────────

  const cerrarEjercicio = useCallback(async (success: boolean) => {
    const { engine, metro } = await getAudio();
    metro.stopMetronomo();

    if (cleanupCaptureRef.current) {
      cleanupCaptureRef.current();
      cleanupCaptureRef.current = null;
    }
    captureActiveRef.current = false;
    stopCursorLoop();

    if (success) {
      await engine.initAudio();
      const fb = await import('../_lib/audio/feedback');
      fb.playAcierto();
    }

    faseRef.current = 'cerrado';
    setFaseLocal('cerrado');
    storeSetFase('cerrado');
    setClosedBySuccess(success);
    setBeatInCompas(-1);
    setCountdownNum(null);
  }, [getAudio, stopCursorLoop, storeSetFase]);

  // ── onBeat callback ──────────────────────────────────────────────────────

  const onBeat = useCallback((beatIndex: number, time: number) => {
    if (faseRef.current === 'cerrado') return;

    const p = patronRef.current;
    const numBeats = parseInt(p.compas.split('/')[0]);
    const totalPatBeats = patronTotalBeats(p.compas, p.compases);
    const totalFired = totalBeatsFiredRef.current;
    totalBeatsFiredRef.current++;

    // ── Conteo (1 compás antes del patrón) ──
    if (totalFired < numBeats) {
      const n = numBeats - totalFired; // numBeats → 1
      setCountdownNum(n);
      setBeatInCompas(totalFired % numBeats);
      return;
    }

    // ── Patrón ──
    setCountdownNum(null);
    const patBeat = totalFired - numBeats;
    const beatInPattern = patBeat % totalPatBeats;
    setBeatInCompas(beatInPattern % numBeats);

    // ── Límite de vuelta ──
    if (beatInPattern === 0) {
      // Evaluar vuelta anterior
      if (patBeat > 0) {
        const newRondas = evaluateRound();
        if (ejercicioCerrado(newRondas, reglaRef.current.nivel)) {
          cerrarEjercicio(true);
          return;
        }
      }

      // Iniciar nueva vuelta
      const audioNow = engineRef.current?.getAudioContext().currentTime ?? 0;
      const perfNow = performance.now();
      roundStartAudioTimeRef.current = time;
      // Estimar el performance.now() cuando suene el beat (lookahead)
      roundStartPerfMsRef.current = perfNow + (time - audioNow) * 1000;
      onsetsRef.current = [];

      // Activar captura (solo en primera vuelta)
      if (!captureActiveRef.current && tapZoneRef.current) {
        captureActiveRef.current = true;
        faseRef.current = 'tocando';
        setFaseLocal('tocando');
        storeSetFase('tocando');
        cleanupCaptureRef.current = attachInputCapture(tapZoneRef.current, (t) => {
          onsetsRef.current.push(t);
          // Feedback sonoro + visual en cada toque
          playTimbre(timbreIdRef.current);
          setHitKey((k) => k + 1);
        });
        startCursorLoop();
      }
    }
  }, [evaluateRound, cerrarEjercicio, startCursorLoop, storeSetFase]);

  // ── Play / Stop ──────────────────────────────────────────────────────────

  const handlePlay = useCallback(async () => {
    const p = patronRef.current;
    const b = bpmRef.current;

    const { engine, metro } = await getAudio();
    await engine.initAudio();
    outputLatencyMsRef.current = engine.getTotalLatencyMs();

    // Pre-cargar todos los timbres en background — listos antes de que
    // termine la cuenta regresiva (~2-3 s a 80 bpm)
    preloadAllTimbres();

    // Reset
    totalBeatsFiredRef.current = 0;
    onsetsRef.current = [];
    rondasRef.current = [];
    captureActiveRef.current = false;
    setRondas([]);
    setScore(0);
    setBeatInCompas(-1);
    setCountdownNum(null);
    setClosedBySuccess(false);
    stopCursorLoop();

    storeIniciar(p, b, reglaRef.current.nivel);
    faseRef.current = 'tocando'; // kept as 'tocando' in ref; UI shows 'conteo' via countdownNum

    metro.startMetronomo({
      bpm: b,
      compas: p.compas,
      numCompases: 9999,
      onBeat,
    });

    // Briefly mark as "running" for UI
    setFaseLocal('tocando');
  }, [getAudio, onBeat, stopCursorLoop, storeIniciar]);

  const handleStop = useCallback(async () => {
    await cerrarEjercicio(false);
    storeReset();
  }, [cerrarEjercicio, storeReset]);

  const handleReset = useCallback(() => {
    storeReset();
    faseRef.current = 'idle';
    setFaseLocal('idle');
    setRondas([]);
    setScore(0);
    setBeatInCompas(-1);
    setCountdownNum(null);
    setClosedBySuccess(false);
    stopCursorLoop();
  }, [storeReset, stopCursorLoop]);

  // ── Nuevo ejercicio (misma nivel, seed diferente) ────────────────────────

  const handleNuevoEjercicio = useCallback(() => {
    if (fase === 'tocando') return;
    setSeed(nuevaSemilla());
    // Reset estado de evaluación
    storeReset();
    faseRef.current = 'idle';
    setFaseLocal('idle');
    setRondas([]);
    setScore(0);
    setBeatInCompas(-1);
    setCountdownNum(null);
    setClosedBySuccess(false);
    stopCursorLoop();
  }, [fase, storeReset, stopCursorLoop]);

  // ── Cambio de nivel ──────────────────────────────────────────────────────

  const handleNivelChange = useCallback((idx: number) => {
    if (fase === 'tocando') return;
    setNivelIdx(idx);
    setSeed(nuevaSemilla());
    setBpm(REGLAS_V1[idx].bpmDefault);
    storeReset();
    faseRef.current = 'idle';
    setFaseLocal('idle');
    setRondas([]);
    setScore(0);
    setBeatInCompas(-1);
    setCountdownNum(null);
    setClosedBySuccess(false);
    stopCursorLoop();
  }, [fase, storeReset, stopCursorLoop]);

  const cleanupOnUnmount = useCallback(() => {
    metroRef.current?.stopMetronomo();
    cleanupCaptureRef.current?.();
    stopCursorLoop();
  }, [stopCursorLoop]);

  // Limpiar al desmontar
  useEffect(() => cleanupOnUnmount, [cleanupOnUnmount]);

  // ── Derivados de render ──────────────────────────────────────────────────

  const numBeats = parseInt(patron.compas.split('/')[0]);
  const isRunning = fase === 'tocando';
  const isCerrado = fase === 'cerrado';
  const isIdle = fase === 'idle';

  const ventanaMs = Math.round(calcularVentana(bpm, regla.porcentajeToleranacia));
  const umbral = regla.umbralCierre;

  // ── BPM autorepeat ───────────────────────────────────────────────────────

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clampBpm = (v: number) => Math.max(BPM_MIN, Math.min(BPM_MAX, v));
  const changeBpm = (delta: number) => setBpm((p) => clampBpm(p + delta));

  const startPress = (delta: number) => {
    changeBpm(delta);
    pressTimer.current = setTimeout(() => {
      repeatTimer.current = setInterval(() => changeBpm(delta), 80);
    }, 400);
  };
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (repeatTimer.current) clearInterval(repeatTimer.current);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="ss-glass rounded-2xl mt-8" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-2">
        <p className="ss-mono text-xs uppercase tracking-widest" style={{ color: 'rgba(139,92,246,0.8)' }}>
          {copy.headerPrefix} · {getLevelName(regla, locale)}
        </p>
        <div className="flex items-center gap-3">
          <span className="ss-mono text-xs" style={{ color: 'rgba(240,238,255,0.3)' }}>
            ±{ventanaMs} ms · {copy.threshold} {umbral}%
          </span>
        </div>
      </div>

      {/* ── Selector de nivel ── */}
      <div className="px-6 pb-3">
        <p className="ss-mono text-xs mb-1.5" style={{ color: 'rgba(240,238,255,0.3)' }}>{copy.level}</p>
        <div className="flex gap-1.5 flex-wrap">
          {REGLAS_V1.map((r, i) => {
            const sel = nivelIdx === i;
            return (
              <button key={r.nivel}
                onClick={() => handleNivelChange(i)}
                disabled={isRunning}
                className="ss-mono text-xs px-3 py-1 rounded-lg transition-all"
                style={{
                  background: sel ? 'rgba(139,92,246,0.22)' : 'rgba(255,255,255,0.04)',
                  border: sel
                    ? '1px solid rgba(139,92,246,0.55)'
                    : '1px solid rgba(255,255,255,0.08)',
                  color: sel
                    ? '#c4b5fd'
                    : isRunning
                    ? 'rgba(240,238,255,0.2)'
                    : 'rgba(240,238,255,0.5)',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                }}>
                {r.nivel} · {getLevelName(r, locale)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Notación con barra de progreso ── */}
      <div className="px-6 pb-2">
        <div className="rounded-xl overflow-hidden" style={{ background: '#fff' }}>
          <NotacionRitmica locale={locale} patron={patron} />
        </div>
        {/* Barra de progreso (cursor sincronizado con AudioContext) */}
        <div className="mt-1.5 rounded-full overflow-hidden"
          style={{ height: 3, background: 'rgba(255,255,255,0.07)' }}>
          <div ref={progressBarRef}
            style={{
              height: '100%',
              width: '0%',
              background: 'linear-gradient(90deg, #8b5cf6, #34d399)',
              transition: 'none',
              borderRadius: 9999,
            }} />
        </div>
      </div>

      {/* ── Seed + Nuevo ejercicio ── */}
      <div className="px-6 pb-2 flex items-center gap-3">
        <span className="ss-mono text-xs" style={{ color: 'rgba(240,238,255,0.25)' }}>
          #{seed}
        </span>
        <button
          onClick={handleNuevoEjercicio}
          disabled={isRunning}
          className="ss-mono text-xs px-3 py-1 rounded-lg transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: isRunning ? 'rgba(240,238,255,0.2)' : 'rgba(240,238,255,0.5)',
            cursor: isRunning ? 'not-allowed' : 'pointer',
          }}>
          ↺ {copy.newExercise}
        </button>
      </div>

      {/* ── Zona de toque con imagen del instrumento ── */}
      <div
        ref={tapZoneRef}
        className="mx-6 mb-4 rounded-xl select-none relative overflow-hidden"
        style={{
          height: 140,
          background: isRunning && countdownNum === null
            ? 'rgba(139,92,246,0.08)'
            : 'rgba(255,255,255,0.02)',
          border: isRunning && countdownNum === null
            ? '1.5px solid rgba(139,92,246,0.35)'
            : '1.5px dashed rgba(255,255,255,0.07)',
          cursor: isRunning && countdownNum === null ? 'pointer' : 'default',
          touchAction: 'none',
          transition: 'border-color 0.2s, background 0.2s',
        }}>

        {/* Imagen del tambor — siempre visible */}
        <div style={{ position: 'absolute', inset: 0, padding: '6px 0 0' }}>
          <DrumVisual
            timbreId={timbreId}
            hitKey={hitKey}
            dim={isIdle || isCerrado}
          />
        </div>

        {/* Overlay: cuenta regresiva */}
        {countdownNum !== null && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10,8,20,0.55)',
            backdropFilter: 'blur(2px)',
          }}>
            <span className="ss-serif" style={{ fontSize: '3rem', color: '#c4b5fd', lineHeight: 1 }}>
              {countdownNum}
            </span>
          </div>
        )}

        {/* Overlay: estado idle / cerrado */}
        {(isIdle || isCerrado) && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: 10,
          }}>
            <span className="ss-mono text-xs" style={{
              color: isCerrado && closedBySuccess
                ? '#34d399'
                : 'rgba(240,238,255,0.35)',
              background: 'rgba(5,5,8,0.7)',
              padding: '2px 10px',
              borderRadius: 6,
            }}>
              {isCerrado
                ? (closedBySuccess ? `✓ ${copy.completed}` : copy.stopped)
                : copy.startPrompt}
            </span>
          </div>
        )}

        {/* Hint sutil durante el toque */}
        {isRunning && countdownNum === null && (
          <div style={{
            position: 'absolute', bottom: 8, left: 0, right: 0,
            textAlign: 'center', pointerEvents: 'none',
          }}>
            <span className="ss-mono" style={{ fontSize: '0.65rem', color: 'rgba(139,92,246,0.5)' }}>
              {copy.tapHint}
            </span>
          </div>
        )}
      </div>

      {/* ── Selector de timbre ── */}
      <div className="px-6 pb-3">
        <p className="ss-mono text-xs mb-1.5" style={{ color: 'rgba(240,238,255,0.3)' }}>
          {copy.timbre}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TIMBRES.map((t) => {
            const sel = timbreId === t.id;
            return (
              <button key={t.id}
                onClick={() => setTimbreId(t.id)}
                className="ss-mono text-xs px-3 py-1 rounded-lg transition-all"
                style={{
                  background: sel ? 'rgba(139,92,246,0.22)' : 'rgba(255,255,255,0.04)',
                  border: sel ? '1px solid rgba(139,92,246,0.55)' : '1px solid rgba(255,255,255,0.08)',
                  color: sel ? '#c4b5fd' : 'rgba(240,238,255,0.5)',
                }}>
                {getTimbreLabel(t, locale)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Fila inferior: beat dots + rondas + score ── */}
      <div className="px-6 pb-4 flex items-center gap-4 flex-wrap">

        {/* Beat dots */}
        <div className="flex gap-1.5 items-center">
          {Array.from({ length: numBeats }).map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-75"
              style={{
                width: i === 0 ? 13 : 9,
                height: i === 0 ? 13 : 9,
                background: isRunning && beatInCompas === i
                  ? (i === 0 ? '#34d399' : '#c4b5fd')
                  : 'rgba(255,255,255,0.1)',
                boxShadow: isRunning && beatInCompas === i
                  ? (i === 0 ? '0 0 8px #34d399' : '0 0 6px #c4b5fd')
                  : 'none',
              }} />
          ))}
        </div>

        {/* Vuelta counter */}
        {rondas.length > 0 && (
          <span className="ss-mono text-xs" style={{ color: 'rgba(240,238,255,0.4)' }}>
            {copy.round} {rondas.length} · {Math.min(rondas.length, VENTANA_RONDAS)}/{VENTANA_RONDAS}
          </span>
        )}

        {/* Score bar */}
        {rondas.length > 0 && (
          <div className="flex items-center gap-2 flex-1" style={{ minWidth: 120 }}>
            <div className="flex-1 rounded-full overflow-hidden"
              style={{ height: 5, background: 'rgba(255,255,255,0.07)' }}>
              <div style={{
                height: '100%',
                width: `${score}%`,
                background: score >= umbral ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171',
                borderRadius: 9999,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <span className="ss-serif" style={{
              fontSize: '1rem',
              color: score >= umbral ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171',
              minWidth: 40,
              textAlign: 'right',
            }}>
              {score}%
            </span>
          </div>
        )}
      </div>

      {/* ── Controles: BPM + Compás (label) + Play/Stop ── */}
      <div className="px-6 pb-5 flex items-center gap-3 flex-wrap border-t"
        style={{ borderColor: 'rgba(255,255,255,0.05)', paddingTop: 14 }}>

        {/* BPM */}
        <button onPointerDown={() => startPress(-1)} onPointerUp={endPress} onPointerLeave={endPress}
          disabled={isRunning || bpm <= BPM_MIN}
          className="ss-mono rounded-lg select-none"
          style={{
            width: 30, height: 30, fontSize: '1.1rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: bpm <= BPM_MIN || isRunning ? 'rgba(255,255,255,0.2)' : 'rgba(240,238,255,0.8)',
            cursor: bpm <= BPM_MIN || isRunning ? 'not-allowed' : 'pointer',
          }}>−</button>

        <div style={{ minWidth: 58, textAlign: 'center' }}>
          <span className="ss-serif" style={{ fontSize: '1.5rem', color: '#f0eeff', lineHeight: 1 }}>
            {bpm}
          </span>
          <span className="ss-mono text-xs ml-1" style={{ color: 'rgba(240,238,255,0.3)' }}>bpm</span>
        </div>

        <button onPointerDown={() => startPress(1)} onPointerUp={endPress} onPointerLeave={endPress}
          disabled={isRunning || bpm >= BPM_MAX}
          className="ss-mono rounded-lg select-none"
          style={{
            width: 30, height: 30, fontSize: '1.1rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: bpm >= BPM_MAX || isRunning ? 'rgba(255,255,255,0.2)' : 'rgba(240,238,255,0.8)',
            cursor: bpm >= BPM_MAX || isRunning ? 'not-allowed' : 'pointer',
          }}>+</button>

        <input type="range" min={BPM_MIN} max={BPM_MAX} value={bpm}
          disabled={isRunning}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="flex-1"
          style={{ accentColor: '#8b5cf6', height: 3, opacity: isRunning ? 0.3 : 1 }} />

        {/* Compás label */}
        <span className="ss-mono text-xs px-3 py-1 rounded-lg"
          style={{
            background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.25)',
            color: '#c4b5fd',
          }}>
          {patron.compas}
        </span>

        {/* Play / Stop / Repetir */}
        {isCerrado ? (
          <div className="flex gap-2">
            <button onClick={handleReset}
              className="ss-mono text-sm px-4 py-2 rounded-xl transition-all"
              style={{
                background: 'rgba(139,92,246,0.15)',
                border: '1px solid rgba(139,92,246,0.4)',
                color: '#c4b5fd',
              }}>
              ↺ {copy.repeat}
            </button>
            <button onClick={handleNuevoEjercicio}
              className="ss-mono text-sm px-4 py-2 rounded-xl transition-all"
              style={{
                background: 'rgba(16,185,129,0.10)',
                border: '1px solid rgba(16,185,129,0.3)',
                color: '#6ee7b7',
              }}>
              → {copy.next}
            </button>
          </div>
        ) : isRunning ? (
          <button onClick={handleStop}
            className="ss-mono text-sm px-5 py-2 rounded-xl transition-all"
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.35)',
              color: '#fca5a5',
            }}>
            ■ {copy.stop}
          </button>
        ) : (
          <button onClick={handlePlay}
            className="ss-mono text-sm px-5 py-2 rounded-xl transition-all"
            style={{
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.35)',
              color: '#6ee7b7',
            }}>
            ▶ {copy.start}
          </button>
        )}
      </div>

      {/* ── Resultado final (cuando cerrado por éxito) ── */}
      {isCerrado && closedBySuccess && (
        <div className="mx-6 mb-5 rounded-xl p-4 text-center"
          style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}>
          <p className="ss-serif mb-1" style={{ fontSize: '2rem', color: '#34d399', lineHeight: 1 }}>
            {score}%
          </p>
          <p className="ss-mono text-xs" style={{ color: 'rgba(52,211,153,0.7)' }}>
            {copy.level} {regla.nivel} {copy.completedLine} · {rondas.length} {copy.rounds} · {copy.exercise} #{seed}
          </p>
        </div>
      )}

      {/* ── Nota de progreso ── */}
      <p className="px-6 pb-4 ss-mono text-xs" style={{ color: 'rgba(240,238,255,0.15)' }}>
        {copy.progressNoteStart} ≥{umbral}% {copy.in} {VENTANA_RONDAS} {copy.progressNoteEnd}
      </p>
    </div>
  );
}
