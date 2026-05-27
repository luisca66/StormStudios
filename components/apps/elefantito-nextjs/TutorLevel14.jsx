"use client";
import { useState, useEffect, useRef } from "react";
import { useGame } from "./GameContext";
import { useLanguage } from "./LanguageContext";

const MUSIC_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev/music/elefantito/";
const MUSIC_TRACKS = Array.from({ length: 24 }, (_, i) => `${MUSIC_BASE}mate-${String(i + 1).padStart(2, "0")}.mp3`);

const FACTOR_PAIRS = [
  [44, 11, 4], [55, 11, 5], [66, 11, 6], [77, 11, 7], [88, 11, 8],
  [99, 11, 9], [22, 11, 2], [33, 11, 3], [24, 12, 2], [36, 12, 3],
  [48, 12, 4], [60, 12, 5], [72, 12, 6], [84, 12, 7], [96, 12, 8],
  [108, 12, 9], [120, 12, 10], [132, 12, 11], [144, 12, 12],
];

const TX = {
  es: {
    intro_title: "FACTORING 11 Y 12",
    intro_sub: "FACTORES · CHAINING",
    intro_body: "Ahora usamos las tablas del 11 y el 12 dentro de problemas grandes. El objetivo es reconocer cuando un número esconde un 11 o un 12 para convertir una multiplicación de dos cifras por dos cifras en una cadena.",
    ex_label: "— EJEMPLO —",
    ex_step1: "66 = 11 x 6",
    ex_step2: "53 x 11 = 583",
    ex_step3: "583 x 6 = 3498",
    ex_rule: "Usa primero el factor más grande o más conveniente para que el resultado intermedio sea manejable.",
    btn_start: "PRACTICAR →",
    solved: (n) => `Resueltos: ${n}`,
    phase_factor: "FACTOR",
    phase_chain: "CADENA",
    prompt_factor: (n) => `¿En qué factores descompones ${n}?`,
    prompt_big: (base, factor) => `Primero: ${base} x ${factor}`,
    prompt_small: (partial, factor) => `Ahora encadena: ${partial} x ${factor}`,
    factor_hint: (n, a, b) => `${n} aparece en las tablas como ${a} x ${b}.`,
    chain_hint: "Multiplica de izquierda a derecha y conserva el resultado para el siguiente paso.",
    input_hint: "Ejemplo: 11x6",
    btn_check: "VERIFICAR",
    btn_done: "¡Entendido, estoy listo!",
    sound_on: "🔊 Sonido ON",
    sound_off: "🔇 Sonido OFF",
  },
  en: {
    intro_title: "11 AND 12 FACTORING",
    intro_sub: "FACTORS · CHAINING",
    intro_body: "Now we use the 11 and 12 tables inside larger problems. The goal is recognizing when a number hides an 11 or a 12 so a two-digit by two-digit multiplication becomes a chain.",
    ex_label: "— EXAMPLE —",
    ex_step1: "66 = 11 x 6",
    ex_step2: "53 x 11 = 583",
    ex_step3: "583 x 6 = 3498",
    ex_rule: "Use the larger or more convenient factor first so the intermediate result stays manageable.",
    btn_start: "PRACTICE →",
    solved: (n) => `Solved: ${n}`,
    phase_factor: "FACTOR",
    phase_chain: "CHAIN",
    prompt_factor: (n) => `Which factors make ${n}?`,
    prompt_big: (base, factor) => `First: ${base} x ${factor}`,
    prompt_small: (partial, factor) => `Now chain: ${partial} x ${factor}`,
    factor_hint: (n, a, b) => `${n} appears in the tables as ${a} x ${b}.`,
    chain_hint: "Multiply left to right and keep the result for the next step.",
    input_hint: "Example: 11x6",
    btn_check: "CHECK",
    btn_done: "Got it, I'm ready!",
    sound_on: "🔊 Sound ON",
    sound_off: "🔇 Sound OFF",
  },
};

function normalizeFactorInput(value) {
  return value.toLowerCase().replace(/\s/g, "").replace(/[×*]/g, "x");
}

function genProblem() {
  const [product, factorA, factorB] = FACTOR_PAIRS[Math.floor(Math.random() * FACTOR_PAIRS.length)];
  const base = Math.floor(Math.random() * 80) + 20; // 20-99
  const first = base * factorA;
  const answer = first * factorB;
  return { product, factorA, factorB, base, first, answer };
}

export default function TutorLevel14({ onComplete }) {
  const { completeLesson } = useGame();
  const { lang } = useLanguage();
  const tx = TX[lang];

  const [phase, setPhase] = useState("intro");
  const [problem, setProblem] = useState(() => genProblem());
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [errors, setErrors] = useState(0);
  const [solved, setSolved] = useState(0);
  const [revealed, setRevealed] = useState([]);
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
  }, [step, phase, problem]);

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

  const steps = [
    {
      label: tx.phase_factor,
      instruction: tx.prompt_factor(problem.product),
      answer: `${problem.factorA}x${problem.factorB}`,
      answerAlt: `${problem.factorB}x${problem.factorA}`,
      hint: tx.factor_hint(problem.product, problem.factorA, problem.factorB),
      maxLength: 6,
      type: "factor",
    },
    {
      label: tx.phase_chain,
      instruction: tx.prompt_big(problem.base, problem.factorA),
      answer: problem.first,
      hint: tx.chain_hint,
      maxLength: 4,
      type: "number",
    },
    {
      label: tx.phase_chain,
      instruction: tx.prompt_small(problem.first, problem.factorB),
      answer: problem.answer,
      hint: tx.chain_hint,
      maxLength: 5,
      type: "number",
    },
  ];

  const allStepsDone = revealed.length === steps.length;

  const nextProblem = () => {
    setProblem(genProblem());
    setStep(0);
    setInput("");
    setErrors(0);
    setRevealed([]);
  };

  const isCorrect = (currentStep, value) => {
    if (currentStep.type === "factor") {
      const normalized = normalizeFactorInput(value);
      return normalized === currentStep.answer || normalized === currentStep.answerAlt;
    }
    return parseInt(value) === currentStep.answer;
  };

  const handleCheck = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (isCorrect(steps[step], trimmed)) {
      const newRevealed = [...revealed, steps[step].answer];
      setRevealed(newRevealed);
      setErrors(0);
      setInput("");
      if (step + 1 < steps.length) {
        setStep(step + 1);
      } else {
        setSolved(s => s + 1);
        setTimeout(nextProblem, 700);
      }
    } else {
      setErrors(e => e + 1);
      setInput("");
      setHasError(true);
      setTimeout(() => setHasError(false), 500);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleCheck();
  };

  const handleFinish = () => {
    completeLesson(14);
    onComplete();
  };

  if (phase === "intro") {
    return (
      <div className="bg-[#0c0e1a] border-2 border-[#14161e] p-6 flex flex-col h-[80vh] overflow-y-auto font-[family-name:var(--font-press-start-2p)]">
        <div className="flex-1 flex flex-col items-center justify-center gap-5 max-w-xl mx-auto w-full py-4">
          <div className="text-center">
            <div className="text-[#ffe600] text-[clamp(0.92rem,2.6vw,1.3rem)] leading-[2] drop-shadow-[0_0_14px_rgba(255,230,0,0.6)]">
              {tx.intro_title}
            </div>
            <div className="text-[#ffe60099] text-[clamp(0.65rem,1.6vw,0.88rem)] leading-[2] tracking-[0.1em]">
              {tx.intro_sub}
            </div>
          </div>

          <p className="text-[#7a7a8a] text-[0.62rem] leading-[2.2] text-center">
            {tx.intro_body}
          </p>

          <div className="bg-[#060810] border-2 border-[#ffe60040] rounded-sm w-full shadow-[0_0_16px_rgba(255,230,0,0.06)]">
            <div className="border-b border-[#ffe60020] px-4 py-2 flex items-center justify-between">
              <span className="text-[#ffe60080] text-[0.54rem] tracking-[0.25em]">{tx.ex_label}</span>
              <span className="text-[#00eeff] text-[0.65rem] drop-shadow-[0_0_6px_rgba(0,238,255,0.4)]">53 x 66</span>
            </div>
            <div className="p-4 flex flex-col gap-1.5">
              {[tx.ex_step1, tx.ex_step2, tx.ex_step3].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[#ffe60070] text-[0.5rem] w-4">{i + 1}</span>
                  <div className="bg-[#141100] border border-[#ffe60030] px-3 py-2 text-[#ffe600] text-[0.6rem] tracking-widest flex-1">
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
            className="bg-[#0c0e1a] hover:bg-[#1a1706] text-[#ffe600] border-2 border-[#ffe600] text-[0.6rem] py-4 px-8 cursor-pointer shadow-[0_0_0_2px_#000,0_0_14px_rgba(255,230,0,0.2)] active:scale-95 transition-all w-full"
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

      <div className="bg-[#060810] border-[3px] border-[#ffe600] shadow-[0_0_0_3px_#000,0_0_12px_rgba(255,230,0,0.12)] rounded-sm p-3 mb-3 text-center shrink-0">
        <div className="text-[#55555a] text-[0.54rem] tracking-[0.2em] mb-1">FACTORING METHOD</div>
        <div className="text-[#ffe600] text-[clamp(1.35rem,4vw,2rem)] drop-shadow-[0_0_12px_rgba(255,230,0,0.55)]">
          {problem.base} x {problem.product}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mb-3 shrink-0">
        {steps.map((s, idx) => {
          const isAnswered = idx < revealed.length;
          const isCurrent = !allStepsDone && idx === step;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between px-3 py-2 rounded-sm border-2 transition-all ${isAnswered ? "bg-[#141100] border-[#ffe60050] text-[#ffe600]" : isCurrent ? "bg-[#060c1a] border-[#00eeff] text-[#00eeff] shadow-[0_0_8px_rgba(0,238,255,0.08)]" : "bg-[#0a0a0a] border-[#1a1a1a] text-[#282828]"}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[0.5rem] shrink-0 ${isAnswered ? "text-[#ffe60070]" : isCurrent ? "text-[#00eeff70]" : "text-[#202020]"}`}>{s.label}</span>
                <span className="text-[0.58rem] leading-[1.8]">{s.instruction}</span>
              </div>
              {isAnswered && (
                <span className="text-[#ffe600] text-[0.78rem] shrink-0 ml-3 drop-shadow-[0_0_8px_rgba(255,230,0,0.7)]">{revealed[idx]}</span>
              )}
            </div>
          );
        })}
      </div>

      {!allStepsDone && (
        <div className="flex gap-2 mb-2 shrink-0">
          <input
            ref={inputRef}
            type="text"
            inputMode={steps[step].type === "factor" ? "text" : "numeric"}
            value={input}
            onChange={e => {
              const next = steps[step].type === "factor"
                ? e.target.value.replace(/[^0-9xX*×]/g, "").slice(0, steps[step].maxLength)
                : e.target.value.replace(/\D/g, "").slice(0, steps[step].maxLength);
              setInput(next);
            }}
            onKeyDown={handleKeyDown}
            placeholder={steps[step].type === "factor" ? tx.input_hint : "?"}
            className={`flex-1 bg-[#060810] border-[3px] text-[1.15rem] text-center py-3 px-4 outline-none transition-all ${hasError ? "border-[#ff2244] text-[#ff2244] shadow-[0_0_0_3px_#000,0_0_10px_rgba(255,34,68,0.2)]" : "border-[#ffe600] text-[#ffe600] shadow-[0_0_0_3px_#000,0_0_8px_rgba(255,230,0,0.06)]"}`}
          />
          <button onClick={handleCheck} className="bg-[#0c0e1a] hover:bg-[#151930] text-[#39ff14] border-2 border-[#39ff14] text-[0.6rem] px-5 cursor-pointer shadow-[0_0_0_2px_#000,0_0_10px_rgba(57,255,20,0.15)] active:scale-95 transition-all shrink-0">
            {tx.btn_check}
          </button>
        </div>
      )}

      {errors >= 2 && !allStepsDone && (
        <div className="bg-[#0f0a00] border border-[#ffe60040] px-4 py-2 mb-2 shrink-0">
          <span className="text-[#ffe600b0] text-[0.54rem] leading-[1.8]">{steps[step].hint}</span>
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
