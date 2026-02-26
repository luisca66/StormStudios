"use client";

import { useState, useRef } from "react";
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

export default function ExerciseUpload({ lessonId, locale }: Props) {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const es = locale === "es";

  async function handleFile(file: File) {
    if (!file.name.endsWith(".mid") && !file.name.endsWith(".midi")) {
      setState({
        status: "error",
        message: es
          ? "Solo se aceptan archivos MIDI (.mid o .midi)"
          : "Only MIDI files are accepted (.mid or .midi)",
      });
      return;
    }

    setState({ status: "uploading" });

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const midiBase64 = btoa(String.fromCharCode(...bytes));

      const response = await fetch("/api/maestro-virtual/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, midiBase64 }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const feedback: MaestroFeedback = await response.json();
      setState({ status: "success", feedback });
    } catch (err) {
      console.error(err);
      setState({
        status: "error",
        message: es
          ? "Error al analizar el archivo. Intenta de nuevo."
          : "Error analyzing the file. Please try again.",
      });
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
        {/* Estado: idle / uploading */}
        {(state.status === "idle" || state.status === "uploading") && (
          <>
            <div
              onClick={() => state.status === "idle" && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
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
                  <div className="animate-spin text-4xl mb-3">⚙️</div>
                  <p className="text-gray-600 font-medium">
                    {es ? "Analizando tu ejercicio..." : "Analyzing your exercise..."}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-3">🎵</div>
                  <p className="text-gray-700 font-medium mb-1">
                    {es
                      ? "Arrastra tu archivo MIDI aquí"
                      : "Drag your MIDI file here"}
                  </p>
                  <p className="text-sm text-gray-400">
                    {es ? "o haz clic para seleccionar" : "or click to select"}
                  </p>
                  <p className="text-xs text-gray-300 mt-2">.mid / .midi</p>
                </>
              )}
            </div>
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
              {v.measure && (
                <span className="text-red-500 ml-2 text-xs">
                  ({es ? "compás" : "measure"} {v.measure})
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
