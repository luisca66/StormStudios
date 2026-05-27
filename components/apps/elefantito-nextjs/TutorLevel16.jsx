"use client";
import { useState, useEffect, useRef } from "react";
import { useGame } from "./GameContext";
import { useLanguage } from "./LanguageContext";

const MUSIC_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev/music/elefantito/";
const MUSIC_TRACKS = Array.from({ length: 24 }, (_, i) => `${MUSIC_BASE}mate-${String(i + 1).padStart(2, "0")}.mp3`);

const TX = {
  es: {
    intro_title: "MULTIPLICACION 3 x 1",
    intro_sub: "DISTRIBUTIVA EXTENDIDA",
    intro_body: "Ahora extendemos la misma idea a tres cifras. Separa centenas, decenas y unidades; multiplica cada parte; suma en dos momentos para no saturar la memoria.",
    ex_label: "- EJEMPLO -",
    ex_step1: "489 = 400 + 80 + 9",
    ex_step2: "400 x 7 = 2800",
    ex_step3: "80 x 7 = 560",
    ex_step4: "2800 + 560 = 3360",
    ex_step5: "9 x 7 = 63",
    ex_step6: "3360 + 63 = 3423",
    ex_rule: "Repite en voz alta cada resultado parcial para no olvidarlo.",
    btn_start: "PRACTICAR ->",
    solved: (n) => `Resueltos: ${n}`,
    step: (i) => `PASO ${i}`,
    prompt_hundreds: (hundreds, factor) => `Multiplica las centenas: ${hundreds} x ${factor}`,
    prompt_tens: (tens, factor) => `Multiplica las decenas: ${tens} x ${factor}`,
    prompt_partial: (a, b) => `Suma parcial: ${a} + ${b}`,
    prompt_units: (units, factor) => `Multiplica las unidades: ${units} x ${factor}`,
    prompt_final: (partial, unitsProduct) => `Suma final: ${partial} + ${unitsProduct}`,
    hint_label: "PISTA:",
    hint_split: (num, hundreds, tens, units) => `Descompón: ${num} = ${hundreds} + ${tens} + ${units}.`,
    hint_partial: "Primero une centenas y decenas; deja las unidades para el cierre.",
    hint_memory: "Repite en voz alta cada resultado parcial para no olvidarlo.",
    btn_check: "VERIFICAR",
    btn_done: "¡Entendido, estoy listo!",
    sound_on: "🔊 Sonido ON",
    sound_off: "🔇 Sonido OFF",
  },
  en: {
    intro_title: "3 x 1 MULTIPLICATION",
    intro_sub: "EXTENDED DISTRIBUTIVE LAW",
    intro_body: "Now we extend the same idea to three digits. Split hundreds, tens, and units; multiply each part; add in two moments so working memory stays clear.",
    ex_label: "- EXAMPLE -",
    ex_step1: "489 = 400 + 80 + 9",
    ex_step2: "400 x 7 = 2800",
    ex_step3: "80 x 7 = 560",
    ex_step4: "2800 + 560 = 3360",
    ex_step5: "9 x 7 = 63",
    ex_step6: "3360 + 63 = 3423",
    ex_rule: "Repeat each partial result out loud so you do not forget it.",
    btn_start: "PRACTICE ->",
    solved: (n) => `Solved: ${n}`,
    step: (i) => `STEP ${i}`,
    prompt_hundreds: (hundreds, factor) => `Multiply the hundreds: ${hundreds} x ${factor}`,
    prompt_tens: (tens, factor) => `Multiply the tens: ${tens} x ${factor}`,
    prompt_partial: (a, b) => `Partial sum: ${a} + ${b}`,
    prompt_units: (units, factor) => `Multiply the units: ${units} x ${factor}`,
    prompt_final: (partial, unitsProduct) => `Final sum: ${partial} + ${unitsProduct}`,
    hint_label: "HINT:",
    hint_split: (num, hundreds, tens, units) => `Split: ${num} = ${hundreds} + ${tens} + ${units}.`,
    hint_partial: "First combine hundreds and tens; save the units for the closing step.",
    hint_memory: "Repeat each partial result out loud so you do not forget it.",
    btn_check: "CHECK",
    btn_done: "Got it, I'm ready!",
    sound_on: "🔊 Sound ON",
    sound_off: "🔇 Sound OFF",
  },
};

function genProblem() {
  let num;
  do {
    num = Math.floor(Math.random() * 900) + 100; // 100-999
  } while (num % 10 === 0 || Math.floor((num % 100) / 10) === 0);

  const factor = Math.floor(Math.random() * 8) + 2; // 2-9
  const hundreds = Math.floor(num / 100) * 100;
  const tens = Math.floor((num % 100) / 10) * 10;
  const units = num % 10;
  const hundredsProduct = hundreds * factor;
  const tensProduct = tens * factor;
  const partialSum = hundredsProduct + tensProduct;
  const unitsProduct = units * factor;
  const answer = partialSum + unitsProduct;

  return {
    num,
    factor,
    hundreds,
    tens,
    units,
    hundredsProduct,
    tensProduct,
    partialSum,
    unitsProduct,
    answer,
  };
}

export default function TutorLevel16({ onComplete }) {
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
      instruction: tx.prompt_hundreds(problem.hundreds, problem.factor),
      answer: problem.hundredsProduct,
      hint: tx.hint_split(problem.num, problem.hundreds, problem.tens, problem.units),
    },
    {
      instruction: tx.prompt_tens(problem.tens, problem.factor),
      answer: problem.tensProduct,
      hint: tx.hint_memory,
    },
    {
      instruction: tx.prompt_partial(problem.hundredsProduct, problem.tensProduct),
      answer: problem.partialSum,
      hint: tx.hint_partial,
    },
    {
      instruction: tx.prompt_units(problem.units, problem.factor),
      answer: problem.unitsProduct,
      hint: tx.hint_memory,
    },
    {
      instruction: tx.prompt_final(problem.partialSum, problem.unitsProduct),
      answer: problem.answer,
      hint: tx.hint_memory,
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
    completeLesson(16);
    onComplete();
  };

  if (phase === "intro") {
    return (
      <div className="bg-[#0c0e1a] border-2 border-[#14161e] p-6 flex flex-col h-[80vh] overflow-y-auto font-[family-name:var(--font-press-start-2p)]">
        <div className="flex-1 flex flex-col items-center justify-center gap-5 max-w-xl mx-auto w-full py-4">
          <div className="text-center">
            <div className="text-[#39ff14] text-[clamp(0.92rem,2.6vw,1.3rem)] leading-[2] drop-shadow-[0_0_14px_rgba(57,255,20,0.6)]">
              {tx.intro_title}
            </div>
            <div className="text-[#39ff1499] text-[clamp(0.65rem,1.6vw,0.88rem)] leading-[2] tracking-[0.1em]">
              {tx.intro_sub}
            </div>
          </div>

          <p className="text-[#7a7a8a] text-[0.62rem] leading-[2.2] text-center">
            {tx.intro_body}
          </p>

          <div className="bg-[#060810] border-2 border-[#39ff1440] rounded-sm w-full shadow-[0_0_16px_rgba(57,255,20,0.06)]">
            <div className="border-b border-[#39ff1420] px-4 py-2 flex items-center justify-between">
              <span className="text-[#39ff1480] text-[0.54rem] tracking-[0.25em]">{tx.ex_label}</span>
              <span className="text-[#ffe600] text-[0.65rem] drop-shadow-[0_0_6px_rgba(255,230,0,0.4)]">489 x 7</span>
            </div>
            <div className="p-4 flex flex-col gap-1.5">
              {[tx.ex_step1, tx.ex_step2, tx.ex_step3, tx.ex_step4, tx.ex_step5, tx.ex_step6].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[#39ff1470] text-[0.5rem] w-4">{i + 1}</span>
                  <div className="bg-[#071407] border border-[#39ff1430] px-3 py-2 text-[#39ff14] text-[0.6rem] tracking-widest flex-1">
                    {s}
                  </div>
                </div>
              ))}
              <div className="mt-2 text-[#ffe600] text-[0.56rem] leading-[2] drop-shadow-[0_0_6px_rgba(255,230,0,0.3)]">
                {tx.ex_rule}
              </div>
            </div>
          </div>

          <button
            onClick={startPractice}
            className="bg-[#0c0e1a] hover:bg-[#061406] text-[#39ff14] border-2 border-[#39ff14] text-[0.6rem] py-4 px-8 cursor-pointer shadow-[0_0_0_2px_#000,0_0_14px_rgba(57,255,20,0.2)] active:scale-95 transition-all w-full"
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

      <div className="bg-[#060810] border-[3px] border-[#39ff14] shadow-[0_0_0_3px_#000,0_0_12px_rgba(57,255,20,0.12)] rounded-sm p-3 mb-3 text-center shrink-0">
        <div className="text-[#55555a] text-[0.54rem] tracking-[0.2em] mb-1">DISTRIBUTIVA 3 x 1</div>
        <div className="text-[#39ff14] text-[clamp(1.35rem,4vw,2rem)] drop-shadow-[0_0_12px_rgba(57,255,20,0.55)]">
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
              className={`flex items-center justify-between px-3 py-2 rounded-sm border-2 transition-all ${isAnswered ? "bg-[#071407] border-[#39ff1450] text-[#39ff14]" : isCurrent ? "bg-[#060c1a] border-[#ffe600] text-[#ffe600] shadow-[0_0_8px_rgba(255,230,0,0.08)]" : "bg-[#0a0a0a] border-[#1a1a1a] text-[#282828]"}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[0.5rem] shrink-0 ${isAnswered ? "text-[#39ff1470]" : isCurrent ? "text-[#ffe60080]" : "text-[#202020]"}`}>{tx.step(idx + 1)}</span>
                <span className="text-[0.58rem] leading-[1.8]">{s.instruction}</span>
              </div>
              {isAnswered && (
                <span className="text-[#39ff14] text-[0.78rem] shrink-0 ml-3 drop-shadow-[0_0_8px_rgba(57,255,20,0.7)]">{revealed[idx]}</span>
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
            onChange={e => setInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
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
