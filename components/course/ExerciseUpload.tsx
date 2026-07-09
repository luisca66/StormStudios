"use client";

import { useEffect, useRef, useState } from "react";
import type { MaestroFeedback } from "@/types/course";

type Props = {
  lessonId: string;
  locale: string;
};

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "success"; feedback: MaestroFeedback }
  | { status: "error"; message: string };

const MAX_MIDI_FILE_BYTES = 2 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 20_000;

export default function ExerciseUpload({ lessonId, locale }: Props) {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);
  const uploadTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const es = locale === "es";

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      uploadControllerRef.current?.abort();
      if (uploadTimeoutRef.current !== null) {
        window.clearTimeout(uploadTimeoutRef.current);
      }
    };
  }, []);

  async function handleFile(file: File) {
    if (!/\.(mid|midi)$/i.test(file.name)) {
      setState({
        status: "error",
        message: es
          ? "Solo se aceptan archivos MIDI (.mid o .midi)"
          : "Only MIDI files are accepted (.mid or .midi)",
      });
      return;
    }
    if (file.size > MAX_MIDI_FILE_BYTES) {
      setState({
        status: "error",
        message: es
          ? "El archivo supera el límite de 2 MB"
          : "The file exceeds the 2 MB limit",
      });
      return;
    }

    setState({ status: "uploading" });
    uploadControllerRef.current?.abort();
    const controller = new AbortController();
    uploadControllerRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    uploadTimeoutRef.current = timeoutId;

    try {
      const formData = new FormData();
      formData.append("midi", file);
      formData.append("lessonId", lessonId);
      formData.append("locale", locale);

      const response = await fetch("/api/maestro-virtual/check", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.error
          || (es ? "No se pudo analizar el archivo" : "The file could not be analyzed")
        );
      }
      const feedback: MaestroFeedback = payload;
      if (!isMountedRef.current || uploadControllerRef.current !== controller) return;
      setState({ status: "success", feedback });
    } catch (err) {
      if (!isMountedRef.current || uploadControllerRef.current !== controller) return;
      if (!controller.signal.aborted) {
        console.error(err);
      }
      setState({
        status: "error",
        message:
          err instanceof DOMException && err.name === "AbortError"
            ? (es ? "La revisión tardó demasiado. Intenta de nuevo." : "The review took too long. Please try again.")
            : err instanceof Error
              ? err.message
              : (es ? "Error al analizar el archivo. Intenta de nuevo." : "Error analyzing the file. Please try again."),
      });
    } finally {
      window.clearTimeout(timeoutId);
      if (uploadControllerRef.current === controller) {
        uploadControllerRef.current = null;
      }
      if (uploadTimeoutRef.current === timeoutId) {
        uploadTimeoutRef.current = null;
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function reset() {
    setState({ status: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="my-8 rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center gap-2">
        <span className="text-lg">🎓</span>
        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
          {es ? "Maestro Virtual — Subir ejercicio" : "Virtual Teacher — Upload exercise"}
        </h3>
      </div>

      <div className="p-5">
        {/* Referencia visual para lección 1 */}
        {lessonId === "02-leccion-1" && (
          <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-mono space-y-1">
            <p className="text-gray-600 font-semibold mb-1">
              {es ? "Orden del ejercicio:" : "Exercise order:"}
            </p>
            <p className="text-gray-500">
              ↑{" "}
              <span className="text-purple-700">
                Do · Sol · Re · La · Mi · Si · Fa# · Do#
              </span>
              <span className="text-gray-400 ml-2">
                {es ? "(quintas ascendentes)" : "(ascending fifths)"}
              </span>
            </p>
            <p className="text-gray-500">
              ↓{" "}
              <span className="text-blue-700">
                Fa · Sib · Mib · Lab · Reb · Solb · Dob
              </span>
              <span className="text-gray-400 ml-2">
                {es ? "(quintas descendentes)" : "(descending fifths)"}
              </span>
            </p>
            <p className="text-gray-400 mt-1">
              {es
                ? "8 notas por escala (I→I′) · 120 notas total · 1 canal (Soprano)"
                : "8 notes per scale (I→I′) · 120 notes total · 1 channel (Soprano)"}
            </p>
          </div>
        )}

        {/* Referencia visual para lección 2 — Modos */}
        {lessonId === "03-leccion-2" && (
          <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-mono space-y-1">
            <p className="text-gray-600 font-semibold mb-1">
              {es ? "Orden del ejercicio:" : "Exercise order:"}
            </p>
            <p className="text-gray-500">
              ↑{" "}
              <span className="text-purple-700">
                {es
                  ? "jónico · dórico · frigio · lidio · mixolidio · eólico · locrio"
                  : "Ionian · Dorian · Phrygian · Lydian · Mixolydian · Aeolian · Locrian"}
              </span>
            </p>
            <p className="text-gray-400 mt-1">
              {es
                ? "Modos paralelos desde una tónica libre (cualquier nota) · 8 notas ascendentes por modo · 7 modos · 56 notas total · 1 canal (Soprano)"
                : "Parallel modes from a free tonic (any note) · 8 ascending notes per mode · 7 modes · 56 notes total · 1 channel (Soprano)"}
            </p>
          </div>
        )}

        {/* Estado: idle / uploading */}
        {(state.status === "idle" || state.status === "uploading") && (
          <>
            <button
              type="button"
              onClick={() => state.status === "idle" && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              disabled={state.status === "uploading"}
              className={`
                w-full border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer bg-white
                ${state.status === "uploading" ? "opacity-50 cursor-not-allowed" : ""}
                ${
                  isDragging
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                }
              `}
            >
              {state.status === "uploading" ? (
                <>
                  <span aria-hidden="true" className="block animate-spin text-4xl mb-3">⚙️</span>
                  <span className="block text-gray-600 font-medium">
                    {es ? "Analizando tu ejercicio..." : "Analyzing your exercise..."}
                  </span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="block text-4xl mb-3">🎵</span>
                  <span className="block text-gray-700 font-medium mb-1">
                    {es
                      ? "Arrastra tu archivo MIDI aquí"
                      : "Drag your MIDI file here"}
                  </span>
                  <span className="block text-sm text-gray-400">
                    {es ? "o haz clic para seleccionar" : "or click to select"}
                  </span>
                  <span className="block text-xs text-gray-300 mt-2">.mid / .midi</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mid,.midi"
              onChange={handleChange}
              className="hidden"
              disabled={state.status === "uploading"}
            />
          </>
        )}

        {/* Estado: error */}
        {state.status === "error" && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-5">
            <p className="text-red-700 font-medium mb-3">⚠️ {state.message}</p>
            <button
              onClick={reset}
              className="text-sm text-red-600 underline hover:no-underline"
            >
              {es ? "Intentar de nuevo" : "Try again"}
            </button>
          </div>
        )}

        {/* Estado: success */}
        {state.status === "success" && (
          <FeedbackDisplay
            feedback={state.feedback}
            locale={locale}
            onReset={reset}
          />
        )}
      </div>
    </div>
  );
}

// ─── Feedback Display ─────────────────────────────────────────────────────────

function FeedbackDisplay({
  feedback,
  locale,
  onReset,
}: {
  feedback: MaestroFeedback;
  locale: string;
  onReset: () => void;
}) {
  const es = locale === "es";
  const passed = feedback.passed;

  // Término de la posición según el tipo de ejercicio de la lección.
  const unitWord =
    feedback.lessonId === "03-leccion-2" ? (es ? "modo" : "mode")
    : feedback.lessonId === "02-leccion-1" ? (es ? "escala" : "scale")
    : (es ? "compás" : "measure");

  return (
    <div className="space-y-4">
      {/* Resultado general */}
      <div
        className={`rounded-xl p-4 border ${
          passed
            ? "bg-green-50 border-green-200"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{passed ? "✅" : "🔧"}</span>
          <div>
            <p className="font-bold text-gray-900">
              {es
                ? `Puntuación: ${feedback.score}/100`
                : `Score: ${feedback.score}/100`}
            </p>
            <p className="text-sm text-gray-600">
              {feedback.summary[locale as "es" | "en"]}
            </p>
          </div>
        </div>
      </div>

      {/* Errores */}
      {feedback.violations.length > 0 && (
        <div>
          <h4 className="font-semibold text-red-700 text-sm mb-2">
            🚫 {es ? "Errores a corregir" : "Errors to correct"}
          </h4>
          {feedback.violations.map((v, i) => (
            <div
              key={i}
              className="text-sm bg-red-50 border border-red-200 rounded-lg p-3 mb-2"
            >
              <span className="font-semibold text-red-700">
                {v.ruleName[locale as "es" | "en"]}
              </span>
              {v.measure > 0 && (
                <span className="text-red-500 ml-2 text-xs">
                  ({unitWord} {v.measure})
                </span>
              )}
              <p className="text-red-600 mt-1">
                {v.message[locale as "es" | "en"]}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Sugerencias */}
      {feedback.suggestions.length > 0 && (
        <div>
          <h4 className="font-semibold text-blue-700 text-sm mb-2">
            💡 {es ? "Sugerencias" : "Suggestions"}
          </h4>
          {feedback.suggestions.map((s, i) => (
            <div
              key={i}
              className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2"
            >
              <p className="text-blue-700">
                {s.message[locale as "es" | "en"]}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Botón reintentar */}
      <button
        onClick={onReset}
        className="w-full py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
      >
        {es ? "Subir otro archivo" : "Upload another file"}
      </button>
    </div>
  );
}
