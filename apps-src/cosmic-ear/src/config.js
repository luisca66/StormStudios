// Notas, instrumentos, URLs de samples y música, constantes de vuelo.
// Extraído de main.jsx en la fase 1b (PLAN-COSMIC-EAR.md); el código no cambió.

import { t } from "./i18n.js";

export const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const INSTRUMENTS = ["Piano", "Cello", "Corno", "Coro", "Fagot"];
export const INSTRUMENT_OPTIONS = [...INSTRUMENTS, "random"];
// Samples e instrumentos: bucket R2 (mismo que usa la webapp Desglose).
export const BASE_URL = "https://samples.stormstudios.com.mx";
// Música ambiente: subcarpeta del mismo bucket.
export const MUSIC_BASE = `${BASE_URL}/music/desglose`;
export const NOTE_COLORS = { "C": 0xff0000, "C#": 0xff4400, "D": 0xff8800, "D#": 0xffcc00, "E": 0xffff00, "F": 0x88ff00, "F#": 0x00ff00, "G": 0x00ff88, "G#": 0x00ffff, "A": 0x0088ff, "A#": 0x0000ff, "B": 0x8800ff };
export const MUSIC_TRACKS = Array.from({ length: 30 }, (_, i) => `cosmic-unlocking ${String(i + 1).padStart(2, '0')}.mp3`);
export const THRUST_ACCELERATION = 0.002;
export const MAX_SHIP_SPEED = 1;
export const TUNER_LISTENING_DELAY_MS = 3000;

export const getSampleUrl = (inst, ni, oo) => `${BASE_URL}/${inst}/${encodeURIComponent(NOTES[ni])}${4 + oo}.mp3`;
export const getMusicTrackUrl = (trackId) => `${MUSIC_BASE}/${encodeURIComponent(trackId)}`;
export const instrumentLabel = (instrument) => instrument === 'random'
    ? t.randomInstrument
    : (t.instrumentNames[instrument] || instrument);
export const resolveInstrument = (instrument) => instrument === 'random'
    ? INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)]
    : instrument;
export const shuffleArray = (items) => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};
