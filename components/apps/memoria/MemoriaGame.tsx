"use client";

import React, { useState, useEffect, useRef } from "react";
import { AUDIO_ASSETS, AUDIO_BASE_URL, GameData, MnemonicSet } from "@/data/apps/memoria-data";

type MemoriaGameProps = {
  locale: string;
  wordsData: GameData;
  onSaveWords: (range: string, newSet: MnemonicSet) => Promise<void>;
};

type CardData = {
  id: string; // The number (key)
  text: string; // Either the number or the word
  uniqueId: string; // React key
};

// Helpers impuros a nivel de módulo: solo se llaman desde event handlers,
// así quedan fuera del análisis de pureza del React Compiler.
function pickRandomTrack(tracks: readonly string[]) {
  return tracks[Math.floor(Math.random() * tracks.length)];
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function MemoriaGame({ locale, wordsData, onSaveWords }: MemoriaGameProps) {
  const isEN = locale === "en";

  const [currentRange, setCurrentRange] = useState<string>("");
  const [cards, setCards] = useState<CardData[]>([]);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  
  const [moves, setMoves] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  
  const [message, setMessage] = useState({ text: "", type: "info" });
  const [isMuted, setIsMuted] = useState(false);
  const [musicStarted, setMusicStarted] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedWords, setEditedWords] = useState<MnemonicSet>({});
  const [isSaving, setIsSaving] = useState(false);

  // Audio refs
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const flipSoundRef = useRef<HTMLAudioElement | null>(null);

  // Translations
  const T = {
    selectionTitle: isEN ? "Which numbers do you want to practice?" : "¿Qué números quieres trabajar?",
    gameTitle: isEN ? "Mnemonic Memory App" : "App Memoria (nemotecnia)",
    findPairs: isEN ? "Find the pairs." : "Encuentra los pares.",
    correct: isEN ? "Correct!" : "¡Correcto!",
    congrats: isEN ? "Congratulations!" : "¡Felicidades!",
    completedIn: isEN ? "Completed in" : "Completaste en",
    moves: isEN ? "moves and" : "movimientos y",
    tryAgain: isEN ? "Try again." : "Intenta de nuevo.",
    movesLabel: isEN ? "Moves:" : "Movimientos:",
    timeLabel: isEN ? "Time:" : "Tiempo:",
    btnReset: isEN ? "Reset Game" : "Reiniciar Juego",
    btnShowCode: isEN ? "View/Edit Code" : "Ver Código",
    btnBack: isEN ? "Change Range" : "Cambiar Rango",
    btnMute: isEN ? "Mute Music" : "Silenciar Música",
    btnUnmute: isEN ? "Unmute Music" : "Activar Música",
    modalTitle: isEN ? "Mnemonic Code" : "Código Nemotécnico",
    btnEdit: isEN ? "Edit" : "Editar",
    btnSave: isEN ? "Save" : "Guardar",
    btnCancel: isEN ? "Cancel" : "Cancelar",
    codeLabel: isEN ? "Code" : "Código",
    codeBtnLabel: isEN ? "Code (Letters)" : "Código (Letras)",
    wordsLabel: isEN ? "(Words)" : "(Palabras)",
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Audio setup
  useEffect(() => {
    bgMusicRef.current = new Audio();
    bgMusicRef.current.loop = true;
    flipSoundRef.current = new Audio(`${AUDIO_BASE_URL}/${AUDIO_ASSETS.effects.flip}`);

    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current.src = "";
      }
    };
  }, []);

  useEffect(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const playSound = (audio: HTMLAudioElement | null) => {
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const setRandomMusic = () => {
    if (!bgMusicRef.current) return;
    const track = pickRandomTrack(AUDIO_ASSETS.tracks);
    bgMusicRef.current.src = `${AUDIO_BASE_URL}/${AUDIO_ASSETS.musicPath}/${track}.mp3`;
    bgMusicRef.current.load();
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const startGame = (range: string) => {
    setCurrentRange(range);
    setMatchedPairs(new Set());
    setFlippedIds([]);
    setMoves(0);
    setElapsedTime(0);
    setTimerRunning(false);
    setMessage({ text: T.findPairs, type: "info" });
    
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
    }
    setMusicStarted(false);
    setRandomMusic();

    const dataSet = wordsData[range] || {};
    const newCards: CardData[] = [];
    Object.keys(dataSet).forEach((key) => {
      newCards.push({ id: key, text: key, uniqueId: `${key}-num` });
      newCards.push({ id: key, text: dataSet[key], uniqueId: `${key}-word` });
    });
    
    setCards(shuffle(newCards));
  };

  const resetBoard = () => {
    if (currentRange) startGame(currentRange);
  };

  const handleCardClick = (card: CardData) => {
    // Prevent clicking if board is locked (2 cards flipped) or card is already flipped/matched
    if (flippedIds.length === 2 || flippedIds.includes(card.uniqueId) || matchedPairs.has(card.id)) {
      return;
    }

    if (!timerRunning) setTimerRunning(true);
    if (!musicStarted && !isMuted) {
      playSound(bgMusicRef.current);
      setMusicStarted(true);
    }
    playSound(flipSoundRef.current);

    const newFlipped = [...flippedIds, card.uniqueId];
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      
      const card1 = cards.find((c) => c.uniqueId === newFlipped[0]);
      const card2 = cards.find((c) => c.uniqueId === newFlipped[1]);

      if (card1 && card2 && card1.id === card2.id) {
        // Match!
        const numberText = /^\d+$/.test(card1.text) || (currentRange === T.codeLabel && card1.text.length <= 2) ? card1.text : card2.text;
        const wordText = numberText === card1.text ? card2.text : card1.text;
        
        setMessage({ text: `${T.correct} ${numberText} = ${wordText}`, type: "success" });
        
        setMatchedPairs((prev) => {
          const newSet = new Set(prev).add(card1.id);
          if (newSet.size === cards.length / 2) {
            setTimerRunning(false);
            setTimeout(() => {
              setMessage({ text: `${T.congrats} ${T.completedIn} ${moves + 1} ${T.moves} ${formatTime(elapsedTime)}.`, type: "final" });
            }, 500);
          }
          return newSet;
        });

        setTimeout(() => setFlippedIds([]), 800);
      } else {
        // No match
        setMessage({ text: T.tryAgain, type: "error" });
        setTimeout(() => {
          setFlippedIds([]);
          setMessage({ text: T.findPairs, type: "info" });
        }, 1200);
      }
    }
  };

  const handleBack = () => {
    setTimerRunning(false);
    if (bgMusicRef.current) bgMusicRef.current.pause();
    setCurrentRange("");
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (isMuted && musicStarted && bgMusicRef.current?.paused) {
      playSound(bgMusicRef.current);
    }
  };

  const openModal = () => {
    setEditedWords(wordsData[currentRange] || {});
    setIsEditing(false);
    setShowModal(true);
  };

  const handleSaveModal = async () => {
    setIsSaving(true);
    try {
      await onSaveWords(currentRange, editedWords);
      setIsEditing(false);
      setTimeout(() => setShowModal(false), 600);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const ranges = Object.keys(wordsData).sort((a, b) => {
    if (a === T.codeLabel || a === "Code") return -1;
    if (b === T.codeLabel || b === "Code") return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 bg-slate-100 rounded-2xl shadow-xl font-sans" 
         style={{ backgroundImage: "url('https://www.stormstudios.com.mx/wp-content/themes/Apps%20video%20juegos/Fondo%20app%20memoria.png')", backgroundSize: "cover", backgroundPosition: "center" }}>
      
      {!currentRange ? (
        <div className="bg-white/95 p-8 rounded-xl shadow-lg text-center max-w-3xl mx-auto backdrop-blur-sm">
          <h2 className="mb-6 text-2xl font-bold text-gray-800">{T.selectionTitle}</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {ranges.map((range) => (
              <button
                key={range}
                onClick={() => startGame(range)}
                className="px-6 py-3 rounded-lg text-white font-semibold bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all shadow-md min-w-[160px]"
              >
                {range === T.codeLabel || range === "Code" ? T.codeBtnLabel : `${range} ${T.wordsLabel}`}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center bg-white/80 p-6 rounded-xl mt-4 backdrop-blur-sm">
          <h1 className="mb-6 text-center text-3xl font-bold text-gray-900">{T.gameTitle}</h1>
          
          <div className={`min-h-[3.5rem] w-full max-w-lg mb-4 p-3 rounded-lg shadow-sm text-center font-semibold transition-colors duration-300
            ${message.type === 'success' ? 'bg-green-100 text-green-800' : 
              message.type === 'error' ? 'bg-red-100 text-red-800' : 
              message.type === 'final' ? 'bg-yellow-100 text-yellow-800' : 
              'bg-sky-100 text-sky-900'}`}
          >
            {message.text}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full max-w-3xl mx-auto p-6 bg-white/90 rounded-xl shadow-md">
            {cards.map((card) => {
              const isFlipped = flippedIds.includes(card.uniqueId) || matchedPairs.has(card.id);
              return (
                <div
                  key={card.uniqueId}
                  onClick={() => handleCardClick(card)}
                  className="relative w-full aspect-[1/1.4] cursor-pointer"
                  style={{ perspective: "1000px" }}
                >
                  <div className={`absolute w-full h-full transition-transform duration-500 ease-in-out`} style={{ transformStyle: "preserve-3d", transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                    <div className="absolute w-full h-full bg-blue-500 text-white text-4xl flex items-center justify-center rounded-lg shadow-md font-bold" style={{ backfaceVisibility: "hidden" }}>
                      ?
                    </div>
                    <div className="absolute w-full h-full bg-slate-50 text-gray-800 flex items-center justify-center rounded-lg shadow-md font-bold p-2 text-center" 
                         style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", fontSize: card.text.length > 10 ? "0.85rem" : card.text.length > 6 ? "1rem" : "1.2rem" }}>
                      {card.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-around items-center w-full max-w-sm mt-6 p-3 bg-white/95 rounded-lg shadow-sm text-lg text-gray-700 font-medium">
            <div>{T.movesLabel} <span className="font-bold text-gray-900 ml-1">{moves}</span></div>
            <div>{T.timeLabel} <span className="font-bold text-gray-900 ml-1">{formatTime(elapsedTime)}</span></div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <button onClick={resetBoard} className="px-6 py-3 rounded-lg text-white font-semibold bg-emerald-500 hover:brightness-110 shadow-md transition-all">
              {T.btnReset}
            </button>
            <button onClick={openModal} className="px-6 py-3 rounded-lg text-white font-semibold bg-blue-500 hover:brightness-110 shadow-md transition-all">
              {T.btnShowCode}
            </button>
            <button onClick={handleBack} className="px-6 py-3 rounded-lg text-white font-semibold bg-gray-500 hover:brightness-110 shadow-md transition-all">
              {T.btnBack}
            </button>
            <button onClick={toggleMute} className={`px-6 py-3 rounded-lg text-white font-semibold shadow-md transition-all ${isMuted ? 'bg-red-500' : 'bg-orange-500'} hover:brightness-110`}>
              {isMuted ? T.btnUnmute : T.btnMute}
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 flex justify-center items-center z-50 animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 bg-gray-200 hover:bg-gray-300 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors">
              &times;
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{T.modalTitle} - {currentRange}</h2>
            
            <ul className="max-h-[60vh] overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
              {Object.keys(editedWords).sort((a,b) => parseInt(a)-parseInt(b) || a.localeCompare(b)).map((key) => (
                <li key={key} className="flex justify-between items-center p-3 border-b border-gray-100 last:border-0 text-gray-800">
                  <span className="font-bold mr-4">{key}</span>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={editedWords[key]} 
                      onChange={(e) => setEditedWords({...editedWords, [key]: e.target.value})}
                      className="text-right p-1.5 rounded bg-indigo-50 border-2 border-indigo-500 focus:outline-none focus:ring-0 min-w-[100px] w-full max-w-[200px]"
                    />
                  ) : (
                    <span className="text-right p-1.5 min-w-[100px]">{editedWords[key]}</span>
                  )}
                </li>
              ))}
            </ul>

            <div className="flex justify-end gap-3 mt-6">
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="px-5 py-2.5 rounded-lg text-white font-semibold bg-orange-500 hover:brightness-110 shadow-md">
                  {T.btnEdit}
                </button>
              ) : (
                <>
                  <button onClick={handleSaveModal} disabled={isSaving} className="px-5 py-2.5 rounded-lg text-white font-semibold bg-green-600 hover:brightness-110 shadow-md disabled:opacity-50">
                    {isSaving ? "..." : T.btnSave}
                  </button>
                  <button onClick={() => { setIsEditing(false); setEditedWords(wordsData[currentRange] || {}); }} className="px-5 py-2.5 rounded-lg text-white font-semibold bg-gray-500 hover:brightness-110 shadow-md">
                    {T.btnCancel}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
