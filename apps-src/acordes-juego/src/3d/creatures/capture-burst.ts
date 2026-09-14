// Destello de captura: un halo que se abre y chispas que se dispersan titilando mientras la
// criatura se disuelve en luz. Vive en la escena (no en el grupo que se encoge) y sigue a la
// criatura; sus recursos se liberan con dispose().

import * as THREE from "three";
import { getGlowTexture } from "./halo";

const SPARKS = 56;

export class CaptureBurst {
  readonly duration = 1.7;
  private time = 0;
  private root = new THREE.Group();
  private halo: THREE.Sprite;
  private core: THREE.Sprite;
  private points: THREE.Points;
  private offsets: Float32Array;
  private velocities: Float32Array;
  private twinkle: Float32Array;
  private tint: THREE.Color;

  constructor(parent: THREE.Object3D, color: number, private radius: number) {
    this.tint = new THREE.Color(color);
    const spriteMaterial = (opacity: number, c: THREE.Color) => new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color: c,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    // Halo del color de la familia y núcleo blanco que estalla y se apaga.
    this.halo = new THREE.Sprite(spriteMaterial(0, this.tint));
    this.core = new THREE.Sprite(spriteMaterial(0, new THREE.Color(0xffffff)));

    this.offsets = new Float32Array(SPARKS * 3);
    this.velocities = new Float32Array(SPARKS * 3);
    this.twinkle = new Float32Array(SPARKS);
    const dir = new THREE.Vector3();
    for (let i = 0; i < SPARKS; i++) {
      dir.randomDirection();
      dir.toArray(this.offsets, i * 3);
      this.offsets[i * 3] *= radius * 0.35;
      this.offsets[i * 3 + 1] *= radius * 0.35;
      this.offsets[i * 3 + 2] *= radius * 0.35;
      const speed = radius * (0.9 + Math.random() * 1.6);
      this.velocities.set([dir.x * speed, dir.y * speed + radius * 0.35, dir.z * speed], i * 3);
      this.twinkle[i] = Math.random() * Math.PI * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.offsets.slice(), 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
    this.points = new THREE.Points(geometry, new THREE.PointsMaterial({
      map: getGlowTexture(),
      size: Math.min(0.55, 0.12 + radius * 0.12),
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    this.points.frustumCulled = false;

    this.root.add(this.halo, this.core, this.points);
    parent.add(this.root);
  }

  /** Avanza el destello siguiendo a la criatura. Devuelve false cuando terminó. */
  update(dt: number, center: THREE.Vector3): boolean {
    this.time += dt;
    const t = this.time;
    this.root.position.copy(center);

    // Halo: se abre rápido y se desvanece suave.
    const bloom = Math.min(1, t / 0.18);
    const haloFade = Math.max(0, 1 - t / 1.1);
    this.halo.scale.setScalar(this.radius * (2 + 3.2 * easeOut(Math.min(1, t / 0.9))));
    this.halo.material.opacity = 0.75 * bloom * haloFade * haloFade;
    // Núcleo blanco: destello breve al inicio y otro pequeño cuando la criatura se apaga.
    const flash = Math.exp(-t * 7) + 0.55 * Math.exp(-((t - 1.15) ** 2) / 0.012);
    this.core.scale.setScalar(this.radius * (1.2 + 1.6 * flash));
    this.core.material.opacity = Math.min(1, flash);

    // Chispas: se dispersan con arrastre, suben un poco y titilan hasta apagarse.
    const drag = Math.exp(-dt * 1.8);
    const position = this.points.geometry.getAttribute("position") as THREE.BufferAttribute;
    const colors = this.points.geometry.getAttribute("color") as THREE.BufferAttribute;
    const life = t < 0.12 ? t / 0.12 : Math.max(0, 1 - (t - 0.12) / (this.duration - 0.12));
    for (let i = 0; i < SPARKS; i++) {
      for (let k = 0; k < 3; k++) {
        this.velocities[i * 3 + k] *= drag;
        this.offsets[i * 3 + k] += this.velocities[i * 3 + k] * dt;
        position.array[i * 3 + k] = this.offsets[i * 3 + k];
      }
      const sparkle = 0.55 + 0.45 * Math.sin(t * 18 + this.twinkle[i]);
      const glow = life * sparkle;
      // De blanco al color de la familia a medida que se apagan.
      const whiten = Math.max(0, 1 - t / 0.6);
      colors.array[i * 3] = glow * THREE.MathUtils.lerp(this.tint.r, 1, whiten);
      colors.array[i * 3 + 1] = glow * THREE.MathUtils.lerp(this.tint.g, 1, whiten);
      colors.array[i * 3 + 2] = glow * THREE.MathUtils.lerp(this.tint.b, 1, whiten);
    }
    position.needsUpdate = true;
    colors.needsUpdate = true;
    return t < this.duration;
  }

  dispose(): void {
    this.root.removeFromParent();
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.halo.material.dispose();
    this.core.material.dispose();
  }
}

function easeOut(x: number): number {
  return 1 - (1 - x) ** 3;
}
