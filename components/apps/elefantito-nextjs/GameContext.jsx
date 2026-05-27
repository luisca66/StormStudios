"use client";

import { createContext, useContext, useState, useEffect } from "react";

const GameContext = createContext();
const PROGRESS_VERSION = "locked-v1";
const INITIAL_UNLOCKED_LEVELS = [1];
const INITIAL_COMPLETED_LESSONS = [];

function readStoredLevels(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function GameProvider({ children }) {
  const ALL_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const [unlockedLevels, setUnlockedLevels] = useState(INITIAL_UNLOCKED_LEVELS);
  const [completedLessons, setCompletedLessons] = useState(INITIAL_COMPLETED_LESSONS);

  useEffect(() => {
    const savedVersion = localStorage.getItem("elefantitoProgressVersion");

    if (savedVersion !== PROGRESS_VERSION) {
      setUnlockedLevels(INITIAL_UNLOCKED_LEVELS);
      setCompletedLessons(INITIAL_COMPLETED_LESSONS);
      localStorage.setItem("elefantitoProgressVersion", PROGRESS_VERSION);
      localStorage.setItem("unlockedLevels", JSON.stringify(INITIAL_UNLOCKED_LEVELS));
      localStorage.setItem("completedLessons", JSON.stringify(INITIAL_COMPLETED_LESSONS));
      return;
    }

    setUnlockedLevels(readStoredLevels("unlockedLevels", INITIAL_UNLOCKED_LEVELS));
    setCompletedLessons(readStoredLevels("completedLessons", INITIAL_COMPLETED_LESSONS));
  }, []);

  const completeLesson = (level) => {
    if (!completedLessons.includes(level)) {
      const newLessons = [...completedLessons, level];
      setCompletedLessons(newLessons);
      localStorage.setItem("completedLessons", JSON.stringify(newLessons));
    }
  };

  const unlockLevel = (level) => {
    if (!unlockedLevels.includes(level) && ALL_LEVELS.includes(level)) {
      const newLevels = [...unlockedLevels, level];
      setUnlockedLevels(newLevels);
      localStorage.setItem("unlockedLevels", JSON.stringify(newLevels));
    }
  };

  const resetProgress = () => {
    setUnlockedLevels(INITIAL_UNLOCKED_LEVELS);
    setCompletedLessons(INITIAL_COMPLETED_LESSONS);
    localStorage.setItem("elefantitoProgressVersion", PROGRESS_VERSION);
    localStorage.setItem("unlockedLevels", JSON.stringify(INITIAL_UNLOCKED_LEVELS));
    localStorage.setItem("completedLessons", JSON.stringify(INITIAL_COMPLETED_LESSONS));
  };

  return (
    <GameContext.Provider value={{ unlockedLevels, completedLessons, completeLesson, unlockLevel, resetProgress }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside <GameProvider>");
  return ctx;
}
