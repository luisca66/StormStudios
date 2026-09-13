import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.getElementById("ballena-canvas") as HTMLCanvasElement;
const lightingPreset = document.getElementById("lighting-preset") as HTMLSelectElement;
const swimSpeedInput = document.getElementById("swim-speed") as HTMLInputElement;
const swimSpeedVal = document.getElementById("swim-speed-val") as HTMLElement;
const bioGlowInput = document.getElementById("bio-glow") as HTMLInputElement;
const bioGlowVal = document.getElementById("bio-glow-val") as HTMLElement;
const btnSwim = document.getElementById("btn-swim") as HTMLButtonElement;
const btnRotate = document.getElementById("btn-rotate") as HTMLButtonElement;
const btnFocusGeneral = document.getElementById("btn-focus-general") as HTMLButtonElement;
const btnFocusHead = document.getElementById("btn-focus-head") as HTMLButtonElement;
const btnFocusHarness = document.getElementById("btn-focus-harness") as HTMLButtonElement;
const btnFocusTail = document.getElementById("btn-focus-tail") as HTMLButtonElement;
const statTris = document.getElementById("stat-tris") as HTMLElement;
const statDraws = document.getElementById("stat-draws") as HTMLElement;
const statFps = document.getElementById("stat-fps") as HTMLElement;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.position.set(22, 12, 28);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
controls.minDistance = 5;
controls.maxDistance = 120;
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
const hemiLight = new THREE.HemisphereLight(0x7090b8, 0x0a1424, 0.8);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffeedd, 2.5);
sunLight.position.set(25, 30, 20);
scene.add(sunLight);

const rimLight = new THREE.DirectionalLight(0x4de0b8, 1.8);
rimLight.position.set(-30, -10, -25);
scene.add(rimLight);

const warmFill = new THREE.DirectionalLight(0xffb070, 0.9);
warmFill.position.set(0, -20, 15);
scene.add(warmFill);

// Presets de iluminación estratosférica
interface Preset {
  bg: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  sunColor: number;
  sunIntensity: number;
  sunPos: [number, number, number];
  rimColor: number;
  rimIntensity: number;
}

const PRESETS: Record<string, Preset> = {
  "deep-space": {
    bg: 0x050914,
    hemiSky: 0x486b96,
    hemiGround: 0x03060c,
    hemiIntensity: 0.6,
    sunColor: 0xe6f0ff,
    sunIntensity: 2.2,
    sunPos: [20, 30, 25],
    rimColor: 0x4df3c4,
    rimIntensity: 2.0,
  },
  aurora: {
    bg: 0x04111c,
    hemiSky: 0x20a890,
    hemiGround: 0x051d28,
    hemiIntensity: 0.9,
    sunColor: 0x80ffdf,
    sunIntensity: 2.6,
    sunPos: [-20, 25, 20],
    rimColor: 0x00ffcc,
    rimIntensity: 3.2,
  },
  sunset: {
    bg: 0x1f1124,
    hemiSky: 0xffaa66,
    hemiGround: 0x1b0f24,
    hemiIntensity: 0.75,
    sunColor: 0xff7b39,
    sunIntensity: 3.4,
    sunPos: [35, 12, 10],
    rimColor: 0xffd27d,
    rimIntensity: 1.8,
  },
  "high-noon": {
    bg: 0x2b4f7c,
    hemiSky: 0xffffff,
    hemiGround: 0x3d5d7e,
    hemiIntensity: 1.0,
    sunColor: 0xfffae8,
    sunIntensity: 3.0,
    sunPos: [15, 45, 15],
    rimColor: 0xaad4ff,
    rimIntensity: 1.2,
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
  rimLight.color.setHex(p.rimColor);
  rimLight.intensity = p.rimIntensity;
}
lightingPreset.addEventListener("change", () => applyPreset(lightingPreset.value));
applyPreset("deep-space");

// Estrellas de fondo para contexto espacial / estratosférico
const starCount = 600;
const starGeom = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 160 + Math.random() * 120;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  starPositions[i * 3 + 2] = r * Math.cos(phi);
}
starGeom.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
const starMat = new THREE.PointsMaterial({
  color: 0xe0f2fe,
  size: 1.5,
  transparent: true,
  opacity: 0.8,
});
const stars = new THREE.Points(starGeom, starMat);
scene.add(stars);

// Estado de la ballena y partes
let whaleRoot: THREE.Group | null = null;
let wingLeft: THREE.Object3D | null = null;
let wingRight: THREE.Object3D | null = null;
let tailFin: THREE.Object3D | null = null;
const emissiveMaterials: { mat: THREE.MeshStandardMaterial; baseIntensity: number }[] = [];

let swimSpeed = 1.0;
let bioGlowMultiplier = 1.0;
let isSwimming = true;
let isAutoRotating = true;

const gltfLoader = new GLTFLoader();
const glbUrl = new URL("../art/blender/ballena-celeste.glb", import.meta.url).href;

gltfLoader.load(
  glbUrl,
  (gltf) => {
    whaleRoot = gltf.scene;
    scene.add(whaleRoot);

    let totalTris = 0;
    let drawCalls = 0;

    whaleRoot.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const geom = mesh.geometry;
        if (geom.index) {
          totalTris += geom.index.count / 3;
        } else if (geom.attributes.position) {
          totalTris += geom.attributes.position.count / 3;
        }
        drawCalls++;

        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (m && (m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            const stdMat = m as THREE.MeshStandardMaterial;
            if (stdMat.emissive && (stdMat.emissive.r > 0 || stdMat.emissive.g > 0 || stdMat.emissive.b > 0)) {
              emissiveMaterials.push({
                mat: stdMat,
                baseIntensity: stdMat.emissiveIntensity || 1.0,
              });
            }
          }
        });
      }

      if (child.name === "Aleta_Pectoral_Izq") {
        wingLeft = child;
      } else if (child.name === "Aleta_Pectoral_Der") {
        wingRight = child;
      } else if (child.name === "Aleta_Cola") {
        tailFin = child;
      }
    });

    statTris.textContent = Math.round(totalTris).toLocaleString();
    statDraws.textContent = String(drawCalls);
  },
  undefined,
  (err) => {
    console.error("Error al cargar ballena-celeste.glb:", err);
    statTris.textContent = "Error al cargar";
  }
);

// Controles interactivos
swimSpeedInput.addEventListener("input", () => {
  swimSpeed = parseFloat(swimSpeedInput.value) / 100;
  swimSpeedVal.textContent = `${swimSpeed.toFixed(1)}x`;
});

bioGlowInput.addEventListener("input", () => {
  bioGlowMultiplier = parseFloat(bioGlowInput.value) / 100;
  bioGlowVal.textContent = `${bioGlowMultiplier.toFixed(1)}x`;
  updateGlow(1.0);
});

function updateGlow(shimmer: number) {
  for (const item of emissiveMaterials) {
    item.mat.emissiveIntensity = item.baseIntensity * bioGlowMultiplier * shimmer;
  }
}

btnSwim.addEventListener("click", () => {
  isSwimming = !isSwimming;
  btnSwim.classList.toggle("active", isSwimming);
});

btnRotate.addEventListener("click", () => {
  isAutoRotating = !isAutoRotating;
  btnRotate.classList.toggle("active", isAutoRotating);
});

btnFocusGeneral.addEventListener("click", () => {
  camera.position.set(18, 10, 24);
  controls.target.set(-4, 0, 0);
  controls.update();
});

btnFocusHead.addEventListener("click", () => {
  camera.position.set(13, 3, 6);
  controls.target.set(6, 0.5, 0);
  controls.update();
});

btnFocusHarness.addEventListener("click", () => {
  camera.position.set(-1.5, 7.5, 5.5);
  controls.target.set(-1.5, 4.0, 0);
  controls.update();
});

btnFocusTail.addEventListener("click", () => {
  camera.position.set(-25, 4, 8);
  controls.target.set(-18.5, 0.5, 0);
  controls.update();
});

// Bucle de animación y renderizado
let lastTime = performance.now();
let animTime = 0;
let frameCount = 0;
let fpsLastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  if (isSwimming) {
    animTime += delta * swimSpeed;
    const t = animTime;

    // Aleteo de mantas pectorales desde los hombros (rotación sobre eje longitudinal X)
    const wingFlap = Math.sin(t * 1.6) * 0.15;
    const wingFeather = Math.cos(t * 1.6) * 0.04;

    if (wingLeft) {
      wingLeft.rotation.x = wingFlap;
      wingLeft.rotation.z = wingFeather;
    }
    if (wingRight) {
      wingRight.rotation.x = -wingFlap;
      wingRight.rotation.z = -wingFeather;
    }

    // Ondulación de aleta caudal (movimiento vertical primario cetáceo en Z + sutil guiñada en Y)
    if (tailFin) {
      tailFin.rotation.z = Math.sin(t * 1.6 - 1.0) * 0.16;
      tailFin.rotation.y = Math.cos(t * 1.6 - 1.2) * 0.04;
    }

    // Alabeo y cabeceo suave del cuerpo entero
    if (whaleRoot) {
      whaleRoot.position.y = Math.sin(t * 1.2) * 0.40;
      whaleRoot.rotation.z = Math.cos(t * 1.2) * 0.025;
      whaleRoot.rotation.x = Math.sin(t * 0.9) * 0.015;
    }

    // Resplandor bioluminiscente pulsante
    const shimmer = 0.85 + 0.25 * Math.sin(t * 2.4);
    updateGlow(shimmer);
  }

  // Giro suave automático de la órbita
  if (isAutoRotating && whaleRoot) {
    whaleRoot.rotation.y += delta * 0.12;
  }

  controls.update();
  renderer.render(scene, camera);

  // Monitoreo de FPS
  frameCount++;
  if (now - fpsLastTime >= 500) {
    const fps = Math.round((frameCount * 1000) / (now - fpsLastTime));
    statFps.textContent = `${fps} FPS`;
    frameCount = 0;
    fpsLastTime = now;
  }
}
animate();
