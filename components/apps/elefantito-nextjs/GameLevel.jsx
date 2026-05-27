"use client";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "./LanguageContext";

const MAX_BARRELS = 20;
const MUSIC_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev/music/elefantito/";
const MUSIC_TRACKS = Array.from({ length: 24 }, (_, i) => `${MUSIC_BASE}mate-${String(i + 1).padStart(2, "0")}.mp3`);

const DECIMAL_FRACTIONS = [
  [1, 2], [1, 3], [2, 3], [1, 4], [3, 4],
  [1, 5], [2, 5], [3, 5], [4, 5],
  [1, 6], [5, 6],
  [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7],
  [1, 8], [3, 8], [5, 8], [7, 8],
  [1, 9], [2, 9], [4, 9], [5, 9], [7, 9], [8, 9],
  [1, 11], [2, 11], [3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11], [10, 11],
  [1, 12], [5, 12], [7, 12], [11, 12],
];

const decimalAnswer = (numerator, denominator) => {
  const scaled = Math.floor((numerator * 1000) / denominator);
  return `0.${String(scaled).padStart(3, "0")}`;
};

const normalizeDecimalAnswer = (value) => {
  const trimmed = value.trim();
  if (/^\d{3}$/.test(trimmed)) return `0.${trimmed}`;
  const decimal = trimmed.startsWith(".") ? `0${trimmed}` : trimmed;
  const match = decimal.match(/^0\.(\d{1,3})$/);
  if (match) return `0.${match[1].padEnd(3, "0")}`;
  return trimmed;
};

export default function GameLevel({ level, problemTypes, onComplete }) {
  const { t, lang } = useLanguage();

  const [timePerQuestion, setTimePerQuestion] = useState(10);
  const [gameState, setGameState] = useState("setup");
  const [problem, setProblem] = useState({ num1: 0, num2: 0, answer: 0, operator: "+" });
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(10);
  const [barrels, setBarrels] = useState([]);
  const [flyingBarrel, setFlyingBarrel] = useState(null);
  const [isThrowing, setIsThrowing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(60);
  const [message, setMessage] = useState(null); // { text, type: "success"|"error" }
  const [gameTime, setGameTime] = useState(0);

  const isProcessingRef  = useRef(false);
  const timerRef         = useRef(null);
  const pendingTimeouts  = useRef([]);
  const startTimeRef = useRef(0);
  const usedProblemsRef = useRef(new Set());
  const gameAreaRef = useRef(null);
  const bottomShelfRef = useRef(null);
  const topShelfRef = useRef(null);
  const elephantRef = useRef(null);
  const flyingBarrelRef = useRef(null);
  const correctSoundRef = useRef(null);
  const errorSoundRef = useRef(null);
  const musicPlayerRef = useRef(null);

  const scheduleTimeout = (fn, ms) => {
    const id = setTimeout(fn, ms);
    pendingTimeouts.current.push(id);
    return id;
  };

  useEffect(() => {
    return () => {
      pendingTimeouts.current.forEach(clearTimeout);
      pendingTimeouts.current = [];
      if (musicPlayerRef.current) {
        musicPlayerRef.current.pause();
        musicPlayerRef.current.src = "";
        musicPlayerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== "playing") return;
      if (e.key >= "0" && e.key <= "9") appendInput(e.key);
      else if (e.key === "Backspace") appendInput("DEL");
      else if (e.key === "." && problem?.operator === "fracDec") appendInput(".");
      else if (e.key === "Enter") checkAnswer();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, input, problem, barrels]);

  useEffect(() => {
    if (gameState === "playing") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeout();
            return timePerQuestion;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState, problem, timePerQuestion]);

  useEffect(() => {
    if (musicPlayerRef.current) musicPlayerRef.current.volume = isMuted ? 0 : volume / 100;
    if (correctSoundRef.current) correctSoundRef.current.muted = isMuted;
    if (errorSoundRef.current) errorSoundRef.current.muted = isMuted;
  }, [isMuted, volume]);

  const playMusic = () => {
    if (!musicPlayerRef.current) {
      const track = MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)];
      musicPlayerRef.current = new Audio(track);
      musicPlayerRef.current.volume = volume / 100;
      musicPlayerRef.current.onended = () => {
        musicPlayerRef.current = null;
        playMusic();
      };
    }
    if (!isMuted) musicPlayerRef.current.play().catch((e) => console.log("Audio play prevented:", e));
  };

  const playSound = (type) => {
    if (isMuted) return;
    const sound = type === "correct" ? correctSoundRef.current : errorSoundRef.current;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch((e) => console.log("Audio play prevented:", e));
    }
  };

  const showMessage = (msg, type = "success") => {
    setMessage({ text: msg, type });
    scheduleTimeout(() => setMessage(null), 2500);
  };

  const getOperatorColor = (op) => {
    switch (op) {
      case "+": return "text-[#00eeff] drop-shadow-[0_0_8px_rgba(0,238,255,0.8)]";
      case "-": return "text-[#ff2244] drop-shadow-[0_0_8px_rgba(255,34,68,0.8)]";
      case "×": return "text-[#ffe600] drop-shadow-[0_0_8px_rgba(255,230,0,0.8)]";
      case "÷": return "text-[#b026ff] drop-shadow-[0_0_12px_rgba(176,38,255,0.9)]";
      default:  return "text-[#00eeff] drop-shadow-[0_0_8px_rgba(0,238,255,0.6)]";
    }
  };

  const generateProblem = () => {
    let num1, num2, answer, operator;
    let problemStr = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 100) {
      attempts++;
      const type = problemTypes[Math.floor(Math.random() * problemTypes.length)];

      switch (type) {
        case 0:
          operator = "+";
          num1 = Math.floor(Math.random() * 9) + 1;
          num2 = Math.floor(Math.random() * 9) + 1;
          answer = num1 + num2;
          break;
        case 1:
          operator = "+";
          num1 = Math.floor(Math.random() * 90) + 10;
          num2 = Math.floor(Math.random() * 9) + 1;
          if (Math.random() > 0.5) [num1, num2] = [num2, num1];
          answer = num1 + num2;
          break;
        case 2:
          operator = "-";
          num1 = Math.floor(Math.random() * 9) + 1;
          num2 = Math.floor(Math.random() * 9) + 1;
          if (num1 < num2) [num1, num2] = [num2, num1];
          answer = num1 - num2;
          break;
        case 3:
          operator = "-";
          num1 = Math.floor(Math.random() * 90) + 10;
          num2 = Math.floor(Math.random() * 9) + 1;
          answer = num1 - num2;
          break;
        case 4:
          operator = "×";
          num1 = Math.floor(Math.random() * 9) + 1;
          num2 = Math.floor(Math.random() * 9) + 1;
          answer = num1 * num2;
          break;
        case 5:
          operator = "÷";
          num2 = Math.floor(Math.random() * 9) + 1;
          answer = Math.floor(Math.random() * 9) + 1;
          num1 = num2 * answer;
          break;
        case 6:
          operator = "+";
          num1 = Math.floor(Math.random() * 79) + 11; // 11–89
          num2 = Math.floor(Math.random() * 79) + 11; // 11–89
          while (num2 % 10 === 0) num2 = Math.floor(Math.random() * 79) + 11;
          answer = num1 + num2;
          break;
        case 7:
          operator = "+";
          num1 = Math.floor(Math.random() * 900) + 100; // 100–999
          do { num2 = Math.floor(Math.random() * 900) + 100; }
          while (Math.floor((num2 % 100) / 10) === 0 || num2 % 10 === 0);
          answer = num1 + num2;
          break;
        case 8: {
          // Round-and-compensate: num2 ends in 91–99 (1–9 away from next hundred)
          operator = "+";
          const hMult = Math.floor(Math.random() * 8) + 1; // 1–8
          num2 = hMult * 100 + Math.floor(Math.random() * 9) + 91; // 191–899
          num1 = Math.floor(Math.random() * 800) + 100; // 100–899
          answer = num1 + num2;
          break;
        }
        case 9: {
          // 4-digit + 3-digit, no zeros in any non-leading digit
          operator = "+";
          do {
            num1 = Math.floor(Math.random() * 9000) + 1000; // 1000–9999
          } while (
            Math.floor((num1 % 1000) / 100) === 0 ||
            Math.floor((num1 % 100)  / 10)  === 0 ||
            num1 % 10 === 0
          );
          do {
            num2 = Math.floor(Math.random() * 900) + 100; // 100–999
          } while (
            Math.floor((num2 % 100) / 10) === 0 ||
            num2 % 10 === 0
          );
          answer = num1 + num2;
          break;
        }
        case 10: {
          // 2-digit minus 2-digit, no borrowing: each digit of num2 ≤ corresponding digit of num1
          operator = "-";
          let n1, n2, ok = false;
          for (let i = 0; i < 200 && !ok; i++) {
            n1 = Math.floor(Math.random() * 70) + 30;        // 30–99
            const t1 = Math.floor(n1 / 10), o1 = n1 % 10;
            if (o1 === 0) continue;
            const t2 = Math.floor(Math.random() * t1) + 1;   // 1…t1
            const o2 = Math.floor(Math.random() * o1) + 1;   // 1…o1
            n2 = t2 * 10 + o2;
            if (n2 < n1) ok = true;
          }
          num1 = n1; num2 = n2; answer = num1 - num2;
          break;
        }
        case 11: {
          // 3-digit minus 3-digit, no borrowing: each digit of num2 ≤ corresponding digit of num1
          operator = "-";
          let a, b, ok2 = false;
          for (let i = 0; i < 200 && !ok2; i++) {
            a = Math.floor(Math.random() * 900) + 100;       // 100–999
            const aH = Math.floor(a / 100);
            const aT = Math.floor((a % 100) / 10);
            const aO = a % 10;
            if (aT === 0 || aO === 0) continue;
            const bH = Math.floor(Math.random() * aH) + 1;  // 1…aH
            const bT = Math.floor(Math.random() * aT) + 1;  // 1…aT
            const bO = Math.floor(Math.random() * aO) + 1;  // 1…aO
            b = bH * 100 + bT * 10 + bO;
            if (b < a) ok2 = true;
          }
          num1 = a; num2 = b; answer = num1 - num2;
          break;
        }
        case 12: {
          // Complement to 100: num2 is 10–98, not a multiple of 10
          operator = "comp";
          do {
            num2 = Math.floor(Math.random() * 89) + 10; // 10–98
          } while (num2 % 10 === 0);
          num1 = 100;
          answer = 100 - num2;
          break;
        }
        case 13: {
          // Complement to 1000: num2 is 100–998, not a multiple of 10
          operator = "comp";
          do {
            num2 = Math.floor(Math.random() * 899) + 100; // 100–998
          } while (num2 % 10 === 0);
          num1 = 1000;
          answer = 1000 - num2;
          break;
        }
        case 14: {
          // 2-digit - 2-digit, num2 ends in 7/8/9, round-and-compensate
          operator = "-";
          let a14, b14;
          do {
            const lastDigit = 7 + Math.floor(Math.random() * 3);          // 7, 8, or 9
            b14 = (1 + Math.floor(Math.random() * 6)) * 10 + lastDigit;  // 17–69
            a14 = b14 + 5 + Math.floor(Math.random() * 20);              // a > b
          } while (a14 > 99);
          num1 = a14; num2 = b14; answer = num1 - num2;
          break;
        }
        case 15: {
          // 3-digit - 3-digit, round-and-compensate with complement
          operator = "-";
          let a15, b15, ok15 = false;
          for (let i = 0; i < 200 && !ok15; i++) {
            a15 = 200 + Math.floor(Math.random() * 800);              // 200–999
            b15 = 100 + Math.floor(Math.random() * (a15 - 100));     // 100–(a15-1)
            if (b15 % 10 === 0 || b15 % 100 < 10) continue;         // clean digits
            const rb = Math.ceil(b15 / 100) * 100;
            if (rb >= a15) continue;                                  // step1 must be > 0
            ok15 = true;
          }
          num1 = a15; num2 = b15; answer = num1 - num2;
          break;
        }
        case 16: {
          // Multiplication tables up to 12 x 12.
          operator = "×";
          num1 = Math.floor(Math.random() * 11) + 2; // 2-12
          num2 = Math.floor(Math.random() * 11) + 2; // 2-12
          answer = num1 * num2;
          break;
        }
        case 17: {
          // Tables of 11 and 12.
          operator = "×";
          num1 = Math.random() > 0.5 ? 11 : 12;
          num2 = Math.floor(Math.random() * 11) + 2; // 2-12
          if (Math.random() > 0.5) [num1, num2] = [num2, num1];
          answer = num1 * num2;
          break;
        }
        case 18: {
          // Two-digit multiplication that can be factored through 11 or 12.
          operator = "×";
          const factorable = [22, 24, 33, 36, 44, 48, 55, 60, 66, 72, 77, 84, 88, 96, 99];
          num1 = Math.floor(Math.random() * 80) + 20; // 20-99
          num2 = factorable[Math.floor(Math.random() * factorable.length)];
          answer = num1 * num2;
          break;
        }
        case 19: {
          // 2-by-1 multiplication using distributive decomposition.
          operator = "×";
          do {
            num1 = Math.floor(Math.random() * 88) + 12; // 12-99
          } while (num1 % 10 === 0);
          num2 = Math.floor(Math.random() * 8) + 2; // 2-9
          answer = num1 * num2;
          break;
        }
        case 20: {
          // 3-by-1 multiplication using extended distributive decomposition.
          operator = "×";
          do {
            num1 = Math.floor(Math.random() * 900) + 100; // 100-999
          } while (num1 % 10 === 0 || Math.floor((num1 % 100) / 10) === 0);
          num2 = Math.floor(Math.random() * 8) + 2; // 2-9
          answer = num1 * num2;
          break;
        }
        case 21: {
          // 2-by-2 multiplication for the addition method.
          operator = "×";
          do {
            num1 = Math.floor(Math.random() * 89) + 11; // 11-99
            num2 = Math.floor(Math.random() * 89) + 11; // 11-99
          } while (num1 % 10 === 0 || num2 % 10 === 0);
          answer = num1 * num2;
          break;
        }
        case 22: {
          // One-digit division with exact two-digit quotient.
          operator = "÷";
          num2 = Math.floor(Math.random() * 8) + 2; // divisor 2-9
          answer = Math.floor(Math.random() * 88) + 12; // quotient 12-99
          num1 = answer * num2;
          break;
        }
        case 23: {
          // One-digit division with exact three-digit quotient.
          operator = "÷";
          num2 = Math.floor(Math.random() * 8) + 2; // divisor 2-9
          answer = Math.floor(Math.random() * 900) + 100; // quotient 100-999
          num1 = answer * num2;
          break;
        }
        case 24: {
          // Common fractions as decimals, truncated to three decimal places.
          operator = "fracDec";
          const [numerator, denominator] = DECIMAL_FRACTIONS[Math.floor(Math.random() * DECIMAL_FRACTIONS.length)];
          num1 = numerator;
          num2 = denominator;
          answer = decimalAnswer(numerator, denominator);
          break;
        }
        default:
          operator = "+"; num1 = 1; num2 = 1; answer = 2;
      }

      problemStr = `${num1}${operator}${num2}`;
      if (!usedProblemsRef.current.has(problemStr)) isUnique = true;
    }

    usedProblemsRef.current.add(problemStr);
    setProblem({ num1, num2, answer, operator });
    setInput("");
    setTimeLeft(timePerQuestion);
    isProcessingRef.current = false;
  };

  const startGame = () => {
    setBarrels([]);
    usedProblemsRef.current.clear();
    setGameState("playing");
    startTimeRef.current = Date.now();
    generateProblem();
    playMusic();
  };

  const throwBarrel = () => {
    setIsThrowing(true);
    let startX = 70, startY = 70;
    let targetX = "50%", targetY = "65%";

    const gameArea = gameAreaRef.current;
    const bottomShelf = bottomShelfRef.current;
    const topShelf = topShelfRef.current;
    const elephant = elephantRef.current;

    if (gameArea && bottomShelf && topShelf && elephant) {
      const gRect = gameArea.getBoundingClientRect();
      const eRect = elephant.getBoundingClientRect();
      startX = eRect.left - gRect.left + 68;
      startY = gRect.bottom - eRect.bottom + 76;

      const isTopShelf = barrels.length >= 10;
      const activeShelf = isTopShelf ? topShelf : bottomShelf;
      const sRect = activeShelf.getBoundingClientRect();
      const barrelIndex = isTopShelf ? barrels.length - 10 : barrels.length;
      targetX = sRect.left - gRect.left + 8 + barrelIndex * 53;
      targetY = gRect.bottom - sRect.bottom + 4;
    }

    // Mount the barrel element at the start position so flyingBarrelRef gets attached,
    // then use WAAPI in a RAF (after React commits) to animate both keyframes explicitly.
    // This avoids CSS transition timing issues caused by React 18 batching.
    setFlyingBarrel({ left: `${startX}px`, bottom: `${startY}px` });
    requestAnimationFrame(() => {
      flyingBarrelRef.current?.animate(
        [
          { left: `${startX}px`, bottom: `${startY}px`, transform: "rotate(0deg)" },
          { left: `${targetX}px`, bottom: `${targetY}px`, transform: "rotate(360deg)" },
        ],
        { duration: 1400, easing: "ease-out", fill: "forwards" }
      );
    });

    scheduleTimeout(() => {
      setBarrels((prev) => [...prev, { id: Date.now() + Math.random().toString() }]);
      setIsThrowing(false);
      setFlyingBarrel(null);
      if (barrels.length + 1 >= MAX_BARRELS) {
        clearInterval(timerRef.current);
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setGameTime(elapsed);
        setGameState("won");
        showMessage(t("msg_win"));
      } else {
        scheduleTimeout(generateProblem, 800);
      }
    }, 1450);
  };

  const removeBarrel = () => {
    setBarrels((prev) => (prev.length === 0 ? prev : prev.slice(0, -1)));
  };

  const handleTimeout = () => {
    playSound("error");
    showMessage(t("msg_timeout"), "error");
    removeBarrel();
    generateProblem();
  };

  const checkAnswer = () => {
    if (input === "" || isProcessingRef.current) return;
    isProcessingRef.current = true;
    const isCorrect = problem.operator === "fracDec"
      ? normalizeDecimalAnswer(input) === problem.answer
      : parseInt(input) === problem.answer;

    if (isCorrect) {
      playSound("correct");
      showMessage(barrels.length === MAX_BARRELS - 1 ? t("msg_correct_last") : t("msg_correct"));
      clearInterval(timerRef.current);
      throwBarrel();
    } else {
      playSound("error");
      showMessage(t("msg_wrong"), "error");
      removeBarrel();
      generateProblem();
    }
  };

  const appendInput = (val) => {
    if (val === "DEL") {
      setInput((prev) => prev.slice(0, -1));
      return;
    }

    if (problem.operator === "fracDec") {
      if (val === "." && input.includes(".")) return;
      if (val === "." && input.length === 0) {
        setInput("0.");
        return;
      }
      if ((val === "." || /^\d$/.test(val)) && input.length < 5) setInput((prev) => prev + val);
      return;
    }

    if (input.length < 5) setInput((prev) => prev + val);
  };

  const keys = problem.operator === "fracDec"
    ? ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "DEL", "ENTER"]
    : ["7", "8", "9", "4", "5", "6", "1", "2", "3", "DEL", "0", "ENTER"];
  const hudLabel   = lang === "en" ? `LEVEL ${level}`         : `NIVEL ${level}`;
  const winTitle   = lang === "en" ? `LEVEL ${level}\nCOMPLETED!` : `¡NIVEL ${level}\nCOMPLETADO!`;
  const nextLabel  = lang === "en" ? "NEXT LEVEL →"           : "SIGUIENTE NIVEL →";

  return (
    <div className="w-full flex flex-col md:flex-row gap-3 h-[80vh] min-h-[550px] relative font-[family-name:var(--font-press-start-2p)]">
      <audio ref={correctSoundRef} src="https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev/acierto.mp3" preload="auto" />
      <audio ref={errorSoundRef}   src="https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev/error.mp3"   preload="auto" />

      {/* GAME AREA */}
      <div ref={gameAreaRef} className="flex-1 relative bg-[#060810] border-[3px] border-[#14161e] rounded-sm overflow-hidden flex flex-col">
        <div className="absolute inset-0 bg-jungle" />
        <div className="absolute inset-0 pointer-events-none z-10" style={{ background: "radial-gradient(circle at center, transparent 30%, #060810 120%)" }} />
        <div className="absolute inset-0 pointer-events-none z-10" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }} />

        {/* HUD */}
        <div className="absolute top-0 left-0 right-0 p-3 flex justify-between z-20">
          <div className="bg-[#08090f] border-2 border-[#00eeff] text-[#00eeff] px-3 py-2 text-[0.45rem] shadow-[0_0_8px_rgba(0,238,255,0.25)] rounded-sm">
            {hudLabel}
          </div>
          <div className="bg-[#08090f] border-2 border-[#39ff14] text-[#39ff14] px-3 py-2 text-[0.45rem] shadow-[0_0_8px_rgba(57,255,20,0.25)] rounded-sm">
            {t("barrels")} {barrels.length}/{MAX_BARRELS}
          </div>
        </div>

        {/* Top Shelf */}
        <div ref={topShelfRef} className="absolute w-[566px] max-w-[95%] h-[12px] left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[40px] bottom-[75%] bg-[#0d0f1a] border-b-[3px] border-[#191c2b] shadow-[0_4px_12px_rgba(57,255,20,0.1),inset_0_1px_0_rgba(57,255,20,0.1)] rounded-sm flex items-end px-2 gap-1 z-10">
          {barrels.slice(10, 20).map((b) => (
            <div key={b.id} className="w-[73px] h-[94px] bg-contain bg-center bg-no-repeat mb-1 -ml-6 first:ml-0 transition-all drop-shadow-[0_0_8px_rgba(57,255,20,0.4)]" style={{ backgroundImage: "url('/barril.png')" }} />
          ))}
        </div>

        {/* Bottom Shelf */}
        <div ref={bottomShelfRef} className="absolute w-[566px] max-w-[95%] h-[12px] left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[40px] bottom-[48%] bg-[#0d0f1a] border-b-[3px] border-[#191c2b] shadow-[0_4px_12px_rgba(57,255,20,0.1),inset_0_1px_0_rgba(57,255,20,0.1)] rounded-sm flex items-end px-2 gap-1 z-10">
          {barrels.slice(0, 10).map((b) => (
            <div key={b.id} className="w-[73px] h-[94px] bg-contain bg-center bg-no-repeat mb-1 -ml-6 first:ml-0 transition-all drop-shadow-[0_0_8px_rgba(57,255,20,0.4)]" style={{ backgroundImage: "url('/barril.png')" }} />
          ))}
        </div>

        {/* Elephant */}
        <div ref={elephantRef} className="absolute w-[136px] h-[152px] bottom-[15px] left-[35px] z-20">
          <img src="/elefantito_piso.png" className={`w-full h-full object-contain absolute drop-shadow-[0_0_12px_rgba(0,238,255,0.4)] ${isThrowing ? "opacity-0" : "opacity-100"}`} alt="Idle" />
          <img src="/elefantito_aire.png" className={`w-full h-full object-contain absolute drop-shadow-[0_0_12px_rgba(0,238,255,0.4)] origin-bottom scale-[1.3] ${isThrowing ? "opacity-100" : "opacity-0"}`} alt="Throwing" />
        </div>

        {/* Flying Barrel */}
        {flyingBarrel && (
          <div
            ref={flyingBarrelRef}
            className="absolute w-[73px] h-[94px] bg-contain bg-center bg-no-repeat z-30 drop-shadow-[0_0_12px_rgba(57,255,20,0.6)]"
            style={{ backgroundImage: "url('/barril.png')", left: flyingBarrel.left, bottom: flyingBarrel.bottom }}
          />
        )}

        {/* Message */}
        {message && (
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 bg-[#0a0b14]/90 px-5 py-3 rounded-sm border-2 font-[family-name:var(--font-press-start-2p)] text-[0.55rem] text-center z-50 animate-[slideDown_0.3s_ease-out] shadow-2xl backdrop-blur-sm"
            style={{
              borderColor: message.type === "error" ? "#ff2244" : "#39ff14",
              color:       message.type === "error" ? "#ff2244" : "#39ff14",
              textShadow:  message.type === "error" ? "0 0 10px rgba(255,34,68,0.4)" : "0 0 10px rgba(57,255,20,0.4)",
            }}>
            {message.text}
          </div>
        )}

        {/* Setup overlay */}
        {gameState === "setup" && (
          <div className="absolute inset-0 bg-[#000000d0] backdrop-blur-sm flex items-center justify-center z-40 p-4">
            <div className="bg-[#060810] p-6 rounded-sm border-2 border-[#00eeff] text-center max-w-sm w-full shadow-[0_0_0_4px_#000,0_0_20px_rgba(0,238,255,0.25)]">
              <h2 className="text-[#00eeff] text-[0.8rem] mb-6 drop-shadow-[0_0_8px_rgba(0,238,255,0.4)] leading-relaxed">{t("game_setup_title")}</h2>
              <div className="bg-[#08090f] p-4 rounded-sm border border-[#14161e] mb-6 text-left">
                <label className="block text-[#a0a0a0] text-[0.45rem] mb-3 leading-loose">
                  {t("setup_time")} <span className="text-[#39ff14] drop-shadow-[0_0_5px_rgba(57,255,20,0.4)]">{timePerQuestion}s</span>
                </label>
                <input type="range" min="3" max="25" value={timePerQuestion}
                  onChange={(e) => { const v = parseInt(e.target.value); setTimePerQuestion(v); setTimeLeft(v); }}
                  className="w-full accent-[#39ff14]"
                />
                <div className="flex justify-between text-[0.35rem] text-[#555] mt-2">
                  <span>3s</span><span>25s</span>
                </div>
              </div>
              <button onClick={startGame} className="bg-[#0c0e1a] hover:bg-[#151930] text-[#39ff14] border-2 border-[#39ff14] text-[0.6rem] py-4 px-6 cursor-pointer shadow-[0_0_0_2px_#000,0_0_12px_rgba(57,255,20,0.25)] active:scale-95 transition-all w-full">
                {t("game_start")}
              </button>
            </div>
          </div>
        )}

        {/* Win overlay */}
        {gameState === "won" && (
          <div className="absolute inset-0 bg-[#000000e0] backdrop-blur-sm flex items-center justify-center z-40 p-4">
            <div className="bg-[#060810] p-8 rounded-sm border-2 border-[#39ff14] text-center max-w-sm w-full animate-[winGlow_2s_infinite]">
              <h2 className="text-[1rem] text-[#39ff14] mb-6 leading-relaxed drop-shadow-[0_0_10px_rgba(57,255,20,0.5)] whitespace-pre-line">{winTitle}</h2>
              <p className="text-[#00eeff] text-[0.6rem] mb-8 leading-loose">
                {t("game_time")}<br /><br />
                <span className="text-white text-[0.8rem]">{Math.floor(gameTime / 60)}:{(gameTime % 60).toString().padStart(2, "0")}</span>
              </p>
              <button onClick={onComplete} className="bg-[#0c0e1a] hover:bg-[#151930] text-[#39ff14] border-2 border-[#39ff14] text-[0.5rem] py-4 px-6 cursor-pointer shadow-[0_0_0_2px_#000,0_0_12px_rgba(57,255,20,0.25)] active:scale-95 transition-all w-full">
                {nextLabel}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CONTROL PANEL */}
      <div className="w-full md:w-[260px] bg-[#0a0b14] border-l-2 md:border-l-[3px] border-[#14161e] p-3 flex flex-col gap-3 shrink-0 relative z-20">
        {/* Timer */}
        <div className="bg-[#060810] border-[3px] border-[#ff2244] rounded-sm p-3 shadow-[0_0_0_3px_#000,0_0_10px_rgba(255,34,68,0.15)] flex flex-col items-center justify-center shrink-0 h-[65px] relative overflow-hidden">
          <div className={`text-[1.85rem] text-[#ff2244] z-10 transition-all ${timeLeft <= 4 && gameState === "playing" ? "animate-[pulseR_0.5s_infinite]" : "drop-shadow-[0_0_8px_rgba(255,34,68,0.45)]"}`}>
            {timeLeft}
          </div>
          <div className="absolute bottom-0 left-0 h-[4px] bg-[#ff2244] shadow-[0_0_8px_#ff2244] transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / timePerQuestion) * 100}%` }} />
        </div>

        {/* Problem */}
        <div className="bg-[#060810] border-[4px] border-[#00eeff] shadow-[0_0_0_4px_#000,0_0_12px_rgba(0,238,255,0.14)] rounded-sm p-2 min-h-[54px] flex items-center justify-center shrink-0">
          <div className="text-[1rem] text-[#00eeff] text-center drop-shadow-[0_0_10px_rgba(0,238,255,0.45)] tracking-[0.1em] flex items-center gap-2">
            {gameState === "playing" ? (
              problem?.operator === "comp" ? (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[#b026ff] text-[0.45rem] tracking-widest drop-shadow-[0_0_6px_rgba(176,38,255,0.7)]">
                    {lang === "en" ? "COMPL. OF" : "COMPL. DE"}
                  </span>
                  <span className="text-[#b026ff] text-[1.6rem] drop-shadow-[0_0_10px_rgba(176,38,255,0.8)]">
                    {problem?.num2}
                  </span>
                </div>
              ) : problem?.operator === "fracDec" ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[#ffe600] text-[0.42rem] tracking-widest drop-shadow-[0_0_6px_rgba(255,230,0,0.45)]">
                    3 DEC.
                  </span>
                  <span className="text-[#00eeff] text-[1.35rem] drop-shadow-[0_0_10px_rgba(0,238,255,0.75)]">
                    {problem?.num1}/{problem?.num2}
                  </span>
                </div>
              ) : (
                <>
                  <span>{problem?.num1}</span>
                  <span className={`${getOperatorColor(problem?.operator)} text-[1.3rem] mx-1`}>{problem?.operator}</span>
                  <span>{problem?.num2}</span>
                </>
              )
            ) : "..."}
          </div>
        </div>

        {/* Answer */}
        <div className="bg-[#060810] border-[4px] border-[#ffe600] shadow-[0_0_0_4px_#000,0_0_12px_rgba(255,230,0,0.14)] rounded-sm py-2 px-3 min-h-[54px] flex items-center justify-end shrink-0">
          <div className="text-[1.85rem] text-[#ffe600] drop-shadow-[0_0_10px_rgba(255,230,0,0.45)] min-w-[20px]">
            {input || <span className="opacity-0">_</span>}
          </div>
          {gameState === "playing" && <div className="w-[3px] h-[1.6rem] bg-[#ffe600] ml-1 shadow-[0_0_6px_#ffe600] animate-[blink_0.9s_infinite]" />}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-[5px] flex-1 content-start">
          {keys.map((key, i) => (
            <button key={i}
              onClick={() => { if (key === "ENTER") checkAnswer(); else appendInput(key); }}
              disabled={gameState !== "playing"}
              className="bg-[#0c0e1a] border-2 border-[#39ff14] text-[#39ff14] text-[1.1rem] py-3 rounded-sm shadow-[0_0_0_2px_#000,0_5px_0_rgba(57,255,20,0.3)] active:translate-y-[5px] active:shadow-none transition-transform disabled:opacity-50 cursor-pointer flex items-center justify-center num-btn"
              style={{ gridColumn: key === "ENTER" ? (problem.operator === "fracDec" ? "span 3" : "span 2") : "span 1", fontSize: key === "ENTER" ? "0.6rem" : key === "DEL" ? "1.2rem" : "1.1rem" }}
            >
              {key === "DEL" ? "⌫" : key === "ENTER" ? t("game_enter") : key}
            </button>
          ))}
        </div>

        {/* Audio */}
        <div className="border-t-2 border-[#14161e] pt-3 flex flex-col gap-[5px] shrink-0 mt-auto">
          <button onClick={() => setIsMuted(!isMuted)}
            className={`w-full text-[0.44rem] py-[7px] rounded-sm cursor-pointer transition-colors ${isMuted ? "bg-[#0d0d0d] border-2 border-[#242424] text-[#3a3a3a] shadow-none" : "bg-[#0c0e1a] border-2 border-[#00eeff] text-[#00eeff] shadow-[0_0_7px_rgba(0,238,255,0.15)]"}`}>
            {isMuted ? t("sound_off") : t("sound_on")}
          </button>
          <div className="flex items-center gap-[6px]">
            <span className="text-[0.75rem]">🔉</span>
            <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="flex-1 accent-[#00eeff]" />
            <span className="text-[0.75rem]">🔊</span>
          </div>
        </div>
      </div>
    </div>
  );
}
