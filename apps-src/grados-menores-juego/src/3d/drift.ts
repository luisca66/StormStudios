// drift.ts — La deriva por la nebulosa oscura (PLAN §5.5, §7.1 — F7).
//
// El anillo desalineado escupe al cometa fuera de la ruta: durante un segmento entero
// deriva por un lazo de polvo opaco donde el color se apaga, y luego la gravedad lo
// reincorpora. El castigo no es perder el viaje —eso queda para el modo tirano de §7.8—
// sino perder progreso y, sobre todo, el tiempo y el color.
//
// El desplazamiento NO es otra spline: es un offset lateral sobre la misma ruta, igual
// que el apartadero del Expreso. Así la geometría de la órbita sigue siendo una sola.

import * as THREE from "three";
import { SEGMENT_LENGTH } from "@/config";
import { newTrackFrame, type TrackFrame, type TrackManager } from "./track";

/**
 * Cuánto se aparta del eje en lo más hondo del lazo. No se usa `DRIFT_LOOP_LENGTH` del
 * config: el lazo NO es una spline aparte que haya que recorrer, sino un desvío lateral
 * sobre la ruta que ocupa un segmento. Lo que se ajusta es cuánto se aparta.
 */
const MAX_OFFSET = 26;
/** Garganta de entrada y salida: sin ella el cometa daría un tirón lateral. */
const THROAT = 0.22;

/**
 * Mota redonda. Sin `map`, un THREE.Points se dibuja como un CUADRADO — es el mismo
 * fallo que ya apareció en F3 con el polvo cercano y las motas de la Nebulosa, y aquí
 * volvió a colarse. Si alguna vez ves cuadraditos en pantalla, es esto.
 */
function dustTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.4)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

const DUST = new THREE.PointsMaterial({
  map: dustTexture(), color: 0x6a6a72, size: 2.4, sizeAttenuation: true,
  transparent: true, opacity: 0.5, depthWrite: false, fog: false,
});
const WRECK = new THREE.MeshStandardMaterial({
  color: "#4a4a52", roughness: 0.95, metalness: 0.1, flatShading: true,
});
const LANTERN = new THREE.MeshStandardMaterial({
  color: "#c98b3a", emissive: new THREE.Color("#c9752a"), emissiveIntensity: 1.4,
  roughness: 0.5,
});

/**
 * Lado por el que sale el lazo. Es DETERMINISTA (alterna con el segmento para no
 * cansar) y vive aquí para que el cometa hermano pueda tomar siempre el contrario:
 * ambos se apartan del eje, y compartir lado los metería en la misma trayectoria.
 */
export function driftSideFor(startDistance: number): number {
  return Math.round(startDistance / SEGMENT_LENGTH) % 2 === 0 ? 1 : -1;
}

/**
 * Perfil del lazo: 0 al salir del anillo, 1 en lo más apartado, 0 al reincorporarse.
 * Los `smoothstep` son la garganta: sin ellos habría un tirón en cada extremo.
 */
export function driftOffsetAt(u: number): number {
  const t = THREE.MathUtils.clamp(u, 0, 1);
  const open = THREE.MathUtils.smoothstep(t, 0, THROAT);
  const close = 1 - THREE.MathUtils.smoothstep(t, 1 - THROAT, 1);
  return MAX_OFFSET * Math.min(open, close);
}

export class Drift {
  private readonly frame: TrackFrame = newTrackFrame();
  private group: THREE.Group | null = null;
  private owned: THREE.BufferGeometry[] = [];
  private lantern: THREE.Mesh | null = null;
  private startDistance = 0;
  private side = 1;
  private active = false;
  private elapsed = 0;
  /** 0 = mundo en color; 1 = mundo apagado. Entra de golpe y sale en 2 s (§5.5). */
  private grey = 0;

  constructor(private readonly scene: THREE.Scene, private readonly track: TrackManager) {}

  isActive(): boolean {
    return this.active;
  }

  greyAmount(): number {
    return this.grey;
  }

  offsetFor(distance: number): number {
    if (!this.active) return 0;
    const u = (distance - this.startDistance) / SEGMENT_LENGTH;
    return this.side * driftOffsetAt(u);
  }

  /** `startDistance` es el anillo de salida, y la manda el estado (ver JourneyPorts). */
  begin(startDistance: number, side: number): void {
    this.clear();
    this.startDistance = startDistance;
    this.side = side >= 0 ? 1 : -1;
    this.active = true;
    this.grey = 1; // el apagón es INSTANTÁNEO: el castigo se siente de golpe
    this.elapsed = 0;
    this.build();
  }

  end(): void {
    this.active = false;
    // El color vuelve solo, en 2 s: el contraste gris→cielo es el alivio.
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (!this.active) {
      this.grey = Math.max(0, this.grey - dt / 2);
      if (this.grey === 0 && this.group) this.clear();
    }
    if (this.lantern) {
      // Luz oxidada del pecio: dos senos desfasados, nunca un parpadeo regular.
      const flicker = 0.55 + 0.45 * Math.sin(this.elapsed * 7.3) * Math.sin(this.elapsed * 2.1);
      (this.lantern.material as THREE.MeshStandardMaterial).emissiveIntensity =
        Math.max(0.15, flicker * 2);
    }
  }

  /** El decorado del lazo: polvo opaco y un pecio fantasma con su luz parpadeando. */
  private build(): void {
    const group = new THREE.Group();
    const owned: THREE.BufferGeometry[] = [];

    // Polvo denso a lo largo del lazo: es lo que hace que se sienta "dentro de algo".
    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const distance = this.startDistance + u * SEGMENT_LENGTH;
      this.track.frameAt(distance, this.frame);
      const lateral = this.side * driftOffsetAt(u) + (Math.random() - 0.5) * 34;
      const p = this.frame.pos.clone()
        .addScaledVector(this.frame.right, lateral)
        .addScaledVector(this.frame.up, (Math.random() - 0.5) * 26);
      positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    owned.push(dustGeo);
    group.add(new THREE.Points(dustGeo, DUST));

    // El pecio: un casco roto a media deriva, con una luz que aún parpadea. Es lo que
    // convierte el castigo en un LUGAR, y no en una pausa gris.
    const u = 0.5;
    this.track.frameAt(this.startDistance + u * SEGMENT_LENGTH, this.frame);
    const anchor = this.frame.pos.clone()
      .addScaledVector(this.frame.right, this.side * (driftOffsetAt(u) + 13))
      .addScaledVector(this.frame.up, -3);

    const hullGeo = new THREE.CylinderGeometry(1.5, 2.2, 11, 7, 1, true);
    owned.push(hullGeo);
    const hull = new THREE.Mesh(hullGeo, WRECK);
    hull.position.copy(anchor);
    hull.rotation.set(0.5, 0.9, 1.35); // a la deriva, no aparcado
    group.add(hull);

    const ribGeo = new THREE.TorusGeometry(1.8, 0.14, 5, 12);
    owned.push(ribGeo);
    for (let i = -1; i <= 1; i++) {
      const rib = new THREE.Mesh(ribGeo, WRECK);
      rib.position.copy(anchor).addScaledVector(this.frame.tan, i * 3.4);
      rib.rotation.set(0.5, 0.9, 1.35);
      group.add(rib);
    }

    const lanternGeo = new THREE.SphereGeometry(0.42, 8, 6);
    owned.push(lanternGeo);
    const lantern = new THREE.Mesh(lanternGeo, LANTERN.clone());
    lantern.position.copy(anchor).addScaledVector(this.frame.up, 3.2);
    group.add(lantern);
    this.lantern = lantern;

    this.scene.add(group);
    this.group = group;
    this.owned = owned;
  }

  private clear(): void {
    if (this.group) {
      this.scene.remove(this.group);
      for (const geometry of this.owned) geometry.dispose();
      if (this.lantern) (this.lantern.material as THREE.Material).dispose();
    }
    this.group = null;
    this.owned = [];
    this.lantern = null;
  }

  dispose(): void {
    this.clear();
    this.active = false;
    this.grey = 0;
  }
}
