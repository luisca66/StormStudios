// detour.ts — El apartadero (PLAN §5.5, F7).
//
// El ramal NO es una spline aparte: es un DESPLAZAMIENTO LATERAL sobre la misma vía.
// El tren se abre del eje, corre en paralelo y vuelve a cerrarse — que es exactamente
// la forma de un apartadero real, y así hereda gratis curvas, peralte y streaming sin
// duplicar la geometría del mundo.
//
// El lazo ocupa un segmento entero, de modo que la reincorporación cae justo en un
// límite y la pregunta siguiente llega con ventana completa.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RAIL_GAUGE, SEGMENT_LENGTH } from "@/config";
import { newTrackFrame, type TrackFrame, type TrackManager } from "./track";

/** Cuánto se aparta el ramal del eje principal, en su punto más ancho. */
const MAX_OFFSET = 13;
/** Fracción del lazo que ocupan la salida y la entrada de la aguja. */
const THROAT = 0.22;

const DRY_TRUNK = new THREE.MeshStandardMaterial({ color: "#4b4034", roughness: 1 });
const GRASS = new THREE.MeshStandardMaterial({
  color: "#7c7a5c", roughness: 1, side: THREE.DoubleSide,
});
const PLATFORM = new THREE.MeshStandardMaterial({ color: "#6e6a63", roughness: 0.95 });
const RUST = new THREE.MeshStandardMaterial({ color: "#7a5b45", roughness: 0.85 });
const LANTERN_ON = new THREE.MeshStandardMaterial({
  color: "#ffd9a0", emissive: "#c98a30", emissiveIntensity: 1.8, roughness: 0.5,
});
const RAIL = new THREE.MeshStandardMaterial({ color: "#8d8579", roughness: 0.6, metalness: 0.45 });
const SLEEPER = new THREE.MeshStandardMaterial({ color: "#40342a", roughness: 1 });

function dryTreeGeometry(): THREE.BufferGeometry {
  const parts = [new THREE.CylinderGeometry(0.16, 0.24, 3.4, 6).translate(0, 1.7, 0)];
  for (let i = 0; i < 4; i++) {
    const branch = new THREE.CylinderGeometry(0.06, 0.09, 1.7, 5);
    branch.translate(0, 0.85, 0);
    branch.rotateZ(0.9 - (i % 2) * 1.8);
    branch.rotateY((i / 4) * Math.PI * 2);
    branch.translate(0, 2.3, 0);
    parts.push(branch);
  }
  return mergeGeometries(parts, false) ?? parts[0];
}

const DRY_TREE_GEO = dryTreeGeometry();
const GRASS_GEO = new THREE.PlaneGeometry(0.5, 0.9).translate(0, 0.45, 0);
const SLEEPER_GEO = new THREE.BoxGeometry(2.5, 0.15, 0.5);

/**
 * Lado por el que sale el ramal en una aguja dada. Es DETERMINISTA (alterna con el
 * segmento para no cansar) y vive aquí para que el tren de carga cruzado pueda tomar
 * siempre el lado contrario: ambos usan un desplazamiento de 13 u, así que compartir
 * lado los mete en el MISMO carril y se cruzan de frente.
 */
export function detourSideFor(startDistance: number): number {
  return Math.round(startDistance / SEGMENT_LENGTH) % 2 === 0 ? 1 : -1;
}

/**
 * Perfil del ramal: 0 en la aguja de salida, 1 en el tramo paralelo, 0 al reincorporarse.
 * Los `smoothstep` son la garganta de la aguja: sin ellos el tren daría un tirón lateral.
 */
export function detourOffsetAt(u: number): number {
  const t = THREE.MathUtils.clamp(u, 0, 1);
  const open = THREE.MathUtils.smoothstep(t, 0, THROAT);
  const close = 1 - THREE.MathUtils.smoothstep(t, 1 - THROAT, 1);
  return MAX_OFFSET * Math.min(open, close);
}

export class Detour {
  private readonly frame: TrackFrame = newTrackFrame();
  private readonly basis = new THREE.Matrix4();
  private group: THREE.Group | null = null;
  private owned: THREE.BufferGeometry[] = [];
  private lantern: THREE.Mesh | null = null;
  private startDistance = 0;
  private side = 1;
  private active = false;
  private elapsed = 0;
  /** 0 = mundo normal, 1 = apartadero gris. Sube de golpe y baja en 2 s (§5.5). */
  private grey = 0;

  constructor(private readonly scene: THREE.Scene, private readonly track: TrackManager) {}

  isActive(): boolean {
    return this.active;
  }

  greyAmount(): number {
    return this.grey;
  }

  /** Desplazamiento lateral del tren AHORA mismo, en unidades de mundo. */
  offsetFor(distance: number): number {
    if (!this.active) return 0;
    const u = (distance - this.startDistance) / SEGMENT_LENGTH;
    return this.side * detourOffsetAt(u);
  }

  /** `startDistance` es la aguja de salida, y la manda el estado (ver JourneyPorts). */
  begin(startDistance: number, side: number): void {
    this.clear();
    this.startDistance = startDistance;
    this.side = side >= 0 ? 1 : -1;
    this.active = true;
    this.grey = 1; // desaturación INSTANTÁNEA (§5.5): el castigo se siente de golpe
    this.elapsed = 0;
    this.build();
  }

  end(): void {
    this.active = false;
    // El color vuelve solo, en 2 s: el contraste gris→color es el alivio.
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (!this.active) {
      this.grey = Math.max(0, this.grey - dt / 2);
      if (this.grey === 0 && this.group) this.clear();
    }
    if (this.lantern) {
      // Farol oxidado parpadeante: dos senos desfasados, nunca un parpadeo regular.
      const flicker = 0.55 + 0.45 * Math.sin(this.elapsed * 7.3) * Math.sin(this.elapsed * 2.1);
      (this.lantern.material as THREE.MeshStandardMaterial).emissiveIntensity =
        Math.max(0.15, flicker * 2);
    }
  }

  private build(): void {
    const group = new THREE.Group();
    const owned: THREE.BufferGeometry[] = [];

    // --- Vía del ramal: cinta de dos rieles siguiendo el mismo perfil que el tren ---
    const positions: number[] = [];
    const indices: number[] = [];
    const steps = 70;
    let vertex = 0;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const d = this.startDistance + u * SEGMENT_LENGTH;
      this.track.frameAt(d, this.frame);
      const lateral = this.side * detourOffsetAt(u);
      const center = this.frame.pos.clone().addScaledVector(this.frame.right, lateral);
      for (const rail of [-RAIL_GAUGE / 2, RAIL_GAUGE / 2]) {
        for (const w of [-0.08, 0.08]) {
          const p = center.clone().addScaledVector(this.frame.right, rail + w);
          positions.push(p.x, p.y - 0.02, p.z);
        }
      }
      if (i < steps) {
        const a = vertex;
        indices.push(a, a + 1, a + 4, a + 1, a + 5, a + 4);
        indices.push(a + 2, a + 3, a + 6, a + 3, a + 7, a + 6);
      }
      vertex += 4;
    }
    const railGeo = new THREE.BufferGeometry();
    railGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    railGeo.setIndex(indices);
    railGeo.computeVertexNormals();
    group.add(new THREE.Mesh(railGeo, RAIL));
    owned.push(railGeo);

    // --- Durmientes y hierba alta ENTRE ellos: el ramal está abandonado ---
    const sleeperCount = 64;
    const sleepers = new THREE.InstancedMesh(SLEEPER_GEO, SLEEPER, sleeperCount);
    const grass = new THREE.InstancedMesh(GRASS_GEO, GRASS, sleeperCount * 2);
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    let g = 0;
    for (let i = 0; i < sleeperCount; i++) {
      const u = (i + 0.5) / sleeperCount;
      const d = this.startDistance + u * SEGMENT_LENGTH;
      this.track.frameAt(d, this.frame);
      const lateral = this.side * detourOffsetAt(u);
      const center = this.frame.pos.clone().addScaledVector(this.frame.right, lateral);
      this.basis.makeBasis(this.frame.right, this.frame.up, this.frame.tan.clone().negate());
      quat.setFromRotationMatrix(this.basis);
      matrix.compose(center.clone().setY(center.y - 0.17), quat, scale.set(1, 1, 1));
      sleepers.setMatrixAt(i, matrix);
      for (const sway of [-0.5, 0.55]) {
        matrix.compose(
          center.clone().addScaledVector(this.frame.right, sway).setY(center.y - 0.2),
          quat, scale.set(1, 0.7 + (i % 3) * 0.35, 1),
        );
        grass.setMatrixAt(g++, matrix);
      }
    }
    sleepers.instanceMatrix.needsUpdate = true;
    grass.instanceMatrix.needsUpdate = true;
    group.add(sleepers, grass);

    // --- Árboles secos al borde del ramal ---
    const trees = new THREE.InstancedMesh(DRY_TREE_GEO, DRY_TRUNK, 14);
    for (let i = 0; i < 14; i++) {
      const u = 0.1 + (i / 14) * 0.85;
      const d = this.startDistance + u * SEGMENT_LENGTH;
      this.track.frameAt(d, this.frame);
      const lateral = this.side * (detourOffsetAt(u) + 7 + (i % 4) * 3.5);
      const p = this.frame.pos.clone().addScaledVector(this.frame.right, lateral);
      quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.7);
      matrix.compose(p.setY(p.y - 0.7), quat, scale.setScalar(0.8 + (i % 3) * 0.3));
      trees.setMatrixAt(i, matrix);
    }
    trees.instanceMatrix.needsUpdate = true;
    group.add(trees);

    // --- Andén fantasma con farol oxidado, a media vuelta (donde llega la revelación) ---
    const platform = new THREE.Group();
    const d = this.startDistance + SEGMENT_LENGTH * 0.5;
    this.track.frameAt(d, this.frame);
    platform.position.copy(this.frame.pos)
      .addScaledVector(this.frame.right, this.side * (detourOffsetAt(0.5) + 4.2));
    platform.position.y -= 0.7;
    this.basis.makeBasis(this.frame.right, this.frame.up, this.frame.tan.clone().negate());
    platform.quaternion.setFromRotationMatrix(this.basis);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 17), PLATFORM);
    deck.position.y = 0.35;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.1, 6), RUST);
    post.position.set(-1.1, 2.25, 0);
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), LANTERN_ON);
    lantern.position.set(-1.1, 3.9, 0);
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.3, 4), RUST);
    hood.position.set(-1.1, 4.25, 0);
    platform.add(deck, post, lantern, hood);
    owned.push(deck.geometry, post.geometry, lantern.geometry, hood.geometry);
    this.lantern = lantern;
    group.add(platform);

    this.scene.add(group);
    this.group = group;
    this.owned = owned;
  }

  private clear(): void {
    if (this.group) {
      this.scene.remove(this.group);
      for (const geometry of this.owned) geometry.dispose();
      this.group.traverse((o) => {
        if (o instanceof THREE.InstancedMesh) o.dispose();
      });
    }
    this.group = null;
    this.owned = [];
    this.lantern = null;
  }

  dispose(): void {
    this.active = false;
    this.grey = 0;
    this.clear();
  }
}
