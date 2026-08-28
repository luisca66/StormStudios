// renderer.ts — escena, cámara y loop de F2. Mantiene deliberadamente neutro el
// mundo exterior: cielo y biomas completos llegan en F3.

import * as THREE from "three";
import {
  CAMERA_FOV, DECISIONS_TO_ARRIVE, SEGMENT_LENGTH, SPRINT_FACTOR, WORLD_SEED_BASE,
  routeForScale, type SpeedSpec,
} from "@/config";
import { SCALES } from "@/music/degrees";
import { TrainSound } from "@/audio/train-sound";
import { TrackManager } from "./track";
import { TrainController } from "./train";
import { Cab } from "./cab";
import { Environment } from "./environment";
import { Scenery } from "./scenery";
import { CrossingTrain } from "./crossing-train";
import { Signals, type SwitchResult } from "./signals";
import { Detour, detourSideFor } from "./detour";
import { Storm } from "./storm";
import { StormSound } from "@/audio/storm-sound";
import { FireworksSound } from "@/audio/fireworks-sound";
import { Station, VAULT_DEPTH } from "./station";
import { ARCH_NOTE_GAP_S } from "@/config";

/** Guion de la llegada (§12): ritardando con pulso musical constante. */
const ARCH_COUNT = 8;
const RITARDANDO_FACTOR = 0.45; // velocidad al cruzar el 8º arco, respecto a la inicial
const NAVE_LEAD = 46;           // hueco entre el último arco y la boca de la nave
/** Progreso a partir del cual la Terminal ya se ve en el horizonte (acto 3, §5.2). */
const STATION_REVEAL_AT = 0.55;
/** Colchón, en segmentos, sobre las decisiones que faltan al plantarla. */
const STATION_SLACK_SEGMENTS = 2;

export interface ArrivalHooks {
  /** Se cruza el arco `index` (0–7): suena su grado de la escala. */
  onArch(index: number): void;
  /** 8º arco cruzado: acorde de tónica, campana y frenos. */
  onFinalChord(): void;
  /** El tren se detuvo en el tope: toca mostrar el resumen. */
  onStopped(): void;
}

export interface JourneyOptions {
  scale: string;
  speed: SpeedSpec;
  volume: number; // 0–100
  /** Clase de altura de la tónica: el rosetón de la Terminal se orienta con ella. */
  tonicPitchClass: string;
}

export class JourneyRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly track: TrackManager;
  private readonly train: TrainController;
  private readonly sound = new TrainSound();
  private readonly fireworksSound = new FireworksSound();
  private readonly environment: Environment;
  private readonly scenery: Scenery;
  private readonly crossing: CrossingTrain;
  private readonly cab: Cab;
  private readonly signals: Signals;
  private readonly detour: Detour;
  private readonly station: Station;
  private readonly storm: Storm;
  private readonly stormSound = new StormSound();
  private arrival: {
    hooks: ArrivalHooks;
    start: number;        // distancia del tren al empezar el guion
    v0: number; v1: number; span: number;
    archDistances: number[];
    nextArch: number;
    stopDistance: number;
    elapsed: number;
    /** Rodando aún hacia el primer arco: la Terminal ya está plantada y hay que llegar. */
    cruising: boolean;
    archStart: number;
    braking: boolean;
    finished: boolean;
  } | null = null;
  private whistlePull = 0;
  private questionLive = false;
  /** Progreso 0–1 del juego: decide cuándo asoma la Terminal en el horizonte. */
  private gameProgress = 0;
  private tonicPitchClass = "C";
  private animationFrame = 0;
  /** Lo llama el frame loop para que el juego avance con la distancia real del tren. */
  onTick: ((dt: number, distance: number, speed: number) => void) | null = null;
  private lastTime = 0;
  private active = false;
  private paused = false;
  private cruiseSpeed = 11;
  private smoothedFps = 60;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = false;

    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.08, 900);
    this.track = new TrackManager(this.scene);
    this.train = new TrainController(this.track, this.camera, canvas);
    this.scene.add(this.train.root);
    this.cab = new Cab(this.train.cabAnchor);
    this.environment = new Environment(this.scene);
    this.scenery = new Scenery(this.scene, this.track);
    this.signals = new Signals(this.scene, this.track);
    this.detour = new Detour(this.scene, this.track);
    this.station = new Station(this.scene, this.track);
    this.storm = new Storm(this.scene);
    this.crossing = new CrossingTrain(
      this.scene, this.track,
      (fromLeft, duration) => this.sound.playHorn(fromLeft, duration),
    );

    window.addEventListener("resize", this.resize);
    this.resize();
  }

  start(options: JourneyOptions): void {
    const routeIndex = Math.max(0, SCALES.indexOf(options.scale as (typeof SCALES)[number]));
    const seed = WORLD_SEED_BASE + routeIndex * 7919;
    const route = routeForScale(options.scale);
    this.track.reset(seed);
    this.environment.setRoute(route, seed);
    this.scenery.reset(route, seed);
    this.signals.reset();
    this.crossing.reset(seed, DECISIONS_TO_ARRIVE);
    this.tonicPitchClass = options.tonicPitchClass;
    this.gameProgress = 0;
    this.cruiseSpeed = options.speed.unitsPerSecond;
    this.train.startJourney(this.cruiseSpeed);
    // §7.1: primero la cadencia con el tren parado; `releaseBrakes()` lo suelta después.
    this.train.setRunning(false);
    this.sound.start(options.volume / 100);
    this.stormSound.setVolume(options.volume / 100);
    // 9 MB: se van bajando durante el viaje para que el desvío no espere.
    this.stormSound.preload();
    this.active = true;
    this.paused = false;
    this.lastTime = performance.now();
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  pause(): void {
    if (!this.active || this.paused) return;
    this.paused = true;
    this.train.setRunning(false);
    this.sound.pause();
    this.fireworksSound.pause();
  }

  resume(): void {
    if (!this.active || !this.paused) return;
    this.paused = false;
    this.lastTime = performance.now();
    this.train.setRunning(true);
    this.sound.resume();
    this.fireworksSound.resume();
  }

  stop(): void {
    this.active = false;
    this.paused = false;
    this.train.setRunning(false);
    this.sound.stop();
    this.fireworksSound.stop();
    this.crossing.dispose();
    this.detour.dispose();
    this.station.dispose();
    this.storm.dispose();
    this.stormSound.dispose();
    this.arrival = null;
    this.train.setExternalDrive(false);
    cancelAnimationFrame(this.animationFrame);
  }

  setVolume(volume: number): void {
    this.sound.setVolume(volume / 100);
    this.stormSound.setVolume(volume / 100);
    this.fireworksSound.setVolume(volume / 100);
  }

  /** Tirón de la palanca del silbato: sube de golpe y la cabina lo deja caer sola. */
  pullWhistle(): void {
    this.whistlePull = 1;
  }

  /** Suelta el freno tras la cadencia de salida (§7.1). */
  releaseBrakes(): void {
    if (this.active && !this.paused) this.train.setRunning(true);
  }

  setSwitchResult(segmentIndex: number, result: SwitchResult): void {
    this.signals.setResult(segmentIndex, result);
  }

  /** Clunk del espadín al asentar: lo dispara el acierto (§7.1). */
  playSwitchClunk(): void {
    this.sound.playClunk();
  }

  duckBed(level: number): void {
    this.sound.setDuck(level);
  }

  setGameProgress(fraction: number): void {
    this.gameProgress = THREE.MathUtils.clamp(fraction, 0, 1);
  }

  /**
   * Planta la Terminal donde va a estar de verdad: tan lejos como decisiones queden,
   * más un colchón. No se vuelve a mover salvo por un desvío, que sí alarga el viaje.
   */
  private revealStation(): void {
    const pending = Math.max(1, (1 - this.gameProgress) * DECISIONS_TO_ARRIVE);
    const distance = this.train.distance
      + (pending + STATION_SLACK_SEGMENTS) * SEGMENT_LENGTH;
    this.track.ensureReach(distance + VAULT_DEPTH + 80);
    this.station.build({ distance, tonicPitchClass: this.tonicPitchClass });
    // 4.8 MB del castillo de fuegos: se bajan al asomar la Terminal, no al llegar.
    // Si la gala no toca (hubo desvío o silbato) el clip simplemente no se reproduce.
    this.fireworksSound.preload();
  }

  /** El tren toma el ramal: el lado alterna con el segmento para no cansar (§5.5). */
  beginDetour(startDistance: number): void {
    this.detour.begin(startDistance, detourSideFor(startDistance));
    this.stormSound.start();
    // Un desvío añade un segmento entero de viaje: la Terminal se aleja otro tanto para
    // no quedar alcanzable antes de tiempo. Es el ÚNICO caso en que se mueve, y ocurre
    // con el mundo en gris, donde no se nota.
    if (this.station.isBuilt() && !this.isArriving()) {
      this.station.relocate(this.station.stationDistance() + SEGMENT_LENGTH);
    }
  }

  endDetour(): void {
    this.detour.end();
    this.stormSound.stop();
  }

  /**
   * Arranca la secuencia de llegada (§12). Los arcos NO se colocan a distancia fija:
   * se integran sobre el perfil de velocidad para que cada uno se cruce exactamente a
   * ARCH_NOTE_GAP_S del anterior. Como el tren frena, los arcos se van JUNTANDO — el
   * ritardando es del tren, pero el pulso de la escala se mantiene clavado.
   */
  beginArrival(_tonicPitchClass: string, gala: boolean, hooks: ArrivalHooks): void {
    const v0 = Math.max(6, this.train.speed);
    const v1 = v0 * RITARDANDO_FACTOR;
    const span = ARCH_COUNT * ARCH_NOTE_GAP_S;

    // La Terminal YA está plantada desde el acto 3 y no se mueve: la ceremonia entra en
    // ESA, en vez de fabricar otra delante del tren como hacía antes.
    if (!this.station.isBuilt()) this.revealStation();
    const stationDistance = this.station.stationDistance();

    // Distancia que cubre el ritardando: integral de la rampa lineal de velocidad.
    const archSpan = ((v0 + v1) / 2) * span;
    // Los arcos deben MORIR en la boca de la nave, así que se colocan hacia atrás.
    const archStart = Math.max(
      this.train.distance, stationDistance - NAVE_LEAD - archSpan,
    );
    const at = (t: number): number => archStart + v0 * t + ((v1 - v0) * t * t) / (2 * span);

    const archDistances: number[] = [];
    for (let i = 0; i < ARCH_COUNT; i++) archDistances.push(at((i + 1) * ARCH_NOTE_GAP_S));

    this.track.ensureReach(stationDistance + VAULT_DEPTH + 80);
    this.station.buildArches(archDistances);
    if (gala) {
      this.station.startGala();
      // El show manda: cada bomba del cielo estalla sobre su trueno de la grabación.
      this.fireworksSound.start();
    }

    this.arrival = {
      hooks, start: archStart, v0, v1, span, archDistances, nextArch: 0,
      stopDistance: stationDistance + VAULT_DEPTH - 14,
      elapsed: 0, cruising: this.train.distance < archStart - 0.5,
      archStart, braking: false, finished: false,
    };
    this.train.setExternalDrive(true);
  }

  /** Salta el resto de la ceremonia (§12: saltable tras 5 s). */
  skipArrival(): void {
    if (!this.arrival || this.arrival.finished) return;
    for (let i = this.arrival.nextArch; i < ARCH_COUNT; i++) this.station.lightArch(i);
    this.arrival.finished = true;
    this.train.distance = this.arrival.stopDistance;
    this.train.speed = 0;
    this.arrival.hooks.onStopped();
  }

  isArriving(): boolean {
    return this.arrival !== null && !this.arrival.finished;
  }

  private updateArrival(dt: number): void {
    const a = this.arrival;
    if (!a || a.finished) return;

    // Fase 0: rodar a velocidad de crucero hasta el primer arco. La Terminal está
    // plantada desde hace rato y puede quedar lejos; los arcos empiezan donde toca.
    if (a.cruising) {
      this.train.speed = a.v0;
      this.train.distance += a.v0 * dt;
      if (this.train.distance >= a.archStart) {
        this.train.distance = a.archStart;
        a.cruising = false;
        a.elapsed = 0;
      }
      return;
    }

    a.elapsed += dt;

    if (!a.braking) {
      const t = Math.min(a.elapsed, a.span);
      this.train.distance = a.start + a.v0 * t + ((a.v1 - a.v0) * t * t) / (2 * a.span);
      this.train.speed = a.v0 + ((a.v1 - a.v0) * t) / a.span;
      // Los arcos se disparan por POSICIÓN, no por reloj: así el medallón y la nota
      // caen en el mismo frame aunque el navegador dé un tirón.
      while (a.nextArch < ARCH_COUNT && this.train.distance >= a.archDistances[a.nextArch]) {
        this.station.lightArch(a.nextArch);
        a.hooks.onArch(a.nextArch);
        a.nextArch += 1;
        if (a.nextArch === ARCH_COUNT) {
          a.hooks.onFinalChord();
          this.sound.playBell(3);
          this.sound.playBrakes(4.5);
          a.braking = true;
          a.elapsed = 0;
        }
      }
      return;
    }

    // Frenada ceremonial: deceleración CONSTANTE, v = v₁·√(restante/total), que es como
    // frena un tren de verdad. Con el perfil lineal que tenía antes la velocidad caía a
    // un suelo de 0.4 u/s y el último tramo se arrastraba ~23 s de puro gateo.
    const total = a.stopDistance - a.archDistances[ARCH_COUNT - 1];
    const remaining = a.stopDistance - this.train.distance;
    if (remaining <= 0.12) {
      this.train.distance = a.stopDistance;
      this.train.speed = 0;
      a.finished = true;
      a.hooks.onStopped();
      return;
    }
    this.train.speed = Math.max(0.9, a.v1 * Math.sqrt(Math.max(0, remaining) / total));
    this.train.distance += this.train.speed * dt;
  }

  /**
   * Silencio pedagógico §2.10: con pregunta viva no se agenda ningún evento ambiental.
   * El tren cruzado ya sabía callarse; aquí se le da la orden.
   */
  setAmbientSuppressed(suppressed: boolean): void {
    this.questionLive = suppressed;
    this.crossing.setSuppressed(suppressed);
  }

  isActive(): boolean {
    return this.active;
  }

  getSnapshot(): {
    distance: number;
    speed: number;
    trackChunks: number;
    sceneryChunks: number;
    drawCalls: number;
    fps: number;
    paused: boolean;
  } {
    return {
      distance: this.train.distance,
      speed: this.train.speed,
      trackChunks: this.track.chunkCount(),
      sceneryChunks: this.scenery.chunkCount(),
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
      // El apartadero se aplica ANTES del tick: si no, el juego decidiría con una
      // posición y el mundo se dibujaría con otra durante un frame.
      this.detour.update(dt);
      this.train.lateralOffset = this.detour.offsetFor(this.train.distance);
      this.updateArrival(dt);
      for (const cue of this.fireworksSound.update()) {
        this.station.cueFirework(cue.delay, cue.strength);
      }
      this.station.update(dt);
      this.train.update(dt);
      this.onTick?.(dt, this.train.distance, this.train.speed);
      const tunnel = this.scenery.update(this.train.distance, dt);
      this.signals.update(this.train.distance, dt);
      this.crossing.update(this.train.distance, dt);
      const progress = Math.min(1, this.train.distance / (SEGMENT_LENGTH * DECISIONS_TO_ARRIVE));
      // La Terminal asoma en el acto 3 (§5.2) y se planta en un PUNTO FIJO: a partir de
      // ahí solo crece porque el tren se acerca, que es lo que se espera de un edificio.
      if (!this.station.isBuilt() && this.gameProgress >= STATION_REVEAL_AT) {
        this.revealStation();
      }
      const grey = this.detour.greyAmount();
      this.environment.setDetourGrey(grey);
      // La tormenta vive y muere con el gris del apartadero; el relámpago lo dispara
      // el AUDIO al cruzar un trueno, no un temporizador nuestro.
      this.storm.setIntensity(grey);
      const clap = this.stormSound.update(dt);
      if (clap > 0) {
        this.storm.strike(
          clap, this.train.root.position,
          new THREE.Vector3(0, 0, -1).applyQuaternion(this.train.root.quaternion),
        );
      }
      this.storm.update(dt, this.train.root.position);
      this.environment.update(this.train.root.position, progress, tunnel, dt);
      this.sound.update(this.train.speed, this.cruiseSpeed);
      this.sound.setTunnel(tunnel);
      // Traqueteo amortiguado en el apartadero (§5.5), sin pisar el ducking de pregunta.
      if (!this.questionLive) this.sound.setDuck(1 - 0.45 * grey);

      // Lecturas de la cabina. La "presión" sube con el sprint de la zona muerta: es el
      // respiro entre preguntas hecho instrumento. F6 la atará al estado real del juego.
      this.whistlePull = Math.max(0, this.whistlePull - dt * 1.6);
      const sprintRange = this.cruiseSpeed * (SPRINT_FACTOR - 1);
      this.cab.update(dt, {
        speed: THREE.MathUtils.clamp(this.train.speed / (this.cruiseSpeed * SPRINT_FACTOR), 0, 1),
        // La presión sube con el sprint de la zona muerta y se desfonda con la pregunta:
        // el manómetro dice "ahora te toca a ti" sin una sola palabra.
        pressure: this.questionLive
          ? 0.12
          : THREE.MathUtils.clamp((this.train.speed - this.cruiseSpeed) / sprintRange, 0, 1),
        whistlePull: this.whistlePull,
      });
    }
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.frame);
  };
}
