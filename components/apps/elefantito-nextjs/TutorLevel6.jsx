"use client";
import { useState, useEffect, useRef } from "react";
import { useGame } from "./GameContext";
import { useLanguage } from "./LanguageContext";

const MUSIC_BASE   = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev/music/elefantito/";
const MUSIC_TRACKS = Array.from({ length: 24 }, (_, i) => `${MUSIC_BASE}mate-${String(i + 1).padStart(2, "0")}.mp3`);

const TX = {
  es: {
    intro_title:  "SUMA",
    intro_sub:    "4 + 3 CIFRAS · LÍMITE DE MEMORIA",
    intro_body:   "Descompón el número de 4 cifras en miles, centenas, decenas y unidades. Suma con el número de 3 cifras parte por parte, de izquierda a derecha.",
    ex_label:     "— EJEMPLO —",
    ex_step1:     " 800 + 500  =  1300",
    ex_step2:     "2000 + 1300 =  3300",
    ex_step3:     "  40 +  60  =   100",
    ex_step4:     "3300 + 100  =  3400",
    ex_step5:     "3400 + (7+3)=  3410",
    ex_result:    "2847 + 563  =  3410",
    btn_start:    "PRACTICAR →",
    solved:       (n) => `Resueltos: ${n}`,
    step:         (i) => `PASO ${i}`,
    hint_label:   "PISTA:",
    hint_0:       (aH, bH)       => `Suma solo las centenas: ${aH} + ${bH}.`,
    hint_1:       (aT, hS)       => `Los miles del primer número son ${aT}. Súmalos: ${aT} + ${hS}.`,
    hint_2:       (aT, bT)       => `Suma solo las decenas: ${aT} + ${bT}.`,
    hint_3:       (s2, tS)       => `Añade las decenas al resultado anterior: ${s2} + ${tS}.`,
    hint_4:       (s4, aO, bO, oS) => `Suma las unidades (${aO}+${bO}=${oS}) y añádelas: ${s4} + ${oS}.`,
    btn_check:    "VERIFICAR",
    btn_done:     "¡Entendido, estoy listo!",
    step1_ins:    (aH, bH)       => `Suma las centenas (${aH} + ${bH})`,
    step2_ins:    (aT, hS)       => `Combina con los miles (${aT} + ${hS})`,
    step3_ins:    (aT, bT)       => `Suma las decenas (${aT} + ${bT})`,
    step4_ins:    (s2, tS)       => `Combina con el resultado anterior (${s2} + ${tS})`,
    step5_ins:    (s4, aO, bO)   => `Añade las unidades (${s4} + (${aO}+${bO}))`,
    sound_on:     "🔊 Sonido ON",
    sound_off:    "🔇 Sonido OFF",
  },
  en: {
    intro_title:  "ADDITION",
    intro_sub:    "4 + 3 DIGITS · MEMORY LIMIT",
    intro_body:   "Break the 4-digit number into thousands, hundreds, tens and ones. Add with the 3-digit number part by part, left to right.",
    ex_label:     "— EXAMPLE —",
    ex_step1:     " 800 + 500  =  1300",
    ex_step2:     "2000 + 1300 =  3300",
    ex_step3:     "  40 +  60  =   100",
    ex_step4:     "3300 + 100  =  3400",
    ex_step5:     "3400 + (7+3)=  3410",
    ex_result:    "2847 + 563  =  3410",
    btn_start:    "PRACTICE →",
    solved:       (n) => `Solved: ${n}`,
    step:         (i) => `STEP ${i}`,
    hint_label:   "HINT:",
    hint_0:       (aH, bH)       => `Add only the hundreds: ${aH} + ${bH}.`,
    hint_1:       (aT, hS)       => `The thousands from the first number are ${aT}. Add them: ${aT} + ${hS}.`,
    hint_2:       (aT, bT)       => `Add only the tens: ${aT} + ${bT}.`,
    hint_3:       (s2, tS)       => `Add the tens to the previous result: ${s2} + ${tS}.`,
    hint_4:       (s4, aO, bO, oS) => `Add the ones (${aO}+${bO}=${oS}) to the result: ${s4} + ${oS}.`,
    btn_check:    "CHECK",
    btn_done:     "Got it, I'm ready!",
    step1_ins:    (aH, bH)       => `Add the hundreds (${aH} + ${bH})`,
    step2_ins:    (aT, hS)       => `Combine with thousands (${aT} + ${hS})`,
    step3_ins:    (aT, bT)       => `Add the tens (${aT} + ${bT})`,
    step4_ins:    (s2, tS)       => `Combine with previous result (${s2} + ${tS})`,
    step5_ins:    (s4, aO, bO)   => `Add the ones (${s4} + (${aO}+${bO}))`,
    sound_on:     "🔊 Sound ON",
    sound_off:    "🔇 Sound OFF",
  },
};

function genProblem() {
  let a, b;
  // a: 4-digit, no zeros in hundreds/tens/ones
  do {
    a = Math.floor(Math.random() * 9000) + 1000; // 1000–9999
  } while (
    Math.floor((a % 1000) / 100) === 0 ||
    Math.floor((a % 100)  / 10)  === 0 ||
    a % 10 === 0
  );
  // b: 3-digit, no zeros in tens/ones
  do {
    b = Math.floor(Math.random() * 900) + 100; // 100–999
  } while (
    Math.floor((b % 100) / 10) === 0 ||
    b % 10 === 0
  );

  const aThousands = Math.floor(a / 1000) * 1000;
  const aHundreds  = Math.floor((a % 1000) / 100) * 100;
  const aTens      = Math.floor((a % 100)  / 10)  * 10;
  const aOnes      = a % 10;
  const bHundreds  = Math.floor(b / 100) * 100;
  const bTens      = Math.floor((b % 100) / 10) * 10;
  const bOnes      = b % 10;

  const hundredsSum = aHundreds + bHundreds;   // step 1
  const step2       = aThousands + hundredsSum; // step 2
  const tensSum     = aTens + bTens;            // step 3
  const step4       = step2 + tensSum;          // step 4
  const onesSum     = aOnes + bOnes;
  const answer      = step4 + onesSum;          // step 5

  return { a, b, aThousands, aHundreds, aTens, aOnes, bHundreds, bTens, bOnes,
           hundredsSum, step2, tensSum, step4, onesSum, answer };
}

export default function TutorLevel6({ onComplete }) {
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
      hint:        tx.hint_0(problem.aHundreds, problem.bHundreds),
    },
    {
      instruction: tx.step2_ins(problem.aThousands, problem.hundredsSum),
      answer:      problem.step2,
      hint:        tx.hint_1(problem.aThousands, problem.hundredsSum),
    },
    {
      instruction: tx.step3_ins(problem.aTens, problem.bTens),
      answer:      problem.tensSum,
      hint:        tx.hint_2(problem.aTens, problem.bTens),
    },
    {
      instruction: tx.step4_ins(problem.step2, problem.tensSum),
      answer:      problem.step4,
      hint:        tx.hint_3(problem.step2, problem.tensSum),
    },
    {
      instruction: tx.step5_ins(problem.step4, problem.aOnes, problem.bOnes),
      answer:      problem.answer,
      hint:        tx.hint_4(problem.step4, problem.aOnes, problem.bOnes, problem.onesSum),
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
    completeLesson(6);
    onComplete();
  };

  // ─── INTRO ────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="bg-[#0c0e1a] border-2 border-[#14161e] p-6 flex flex-col h-[80vh] overflow-y-auto font-[family-name:var(--font-press-start-2p)]">
        <div className="flex-1 flex flex-col items-center justify-center gap-5 max-w-md mx-auto w-full py-4">

          <div className="text-center">
            <div className="text-[#39ff14] text-[clamp(0.75rem,2.2vw,1.1rem)] leading-[2] drop-shadow-[0_0_14px_#39ff14]">
              {tx.intro_title}
            </div>
            <div className="text-[#39ff1499] text-[clamp(0.5rem,1.3vw,0.7rem)] leading-[2] tracking-[0.1em]">
              {tx.intro_sub}
            </div>
          </div>

          <p className="text-[#7a7a8a] text-[0.48rem] leading-[2.2] text-center">
            {tx.intro_body}
          </p>

          <div className="bg-[#060810] border-2 border-[#00eeff40] rounded-sm w-full shadow-[0_0_16px_rgba(0,238,255,0.06)]">
            <div className="border-b border-[#00eeff20] px-4 py-2 flex items-center justify-between">
              <span className="text-[#00eeff60] text-[0.38rem] tracking-[0.25em]">{tx.ex_label}</span>
              <span className="text-[#ffe600] text-[0.65rem] drop-shadow-[0_0_6px_rgba(255,230,0,0.4)]">2847 + 563</span>
            </div>
            <div className="p-4 flex flex-col gap-1.5">
              {[tx.ex_step1, tx.ex_step2, tx.ex_step3, tx.ex_step4, tx.ex_step5].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[#39ff1460] text-[0.38rem] w-4">{i + 1}</span>
                  <div className="bg-[#0a0f0a] border border-[#39ff1430] px-3 py-2 text-[#39ff14] text-[0.5rem] tracking-widest flex-1 font-mono">
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
        <span className="text-[#3a3a3a] text-[0.38rem] tracking-[0.15em] shrink-0">
          {tx.solved(solved)}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setIsMuted(m => !m)}
            className={`text-[0.4rem] px-2 py-1.5 rounded-sm cursor-pointer transition-colors shrink-0 ${
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
        <div className="text-[#55555a] text-[0.38rem] tracking-[0.2em] mb-1">SUMA</div>
        <div className="text-[#ffe600] text-[clamp(1rem,2.8vw,1.6rem)] drop-shadow-[0_0_10px_rgba(255,230,0,0.4)]">
          {problem.a} + {problem.b}
        </div>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-1.5 mb-3 shrink-0">
        {steps.map((s, idx) => {
          const isAnswered = idx < revealed.length;
          const isCurrent  = !allStepsDone && idx === step;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between px-3 py-2 rounded-sm border-2 transition-all ${
                isAnswered
                  ? "bg-[#071207] border-[#39ff1450] text-[#39ff14]"
                  : isCurrent
                    ? "bg-[#060c1a] border-[#00eeff] text-[#00eeff] shadow-[0_0_8px_rgba(0,238,255,0.08)]"
                    : "bg-[#0a0a0a] border-[#1a1a1a] text-[#282828]"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[0.34rem] shrink-0 ${isAnswered ? "text-[#39ff1470]" : isCurrent ? "text-[#00eeff70]" : "text-[#202020]"}`}>
                  {tx.step(idx + 1)}
                </span>
                <span className="text-[0.4rem] leading-[1.8]">{s.instruction}</span>
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
            onChange={e => setInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
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
            className="bg-[#0c0e1a] hover:bg-[#151930] text-[#39ff14] border-2 border-[#39ff14] text-[0.44rem] px-5 cursor-pointer shadow-[0_0_0_2px_#000,0_0_10px_rgba(57,255,20,0.15)] active:scale-95 transition-all shrink-0"
          >
            {tx.btn_check}
          </button>
        </div>
      )}

      {/* Hint */}
      {errors >= 2 && !allStepsDone && (
        <div className="bg-[#0f0a00] border border-[#ffe60040] px-4 py-2 mb-2 shrink-0">
          <span className="text-[#ffe600b0] text-[0.38rem] leading-[1.8]">
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
