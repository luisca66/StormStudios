// Orquestador 3D (PLAN §11): escena, cámara, loop, foco del sumergible,
// y (desde F4) raycast de criaturas. El estado del juego vive en game/ — no aquí.

import * as THREE from "three";
import { INTERACTION, ZONES, depthMeters } from "@/config";
import { Environment } from "./environment";
import { PlayerController } from "./player";
import { Cockpit } from "./cockpit";
import { CreatureManager } from "./creatures/manager";
import type { Creature } from "./creatures/base";

export class Game3D {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private elapsed = 0;

  readonly player: PlayerController;
  readonly environment: Environment;
  readonly creatures: CreatureManager;

  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private hoverTimer = 0;

  /** main.ts conecta aquí "tocar criatura" (suena su acorde). */
  onCreatureTapped: ((creature: Creature) => void) | null = null;

  // Foco del sumergible: apagado en superficie, imprescindible en el abismo (§5.1).
  private spotlight: THREE.SpotLight;

  /** Callback por frame con la profundidad narrativa (HUD/debug). */
  onDepth: ((meters: number, y: number) => void) | null = null;
  /** Callback por frame (dt, elapsed) — el HUD anima aquí su sonar. */
  onFrame: ((dt: number, elapsed: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      400,
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.environment = new Environment(this.scene);
    this.player = new PlayerController(this.camera, canvas);
    this.scene.add(this.player.yawObject);

    // Foco: hijo de la cámara para que apunte adonde miras.
    this.spotlight = new THREE.SpotLight(0xd6ecff, 0, 95, 0.36, 0.55, 1.0);
    this.spotlight.position.set(0.4, -0.45, 0.2);
    const spotTarget = new THREE.Object3D();
    spotTarget.position.set(0, 0, -14);
    this.camera.add(spotTarget);
    this.spotlight.target = spotTarget;
    this.camera.add(this.spotlight);

    new Cockpit(this.camera);

    this.creatures = new CreatureManager(this.scene, () => null);
    this.player.onTap = (x, y) => this.handleTap(x, y);

    // Pose inicial: aguas someras, de fondo para el menú.
    this.player.setPose(0, -5, 24);

    window.addEventListener("resize", () => this.onResize());
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /** Coloca al jugador al inicio de una zona y habilita los controles. */
  startDive(zoneIndex: number): void {
    const zone = ZONES.find((z) => z.index === zoneIndex) ?? ZONES[0];
    this.player.setPose(0, zone.yTop - 6, 22, 0, -0.08);
    this.player.setEnabled(true);
  }

  /** Desactiva controles (menú/pausa); el mundo sigue renderizándose de fondo. */
  stopDive(): void {
    this.player.setEnabled(false);
  }

  private creatureAt(clientX: number, clientY: number): Creature | null {
    this.ndc.set(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.camera);
    this.raycaster.far = Math.hypot(
      INTERACTION.spawnRadiusMax,
      INTERACTION.spawnVerticalLead,
    ) + 10;
    const hits = this.raycaster.intersectObjects(this.creatures.clickTargets(), false);
    return hits.length > 0 ? (hits[0].object.userData.creature as Creature) : null;
  }

  private handleTap(clientX: number, clientY: number): void {
    const creature = this.creatureAt(clientX, clientY);
    if (creature) this.onCreatureTapped?.(creature);
  }

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt;

    this.player.update(dt);

    const pos = this.player.position;
    this.environment.applyDepth(pos.y);
    this.environment.update(dt, pos, this.elapsed);
    this.creatures.update(dt, this.elapsed, pos);

    // Hover: cursor pointer sobre criaturas (raycast con throttle ~8/s).
    this.hoverTimer -= dt;
    if (this.hoverTimer <= 0 && this.player.isEnabled()) {
      this.hoverTimer = 0.12;
      const hover = this.creatureAt(this.player.pointer.x, this.player.pointer.y);
      this.renderer.domElement.style.cursor = hover ? "pointer" : "";
    }

    // Rampa del foco (PLAN §5.1): 0 en zona 1, sube desde −120, máximo hacia −300.
    const spotRamp = THREE.MathUtils.clamp((-pos.y - 120) / 180, 0, 1);
    this.spotlight.intensity = spotRamp * 2.2;

    this.onDepth?.(depthMeters(pos.y), pos.y);
    this.onFrame?.(dt, this.elapsed);

    this.renderer.render(this.scene, this.camera);
  }
}
