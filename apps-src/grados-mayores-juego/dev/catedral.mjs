// Regresión de la Terminal: que nunca quede CORTA respecto a la llegada real.
//
// El bug: la Terminal se planta una sola vez y solo se alejaba UN segmento por desvío,
// cuando un desvío alarga el viaje DETOUR_COST + 2. Con un fallo quedaba 140 u corta y
// el tren la pasaba de largo sin llegar nunca.
//
// Aquí se replica la colocación de `renderer.ts` sobre la lógica real del viaje y se
// comprueba el margen. Si alguien vuelve a tocar la fórmula, esto lo caza.
import { createServer } from "vite";

const RAIZ = new URL("..", import.meta.url).pathname;
const vite = await createServer({
  root: RAIZ, server: { middlewareMode: true }, appType: "custom", logLevel: "error",
});

const { GameStateManager } = await vite.ssrLoadModule("/src/game/state.ts");
const { SPEEDS, SEGMENT_LENGTH, DECISIONS_TO_ARRIVE, DETOUR_COST } =
  await vite.ssrLoadModule("/src/config.ts");
const { degreeOfPitchClass, DIATONIC_DEGREES } = await vite.ssrLoadModule("/src/music/degrees.ts");

// Espejo de las constantes privadas de renderer.ts.
const STATION_REVEAL_AT = 0.55;
const STATION_SLACK_SEGMENTS = 2;
/** Lo que renderer.beginDetour aleja la Terminal por cada desvío. */
const DETOUR_SHIFT_SEGMENTS = DETOUR_COST + 2;

function simular(politica) {
  let pregunta = null, snap = null, plantada = null, desvios = 0;
  const ports = {
    playQuestionNote: (s) => { pregunta = s; },
    playTonicChord(){}, playCorrectSfx(){}, playWrongSfx(){}, duckBed(){}, setSwitch(){},
    setAmbientSuppressed(){}, playReveal(){}, endDetour(){}, onResolved(){}, onArrived(){},
    onChange: (s) => { snap = s; },
    beginDetour: () => {
      desvios++;
      if (plantada !== null) plantada += DETOUR_SHIFT_SEGMENTS * SEGMENT_LENGTH;
    },
  };

  const speed = SPEEDS.find((s) => s.id === "NORMAL");
  const juego = new GameStateManager(ports);
  juego.start({ scale: "C", degrees: new Set(DIATONIC_DEGREES), timbre: "Piano", speed });
  juego.beginRolling();

  let d = 0, n = 0, guardia = 0;
  const paso = 0.5, dt = paso / speed.unitsPerSecond;
  while (juego.getPhase() !== "ARRIVED" && guardia++ < 200000) {
    d += paso;
    juego.tick(dt, d);

    if (plantada === null && snap && snap.progress / snap.total >= STATION_REVEAL_AT) {
      const pend = Math.max(1, (1 - snap.progress / snap.total) * DECISIONS_TO_ARRIVE);
      plantada = d + (pend + STATION_SLACK_SEGMENTS) * SEGMENT_LENGTH;
    }
    if (juego.isQuestionLive() && pregunta) {
      const correcto = degreeOfPitchClass("C", pregunta.pitchClass);
      const accion = politica(n++, snap);
      if (accion === "correcto") juego.answer(correcto);
      else if (accion === "incorrecto") juego.answer(DIATONIC_DEGREES.find((x) => x !== correcto));
      pregunta = null;
    }
  }
  return { plantada, llegada: d, desvios, llego: juego.getPhase() === "ARRIVED" };
}

const CASOS = [
  ["Perfecto (0 fallos)",              () => "correcto"],
  ["1 fallo tras plantarse",           (n) => (n === 12 ? "incorrecto" : "correcto")],
  ["2 fallos tras plantarse",          (n) => ([12, 14].includes(n) ? "incorrecto" : "correcto")],
  ["3 fallos tras plantarse",          (n) => ([12, 14, 16].includes(n) ? "incorrecto" : "correcto")],
  ["5 fallos seguidos tras plantarse", (n) => (n >= 12 && n <= 16 ? "incorrecto" : "correcto")],
  ["1 fallo antes de plantarse",       (n) => (n === 3 ? "incorrecto" : "correcto")],
  ["Callar tras plantarse",            (n) => (n === 12 ? "callar" : "correcto")],
];

let fallos = 0;
console.log("caso".padEnd(36), "catedral".padStart(9), "llegada".padStart(9), "margen".padStart(9));
for (const [nombre, politica] of CASOS) {
  const r = simular(politica);
  const margen = r.plantada - r.llegada;
  const ok = r.llego && margen >= 0;
  if (!ok) fallos++;
  console.log(
    nombre.padEnd(36),
    r.plantada.toFixed(0).padStart(9),
    r.llegada.toFixed(0).padStart(9),
    (margen >= 0 ? "+" + margen.toFixed(0) : margen.toFixed(0)).padStart(9),
    ok ? "✔" : "✘ LA PASA",
  );
}

await vite.close();
console.log(fallos === 0
  ? `\n✔ ${CASOS.length}/${CASOS.length}: la Terminal nunca queda corta.`
  : `\n✘ ${fallos} caso(s) donde el tren pasa la Terminal sin llegar.`);
process.exit(fallos === 0 ? 0 : 1);
