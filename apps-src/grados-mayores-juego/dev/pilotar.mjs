// Piloto headless del Expreso Tonal.
// Maneja GameStateManager con un reloj sintético: sin navegador, sin rAF, sin pixeles.
// Usa la API de Node de Vite para resolver TS y los alias "@/" del propio proyecto.
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "vite";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

const vite = await createServer({
  root: RAIZ,
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

const { GameStateManager } = await vite.ssrLoadModule("/src/game/state.ts");
const { SPEEDS, SEGMENT_LENGTH } = await vite.ssrLoadModule("/src/config.ts");
const { degreeOfPitchClass, DIATONIC_DEGREES } = await vite.ssrLoadModule("/src/music/degrees.ts");

/**
 * Corre un viaje completo.
 * @param politica (n) => "correcto" | "incorrecto" | "callar"  — qué hace el jugador en la decisión n
 */
export function viajar({ scale = "C", velocidad = "NORMAL", politica = () => "correcto", pasosPorUnidad = 1 } = {}) {
  const eventos = [];
  const efectos = { nota: 0, tonica: 0, acierto: 0, error: 0, desvioIni: 0, desvioFin: 0, revelacion: 0 };
  let ultimaPregunta = null;
  let snap = null;
  let llegada = null;

  const ports = {
    playQuestionNote: (s) => { efectos.nota++; ultimaPregunta = s; },
    playTonicChord: () => { efectos.tonica++; },
    playCorrectSfx: () => { efectos.acierto++; },
    playWrongSfx: () => { efectos.error++; },
    duckBed: () => {},
    setSwitch: () => {},
    setAmbientSuppressed: () => {},
    beginDetour: (info, startDistance) => { efectos.desvioIni++; eventos.push({ t: "desvio", grado: info.degree, desde: startDistance }); },
    playReveal: () => { efectos.revelacion++; },
    endDetour: () => { efectos.desvioFin++; },
    onChange: (s) => { snap = s; },
    onResolved: (info) => {
      eventos.push({ t: "resuelto", correcto: info.correct, sinRespuesta: info.timedOut, grado: info.degree, nota: info.pitchClass, respondio: info.answered });
    },
    onArrived: (info) => { llegada = info; },
  };

  const speed = SPEEDS.find((s) => s.id === velocidad);
  const juego = new GameStateManager(ports);
  juego.start({ scale, degrees: new Set(DIATONIC_DEGREES), timbre: "Piano", speed });
  juego.beginRolling();

  let distancia = 0;
  let decisiones = 0;
  let guardia = 0;
  const dt = 1 / pasosPorUnidad / speed.unitsPerSecond;

  while (juego.getPhase() !== "ARRIVED" && guardia < 400000) {
    guardia++;
    distancia += 1 / pasosPorUnidad;
    juego.tick(dt, distancia);

    if (juego.isQuestionLive() && ultimaPregunta) {
      const correcto = degreeOfPitchClass(scale, ultimaPregunta.pitchClass);
      const accion = politica(decisiones, snap);
      decisiones++;
      if (accion === "correcto") juego.answer(correcto);
      else if (accion === "incorrecto") {
        const malo = DIATONIC_DEGREES.find((d) => d !== correcto);
        juego.answer(malo);
      }
      // "callar" → no se responde: la ventana se agota sola al cruzar la aguja
      ultimaPregunta = null;
    }
  }

  return { llegada, eventos, efectos, snap, distancia, decisiones, agotado: guardia >= 400000 };
}

export async function cerrar() { await vite.close(); }

// ---------------------------------------------------------------------------
// CLI: `npm run qa:pilotar` corre los escenarios de referencia y cierra Vite.
// ---------------------------------------------------------------------------
const ESCENARIOS = [
  ["Viaje perfecto (20 aciertos)", () => "correcto"],
  ["Callar solo la 1ª",            (n) => (n === 0 ? "callar" : "correcto")],
  ["Fallar solo la 1ª",            (n) => (n === 0 ? "incorrecto" : "correcto")],
  ["Siempre callar",               () => "callar"],
  ["Siempre incorrecto",           () => "incorrecto"],
  ["Alternar acierto/fallo",       (n) => (n % 2 ? "incorrecto" : "correcto")],
];

// `file://` + argv[1] no coincide en Windows (contrabarras, y "C:" sin la tercera
// barra): con eso la guarda nunca entraba, el script abría vite y se colgaba sin
// ejecutar nada. `pathToFileURL` da la misma forma que `import.meta.url` en los dos.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const [nombre, politica] of ESCENARIOS) {
    const r = viajar({ politica });
    const res = r.eventos.filter((e) => e.t === "resuelto");
    console.log(`=== ${nombre} ===`);
    console.log(
      `  llegó: ${!!r.llegada} | decisiones: ${r.decisiones}` +
      ` | correctas: ${res.filter((e) => e.correcto).length}` +
      ` | sinRespuesta: ${res.filter((e) => e.sinRespuesta).length}` +
      ` | desvíos: ${r.eventos.filter((e) => e.t === "desvio").length}`
    );
    if (r.llegada) console.log(`  llegada: ${JSON.stringify(r.llegada)}`);
  }
  await cerrar();
}
