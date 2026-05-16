'use client';

import { useEffect, useRef, useState } from 'react';
import type { PatronRitmico, Duracion } from '../_lib/generador/tipos';

const CANVAS_HEIGHT = 140;
const STAVE_Y = 10;
const MIN_STAVE_WIDTH = 200;
const NOTE_COLOR = '#000000';

/**
 * Convierte una Duracion al duration string de VexFlow y número de puntos.
 * Las notas con punto tienen 'd' antes del posible 'r':
 *   'hd'  → { duration: 'h',  dots: 1 }
 *   'hdr' → { duration: 'hr', dots: 1 }
 *   'q'   → { duration: 'q',  dots: 0 }
 */
function durToVF(dur: Duracion): { duration: string; dots: number } {
  if (dur.includes('d')) {
    // Quitar la 'd' para obtener la duración base VexFlow
    return { duration: dur.replace('d', ''), dots: 1 };
  }
  return { duration: dur, dots: 0 };
}

interface Props {
  patron: PatronRitmico;
  locale?: 'es' | 'en';
  /** Posición del cursor en beats (0-based) — lo usa el Hito 5. */
  cursorBeat?: number;
}

export function NotacionRitmica({ locale = 'es', patron }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.innerHTML = '';
    setError(null);

    let cancelled = false;

    import('vexflow')
      .then((vf) => {
        if (cancelled || !el) return;

        // VexFlow 4: acceso vía Vex.Flow o named exports según build
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const VF = (vf as any).default?.Flow ?? (vf as any).Flow ?? vf;
        const { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Dot } = VF;

        const [numBeats, beatValue] = patron.compas.split('/').map(Number);

        // Empieza pequeño y hace resize al final (patrón secuenciador.html)
        const renderer = new Renderer(el, Renderer.Backends.SVG);
        renderer.resize(100, CANVAS_HEIGHT);
        const context = renderer.getContext();

        let currentX = 0;

        patron.compases.forEach((notas: Duracion[], m: number) => {
          const isFirst = m === 0;
          const isLast = m === patron.compases.length - 1;

          // 1. Crear notas con estilo explícito (patrón secuenciador.html)
          const vfNotes = notas.map((dur: Duracion) => {
            const { duration: vfDur, dots } = durToVF(dur);
            const note = new StaveNote({
              keys: ['b/4'],
              duration: vfDur,
              stem_direction: 1,
              ...(dots > 0 ? { dots } : {}),
            });
            note.setStyle({ fillStyle: NOTE_COLOR, strokeStyle: NOTE_COLOR });
            return note;
          });

          // Adjuntar puntillos a las notas que los llevan (API VexFlow 4)
          const notasConPunto = vfNotes.filter((_n: unknown, i: number) => durToVF(notas[i]).dots > 0);
          if (notasConPunto.length > 0) {
            Dot.buildAndAttach(notasConPunto, { all_voices: false });
          }

          // 2. Voice
          const voice = new Voice({ num_beats: numBeats, beat_value: beatValue });
          voice.setStrict(false).addTickables(vfNotes);

          // 3. Beams (generateBeams ignora automáticamente notas no beameables)
          const beams = Beam.generateBeams(vfNotes);

          // 4. Calcular ancho dinámico con preCalculateMinTotalWidth
          const formatter = new Formatter().joinVoices([voice]);
          const minWidth: number = formatter.preCalculateMinTotalWidth([voice]);
          const headerPad = isFirst ? 120 : 30;
          const staveWidth = Math.max(MIN_STAVE_WIDTH, minWidth + headerPad + 80);

          // 5. Crear y dibujar el stave
          const stave = new Stave(currentX, STAVE_Y, staveWidth);
          if (isFirst) {
            stave.addClef('percussion').addTimeSignature(patron.compas);
          }
          if (isLast) {
            stave.setEndBarType(3); // Barline.type.END
          }
          stave.setContext(context).draw();

          // 6. Formatear con el ancho real disponible (descontando cabecera)
          const noteStartOffset = stave.getNoteStartX() - stave.getX();
          const availWidth = staveWidth - noteStartOffset - 20;
          formatter.format([voice], availWidth);

          // 7. Dibujar voz y beams
          voice.draw(context, stave);
          beams.forEach((b: { setContext: (c: unknown) => { draw: () => void } }) =>
            b.setContext(context).draw()
          );

          currentX += staveWidth;
        });

        // 8. Resize final al ancho real del contenido
        renderer.resize(currentX + 20, CANVAS_HEIGHT);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[NotacionRitmica] Error VexFlow:', err);
          setError(locale === 'en' ? 'The notation could not be rendered.' : 'Error al renderizar la notación.');
        }
      });

    return () => {
      cancelled = true;
      if (el) el.innerHTML = '';
    };
  }, [locale, patron]);

  if (error) {
    return (
      <div
        className="ss-glass rounded-xl p-4 ss-mono text-sm text-center"
        style={{ color: 'rgba(239,68,68,0.8)', minHeight: CANVAS_HEIGHT }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="overflow-x-auto rounded-xl"
      style={{
        minHeight: CANVAS_HEIGHT,
        background: '#ffffff',
        padding: '4px',
      }}
    />
  );
}
