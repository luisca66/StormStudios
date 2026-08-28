// harness.ts — Arnés de QA de F1 (PLAN §13-F1). Se monta SOLO con ?dev=1.
// Pruebas puras automáticas + botones de audio manual + sondas de red al CDN.

import {
  SCALES, scaleDegrees, NOTE_FILES, triadFiles, writtenMidi, getPitchClass,
  type Scale, type Degree,
} from "@/music/degrees";
import { buildQuestionSet, makeDegreeNoteSelector } from "@/music/selector";
import { SamplePlayer, audioUrl, tonicChordPath } from "@/audio/samples";
import { CADENCE_CHORD_GAP_S } from "@/config";

interface TestResult {
  name: string;
  pass: boolean;
  detail?: string;
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

  test('scaleDegrees["C#"]["F##"] === "IVly"', () =>
    scaleDegrees["C#"]["F##"] === "IVly" || `obtuvo ${scaleDegrees["C#"]["F##"]}`);

  test('scaleDegrees["G♭"]["A♭♭"] === "IIfr"', () =>
    scaleDegrees["G♭"]["A♭♭"] === "IIfr" || `obtuvo ${scaleDegrees["G♭"]["A♭♭"]}`);

  test("triadFiles C# V = G#3/B#3/D#4", () => {
    const got = triadFiles("C#", "V", "Piano").join(",");
    const want = "Piano/G#3.mp3,Piano/B#3.mp3,Piano/D#4.mp3";
    return got === want || `obtuvo ${got}`;
  });

  test("triadFiles C♭ IV = F♭3/A♭3/C♭4", () => {
    const got = triadFiles("C♭", "IV", "Piano").join(",");
    const want = "Piano/F♭3.mp3,Piano/A♭3.mp3,Piano/C♭4.mp3";
    return got === want || `obtuvo ${got}`;
  });

  test("convención de octavas: B#3=60, C♭4=59, F##4=67", () => {
    const b = writtenMidi("B#", 3), c = writtenMidi("C♭", 4), f = writtenMidi("F##", 4);
    return (b === 60 && c === 59 && f === 67) || `obtuvo ${b},${c},${f}`;
  });

  // Las 45 tríadas de cadencia (15 escalas × I/IV/V): archivos en inventario y
  // sonoridad mayor/menor correcta (I y V mayores [4,3], IV mayor [4,3]).
  test("45 tríadas: inventario + interválica mayor", () => {
    const inventory = new Set(NOTE_FILES);
    for (const scale of SCALES) {
      for (const triad of ["I", "IV", "V"] as const) {
        const files = triadFiles(scale, triad, "Piano").map((f) =>
          f.replace("Piano/", "").replace(".mp3", ""));
        for (const f of files) {
          if (!inventory.has(f)) return `${scale} ${triad}: ${f} no está en NOTE_FILES`;
        }
        const midis = files.map((f) => {
          const pc = getPitchClass(f);
          return writtenMidi(pc, Number(f.slice(-1)));
        });
        const ints = [midis[1] - midis[0], midis[2] - midis[1]];
        if (ints[0] !== 4 || ints[1] !== 3) {
          return `${scale} ${triad}: intervalos ${ints.join(",")} (esperado 4,3)`;
        }
      }
    }
    return true;
  });

  // Selector: bolsa barajada con {I, IV, V} de C — cobertura por ciclo y sin
  // repetición consecutiva en 48 sorteos.
  test("selector {I,IV,V}: cobertura por ciclo, sin repetición seguida", () => {
    const set = buildQuestionSet("C", new Set<Degree>(["I", "IV", "V"]), "Piano");
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

  // Selector: con los 12 grados, los 12 aparecen antes de repetirse alguno.
  test("selector 12 grados: cobertura completa por ciclo", () => {
    const all = new Set<Degree>([
      "I", "II", "III", "IV", "V", "VI", "VII", "IVly", "VImen", "IIfr", "VIIST", "IIImen",
    ]);
    const set = buildQuestionSet("E♭", all, "Piano");
    const sel = makeDegreeNoteSelector();
    const draws: string[] = [];
    for (let i = 0; i < 24; i++) draws.push(sel.next(set)!.pitchClass);
    if (new Set(draws.slice(0, 12)).size !== 12) return `1er ciclo: ${draws.slice(0, 12).join(",")}`;
    if (new Set(draws.slice(12, 24)).size !== 12) return `2º ciclo: ${draws.slice(12, 24).join(",")}`;
    return true;
  });

  // audioUrl codifica ♭, ##, espacio.
  test("audioUrl codifica ♭ / # / espacio", () => {
    const u1 = audioUrl("Piano/B♭♭3.mp3");
    const u2 = audioUrl("Coro/F##4.mp3");
    const u3 = audioUrl(tonicChordPath("Fagot", "E♭"));
    if (!u1.endsWith("/Piano/B%E2%99%AD%E2%99%AD3.mp3")) return u1;
    if (!u2.endsWith("/Coro/F%23%234.mp3")) return u2;
    if (!u3.includes("/Major%20Chords/")) return u3;
    return true;
  });

  return results;
}

// ---------------------------------------------------------------------------
// Sondas de red (Audio element — el bucket no necesita CORS para <audio>)
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

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------
export function mountDevHarness(): void {
  const player = new SamplePlayer();
  player.setVolume(0.8);

  const panel = document.createElement("div");
  panel.id = "dev-harness";
  panel.style.cssText = [
    "position:fixed", "top:8px", "right:8px", "z-index:9999", "width:300px",
    "background:rgba(20,20,26,0.96)", "border:1px solid #c9a227", "border-radius:8px",
    "padding:10px", "font:12px/1.5 monospace", "color:#f3ead7", "max-height:92vh",
    "overflow-y:auto",
  ].join(";");

  const log = (msg: string, color = "#f3ead7") => {
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
      "display:block;width:100%;margin:3px 0;padding:4px;background:#4a2c1a;color:#f3ead7;" +
      "border:1px solid #c9a227;border-radius:4px;cursor:pointer;font:inherit;text-align:left";
    b.onclick = fn;
    panel.appendChild(b);
  };

  const title = document.createElement("div");
  title.textContent = "⚙ F1 QA — Expreso Tonal";
  title.style.cssText = "font-weight:bold;color:#e8c65a;margin-bottom:6px";
  panel.appendChild(title);

  const out = document.createElement("div");
  out.style.cssText =
    "background:#111;border:1px solid #333;border-radius:4px;padding:6px;margin-top:6px;" +
    "max-height:40vh;overflow-y:auto;white-space:pre-wrap;word-break:break-all";

  // --- Pruebas puras (auto) ---
  const pure = runPureTests();

  btn("▶ Nota B♭♭3 (Piano)", () => void player.playNote("Piano/B♭♭3.mp3"));
  btn("▶ Nota F##4 (Coro)", () => void player.playNote("Coro/F##4.mp3"));
  btn("▶ Tríada V de C# (Piano)", () => void player.playTriad(triadFiles("C#", "V", "Piano")));
  btn("▶ Silbato-tónica E♭ (Coro)", () => void player.playTonicChord("Coro", "E♭"));
  btn("▶ Cadencia I–IV–V–I en C♭ (Piano)", () => {
    const gap = CADENCE_CHORD_GAP_S * 1000;
    void player.playTriad(triadFiles("C♭", "I", "Piano"));
    window.setTimeout(() => void player.playTriad(triadFiles("C♭", "IV", "Piano")), gap);
    window.setTimeout(() => void player.playTriad(triadFiles("C♭", "V", "Piano")), gap * 2);
    window.setTimeout(() => void player.playTonicChord("Piano", "C♭"), gap * 3);
  });
  btn("▶ Escala C mayor (walk, arcos §12)", () => {
    const files = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"].map((n) => `Piano/${n}.mp3`);
    void player.playScaleWalk(files, 350);
  });
  btn("▶ SFX acierto / error", () => {
    player.playCorrect();
    window.setTimeout(() => player.playIncorrect(), 700);
  });
  btn("🌐 Sondear 75 Major Chords (15×5)", () => {
    log("Sondeando 75 acordes de tónica…", "#e8c65a");
    const paths: string[] = [];
    for (const timbreDir of ["Piano", "Cello", "Corno", "Coro", "Fagot"]) {
      for (const scale of SCALES) paths.push(tonicChordPath(timbreDir, scale));
    }
    void probeAll(paths).then((failures) => {
      if (failures.length === 0) log("✔ 75/75 Major Chords OK", "#38d17c");
      else failures.forEach((f) => log(`✘ FALLA: ${f}`, "#e04545"));
    });
  });
  btn("🌐 Sondear muestras críticas (dobles alteraciones)", () => {
    const paths = [
      "Piano/B♭♭3.mp3", "Coro/F##4.mp3", "Fagot/A♭♭5.mp3", "Cello/E♭♭2.mp3",
      "Corno/G♭♭4.mp3", "Piano/D♭♭6.mp3", "Coro/B#2.mp3", "Fagot/E#3.mp3",
      "Piano/C♭7.mp3", "acierto.mp3", "error.mp3",
    ];
    log("Sondeando muestras críticas…", "#e8c65a");
    void probeAll(paths).then((failures) => {
      if (failures.length === 0) log(`✔ ${paths.length}/${paths.length} muestras críticas OK`, "#38d17c");
      else failures.forEach((f) => log(`✘ FALLA: ${f}`, "#e04545"));
    });
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
  (window as unknown as Record<string, unknown>).ExpresoQA = {
    player, scaleDegrees, triadFiles, buildQuestionSet, makeDegreeNoteSelector, audioUrl,
    probeUrl: (p: string) => probeUrl(p),
  };
  log("window.ExpresoQA disponible.", "#e8c65a");
}

export type { Scale };
