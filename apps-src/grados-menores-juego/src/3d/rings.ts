// rings.ts — Señalización diegética de la órbita (PLAN §6, §7.1 — F6).
//
// Por cada segmento hay dos piezas, y ambas cuentan lo mismo que la consola pero mirando
// al frente, que es donde el jugador tiene los ojos:
//   · BALIZA al salir de la zona muerta — el púlsar de latón que anuncia "viene pregunta".
//   · ANILLO DE NAVEGACIÓN al final del segmento, con espadines de luz que se mueven:
//     cruzados = pendiente; alineados y verdes = correcto; rojos y torcidos = deriva.
//
// El lazo físico por la nebulosa es F7: aquí la ruta sigue siendo continua y los
// espadines solo se alinean o se quedan cruzados.

import * as THREE from "three";
import { DEAD_ZONE_LENGTH, DISPOSE_BEHIND, SEGMENTS_AHEAD, SEGMENT_LENGTH } from "@/config";
import { newTrackFrame, type TrackFrame, type TrackManager } from "./track";

export type RingResult = "pending" | "correct" | "wrong";

const BRASS = new THREE.MeshStandardMaterial({
  color: "#c9a227", roughness: 0.35, metalness: 0.85,
  emissive: new THREE.Color("#3a2c08"), emissiveIntensity: 0.7,
});
const BLADE_PENDING = new THREE.MeshBasicMaterial({
  color: "#9fd8e8", transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending,
});
const BLADE_CORRECT = new THREE.MeshBasicMaterial({
  color: "#38d17c", transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending,
});
const BLADE_WRONG = new THREE.MeshBasicMaterial({
  color: "#e04545", transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending,
});

const RING_RADIUS = 7.5;
const RING_GEO = new THREE.TorusGeometry(RING_RADIUS, 0.22, 8, 40);
const RING_INNER_GEO = new THREE.TorusGeometry(RING_RADIUS - 1.1, 0.09, 6, 32);
const BLADE_GEO = new THREE.BoxGeometry(0.16, RING_RADIUS * 0.92, 0.16);
const PULSAR_CORE_GEO = new THREE.OctahedronGeometry(0.55, 0);
const PULSAR_RING_GEO = new THREE.TorusGeometry(1.1, 0.07, 6, 24);

interface SegmentRing {
  index: number;
  group: THREE.Group;
  /** Espadines de luz: giran hasta alinearse con el anillo. */
  blades: [THREE.Mesh, THREE.Mesh];
  /** Anillo giratorio de la baliza: late mientras la pregunta está viva. */
  pulsarRing: THREE.Mesh;
  pulsarCore: THREE.Mesh;
  result: RingResult;
  /** 0 = espadines cruzados (pendiente), 1 = alineados. */
  aligned: number;
  /** Destino de `aligned`: el movimiento del anillo dura 0.4 s (§5.1). */
  target: number;
}

export class Rings {
  private readonly segments = new Map<number, SegmentRing>();
  private readonly frame: TrackFrame = newTrackFrame();
  private readonly basis = new THREE.Matrix4();
  private elapsed = 0;

  constructor(private readonly scene: THREE.Scene, private readonly track: TrackManager) {}

  reset(): void {
    for (const segment of this.segments.values()) this.dispose(segment);
    this.segments.clear();
    this.elapsed = 0;
  }

  /** Estado visible del anillo de un segmento: lo manda la máquina de estados. */
  setResult(index: number, result: RingResult): void {
    const segment = this.segments.get(index);
    if (!segment) return;
    segment.result = result;
    const material =
      result === "correct" ? BLADE_CORRECT : result === "wrong" ? BLADE_WRONG : BLADE_PENDING;
    for (const blade of segment.blades) blade.material = material;
    // Acertar ALINEA los espadines; fallar los deja cruzados, que es lo que echa al
    // cometa fuera de la ruta cuando llegue F7.
    segment.target = result === "correct" ? 1 : 0;
  }

  update(cometDistance: number, dt: number): void {
    this.elapsed += dt;
    const current = Math.floor(cometDistance / SEGMENT_LENGTH);
    for (let i = current; i < current + SEGMENTS_AHEAD; i++) {
      if (i >= 0 && !this.segments.has(i)) this.build(i);
    }
    for (const [index, segment] of this.segments) {
      if ((index + 1) * SEGMENT_LENGTH < cometDistance - DISPOSE_BEHIND) {
        this.dispose(segment);
        this.segments.delete(index);
      }
    }

    for (const segment of this.segments.values()) {
      // Los espadines viajan a su destino en ~0.4 s (§5.1).
      segment.aligned += (segment.target - segment.aligned) * Math.min(1, dt * 6);
      const angle = (1 - segment.aligned) * Math.PI * 0.28;
      segment.blades[0].rotation.z = angle;
      segment.blades[1].rotation.z = -angle;

      // La baliza late y gira: es lo que dice "prepárate, viene nota".
      segment.pulsarRing.rotation.z += dt * 1.4;
      const pulse = 1 + Math.sin(this.elapsed * 4.2) * 0.16;
      segment.pulsarCore.scale.setScalar(pulse);
    }
  }

  private build(index: number): void {
    const group = new THREE.Group();
    const ringDistance = (index + 1) * SEGMENT_LENGTH;
    const balizaDistance = index * SEGMENT_LENGTH + DEAD_ZONE_LENGTH;

    // --- El anillo de navegación, al final del segmento.
    this.track.frameAt(ringDistance, this.frame);
    const ring = new THREE.Group();
    // El anillo mira a lo largo de la ruta: se cruza por dentro, no de lado.
    this.basis.makeBasis(this.frame.right, this.frame.up, this.frame.tan.clone().negate());
    ring.quaternion.setFromRotationMatrix(this.basis);
    ring.position.copy(this.frame.pos);
    ring.add(new THREE.Mesh(RING_GEO, BRASS), new THREE.Mesh(RING_INNER_GEO, BRASS));

    const bladeA = new THREE.Mesh(BLADE_GEO, BLADE_PENDING);
    const bladeB = new THREE.Mesh(BLADE_GEO, BLADE_PENDING);
    ring.add(bladeA, bladeB);
    group.add(ring);

    // --- La baliza: púlsar de latón que precede al anillo.
    this.track.frameAt(balizaDistance, this.frame);
    const pulsar = new THREE.Group();
    this.basis.makeBasis(this.frame.right, this.frame.up, this.frame.tan.clone().negate());
    pulsar.quaternion.setFromRotationMatrix(this.basis);
    // Apartada del eje y algo alta: se ve venir sin estorbar el paso.
    pulsar.position.copy(this.frame.pos)
      .addScaledVector(this.frame.right, 5.2)
      .addScaledVector(this.frame.up, 2.4);
    const core = new THREE.Mesh(PULSAR_CORE_GEO, BRASS);
    const pulsarRing = new THREE.Mesh(PULSAR_RING_GEO, BRASS);
    pulsar.add(core, pulsarRing);
    group.add(pulsar);

    this.scene.add(group);
    this.segments.set(index, {
      index, group, blades: [bladeA, bladeB], pulsarRing, pulsarCore: core,
      result: "pending", aligned: 0, target: 0,
    });
  }

  private dispose(segment: SegmentRing): void {
    this.scene.remove(segment.group);
    // Geometrías y materiales son COMPARTIDOS (constantes del módulo): liberar aquí
    // rompería los segmentos que vienen. Solo se suelta el grupo.
  }
}
