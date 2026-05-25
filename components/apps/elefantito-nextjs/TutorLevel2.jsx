"use client";
import { useState, useRef, useEffect } from "react";
import { useGame } from "./GameContext";
import { useLanguage } from "./LanguageContext";

export default function TutorLevel2({ onComplete }) {
  const { completeLesson } = useGame();
  const { t, lang } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateDuration);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateDuration);
    };
  }, []);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => {
        console.error("Error al reproducir audio:", e);
        alert("No se pudo cargar el audio. Verifica que el archivo en Cloudflare sea un MP3 válido.");
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const handleFinish = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    completeLesson(2);
    onComplete();
  };

  const audioSource = lang === 'en' 
    ? "https://pub-2de970e8bf224791a9ab6d06fa62ce19.r2.dev/voices/02%20Little%20Elephant%20level%202.mp3"
    : "https://pub-2de970e8bf224791a9ab6d06fa62ce19.r2.dev/voices/02%20Elefantito%20nivel%202.mp3";

  return (
    <div className="bg-[#0c0e1a] border-2 border-[#14161e] p-4 flex flex-col h-[80vh] relative overflow-hidden">
      
      {/* Etiqueta de audio oculta */}
      <audio 
        ref={audioRef} 
        src={audioSource} 
        onEnded={() => setIsPlaying(false)}
        preload="auto"
      />

      <div className="bg-[#0a0b14] border-2 border-[#14161e] p-3 mb-4 flex items-center gap-3 shrink-0">
        <button 
          onClick={toggleAudio}
          className={`font-[family-name:var(--font-press-start-2p)] text-[0.44rem] px-3 py-2 shrink-0 transition-all cursor-pointer ${
            isPlaying 
              ? "bg-[#39ff14] text-black border-2 border-[#39ff14] shadow-[0_0_0_2px_#000,0_0_10px_rgba(57,255,20,0.35)]" 
              : "bg-transparent text-[#39ff14] border-2 border-[#39ff14]"
          }`}
        >
          {isPlaying ? t('pause_audio') : t('play_audio')}
        </button>

        <div className="flex-1 flex items-center gap-2">
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            value={progress}
            onChange={(e) => {
              if (audioRef.current) {
                audioRef.current.currentTime = Number(e.target.value);
                setProgress(Number(e.target.value));
              }
            }}
            className="flex-1"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-3 font-[Georgia,serif] text-[0.95rem] leading-[1.6] text-[#b0b3b8]">
        {lang === 'en' ? (
          <>
            <h2 className="font-[family-name:var(--font-press-start-2p)] text-[0.9rem] text-[#00eeff] mb-4 leading-[1.4] text-shadow-[0_0_10px_rgba(0,238,255,0.25)]">Level 2 — Numbers grow, and something new arrives</h2>
            <p className="mb-4">Your engine is running. In this level, three things happen at once.</p>

            <h3 className="font-[family-name:var(--font-press-start-2p)] text-[0.6rem] text-[#39ff14] mt-6 mb-3 drop-shadow-[0_0_8px_rgba(57,255,20,0.2)]">The numbers get bigger</h3>
            <p className="mb-4">Addition and subtraction now involve a two-digit number. But the principle is the same one you already practiced: trust your brain, let it build the result step by step. If you have 43 and you add 7, don't treat it like a problem — just hear it: <i>"forty-three... plus seven... fifty."</i> Left to right, big to small.</p>

            <h3 className="font-[family-name:var(--font-press-start-2p)] text-[0.6rem] text-[#39ff14] mt-6 mb-3 drop-shadow-[0_0_8px_rgba(57,255,20,0.2)]">Subtraction gets real</h3>
            <p className="mb-4">You've already subtracted small numbers. Now the number you're subtracting from has two digits. The logic is the same, but your brain has to hold a little more information while it works. That's exactly the training: every time you do it, your working memory stretches a little further — like a muscle.</p>

            <h3 className="font-[family-name:var(--font-press-start-2p)] text-[0.6rem] text-[#39ff14] mt-6 mb-3 drop-shadow-[0_0_8px_rgba(57,255,20,0.2)]">And division shows up</h3>
            <p className="mb-4">Here's the interesting twist. You already know your multiplication tables. Division is exactly the same thing, but in reverse: instead of asking "what is 7 times 8?", you ask "what number multiplied by 7 gives 56?" It's not a new operation — it's the same table seen from the other side.</p>
            <p className="mb-4">That's a very valuable mental habit: learning to travel a path in both directions. In music you do it all the time — reading a melody on the page is not the same as recognizing it by ear, but both skills feed each other. Numbers work the same way.</p>
            <p className="mb-4">When this level starts to feel natural, you'll have made the first big leap of the program.</p>
          </>
        ) : (
          <>
            <h2 className="font-[family-name:var(--font-press-start-2p)] text-[0.9rem] text-[#00eeff] mb-4 leading-[1.4] text-shadow-[0_0_10px_rgba(0,238,255,0.25)]">Nivel 2 — Los números crecen, y aparece algo nuevo</h2>
            <p className="mb-4">Ya tienes el motor encendido. En este nivel pasan tres cosas a la vez.</p>

            <h3 className="font-[family-name:var(--font-press-start-2p)] text-[0.6rem] text-[#39ff14] mt-6 mb-3 drop-shadow-[0_0_8px_rgba(57,255,20,0.2)]">Los números se hacen más grandes</h3>
            <p className="mb-4">Las sumas y restas ahora tienen un número de dos dígitos. Pero el principio sigue siendo el mismo que ya practicaste: confía en tu cerebro, deja que construya el resultado paso a paso. Si tienes 43 y le sumas 7, no lo pienses como un problema — escúchalo: <i>"cuarenta y tres... más siete... cincuenta."</i> De izquierda a derecha, de lo grande a lo pequeño.</p>

            <h3 className="font-[family-name:var(--font-press-start-2p)] text-[0.6rem] text-[#39ff14] mt-6 mb-3 drop-shadow-[0_0_8px_rgba(57,255,20,0.2)]">La resta llega en serio</h3>
            <p className="mb-4">Ya restaste números pequeños. Ahora el número del que restas tiene dos dígitos. La lógica es la misma, pero tu cabeza tiene que sostener un poco más de información mientras trabaja. Eso es exactamente el entrenamiento: cada vez que lo haces, la memoria de trabajo se estira un poco más — como un músculo.</p>

            <h3 className="font-[family-name:var(--font-press-start-2p)] text-[0.6rem] text-[#39ff14] mt-6 mb-3 drop-shadow-[0_0_8px_rgba(57,255,20,0.2)]">Y aparece la división</h3>
            <p className="mb-4">Aquí viene el giro interesante. Ya conoces las tablas de multiplicar. La división es exactamente lo mismo, pero al revés: en lugar de preguntar "¿cuánto es 7 por 8?", pregunta "¿qué número multiplicado por 7 da 56?" No es una operación nueva — es la misma tabla vista desde el otro lado.</p>
            <p className="mb-4">Eso es un hábito mental muy valioso: aprender a recorrer un camino en ambas direcciones. En música lo haces todo el tiempo — leer una melodía hacia adelante no es lo mismo que reconocerla de oído, pero ambas habilidades se nutren mutuamente. Con los números pasa igual.</p>
            <p className="mb-4">Cuando este nivel empiece a sentirse natural, habrás dado el primer gran salto del programa.</p>
          </>
        )}
      </div>

      <div className="mt-4 pt-3 border-t-2 border-[#14161e] flex justify-end shrink-0">
        <button 
          onClick={handleFinish}
          className="font-[family-name:var(--font-press-start-2p)] text-[0.65rem] bg-[#39ff14] text-black border-2 border-[#39ff14] px-5 py-3 cursor-pointer shadow-[0_0_0_2px_#000,0_0_12px_rgba(57,255,20,0.35)] transition-transform active:scale-95"
        >
          {t('understood_ready')}
        </button>
      </div>
    </div>
  );
}
