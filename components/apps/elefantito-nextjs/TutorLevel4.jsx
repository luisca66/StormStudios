"use client";
import { useState, useEffect, useRef } from "react";
import { useGame } from "./GameContext";
import { useLanguage } from "./LanguageContext";

const MUSIC_BASE   = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev/music/elefantito/";
const MUSIC_TRACKS = Array.from({ length: 24 }, (_, i) => `${MUSIC_BASE}mate-${String(i + 1).padStart(2, "0")}.mp3`);

const TX = {
  es: {
    intro_title:  "SUMA",
    intro_sub:    "3 CIFRAS · DESCOMPOSICIÓN TOTAL",
    intro_body:   "Descompón AMBOS números en centenas, decenas y unidades. Suma cada parte por separado, luego combínalas de izquierda a derecha.",
    ex_label:     "— EJEMPLO —",
    ex_step1:     "500 + 300  =  800",
    ex_step2:     " 30 +  20  =   50",
    ex_step3:     "800 +  50  =  850",
    ex_step4:     "850 +  15  =  865",
    ex_result:    "538 + 327  =  865",
    btn_start:    "PRACTICAR →",
    solved:       (n) => `Resueltos: ${n}`,
    step:         (i) => `PASO ${i}`,
    hint_label:   "PISTA:",
    hint_0:       (a, aH, b, bH) => `Ignora decenas y unidades. Suma solo las centenas: ${aH} + ${bH}.`,
    hint_1:       (aT, bT)       => `Ignora centenas y unidades. Suma solo las decenas: ${aT} + ${bT}.`,
    hint_2:       (hS, tS)       => `Suma el resultado de centenas (${hS}) con el de decenas (${tS}).`,
    hint_3:       (s3, aO, bO, oS) => `Suma las unidades de ambos números: ${aO} + ${bO} = ${oS}. Agrégalas al ${s3}.`,
    btn_check:    "VERIFICAR",
    btn_done:     "¡Entendido, estoy listo!",
    step1_ins:    (aH, bH)       => `Suma las centenas (${aH} + ${bH})`,
    step2_ins:    (aT, bT)       => `Suma las decenas (${aT} + ${bT})`,
    step3_ins:    (hS, tS)       => `Combina centenas y decenas (${hS} + ${tS})`,
    step4_ins:    (s3, aO, bO)   => `Suma las unidades (${s3} + (${aO}+${bO}))`,
    sound_on:     "🔊 Sonido ON",
    sound_off:    "🔇 Sonido OFF",
  },
  en: {
    intro_title:  "ADDITION",
    intro_sub:    "3 DIGITS · FULL DECOMPOSITION",
    intro_body:   "Break BOTH numbers into hundreds, tens and ones. Add each part separately, then combine left to right.",
    ex_label:     "— EXAMPLE —",
    ex_step1:     "500 + 300  =  800",
    ex_step2:     " 30 +  20  =   50",
    ex_step3:     "800 +  50  =  850",
    ex_step4:     "850 +  15  =  865",
    ex_result:    "538 + 327  =  865",
    btn_start:    "PRACTICE →",
    solved:       (n) => `Solved: ${n}`,
    step:         (i) => `STEP ${i}`,
    hint_label:   "HINT:",
    hint_0:       (a, aH, b, bH) => `Ignore tens and ones. Add only the hundreds: ${aH} + ${bH}.`,
    hint_1:       (aT, bT)       => `Ignore hundreds and ones. Add only the tens: ${aT} + ${bT}.`,
    hint_2:       (hS, tS)       => `Add the hundreds result (${hS}) to the tens result (${tS}).`,
    hint_3:       (s3, aO, bO, oS) => `Add the ones of both numbers: ${aO} + ${bO} = ${oS}. Add that to ${s3}.`,
    btn_check:    "CHECK",
    btn_done:     "Got it, I'm ready!",
    step1_ins:    (aH, bH)       => `Add the hundreds (${aH} + ${bH})`,
    step2_ins:    (aT, bT)       => `Add the tens (${aT} + ${bT})`,
    step3_ins:    (hS, tS)       => `Combine hundreds and tens (${hS} + ${tS})`,
    step4_ins:    (s3, aO, bO)   => `Add the ones (${s3} + (${aO}+${bO}))`,
    sound_on:     "🔊 Sound ON",
    sound_off:    "🔇 Sound OFF",
  },
};

function genProblem() {
  let a, b;
  do { a = Math.floor(Math.random() * 900) + 100; }
  while (Math.floor((a % 100) / 10) === 0 || a % 10 === 0);
  do { b = Math.floor(Math.random() * 900) + 100; }
  while (Math.floor((b % 100) / 10) === 0 || b % 10 === 0);

  const aHundreds = Math.floor(a / 100) * 100;
  const aTens     = Math.floor((a % 100) / 10) * 10;
  const aOnes     = a % 10;
  const bHundreds = Math.floor(b / 100) * 100;
  const bTens     = Math.floor((b % 100) / 10) * 10;
  const bOnes     = b % 10;

  const hundredsSum = aHundreds + bHundreds;
  const tensSum     = aTens + bTens;
  const step3       = hundredsSum + tensSum;
  const onesSum     = aOnes + bOnes;
  const answer      = step3 + onesSum;

  return { a, b, aHundreds, aTens, aOnes, bHundreds, bTens, bOnes, hundredsSum, tensSum, step3, onesSum, answer };
}

export default function TutorLevel4({ onComplete }) {
  const { completeLesson } = useGame();
  const { lang }           = useLanguage();
  const tx = TX[lang];

  const [phase,    setPhase]    = useState("intro");
  const [problem,  setProblem]  = useState(() => genProblem());
  const [step,     setStep]     = useState(0);
  const [input,    setInput]    = useState("");
  const [errors,   setErrors]   = useState(0);
  const [solved,   setSolved]   = useState(0);
  const [revealed, setRevealed] = useState([]);
  const [hasError, setHasError] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [volume,  setVolume]  = useState(60);
  const musicPlayerRef = useRef(null);
  const inputRef       = useRef(null);

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
      instruction: tx.step1_ins(problem.aHundreds, problem.bHundreds),
      answer:      problem.hundredsSum,
      hint:        tx.hint_0(problem.a, problem.aHundreds, problem.b, problem.bHundreds),
    },
    {
      instruction: tx.step2_ins(problem.aTens, problem.bTens),
      answer:      problem.tensSum,
      hint:        tx.hint_1(problem.aTens, problem.bTens),
    },
    {
      instruction: tx.step3_ins(problem.hundredsSum, problem.tensSum),
      answer:      problem.step3,
      hint:        tx.hint_2(problem.hundredsSum, problem.tensSum),
    },
    {
      instruction: tx.step4_ins(problem.step3, problem.aOnes, problem.bOnes),
      answer:      problem.answer,
      hint:        tx.hint_3(problem.step3, problem.aOnes, problem.bOnes, problem.onesSum),
    },
  ];

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
    completeLesson(4);
    onComplete();
  };

  const allStepsDone = revealed.length === steps.length;

  // ─── INTRO ────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="bg-[#0c0e1a] border-2 border-[#14161e] p-6 flex flex-col h-[80vh] overflow-y-auto font-[family-name:var(--font-press-start-2p)]">
        <div className="flex-1 flex flex-col items-center justify-center gap-5 max-w-md mx-auto w-full py-4">

          <div className="text-center">
            <div className="text-[#39ff14] text-[clamp(0.92rem,2.6vw,1.3rem)] leading-[2] drop-shadow-[0_0_14px_#39ff14]">
              {tx.intro_title}
            </div>
            <div className="text-[#39ff1499] text-[clamp(0.65rem,1.6vw,0.88rem)] leading-[2] tracking-[0.1em]">
              {tx.intro_sub}
            </div>
          </div>

          <p className="text-[#7a7a8a] text-[0.65rem] leading-[2.2] text-center">
            {tx.intro_body}
          </p>

          <div className="bg-[#060810] border-2 border-[#00eeff40] rounded-sm w-full shadow-[0_0_16px_rgba(0,238,255,0.06)]">
            <div className="border-b border-[#00eeff20] px-4 py-2 flex items-center justify-between">
              <span className="text-[#00eeff60] text-[0.54rem] tracking-[0.25em]">{tx.ex_label}</span>
              <span className="text-[#ffe600] text-[0.65rem] drop-shadow-[0_0_6px_rgba(255,230,0,0.4)]">538 + 327</span>
            </div>
            <div className="p-4 flex flex-col gap-1.5">
              {[tx.ex_step1, tx.ex_step2, tx.ex_step3, tx.ex_step4].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[#39ff1460] text-[0.54rem] w-4">{i + 1}</span>
                  <div className="bg-[#0a0f0a] border border-[#39ff1430] px-3 py-2 text-[#39ff14] text-[0.5rem] tracking-widest flex-1">
                    {s}
                  </div>
                </div>
              ))}
              <div className="mt-2 text-right text-[#ffe600] text-[0.5rem] tracking-widest drop-shadow-[0_0_6px_rgba(255,230,0,0.3)]">
                {tx.ex_result}
              </div>
            </div>
          </div>

          <button
            onClick={startPractice}
            className="bg-[#0c0e1a] hover:bg-[#151930] text-[#39ff14] border-2 border-[#39ff14] text-[0.5rem] py-4 px-8 cursor-pointer shadow-[0_0_0_2px_#000,0_0_14px_rgba(57,255,20,0.2)] active:scale-95 transition-all w-full"
          >
            {tx.btn_start}
          </button>
        </div>
      </div>
    );
  }

  // ─── PRACTICE ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#0c0e1a] border-2 border-[#14161e] p-4 flex flex-col h-[80vh] font-[family-name:var(--font-press-start-2p)] overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0 gap-3">
        <span className="text-[#3a3a3a] text-[0.54rem] tracking-[0.15em] shrink-0">
          {tx.solved(solved)}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setIsMuted(m => !m)}
            className={`text-[0.56rem] px-2 py-1.5 rounded-sm cursor-pointer transition-colors shrink-0 ${
              isMuted
                ? "bg-[#0d0d0d] border border-[#242424] text-[#3a3a3a]"
                : "bg-[#0c0e1a] border border-[#00eeff] text-[#00eeff] shadow-[0_0_5px_rgba(0,238,255,0.12)]"
            }`}
          >
            {isMuted ? tx.sound_off : tx.sound_on}
          </button>
          <span className="text-[0.65rem]">🔉</span>
          <input
            type="range" min="0" max="100" value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            className="w-16 accent-[#00eeff]"
          />
          <span className="text-[0.65rem]">🔊</span>
        </div>
      </div>

      {/* Problem */}
      <div className="bg-[#060810] border-[3px] border-[#ffe600] shadow-[0_0_0_3px_#000,0_0_12px_rgba(255,230,0,0.08)] rounded-sm p-3 mb-3 text-center shrink-0">
        <div className="text-[#55555a] text-[0.54rem] tracking-[0.2em] mb-1">SUMA</div>
        <div className="text-[#ffe600] text-[clamp(1.2rem,3vw,1.8rem)] drop-shadow-[0_0_10px_rgba(255,230,0,0.4)]">
          {problem.a} + {problem.b}
        </div>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-1.5 mb-3 shrink-0">
        {steps.map((s, idx) => {
          const isAnswered = idx < revealed.length;
          const isCurrent  = !allStepsDone && idx === step;

          return (
            <div key={idx} className={`flex items-center justify-between px-3 py-2 rounded-sm border-2 transition-all ${
              isAnswered
                ? "bg-[#071207] border-[#39ff1450] text-[#39ff14]"
                : isCurrent
                  ? "bg-[#060c1a] border-[#00eeff] text-[#00eeff] shadow-[0_0_8px_rgba(0,238,255,0.08)]"
                  : "bg-[#0a0a0a] border-[#1a1a1a] text-[#282828]"
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[0.5rem] shrink-0 ${isAnswered ? "text-[#39ff1470]" : isCurrent ? "text-[#00eeff70]" : "text-[#202020]"}`}>
                  {tx.step(idx + 1)}
                </span>
                <span className="text-[0.58rem] leading-[1.8]">{s.instruction}</span>
              </div>
              {isAnswered && (
                <span className="text-[#39ff14] text-[0.85rem] shrink-0 ml-3 drop-shadow-[0_0_8px_#39ff14]">
                  {revealed[idx]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Input */}
      {!allStepsDone && (
        <div className="flex gap-2 mb-2 shrink-0">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={input}
            onChange={e => setInput(e.target.value.replace(/\D/g, ""))}
            onKeyDown={handleKeyDown}
            placeholder="?"
            className={`flex-1 bg-[#060810] border-[3px] text-[1.3rem] text-center py-3 px-4 outline-none transition-all ${
              hasError
                ? "border-[#ff2244] text-[#ff2244] shadow-[0_0_0_3px_#000,0_0_10px_rgba(255,34,68,0.2)]"
                : "border-[#ffe600] text-[#ffe600] shadow-[0_0_0_3px_#000,0_0_8px_rgba(255,230,0,0.06)]"
            }`}
          />
          <button
            onClick={handleCheck}
            className="bg-[#0c0e1a] hover:bg-[#151930] text-[#39ff14] border-2 border-[#39ff14] text-[0.6rem] px-5 cursor-pointer shadow-[0_0_0_2px_#000,0_0_10px_rgba(57,255,20,0.15)] active:scale-95 transition-all shrink-0"
          >
            {tx.btn_check}
          </button>
        </div>
      )}

      {/* Hint */}
      {errors >= 2 && !allStepsDone && (
        <div className="bg-[#0f0a00] border border-[#ffe60040] px-4 py-2 mb-2 shrink-0">
          <span className="text-[#ffe600b0] text-[0.54rem] leading-[1.8]">
            {tx.hint_label}{" "}{steps[step].hint}
          </span>
        </div>
      )}

      {/* Ready button */}
      <div className="mt-auto pt-3 border-t-2 border-[#14161e] shrink-0">
        <button
          onClick={handleFinish}
          className="font-[family-name:var(--font-press-start-2p)] text-[0.5rem] bg-[#39ff14] text-black border-2 border-[#39ff14] px-5 py-3 cursor-pointer shadow-[0_0_0_2px_#000,0_0_12px_rgba(57,255,20,0.35)] transition-transform active:scale-95 w-full"
        >
          {tx.btn_done}
        </button>
      </div>
    </div>
  );
}
