// engine.js - Logica pura (sin DOM) portada de MusicTheory.kt / StatsStore.kt.
import {
  AUDIO_BASE, NOTE_FILES, scaleDegrees, TIMBRE_DIRS, BASE_TIMBRES, RANDOM_TIMBRE,
  ALL_DEGREES_OPTIONS,
} from "./data.js";

const AUDIO_NOTE_FALLBACKS = {
  "C##": "D",
  "G##": "A",
};

function normalizeAudioSegment(segment) {
  const match = segment.match(/^([A-G]##)(\d)\.mp3$/);
  if (!match) return segment;
  const fallback = AUDIO_NOTE_FALLBACKS[match[1]];
  return fallback ? `${fallback}${match[2]}.mp3` : segment;
}

// Construye una URL de audio segura: codifica cada segmento (espacios, #, ♭...).
export function audioUrl(relPath) {
  return AUDIO_BASE + "/" + relPath.split("/").map(normalizeAudioSegment).map(encodeURIComponent).join("/");
}

// Carpeta de assets para un timbre lógico.
export function getAssetBaseDir(timbre) {
  return TIMBRE_DIRS[timbre] || TIMBRE_DIRS.Piano;
}

// Carpetas a considerar (todas si es Aleatorio).
export function getAssetBaseDirsForSelection(timbre) {
  return timbre === RANDOM_TIMBRE ? BASE_TIMBRES.map(getAssetBaseDir) : [getAssetBaseDir(timbre)];
}

// Carpeta para sonidos de apoyo (acierto/error/acordes): si es aleatorio se infiere del archivo.
export function getAssetBaseDirFromQuestionPath(filePath) {
  if (!filePath) return getAssetBaseDir("Piano");
  const dir = filePath.split("/")[0];
  return dir && dir.length ? dir : getAssetBaseDir("Piano");
}

export function getSupportAssetBaseDir(selectedTimbre, question) {
  return selectedTimbre === RANDOM_TIMBRE
    ? getAssetBaseDirFromQuestionPath(question && question.filePath)
    : getAssetBaseDir(selectedTimbre);
}

// pitchClass = nombre de archivo sin la cifra de octava final (idéntico a getPitchClass()).
export function getPitchClass(baseName) {
  return baseName.length ? baseName.slice(0, -1) : baseName;
}

// Lista de muestras {pitchClass, filePath} válidas para escala + grados + timbre.
export function buildQuestionSet(scale, selectedDegrees, timbre) {
  if (!selectedDegrees || selectedDegrees.size === 0) return [];
  const degMap = scaleDegrees[scale];
  if (!degMap) return [];

  const out = [];
  for (const assetBase of getAssetBaseDirsForSelection(timbre)) {
    for (const base of NOTE_FILES) {
      const pitch = getPitchClass(base);
      const degree = degMap[pitch];
      if (degree && selectedDegrees.has(degree)) {
        out.push({ pitchClass: pitch, filePath: `${assetBase}/${base}.mp3` });
      }
    }
  }
  return out;
}

// Baraja in-place (Fisher-Yates).
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Selector tipo "bolsa barajada": recorre todos los grados seleccionados una vez
// antes de repetir ninguno, y evita repetir el mismo grado al pasar entre ciclos.
export function makeDegreeNoteSelector() {
  let groups = null;     // pitchClass -> [muestras]
  let bag = [];          // grados (pitchClass) pendientes del ciclo actual
  let lastPitch = null;  // último grado tocado (para evitar repetición en el límite)
  let lastFile = null;   // último archivo exacto (evita misma octava seguida si solo hay 1 grado)
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function buildGroups(activeNotes) {
    groups = new Map();
    for (const n of activeNotes) {
      if (!groups.has(n.pitchClass)) groups.set(n.pitchClass, []);
      groups.get(n.pitchClass).push(n);
    }
  }

  function refillBag() {
    bag = shuffle([...groups.keys()]);
    // Evita que el primero del nuevo ciclo sea igual al último del anterior.
    if (bag.length > 1 && bag[0] === lastPitch) {
      const j = 1 + Math.floor(Math.random() * (bag.length - 1));
      [bag[0], bag[j]] = [bag[j], bag[0]];
    }
  }

  return {
    next(activeNotes) {
      if (!activeNotes || !activeNotes.length) return null;
      if (!groups) buildGroups(activeNotes);
      if (!bag.length) refillBag();

      const pitch = bag.shift();
      lastPitch = pitch;

      const samples = groups.get(pitch);
      let sample = pick(samples);
      // Único caso donde un grado puede salir consecutivo: solo hay 1 grado activo.
      // Aun así variamos la octava para que no sea el mismo archivo exacto.
      if (samples.length > 1 && sample.filePath === lastFile) {
        let attempts = 0;
        while (sample.filePath === lastFile && attempts < samples.length * 2) {
          sample = pick(samples);
          attempts += 1;
        }
      }
      lastFile = sample.filePath;
      return sample;
    },
    reset() {
      groups = null;
      bag = [];
      lastPitch = null;
      lastFile = null;
    },
  };
}

// ---- Estadísticas persistentes (localStorage; equivalente a StatsStore) ----
const STATS_KEY = "GradosMenoresStats";

export function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch { /* ignore */ }
}

export function updateStats(current, degreeName, wasCorrect) {
  if (!degreeName) return current;
  const prev = current[degreeName] || { correct: 0, total: 0 };
  return {
    ...current,
    [degreeName]: {
      correct: prev.correct + (wasCorrect ? 1 : 0),
      total: prev.total + 1,
    },
  };
}

export function clearStats() {
  try { localStorage.removeItem(STATS_KEY); } catch { /* ignore */ }
}

export function totalAttempts(stats) {
  return Object.values(stats).reduce((a, s) => a + s.total, 0);
}
export function totalCorrect(stats) {
  return Object.values(stats).reduce((a, s) => a + s.correct, 0);
}
export function totalAccuracy(stats) {
  const att = totalAttempts(stats);
  return att === 0 ? 0 : totalCorrect(stats) / att;
}
export function topPracticedDegree(stats) {
  let best = null;
  for (const [k, v] of Object.entries(stats)) {
    if (v.total > 0 && (!best || v.total > stats[best].total)) best = k;
  }
  return best;
}
export function degreeOrderIndex(degree) {
  const i = ALL_DEGREES_OPTIONS.indexOf(degree);
  return i === -1 ? 999 : i;
}
export function sortDegrees(degrees) {
  return [...degrees].sort((a, b) => degreeOrderIndex(a) - degreeOrderIndex(b));
}

export function formatPercent(value, locale) {
  const fmt = new Intl.NumberFormat(locale === "en" ? "en-US" : "es-MX", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  return fmt.format(value);
}
