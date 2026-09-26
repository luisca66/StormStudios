// Afinador: nota a partir de la frecuencia y PitchTrackerV2.
// Extraído de main.jsx en la fase 1b (PLAN-COSMIC-EAR.md); el código no cambió.

import { NOTES } from "../config.js";

export const getNoteFromPitch = (freq) => {
    const noteNum = 12 * (Math.log(freq / 440) / Math.log(2));
    const midi = Math.round(noteNum) + 69;
    return { note: NOTES[((midi % 12) + 12) % 12], index: ((midi % 12) + 12) % 12, octave: Math.floor(midi / 12) - 1, cents: Math.floor((noteNum - Math.round(noteNum)) * 100), frequency: freq };
};

export const foldCentsToPitchClass = (cents) => cents - Math.round(cents / 1200) * 1200;
export const median = (values) => {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export class PitchTrackerV2 {
    constructor() { this.stop(); }
    start(targetFrequency) {
        this.targetFrequency = targetFrequency;
        this.active = true;
        this.currentFrequency = 0;
        this.currentCentsOff = 0;
        this.recentCents = [];
        this.voicedStreak = 0;
        this.holdSeconds = 0;
        this.offPitchSeconds = 0;
        this.onPitchNow = false;
        this.lastFrameT = 0;
        this.lastFrameWallMs = 0;
    }
    stop() {
        this.active = false;
        this.targetFrequency = 0;
        this.currentFrequency = 0;
        this.currentCentsOff = 0;
        this.recentCents = [];
        this.voicedStreak = 0;
        this.holdSeconds = 0;
        this.offPitchSeconds = 0;
        this.onPitchNow = false;
        this.lastFrameT = 0;
        this.lastFrameWallMs = 0;
    }
    handleFrame(frame) {
        if (!this.active) return;
        const dt = this.lastFrameT > 0
            ? Math.min(0.1, Math.max(0, frame.t - this.lastFrameT))
            : 0.0213;
        this.lastFrameT = frame.t;
        this.lastFrameWallMs = performance.now();
        const voiced = frame.frequency > 65 && frame.frequency < 1200;
        if (voiced) {
            this.voicedStreak += 1;
            this.currentFrequency = frame.frequency;
            const cents = 1200 * Math.log2(frame.frequency / this.targetFrequency);
            this.recentCents.push(foldCentsToPitchClass(cents));
            if (this.recentCents.length > 5) this.recentCents.shift();
            this.currentCentsOff = median(this.recentCents);
        } else {
            this.voicedStreak = 0;
            this.currentFrequency = 0;
        }
        const onPitch = voiced && this.voicedStreak >= 3 && Math.abs(this.currentCentsOff) <= 50;
        if (onPitch) {
            this.onPitchNow = true;
            this.offPitchSeconds = 0;
            this.holdSeconds += dt;
        } else {
            this.onPitchNow = false;
            this.offPitchSeconds += dt;
            if (this.offPitchSeconds > 0.25) this.holdSeconds = 0;
        }
    }
    getState() {
        if (this.active && this.lastFrameWallMs > 0 && performance.now() - this.lastFrameWallMs > 150) {
            this.onPitchNow = false;
            this.currentFrequency = 0;
        }
        return {
            frequency: this.currentFrequency,
            centsOff: this.currentCentsOff,
            isOnPitch: this.onPitchNow,
            holdProgress: Math.min(1, this.holdSeconds / 1.5)
        };
    }
}
