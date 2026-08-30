// harness.ts — Arnés de QA de F1 (PLAN §13-F1). Se monta SOLO con ?dev=1.
// Pruebas puras automáticas + botones de audio manual + sondas de red al CDN.
// REUTILIZAR este arnés en fases siguientes (patrón del Expreso Tonal).

import {
  SCALES, scaleDegrees, NOTE_FILES, triadFiles, scaleWalkFiles, writtenMidi,
  getPitchClass, pitchClassOfDegree, minorChordFileName, ALL_DEGREES_OPTIONS,
  type Scale, type Degree,
} from "@/music/degrees";
import { buildQuestionSet, makeDegreeNoteSelector } from "@/music/selector";
import { SamplePlayer, audioUrl, tonicChordPath } from "@/audio/samples";
import { CADENCE_CHORD_GAP_S, RING_NOTE_GAP_S } from "@/config";

interface TestResult {
  name: string;
  pass: boolean;
  detail?: string;
}

/** MIDI real de un nombre de archivo tipo "C#4" o "B♭♭3". */
function midiOfFileBase(base: string): number {
  return writtenMidi(getPitchClass(base), Number(base.slice(-1)));
}

/** Quita el prefijo de timbre y la extensión: "Piano/C#4.mp3" → "C#4". */
function bareNames(files: string[]): string[] {
  return files.map((f) => f.split("/")[1].replace(".mp3", ""));
}

// ---------------------------------------------------------------------------
// Pruebas puras (sin red)
// ---------------------------------------------------------------------------
function runPureTests(): TestResult[] {
  const results: TestResult[] = [];
  const test = (name: string, fn: () => true | string) => {
    try {
      const r = fn();
      results.push(r === true ? { name, pass: true } : { name, pass: false, detail: r });
    } catch (e) {
      results.push({ name, pass: false, detail: String(e) });
    }
  };

  // --- El mapa sagrado ---
  test('scaleDegrees["C#m"]["F##"] === "IVly"', () =>
    scaleDegrees["C#m"]["F##"] === "IVly" || `obtuvo ${scaleDegrees["C#m"]["F##"]}`);

  test('scaleDegrees["A♭m"]["B♭♭"] === "IIfr"', () =>
    scaleDegrees["A♭m"]["B♭♭"] === "IIfr" || `obtuvo ${scaleDegrees["A♭m"]["B♭♭"]}`);

  test('scaleDegrees["D#m"]["C##"] === "VIIsen"', () =>
    scaleDegrees["D#m"]["C##"] === "VIIsen" || `obtuvo ${scaleDegrees["D#m"]["C##"]}`);

  test("los 15 mapas tienen los 11 grados", () => {
    for (const scale of SCALES) {
      const degrees = new Set(Object.values(scaleDegrees[scale]));
      if (degrees.size !== 11) return `${scale}: ${degrees.size} grados`;
      for (const d of ALL_DEGREES_OPTIONS) {
        if (!degrees.has(d)) return `${scale}: falta ${d}`;
      }
    }
    return true;
  });

  test("convención de octavas: B#3=60, C♭4=59, F##4=67", () => {
    const b = writtenMidi("B#", 3), c = writtenMidi("C♭", 4), f = writtenMidi("F##", 4);
    return (b === 60 && c === 59 && f === 67) || `obtuvo ${b},${c},${f}`;
  });

  // --- Tríadas de la cadencia i–iv–V–i ---
  test("triadFiles C#m V = G#3/B#3/D#4 (MAYOR)", () => {
    const got = triadFiles("C#m", "V", "Piano").join(",");
    const want = "Piano/G#3.mp3,Piano/B#3.mp3,Piano/D#4.mp3";
    return got === want || `obtuvo ${got}`;
  });

  test("triadFiles A♭m i = A♭3/C♭4/E♭4 (menor)", () => {
    const got = triadFiles("A♭m", "i", "Piano").join(",");
    const want = "Piano/A♭3.mp3,Piano/C♭4.mp3,Piano/E♭4.mp3";
    return got === want || `obtuvo ${got}`;
  });

  test("triadFiles D#m V = A#3/C##4/E#4 (MAYOR, con doble sostenido)", () => {
    const got = triadFiles("D#m", "V", "Piano").join(",");
    const want = "Piano/A#3.mp3,Piano/C##4.mp3,Piano/E#4.mp3";
    return got === want || `obtuvo ${got}`;
  });

  /**
   * Las 45 tríadas (15 escalas × i/iv/V): archivos en inventario y — lo que de verdad
   * importa — la SONORIDAD correcta. i y iv menores [3,4]; V MAYOR [4,3]. Si el V
   * saliera menor, la cadencia no establecería el modo menor.
   */
  test("45 tríadas: inventario + i/iv menores y V MAYOR", () => {
    const inventory = new Set(NOTE_FILES);
    for (const scale of SCALES) {
      for (const triad of ["i", "iv", "V"] as const) {
        const files = bareNames(triadFiles(scale, triad, "Piano"));
        for (const f of files) {
          if (!inventory.has(f)) return `${scale} ${triad}: ${f} no está en NOTE_FILES`;
        }
        const midis = files.map(midiOfFileBase);
        const ints = [midis[1] - midis[0], midis[2] - midis[1]];
        const want = triad === "V" ? [4, 3] : [3, 4];
        if (ints[0] !== want[0] || ints[1] !== want[1]) {
          return `${scale} ${triad}: intervalos ${ints.join(",")} (esperado ${want.join(",")})`;
        }
      }
    }
    return true;
  });

  // --- La espiral del Perihelio: sube melódica, baja natural ---
  test("scaleWalk C#m sube melódica: C#4 D#4 E4 F#4 G#4 A#4 B#4 C#5", () => {
    const got = bareNames(scaleWalkFiles("C#m", "melodicUp", "Piano")).join(" ");
    const want = "C#4 D#4 E4 F#4 G#4 A#4 B#4 C#5";
    return got === want || `obtuvo ${got}`;
  });

  test("scaleWalk C#m baja natural: B4 A4 G#4 F#4 E4 D#4 C#4", () => {
    const got = bareNames(scaleWalkFiles("C#m", "naturalDown", "Piano")).join(" ");
    const want = "B4 A4 G#4 F#4 E4 D#4 C#4";
    return got === want || `obtuvo ${got}`;
  });

  test("scaleWalk A♭m sube melódica: A♭4 B♭4 C♭5 D♭5 E♭5 F5 G5 A♭5", () => {
    const got = bareNames(scaleWalkFiles("A♭m", "melodicUp", "Piano")).join(" ");
    const want = "A♭4 B♭4 C♭5 D♭5 E♭5 F5 G5 A♭5";
    return got === want || `obtuvo ${got}`;
  });

  /**
   * Las 15 espirales completas: la subida asciende estrictamente y abarca una 8ª justa;
   * la bajada desciende estrictamente y aterriza en la MISMA tónica de la que se partió.
   * Los 15 anillos suman siempre 8 + 7.
   */
  test("15 espirales: 8+7 anillos, monótonas, misma tónica de ida y vuelta", () => {
    const inventory = new Set(NOTE_FILES);
    for (const scale of SCALES) {
      const up = bareNames(scaleWalkFiles(scale, "melodicUp", "Piano"));
      const down = bareNames(scaleWalkFiles(scale, "naturalDown", "Piano"));
      if (up.length !== 8) return `${scale}: subida de ${up.length} anillos`;
      if (down.length !== 7) return `${scale}: bajada de ${down.length} anillos`;
      for (const f of [...up, ...down]) {
        if (!inventory.has(f)) return `${scale}: ${f} no está en NOTE_FILES`;
      }
      const upMidi = up.map(midiOfFileBase);
      const downMidi = down.map(midiOfFileBase);
      for (let i = 1; i < upMidi.length; i++) {
        if (upMidi[i] <= upMidi[i - 1]) return `${scale}: subida no asciende en ${up[i]}`;
      }
      for (let i = 1; i < downMidi.length; i++) {
        if (downMidi[i] >= downMidi[i - 1]) return `${scale}: bajada no desciende en ${down[i]}`;
      }
      if (upMidi[7] - upMidi[0] !== 12) return `${scale}: la subida no abarca una 8ª justa`;
      if (downMidi[6] !== upMidi[0]) return `${scale}: la bajada no aterriza en la tónica`;
      if (downMidi[0] >= upMidi[7]) return `${scale}: la bajada no arranca bajo la 8ª`;
      // El gesto del modo menor: subida con #6 y #7, bajada con ♭7 y ♭6.
      const vimel = pitchClassOfDegree(scale, "VImel");
      const viisen = pitchClassOfDegree(scale, "VIIsen");
      const viist = pitchClassOfDegree(scale, "VIIST");
      const vi = pitchClassOfDegree(scale, "VI");
      if (getPitchClass(up[5]) !== vimel) return `${scale}: la subida no lleva VImel`;
      if (getPitchClass(up[6]) !== viisen) return `${scale}: la subida no lleva VIIsen`;
      if (getPitchClass(down[0]) !== viist) return `${scale}: la bajada no lleva VIIST`;
      if (getPitchClass(down[1]) !== vi) return `${scale}: la bajada no lleva VI`;
    }
    return true;
  });

  // --- La trampa de A#m (PLAN §3.2) ---
  test("A#m no puede sortear IVly (E## no existe)", () => {
    const set = buildQuestionSet("A#m", new Set<Degree>(["IVly"]), "Piano");
    return set.length === 0 || `obtuvo ${set.length} muestras`;
  });

  test("A#m sí sortea los otros 10 grados", () => {
    const otros = ALL_DEGREES_OPTIONS.filter((d) => d !== "IVly");
    const set = buildQuestionSet("A#m", new Set<Degree>(otros), "Piano");
    const clases = new Set(set.map((s) => s.pitchClass));
    return clases.size === 10 || `obtuvo ${clases.size} clases distintas`;
  });

  // --- Selector (port calibrado) ---
  test("selector {I,IV,V}: cobertura por ciclo, sin repetición seguida", () => {
    const set = buildQuestionSet("Am", new Set<Degree>(["I", "IV", "V"]), "Piano");
    const sel = makeDegreeNoteSelector();
    const draws: string[] = [];
    for (let i = 0; i < 48; i++) draws.push(sel.next(set)!.pitchClass);
    for (let i = 1; i < draws.length; i++) {
      if (draws[i] === draws[i - 1]) return `repetición seguida en sorteo ${i}: ${draws[i]}`;
    }
    for (let c = 0; c < 48; c += 3) {
      if (new Set(draws.slice(c, c + 3)).size !== 3) {
        return `ciclo ${c / 3} incompleto: ${draws.slice(c, c + 3).join(",")}`;
      }
    }
    return true;
  });

  test("selector 11 grados: cobertura completa por ciclo", () => {
    const set = buildQuestionSet("E♭m", new Set<Degree>(ALL_DEGREES_OPTIONS), "Piano");
    const sel = makeDegreeNoteSelector();
    const draws: string[] = [];
    for (let i = 0; i < 22; i++) draws.push(sel.next(set)!.pitchClass);
    if (new Set(draws.slice(0, 11)).size !== 11) return `1er ciclo: ${draws.slice(0, 11).join(",")}`;
    if (new Set(draws.slice(11, 22)).size !== 11) return `2º ciclo: ${draws.slice(11, 22).join(",")}`;
    return true;
  });

  test("selector con 2 grados: 200 sorteos sin repetición seguida", () => {
    const set = buildQuestionSet("Dm", new Set<Degree>(["VIIST", "VIIsen"]), "Piano");
    const sel = makeDegreeNoteSelector();
    let last: string | null = null;
    for (let i = 0; i < 200; i++) {
      const pitch = sel.next(set)!.pitchClass;
      if (pitch === last) return `repetición seguida en sorteo ${i}`;
      last = pitch;
    }
    return true;
  });

  // --- URLs: fallback enharmónico y codificación ---
  test("audioUrl aplica el fallback C##→D y G##→A", () => {
    const u1 = audioUrl("Piano/C##4.mp3");
    const u2 = audioUrl("Coro/G##3.mp3");
    if (!u1.endsWith("/Piano/D4.mp3")) return u1;
    if (!u2.endsWith("/Coro/A3.mp3")) return u2;
    return true;
  });

  test("audioUrl NO toca D## ni F## (sí existen)", () => {
    const u1 = audioUrl("Piano/D##4.mp3");
    const u2 = audioUrl("Piano/F##4.mp3");
    if (!u1.endsWith("/Piano/D%23%234.mp3")) return u1;
    if (!u2.endsWith("/Piano/F%23%234.mp3")) return u2;
    return true;
  });

  test("audioUrl codifica ♭♭ / # / espacio", () => {
    const u1 = audioUrl("Piano/B♭♭3.mp3");
    const u2 = audioUrl(tonicChordPath("Fagot", minorChordFileName("E♭m")));
    if (!u1.endsWith("/Piano/B%E2%99%AD%E2%99%AD3.mp3")) return u1;
    if (!u2.includes("/Minor%20Chords/")) return u2;
    return true;
  });

  test('minorChordFileName quita la "m": A♭m → A♭minor.mp3', () => {
    const got = minorChordFileName("A♭m");
    return got === "A♭minor.mp3" || `obtuvo ${got}`;
  });

  return results;
}

// ---------------------------------------------------------------------------
// Sondas de red (elemento Audio — con fetch el bucket da 0/N por CORS)
// ---------------------------------------------------------------------------
function probeUrl(relPath: string, timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio();
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(ok);
    };
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    audio.addEventListener("canplaythrough", () => finish(true));
    audio.addEventListener("loadeddata", () => finish(true));
    audio.addEventListener("error", () => finish(false));
    audio.src = audioUrl(relPath);
    audio.load();
  });
}

async function probeAll(paths: string[], concurrency = 6): Promise<string[]> {
  const failures: string[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (i < paths.length) {
        const path = paths[i++];
        if (!(await probeUrl(path))) failures.push(path);
      }
    }),
  );
  return failures;
}

/**
 * Hash SHA-256 del CONTENIDO de un sample, vía el proxy `/r2` de vite (mismo origen, así
 * que `fetch` sí puede leer los bytes; contra el bucket directo lo impide CORS).
 *
 * Es la ÚNICA forma fiable de saber si dos assets son el mismo archivo. Comparar
 * duración o tamaño NO sirve: cuatro de los cinco acordes menores pesan 202560 bytes y
 * duran 5.064 s siendo grabaciones distintas (PLAN §3.4 — el error que cometí en F1).
 * Solo funciona en dev.
 */
async function probeHash(relPath: string): Promise<string | null> {
  if (!import.meta.env.DEV) return null;
  try {
    const url = "/r2/" + relPath.split("/").map(encodeURIComponent).join("/");
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------
export function mountDevHarness(): void {
  const player = new SamplePlayer();
  player.setVolume(0.8);

  const panel = document.createElement("div");
  panel.id = "dev-harness";
  panel.style.cssText = [
    "position:fixed", "top:8px", "right:8px", "z-index:9999", "width:320px",
    "background:rgba(10,15,30,0.96)", "border:1px solid #c9a227", "border-radius:8px",
    "padding:10px", "font:12px/1.5 monospace", "color:#e8e6dc", "max-height:92vh",
    "overflow-y:auto",
  ].join(";");

  const out = document.createElement("div");
  out.style.cssText =
    "background:#070b18;border:1px solid #333;border-radius:4px;padding:6px;margin-top:6px;" +
    "max-height:40vh;overflow-y:auto;white-space:pre-wrap;word-break:break-all";

  const log = (msg: string, color = "#e8e6dc") => {
    const line = document.createElement("div");
    line.textContent = msg;
    line.style.color = color;
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
    console.log(`[F1] ${msg}`);
  };

  const btn = (label: string, fn: () => void) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText =
      "display:block;width:100%;margin:3px 0;padding:4px;background:#1a2340;color:#e8e6dc;" +
      "border:1px solid #c9a227;border-radius:4px;cursor:pointer;font:inherit;text-align:left";
    b.onclick = fn;
    panel.appendChild(b);
  };

  const title = document.createElement("div");
  title.textContent = "☄ F1 QA — El Cometa";
  title.style.cssText = "font-weight:bold;color:#e8c65a;margin-bottom:6px";
  panel.appendChild(title);

  // --- Pruebas puras (auto) ---
  const pure = runPureTests();

  // --- Botones de audio manual ---
  btn("▶ Nota B♭♭3 (Piano)", () => void player.playNote("Piano/B♭♭3.mp3"));
  btn("▶ Nota F##4 (Coro)", () => void player.playNote("Coro/F##4.mp3"));
  btn("▶ Nota C##4 → debe sonar D4 (Piano)", () => void player.playNote("Piano/C##4.mp3"));
  btn("▶ Tríada i de Am (Piano) — MENOR", () => void player.playTriad(triadFiles("Am", "i", "Piano")));
  btn("▶ Tríada V de Am (Piano) — MAYOR", () => void player.playTriad(triadFiles("Am", "V", "Piano")));
  btn("▶ Cadencia i–iv–V–i en Am (Piano)", () => playCadence("Am", "Piano"));
  btn("▶ Cadencia i–iv–V–i en C#m (Fagot)", () => playCadence("C#m", "Fagot"));
  btn("▶ Cadencia i–iv–V–i en A♭m (Coro)", () => playCadence("A♭m", "Coro"));
  btn("▶ Espiral completa de Am (15 anillos)", () => playSpiral("Am", "Piano"));
  btn("▶ Espiral completa de A♭m (15 anillos)", () => playSpiral("A♭m", "Piano"));
  btn("▶ SFX acierto / error", () => {
    player.playCorrect();
    window.setTimeout(() => player.playIncorrect(), 700);
  });

  function playCadence(scale: Scale, timbre: string): void {
    const gap = CADENCE_CHORD_GAP_S * 1000;
    log(`Cadencia i–iv–V–i en ${scale} (${timbre}). El V debe sonar MAYOR.`, "#e8c65a");
    (["i", "iv", "V", "i"] as const).forEach((triad, i) => {
      window.setTimeout(() => void player.playTriad(triadFiles(scale, triad, timbre)), gap * i);
    });
  }

  function playSpiral(scale: Scale, timbre: string): void {
    const up = scaleWalkFiles(scale, "melodicUp", timbre);
    const down = scaleWalkFiles(scale, "naturalDown", timbre);
    log(`Espiral de ${scale}: sube melódica (#6 #7), baja natural (♭7 ♭6).`, "#e8c65a");
    log(`↑ ${bareNames(up).join(" ")}`, "#9fd8e8");
    log(`↓ ${bareNames(down).join(" ")}`, "#9fd8e8");
    void player.playScaleWalk([...up, ...down], RING_NOTE_GAP_S * 1000);
  }

  // --- Sondas de red ---
  btn("🌐 Sondear muestras críticas (##, ♭♭, fallbacks)", () => {
    const paths = [
      "Piano/B♭♭3.mp3", "Coro/F##4.mp3", "Piano/D##4.mp3", "Fagot/C♭7.mp3",
      "Cello/E#3.mp3", "Corno/B#2.mp3", "Piano/C##4.mp3", "Coro/G##3.mp3",
      "acierto.mp3", "error.mp3",
    ];
    log("Sondeando muestras críticas…", "#e8c65a");
    void probeAll(paths).then((failures) => {
      if (failures.length === 0) log(`✔ ${paths.length}/${paths.length} muestras críticas OK`, "#38d17c");
      else failures.forEach((f) => log(`✘ FALLA: ${f}`, "#e04545"));
    });
  });

  btn("🌐 Sondear las 45 tríadas de cadencia (15×3)", () => {
    const paths = new Set<string>();
    for (const scale of SCALES) {
      for (const triad of ["i", "iv", "V"] as const) {
        for (const f of triadFiles(scale, triad, "Piano")) paths.add(f);
      }
    }
    log(`Sondeando ${paths.size} muestras de las 45 tríadas…`, "#e8c65a");
    void probeAll([...paths]).then((failures) => {
      if (failures.length === 0) log(`✔ ${paths.size}/${paths.size} notas de tríada OK`, "#38d17c");
      else failures.forEach((f) => log(`✘ FALLA: ${f}`, "#e04545"));
    });
  });

  btn("🌐 Sondear 75 Minor Chords (15×5)", () => {
    log("Sondeando 75 acordes de tónica…", "#e8c65a");
    const paths: string[] = [];
    for (const timbreDir of ["Piano", "Cello", "Corno", "Coro", "Fagot"]) {
      for (const scale of SCALES) paths.push(tonicChordPath(timbreDir, minorChordFileName(scale)));
    }
    void probeAll(paths).then((failures) => {
      if (failures.length === 0) log("✔ 75/75 Minor Chords cargan", "#38d17c");
      else failures.forEach((f) => log(`✘ FALLA: ${f}`, "#e04545"));
    });
  });

  /**
   * ¿Hay acordes duplicados entre timbres? Compara el CONTENIDO de los 75 Minor Chords
   * (15 tónicas × 5 timbres) por hash. En F1 dio 75/75 distintos: los acordes menores
   * están sanos. El defecto Piano=Cello es de los `Major Chords` del Expreso (PLAN §3.4).
   */
  btn("🔬 Hash de los 75 Minor Chords: ¿algún duplicado?", () => {
    const dirs = ["Piano", "Cello", "Corno", "Coro", "Fagot"];
    log("Comparando el contenido de los 75 acordes (hash SHA-256)…", "#e8c65a");
    void (async () => {
      const dupes: string[] = [];
      let missing = 0;
      for (const scale of SCALES) {
        const file = minorChordFileName(scale);
        const byHash = new Map<string, string[]>();
        for (const dir of dirs) {
          const h = await probeHash(tonicChordPath(dir, file));
          if (h === null) { missing++; continue; }
          byHash.set(h, [...(byHash.get(h) ?? []), dir]);
        }
        for (const timbres of byHash.values()) {
          if (timbres.length > 1) dupes.push(`${file}: ${timbres.join(" = ")}`);
        }
      }
      if (missing) log(`⚠ ${missing} no se pudieron leer (¿estás en dev?)`, "#e04545");
      if (dupes.length === 0) log("✔ 75/75 archivos DISTINTOS: los acordes menores están sanos", "#38d17c");
      else dupes.forEach((x) => log(`⚠ DUPLICADO — ${x}`, "#e04545"));
    })();
  });

  btn("🔊 Escuchar Aminor.mp3 en Piano y luego en Fagot", () => {
    const file = minorChordFileName("Am");
    log("Piano/Minor Chords/Aminor.mp3 …", "#e8c65a");
    void player.playTonicChord("Piano", file);
    window.setTimeout(() => {
      log("Fagot/Minor Chords/Aminor.mp3 … ¿suena a fagot?", "#e8c65a");
      void player.playTonicChord("Fagot", file);
    }, 3000);
  });

  panel.appendChild(out);
  document.body.appendChild(panel);

  const passed = pure.filter((r) => r.pass).length;
  log(`Pruebas puras: ${passed}/${pure.length}`, passed === pure.length ? "#38d17c" : "#e04545");
  for (const r of pure) {
    log(`${r.pass ? "✔" : "✘"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`,
      r.pass ? "#38d17c" : "#e04545");
  }

  // Expuesto para QA manual desde la consola del navegador.
  (window as unknown as Record<string, unknown>).CometaQA = {
    player, scaleDegrees, triadFiles, scaleWalkFiles, buildQuestionSet,
    makeDegreeNoteSelector, audioUrl, bareNames,
    probeUrl: (p: string) => probeUrl(p),
    probeHash: (p: string) => probeHash(p),
  };
  log("window.CometaQA disponible.", "#e8c65a");
}
