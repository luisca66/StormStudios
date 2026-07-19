// Orquestador 3D (PLAN §11): escena, cámara, loop, resize, raycast click/hover.
// El estado del juego vive en game/ — no aquí (regla de dependencias §11).

import * as THREE from "three";
import { LAYERS, altitudeMeters } from "@/config";
import { Environment } from "./environment";
import { PlayerController } from "./player";
import { Scenery } from "./scenery";
import { Basket } from "./basket";
import { LanternManager } from "./lanterns/manager";
import type { LanternString } from "./lanterns/string";
import { PHYSICS } from "@/config";

export class Game3D {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private elapsed = 0;

  readonly player: PlayerController;
  readonly environment: Environment;
  readonly scenery: Scenery;
  readonly basket: Basket;
  readonly lanterns: LanternManager;

  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private hoverTimer = 0;

  /** main conecta aquí "amarrarse a una cuerda" (click o E). */
  onStringTapped: ((str: LanternString) => void) | null = null;

  /** Callback por frame con la altitud narrativa (HUD). */
  onAltitude: ((meters: number, y: number) => void) | null = null;
  /** Callback por frame (dt, elapsed) — el HUD anima aquí su catalejo. */
  onFrame: ((dt: number, elapsed: number) => void) | null = null;

  // Diagnóstico QA: fps móvil (media exponencial) y draw calls del último frame.
  fps = 60;
  drawCalls = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1600, // el domo (r=800) siempre dentro del frustum
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Sin sombras en todo el juego (presupuesto §5.2).
    this.renderer.shadowMap.enabled = false;

    this.environment = new Environment(this.scene);
    this.scenery = new Scenery(this.scene, this.environment.windVectors);
    this.player = new PlayerController(this.camera, canvas);
    this.scene.add(this.player.yawObject);
    this.basket = new Basket(this.camera);
    this.lanterns = new LanternManager(this.scene);
    this.player.onTap = (x, y) => {
      const str = this.stringAt(x, y);
      if (str) this.onStringTapped?.(str);
    };

    // Pose inicial: el valle al amanecer, de fondo para el menú.
    this.player.setPose(0, 8, 30, 0, 0.05);

    window.addEventListener("resize", () => this.onResize());
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /** Coloca al jugador al inicio de una capa y habilita los controles. */
  startAscent(layerNum: number): void {
    const layer = LAYERS.find((l) => l.num === layerNum) ?? LAYERS[0];
    this.player.setPose(0, layer.yBottom + 8, 25, 0, 0.05);
    this.player.setEnabled(true);
  }

  /** Desactiva controles (menú/pausa); el mundo sigue renderizándose de fondo. */
  stopAscent(): void {
    this.player.setEnabled(false);
  }

  private stringAt(clientX: number, clientY: number): LanternString | null {
    this.ndc.set(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.camera);
    this.raycaster.far = 140;
    const hits = this.raycaster.intersectObjects(this.lanterns.clickTargets(), false);
    return hits.length > 0
      ? (hits[0].object.userData.lanternString as LanternString)
      : null;
  }

  /** Ballena Celeste (§7.5): la escena es privada; main la activa por aquí. */
  activateWhale(): void {
    this.scenery.activateWhale(this.scene);
  }

  /** QA: fuerza un frame síncrono (entornos donde rAF está congelado). */
  stepFrame(): void {
    this.frame();
  }

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt;

    // El viento de la capa actual alimenta la deriva del jugador.
    this.player.wind.copy(this.environment.windAt(this.player.position.y));
    this.player.update(dt);

    const pos = this.player.position;
    this.environment.applyAltitude(pos.y);
    this.environment.update(dt, pos, this.elapsed);
    this.scenery.update(dt, pos, this.elapsed);
    this.basket.update(
      dt,
      this.elapsed,
      THREE.MathUtils.clamp(this.player.verticalVelocity / PHYSICS.maxSpeedV, 0, 1),
    );

    // Cuerdas de linternas: spawn/deriva/animaciones + hover con throttle (§16).
    if (this.lanterns.onNeedQuestion && this.player.isEnabled()) {
      this.lanterns.maintain(pos);
    }
    this.lanterns.update(dt, pos, this.elapsed, this.environment.windAt(pos.y));
    this.hoverTimer -= dt;
    if (this.hoverTimer <= 0 && this.player.isEnabled()) {
      this.hoverTimer = 0.1;
      const hover = this.stringAt(this.player.pointer.x, this.player.pointer.y);
      this.renderer.domElement.style.cursor = hover ? "pointer" : "";
    }

    this.onAltitude?.(altitudeMeters(pos.y), pos.y);
    this.onFrame?.(dt, this.elapsed);

    this.renderer.render(this.scene, this.camera);

    if (dt > 0) this.fps += (1 / dt - this.fps) * 0.05;
    this.drawCalls = this.renderer.info.render.calls;
  }
}
