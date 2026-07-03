"use client";

import React, { useState, useEffect, useRef } from "react";
import { AUDIO_ASSETS, AUDIO_BASE_URL } from "@/data/apps/memoria-data";

type MemoriaChallengeProps = {
  locale: string;
};

type Phase = "config" | "exposure" | "blind" | "recall" | "results";

export default function MemoriaChallenge({ locale }: MemoriaChallengeProps) {
  const isEN = locale === "en";

  const [phase, setPhase] = useState<Phase>("config");
  const [numPairs, setNumPairs] = useState<number>(3);
  const [blindTime, setBlindTime] = useState<number>(30);
  const [distractorGame, setDistractorGame] = useState<"space-invaders" | "tetris" | "burbujas" | "ranita" | "laberinto">("tetris");
  
  const [sequence, setSequence] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const timerSoundRef = useRef<HTMLAudioElement | null>(null);
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const errorSoundRef = useRef<HTMLAudioElement | null>(null);
  const handleTimeoutRef = useRef<(() => void) | null>(null);

  const T = {
    title: isEN ? "Memory Challenge" : "El Reto de Memoria",
    configTitle: isEN ? "Setup Challenge" : "Configuración del Reto",
    pairsLabel: isEN ? "Number of Pairs:" : "Cantidad de pares:",
    blindLabel: isEN ? "Blind Time (seconds):" : "Tiempo a ciegas (segundos):",
    distractorLabel: isEN ? "Distractor Game:" : "Juego Distractor:",
    gameTetris: isEN ? "🧩 Neon Blocks" : "🧩 Bloques Neón",
    gameSpace: isEN ? "👾 Alien Invasion" : "👾 Invasión Alien",
    gameBurbujas: isEN ? "🫧 Bubbles" : "🫧 Burbujas",
    gameRanita: isEN ? "🐸 Jumping Frog" : "🐸 Salta Ranita",
    gameLaberinto: isEN ? "🟡 Neon Maze" : "🟡 Laberinto",
    btnStart: isEN ? "Start Challenge" : "Iniciar Reto",
    exposureTitle: isEN ? "Memorize!" : "¡Memoriza!",
    blindTitle: isEN ? "Distraction!" : "¡Distracción!",
    recallTitle: isEN ? "Recall" : "Recuperación",
    btnCheck: isEN ? "Verify" : "Verificar",
    resultsTitle: isEN ? "Results" : "Resultados",
    btnRestart: isEN ? "Play Again" : "Volver a Jugar",
    correct: isEN ? "Correct" : "Correcto",
    incorrect: isEN ? "Incorrect" : "Incorrecto",
    score: isEN ? "Score:" : "Calificación:",
    yourAnswer: isEN ? "You wrote:" : "Escribiste:",
    realAnswer: isEN ? "Correct:" : "Real:",
  };

  useEffect(() => {
    timerSoundRef.current = new Audio(`${AUDIO_BASE_URL}/${AUDIO_ASSETS.effects.next}`);
    correctSoundRef.current = new Audio(`${AUDIO_BASE_URL}/${AUDIO_ASSETS.effects.correct}`);
    errorSoundRef.current = new Audio(`${AUDIO_BASE_URL}/${AUDIO_ASSETS.effects.error}`);
  }, []);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            handleTimeoutRef.current?.();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  const handleTimeout = () => {
    setTimerRunning(false);
    if (phase === "exposure") {
      setPhase("blind");
      setTimeLeft(blindTime);
      setTimerRunning(true);
    } else if (phase === "blind") {
      setPhase("recall");
      if (timerSoundRef.current) {
        timerSoundRef.current.currentTime = 0;
        timerSoundRef.current.play().catch(() => {});
      }
    }
  };

  // Mantiene el ref apuntando al handler más reciente (declarado justo arriba).
  useEffect(() => {
    handleTimeoutRef.current = handleTimeout;
  });

  const generateSequence = () => {
    const newSeq: string[] = [];
    for (let i = 0; i < numPairs; i++) {
      const num = Math.floor(Math.random() * 100);
      newSeq.push(num.toString().padStart(2, "0"));
    }
    setSequence(newSeq);
    setAnswers(Array(numPairs).fill(""));
  };

  const startChallenge = () => {
    generateSequence();
    setPhase("exposure");
    setTimeLeft(numPairs * 3); // 3 seconds per pair
    setTimerRunning(true);
  };

  const checkAnswers = () => {
    setPhase("results");
    
    // Play sound based on score
    let correctCount = 0;
    answers.forEach((ans, i) => {
      if (ans.trim() === sequence[i]) correctCount++;
    });
    
    if (correctCount === numPairs) {
      correctSoundRef.current?.play().catch(()=>{});
    } else {
      errorSoundRef.current?.play().catch(()=>{});
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 bg-slate-900 rounded-2xl shadow-xl font-sans border border-slate-700">
      
      {phase === "config" && (
        <div className="bg-slate-800 p-8 rounded-xl shadow-lg max-w-2xl mx-auto border border-slate-700 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">{T.configTitle}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="flex flex-col items-center">
              <label className="text-slate-300 font-semibold mb-3">{T.pairsLabel}</label>
              <select 
                value={numPairs} 
                onChange={e => setNumPairs(Number(e.target.value))}
                className="w-full max-w-[200px] p-3 rounded-lg bg-slate-700 border-2 border-slate-600 text-white font-bold text-lg focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {[2,3,4,5,6,7,8,9,10].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col items-center">
              <label className="text-slate-300 font-semibold mb-3">{T.blindLabel}</label>
              <select 
                value={blindTime} 
                onChange={e => setBlindTime(Number(e.target.value))}
                className="w-full max-w-[200px] p-3 rounded-lg bg-slate-700 border-2 border-slate-600 text-white font-bold text-lg focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {Array.from({length: 21}, (_, i) => 20 + i * 5).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="flex flex-col items-center">
              <label className="text-slate-300 font-semibold mb-3">{T.distractorLabel}</label>
              <select 
                value={distractorGame} 
                onChange={e => setDistractorGame(e.target.value as typeof distractorGame)}
                className="w-full max-w-[200px] p-3 rounded-lg bg-slate-700 border-2 border-slate-600 text-white font-bold text-lg focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="tetris">{T.gameTetris}</option>
                <option value="space-invaders">{T.gameSpace}</option>
                <option value="burbujas">{T.gameBurbujas}</option>
                <option value="ranita">{T.gameRanita}</option>
                <option value="laberinto">{T.gameLaberinto}</option>
              </select>
            </div>
          </div>

          <button onClick={startChallenge} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xl shadow-lg hover:-translate-y-1 transition-all duration-200">
            {T.btnStart}
          </button>
        </div>
      )}

      {phase === "exposure" && (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <h2 className="text-4xl font-bold text-indigo-400 mb-4 animate-pulse">{T.exposureTitle}</h2>
          <div className="text-2xl text-slate-400 mb-12 font-mono">
            {formatTime(timeLeft)}
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 max-w-3xl">
            {sequence.map((num, idx) => (
              <div key={idx} className="bg-slate-800 border-2 border-indigo-500/30 rounded-xl p-6 text-6xl font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                {num}
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "blind" && (
        <div className="flex flex-col items-center h-[720px] relative">
          <div className="absolute top-4 right-6 bg-slate-800/90 border border-rose-500/50 px-6 py-2 rounded-full z-10 shadow-lg backdrop-blur-sm">
            <span className="text-rose-400 font-bold tracking-widest uppercase text-sm">Tiempo A Ciegas: </span>
            <span className="text-white font-mono text-xl ml-2">{formatTime(timeLeft)}</span>
          </div>
          
          {/* Distractor Iframe */}
          <div className="w-full h-full rounded-xl overflow-hidden border-2 border-slate-700 bg-black flex justify-center items-center">
            <iframe 
              src={`/apps/${distractorGame === 'tetris' ? 'tetris-gemini' : distractorGame === 'space-invaders' ? 'space-invaders' : distractorGame + '-gemini'}.html`} 
              className="w-full h-full border-none"
              title="Distractor Game"
            />
          </div>
        </div>
      )}

      {phase === "recall" && (
        <div className="flex flex-col items-center bg-slate-800 p-8 rounded-xl border border-slate-700 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8">{T.recallTitle}</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10 w-full">
            {answers.map((ans, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <span className="text-slate-500 text-sm mb-1 font-bold">#{idx + 1}</span>
                <input
                  type="text"
                  maxLength={2}
                  value={ans}
                  onChange={(e) => {
                    const newAns = [...answers];
                    newAns[idx] = e.target.value.replace(/\D/g, "");
                    setAnswers(newAns);
                  }}
                  className="w-full h-16 text-center text-3xl font-bold bg-slate-900 border-2 border-slate-600 text-white rounded-lg focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
            ))}
          </div>

          <button onClick={checkAnswers} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xl shadow-lg hover:-translate-y-1 transition-all duration-200">
            {T.btnCheck}
          </button>
        </div>
      )}

      {phase === "results" && (
        <div className="flex flex-col items-center bg-slate-800 p-8 rounded-xl border border-slate-700 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">{T.resultsTitle}</h2>
          
          <div className="text-5xl font-black mb-10 pb-6 border-b border-slate-700 w-full text-center">
            {T.score} <span className="text-emerald-400">{answers.filter((a, i) => a === sequence[i]).length}</span>
            <span className="text-slate-500"> / {numPairs}</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10 w-full">
            {sequence.map((realNum, idx) => {
              const isCorrect = answers[idx] === realNum;
              return (
                <div key={idx} className={`p-4 rounded-xl border-2 flex flex-col items-center
                  ${isCorrect ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-rose-900/20 border-rose-500/50'}
                `}>
                  <div className="text-slate-400 text-xs uppercase font-bold mb-2">#{idx + 1}</div>
                  
                  <div className="text-center mb-2">
                    <span className="text-slate-500 text-xs block">{T.yourAnswer}</span>
                    <span className={`text-2xl font-bold ${isCorrect ? 'text-emerald-400' : 'text-rose-400 line-through decoration-2'}`}>
                      {answers[idx] || "--"}
                    </span>
                  </div>
                  
                  {!isCorrect && (
                    <div className="text-center bg-slate-900/50 w-full rounded py-1">
                      <span className="text-slate-500 text-xs block">{T.realAnswer}</span>
                      <span className="text-xl font-bold text-white">{realNum}</span>
                    </div>
                  )}
                  {isCorrect && (
                    <div className="text-emerald-500 font-bold text-sm mt-2 flex items-center gap-1">
                      ✓ {T.correct}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={() => setPhase("config")} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xl shadow-lg hover:-translate-y-1 transition-all duration-200">
            {T.btnRestart}
          </button>
        </div>
      )}

    </div>
  );
}
