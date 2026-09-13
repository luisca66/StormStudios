// crossing-train.ts — El tren de carga que se cruza (PLAN §5.6).
//
// Corre por una vía paralela sobre la MISMA spline, desplazada lateralmente, así que
// hereda las curvas del terreno sin generar mundo nuevo. Aparece 1–2 veces por viaje y
// SOLO en zona muerta (§5.6: nunca compite con una pregunta activa; F6 podrá vetarlo
// además vía `setSuppressed`). La bocina vive en `TrainSound.playHorn` porque es audio,
// y por la regla §2.10 es ruido filtrado, no una nota.
//
// Desde 2026-09 el convoy está modelado en Blender (art/blender/modelar-tren-carga.py):
// locomotora de vapor hermana de nuestra cabina a la CABEZA, ténder y vagones de tres
// tipos (caja, góndola, cisterna). El color viene horneado en vertex colors; cada pieza
// cuesta 2–3 draw calls y los vagones se instancian por tipo. Las ruedas motrices y las
// bielas giran con la distancia recorrida.

import * as THREE from "three";
import {
  CROSSING_HORN_DURATION_S, CROSSING_TRACK_OFFSET, CROSSING_TRAIN_MAX,
  CROSSING_TRAIN_SPEED, CROSSING_TRAIN_WAGONS, DEAD_ZONE_LENGTH, SEGMENT_LENGTH,
} from "@/config";
import trainUrl from "./assets/tren-carga.json?url";
import { makeRng, newTrackFrame, type TrackFrame, type TrackManager } from "./track";
import { detourSideFor } from "./detour";
import { metalEnvironment } from "./metal-env";

const SPAWN_LEAD = 60;    // el jugador debe estar a esta distancia del punto de cruce
const HEAD_LEAD = 160;    // la cabeza del convoy nace por delante del punto de cruce
const TAIL_CLEAR = 90;    // se retira cuando ya quedó atrás
const RAIL_BEHIND = 210, RAIL_AHEAD = 400;
const COUPLING_GAP = 0.6;

const railMaterial = new THREE.MeshStandardMaterial({ color: "#8a8378", roughness: 0.5, metalness: 0.6 });
const sleeperMaterial = new THREE.MeshStandardMaterial({ color: "#4a3a2b", roughness: 1 });

type Kind = "paint" | "metal" | "lamp";
type PieceName = "loco" | "tender" | "boxcar" | "gondola" | "tank" | "driver" | "pony" | "rodL" | "rodR";
type WagonType = "boxcar" | "gondola" | "tank";
const WAGON_TYPES: WagonType[] = ["boxcar", "gondola", "tank"];

interface Bucket { kind: Kind; position: number[]; normal: number[]; color: number[]; index: number[] }
interface TrainData {
  pieces: Record<PieceName, Bucket[]>;
  lengths: { loco: number; tender: number; wagon: number };
  drivers: Array<[number, number, number]>;
  ponies: Array<[number, number, number]>;
  driverRadius: number;
  ponyRadius: number;
  crank: number;
}

// Posición del ORIGEN de cada pieza respecto a la cabeza del convoy (en distancia de vía).
// La locomotora va de z −4.4 a +4.8, el ténder ±3.1 y los vagones ±4.3 (ver el script).
const LOCO_FRONT = 4.8, LOCO_BACK = 4.4, TENDER_HALF = 3.1, WAGON_HALF = 4.3;
const TENDER_AT = LOCO_FRONT + LOCO_BACK + COUPLING_GAP + TENDER_HALF;
const FIRST_WAGON_AT = TENDER_AT + TENDER_HALF + COUPLING_GAP + WAGON_HALF;
const WAGON_STEP = WAGON_HALF * 2 + COUPLING_GAP;

const materials: Record<Kind, THREE.MeshStandardMaterial> = {
  paint: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0 }),
  metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.7, envMapIntensity: 1 }),
  lamp: new THREE.MeshStandardMaterial({ vertexColors: true, emissive: "#ffd98a", emissiveIntensity: 2.2 }),
};

interface PieceGeometry { kind: Kind; geometry: THREE.BufferGeometry }
let geometries: Record<PieceName, PieceGeometry[]> | null = null;
let trainData: TrainData | null = null;
let loading: Promise<void> | null = null;

/** Geometría compartida por TODAS las apariciones: se crea una vez y no se dispone. */
function loadTrain(): Promise<void> {
  return loading ??= fetch(trainUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Tren de carga: HTTP ${response.status}`);
    const data = await response.json() as TrainData;
    materials.metal.envMap = metalEnvironment();
    const built = {} as Record<PieceName, PieceGeometry[]>;
    for (const [name, buckets] of Object.entries(data.pieces) as Array<[PieceName, Bucket[]]>) {
      built[name] = buckets.map((b) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(b.position, 3));
        geometry.setAttribute("normal", new THREE.Float32BufferAttribute(b.normal, 3));
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(b.color, 3));
        geometry.setIndex(b.index);
        geometry.computeBoundingSphere();
        return { kind: b.kind, geometry };
      });
    }
    geometries = built;
    trainData = data;
  }).catch((error: unknown) => { loading = null; throw error; });
}

interface Event {
  distance: number;   // punto de cruce (dentro de zona muerta)
  fromLeft: boolean;
  fired: boolean;
}

export class CrossingTrain {
  private readonly frame: TrackFrame = newTrackFrame();
  private readonly basis = new THREE.Matrix4();
  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3(1, 1, 1);
  private readonly position = new THREE.Vector3();
  private readonly spin = new THREE.Matrix4();
  private readonly flip = new THREE.Matrix4().makeRotationY(Math.PI);
  private readonly offset = new THREE.Matrix4();

  private events: Event[] = [];
  private group: THREE.Group | null = null;
  private owned: THREE.BufferGeometry[] = [];
  private loco: THREE.Group | null = null;
  private tender: THREE.Group | null = null;
  private drivers: THREE.InstancedMesh[] = [];
  private ponies: THREE.InstancedMesh[] = [];
  private rods: Array<{ mesh: THREE.Group; phase: number }> = [];
  private wagons = new Map<WagonType, { meshes: THREE.InstancedMesh[]; slots: number[] }>();
  private headDistance = 0;
  private travelled = 0;
  private side = 1;
  private suppressed = false;
  private wagonCount = CROSSING_TRAIN_WAGONS;
  private rng = makeRng(1);

  constructor(
    private readonly scene: THREE.Scene,
    private readonly track: TrackManager,
    private readonly onHorn: (fromLeft: boolean, duration: number) => void,
  ) {
    void loadTrain();
  }

  /** F6 usará esto para callar el evento si hay una pregunta en curso (regla §2.10). */
  setSuppressed(value: boolean): void {
    this.suppressed = value;
  }

  isVisible(): boolean {
    return this.group !== null;
  }

  reset(seed: number, totalSegments: number): void {
    this.despawn();
    const rng = makeRng(seed + 55021);
    this.rng = makeRng(seed + 77003);
    // Segmentos candidatos: ni el primero (arranque) ni los dos últimos (aproximación).
    const candidates: number[] = [];
    for (let i = 2; i < Math.max(3, totalSegments - 2); i++) candidates.push(i);
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    this.events = candidates.slice(0, CROSSING_TRAIN_MAX).map((segment) => ({
      // Dentro de la zona muerta del segmento, con margen a ambos lados.
      distance: segment * SEGMENT_LENGTH + 8 + rng() * (DEAD_ZONE_LENGTH - 16),
      fromLeft: rng() < 0.5,
      fired: false,
    })).sort((a, b) => a.distance - b.distance);
  }

  update(trainDistance: number, dt: number): void {
    if (this.group) {
      // El convoy avanza hacia distancias MENORES (viene de frente): la cabeza lidera.
      this.headDistance -= CROSSING_TRAIN_SPEED * dt;
      this.travelled += CROSSING_TRAIN_SPEED * dt;
      const tail = this.headDistance + FIRST_WAGON_AT + (this.wagonCount - 1) * WAGON_STEP + WAGON_HALF;
      if (tail < trainDistance - TAIL_CLEAR) this.despawn();
      else this.layout();
      return;
    }
    if (this.suppressed || !trainData) return;
    for (const event of this.events) {
      if (event.fired || trainDistance < event.distance - SPAWN_LEAD) continue;
      if (trainDistance > event.distance) { event.fired = true; continue; } // llegamos tarde
      event.fired = true;
      this.spawn(event);
      break;
    }
  }

  private spawn(event: Event): void {
    if (!geometries || !trainData) return;
    // El lado se decide AQUÍ y no al sortear el evento: `detourSideFor` dice por dónde
    // sale el ramal en esta aguja, y el convoy toma siempre el contrario. Los dos usan
    // 13 u de desplazamiento, así que compartir lado los ponía en el MISMO carril y se
    // cruzaban de frente. `fromLeft` se conserva solo para el paneo de la bocina.
    this.side = -detourSideFor(event.distance);
    this.headDistance = event.distance + HEAD_LEAD;
    this.travelled = 0;
    this.wagonCount = CROSSING_TRAIN_WAGONS;

    const group = new THREE.Group();
    group.name = "Tren de carga · Blender 4.5";

    const staticPiece = (name: PieceName): THREE.Group => {
      const piece = new THREE.Group();
      for (const { kind, geometry } of geometries![name]) piece.add(new THREE.Mesh(geometry, materials[kind]));
      group.add(piece);
      return piece;
    };
    this.loco = staticPiece("loco");
    this.tender = staticPiece("tender");

    const instanced = (name: PieceName, count: number, parent: THREE.Object3D): THREE.InstancedMesh[] =>
      geometries![name].map(({ kind, geometry }) => {
        const mesh = new THREE.InstancedMesh(geometry, materials[kind], count);
        mesh.frustumCulled = false;
        parent.add(mesh);
        return mesh;
      });
    this.drivers = instanced("driver", trainData.drivers.length, this.loco);
    this.ponies = instanced("pony", trainData.ponies.length, this.loco);
    this.rods = (["rodL", "rodR"] as const).map((name) => {
      const mesh = new THREE.Group();
      for (const { kind, geometry } of geometries![name]) mesh.add(new THREE.Mesh(geometry, materials[kind]));
      this.loco!.add(mesh);
      // Manivelas a 90°: el lado izquierdo va un cuarto de vuelta por delante.
      return { mesh, phase: name === "rodL" ? Math.PI / 2 : 0 };
    });

    // Mezcla de vagones sembrada por viaje; cada tipo es UNA InstancedMesh por clase.
    const slotsByType = new Map<WagonType, number[]>();
    for (let i = 0; i < this.wagonCount; i++) {
      const type = WAGON_TYPES[Math.floor(this.rng() * WAGON_TYPES.length)];
      if (!slotsByType.has(type)) slotsByType.set(type, []);
      slotsByType.get(type)!.push(i);
    }
    this.wagons.clear();
    const tint = new THREE.Color();
    for (const [type, slots] of slotsByType) {
      const meshes = instanced(type, slots.length, group);
      // Cada vagón con su propio desgaste de pintura: nunca un convoy clonado.
      for (let k = 0; k < slots.length; k++) {
        const light = 0.78 + this.rng() * 0.32;
        tint.setRGB(light, light * (0.95 + this.rng() * 0.08), light * (0.92 + this.rng() * 0.1));
        for (const mesh of meshes) mesh.setColorAt(k, mesh.material === materials.paint ? tint : new THREE.Color(1, 1, 1));
      }
      for (const mesh of meshes) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.wagons.set(type, { meshes, slots });
    }

    const rails = this.buildParallelTrack(event.distance);
    group.add(rails.mesh, rails.sleepers);

    this.owned = [rails.mesh.geometry, rails.sleepers.geometry];
    this.scene.add(group);
    this.group = group;
    this.layout();
    this.onHorn(event.fromLeft, CROSSING_HORN_DURATION_S);
  }

  /** Cinta de dos rieles sobre la spline, desplazada al lado del convoy. */
  private buildParallelTrack(center: number): { mesh: THREE.Mesh; sleepers: THREE.InstancedMesh } {
    const positions: number[] = [];
    const indices: number[] = [];
    const start = center - RAIL_BEHIND, end = center + RAIL_AHEAD;
    const step = 4;
    const steps = Math.ceil((end - start) / step);
    let vertex = 0;
    for (let i = 0; i <= steps; i++) {
      const d = THREE.MathUtils.lerp(start, end, i / steps);
      this.track.frameAt(d, this.frame);
      const center3 = this.frame.pos.clone()
        .addScaledVector(this.frame.right, this.side * CROSSING_TRACK_OFFSET);
      for (const rail of [-0.8, 0.8]) {
        for (const w of [-0.12, 0.12]) {
          const p = center3.clone().addScaledVector(this.frame.right, rail + w);
          positions.push(p.x, p.y - 0.42, p.z);
        }
      }
      if (i < steps) {
        const a = vertex;
        // dos rieles = dos cintas de 2 vértices cada una
        indices.push(a, a + 1, a + 4, a + 1, a + 5, a + 4);
        indices.push(a + 2, a + 3, a + 6, a + 3, a + 7, a + 6);
      }
      vertex += 4;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const sleeperGeo = new THREE.BoxGeometry(2.4, 0.16, 0.5);
    const count = Math.floor((end - start) / 2.2);
    const sleepers = new THREE.InstancedMesh(sleeperGeo, sleeperMaterial, count);
    for (let i = 0; i < count; i++) {
      const d = start + i * 2.2;
      this.track.frameAt(d, this.frame);
      this.position.copy(this.frame.pos)
        .addScaledVector(this.frame.right, this.side * CROSSING_TRACK_OFFSET);
      this.position.y -= 0.56;
      this.basis.makeBasis(this.frame.right, this.frame.up, this.frame.tan.clone().negate());
      this.quat.setFromRotationMatrix(this.basis);
      this.matrix.compose(this.position, this.quat, this.scale);
      sleepers.setMatrixAt(i, this.matrix);
    }
    sleepers.instanceMatrix.needsUpdate = true;
    return { mesh: new THREE.Mesh(geometry, railMaterial), sleepers };
  }

  /** Matriz de una pieza cuyo origen está a `d` sobre la vía paralela (y = 0 en el riel). */
  private poseAt(d: number, target: THREE.Matrix4): THREE.Matrix4 {
    this.track.frameAt(d, this.frame);
    this.position.copy(this.frame.pos)
      .addScaledVector(this.frame.right, this.side * CROSSING_TRACK_OFFSET);
    this.position.y -= 0.42;
    this.basis.makeBasis(this.frame.right, this.frame.up, this.frame.tan.clone().negate());
    this.quat.setFromRotationMatrix(this.basis);
    return target.compose(this.position, this.quat, this.scale);
  }

  private layout(): void {
    if (!this.loco || !this.tender || !trainData) return;
    this.poseAt(this.headDistance + LOCO_FRONT, this.matrix)
      .decompose(this.loco.position, this.loco.quaternion, this.loco.scale);
    this.poseAt(this.headDistance + TENDER_AT, this.matrix)
      .decompose(this.tender.position, this.tender.quaternion, this.tender.scale);

    // Ruedas: el lado izquierdo se gira 180° en Y, lo que invierte el sentido del giro
    // en X; por eso su ángulo va con signo contrario (y un cuarto de vuelta de fase).
    const rollDriver = this.travelled / trainData.driverRadius;
    const rollPony = this.travelled / trainData.ponyRadius;
    const placeWheels = (meshes: THREE.InstancedMesh[], axles: Array<[number, number, number]>, roll: number, quarter: boolean) => {
      axles.forEach(([x, y, z], i) => {
        const left = x < 0;
        const angle = left ? -(roll + (quarter ? Math.PI / 2 : 0)) : roll;
        this.matrix.makeTranslation(x, y, z);
        if (left) this.matrix.multiply(this.flip);
        this.matrix.multiply(this.spin.makeRotationX(angle));
        for (const mesh of meshes) mesh.setMatrixAt(i, this.matrix);
      });
      for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
    };
    placeWheels(this.drivers, trainData.drivers, rollDriver, true);
    placeWheels(this.ponies, trainData.ponies, rollPony, false);
    // Las bielas siguen al muñón: traslación circular, sin girar.
    for (const { mesh, phase } of this.rods) {
      const a = rollDriver + phase;
      mesh.position.set(0, trainData.crank * Math.cos(a), trainData.crank * Math.sin(a));
    }

    for (const { meshes, slots } of this.wagons.values()) {
      slots.forEach((slot, k) => {
        this.poseAt(this.headDistance + FIRST_WAGON_AT + slot * WAGON_STEP, this.offset);
        for (const mesh of meshes) mesh.setMatrixAt(k, this.offset);
      });
      for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
    }
  }

  private despawn(): void {
    if (this.group) {
      this.scene.remove(this.group);
      for (const geometry of this.owned) geometry.dispose();
      // La geometría de Blender es compartida; solo se liberan los buffers de instancias.
      this.group.traverse((object) => {
        if (object instanceof THREE.InstancedMesh) object.dispose();
      });
    }
    this.owned = [];
    this.group = null;
    this.loco = this.tender = null;
    this.drivers = [];
    this.ponies = [];
    this.rods = [];
    this.wagons.clear();
  }

  dispose(): void {
    this.despawn();
    this.events = [];
  }
}
