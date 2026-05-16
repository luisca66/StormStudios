/** Figuras de nota (incluye con punto: 'd' = dotted). */
export type Nota = 'w' | 'h' | 'hd' | 'q' | 'qd' | '8' | '8d' | '16';
/** Figuras de silencio (misma duración que su nota homónima; terminan en 'r'). */
export type Silencio = 'wr' | 'hr' | 'hdr' | 'qr' | 'qdr' | '8r' | '8dr' | '16r';
/** Cualquier figura (nota o silencio). */
export type Duracion = Nota | Silencio;

export type CompasType = '2/4' | '3/4' | '4/4';

/** Un compás es un arreglo de duraciones que suman exactamente los tiempos del compás. */
export type Compas = Duracion[];

/** Un patrón rítmico completo: tipo de compás + arreglo de compases. */
export interface PatronRitmico {
  compas: CompasType;
  compases: Compas[];
}

/** Retorna cuántos tiempos de negra caben en un compás dado. */
export function tiemposDelCompas(compas: CompasType): number {
  return parseInt(compas.split('/')[0]);
}

/** Retorna cuántos tiempos de negra vale una duración (nota o silencio). */
export function tiemposDeDuracion(dur: Duracion): number {
  const mapa: Record<Duracion, number> = {
    w: 4,   wr: 4,
    h: 2,   hr: 2,
    hd: 3,  hdr: 3,   // blanca con punto = 3 tiempos (ideal para 3/4)
    q: 1,   qr: 1,
    qd: 1.5, qdr: 1.5,
    '8': 0.5,  '8r': 0.5,
    '8d': 0.75, '8dr': 0.75,
    '16': 0.25, '16r': 0.25,
  };
  return mapa[dur];
}

/** Retorna true si la duración es un silencio (termina en 'r'). */
export function esSilencio(dur: Duracion): boolean {
  return dur.endsWith('r');
}

/**
 * Convierte un silencio en su nota equivalente.
 * 'qr' → 'q', 'hdr' → 'hd', etc.
 */
export function silencioANota(dur: Duracion): Nota {
  return dur.slice(0, -1) as Nota;
}
