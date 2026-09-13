// Cabina sci-fi de Batisfera: geometría evaluada en Blender (art/blender/modelar-cabina.py).
// Se dibuja en una pasada propia sobre el mundo (cámara fija, luces propias): no se
// balancea, no la tiñe el agua y ninguna criatura la atraviesa.
// Los módulos se anclan a los bordes de pantalla y se fusionan por material en cada
// cambio de tamaño: ~8 llamadas de dibujo en total, sin huecos ni cortes por aspecto.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import cabinUrl from "./assets/cabina-scifi.json?url";

interface MeshData {
  material: string;
  position: number[];
  normal: number[];
  color: number[];
  uv?: number[];
  index: number[];
}

interface ModuleData {
  name: string;
  anchor: [number, number];
  depth: number;
  stretchX: boolean;
  narrow: boolean;
  screens: Record<string, number[][]>;
  meshes: MeshData[];
}

interface MaterialData {
  key: string;
  color: string;
  metalness: number;
  roughness: number;
  emissive: string;
  emissiveIntensity: number;
}

interface CabinData {
  layout: { H: number; refHalfWidth: number; narrowAspect: number };
  materials: MaterialData[];
  modules: ModuleData[];
}

/** Rectángulo en píxeles CSS del viewport. */
export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CockpitLayout {
  /** Pantalla estrecha: sin consolas laterales, el HUD usa su disposición compacta. */
  narrow: boolean;
  sonar?: ScreenRect;
  stats?: ScreenRect;
  answers?: ScreenRect;
}

let data: CabinData | undefined;
let pending: Promise<void> | undefined;

/** Se descarga una sola vez antes de iniciar; la geometría queda fuera del bundle JS. */
export function preloadCockpit(): Promise<void> {
  return pending ??= fetch(cabinUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Cabina: HTTP ${response.status}`);
    data = await response.json() as CabinData;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

/** Degradado del reflejo: opaco junto al marco (v = 0), transparente hacia el centro. */
function edgeGradient(): THREE.DataTexture {
  const size = 32;
  const pixels = new Uint8Array(size * 4);
  for (let i = 0; i < size; i++) {
    const v = (1 - i / (size - 1)) ** 2 * 255;
    pixels.set([v, v, v, 255], i * 4);
  }
  const texture = new THREE.DataTexture(pixels, 1, size);
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export class Cockpit {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(60, 1, 0.05, 5);
  private meshes = new Map<string, THREE.Mesh>();
  private gradient = edgeGradient();
  private envTarget: THREE.WebGLRenderTarget;
  private cyanLights: THREE.PointLight[] = [];
  private warmLights: THREE.PointLight[] = [];
  private current: CockpitLayout = { narrow: false };

  /** main.ts coloca aquí el HUD HTML sobre las pantallas del modelo. */
  onLayout: ((layout: CockpitLayout) => void) | null = null;

  constructor(renderer: THREE.WebGLRenderer) {
    if (!data) throw new Error("La cabina debe precargarse antes de iniciar Batisfera.");
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.envTarget = pmrem.fromScene(new RoomEnvironment(renderer), 0.04);
    pmrem.dispose();

    for (const spec of data.materials) {
      const material = spec.key === "glassEdge"
        ? new THREE.MeshBasicMaterial({
          color: spec.color,
          alphaMap: this.gradient,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
        : new THREE.MeshStandardMaterial({
          color: spec.color,
          metalness: spec.metalness,
          roughness: spec.roughness,
          emissive: spec.emissive,
          // Sin bloom: la intensidad de Cycles saturaría las luces a blanco.
          emissiveIntensity: spec.emissiveIntensity * 0.42,
          envMap: this.envTarget.texture,
          // Las pantallas apagadas no reflejan: el HTML se lee encima.
          envMapIntensity: spec.key === "screen" ? 0.03 : 0.32,
          vertexColors: true,
        });
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
      mesh.name = `Cabina · ${spec.key}`;
      mesh.frustumCulled = false;
      if (spec.key === "glassEdge") mesh.renderOrder = 1;
      this.meshes.set(spec.key, mesh);
      this.scene.add(mesh);
    }

    this.scene.add(new THREE.HemisphereLight(0xbfe6f5, 0x071116, 1.35));
    const key = new THREE.DirectionalLight(0xdcefff, 1.5);
    key.position.set(0.25, 1, 0.7);
    this.scene.add(key);
    for (let i = 0; i < 2; i++) {
      const cyan = new THREE.PointLight(0x63dce5, 0.07, 0.9, 2);
      const warm = new THREE.PointLight(0xe9b66b, 0.02, 0.6, 2);
      this.cyanLights.push(cyan);
      this.warmLights.push(warm);
      this.scene.add(cyan, warm);
    }
  }

  get layout(): CockpitLayout {
    return this.current;
  }

  /** Recoloca los módulos para el tamaño de viewport (px CSS) y fusiona la geometría. */
  resize(width: number, height: number): void {
    const cabin = data!;
    const aspect = width / height;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    const { H, refHalfWidth, narrowAspect } = cabin.layout;
    const halfW = H * aspect;
    const narrow = aspect < narrowAspect;
    // Escala de las piezas: completa en panorámico, contenida en teléfono vertical.
    const k = THREE.MathUtils.clamp(halfW / refHalfWidth, 0.45, 1);

    const parts = new Map<string, { mesh: MeshData; matrix: THREE.Matrix4 }[]>();
    const layout: CockpitLayout = { narrow };
    const corner = new THREE.Vector3();

    for (const module of cabin.modules) {
      if (narrow && !module.narrow) continue;
      const [ax, ay] = module.anchor;
      const d = module.depth;
      const matrix = new THREE.Matrix4().compose(
        new THREE.Vector3(ax * halfW * d, ay * H * d, -d),
        new THREE.Quaternion(),
        module.stretchX ? new THREE.Vector3(2 * halfW * d + 0.3, k, k) : new THREE.Vector3(k, k, k),
      );
      for (const mesh of module.meshes) {
        const list = parts.get(mesh.material) ?? [];
        list.push({ mesh, matrix });
        parts.set(mesh.material, list);
      }
      for (const [screen, corners] of Object.entries(module.screens)) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const c of corners) {
          corner.fromArray(c).applyMatrix4(matrix).project(this.camera);
          const px = (corner.x + 1) / 2 * width;
          const py = (1 - corner.y) / 2 * height;
          x0 = Math.min(x0, px); x1 = Math.max(x1, px);
          y0 = Math.min(y0, py); y1 = Math.max(y1, py);
        }
        layout[screen as "sonar" | "stats" | "answers"] = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
      }
    }

    for (const [key, mesh] of this.meshes) {
      const next = this.merge(parts.get(key) ?? [], key === "glassEdge");
      mesh.geometry.dispose();
      mesh.geometry = next;
    }

    this.cyanLights.forEach((light, i) => light.position.set((i ? 1 : -1) * (halfW - 0.1 * k), -0.08, -0.86));
    this.warmLights.forEach((light, i) => light.position.set((i ? 1 : -1) * (halfW * 0.86 - 0.28 * k), -0.4, -0.7));
    this.warmLights.forEach((light) => { light.visible = !narrow; });

    this.current = layout;
    this.onLayout?.(layout);
  }

  private merge(list: { mesh: MeshData; matrix: THREE.Matrix4 }[], withUv: boolean): THREE.BufferGeometry {
    let vertexCount = 0;
    let indexCount = 0;
    for (const { mesh } of list) {
      vertexCount += mesh.position.length / 3;
      indexCount += mesh.index.length;
    }
    const position = new Float32Array(vertexCount * 3);
    const normal = new Float32Array(vertexCount * 3);
    const color = new Float32Array(vertexCount * 3);
    const uv = withUv ? new Float32Array(vertexCount * 2) : null;
    const index = new Uint32Array(indexCount);
    const v = new THREE.Vector3();
    const normalMatrix = new THREE.Matrix3();
    let vo = 0;
    let io = 0;
    for (const { mesh, matrix } of list) {
      normalMatrix.getNormalMatrix(matrix);
      const count = mesh.position.length / 3;
      for (let i = 0; i < count; i++) {
        v.fromArray(mesh.position, i * 3).applyMatrix4(matrix).toArray(position, (vo + i) * 3);
        v.fromArray(mesh.normal, i * 3).applyMatrix3(normalMatrix).normalize().toArray(normal, (vo + i) * 3);
        const tint = mesh.color[i];
        color.set([tint, tint, tint], (vo + i) * 3);
        if (uv && mesh.uv) uv.set([mesh.uv[i * 2], mesh.uv[i * 2 + 1]], (vo + i) * 2);
      }
      for (const idx of mesh.index) index[io++] = idx + vo;
      vo += count;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(color, 3));
    if (uv) geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    return geometry;
  }

  /** Segunda pasada: limpia profundidad y dibuja la cabina encima del mundo. */
  render(renderer: THREE.WebGLRenderer): void {
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    for (const mesh of this.meshes.values()) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.gradient.dispose();
    this.envTarget.dispose();
  }
}
