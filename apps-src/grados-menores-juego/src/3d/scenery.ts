// scenery.ts — Las regiones del espacio (PLAN §5.4). F3 viste dos: Nebulosa Lumbre y
// Cinturón de Rocas; las otras tres llegan en F4.
//
// Estructura calcada del Expreso: escenografía por CHUNKS ligados al índice de segmento,
// construidos por delante y liberados por detrás. Geometrías y materiales se comparten
// por región (se crean una vez en el módulo) — lo que se libera por chunk es solo lo que
// el chunk posee.

import * as THREE from "three";
import {
  SEGMENT_LENGTH, SEGMENTS_AHEAD, DISPOSE_BEHIND, DEAD_ZONE_LENGTH, FAUNA_COUNT,
  FAUNA_FLAP_HZ, SIBLING_COMET_MAX, SIBLING_COMET_SPEED, SIBLING_TRACK_OFFSET,
  SIBLING_ROAR_DURATION_S, AEROSTATO_BALLOON_ALTITUDE, type RouteSpec,
} from "@/config";
import { TrackManager, newTrackFrame, makeRng, type TrackFrame } from "./track";

interface SceneryChunk {
  group: THREE.Group;
  owned: THREE.BufferGeometry[];
  /** Una instancia por geometría de roca; el chunk las posee y las libera. */
  rockMeshes: THREE.InstancedMesh[];
  rocks: RockInstance[];
}

/**
 * Una roca dentro de su InstancedMesh. Se guarda la pose descompuesta porque la matriz
 * hay que recomponerla cada frame para el giro (§5.6).
 */
interface RockInstance {
  meshIndex: number;
  slot: number;
  pos: THREE.Vector3;
  scale: THREE.Vector3;
  rot: THREE.Euler;
  av: THREE.Vector3;
}

/** Gas de nebulosa: mancha suave para los pilares y los huevos de estrella. */
function gasTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,236,214,0.85)");
  grad.addColorStop(0.35, "rgba(255,150,90,0.38)");
  grad.addColorStop(0.75, "rgba(190,60,90,0.14)");
  grad.addColorStop(1, "rgba(120,30,70,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Mota redonda: sin mapa, un THREE.Points se dibuja como un cuadrado. */
function moteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

// --- Materiales compartidos por región (creados una vez, nunca liberados por chunk) ---

const gasMaterial = new THREE.SpriteMaterial({
  map: gasTexture(), transparent: true, depthWrite: false,
  blending: THREE.AdditiveBlending, opacity: 0.55, fog: false,
});

/** Roca: mate y oscura, para que la luz de la estrella natal la modele. */
const rockMaterial = new THREE.MeshStandardMaterial({
  color: "#6b6152", roughness: 0.95, metalness: 0.05, flatShading: true,
});

/** Cristal de las rocas: emisivo tenue, el guiño del asteroide-catedral. */
const crystalMaterial = new THREE.MeshStandardMaterial({
  color: "#7fd0c0", roughness: 0.25, metalness: 0.1,
  emissive: new THREE.Color("#2a7f6f"), emissiveIntensity: 0.9, flatShading: true,
});

// Cinco cuerpos low-poly distintos: un cinturón con una sola roca clonada se nota.
const ROCK_GEOMETRIES = [
  new THREE.DodecahedronGeometry(1, 0),
  new THREE.IcosahedronGeometry(1, 0),
  new THREE.OctahedronGeometry(1, 1),
  new THREE.TetrahedronGeometry(1.25, 0),
  new THREE.DodecahedronGeometry(1, 1),
];
const CRYSTAL_GEOMETRY = new THREE.OctahedronGeometry(1, 0);

/** Probabilidad por segundo de que el cometa hermano se asome (solo en zona muerta). */
const SIBLING_SPAWN_PER_SECOND = 0.25;

/** Polvo luminoso de la Nebulosa Lumbre (compartido: un material para todos los chunks). */
const moteMaterial = new THREE.PointsMaterial({
  map: moteTexture(), color: 0xffb070, size: 1.1, sizeAttenuation: true,
  transparent: true, opacity: 0.8, depthWrite: false,
  blending: THREE.AdditiveBlending, fog: false,
});

// --- Anillos de Hielo (§5.4) ---------------------------------------------------

/** Bandeado del gigante gaseoso: franjas horizontales con turbulencia, en canvas. */
function gasGiantTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 128;
  const g = canvas.getContext("2d")!;
  const rng = makeRng(90210);
  g.fillStyle = "#2d5f78";
  g.fillRect(0, 0, 256, 128);
  let y = 0;
  while (y < 128) {
    const h = 3 + rng() * 13;
    const shade = 0.55 + rng() * 0.5;
    g.fillStyle = "rgba(" + Math.round(120 * shade) + "," + Math.round(180 * shade) + "," + Math.round(210 * shade) + ",1)";
    // Cada franja ondula: un bandeado de rectas rectos se lee a persiana.
    for (let x = 0; x < 256; x += 4) {
      const wobble = Math.sin(x * 0.05 + y * 0.3) * 2.2;
      g.fillRect(x, y + wobble, 5, h);
    }
    y += h;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const iceParticleMaterial = new THREE.PointsMaterial({
  map: moteTexture(), color: 0xcfeaf5, size: 0.7, sizeAttenuation: true,
  transparent: true, opacity: 0.75, depthWrite: false,
  blending: THREE.AdditiveBlending, fog: false,
});

const moonMaterial = new THREE.MeshStandardMaterial({
  color: "#b8c6cf", roughness: 0.9, metalness: 0.02, flatShading: true,
});

// --- Cúmulo de Faroles (§5.4, §5.7) --------------------------------------------

/** Los soles del cúmulo: cientos, pero en UN Points — con sprites serían cientos de draw calls. */
const clusterMaterial = new THREE.PointsMaterial({
  map: moteTexture(), color: 0xffe6a8, size: 3.2, sizeAttenuation: true,
  transparent: true, opacity: 0.9, depthWrite: false,
  blending: THREE.AdditiveBlending, fog: false,
});

/** Estrella de un sistema binario (§5.7): las dos hermanas casi idénticas. */
const binaryMaterial = new THREE.SpriteMaterial({
  map: moteTexture(), transparent: true, depthWrite: false,
  blending: THREE.AdditiveBlending, fog: false,
});

const brassMaterial = new THREE.MeshStandardMaterial({
  color: "#c9a227", roughness: 0.35, metalness: 0.85,
  emissive: new THREE.Color("#3a2c08"), emissiveIntensity: 0.8,
});

/** Cuerpo suelto que gira (el asteroide-catedral): son pocos y llevan hijos. */
interface Spinner {
  mesh: THREE.Mesh;
  ax: number; ay: number; az: number;
}

export class Scenery {
  private route: RouteSpec | null = null;
  private seed = 1;
  private chunks = new Map<number, SceneryChunk>();
  private spinners: Spinner[] = [];
  private elapsed = 0;
  private readonly frame: TrackFrame = newTrackFrame();
  /** Objeto de trabajo para recomponer matrices de instancia sin reservar memoria. */
  private readonly dummy = new THREE.Object3D();

  // --- Objetos de VIAJE: no pertenecen a ningún chunk porque siguen al cometa ---
  /** El gigante gaseoso de los Anillos de Hielo: está lejísimos y no se rehace por tramo. */
  private gasGiant: THREE.Mesh | null = null;
  /** Sistemas binarios vivos (§5.7): giran uno alrededor del otro. */
  private binaries: Array<{ pivot: THREE.Group; speed: number }> = [];
  /** Bandada de polvo en formación de V (fauna, §5.6). */
  private fauna: THREE.Points | null = null;
  private faunaBase: Float32Array | null = null;
  /** Guiño al Aerostato: el globo dorado, una vez por viaje, al partir. */
  private balloon: THREE.Sprite | null = null;
  /** Cometa hermano que se cruza (§5.6): SOLO en zona muerta. */
  private sibling: {
    group: THREE.Group; distance: number; side: number; active: boolean; remaining: number;
  } | null = null;
  private siblingsLeft = 0;
  /** Lo llama el renderer para que suene el rugido con doppler. */
  onSiblingPass: ((fromLeft: boolean, duration: number) => void) | null = null;
  /**
   * Regla de silencio (§2.11): con una pregunta viva NADA ambiental puede aparecer ni
   * sonar. F6 lo pondrá en false al arrancar cada pregunta.
   */
  ambientAllowed = true;

  constructor(private readonly scene: THREE.Scene, private readonly track: TrackManager) {}

  chunkCount(): number {
    return this.chunks.size;
  }

  /**
   * Apaga la escenografía durante la deriva (§5.5). El domo y la niebla ya se apagan en
   * `environment`, pero los cuerpos y el gas viven aquí y con materiales COMPARTIDOS,
   * así que se atenúan de una vez para todos: si no, el mundo quedaba medio gris y
   * medio en color, que es peor que no apagarlo.
   */
  setDim(amount: number): void {
    const k = 1 - 0.85 * Math.max(0, Math.min(1, amount));
    gasMaterial.opacity = 0.55 * k;
    moteMaterial.opacity = 0.8 * k;
    iceParticleMaterial.opacity = 0.75 * k;
    clusterMaterial.opacity = 0.9 * k;
    binaryMaterial.opacity = k;
    rockMaterial.color.setScalar(0.42 * k + 0.05);
    crystalMaterial.emissiveIntensity = 0.9 * k;
    brassMaterial.emissiveIntensity = 0.8 * k;
  }

  /** Rocas vivas ahora mismo (para el arnés de QA). */
  spinnerCount(): number {
    let total = this.spinners.length;
    for (const chunk of this.chunks.values()) total += chunk.rocks.length;
    return total;
  }

  reset(route: RouteSpec, seed: number): void {
    this.clear();
    this.route = route;
    this.seed = seed;
    this.elapsed = 0;
    for (let i = 0; i < SEGMENTS_AHEAD; i++) this.buildChunk(i);

    const rng = makeRng(seed + 31337);
    if (route.region === "HIELO") this.buildGasGiant(rng);
    this.buildFauna(rng);
    this.buildBalloon();
    this.buildSibling();
    this.siblingsLeft = SIBLING_COMET_MAX;
  }

  update(cometDistance: number, dt = 0): void {
    if (!this.route) return;
    this.elapsed += dt;

    const current = Math.floor(cometDistance / SEGMENT_LENGTH);
    for (let i = current - 1; i < current + SEGMENTS_AHEAD; i++) {
      if (i >= 0 && !this.chunks.has(i)) this.buildChunk(i);
    }
    for (const [index, chunk] of this.chunks) {
      if ((index + 1) * SEGMENT_LENGTH < cometDistance - DISPOSE_BEHIND) {
        this.disposeChunk(index, chunk);
      }
    }

    // Giro del cinturón. Las rocas viven en InstancedMesh (una por geometría), así que
    // girar significa recomponer su matriz: cuesta unas décimas de microsegundo por
    // roca y ahorra ~130 draw calls frente a una malla suelta por asteroide.
    for (const chunk of this.chunks.values()) {
      if (!chunk.rocks.length) continue;
      for (const rock of chunk.rocks) {
        rock.rot.x += rock.av.x * dt;
        rock.rot.y += rock.av.y * dt;
        rock.rot.z += rock.av.z * dt;
        this.dummy.position.copy(rock.pos);
        this.dummy.rotation.copy(rock.rot);
        this.dummy.scale.copy(rock.scale);
        this.dummy.updateMatrix();
        chunk.rockMeshes[rock.meshIndex].setMatrixAt(rock.slot, this.dummy.matrix);
      }
      for (const mesh of chunk.rockMeshes) mesh.instanceMatrix.needsUpdate = true;
    }

    // Cuerpos sueltos (el asteroide-catedral, que lleva cristales colgando).
    for (const s of this.spinners) {
      s.mesh.rotation.x += s.ax * dt;
      s.mesh.rotation.y += s.ay * dt;
      s.mesh.rotation.z += s.az * dt;
    }

    // Binarias: las dos hermanas girando una alrededor de la otra (§5.7).
    for (const b of this.binaries) b.pivot.rotation.y += b.speed * dt;

    this.updateJourneyObjects(cometDistance, dt);
  }

  /** Lo que sigue al cometa: gigante, fauna, globo y el hermano que se cruza. */
  private updateJourneyObjects(cometDistance: number, dt: number): void {
    this.track.frameAt(cometDistance, this.frame);
    const here = this.frame.pos;

    if (this.gasGiant) {
      // Siempre al mismo lado y a la misma distancia: es un planeta, no un decorado
      // que persigue al jugador — lo que se mueve alrededor de él es el cometa.
      this.gasGiant.position.set(
        here.x + this.gasGiant.userData.side * 620,
        here.y + 120,
        here.z - 420,
      );
      this.gasGiant.rotation.y += dt * 0.01;
    }

    if (this.fauna && this.faunaBase) {
      // La bandada vuela por delante y a un lado, ondulando: la V se mantiene pero
      // respira. El aleteo es un seno por individuo, en CPU (§5.6).
      const lead = this.frame.pos.clone()
        .addScaledVector(this.frame.tan, -38)
        .addScaledVector(this.frame.right, 16)
        .addScaledVector(this.frame.up, 9);
      const attr = this.fauna.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < attr.count; i++) {
        const flap = Math.sin(this.elapsed * FAUNA_FLAP_HZ + i * 0.7) * 0.5;
        attr.setXYZ(
          i,
          lead.x + this.faunaBase[i * 3],
          lead.y + this.faunaBase[i * 3 + 1] + flap,
          lead.z + this.faunaBase[i * 3 + 2],
        );
      }
      attr.needsUpdate = true;
    }

    if (this.balloon) {
      // El globo del Aerostato solo asoma al principio del viaje (acto 1) y se apaga.
      const visible = cometDistance < SEGMENT_LENGTH * 2;
      this.balloon.visible = visible;
      if (visible) {
        this.balloon.position.set(
          here.x - 120, here.y + AEROSTATO_BALLOON_ALTITUDE, here.z - 260,
        );
      }
    }

    this.updateSibling(cometDistance, dt);
  }

  // --- construcción por chunk ----------------------------------------------

  private buildChunk(index: number): void {
    if (!this.route) return;
    const group = new THREE.Group();
    const owned: THREE.BufferGeometry[] = [];
    const rockMeshes: THREE.InstancedMesh[] = [];
    const rocks: RockInstance[] = [];
    const start = index * SEGMENT_LENGTH;
    const end = start + SEGMENT_LENGTH;
    // Seed por chunk Y por ruta: el mismo tramo de la misma tonalidad sale igual siempre.
    const rng = makeRng(this.seed + index * 7717 + 13);

    if (this.route.region === "LUMBRE") this.buildLumbre(group, owned, start, end, rng);
    else if (this.route.region === "ROCAS") this.buildRocas(group, rockMeshes, rocks, start, end, rng);
    else if (this.route.region === "HIELO") this.buildHielo(group, owned, start, end, rng);
    else if (this.route.region === "FAROLES") this.buildFaroles(group, owned, start, end, rng);
    else if (this.route.region === "VACIO") this.buildVacio(group, owned, start, end, rng);

    this.scene.add(group);
    this.chunks.set(index, { group, owned, rockMeshes, rocks });
  }

  /**
   * Nebulosa Lumbre: telones de gas incendiado y pilares de creación. Todo es sprite
   * aditivo — el gas no tiene superficie, así que darle geometría sólida lo mataría.
   */
  private buildLumbre(
    group: THREE.Group, owned: THREE.BufferGeometry[],
    start: number, end: number, rng: () => number,
  ): void {
    // Pilares: columnas de gas hechas de sprites apilados con radio decreciente.
    const pillars = 2 + Math.floor(rng() * 2);
    for (let p = 0; p < pillars; p++) {
      const d = start + rng() * (end - start);
      const side = rng() < 0.5 ? -1 : 1;
      const lateral = 55 + rng() * 90;
      const height = 40 + rng() * 70;
      this.track.frameAt(d, this.frame);
      const base = this.frame.pos.clone()
        .addScaledVector(this.frame.right, side * lateral)
        .addScaledVector(this.frame.up, -18);
      const puffs = 7 + Math.floor(rng() * 6);
      for (let i = 0; i < puffs; i++) {
        const t = i / (puffs - 1);
        const sprite = new THREE.Sprite(gasMaterial);
        const size = THREE.MathUtils.lerp(46, 14, t) * (0.7 + rng() * 0.6);
        sprite.scale.set(size, size, 1);
        sprite.position.copy(base);
        sprite.position.y += t * height;
        sprite.position.x += (rng() - 0.5) * 16;
        sprite.position.z += (rng() - 0.5) * 16;
        group.add(sprite);
      }
    }

    // Huevos de estrella: glows nacientes dentro del gas, pequeños y muy brillantes.
    const eggs = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < eggs; i++) {
      const d = start + rng() * (end - start);
      this.track.frameAt(d, this.frame);
      const sprite = new THREE.Sprite(gasMaterial);
      const size = 5 + rng() * 9;
      sprite.scale.set(size, size, 1);
      sprite.position.copy(this.frame.pos)
        .addScaledVector(this.frame.right, (rng() - 0.5) * 190)
        .addScaledVector(this.frame.up, 8 + rng() * 55);
      group.add(sprite);
    }

    // Bandada de polvo luminoso: motas que cruzan el tramo (fauna de la región, §5.6).
    const motes = 40;
    const positions = new Float32Array(motes * 3);
    for (let i = 0; i < motes; i++) {
      const d = start + rng() * (end - start);
      this.track.frameAt(d, this.frame);
      const p = this.frame.pos.clone()
        .addScaledVector(this.frame.right, (rng() - 0.5) * 120)
        .addScaledVector(this.frame.up, (rng() - 0.5) * 60);
      positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    owned.push(geo);
    group.add(new THREE.Points(geo, moteMaterial));
  }

  /**
   * Cinturón de Rocas: asteroides low-poly girando.
   *
   * Van en InstancedMesh —una por geometría— y no en mallas sueltas. Con una malla por
   * asteroide el cinturón costaba ~150 draw calls él solo, y el presupuesto entero son
   * 200 (§5.6); instanciadas son 5 por chunk. El precio es recomponer la matriz de cada
   * roca en el update para que sigan girando, que se midió en decimas de microsegundo.
   */
  private buildRocas(
    group: THREE.Group, rockMeshes: THREE.InstancedMesh[], rocks: RockInstance[],
    start: number, end: number, rng: () => number,
  ): void {
    const total = 26 + Math.floor(rng() * 12);

    // Primero se reparten las rocas entre geometrías para saber cuántas instancias
    // necesita cada InstancedMesh (su tamaño es fijo al crearla).
    const assignment: number[] = [];
    for (let i = 0; i < total; i++) assignment.push(Math.floor(rng() * ROCK_GEOMETRIES.length));
    const counts = ROCK_GEOMETRIES.map((_, gi) => assignment.filter((a) => a === gi).length);
    const slots = ROCK_GEOMETRIES.map(() => 0);

    for (let gi = 0; gi < ROCK_GEOMETRIES.length; gi++) {
      const mesh = new THREE.InstancedMesh(ROCK_GEOMETRIES[gi], rockMaterial, Math.max(1, counts[gi]));
      mesh.count = counts[gi]; // 0 instancias = no se dibuja, pero el objeto existe
      mesh.frustumCulled = false; // las rocas rodean al cometa; el culling por caja falla
      rockMeshes.push(mesh);
      group.add(mesh);
    }

    for (let i = 0; i < total; i++) {
      const d = start + rng() * (end - start);
      this.track.frameAt(d, this.frame);
      // Corredor despejado: nada dentro de 14 u del eje, o la ruta se vuelve un túnel.
      const lateral = (14 + rng() * 85) * (rng() < 0.5 ? -1 : 1);
      const pos = this.frame.pos.clone()
        .addScaledVector(this.frame.right, lateral)
        .addScaledVector(this.frame.up, (rng() - 0.5) * 70);
      const base = 0.8 + rng() * 4.5;
      const meshIndex = assignment[i];
      rocks.push({
        meshIndex,
        slot: slots[meshIndex]++,
        pos,
        scale: new THREE.Vector3(base * (0.7 + rng() * 0.6), base, base * (0.7 + rng() * 0.6)),
        rot: new THREE.Euler(rng() * 6.28, rng() * 6.28, rng() * 6.28),
        av: new THREE.Vector3((rng() - 0.5) * 0.5, (rng() - 0.5) * 0.5, (rng() - 0.5) * 0.5),
      });
    }

    // Pose inicial: sin esto el primer frame las pinta todas apiladas en el origen.
    for (const rock of rocks) {
      this.dummy.position.copy(rock.pos);
      this.dummy.rotation.copy(rock.rot);
      this.dummy.scale.copy(rock.scale);
      this.dummy.updateMatrix();
      rockMeshes[rock.meshIndex].setMatrixAt(rock.slot, this.dummy.matrix);
    }
    for (const mesh of rockMeshes) mesh.instanceMatrix.needsUpdate = true;

    // Asteroide-catedral: uno grande con vetas de cristal, una vez de cada tres chunks.
    if (rng() < 0.34) {
      const d = start + rng() * (end - start);
      this.track.frameAt(d, this.frame);
      const host = new THREE.Mesh(ROCK_GEOMETRIES[0], rockMaterial);
      const side = rng() < 0.5 ? -1 : 1;
      host.position.copy(this.frame.pos)
        .addScaledVector(this.frame.right, side * (52 + rng() * 40))
        .addScaledVector(this.frame.up, (rng() - 0.5) * 30);
      host.scale.setScalar(11 + rng() * 6);
      host.rotation.set(rng() * 6.28, rng() * 6.28, rng() * 6.28);
      group.add(host);
      for (let c = 0; c < 5; c++) {
        const shard = new THREE.Mesh(CRYSTAL_GEOMETRY, crystalMaterial);
        const a = rng() * Math.PI * 2;
        shard.position.copy(host.position);
        shard.position.x += Math.cos(a) * host.scale.x * 0.75;
        shard.position.z += Math.sin(a) * host.scale.x * 0.75;
        shard.position.y += (rng() - 0.5) * host.scale.x;
        shard.scale.setScalar(1.6 + rng() * 2.6);
        shard.rotation.set(rng() * 6.28, rng() * 6.28, rng() * 6.28);
        group.add(shard);
      }
      this.spinners.push({ mesh: host, ax: 0.03, ay: 0.05, az: 0.02 });
    }
  }

  /**
   * Anillos de Hielo: se viaja DENTRO del plano de anillos de un gigante gaseoso. Las
   * bandas de hielo son Points (un draw call por chunk) y el gigante es un objeto de
   * viaje, no de chunk: está lejísimos y no tiene sentido rehacerlo cada tramo.
   */
  private buildHielo(
    group: THREE.Group, owned: THREE.BufferGeometry[],
    start: number, end: number, rng: () => number,
  ): void {
    // Bandas del anillo: partículas repartidas en un plano ancho y MUY plano.
    const count = 520;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const d = start + rng() * (end - start);
      this.track.frameAt(d, this.frame);
      // Huecos de Cassini: el radio se sortea por bandas, no uniforme.
      const band = Math.floor(rng() * 4);
      const lateral = (18 + band * 34 + rng() * 22) * (rng() < 0.5 ? -1 : 1);
      const p = this.frame.pos.clone()
        .addScaledVector(this.frame.right, lateral)
        .addScaledVector(this.frame.up, (rng() - 0.5) * 7);
      positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    owned.push(geo);
    group.add(new THREE.Points(geo, iceParticleMaterial));

    // Lunas pastoras: los cuerpos que pastorean los huecos del anillo.
    if (rng() < 0.5) {
      const d = start + rng() * (end - start);
      this.track.frameAt(d, this.frame);
      const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), moonMaterial);
      const moonGeo = moon.geometry;
      owned.push(moonGeo);
      moon.position.copy(this.frame.pos)
        .addScaledVector(this.frame.right, (rng() < 0.5 ? -1 : 1) * (60 + rng() * 45))
        .addScaledVector(this.frame.up, (rng() - 0.5) * 12);
      moon.scale.setScalar(3.5 + rng() * 4);
      group.add(moon);
      this.spinners.push({ mesh: moon, ax: 0.04, ay: 0.07, az: 0 });
    }

    // Géiseres de hielo: chorros verticales que salen del plano del anillo.
    if (rng() < 0.6) {
      const d = start + rng() * (end - start);
      this.track.frameAt(d, this.frame);
      const jet = 26;
      const jetPos = new Float32Array(jet * 3);
      const base = this.frame.pos.clone()
        .addScaledVector(this.frame.right, (rng() < 0.5 ? -1 : 1) * (25 + rng() * 40));
      for (let i = 0; i < jet; i++) {
        const t = i / jet;
        jetPos[i * 3] = base.x + (rng() - 0.5) * t * 9;
        jetPos[i * 3 + 1] = base.y + t * 30;
        jetPos[i * 3 + 2] = base.z + (rng() - 0.5) * t * 9;
      }
      const jetGeo = new THREE.BufferGeometry();
      jetGeo.setAttribute("position", new THREE.BufferAttribute(jetPos, 3));
      owned.push(jetGeo);
      group.add(new THREE.Points(jetGeo, iceParticleMaterial));
    }
  }

  /**
   * Cúmulo de Faroles: cientos de soles cercanos. Van en UN Points por chunk — con un
   * sprite por sol serían cientos de draw calls y se comerían el presupuesto entero.
   *
   * Aquí viven además las ESTRELLAS BINARIAS (§5.7): dos soles casi idénticos girando
   * uno alrededor del otro. Son la metáfora del par mutable del modo menor —VI/VImel y
   * VIIST/VIIsen— puesta en el paisaje, sin una sola palabra.
   */
  private buildFaroles(
    group: THREE.Group, owned: THREE.BufferGeometry[],
    start: number, end: number, rng: () => number,
  ): void {
    const count = 260;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const d = start + rng() * (end - start);
      this.track.frameAt(d, this.frame);
      const p = this.frame.pos.clone()
        .addScaledVector(this.frame.right, (rng() - 0.5) * 300)
        .addScaledVector(this.frame.up, (rng() - 0.5) * 200);
      positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    owned.push(geo);
    group.add(new THREE.Points(geo, clusterMaterial));

    // Un sistema binario cada dos chunks, cerca de la ruta para que se vea orbitar.
    if (rng() < 0.5) {
      const d = start + rng() * (end - start);
      this.track.frameAt(d, this.frame);
      const centre = this.frame.pos.clone()
        .addScaledVector(this.frame.right, (rng() < 0.5 ? -1 : 1) * (38 + rng() * 30))
        .addScaledVector(this.frame.up, 6 + rng() * 22);
      const pivot = new THREE.Group();
      pivot.position.copy(centre);
      const separation = 5 + rng() * 3;
      // Casi idénticas, pero no iguales: es exactamente el problema del oído.
      const a = new THREE.Sprite(binaryMaterial.clone());
      a.material.color.set("#fff0c8");
      a.scale.setScalar(7);
      a.position.x = -separation;
      const b = new THREE.Sprite(binaryMaterial.clone());
      b.material.color.set("#ffd9a0");
      b.scale.setScalar(6);
      b.position.x = separation;
      pivot.add(a, b);
      group.add(pivot);
      this.binaries.push({ pivot, speed: 0.35 + rng() * 0.3 });
    }

    // Estación-faro de latón: barre un haz sobre el cúmulo.
    if (rng() < 0.3) {
      const d = start + rng() * (end - start);
      this.track.frameAt(d, this.frame);
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.1, 7, 7), brassMaterial);
      owned.push(tower.geometry);
      tower.position.copy(this.frame.pos)
        .addScaledVector(this.frame.right, (rng() < 0.5 ? -1 : 1) * (30 + rng() * 20))
        .addScaledVector(this.frame.up, -6 - rng() * 10);
      group.add(tower);
      const lamp = new THREE.Sprite(binaryMaterial.clone());
      lamp.material.color.set("#fff3d0");
      lamp.scale.setScalar(5);
      lamp.position.copy(tower.position);
      lamp.position.y += 4.6;
      group.add(lamp);
      this.spinners.push({ mesh: tower, ax: 0, ay: 0.9, az: 0 });
    }
  }

  /**
   * El Vacío: casi nada, y por eso TODO se ve. La galaxia de canto la pinta el cielo
   * (environment), así que aquí solo hay polvo lejanísimo y algún cuerpo perdido — la
   * región es la recompensa de las tonalidades más difíciles, y su lujo es el silencio.
   */
  private buildVacio(
    group: THREE.Group, owned: THREE.BufferGeometry[],
    start: number, end: number, rng: () => number,
  ): void {
    const count = 60;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const d = start + rng() * (end - start);
      this.track.frameAt(d, this.frame);
      const p = this.frame.pos.clone()
        .addScaledVector(this.frame.right, (rng() - 0.5) * 420)
        .addScaledVector(this.frame.up, (rng() - 0.5) * 260);
      positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    owned.push(geo);
    group.add(new THREE.Points(geo, iceParticleMaterial));

    // Un cuerpo solitario muy de vez en cuando: sin él la región se lee a bug.
    if (rng() < 0.25) {
      const d = start + rng() * (end - start);
      this.track.frameAt(d, this.frame);
      const rock = new THREE.Mesh(ROCK_GEOMETRIES[1], rockMaterial);
      rock.position.copy(this.frame.pos)
        .addScaledVector(this.frame.right, (rng() < 0.5 ? -1 : 1) * (90 + rng() * 60))
        .addScaledVector(this.frame.up, (rng() - 0.5) * 60);
      rock.scale.setScalar(4 + rng() * 5);
      group.add(rock);
      this.spinners.push({ mesh: rock, ax: 0.02, ay: 0.03, az: 0.01 });
    }
  }

  // --- objetos de viaje ------------------------------------------------------

  /** El gigante gaseoso: enorme, lejísimos y siempre al mismo lado de la ruta. */
  private buildGasGiant(rng: () => number): void {
    const giant = new THREE.Mesh(
      new THREE.SphereGeometry(1, 36, 24),
      new THREE.MeshStandardMaterial({
        map: gasGiantTexture(), roughness: 1, metalness: 0,
        emissive: new THREE.Color("#0d2634"), emissiveIntensity: 0.55, fog: false,
      }),
    );
    giant.scale.setScalar(190);
    giant.userData.side = rng() < 0.5 ? -1 : 1;
    this.gasGiant = giant;
    this.scene.add(giant);
  }

  /**
   * Bandada de polvo en formación de V. Es UN Points cuyas partículas se recolocan cada
   * frame respecto al cometa: la V avanza y ondula con un seno por individuo (patrón de
   * las golondrinas de Aerostato), sin cuerpos ni física.
   */
  private buildFauna(rng: () => number): void {
    const n = FAUNA_COUNT * 2;
    const base = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      // Dos brazos de la V: el índice par va a un lado, el impar al otro.
      const arm = i % 2 === 0 ? -1 : 1;
      const rank = Math.floor(i / 2);
      base[i * 3] = arm * rank * 1.6 + (rng() - 0.5) * 0.6;
      base[i * 3 + 1] = (rng() - 0.5) * 0.8;
      base[i * 3 + 2] = rank * 2.1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.faunaBase = base;
    this.fauna = new THREE.Points(geo, moteMaterial);
    this.fauna.frustumCulled = false;
    this.scene.add(this.fauna);
  }

  /** Guiño al Aerostato (§5.6): el globo dorado, muy alto y muy lejos, al partir. */
  private buildBalloon(): void {
    const balloon = new THREE.Sprite(binaryMaterial.clone());
    balloon.material.color.set("#e8c65a");
    balloon.scale.setScalar(6);
    this.balloon = balloon;
    this.scene.add(balloon);
  }

  /** Cometa hermano: núcleo + cola, viaja en sentido contrario por una vía paralela. */
  private buildSibling(): void {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.1, 0),
      new THREE.MeshStandardMaterial({
        color: "#9fd8e8", roughness: 0.4, flatShading: true,
        emissive: new THREE.Color("#2a6070"), emissiveIntensity: 0.8,
      }),
    );
    group.add(core);
    // La cola: motas hacia atrás, siempre alejándose de la estrella natal.
    const tail = 46;
    const positions = new Float32Array(tail * 3);
    for (let i = 0; i < tail; i++) {
      const t = i / tail;
      positions[i * 3] = (Math.random() - 0.5) * t * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * t * 8;
      positions[i * 3 + 2] = t * 42;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    group.add(new THREE.Points(geo, iceParticleMaterial));
    group.visible = false;
    this.sibling = { group, distance: 0, side: 1, active: false, remaining: 0 };
    this.scene.add(group);
  }

  /**
   * El cometa hermano (§5.6). Solo se agenda en ZONA MUERTA y con la venia del juego:
   * la regla de silencio (§2.11) prohíbe que suene nada mientras hay pregunta viva, y
   * su rugido —ruido sin altura— tiene doppler, así que no puede pillar al alumno
   * escuchando la nota.
   */
  private updateSibling(cometDistance: number, dt: number): void {
    const s = this.sibling;
    if (!s) return;

    if (s.active) {
      // Viaja en sentido CONTRARIO: se acerca de frente y se pierde por detrás.
      s.distance -= SIBLING_COMET_SPEED * dt;
      s.remaining -= dt;
      this.track.frameAt(Math.max(0, s.distance), this.frame);
      s.group.position.copy(this.frame.pos)
        .addScaledVector(this.frame.right, s.side * SIBLING_TRACK_OFFSET)
        .addScaledVector(this.frame.up, 4);
      // La cola siempre apunta hacia atrás respecto a su marcha.
      s.group.lookAt(s.group.position.clone().addScaledVector(this.frame.tan, 10));
      if (s.remaining <= 0 || s.distance < cometDistance - 90) {
        s.active = false;
        s.group.visible = false;
      }
      return;
    }

    if (this.siblingsLeft <= 0 || !this.canSpawnAmbient(cometDistance)) return;
    // ~0.25 apariciones por segundo de zona muerta: así no sale siempre en el mismo
    // sitio y el encuentro se siente casual. Escalado por dt para no depender del fps.
    if (Math.random() > SIBLING_SPAWN_PER_SECOND * dt) return;

    s.active = true;
    s.side = Math.random() < 0.5 ? -1 : 1;
    s.distance = cometDistance + 210;
    s.remaining = 9;
    s.group.visible = true;
    this.siblingsLeft -= 1;
    this.onSiblingPass?.(s.side < 0, SIBLING_ROAR_DURATION_S);
  }

  /**
   * ¿Se puede lanzar un evento ambiental aquí? Solo en la zona muerta del segmento —el
   * respiro entre decisiones— y solo si el juego no ha puesto una pregunta viva. F6
   * enchufa `ambientAllowed` al estado real; hasta entonces basta la geometría.
   */
  private canSpawnAmbient(cometDistance: number): boolean {
    if (!this.ambientAllowed) return false;
    return (cometDistance % SEGMENT_LENGTH) < DEAD_ZONE_LENGTH;
  }

  // --- liberación -----------------------------------------------------------

  private disposeChunk(index: number, chunk: SceneryChunk): void {
    this.scene.remove(chunk.group);
    // Las rocas de este chunk dejan de girar: si no, la lista crece sin fin y con ella
    // el coste por frame, aunque los objetos ya no estén en escena.
    const dead = new Set<THREE.Object3D>();
    chunk.group.traverse((o) => dead.add(o));
    this.spinners = this.spinners.filter((s) => !dead.has(s.mesh));
    // Las InstancedMesh sí son del chunk (su buffer de matrices lo es), aunque su
    // geometría y su material sean compartidos: dispose() libera solo lo propio.
    for (const mesh of chunk.rockMeshes) mesh.dispose();
    // Solo se liberan las geometrías propias del chunk: las compartidas viven siempre.
    for (const geometry of chunk.owned) geometry.dispose();
    this.chunks.delete(index);
  }

  private clear(): void {
    for (const [index, chunk] of this.chunks) this.disposeChunk(index, chunk);
    this.chunks.clear();
    this.spinners = [];
    this.binaries = [];

    // Objetos de viaje: se liberan aquí porque no pertenecen a ningún chunk.
    for (const object of [this.gasGiant, this.fauna]) {
      if (!object) continue;
      this.scene.remove(object);
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
    this.gasGiant = null;
    this.fauna = null;
    this.faunaBase = null;

    if (this.balloon) {
      this.scene.remove(this.balloon);
      this.balloon.material.dispose();
      this.balloon = null;
    }

    if (this.sibling) {
      this.scene.remove(this.sibling.group);
      this.sibling.group.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
          o.geometry.dispose();
          if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose();
        }
      });
      this.sibling = null;
    }
    this.siblingsLeft = 0;
  }

  dispose(): void {
    this.clear();
  }
}
