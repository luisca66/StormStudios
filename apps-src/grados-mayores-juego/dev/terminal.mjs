// Regresión de la POSICIÓN de la Terminal: que el edificio esté donde dice su distancia.
//
// El bug: `placeGroup` coloca la Terminal preguntándole a la vía con `frameAt`, y
// `frameAt` RECORTA en silencio lo que le pidas al final de la spline generada. El
// streaming solo va SEGMENTS_AHEAD por delante del tren, así que el `relocate` de cada
// desvío —que empuja la Terminal DETOUR_COST + 2 segmentos— caía siempre fuera: el
// número se movía y el edificio no. La vía acababa atravesando la catedral y la
// ceremonia montaba los arcos donde SÍ estaba la distancia, lejos, así que al final
// solo se veían los postes.
//
// `catedral.mjs` no podía cazarlo: valida la aritmética con un espejo de las constantes
// y nunca toca la vía ni la geometría. Aquí se usan la `Station` y el `TrackManager` de
// verdad y se compara la posición REAL del grupo contra la que le toca.
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

// Stub mínimo de canvas 2D: three solo guarda el canvas para las texturas, no lo sube a
// la GPU sin renderer. Un Proxy que se devuelve a sí mismo cubre gradientes y cadenas.
const ctx = new Proxy({}, {
  get: (t, k) => (k in t ? t[k] : (t[k] = () => ctx)),
  set: (t, k, v) => { t[k] = v; return true; },
});
const canvas = () => ({ width: 0, height: 0, style: {}, getContext: () => ctx });
globalThis.document = { createElement: canvas, createElementNS: canvas };

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  root: RAIZ, server: { middlewareMode: true }, appType: "custom", logLevel: "error",
});

const THREE = await vite.ssrLoadModule("three");
const { TrackManager, newTrackFrame } = await vite.ssrLoadModule("/src/3d/track.ts");
const { Station } = await vite.ssrLoadModule("/src/3d/station.ts");
const { SEGMENT_LENGTH, DETOUR_COST } = await vite.ssrLoadModule("/src/config.ts");

/** Lo que renderer.beginDetour aleja la Terminal por cada desvío. */
const DESVIO = (DETOUR_COST + 2) * SEGMENT_LENGTH;
/** Margen bueno para la referencia: la vía llega de sobra y `frameAt` no recorta. */
const HOLGURA = 400;
/** placeGroup baja el grupo esto para asentar la nave. */
const ASIENTO = 0.7;

const scene = new THREE.Scene();
const track = new TrackManager(scene);
track.reset(1);
const station = new Station(scene, track);
const frame = newTrackFrame();

/** Dónde le toca estar a la boca de la nave, con la vía extendida de sobra. */
function bocaEsperada(distancia) {
  track.ensureReach(distancia + HOLGURA);
  track.frameAt(distancia, frame);
  return frame.pos.clone();
}

// El tren rueda hasta el acto 3 y la Terminal se planta, como en revealStation.
const tren = 12 * SEGMENT_LENGTH;
track.ensureBuilt(tren);
let distancia = tren + 10 * SEGMENT_LENGTH;
station.build({ distance: distancia, tonicPitchClass: "C" });

const grupo = scene.children.find((hijo) => hijo.type === "Group");
if (!grupo) throw new Error("no encuentro el grupo de la Terminal en la escena");

/** Error entre donde está el edificio y donde dice su distancia que está. */
function desviacion() {
  const real = grupo.position.clone();
  real.y += ASIENTO;
  return real.distanceTo(bocaEsperada(station.stationDistance()));
}

let fallos = 0;
const comprobar = (nombre) => {
  const err = desviacion();
  const ok = err < 0.01;
  if (!ok) fallos++;
  console.log(
    nombre.padEnd(30),
    String(station.stationDistance()).padStart(8),
    (err.toFixed(2) + " u").padStart(12),
    ok ? "✔" : "✘ MAL PLANTADA",
  );
};

console.log("caso".padEnd(30), "distancia".padStart(8), "error".padStart(12));
comprobar("Al plantarse");
for (let i = 1; i <= 4; i++) {
  distancia += DESVIO;
  station.relocate(distancia);
  comprobar(`Tras ${i} desvío${i > 1 ? "s" : ""}`);
}

await vite.close();
console.log(fallos === 0
  ? "\n✔ la Terminal siempre está donde dice su distancia."
  : `\n✘ ${fallos} caso(s) con el edificio fuera de sitio.`);
process.exit(fallos === 0 ? 0 : 1);
