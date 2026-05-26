"use client";
import { useState, useEffect, useRef } from "react";
import { useGame } from "./GameContext";
import { useLanguage } from "./LanguageContext";

const MUSIC_BASE   = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev/music/elefantito/";
const MUSIC_TRACKS = Array.from({ length: 24 }, (_, i) => `${MUSIC_BASE}mate-${String(i + 1).padStart(2, "0")}.mp3`);

const TX = {
  es: {
    intro_title:  "SUMA",
    intro_sub:    "REDONDEO Y COMPENSACIÓN",
    intro_body:   "Cuando un sumando está cerca de un centenar, redondéalo hacia arriba y luego resta la diferencia. Es más fácil sumar 500 y restar 4 que sumar 496.",
    ex_label:     "— EJEMPLO —",
    ex_step1:     "496 → 500  (le faltan 4)",
    ex_step2:     "759 + 500  =  1,259",
    ex_step3:     "1,259 − 4  =  1,255",
    ex_result:    "759 + 496  =  1,255",
    btn_start:    "PRACTICAR →",
    solved:       (n) => `Resueltos: ${n}`,
    step:         (i) => `PASO ${i}`,
    hint_label:   "PISTA:",
    hint_0:       (b, rounded) => `Encuentra la diferencia: ${rounded} − ${b}.`,
    hint_1:       (a, rounded) => `Suma el número redondeado: ${a} + ${rounded}.`,
    hint_2:       (inter, diff) => `Sumaste ${diff} de más, ahora réstalos: ${inter} − ${diff}.`,
    btn_check:    "VERIFICAR",
    btn_done:     "¡Entendido, estoy listo!",
    step1_ins:    (b, rounded)         => `¿Cuánto le falta a ${b} para llegar a ${rounded}?`,
    step2_ins:    (a, b, rounded)      => `Suma ${rounded} en vez de ${b}  (${a} + ${rounded})`,
    step3_ins:    (inter, diff)        => `Resta lo que te pasaste  (${inter} − ${diff})`,
    sound_on:     "🔊 Sonido ON",
    sound_off:    "🔇 Sonido OFF",
  },
  en: {
    intro_title:  "ADDITION",
    intro_sub:    "ROUND & COMPENSATE",
    intro_body:   "When one addend is close to a hundred, round it up and then subtract the difference. It's easier to add 500 and subtract 4 than to add 496.",
    ex_label:     "— EXAMPLE —",
    ex_step1:     "496 → 500  (4 short)",
    ex_step2:     "759 + 500  =  1,259",
    ex_step3:     "1,259 − 4  =  1,255",
    ex_result:    "759 + 496  =  1,255",
    btn_start:    "PRACTICE →",
    solved:       (n) => `Solved: ${n}`,
    step:         (i) => `STEP ${i}`,
    hint_label:   "HINT:",
    hint_0:       (b, rounded) => `Find the gap: ${rounded} − ${b}.`,
    hint_1:       (a, rounded) => `Add the rounded number: ${a} + ${rounded}.`,
    hint_2:       (inter, diff) => `You added ${diff} too many, so subtract: ${inter} − ${diff}.`,
    btn_check:    "CHECK",
    btn_done:     "Got it, I'm ready!",
    step1_ins:    (b, rounded)         => `How much does ${b} need to reach ${rounded}?`,
    step2_ins:    (a, b, rounded)      => `Add ${rounded} instead of ${b}  (${a} + ${rounded})`,
    step3_ins:    (inter, diff)        => `Subtract what you overshot  (${inter} − ${diff})`,
    sound_on:     "🔊 Sound ON",
    sound_off:    "🔇 Sound OFF",
  },
};

function genProblem() {
  // b ends in 91–99 (1–9 away from the next hundred)
  const hundredsMultiple = Math.floor(Math.random() * 8) + 1; // 1–8
  const remainder        = Math.floor(Math.random() * 9) + 91; // 91–99
  const b                = hundredsMultiple * 100 + remainder;  // 191–899

  // a is any 3-digit number that doesn't itself round cleanly
  const a = Math.floor(Math.random() * 800) + 100; // 100–899

  const rounded      = b + (100 - (b % 100)); // next hundred above b
  const diff         = rounded - b;            // 1–9
  const intermediate = a + rounded;
  const answer       = intermediate - diff;    // = a + b

  return { a, b, rounded, diff, intermediate, answer };
}

export default function TutorLevel5({ onComplete }) {
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
      instruction: tx.step1_ins(problem.b, problem.rounded),
      answer:      problem.diff,
      hint:        tx.hint_0(problem.b, problem.rounded),
    },
    {
      instruction: tx.step2_ins(problem.a, problem.b, problem.rounded),
      answer:      problem.intermediate,
      hint:        tx.hint_1(problem.a, problem.rounded),
    },
    {
      instruction: tx.step3_ins(problem.intermediate, problem.diff),
      answer:      problem.answer,
      hint:        tx.hint_2(problem.intermediate, problem.diff),
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
    completeLesson(5);
    onComplete();
  };

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
              <span className="text-[#ffe600] text-[0.65rem] drop-shadow-[0_0_6px_rgba(255,230,0,0.4)]">759 + 496</span>
            </div>
            <div className="p-4 flex flex-col gap-1.5">
              {[tx.ex_step1, tx.ex_step2, tx.ex_step3].map((s, i) => (
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
            onChange={e => setInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
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
