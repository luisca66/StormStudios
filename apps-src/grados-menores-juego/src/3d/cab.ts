// cab.ts — La carlinga (PLAN §6), modelada en Blender (art/blender/carlinga/modelar-carlinga.py):
// marco de hielo con portillas de latón empotradas, la proa del cometa por delante con sus
// grietas luminosas y el tablero de madera con orrery, sextante, manómetro y llave del
// radiofaro. La estela de motas sigue siendo código.
//
// Todo cuelga del `cabAnchor` del cometa, no de la cámara: la carlinga es del vehículo,
// así que la mirada se pasea por ella en vez de arrastrarla. El origen del modelo es el ojo.

import * as THREE from "three";
import { TRAIL_SPRITE_MAX } from "@/config";
import carlingaUrl from "./assets/carlinga.json?url";

interface PartData {
  name: string;
  part: string;
  segment?: number;
  pivot: number[];
  position: number[];
  normal: number[];
  index: number[];
  vertexColor?: number[];
  /** Solo la proa: emisión por vértice (grietas claras sobre núcleo oscuro). */
  emissionVertexColor?: number[];
  color: number[];
  metalness: number;
  roughness: number;
  emission: number;
  emissionColor: number[];
}

interface CarlingaData {
  instrumentAxisY: number[];
  orbitSpeeds: number[];
  meshes: PartData[];
}

/** Mota de hielo con halo suave: la partícula de la estela. */
function moteTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(232,246,252,0.95)");
  grad.addColorStop(0.4, "rgba(159,216,232,0.45)");
  grad.addColorStop(1, "rgba(159,216,232,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// Aguja del manómetro: +120° (izquierda) en reposo, barre 240° hacia la derecha.
const GAUGE_REST = (120 * Math.PI) / 180;
const GAUGE_SWEEP = (240 * Math.PI) / 180;
// La emisión de Cycles satura en tiempo real sin bloom: se atenúa para que las grietas brillen sin quemar.
const NOSE_GLOW = 0.55;

interface Mote {
  alive: boolean;
  life: number;
  maxLife: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
}

export interface CabReadings {
  /** 0–1 respecto a la velocidad máxima posible: mueve la aguja del empuje de cola. */
  speed: number;
  /** 0–1: cuánto queda del slingshot; la estela se enciende con él. */
  slingshot: number;
  /** 0–1: la llave del radiofaro baja al usarlo y vuelve sola. */
  beaconPull?: number;
}

export class Cab {
  private readonly group = new THREE.Group();
  private readonly motes: Mote[] = [];
  private readonly trailPositions: Float32Array;
  private readonly trailColors: Float32Array;
  private readonly trailGeo = new THREE.BufferGeometry();
  private spawnAccumulator = 0;

  // Instrumentos vivos del tablero (§6): pivotes y ejes vienen del modelo.
  private readonly planets: Array<{ mesh: THREE.Mesh; speed: number; angle: number }> = [];
  private needle: THREE.Mesh | null = null;
  private needleAngle = GAUGE_REST;
  private beaconLever: THREE.Mesh | null = null;
  private readonly instrumentAxis = new THREE.Vector3(0, 1, 0);
  private elapsed = 0;

  constructor(anchor: THREE.Object3D) {
    // --- Estela propia: motas de hielo que salen hacia atrás desde la proa (§5.6).
    // Van en UN solo THREE.Points (1 draw call) en vez de un sprite por mota: con
    // sprites, además, el material se comparte y la opacidad de uno sería la de todos.
    // El desvanecido se hace por COLOR: con blending aditivo, negro = invisible.
    this.trailPositions = new Float32Array(TRAIL_SPRITE_MAX * 3);
    this.trailColors = new Float32Array(TRAIL_SPRITE_MAX * 3);
    this.trailGeo.setAttribute("position", new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeo.setAttribute("color", new THREE.BufferAttribute(this.trailColors, 3));
    // Las motas muertas se aparcan lejísimos en vez de borrarse del buffer: con color
    // negro no pintan nada, y así el atributo nunca cambia de tamaño.
    for (let i = 0; i < TRAIL_SPRITE_MAX; i++) {
      this.trailPositions[i * 3 + 1] = 1e6;
      this.motes.push({ alive: false, life: 0, maxLife: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
    }
    const trail = new THREE.Points(this.trailGeo, new THREE.PointsMaterial({
      map: moteTexture(), size: 0.42, sizeAttenuation: true, vertexColors: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    trail.frustumCulled = false; // vive pegado a la cámara; el culling solo daría tirones
    this.group.add(trail);

    // Farol de cabina: luz cálida tenue y de corto alcance sobre el tablero. Sin ella, la
    // madera se pierde en la oscuridad del espacio; no llega a la proa ni al mundo.
    const lamp = new THREE.PointLight(0xffc98a, 3.2, 3.4, 2);
    lamp.position.set(0, 0.45, -0.15);
    this.group.add(lamp);

    anchor.add(this.group);

    // El modelo se descarga en segundo plano; hasta que llega, solo se ve la estela.
    fetch(carlingaUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Carlinga: HTTP ${response.status}`);
        this.buildModel((await response.json()) as CarlingaData);
      })
      .catch((error: unknown) => console.warn(error));
  }

  /** Crea las 10 partes del modelo; cada malla queda en su pivote dentro del espacio del ojo. */
  private buildModel(data: CarlingaData): void {
    this.instrumentAxis.fromArray(data.instrumentAxisY).normalize();
    for (const part of data.meshes) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
      if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
      geometry.setIndex(part.index);
      geometry.computeBoundingSphere();

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
        vertexColors: Boolean(part.vertexColor),
        metalness: part.metalness,
        roughness: part.roughness,
        emissive: new THREE.Color().setRGB(part.emissionColor[0], part.emissionColor[1], part.emissionColor[2]),
        emissiveIntensity: part.emission,
      });
      if (part.emissionVertexColor) {
        // Grietas de la proa: la emisión viene por vértice (núcleo oscuro, fisuras cian).
        geometry.setAttribute("emissionTint", new THREE.Float32BufferAttribute(part.emissionVertexColor, 3));
        material.emissive.set(0xffffff);
        material.emissiveIntensity = part.emission * NOSE_GLOW;
        material.onBeforeCompile = (shader) => {
          shader.vertexShader = shader.vertexShader
            .replace("#include <common>", "#include <common>\nattribute vec3 emissionTint;\nvarying vec3 vEmissionTint;")
            .replace("#include <begin_vertex>", "#include <begin_vertex>\nvEmissionTint = emissionTint;");
          shader.fragmentShader = shader.fragmentShader
            .replace("#include <common>", "#include <common>\nvarying vec3 vEmissionTint;")
            .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vEmissionTint;");
        };
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = part.name;
      mesh.position.fromArray(part.pivot);
      this.group.add(mesh);

      if (part.part === "orrery_planet") {
        const segment = part.segment ?? 0;
        this.planets.push({ mesh, speed: data.orbitSpeeds[segment] ?? 0.4, angle: 0 });
      } else if (part.part === "gauge_needle") {
        this.needle = mesh;
      } else if (part.part === "beacon_lever") {
        this.beaconLever = mesh;
      }
    }
  }

  /**
   * La estela se emite en el espacio LOCAL de la carlinga y viaja hacia +Z (atrás): como
   * la carlinga viaja con el cometa, el resultado que se ve por las portillas es polvo
   * quedándose atrás. Más velocidad = más caudal y más brillo.
   */
  update(dt: number, readings: CabReadings): void {
    this.elapsed += dt;
    this.updateInstruments(dt, readings);

    const rate = 14 + readings.speed * 46 + readings.slingshot * 40;
    this.spawnAccumulator += rate * dt;
    while (this.spawnAccumulator >= 1) {
      this.spawnAccumulator -= 1;
      this.spawnMote(readings);
    }

    // Con el slingshot la cola se enciende (§7.1): más caudal y más brillo.
    const glow = 1 + readings.slingshot * 1.6;
    for (let i = 0; i < this.motes.length; i++) {
      const mote = this.motes[i];
      if (!mote.alive) continue;
      mote.life += dt;
      if (mote.life >= mote.maxLife) {
        mote.alive = false;
        this.trailPositions[i * 3 + 1] = 1e6;
        this.trailColors[i * 3] = this.trailColors[i * 3 + 1] = this.trailColors[i * 3 + 2] = 0;
        continue;
      }
      const t = mote.life / mote.maxLife;
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      mote.z += mote.vz * dt;
      this.trailPositions[i * 3] = mote.x;
      this.trailPositions[i * 3 + 1] = mote.y;
      this.trailPositions[i * 3 + 2] = mote.z;
      // Desvanecido por color (aditivo): de hielo brillante a negro.
      const fade = (1 - t) * 0.85 * glow;
      this.trailColors[i * 3] = 0.62 * fade;
      this.trailColors[i * 3 + 1] = 0.85 * fade;
      this.trailColors[i * 3 + 2] = fade;
    }
    this.trailGeo.attributes.position.needsUpdate = true;
    this.trailGeo.attributes.color.needsUpdate = true;
  }

  /** Los instrumentos viven: el orrery gira, la aguja sigue la velocidad y la llave baja. */
  private updateInstruments(dt: number, readings: CabReadings): void {
    // Los vértices del modelo ya traen la inclinación del tablero: se gira alrededor de su
    // normal (instrumentAxisY) en el espacio común, sin volver a inclinar.
    for (const planet of this.planets) {
      planet.angle += planet.speed * dt;
      planet.mesh.quaternion.setFromAxisAngle(this.instrumentAxis, planet.angle);
    }

    if (this.needle) {
      // La aguja barre 240° de esfera (izquierda en reposo, derecha a tope) y persigue la
      // lectura, no salta a ella: un instrumento de latón tiene inercia.
      const target = GAUGE_REST - readings.speed * GAUGE_SWEEP;
      this.needleAngle += (target - this.needleAngle) * Math.min(1, dt * 6);
      this.needle.quaternion.setFromAxisAngle(this.instrumentAxis, this.needleAngle);
    }

    if (this.beaconLever) {
      // La llave del telégrafo baja al transmitir y vuelve sola (sobre su bisagra, eje X).
      this.beaconLever.rotation.x = (readings.beaconPull ?? 0) * 0.42;
    }
  }

  private spawnMote(readings: CabReadings): void {
    const index = this.motes.findIndex((m) => !m.alive);
    if (index === -1) return;
    const mote = this.motes[index];
    const a = Math.random() * Math.PI * 2;
    const r = 0.5 + Math.random() * 1.3;
    mote.x = Math.cos(a) * r;
    mote.y = -1.4 + Math.sin(a) * r * 0.6;
    mote.z = -4.2;
    // Hacia atrás (+Z local), con dispersión lateral: la cola se abre al alejarse.
    mote.vz = 16 + readings.speed * 30 + readings.slingshot * 22;
    mote.vx = Math.cos(a) * (0.7 + Math.random());
    mote.vy = Math.sin(a) * (0.7 + Math.random());
    mote.life = 0;
    mote.maxLife = 0.55 + Math.random() * 0.5;
    mote.alive = true;
  }
}
