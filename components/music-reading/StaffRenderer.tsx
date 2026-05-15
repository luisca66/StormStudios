"use client";

import { useEffect, useRef } from "react";
import { Formatter, Renderer, Stave, StaveNote, Voice } from "vexflow";
import type { Clef, Exercise, ExerciseNote } from "@/lib/music-reading";

interface StaffRendererProps {
  exercise: Exercise;
  activeNoteIndex?: number;
  locale: "es" | "en";
}

const WIDTH = 760;
const HEIGHT = 230;
const STAVE_X = 28;
const STAVE_Y = 62;
const STAVE_WIDTH = 704;

const CLEF_LABELS: Record<"es" | "en", Record<Clef, string>> = {
  es: {
    treble: "clave de sol",
    bass: "clave de fa",
  },
  en: {
    treble: "treble clef",
    bass: "bass clef",
  },
};

const COPY = {
  es: {
    note: "Nota",
    of: "de",
    staffLabel: "Pentagrama en",
    renderError: "No se pudo dibujar el pentagrama.",
  },
  en: {
    note: "Note",
    of: "of",
    staffLabel: "Staff in",
    renderError: "The staff could not be rendered.",
  },
};

export function StaffRenderer({
  exercise,
  activeNoteIndex = 0,
  locale,
}: StaffRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const copy = COPY[locale];
  const clefLabel = CLEF_LABELS[locale][exercise.clef];

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    container.replaceChildren();
    hideRenderError(errorRef.current);

    try {
      drawExercise(container, exercise, activeNoteIndex);
    } catch (error) {
      container.replaceChildren();
      showRenderError(
        errorRef.current,
          error instanceof Error
            ? error.message
          : copy.renderError,
      );
    }
  }, [activeNoteIndex, copy.renderError, exercise]);

  return (
    <div className="rounded-lg border border-[#263244] bg-[#f3f7fb] p-3 text-[#101722]">
      <div className="mb-2 flex items-center justify-between gap-3 px-1 text-xs font-medium text-[#334155]">
        <span>{clefLabel}</span>
        <span>
          {copy.note} {Math.min(activeNoteIndex + 1, exercise.notes.length)}{" "}
          {copy.of}{" "}
          {exercise.notes.length}
        </span>
      </div>
      <div
        aria-label={`${copy.staffLabel} ${clefLabel}`}
        className="min-h-[14rem] overflow-hidden rounded-md bg-[#f8fafc]"
        ref={containerRef}
        role="img"
      />
      <p
        className="mt-3 hidden rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        ref={errorRef}
      />
    </div>
  );
}

function hideRenderError(element: HTMLParagraphElement | null) {
  if (!element) {
    return;
  }

  element.textContent = "";
  element.classList.add("hidden");
}

function showRenderError(
  element: HTMLParagraphElement | null,
  message: string,
) {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.remove("hidden");
}

function drawExercise(
  container: HTMLDivElement,
  exercise: Exercise,
  activeNoteIndex: number,
) {
  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(WIDTH, HEIGHT);

  const context = renderer.getContext();
  context.setFillStyle("#111827");
  context.setStrokeStyle("#111827");

  const stave = new Stave(STAVE_X, STAVE_Y, STAVE_WIDTH);
  stave.addClef(exercise.clef);
  stave.setContext(context).draw();

  const notes = exercise.notes.map((note, index) =>
    createStaveNote(note, exercise.clef, index === activeNoteIndex),
  );

  const voice = new Voice({
    numBeats: Math.max(notes.length, 1),
    beatValue: 4,
  })
    .setMode(Voice.Mode.SOFT)
    .addTickables(notes);

  new Formatter().joinVoices([voice]).format([voice], STAVE_WIDTH - 120);
  voice.draw(context, stave);
  fitRenderedSvg(container);
}

function createStaveNote(
  note: ExerciseNote,
  clef: Clef,
  isActive: boolean,
): StaveNote {
  const staveNote = new StaveNote({
    autoStem: true,
    clef,
    duration: "q",
    keys: [`${note.pitch.note.toLowerCase()}/${note.pitch.octave}`],
  });

  const style = isActive
    ? { fillStyle: "#0f766e", strokeStyle: "#0f766e" }
    : { fillStyle: "#111827", strokeStyle: "#111827" };

  staveNote.setStyle(style);
  staveNote.setKeyStyle(0, style);
  staveNote.setStemStyle(style);

  return staveNote;
}

function fitRenderedSvg(container: HTMLDivElement) {
  const svg = container.querySelector("svg");

  if (!svg) {
    return;
  }

  svg.setAttribute("preserveAspectRatio", "xMinYMid meet");
  svg.style.display = "block";
  svg.style.height = "auto";
  svg.style.maxWidth = "100%";
  svg.style.width = "100%";
}
