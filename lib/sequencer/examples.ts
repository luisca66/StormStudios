export type SequencerExample = {
  id: string;
  titleEs: string;
  titleEn: string;
  mode: "single" | "satb";
  text: string;
};

export const SEQUENCER_EXAMPLES: SequencerExample[] = [
  {
    id: "c-major-scale-ascending",
    titleEs: "Escala de Do Mayor Ascendente (2 compases)",
    titleEn: "Ascending C Major Scale (2 measures)",
    mode: "single",
    text: `voz melody
compas 1
C4 negra; D4 negra; E4 negra; F4 negra
compas 2
G4 negra; A4 negra; B4 negra; C5 negra`,
  },
  {
    id: "harmonic-cadence-i-iv-v-i",
    titleEs: "Progresión Armónica I - IV - V - I",
    titleEn: "Harmonic Progression I - IV - V - I",
    mode: "single",
    text: `voz melody
compas 1
[C4 E4 G4] blanca; [F4 A4 C5] blanca
compas 2
[G4 B4 D5] blanca; [C4 E4 G4] blanca`,
  },
  {
    id: "satb-cadencia-autentica",
    titleEs: "Cadencia Auténtica SATB (2 compases)",
    titleEn: "SATB Authentic Cadence (2 measures)",
    mode: "satb",
    text: `voz soprano
compas 1
G4 blanca; F4 blanca
compas 2
F4 blanca; E4 blanca

voz alto
compas 1
E4 blanca; D4 blanca
compas 2
D4 blanca; C4 blanca

voz tenor
compas 1
C4 blanca; B3 blanca
compas 2
B3 blanca; G3 blanca

voz bass
compas 1
C3 blanca; G3 blanca
compas 2
G3 blanca; C3 blanca`,
  },
  {
    id: "triplets-measure",
    titleEs: "Tresillos de Corchea y Negras (1 compás)",
    titleEn: "Eighth-Note Triplets and Quarter Notes (1 measure)",
    mode: "single",
    text: `voz melody
compas 1
C4 corchea tresillo; D4 corchea tresillo; E4 corchea tresillo; F4 corchea tresillo; G4 corchea tresillo; A4 corchea tresillo; B4 negra; C5 negra`,
  },
  {
    id: "dotted-rhythm-syncopation",
    titleEs: "Ritmo con Negra con Puntillo, Corchea y Blanca",
    titleEn: "Dotted Quarter, Eighth, and Half Note Rhythm",
    mode: "single",
    text: `voz melody
compas 1
C4 negra puntillo; D4 corchea; E4 blanca`,
  },
];
