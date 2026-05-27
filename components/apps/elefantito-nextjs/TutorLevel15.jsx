"use client";
import { useState, useEffect, useRef } from "react";
import { useGame } from "./GameContext";
import { useLanguage } from "./LanguageContext";

const MUSIC_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev/music/elefantito/";
const MUSIC_TRACKS = Array.from({ length: 24 }, (_, i) => `${MUSIC_BASE}mate-${String(i + 1).padStart(2, "0")}.mp3`);

const TX = {
  es: {
    intro_title: "MULTIPLICACION 2 x 1",
    intro_sub: "LEY DISTRIBUTIVA",
    intro_body: "Cuando multiplicas un numero de dos cifras por uno de una cifra, no tienes que verlo como una sola pieza. Puedes partirlo en decenas y unidades, multiplicar cada parte, y luego sumar ambos resultados.",
    ex_label: "- EJEMPLO -",
    ex_step1: "42 = 40 + 2",
    ex_step2: "40 x 7 = 280",
    ex_step3: "2 x 7 = 14",
    ex_step4: "280 + 14 = 294",
    ex_rule: "Descompone en decenas y unidades: 42 = 40 + 2.",
    btn_start: "PRACTICAR ->",
    solved: (n) => `Resueltos: ${n}`,
    step: (i) => `PASO ${i}`,
    prompt_tens: (tens, factor) => `Multiplica las decenas: ${tens} x ${factor}`,
    prompt_units: (units, factor) => `Multiplica las unidades: ${units} x ${factor}`,
    prompt_sum: (a, b) => `Suma ambos resultados: ${a} + ${b}`,
    hint_label: "PISTA:",
    hint_tens: (num, tens, units) => `Descompón en decenas y unidades: ${num} = ${tens} + ${units}.`,
    hint_units: "Ahora multiplica solo las unidades por el mismo factor.",
    hint_sum: "Conserva los dos resultados parciales y sumalos al final.",
    btn_check: "VERIFICAR",
    btn_done: "¡Entendido, estoy listo!",
    sound_on: "🔊 Sonido ON",
    sound_off: "🔇 Sonido OFF",
  },
  en: {
    intro_title: "2 x 1 MULTIPLICATION",
    intro_sub: "DISTRIBUTIVE LAW",
    intro_body: "When you multiply a two-digit number by a one-digit number, you do not have to treat it as one solid block. Split it into tens and units, multiply each part, then add both results.",
    ex_label: "- EXAMPLE -",
    ex_step1: "42 = 40 + 2",
    ex_step2: "40 x 7 = 280",
    ex_step3: "2 x 7 = 14",
    ex_step4: "280 + 14 = 294",
    ex_rule: "Split into tens and units: 42 = 40 + 2.",
    btn_start: "PRACTICE ->",
    solved: (n) => `Solved: ${n}`,
    step: (i) => `STEP ${i}`,
    prompt_tens: (tens, factor) => `Multiply the tens: ${tens} x ${factor}`,
    prompt_units: (units, factor) => `Multiply the units: ${units} x ${factor}`,
    prompt_sum: (a, b) => `Add both results: ${a} + ${b}`,
    hint_label: "HINT:",
    hint_tens: (num, tens, units) => `Split into tens and units: ${num} = ${tens} + ${units}.`,
    hint_units: "Now multiply only the units by the same factor.",
    hint_sum: "Hold both partial results and add them at the end.",
    btn_check: "CHECK",
    btn_done: "Got it, I'm ready!",
    sound_on: "🔊 Sound ON",
    sound_off: "🔇 Sound OFF",
  },
};

function genProblem() {
  let num;
  do {
    num = Math.floor(Math.random() * 88) + 12; // 12-99
  } while (num % 10 === 0);

  const factor = Math.floor(Math.random() * 8) + 2; // 2-9
  const tens = Math.floor(num / 10) * 10;
  const units = num % 10;
  const tensProduct = tens * factor;
  const unitsProduct = units * factor;
  const answer = tensProduct + unitsProduct;

  return { num, factor, tens, units, tensProduct, unitsProduct, answer };
}

export default function TutorLevel15({ onComplete }) {
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
      instruction: tx.prompt_tens(problem.tens, problem.factor),
      answer: problem.tensProduct,
      hint: tx.hint_tens(problem.num, problem.tens, problem.units),
    },
    {
      instruction: tx.prompt_units(problem.units, problem.factor),
      answer: problem.unitsProduct,
      hint: tx.hint_units,
    },
    {
      instruction: tx.prompt_sum(problem.tensProduct, problem.unitsProduct),
      answer: problem.answer,
      hint: tx.hint_sum,
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

  const handleCheck = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (parseInt(trimmed) === steps[step].answer) {
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
    completeLesson(15);
    onComplete();
  };

  if (phase === "intro") {
    return (
      <div className="bg-[#0c0e1a] border-2 border-[#14161e] p-6 flex flex-col h-[80vh] overflow-y-auto font-[family-name:var(--font-press-start-2p)]">
        <div className="flex-1 flex flex-col items-center justify-center gap-5 max-w-xl mx-auto w-full py-4">
          <div className="text-center">
            <div className="text-[#00eeff] text-[clamp(0.92rem,2.6vw,1.3rem)] leading-[2] drop-shadow-[0_0_14px_rgba(0,238,255,0.6)]">
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
              <span className="text-[#ffe600] text-[0.65rem] drop-shadow-[0_0_6px_rgba(255,230,0,0.4)]">42 x 7</span>
            </div>
            <div className="p-4 flex flex-col gap-1.5">
              {[tx.ex_step1, tx.ex_step2, tx.ex_step3, tx.ex_step4].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[#00eeff70] text-[0.5rem] w-4">{i + 1}</span>
                  <div className="bg-[#061114] border border-[#00eeff30] px-3 py-2 text-[#00eeff] text-[0.6rem] tracking-widest flex-1">
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
            className="bg-[#0c0e1a] hover:bg-[#06141a] text-[#00eeff] border-2 border-[#00eeff] text-[0.6rem] py-4 px-8 cursor-pointer shadow-[0_0_0_2px_#000,0_0_14px_rgba(0,238,255,0.2)] active:scale-95 transition-all w-full"
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

      <div className="bg-[#060810] border-[3px] border-[#00eeff] shadow-[0_0_0_3px_#000,0_0_12px_rgba(0,238,255,0.12)] rounded-sm p-3 mb-3 text-center shrink-0">
        <div className="text-[#55555a] text-[0.54rem] tracking-[0.2em] mb-1">DISTRIBUTIVA</div>
        <div className="text-[#00eeff] text-[clamp(1.35rem,4vw,2rem)] drop-shadow-[0_0_12px_rgba(0,238,255,0.55)]">
          {problem.num} x {problem.factor}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mb-3 shrink-0">
        {steps.map((s, idx) => {
          const isAnswered = idx < revealed.length;
          const isCurrent = !allStepsDone && idx === step;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between px-3 py-2 rounded-sm border-2 transition-all ${isAnswered ? "bg-[#061114] border-[#00eeff50] text-[#00eeff]" : isCurrent ? "bg-[#060c1a] border-[#ffe600] text-[#ffe600] shadow-[0_0_8px_rgba(255,230,0,0.08)]" : "bg-[#0a0a0a] border-[#1a1a1a] text-[#282828]"}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[0.5rem] shrink-0 ${isAnswered ? "text-[#00eeff70]" : isCurrent ? "text-[#ffe60080]" : "text-[#202020]"}`}>{tx.step(idx + 1)}</span>
                <span className="text-[0.58rem] leading-[1.8]">{s.instruction}</span>
              </div>
              {isAnswered && (
                <span className="text-[#00eeff] text-[0.78rem] shrink-0 ml-3 drop-shadow-[0_0_8px_rgba(0,238,255,0.7)]">{revealed[idx]}</span>
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
            inputMode="numeric"
            value={input}
            onChange={e => setInput(e.target.value.replace(/\D/g, "").slice(0, 3))}
            onKeyDown={handleKeyDown}
            placeholder="?"
            className={`flex-1 bg-[#060810] border-[3px] text-[1.15rem] text-center py-3 px-4 outline-none transition-all ${hasError ? "border-[#ff2244] text-[#ff2244] shadow-[0_0_0_3px_#000,0_0_10px_rgba(255,34,68,0.2)]" : "border-[#ffe600] text-[#ffe600] shadow-[0_0_0_3px_#000,0_0_8px_rgba(255,230,0,0.06)]"}`}
          />
          <button onClick={handleCheck} className="bg-[#0c0e1a] hover:bg-[#151930] text-[#39ff14] border-2 border-[#39ff14] text-[0.6rem] px-5 cursor-pointer shadow-[0_0_0_2px_#000,0_0_10px_rgba(57,255,20,0.15)] active:scale-95 transition-all shrink-0">
            {tx.btn_check}
          </button>
        </div>
      )}

      {errors >= 2 && !allStepsDone && (
        <div className="bg-[#0f0a00] border border-[#ffe60040] px-4 py-2 mb-2 shrink-0">
          <span className="text-[#ffe600b0] text-[0.54rem] leading-[1.8]">
            {tx.hint_label} {steps[step].hint}
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
