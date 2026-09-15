// Aeronaves ambientales por capa (PLAN-AERONAVES-POR-CAPA): UNA a la vez, cruza
// el cilindro como cuerda lejos del jugador y muere fundida en la niebla. Puro
// ambiente — sin radar, sin click, sin colisión. Modelos de Blender
// (art/blender/aeronaves/): avioneta, jet, estratosférico y satélite. Math.random()
// a propósito: el RNG sembrado del mundo no debe consumirse aquí (reproducibilidad de nubes).

import * as THREE from "three";
import { FLYBY, LAYERS, WORLD, layerAtY } from "@/config";
import planeUrl from "./assets/aeronaves/avioneta.json?url";
import jetUrl from "./assets/aeronaves/jet.json?url";
import stratoUrl from "./assets/aeronaves/estratosferico.json?url";
import satelliteUrl from "./assets/aeronaves/satelite.json?url";

export type FlybyKind = "plane" | "jet" | "strato" | "satellite";

export interface FlybySoundState {
  kind: FlybyKind;
  distance: number;
}

/** Parte exportada por `kit.export_parts` (PLAN-3D-BLENDER.md §6). */
interface PartData {
  name: string;
  part: string;
  segment?: number;
  pivot: number[];
  position: number[];
  normal: number[];
  index: number[];
  vertexColor?: number[];
  color: number[];
  metalness: number;
  roughness: number;
  emission: number;
  emissionColor: number[];
}

interface AircraftModel {
  contrailOrigins: number[][];
  parts: { data: PartData; geometry: THREE.BufferGeometry }[];
}

const MODEL_URLS: Record<FlybyKind, string> = {
  plane: planeUrl,
  jet: jetUrl,
  strato: stratoUrl,
  satellite: satelliteUrl,
};

// Geometrías compartidas entre pasadas: se crean una vez y no se liberan (son pequeñas).
const models: Partial<Record<FlybyKind, AircraftModel>> = {};

async function loadModel(kind: FlybyKind): Promise<void> {
  const response = await fetch(MODEL_URLS[kind]);
  if (!response.ok) throw new Error(`Aeronave ${kind}: HTTP ${response.status}`);
  const data = (await response.json()) as { contrailOrigins?: number[][]; meshes: PartData[] };
  models[kind] = {
    contrailOrigins: data.contrailOrigins ?? [],
    parts: data.meshes.map((part) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
      if (part.vertexColor) {
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
      }
      geometry.setIndex(part.index);
      geometry.computeBoundingSphere();
      return { data: part, geometry };
    }),
  };
}

const KIND_BY_LAYER: Partial<Record<number, FlybyKind>> = {
  2: "plane",
  3: "jet",
  4: "strato",
  5: "satellite",
};

class Flyby {
  readonly group = new THREE.Group();
  /** Sub-grupo del modelo: recibe el balanceo sin pelearse con el lookAt. */
  private readonly model = new THREE.Group();
  private prop: THREE.Object3D | null = null;
  private readonly panels: { mesh: THREE.Object3D; phase: number }[] = [];
  private readonly velocity: THREE.Vector3;
  private readonly disposables: (THREE.BufferGeometry | THREE.Material)[] = [];
  private satelliteBodyMat: THREE.MeshStandardMaterial | null = null;
  private satelliteBeaconMat: THREE.MeshStandardMaterial | null = null;

  constructor(
    readonly kind: FlybyKind,
    model: AircraftModel,
    from: THREE.Vector3,
    to: THREE.Vector3,
  ) {
    this.buildModel(model);
    this.group.add(this.model);
    this.group.position.copy(from);
    this.group.lookAt(to); // los modelos llegan con el morro hacia +z
    this.velocity = to.clone().sub(from).normalize().multiplyScalar(FLYBY.speeds[kind]);
  }

  update(dt: number, elapsed: number): void {
    this.group.position.addScaledVector(this.velocity, dt);
    if (this.prop) this.prop.rotation.z += 26 * dt; // hélice
    if (this.kind === "satellite") {
      // Casi horizontal: deriva orbital sobria, con destello especular cada ~4 s.
      this.model.rotation.z = Math.sin(elapsed * 0.18) * 0.02;
      const flash = Math.pow(
        Math.max(0, Math.sin((elapsed * Math.PI * 2) / 4)),
        18,
      );
      if (this.satelliteBodyMat) {
        this.satelliteBodyMat.emissiveIntensity = 0.12 + flash * 1.9;
      }
      if (this.satelliteBeaconMat) {
        const blink = Math.sin((elapsed * Math.PI * 2) / 1.6) > 0.72;
        this.satelliteBeaconMat.emissiveIntensity = blink ? 3.2 : 0.08;
      }
      // Paneles orientándose al sol: ±0.3 rad sobre el eje del brazo (ENTREGA.md).
      for (const { mesh, phase } of this.panels) {
        mesh.rotation.x = Math.sin(elapsed * Math.PI * 2 * 0.04 + phase) * 0.3;
      }
    } else if (this.kind === "plane") {
      this.model.rotation.z = Math.sin(elapsed * Math.PI * 2 * 0.22) * 0.06; // balanceo vivo
    } else {
      this.model.rotation.z = Math.sin(elapsed * 0.7) * 0.03; // balanceo sutil
    }
  }

  get isGone(): boolean {
    const p = this.group.position;
    return Math.hypot(p.x, p.z) > WORLD.radius + FLYBY.edgeMargin + 5;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.group);
    // Materiales y estelas propios; las geometrías del modelo son compartidas.
    for (const d of this.disposables) d.dispose();
  }

  private buildModel(model: AircraftModel): void {
    for (const { data, geometry } of model.parts) {
      const [er, eg, eb] = data.emissionColor;
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setRGB(data.color[0], data.color[1], data.color[2]),
        vertexColors: Boolean(data.vertexColor),
        metalness: data.metalness,
        roughness: data.roughness,
        emissive: data.emission > 0 ? new THREE.Color().setRGB(er, eg, eb) : new THREE.Color(0),
        emissiveIntensity: data.emission,
      });
      this.disposables.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = data.name;
      mesh.position.fromArray(data.pivot);
      this.model.add(mesh);

      if (data.part === "prop") this.prop = mesh;
      if (data.part === "panel") this.panels.push({ mesh, phase: (data.segment ?? 0) * Math.PI });
      if (data.part === "beacon") this.satelliteBeaconMat = material;
      if (this.kind === "satellite" && data.part === "body") this.satelliteBodyMat = material;
    }
    if (this.kind === "jet") this.buildContrail(model.contrailOrigins, 30, 0.35, 1.3);
    if (this.kind === "strato") this.buildContrail(model.contrailOrigins, 45, 0.18, 0.7);
  }

  /** Estela: cintas en cruz con alpha por vértice que muere hacia la cola.
   * UN solo mesh para todas (1 draw call); viaja rígida con el grupo. */
  private buildContrail(origins: number[][], length: number, wHead: number, wTail: number): void {
    const pos: number[] = [];
    const col: number[] = [];
    const quad = (a: number[], b: number[], c: number[], d: number[], aHead: number) => {
      // a-b = borde cabeza (alpha aHead), c-d = borde cola (alpha 0).
      pos.push(...a, ...b, ...c, ...b, ...d, ...c);
      col.push(1, 1, 1, aHead, 1, 1, 1, aHead, 1, 1, 1, 0, 1, 1, 1, aHead, 1, 1, 1, 0, 1, 1, 1, 0);
    };
    // Nace en cada salida que marca el modelo (motores del jet, tobera del estratosférico).
    for (const [x, y, zHead] of origins) {
      const zTail = zHead - length;
      // Cinta horizontal + cinta vertical (cruz: visible desde cualquier ángulo).
      quad(
        [x - wHead / 2, y, zHead],
        [x + wHead / 2, y, zHead],
        [x - wTail / 2, y, zTail],
        [x + wTail / 2, y, zTail],
        0.5,
      );
      quad(
        [x, y - wHead / 2, zHead],
        [x, y + wHead / 2, zHead],
        [x, y - wTail / 2, zTail],
        [x, y + wTail / 2, zTail],
        0.5,
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 4));
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.disposables.push(geo, mat);
    this.model.add(new THREE.Mesh(geo, mat));
  }
}

export class FlybyManager {
  private active: Flyby | null = null;
  private timer: number = FLYBY.firstDelay;

  constructor(private scene: THREE.Scene) {
    // Descarga en segundo plano; mientras falte un modelo, su capa no tiene pasada.
    for (const kind of Object.keys(MODEL_URLS) as FlybyKind[]) {
      loadModel(kind).catch((error: unknown) => console.warn(error));
    }
  }

  update(dt: number, playerPos: THREE.Vector3, elapsed: number): void {
    if (this.active) {
      this.active.update(dt, elapsed);
      if (this.active.isGone) {
        this.active.dispose(this.scene);
        this.active = null;
        this.armTimer();
      }
      return;
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    const kind = KIND_BY_LAYER[layerAtY(playerPos.y).num];
    const model = kind && models[kind];
    if (!kind || !model) {
      this.armTimer(); // capa sin aeronave (1) o modelo aún descargándose
      return;
    }
    this.spawn(kind, model, playerPos);
  }

  reset(): void {
    if (this.active) {
      this.active.dispose(this.scene);
      this.active = null;
    }
    this.timer = FLYBY.firstDelay;
  }

  /** Datos mínimos para que audio aplique el SFX y su atenuación por distancia. */
  soundState(playerPos: THREE.Vector3): FlybySoundState | null {
    if (!this.active) return null;
    return {
      kind: this.active.kind,
      distance: this.active.group.position.distanceTo(playerPos),
    };
  }

  private armTimer(): void {
    this.timer = FLYBY.intervalMin + Math.random() * (FLYBY.intervalMax - FLYBY.intervalMin);
  }

  /** Cuerda del cilindro a Y constante, lejos del jugador en vertical. */
  private spawn(kind: FlybyKind, model: AircraftModel, playerPos: THREE.Vector3): void {
    const layer = layerAtY(playerPos.y);
    const band = LAYERS.find((l) => l.num === layer.num) ?? LAYERS[0];
    // Cada pasada sortea si va arriba o abajo y una separación distinta. Se
    // conserva un margen de 10 u respecto a los límites visuales de la capa.
    const yMin = band.yBottom + 10;
    const yMax = band.yTop - 10;
    const roomBelow = playerPos.y - yMin;
    const roomAbove = yMax - playerPos.y;
    const directions: number[] = [];
    if (roomBelow >= FLYBY.yClearance) directions.push(-1);
    if (roomAbove >= FLYBY.yClearance) directions.push(1);
    const sign = directions[Math.floor(Math.random() * directions.length)] ?? 1;
    const available = sign > 0 ? roomAbove : roomBelow;
    const maxOffset = Math.min(FLYBY.yVariationMax, available);
    const offset =
      FLYBY.yClearance + Math.random() * Math.max(0, maxOffset - FLYBY.yClearance);
    const y = THREE.MathUtils.clamp(playerPos.y + sign * offset, yMin, yMax);
    const r = WORLD.radius + FLYBY.edgeMargin;
    const a = Math.random() * Math.PI * 2;
    const lateral = (Math.random() - 0.5) * 80; // offset ≤ 40 u para variedad
    const from = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    const to = new THREE.Vector3(
      -Math.cos(a) * r - Math.sin(a) * lateral,
      y,
      -Math.sin(a) * r + Math.cos(a) * lateral,
    );
    this.active = new Flyby(kind, model, from, to);
    this.scene.add(this.active.group);
  }
}

/** Inspector `dev/aeronaves.html`: una aeronave quieta en el origen con su animación real. */
export async function createAircraftPreview(kind: FlybyKind): Promise<{
  group: THREE.Group;
  update(dt: number, elapsed: number): void;
  dispose(scene: THREE.Scene): void;
}> {
  if (!models[kind]) await loadModel(kind);
  return new Flyby(kind, models[kind]!, new THREE.Vector3(), new THREE.Vector3(0, 0, 1));
}
