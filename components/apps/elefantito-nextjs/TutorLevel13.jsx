"use client";
import { useGame } from "./GameContext";
import { useLanguage } from "./LanguageContext";

export default function TutorLevel13({ onComplete }) {
  const { completeLesson } = useGame();
  const { t, lang } = useLanguage();

  const handleFinish = () => {
    completeLesson(13);
    onComplete();
  };

  return (
    <div className="bg-[#0c0e1a] border-2 border-[#14161e] p-4 flex flex-col h-[80vh] relative overflow-hidden">
      <div className="flex-1 overflow-y-auto pr-3 font-[Georgia,serif] text-[0.95rem] leading-[1.6] text-[#b0b3b8]">
        {lang === "en" ? (
          <>
            <h2 className="font-[family-name:var(--font-press-start-2p)] text-[0.9rem] text-[#00eeff] mb-4 leading-[1.4] text-shadow-[0_0_10px_rgba(0,238,255,0.25)]">
              Level 13 — The 11 and 12 Tables
            </h2>
            <p className="mb-4">
              This level trains the 11 and 12 multiplication tables. They are small tables, but they open the door to a much larger technique: factoring.
            </p>
            <p className="mb-4">
              Take 46 x 42. Instead of treating it as a direct 2x2 multiplication, you notice that 42 = 7 x 6. That changes the whole problem:
            </p>
            <p className="mb-4 text-[#ffe600] font-[family-name:var(--font-press-start-2p)] text-[0.58rem] leading-[2]">
              46 x 42 = 46 x (7 x 6)<br />
              = (46 x 7) x 6<br />
              = 322 x 6<br />
              = 1932
            </p>
            <p className="mb-4">
              A difficult multiplication becomes two chained 2x1 multiplications, which you already know how to do.
            </p>
            <h3 className="font-[family-name:var(--font-press-start-2p)] text-[0.6rem] text-[#39ff14] mt-6 mb-3 drop-shadow-[0_0_8px_rgba(57,255,20,0.2)]">
              Seeing the factors
            </h3>
            <p className="mb-4">
              This only works if you recognize factors instantly. You see 42 and hear 7 x 6. You see 56 and hear 8 x 7. You see 63 and hear 9 x 7.
            </p>
            <p className="mb-4">
              That is the same mental motion as division in the multiplication tables: running the table backward. The product appears first, and your brain finds the two numbers that created it.
            </p>
            <h3 className="font-[family-name:var(--font-press-start-2p)] text-[0.6rem] text-[#39ff14] mt-6 mb-3 drop-shadow-[0_0_8px_rgba(57,255,20,0.2)]">
              Why 11 and 12 matter
            </h3>
            <p className="mb-4">
              Tables up to 12x12 matter not only because you multiply by 11 or 12, but because they reveal factor opportunities: 44, 55, 66, 77, 88, and 99 all contain 11. If you see that structure quickly, a harder problem can turn into a clean chain.
            </p>
            <p className="mb-4">
              For example: 53 x 66 becomes 53 x (11 x 6), then 583 x 6, and finally 3498. Without the 11 table living in your ear, that shortcut stays hidden.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-[family-name:var(--font-press-start-2p)] text-[0.9rem] text-[#00eeff] mb-4 leading-[1.4] text-shadow-[0_0_10px_rgba(0,238,255,0.25)]">
              Nivel 13 — Las tablas del 11 y el 12
            </h2>
            <p className="mb-4">
              Este nivel entrena las tablas del 11 y el 12. Son tablas pequeñas, pero abren la puerta a una técnica mucho más grande: el factoring method.
            </p>
            <p className="mb-4">
              Toma 46 x 42. En vez de hacerlo como una multiplicación 2x2 directa, observas que 42 = 7 x 6. Eso cambia todo el problema:
            </p>
            <p className="mb-4 text-[#ffe600] font-[family-name:var(--font-press-start-2p)] text-[0.58rem] leading-[2]">
              46 x 42 = 46 x (7 x 6)<br />
              = (46 x 7) x 6<br />
              = 322 x 6<br />
              = 1932
            </p>
            <p className="mb-4">
              Así, una multiplicación difícil se convierte en dos multiplicaciones 2x1 encadenadas, que ya sabes hacer.
            </p>
            <h3 className="font-[family-name:var(--font-press-start-2p)] text-[0.6rem] text-[#39ff14] mt-6 mb-3 drop-shadow-[0_0_8px_rgba(57,255,20,0.2)]">
              Ver los factores
            </h3>
            <p className="mb-4">
              Para que esto funcione necesitas reconocer factores casi al instante. Ves 42 y escuchas 7 x 6. Ves 56 y escuchas 8 x 7. Ves 63 y escuchas 9 x 7.
            </p>
            <p className="mb-4">
              Es el mismo movimiento mental que haces cuando recorres las tablas al revés: aparece el resultado, y tu cerebro encuentra los dos números que lo producen.
            </p>
            <h3 className="font-[family-name:var(--font-press-start-2p)] text-[0.6rem] text-[#39ff14] mt-6 mb-3 drop-shadow-[0_0_8px_rgba(57,255,20,0.2)]">
              Por qué importan el 11 y el 12
            </h3>
            <p className="mb-4">
              Las tablas hasta 12x12 importan no solo para multiplicar por 11 o por 12, sino porque revelan oportunidades de factorización: 44, 55, 66, 77, 88 y 99 tienen un 11 escondido. Si ves esa estructura rápido, un problema más grande se vuelve una cadena limpia.
            </p>
            <p className="mb-4">
              Por ejemplo: 53 x 66 se vuelve 53 x (11 x 6), luego 583 x 6, y finalmente 3498. Si la tabla del 11 no vive en tu oído, esa oportunidad no aparece.
            </p>
          </>
        )}
      </div>

      <div className="mt-4 pt-3 border-t-2 border-[#14161e] flex justify-end shrink-0">
        <button
          onClick={handleFinish}
          className="font-[family-name:var(--font-press-start-2p)] text-[0.65rem] bg-[#39ff14] text-black border-2 border-[#39ff14] px-5 py-3 cursor-pointer shadow-[0_0_0_2px_#000,0_0_12px_rgba(57,255,20,0.35)] transition-transform active:scale-95"
        >
          {t("understood_ready")}
        </button>
      </div>
    </div>
  );
}
