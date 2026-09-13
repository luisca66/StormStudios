// cab.ts — Cabina de vapor modelada en Blender 4.5 (art/blender/modelar-cabina.py).
// Diseño propio a partir de las referencias de Luis: frente de caldera rojo óxido con
// latón y remaches, puerta del hogar con brasas, nivel de agua, colector con volantes,
// tuberías de cobre, freno de pedestal crema, cuadrante del inversor y placas de
// manómetros. Las TRES VENTANAS conservan las medidas validadas de la cabina anterior y
// nada cruza la visual ojo→borde inferior del parabrisas.
//
// Blender ya entrega la geometría evaluada y FUSIONADA por material (≈17 draw calls);
// aquí solo se arman los meshes, se reconstruyen los materiales PBR y se animan las
// partes vivas: agujas (1 InstancedMesh), palanca del silbato y el resplandor del hogar.
// Se engancha al ANCLA DEL TREN (swayObject), no a la cámara: al mirar con drag la
// cabina queda fija y ves por las ventanillas.

import * as THREE from "three";
import cabUrl from "./assets/cabina-vapor.json?url";
import { metalEnvironment } from "./metal-env";

interface MeshData {
  material: string;
  position: number[];
  normal: number[];
  color: number[];
  index: number[];
}

interface MaterialData {
  key: string;
  color: string;
  metalness: number;
  roughness: number;
  emissive: string;
  emissiveIntensity: number;
}

interface CabData {
  materials: MaterialData[];
  static: MeshData[];
  glass: MeshData[];
  whistle: { pivot: [number, number, number]; meshes: MeshData[] };
  gauges: Array<{ kind: GaugeKind; radius: number; matrix: number[] }>;
}

/** Qué mide cada manómetro (lo decide el modelo de Blender). */
type GaugeKind = "SPEED" | "PRESSURE" | "STEADY";

export interface CabReadout {
  /** 0–1: velocidad real respecto a la de crucero. */
  speed: number;
  /** 0–1: "presión" — sube en zona muerta, cae mientras hay pregunta. */
  pressure: number;
  /** 0–1: tirón de la palanca del silbato (1 = a fondo). */
  whistlePull: number;
}

// Escala de las carátulas: 270° en sentido horario desde abajo-izquierda (igual que las
// marcas modeladas en Blender: ángulo = 225° − 270°·valor).
const NEEDLE_START = THREE.MathUtils.degToRad(225);
const NEEDLE_SWEEP = THREE.MathUtils.degToRad(270);

const GLASS = new THREE.MeshPhysicalMaterial({
  color: "#d6edf0", transparent: true, opacity: 0.05, roughness: 0.05,
  metalness: 0, depthWrite: false, side: THREE.DoubleSide,
});
const NEEDLE = new THREE.MeshStandardMaterial({ color: "#3a1c12", roughness: 0.4, metalness: 0.3 });

let cabData: Promise<CabData> | null = null;
function loadCabData(): Promise<CabData> {
  return cabData ??= fetch(cabUrl).then((response) => {
    if (!response.ok) throw new Error(`Cabina de vapor: HTTP ${response.status}`);
    return response.json() as Promise<CabData>;
  }).catch((error: unknown) => {
    cabData = null;
    throw error;
  });
}

function buildGeometry(part: MeshData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.color, 3));
  geometry.setIndex(part.index);
  geometry.computeBoundingSphere();
  return geometry;
}

/** Aguja unitaria (radio 1) apuntando a +Y; cada instancia la escala a su carátula. */
function needleGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.045, -0.2);
  shape.lineTo(0.045, -0.2);
  shape.lineTo(0.012, 0.8);
  shape.lineTo(-0.012, 0.8);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  const hub = new THREE.CircleGeometry(0.08, 12).translate(0, 0, 0.001);
  const merged = new THREE.BufferGeometry();
  const positions = [
    ...geometry.getAttribute("position").array,
    ...hub.getAttribute("position").array,
  ];
  const offset = geometry.getAttribute("position").count;
  const indices = [
    ...(geometry.getIndex()?.array ?? []),
    ...Array.from(hub.getIndex()?.array ?? [], (i) => i + offset),
  ];
  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  merged.setIndex(indices);
  merged.computeVertexNormals();
  geometry.dispose();
  hub.dispose();
  return merged;
}

export class Cab {
  readonly group = new THREE.Group();
  /** Se resuelve cuando la geometría de Blender ya está en escena. */
  readonly ready: Promise<void>;

  private needles: THREE.InstancedMesh | null = null;
  private readonly needleBases: THREE.Matrix4[] = [];
  private readonly needleKinds: GaugeKind[] = [];
  private readonly needleValues: number[] = [];
  private whistlePivot: THREE.Object3D | null = null;
  private fire: THREE.MeshStandardMaterial | null = null;
  private fireBase = 0;
  private elapsed = 0;

  private readonly tmpMatrix = new THREE.Matrix4();
  private readonly tmpRotation = new THREE.Matrix4();

  constructor(anchor: THREE.Object3D) {
    this.group.name = "Cabina de vapor · Blender 4.5";
    anchor.add(this.group);
    this.ready = loadCabData().then((data) => this.build(data));
  }

  private build(data: CabData): void {
    const env = metalEnvironment();
    const materials = new Map<string, THREE.MeshStandardMaterial>();
    for (const m of data.materials) {
      const material = new THREE.MeshStandardMaterial({
        color: m.color,
        metalness: m.metalness,
        roughness: m.roughness,
        emissive: m.emissive,
        emissiveIntensity: m.emissiveIntensity,
        vertexColors: true,
        envMap: env,
        envMapIntensity: m.metalness > 0.5 ? 1.1 : 0.35,
      });
      material.name = m.key;
      materials.set(m.key, material);
    }
    const materialFor = (key: string) => materials.get(key) ?? materials.get("iron")!;

    for (const part of data.static) {
      const mesh = new THREE.Mesh(buildGeometry(part), materialFor(part.material));
      mesh.name = part.material;
      this.group.add(mesh);
    }
    this.fire = materials.get("fire") ?? null;
    this.fireBase = this.fire?.emissiveIntensity ?? 0;

    // Los cristales van con el material translúcido de siempre y se pintan al final.
    for (const part of data.glass) {
      const mesh = new THREE.Mesh(buildGeometry(part), GLASS);
      mesh.renderOrder = 1;
      this.group.add(mesh);
    }

    // Palanca del silbato: la geometría llega relativa a su pivote.
    const pivot = new THREE.Object3D();
    pivot.position.fromArray(data.whistle.pivot);
    for (const part of data.whistle.meshes) {
      pivot.add(new THREE.Mesh(buildGeometry(part), materialFor(part.material)));
    }
    this.group.add(pivot);
    this.whistlePivot = pivot;

    // Agujas: una sola InstancedMesh; la base de cada una la fija Blender (centro de la
    // carátula, mirando al maquinista) y aquí solo se escala al radio de su esfera.
    for (const gauge of data.gauges) {
      const base = new THREE.Matrix4().fromArray(gauge.matrix);
      base.multiply(new THREE.Matrix4().makeScale(gauge.radius, gauge.radius, gauge.radius));
      this.needleBases.push(base);
      this.needleKinds.push(gauge.kind);
      this.needleValues.push(0);
    }
    const needles = new THREE.InstancedMesh(needleGeometry(), NEEDLE, this.needleBases.length);
    needles.frustumCulled = false;
    this.group.add(needles);
    this.needles = needles;
    this.applyNeedles();
  }

  /**
   * Anima agujas, palanca y el resplandor del hogar. Los valores llegan ya
   * normalizados: la cabina no sabe de reglas de juego, solo de lecturas.
   */
  update(dt: number, readout: CabReadout): void {
    this.elapsed += dt;
    if (!this.needles) return;

    for (let i = 0; i < this.needleValues.length; i++) {
      const kind = this.needleKinds[i];
      // La aguja "STEADY" solo tiembla: da vida sin fingir que mide algo.
      const target = kind === "SPEED" ? readout.speed
        : kind === "PRESSURE" ? readout.pressure
          : 0.45 + Math.sin(this.elapsed * 0.7 + i) * 0.06;
      // Inercia: una aguja real no salta, y el temblor del tren se nota.
      const jitter = Math.sin(this.elapsed * 11 + i * 2.1) * 0.008 * readout.speed;
      this.needleValues[i] = THREE.MathUtils.lerp(
        this.needleValues[i], THREE.MathUtils.clamp(target + jitter, 0, 1), 1 - Math.exp(-4 * dt),
      );
    }
    this.applyNeedles();

    if (this.whistlePivot) {
      // Positivo en X = la punta viene hacia el maquinista.
      this.whistlePivot.rotation.x = 0.62 * THREE.MathUtils.clamp(readout.whistlePull, 0, 1);
    }
    if (this.fire) {
      // Brasas vivas: dos senos desafinados, nunca un parpadeo periódico evidente.
      const flicker = Math.sin(this.elapsed * 7.3) * 0.12 + Math.sin(this.elapsed * 12.9 + 1.7) * 0.08;
      this.fire.emissiveIntensity = this.fireBase * (0.9 + flicker);
    }
  }

  private applyNeedles(): void {
    if (!this.needles) return;
    for (let i = 0; i < this.needleBases.length; i++) {
      const angle = NEEDLE_START - this.needleValues[i] * NEEDLE_SWEEP;
      // La aguja apunta a +Y: girar (ángulo − 90°) la lleva a la marca correspondiente.
      this.tmpRotation.makeRotationZ(angle - Math.PI / 2);
      this.tmpMatrix.multiplyMatrices(this.needleBases[i], this.tmpRotation);
      this.needles.setMatrixAt(i, this.tmpMatrix);
    }
    this.needles.instanceMatrix.needsUpdate = true;
  }
}
