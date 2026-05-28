"use client";

import React, { useState } from "react";
import { useFirebaseMnemonic } from "./useFirebaseMnemonic";
import MemoriaGame from "./MemoriaGame";
import MemoriaPractice from "./MemoriaPractice";

type MemoriaAppProps = {
  locale: string;
};

export default function MemoriaApp({ locale }: MemoriaAppProps) {
  const isEN = locale === "en";
  const [activeTab, setActiveTab] = useState<"game" | "practice">("game");

  const { words, practiceWords, loading, saveRangeWords } = useFirebaseMnemonic(locale);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-[#0f172a] text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-500 mb-4"></div>
        <p className="text-xl font-semibold animate-pulse">{isEN ? "Loading..." : "Cargando..."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0f172a] text-white font-sans flex flex-col">
      {/* Tab Bar */}
      <div className="flex justify-center gap-3 p-4 pt-6 shrink-0">
        <button
          onClick={() => setActiveTab("game")}
          className={`px-6 py-2.5 rounded-full font-mono text-sm font-semibold tracking-wide transition-all duration-200 border
            ${activeTab === "game" 
              ? "bg-violet-500/20 border-violet-500/70 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]" 
              : "bg-transparent border-violet-500/30 text-white/50 hover:text-white/85 hover:border-violet-500/60"
            }`}
        >
          {isEN ? "🃏 Memory Game" : "🃏 Juego de Memoria"}
        </button>
        <button
          onClick={() => setActiveTab("practice")}
          className={`px-6 py-2.5 rounded-full font-mono text-sm font-semibold tracking-wide transition-all duration-200 border
            ${activeTab === "practice" 
              ? "bg-violet-500/20 border-violet-500/70 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]" 
              : "bg-transparent border-violet-500/30 text-white/50 hover:text-white/85 hover:border-violet-500/60"
            }`}
        >
          {isEN ? "📝 Practice Mode" : "📝 Modo de Práctica"}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 w-full">
        {activeTab === "game" && words && (
          <MemoriaGame locale={locale} wordsData={words} onSaveWords={saveRangeWords} />
        )}
        {activeTab === "practice" && practiceWords && (
          <MemoriaPractice locale={locale} practiceWords={practiceWords} onSaveWords={saveRangeWords} />
        )}
      </div>
    </div>
  );
}
