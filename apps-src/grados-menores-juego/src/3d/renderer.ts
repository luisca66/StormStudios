// renderer.ts — escena, cámara y loop de F2. El mundo exterior se mantiene
// deliberadamente neutro: el cielo con nebulosas, la estrella natal y las 5 regiones
// llegan en F3/F4. Aquí solo hay campo de estrellas y polvo cercano, que es lo mínimo
// para que se PERCIBA el movimiento (§16: el negro puro mata la sensación de velocidad).

import * as THREE from "three";
import {
  CAMERA_FOV, SPRINT_FACTOR, WORLD_SEED_BASE, DUST_PARTICLE_COUNT, DUST_BOX_SIZE,
  type SpeedSpec,
} from "@/config";
import { SCALES } from "@/music/degrees";
import { CometSound } from "@/audio/comet-sound";
import { TrackManager, makeRng } from "./track";
import { CometController } from "./comet";
import { Cab } from "./cab";

export interface JourneyOptions {
  scale: string;
  speed: SpeedSpec;
  volume: number; // 0–100
}

export interface JourneyStats {
  distance: number;
  speed: number;
  segment: number;
  chunks: number;
  drawCalls: number;
  fps: number;
  paused: boolean;
}

export class JourneyRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly track: TrackManager;
  private readonly comet: CometController;
  private readonly cab: Cab;
  private readonly sound = new CometSound();

  private stars: THREE.Points | null = null;
  private dust: THREE.Points | null = null;
  private dustPositions: Float32Array | null = null;

  private animationFrame = 0;
  private lastTime = 0;
  private active = false;
  private paused = false;
  private cruiseSpeed = 11;
  private smoothedFps = 60;

  /** Lo llama el frame loop para que el juego avance con la distancia real (F6). */
  onTick: ((dt: number, distance: number, speed: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = false;

    // Azul noche, no negro puro (§16).
    this.scene.background = new THREE.Color("#0e1428");
    this.scene.fog = new THREE.FogExp2(0x0e1428, 0.0045);

    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.08, 900);
    this.track = new TrackManager(this.scene);
    this.comet = new CometController(this.track, this.camera, canvas);
    this.scene.add(this.comet.root);
    this.cab = new Cab(this.comet.cabAnchor);

    // Luces: ambiente frío + una cálida que hace de estrella natal provisional (F3 la
    // sustituye por la de verdad, que crece con el progreso).
    this.scene.add(new THREE.AmbientLight(0x4a6a8a, 1.1));
    const star = new THREE.DirectionalLight(0xffd9a0, 1.5);
    star.position.set(-0.3, 0.5, -1);
    this.scene.add(star);

    this.buildStars();
    this.buildDust();

    window.addEventListener("resize", this.resize);
    this.resize();
  }

  /** Campo de estrellas lejano: hijo de la cámara, así que nunca se alcanza. */
  private buildStars(): void {
    const count = 1400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const rng = makeRng(20260829);
    for (let i = 0; i < count; i++) {
      // Distribución sobre una esfera (método de la z uniforme, sin acumulación polar).
      const z = rng() * 2 - 1;
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(1 - z * z);
      const radius = 400;
      positions[i * 3] = Math.cos(a) * r * radius;
      positions[i * 3 + 1] = z * radius;
      positions[i * 3 + 2] = Math.sin(a) * r * radius;
      // Algunas azuladas, algunas cálidas: un cielo monocromo se lee a plano.
      const warm = rng();
      const brightness = 0.35 + rng() * 0.65;
      colors[i * 3] = (warm > 0.75 ? 1 : 0.75) * brightness;
      colors[i * 3 + 1] = 0.82 * brightness;
      colors[i * 3 + 2] = (warm > 0.75 ? 0.78 : 1) * brightness;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.stars = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 2.2, sizeAttenuation: false, vertexColors: true,
      transparent: true, depthWrite: false, fog: false,
    }));
    this.stars.frustumCulled = false;
    // Hijo de la CÁMARA: el cielo nunca se alcanza por mucho que avance el cometa.
    // OJO: no añadir la cámara a la escena "para que se vean sus hijos" — `add`
    // reparenta, y eso la arrancaría del rig del cometa (la carlinga se vería desde
    // fuera y a lo lejos). La cámara ya cuelga de `comet.root`, que sí está en la escena.
    this.camera.add(this.stars);
  }

  /**
   * Polvo cercano en una caja que sigue a la cámara: es lo que de verdad vende la
   * velocidad (patrón "nieve marina" de Batisfera). Se recicla por envoltura toroidal,
   * no destruyendo partículas.
   */
  private buildDust(): void {
    const count = DUST_PARTICLE_COUNT;
    const positions = new Float32Array(count * 3);
    const rng = makeRng(4242);
    for (let i = 0; i < count * 3; i++) {
      positions[i] = (rng() - 0.5) * DUST_BOX_SIZE;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.dust = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x8fb4cc, size: 0.13, sizeAttenuation: true,
      transparent: true, opacity: 0.55, depthWrite: false,
    }));
    this.dust.frustumCulled = false;
    this.dustPositions = positions;
    this.scene.add(this.dust);
  }

  /** Envuelve el polvo alrededor de la cámara: caja infinita a coste constante. */
  private updateDust(center: THREE.Vector3): void {
    const p = this.dustPositions;
    if (!p || !this.dust) return;
    const half = DUST_BOX_SIZE / 2;
    for (let i = 0; i < p.length; i += 3) {
      for (let axis = 0; axis < 3; axis++) {
        const c = axis === 0 ? center.x : axis === 1 ? center.y : center.z;
        let d = p[i + axis] - c;
        if (d > half) p[i + axis] -= DUST_BOX_SIZE;
        else if (d < -half) p[i + axis] += DUST_BOX_SIZE;
      }
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
  }

  start(options: JourneyOptions): void {
    const routeIndex = Math.max(0, SCALES.indexOf(options.scale as (typeof SCALES)[number]));
    // Seed fija por tonalidad: la ruta de Dm SIEMPRE es la ruta de Dm (§5.1).
    const seed = WORLD_SEED_BASE + routeIndex * 7919;
    this.track.reset(seed);

    this.cruiseSpeed = options.speed.unitsPerSecond;
    this.comet.startJourney(this.cruiseSpeed);

    // El polvo arranca centrado en el cometa, o el primer frame se ve vacío.
    this.updateDust(this.comet.root.position);

    this.sound.start(options.volume / 100);

    this.paused = false;
    this.active = true;
    this.lastTime = performance.now();
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.active = false;
    cancelAnimationFrame(this.animationFrame);
    this.comet.setRunning(false);
    this.sound.stop();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    // Pausa congela TODO, incluido el bed (§16): nada de dejarlo sonando al 30 %.
    if (paused) this.sound.setDuck(0);
    else this.sound.setDuck(1);
  }

  isPaused(): boolean {
    return this.paused;
  }

  setVolume(volume: number): void {
    this.sound.setVolume(volume / 100);
  }

  /** Empujón al acertar (F6 lo llamará; en F2 lo usa el arnés de QA). */
  slingshot(): void {
    this.comet.slingshot();
  }

  stats(): JourneyStats {
    return {
      distance: this.comet.distance,
      speed: this.comet.speed,
      segment: this.comet.segmentPosition().index,
      chunks: this.track.chunkCount(),
      drawCalls: this.renderer.info.render.calls,
      fps: this.smoothedFps,
      paused: this.paused,
    };
  }

  private readonly resize = (): void => {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private readonly frame = (now: number): void => {
    if (!this.active) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    if (dt > 0) this.smoothedFps = THREE.MathUtils.lerp(this.smoothedFps, 1 / dt, 0.04);

    if (!this.paused) {
      this.comet.update(dt);
      this.onTick?.(dt, this.comet.distance, this.comet.speed);
      this.updateDust(this.comet.root.position);
      this.sound.update(this.comet.speed, this.cruiseSpeed);
      this.cab.update(dt, {
        speed: THREE.MathUtils.clamp(this.comet.speed / (this.cruiseSpeed * SPRINT_FACTOR), 0, 1),
        slingshot: this.comet.slingshotAmount(),
      });
    }

    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.frame);
  };
}
