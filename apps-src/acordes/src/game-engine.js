import { hasSamplesFor, chromaticRange, chordNotes } from './music-theory.js';
import { ChordTypeArray } from './chord-types.js';

export const GameMode = {
    CLASSIC: 'CLASSIC',
    TIME_ATTACK: 'TIME_ATTACK',
    SURVIVAL: 'SURVIVAL',
};

export const Instrument = {
    PIANO: 'Piano',
    CHOIR: 'Coro',
    HORN: 'Corno',
    CELLO: 'Cello',
    BASSOON: 'Fagot',
    RANDOM: 'Aleatorio'
};

const PlayableInstruments = [
    Instrument.PIANO, Instrument.CHOIR, Instrument.HORN,
    Instrument.CELLO, Instrument.BASSOON
];

export const SessionStatus = {
    PLAYING: 'PLAYING',
    TIME_UP: 'TIME_UP',
    GAME_OVER: 'GAME_OVER',
    FINISHED: 'FINISHED',
};

export class QuestionGenerator {
    generate(config, previousType = null) {
        const availableTypes = config.selectedChords;
        if (availableTypes.length === 0) return null;

        const range = chromaticRange(config.rangeStart, config.rangeEnd);
        if (range.length === 0) return null;

        for (let attempt = 0; attempt < 50; attempt++) {
            const root = range[Math.floor(Math.random() * range.length)];
            let typeId = availableTypes[Math.floor(Math.random() * availableTypes.length)];

            // Try not to repeat the exact same type sequentially if possible
            if (availableTypes.length > 1 && previousType && typeId === previousType && attempt < 25) {
                continue;
            }

            const type = ChordTypeArray.find(c => c.id === typeId);

            if (hasSamplesFor(root, type)) {
                let inst = config.instrument;
                if (inst === Instrument.RANDOM) {
                    inst = PlayableInstruments[Math.floor(Math.random() * PlayableInstruments.length)];
                }

                return {
                    root,
                    type,
                    notes: chordNotes(root, type),
                    instrument: inst
                };
            }
        }
        return null;
    }
}

export class GameEngine {
    constructor(config) {
        this.config = config;
        this.generator = new QuestionGenerator();
    }

    start() {
        return {
            status: SessionStatus.PLAYING,
            question: this.generator.generate(this.config),
            score: 0,
            rounds: 0,
            streak: 0,
            lives: 3,
            timeLeft: this.config.mode === GameMode.TIME_ATTACK ? this.config.timeLimitSeconds : null
        };
    }

    submitAnswer(state, chordTypeId) {
        if (state.status !== SessionStatus.PLAYING || !state.question) {
            return { state, wasCorrect: null, answeredChord: null };
        }

        const isCorrect = state.question.type.id === chordTypeId;
        let newState = { ...state };

        newState.rounds += 1;

        const nextStreak = isCorrect ? state.streak + 1 : 0;
        newState.streak = nextStreak;

        let nextLives = state.lives;
        if (!isCorrect && this.config.mode === GameMode.SURVIVAL) {
            nextLives = Math.max(state.lives - 1, 0);
        }
        newState.lives = nextLives;

        if (isCorrect) {
            newState.score += 10 + (nextStreak * 2);
        }

        const isGameOver = this.config.mode === GameMode.SURVIVAL && nextLives === 0;

        if (isGameOver) {
            newState.status = SessionStatus.GAME_OVER;
        } else if (this.config.mode === GameMode.CLASSIC && newState.rounds >= 10) {
            newState.status = SessionStatus.FINISHED;
        }

        return {
            state: newState,
            wasCorrect: isCorrect,
            answeredChord: state.question.type.id
        };
    }

    nextQuestion(state) {
        if (state.status !== SessionStatus.PLAYING) return state;
        return {
            ...state,
            question: this.generator.generate(this.config, state.question?.type?.id)
        };
    }

    skip(state) {
        if (state.status !== SessionStatus.PLAYING) return state;
        return {
            ...state,
            rounds: state.rounds + 1,
            streak: 0,
            question: this.generator.generate(this.config)
        };
    }

    tick(state) {
        if (this.config.mode !== GameMode.TIME_ATTACK || state.status !== SessionStatus.PLAYING) {
            return state;
        }
        const timeLeft = Math.max(state.timeLeft - 1, 0);
        if (timeLeft === 0) {
            return { ...state, timeLeft: 0, status: SessionStatus.TIME_UP };
        }
        return { ...state, timeLeft };
    }
}
