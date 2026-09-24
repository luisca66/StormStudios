// Inspector de modelos de Blender de todos los juegos. Abre el JSON de `kit.export_parts` o el GLB
// convertido (`npm run convert-all` los deja en .cache/glb) con el cargador común.
//
// Parámetros de URL (los usan las pruebas automáticas):
//   ?model=<juego>/<modelo>  &format=json|none|meshopt|meshopt-q  &view=front|three-quarter|side|top|back
//   ?src=<url>  abre un archivo suelto (también se puede arrastrar un .glb o .json a la ventana)
//   &frame=cx,cy,cz,r  encuadre fijo (si no, se ajusta a la caja del modelo)
//   &preset=<id de presets.ts>  luz de un nivel   &distance=<u>  cámara a la distancia de juego
//   &capture=1  sin panel, sin giro; al terminar el primer cuadro pone window.__inspector.ready = true

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildModel, disposeObject, modelStats, parseModel, type BuiltModel, type ModelData } from "../src";
import { PRESETS, applyPreset } from "./presets";

type Format = "json" | "none" | "meshopt" | "meshopt-q";
type View = "front" | "three-quarter" | "side" | "top" | "back";

const FORMATS: { id: Format; label: string }[] = [
  { id: "json", label: "JSON" },
  { id: "none", label: "GLB" },
  { id: "meshopt", label: "GLB exacto" },
  { id: "meshopt-q", label: "GLB ligero" },
];
const VIEWS: { id: View; label: string }[] = [
  { id: "front", label: "Frente" },
  { id: "three-quarter", label: "¾" },
  { id: "side", label: "Lado" },
  { id: "top", label: "Arriba" },
  { id: "back", label: "Atrás" },
];

// Modelos de los juegos: apps-src/<juego>/src/**/assets/**/*.json. Los que no tienen `meshes`
// (cabinas del Expreso y de la Batisfera, formato anterior) se avisan al abrirlos.
const jsonUrls = import.meta.glob("../../*/src/**/assets/**/*.json", { query: "?url", import: "default", eager: true }) as Record<string, string>;
const glbUrls = import.meta.glob("../.cache/glb/**/*.glb", { query: "?url", import: "default", eager: true }) as Record<string, string>;

interface Entry { id: string; game: string; name: string; urls: Partial<Record<Format, string>> }

const entries = new Map<string, Entry>();
for (const [file, url] of Object.entries(jsonUrls)) {
  const match = file.match(/^\.\.\/\.\.\/([^/]+)\/src\/.*\/([^/]+)\.json$/);
  if (!match || match[1] === "shared-3d") continue;
  const [, game, name] = match;
  const id = `${game}/${name}`;
  entries.set(id, { id, game, name, urls: { json: url } });
}
for (const [file, url] of Object.entries(glbUrls)) {
  const match = file.match(/\.cache\/glb\/([^/]+)\/([^/]+)\.(none|meshopt|meshopt-q)\.glb$/);
  if (!match) continue;
  const entry = entries.get(`${match[1]}/${match[2]}`);
  if (entry) entry.urls[match[3] as Format] = url;
}

const params = new URLSearchParams(location.search);
const capture = params.has("capture");
if (capture) document.body.classList.add("capture");

// La luz sale de un preset: "neutro" (estudio, para revisar forma y normales) o la de un nivel.
const stage = document.getElementById("stage")!;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(capture ? 1 : Math.min(devicePixelRatio, 2));
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const studio = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
let lighting: THREE.Group | undefined;

const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 5000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = !capture;

let current: { built: BuiltModel; model: ModelData; helpers: THREE.Object3D[] } | undefined;
let radius = 1;
const state = {
  id: params.get("model") ?? [...entries.keys()][0],
  format: (params.get("format") as Format) ?? "json",
  view: (params.get("view") as View) ?? "three-quarter",
  preset: PRESETS.some((p) => p.id === params.get("preset")) ? params.get("preset")! : "neutro",
  /** Distancia de juego (unidades del modelo): la cámara se aleja a esa distancia y la niebla actúa. */
  distance: Number(params.get("distance")) || 0,
  spin: !capture,
};

declare global {
  interface Window { __inspector: { ready: boolean; error?: string; stats?: unknown } }
}
window.__inspector = { ready: false };

function resize(): void {
  const width = stage.clientWidth || innerWidth;
  const height = stage.clientHeight || innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function placeCamera(view: View): void {
  const directions: Record<View, THREE.Vector3> = {
    front: new THREE.Vector3(0, 0.15, 1),
    "three-quarter": new THREE.Vector3(1, 0.55, 1.1),
    side: new THREE.Vector3(1, 0.15, 0),
    top: new THREE.Vector3(0, 1, 0.001),
    back: new THREE.Vector3(0, 0.15, -1),
  };
  const distance = state.distance || radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.05;
  camera.position.copy(controls.target).addScaledVector(directions[view].normalize(), distance);
  camera.near = Math.max(distance - radius * 2, distance / 100, 0.01);
  camera.far = distance + radius * 20;
  camera.updateProjectionMatrix();
  controls.update();
}

/** Archivo suelto: `?src=<url>` o arrastrado a la ventana (entregas de Astra, pruebas de Blender). */
let loose: { name: string; buffer?: ArrayBuffer; url?: string } | undefined = params.get("src") ? { name: params.get("src")!, url: params.get("src")! } : undefined;

async function open(): Promise<void> {
  const entry = loose ? undefined : entries.get(state.id);
  const url = loose ? loose.url : entry?.urls[state.format];
  const statsTable = document.getElementById("stats")!;
  if (current) {
    scene.remove(current.built.root);
    disposeObject(current.built.root);
    for (const helper of current.helpers) scene.remove(helper);
    current = undefined;
  }
  if (!loose && (!entry || !url)) {
    statsTable.innerHTML = `<tr><td class="error">${entry ? "Falta el GLB: corre npm run convert-all" : "Modelo desconocido"}</td></tr>`;
    window.__inspector = { ready: true, error: "missing" };
    return;
  }
  try {
    const buffer = loose?.buffer ?? await (await fetch(url!)).arrayBuffer();
    const started = performance.now();
    const model = await parseModel(buffer);
    const parseMs = performance.now() - started;
    if (!model.parts.length) throw new Error("Sin partes: formato anterior a kit.export_parts");
    const built = buildModel(model, { emissive: true, vertexEmission: { cacheKey: "inspector" } });
    scene.add(built.root);
    // `frame=cx,cy,cz,r` fija el encuadre: la prueba visual usa el del JSON para todos los formatos
    // (gltfpack quita triángulos de área cero que, aunque no se ven, agrandan la caja).
    const frame = params.get("frame")?.split(",").map(Number);
    const sphere = frame?.length === 4
      ? new THREE.Sphere(new THREE.Vector3(frame[0], frame[1], frame[2]), frame[3])
      : new THREE.Box3().setFromObject(built.root).getBoundingSphere(new THREE.Sphere());
    radius = Math.max(sphere.radius, 1e-3);
    controls.target.copy(sphere.center);
    const helpers = model.parts.map((part) => {
      const axes = new THREE.AxesHelper(radius * 0.08);
      axes.position.copy(part.pivot);
      axes.visible = (document.getElementById("pivots") as HTMLInputElement).checked;
      scene.add(axes);
      return axes;
    });
    current = { built, model, helpers };
    setPreset(state.preset);
    placeCamera(state.view);
    applyWireframe();
    renderParts();
    renderer.render(scene, camera);
    const info = modelStats(model);
    window.__inspector = { ready: false, stats: { ...info, bytes: buffer.byteLength, parseMs, frame: [...sphere.center.toArray(), radius] } };
    statsTable.innerHTML = [
      ["Archivo", `${(buffer.byteLength / 1024).toFixed(0)} KB`],
      ["Lectura", `${parseMs.toFixed(0)} ms`],
      ["Triángulos", info.triangles.toLocaleString("es-MX")],
      ["Vértices", info.vertices.toLocaleString("es-MX")],
      ["Partes (draw calls)", info.drawCalls],
      ["Materiales distintos", info.materials],
      ["Color por vértice", info.vertexColors ? "sí" : "no"],
      ["Emisión por vértice", info.vertexEmission ? "sí" : "no"],
      ["Radio", radius.toFixed(2)],
    ].map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");
    // Listo después de un cuadro completo (los shaders ya compilados).
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__inspector.ready = true; }));
  } catch (error) {
    statsTable.innerHTML = `<tr><td class="error">${(error as Error).message}</td></tr>`;
    window.__inspector = { ready: true, error: (error as Error).message };
  }
}

function setPreset(id: string): void {
  state.preset = id;
  if (lighting) {
    scene.remove(lighting);
    disposeObject(lighting, { geometries: true });
  }
  const box = current ? new THREE.Box3().setFromObject(current.built.root) : new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
  lighting = applyPreset(PRESETS.find((p) => p.id === id) ?? PRESETS[0], scene, renderer, studio, box);
}

function applyWireframe(): void {
  const on = (document.getElementById("wireframe") as HTMLInputElement).checked;
  for (const mesh of current?.built.meshes ?? []) mesh.material.wireframe = on;
}

function renderParts(): void {
  const list = document.getElementById("parts")!;
  list.innerHTML = "";
  for (const mesh of current?.built.meshes ?? []) {
    const label = document.createElement("label");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = true;
    box.addEventListener("change", () => { mesh.visible = box.checked; });
    const tris = (mesh.geometry.index?.count ?? 0) / 3;
    const segment = mesh.userData.segment !== undefined ? ` · ${mesh.userData.segment}` : "";
    label.append(box, `${mesh.userData.part}${segment} — ${mesh.name}`);
    const small = document.createElement("small");
    small.textContent = tris.toLocaleString("es-MX");
    label.append(small);
    list.append(label);
  }
}

function syncUrl(): void {
  if (capture) return;
  const url = new URL(location.href);
  url.searchParams.set("model", state.id);
  url.searchParams.set("format", state.format);
  url.searchParams.set("view", state.view);
  url.searchParams.set("preset", state.preset);
  history.replaceState(null, "", url);
}

function buildUi(): void {
  const select = document.getElementById("model") as HTMLSelectElement;
  const byGame = new Map<string, Entry[]>();
  for (const entry of entries.values()) byGame.set(entry.game, [...(byGame.get(entry.game) ?? []), entry]);
  for (const [game, list] of [...byGame].sort()) {
    const group = document.createElement("optgroup");
    group.label = game;
    for (const entry of list.sort((a, b) => a.name.localeCompare(b.name))) group.append(new Option(entry.name, entry.id, false, entry.id === state.id));
    select.append(group);
  }
  select.addEventListener("change", () => { state.id = select.value; syncUrl(); void open(); });

  const buttons = <T extends string>(container: string, items: { id: T; label: string }[], get: () => T, set: (v: T) => void) => {
    const root = document.getElementById(container)!;
    const refresh = () => root.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === get())));
    for (const item of items) {
      const button = document.createElement("button");
      button.textContent = item.label;
      button.dataset.id = item.id;
      button.addEventListener("click", () => { set(item.id); refresh(); syncUrl(); });
      root.append(button);
    }
    refresh();
  };
  const presetSelect = document.getElementById("preset") as HTMLSelectElement;
  for (const preset of PRESETS) presetSelect.append(new Option(preset.label, preset.id, false, preset.id === state.preset));
  presetSelect.addEventListener("change", () => { setPreset(presetSelect.value); syncUrl(); });
  buttons("formats", FORMATS, () => state.format, (f) => { state.format = f; void open(); });
  buttons("views", VIEWS, () => state.view, (v) => { state.view = v; placeCamera(v); });
  document.getElementById("wireframe")!.addEventListener("change", applyWireframe);
  document.getElementById("pivots")!.addEventListener("change", (e) => {
    for (const helper of current?.helpers ?? []) helper.visible = (e.target as HTMLInputElement).checked;
  });
  (document.getElementById("spin") as HTMLInputElement).addEventListener("change", (e) => { state.spin = (e.target as HTMLInputElement).checked; });
}

addEventListener("dragover", (event) => event.preventDefault());
addEventListener("drop", async (event) => {
  event.preventDefault();
  const file = event.dataTransfer?.files[0];
  if (!file) return;
  loose = { name: file.name, buffer: await file.arrayBuffer() };
  (document.getElementById("model") as HTMLSelectElement).append(new Option(`↓ ${file.name}`, "", true, true));
  void open();
});
document.getElementById("model")?.addEventListener("change", () => { loose = undefined; });

addEventListener("resize", resize);
resize();
if (!capture) buildUi();
void open();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  if (state.spin && current) current.built.root.rotation.y += delta * 0.3;
  controls.update();
  renderer.render(scene, camera);
});
