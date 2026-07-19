// Controlador del globo (PLAN §8): navegación libre 3D con inercia de globo.
// W/S avanzar hacia donde miras (plano horizontal), A/D strafe, Q/E-Space/Shift
// vertical, drag = mirar (yaw libre, pitch ±85°). Cursor SIEMPRE visible, SIN
// pointer lock. Click corto (<5 px, <250 ms) = amarrar (F6). Deriva de viento
// constante por capa. Durante AMARRADO el movimiento se ignora (docked).

import * as THREE from "three";
import { PHYSICS, WORLD } from "@/config";

const CLICK_MAX_PX = 5;
const CLICK_MAX_MS = 250;

export class PlayerController {
  // Rig: yawObject (posición + yaw) → pitchObject → cámara.
  readonly yawObject = new THREE.Object3D();
  private pitchObject = new THREE.Object3D();

  private keys = new Set<string>();
  private velocity = new THREE.Vector3();
  private enabled = false;
  /** AMARRADO: el globo se frena suave y los inputs de movimiento se ignoran (§7.1). */
  docked = false;

  private dragging = false;
  private dragMoved = false;
  private dragStart = { x: 0, y: 0, t: 0 };
  private lastPointer = { x: 0, y: 0 };
  /** Última posición del cursor (hover-raycast del renderer). */
  readonly pointer = { x: -9999, y: -9999 };

  /** El renderer conecta aquí el raycast de "amarrarse" (F6). */
  onTap: ((clientX: number, clientY: number) => void) | null = null;
  /** Pausa (Esc) — lo conecta main.ts. */
  onEscape: (() => void) | null = null;
  /** Y máxima permitida (esclusa cerrada, F7). null = sin límite. */
  altitudeLimit: number | null = null;
  /** Viento de la capa actual — lo actualiza el renderer cada frame. */
  readonly wind = new THREE.Vector3();

  private elapsed = 0;

  constructor(private camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.pitchObject.add(camera);
    this.yawObject.add(this.pitchObject);

    window.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "Escape") {
        this.onEscape?.();
        return;
      }
      this.keys.add(e.key.toLowerCase());
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) {
        // Con fakemic las flechas son del afinador; el juego usa WASD igual.
        if (!this.docked) e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => this.keys.clear());

    canvas.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      this.beginDrag(e.clientX, e.clientY);
    });
    window.addEventListener("mousemove", (e) => {
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      this.moveDrag(e.clientX, e.clientY);
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button !== 0) return;
      this.endDrag(e.clientX, e.clientY);
    });

    // touch-action: none ya está en el canvas; layout flexible (decisión §2.17).
    canvas.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length === 1) this.beginDrag(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: true },
    );
    canvas.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches.length === 1) {
          this.moveDrag(e.touches[0].clientX, e.touches[0].clientY);
          e.preventDefault();
        }
      },
      { passive: false },
    );
    canvas.addEventListener("touchend", (e) => {
      const t = e.changedTouches[0];
      if (t) this.endDrag(t.clientX, t.clientY);
    });
  }

  private beginDrag(x: number, y: number): void {
    this.dragging = true;
    this.dragMoved = false;
    this.dragStart = { x, y, t: performance.now() };
    this.lastPointer = { x, y };
  }

  private moveDrag(x: number, y: number): void {
    if (!this.dragging) return;
    const dx = x - this.lastPointer.x;
    const dy = y - this.lastPointer.y;
    this.lastPointer = { x, y };
    if (
      Math.abs(x - this.dragStart.x) > CLICK_MAX_PX ||
      Math.abs(y - this.dragStart.y) > CLICK_MAX_PX
    ) {
      this.dragMoved = true;
    }
    if (!this.enabled || !this.dragMoved) return;

    // Mirar: yaw libre + pitch clamp ±85° (§8). Amarrado también puedes mirar.
    this.yawObject.rotation.y -= dx * PHYSICS.lookSensitivity;
    this.pitchObject.rotation.x = THREE.MathUtils.clamp(
      this.pitchObject.rotation.x - dy * PHYSICS.lookSensitivity,
      -PHYSICS.pitchMax,
      PHYSICS.pitchMax,
    );
  }

  private endDrag(x: number, y: number): void {
    if (!this.dragging) return;
    this.dragging = false;
    const dtMs = performance.now() - this.dragStart.t;
    if (!this.dragMoved && dtMs < CLICK_MAX_MS && this.enabled) {
      this.onTap?.(x, y);
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.keys.clear();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  get position(): THREE.Vector3 {
    return this.yawObject.position;
  }

  get yaw(): number {
    return this.yawObject.rotation.y;
  }

  get speed(): number {
    return this.velocity.length();
  }

  /** Velocidad vertical (u/s) — alimenta el rugido del quemador (§6). */
  get verticalVelocity(): number {
    return this.velocity.y;
  }

  /** Empuje vertical instantáneo (recompensa de cuerda completada, §7.1). */
  addImpulse(dy: number): void {
    this.velocity.y += dy;
  }

  setPose(x: number, y: number, z: number, yaw = 0, pitch = 0): void {
    this.yawObject.position.set(x, y, z);
    this.yawObject.rotation.y = yaw;
    this.pitchObject.rotation.x = THREE.MathUtils.clamp(pitch, -PHYSICS.pitchMax, PHYSICS.pitchMax);
    this.velocity.set(0, 0, 0);
  }

  getLookDirection(target: THREE.Vector3): THREE.Vector3 {
    return this.camera.getWorldDirection(target);
  }

  private key(...names: string[]): boolean {
    return names.some((n) => this.keys.has(n));
  }

  update(dt: number): void {
    this.elapsed += dt;

    // Balanceo procedural SIEMPRE (roll ±1°, seno lento — flotar, no nadar §6).
    this.camera.rotation.z =
      Math.sin(this.elapsed * PHYSICS.camRollSpeed * Math.PI * 2) * PHYSICS.camRollAmplitude;

    if (!this.enabled) return;

    // ── Ejes de entrada (ignorados durante AMARRADO: auto-hover §7.1) ──
    const forwardInput = this.docked
      ? 0
      : (this.key("w", "arrowup") ? 1 : 0) - (this.key("s", "arrowdown") ? 1 : 0);
    const strafeInput = this.docked
      ? 0
      : (this.key("d", "arrowright") ? 1 : 0) - (this.key("a", "arrowleft") ? 1 : 0);
    const verticalInput = this.docked
      ? 0
      : (this.key("q", " ") ? 1 : 0) - (this.key("e", "shift") ? 1 : 0);

    // ── Velocidad objetivo en el plano horizontal del yaw de la vista ──
    const yaw = this.yawObject.rotation.y;
    const target = new THREE.Vector3(
      (-Math.sin(yaw) * forwardInput + Math.cos(yaw) * strafeInput) * PHYSICS.maxSpeedH,
      verticalInput * PHYSICS.maxSpeedV,
      (-Math.cos(yaw) * forwardInput + Math.sin(yaw) * strafeInput) * PHYSICS.maxSpeedH,
    );

    // Inercia exponencial LENTA en ambos sentidos (masa de globo §8): también
    // el frenado es lento — un globo no se detiene en seco. Amarrado: frena suave.
    const lerp = Math.min(1, PHYSICS.accelLerp * dt * (this.docked ? 2 : 1));
    this.velocity.lerp(target, lerp);

    const pos = this.yawObject.position;
    pos.addScaledVector(this.velocity, dt);

    // Deriva de viento constante por capa (no amortiguada por la inercia).
    if (!this.docked) pos.addScaledVector(this.wind, dt);

    // ── Límites del mundo ──
    const ceiling = this.altitudeLimit ?? WORLD.topY - 2;
    pos.y = THREE.MathUtils.clamp(pos.y, WORLD.bottomY + 2, ceiling);
    if (pos.y >= ceiling - 0.5 && this.velocity.y > 0) this.velocity.y *= 0.2;
    if (pos.y <= WORLD.bottomY + 2.5 && this.velocity.y < 0) this.velocity.y *= 0.2;

    // Cilindro virtual: empuje suave hacia el centro (patrón Batisfera §5.2).
    const r = Math.hypot(pos.x, pos.z);
    if (r > WORLD.radius) {
      const inward = 1 - Math.min(1, (r - WORLD.radius) / 15);
      pos.x *= (WORLD.radius + (r - WORLD.radius) * inward) / r;
      pos.z *= (WORLD.radius + (r - WORLD.radius) * inward) / r;
      const nx = pos.x / r;
      const nz = pos.z / r;
      const radialSpeed = this.velocity.x * nx + this.velocity.z * nz;
      if (radialSpeed > 0) {
        this.velocity.x -= nx * radialSpeed * 0.8;
        this.velocity.z -= nz * radialSpeed * 0.8;
      }
    }
  }
}
