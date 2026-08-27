"use client";

import { useEffect, useRef, useState } from "react";
import type { StaveNote } from "vexflow";
import type { Clef, Exercise, ExerciseNote } from "@/lib/music-reading";

// VexFlow pesa ~1.1 MB sin comprimir, así que se carga bajo demanda en lugar de
// entrar al bundle inicial de la página: el resto de la interfaz pinta de
// inmediato y el pentagrama aparece en cuanto la librería termina de bajar.
// El tipo se importa aparte (import type) porque TypeScript lo borra al compilar
// y no arrastra la librería al bundle.
type VexFlowModule = typeof import("vexflow");

let vexflowPromise: Promise<VexFlowModule> | null = null;

// Una sola promesa compartida: si el componente se remonta o cambia de
// ejercicio, se reutiliza el módulo ya cargado en vez de pedirlo otra vez.
function loadVexFlow(): Promise<VexFlowModule> {
  vexflowPromise ??= import("vexflow");
  return vexflowPromise;
}

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
    loading: "Cargando pentagrama…",
  },
  en: {
    note: "Note",
    of: "of",
    staffLabel: "Staff in",
    renderError: "The staff could not be rendered.",
    loading: "Loading staff…",
  },
};

export function StaffRenderer({
  exercise,
  activeNoteIndex = 0,
  locale,
}: StaffRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [isLoadingVexFlow, setIsLoadingVexFlow] = useState(true);
  const copy = COPY[locale];
  const clefLabel = CLEF_LABELS[locale][exercise.clef];

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let cancelled = false;

    container.replaceChildren();
    hideRenderError(errorRef.current);

    loadVexFlow()
      .then((vexflow) => {
        if (cancelled) {
          return;
        }

        setIsLoadingVexFlow(false);

        try {
          drawExercise(vexflow, container, exercise, activeNoteIndex);
        } catch (error) {
          container.replaceChildren();
          showRenderError(
            errorRef.current,
            error instanceof Error ? error.message : copy.renderError,
          );
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setIsLoadingVexFlow(false);
        showRenderError(errorRef.current, copy.renderError);
      });

    return () => {
      cancelled = true;
    };
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
      <div className="relative min-h-[14rem]">
        <div
          aria-label={`${copy.staffLabel} ${clefLabel}`}
          className="min-h-[14rem] overflow-hidden rounded-md bg-[#f8fafc]"
          ref={containerRef}
          role="img"
        />
        {isLoadingVexFlow ? (
          <p
            className="absolute inset-0 flex items-center justify-center text-sm text-[#64748b]"
            role="status"
          >
            {copy.loading}
          </p>
        ) : null}
      </div>
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
  vexflow: VexFlowModule,
  container: HTMLDivElement,
  exercise: Exercise,
  activeNoteIndex: number,
) {
  const { Formatter, Renderer, Stave, Voice } = vexflow;

  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(WIDTH, HEIGHT);

  const context = renderer.getContext();
  context.setFillStyle("#111827");
  context.setStrokeStyle("#111827");

  const stave = new Stave(STAVE_X, STAVE_Y, STAVE_WIDTH);
  stave.addClef(exercise.clef);
  stave.setContext(context).draw();

  const notes = exercise.notes.map((note, index) =>
    createStaveNote(vexflow, note, exercise.clef, index === activeNoteIndex),
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
  vexflow: VexFlowModule,
  note: ExerciseNote,
  clef: Clef,
  isActive: boolean,
): StaveNote {
  const { StaveNote } = vexflow;

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
