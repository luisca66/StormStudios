"use client";
import { useState, useEffect, useRef } from "react";
import { useGame } from "./GameContext";
import { useLanguage } from "./LanguageContext";

const MUSIC_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev/music/elefantito/";
const MUSIC_TRACKS = Array.from({ length: 24 }, (_, i) => `${MUSIC_BASE}mate-${String(i + 1).padStart(2, "0")}.mp3`);

const FRACTIONS = [
  { n: 1, d: 7, cycle: "142857", answer: "0.142" },
  { n: 2, d: 7, cycle: "285714", answer: "0.285" },
  { n: 3, d: 7, cycle: "428571", answer: "0.428" },
  { n: 4, d: 7, cycle: "571428", answer: "0.571" },
  { n: 5, d: 7, cycle: "714285", answer: "0.714" },
  { n: 6, d: 7, cycle: "857142", answer: "0.857" },
  { n: 1, d: 11, cycle: "09", answer: "0.090" },
  { n: 2, d: 11, cycle: "18", answer: "0.181" },
  { n: 3, d: 11, cycle: "27", answer: "0.272" },
  { n: 4, d: 11, cycle: "36", answer: "0.363" },
  { n: 5, d: 11, cycle: "45", answer: "0.454" },
  { n: 6, d: 11, cycle: "54", answer: "0.545" },
  { n: 1, d: 3, cycle: "3", answer: "0.333" },
  { n: 2, d: 3, cycle: "6", answer: "0.666" },
  { n: 1, d: 9, cycle: "1", answer: "0.111" },
  { n: 5, d: 9, cycle: "5", answer: "0.555" },
  { n: 1, d: 12, cycle: "083", answer: "0.083" },
  { n: 5, d: 12, cycle: "416", answer: "0.416" },
];

const TX = {
  es: {
    intro_title: "FRACCIONES DECIMALES",
    intro_sub: "CICLOS MEMORIZADOS",
    intro_body: "Algunas divisiones aparecen tanto que conviene reconocerlas como patrones. Los septimos viven en el ciclo 142857, los onceavos alternan pares como 09, 18, 27, 36... y otros denominadores comunes tambien tienen una firma mental.",
    ex_label: "- EJEMPLO -",
    ex_step1: "1/7 = 0.142857...",
    ex_step2: "El ciclo de septimos es 142857.",
    ex_step3: "Para 3/7, el ciclo empieza en 42.",
    ex_step4: "Entonces 3/7 = 0.428571...",
    ex_rule: "En el juego responde solo los primeros 3 decimales. No redondees: corta el patron.",
    btn_start: "PRACTICAR ->",
    solved: (n) => `Resueltos: ${n}`,
    prompt: (n, d) => `¿Cuánto es ${n}/${d} en decimal?`,
    hint_label: "PISTA:",
    hint: (cycle) => `Busca el ciclo: ${cycle}. Escribe 0.xxx con los primeros 3 decimales.`,
    btn_check: "VERIFICAR",
    btn_done: "¡Entendido, estoy listo!",
    sound_on: "🔊 Sonido ON",
    sound_off: "🔇 Sonido OFF",
  },
  en: {
    intro_title: "DECIMAL FRACTIONS",
    intro_sub: "MEMORIZED CYCLES",
    intro_body: "Some divisions appear so often that it is worth recognizing them as patterns. Sevenths live in the 142857 cycle, elevenths alternate pairs like 09, 18, 27, 36... and other common denominators have their own mental signature.",
    ex_label: "- EXAMPLE -",
    ex_step1: "1/7 = 0.142857...",
    ex_step2: "The sevenths cycle is 142857.",
    ex_step3: "For 3/7, the cycle starts at 42.",
    ex_step4: "So 3/7 = 0.428571...",
    ex_rule: "In the game, answer only the first 3 decimals. Do not round: cut the pattern.",
    btn_start: "PRACTICE ->",
    solved: (n) => `Solved: ${n}`,
    prompt: (n, d) => `What is ${n}/${d} as a decimal?`,
    hint_label: "HINT:",
    hint: (cycle) => `Find the cycle: ${cycle}. Type 0.xxx with the first 3 decimals.`,
    btn_check: "CHECK",
    btn_done: "Got it, I'm ready!",
    sound_on: "🔊 Sound ON",
    sound_off: "🔇 Sound OFF",
  },
};

function genProblem() {
  return FRACTIONS[Math.floor(Math.random() * FRACTIONS.length)];
}

function normalize(value) {
  const trimmed = value.trim();
  if (/^\d{3}$/.test(trimmed)) return `0.${trimmed}`;
  const decimal = trimmed.startsWith(".") ? `0${trimmed}` : trimmed;
  const match = decimal.match(/^0\.(\d{1,3})$/);
  if (match) return `0.${match[1].padEnd(3, "0")}`;
  return trimmed;
}

export default function TutorLevel20({ onComplete }) {
  const { completeLesson } = useGame();
  const { lang } = useLanguage();
  const tx = TX[lang];

  const [phase, setPhase] = useState("intro");
  const [problem, setProblem] = useState(() => genProblem());
  const [input, setInput] = useState("");
  const [errors, setErrors] = useState(0);
  const [solved, setSolved] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(60);

  const musicPlayerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (musicPlayerRef.current) {
        musicPlayerRef.current.pause();
        musicPlayerRef.current.src = "";
        musicPlayerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (musicPlayerRef.current) musicPlayerRef.current.volume = isMuted ? 0 : volume / 100;
  }, [isMuted, volume]);

  useEffect(() => {
    if (phase === "practice") setTimeout(() => inputRef.current?.focus(), 50);
  }, [phase, problem]);

  const playMusic = () => {
    if (!musicPlayerRef.current) {
      const track = MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)];
      musicPlayerRef.current = new Audio(track);
      musicPlayerRef.current.volume = isMuted ? 0 : volume / 100;
      musicPlayerRef.current.onended = () => {
        musicPlayerRef.current = null;
        playMusic();
      };
    }
    if (!isMuted) musicPlayerRef.current.play().catch(() => {});
  };

  const startPractice = () => {
    setPhase("practice");
    playMusic();
  };

  const nextProblem = () => {
    setProblem(genProblem());
    setInput("");
    setErrors(0);
  };

  const handleCheck = () => {
    if (!input.trim()) return;

    if (normalize(input) === problem.answer) {
      setSolved(s => s + 1);
      setInput("");
      setErrors(0);
      setTimeout(nextProblem, 600);
    } else {
      setErrors(e => e + 1);
      setInput("");
      setHasError(true);
      setTimeout(() => setHasError(false), 500);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleFinish = () => {
    completeLesson(20);
    onComplete();
  };

  const handleInput = (value) => {
    const clean = value.replace(/[^\d.]/g, "");
    const firstDot = clean.indexOf(".");
    const normalized = firstDot === -1
      ? clean
      : clean.slice(0, firstDot + 1) + clean.slice(firstDot + 1).replace(/\./g, "");
    setInput(normalized.slice(0, 5));
  };

  if (phase === "intro") {
    return (
      <div className="bg-[#0c0e1a] border-2 border-[#14161e] p-6 flex flex-col h-[80vh] overflow-y-auto font-[family-name:var(--font-press-start-2p)]">
        <div className="flex-1 flex flex-col items-center justify-center gap-5 max-w-xl mx-auto w-full py-4">
          <div className="text-center">
            <div className="text-[#00eeff] text-[clamp(0.92rem,2.6vw,1.3rem)] leading-[2] drop-shadow-[0_0_14px_rgba(0,238,255,0.7)]">
              {tx.intro_title}
            </div>
            <div className="text-[#00eeff99] text-[clamp(0.65rem,1.6vw,0.88rem)] leading-[2] tracking-[0.1em]">
              {tx.intro_sub}
            </div>
          </div>

          <p className="text-[#7a7a8a] text-[0.62rem] leading-[2.2] text-center">
            {tx.intro_body}
          </p>

          <div className="bg-[#060810] border-2 border-[#00eeff40] rounded-sm w-full shadow-[0_0_16px_rgba(0,238,255,0.06)]">
            <div className="border-b border-[#00eeff20] px-4 py-2 flex items-center justify-between">
              <span className="text-[#00eeff80] text-[0.54rem] tracking-[0.25em]">{tx.ex_label}</span>
              <span className="text-[#ffe600] text-[0.65rem] drop-shadow-[0_0_6px_rgba(255,230,0,0.4)]">3/7</span>
            </div>
            <div className="p-4 flex flex-col gap-1.5">
              {[tx.ex_step1, tx.ex_step2, tx.ex_step3, tx.ex_step4].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[#00eeff70] text-[0.5rem] w-4">{i + 1}</span>
                  <div className="bg-[#061014] border border-[#00eeff30] px-3 py-2 text-[#00eeff] text-[0.6rem] tracking-widest flex-1">
                    {s}
                  </div>
                </div>
              ))}
              <div className="mt-2 text-[#39ff14] text-[0.56rem] leading-[2] drop-shadow-[0_0_6px_rgba(57,255,20,0.3)]">
                {tx.ex_rule}
              </div>
            </div>
          </div>

          <button
            onClick={startPractice}
            className="bg-[#0c0e1a] hover:bg-[#07151a] text-[#00eeff] border-2 border-[#00eeff] text-[0.6rem] py-4 px-8 cursor-pointer shadow-[0_0_0_2px_#000,0_0_14px_rgba(0,238,255,0.2)] active:scale-95 transition-all w-full"
          >
            {tx.btn_start}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0c0e1a] border-2 border-[#14161e] p-4 flex flex-col h-[80vh] font-[family-name:var(--font-press-start-2p)] overflow-hidden">
      <div className="flex items-center justify-between mb-3 shrink-0 gap-3">
        <span className="text-[#3a3a3a] text-[0.54rem] tracking-[0.15em] shrink-0">{tx.solved(solved)}</span>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setIsMuted(m => !m)}
            className={`text-[0.56rem] px-2 py-1.5 rounded-sm cursor-pointer transition-colors shrink-0 ${isMuted ? "bg-[#0d0d0d] border border-[#242424] text-[#3a3a3a]" : "bg-[#0c0e1a] border border-[#00eeff] text-[#00eeff] shadow-[0_0_5px_rgba(0,238,255,0.12)]"}`}
          >
            {isMuted ? tx.sound_off : tx.sound_on}
          </button>
          <span className="text-[0.65rem]">🔉</span>
          <input type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))} className="w-16 accent-[#00eeff]" />
          <span className="text-[0.65rem]">🔊</span>
        </div>
      </div>

      <div className="bg-[#060810] border-[3px] border-[#00eeff] shadow-[0_0_0_3px_#000,0_0_12px_rgba(0,238,255,0.12)] rounded-sm p-5 mb-4 text-center shrink-0">
        <div className="text-[#55555a] text-[0.54rem] tracking-[0.2em] mb-2">3 DECIMALES</div>
        <div className="text-[#00eeff] text-[clamp(1.6rem,5vw,2.6rem)] drop-shadow-[0_0_12px_rgba(0,238,255,0.65)]">
          {problem.n}/{problem.d}
        </div>
      </div>

      <div className="bg-[#060810] border-2 border-[#151923] rounded-sm p-4 mb-4 shrink-0">
        <div className="text-[#ffe600] text-[0.58rem] leading-[2] mb-2 drop-shadow-[0_0_6px_rgba(255,230,0,0.35)]">
          {tx.prompt(problem.n, problem.d)}
        </div>
        <div className="text-[#3a3a3a] text-[0.52rem] leading-[2]">
          {tx.hint(problem.cycle)}
        </div>
      </div>

      <div className="flex gap-2 mb-3 shrink-0">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={input}
          onChange={e => handleInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleCheck(); }}
          placeholder="0.xxx"
          className={`flex-1 bg-[#060810] border-[3px] text-[1.15rem] text-center py-3 px-4 outline-none transition-all ${hasError ? "border-[#ff2244] text-[#ff2244] shadow-[0_0_0_3px_#000,0_0_10px_rgba(255,34,68,0.2)]" : "border-[#ffe600] text-[#ffe600] shadow-[0_0_0_3px_#000,0_0_8px_rgba(255,230,0,0.06)]"}`}
        />
        <button onClick={handleCheck} className="bg-[#0c0e1a] hover:bg-[#151930] text-[#39ff14] border-2 border-[#39ff14] text-[0.6rem] px-5 cursor-pointer shadow-[0_0_0_2px_#000,0_0_10px_rgba(57,255,20,0.15)] active:scale-95 transition-all shrink-0">
          {tx.btn_check}
        </button>
      </div>

      {errors >= 2 && (
        <div className="bg-[#0f0a00] border border-[#ffe60040] px-4 py-2 mb-2 shrink-0">
          <span className="text-[#ffe600b0] text-[0.54rem] leading-[1.8]">
            {tx.hint_label} {tx.hint(problem.cycle)}
          </span>
        </div>
      )}

      <div className="mt-auto pt-3 border-t-2 border-[#14161e] shrink-0">
        <button onClick={handleFinish} className="font-[family-name:var(--font-press-start-2p)] text-[0.6rem] bg-[#39ff14] text-black border-2 border-[#39ff14] px-5 py-3 cursor-pointer shadow-[0_0_0_2px_#000,0_0_12px_rgba(57,255,20,0.35)] transition-transform active:scale-95 w-full">
          {tx.btn_done}
        </button>
      </div>
    </div>
  );
}
