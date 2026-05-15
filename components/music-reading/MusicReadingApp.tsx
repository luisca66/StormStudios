"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AnswerButtons } from "./AnswerButtons";
import { LevelProgress } from "./LevelProgress";
import { MetricsPanel } from "./MetricsPanel";
import { NotationToggle } from "./NotationToggle";
import { SessionSummary } from "./SessionSummary";
import { StaffRenderer } from "./StaffRenderer";
import {
  completeProgressRound,
  createInitialProgress,
  createRoundSummary,
  EMPTY_SESSION_STATS,
  generateRoundExercises,
  getLevelById,
  getNoteLabel,
  MAX_LEVEL_ID,
  playNoteSample,
  PROGRESS_STORAGE_EVENT,
  readProgress,
  recordAnswer,
  recordProgressAnswer,
  resetProgress,
  updateProgressLevel,
  updateProgressNotationMode,
  writeProgress,
} from "@/lib/music-reading";
import type {
  MusicReadingLevel,
  MusicReadingProgress,
  NotationMode,
  NoteName,
  RoundSummary,
  SessionStats,
} from "@/lib/music-reading";

const NOTATION_STORAGE_KEY = "music-reading-notation-mode";
const NOTATION_STORAGE_EVENT = "music-reading-notation-mode-change";
const FEEDBACK_DELAY_MS = 650;
const SERVER_PROGRESS = createInitialProgress();

type MusicReadingLocale = "es" | "en";

type FeedbackState =
  | {
      answer: NoteName;
      expected: NoteName;
      isCorrect: boolean;
    }
  | undefined;

const UI_COPY = {
  es: {
    title: "Lectura musical",
    subtitle:
      "Reconocimiento progresivo de notas naturales en clave de sol y clave de fa.",
    level: "Nivel",
    round: "Ronda",
    playNote: "Sonar nota",
    clearProgressConfirm:
      "¿Borrar todo el progreso local de lectura musical?",
    chooseNote: "Elige el nombre de la nota que ves en el pentagrama.",
    correct: "Correcto",
    expected: "Era",
  },
  en: {
    title: "Music Reading",
    subtitle:
      "Progressive recognition of natural notes in treble clef and bass clef.",
    level: "Level",
    round: "Round",
    playNote: "Play note",
    clearProgressConfirm: "Clear all local music-reading progress?",
    chooseNote: "Choose the name of the note you see on the staff.",
    correct: "Correct",
    expected: "It was",
  },
};

const LEVEL_COPY: Record<number, { title: string; description: string }> = {
  1: {
    title: "Anchor notes in treble clef",
    description: "C and G as initial reference notes.",
  },
  2: {
    title: "Anchor notes in bass clef",
    description: "F and C as initial reference notes.",
  },
  3: {
    title: "Mixed anchors",
    description: "C-G and F-C alternating between treble and bass clef.",
  },
  4: {
    title: "Nearby notes in treble clef",
    description: "Seconds above and below C and G.",
  },
  5: {
    title: "Nearby notes in bass clef",
    description: "Seconds above and below F and C.",
  },
  6: {
    title: "Thirds in treble clef",
    description: "Thirds above and below C and G.",
  },
  7: {
    title: "Thirds in bass clef",
    description: "Thirds above and below F and C.",
  },
  8: {
    title: "Full natural range",
    description: "C to B in both clefs.",
  },
  9: {
    title: "Two notes per exercise",
    description: "Two-note natural-note sequences.",
  },
  10: {
    title: "Three notes per exercise",
    description: "Three-note natural-note sequences.",
  },
  11: {
    title: "Four notes per exercise",
    description: "Four-note natural-note sequences.",
  },
  12: {
    title: "Random natural notes",
    description: "General practice with one to four natural notes.",
  },
};

export function MusicReadingApp({
  locale = "es",
}: {
  locale?: MusicReadingLocale;
}) {
  const copy = UI_COPY[locale];
  const defaultNotationMode: NotationMode =
    locale === "en" ? "english" : "latin";
  const progress = useSyncExternalStore(
    subscribeToProgress,
    readProgress,
    getServerProgress,
  );
  const notationMode = useSyncExternalStore(
    subscribeToNotationMode,
    () => getStoredNotationMode(defaultNotationMode),
    () => defaultNotationMode,
  );
  const level = getLevelById(progress.currentLevelId);
  const levelCopy = getLocalizedLevelCopy(level, locale);
  const [roundExerciseIndex, setRoundExerciseIndex] = useState(0);
  const [activeNoteIndex, setActiveNoteIndex] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>();
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [sessionStats, setSessionStats] =
    useState<SessionStats>(EMPTY_SESSION_STATS);
  const [roundSummary, setRoundSummary] = useState<RoundSummary>();
  const [roundResetCount, setRoundResetCount] = useState(0);
  const noteStartedAtRef = useRef(0);

  const roundExercises = useMemo(
    () =>
      generateRoundExercises(
        level,
        `level-${level.id}-round-${progress.completedRounds}-reset-${roundResetCount}`,
      ),
    [level, progress.completedRounds, roundResetCount],
  );
  const currentExercise = roundExercises[roundExerciseIndex] ?? roundExercises[0];

  const activeNote = currentExercise.notes[activeNoteIndex];

  useEffect(() => {
    if (!activeNote) {
      return;
    }

    noteStartedAtRef.current = getCurrentMs();
    playNoteSample(activeNote.pitch);
  }, [activeNote]);

  function handleNotationChange(mode: NotationMode) {
    window.localStorage.setItem(NOTATION_STORAGE_KEY, mode);
    window.dispatchEvent(new Event(NOTATION_STORAGE_EVENT));
    writeProgress(updateProgressNotationMode(progress, mode));
  }

  function handleAnswer(answer: NoteName) {
    if (isAdvancing || !activeNote || roundSummary) {
      return;
    }

    const responseMs = getCurrentMs() - noteStartedAtRef.current;
    const isCorrect = answer === activeNote.answer;
    const nextStats = recordAnswer(sessionStats, isCorrect, responseMs);
    const answerProgress = recordProgressAnswer({
      clef: currentExercise.clef,
      isCorrect,
      progress,
      stats: nextStats,
    });

    setFeedback({
      answer,
      expected: activeNote.answer,
      isCorrect,
    });
    setIsAdvancing(true);
    setSessionStats(nextStats);
    writeProgress(answerProgress);

    window.setTimeout(() => {
      setFeedback(undefined);
      setIsAdvancing(false);

      if (activeNoteIndex + 1 < currentExercise.notes.length) {
        setActiveNoteIndex((index) => index + 1);
        noteStartedAtRef.current = getCurrentMs();
        return;
      }

      if (roundExerciseIndex + 1 >= level.roundLength) {
        finishRound(nextStats, answerProgress);
        return;
      }

      setActiveNoteIndex(0);
      setRoundExerciseIndex((index) => index + 1);
      noteStartedAtRef.current = getCurrentMs();
    }, FEEDBACK_DELAY_MS);
  }

  function finishRound(
    finalStats: SessionStats,
    answerProgress: MusicReadingProgress,
  ) {
    const passed =
      finalStats.correct / Math.max(1, finalStats.correct + finalStats.incorrect) >=
      level.passingAccuracy;
    const nextLevelId = passed ? Math.min(level.id + 1, MAX_LEVEL_ID) : level.id;
    const completedProgress = completeProgressRound({
      currentLevelId: level.id,
      nextLevelId,
      progress: answerProgress,
    });

    writeProgress(completedProgress);
    setRoundSummary(
      createRoundSummary({
        level,
        nextLevelId,
        stats: finalStats,
      }),
    );
  }

  function handleContinueRound() {
    setRoundSummary(undefined);
    setRoundExerciseIndex(0);
    setActiveNoteIndex(0);
    setSessionStats(EMPTY_SESSION_STATS);
    setRoundResetCount((count) => count + 1);
    noteStartedAtRef.current = getCurrentMs();
  }

  function handleResetLevel() {
    setRoundSummary(undefined);
    setFeedback(undefined);
    setIsAdvancing(false);
    setRoundExerciseIndex(0);
    setActiveNoteIndex(0);
    setSessionStats(EMPTY_SESSION_STATS);
    setRoundResetCount((count) => count + 1);
    noteStartedAtRef.current = getCurrentMs();
  }

  function handleLevelChange(levelId: number) {
    if (levelId === level.id) {
      return;
    }

    writeProgress(updateProgressLevel(progress, levelId));
    setRoundSummary(undefined);
    setFeedback(undefined);
    setIsAdvancing(false);
    setRoundExerciseIndex(0);
    setActiveNoteIndex(0);
    setSessionStats(EMPTY_SESSION_STATS);
    setRoundResetCount((count) => count + 1);
    noteStartedAtRef.current = getCurrentMs();
  }

  function handleClearProgress() {
    const confirmed = window.confirm(copy.clearProgressConfirm);

    if (!confirmed) {
      return;
    }

    writeProgress(resetProgress(notationMode));
    setRoundSummary(undefined);
    setFeedback(undefined);
    setIsAdvancing(false);
    setRoundExerciseIndex(0);
    setActiveNoteIndex(0);
    setSessionStats(EMPTY_SESSION_STATS);
    setRoundResetCount((count) => count + 1);
    noteStartedAtRef.current = getCurrentMs();
  }

  function handleReplayAudio() {
    if (!activeNote) {
      return;
    }

    playNoteSample(activeNote.pitch);
  }

  return (
    <div className="ss-root px-4 py-20 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#44d7b6]">
              Storm Studios Learning
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white md:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b6c3d3] md:text-base">
              {copy.subtitle}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:flex">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-[#8d9bad]">
                {copy.level}
              </p>
              <p className="mt-1 text-2xl font-semibold">{level.id}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-[#8d9bad]">
                {copy.round}
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {roundExerciseIndex + 1}/{level.roundLength}
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="rounded-lg border border-white/10 bg-[#101722]/92 p-4 shadow-2xl shadow-black/30 md:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[#f1c75b]">
                  {levelCopy.title}
                </p>
                <p className="mt-1 text-xs text-[#8d9bad]">
                  {levelCopy.description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="min-h-9 rounded-lg border border-white/10 px-3 text-xs font-semibold text-[#b6c3d3] transition hover:border-[#44d7b6]/60 hover:text-[#44d7b6] focus:outline-none focus:ring-2 focus:ring-[#f1c75b]"
                  onClick={handleReplayAudio}
                  type="button"
                >
                  {copy.playNote}
                </button>
                <NotationToggle
                  locale={locale}
                  mode={notationMode}
                  onChange={handleNotationChange}
                />
              </div>
            </div>

            <StaffRenderer
              activeNoteIndex={activeNoteIndex}
              exercise={currentExercise}
              locale={locale}
            />

            <FeedbackMessage
              copy={copy}
              feedback={feedback}
              notationMode={notationMode}
            />
          </div>

          <aside className="grid gap-4">
            <LevelProgress
              locale={locale}
              level={level}
              onClearProgress={handleClearProgress}
              onLevelChange={handleLevelChange}
              onResetLevel={handleResetLevel}
              progress={progress}
            />
            <MetricsPanel
              exerciseNumber={roundExerciseIndex + 1}
              locale={locale}
              roundLength={level.roundLength}
              stats={sessionStats}
            />
          </aside>
        </section>

        <AnswerButtons
          disabled={isAdvancing || Boolean(roundSummary)}
          locale={locale}
          notationMode={notationMode}
          onAnswer={handleAnswer}
        />
      </div>

      {roundSummary ? (
        <SessionSummary
          levelTitle={getLocalizedLevelCopy(getLevelById(roundSummary.levelId), locale).title}
          locale={locale}
          onContinue={handleContinueRound}
          summary={roundSummary}
        />
      ) : null}
    </div>
  );
}

function FeedbackMessage({
  copy,
  feedback,
  notationMode,
}: {
  copy: (typeof UI_COPY)[MusicReadingLocale];
  feedback: FeedbackState;
  notationMode: NotationMode;
}) {
  if (!feedback) {
    return (
      <div
        className="mt-4 min-h-12 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[#8d9bad]"
        role="status"
      >
        {copy.chooseNote}
      </div>
    );
  }

  if (feedback.isCorrect) {
    return (
      <div
        className="mt-4 min-h-12 rounded-lg border border-[#44d7b6]/40 bg-[#44d7b6]/10 px-4 py-3 text-sm font-semibold text-[#9ff2dd]"
        role="status"
      >
        {copy.correct}: {getNoteLabel(feedback.expected, notationMode)}
      </div>
    );
  }

  return (
    <div
      className="mt-4 min-h-12 rounded-lg border border-[#f1c75b]/40 bg-[#f1c75b]/10 px-4 py-3 text-sm font-semibold text-[#ffe08a]"
      role="status"
    >
      {copy.expected} {getNoteLabel(feedback.expected, notationMode)}
    </div>
  );
}

function getStoredNotationMode(defaultMode: NotationMode): NotationMode {
  if (typeof window === "undefined") {
    return defaultMode;
  }

  const storedMode = window.localStorage.getItem(NOTATION_STORAGE_KEY);

  if (storedMode === "english" || storedMode === "latin") {
    return storedMode;
  }

  return defaultMode;
}

function subscribeToNotationMode(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(NOTATION_STORAGE_EVENT, onStoreChange);
  window.addEventListener(PROGRESS_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(NOTATION_STORAGE_EVENT, onStoreChange);
    window.removeEventListener(PROGRESS_STORAGE_EVENT, onStoreChange);
  };
}

function subscribeToProgress(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(PROGRESS_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(PROGRESS_STORAGE_EVENT, onStoreChange);
  };
}

function getServerProgress() {
  return SERVER_PROGRESS;
}

function getCurrentMs() {
  return typeof window === "undefined" ? 0 : window.performance.now();
}

function getLocalizedLevelCopy(
  level: MusicReadingLevel,
  locale: MusicReadingLocale,
) {
  if (locale === "en") {
    return LEVEL_COPY[level.id] ?? level;
  }

  return {
    title: level.title,
    description: level.description,
  };
}
