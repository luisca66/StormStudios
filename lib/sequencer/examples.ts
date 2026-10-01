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
C4 Cuarto; D4 Cuarto; E4 Cuarto; F4 Cuarto
compas 2
G4 Cuarto; A4 Cuarto; B4 Cuarto; C5 Cuarto`,
  },
  {
    id: "harmonic-cadence-i-iv-v-i",
    titleEs: "Progresión Armónica I - IV - V - I",
    titleEn: "Harmonic Progression I - IV - V - I",
    mode: "single",
    text: `voz melody
compas 1
[C4 E4 G4] Mitad; [F4 A4 C5] Mitad
compas 2
[G4 B4 D5] Mitad; [C4 E4 G4] Mitad`,
  },
  {
    id: "satb-cadencia-autentica",
    titleEs: "Cadencia Auténtica SATB (2 compases)",
    titleEn: "SATB Authentic Cadence (2 measures)",
    mode: "satb",
    text: `voz soprano
compas 1
G4 Mitad; F4 Mitad
compas 2
F4 Mitad; E4 Mitad

voz alto
compas 1
E4 Mitad; D4 Mitad
compas 2
D4 Mitad; C4 Mitad

voz tenor
compas 1
C4 Mitad; B3 Mitad
compas 2
B3 Mitad; G3 Mitad

voz bass
compas 1
C3 Mitad; G3 Mitad
compas 2
G3 Mitad; C3 Mitad`,
  },
  {
    id: "triplets-measure",
    titleEs: "Tresillos de Octavo y Cuartos (1 compás)",
    titleEn: "Eighth-Note Triplets and Quarter Notes (1 measure)",
    mode: "single",
    text: `voz melody
compas 1
C4 Octavo tresillo; D4 Octavo tresillo; E4 Octavo tresillo; F4 Octavo tresillo; G4 Octavo tresillo; A4 Octavo tresillo; B4 Cuarto; C5 Cuarto`,
  },
  {
    id: "dotted-rhythm-syncopation",
    titleEs: "Ritmo con Cuarto con Puntillo, Octavo y Mitad",
    titleEn: "Dotted Quarter, Eighth, and Half Note Rhythm",
    mode: "single",
    text: `voz melody
compas 1
C4 Cuarto puntillo; D4 Octavo; E4 Mitad`,
  },
];
