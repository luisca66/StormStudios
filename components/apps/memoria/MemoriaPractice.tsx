"use client";

import React, { useState, useEffect, useRef } from "react";
import { AUDIO_ASSETS, AUDIO_BASE_URL, GameData, MnemonicSet } from "@/data/apps/memoria-data";

type MemoriaPracticeProps = {
  locale: string;
  practiceWords: GameData;
  onSaveWords: (range: string, newSet: MnemonicSet) => Promise<void>;
};

type Question = {
  type: "word-to-number" | "number-to-word";
  question: string;
  answer: string;
};

// Selección aleatoria a nivel de módulo: solo se llama desde event handlers y
// timeouts, así queda fuera del análisis de pureza del React Compiler.
function pickRandomPair(pool: { number: string; word: string }[]) {
  const pair = pool[Math.floor(Math.random() * pool.length)];
  const wordToNumber = Math.random() > 0.5;
  return { pair, wordToNumber };
}

export default function MemoriaPractice({ locale, practiceWords, onSaveWords }: MemoriaPracticeProps) {
  const isEN = locale === "en";

  const [selectedRanges, setSelectedRanges] = useState<string[]>([]);
  const [timeLimit, setTimeLimit] = useState<number>(0);
  
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState({ text: isEN ? 'Set up your practice and press "Start" to begin.' : 'Configura tu práctica y presiona "Comenzar" para empezar.', type: "info" });
  
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [streak, setStreak] = useState(0);
  
  const [practiceInProgress, setPracticeInProgress] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [musicStarted, setMusicStarted] = useState(false);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editRange, setEditRange] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedWords, setEditedWords] = useState<MnemonicSet>({});
  const [isSaving, setIsSaving] = useState(false);

  // Audio refs
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const errorSoundRef = useRef<HTMLAudioElement | null>(null);
  const nextSoundRef = useRef<HTMLAudioElement | null>(null);
  const answerInputRef = useRef<HTMLInputElement | null>(null);
  const handleTimeoutRef = useRef<(() => void) | null>(null);

  const T = {
    title: isEN ? "Practice Mode" : "Modo de Práctica",
    correct: isEN ? "Correct" : "Correctas",
    streak: isEN ? "Streak" : "Racha",
    timeLabel: isEN ? "1. Select response time:" : "1. Selecciona el tiempo para responder:",
    rangeLabel: isEN ? "2. Select ranges to practice:" : "2. Selecciona los rangos que quieres practicar:",
    btnSelectAll: isEN ? "Select All" : "Seleccionar Todo",
    btnDeselectAll: isEN ? "Deselect All" : "Deseleccionar Todo",
    btnEditWords: isEN ? "Edit Words" : "Editar Palabras",
    questionPlaceholder: isEN ? "Question" : "Pregunta",
    wordToNum: isEN ? "What number is this word?" : "¿Qué número es esta palabra?",
    numToWord: isEN ? "What word is this number?" : "¿Qué palabra es este número?",
    inputPlaceholder: isEN ? "Type your answer here" : "Escribe tu respuesta aquí",
    btnCheck: isEN ? "Check" : "Verificar",
    btnStart: isEN ? "Start" : "Comenzar",
    btnMute: isEN ? "Mute Music" : "Silenciar Música",
    btnUnmute: isEN ? "Unmute Music" : "Activar Música",
    btnReset: isEN ? "Reset" : "Reset",
    errNoRange: isEN ? "Please select at least one range." : "Por favor, selecciona al menos un rango.",
    msgCorrect: isEN ? "Correct!" : "¡Correcto!",
    msgIncorrect: isEN ? "Incorrect. The answer for" : "Incorrecto. La respuesta para",
    msgIs: isEN ? "is" : "es",
    msgTimeout: isEN ? "Time's up! The answer for" : "¡Se acabó el tiempo! La respuesta para",
    msgWas: isEN ? "was" : "era",
    modalTitle: isEN ? "Edit Words for Range:" : "Editar Palabras del Rango:",
    btnEdit: isEN ? "Edit" : "Editar",
    btnSave: isEN ? "Save" : "Guardar",
    btnCancel: isEN ? "Cancel" : "Cancelar",
    msgUpdated: isEN ? "Words updated!" : "¡Palabras actualizadas!",
    errSelectOne: isEN ? "Select only ONE range to edit." : "Selecciona solo UN rango a la vez para editar.",
    errSelectFirst: isEN ? "Select a range to edit it." : "Selecciona un rango para poder editarlo.",
    typeMsg: isEN ? "Type your answer and press 'Enter'." : "Escribe tu respuesta y presiona 'Enter'.",
    noLimit: isEN ? "No Limit" : "Sin Límite",
    seconds: isEN ? "Seconds" : "Segundos"
  };

  const ranges = Object.keys(practiceWords).sort((a,b) => parseInt(a)-parseInt(b) || a.localeCompare(b));

  useEffect(() => {
    bgMusicRef.current = new Audio();
    bgMusicRef.current.loop = true;
    
    // Set random music on mount
    const tracks = AUDIO_ASSETS.tracks;
    const track = tracks[Math.floor(Math.random() * tracks.length)];
    bgMusicRef.current.src = `${AUDIO_BASE_URL}/${AUDIO_ASSETS.musicPath}/${track}.mp3`;
    bgMusicRef.current.load();

    correctSoundRef.current = new Audio(`${AUDIO_BASE_URL}/${AUDIO_ASSETS.effects.correct}`);
    errorSoundRef.current = new Audio(`${AUDIO_BASE_URL}/${AUDIO_ASSETS.effects.error}`);
    nextSoundRef.current = new Audio(`${AUDIO_BASE_URL}/${AUDIO_ASSETS.effects.next}`);

    return () => {
      bgMusicRef.current?.pause();
      bgMusicRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (bgMusicRef.current) bgMusicRef.current.muted = isMuted;
  }, [isMuted]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0.1) {
            handleTimeoutRef.current?.();
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  const playSound = (audio: HTMLAudioElement | null) => {
    if (!audio) return;
    if (audio === bgMusicRef.current && isMuted) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const setRandomMusic = () => {
    if (!bgMusicRef.current) return;
    const tracks = AUDIO_ASSETS.tracks;
    const track = tracks[Math.floor(Math.random() * tracks.length)];
    bgMusicRef.current.src = `${AUDIO_BASE_URL}/${AUDIO_ASSETS.musicPath}/${track}.mp3`;
    bgMusicRef.current.load();
  };

  const resetPractice = () => {
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
      setRandomMusic();
    }
    setMusicStarted(false);
    setTimerRunning(false);
    setPracticeInProgress(false);
    setCorrectAnswers(0);
    setTotalQuestions(0);
    setStreak(0);
    setCurrentQuestion(null);
    setUserAnswer("");
    setIsChecking(false);
    setFeedback({ text: isEN ? 'Set up your practice and press "Start" to begin.' : 'Configura tu práctica y presiona "Comenzar" para empezar.', type: "info" });
  };

  const generateQuestion = (isInitial = false) => {
    if (isInitial) {
      playSound(nextSoundRef.current);
      setPracticeInProgress(true);
    }
    
    if (!musicStarted && !isMuted) {
      playSound(bgMusicRef.current);
      setMusicStarted(true);
    }

    if (selectedRanges.length === 0) {
      setFeedback({ text: T.errNoRange, type: "info" });
      resetPractice();
      return;
    }

    const pool = selectedRanges.flatMap(range => 
      Object.entries(practiceWords[range] || {}).map(([number, word]) => ({ number, word }))
    );

    if (pool.length === 0) return;

    const { pair, wordToNumber: isWordToNum } = pickRandomPair(pool);
    
    setCurrentQuestion({
      type: isWordToNum ? "word-to-number" : "number-to-word",
      question: isWordToNum ? pair.word : pair.number,
      answer: isWordToNum ? pair.number : pair.word
    });

    setUserAnswer("");
    setIsChecking(false);
    setFeedback({ text: T.typeMsg, type: "info" });

    if (timeLimit > 0) {
      setTimeLeft(timeLimit);
      setTimerRunning(true);
    } else {
      setTimerRunning(false);
      setTimeLeft(0);
    }

    setTimeout(() => answerInputRef.current?.focus(), 50);
  };

  const handleTimeout = () => {
    if (!practiceInProgress || !currentQuestion) return;
    setTimerRunning(false);
    setTotalQuestions(t => t + 1);
    setStreak(0);
    setFeedback({ text: `${T.msgTimeout} "${currentQuestion.question}" ${T.msgWas} "${currentQuestion.answer}".`, type: "incorrect" });
    playSound(errorSoundRef.current);
    
    setTimeout(() => generateQuestion(), 1500);
  };

  // Mantiene el ref apuntando al handler más reciente (declarado justo arriba).
  useEffect(() => {
    handleTimeoutRef.current = handleTimeout;
  });

  const checkAnswer = () => {
    if (!currentQuestion || !practiceInProgress || isChecking) return;
    setTimerRunning(false);
    setIsChecking(true);
    setTotalQuestions(t => t + 1);

    const isCorrect = userAnswer.trim().toLowerCase() === currentQuestion.answer.toLowerCase();

    if (isCorrect) {
      setCorrectAnswers(c => c + 1);
      setStreak(s => s + 1);
      setFeedback({ text: T.msgCorrect, type: "correct" });
      playSound(correctSoundRef.current);
    } else {
      setStreak(0);
      setFeedback({ text: `${T.msgIncorrect} "${currentQuestion.question}" ${T.msgIs} "${currentQuestion.answer}".`, type: "incorrect" });
      playSound(errorSoundRef.current);
    }

    setTimeout(() => generateQuestion(), 1500);
  };

  const handleToggleRange = (range: string) => {
    setSelectedRanges(prev => 
      prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]
    );
  };

  const handleEditWords = () => {
    if (selectedRanges.length === 0) {
      setFeedback({ text: T.errSelectFirst, type: "incorrect" });
      return;
    }
    if (selectedRanges.length > 1) {
      setFeedback({ text: T.errSelectOne, type: "incorrect" });
      return;
    }
    setEditRange(selectedRanges[0]);
    setEditedWords(practiceWords[selectedRanges[0]] || {});
    setIsEditing(false);
    setShowModal(true);
  };

  const handleSaveModal = async () => {
    setIsSaving(true);
    try {
      await onSaveWords(editRange, editedWords);
      setFeedback({ text: T.msgUpdated, type: "correct" });
      setIsEditing(false);
      setTimeout(() => setShowModal(false), 800);
    } catch (error) {
      console.error(error);
      setFeedback({ text: "Error saving.", type: "incorrect" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-8 bg-[#121212] rounded-2xl shadow-xl font-sans"
         style={{ backgroundImage: "url('https://www.stormstudios.com.mx/wp-content/themes/Apps%20video%20juegos/Fondo%20app%20memoria.png')", backgroundSize: "cover", backgroundPosition: "center" }}>
      
      <h2 className="text-center text-gray-800 text-3xl font-bold mt-0 mb-6 bg-white/95 py-4 rounded-xl shadow-md">{T.title}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Score */}
        <div className="flex justify-around items-center bg-white/95 p-4 rounded-xl shadow-md text-center">
          <div>
            <div className="text-gray-500 text-sm font-bold uppercase">{T.correct}</div>
            <div className="text-gray-900 text-2xl font-black">{correctAnswers} / {totalQuestions}</div>
          </div>
          <div>
            <div className="text-gray-500 text-sm font-bold uppercase">{T.streak}</div>
            <div className="text-gray-900 text-2xl font-black">{streak}</div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white/95 p-4 rounded-xl shadow-md flex flex-col justify-center">
          <label className="text-sm font-bold text-gray-800 mb-2">{T.timeLabel}</label>
          <select 
            value={timeLimit} 
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            className="w-full p-2.5 rounded-lg bg-gray-100 border border-gray-300 text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="0">{T.noLimit}</option>
            {[5,6,7,8,9,10,11,12,13,14,15].map(v => <option key={v} value={v}>{v} {T.seconds}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white/95 p-6 rounded-xl shadow-md mb-6">
        <p className="text-sm font-bold text-gray-800 mb-4">{T.rangeLabel}</p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setSelectedRanges(ranges)} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-sm transition-colors">{T.btnSelectAll}</button>
          <button onClick={() => setSelectedRanges([])} className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-semibold text-sm transition-colors">{T.btnDeselectAll}</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
          {ranges.map((range) => (
            <label key={range} className="flex items-center p-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors border border-gray-200">
              <input 
                type="checkbox" 
                value={range} 
                checked={selectedRanges.includes(range)}
                onChange={() => handleToggleRange(range)}
                className="w-4 h-4 mr-2 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-gray-800 font-medium text-sm">{range}</span>
            </label>
          ))}
        </div>

        <button onClick={handleEditWords} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm">{T.btnEditWords}</button>
      </div>

      <div className="text-center">
        <div className="bg-indigo-600 text-white p-8 rounded-xl mb-4 shadow-lg shadow-indigo-600/30 relative overflow-hidden">
          <div className="text-indigo-200 font-bold uppercase tracking-wider mb-2 text-sm">
            {currentQuestion ? (currentQuestion.type === "word-to-number" ? T.wordToNum : T.numToWord) : T.questionPlaceholder}
          </div>
          <div className="text-5xl font-black">{currentQuestion ? currentQuestion.question : "..."}</div>
          
          {/* Timer Bar */}
          {timeLimit > 0 && currentQuestion && (
            <div className="w-full bg-white/20 rounded-full h-2 mt-6 overflow-hidden">
              <div className="bg-emerald-400 h-full transition-all ease-linear" style={{ width: `${(timeLeft / timeLimit) * 100}%` }}></div>
            </div>
          )}
        </div>

        <input 
          ref={answerInputRef}
          type="text" 
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && checkAnswer()}
          disabled={!currentQuestion || isChecking}
          placeholder={T.inputPlaceholder}
          className="w-full p-4 text-center text-xl bg-white border-2 border-gray-300 rounded-xl mb-6 text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all shadow-inner disabled:bg-gray-100 disabled:text-gray-500"
        />

        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <button onClick={checkAnswer} disabled={!currentQuestion || isChecking || !userAnswer.trim()} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]">{T.btnCheck}</button>
          <button onClick={() => generateQuestion(true)} disabled={practiceInProgress} className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]">{T.btnStart}</button>
          <button onClick={() => setIsMuted(!isMuted)} className={`px-6 py-3 text-white rounded-lg font-bold shadow-md transition-all min-w-[120px] ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}>{isMuted ? T.btnUnmute : T.btnMute}</button>
          <button onClick={resetPractice} className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-bold shadow-md transition-all min-w-[120px]">{T.btnReset}</button>
        </div>

        <div className={`p-4 rounded-xl font-bold flex items-center justify-center min-h-[4rem] transition-colors shadow-sm
          ${feedback.type === 'correct' ? 'bg-green-100 text-green-800 border border-green-200' : 
            feedback.type === 'incorrect' ? 'bg-red-100 text-red-800 border border-red-200' : 
            'bg-sky-100 text-sky-900 border border-sky-200'}`}
        >
          {feedback.text}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 flex justify-center items-center z-50 animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 bg-gray-200 hover:bg-gray-300 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors">
              &times;
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-4">{T.modalTitle} {editRange}</h3>
            
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
                  <button onClick={() => { setIsEditing(false); setEditedWords(practiceWords[editRange] || {}); }} className="px-5 py-2.5 rounded-lg text-white font-semibold bg-gray-500 hover:brightness-110 shadow-md">
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
