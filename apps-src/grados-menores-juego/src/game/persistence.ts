// persistence.ts — localStorage (PLAN §7.7). LÓGICA PURA: ni DOM ni three.
//
// Tres almacenes con prefijo `cometa-`, SEPARADOS de los de la webapp seria. Ojo con
// esto: la webapp de Grados Escala Menor guarda en `GradosMenoresStats`, y ese almacén
// NO se toca — el alumno tiene dos historiales distintos porque son dos prácticas
// distintas, y borrar el progreso del juego no puede llevarse el de la webapp.
//
// Se guarda tras CADA decisión, no al final del viaje: si el navegador se cierra a mitad
// de órbita, los grados ya respondidos no se pierden.
//
// Regla de oro del Planetario: los récords SOLO MEJORAN. Un viaje malo en una ruta ya
// conquistada no puede borrar la medalla de oro que costó ganar.

import type { Degree } from "@/music/degrees";

const KEY_STATS = "cometa-stats";
const KEY_ROUTES = "cometa-rutas";
const KEY_SETTINGS = "cometa-settings";

export type Medal = "gold" | "silver" | "bronze";

export interface DegreeStat { correct: number; total: number }
export type DegreeStats = Record<string, DegreeStat>;

export interface RouteRecord {
  llegadas: number;
  gala: boolean;
  mejorMedalla: Medal;
  mejorScore: number;
  mejorRacha: number;
  velocidadRecord: string;
  primeraLlegadaISO: string;
}
export type RouteRecords = Record<string, RouteRecord>;

export interface StoredSettings {
  escala: string;
  timbre: string;
  velocidad: string;
  gradosSeleccionados: string[];
  volumen: number;
}

/** Orden de calidad de las medallas: solo se sube, nunca se baja. */
const MEDAL_RANK: Record<Medal, number> = { bronze: 1, silver: 2, gold: 3 };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as T) : fallback;
  } catch {
    // Almacenamiento lleno, deshabilitado o JSON corrupto: el juego sigue sin persistir.
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Modo privado o cuota agotada: se juega igual, solo no se recuerda.
  }
}

// ---------------------------------------------------------------------------
// Estadísticas por grado
// ---------------------------------------------------------------------------

export function loadDegreeStats(): DegreeStats {
  return read<DegreeStats>(KEY_STATS, {});
}

/** Se llama tras CADA decisión (§7.7). */
export function recordAnswer(degree: Degree, correct: boolean): DegreeStats {
  const stats = loadDegreeStats();
  const entry = stats[degree] ?? { correct: 0, total: 0 };
  entry.total += 1;
  if (correct) entry.correct += 1;
  stats[degree] = entry;
  write(KEY_STATS, stats);
  return stats;
}

// ---------------------------------------------------------------------------
// Placas del Planetario
// ---------------------------------------------------------------------------

export function loadRoutes(): RouteRecords {
  return read<RouteRecords>(KEY_ROUTES, {});
}

export interface ArrivalRecord {
  scale: string;
  medal: Medal;
  gala: boolean;
  score: number;
  streak: number;
  speedLabel: string;
}

/**
 * Registra una llegada al Perihelio. `mejorMedalla`, `mejorScore` y `mejorRacha` SOLO
 * MEJORAN, y `velocidadRecord` acompaña siempre a la puntuación récord (si no, diría la
 * velocidad de la última partida, que puede no tener nada que ver con el récord).
 */
export function recordArrival(record: ArrivalRecord): RouteRecords {
  const routes = loadRoutes();
  const previous = routes[record.scale];

  if (!previous) {
    routes[record.scale] = {
      llegadas: 1,
      gala: record.gala,
      mejorMedalla: record.medal,
      mejorScore: record.score,
      mejorRacha: record.streak,
      velocidadRecord: record.speedLabel,
      primeraLlegadaISO: new Date().toISOString(),
    };
  } else {
    const mejora = record.score > previous.mejorScore;
    routes[record.scale] = {
      llegadas: previous.llegadas + 1,
      // La gala, una vez conseguida, no se pierde: es una hazaña, no un estado.
      gala: previous.gala || record.gala,
      mejorMedalla:
        MEDAL_RANK[record.medal] > MEDAL_RANK[previous.mejorMedalla]
          ? record.medal : previous.mejorMedalla,
      mejorScore: Math.max(previous.mejorScore, record.score),
      mejorRacha: Math.max(previous.mejorRacha, record.streak),
      velocidadRecord: mejora ? record.speedLabel : previous.velocidadRecord,
      primeraLlegadaISO: previous.primeraLlegadaISO,
    };
  }
  write(KEY_ROUTES, routes);
  return routes;
}

// ---------------------------------------------------------------------------
// Ajustes del menú
// ---------------------------------------------------------------------------

export function loadSettings(): StoredSettings | null {
  const stored = read<StoredSettings | null>(KEY_SETTINGS, null);
  if (!stored || typeof stored.escala !== "string" || !Array.isArray(stored.gradosSeleccionados)) {
    return null;
  }
  return stored;
}

export function saveSettings(settings: StoredSettings): void {
  write(KEY_SETTINGS, settings);
}

// ---------------------------------------------------------------------------

/**
 * Borra TODO el progreso de El Cometa. La confirmación es cosa de la UI.
 * NO toca `GradosMenoresStats`: el historial de la webapp seria es de su dueño.
 */
export function clearAll(): void {
  for (const key of [KEY_STATS, KEY_ROUTES, KEY_SETTINGS]) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Igual que en write(): si no se puede, se sigue jugando.
    }
  }
}
