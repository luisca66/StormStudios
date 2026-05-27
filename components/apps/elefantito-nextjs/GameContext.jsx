"use client";

import { createContext, useContext, useState, useEffect } from "react";

const GameContext = createContext();

export function GameProvider({ children }) {
  const ALL_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const [unlockedLevels, setUnlockedLevels] = useState(ALL_LEVELS);
  const [completedLessons, setCompletedLessons] = useState(ALL_LEVELS);

  // DEV MODE: all levels unlocked — skip localStorage
  // To restore normal mode, uncomment the block below and remove this comment
  // useEffect(() => {
  //   const savedLevels = localStorage.getItem("unlockedLevels");
  //   const savedLessons = localStorage.getItem("completedLessons");
  //   if (savedLevels) setUnlockedLevels(JSON.parse(savedLevels));
  //   if (savedLessons) setCompletedLessons(JSON.parse(savedLessons));
  // }, []);

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
    setUnlockedLevels(ALL_LEVELS);
    setCompletedLessons(ALL_LEVELS);
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
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside <GameProvider>");
  return ctx;
}
