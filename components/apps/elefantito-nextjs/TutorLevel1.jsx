"use client";
import { useState, useRef, useEffect } from "react";
import { useGame } from "./GameContext";
import { useLanguage } from "./LanguageContext";

export default function TutorLevel1({ onComplete }) {
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
        alert(t("audio_error"));
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const handleFinish = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    completeLesson(1);
    onComplete();
  };

  const audioSource = lang === 'en' 
    ? "https://pub-2de970e8bf224791a9ab6d06fa62ce19.r2.dev/voices/01%20Little%20Elephant.mp3"
    : "https://pub-2de970e8bf224791a9ab6d06fa62ce19.r2.dev/voices/01%20Elefantito.mp3?v=2";

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
          className={`font-[family-name:var(--font-press-start-2p)] text-[0.6rem] px-3 py-2 shrink-0 transition-all cursor-pointer ${
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
        <h2 className="font-[family-name:var(--font-press-start-2p)] text-[0.9rem] text-[#00eeff] mb-4 leading-[1.4] text-shadow-[0_0_10px_rgba(0,238,255,0.25)]">{t('tutor_title')}</h2>
        <p className="mb-4">{t('tutor_p1')}</p>

        <h3 className="font-[family-name:var(--font-press-start-2p)] text-[0.6rem] text-[#39ff14] mt-6 mb-3 drop-shadow-[0_0_8px_rgba(57,255,20,0.2)]">{t('tutor_h1')}</h3>
        <p className="mb-4">{t('tutor_p2')}</p>
        <p className="mb-4">{t('tutor_p3')}</p>

        <h3 className="font-[family-name:var(--font-press-start-2p)] text-[0.6rem] text-[#39ff14] mt-6 mb-3 drop-shadow-[0_0_8px_rgba(57,255,20,0.2)]">{t('tutor_h2')}</h3>
        <p className="mb-4">{t('tutor_p4')}</p>
        <p className="mb-4">{t('tutor_p5')}</p>
        <p className="mb-4">{t('tutor_p6')}</p>

        <h3 className="font-[family-name:var(--font-press-start-2p)] text-[0.6rem] text-[#39ff14] mt-6 mb-3 drop-shadow-[0_0_8px_rgba(57,255,20,0.2)]">{t('tutor_h3')}</h3>
        <p className="mb-4">{t('tutor_p7')}</p>
        <p className="mb-4">{t('tutor_p8')}</p>
        <p className="mb-4">{t('tutor_p9')}</p>

        <h3 className="font-[family-name:var(--font-press-start-2p)] text-[0.6rem] text-[#39ff14] mt-6 mb-3 drop-shadow-[0_0_8px_rgba(57,255,20,0.2)]">{t('tutor_h4')}</h3>
        <p className="mb-4">{t('tutor_p10')}</p>
        <p className="mb-4">{t('tutor_p11')}</p>

        <h3 className="font-[family-name:var(--font-press-start-2p)] text-[0.6rem] text-[#39ff14] mt-6 mb-3 drop-shadow-[0_0_8px_rgba(57,255,20,0.2)]">{t('tutor_h5')}</h3>
        <p className="mb-4">{t('tutor_p12')}</p>
        <p className="mb-4">{t('tutor_p13')}</p>
        <p className="mb-4">{t('tutor_p14')}</p>
        <p className="mb-4">{t('tutor_p15')}</p>
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
