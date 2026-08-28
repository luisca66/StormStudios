// signals.ts — Señalización diegética de la vía (PLAN §6, §7.1 — F6).
//
// Por cada segmento hay tres piezas, y las tres cuentan lo mismo que la consola pero
// mirando al frente, que es donde el jugador tiene los ojos:
//   · SEÑAL AVANZADA al salir de la zona muerta — el disco que anuncia "viene pregunta".
//   · AGUJA al final del segmento, con espadines que se mueven de verdad.
//   · SEMÁFORO DE ALA junto a la aguja: brazo horizontal = pendiente; cae 45° con luz
//     verde = correcto; se queda arriba con luz roja = desvío.
//
// El ramal físico del apartadero es F7: aquí la línea sigue siendo continua y los
// espadines solo se alinean hacia la principal o se quedan cruzados.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  DEAD_ZONE_LENGTH, DISPOSE_BEHIND, RAIL_GAUGE, SEGMENTS_AHEAD, SEGMENT_LENGTH,
} from "@/config";
import { newTrackFrame, type TrackFrame, type TrackManager } from "./track";

export type SwitchResult = "pending" | "correct" | "wrong";

const POST = new THREE.MeshStandardMaterial({ color: "#3d4247", roughness: 0.7, metalness: 0.35 });
const RAIL = new THREE.MeshStandardMaterial({ color: "#b8bcc4", roughness: 0.45, metalness: 0.6 });
const ARM_RED = new THREE.MeshStandardMaterial({ color: "#c62f28", roughness: 0.65 });
const LAMP_OFF = new THREE.MeshStandardMaterial({ color: "#2a2d30", roughness: 0.5 });
const LAMP_GREEN = new THREE.MeshStandardMaterial({
  color: "#38d17c", emissive: "#1fa85c", emissiveIntensity: 2.2, roughness: 0.3,
});
const LAMP_RED = new THREE.MeshStandardMaterial({
  color: "#e04545", emissive: "#a81f1f", emissiveIntensity: 2.2, roughness: 0.3,
});
const DISC_WARN = new THREE.MeshStandardMaterial({
  color: "#e8b53a", emissive: "#7a5c10", emissiveIntensity: 0.5, roughness: 0.6,
  side: THREE.DoubleSide,
});

/** Poste + base, fusionados: el cuerpo común de señal avanzada y semáforo. */
function mastGeometry(height: number): THREE.BufferGeometry {
  const mast = new THREE.CylinderGeometry(0.07, 0.09, height, 8).translate(0, height / 2, 0);
  const base = new THREE.CylinderGeometry(0.26, 0.32, 0.28, 10).translate(0, 0.14, 0);
  return mergeGeometries([mast, base], false) ?? mast;
}

const ADVANCE_MAST = mastGeometry(3.1);
const SIGNAL_MAST = mastGeometry(4.2);
const DISC_GEO = new THREE.CircleGeometry(0.52, 20);
const ARM_GEO = new THREE.BoxGeometry(1.5, 0.2, 0.06).translate(0.68, 0, 0);
const LAMP_GEO = new THREE.SphereGeometry(0.15, 10, 8);
const BLADE_GEO = new THREE.BoxGeometry(0.11, 0.13, 5.6);

interface SegmentSignals {
  index: number;
  group: THREE.Group;
  /** Espadines: se deslizan lateralmente para alinear la aguja. */
  blades: [THREE.Object3D, THREE.Object3D];
  arm: THREE.Object3D;
  lamp: THREE.Mesh;
  disc: THREE.Mesh;
  result: SwitchResult;
  /** 0 = cruzados (pendiente), 1 = alineados a la principal. */
  bladeAlign: number;
  armAngle: number;
}

export class Signals {
  private readonly frame: TrackFrame = newTrackFrame();
  private readonly basis = new THREE.Matrix4();
  private readonly segments = new Map<number, SegmentSignals>();

  constructor(private readonly scene: THREE.Scene, private readonly track: TrackManager) {}

  reset(): void {
    for (const segment of this.segments.values()) this.disposeSegment(segment);
    this.segments.clear();
  }

  setResult(index: number, result: SwitchResult): void {
    const segment = this.segments.get(index);
    if (segment) segment.result = result;
  }

  update(distance: number, dt: number): void {
    const current = Math.floor(distance / SEGMENT_LENGTH);
    for (let i = current; i < current + SEGMENTS_AHEAD; i++) {
      if (i >= 0 && !this.segments.has(i)) this.build(i);
    }
    for (const [index, segment] of this.segments) {
      if ((index + 1) * SEGMENT_LENGTH < distance - DISPOSE_BEHIND) {
        this.disposeSegment(segment);
        this.segments.delete(index);
        continue;
      }
      this.animate(segment, dt);
    }
  }

  private animate(segment: SegmentSignals, dt: number): void {
    // Los espadines solo se alinean cuando la aguja recibió una orden correcta.
    const targetAlign = segment.result === "correct" ? 1 : 0;
    // El ala CAE 45° con el acierto (§6: semáforo de cuadrante inferior); con desvío o
    // pendiente se queda horizontal. Signo verificado midiendo la punta del brazo en
    // coordenadas de mundo (dy < 0), no a ojo: en la captura el brazo engaña.
    const targetArm = segment.result === "correct" ? -Math.PI / 4 : 0;
    const rate = 1 - Math.exp(-7 * dt);
    segment.bladeAlign += (targetAlign - segment.bladeAlign) * rate;
    segment.armAngle += (targetArm - segment.armAngle) * rate;

    // Espadín interior pegado al riel cuando alinea; separado cuando está cruzado.
    const gap = 0.42 * (1 - segment.bladeAlign);
    segment.blades[0].position.x = -RAIL_GAUGE / 2 + 0.16 + gap;
    segment.blades[1].position.x = RAIL_GAUGE / 2 - 0.16 - gap;
    segment.arm.rotation.z = segment.armAngle;
    segment.lamp.material = segment.result === "correct" ? LAMP_GREEN
      : segment.result === "wrong" ? LAMP_RED : LAMP_OFF;
    segment.disc.visible = segment.result === "pending";
  }

  /** Coloca un grupo sobre la vía a una distancia dada, con un desplazamiento lateral. */
  private placeOnTrack(group: THREE.Object3D, distance: number, lateral: number): void {
    this.track.frameAt(distance, this.frame);
    group.position.copy(this.frame.pos).addScaledVector(this.frame.right, lateral);
    group.position.y -= 0.3;
    this.basis.makeBasis(this.frame.right, this.frame.up, this.frame.tan.clone().negate());
    group.quaternion.setFromRotationMatrix(this.basis);
  }

  private build(index: number): void {
    const group = new THREE.Group();
    const switchDistance = (index + 1) * SEGMENT_LENGTH;

    // --- Señal avanzada: anuncia la pregunta al salir de la zona muerta ---
    const advance = new THREE.Group();
    advance.add(new THREE.Mesh(ADVANCE_MAST, POST));
    const disc = new THREE.Mesh(DISC_GEO, DISC_WARN);
    disc.position.set(0, 2.85, 0.06);
    advance.add(disc);
    this.placeOnTrack(advance, index * SEGMENT_LENGTH + DEAD_ZONE_LENGTH, 3.4);
    group.add(advance);

    // --- Semáforo de ala junto a la aguja ---
    const semaphore = new THREE.Group();
    semaphore.add(new THREE.Mesh(SIGNAL_MAST, POST));
    const arm = new THREE.Object3D();
    arm.position.set(0, 3.6, 0.09);
    arm.add(new THREE.Mesh(ARM_GEO, ARM_RED));
    semaphore.add(arm);
    const lamp = new THREE.Mesh(LAMP_GEO, LAMP_OFF);
    lamp.position.set(0, 2.95, 0.16);
    semaphore.add(lamp);
    this.placeOnTrack(semaphore, switchDistance - 6, 3.4);
    group.add(semaphore);

    // --- Aguja: dos espadines móviles sobre los durmientes ---
    const switchGroup = new THREE.Group();
    const blades: [THREE.Object3D, THREE.Object3D] = [new THREE.Object3D(), new THREE.Object3D()];
    for (const blade of blades) {
      const mesh = new THREE.Mesh(BLADE_GEO, RAIL);
      mesh.position.y = 0.07;
      blade.add(mesh);
      switchGroup.add(blade);
    }
    this.placeOnTrack(switchGroup, switchDistance, 0);
    switchGroup.position.y += 0.24;
    group.add(switchGroup);

    this.scene.add(group);
    this.segments.set(index, {
      index, group, blades, arm, lamp, disc,
      result: "pending", bladeAlign: 0, armAngle: 0,
    });
  }

  private disposeSegment(segment: SegmentSignals): void {
    this.scene.remove(segment.group);
    // Las geometrías son compartidas a nivel de módulo: aquí solo se suelta la escena.
  }
}
