// station.ts — La Estación Terminal (PLAN §12): "el presupuesto de asombro se gasta
// AQUÍ". Nave de hierro y cristal, dos torres con rosetón de 12 husos, vitral de sol al
// fondo, y los 8 arcos que cantan la escala mayor de la tonalidad del viaje.
//
// La Terminal se planta en un PUNTO FIJO del mundo en cuanto asoma y ya no se mueve:
// crece sola al acercarse el tren, con toda su geometría desde el primer instante. El
// impostor de silueta de §12 se retiró porque hacía lo contrario — iba clavado a una
// distancia fija POR DELANTE del tren y su tamaño palpitaba al recortarse contra el
// final de la vía construida. Todo lo estático se fusiona por material.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { newTrackFrame, type TrackFrame, type TrackManager } from "./track";
import { Fireworks } from "./fireworks";

const UP = new THREE.Vector3(0, 1, 0);
const IRON = new THREE.MeshStandardMaterial({ color: "#2a2622", roughness: 0.62, metalness: 0.55 });
const STONE = new THREE.MeshStandardMaterial({ color: "#c9b184", roughness: 0.9 });
const STONE_DARK = new THREE.MeshStandardMaterial({ color: "#a08b62", roughness: 0.95 });
// Las partes ILUMINADAS ignoran la niebla (`fog: false`). La Terminal se planta a más
// de 1300 u y con la densidad de fog del bioma quedaba tapada al 93 %: invisible. Así
// de lejos se ve el farol encendido en el horizonte —"la estación ES una linterna"
// (§12)— y al acercarse emerge de la bruma el edificio entero. El hierro y la piedra sí
// llevan niebla, que es lo que da la sensación de que aparece.
const GLASS = new THREE.MeshStandardMaterial({
  color: "#ffdca8", emissive: "#ffb960", emissiveIntensity: 1.15,
  roughness: 0.25, transparent: true, opacity: 0.72, side: THREE.DoubleSide,
  fog: false,
});
const LAMP = new THREE.MeshStandardMaterial({
  color: "#ffe6b0", emissive: "#ffc46a", emissiveIntensity: 2.4, roughness: 0.4,
  fog: false,
});
const SPOKE_LIT = new THREE.MeshStandardMaterial({
  color: "#ffe9b8", emissive: "#ffc247", emissiveIntensity: 2.2, roughness: 0.4,
  fog: false,
});
const SPOKE_DARK = new THREE.MeshStandardMaterial({ color: "#4a4238", roughness: 0.9 });
const MEDALLION_OFF = new THREE.MeshStandardMaterial({ color: "#6d6152", roughness: 0.7, metalness: 0.4 });
const MEDALLION_ON = new THREE.MeshStandardMaterial({
  color: "#ffd97a", emissive: "#ffb52e", emissiveIntensity: 2.6, roughness: 0.35,
});

// --- Geometría de la nave ------------------------------------------------------------
// Proporción de nave del XIX: ancha y alta. Con 26 de semiancho la parábola salía
// apuntada y leía a aguja gótica, no a estación.
const VAULT_HALF_WIDTH = 34;
const VAULT_HEIGHT = 62;
const VAULT_DEPTH = 150;
const RIB_COUNT = 13;

/** Arco parabólico de la bóveda: y = H · (1 − (x/W)²). El perfil del XIX. */
function vaultArchPoints(segments: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const x = -VAULT_HALF_WIDTH + (2 * VAULT_HALF_WIDTH * i) / segments;
    const t = x / VAULT_HALF_WIDTH;
    points.push(new THREE.Vector3(x, VAULT_HEIGHT * (1 - t * t), 0));
  }
  return points;
}

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
  private building: THREE.Group | null = null;
  private arches: THREE.Group | null = null;
  private owned: THREE.BufferGeometry[] = [];
  private medallions: THREE.InstancedMesh | null = null;
  private archLit = 0;
  private fireworks: Fireworks | null = null;
  private config: StationConfig | null = null;
  private distance = 0;

  constructor(private readonly scene: THREE.Scene, private readonly track: TrackManager) {}

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
  }

  /** Orienta y coloca el grupo con la cuerda boca→fondo (ver nota en `build`). */
  private placeGroup(group: THREE.Object3D, distance: number): void {
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
    const group = new THREE.Group();
    const owned: THREE.BufferGeometry[] = [];

    this.placeGroup(group, config.distance);

    this.buildVault(group, owned);
    this.buildTowers(group, owned, config.tonicPitchClass);
    this.buildBackdrop(group, owned);
    this.buildPlatforms(group, owned);

    this.scene.add(group);
    this.building = group;
    this.owned = owned;
  }

  /** Bóveda de cañón: costillas parabólicas de hierro y paños de vidrio entre ellas. */
  private buildVault(group: THREE.Group, owned: THREE.BufferGeometry[]): void {
    const ribs: THREE.BufferGeometry[] = [];
    const panes: THREE.BufferGeometry[] = [];
    const arch = vaultArchPoints(26);
    const curve = new THREE.CatmullRomCurve3(arch);

    for (let i = 0; i < RIB_COUNT; i++) {
      const z = -VAULT_DEPTH * (i / (RIB_COUNT - 1));
      const rib = new THREE.TubeGeometry(curve, 40, 0.55, 6, false);
      rib.translate(0, 0, z);
      ribs.push(rib);
      // Paño de vidrio entre esta costilla y la siguiente.
      if (i < RIB_COUNT - 1) {
        const dz = VAULT_DEPTH / (RIB_COUNT - 1);
        const positions: number[] = [];
        const indices: number[] = [];
        for (let k = 0; k < arch.length; k++) {
          const p = arch[k];
          positions.push(p.x, p.y, z, p.x, p.y, z - dz);
          if (k < arch.length - 1) {
            const a = k * 2;
            indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
          }
        }
        const pane = new THREE.BufferGeometry();
        pane.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        pane.setIndex(indices);
        pane.computeVertexNormals();
        panes.push(pane);
      }
      // Montantes verticales de la costilla hasta el suelo.
      for (const side of [-1, 1]) {
        const post = new THREE.CylinderGeometry(0.5, 0.7, 6, 6);
        post.translate(side * VAULT_HALF_WIDTH, 3, z);
        ribs.push(post);
      }
    }

    const ribGeo = mergeGeometries(ribs, false);
    const paneGeo = mergeGeometries(panes, false);
    for (const g of [...ribs, ...panes]) g.dispose();
    if (ribGeo) { group.add(new THREE.Mesh(ribGeo, IRON)); owned.push(ribGeo); }
    if (paneGeo) { group.add(new THREE.Mesh(paneGeo, GLASS)); owned.push(paneGeo); }
  }

  /** Torres de reloj con rosetón de 12 husos: los diatónicos del viaje van encendidos. */
  private buildTowers(group: THREE.Group, owned: THREE.BufferGeometry[], tonic: string): void {
    const shafts: THREE.BufferGeometry[] = [];
    const lit: THREE.BufferGeometry[] = [];
    const dark: THREE.BufferGeometry[] = [];

    const tonicSemitone = semitoneOf(tonic);
    const MAJOR = [0, 2, 4, 5, 7, 9, 11];
    const isDiatonic = (spoke: number): boolean =>
      MAJOR.includes((((spoke - tonicSemitone) % 12) + 12) % 12);

    for (const side of [-1, 1]) {
      const x = side * (VAULT_HALF_WIDTH + 7);
      const shaft = new THREE.BoxGeometry(11, 74, 11).translate(x, 37, -6);
      // Rotar ANTES de trasladar: `rotateY` gira la geometría alrededor del ORIGEN, no
      // de su propio centro. Al revés, el chapitel ya trasladado a x=41 salía despedido
      // a (24.7, 80, −33.2) — se veía delante de su torre en vez de encima.
      const cap = new THREE.ConeGeometry(8.6, 13, 4);
      cap.rotateY(Math.PI / 4);
      cap.translate(x, 80, -6);
      shafts.push(shaft, cap);

      // Rosetón: 12 husos radiales. La rotación del patrón cambia con la tónica, así
      // que cada una de las 15 rutas tiene su reloj (detalle §12, sin una sola letra).
      const faceZ = 1.2;
      const ring = new THREE.TorusGeometry(5.2, 0.45, 6, 24).translate(x, 58, faceZ - 6);
      shafts.push(ring);
      for (let spoke = 0; spoke < 12; spoke++) {
        const angle = (spoke / 12) * Math.PI * 2 - Math.PI / 2;
        const wedge = new THREE.BoxGeometry(0.85, 4.4, 0.35);
        wedge.translate(0, 2.6, 0);
        wedge.rotateZ(-angle - Math.PI / 2);
        wedge.translate(x, 58, faceZ - 6);
        (isDiatonic(spoke) ? lit : dark).push(wedge);
      }
    }

    for (const [parts, material] of [[shafts, STONE], [lit, SPOKE_LIT], [dark, SPOKE_DARK]] as const) {
      const merged = mergeGeometries(parts as THREE.BufferGeometry[], false);
      for (const g of parts as THREE.BufferGeometry[]) g.dispose();
      if (merged) { group.add(new THREE.Mesh(merged, material)); owned.push(merged); }
    }
  }

  /** Vitral de sol al fondo de la nave: lo primero que se ve al entrar. */
  private buildBackdrop(group: THREE.Group, owned: THREE.BufferGeometry[]): void {
    const wallParts = [
      new THREE.BoxGeometry(2 * VAULT_HALF_WIDTH + 8, VAULT_HEIGHT + 8, 2)
        .translate(0, (VAULT_HEIGHT + 8) / 2, -VAULT_DEPTH - 1),
    ];
    const wall = mergeGeometries(wallParts, false);
    for (const g of wallParts) g.dispose();
    if (wall) { group.add(new THREE.Mesh(wall, STONE_DARK)); owned.push(wall); }

    const vitral = new THREE.CircleGeometry(17, 40);
    const mesh = new THREE.Mesh(vitral, new THREE.MeshStandardMaterial({
      map: sunVitralTexture(), emissiveMap: sunVitralTexture(),
      emissive: "#ffffff", emissiveIntensity: 1.5, roughness: 0.6, fog: false,
    }));
    mesh.position.set(0, 34, -VAULT_DEPTH + 0.2);
    group.add(mesh);
    owned.push(vitral);
  }

  private buildPlatforms(group: THREE.Group, owned: THREE.BufferGeometry[]): void {
    const stone: THREE.BufferGeometry[] = [];
    const lamps: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      const x = side * 9.5;
      stone.push(new THREE.BoxGeometry(11, 1.1, VAULT_DEPTH - 6)
        .translate(x, 0.55, -VAULT_DEPTH / 2));
      for (let i = 0; i < 9; i++) {
        const z = -8 - i * ((VAULT_DEPTH - 20) / 8);
        stone.push(new THREE.CylinderGeometry(0.22, 0.28, 5.2, 6).translate(x, 3.7, z));
        lamps.push(new THREE.SphereGeometry(0.62, 8, 6).translate(x, 6.6, z));
      }
    }
    // Tope de vía: el punto exacto donde el viaje termina.
    stone.push(new THREE.BoxGeometry(4.4, 1.6, 1.2).translate(0, 0.8, -VAULT_DEPTH + 8));

    for (const [parts, material] of [[stone, STONE], [lamps, LAMP]] as const) {
      const merged = mergeGeometries(parts as THREE.BufferGeometry[], false);
      for (const g of parts as THREE.BufferGeometry[]) g.dispose();
      if (merged) { group.add(new THREE.Mesh(merged, material)); owned.push(merged); }
    }
  }

  // -----------------------------------------------------------------------------------
  // Los 8 arcos (§12): pórticos sobre la vía, cada uno con su medallón.
  // -----------------------------------------------------------------------------------

  /** @param distances distancia sobre la vía de cada uno de los 8 arcos. */
  buildArches(distances: number[]): void {
    const gate: THREE.BufferGeometry[] = [];
    const group = new THREE.Group();
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);

    this.medallions = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1.15, 1.15, 0.32, 16), MEDALLION_OFF, distances.length,
    );
    this.medallions.frustumCulled = false;

    for (let i = 0; i < distances.length; i++) {
      this.track.frameAt(distances[i], this.frame);
      const pos = this.frame.pos.clone();
      pos.y -= 0.7;
      this.basis.makeBasis(this.frame.right, this.frame.up, this.frame.tan.clone().negate());
      quat.setFromRotationMatrix(this.basis);

      // Pórtico: dos pies y un dintel curvo.
      const portal: THREE.BufferGeometry[] = [];
      for (const side of [-1, 1]) {
        portal.push(new THREE.BoxGeometry(1.0, 11, 1.0).translate(side * 6.2, 5.5, 0));
      }
      const lintelCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-6.2, 11, 0), new THREE.Vector3(0, 14.2, 0), new THREE.Vector3(6.2, 11, 0),
      ]);
      portal.push(new THREE.TubeGeometry(lintelCurve, 16, 0.42, 6, false));
      const merged = mergeGeometries(portal, false);
      for (const g of portal) g.dispose();
      if (merged) {
        merged.applyMatrix4(new THREE.Matrix4().compose(pos, quat, scale));
        gate.push(merged);
      }

      // Medallón en la clave del dintel: se enciende al cruzar (uno por grado).
      const medallionPos = pos.clone().addScaledVector(this.frame.up, 14.2);
      matrix.compose(medallionPos, quat, scale);
      matrix.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      this.medallions.setMatrixAt(i, matrix);
    }
    this.medallions.instanceMatrix.needsUpdate = true;
    // instanceColor deja encender los medallones uno a uno con 1 sola draw call.
    this.medallions.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(distances.length * 3).fill(0.42), 3,
    );

    const gateGeo = mergeGeometries(gate, false);
    for (const g of gate) g.dispose();
    if (gateGeo) { group.add(new THREE.Mesh(gateGeo, IRON)); this.owned.push(gateGeo); }
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
    for (const geometry of this.owned) geometry.dispose();
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
