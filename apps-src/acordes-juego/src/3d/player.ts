// Controlador de la nave (H2, PLAN-HITOS-2): la nave tiene RUMBO y permanece
// SIEMPRE horizontal — nunca de cabeza. W/S = thrust horizontal según el rumbo,
// A/D o drag horizontal = timón (girar), Q/E = vertical puro. El drag vertical
// solo hace un "peek" de cámara limitado que se auto-recentra al soltar.
// Cursor SIEMPRE visible, SIN pointer lock; click corto = tocar criatura.

import * as THREE from "three";
import { PHYSICS, WORLD } from "@/config";

const CLICK_MAX_PX = 5;
const CLICK_MAX_MS = 250;

export class PlayerController {
  // Rig: yaw (rumbo de la nave) → pitch (solo peek) → cámara (roll+dip cosméticos).
  readonly yawObject = new THREE.Object3D();
  private pitchObject = new THREE.Object3D();

  private keys = new Set<string>();
  private velocity = new THREE.Vector3();
  private enabled = false;

  // Banqueo: velocidad de giro suavizada (rad/s) para roll cosmético.
  private turnVelSmoothed = 0;
  private prevYaw = 0;
  private accelDip = 0;

  // Estado de drag para timón/peek / detectar click corto.
  private dragging = false;
  private dragMoved = false;
  private dragStart = { x: 0, y: 0, t: 0 };
  private lastPointer = { x: 0, y: 0 };
  /** Última posición del cursor (para hover-raycast del renderer). */
  readonly pointer = { x: -9999, y: -9999 };

  /** El renderer conecta aquí el raycast de "tocar criatura". */
  onTap: ((clientX: number, clientY: number) => void) | null = null;
  /** Pausa (Esc) — lo conecta main.ts. */
  onEscape: (() => void) | null = null;
  /** Y mínima permitida (termoclina cerrada). null = sin límite. */
  depthLimit: number | null = null;
  /** Entrada táctil: joystick Y = thrust, X = timón; botones = vertical. */
  readonly externalMove = { forward: 0, turn: 0, vertical: 0 };

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
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => this.keys.clear());

    // Mouse: arrastrar = timón (horizontal) + peek (vertical); click corto = tap.
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

    // Touch: un dedo sobre el canvas = timón + peek / tap.
    canvas.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length === 1) {
          const t = e.touches[0];
          this.beginDrag(t.clientX, t.clientY);
        }
      },
      { passive: true },
    );
    canvas.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches.length === 1) {
          const t = e.touches[0];
          this.moveDrag(t.clientX, t.clientY);
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

    // Horizontal = timón (gira la NAVE); vertical = peek limitado de cámara.
    this.yawObject.rotation.y -= dx * PHYSICS.lookSensitivity;
    this.pitchObject.rotation.x = THREE.MathUtils.clamp(
      this.pitchObject.rotation.x - dy * PHYSICS.peekSensitivity,
      -PHYSICS.peekPitchMax,
      PHYSICS.peekPitchMax,
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
    if (!on) {
      this.keys.clear();
      this.externalMove.forward = 0;
      this.externalMove.turn = 0;
      this.externalMove.vertical = 0;
    }
  }

  /** Joystick virtual y botones ▲▼ (móvil): Y = thrust, X = timón. */
  attachTouchControls(
    zone: HTMLElement,
    knob: HTMLElement,
    upBtn: HTMLElement,
    downBtn: HTMLElement,
  ): void {
    const RADIUS = 42;
    let activeTouch = -1;
    let cx = 0;
    let cy = 0;

    zone.addEventListener(
      "touchstart",
      (e) => {
        const touch = e.changedTouches[0];
        activeTouch = touch.identifier;
        const rect = zone.getBoundingClientRect();
        cx = rect.left + rect.width / 2;
        cy = rect.top + rect.height / 2;
        e.stopPropagation();
      },
      { passive: true },
    );
    zone.addEventListener(
      "touchmove",
      (e) => {
        for (const touch of Array.from(e.changedTouches)) {
          if (touch.identifier !== activeTouch) continue;
          let dx = (touch.clientX - cx) / RADIUS;
          let dy = (touch.clientY - cy) / RADIUS;
          const mag = Math.hypot(dx, dy);
          if (mag > 1) {
            dx /= mag;
            dy /= mag;
          }
          // X del joystick = timón (derecha = girar a la derecha = yaw negativo).
          this.externalMove.turn = -dx;
          this.externalMove.forward = -dy;
          knob.style.transform = `translate(${dx * RADIUS * 0.6}px, ${dy * RADIUS * 0.6}px)`;
          e.preventDefault();
          e.stopPropagation();
        }
      },
      { passive: false },
    );
    const endJoy = (e: TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier !== activeTouch) continue;
        activeTouch = -1;
        this.externalMove.turn = 0;
        this.externalMove.forward = 0;
        knob.style.transform = "";
      }
    };
    zone.addEventListener("touchend", endJoy);
    zone.addEventListener("touchcancel", endJoy);

    const bindHold = (btn: HTMLElement, value: number) => {
      btn.addEventListener("pointerdown", (e) => {
        this.externalMove.vertical = value;
        e.preventDefault();
      });
      for (const ev of ["pointerup", "pointerleave", "pointercancel"]) {
        btn.addEventListener(ev, () => {
          this.externalMove.vertical = 0;
        });
      }
    };
    bindHold(upBtn, 1);
    bindHold(downBtn, -1);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  get position(): THREE.Vector3 {
    return this.yawObject.position;
  }

  get isMoving(): boolean {
    return this.velocity.lengthSq() > 0.05 || Math.abs(this.turnVelSmoothed) > 0.15;
  }

  /** Rumbo (rotación Y) — el sonar orienta sus blips con esto. */
  get yaw(): number {
    return this.yawObject.rotation.y;
  }

  setPose(x: number, y: number, z: number, yaw = 0, pitch = 0): void {
    this.yawObject.position.set(x, y, z);
    this.yawObject.rotation.y = yaw;
    this.prevYaw = yaw;
    this.turnVelSmoothed = 0;
    this.accelDip = 0;
    this.pitchObject.rotation.x = THREE.MathUtils.clamp(
      pitch,
      -PHYSICS.peekPitchMax,
      PHYSICS.peekPitchMax,
    );
    this.velocity.set(0, 0, 0);
  }

  /** Dirección de la mirada en mundo (para raycast/foco). */
  getLookDirection(target: THREE.Vector3): THREE.Vector3 {
    return this.camera.getWorldDirection(target);
  }

  private key(...names: string[]): boolean {
    return names.some((n) => this.keys.has(n));
  }

  update(dt: number): void {
    this.elapsed += dt;

    if (!this.enabled) {
      // Solo balanceo submarino en reposo/menú.
      this.camera.rotation.z =
        Math.sin(this.elapsed * PHYSICS.camRollSpeed * Math.PI * 2) * PHYSICS.camRollAmplitude;
      return;
    }

    // ---------- Ejes de entrada (teclado + táctil) ----------
    const forwardInput =
      (this.key("w", "arrowup") ? 1 : 0) -
      (this.key("s", "arrowdown") ? 1 : 0) +
      this.externalMove.forward;
    // A/← = girar a la izquierda (+yaw); D/→ = derecha (−yaw).
    const turnInput =
      (this.key("a", "arrowleft") ? 1 : 0) -
      (this.key("d", "arrowright") ? 1 : 0) +
      this.externalMove.turn;
    const verticalInput =
      (this.key("q", " ") ? 1 : 0) -
      (this.key("e", "shift") ? 1 : 0) +
      this.externalMove.vertical;

    // ---------- Timón ----------
    this.yawObject.rotation.y += turnInput * PHYSICS.turnSpeed * dt;

    // Velocidad de giro real (incluye drag), suavizada para el banqueo.
    const yaw = this.yawObject.rotation.y;
    const rawTurnVel = dt > 0 ? (yaw - this.prevYaw) / dt : 0;
    this.prevYaw = yaw;
    this.turnVelSmoothed +=
      (rawTurnVel - this.turnVelSmoothed) * Math.min(1, 8 * dt);

    // ---------- Peek: se recentra solo al no arrastrar ----------
    if (!this.dragging) {
      this.pitchObject.rotation.x +=
        (0 - this.pitchObject.rotation.x) * Math.min(1, PHYSICS.peekRecenterLerp * dt);
    }

    // ---------- Thrust: SIEMPRE en el plano horizontal del rumbo ----------
    const target = new THREE.Vector3(
      -Math.sin(yaw) * forwardInput,
      verticalInput,
      -Math.cos(yaw) * forwardInput,
    );
    if (target.lengthSq() > 1) target.normalize();
    target.multiplyScalar(PHYSICS.maxSpeed);

    // Inercia exponencial para acelerar, pero freno instantáneo sin inercia.
    if (target.lengthSq() === 0) {
      this.velocity.set(0, 0, 0);
    } else {
      const lerp = Math.min(1, PHYSICS.accelLerp * dt);
      this.velocity.lerp(target, lerp);
    }

    const pos = this.yawObject.position;
    pos.addScaledVector(this.velocity, dt);

    // ---------- Cosmética: banqueo al girar + cabeceo al acelerar ----------
    const bank = THREE.MathUtils.clamp(
      -this.turnVelSmoothed * PHYSICS.bankFactor,
      -PHYSICS.bankMaxRoll,
      PHYSICS.bankMaxRoll,
    );
    this.camera.rotation.z =
      Math.sin(this.elapsed * PHYSICS.camRollSpeed * Math.PI * 2) * PHYSICS.camRollAmplitude +
      bank;

    const dipTarget = -forwardInput * PHYSICS.accelDipMax;
    this.accelDip += (dipTarget - this.accelDip) * Math.min(1, 3 * dt);
    this.camera.rotation.x = this.accelDip;

    // ---------- Límites del mundo ----------
    const floor = this.depthLimit ?? WORLD.bottomY + 3;
    pos.y = THREE.MathUtils.clamp(pos.y, Math.max(floor, WORLD.bottomY + 3), -1.5);
    if (pos.y <= floor + 0.5 && this.velocity.y < 0) this.velocity.y *= 0.2;

    // Cilindro virtual: empuje suave hacia el centro cerca del borde (PLAN §5.1).
    const r = Math.hypot(pos.x, pos.z);
    if (r > WORLD.radius) {
      const inward = 1 - Math.min(1, (r - WORLD.radius) / 15);
      pos.x *= (WORLD.radius + (r - WORLD.radius) * inward) / r;
      pos.z *= (WORLD.radius + (r - WORLD.radius) * inward) / r;
      // amortigua la velocidad radial
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
