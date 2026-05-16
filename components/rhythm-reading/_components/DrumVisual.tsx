'use client';

/**
 * DrumVisual.tsx — Ilustración SVG del instrumento seleccionado.
 *
 * Portado directamente de storm-bateria-v9.5.html.
 * Cada tipo de instrumento tiene su propia función de renderizado SVG.
 *
 * Animación de golpe:
 *   En lugar de CSS @keyframes (que no reinicia sin remount),
 *   manipulamos directamente el filter del contenedor vía ref
 *   y CSS transition. getBoundingClientRect() fuerza el reflow
 *   para que cada golpe parte del estado brillante.
 */

import { useEffect, useRef } from 'react';
import type { TimbreId } from '../_lib/audio/timbres';

// ── Constantes de geometría (viewBox 0 0 200 200, centro 100,100) ─────────────

const CX = 100;
const CY = 100;
const R_CYMBAL = 72;   // platillos
const R_DRUM   = 66;   // toms / tarola
const R_BASS   = 76;   // bombo (más grande)

// ── Gradientes y helpers ──────────────────────────────────────────────────────

function CymbalDefs({ id }: { id: string }) {
  return (
    <defs>
      <radialGradient id={`cg-${id}`} cx="0.4" cy="0.4" r="0.7">
        <stop offset="0%"   stopColor="#f4d68a" />
        <stop offset="40%"  stopColor="#c9a45a" />
        <stop offset="80%"  stopColor="#8a6e3a" />
        <stop offset="100%" stopColor="#5a4520" />
      </radialGradient>
    </defs>
  );
}

function SkinDefs({ id }: { id: string }) {
  return (
    <defs>
      <radialGradient id={`sg-${id}`} cx="0.35" cy="0.3" r="0.8">
        <stop offset="0%"   stopColor="#fcf6e8" />
        <stop offset="60%"  stopColor="#f0e5d0" />
        <stop offset="100%" stopColor="#c9bda3" />
      </radialGradient>
    </defs>
  );
}

// ── Tipos de instrumento ──────────────────────────────────────────────────────

function Cymbal({ id, r = R_CYMBAL }: { id: string; r?: number }) {
  return (
    <>
      <CymbalDefs id={id} />
      {/* Sombra */}
      <ellipse cx={CX + 3} cy={CY + 5} rx={r} ry={r * 0.95} fill="rgba(0,0,0,0.5)" />
      {/* Disco principal */}
      <circle cx={CX} cy={CY} r={r} fill={`url(#cg-${id})`} stroke="#3a2c14" strokeWidth={1} />
      {/* Anillos concéntricos */}
      {[1, 2, 3, 4].map((i) => (
        <circle key={i} cx={CX} cy={CY} r={r * (i / 5)}
          fill="none" stroke="rgba(60,40,15,0.35)" strokeWidth={0.5} />
      ))}
      {/* Bell central */}
      <circle cx={CX} cy={CY} r={r * 0.18} fill="#e8c97a" stroke="#6a5020" strokeWidth={0.8} />
    </>
  );
}

function HiHat({ id, open }: { id: string; open?: boolean }) {
  const r = R_CYMBAL;
  return (
    <>
      <Cymbal id={id} r={r} />
      {/* Borde marcado (hi-hat cerrado tiene borde doble) */}
      <circle cx={CX} cy={CY} r={r * 0.92} fill="none" stroke="#3a2c14" strokeWidth={1.5} />
      {/* Línea divisoria ABIERTO / CERRADO */}
      <line x1={CX - r} y1={CY} x2={CX + r} y2={CY}
        stroke="#3a2c14" strokeWidth={1.2} strokeDasharray="3 3" />
      {/* Varilla central (parte superior) */}
      <circle cx={CX} cy={CY - r * 0.55} r={8} fill="none" stroke="#2a1c08" strokeWidth={2} />
      {/* Etiquetas ABIERTO / CERRADO */}
      <text x={CX} y={CY - r * 0.18}
        textAnchor="middle" fontFamily="monospace"
        fontSize={7} fontWeight={600} fill="rgba(42,28,8,0.6)" letterSpacing="0.12em">
        {open ? 'ABIERTO' : 'CERRADO'}
      </text>
    </>
  );
}

function DrumShell({ r, id, type }: {
  r: number; id: string; type: 'snare' | 'tom' | 'bass'
}) {
  const lugCount = type === 'bass' ? 10 : 6;
  const lugs = Array.from({ length: lugCount }, (_, i) => {
    const angle = (i / lugCount) * Math.PI * 2;
    return {
      cx: CX + Math.cos(angle) * (r + 2),
      cy: CY + Math.sin(angle) * (r + 2),
    };
  });

  return (
    <>
      <SkinDefs id={id} />
      {/* Sombra */}
      <ellipse cx={CX + 2} cy={CY + 6} rx={r + 4} ry={(r + 4) * 0.95} fill="rgba(0,0,0,0.6)" />
      {/* Shell de madera */}
      <circle cx={CX} cy={CY} r={r + 4} fill="#2d1810" stroke="#1a0d05" strokeWidth={1} />
      <path
        d={`M ${CX - r - 2} ${CY - 2} A ${r + 3} ${r + 3} 0 0 1 ${CX + r + 2} ${CY - 2}`}
        fill="none" stroke="#4a2c1a" strokeWidth={2}
      />
      {/* Parche */}
      <circle cx={CX} cy={CY} r={r} fill={`url(#sg-${id})`} stroke="#8a7a5e" strokeWidth={0.8} />
      {/* Bordones (tarola) */}
      {type === 'snare' && [-1, 0, 1].map((i) => (
        <line key={i}
          x1={CX - r * 0.7} y1={CY + i * 3} x2={CX + r * 0.7} y2={CY + i * 3}
          stroke="rgba(140,120,90,0.25)" strokeWidth={0.4}
        />
      ))}
      {/* Logo bombo */}
      {type === 'bass' && (
        <>
          <text x={CX} y={CY + 4} textAnchor="middle"
            fontFamily="Georgia, serif" fontStyle="italic" fontSize={20}
            fontWeight={600} fill="#8a6e3a">
            Storm
          </text>
          <text x={CX} y={CY + 20} textAnchor="middle"
            fontFamily="monospace" fontSize={7} letterSpacing="0.22em" fill="#a08858">
            STUDIOS
          </text>
        </>
      )}
      {/* Lugs (tensores) */}
      {lugs.map((l, i) => (
        <circle key={i} cx={l.cx} cy={l.cy} r={1.8}
          fill="#c9b896" stroke="#5a4a30" strokeWidth={0.4} />
      ))}
    </>
  );
}

// ── Map timbreId → SVG ────────────────────────────────────────────────────────

function DrumShape({ timbreId }: { timbreId: TimbreId }) {
  switch (timbreId) {
    case 'hh':    return <HiHat id="hh" />;
    case 'hho':   return <HiHat id="hho" open />;
    case 'crash': return <Cymbal id="crash" />;
    case 'ride':  return <Cymbal id="ride" />;
    case 'sd':    return <DrumShell r={R_DRUM} id="sd" type="snare" />;
    case 't1':    return <DrumShell r={R_DRUM} id="t1" type="tom" />;
    case 'ft':    return <DrumShell r={R_DRUM} id="ft" type="tom" />;
    case 'bd':    return <DrumShell r={R_BASS} id="bd" type="bass" />;
    default:      return <HiHat id="hh" />;
  }
}

// ── Componente principal ──────────────────────────────────────────────────────

interface DrumVisualProps {
  timbreId: TimbreId;
  hitKey: number;   // se incrementa en cada toque → dispara la animación de golpe
  dim?: boolean;    // true cuando el ejercicio está idle
}

export function DrumVisual({ timbreId, hitKey, dim = false }: DrumVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Animación de golpe: brillo + glow → fundido suave
  useEffect(() => {
    if (hitKey === 0 || !containerRef.current) return;
    const el = containerRef.current;

    // 1. Cancelar transición activa y saltar al estado brillante
    el.style.transition = 'none';
    el.style.filter     = 'brightness(2.4) drop-shadow(0 0 24px #f4d68a)';

    // 2. Forzar reflow para que el navegador registre el estado inicial
    el.getBoundingClientRect();

    // 3. Activar transición hacia el estado neutro
    el.style.transition = 'filter 0.42s ease-out';
    el.style.filter     = 'brightness(1) drop-shadow(0 0 0px transparent)';
  }, [hitKey]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        opacity: dim ? 0.35 : 1,
        transition: 'opacity 0.3s',
        filter: 'brightness(1)',
      }}
    >
      <svg
        viewBox="0 0 200 200"
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        <DrumShape timbreId={timbreId} />
      </svg>
    </div>
  );
}
