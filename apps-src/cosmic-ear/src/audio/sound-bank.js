// Sonidos del juego: muestras de instrumentos, acierto, música de fondo y ruido del motor.
// Extraído de main.jsx en la fase 1b paso 2 (PLAN-COSMIC-EAR.md); la lógica no cambió.

import { BASE_URL, INSTRUMENTS, MUSIC_TRACKS, getMusicTrackUrl, getSampleUrl, resolveInstrument, shuffleArray } from "../config.js";

const SUCCESS_URL = `${BASE_URL}/acierto.mp3`;
const ERROR_URL = `${BASE_URL}/error.mp3`;

export class SoundBank {
    constructor() {
        this.ctx = null;
        this.cache = {};
        this.music = null;
        this.musicQueue = [];
        this.currentTrack = null;
        this.engine = null;      // { noise, gain }
        this.thruster = null;
    }

    /** El AudioContext se crea con el primer gesto del usuario (activar micrófono). */
    async context() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        return this.ctx;
    }

    /** Precarga todas las muestras (5 octavas × 12 notas × instrumento) de 10 en 10. */
    async preload(onProgress) {
        const urls = [];
        INSTRUMENTS.forEach(inst => {
            for (let oo = -2; oo <= 2; oo++) {
                for (let ni = 0; ni < 12; ni++) urls.push(getSampleUrl(inst, ni, oo));
            }
        });
        urls.push(SUCCESS_URL, ERROR_URL);

        let loaded = 0;
        const loadAudio = (url) => new Promise(resolve => {
            const audio = new Audio();
            audio.src = url;
            audio.preload = 'auto';
            let settled = false;
            const done = () => {
                if (settled) return;
                settled = true;
                this.cache[url] = audio;
                loaded++;
                onProgress(Math.floor((loaded / urls.length) * 100));
                resolve();
            };
            audio.addEventListener('canplaythrough', done, { once: true });
            audio.addEventListener('error', done, { once: true });
            setTimeout(done, 3000);
            audio.load();
        });

        for (let i = 0; i < urls.length; i += 10) {
            await Promise.all(urls.slice(i, i + 10).map(loadAudio));
        }
    }

    playChord(notes, inst) {
        notes.forEach(n => {
            const timbre = resolveInstrument(inst);
            const url = getSampleUrl(timbre, n.index, n.octave - 4);
            const a = this.cache[url];
            if (a) { a.currentTime = 0; a.volume = 0.4; a.play().catch(() => {}); }
        });
    }

    /** Suena el acierto; la promesa se cumple cuando termina (o falla). */
    playSuccess() {
        return new Promise(resolve => {
            const a = this.cache[SUCCESS_URL];
            if (!a) {
                resolve();
                return;
            }
            let fallbackId = null;
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                if (fallbackId !== null) clearTimeout(fallbackId);
                a.removeEventListener('ended', finish);
                a.removeEventListener('error', finish);
                resolve();
            };
            try {
                a.currentTime = 0;
                a.volume = 0.6;
                a.addEventListener('ended', finish, { once: true });
                a.addEventListener('error', finish, { once: true });
                const durationMs = Number.isFinite(a.duration) && a.duration > 0 ? Math.ceil(a.duration * 1000) + 250 : 15000;
                fallbackId = setTimeout(finish, durationMs);
                a.play().catch(finish);
            } catch (e) {
                finish();
            }
        });
    }

    // ---- Música de fondo: cola barajada sin repetir la pista que acaba de sonar.

    resetMusicQueue() {
        this.musicQueue = [];
        this.currentTrack = null;
    }

    nextTrackId() {
        if (this.musicQueue.length === 0) {
            const shuffled = shuffleArray(MUSIC_TRACKS);
            if (shuffled.length > 1 && shuffled[0] === this.currentTrack) {
                [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
            }
            this.musicQueue = shuffled;
        }
        this.currentTrack = this.musicQueue.shift();
        return this.currentTrack;
    }

    stopMusic() {
        if (!this.music) return;
        try {
            this.music.pause();
            this.music.currentTime = 0;
            this.music.onended = null;
            this.music.onerror = null;
        } catch (e) {}
        this.music = null;
    }

    playRandomMusic() {
        this.stopMusic();
        const trackId = this.nextTrackId();
        if (!trackId) return;

        const url = getMusicTrackUrl(trackId);
        const music = this.cache[url] || new Audio(url);
        this.cache[url] = music;
        music.preload = 'auto';
        music.loop = false;
        music.volume = 0.4;
        music.currentTime = 0;
        music.onended = () => { if (this.music === music) this.playRandomMusic(); };
        music.onerror = () => { if (this.music === music) this.playRandomMusic(); };
        this.music = music;
        music.play().catch(() => {});
    }

    pauseMusic() {
        if (this.music) { try { this.music.pause(); } catch (e) {} }
    }

    resumeMusic() {
        if (this.music) {
            try { this.music.play().catch(() => {}); } catch (e) {}
            return;
        }
        this.playRandomMusic();
    }

    // ---- Motor (ruido grave) y propulsores de maniobra (ruido agudo).

    noiseLoop(filterType, frequency, q) {
        const ctx = this.ctx;
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer; noise.loop = true;
        const gain = ctx.createGain(), filter = ctx.createBiquadFilter();
        filter.type = filterType; filter.frequency.value = frequency;
        if (q !== undefined) filter.Q.value = q;
        gain.gain.value = 0;
        noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination); noise.start();
        return { noise, gain };
    }

    async startEngines() {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        if (!this.engine) this.engine = this.noiseLoop('lowpass', 200);
        if (!this.thruster) this.thruster = this.noiseLoop('bandpass', 7000, 2);
    }

    updateEngine(spd, thrust) {
        if (!this.engine) return;
        try {
            this.engine.gain.gain.setTargetAtTime(thrust ? 0.5 : (spd > 0.01 ? 0.15 : 0), this.ctx.currentTime, 0.2);
        } catch (e) {}
    }

    setSteering(steering) {
        if (!this.thruster) return;
        try { this.thruster.gain.gain.setTargetAtTime(steering ? 0.3 : 0, this.ctx.currentTime, steering ? 0.005 : 0.05); } catch (e) {}
    }

    stopEngines() {
        for (const key of ['engine', 'thruster']) {
            if (this[key]) { try { this[key].noise.stop(); } catch (e) {} this[key] = null; }
        }
    }
}
