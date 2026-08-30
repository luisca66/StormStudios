// renderer.ts — escena, cámara y loop. Orquesta las piezas del mundo: la órbita
// (track), el cometa, la carlinga, el cielo por región (environment) y la escenografía
// (scenery). El polvo cercano vive aquí porque no es de ninguna región: es lo que hace
// que se PERCIBA el movimiento (§16: el negro puro mata la sensación de velocidad).

import * as THREE from "three";
import {
  CAMERA_FOV, SPRINT_FACTOR, WORLD_SEED_BASE, DUST_PARTICLE_COUNT, DUST_BOX_SIZE,
  SEGMENT_LENGTH, DECISIONS_TO_ARRIVE, RING_NOTE_GAP_S, routeForScale, type SpeedSpec,
} from "@/config";
import { SCALES } from "@/music/degrees";
import { CometSound } from "@/audio/comet-sound";
import { TrackManager, makeRng } from "./track";
import { Environment } from "./environment";
import { Scenery } from "./scenery";
import { Rings, type RingResult } from "./rings";
import { Drift, driftSideFor } from "./drift";
import { Perihelion, ORBIT_DEPTH } from "./perihelion";
import { CometController } from "./comet";
import { Cab } from "./cab";

export interface JourneyOptions {
  scale: string;
  speed: SpeedSpec;
  volume: number; // 0–100
}

/** Ganchos de la ceremonia del Perihelio (§12): el audio lo pone quien llama. */
export interface ArrivalHooks {
  /** Se cruza el anillo `index` (0–14): suena su grado de la espiral. */
  onRing(index: number): void;
  /** Último anillo cruzado: acorde de tónica y campanilla. */
  onFinalChord(): void;
  /** El cometa quedó en órbita: toca mostrar el resumen. */
  onSettled(): void;
}

export interface JourneyStats {
  distance: number;
  speed: number;
  segment: number;
  chunks: number;
  sceneryChunks: number;
  spinners: number;
  progress: number;
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

  private readonly environment: Environment;
  private readonly scenery: Scenery;
  private readonly rings: Rings;
  private readonly drift: Drift;
  private readonly perihelion: Perihelion;
  private dust: THREE.Points | null = null;
  private dustPositions: Float32Array | null = null;

  private animationFrame = 0;
  private lastTime = 0;
  private active = false;
  private paused = false;
  private cruiseSpeed = 11;
  private smoothedFps = 60;
  /**
   * Progreso 0–1 del viaje. En F2/F3 lo estima la distancia recorrida; a partir de F6
   * lo escribe el juego con las decisiones acertadas, que es lo que de verdad acerca a
   * casa. Gobierna cuánto ha crecido la estrella natal (§5.2).
   */
  private gameProgress = 0;
  /**
   * ¿Manda alguien el progreso desde fuera? Mientras nadie lo haga, lo estima la
   * distancia recorrida. En cuanto el juego (o el arnés) llama a `setProgress`, el loop
   * deja de calcularlo: si no, lo pisaría en el frame siguiente.
   */
  private progressDriven = false;
  /** La llave del radiofaro baja al transmitir y vuelve sola (§6). */
  private beaconPull = 0;
  private arrival: {
    hooks: ArrivalHooks;
    start: number; v0: number; v1: number; span: number;
    ringDistances: number[];
    nextRing: number;
    stopDistance: number;
    elapsed: number;
    /** Aún volando hacia el primer anillo: el astro está plantado y hay que llegar. */
    cruising: boolean;
    ringStart: number;
    settling: boolean;
    finished: boolean;
  } | null = null;

  /** Lo llama el frame loop para que el juego avance con la distancia real (F6). */
  onTick: ((dt: number, distance: number, speed: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = false;

    // Fondo y niebla los fija Environment por región; este es solo el arranque
    // antes de que haya ruta elegida (azul noche, nunca negro puro — §16).
    this.scene.background = new THREE.Color("#0e1428");
    this.scene.fog = new THREE.FogExp2(0x0e1428, 0.0045);

    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.08, 900);
    this.track = new TrackManager(this.scene);
    this.comet = new CometController(this.track, this.camera, canvas);
    this.scene.add(this.comet.root);
    this.cab = new Cab(this.comet.cabAnchor);

    // El cielo, la luz y la estrella natal viven en Environment (§5.3); la
    // escenografía de la región, en Scenery (§5.4).
    this.environment = new Environment(this.scene);
    this.scenery = new Scenery(this.scene, this.track);
    this.rings = new Rings(this.scene, this.track);
    this.drift = new Drift(this.scene, this.track);
    this.perihelion = new Perihelion(this.scene, this.track);
    // El rugido del hermano lo dispara la escenografía cuando de verdad se cruza, no un
    // temporizador aparte: así el sonido y la imagen no pueden desincronizarse.
    this.scenery.onSiblingPass = (fromLeft, duration) => this.sound.playSiblingRoar(fromLeft, duration);
    this.buildDust();

    window.addEventListener("resize", this.resize);
    this.resize();
  }

  /**
   * Polvo cercano en una caja que sigue a la cámara: es lo que de verdad vende la
   * velocidad (patrón "nieve marina" de Batisfera). Se recicla por envoltura toroidal,
   * no destruyendo partículas.
   */
  /** Mota redonda con borde suave: sin mapa, un Point se dibuja como un CUADRADO. */
  private static dustTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const g = canvas.getContext("2d")!;
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }

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
      map: JourneyRenderer.dustTexture(), color: 0x8fb4cc, size: 0.22,
      sizeAttenuation: true, transparent: true, opacity: 0.5,
      depthWrite: false, fog: false,
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

    // Cada tonalidad tiene su región, su variante de color y su cielo (§5.4).
    const route = routeForScale(options.scale);
    this.environment.setRoute(route, seed);
    this.scenery.reset(route, seed);
    this.rings.reset();
    this.drift.dispose();
    this.perihelion.clear();
    this.arrival = null;
    this.gameProgress = 0;
    this.progressDriven = false;

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
    this.scenery.dispose();
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

  /**
   * Fuerza el progreso del viaje. F6 lo usará con las decisiones reales; de momento es
   * lo que permite comprobar que la estrella natal crece sin volar el viaje entero.
   */
  setProgress(progress: number): void {
    this.progressDriven = true;
    this.gameProgress = THREE.MathUtils.clamp(progress, 0, 1);
    this.environment.update(this.comet.root.position, this.gameProgress, 0);
  }

  /** Empujón al acertar (F6 lo llamará; en F2 lo usa el arnés de QA). */
  slingshot(): void {
    this.comet.slingshot();
  }

  /** Baja la llave del telégrafo: lo llama quien dispare el radiofaro. */
  pullBeacon(): void {
    this.beaconPull = 1;
  }

  /** Estado visible del anillo de un segmento (lo manda la máquina de estados). */
  setRing(index: number, result: RingResult): void {
    this.rings.setResult(index, result);
  }

  /** Regla de silencio §2.11: con pregunta viva, el mundo no genera eventos. */
  setAmbientSuppressed(suppressed: boolean): void {
    this.scenery.ambientAllowed = !suppressed;
  }

  /** El bed se agacha durante la pregunta para que la nota nunca suene tapada. */
  duckBed(level: number): void {
    this.sound.setDuck(level);
  }

  /** El cometa sale de la ruta: lazo por la nebulosa oscura (§5.5). */
  beginDrift(startDistance: number): void {
    this.drift.begin(startDistance, driftSideFor(startDistance));
  }

  /** Reincorporación: el color vuelve solo en 2 s. */
  endDrift(): void {
    this.drift.end();
  }

  /**
   * Arranca la ceremonia del Perihelio (§12).
   *
   * Los 15 anillos NO se colocan a distancia fija: se integra el perfil de velocidad
   * para que cada uno se cruce EXACTAMENTE a `RING_NOTE_GAP_S` del anterior. Como el
   * cometa frena, los anillos se van JUNTANDO — el ritardando es del vehículo, pero el
   * pulso de la escala se mantiene clavado. (Lección heredada del Expreso: no confiar
   * en que "más o menos coincide".)
   */
  beginArrival(ringCount: number, litClasses: ReadonlySet<number>, gala: boolean, hooks: ArrivalHooks): void {
    const v0 = Math.max(6, this.comet.speed);
    const v1 = v0 * 0.45;                    // velocidad al cruzar el último anillo
    const span = ringCount * RING_NOTE_GAP_S;

    // El astro se planta por delante del cometa y NO se mueve más.
    const starDistance = this.comet.distance + 420;
    this.track.ensureReach(starDistance + ORBIT_DEPTH + 120);
    this.perihelion.build(starDistance, litClasses);

    // Distancia que cubre el ritardando: integral de la rampa lineal de velocidad.
    const ringSpan = ((v0 + v1) / 2) * span;
    // Los anillos deben MORIR en el astro, así que se colocan hacia atrás.
    const ringStart = Math.max(this.comet.distance, starDistance - 90 - ringSpan);
    const at = (t: number): number => ringStart + v0 * t + ((v1 - v0) * t * t) / (2 * span);

    const ringDistances: number[] = [];
    for (let i = 0; i < ringCount; i++) ringDistances.push(at((i + 1) * RING_NOTE_GAP_S));
    this.perihelion.buildRings(ringDistances);
    if (gala) this.perihelion.startGala();

    this.arrival = {
      hooks, start: ringStart, v0, v1, span, ringDistances, nextRing: 0,
      stopDistance: starDistance + ORBIT_DEPTH,
      elapsed: 0, cruising: this.comet.distance < ringStart - 0.5,
      ringStart, settling: false, finished: false,
    };
    this.comet.setExternalDrive(true);
  }

  /** Salta el resto de la ceremonia (§12: saltable tras 5 s). */
  skipArrival(): void {
    const a = this.arrival;
    if (!a || a.finished) return;
    for (let i = a.nextRing; i < a.ringDistances.length; i++) this.perihelion.lightRing(i);
    this.perihelion.celebrate();
    a.finished = true;
    this.comet.distance = a.stopDistance;
    this.comet.speed = 0;
    a.hooks.onSettled();
  }

  isArriving(): boolean {
    return this.arrival !== null && !this.arrival.finished;
  }

  private updateArrival(dt: number): void {
    const a = this.arrival;
    if (!a || a.finished) return;

    // Fase 0: volar a crucero hasta el primer anillo. El astro puede quedar lejos.
    if (a.cruising) {
      this.comet.speed = a.v0;
      this.comet.distance += a.v0 * dt;
      if (this.comet.distance >= a.ringStart) {
        this.comet.distance = a.ringStart;
        a.cruising = false;
        a.elapsed = 0;
      }
      return;
    }

    if (!a.settling) {
      a.elapsed += dt;
      const t = Math.min(a.elapsed, a.span);
      this.comet.distance = a.start + a.v0 * t + ((a.v1 - a.v0) * t * t) / (2 * a.span);
      this.comet.speed = a.v0 + ((a.v1 - a.v0) * t) / a.span;
      // Los anillos se disparan por POSICIÓN, no por reloj: así el latón y la nota caen
      // en el mismo frame aunque el navegador dé un tirón.
      while (a.nextRing < a.ringDistances.length && this.comet.distance >= a.ringDistances[a.nextRing]) {
        this.perihelion.lightRing(a.nextRing);
        a.hooks.onRing(a.nextRing);
        a.nextRing += 1;
        if (a.nextRing === a.ringDistances.length) {
          a.hooks.onFinalChord();
          this.perihelion.celebrate();
          a.settling = true;
          a.elapsed = 0;
        }
      }
      return;
    }

    // Entrada en órbita: deceleración constante hasta quedarse quieto junto al astro.
    const total = a.stopDistance - a.ringDistances[a.ringDistances.length - 1];
    const remaining = a.stopDistance - this.comet.distance;
    if (remaining <= 0.15) {
      this.comet.distance = a.stopDistance;
      this.comet.speed = 0;
      a.finished = true;
      a.hooks.onSettled();
      return;
    }
    this.comet.speed = Math.max(0.8, a.v1 * Math.sqrt(Math.max(0, remaining) / total));
    this.comet.distance += this.comet.speed * dt;
  }

  /** Clang del anillo al resolverse: metálico-cristalino, sin altura (§2.11). */
  playRingClang(): void {
    this.sound.playIceCrack(1.6);
  }

  stats(): JourneyStats {
    return {
      distance: this.comet.distance,
      speed: this.comet.speed,
      segment: this.comet.segmentPosition().index,
      chunks: this.track.chunkCount(),
      sceneryChunks: this.scenery.chunkCount(),
      spinners: this.scenery.spinnerCount(),
      progress: this.gameProgress,
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
      // La deriva se aplica ANTES del tick: si no, el juego decidiría con una posición
      // y el mundo se dibujaría con otra durante un frame.
      this.updateArrival(dt);
      this.perihelion.update(dt, this.comet.root.position);
      this.drift.update(dt);
      this.comet.lateralOffset = this.drift.offsetFor(this.comet.distance);
      const grey = this.drift.greyAmount();
      this.environment.setDriftGrey(grey);
      this.scenery.setDim(grey);
      this.comet.update(dt);
      this.onTick?.(dt, this.comet.distance, this.comet.speed);
      this.updateDust(this.comet.root.position);

      // Progreso estimado por distancia mientras nadie lo mande desde fuera (F6 lo hará
      // con las decisiones acertadas, que es lo que de verdad acerca a casa).
      if (!this.progressDriven) {
        this.gameProgress = Math.min(1, this.comet.distance / (SEGMENT_LENGTH * DECISIONS_TO_ARRIVE));
      }
      this.scenery.update(this.comet.distance, dt);
      this.rings.update(this.comet.distance, dt);
      this.environment.update(this.comet.root.position, this.gameProgress, dt);
      this.sound.update(this.comet.speed, this.cruiseSpeed);
      this.beaconPull = Math.max(0, this.beaconPull - dt * 1.8);
      this.cab.update(dt, {
        speed: THREE.MathUtils.clamp(this.comet.speed / (this.cruiseSpeed * SPRINT_FACTOR), 0, 1),
        slingshot: this.comet.slingshotAmount(),
        beaconPull: this.beaconPull,
      });
    }

    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.frame);
  };
}
