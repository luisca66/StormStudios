"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "stormstudios_course_progress";

type Progress = {
  completed: Record<string, boolean>; // slug → completed
};

function loadProgress(): Progress {
  if (typeof window === "undefined") return { completed: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { completed: {} };
  } catch {
    return { completed: {} };
  }
}

function saveProgress(p: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // silently fail
  }
}

type Props = {
  lessonSlug: string;
  locale: string;
};

export default function ProgressTracker({ lessonSlug, locale }: Props) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const es = locale === "es";

  useEffect(() => {
    setMounted(true);
    const p = loadProgress();
    setIsCompleted(!!p.completed[lessonSlug]);
  }, [lessonSlug]);

  function toggle() {
    const p = loadProgress();
    const newVal = !isCompleted;
    p.completed[lessonSlug] = newVal;
    saveProgress(p);
    setIsCompleted(newVal);
  }

  // No renderizar en SSR para evitar hydration mismatch
  if (!mounted) return null;

  return (
    <button
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
    </button>
  );
}
