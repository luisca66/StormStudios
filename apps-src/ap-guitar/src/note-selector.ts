import type { GuitarNoteSample } from "./types";

const defaultWeight = 1;
const repeatWeight = 0.45;
const maxStreakLength = 2;

export class GuitarNoteSelector {
  private lastNote: GuitarNoteSample | null = null;
  private streakLength = 0;

  getNextRandomNote(
    activeNotes: GuitarNoteSample[],
    random: () => number = Math.random,
  ): GuitarNoteSample | null {
    if (activeNotes.length === 0) return null;

    if (activeNotes.length === 1) {
      const selected = activeNotes[0];
      this.updateSelectionState(selected);
      return selected;
    }

    const previous = this.lastNote;
    if (!previous) {
      const selected = activeNotes[Math.floor(random() * activeNotes.length)] ?? activeNotes[0];
      this.updateSelectionState(selected);
      return selected;
    }

    const candidates =
      this.streakLength >= maxStreakLength
        ? activeNotes.filter((note) => note.noteName !== previous.noteName)
        : activeNotes;

    const selected = this.pickWeightedNote(candidates.length ? candidates : activeNotes, previous, random);
    this.updateSelectionState(selected);
    return selected;
  }

  reset() {
    this.lastNote = null;
    this.streakLength = 0;
  }

  private pickWeightedNote(
    notes: GuitarNoteSample[],
    previous: GuitarNoteSample,
    random: () => number,
  ) {
    const weightedNotes = notes.map((note) => ({
      note,
      weight: note.noteName === previous.noteName ? repeatWeight : defaultWeight,
    }));
    const totalWeight = weightedNotes.reduce((sum, entry) => sum + entry.weight, 0);
    let ticket = random() * totalWeight;

    for (const entry of weightedNotes) {
      ticket -= entry.weight;
      if (ticket <= 0) return entry.note;
    }

    return weightedNotes[weightedNotes.length - 1].note;
  }

  private updateSelectionState(note: GuitarNoteSample) {
    this.streakLength = note.noteName === this.lastNote?.noteName ? this.streakLength + 1 : 1;
    this.lastNote = note;
  }
}
