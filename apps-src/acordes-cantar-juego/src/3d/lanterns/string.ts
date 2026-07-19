// Cuerda de linternas (PLAN §5.3): globo piloto + cuerda + N linternas colgando
// en su altura interválica REAL (1 st = 0.55 u — ves las terceras apiladas).
// Estados de linterna: off / active / lit / ghost. NADA de PointLight: la luz
// es emissive + halo sprite (presupuesto §5.3).

import * as THREE from "three";
import { GAMEPLAY } from "@/config";
import type { Question } from "@/game/questions";
import { midiToNote } from "@/music/theory";
import { intervalToDegreeLabel } from "@/music/chords";

export type LanternState = "off" | "active" | "lit" | "ghost";

const GHOST_COLOR = new THREE.Color(0x8fa8c8);

interface Lantern {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  halo: THREE.Sprite;
  label: THREE.Sprite;
  state: LanternState;
  baseY: number;
  degree: string;
  note: string;
}

let sharedHalo: THREE.CanvasTexture | null = null;

export class LanternString {
  readonly group = new THREE.Group();
  readonly collision: THREE.Mesh;
  readonly familyColor: THREE.Color;
  docked = false;
  /** No reciclar por distancia (cuerda de la Ballena Celeste §7.5). */
  persistent = false;
  /** Puntos ×2 (ballena). */
  multiplier = 1;
  /** "ascending" (completada) o "losing" (perdida) → despawn. */
  private fate: "alive" | "ascending" | "losing" = "alive";
  private fateT = 0;
  private lanterns: Lantern[] = [];
  private activeIndex = -1;
  private swayPhase = Math.random() * Math.PI * 2;

  constructor(
    readonly id: number,
    readonly question: Question,
    familyColorHex: string,
    readonly instrument: string,
    private showNames: boolean,
    lang: "es" | "en",
  ) {
    this.familyColor = new THREE.Color(familyColorHex);
    const spacing = GAMEPLAY.lanternSpacingPerSemitone;
    const span = Math.max(...question.type.intervals) * spacing;

    // Linterna por nota, apiladas por intervalo real (grave abajo).
    for (const interval of question.type.intervals) {
      const y = interval * spacing;
      const midi = question.rootMidi + interval;
      const degree = intervalToDegreeLabel(interval, lang);
      const note = midiToNote(midi);

      const mat = new THREE.MeshStandardMaterial({
        color: 0x3a3228,
        emissive: this.familyColor,
        emissiveIntensity: 0.08,
        roughness: 0.6,
        transparent: true,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), mat);
      mesh.scale.set(1, 0.8, 1);
      mesh.position.y = y;
      this.group.add(mesh);

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: getHaloTexture(),
          color: this.familyColor,
          transparent: true,
          opacity: 0.12,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      halo.scale.set(1.4, 1.4, 1);
      halo.position.y = y;
      this.group.add(halo);

      const label = makeLabelSprite(showNames ? note : degree);
      label.position.set(0, y, 0.62);
      this.group.add(label);

      this.lanterns.push({ mesh, mat, halo, label, state: "off", baseY: y, degree, note });
    }

    // Globo piloto arriba (esfera con reflejo especular) + cuerda.
    const pilot = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 14, 10),
      new THREE.MeshStandardMaterial({
        color: 0xd8c9a8,
        roughness: 0.25,
        metalness: 0.15,
        transparent: true,
      }),
    );
    pilot.position.y = span + 2.6;
    this.group.add(pilot);

    const ropeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, span + 1.8, 0),
      new THREE.Vector3(0, -0.6, 0),
    ]);
    const rope = new THREE.Line(
      ropeGeo,
      new THREE.LineBasicMaterial({ color: 0xcbb891, transparent: true }),
    );
    this.group.add(rope);

    // Esfera de colisión lógica: envuelve toda la cuerda, radio 1.5× (§5.3).
    const collR = ((span + 3.5) / 2 + 1.2) * GAMEPLAY.clickRadiusFactor;
    this.collision = new THREE.Mesh(
      new THREE.SphereGeometry(collR, 8, 6),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    this.collision.position.y = (span + 2) / 2;
    this.collision.userData.lanternString = this;
    this.group.add(this.collision);
  }

  get noteCount(): number {
    return this.lanterns.length;
  }

  /** Altura del centro (para separación de spawns). */
  get worldPosition(): THREE.Vector3 {
    return this.group.position;
  }

  setActive(index: number): void {
    if (this.activeIndex >= 0 && this.lanterns[this.activeIndex].state === "active") {
      this.applyState(this.activeIndex, "off");
    }
    this.activeIndex = index;
    if (index >= 0 && index < this.lanterns.length) this.applyState(index, "active");
  }

  /** Brillo creciente de la linterna activa con holdProgress (§7.1). */
  setProgress(p: number): void {
    const l = this.lanterns[this.activeIndex];
    if (!l || l.state !== "active") return;
    l.mat.emissiveIntensity = 0.15 + p * 0.85;
    (l.halo.material as THREE.SpriteMaterial).opacity = 0.15 + p * 0.5;
  }

  /** Encendida: emissive pleno, halo grande, revela el nombre de la nota (§2.12). */
  light(index: number): void {
    const l = this.lanterns[index];
    if (!l) return;
    this.applyState(index, "lit");
    swapLabel(l.label, l.note);
  }

  ghost(index: number): void {
    const l = this.lanterns[index];
    if (!l) return;
    this.applyState(index, "ghost");
    swapLabel(l.label, l.note);
  }

  /** Vuelve a intacta (cambio de cuerda o soltar — §7.1). */
  resetLanterns(): void {
    for (let i = 0; i < this.lanterns.length; i++) {
      this.applyState(i, "off");
      const l = this.lanterns[i];
      swapLabel(l.label, this.showNames ? l.note : l.degree);
    }
    this.activeIndex = -1;
  }

  private applyState(index: number, state: LanternState): void {
    const l = this.lanterns[index];
    l.state = state;
    const haloMat = l.halo.material as THREE.SpriteMaterial;
    switch (state) {
      case "off":
        l.mat.emissive.copy(this.familyColor);
        l.mat.emissiveIntensity = 0.08;
        haloMat.color.copy(this.familyColor);
        haloMat.opacity = 0.12;
        l.halo.scale.set(1.4, 1.4, 1);
        break;
      case "active":
        l.mat.emissiveIntensity = 0.15;
        haloMat.opacity = 0.15;
        break;
      case "lit":
        l.mat.emissiveIntensity = 1.0;
        haloMat.opacity = 0.75;
        l.halo.scale.set(3.2, 3.2, 1);
        break;
      case "ghost":
        l.mat.emissive.copy(GHOST_COLOR);
        l.mat.emissiveIntensity = 0.35;
        haloMat.color.copy(GHOST_COLOR);
        haloMat.opacity = 0.3;
        l.halo.scale.set(2.2, 2.2, 1);
        break;
    }
  }

  /** Completada: se suelta y asciende brillando (§7.1). */
  startAscend(): void {
    this.fate = "ascending";
    this.fateT = 0;
    this.docked = false;
  }

  /** Perdida: se desprende y se pierde en el viento (~1.5 s). */
  startLose(): void {
    this.fate = "losing";
    this.fateT = 0;
    this.docked = false;
  }

  get isDying(): boolean {
    return this.fate !== "alive";
  }

  get isDead(): boolean {
    return this.fate !== "alive" && this.fateT > (this.fate === "ascending" ? 3 : 1.6);
  }

  update(dt: number, elapsed: number, wind: THREE.Vector3): void {
    // Balanceo suave de la linterna activa (señalador).
    const l = this.lanterns[this.activeIndex];
    if (l && l.state === "active") {
      l.mesh.position.x = Math.sin(elapsed * 2.2 + this.swayPhase) * 0.12;
      l.halo.position.x = l.mesh.position.x;
    }

    if (this.fate === "alive") {
      if (!this.docked) this.group.position.addScaledVector(wind, dt);
      return;
    }

    this.fateT += dt;
    if (this.fate === "ascending") {
      this.group.position.y += (6 + this.fateT * 5) * dt;
      this.setOpacity(Math.max(0, 1 - this.fateT / 2.8));
    } else {
      this.group.position.addScaledVector(wind, dt * 14);
      this.group.position.y -= this.fateT * 2 * dt;
      this.setOpacity(Math.max(0, 1 - this.fateT / 1.5));
    }
  }

  private setOpacity(o: number): void {
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.Material | undefined;
      if (mat && "opacity" in mat) {
        if (mat instanceof THREE.SpriteMaterial) mat.opacity = Math.min(mat.opacity, o);
        else mat.opacity = o;
      }
    });
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.group);
  }
}

function getHaloTexture(): THREE.CanvasTexture {
  if (sharedHalo) return sharedHalo;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.4)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  sharedHalo = new THREE.CanvasTexture(canvas);
  return sharedHalo;
}

function drawLabel(canvas: HTMLCanvasElement, text: string): void {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const font = document.fonts?.check("700 26px Rajdhani") ? "Rajdhani" : "sans-serif";
  ctx.font = `700 26px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "rgba(20,12,6,0.85)";
  ctx.lineWidth = 5;
  ctx.strokeText(text, 48, 20);
  ctx.fillStyle = "rgba(243,234,215,0.96)";
  ctx.fillText(text, 48, 20);
}

function makeLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 40;
  drawLabel(canvas, text);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
    }),
  );
  sprite.scale.set(1.7, 0.71, 1);
  sprite.userData.canvas = canvas;
  return sprite;
}

function swapLabel(sprite: THREE.Sprite, text: string): void {
  const canvas = sprite.userData.canvas as HTMLCanvasElement;
  drawLabel(canvas, text);
  ((sprite.material as THREE.SpriteMaterial).map as THREE.CanvasTexture).needsUpdate = true;
}
