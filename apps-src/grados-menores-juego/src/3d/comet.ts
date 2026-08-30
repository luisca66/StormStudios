// comet.ts — El cometa (PLAN §6, §7.1-F2): avanza solo sobre la órbita, con sprint en
// zona muerta, flotación procedural, roll en curva y slingshot al acertar. La mirada es
// drag de mouse SIN pointer lock, con auto-recentrado suave (patrón de la casa).
//
// Diferencia deliberada con el tren del Expreso: aquí NO hay traqueteo. Un cometa no
// tiene juntas de riel — tiene inercia. Las frecuencias del balanceo son más bajas y las
// amplitudes algo mayores: se flota, no se traquetea (PLAN §6).

import * as THREE from "three";
import {
  SEGMENT_LENGTH, DEAD_ZONE_LENGTH, SPRINT_FACTOR, COMET_ACCEL_RATE,
  COMET_START_RAMP_S, CAB_EYE_HEIGHT, YAW_CLAMP_DEG, PITCH_CLAMP_DEG,
  LOOK_RECENTER_S, LOOK_SENSITIVITY, SWAY_MAX_DEG, SWAY_FREQ_HZ, FLOAT_AMPLITUDE,
  CAB_VIEW_OFFSET_X, CAB_VIEW_OFFSET_Y, CAB_VIEW_OFFSET_Z, CAMERA_TRACK_PITCH_DEG,
  SLINGSHOT_BOOST, SLINGSHOT_DURATION_S,
} from "@/config";
import { TrackManager, newTrackFrame, type TrackFrame } from "./track";

const CLICK_MAX_PX = 5;
const CLICK_MAX_MS = 250;

export class CometController {
  // Rig: root (pose de órbita) → sway (flotación/roll) → lookYaw → pitch → cámara.
  readonly root = new THREE.Object3D();
  private swayObject = new THREE.Object3D();
  private lookYawObject = new THREE.Object3D();
  private pitchObject = new THREE.Object3D();

  distance = 0;
  speed = 0;
  /** Desvío lateral respecto al eje de la ruta (la nebulosa de la deriva, §5.5). */
  lateralOffset = 0;
  private cruiseSpeed = 11;
  private externalDrive = false;
  private rampElapsed = 0;
  private running = false;
  private elapsed = 0;
  private slingshotLeft = 0;

  private frame: TrackFrame = newTrackFrame();
  private basis = new THREE.Matrix4();
  private bankedUp = new THREE.Vector3();
  private bankedRight = new THREE.Vector3();
  private quat = new THREE.Quaternion();

  // Drag de mirada.
  private dragging = false;
  private dragMoved = false;
  private dragStart = { x: 0, y: 0, t: 0 };
  private lastPointer = { x: 0, y: 0 };
  private readonly neutralPitch = THREE.MathUtils.degToRad(CAMERA_TRACK_PITCH_DEG);

  onTap: ((clientX: number, clientY: number) => void) | null = null;

  constructor(
    private track: TrackManager,
    camera: THREE.PerspectiveCamera,
    canvas: HTMLElement,
  ) {
    this.pitchObject.add(camera);
    camera.position.set(CAB_VIEW_OFFSET_X, CAB_VIEW_OFFSET_Y, CAB_VIEW_OFFSET_Z);
    this.lookYawObject.add(this.pitchObject);
    this.swayObject.add(this.lookYawObject);
    this.swayObject.position.y = CAB_EYE_HEIGHT;
    this.root.add(this.swayObject);

    canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    window.addEventListener("pointermove", (e) => this.onPointerMove(e));
    window.addEventListener("pointerup", (e) => this.onPointerUp(e));
  }

  /** El objeto al que la carlinga debe engancharse (fija al cometa, no a la vista). */
  get cabAnchor(): THREE.Object3D {
    return this.swayObject;
  }

  startJourney(cruiseSpeed: number): void {
    this.cruiseSpeed = cruiseSpeed;
    this.distance = 0;
    this.speed = 0;
    this.lateralOffset = 0;
    this.externalDrive = false;
    this.rampElapsed = 0;
    this.elapsed = 0;
    this.slingshotLeft = 0;
    this.lookYawObject.rotation.y = 0;
    this.pitchObject.rotation.x = this.neutralPitch;
    this.running = true;
  }

  setRunning(running: boolean): void {
    this.running = running;
  }

  isRunning(): boolean {
    return this.running;
  }

  /**
   * Durante la secuencia del Perihelio (§12) el cometa deja de conducirse solo: la
   * distancia la escribe el guion para que los 15 anillos caigan EXACTAMENTE a tiempo.
   */
  setExternalDrive(active: boolean): void {
    this.externalDrive = active;
  }

  /** Empujón de gravedad al acertar (§7.1): la ruta te premia con velocidad. */
  slingshot(): void {
    this.slingshotLeft = SLINGSHOT_DURATION_S;
  }

  /** 0–1: cuánto queda del slingshot (la estela brilla más mientras dura). */
  slingshotAmount(): number {
    return SLINGSHOT_DURATION_S > 0 ? this.slingshotLeft / SLINGSHOT_DURATION_S : 0;
  }

  update(dt: number): void {
    if (this.running && !this.externalDrive) {
      this.elapsed += dt;
      this.rampElapsed += dt;
      this.slingshotLeft = Math.max(0, this.slingshotLeft - dt);

      // Velocidad objetivo: rampa de salida, sprint en zona muerta y slingshot.
      const inSegment = this.distance % SEGMENT_LENGTH;
      const sprint = inSegment < DEAD_ZONE_LENGTH ? SPRINT_FACTOR : 1;
      let target = this.cruiseSpeed * sprint;
      if (this.slingshotLeft > 0) target *= SLINGSHOT_BOOST;
      if (this.rampElapsed < COMET_START_RAMP_S) {
        target *= this.rampElapsed / COMET_START_RAMP_S;
      }
      this.speed += (target - this.speed) * Math.min(1, COMET_ACCEL_RATE * dt);
      this.distance += this.speed * dt;
      this.track.ensureBuilt(this.distance);
    } else {
      this.elapsed += dt;
    }

    // Pose sobre la órbita. La deriva de F7 no es otra spline: es un desplazamiento
    // lateral sobre ésta, así que basta con correr el origen del cometa a un lado.
    this.track.frameAt(this.distance, this.frame);
    this.root.position.copy(this.frame.pos)
      .addScaledVector(this.frame.right, this.lateralOffset);

    // Roll: rota right/up alrededor de la tangente.
    const bankQ = this.quat.setFromAxisAngle(this.frame.tan, -this.frame.bank);
    this.bankedRight.copy(this.frame.right).applyQuaternion(bankQ);
    this.bankedUp.copy(this.frame.up).applyQuaternion(bankQ);
    this.basis.makeBasis(this.bankedRight, this.bankedUp, this.frame.tan.clone().negate());
    this.root.quaternion.setFromRotationMatrix(this.basis);

    // Flotación: dos senos desfasados MUY lentos (§6) + micro-deriva lateral. Sin
    // vibración de alta frecuencia: eso sería un tren.
    const speedFactor = Math.min(1, this.speed / 25);
    const swayAmp = THREE.MathUtils.degToRad(SWAY_MAX_DEG) * (0.5 + 0.5 * speedFactor);
    const w = SWAY_FREQ_HZ * Math.PI * 2;
    this.swayObject.rotation.z =
      Math.sin(this.elapsed * w) * swayAmp + Math.sin(this.elapsed * w * 1.63 + 1.3) * swayAmp * 0.5;
    this.swayObject.rotation.x =
      Math.sin(this.elapsed * w * 0.77 + 0.7) * swayAmp * 0.45;
    this.swayObject.position.y =
      CAB_EYE_HEIGHT + Math.sin(this.elapsed * w * 0.61) * FLOAT_AMPLITUDE;
    this.swayObject.position.x =
      Math.sin(this.elapsed * w * 0.43 + 2.1) * FLOAT_AMPLITUDE * 0.8;

    // Auto-recentrado de la mirada al soltar (LOOK_RECENTER_S).
    if (!this.dragging) {
      const rate = Math.min(1, (3 / LOOK_RECENTER_S) * dt);
      this.lookYawObject.rotation.y += (0 - this.lookYawObject.rotation.y) * rate;
      this.pitchObject.rotation.x += (this.neutralPitch - this.pitchObject.rotation.x) * rate;
    }
  }

  /** Progreso dentro del segmento actual (para HUD/QA). */
  segmentPosition(): { index: number; along: number } {
    return {
      index: Math.floor(this.distance / SEGMENT_LENGTH),
      along: this.distance % SEGMENT_LENGTH,
    };
  }

  // --- drag de mirada -------------------------------------------------------

  private onPointerDown(e: PointerEvent): void {
    this.dragging = true;
    this.dragMoved = false;
    this.dragStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    this.lastPointer = { x: e.clientX, y: e.clientY };
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    if (
      Math.abs(e.clientX - this.dragStart.x) > CLICK_MAX_PX ||
      Math.abs(e.clientY - this.dragStart.y) > CLICK_MAX_PX
    ) {
      this.dragMoved = true;
    }
    if (!this.dragMoved) return;

    const yawMax = THREE.MathUtils.degToRad(YAW_CLAMP_DEG);
    const pitchMax = THREE.MathUtils.degToRad(PITCH_CLAMP_DEG);
    this.lookYawObject.rotation.y = THREE.MathUtils.clamp(
      this.lookYawObject.rotation.y - dx * LOOK_SENSITIVITY, -yawMax, yawMax,
    );
    this.pitchObject.rotation.x = THREE.MathUtils.clamp(
      this.pitchObject.rotation.x - dy * LOOK_SENSITIVITY,
      this.neutralPitch - pitchMax,
      this.neutralPitch + pitchMax,
    );
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    const dtMs = performance.now() - this.dragStart.t;
    if (!this.dragMoved && dtMs < CLICK_MAX_MS) {
      this.onTap?.(e.clientX, e.clientY);
    }
  }
}
