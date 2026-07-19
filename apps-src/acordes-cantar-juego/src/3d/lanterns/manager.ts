// Spawn/despawn y deriva de las cuerdas de linternas (PLAN §5.3): 3–4 activas,
// radio 25–70 u del jugador, separación ≥20 u, banda Y de la capa, reciclado a
// >90 u. La asignación de acordes la provee main vía onNeedQuestion (regla §11:
// 3d/ no importa de game/ su lógica de sorteo).

import * as THREE from "three";
import { GAMEPLAY, LAYERS, layerAtY } from "@/config";
import type { Question } from "@/game/questions";
import { LanternString } from "./string";
import type { CompassBlip } from "@/ui/compass";

export interface SpawnInfo {
  question: Question;
  familyColor: string;
  instrument: string;
}

export class LanternManager {
  strings: LanternString[] = [];
  /** main provee el sorteo (tipo+fundamental+timbre) para la capa dada. */
  onNeedQuestion: ((layerNum: number) => SpawnInfo) | null = null;
  showNames = false;
  lang: "es" | "en" = "es";
  private nextId = 1;

  constructor(private scene: THREE.Scene) {}

  reset(): void {
    for (const s of this.strings) s.dispose(this.scene);
    this.strings = [];
  }

  /** Mantiene 3–4 cuerdas vivas alrededor del jugador (llamar cada frame). */
  maintain(playerPos: THREE.Vector3): void {
    const alive = this.strings.filter((s) => !s.isDying);
    for (let i = alive.length; i < GAMEPLAY.activeStrings; i++) this.spawn(playerPos);
  }

  private spawn(playerPos: THREE.Vector3): void {
    if (!this.onNeedQuestion) return;
    const layer = layerAtY(playerPos.y);

    // Posición: radio 25–70, separada ≥20 de las demás, dentro de la banda Y.
    let pos: THREE.Vector3 | null = null;
    for (let tries = 0; tries < 24 && !pos; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r =
        GAMEPLAY.spawnRadiusMin +
        Math.random() * (GAMEPLAY.spawnRadiusMax - GAMEPLAY.spawnRadiusMin);
      const y = THREE.MathUtils.clamp(
        playerPos.y + (Math.random() - 0.5) * 60,
        layer.yBottom + 8,
        layer.yTop - 14,
      );
      const cand = new THREE.Vector3(
        playerPos.x + Math.cos(a) * r,
        y,
        playerPos.z + Math.sin(a) * r,
      );
      const farEnough = this.strings.every(
        (s) => s.group.position.distanceTo(cand) >= GAMEPLAY.spawnMinSeparation,
      );
      if (farEnough) pos = cand;
    }
    if (!pos) return; // frame siguiente lo reintenta

    const info = this.onNeedQuestion(layer.num);
    const str = new LanternString(
      this.nextId++,
      info.question,
      info.familyColor,
      info.instrument,
      this.showNames,
      this.lang,
    );
    str.group.position.copy(pos);
    this.scene.add(str.group);
    this.strings.push(str);
  }

  update(dt: number, playerPos: THREE.Vector3, elapsed: number, wind: THREE.Vector3): void {
    for (const s of this.strings) s.update(dt, elapsed, wind);

    // Reciclado: muertas, o vivas no amarradas que se alejaron > 90 u.
    const toRemove = this.strings.filter(
      (s) =>
        s.isDead ||
        (!s.docked && !s.isDying && !s.persistent &&
          s.group.position.distanceTo(playerPos) > GAMEPLAY.despawnDistance),
    );
    for (const s of toRemove) {
      s.dispose(this.scene);
      this.strings.splice(this.strings.indexOf(s), 1);
    }
  }

  /** Cuerda externa (la de la Ballena Celeste): entra al raycast/blips. */
  addPersistent(str: LanternString): void {
    str.persistent = true;
    this.scene.add(str.group);
    this.strings.push(str);
  }

  /** Esferas de colisión para el raycast de click/hover. */
  clickTargets(): THREE.Object3D[] {
    return this.strings.filter((s) => !s.isDying).map((s) => s.collision);
  }

  /** Cuerda viva más cercana (tecla E, §8). */
  nearest(playerPos: THREE.Vector3): { str: LanternString; dist: number } | null {
    let best: { str: LanternString; dist: number } | null = null;
    for (const s of this.strings) {
      if (s.isDying) continue;
      const d = s.group.position.distanceTo(playerPos);
      if (!best || d < best.dist) best = { str: s, dist: d };
    }
    return best;
  }

  /** Blips del radar: rumbo relativo a la proa (0 = al frente, + = derecha). */
  blips(playerPos: THREE.Vector3, playerYaw: number): CompassBlip[] {
    const fx = -Math.sin(playerYaw);
    const fz = -Math.cos(playerYaw);
    return this.strings
      .filter((s) => !s.isDying)
      .map((s) => {
        const vx = s.group.position.x - playerPos.x;
        const vz = s.group.position.z - playerPos.z;
        const dot = fx * vx + fz * vz;
        const crossY = fx * vz - fz * vx;
        return {
          bearing: Math.atan2(crossY, dot),
          distance: Math.hypot(vx, vz),
          inRange: s.group.position.distanceTo(playerPos) <= GAMEPLAY.interactMaxDistance,
          color: `#${s.familyColor.getHexString()}`,
          active: s.docked,
        };
      });
  }

  /** Banda Y navegable de la capa (para clamps futuros F7). */
  layerBand(layerNum: number): { yBottom: number; yTop: number } {
    const l = LAYERS.find((x) => x.num === layerNum) ?? LAYERS[0];
    return { yBottom: l.yBottom, yTop: l.yTop };
  }
}
