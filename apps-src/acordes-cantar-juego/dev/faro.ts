import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.getElementById("faro-canvas") as HTMLCanvasElement;
const lightingPreset = document.getElementById("lighting-preset") as HTMLSelectElement;
const beamSpeedInput = document.getElementById("beam-speed") as HTMLInputElement;
const beamSpeedVal = document.getElementById("beam-speed-val") as HTMLElement;
const btnRotate = document.getElementById("btn-rotate") as HTMLButtonElement;
const btnBeam = document.getElementById("btn-beam") as HTMLButtonElement;
const btnFocusTower = document.getElementById("btn-focus-tower") as HTMLButtonElement;
const btnFocusPeak = document.getElementById("btn-focus-peak") as HTMLButtonElement;
const statTris = document.getElementById("stat-tris") as HTMLElement;
const statDraws = document.getElementById("stat-draws") as HTMLElement;
const statFps = document.getElementById("stat-fps") as HTMLElement;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 800);
camera.position.set(42, 32, 45);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 20, 0);
controls.minDistance = 6;
controls.maxDistance = 140;
controls.update();

function resize() {
  const parent = canvas.parentElement!;
  const w = parent.clientWidth;
  const h = parent.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// Iluminación
const hemiLight = new THREE.HemisphereLight(0xffe8cf, 0x223554, 0.6);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffb86c, 3.2);
sunLight.position.set(-30, 25, 20);
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0x6080b0, 0.9);
fillLight.position.set(25, 20, -25);
scene.add(fillLight);

// Presets de iluminación
interface Preset {
  bg: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  sunColor: number;
  sunIntensity: number;
  sunPos: [number, number, number];
}

const PRESETS: Record<string, Preset> = {
  dusk: {
    bg: 0x111c2e,
    hemiSky: 0xffcc99,
    hemiGround: 0x1a2b42,
    hemiIntensity: 0.6,
    sunColor: 0xff8c42,
    sunIntensity: 3.5,
    sunPos: [-35, 20, 15],
  },
  dawn: {
    bg: 0x223654,
    hemiSky: 0xffe2b8,
    hemiGround: 0x2c3b52,
    hemiIntensity: 0.7,
    sunColor: 0xffd99a,
    sunIntensity: 2.8,
    sunPos: [35, 18, -25],
  },
  day: {
    bg: 0x5a94d4,
    hemiSky: 0xffffff,
    hemiGround: 0x769bbf,
    hemiIntensity: 0.85,
    sunColor: 0xfffcf2,
    sunIntensity: 2.4,
    sunPos: [20, 50, 20],
  },
  night: {
    bg: 0x050813,
    hemiSky: 0x304870,
    hemiGround: 0x070c18,
    hemiIntensity: 0.35,
    sunColor: 0x88bbff,
    sunIntensity: 0.6,
    sunPos: [-20, 30, -20],
  },
};

function applyPreset(id: string) {
  const p = PRESETS[id];
  if (!p) return;
  scene.background = new THREE.Color(p.bg);
  hemiLight.color.setHex(p.hemiSky);
  hemiLight.groundColor.setHex(p.hemiGround);
  hemiLight.intensity = p.hemiIntensity;
  sunLight.color.setHex(p.sunColor);
  sunLight.intensity = p.sunIntensity;
  sunLight.position.set(...p.sunPos);
}
lightingPreset.addEventListener("change", () => applyPreset(lightingPreset.value));
applyPreset("dusk");

// Carga del modelo GLB
let faroGroup: THREE.Group | null = null;
let rotatorGroup: THREE.Object3D | null = null;
let beamMesh: THREE.Mesh | null = null;
let beamSpeed = 1.0;
let autoRotate = true;
let beamActive = true;

const gltfLoader = new GLTFLoader();
const glbUrl = new URL("../art/blender/faro-atmosferico.glb", import.meta.url).href;

gltfLoader.load(
  glbUrl,
  (gltf) => {
    faroGroup = gltf.scene;
    scene.add(faroGroup);

    let totalTris = 0;
    let drawCalls = 0;

    faroGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const geom = mesh.geometry;
        if (geom.index) {
          totalTris += geom.index.count / 3;
        } else if (geom.attributes.position) {
          totalTris += geom.attributes.position.count / 3;
        }
        drawCalls++;

        // Ajuste de materiales
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mesh.name.toLowerCase().includes("haz") || mat.name.toLowerCase().includes("haz")) {
            mat.transparent = true;
            mat.opacity = 0.35;
            mat.depthWrite = false;
            mat.blending = THREE.AdditiveBlending;
            beamMesh = mesh;
          }
        }
      }

      if (child.name === "Faro_Linterna_Giratoria") {
        rotatorGroup = child;
      }
    });

    statTris.textContent = Math.round(totalTris).toLocaleString();
    statDraws.textContent = String(drawCalls);
  },
  undefined,
  (err) => {
    console.error("Error al cargar faro-atmosferico.glb:", err);
    statTris.textContent = "Error al cargar";
  }
);

// Controles
beamSpeedInput.addEventListener("input", () => {
  beamSpeed = parseFloat(beamSpeedInput.value) / 100;
  beamSpeedVal.textContent = `${beamSpeed.toFixed(1)}x`;
});

btnRotate.addEventListener("click", () => {
  autoRotate = !autoRotate;
  btnRotate.classList.toggle("active", autoRotate);
});

btnBeam.addEventListener("click", () => {
  beamActive = !beamActive;
  btnBeam.classList.toggle("active", beamActive);
  if (beamMesh) beamMesh.visible = beamActive;
});

btnFocusTower.addEventListener("click", () => {
  camera.position.set(16, 38, 18);
  controls.target.set(0, 34, 0);
  controls.update();
});

btnFocusPeak.addEventListener("click", () => {
  camera.position.set(42, 32, 45);
  controls.target.set(0, 20, 0);
  controls.update();
});

// Bucle de animación
let lastTime = performance.now();
let frameCount = 0;
let fpsLastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastTime) / 1000;
  lastTime = now;

  // Rotación del faro
  if (rotatorGroup && beamActive) {
    rotatorGroup.rotation.z += delta * 1.4 * beamSpeed; // En glTF el eje vertical de Blender Z suele mapearse
  }

  // Órbita lenta de cámara
  if (autoRotate && faroGroup) {
    faroGroup.rotation.y += delta * 0.12;
  }

  controls.update();
  renderer.render(scene, camera);

  frameCount++;
  if (now - fpsLastTime >= 500) {
    const fps = Math.round((frameCount * 1000) / (now - fpsLastTime));
    statFps.textContent = `${fps} FPS`;
    frameCount = 0;
    fpsLastTime = now;
  }
}
animate();
