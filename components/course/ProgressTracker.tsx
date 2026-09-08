"use client";

import { useState, useSyncExternalStore } from "react";

import { PROGRESS_EVENT as STORAGE_EVENT, readCourseProgress as loadProgress, writeCourseProgress as saveProgress } from "@/lib/course-progress";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(STORAGE_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(STORAGE_EVENT, handler);
  };
}

function getCompletionSnapshot(lessonSlug: string) {
  return !!loadProgress().completed[lessonSlug];
}

type Props = {
  lessonSlug: string;
  locale: string;
};

export default function ProgressTracker({ lessonSlug, locale }: Props) {
  const isCompleted = useSyncExternalStore(
    subscribe,
    () => getCompletionSnapshot(lessonSlug),
    () => false
  );
  const es = locale === "es";
  const [saveError, setSaveError] = useState(false);

  function toggle() {
    const p = loadProgress();
    const newVal = !isCompleted;
    p.completed[lessonSlug] = newVal;
    try { saveProgress(p); setSaveError(false); } catch { setSaveError(true); }
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }

  return (
    <><button
      aria-pressed={isCompleted}
      onClick={toggle}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border
        ${
          isCompleted
            ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
            : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
        }
      `}
    >
      <span className="text-base">{isCompleted ? "✅" : "⬜"}</span>
      {isCompleted
        ? es
          ? "Lección completada"
          : "Lesson completed"
        : es
        ? "Marcar como completada"
        : "Mark as complete"}
    </button>{saveError && <p role="alert">{es ? "No se pudo guardar. Permite el almacenamiento del navegador." : "Could not save. Allow browser storage."}</p>}</>
  );
}
