/**
 * ejercicio.ts — Zustand store del ejercicio activo.
 *
 * Centraliza el estado que puede necesitar más de un componente:
 * patrón activo, fase, historial de rondas y score acumulado.
 * La lógica de timing y audio vive en EjercicioPlayer (local),
 * no en el store.
 */

import { create } from 'zustand';
import type { PatronRitmico } from '../_lib/generador/tipos';
import type { RondaResult } from '../_lib/evaluacion/ventana';
import { calcularPorcentajeVentana } from '../_lib/evaluacion/ventana';

export type FaseEjercicio = 'idle' | 'conteo' | 'tocando' | 'cerrado';

interface EjercicioState {
  patron: PatronRitmico | null;
  bpm: number;
  nivel: number;
  fase: FaseEjercicio;
  rondaActual: number;       // 0-based, se incrementa al cerrar cada vuelta
  rondas: RondaResult[];
  scoreActual: number;       // % calculado de la ventana móvil (0-100)

  // ── Actions ──
  iniciar: (patron: PatronRitmico, bpm: number, nivel: number) => void;
  setFase: (fase: FaseEjercicio) => void;
  pushRonda: (ronda: RondaResult) => void;
  reset: () => void;
}

const DEFAULTS = {
  patron: null as PatronRitmico | null,
  bpm: 80,
  nivel: 1,
  fase: 'idle' as FaseEjercicio,
  rondaActual: 0,
  rondas: [] as RondaResult[],
  scoreActual: 0,
};

export const useEjercicioStore = create<EjercicioState>((set) => ({
  ...DEFAULTS,

  iniciar: (patron, bpm, nivel) =>
    set({ patron, bpm, nivel, fase: 'conteo', rondaActual: 0, rondas: [], scoreActual: 0 }),

  setFase: (fase) => set({ fase }),

  pushRonda: (ronda) =>
    set((s) => {
      const rondas = [...s.rondas, ronda];
      return {
        rondas,
        rondaActual: s.rondaActual + 1,
        scoreActual: calcularPorcentajeVentana(rondas),
      };
    }),

  reset: () => set({ ...DEFAULTS }),
}));
