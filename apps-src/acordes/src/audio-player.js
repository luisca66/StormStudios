const AUDIO_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";

export class AudioPlayer {
    constructor() {
        this.cache = new Map();
        this.activeAudios = [];
    }

    getNoteUrl(note, instrument) {
        const safeNote = note.replace('#', '%23');
        return `${AUDIO_BASE}/${instrument}/${safeNote}.mp3`;
    }

    preloadAudio(url) {
        if (this.cache.has(url)) return Promise.resolve(this.cache.get(url));

        return new Promise((resolve) => {
            const audio = new Audio();
            let settled = false;
            let timeoutId;

            const done = () => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timeoutId);
                audio.removeEventListener("canplay", done);
                audio.removeEventListener("canplaythrough", done);
                audio.removeEventListener("loadeddata", done);
                audio.removeEventListener("error", done);
                this.cache.set(url, audio);
                resolve(audio);
            };

            timeoutId = window.setTimeout(done, 3500);
            audio.addEventListener("canplay", done);
            audio.addEventListener("canplaythrough", done);
            audio.addEventListener("loadeddata", done);
            audio.addEventListener("error", done);
            audio.src = url;
            audio.load();
        });
    }

    async preloadEffects() {
        await this.preloadAudio(`${AUDIO_BASE}/acierto.mp3`);
        await this.preloadAudio(`${AUDIO_BASE}/error.mp3`);
    }

    playUrl(url, volume = 1.0) {
        const baseAudio = this.cache.get(url);
        let audioToPlay;

        if (baseAudio) {
            // Clone the node so we can play overlapping sounds
            audioToPlay = baseAudio.cloneNode();
        } else {
            audioToPlay = new Audio(url);
        }

        audioToPlay.volume = volume;
        audioToPlay.play().catch((error) => console.warn("No se pudo reproducir el audio", error));
        this.activeAudios.push(audioToPlay);

        // Cleanup after playback
        audioToPlay.addEventListener('ended', () => {
            this.activeAudios = this.activeAudios.filter(a => a !== audioToPlay);
        });
    }

    async playChord(notes, instrument, volume = 0.8) {
        this.stopChord();

        // Ensure all are loaded first
        const urls = notes.map(note => this.getNoteUrl(note, instrument));
        await Promise.all(urls.map(url => this.preloadAudio(url)));

        // Play them simultaneously
        urls.forEach(url => this.playUrl(url, volume));
    }

    stopChord() {
        this.activeAudios.forEach(audio => {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch {
                // ignore
            }
        });
        this.activeAudios = [];
    }

    async playCorrectEffect(volume = 0.8) {
        this.playUrl(`${AUDIO_BASE}/acierto.mp3`, volume);
    }

    async playIncorrectEffect(volume = 0.8) {
        this.playUrl(`${AUDIO_BASE}/error.mp3`, volume);
    }

    // Dummy audioContext object to satisfy main.js expectation
    get audioContext() {
        return { state: 'running', resume: async () => {} };
    }
}
