import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createAircraftPreview, type FlybyKind } from "../src/3d/flybys";
import { SKY_KEYFRAMES } from "../src/config";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = $<HTMLOutputElement>("status");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1600);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector("canvas")!, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.minDistance = 4; controls.maxDistance = 200;
const ambient = new THREE.AmbientLight(0xffffff, 1);
const sun = new THREE.DirectionalLight(0xffffff, 1.3);
sun.position.set(-30, 50, 40);
scene.add(ambient, sun);
const viewport = $("viewport");
new ResizeObserver(() => { const w = viewport.clientWidth, h = viewport.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }).observe(viewport);

// Cielo y luz del juego a la altura de cada capa (SKY_KEYFRAMES, a mitad de capa).
const LAYER_Y: Record<FlybyKind, number> = { plane: 225, jet: 375, strato: 525, satellite: 675 };
function applySky(kind: FlybyKind) {
  const y = LAYER_Y[kind];
  const i = SKY_KEYFRAMES.findIndex((k) => k.y > y);
  const a = SKY_KEYFRAMES[i - 1], b = SKY_KEYFRAMES[i], t = (y - a.y) / (b.y - a.y);
  scene.background = new THREE.Color(a.horizon).lerp(new THREE.Color(b.horizon), t);
  ambient.intensity = THREE.MathUtils.lerp(a.ambient, b.ambient, t);
  sun.intensity = THREE.MathUtils.lerp(a.sun, b.sun, t);
}

function view(distance: number) {
  camera.position.set(distance * 0.62, -distance * 0.25, distance * 0.74);
  controls.target.set(0, 0, 0); controls.update();
}

let current: Awaited<ReturnType<typeof createAircraftPreview>> | null = null;
let token = 0;
async function load() {
  const kind = $<HTMLSelectElement>("kind").value as FlybyKind;
  const mine = ++token;
  status.value = "Cargando modelo…";
  try {
    const next = await createAircraftPreview(kind);
    if (mine !== token) { next.dispose(scene); return; }
    current?.dispose(scene);
    current = next; scene.add(next.group); applySky(kind);
    status.value = "Modelo de Blender listo";
  } catch (error) { status.value = "No se pudo cargar el modelo. Recarga la página para reintentar."; console.error(error); }
}

let paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
const pause = $("pause");
const syncPause = () => { pause.textContent = paused ? "Reanudar animación" : "Pausar animación"; pause.setAttribute("aria-pressed", String(paused)); };
syncPause(); pause.onclick = () => { paused = !paused; syncPause(); };
$("far").onclick = () => view(60);
$("near").onclick = () => view(15);
$("kind").onchange = () => void load();
view(15);
void load();

const clock = new THREE.Clock();
let elapsed = 0, frames = 0, total = 0;
renderer.setAnimationLoop(() => {
  const realDt = clock.getDelta(), dt = Math.min(realDt, 0.05);
  controls.update();
  if (current && !paused) { elapsed += dt; current.update(dt, elapsed); current.group.position.set(0, 0, 0); }
  renderer.render(scene, camera); frames++; total += realDt;
  if (total > 1) { $("stats").textContent = `${Math.round(frames / total)} FPS · ${renderer.info.render.triangles.toLocaleString("es-MX")} triángulos · ${renderer.info.render.calls} llamadas de dibujo`; frames = 0; total = 0; }
});
