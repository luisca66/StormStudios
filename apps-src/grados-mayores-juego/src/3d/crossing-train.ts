// crossing-train.ts — El tren de carga que se cruza (PLAN §5.6).
//
// Corre por una vía paralela sobre la MISMA spline, desplazada lateralmente, así que
// hereda las curvas del terreno sin generar mundo nuevo. Aparece 1–2 veces por viaje y
// SOLO en zona muerta (§5.6: nunca compite con una pregunta activa; F6 podrá vetarlo
// además vía `setSuppressed`). La bocina vive en `TrainSound.playHorn` porque es audio,
// y por la regla §2.10 es ruido filtrado, no una nota.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  CROSSING_HORN_DURATION_S, CROSSING_TRACK_OFFSET, CROSSING_TRAIN_MAX,
  CROSSING_TRAIN_SPEED, CROSSING_TRAIN_WAGONS, DEAD_ZONE_LENGTH, SEGMENT_LENGTH,
} from "@/config";
import { makeRng, newTrackFrame, type TrackFrame, type TrackManager } from "./track";
import { detourSideFor } from "./detour";

const WAGON_SPACING = 10.5;
const SPAWN_LEAD = 60;    // el jugador debe estar a esta distancia del punto de cruce
const HEAD_LEAD = 160;    // el convoy nace por delante del punto de cruce
const TAIL_CLEAR = 90;    // se retira cuando ya quedó atrás
const RAIL_BEHIND = 210, RAIL_AHEAD = 280;

const bodyMaterial = new THREE.MeshStandardMaterial({ color: "#6b4a34", roughness: 0.88 });
const locoMaterial = new THREE.MeshStandardMaterial({ color: "#2f3336", roughness: 0.7, metalness: 0.3 });
const truckMaterial = new THREE.MeshStandardMaterial({ color: "#1d1f21", roughness: 0.85 });
const railMaterial = new THREE.MeshStandardMaterial({ color: "#8a8378", roughness: 0.5, metalness: 0.6 });
const sleeperMaterial = new THREE.MeshStandardMaterial({ color: "#4a3a2b", roughness: 1 });

/** Caja del vagón + su bastidor, fusionadas: un vagón = 1 instancia, no 2. */
function wagonGeometry(): THREE.BufferGeometry {
  const box = new THREE.BoxGeometry(2.9, 3.1, 8.6).translate(0, 2.1, 0);
  const frame = new THREE.BoxGeometry(3.1, 0.42, 9).translate(0, 0.42, 0);
  return mergeGeometries([box, frame], false) ?? box;
}

function locoGeometry(): THREE.BufferGeometry {
  const hood = new THREE.BoxGeometry(3.0, 2.5, 7.4).translate(0, 1.9, -0.6);
  const cabin = new THREE.BoxGeometry(3.1, 1.6, 2.8).translate(0, 3.9, 2.2);
  const frame = new THREE.BoxGeometry(3.2, 0.5, 9.4).translate(0, 0.45, 0);
  return mergeGeometries([hood, cabin, frame], false) ?? hood;
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

  private events: Event[] = [];
  private group: THREE.Group | null = null;
  private owned: THREE.BufferGeometry[] = [];
  private wagons: THREE.InstancedMesh | null = null;
  private loco: THREE.InstancedMesh | null = null;
  private trucks: THREE.InstancedMesh | null = null;
  private headDistance = 0;
  private side = 1;
  private suppressed = false;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly track: TrackManager,
    private readonly onHorn: (fromLeft: boolean, duration: number) => void,
  ) {}

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
      this.headDistance -= CROSSING_TRAIN_SPEED * dt;
      const tail = this.headDistance - CROSSING_TRAIN_WAGONS * WAGON_SPACING;
      if (tail < trainDistance - TAIL_CLEAR) this.despawn();
      else this.layout();
      return;
    }
    if (this.suppressed) return;
    for (const event of this.events) {
      if (event.fired || trainDistance < event.distance - SPAWN_LEAD) continue;
      if (trainDistance > event.distance) { event.fired = true; continue; } // llegamos tarde
      event.fired = true;
      this.spawn(event);
      break;
    }
  }

  private spawn(event: Event): void {
    // El lado se decide AQUÍ y no al sortear el evento: `detourSideFor` dice por dónde
    // sale el ramal en esta aguja, y el convoy toma siempre el contrario. Los dos usan
    // 13 u de desplazamiento, así que compartir lado los ponía en el MISMO carril y se
    // cruzaban de frente. `fromLeft` se conserva solo para el paneo de la bocina.
    this.side = -detourSideFor(event.distance);
    this.headDistance = event.distance + HEAD_LEAD;

    const group = new THREE.Group();
    const wagonGeo = wagonGeometry();
    const locoGeo = locoGeometry();
    const truckGeo = new THREE.BoxGeometry(3.0, 0.7, 1.5);

    this.wagons = new THREE.InstancedMesh(wagonGeo, bodyMaterial, CROSSING_TRAIN_WAGONS);
    this.loco = new THREE.InstancedMesh(locoGeo, locoMaterial, 1);
    this.trucks = new THREE.InstancedMesh(truckGeo, truckMaterial, (CROSSING_TRAIN_WAGONS + 1) * 2);
    group.add(this.wagons, this.loco, this.trucks);

    const rails = this.buildParallelTrack(event.distance);
    group.add(rails.mesh, rails.sleepers);

    this.owned = [wagonGeo, locoGeo, truckGeo, rails.mesh.geometry, rails.sleepers.geometry];
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

  private layout(): void {
    if (!this.wagons || !this.loco || !this.trucks) return;
    let truck = 0;
    for (let i = 0; i <= CROSSING_TRAIN_WAGONS; i++) {
      const d = this.headDistance - i * WAGON_SPACING;
      this.track.frameAt(d, this.frame);
      this.position.copy(this.frame.pos)
        .addScaledVector(this.frame.right, this.side * CROSSING_TRACK_OFFSET);
      this.position.y -= 0.42;
      this.basis.makeBasis(this.frame.right, this.frame.up, this.frame.tan.clone().negate());
      this.quat.setFromRotationMatrix(this.basis);
      this.matrix.compose(this.position, this.quat, this.scale);
      if (i === 0) this.loco.setMatrixAt(0, this.matrix);
      else this.wagons.setMatrixAt(i - 1, this.matrix);

      for (const offset of [-3.1, 3.1]) {
        this.track.frameAt(d + offset, this.frame);
        this.position.copy(this.frame.pos)
          .addScaledVector(this.frame.right, this.side * CROSSING_TRACK_OFFSET);
        this.position.y -= 0.34;
        this.basis.makeBasis(this.frame.right, this.frame.up, this.frame.tan.clone().negate());
        this.quat.setFromRotationMatrix(this.basis);
        this.matrix.compose(this.position, this.quat, this.scale);
        this.trucks.setMatrixAt(truck++, this.matrix);
      }
    }
    this.loco.instanceMatrix.needsUpdate = true;
    this.wagons.instanceMatrix.needsUpdate = true;
    this.trucks.instanceMatrix.needsUpdate = true;
  }

  private despawn(): void {
    if (this.group) {
      this.scene.remove(this.group);
      for (const geometry of this.owned) geometry.dispose();
    }
    this.owned = [];
    this.group = null;
    this.wagons = this.loco = this.trucks = null;
  }

  dispose(): void {
    this.despawn();
    this.events = [];
  }
}
