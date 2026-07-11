// Población de criaturas (PLAN §6.2): mantiene 4–6 activas alrededor del jugador,
// dentro de la banda Y de la zona actual, separadas entre sí. La asignación de
// acordes viene de fuera (F4: aleatoria de zona; F5: questions.ts con pesos).

import * as THREE from "three";
import { FAMILY_GLOW, INTERACTION, WORLD, ZONES, zoneAtY } from "@/config";
import type { ChordType } from "@/music/chords";
import { Creature } from "./base";
import { LEVIATHAN, speciesForZone, type SpeciesDef } from "./species";
import type { SonarBlip } from "@/ui/sonar";

export interface ChordAssignment {
  chord: ChordType;
  rootNote: string;
  /** Eco de repaso hadal (§6.3): los botones muestran su familia completa. */
  isReview?: boolean;
}

export type ChordAssigner = (zoneIndex: number) => ChordAssignment | null;

export class CreatureManager {
  private creatures: Creature[] = [];
  private spawnCooldown = 0;
  private leviathanSpawnedThisVisit = false;
  private lastZoneIndex = 0;
  /** F5 lo apaga durante transiciones/resumen. */
  spawningEnabled = true;

  constructor(private scene: THREE.Scene, private assignChord: ChordAssigner) {}

  setAssigner(assigner: ChordAssigner): void {
    this.assignChord = assigner;
  }

  get all(): readonly Creature[] {
    return this.creatures;
  }

  /** Objetivos de raycast (esferas de click). */
  clickTargets(): THREE.Object3D[] {
    return this.creatures
      .filter((c) => c.state === "IDLE" || c.state === "LISTENING")
      .map((c) => c.clickSphere);
  }

  update(dt: number, elapsed: number, playerPos: THREE.Vector3): void {
    // Actualiza y retira las que terminaron su huida/captura o quedaron lejos.
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const creature = this.creatures[i];
      const alive = creature.update(dt, elapsed, playerPos);
      const tooFar =
        creature.state === "IDLE" &&
        creature.position.distanceTo(playerPos) > INTERACTION.recycleDistance;
      if (!alive || tooFar) {
        this.scene.remove(creature.group);
        creature.dispose();
        this.creatures.splice(i, 1);
      }
    }

    // Al cambiar de zona, el leviatán vuelve a estar disponible.
    const zone = zoneAtY(playerPos.y);
    if (zone.index !== this.lastZoneIndex) {
      this.lastZoneIndex = zone.index;
      this.leviathanSpawnedThisVisit = false;
    }

    if (!this.spawningEnabled) return;

    this.spawnCooldown -= dt;
    const active = this.creatures.filter(
      (c) => c.state === "IDLE" || c.state === "LISTENING",
    ).length;
    if (active < INTERACTION.maxCreatures && this.spawnCooldown <= 0) {
      this.trySpawn(playerPos, zone.index);
      // Repoblación rápida si quedamos bajo el mínimo; pausada si no.
      this.spawnCooldown = active < INTERACTION.minCreatures ? 0.25 : 1.4;
    }
  }

  private trySpawn(playerPos: THREE.Vector3, zoneIndex: number): void {
    const assignment = this.assignChord(zoneIndex);
    if (!assignment) return;

    // Leviatán: una vez por visita a la Fosa (PLAN §7), 12% de probabilidad por spawn.
    let species: SpeciesDef;
    const wantLeviathan =
      zoneIndex === 5 && !this.leviathanSpawnedThisVisit && Math.random() < 0.12;
    if (wantLeviathan) {
      species = LEVIATHAN;
    } else {
      const pool = speciesForZone(zoneIndex);
      species = pool[Math.floor(Math.random() * pool.length)];
    }

    const position = this.findSpawnPosition(playerPos, zoneIndex, species.id === "leviathan");
    if (!position) return;

    const color = FAMILY_GLOW[assignment.chord.family];
    const creature = new Creature(
      species.build(color),
      species.id,
      assignment.chord,
      assignment.rootNote,
    );
    creature.isLeviathan = species.id === "leviathan";
    creature.isReview = assignment.isReview ?? false;
    creature.setHome(position);
    // Mirando en una dirección aleatoria (los visuales son mayormente simétricos).
    creature.group.rotation.y = Math.random() * Math.PI * 2;
    this.creatures.push(creature);
    this.scene.add(creature.group);
    if (creature.isLeviathan) this.leviathanSpawnedThisVisit = true;
  }

  private findSpawnPosition(
    playerPos: THREE.Vector3,
    zoneIndex: number,
    isLeviathan: boolean,
  ): THREE.Vector3 | null {
    const zone = ZONES[zoneIndex - 1];
    const yMin = zone.yBottom + 10;
    const yMax = zone.yTop - 10;

    for (let attempt = 0; attempt < 12; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = isLeviathan
        ? 45 + Math.random() * 20
        : INTERACTION.spawnRadiusMin +
          Math.random() * (INTERACTION.spawnRadiusMax - INTERACTION.spawnRadiusMin);
      const candidate = new THREE.Vector3(
        playerPos.x + Math.cos(angle) * radius,
        THREE.MathUtils.clamp(
          playerPos.y + (Math.random() - 0.5) * 40,
          Math.min(yMin, yMax),
          Math.max(yMin, yMax),
        ),
        playerPos.z + Math.sin(angle) * radius,
      );

      // Dentro del cilindro del mundo (margen para que la niebla las cubra).
      if (Math.hypot(candidate.x, candidate.z) > WORLD.radius - 4) continue;

      const tooClose = this.creatures.some(
        (c) => c.position.distanceTo(candidate) < INTERACTION.minSeparation,
      );
      if (!tooClose) return candidate;
    }
    return null;
  }

  /** Blips del sonar: rumbo relativo a la mirada (0 = al frente, + = derecha). */
  blips(playerPos: THREE.Vector3, playerYaw: number): SonarBlip[] {
    const fx = -Math.sin(playerYaw);
    const fz = -Math.cos(playerYaw);
    return this.creatures
      .filter((c) => c.state === "IDLE" || c.state === "LISTENING")
      .map((c) => {
        const vx = c.position.x - playerPos.x;
        const vz = c.position.z - playerPos.z;
        const dot = fx * vx + fz * vz;
        const crossY = fx * vz - fz * vx;
        return {
          bearing: Math.atan2(crossY, dot),
          distance: Math.hypot(vx, vz),
          active: c.state === "LISTENING",
        };
      });
  }

  /** Retira todas (cambio de partida). */
  clear(): void {
    for (const c of this.creatures) {
      this.scene.remove(c.group);
      c.dispose();
    }
    this.creatures = [];
    this.leviathanSpawnedThisVisit = false;
  }
}
