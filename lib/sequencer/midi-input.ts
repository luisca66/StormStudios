/**
 * midi-input.ts — Teclado MIDI para escribir notas (Sequencer v5).
 *
 * Un teclado MIDI solo manda números; la grafía (Fa# o Solb) la decide la
 * armadura del compás donde está el cursor:
 * - Las notas de la escala usan la grafía de la armadura.
 * - Las cromáticas usan sostenidos en armaduras con sostenidos (y en Do) y
 *   bemoles en armaduras con bemoles. El autor puede corregirlas después.
 *
 * `ChordCollector` junta las teclas que se tocan casi a la vez en un acorde.
 */
import { keySignature } from "./model";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const SHARP_ORDER = "FCGDAEB", FLAT_ORDER = "BEADGCF";

/** Alteración de cada letra según la armadura (C: 0, F#: +1…). */
function signatureAlters(key: string): Record<string, number> {
  const { fifths } = keySignature(key);
  const altered = (fifths > 0 ? SHARP_ORDER : FLAT_ORDER).slice(0, Math.abs(fifths));
  return Object.fromEntries(LETTERS.map(letter => [letter, altered.includes(letter) ? Math.sign(fifths) : 0]));
}

/** Nota MIDI → grafía científica del secuenciador (C4 = 60) en la armadura dada. */
export function spellMidi(midi: number, key: string): string {
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) throw new RangeError(`MIDI fuera de rango: ${midi}`);
  const alters = signatureAlters(key), pc = midi % 12;
  const name = (letterIndex: number, alter: number) => {
    // La octava sigue a la letra escrita: Cb4 = 59, B#3 = 60.
    const octave = Math.floor((midi - alter) / 12) - 1;
    return LETTERS[letterIndex] + (alter > 0 ? "#".repeat(alter) : "b".repeat(-alter)) + octave;
  };
  // 1. Nota de la escala, con la grafía de la armadura.
  for (let i = 0; i < 7; i++) if ((((NATURAL[i] + alters[LETTERS[i]]) % 12) + 12) % 12 === pc) return name(i, alters[LETTERS[i]]);
  // 2. Cromática: sostenido sobre la letra de abajo, o bemol sobre la de arriba.
  const sharps = keySignature(key).fifths >= 0;
  for (let i = 0; i < 7; i++) {
    const alter = sharps ? 1 : -1;
    if ((((NATURAL[i] + alter) % 12) + 12) % 12 === pc && Math.abs(alter) <= 1) {
      // En armaduras muy cargadas la letra ya viene alterada; se prefiere la letra natural.
      if (alters[LETTERS[i]] === 0 || alters[LETTERS[i]] === -alter) return name(i, alter);
    }
  }
  // 3. Último recurso: la grafía contraria (p. ej. becuadros en armaduras de 6–7 alteraciones).
  for (let i = 0; i < 7; i++) if (NATURAL[i] === pc) return name(i, 0);
  for (let i = 0; i < 7; i++) if ((((NATURAL[i] + (sharps ? -1 : 1)) % 12) + 12) % 12 === pc) return name(i, sharps ? -1 : 1);
  throw new Error("Nota sin grafía"); // inalcanzable: toda clase de altura cae en algún caso
}

/** Mensaje MIDI crudo → tecla pulsada o soltada; ignora todo lo demás. */
export function parseMidiMessage(data: ArrayLike<number>): { type: "on" | "off"; note: number; velocity: number } | null {
  if (data.length < 3) return null;
  const command = data[0] & 0xf0, note = data[1], velocity = data[2];
  if (command === 0x90 && velocity > 0) return { type: "on", note, velocity };
  if (command === 0x80 || (command === 0x90 && velocity === 0)) return { type: "off", note, velocity: 0 };
  return null;
}

/**
 * Junta las teclas pulsadas dentro de una ventana breve en un solo acorde y lo
 * entrega una vez. El temporizador se inyecta para poder probarlo.
 */
export class ChordCollector {
  private notes = new Set<number>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(private onChord: (notes: number[]) => void, private windowMs = 45,
    // Envueltos: en el navegador, setTimeout guardado en una propiedad pierde su `this` («Illegal invocation»).
    private schedule: (run: () => void, ms: number) => ReturnType<typeof setTimeout> = (run, ms) => setTimeout(run, ms),
    private cancel: (id: ReturnType<typeof setTimeout>) => void = id => clearTimeout(id)) {}
  press(note: number) {
    this.notes.add(note);
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = this.schedule(() => this.flush(), this.windowMs);
  }
  flush() {
    if (this.timer !== null) { this.cancel(this.timer); this.timer = null; }
    if (!this.notes.size) return;
    const notes = [...this.notes].sort((a, b) => a - b);
    this.notes.clear(); this.onChord(notes);
  }
  dispose() { if (this.timer !== null) this.cancel(this.timer); this.timer = null; this.notes.clear(); }
}
