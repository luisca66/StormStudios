import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Elementos UI
const canvas = document.getElementById("cloud-canvas") as HTMLCanvasElement;
const lightingPreset = document.getElementById("lighting-preset") as HTMLSelectElement;
const sunYawInput = document.getElementById("sun-yaw") as HTMLInputElement;
const sunYawVal = document.getElementById("sun-yaw-val") as HTMLElement;
const sunPitchInput = document.getElementById("sun-pitch") as HTMLInputElement;
const sunPitchVal = document.getElementById("sun-pitch-val") as HTMLElement;
const btnRotate = document.getElementById("btn-rotate") as HTMLButtonElement;
const btnWire = document.getElementById("btn-wire") as HTMLButtonElement;
const btnResetCam = document.getElementById("btn-reset-cam") as HTMLButtonElement;
const statTris = document.getElementById("stat-tris") as HTMLElement;
const statVerts = document.getElementById("stat-verts") as HTMLElement;
const statDraws = document.getElementById("stat-draws") as HTMLElement;
const statFps = document.getElementById("stat-fps") as HTMLElement;

// Escena, Cámara y Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
camera.position.set(14, 8, 16);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1.5, 0);
controls.minDistance = 4;
controls.maxDistance = 50;
controls.update();

// Redimensión adaptativa
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

// Luces
const hemiLight = new THREE.HemisphereLight(0xfff0d4, 0x3d5a80, 0.7);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffe2b3, 2.5);
sunLight.castShadow = false;
scene.add(sunLight);

const rimLight = new THREE.DirectionalLight(0xffeed6, 1.2);
scene.add(rimLight);

function updateSunPosition() {
  const yawDeg = parseFloat(sunYawInput.value);
  const pitchDeg = parseFloat(sunPitchInput.value);
  sunYawVal.textContent = `${yawDeg}°`;
  sunPitchVal.textContent = `${pitchDeg}°`;

  const yaw = THREE.MathUtils.degToRad(yawDeg);
  const pitch = THREE.MathUtils.degToRad(pitchDeg);
  const dist = 30;

  const x = dist * Math.cos(pitch) * Math.sin(yaw);
  const y = dist * Math.sin(pitch);
  const z = dist * Math.cos(pitch) * Math.cos(yaw);
  sunLight.position.set(x, y, z);

  // Contraluz opuesto
  rimLight.position.set(-x * 0.7, y * 0.4, -z * 0.7);
}
sunYawInput.addEventListener("input", updateSunPosition);
sunPitchInput.addEventListener("input", updateSunPosition);
updateSunPosition();

// Presets de iluminación atmosférica
interface Preset {
  bg: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  sunColor: number;
  sunIntensity: number;
  rimColor: number;
  sunYaw: number;
  sunPitch: number;
}

const PRESETS: Record<string, Preset> = {
  sunrise: {
    bg: 0x1a3354,
    hemiSky: 0xffe2be,
    hemiGround: 0x324765,
    hemiIntensity: 0.75,
    sunColor: 0xffb766,
    sunIntensity: 3.0,
    rimColor: 0xffeed4,
    sunYaw: 45,
    sunPitch: 22,
  },
  noon: {
    bg: 0x5b9ee0,
    hemiSky: 0xffffff,
    hemiGround: 0x769bbf,
    hemiIntensity: 0.9,
    sunColor: 0xfffcf5,
    sunIntensity: 2.2,
    rimColor: 0xe0f0ff,
    sunYaw: 120,
    sunPitch: 65,
  },
  sunset: {
    bg: 0x2b1c3d,
    hemiSky: 0xff9977,
    hemiGround: 0x3d2b52,
    hemiIntensity: 0.8,
    sunColor: 0xff5533,
    sunIntensity: 3.2,
    rimColor: 0xffbb88,
    sunYaw: 220,
    sunPitch: 14,
  },
  stratosphere: {
    bg: 0x050716,
    hemiSky: 0x385585,
    hemiGround: 0x0a1020,
    hemiIntensity: 0.4,
    sunColor: 0xfff8ed,
    sunIntensity: 3.8,
    rimColor: 0x88ccff,
    sunYaw: 300,
    sunPitch: 40,
  }
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
  rimLight.color.setHex(p.rimColor);

  sunYawInput.value = String(p.sunYaw);
  sunPitchInput.value = String(p.sunPitch);
  updateSunPosition();
}
lightingPreset.addEventListener("change", () => applyPreset(lightingPreset.value));
applyPreset("sunrise");

const cloudOpacityInput = document.getElementById("cloud-opacity") as HTMLInputElement;
const cloudOpacityVal = document.getElementById("cloud-opacity-val") as HTMLElement;

let currentOpacity = 0.82;
const cloudMaterials: THREE.MeshStandardMaterial[] = [];

if (cloudOpacityInput && cloudOpacityVal) {
  cloudOpacityInput.addEventListener("input", () => {
    currentOpacity = parseFloat(cloudOpacityInput.value) / 100;
    cloudOpacityVal.textContent = `${cloudOpacityInput.value}%`;
    for (const mat of cloudMaterials) {
      mat.opacity = currentOpacity;
    }
  });
}

// Carga del modelo GLB generado en Blender
let cloudGroup: THREE.Group | null = null;
let isWireframe = false;
let autoRotate = true;

const gltfLoader = new GLTFLoader();
const glbUrl = new URL("../art/blender/nube-cumulo.glb", import.meta.url).href;

gltfLoader.load(
  glbUrl,
  (gltf) => {
    cloudGroup = gltf.scene;
    scene.add(cloudGroup);

    let totalTris = 0;
    let totalVerts = 0;
    let drawCalls = 0;

    cloudGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const geom = mesh.geometry;
        totalVerts += geom.attributes.position ? geom.attributes.position.count : 0;
        if (geom.index) {
          totalTris += geom.index.count / 3;
        } else if (geom.attributes.position) {
          totalTris += geom.attributes.position.count / 3;
        }
        drawCalls++;

        if (mesh.material) {
          const mat = (mesh.material as THREE.Material).clone() as THREE.MeshStandardMaterial;
          mat.roughness = 0.85;
          mat.metalness = 0.0;
          mat.transparent = true;
          mat.opacity = currentOpacity;
          mat.depthWrite = false;
          mat.side = THREE.DoubleSide;

          mat.onBeforeCompile = (shader) => {
            shader.vertexShader = `
              varying float vViewDist;
              ${shader.vertexShader}
            `.replace(
              `#include <fog_vertex>`,
              `#include <fog_vertex>
              vViewDist = -mvPosition.z;`
            );

            shader.fragmentShader = `
              varying float vViewDist;
              ${shader.fragmentShader}
            `.replace(
              `#include <dithering_fragment>`,
              `#include <dithering_fragment>
              float nearFade = smoothstep(1.2, 8.5, vViewDist);
              gl_FragColor.a *= nearFade;`
            );
          };

          mesh.material = mat;
          mesh.renderOrder = 3;
          cloudMaterials.push(mat);
        }
      }
    });

    statTris.textContent = totalTris.toLocaleString();
    statVerts.textContent = totalVerts.toLocaleString();
    statDraws.textContent = String(drawCalls);
  },
  undefined,
  (err) => {
    console.error("Error al cargar nube-cumulo.glb:", err);
    statTris.textContent = "Error al cargar";
  }
);

// Controles adicionales
btnRotate.addEventListener("click", () => {
  autoRotate = !autoRotate;
  btnRotate.classList.toggle("active", autoRotate);
});

btnWire.addEventListener("click", () => {
  isWireframe = !isWireframe;
  btnWire.classList.toggle("active", isWireframe);
  if (cloudGroup) {
    cloudGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.wireframe = isWireframe;
      }
    });
  }
});

btnResetCam.addEventListener("click", () => {
  camera.position.set(14, 8, 16);
  controls.target.set(0, 1.5, 0);
  controls.update();
});

// Bucle de animación y métricas de FPS
let lastTime = performance.now();
let frameCount = 0;
let fpsLastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastTime) / 1000;
  lastTime = now;

  if (autoRotate && cloudGroup) {
    cloudGroup.rotation.y += delta * 0.15;
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
