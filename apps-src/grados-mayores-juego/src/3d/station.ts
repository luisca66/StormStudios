// station.ts — La Estación Terminal (PLAN §12): "el presupuesto de asombro se gasta
// AQUÍ". Nave de hierro y cristal, dos torres con rosetón de 12 husos, vitral de sol al
// fondo, y los 8 arcos que cantan la escala mayor de la tonalidad del viaje.
//
// Desde 2026-09 la arquitectura está modelada en Blender (art/blender/modelar-terminal.py):
// fachada con arco de dovelas y pantalla de sol naciente, bóveda de cerchas de celosía,
// torres con campanario y cúpula de cobre, andenes con columnas-palmera y faroles, gran
// reloj colgante sobre la vía y pórticos de celosía. Se conservaron las medidas de la
// versión de primitivas, así que la ceremonia de llegada no cambió. Aquí solo se arma lo
// que llega en el JSON, se deciden los husos encendidos y se pinta el vitral de canvas.
//
// La Terminal se planta en un PUNTO FIJO del mundo en cuanto asoma y ya no se mueve:
// crece sola al acercarse el tren, con toda su geometría desde el primer instante.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { newTrackFrame, type TrackFrame, type TrackManager } from "./track";
import { Fireworks } from "./fireworks";
import terminalUrl from "./assets/terminal.json?url";
import { metalEnvironment } from "./metal-env";

const UP = new THREE.Vector3(0, 1, 0);
// Las partes ILUMINADAS ignoran la niebla (`fog: false`, lo marca el JSON). La Terminal
// se planta a más de 1300 u y con la densidad de fog del bioma quedaba tapada al 93 %:
// así de lejos se ve la linterna encendida en el horizonte y al acercarse emerge de la
// bruma el edificio entero. La piedra y el hierro sí llevan niebla.
const SPOKE_LIT = new THREE.MeshStandardMaterial({
  color: "#ffe9b8", emissive: "#ffc247", emissiveIntensity: 2.2, roughness: 0.4,
  fog: false,
});
const SPOKE_DARK = new THREE.MeshStandardMaterial({ color: "#4a4238", roughness: 0.9 });
const MEDALLION_OFF = new THREE.MeshStandardMaterial({ color: "#6d6152", roughness: 0.7, metalness: 0.4 });
const MEDALLION_ON = new THREE.MeshStandardMaterial({
  color: "#ffd97a", emissive: "#ffb52e", emissiveIntensity: 2.6, roughness: 0.35,
});

interface Bucket { material: string; position: number[]; normal: number[]; color: number[]; index: number[] }
interface MaterialData {
  key: string; color: string; metalness: number; roughness: number; emissive: string;
  emissiveIntensity: number; fog: boolean; opacity: number; doubleSide: boolean;
}
interface TerminalData {
  materials: MaterialData[];
  static: Bucket[];
  spokes: Array<Bucket & { tower: number; spoke: number }>;
  gate: Bucket[];
  medallion: Bucket[];
}
interface TerminalAssets {
  building: Array<{ geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial }>;
  spokes: Array<{ spoke: number; geometry: THREE.BufferGeometry }>;
  gate: Array<{ geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial }>;
  medallion: THREE.BufferGeometry;
}

function bucketGeometry(b: Bucket): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(b.position, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(b.normal, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(b.color, 3));
  geometry.setIndex(b.index);
  geometry.computeBoundingSphere();
  return geometry;
}

let assets: TerminalAssets | null = null;
let loading: Promise<TerminalAssets> | null = null;

/** Geometría COMPARTIDA entre construcciones: se crea una vez y no se dispone. */
function loadTerminal(): Promise<TerminalAssets> {
  return loading ??= fetch(terminalUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Terminal: HTTP ${response.status}`);
    const data = await response.json() as TerminalData;
    const env = metalEnvironment();
    const materials = new Map<string, THREE.MeshStandardMaterial>();
    for (const m of data.materials) {
      materials.set(m.key, new THREE.MeshStandardMaterial({
        color: m.color, metalness: m.metalness, roughness: m.roughness,
        emissive: m.emissive, emissiveIntensity: m.emissiveIntensity,
        vertexColors: true, fog: m.fog,
        transparent: m.opacity < 1, opacity: m.opacity,
        side: m.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
        envMap: m.metalness > 0.5 ? env : null,
      }));
    }
    const pick = (b: Bucket) => ({ geometry: bucketGeometry(b), material: materials.get(b.material)! });
    assets = {
      building: data.static.map(pick),
      spokes: data.spokes.map((b) => ({ spoke: b.spoke, geometry: bucketGeometry(b) })),
      gate: data.gate.map(pick),
      medallion: bucketGeometry(data.medallion[0]),
    };
    return assets;
  }).catch((error: unknown) => { loading = null; throw error; });
}

// --- Medidas de la nave (las mismas que usa el modelo de Blender) ----------------------
const VAULT_DEPTH = 150;

/** Textura de canvas del vitral: sol radiante con rayos (§12). Cero assets de imagen. */
function sunVitralTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#1d1710";
  g.fillRect(0, 0, 512, 512);
  const cx = 256, cy = 300;
  // Rayos alternando ámbar y rojo profundo.
  for (let i = 0; i < 24; i++) {
    const a0 = (i / 24) * Math.PI * 2;
    const a1 = ((i + 0.55) / 24) * Math.PI * 2;
    g.fillStyle = i % 2 === 0 ? "#ffb03a" : "#c2452a";
    g.beginPath();
    g.moveTo(cx, cy);
    g.arc(cx, cy, 250, a0, a1);
    g.closePath();
    g.fill();
  }
  const disc = g.createRadialGradient(cx, cy, 10, cx, cy, 120);
  disc.addColorStop(0, "#fff6d0");
  disc.addColorStop(0.55, "#ffd267");
  disc.addColorStop(1, "#e0842a");
  g.fillStyle = disc;
  g.beginPath(); g.arc(cx, cy, 120, 0, Math.PI * 2); g.fill();
  // Plomos del vitral.
  g.strokeStyle = "#231a11"; g.lineWidth = 6;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * 250, cy + Math.sin(a) * 250);
    g.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Semitono absoluto (0–11) de una clase escrita, para orientar el rosetón. */
function semitoneOf(pitchClass: string): number {
  const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const acc = pitchClass.slice(1);
  const offset = acc === "#" ? 1 : acc === "##" ? 2 : acc === "♭" ? -1 : acc === "♭♭" ? -2 : 0;
  return (((NATURAL[pitchClass[0]] + offset) % 12) + 12) % 12;
}

export interface StationConfig {
  /** Distancia sobre la vía donde se planta el tope de la nave. */
  distance: number;
  /** Clase de altura de la tónica del viaje (para el rosetón). */
  tonicPitchClass: string;
}

export class Station {
  private readonly frame: TrackFrame = newTrackFrame();
  private readonly basis = new THREE.Matrix4();
  private readonly tmpLocal = new THREE.Vector3();
  private building: THREE.Group | null = null;
  private arches: THREE.Group | null = null;
  private owned: THREE.BufferGeometry[] = [];
  private ownedMaterials: THREE.Material[] = [];
  private ownedTextures: THREE.Texture[] = [];
  private buildToken = 0;
  /** Avisa cuando el edificio queda plantado o se mueve (el decorado se recorta). */
  onBuilt: (() => void) | null = null;
  private medallions: THREE.InstancedMesh | null = null;
  private archLit = 0;
  private fireworks: Fireworks | null = null;
  private config: StationConfig | null = null;
  private distance = 0;

  constructor(private readonly scene: THREE.Scene, private readonly track: TrackManager) {
    void loadTerminal();
  }

  /**
   * ¿Cae este punto del mundo dentro de la huella del edificio (nave, torres, muros y
   * explanada)? Lo usa el decorado para no plantar árboles ni postes dentro de la nave.
   */
  contains(worldPosition: THREE.Vector3): boolean {
    if (!this.building) return false;
    const local = this.tmpLocal.copy(worldPosition);
    this.building.worldToLocal(local);
    return Math.abs(local.x) < 52 && local.z < 16 && local.z > -VAULT_DEPTH - 12;
  }

  /** Dónde está plantada la boca de la nave, en distancia de vía. */
  stationDistance(): number {
    return this.distance;
  }

  /**
   * Recoloca la Terminal sin reconstruirla: la geometría es LOCAL al grupo, así que
   * basta con mover el grupo. Se usa cuando un desvío alarga el viaje un segmento.
   */
  relocate(distance: number): void {
    if (!this.building) return;
    this.distance = distance;
    this.placeGroup(this.building, distance);
    this.building.updateMatrixWorld(true);
    this.onBuilt?.();
  }

  /** Orienta y coloca el grupo con la cuerda boca→fondo (ver nota en `build`). */
  private placeGroup(group: THREE.Object3D, distance: number): void {
    // `frameAt` RECORTA lo que le pidas al final de la spline generada, sin avisar: si
    // la vía no llega tan lejos, devuelve su tope y la Terminal se planta corta. Como el
    // streaming solo va SEGMENTS_AHEAD por delante del tren, un `relocate` que la empuja
    // cuatro segmentos cae siempre fuera. Se extiende la vía ANTES de preguntar.
    //
    // Va aquí y no en quien llama porque es esta función la que consulta `frameAt`, y lo
    // necesita hasta `distance + VAULT_DEPTH` para la cuerda boca→fondo. Extender la
    // spline no dibuja nada ni altera su forma: los frames salen del mismo RNG en el
    // mismo orden, solo que antes.
    this.track.ensureReach(distance + VAULT_DEPTH + 80);
    this.track.frameAt(distance, this.frame);
    const mouth = this.frame.pos.clone();
    this.track.frameAt(distance + VAULT_DEPTH, this.frame);
    const forward = this.frame.pos.clone().sub(mouth).normalize();
    const right = new THREE.Vector3().crossVectors(forward, UP).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();
    group.position.copy(mouth);
    group.position.y -= 0.7;
    this.basis.makeBasis(right, up, forward.clone().negate());
    group.quaternion.setFromRotationMatrix(this.basis);
  }

  /** Construye la Terminal completa. Desde F-pulido se planta ya al revelarse. */
  build(config: StationConfig): void {
    this.dispose();
    this.config = config;
    this.distance = config.distance;
    if (!assets) {
      // El JSON se precarga al crear la Station; si aún no llegó, se construye al llegar
      // con la distancia vigente (un `relocate` intermedio ya la habrá actualizado).
      const token = ++this.buildToken;
      void loadTerminal().then(() => {
        if (token === this.buildToken && this.config) this.build({ ...this.config, distance: this.distance });
      });
      return;
    }
    const group = new THREE.Group();
    group.name = "Estación Terminal · Blender 4.5";
    this.placeGroup(group, config.distance);

    for (const { geometry, material } of assets.building) group.add(new THREE.Mesh(geometry, material));
    this.buildRosettes(group, assets, config.tonicPitchClass);
    this.buildVitral(group);

    group.updateMatrixWorld(true);
    this.scene.add(group);
    this.building = group;
    this.onBuilt?.();
  }

  /** Rosetones de 12 husos: los diatónicos de la tonalidad del viaje van encendidos. */
  private buildRosettes(group: THREE.Group, data: TerminalAssets, tonic: string): void {
    const tonicSemitone = semitoneOf(tonic);
    const MAJOR = [0, 2, 4, 5, 7, 9, 11];
    const lit: THREE.BufferGeometry[] = [];
    const dark: THREE.BufferGeometry[] = [];
    for (const { spoke, geometry } of data.spokes) {
      // La rotación del patrón cambia con la tónica: cada una de las 15 rutas tiene su reloj.
      (MAJOR.includes((((spoke - tonicSemitone) % 12) + 12) % 12) ? lit : dark).push(geometry);
    }
    for (const [parts, material] of [[lit, SPOKE_LIT], [dark, SPOKE_DARK]] as const) {
      const merged = mergeGeometries(parts, false);
      if (merged) { group.add(new THREE.Mesh(merged, material)); this.owned.push(merged); }
    }
  }

  /** Vitral de sol en el rosetón del muro de fondo: lo primero que se ve al entrar. */
  private buildVitral(group: THREE.Group): void {
    const vitral = new THREE.CircleGeometry(17, 40);
    const texture = sunVitralTexture();
    const material = new THREE.MeshStandardMaterial({
      map: texture, emissiveMap: texture,
      emissive: "#ffffff", emissiveIntensity: 1.5, roughness: 0.6, fog: false,
    });
    const mesh = new THREE.Mesh(vitral, material);
    mesh.position.set(0, 34, -VAULT_DEPTH + 0.2);
    group.add(mesh);
    this.owned.push(vitral);
    this.ownedMaterials.push(material);
    this.ownedTextures.push(texture);
  }

  // -----------------------------------------------------------------------------------
  // Los 8 arcos (§12): pórticos sobre la vía, cada uno con su medallón.
  // -----------------------------------------------------------------------------------

  /** @param distances distancia sobre la vía de cada uno de los 8 arcos. */
  buildArches(distances: number[]): void {
    if (!assets) return;
    const group = new THREE.Group();
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    const baked = new Map<THREE.Material, THREE.BufferGeometry[]>();

    this.medallions = new THREE.InstancedMesh(assets.medallion, MEDALLION_OFF, distances.length);
    this.medallions.frustumCulled = false;

    for (let i = 0; i < distances.length; i++) {
      this.track.frameAt(distances[i], this.frame);
      const pos = this.frame.pos.clone();
      pos.y -= 0.7;
      this.basis.makeBasis(this.frame.right, this.frame.up, this.frame.tan.clone().negate());
      quat.setFromRotationMatrix(this.basis);
      matrix.compose(pos, quat, scale);

      // Pórtico de Blender horneado en coordenadas de mundo, fusionado por material.
      for (const { geometry, material } of assets.gate) {
        if (!baked.has(material)) baked.set(material, []);
        baked.get(material)!.push(geometry.clone().applyMatrix4(matrix));
      }

      // Medallón en la clave del dintel: se enciende al cruzar (uno por grado).
      const medallionPos = pos.clone().addScaledVector(this.frame.up, 14.2);
      matrix.compose(medallionPos, quat, scale);
      this.medallions.setMatrixAt(i, matrix);
    }
    this.medallions.instanceMatrix.needsUpdate = true;
    // instanceColor deja encender los medallones uno a uno con 1 sola draw call.
    this.medallions.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(distances.length * 3).fill(0.42), 3,
    );

    for (const [material, parts] of baked) {
      const merged = mergeGeometries(parts, false);
      for (const g of parts) g.dispose();
      if (merged) { group.add(new THREE.Mesh(merged, material)); this.owned.push(merged); }
    }
    group.add(this.medallions);
    // Los arcos van SUELTOS en la escena: su geometría ya está horneada en coordenadas
    // de mundo. Colgarlos de `building` les aplicaría encima la transformación de la
    // estación y acabarían en otro sitio (en three, un segundo `add` reparenta).
    this.scene.add(group);
    this.arches = group;
    this.archLit = 0;
  }

  /** Enciende el medallón del arco recién cruzado. */
  lightArch(index: number): void {
    if (!this.medallions?.instanceColor || index >= this.medallions.count) return;
    const color = this.medallions.instanceColor;
    color.setXYZ(index, 1.0, 0.72, 0.18);
    color.needsUpdate = true;
    this.medallions.material = MEDALLION_ON;
    this.archLit = Math.max(this.archLit, index + 1);
  }

  litArchCount(): number {
    return this.archLit;
  }

  // -----------------------------------------------------------------------------------
  // Gala (§12): solo con 0 desvíos y 0 silbatos.
  // -----------------------------------------------------------------------------------

  startGala(): void {
    if (!this.building || this.fireworks) return;
    this.fireworks = new Fireworks(this.building);
  }

  /** Encarga una bomba que estalle en `delay` segundos (la manda el audio del show). */
  cueFirework(delay: number, strength: number): void {
    this.fireworks?.cue(delay, strength);
  }

  update(dt: number): void {
    this.fireworks?.update(dt);
  }

  isBuilt(): boolean {
    return this.building !== null && this.config !== null;
  }

  dispose(): void {
    for (const root of [this.building, this.arches]) {
      if (!root) continue;
      this.scene.remove(root);
      root.traverse((o) => {
        if (o instanceof THREE.InstancedMesh) o.dispose();
      });
    }
    // Solo lo propio de esta construcción: la geometría del JSON es compartida.
    for (const geometry of this.owned) geometry.dispose();
    for (const material of this.ownedMaterials) material.dispose();
    for (const texture of this.ownedTextures) texture.dispose();
    this.ownedMaterials = [];
    this.ownedTextures = [];
    this.building = null;
    this.arches = null;
    this.fireworks?.dispose();
    this.fireworks = null;
    this.medallions = null;
    this.owned = [];
    this.config = null;
    this.archLit = 0;
  }
}

export { VAULT_DEPTH };
