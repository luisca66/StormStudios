export const SAMPLE_MIN_NOTE = "C2";
export const SAMPLE_MAX_NOTE = "C7";

const notePattern = /^([A-Ga-g])([#b♯♭]?)(-?\d+)$/;
const sharpNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function noteToMidi(note) {
    const match = note.trim().match(notePattern);
    if (!match) throw new Error(`Formato de nota inválido: ${note}`);

    const letter = match[1];
    const accidental = match[2];
    const octaveText = match[3];

    let base;
    switch (letter.toUpperCase()) {
        case "C": base = 0; break;
        case "D": base = 2; break;
        case "E": base = 4; break;
        case "F": base = 5; break;
        case "G": base = 7; break;
        case "A": base = 9; break;
        case "B": base = 11; break;
        default: throw new Error(`Nota inválida: ${note}`);
    }

    let alteration = 0;
    if (accidental === "#" || accidental === "♯") alteration = 1;
    if (accidental === "b" || accidental === "♭") alteration = -1;

    return (parseInt(octaveText, 10) + 1) * 12 + base + alteration;
}

export const sampleMinMidi = noteToMidi(SAMPLE_MIN_NOTE);
export const sampleMaxMidi = noteToMidi(SAMPLE_MAX_NOTE);

export function midiToNote(midi) {
    let noteIndex = midi % 12;
    if (noteIndex < 0) noteIndex += 12; // JS modulo for negative numbers
    const octave = Math.floor(midi / 12) - 1;
    return sharpNames[noteIndex] + octave;
}

export function chromaticRange(start, end) {
    const startMidi = noteToMidi(start);
    const endMidi = noteToMidi(end);
    if (startMidi > endMidi) return [];

    const range = [];
    for (let i = startMidi; i <= endMidi; i++) {
        range.push(midiToNote(i));
    }
    return range;
}

export function chordNotes(root, chordType) {
    const rootMidi = noteToMidi(root);
    return chordType.intervals.map(interval => midiToNote(rootMidi + interval));
}

export function hasSamplesFor(root, chordType) {
    const notes = chordNotes(root, chordType);
    return notes.every(note => {
        const midi = noteToMidi(note);
        return midi >= sampleMinMidi && midi <= sampleMaxMidi;
    });
}
