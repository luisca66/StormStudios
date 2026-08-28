// scenery.ts — streaming de terreno y decorado. F3 dejó Valle Dorado y Sierra de Niebla;
// F4 añade Desierto de Agaves, Costa de Salinas y Páramo de Estrellas, más el decorado
// transversal (postes de telégrafo, mojones, fauna) y los guiños a Aerostato/Batisfera.
// Todo lo repetido usa InstancedMesh o Points; las texturas son siempre de canvas.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  AEROSTATO_BALLOON_ALTITUDE, BATISFERA_SHIP_DISTANCE, DISPOSE_BEHIND, FAUNA_AHEAD,
  FAUNA_COUNT, FAUNA_FLAP_HZ, MILESTONE_SPACING, SEGMENT_LENGTH, SEGMENTS_AHEAD,
  TELEGRAPH_SIDE_OFFSET, TELEGRAPH_SPACING, type BiomeId, type RouteSpec,
} from "@/config";
import { makeRng, newTrackFrame, type TrackFrame, type TrackManager } from "./track";

const UP = new THREE.Vector3(0, 1, 0);
const CORRIDOR_HALF_WIDTH = 82;
// En la Costa la cinta de terreno se acorta del lado del agua: sin eso el corredor de
// 82 u tapaba el mar y la ruta se leía como una llanura con una tira azul al fondo.
const COSTA_SHORE_HALF_WIDTH = 30;
const SEA_WIDTH = 900;
const SEA_CENTER_OFFSET = COSTA_SHORE_HALF_WIDTH + 4 + SEA_WIDTH / 2;
const TERRAIN_STEP = 14;
const TUNNEL_START = SEGMENT_LENGTH * 1.45;
const TUNNEL_LENGTH = 38;

interface SceneryChunk {
  index: number;
  group: THREE.Group;
  ownedGeometries: THREE.BufferGeometry[];
}

const valleyTerrain = new THREE.MeshStandardMaterial({ color: "#879258", roughness: 1 });
const sierraTerrain = new THREE.MeshStandardMaterial({ color: "#46564d", roughness: 1 });
const fallbackTerrain = new THREE.MeshStandardMaterial({ color: "#6d765b", roughness: 1 });
const trunkMaterial = new THREE.MeshStandardMaterial({ color: "#4d3623", roughness: 1 });
const valleyLeafMaterial = new THREE.MeshStandardMaterial({ color: "#6f843f", roughness: 0.95 });
const pineMaterial = new THREE.MeshStandardMaterial({ color: "#24493a", roughness: 0.98 });
const cornMaterial = new THREE.MeshStandardMaterial({ color: "#b5a744", roughness: 1 });
const rockMaterial = new THREE.MeshStandardMaterial({ color: "#56605c", roughness: 1 });
const waterMaterial = new THREE.MeshStandardMaterial({
  color: "#5f9daa", roughness: 0.18, metalness: 0.18, transparent: true, opacity: 0.82,
});
const stoneMaterial = new THREE.MeshStandardMaterial({ color: "#454842", roughness: 1 });
const tunnelMaterial = new THREE.MeshStandardMaterial({ color: "#171b19", roughness: 1, side: THREE.BackSide });

// --- Materiales F4 -----------------------------------------------------------------
const desertTerrain = new THREE.MeshStandardMaterial({ color: "#a9713f", roughness: 1 });
const costaTerrain = new THREE.MeshStandardMaterial({ color: "#9d9e78", roughness: 1 });
const paramoTerrain = new THREE.MeshStandardMaterial({ color: "#bcc4d4", roughness: 0.95 });

const TERRAIN_MATERIALS: Record<BiomeId, THREE.MeshStandardMaterial> = {
  VALLE: valleyTerrain,
  SIERRA: sierraTerrain,
  DESIERTO: desertTerrain,
  COSTA: costaTerrain,
  PARAMO: paramoTerrain,
};

const mesaMaterial = new THREE.MeshStandardMaterial({ color: "#8f4a32", roughness: 1 });
const agaveMaterial = new THREE.MeshStandardMaterial({ color: "#6e8d5c", roughness: 0.9 });
const cactusMaterial = new THREE.MeshStandardMaterial({ color: "#48713f", roughness: 0.95 });
const boneMaterial = new THREE.MeshStandardMaterial({ color: "#cabfa6", roughness: 0.95 });

const palmTrunkMaterial = new THREE.MeshStandardMaterial({ color: "#7c6446", roughness: 1 });
const palmLeafMaterial = new THREE.MeshStandardMaterial({
  color: "#4c8f4c", roughness: 0.9, side: THREE.DoubleSide,
});
// Sin environment map en la escena, un metalness alto se renderiza casi negro: las
// salinas y la batisfera van con metalness bajo y color claro, como el agua de F3.
const saltMaterial = new THREE.MeshStandardMaterial({
  color: "#eaf2ec", roughness: 0.22, metalness: 0.16,
});
const lighthouseMaterial = new THREE.MeshStandardMaterial({ color: "#eae5da", roughness: 0.75 });
const lanternMaterial = new THREE.MeshStandardMaterial({
  color: "#ffe6a8", emissive: "#ffbf4d", emissiveIntensity: 1.6, roughness: 0.4,
});
const hullMaterial = new THREE.MeshStandardMaterial({ color: "#3b4550", roughness: 0.8 });
const batisferaMaterial = new THREE.MeshStandardMaterial({
  color: "#b3c0c6", roughness: 0.4, metalness: 0.25,
});

const snowRockMaterial = new THREE.MeshStandardMaterial({ color: "#6c7285", roughness: 1 });
const hareMaterial = new THREE.MeshStandardMaterial({ color: "#ddd6c4", roughness: 0.95 });

const balloonMaterial = new THREE.MeshStandardMaterial({
  color: "#d8b24a", roughness: 0.55, metalness: 0.25,
});

const poleMaterial = new THREE.MeshStandardMaterial({ color: "#6a5540", roughness: 1 });
const wireMaterial = new THREE.LineBasicMaterial({ color: "#3a3a38", transparent: true, opacity: 0.55 });
const milestoneMaterial = new THREE.MeshStandardMaterial({ color: "#d6d2c4", roughness: 0.95 });

const trunkGeo = new THREE.CylinderGeometry(0.18, 0.26, 1.8, 6);
const crownGeo = new THREE.IcosahedronGeometry(1.15, 0);
const pineGeo = new THREE.ConeGeometry(1.15, 3.7, 7);
const cornGeo = new THREE.ConeGeometry(0.09, 1.15, 4);
const rockGeo = new THREE.DodecahedronGeometry(0.8, 0);

// --- Geometrías F4 (compartidas entre chunks: NUNCA se liberan) ---------------------

/** Agave: roseta de hojas puntiagudas, fusionada para que cueste una sola instancia. */
function agaveGeometry(): THREE.BufferGeometry {
  const blades: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const blade = new THREE.ConeGeometry(0.13, 1.5, 4);
    blade.translate(0, 0.75, 0);
    blade.rotateZ(0.62);
    blade.rotateY((i / 7) * Math.PI * 2);
    blades.push(blade);
  }
  return mergeGeometries(blades, false) ?? blades[0];
}

/** Cactus columnar con dos brazos. */
function cactusGeometry(): THREE.BufferGeometry {
  const parts = [new THREE.CylinderGeometry(0.32, 0.38, 3.4, 8).translate(0, 1.7, 0)];
  for (const side of [-1, 1]) {
    const arm = new THREE.CylinderGeometry(0.2, 0.2, 1.3, 6);
    arm.rotateZ(Math.PI / 2);
    arm.translate(side * 0.55, 1.9 + side * 0.28, 0);
    parts.push(arm);
    const tip = new THREE.CylinderGeometry(0.2, 0.2, 1.0, 6);
    tip.translate(side * 1.15, 2.4 + side * 0.28, 0);
    parts.push(tip);
  }
  return mergeGeometries(parts, false) ?? parts[0];
}

/** Palmera: tronco ligeramente inclinado + corona de hojas planas. */
function palmTrunkGeometry(): THREE.BufferGeometry {
  const segments: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const ring = new THREE.CylinderGeometry(0.16 - t * 0.05, 0.2 - t * 0.05, 0.95, 6);
    ring.translate(Math.sin(t * 1.1) * 0.42, 0.48 + i * 0.9, 0);
    segments.push(ring);
  }
  return mergeGeometries(segments, false) ?? segments[0];
}

function palmCrownGeometry(): THREE.BufferGeometry {
  const fronds: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const frond = new THREE.PlaneGeometry(2.5, 0.5);
    frond.translate(1.25, 0, 0);
    frond.rotateZ(-0.42);
    frond.rotateY((i / 7) * Math.PI * 2);
    fronds.push(frond);
  }
  return mergeGeometries(fronds, false) ?? fronds[0];
}

/** Ave vista de lejos: una "V" de dos alas. El aleteo es escala en Y (patrón Aerostato). */
function birdGeometry(): THREE.BufferGeometry {
  const wings: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.BoxGeometry(1.05, 0.06, 0.26);
    wing.translate(side * 0.52, 0, 0);
    wing.rotateZ(side * 0.36);
    wings.push(wing);
  }
  wings.push(new THREE.BoxGeometry(0.2, 0.12, 0.62));
  return mergeGeometries(wings, false) ?? wings[0];
}

/** Liebre del páramo: cuerpo, cabeza y orejas. El salto es desplazamiento en Y. */
function hareGeometry(): THREE.BufferGeometry {
  const parts = [
    new THREE.SphereGeometry(0.3, 8, 6).scale(1.5, 0.85, 1) as THREE.BufferGeometry,
    new THREE.SphereGeometry(0.17, 8, 6).translate(0, 0.2, -0.36),
  ];
  for (const side of [-1, 1]) {
    const ear = new THREE.BoxGeometry(0.07, 0.34, 0.04);
    ear.translate(side * 0.08, 0.45, -0.36);
    parts.push(ear);
  }
  return mergeGeometries(parts, false) ?? parts[0];
}

const agaveGeo = agaveGeometry();
const cactusGeo = cactusGeometry();
const mesaGeo = new THREE.CylinderGeometry(9, 11.5, 9, 7);
const palmTrunkGeo = palmTrunkGeometry();
const palmCrownGeo = palmCrownGeometry();
const saltPanGeo = new THREE.BoxGeometry(9, 0.08, 7);
const snowRockGeo = new THREE.DodecahedronGeometry(0.9, 0);
const birdGeo = birdGeometry();
const hareGeo = hareGeometry();
const poleGeo = (() => {
  const post = new THREE.CylinderGeometry(0.11, 0.15, 6.2, 6).translate(0, 3.1, 0);
  const arm = new THREE.BoxGeometry(1.5, 0.11, 0.11).translate(0, 5.6, 0);
  const arm2 = new THREE.BoxGeometry(1.1, 0.09, 0.09).translate(0, 5.05, 0);
  return mergeGeometries([post, arm, arm2], false) ?? post;
})();
const milestoneGeo = new THREE.BoxGeometry(0.34, 0.8, 0.16);

/** Fauna por bioma (PLAN §5.4/§5.6): aves en casi todos, liebres en el Páramo. */
interface FaunaSpec {
  kind: "BIRD" | "GROUND";
  material: THREE.Material;
  size: number;
  altitude: number;
}
const FAUNA_BY_BIOME: Record<BiomeId, FaunaSpec> = {
  VALLE: { kind: "BIRD", material: new THREE.MeshStandardMaterial({ color: "#eee9dc", roughness: 0.9 }), size: 1.1, altitude: 17 },
  DESIERTO: { kind: "BIRD", material: new THREE.MeshStandardMaterial({ color: "#7c5c39", roughness: 0.9 }), size: 1.3, altitude: 27 },
  SIERRA: { kind: "BIRD", material: new THREE.MeshStandardMaterial({ color: "#3b4145", roughness: 0.9 }), size: 0.95, altitude: 22 },
  COSTA: { kind: "BIRD", material: new THREE.MeshStandardMaterial({ color: "#f4f4ef", roughness: 0.9 }), size: 1.0, altitude: 13 },
  PARAMO: { kind: "GROUND", material: hareMaterial, size: 1.0, altitude: 0 },
};

function dustTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const g = canvas.getContext("2d")!;
  const gradient = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, "rgba(224,186,140,.62)");
  gradient.addColorStop(0.55, "rgba(206,166,120,.24)");
  gradient.addColorStop(1, "rgba(196,158,116,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

const dustMaterial = new THREE.PointsMaterial({
  map: dustTexture(), color: "#d8b184", size: 26, transparent: true,
  opacity: 0.5, depthWrite: false, sizeAttenuation: true,
});

function snowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const g = canvas.getContext("2d")!;
  const gradient = g.createRadialGradient(32, 32, 1, 32, 32, 30);
  gradient.addColorStop(0, "rgba(255,255,255,.95)");
  gradient.addColorStop(1, "rgba(235,242,255,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

const snowMaterial = new THREE.PointsMaterial({
  map: snowTexture(), color: "#ffffff", size: 0.5, transparent: true,
  opacity: 0.85, depthWrite: false, sizeAttenuation: true,
});

/** Mar de la Costa: dos octavas de ruido barato (senos cruzados), patrón Aerostato. */
function seaMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    // fog:false a propósito — el shader calcula su propia niebla exponencial con
    // uFogColor/uFogDensity (los mismos valores que la paleta COSTA de environment.ts).
    // Con fog:true three exige los uniforms fogColor/fogDensity de UniformsLib y revienta
    // en refreshFogUniforms al no encontrarlos.
    transparent: true, fog: false,
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color("#1f5f77") },
      uShallow: { value: new THREE.Color("#5fb2b8") },
      uFogColor: { value: new THREE.Color("#d6eeee") },
      uFogDensity: { value: 0.0025 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying float vDepth;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      varying vec2 vUv;
      varying float vDepth;
      void main() {
        vec2 p = vUv * vec2(90.0, 130.0);
        // Octava 1: oleaje largo. Octava 2: rizado corto y más rápido.
        float wave = sin(p.y * 0.6 + uTime * 0.9) * 0.5
                   + sin(p.x * 0.35 + p.y * 0.22 - uTime * 0.6) * 0.3;
        wave += sin(p.x * 1.7 + uTime * 2.1) * 0.12
              + sin(p.y * 2.3 - uTime * 1.7) * 0.08;
        float crest = smoothstep(0.35, 0.72, wave);
        vec3 color = mix(uDeep, uShallow, smoothstep(-0.6, 0.8, wave));
        color += crest * 0.28;
        float fog = 1.0 - exp(-uFogDensity * uFogDensity * vDepth * vDepth);
        gl_FragColor = vec4(mix(color, uFogColor, clamp(fog, 0.0, 1.0)), 0.94);
      }
    `,
  });
}

function fogTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const g = canvas.getContext("2d")!;
  const gradient = g.createRadialGradient(64, 64, 5, 64, 64, 62);
  gradient.addColorStop(0, "rgba(225,235,232,.58)");
  gradient.addColorStop(0.5, "rgba(205,220,216,.26)");
  gradient.addColorStop(1, "rgba(195,215,210,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

const lowFogMaterial = new THREE.PointsMaterial({
  map: fogTexture(), color: "#d4e0dc", size: 22, transparent: true,
  opacity: 0.68, depthWrite: false, sizeAttenuation: true,
});

/**
 * Un individuo de fauna. Vuela por el MUNDO con rumbo propio, no montado sobre la vía:
 * antes cada bicho avanzaba sobre la spline y se orientaba con su tangente, así que la
 * bandada entera iba en paralelo al tren como un escuadrón. Ahora cada uno lleva su
 * rumbo y su deriva, y se cruzan en todas direcciones.
 */
interface FaunaUnit {
  pos: THREE.Vector3;
  heading: number;  // rad; 0 = hacia +Z. Independiente del rumbo de la vía.
  turn: number;     // rad/s: deriva suave y distinta en cada individuo
  altitude: number;
  speed: number;
  phase: number;
}

export class Scenery {
  private route: RouteSpec | null = null;
  private seed = 1;
  private chunks = new Map<number, SceneryChunk>();
  private tunnel: THREE.Group | null = null;
  private readonly frame: TrackFrame = newTrackFrame();
  private readonly basis = new THREE.Matrix4();

  // Objetos que viven todo el viaje (no por chunk) porque siguen al tren.
  private sea: THREE.Mesh | null = null;
  private seaSide = 1;
  private snow: THREE.Points | null = null;
  private fauna: THREE.InstancedMesh | null = null;
  private faunaUnits: FaunaUnit[] = [];
  private faunaSpec: FaunaSpec | null = null;
  private faunaRng: () => number = Math.random;
  private faunaSpawned = false;
  private readonly trainFrame: TrackFrame = newTrackFrame();
  private readonly tmpVec = new THREE.Vector3();
  private landmarks: THREE.Group | null = null;
  private elapsed = 0;

  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly scaleVec = new THREE.Vector3();
  private readonly posVec = new THREE.Vector3();

  constructor(private readonly scene: THREE.Scene, private readonly track: TrackManager) {}

  chunkCount(): number {
    return this.chunks.size;
  }

  reset(route: RouteSpec, seed: number): void {
    this.clear();
    this.route = route;
    this.seed = seed;
    this.elapsed = 0;
    const rng = makeRng(seed + 31337);
    this.seaSide = rng() < 0.5 ? -1 : 1;

    for (let i = 0; i < SEGMENTS_AHEAD; i++) this.buildChunk(i);
    if (route.biome === "SIERRA") this.buildTunnel();
    if (route.biome === "COSTA") this.buildSea();
    if (route.biome === "PARAMO") this.buildSnow(rng);
    this.buildFauna(route.biome, rng);
    this.buildGuinos(route.biome, rng);
  }

  update(trainDistance: number, dt = 0): number {
    if (!this.route) return 0;
    this.elapsed += dt;
    const current = Math.floor(trainDistance / SEGMENT_LENGTH);
    for (let i = current - 1; i < current + SEGMENTS_AHEAD; i++) {
      if (i >= 0 && !this.chunks.has(i)) this.buildChunk(i);
    }
    for (const [index, chunk] of this.chunks) {
      if ((index + 1) * SEGMENT_LENGTH < trainDistance - DISPOSE_BEHIND) {
        this.scene.remove(chunk.group);
        for (const geometry of chunk.ownedGeometries) geometry.dispose();
        this.chunks.delete(index);
      }
    }

    this.updateFauna(trainDistance, dt);
    if (this.sea) {
      this.track.frameAt(trainDistance, this.frame);
      this.sea.position.copy(this.frame.pos)
        .addScaledVector(this.frame.right, this.seaSide * SEA_CENTER_OFFSET);
      this.sea.position.y = this.frame.pos.y - 1.45;
      (this.sea.material as THREE.ShaderMaterial).uniforms.uTime.value = this.elapsed;
    }
    if (this.snow) {
      this.track.frameAt(trainDistance, this.frame);
      this.snow.position.copy(this.frame.pos);
      const positions = this.snow.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        let y = positions.getY(i) - (5 + (i % 7)) * dt;
        if (y < -4) y += 44;
        positions.setY(i, y);
        positions.setX(i, positions.getX(i) + Math.sin(this.elapsed * 0.8 + i) * dt * 1.4);
      }
      positions.needsUpdate = true;
    }
    return this.route.biome === "SIERRA" ? this.tunnelFactor(trainDistance) : 0;
  }

  private buildChunk(index: number): void {
    if (!this.route) return;
    const group = new THREE.Group();
    const start = index * SEGMENT_LENGTH;
    const end = start + SEGMENT_LENGTH;
    const rng = makeRng(this.seed + index * 104729);
    const terrainGeometry = this.makeTerrain(start, end, rng);
    group.add(new THREE.Mesh(terrainGeometry, TERRAIN_MATERIALS[this.route.biome] ?? fallbackTerrain));

    if (this.route.biome === "VALLE") this.populateValley(group, start, end, rng, index);
    if (this.route.biome === "SIERRA") this.populateSierra(group, start, end, rng, index);
    if (this.route.biome === "DESIERTO") this.populateDesierto(group, start, end, rng, index);
    if (this.route.biome === "COSTA") this.populateCosta(group, start, end, rng, index);
    if (this.route.biome === "PARAMO") this.populateParamo(group, start, end, rng, index);

    // Decorado transversal: va en TODAS las rutas (PLAN §5.6).
    this.addTelegraphLine(group, start, end, index);
    this.addMilestones(group, start, end);

    this.scene.add(group);
    const ownedGeometries = [terrainGeometry];
    group.traverse((object) => {
      if (!object.userData.ownedGeometry) return;
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
        ownedGeometries.push(object.geometry);
      }
    });
    this.chunks.set(index, { index, group, ownedGeometries });
  }

  private makeTerrain(start: number, end: number, rng: () => number): THREE.BufferGeometry {
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const steps = Math.ceil((end - start) / TERRAIN_STEP);
    const material = TERRAIN_MATERIALS[this.route?.biome ?? "VALLE"] ?? fallbackTerrain;
    const color = material.color.clone();
    for (let i = 0; i <= steps; i++) {
      const d = THREE.MathUtils.lerp(start, end, i / steps);
      this.track.frameAt(d, this.frame);
      for (const side of [-1, 1]) {
        const p = this.frame.pos.clone()
          .addScaledVector(this.frame.right, side * this.corridorHalfWidth(side));
        p.y = this.frame.pos.y - 0.72 + (rng() - 0.5) * 0.22;
        positions.push(p.x, p.y, p.z);
        const shade = 0.86 + rng() * 0.18;
        colors.push(color.r * shade, color.g * shade, color.b * shade);
      }
      if (i < steps) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  private populateValley(group: THREE.Group, start: number, end: number, rng: () => number, index: number): void {
    const trees = this.instances(trunkGeo, trunkMaterial, 18);
    const crowns = this.instances(crownGeo, valleyLeafMaterial, 18);
    const corn = this.instances(cornGeo, cornMaterial, 120);
    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3();
    const quat = new THREE.Quaternion();

    for (let i = 0; i < 18; i++) {
      const sample = this.sampleSide(start, end, rng, 13, 68);
      const size = 0.7 + rng() * 0.8;
      matrix.compose(new THREE.Vector3(sample.x, sample.y + 0.9 * size, sample.z), quat, scale.set(size, size, size));
      trees.setMatrixAt(i, matrix);
      matrix.compose(new THREE.Vector3(sample.x, sample.y + 2.15 * size, sample.z), quat, scale.set(size, size, size));
      crowns.setMatrixAt(i, matrix);
    }
    for (let i = 0; i < 120; i++) {
      const sample = this.sampleSide(start, end, rng, 8, 34);
      const size = 0.75 + rng() * 0.5;
      matrix.compose(new THREE.Vector3(sample.x, sample.y + 0.55 * size, sample.z), quat, scale.set(size, size, size));
      corn.setMatrixAt(i, matrix);
    }
    trees.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = corn.instanceMatrix.needsUpdate = true;
    group.add(trees, crowns, corn);

    if (index % 4 === 2) this.addRiver(group, start + SEGMENT_LENGTH * 0.55);
    if (index === 1) this.addWaterTower(group, start + SEGMENT_LENGTH * 0.66);
  }

  private populateSierra(group: THREE.Group, start: number, end: number, rng: () => number, index: number): void {
    const trunks = this.instances(trunkGeo, trunkMaterial, 44);
    const pines = this.instances(pineGeo, pineMaterial, 44);
    const rocks = this.instances(rockGeo, rockMaterial, 18);
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    for (let i = 0; i < 44; i++) {
      const sample = this.sampleSide(start, end, rng, 9, 70);
      const size = 0.75 + rng() * 1.15;
      matrix.compose(new THREE.Vector3(sample.x, sample.y + 0.75 * size, sample.z), quat, scale.set(size, size, size));
      trunks.setMatrixAt(i, matrix);
      matrix.compose(new THREE.Vector3(sample.x, sample.y + 2.3 * size, sample.z), quat, scale.set(size, size, size));
      pines.setMatrixAt(i, matrix);
    }
    for (let i = 0; i < 18; i++) {
      const sample = this.sampleSide(start, end, rng, 8, 58);
      const size = 0.5 + rng() * 1.8;
      matrix.compose(new THREE.Vector3(sample.x, sample.y + 0.35 * size, sample.z), quat, scale.set(size, size * 0.7, size));
      rocks.setMatrixAt(i, matrix);
    }
    trunks.instanceMatrix.needsUpdate = pines.instanceMatrix.needsUpdate = rocks.instanceMatrix.needsUpdate = true;
    group.add(trunks, pines, rocks, this.makeLowFog(start, end, rng));
    if (index === 3) this.addViaductPillars(group, start, end);
    if (index === 4) this.addCascade(group, start + SEGMENT_LENGTH * 0.5);
  }

  // --- Desierto de Agaves (D · mediodía, A · atardecer, E · amanecer) ----------------

  private populateDesierto(group: THREE.Group, start: number, end: number, rng: () => number, index: number): void {
    const agaves = this.instances(agaveGeo, agaveMaterial, 40);
    const cacti = this.instances(cactusGeo, cactusMaterial, 16);
    const mesas = this.instances(mesaGeo, mesaMaterial, 3);
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < 40; i++) {
      const sample = this.sampleSide(start, end, rng, 7, 62);
      const size = 0.7 + rng() * 0.9;
      quat.setFromAxisAngle(UP, rng() * Math.PI * 2);
      matrix.compose(sample, quat, scale.set(size, size, size));
      agaves.setMatrixAt(i, matrix);
    }
    quat.identity();
    for (let i = 0; i < 16; i++) {
      const sample = this.sampleSide(start, end, rng, 10, 58);
      const size = 0.8 + rng() * 0.7;
      quat.setFromAxisAngle(UP, rng() * Math.PI * 2);
      matrix.compose(sample, quat, scale.set(size, size, size));
      cacti.setMatrixAt(i, matrix);
    }
    // Mesas: lejos y grandes, son el horizonte del bioma.
    for (let i = 0; i < 3; i++) {
      const sample = this.sampleSide(start, end, rng, 110, 210);
      const size = 0.9 + rng() * 1.5;
      quat.setFromAxisAngle(UP, rng() * Math.PI * 2);
      matrix.compose(
        this.posVec.set(sample.x, sample.y + 4.2 * size, sample.z), quat,
        scale.set(size, size * (0.7 + rng() * 0.6), size),
      );
      mesas.setMatrixAt(i, matrix);
    }
    agaves.instanceMatrix.needsUpdate = true;
    cacti.instanceMatrix.needsUpdate = true;
    mesas.instanceMatrix.needsUpdate = true;
    group.add(agaves, cacti, mesas, this.makeDustDevils(start, end, rng));

    if (index === 2) this.addWagonWheel(group, start + SEGMENT_LENGTH * 0.4, rng);
  }

  /** Tolvaneras: Points con textura de polvo, sueltas y bajas. */
  private makeDustDevils(start: number, end: number, rng: () => number): THREE.Points {
    const positions: number[] = [];
    for (let i = 0; i < 10; i++) {
      const p = this.sampleSide(start, end, rng, 20, 90);
      positions.push(p.x, p.y + 3 + rng() * 5, p.z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const dust = new THREE.Points(geometry, dustMaterial);
    dust.userData.ownedGeometry = true;
    return dust;
  }

  /** Esqueleto de rueda de carreta medio enterrado: el landmark narrativo del desierto. */
  private addWagonWheel(group: THREE.Group, distance: number, rng: () => number): void {
    this.track.frameAt(distance, this.frame);
    const wheel = new THREE.Group();
    wheel.position.copy(this.frame.pos).addScaledVector(this.frame.right, 15 + rng() * 6);
    wheel.position.y -= 0.5;
    wheel.rotation.set(1.2, rng() * Math.PI, 0.35);
    wheel.add(boxMesh(new THREE.TorusGeometry(1.5, 0.12, 6, 16), boneMaterial));
    for (let i = 0; i < 6; i++) {
      const spoke = boxMesh(new THREE.BoxGeometry(0.09, 2.9, 0.09), boneMaterial);
      spoke.rotation.z = (i / 6) * Math.PI;
      wheel.add(spoke);
    }
    group.add(wheel);
  }

  // --- Costa de Salinas (F# · atardecer, B · mediodía, D♭ · amanecer) ----------------

  private populateCosta(group: THREE.Group, start: number, end: number, rng: () => number, index: number): void {
    const trunks = this.instances(palmTrunkGeo, palmTrunkMaterial, 20);
    const crowns = this.instances(palmCrownGeo, palmLeafMaterial, 20);
    const pans = this.instances(saltPanGeo, saltMaterial, 7);
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < 20; i++) {
      const sample = this.sampleSide(start, end, rng, 12, 70);
      const size = 0.85 + rng() * 0.7;
      quat.setFromAxisAngle(UP, rng() * Math.PI * 2);
      matrix.compose(sample, quat, scale.set(size, size, size));
      trunks.setMatrixAt(i, matrix);
      matrix.compose(
        this.posVec.set(sample.x + Math.sin(1.1) * 0.42 * size, sample.y + 5.4 * size, sample.z),
        quat, scale.set(size, size, size),
      );
      crowns.setMatrixAt(i, matrix);
    }
    // Salinas: espejos de sal a ras de suelo, siempre del lado del mar.
    quat.identity();
    for (let i = 0; i < 7; i++) {
      const d = THREE.MathUtils.lerp(start + 6, end - 6, rng());
      this.track.frameAt(d, this.frame);
      this.posVec.copy(this.frame.pos)
        .addScaledVector(this.frame.right, this.seaSide * (8 + rng() * 16));
      this.posVec.y -= 0.68;
      quat.setFromAxisAngle(UP, Math.atan2(this.frame.tan.x, this.frame.tan.z));
      matrix.compose(this.posVec, quat, scale.set(1 + rng() * 1.4, 1, 1 + rng() * 1.2));
      pans.setMatrixAt(i, matrix);
    }
    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    pans.instanceMatrix.needsUpdate = true;
    group.add(trunks, crowns, pans);

    if (index === 2) this.addLighthouse(group, start + SEGMENT_LENGTH * 0.5);
  }

  /** Faro: el landmark de la Costa, siempre en la orilla. */
  private addLighthouse(group: THREE.Group, distance: number): void {
    this.track.frameAt(distance, this.frame);
    const faro = new THREE.Group();
    // Plantado en el agua, poco después de la orilla: el faro se recorta contra el mar.
    faro.position.copy(this.frame.pos)
      .addScaledVector(this.frame.right, this.seaSide * 62);
    faro.position.y -= 2.7;
    const tower = boxMesh(new THREE.CylinderGeometry(2.1, 3.4, 22, 12), lighthouseMaterial);
    tower.position.y = 11;
    const gallery = boxMesh(new THREE.CylinderGeometry(2.9, 2.9, 0.6, 12), hullMaterial);
    gallery.position.y = 22.3;
    const lantern = boxMesh(new THREE.CylinderGeometry(1.6, 1.6, 2.4, 10), lanternMaterial);
    lantern.position.y = 23.7;
    const roof = boxMesh(new THREE.ConeGeometry(2.1, 1.8, 10), hullMaterial);
    roof.position.y = 25.8;
    faro.add(tower, gallery, lantern, roof);
    group.add(faro);
  }

  // --- Páramo de Estrellas (C# · noche, C♭ · crepúsculo, G♭ · aurora) ---------------

  private populateParamo(group: THREE.Group, start: number, end: number, rng: () => number, index: number): void {
    const rocks = this.instances(snowRockGeo, snowRockMaterial, 26);
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    for (let i = 0; i < 26; i++) {
      const sample = this.sampleSide(start, end, rng, 8, 74);
      const size = 0.6 + rng() * 2.2;
      quat.setFromAxisAngle(UP, rng() * Math.PI * 2);
      matrix.compose(
        this.posVec.set(sample.x, sample.y + 0.3 * size, sample.z), quat,
        scale.set(size, size * 0.62, size),
      );
      rocks.setMatrixAt(i, matrix);
    }
    rocks.instanceMatrix.needsUpdate = true;
    group.add(rocks);
    if (index === 3) this.addFrozenPond(group, start + SEGMENT_LENGTH * 0.45);
  }

  private addFrozenPond(group: THREE.Group, distance: number): void {
    this.track.frameAt(distance, this.frame);
    const pond = boxMesh(new THREE.CylinderGeometry(16, 16, 0.1, 18), saltMaterial);
    pond.position.copy(this.frame.pos).addScaledVector(this.frame.right, -42);
    pond.position.y -= 0.72;
    group.add(pond);
  }

  // --- Decorado transversal (todas las rutas) ---------------------------------------

  /** Postes de telégrafo + catenaria: el ritmo visual hipnótico del tren (PLAN §5.6). */
  private addTelegraphLine(group: THREE.Group, start: number, end: number, index: number): void {
    const side = index % 2 === 0 ? 1 : -1;
    const count = Math.floor((end - start) / TELEGRAPH_SPACING);
    if (count <= 0) return;
    const poles = this.instances(poleGeo, poleMaterial, count);
    const wirePoints: THREE.Vector3[] = [];
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < count; i++) {
      const d = start + i * TELEGRAPH_SPACING;
      this.track.frameAt(d, this.frame);
      this.posVec.copy(this.frame.pos)
        .addScaledVector(this.frame.right, side * TELEGRAPH_SIDE_OFFSET);
      this.posVec.y -= 0.7;
      quat.setFromAxisAngle(UP, Math.atan2(this.frame.tan.x, this.frame.tan.z));
      this.matrix.compose(this.posVec, quat, scale);
      poles.setMatrixAt(i, this.matrix);
      // La catenaria cuelga: punto alto en el poste, punto bajo a mitad de vano.
      wirePoints.push(this.posVec.clone().setY(this.posVec.y + 5.6));
      if (i < count - 1) {
        const mid = d + TELEGRAPH_SPACING / 2;
        this.track.frameAt(mid, this.frame);
        wirePoints.push(this.frame.pos.clone()
          .addScaledVector(this.frame.right, side * TELEGRAPH_SIDE_OFFSET)
          .setY(this.frame.pos.y + 4.2));
      }
    }
    poles.instanceMatrix.needsUpdate = true;
    const wireGeometry = new THREE.BufferGeometry().setFromPoints(wirePoints);
    const wire = new THREE.Line(wireGeometry, wireMaterial);
    wire.userData.ownedGeometry = true;
    group.add(poles, wire);
  }

  private addMilestones(group: THREE.Group, start: number, end: number): void {
    const count = Math.floor((end - start) / MILESTONE_SPACING);
    if (count <= 0) return;
    const marks = this.instances(milestoneGeo, milestoneMaterial, count);
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < count; i++) {
      const d = start + i * MILESTONE_SPACING;
      this.track.frameAt(d, this.frame);
      this.posVec.copy(this.frame.pos).addScaledVector(this.frame.right, 4.6);
      this.posVec.y -= 0.32;
      quat.setFromAxisAngle(UP, Math.atan2(this.frame.tan.x, this.frame.tan.z));
      this.matrix.compose(this.posVec, quat, scale);
      marks.setMatrixAt(i, this.matrix);
    }
    marks.instanceMatrix.needsUpdate = true;
    group.add(marks);
  }

  // --- Fauna, mar, nieve y guiños (viven todo el viaje, siguen al tren) --------------

  private buildFauna(biome: BiomeId, rng: () => number): void {
    const spec = FAUNA_BY_BIOME[biome];
    this.faunaSpec = spec;
    this.faunaRng = rng;
    const geometry = spec.kind === "BIRD" ? birdGeo : hareGeo;
    const mesh = new THREE.InstancedMesh(geometry, spec.material, FAUNA_COUNT);
    mesh.frustumCulled = false;
    // Nacen sin sitio: el primer `updateFauna` los reparte, que es cuando ya se sabe
    // dónde está el tren.
    this.faunaUnits = Array.from({ length: FAUNA_COUNT }, () => ({
      pos: new THREE.Vector3(),
      heading: 0,
      turn: 0,
      altitude: 0,
      speed: 0,
      phase: rng() * Math.PI * 2,
    }));
    this.faunaSpawned = false;
    this.scene.add(mesh);
    this.fauna = mesh;
  }

  /**
   * Suelta un individuo alrededor del tren con rumbo COMPLETAMENTE aleatorio. Al nacer
   * (`initial`) se reparten en toda la burbuja para que el cielo no esté vacío; al
   * reciclarse aparecen por delante, que es donde el maquinista mira.
   */
  private spawnFaunaUnit(unit: FaunaUnit, spec: FaunaSpec, initial: boolean): void {
    const rng = this.faunaRng;
    const forward = initial
      ? (rng() * 1.5 - 0.35) * FAUNA_AHEAD
      : FAUNA_AHEAD * (0.55 + rng() * 0.8);
    const lateral = (rng() * 2 - 1) * 78;

    unit.pos.copy(this.trainFrame.pos)
      .addScaledVector(this.trainFrame.tan, forward)
      .addScaledVector(this.trainFrame.right, lateral);
    unit.heading = rng() * Math.PI * 2;          // ← el arreglo: rumbo libre
    unit.turn = (rng() - 0.5) * 0.42;            // cada uno curva a su manera
    unit.altitude = spec.altitude * (0.55 + rng() * 0.85);
    // Las aves tienen que volar MÁS RÁPIDO que el tren (11–20 u/s) o su rumbo propio no
    // se nota: desde la cabina lo único que se vería es a todas quedándose atrás, que es
    // justo el efecto de escuadrón que había que quitar.
    unit.speed = spec.kind === "BIRD" ? 15 + rng() * 14 : 1.5 + rng() * 2.5;
  }

  private updateFauna(trainDistance: number, dt: number): void {
    if (!this.fauna || !this.faunaSpec) return;
    const spec = this.faunaSpec;
    const scale = spec.size;
    // El frame del TREN se calcula una vez y aparte: `this.frame` lo pisan otros usos.
    this.track.frameAt(trainDistance, this.trainFrame);

    if (!this.faunaSpawned) {
      for (const unit of this.faunaUnits) this.spawnFaunaUnit(unit, spec, true);
      this.faunaSpawned = true;
    }

    const groundY = this.trainFrame.pos.y;
    for (let i = 0; i < this.faunaUnits.length; i++) {
      const unit = this.faunaUnits[i];
      unit.phase += dt * FAUNA_FLAP_HZ * Math.PI * 2;
      // Deriva del rumbo: la constante propia más un vaivén lento, para que ninguno
      // describa un círculo perfecto ni dos hagan lo mismo.
      unit.heading += (unit.turn + Math.sin(unit.phase * 0.11) * 0.16) * dt;
      unit.pos.x += Math.sin(unit.heading) * unit.speed * dt;
      unit.pos.z += Math.cos(unit.heading) * unit.speed * dt;

      // Reciclado por burbuja RADIAL, sin mirar si va delante o detrás: descartar por
      // "ha quedado atrás" premiaba a las que volaban con el tren y sesgaba la bandada
      // hacia un rumbo común.
      this.tmpVec.copy(unit.pos).sub(this.trainFrame.pos);
      this.tmpVec.y = 0;
      if (this.tmpVec.lengthSq() > 250 * 250) this.spawnFaunaUnit(unit, spec, false);

      this.posVec.copy(unit.pos);
      this.quat.setFromAxisAngle(UP, unit.heading);

      if (spec.kind === "BIRD") {
        this.posVec.y = groundY + unit.altitude + Math.sin(unit.phase * 0.22) * 1.6;
        // El aleteo es escala en Y: a esta distancia lee como batir de alas.
        const flap = 0.45 + Math.abs(Math.sin(unit.phase)) * 0.75;
        this.scaleVec.set(scale, scale * flap, scale);
      } else {
        // Liebre: salto en Y, y se queda pegada al suelo.
        const hop = Math.abs(Math.sin(unit.phase * 0.5));
        this.posVec.y = groundY - 0.45 + hop * 0.85;
        this.scaleVec.set(scale, scale * (1 + hop * 0.12), scale);
      }
      this.matrix.compose(this.posVec, this.quat, this.scaleVec);
      this.fauna.setMatrixAt(i, this.matrix);
    }
    this.fauna.instanceMatrix.needsUpdate = true;
  }

  /**
   * El mar arranca justo donde acaba la cinta de terreno (CORRIDOR_HALF_WIDTH) y se
   * extiende hasta que la niebla lo funde con el horizonte: así la Costa se lee como
   * costa y no como una tira de agua lejana.
   */
  private buildSea(): void {
    const geometry = new THREE.PlaneGeometry(SEA_WIDTH, 1700, 1, 1);
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, seaMaterial());
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    this.sea = mesh;
  }

  private buildSnow(rng: () => number): void {
    const count = 520;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rng() - 0.5) * 90;
      positions[i * 3 + 1] = rng() * 44 - 4;
      positions[i * 3 + 2] = (rng() - 0.5) * 90;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const snow = new THREE.Points(geometry, snowMaterial);
    snow.frustumCulled = false;
    this.scene.add(snow);
    this.snow = snow;
  }

  /**
   * Guiños a las otras obras de Storm Studios (PLAN §5.6): el globo dorado de Aerostato
   * muy alto en Valle/Sierra, y el barco con grúa y esfera de Batisfera en la Costa.
   */
  private buildGuinos(biome: BiomeId, rng: () => number): void {
    const group = new THREE.Group();
    let any = false;

    if (biome === "VALLE" || biome === "SIERRA") {
      const distance = SEGMENT_LENGTH * (3 + rng() * 6);
      this.track.frameAt(distance, this.frame);
      const balloon = new THREE.Group();
      balloon.position.copy(this.frame.pos)
        .addScaledVector(this.frame.right, (rng() < 0.5 ? -1 : 1) * (90 + rng() * 70));
      balloon.position.y += AEROSTATO_BALLOON_ALTITUDE;
      const envelope = boxMesh(new THREE.SphereGeometry(9, 14, 12), balloonMaterial);
      envelope.scale.set(1, 1.22, 1);
      const basket = boxMesh(new THREE.BoxGeometry(3.4, 2.6, 3.4), palmTrunkMaterial);
      basket.position.y = -13.5;
      balloon.add(envelope, basket);
      group.add(balloon);
      any = true;
    }

    if (biome === "COSTA") {
      const distance = SEGMENT_LENGTH * (4 + rng() * 5);
      this.track.frameAt(distance, this.frame);
      const ship = new THREE.Group();
      ship.position.copy(this.frame.pos)
        .addScaledVector(this.frame.right, this.seaSide * BATISFERA_SHIP_DISTANCE);
      ship.position.y = this.frame.pos.y - 2.4;
      ship.rotation.y = Math.atan2(this.frame.tan.x, this.frame.tan.z) + 0.3;
      const hull = boxMesh(new THREE.BoxGeometry(9, 3.4, 34), hullMaterial);
      hull.position.y = 1.7;
      const house = boxMesh(new THREE.BoxGeometry(6.4, 4.2, 8), lighthouseMaterial);
      house.position.set(0, 5.4, 9);
      // Grúa + esfera colgando: el guiño a Batisfera.
      const mast = boxMesh(new THREE.BoxGeometry(0.7, 13, 0.7), hullMaterial);
      mast.position.set(0, 9.5, -6);
      const jib = boxMesh(new THREE.BoxGeometry(0.55, 0.55, 11), hullMaterial);
      jib.position.set(0, 15.5, -11);
      const cable = boxMesh(new THREE.BoxGeometry(0.12, 7, 0.12), hullMaterial);
      cable.position.set(0, 11.6, -16);
      const sphere = boxMesh(new THREE.SphereGeometry(2.3, 14, 10), batisferaMaterial);
      sphere.position.set(0, 7.4, -16);
      ship.add(hull, house, mast, jib, cable, sphere);
      group.add(ship);
      any = true;
    }

    if (!any) return;
    this.scene.add(group);
    this.landmarks = group;
  }

  /** Medio ancho del terreno para un lado dado: solo la Costa es asimétrica. */
  private corridorHalfWidth(side: number): number {
    return this.route?.biome === "COSTA" && side === this.seaSide
      ? COSTA_SHORE_HALF_WIDTH
      : CORRIDOR_HALF_WIDTH;
  }

  private sampleSide(start: number, end: number, rng: () => number, near: number, far: number): THREE.Vector3 {
    const d = THREE.MathUtils.lerp(start + 4, end - 4, rng());
    this.track.frameAt(d, this.frame);
    const side = rng() < 0.5 ? -1 : 1;
    let offset = THREE.MathUtils.lerp(near, far, rng());
    // Nada de vegetación flotando en el mar: del lado del agua se queda en la orilla.
    offset = Math.min(offset, this.corridorHalfWidth(side) - 5);
    return this.frame.pos.clone()
      .addScaledVector(this.frame.right, offset * side).setY(this.frame.pos.y - 0.7);
  }

  private instances(geometry: THREE.BufferGeometry, material: THREE.Material, count: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.frustumCulled = true;
    return mesh;
  }

  private makeLowFog(start: number, end: number, rng: () => number): THREE.Points {
    const positions: number[] = [];
    for (let i = 0; i < 16; i++) {
      const p = this.sampleSide(start, end, rng, 7, 42);
      positions.push(p.x, p.y + 1 + rng() * 1.2, p.z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const fog = new THREE.Points(geometry, lowFogMaterial);
    fog.userData.ownedGeometry = true;
    return fog;
  }

  private addRiver(group: THREE.Group, distance: number): void {
    this.track.frameAt(distance, this.frame);
    const river = boxMesh(new THREE.BoxGeometry(20, 0.05, 55), waterMaterial);
    river.position.copy(this.frame.pos).addScaledVector(this.frame.right, 44);
    river.position.y -= 0.66;
    river.rotation.y = Math.atan2(this.frame.tan.x, this.frame.tan.z);
    group.add(river);
  }

  private addWaterTower(group: THREE.Group, distance: number): void {
    this.track.frameAt(distance, this.frame);
    const landmark = new THREE.Group();
    landmark.position.copy(this.frame.pos).addScaledVector(this.frame.right, -26);
    landmark.position.y -= 0.7;
    for (const x of [-1.2, 1.2]) for (const z of [-1.2, 1.2]) {
      landmark.add(boxMesh(new THREE.BoxGeometry(0.22, 5, 0.22), FRAME_MATERIAL).translateX(x).translateZ(z).translateY(2.5));
    }
    const tank = boxMesh(new THREE.CylinderGeometry(2.3, 2.1, 2.6, 12), stoneMaterial);
    tank.position.y = 5.6;
    landmark.add(tank);
    group.add(landmark);
  }

  private addViaductPillars(group: THREE.Group, start: number, end: number): void {
    for (let d = start + 15; d < end; d += 18) {
      this.track.frameAt(d, this.frame);
      const pillar = boxMesh(new THREE.BoxGeometry(2.8, 8, 2.8), stoneMaterial);
      pillar.position.copy(this.frame.pos).add(new THREE.Vector3(0, -4.7, 0));
      group.add(pillar);
    }
  }

  private addCascade(group: THREE.Group, distance: number): void {
    this.track.frameAt(distance, this.frame);
    const fall = boxMesh(new THREE.BoxGeometry(0.12, 8, 5), waterMaterial);
    fall.position.copy(this.frame.pos).addScaledVector(this.frame.right, 34);
    fall.position.y += 2.5;
    fall.rotation.y = Math.atan2(this.frame.tan.x, this.frame.tan.z);
    group.add(fall);
  }

  private buildTunnel(): void {
    const center = TUNNEL_START + TUNNEL_LENGTH / 2;
    this.track.frameAt(center, this.frame);
    const group = new THREE.Group();
    group.position.copy(this.frame.pos);
    this.basis.makeBasis(this.frame.right, this.frame.up, this.frame.tan.clone().negate());
    group.quaternion.setFromRotationMatrix(this.basis);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, TUNNEL_LENGTH, 14, 1, true), tunnelMaterial);
    tube.rotation.x = Math.PI / 2;
    group.add(tube);
    const ringGeo = new THREE.TorusGeometry(4.65, 0.65, 8, 18);
    for (const z of [-TUNNEL_LENGTH / 2, TUNNEL_LENGTH / 2]) {
      const ring = new THREE.Mesh(ringGeo, stoneMaterial);
      ring.position.z = z;
      group.add(ring);
    }
    this.scene.add(group);
    this.tunnel = group;
  }

  private tunnelFactor(distance: number): number {
    const enter = THREE.MathUtils.smoothstep(distance, TUNNEL_START - 5, TUNNEL_START + 7);
    const exit = 1 - THREE.MathUtils.smoothstep(distance, TUNNEL_START + TUNNEL_LENGTH - 7, TUNNEL_START + TUNNEL_LENGTH + 5);
    return Math.min(enter, exit);
  }

  private clear(): void {
    for (const chunk of this.chunks.values()) {
      this.scene.remove(chunk.group);
      for (const geometry of chunk.ownedGeometries) geometry.dispose();
    }
    this.chunks.clear();

    // Objetos de viaje: se liberan aquí porque no pertenecen a ningún chunk.
    for (const object of [this.sea, this.snow, this.fauna]) {
      if (!object) continue;
      this.scene.remove(object);
      object.geometry.dispose();
    }
    if (this.sea) (this.sea.material as THREE.Material).dispose();
    this.sea = null;
    this.snow = null;
    this.fauna = null;
    this.faunaUnits = [];
    this.faunaSpec = null;
    if (this.landmarks) {
      this.scene.remove(this.landmarks);
      const geometries = new Set<THREE.BufferGeometry>();
      this.landmarks.traverse((object) => {
        if (object instanceof THREE.Mesh) geometries.add(object.geometry);
      });
      for (const geometry of geometries) geometry.dispose();
    }
    this.landmarks = null;

    if (this.tunnel) {
      this.scene.remove(this.tunnel);
      const geometries = new Set<THREE.BufferGeometry>();
      this.tunnel.traverse((object) => {
        if (object instanceof THREE.Mesh) geometries.add(object.geometry);
      });
      for (const geometry of geometries) geometry.dispose();
    }
    this.tunnel = null;
  }
}

const FRAME_MATERIAL = new THREE.MeshStandardMaterial({ color: "#59615d", roughness: 0.9, metalness: 0.18 });

function boxMesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.ownedGeometry = true;
  return mesh;
}
