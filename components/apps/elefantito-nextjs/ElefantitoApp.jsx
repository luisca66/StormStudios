"use client";

import { useMemo, useState } from "react";
import { GameProvider, useGame } from "./GameContext";
import { LanguageProvider, useLanguage } from "./LanguageContext";
import GameLevel from "./GameLevel";
import Scanlines from "./Scanlines";
import TutorLevel1 from "./TutorLevel1";
import TutorLevel2 from "./TutorLevel2";
import TutorLevel3 from "./TutorLevel3";
import TutorLevel4 from "./TutorLevel4";
import TutorLevel5 from "./TutorLevel5";
import TutorLevel6 from "./TutorLevel6";
import TutorLevel7 from "./TutorLevel7";
import TutorLevel8 from "./TutorLevel8";
import TutorLevel9 from "./TutorLevel9";
import TutorLevel10 from "./TutorLevel10";
import TutorLevel11 from "./TutorLevel11";
import TutorLevel12 from "./TutorLevel12";
import TutorLevel13 from "./TutorLevel13";
import TutorLevel14 from "./TutorLevel14";
import TutorLevel15 from "./TutorLevel15";
import TutorLevel16 from "./TutorLevel16";
import TutorLevel17 from "./TutorLevel17";
import TutorLevel18 from "./TutorLevel18";
import TutorLevel19 from "./TutorLevel19";
import TutorLevel20 from "./TutorLevel20";

const MAX_LEVEL = 20;

const LEVEL_CONFIG = {
  1:  { problemTypes: [0, 2, 4] },
  2:  { problemTypes: [1, 3, 5] },
  3:  { problemTypes: [6] },
  4:  { problemTypes: [7] },
  5:  { problemTypes: [8] },
  6:  { problemTypes: [9] },
  7:  { problemTypes: [10] },
  8:  { problemTypes: [14] },
  9:  { problemTypes: [11] },
  10: { problemTypes: [12] },
  11: { problemTypes: [15] },
  12: { problemTypes: [13] },
  13: { problemTypes: [17] },
  14: { problemTypes: [18] },
  15: { problemTypes: [19] },
  16: { problemTypes: [20] },
  17: { problemTypes: [21] },
  18: { problemTypes: [22] },
  19: { problemTypes: [23] },
  20: { problemTypes: [24] },
};

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

const TUTOR_MAP = { 1: TutorLevel1, 2: TutorLevel2, 3: TutorLevel3, 4: TutorLevel4, 5: TutorLevel5, 6: TutorLevel6, 7: TutorLevel7, 8: TutorLevel8, 9: TutorLevel9, 10: TutorLevel10, 11: TutorLevel11, 12: TutorLevel12, 13: TutorLevel13, 14: TutorLevel14, 15: TutorLevel15, 16: TutorLevel16, 17: TutorLevel17, 18: TutorLevel18, 19: TutorLevel19, 20: TutorLevel20 };

function HomeScreen({ onLevel }) {
  const { unlockedLevels, resetProgress } = useGame();
  const { t, toggleLanguage } = useLanguage();

  const stars = useMemo(() => {
    return Array.from({ length: 34 }, () => ({
      w: 1.5 + Math.random() * 2.5,
      x: Math.random() * 100,
      y: Math.random() * 100,
      dur: 1.5 + Math.random() * 2.5,
      del: Math.random() * 3,
    }));
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 relative overflow-hidden bg-[#08090f]">
      <Scanlines />

      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute bg-white rounded-full"
          style={{
            width: s.w,
            height: s.w,
            left: `${s.x}%`,
            top: `${s.y}%`,
            animation: `twinkle ${s.dur}s ${s.del}s infinite ease-in-out`,
          }}
        />
      ))}

      <div className="absolute top-4 left-4 w-10 h-10 border-t-4 border-l-4 border-[#39ff1425]" />
      <div className="absolute top-4 right-4 w-10 h-10 border-t-4 border-r-4 border-[#39ff1425]" />
      <div className="absolute bottom-4 left-4 w-10 h-10 border-b-4 border-l-4 border-[#39ff1425]" />
      <div className="absolute bottom-4 right-4 w-10 h-10 border-b-4 border-r-4 border-[#39ff1425]" />

      <button
        onClick={toggleLanguage}
        className="absolute top-4 right-4 font-[family-name:var(--font-press-start-2p)] text-[0.5rem] bg-[#0c0e1a] text-[#00eeff] border-2 border-[#00eeff] px-3 py-2 rounded-sm cursor-pointer shadow-[0_0_8px_rgba(0,238,255,0.2)] z-10 hover:bg-[#1a1d36] transition-colors"
      >
        {t("lang_toggle")}
      </button>

      <div className="mb-3 animate-[floatY_3s_ease-in-out_infinite] z-10">
        <img
          src="/elefantito_piso.png"
          alt=""
          className="w-[76px] drop-shadow-[0_0_16px_rgba(57,255,20,0.55)]"
        />
      </div>

      <div className="font-[family-name:var(--font-press-start-2p)] text-[clamp(1.3rem,3.8vw,2.8rem)] leading-[1.8] text-[#39ff14] whitespace-pre-line text-center drop-shadow-[0_0_20px_#39ff14] mb-2 z-10 text-shadow-[0_0_40px_rgba(57,255,20,0.35)]">
        ELEFANTITO{"\n"}MATEMÁTICO
      </div>

      <div className="font-[family-name:var(--font-press-start-2p)] text-[clamp(0.38rem,1vw,0.58rem)] text-[#ffe600] tracking-[0.18em] mb-10 z-10 drop-shadow-[0_0_8px_rgba(255,230,0,0.35)]">
        Storm Studios Learning
      </div>

      <div className="font-[family-name:var(--font-press-start-2p)] text-[0.52rem] text-[#3a3a3a] tracking-[0.1em] mb-5 z-10">
        — SELECCIONA NIVEL —
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 sm:gap-4 place-items-center mb-10 z-10 w-full max-w-[520px]">
        {LEVELS.map((level) => {
          const isUnlocked = unlockedLevels.includes(level);

          return isUnlocked ? (
            <button
              key={level}
              onClick={() => onLevel(level)}
              className="w-[72px] h-[72px] sm:w-[86px] sm:h-[86px] font-[family-name:var(--font-press-start-2p)] text-xl sm:text-2xl bg-[#071207] text-[#39ff14] border-4 border-[#39ff14] rounded flex flex-col items-center justify-center gap-1 drop-shadow-[0_0_12px_#39ff14] shadow-[0_0_0_4px_#000,0_0_24px_rgba(57,255,20,0.3),inset_0_0_16px_rgba(57,255,20,0.06)] hover:scale-105 transition-transform"
            >
              {level}
            </button>
          ) : (
            <button
              key={level}
              disabled
              className="w-[72px] h-[72px] sm:w-[86px] sm:h-[86px] font-[family-name:var(--font-press-start-2p)] text-xl sm:text-2xl bg-[#090909] text-[#222] border-4 border-[#191919] rounded flex flex-col items-center justify-center gap-1 shadow-[0_0_0_4px_#000] cursor-not-allowed"
            >
              {level}
              <span className="text-[0.5rem] text-[#282828]">🔒</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={resetProgress}
        className="font-[family-name:var(--font-press-start-2p)] text-[0.45rem] bg-transparent text-[#252525] border-2 border-[#181818] px-4 py-2 rounded-sm cursor-pointer transition-all hover:text-[#ff2244] hover:border-[#ff2244] z-10"
      >
        {t("reset_progress")}
      </button>
    </div>
  );
}

function LevelScreen({ level, onMap, onLevel }) {
  const { completedLessons, unlockLevel } = useGame();
  const { t, toggleLanguage } = useLanguage();
  const hasCompletedLesson = completedLessons.includes(level);
  const [activeTab, setActiveTab] = useState(hasCompletedLesson ? "game" : "tutor");
  const Tutor  = TUTOR_MAP[level]  ?? TutorLevel1;
  const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG[1];

  return (
    <div className="h-full flex flex-col bg-[#08090f] overflow-hidden relative">
      <Scanlines />

      <div className="flex items-center gap-3 px-4 py-2 bg-[#0a0b14] border-b-2 border-[#14161e] shrink-0 z-10 relative">
        <button
          onClick={onMap}
          className="font-[family-name:var(--font-press-start-2p)] text-[0.46rem] bg-transparent text-[#3a3a3a] border-2 border-[#202020] px-3 py-2 rounded-sm cursor-pointer transition-all shrink-0 hover:text-[#888] hover:border-[#555]"
        >
          {t("back_to_map")}
        </button>

        <div className="flex gap-1.5 flex-1">
          <button
            onClick={() => setActiveTab("tutor")}
            className={`font-[family-name:var(--font-press-start-2p)] text-[0.5rem] px-3.5 py-2 rounded-sm cursor-pointer transition-all ${
              activeTab === "tutor"
                ? "bg-[#39ff14] text-black border-2 border-[#39ff14] shadow-[0_0_0_2px_#000,0_0_10px_rgba(57,255,20,0.35)]"
                : "bg-transparent text-[#39ff14] border-2 border-[#39ff14] shadow-none"
            }`}
          >
            {t("tutor_tab")}
          </button>

          <button
            onClick={() => hasCompletedLesson && setActiveTab("game")}
            className={`font-[family-name:var(--font-press-start-2p)] text-[0.5rem] px-3.5 py-2 rounded-sm transition-all ${
              activeTab === "game"
                ? "bg-[#39ff14] text-black border-2 border-[#39ff14] shadow-[0_0_0_2px_#000,0_0_10px_rgba(57,255,20,0.35)] cursor-pointer"
                : hasCompletedLesson
                  ? "bg-transparent text-[#39ff14] border-2 border-[#39ff14] shadow-none cursor-pointer"
                  : "bg-transparent text-[#222] border-2 border-[#191919] shadow-none cursor-not-allowed"
            }`}
          >
            {t("play_tab")} {!hasCompletedLesson && "🔒"}
          </button>
        </div>

        <span className="font-[family-name:var(--font-press-start-2p)] text-[0.5rem] text-[#ffe600] shrink-0 drop-shadow-[0_0_8px_rgba(255,230,0,0.35)]">
          NIVEL {level}
        </span>

        <button
          onClick={toggleLanguage}
          className="font-[family-name:var(--font-press-start-2p)] text-[0.46rem] bg-[#0c0e1a] text-[#00eeff] border-2 border-[#00eeff] px-3 py-2 rounded-sm cursor-pointer shrink-0 shadow-[0_0_6px_rgba(0,238,255,0.15)] ml-3 hover:bg-[#1a1d36]"
        >
          {t("lang_toggle")}
        </button>
      </div>

      <div className="flex-1 p-2 overflow-hidden z-10 relative flex justify-center w-full">
        <div className="w-full max-w-5xl flex flex-col justify-center">
          {activeTab === "tutor" ? (
            <Tutor onComplete={() => setActiveTab("game")} />
          ) : (
            <GameLevel
              level={level}
              problemTypes={config.problemTypes}
              onComplete={() => {
                if (level < MAX_LEVEL) unlockLevel(level + 1);
                onMap();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ElefantitoInner() {
  const [screen, setScreen] = useState({ kind: "map" });

  if (screen.kind === "level") {
    return (
      <LevelScreen
        level={screen.level}
        onMap={() => setScreen({ kind: "map" })}
        onLevel={(level) => setScreen({ kind: "level", level })}
      />
    );
  }

  return <HomeScreen onLevel={(level) => setScreen({ kind: "level", level })} />;
}

export default function ElefantitoApp({ initialLocale = "es" }) {
  return (
    <LanguageProvider initialLanguage={initialLocale === "en" ? "en" : "es"}>
      <GameProvider>
        <ElefantitoInner />
      </GameProvider>
    </LanguageProvider>
  );
}
