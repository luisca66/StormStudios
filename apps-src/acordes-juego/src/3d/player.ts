// Controlador del sumergible (PLAN §9): nado libre 3D con inercia,
// mirar arrastrando (cursor SIEMPRE visible, SIN pointer lock — decisión de Luis),
// y detección de tap/click corto para tocar criaturas (raycast lo hace el renderer).

import * as THREE from "three";
import { PHYSICS, WORLD } from "@/config";

const CLICK_MAX_PX = 5;
const CLICK_MAX_MS = 250;

export class PlayerController {
  // Rig: yaw (Y) → pitch (X) → cámara (roll se aplica a la cámara).
  readonly yawObject = new THREE.Object3D();
  private pitchObject = new THREE.Object3D();

  private keys = new Set<string>();
  private velocity = new THREE.Vector3();
  private enabled = false;

  // Estado de drag para mirar / detectar click corto.
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
  /** Entrada táctil (joystick + botones ▲▼), sumada a la de teclado. */
  readonly externalMove = { forward: 0, strafe: 0, vertical: 0 };

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

    // Mouse: arrastrar para mirar; click corto = tap.
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

    // Touch: un dedo = mirar / tap. (Joystick de movimiento llega en F8.)
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

    this.yawObject.rotation.y -= dx * PHYSICS.lookSensitivity;
    this.pitchObject.rotation.x = THREE.MathUtils.clamp(
      this.pitchObject.rotation.x - dy * PHYSICS.lookSensitivity,
      -PHYSICS.pitchClamp,
      PHYSICS.pitchClamp,
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
      this.externalMove.strafe = 0;
      this.externalMove.vertical = 0;
    }
  }

  /** Conecta el joystick virtual y los botones ▲▼ (móvil, PLAN §9). */
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
          this.externalMove.strafe = dx;
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
        this.externalMove.strafe = 0;
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
    return this.velocity.lengthSq() > 0.05;
  }

  /** Rumbo (rotación Y) — el sonar orienta sus blips con esto. */
  get yaw(): number {
    return this.yawObject.rotation.y;
  }

  setPose(x: number, y: number, z: number, yaw = 0, pitch = 0): void {
    this.yawObject.position.set(x, y, z);
    this.yawObject.rotation.y = yaw;
    this.pitchObject.rotation.x = pitch;
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

    // Balanceo submarino sutil (roll de cámara).
    this.camera.rotation.z =
      Math.sin(this.elapsed * PHYSICS.camRollSpeed * Math.PI * 2) * PHYSICS.camRollAmplitude;

    if (!this.enabled) return;

    // Ejes de entrada (teclado + táctil).
    const forwardInput =
      (this.key("w", "arrowup") ? 1 : 0) -
      (this.key("s", "arrowdown") ? 1 : 0) +
      this.externalMove.forward;
    const strafeInput =
      (this.key("d", "arrowright") ? 1 : 0) -
      (this.key("a", "arrowleft") ? 1 : 0) +
      this.externalMove.strafe;
    const verticalInput =
      (this.key("q", " ") ? 1 : 0) -
      (this.key("e", "shift") ? 1 : 0) +
      this.externalMove.vertical;

    // Avanzar sigue la mirada COMPLETA (incluye componente vertical) — PLAN §9.
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0); // mirando exactamente vertical
    right.normalize();

    const target = new THREE.Vector3()
      .addScaledVector(forward, forwardInput)
      .addScaledVector(right, strafeInput)
      .add(new THREE.Vector3(0, verticalInput, 0));
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

    // Límites verticales: bajo la superficie y sobre el fondo.
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
