// track.ts — La órbita (PLAN §5.1): spline continua por puntos de control con RNG
// sembrado por tonalidad, frames muestreados con distancia acumulada, y streaming de
// chunks de geometría (estela de polvo + boyas de navegación) por delante del cometa.
// F2: sin anillos funcionales (llegan en F6); la ruta es continua.
//
// La ingeniería de la spline se porta del Expreso Tonal (`3d/track.ts`), incluidos sus
// dos arreglos ya pagados: tangente ANALÍTICA (con t+epsilon el rumbo saltaba al cerrar
// cada intervalo) y `ensureReach` separado de `ensureBuilt` (que poda por detrás).

import * as THREE from "three";
import {
  CTRL_POINT_SPACING, TRACK_SAMPLE_SPACING, HEADING_JITTER, LATERAL_WOBBLE,
  VERTICAL_WOBBLE, BANK_CURVATURE_GAIN, CURVE_BANK_DEG, TRAIL_GAUGE,
  BUOY_SPACING, SEGMENTS_AHEAD, SEGMENT_LENGTH, DISPOSE_BEHIND,
} from "@/config";

// LCG sembrado (patrón de la casa, de Batisfera).
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface TrackFrame {
  pos: THREE.Vector3;   // centro de la ruta
  tan: THREE.Vector3;   // tangente unitaria (dirección de viaje)
  right: THREE.Vector3; // hacia la derecha del sentido de marcha
  up: THREE.Vector3;    // arriba SIN roll (el roll lo aplica el cometa)
  bank: number;         // ángulo de roll en radianes (+ = inclina a la derecha)
  dist: number;         // distancia acumulada desde el origen
}

interface Chunk {
  startDist: number;
  endDist: number;
  ribbon: THREE.Mesh;
  buoys: THREE.InstancedMesh;
}

// Catmull-Rom uniforme del tramo P1→P2.
function catmullRom(
  p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3,
  t: number, out: THREE.Vector3,
): THREE.Vector3 {
  const t2 = t * t, t3 = t2 * t;
  out.set(
    0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  );
  return out;
}

// Derivada analítica del Catmull-Rom (ver cabecera: t+epsilon fallaba en t=1).
function catmullRomTangent(
  p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3,
  t: number, out: THREE.Vector3,
): THREE.Vector3 {
  const t2 = t * t;
  out.set(
    0.5 * ((-p0.x + p2.x) + 2 * (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t + 3 * (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t2),
    0.5 * ((-p0.y + p2.y) + 2 * (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t + 3 * (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t2),
    0.5 * ((-p0.z + p2.z) + 2 * (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t + 3 * (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t2),
  );
  return out;
}

// La estela de polvo: dos cintas finas de hielo brillante (el análogo de los rieles) y
// una banda central tenue de polvo. Aditivas, sin luz: el camino se ve porque BRILLA.
const DUST_COLOR = new THREE.Color("#3d5c78");
const ICE_COLOR = new THREE.Color("#bfe9f5");

const ICE_WIDTH = 0.22;
const DUST_WIDTH = 3.2;

export class TrackManager {
  private rng: () => number = makeRng(1);
  private ctrl: THREE.Vector3[] = [];
  private heading = 0;        // 0 = hacia −Z
  private headingVel = 0;
  private yVel = 0;
  private frames: TrackFrame[] = [];
  private builtIntervals = 0;
  private chunks: Chunk[] = [];
  /** Intervalos con frames ya calculados pero SIN geometría todavía. */
  private pendingChunks: Array<[number, number]> = [];

  // Un solo material aditivo para toda la estela: 1 draw call por chunk.
  private ribbonMat = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  private buoyGeo = new THREE.OctahedronGeometry(0.24, 0);
  private buoyMat = new THREE.MeshBasicMaterial({ color: "#e8c65a" });

  constructor(private scene: THREE.Scene) {}

  reset(seed: number): void {
    for (const c of this.chunks) this.disposeChunk(c);
    this.chunks = [];
    this.pendingChunks = [];
    this.frames = [];
    this.ctrl = [];
    this.builtIntervals = 0;
    this.rng = makeRng(seed);
    this.heading = 0;
    this.headingVel = 0;
    this.yVel = 0;
    // Arranque: 4 puntos rectos para un inicio estable (la deriva empieza después).
    for (let i = 0; i < 4; i++) {
      this.ctrl.push(new THREE.Vector3(0, 1.2, -i * CTRL_POINT_SPACING));
    }
    this.ensureBuilt(0);
  }

  /**
   * Extiende la SPLINE hasta `distance` sin construir geometría ni podar nada.
   * Sirve para plantar cosas lejanas (el Perihelio) que necesitan `frameAt` muy por
   * delante del cometa. OJO: no usar `ensureBuilt` para eso — su argumento es la
   * distancia DEL COMETA y con ella poda todo lo que queda atrás.
   */
  ensureReach(distance: number): void {
    while (this.endDistance() < distance) this.extendOneInterval();
  }

  /** Garantiza frames y geometría hasta cometDist + colchón; poda lo ya lejano. */
  ensureBuilt(cometDist: number): void {
    const targetDist = cometDist + SEGMENTS_AHEAD * SEGMENT_LENGTH;
    this.ensureReach(targetDist);
    this.flushChunks(targetDist);
    while (this.chunks.length && this.chunks[0].endDist < cometDist - DISPOSE_BEHIND) {
      this.disposeChunk(this.chunks.shift()!);
    }
  }

  endDistance(): number {
    return this.frames.length ? this.frames[this.frames.length - 1].dist : 0;
  }

  chunkCount(): number {
    return this.chunks.length;
  }

  /** Frame interpolado a una distancia dada (búsqueda binaria + lerp). */
  frameAt(dist: number, out: TrackFrame): void {
    const fs = this.frames;
    const d = Math.max(fs[0].dist, Math.min(dist, fs[fs.length - 1].dist));
    let lo = 0, hi = fs.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (fs[mid].dist <= d) lo = mid;
      else hi = mid;
    }
    const a = fs[lo], b = fs[hi];
    const t = b.dist > a.dist ? (d - a.dist) / (b.dist - a.dist) : 0;
    out.pos.lerpVectors(a.pos, b.pos, t);
    out.tan.lerpVectors(a.tan, b.tan, t).normalize();
    out.right.lerpVectors(a.right, b.right, t).normalize();
    out.up.lerpVectors(a.up, b.up, t).normalize();
    out.bank = a.bank + (b.bank - a.bank) * t;
    out.dist = d;
  }

  // --- generación -----------------------------------------------------------

  private addControlPoint(): void {
    // Deriva suave del rumbo (curvas en S, nunca recta aburrida) y ondulación Y.
    this.headingVel += (this.rng() - 0.5) * HEADING_JITTER;
    this.headingVel *= 0.72; // amortiguación: sin espirales
    this.headingVel = THREE.MathUtils.clamp(this.headingVel, -0.28, 0.28);
    this.heading += this.headingVel;
    // Empuje al corredor: el rumbo global tiende a −Z (evita que la ruta se enrosque).
    this.heading *= 0.94;
    this.heading = THREE.MathUtils.clamp(
      this.heading, -LATERAL_WOBBLE / 40, LATERAL_WOBBLE / 40,
    );

    // En el espacio la ondulación vertical puede ser mayor que en tierra (§5.1): no hay
    // suelo que respetar, y la órbita gana carácter tridimensional.
    this.yVel += (this.rng() - 0.5) * 0.9;
    this.yVel *= 0.72;
    const last = this.ctrl[this.ctrl.length - 1];
    const y = THREE.MathUtils.clamp(last.y + this.yVel, -VERTICAL_WOBBLE, VERTICAL_WOBBLE);

    const dir = new THREE.Vector3(Math.sin(this.heading), 0, -Math.cos(this.heading));
    const next = last.clone().addScaledVector(dir, CTRL_POINT_SPACING);
    next.y = y;
    this.ctrl.push(next);
  }

  private extendOneInterval(): void {
    // El intervalo i usa P[i-1..i+2]; necesitamos un punto extra por delante.
    while (this.ctrl.length < this.builtIntervals + 4) this.addControlPoint();

    const i = this.builtIntervals + 1; // primer intervalo construible: P1→P2
    const [p0, p1, p2, p3] = [
      this.ctrl[i - 1], this.ctrl[i], this.ctrl[i + 1], this.ctrl[i + 2],
    ];

    const startIndex = this.frames.length;
    const approxLen = p1.distanceTo(p2);
    const steps = Math.max(4, Math.ceil(approxLen / TRACK_SAMPLE_SPACING));
    const tangent = new THREE.Vector3();

    let prevDist = startIndex ? this.frames[startIndex - 1].dist : 0;
    let prevPos = startIndex ? this.frames[startIndex - 1].pos : null;
    let prevHeading: number | null = null;

    // El primer intervalo incluye t=0; los siguientes empiezan tras el último frame.
    for (let s = startIndex === 0 ? 0 : 1; s <= steps; s++) {
      const t = s / steps;
      const pos = catmullRom(p0, p1, p2, p3, t, new THREE.Vector3());
      catmullRomTangent(p0, p1, p2, p3, t, tangent);
      if (tangent.lengthSq() < 1e-9) tangent.set(0, 0, -1);
      const tanU = tangent.clone().normalize();

      const right = new THREE.Vector3().crossVectors(tanU, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(right, tanU).normalize();

      const dist = prevPos ? prevDist + pos.distanceTo(prevPos) : 0;

      // Roll por curvatura (Δrumbo / Δdist).
      const headingNow = Math.atan2(tanU.x, -tanU.z);
      let bank = 0;
      if (prevHeading !== null && dist > prevDist) {
        let dh = headingNow - prevHeading;
        if (dh > Math.PI) dh -= 2 * Math.PI;
        if (dh < -Math.PI) dh += 2 * Math.PI;
        const curvature = dh / (dist - prevDist);
        bank = THREE.MathUtils.clamp(
          curvature * BANK_CURVATURE_GAIN * (Math.PI / 180) * 10,
          -THREE.MathUtils.degToRad(CURVE_BANK_DEG),
          THREE.MathUtils.degToRad(CURVE_BANK_DEG),
        );
      }

      this.frames.push({ pos, tan: tanU, right, up, bank, dist });
      prevDist = dist;
      prevPos = pos;
      prevHeading = headingNow;
    }

    // Suaviza el roll (media móvil corta) para que no "salte" entre frames.
    for (let k = Math.max(1, startIndex); k < this.frames.length - 1; k++) {
      this.frames[k].bank =
        (this.frames[k - 1].bank + this.frames[k].bank + this.frames[k + 1].bank) / 3;
    }

    this.pendingChunks.push([startIndex === 0 ? 0 : startIndex - 1, this.frames.length - 1]);
    this.builtIntervals += 1;
  }

  /** Construye la geometría de los intervalos que ya entran en el alcance pedido. */
  private flushChunks(targetDist: number): void {
    while (this.pendingChunks.length
      && this.frames[this.pendingChunks[0][0]].dist <= targetDist) {
      const [from, to] = this.pendingChunks.shift()!;
      this.buildChunk(from, to);
    }
  }

  // --- geometría ------------------------------------------------------------

  private buildChunk(fromIdx: number, toIdx: number): void {
    const frames = this.frames.slice(fromIdx, toIdx + 1);
    if (frames.length < 2) return;

    // Un solo BufferGeometry con vertex colors: polvo central + dos cintas de hielo.
    const ribbons: Array<{ offset: number; width: number; color: THREE.Color; fade: number }> = [
      { offset: 0, width: DUST_WIDTH, color: DUST_COLOR, fade: 0.55 },
      { offset: -TRAIL_GAUGE / 2, width: ICE_WIDTH, color: ICE_COLOR, fade: 1 },
      { offset: TRAIL_GAUGE / 2, width: ICE_WIDTH, color: ICE_COLOR, fade: 1 },
    ];

    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const v = new THREE.Vector3();

    for (const rib of ribbons) {
      const base = positions.length / 3;
      for (const f of frames) {
        const center = v.copy(f.pos).addScaledVector(f.right, rib.offset);
        const half = rib.width / 2;
        positions.push(
          center.x - f.right.x * half, center.y - f.right.y * half, center.z - f.right.z * half,
          center.x + f.right.x * half, center.y + f.right.y * half, center.z + f.right.z * half,
        );
        normals.push(f.up.x, f.up.y, f.up.z, f.up.x, f.up.y, f.up.z);
        const c = rib.color;
        for (let k = 0; k < 2; k++) colors.push(c.r * rib.fade, c.g * rib.fade, c.b * rib.fade);
      }
      for (let k = 0; k < frames.length - 1; k++) {
        const a = base + k * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    const ribbon = new THREE.Mesh(geo, this.ribbonMat);
    ribbon.frustumCulled = true;

    // Boyas de navegación instanciadas: el ritmo visual hipnótico que en el tren daban
    // los postes de telégrafo. Van en pares, a los lados de la estela.
    const startD = frames[0].dist;
    const endD = frames[frames.length - 1].dist;
    const pairs = Math.max(1, Math.floor((endD - startD) / BUOY_SPACING));
    const inst = new THREE.InstancedMesh(this.buoyGeo, this.buoyMat, pairs * 2);
    const m = new THREE.Matrix4();
    const frame = newTrackFrame();
    const basis = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    let n = 0;
    for (let k = 0; k < pairs; k++) {
      const d = startD + (k + 0.5) * BUOY_SPACING;
      this.frameAt(d, frame);
      basis.makeBasis(frame.right, frame.up, frame.tan.clone().negate());
      // Bien apartadas del eje: pasan por la periferia marcando el ritmo, sin
      // meterse en el encuadre donde ocurre el juego.
      for (const side of [-1, 1]) {
        pos.copy(frame.pos)
          .addScaledVector(frame.right, side * 4.6)
          .addScaledVector(frame.up, 0.9);
        m.copy(basis).setPosition(pos);
        inst.setMatrixAt(n++, m);
      }
    }
    inst.instanceMatrix.needsUpdate = true;

    this.scene.add(ribbon, inst);
    this.chunks.push({ startDist: startD, endDist: endD, ribbon, buoys: inst });
  }

  private disposeChunk(c: Chunk): void {
    this.scene.remove(c.ribbon, c.buoys);
    c.ribbon.geometry.dispose();
    c.buoys.dispose();
  }
}

export function newTrackFrame(): TrackFrame {
  return {
    pos: new THREE.Vector3(), tan: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0),
    bank: 0, dist: 0,
  };
}
