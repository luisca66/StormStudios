"use client";

import { createContext, useContext, useState, useEffect } from "react";

const GameContext = createContext();

export function GameProvider({ children }) {
  const [unlockedLevels, setUnlockedLevels] = useState([1]);
  const [completedLessons, setCompletedLessons] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedLevels = localStorage.getItem("unlockedLevels");
    const savedLessons = localStorage.getItem("completedLessons");
    if (savedLevels) setUnlockedLevels(JSON.parse(savedLevels));
    if (savedLessons) setCompletedLessons(JSON.parse(savedLessons));
  }, []);

  const completeLesson = (level) => {
    if (!completedLessons.includes(level)) {
      const newLessons = [...completedLessons, level];
      setCompletedLessons(newLessons);
      localStorage.setItem("completedLessons", JSON.stringify(newLessons));
    }
  };

  const unlockLevel = (level) => {
    if (!unlockedLevels.includes(level)) {
      const newLevels = [...unlockedLevels, level];
      setUnlockedLevels(newLevels);
      localStorage.setItem("unlockedLevels", JSON.stringify(newLevels));
    }
  };

  const resetProgress = () => {
    setUnlockedLevels([1]);
    setCompletedLessons([]);
    localStorage.removeItem("unlockedLevels");
    localStorage.removeItem("completedLessons");
  };

  return (
    <GameContext.Provider value={{ unlockedLevels, completedLessons, completeLesson, unlockLevel, resetProgress }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
