"use client";
import { useState, useEffect, useRef } from "react";
import { useGame } from "./GameContext";
import { useLanguage } from "./LanguageContext";

const MUSIC_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev/music/elefantito/";
const MUSIC_TRACKS = Array.from({ length: 24 }, (_, i) => `${MUSIC_BASE}mate-${String(i + 1).padStart(2, "0")}.mp3`);

const TX = {
  es: {
    intro_title: "DIVISION ENTRE 1 CIFRA",
    intro_sub: "IZQUIERDA A DERECHA",
    intro_body: "La division mental tambien se puede hacer de izquierda a derecha. Primero estimas cuantas cifras tendra la respuesta, luego encuentras el primer digito, conservas el residuo, bajas el siguiente digito y cierras.",
    ex_label: "- EJEMPLO -",
    ex_step1: "7 cabe en 17: 2 veces",
    ex_step2: "17 - 14 = 3",
    ex_step3: "Baja 9: 39. 7 cabe en 39: 5 veces",
    ex_step4: "39 - 35 = 4",
    ex_step5: "Resultado: 25 con residuo 4",
    ex_rule: "Divide de izquierda a derecha, como la division larga, pero en tu cabeza.",
    btn_start: "PRACTICAR ->",
    solved: (n) => `Resueltos: ${n}`,
    step: (i) => `PASO ${i}`,
    prompt_first: (d, prefix) => `¿Cuántas veces cabe ${d} en ${prefix}?`,
    prompt_remainder1: (digit, prefix, product) => `Primer digito es ${digit}. Residuo: ${prefix} - ${product} =`,
    prompt_second: (next, d) => `Baja el siguiente digito: ${next}. ¿Cuántas veces cabe ${d} en ${next}?`,
    prompt_remainder2: (next, product) => `Residuo final: ${next} - ${product} =`,
    prompt_result: (q, r) => `Resultado: ${q} con residuo ${r}`,
    hint_label: "PISTA:",
    hint_first: "Busca el primer digito del cociente, no toda la respuesta.",
    hint_remainder: "Resta lo que ya usaste y conserva ese residuo.",
    hint_bring_down: "El residuo se vuelve decena cuando bajas el siguiente digito.",
    hint_result: "El resultado son los dos digitos del cociente; el residuo se queda aparte.",
    btn_check: "VERIFICAR",
    btn_done: "¡Entendido, estoy listo!",
    sound_on: "🔊 Sonido ON",
    sound_off: "🔇 Sonido OFF",
  },
  en: {
    intro_title: "ONE-DIGIT DIVISION",
    intro_sub: "LEFT TO RIGHT",
    intro_body: "Mental division can also move from left to right. First estimate how many digits the answer will have, then find the first digit, keep the remainder, bring down the next digit, and finish.",
    ex_label: "- EXAMPLE -",
    ex_step1: "7 goes into 17: 2 times",
    ex_step2: "17 - 14 = 3",
    ex_step3: "Bring down 9: 39. 7 goes into 39: 5 times",
    ex_step4: "39 - 35 = 4",
    ex_step5: "Result: 25 remainder 4",
    ex_rule: "Divide left to right, like long division, but in your head.",
    btn_start: "PRACTICE ->",
    solved: (n) => `Solved: ${n}`,
    step: (i) => `STEP ${i}`,
    prompt_first: (d, prefix) => `How many times does ${d} fit into ${prefix}?`,
    prompt_remainder1: (digit, prefix, product) => `First digit is ${digit}. Remainder: ${prefix} - ${product} =`,
    prompt_second: (next, d) => `Bring down the next digit: ${next}. How many times does ${d} fit into ${next}?`,
    prompt_remainder2: (next, product) => `Final remainder: ${next} - ${product} =`,
    prompt_result: (q, r) => `Result: ${q} remainder ${r}`,
    hint_label: "HINT:",
    hint_first: "Find the first digit of the quotient, not the whole answer.",
    hint_remainder: "Subtract what you already used and keep that remainder.",
    hint_bring_down: "The remainder becomes a ten when you bring down the next digit.",
    hint_result: "The answer is the two-digit quotient; the remainder stays separate.",
    btn_check: "CHECK",
    btn_done: "Got it, I'm ready!",
    sound_on: "🔊 Sound ON",
    sound_off: "🔇 Sound OFF",
  },
};

function genProblem() {
  const divisor = Math.floor(Math.random() * 8) + 2; // 2-9
  const quotient = Math.floor(Math.random() * 88) + 12; // 12-99
  const remainder = Math.floor(Math.random() * divisor);
  const dividend = quotient * divisor + remainder;
  const qTens = Math.floor(quotient / 10);
  const qUnits = quotient % 10;
  const prefix = Math.floor(dividend / 10);
  const lastDigit = dividend % 10;
  const firstProduct = qTens * divisor;
  const firstRemainder = prefix - firstProduct;
  const broughtDown = firstRemainder * 10 + lastDigit;
  const secondProduct = qUnits * divisor;

  return {
    divisor,
    quotient,
    remainder,
    dividend,
    qTens,
    qUnits,
    prefix,
    firstProduct,
    firstRemainder,
    broughtDown,
    secondProduct,
  };
}

export default function TutorLevel18({ onComplete }) {
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
      instruction: tx.prompt_first(problem.divisor, problem.prefix),
      answer: problem.qTens,
      hint: tx.hint_first,
    },
    {
      instruction: tx.prompt_remainder1(problem.qTens, problem.prefix, problem.firstProduct),
      answer: problem.firstRemainder,
      hint: tx.hint_remainder,
    },
    {
      instruction: tx.prompt_second(problem.broughtDown, problem.divisor),
      answer: problem.qUnits,
      hint: tx.hint_bring_down,
    },
    {
      instruction: tx.prompt_remainder2(problem.broughtDown, problem.secondProduct),
      answer: problem.remainder,
      hint: tx.hint_remainder,
    },
    {
      instruction: tx.prompt_result(problem.quotient, problem.remainder),
      answer: problem.quotient,
      hint: tx.hint_result,
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
    completeLesson(18);
    onComplete();
  };

  if (phase === "intro") {
    return (
      <div className="bg-[#0c0e1a] border-2 border-[#14161e] p-6 flex flex-col h-[80vh] overflow-y-auto font-[family-name:var(--font-press-start-2p)]">
        <div className="flex-1 flex flex-col items-center justify-center gap-5 max-w-xl mx-auto w-full py-4">
          <div className="text-center">
            <div className="text-[#b026ff] text-[clamp(0.92rem,2.6vw,1.3rem)] leading-[2] drop-shadow-[0_0_14px_rgba(176,38,255,0.7)]">
              {tx.intro_title}
            </div>
            <div className="text-[#b026ff99] text-[clamp(0.65rem,1.6vw,0.88rem)] leading-[2] tracking-[0.1em]">
              {tx.intro_sub}
            </div>
          </div>

          <p className="text-[#7a7a8a] text-[0.62rem] leading-[2.2] text-center">
            {tx.intro_body}
          </p>

          <div className="bg-[#060810] border-2 border-[#b026ff40] rounded-sm w-full shadow-[0_0_16px_rgba(176,38,255,0.06)]">
            <div className="border-b border-[#b026ff20] px-4 py-2 flex items-center justify-between">
              <span className="text-[#b026ff80] text-[0.54rem] tracking-[0.25em]">{tx.ex_label}</span>
              <span className="text-[#ffe600] text-[0.65rem] drop-shadow-[0_0_6px_rgba(255,230,0,0.4)]">179 / 7</span>
            </div>
            <div className="p-4 flex flex-col gap-1.5">
              {[tx.ex_step1, tx.ex_step2, tx.ex_step3, tx.ex_step4, tx.ex_step5].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[#b026ff70] text-[0.5rem] w-4">{i + 1}</span>
                  <div className="bg-[#100914] border border-[#b026ff30] px-3 py-2 text-[#b026ff] text-[0.6rem] tracking-widest flex-1">
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
            className="bg-[#0c0e1a] hover:bg-[#160c1a] text-[#b026ff] border-2 border-[#b026ff] text-[0.6rem] py-4 px-8 cursor-pointer shadow-[0_0_0_2px_#000,0_0_14px_rgba(176,38,255,0.2)] active:scale-95 transition-all w-full"
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

      <div className="bg-[#060810] border-[3px] border-[#b026ff] shadow-[0_0_0_3px_#000,0_0_12px_rgba(176,38,255,0.12)] rounded-sm p-3 mb-3 text-center shrink-0">
        <div className="text-[#55555a] text-[0.54rem] tracking-[0.2em] mb-1">DIVISION</div>
        <div className="text-[#b026ff] text-[clamp(1.35rem,4vw,2rem)] drop-shadow-[0_0_12px_rgba(176,38,255,0.65)]">
          {problem.dividend} / {problem.divisor}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mb-3 shrink-0">
        {steps.map((s, idx) => {
          const isAnswered = idx < revealed.length;
          const isCurrent = !allStepsDone && idx === step;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between px-3 py-2 rounded-sm border-2 transition-all ${isAnswered ? "bg-[#100914] border-[#b026ff50] text-[#b026ff]" : isCurrent ? "bg-[#060c1a] border-[#00eeff] text-[#00eeff] shadow-[0_0_8px_rgba(0,238,255,0.08)]" : "bg-[#0a0a0a] border-[#1a1a1a] text-[#282828]"}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[0.5rem] shrink-0 ${isAnswered ? "text-[#b026ff70]" : isCurrent ? "text-[#00eeff70]" : "text-[#202020]"}`}>{tx.step(idx + 1)}</span>
                <span className="text-[0.58rem] leading-[1.8]">{s.instruction}</span>
              </div>
              {isAnswered && (
                <span className="text-[#b026ff] text-[0.78rem] shrink-0 ml-3 drop-shadow-[0_0_8px_rgba(176,38,255,0.7)]">{revealed[idx]}</span>
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
            onChange={e => setInput(e.target.value.replace(/\D/g, "").slice(0, 2))}
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
