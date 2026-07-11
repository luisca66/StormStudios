// Criatura (PLAN §6.1, §7): porta un acorde, pulsa su bioluminiscencia al sonar,
// huye al fallar, es capturada al acertar. La fábrica de cada especie entrega el
// visual; aquí vive el comportamiento común.

import * as THREE from "three";
import type { ChordType } from "@/music/chords";
import { INTERACTION } from "@/config";

export type CreatureState = "IDLE" | "LISTENING" | "FLEEING" | "CAPTURED" | "GONE";

export interface CreatureVisual {
  group: THREE.Group;
  /** Materiales emisivos a pulsar con el acorde. */
  glowMaterials: THREE.MeshStandardMaterial[];
  /** Halos aditivos (sprites) a pulsar. */
  glowSprites: THREE.Sprite[];
  /** Radio lógico del cuerpo (la esfera de click usa ×1.5). */
  bodyRadius: number;
  /** Animación idle propia de la especie. */
  animate(dt: number, elapsed: number): void;
}

const FLEE_DURATION = 1.6;
const CAPTURE_DURATION = 1.25;
const GLOW_DECAY_SECONDS = 1.6;
const WHITE = new THREE.Color(0xffffff);

export class Creature {
  state: CreatureState = "IDLE";
  readonly group: THREE.Group;
  readonly clickSphere: THREE.Mesh;
  isLeviathan = false;
  /** Eco de repaso hadal (§6.3). */
  isReview = false;

  private home = new THREE.Vector3();
  private driftPhase = Math.random() * Math.PI * 2;
  private glowEnvelope = 0;
  private fleeDir = new THREE.Vector3();
  private stateTime = 0;
  private baseEmissive: number[];
  private baseSpriteOpacity: number[];

  constructor(
    readonly visual: CreatureVisual,
    readonly speciesId: string,
    readonly chord: ChordType,
    readonly rootNote: string,
  ) {
    this.group = visual.group;
    this.baseEmissive = visual.glowMaterials.map((m) => m.emissiveIntensity);
    this.baseSpriteOpacity = visual.glowSprites.map((s) => s.material.opacity);

    const clickRadius = visual.bodyRadius * INTERACTION.clickRadiusFactor;
    this.clickSphere = new THREE.Mesh(
      new THREE.SphereGeometry(clickRadius, 8, 6),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    this.clickSphere.userData.creature = this;
    this.group.add(this.clickSphere);
  }

  setHome(position: THREE.Vector3): void {
    this.home.copy(position);
    this.group.position.copy(position);
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  /** El acorde suena: destello bioluminiscente (PLAN §7). */
  pulse(): void {
    this.glowEnvelope = 1;
  }

  /** Fallo: huye a la oscuridad (PLAN §6.1 — un solo intento). */
  flee(playerPos: THREE.Vector3): void {
    if (this.state === "FLEEING" || this.state === "CAPTURED") return;
    this.state = "FLEEING";
    this.stateTime = 0;
    // Se aleja del jugador con una tangente aleatoria y un leve descenso.
    this.fleeDir.subVectors(this.group.position, playerPos).setY(0);
    if (this.fleeDir.lengthSq() < 1e-4) this.fleeDir.set(1, 0, 0);
    this.fleeDir.normalize();
    const tangent = new THREE.Vector3(-this.fleeDir.z, 0, this.fleeDir.x)
      .multiplyScalar((Math.random() - 0.5) * 1.2);
    this.fleeDir.add(tangent).setY(-0.25).normalize();
  }

  /** Acierto: escaneada — nada hacia la cámara y se desvanece en blanco. */
  capture(): void {
    if (this.state === "CAPTURED") return;
    this.state = "CAPTURED";
    this.stateTime = 0;
    for (const m of this.visual.glowMaterials) m.emissive.copy(WHITE);
    for (const s of this.visual.glowSprites) s.material.color.copy(WHITE);
  }

  /** Devuelve false cuando debe retirarse de la escena. */
  update(dt: number, elapsed: number, playerPos: THREE.Vector3): boolean {
    this.stateTime += dt;

    // Envolvente de brillo (ataque instantáneo en pulse(), caída ~1.6 s).
    this.glowEnvelope = Math.max(0, this.glowEnvelope - dt / GLOW_DECAY_SECONDS);
    const listenBoost = this.state === "LISTENING" ? 0.4 : 0;
    for (let i = 0; i < this.visual.glowMaterials.length; i++) {
      this.visual.glowMaterials[i].emissiveIntensity =
        this.baseEmissive[i] * (0.75 + listenBoost) + this.glowEnvelope * 2.6;
    }
    for (let i = 0; i < this.visual.glowSprites.length; i++) {
      this.visual.glowSprites[i].material.opacity = Math.min(
        1,
        this.baseSpriteOpacity[i] * (0.8 + listenBoost) + this.glowEnvelope * 0.55,
      );
    }

    switch (this.state) {
      case "IDLE":
      case "LISTENING": {
        // Deriva suave alrededor del punto de origen.
        const t = elapsed * 0.35 + this.driftPhase;
        this.group.position.set(
          this.home.x + Math.cos(t) * 1.1,
          this.home.y + Math.sin(t * 1.7) * 0.9,
          this.home.z + Math.sin(t) * 1.1,
        );
        this.visual.animate(dt, elapsed);
        return true;
      }
      case "FLEEING": {
        const speed = 6 + this.stateTime * 16; // acelera hacia la oscuridad
        this.group.position.addScaledVector(this.fleeDir, speed * dt);
        this.visual.animate(dt * 2.5, elapsed * 2.5); // aleteo frenético
        return this.stateTime < FLEE_DURATION;
      }
      case "CAPTURED": {
        // Nada hacia la cámara mientras se encoge y brilla blanco.
        this.group.position.lerp(playerPos, Math.min(1, 2.2 * dt));
        const k = Math.max(0.06, 1 - this.stateTime / CAPTURE_DURATION);
        this.group.scale.setScalar(k);
        this.visual.animate(dt * 1.5, elapsed);
        return this.stateTime < CAPTURE_DURATION;
      }
      case "GONE":
        return false;
    }
  }

  /** Libera geometrías/materiales propios (la textura de halo es compartida). */
  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      } else if (obj instanceof THREE.Sprite) {
        obj.material.dispose();
      }
    });
  }
}
