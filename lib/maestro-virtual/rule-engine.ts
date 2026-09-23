/**
 * rule-engine.ts
 * Motor de reglas para lecciones SATB (Fase 6).
 * Stub — se implementará con las reglas de cuarteto vocal.
 */

import type { VoiceData } from './midi-parser';

export interface RuleViolation {
  rule: string;
  severity: string;
  position?: number;
  degree?: string;
  titleEs: string;
  titleEn: string;
  detailEs: string;
  detailEn: string;
}

/**
 * Ejecuta el motor de reglas SATB sobre los datos MIDI parseados.
 * @param voiceData  Datos MIDI parseados (4 voces)
 * @param activeRules  IDs de las reglas activas para esta lección
 */
export function runRuleEngine(
  voiceData: VoiceData,
  activeRules: string[],
): RuleViolation[] {
  // Fase 6: implementar reglas SATB completas
  void voiceData;
  void activeRules;
  return [];
}
