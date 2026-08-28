// cab.ts — Cabina de metro moderna, copia fiel de la referencia validada por Luis:
// carcasa marfil envolvente, parabrisas panorámico con empaque negro, escritorio de
// acero cepillado en tres cuerpos, puente de instrumentos (pantalla · manómetros ·
// matriz de botones verdes · manómetros · pantalla), micrófono de cuello de ganso,
// mando en T + hongo rojo de emergencia, torres laterales con pasamanos y auricular
// con cable en espiral, y dos limpiaparabrisas colgando del borde superior.
//
// Toda la geometría estática se FUSIONA por material (mergeGeometries): la cabina
// completa cuesta ~14 draw calls. Se engancha al ANCLA DEL TREN (swayObject), no a
// la cámara: al mirar con drag la cabina queda fija y ves por las ventanillas.
// F5 animará agujas/pantallas sin volver a tocar esta composición.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// ---------------------------------------------------------------------------
// Materiales (paleta de la referencia)
// ---------------------------------------------------------------------------
const IVORY = new THREE.MeshStandardMaterial({ color: "#e6e1d3", roughness: 0.55, metalness: 0.05 });
const IVORY_SHADE = new THREE.MeshStandardMaterial({ color: "#d5cfbf", roughness: 0.6, metalness: 0.05 });
const STEEL = new THREE.MeshStandardMaterial({ color: "#b6b9bd", roughness: 0.32, metalness: 0.85 });
const DARK_MATTE = new THREE.MeshStandardMaterial({ color: "#17181a", roughness: 0.7, metalness: 0.1 });
const BLACK_PLASTIC = new THREE.MeshStandardMaterial({ color: "#1c1d20", roughness: 0.5, metalness: 0.2 });
const SCREEN = new THREE.MeshStandardMaterial({
  color: "#0e1518", emissive: "#16323a", emissiveIntensity: 0.6, roughness: 0.25,
});
const GREEN_BTN = new THREE.MeshStandardMaterial({
  color: "#2f9e6e", emissive: "#1d7a4e", emissiveIntensity: 0.5, roughness: 0.4,
});
const AMBER_BTN = new THREE.MeshStandardMaterial({
  color: "#d8a53a", emissive: "#a5741c", emissiveIntensity: 0.35, roughness: 0.4,
});
const RED_BTN = new THREE.MeshStandardMaterial({ color: "#c23a32", roughness: 0.45 });
const WHITE_BTN = new THREE.MeshStandardMaterial({ color: "#e9e7e0", roughness: 0.45 });
const ESTOP_RED = new THREE.MeshStandardMaterial({
  color: "#c8281e", emissive: "#7a120c", emissiveIntensity: 0.3, roughness: 0.35,
});
const CEIL_LIGHT = new THREE.MeshStandardMaterial({
  color: "#f4efe2", emissive: "#f0e8d2", emissiveIntensity: 0.3, roughness: 0.8,
});
const GLASS = new THREE.MeshPhysicalMaterial({
  color: "#d6edf0", transparent: true, opacity: 0.05, roughness: 0.05,
  metalness: 0, depthWrite: false, side: THREE.DoubleSide,
});

// Cara de manómetro: fondo negro y marcas. La AGUJA ya no se pinta en la textura —
// desde F5 es geometría aparte que gira de verdad (ver `needles`).
function gaugeFaceMaterial(): THREE.MeshStandardMaterial {
  const c = document.createElement("canvas");
  c.width = c.height = 96;
  const g = c.getContext("2d")!;
  g.fillStyle = "#101114";
  g.beginPath(); g.arc(48, 48, 46, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#e8e6df"; g.lineWidth = 2.4;
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * 0.75 + (i / 8) * Math.PI * 1.5;
    g.beginPath();
    g.moveTo(48 + Math.cos(a) * 34, 48 + Math.sin(a) * 34);
    g.lineTo(48 + Math.cos(a) * 42, 48 + Math.sin(a) * 42);
    g.stroke();
  }
  // Sector rojo al final de la escala: da lectura al manómetro de "presión".
  g.strokeStyle = "#c8433a"; g.lineWidth = 5;
  g.beginPath(); g.arc(48, 48, 38, Math.PI * 0.75 + Math.PI * 1.5 * 0.82, Math.PI * 2.25);
  g.stroke();
  g.fillStyle = "#e8e6df";
  g.beginPath(); g.arc(48, 48, 3.4, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 });
}
const GAUGE_FACE = gaugeFaceMaterial();
const NEEDLE = new THREE.MeshStandardMaterial({ color: "#f2efe6", roughness: 0.4 });
const BRASS = new THREE.MeshStandardMaterial({ color: "#c9a227", roughness: 0.35, metalness: 0.35 });

// Recorrido de la aguja: 270° útiles, igual que las marcas de la cara.
const NEEDLE_SWEEP = Math.PI * 1.5;
const NEEDLE_ZERO = Math.PI * 0.75;

/** Qué mide cada manómetro. El orden es el de creación en el puente de instrumentos. */
type GaugeKind = "SPEED" | "PRESSURE" | "STEADY";

export interface CabReadout {
  /** 0–1: velocidad real respecto a la de crucero. */
  speed: number;
  /** 0–1: "presión" — sube en zona muerta, cae mientras hay pregunta. */
  pressure: number;
  /** 0–1: tirón de la palanca del silbato (1 = a fondo). */
  whistlePull: number;
}

// ---------------------------------------------------------------------------
// Fusión por material: cada material termina siendo UN mesh
// ---------------------------------------------------------------------------
class MergedBuilder {
  private buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();

  add(
    geo: THREE.BufferGeometry, mat: THREE.Material,
    x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0,
  ): void {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1, 1, 1),
    );
    this.addMatrix(geo, mat, m);
  }

  addMatrix(geo: THREE.BufferGeometry, mat: THREE.Material, matrix: THREE.Matrix4): void {
    geo.applyMatrix4(matrix);
    let list = this.buckets.get(mat);
    if (!list) { list = []; this.buckets.set(mat, list); }
    list.push(geo);
  }

  build(group: THREE.Group): void {
    for (const [mat, geos] of this.buckets) {
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      if (merged) group.add(new THREE.Mesh(merged, mat));
    }
    this.buckets.clear();
  }
}

// Cuadrilátero con esquinas redondeadas (para el hueco del parabrisas y su empaque).
function roundedQuadPath<T extends THREE.Path>(
  path: T, corners: Array<[number, number]>, r: number,
): T {
  const n = corners.length;
  const pt = (i: number) => new THREE.Vector2(corners[(i + n) % n][0], corners[(i + n) % n][1]);
  const startA = pt(0).clone().add(pt(1)).multiplyScalar(0.5);
  path.moveTo(startA.x, startA.y);
  for (let i = 1; i <= n; i++) {
    const corner = pt(i);
    const before = corner.clone().sub(pt(i - 1)).normalize();
    const after = pt(i + 1).clone().sub(corner).normalize();
    const a = corner.clone().sub(before.clone().multiplyScalar(r));
    const b = corner.clone().add(after.clone().multiplyScalar(r));
    path.lineTo(a.x, a.y);
    path.quadraticCurveTo(corner.x, corner.y, b.x, b.y);
  }
  path.closePath();
  return path;
}

// Parabrisas: trapecio suave, apenas más angosto arriba (como la referencia).
const GLASS_Y_BOTTOM = -0.4, GLASS_Y_TOP = 1.22;
const GLASS_HW_BOTTOM = 1.3, GLASS_HW_TOP = 1.22;
const glassCorners = (grow: number): Array<[number, number]> => [
  [-GLASS_HW_BOTTOM - grow, GLASS_Y_BOTTOM - grow],
  [GLASS_HW_BOTTOM + grow, GLASS_Y_BOTTOM - grow],
  [GLASS_HW_TOP + grow, GLASS_Y_TOP + grow],
  [-GLASS_HW_TOP - grow, GLASS_Y_TOP + grow],
];

// Ventanillas laterales: la franja marfil que quedaba entre el parabrisas y el borde de
// la cabina pasa a ser cristal, con el montante delgado como única separación. Misma
// altura y misma inclinación de trapecio que el parabrisas, para que lea panorámico.
const SIDE_IN_BOTTOM = 1.53, SIDE_OUT_BOTTOM = 1.87;
const SIDE_IN_TOP = 1.45, SIDE_OUT_TOP = 1.79;
const SIDE_R = 0.09;
const sideCorners = (s: number, grow: number): Array<[number, number]> => {
  const inB = SIDE_IN_BOTTOM - grow, outB = SIDE_OUT_BOTTOM + grow;
  const inT = SIDE_IN_TOP - grow, outT = SIDE_OUT_TOP + grow;
  const yB = GLASS_Y_BOTTOM - grow, yT = GLASS_Y_TOP + grow;
  // Siempre en el mismo sentido (abajo-izq → abajo-der → arriba-der → arriba-izq).
  return s > 0
    ? [[inB, yB], [outB, yB], [outT, yT], [inT, yT]]
    : [[-outB, yB], [-inB, yB], [-inT, yT], [-outT, yT]];
};

export class Cab {
  readonly group = new THREE.Group();

  // Partes VIVAS (F5). Todo lo demás sigue fusionado y quieto: la composición estática
  // quedó validada por Luis en F2 y no se vuelve a mover.
  private needles: THREE.InstancedMesh | null = null;
  private readonly needleBases: THREE.Matrix4[] = [];
  private readonly needleKinds: GaugeKind[] = [];
  private readonly needleValues: number[] = [];
  private whistlePivot: THREE.Object3D | null = null;
  private elapsed = 0;

  private readonly tmpMatrix = new THREE.Matrix4();
  private readonly tmpRotation = new THREE.Matrix4();

  constructor(anchor: THREE.Object3D) {
    const g = this.group;
    const B = new MergedBuilder();
    const fz = -1.75; // plano del parabrisas

    // ---- Frente: pared marfil con hueco + empaque negro + cristal ----
    // La pared llega a ±2.12 (antes ±1.95): el pilar macizo tapaba el borde del encuadre
    // y al adelgazarlo se abría un hueco al mundo en la esquina extrema.
    const wall = new THREE.Shape();
    wall.moveTo(-2.12, -1.35); wall.lineTo(2.12, -1.35);
    wall.lineTo(2.12, 1.6); wall.lineTo(-2.12, 1.6); wall.closePath();
    wall.holes.push(roundedQuadPath(new THREE.Path(), glassCorners(0), 0.15));
    for (const s of [-1, 1]) {
      wall.holes.push(roundedQuadPath(new THREE.Path(), sideCorners(s, 0), SIDE_R));
    }
    B.add(new THREE.ShapeGeometry(wall, 12), IVORY, 0, 0, fz);

    const gasket = new THREE.Shape();
    roundedQuadPath(gasket, glassCorners(0.05), 0.17);
    gasket.holes.push(roundedQuadPath(new THREE.Path(), glassCorners(0), 0.15));
    B.add(new THREE.ShapeGeometry(gasket, 12), DARK_MATTE, 0, 0, fz + 0.012);
    for (const s of [-1, 1]) {
      const sideGasket = roundedQuadPath(new THREE.Shape(), sideCorners(s, 0.045), SIDE_R + 0.02);
      sideGasket.holes.push(roundedQuadPath(new THREE.Path(), sideCorners(s, 0), SIDE_R));
      B.add(new THREE.ShapeGeometry(sideGasket, 12), DARK_MATTE, 0, 0, fz + 0.012);
    }

    // Los tres cristales van fusionados en un solo mesh: siguen costando 1 draw call.
    const panes = [
      new THREE.ShapeGeometry(roundedQuadPath(new THREE.Shape(), glassCorners(0), 0.15), 12),
      ...[-1, 1].map((s) => new THREE.ShapeGeometry(
        roundedQuadPath(new THREE.Shape(), sideCorners(s, 0), SIDE_R), 12,
      )),
    ];
    const mergedPanes = mergeGeometries(panes, false);
    for (const p of panes) p.dispose();
    if (mergedPanes) {
      const glassMesh = new THREE.Mesh(mergedPanes, GLASS);
      glassMesh.position.z = fz - 0.01;
      glassMesh.renderOrder = 1;
      g.add(glassMesh);
    }

    // ---- Techo: losa, chaflán profundo sobre la ventana, consola central, pods ----
    B.add(new THREE.BoxGeometry(3.9, 0.1, 3.2), IVORY, 0, 1.78, 0.1);
    B.add(new THREE.BoxGeometry(3.9, 0.5, 0.85), IVORY, 0, 1.62, fz + 0.42);
    B.add(new THREE.BoxGeometry(1.6, 0.05, 1.2), CEIL_LIGHT, 0, 1.72, 0.2);
    // Consola de techo centrada, ligeramente inclinada hacia el maquinista.
    B.add(new THREE.BoxGeometry(1.4, 0.2, 0.5), IVORY_SHADE, 0, 1.32, fz + 0.75, 0.12);
    B.add(new THREE.BoxGeometry(1.3, 0.12, 0.02), DARK_MATTE, 0, 1.28, fz + 0.51, 0.12);
    // Banda-visera oscura sobre el cristal.
    B.add(new THREE.BoxGeometry(2.1, 0.14, 0.05), DARK_MATTE, 0, 1.34, fz + 0.15);
    // Pods redondeados donde el techo envuelve a las esquinas.
    for (const s of [-1, 1]) {
      const pod = new THREE.SphereGeometry(1, 14, 10);
      B.add(pod.scale(0.28, 0.18, 0.35), IVORY_SHADE, s * 1.55, 1.42, fz + 0.75);
    }

    // ---- Pilares A y costados marfil ----
    for (const s of [-1, 1]) {
      // Montante entre parabrisas y ventanilla lateral. Antes era un bloque de 0.34×0.5
      // en x=±1.62: al estar medio metro por delante del cristal y tan cerca del ojo, su
      // cara interior se proyectaba tapando TODA la franja lateral. Ahora es un montante
      // plano pegado al plano del parabrisas, con la misma inclinación del trapecio.
      B.add(new THREE.BoxGeometry(0.18, 2.4, 0.09), IVORY, s * 1.41, 0.35, fz + 0.055, 0, 0, s * 0.06);
      B.add(new THREE.BoxGeometry(0.12, 1.3, 2.4), IVORY_SHADE, s * 1.85, -0.75, -0.3);
    }

    // ---- Torres laterales con pasamanos de acero (y auricular a la izquierda) ----
    for (const s of [-1, 1]) {
      B.add(new THREE.BoxGeometry(0.55, 1.7, 1.0), IVORY, s * 1.66, -0.55, -0.15, 0, -s * 0.3, 0);
      // Pasamanos: vertical + codo superior + 2 soportes.
      B.add(new THREE.CylinderGeometry(0.032, 0.032, 1.0, 10), STEEL, s * 1.38, -0.2, -0.45);
      B.add(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 10), STEEL, s * 1.47, 0.3, -0.45, 0, 0, Math.PI / 2);
      for (const y of [-0.6, 0.18]) {
        B.add(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8), STEEL, s * 1.45, y, -0.45, 0, 0, Math.PI / 2);
      }
    }
    // Auricular con cable en espiral (solo torre izquierda, como la referencia).
    B.add(new THREE.BoxGeometry(0.07, 0.2, 0.045), BLACK_PLASTIC, -1.3, 0.02, -0.3, 0, 0.4, 0.3);
    const coil = new THREE.CatmullRomCurve3(
      Array.from({ length: 22 }, (_, i) => {
        const t = i / 21;
        const a = t * Math.PI * 7;
        return new THREE.Vector3(
          -1.32 + Math.cos(a) * 0.03, -0.08 - t * 0.42, -0.32 + Math.sin(a) * 0.03,
        );
      }),
    );
    B.add(new THREE.TubeGeometry(coil, 44, 0.008, 6), BLACK_PLASTIC);

    // ---- Escritorio: tres cuerpos de acero cepillado + faldones marfil ----
    const deskY = -0.535;
    B.add(new THREE.BoxGeometry(1.7, 0.07, 0.78), STEEL, 0, deskY, fz + 0.62);
    B.add(new THREE.BoxGeometry(1.7, 0.75, 0.66), IVORY_SHADE, 0, -0.95, fz + 0.58);
    for (const s of [-1, 1]) {
      B.add(new THREE.BoxGeometry(1.25, 0.07, 0.72), STEEL, s * 1.28, deskY, fz + 0.95, 0, -s * 0.55, 0);
      B.add(new THREE.BoxGeometry(1.2, 0.75, 0.6), IVORY_SHADE, s * 1.26, -0.95, fz + 0.92, 0, -s * 0.55, 0);
    }
    // Hueco de rodillas oscuro con placa de registro de acero y 4 tornillos.
    B.add(new THREE.BoxGeometry(0.75, 0.62, 0.5), DARK_MATTE, 0, -1.02, fz + 0.93);
    B.add(new THREE.BoxGeometry(0.5, 0.45, 0.02), STEEL, 0, -1.0, fz + 1.19);
    for (const [sx, sy] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
      B.add(new THREE.CylinderGeometry(0.012, 0.012, 0.015, 6), DARK_MATTE,
        sx * 0.2, -1.0 + sy * 0.17, fz + 1.21, Math.PI / 2);
    }

    // ---- Puente de instrumentos (inclinado hacia el maquinista) ----
    const tilt = -0.42;
    const panelY = -0.33, panelZ = fz + 0.42;
    const panel = (x: number, yaw = 0, z = panelZ, y = panelY): THREE.Matrix4 =>
      new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, yaw, 0)),
        new THREE.Vector3(1, 1, 1),
      );

    const onPanel = (
      m: THREE.Matrix4, geo: THREE.BufferGeometry, mat: THREE.Material,
      lx: number, ly: number, lz: number, lrx = 0,
    ) => {
      const local = new THREE.Matrix4().compose(
        new THREE.Vector3(lx, ly, lz),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(lrx, 0, 0)),
        new THREE.Vector3(1, 1, 1),
      );
      B.addMatrix(geo, mat, m.clone().multiply(local));
    };

    // Pantallas izquierda y derecha (bisel negro + pantalla emisiva).
    for (const [x, yaw] of [[-0.82, 0.18], [0.88, -0.18]] as const) {
      const m = panel(x, yaw);
      B.addMatrix(new THREE.BoxGeometry(0.6, 0.42, 0.05), BLACK_PLASTIC, m.clone());
      onPanel(m, new THREE.PlaneGeometry(0.5, 0.32), SCREEN, 0, 0, 0.028);
    }
    // Pantalla pequeña del ala derecha, muy girada hacia el centro.
    {
      const m = panel(1.42, -0.52, fz + 0.72, -0.36);
      B.addMatrix(new THREE.BoxGeometry(0.5, 0.36, 0.05), BLACK_PLASTIC, m.clone());
      onPanel(m, new THREE.PlaneGeometry(0.4, 0.27), SCREEN, 0, 0, 0.028);
    }

    // Placa de manómetros A: 2 arriba + 3 abajo (caras negras, biseles de acero).
    // Cada llamada guarda además la base de su aguja para animarla en `update`.
    const gaugeAt = (m: THREE.Matrix4, lx: number, ly: number, kind: GaugeKind) => {
      onPanel(m, new THREE.CylinderGeometry(0.06, 0.06, 0.025, 16), STEEL, lx, ly, 0.028, Math.PI / 2);
      onPanel(m, new THREE.CircleGeometry(0.05, 16), GAUGE_FACE, lx, ly, 0.045);
      this.needleBases.push(
        m.clone().multiply(new THREE.Matrix4().makeTranslation(lx, ly, 0.052)),
      );
      this.needleKinds.push(kind);
      this.needleValues.push(0);
    };
    {
      const m = panel(-0.3);
      B.addMatrix(new THREE.BoxGeometry(0.52, 0.36, 0.04), STEEL, m.clone());
      gaugeAt(m, -0.1, 0.09, "SPEED"); gaugeAt(m, 0.08, 0.09, "PRESSURE");
      gaugeAt(m, -0.16, -0.07, "STEADY"); gaugeAt(m, 0, -0.07, "PRESSURE");
      gaugeAt(m, 0.16, -0.07, "STEADY");
    }
    // Matriz de botones verdes (4×3) + fila ámbar.
    {
      const m = panel(0.12);
      B.addMatrix(new THREE.BoxGeometry(0.34, 0.3, 0.04), DARK_MATTE, m.clone());
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          const mat = row === 2 && col > 0 ? AMBER_BTN : GREEN_BTN;
          onPanel(m, new THREE.BoxGeometry(0.045, 0.045, 0.02), mat,
            -0.105 + col * 0.07, 0.08 - row * 0.075, 0.028);
        }
      }
    }
    // Placa de manómetros B: 2 lado a lado.
    {
      const m = panel(0.45);
      B.addMatrix(new THREE.BoxGeometry(0.3, 0.36, 0.04), STEEL, m.clone());
      gaugeAt(m, -0.07, 0.02, "SPEED"); gaugeAt(m, 0.07, 0.02, "PRESSURE");
    }

    // ---- Micrófono de cuello de ganso (centro del escritorio) ----
    B.add(new THREE.CylinderGeometry(0.05, 0.06, 0.025, 12), BLACK_PLASTIC, 0.02, -0.46, fz + 0.78);
    const neck = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, -0.46, fz + 0.78),
      new THREE.Vector3(0.02, -0.28, fz + 0.74),
      new THREE.Vector3(0.0, -0.12, fz + 0.72),
      new THREE.Vector3(0.0, -0.03, fz + 0.75),
    ]);
    B.add(new THREE.TubeGeometry(neck, 20, 0.011, 6), BLACK_PLASTIC);
    B.add(new THREE.CylinderGeometry(0.026, 0.03, 0.08, 10), BLACK_PLASTIC, 0, -0.01, fz + 0.76, 0.5);

    // ---- Mando maestro en T + hongo rojo de emergencia (centro-derecha) ----
    B.add(new THREE.BoxGeometry(0.3, 0.05, 0.36), STEEL, 0.55, -0.47, fz + 0.8);
    B.add(new THREE.BoxGeometry(0.05, 0.012, 0.24), DARK_MATTE, 0.55, -0.443, fz + 0.8);
    B.add(new THREE.CylinderGeometry(0.024, 0.028, 0.3, 10), BLACK_PLASTIC, 0.55, -0.32, fz + 0.85, -0.45);
    B.add(new THREE.CylinderGeometry(0.032, 0.032, 0.17, 10), BLACK_PLASTIC, 0.55, -0.185, fz + 0.91, 0, 0, Math.PI / 2);
    B.add(new THREE.CylinderGeometry(0.055, 0.06, 0.03, 14), STEEL, 0.95, -0.45, fz + 0.72);
    B.add(new THREE.CylinderGeometry(0.062, 0.055, 0.045, 14), ESTOP_RED, 0.95, -0.415, fz + 0.72);

    // ---- Botonería de las alas (verde/rojo/blanco + basculantes y rotativo) ----
    const wingMatrix = (s: number) => new THREE.Matrix4().compose(
      new THREE.Vector3(s * 1.28, deskY + 0.035, fz + 0.95),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -s * 0.55, 0)),
      new THREE.Vector3(1, 1, 1),
    );
    const BTN_MATS = [GREEN_BTN, RED_BTN, WHITE_BTN, GREEN_BTN, BLACK_PLASTIC];
    for (const s of [-1, 1]) {
      const wm = wingMatrix(s);
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 5; col++) {
          if (s === 1 && col === 4) continue; // el ala derecha cede sitio al rotativo
          const local = new THREE.Matrix4().makeTranslation(
            -0.32 + col * 0.16, 0.012, -0.16 + row * 0.24,
          );
          B.addMatrix(
            new THREE.CylinderGeometry(0.028, 0.032, 0.022, 10),
            BTN_MATS[(row * 5 + col + (s === 1 ? 2 : 0)) % BTN_MATS.length],
            wm.clone().multiply(local),
          );
        }
      }
      // Basculantes (izquierda) / rotativo (derecha).
      if (s === -1) {
        for (let i = 0; i < 3; i++) {
          const local = new THREE.Matrix4().compose(
            new THREE.Vector3(0.18 + i * 0.09, 0.02, 0.05),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0, 0)),
            new THREE.Vector3(1, 1, 1),
          );
          B.addMatrix(new THREE.BoxGeometry(0.05, 0.02, 0.035), BLACK_PLASTIC, wm.clone().multiply(local));
        }
      } else {
        const local = new THREE.Matrix4().makeTranslation(0.34, 0.02, -0.05);
        B.addMatrix(new THREE.CylinderGeometry(0.04, 0.045, 0.03, 12), BLACK_PLASTIC, wm.clone().multiply(local));
        B.addMatrix(new THREE.BoxGeometry(0.02, 0.02, 0.07), WHITE_BTN,
          wm.clone().multiply(new THREE.Matrix4().makeTranslation(0.34, 0.038, -0.05)));
      }
    }

    // ---- Limpiaparabrisas colgando del borde superior (como en la foto) ----
    for (const [x, lean] of [[-0.5, 0.05], [0.85, -0.05]] as const) {
      B.add(new THREE.BoxGeometry(0.022, 0.72, 0.018), DARK_MATTE, x, 0.86, fz + 0.03, 0, 0, lean);
      B.add(new THREE.BoxGeometry(0.04, 0.55, 0.012), DARK_MATTE, x + 0.035, 0.8, fz + 0.022, 0, 0, lean);
    }

    // ---- Piso ----
    B.add(new THREE.BoxGeometry(3.6, 0.06, 3.2), DARK_MATTE, 0, -1.62, -0.2);

    B.build(g);

    // ---- Partes vivas (fuera del merge, porque se mueven) ----
    this.buildNeedles(g);
    this.buildWhistleLever(g);

    anchor.add(g);
  }

  /** Las 7 agujas son UN InstancedMesh: giran por matriz, cuestan 1 draw call. */
  private buildNeedles(g: THREE.Group): void {
    const geometry = new THREE.BoxGeometry(0.008, 0.044, 0.005).translate(0, 0.022, 0);
    const mesh = new THREE.InstancedMesh(geometry, NEEDLE, this.needleBases.length);
    mesh.frustumCulled = false;
    g.add(mesh);
    this.needles = mesh;
    this.applyNeedles();
  }

  /**
   * Palanca del silbato: latón, en el ala izquierda del escritorio, al alcance de la
   * mano libre. Se tira hacia el maquinista al usar el silbato-tónica (PLAN §6).
   */
  private buildWhistleLever(g: THREE.Group): void {
    const fz = -1.75;
    const mount = new THREE.Group();
    mount.position.set(-0.92, -0.47, fz + 0.74);
    mount.rotation.y = 0.55; // sigue el ángulo del ala

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, 0.03, 12), BRASS);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 10), STEEL);
    collar.position.y = 0.03;
    mount.add(base, collar);

    const pivot = new THREE.Object3D();
    pivot.position.y = 0.045;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.017, 0.24, 8), BRASS);
    arm.position.y = 0.12;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), BRASS);
    knob.position.y = 0.25;
    pivot.add(arm, knob);
    mount.add(pivot);

    g.add(mount);
    this.whistlePivot = pivot;
  }

  /**
   * Anima agujas, palanca y el latido de las pantallas. Los valores llegan ya
   * normalizados: la cabina no sabe de reglas de juego, solo de lecturas.
   */
  update(dt: number, readout: CabReadout): void {
    this.elapsed += dt;

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
      this.whistlePivot.rotation.x = -0.62 * THREE.MathUtils.clamp(readout.whistlePull, 0, 1);
    }
    // Latido tenue de las pantallas (material compartido: late el conjunto).
    SCREEN.emissiveIntensity = 0.55 + Math.sin(this.elapsed * 1.6) * 0.06;
  }

  private applyNeedles(): void {
    if (!this.needles) return;
    for (let i = 0; i < this.needleBases.length; i++) {
      const angle = NEEDLE_ZERO + this.needleValues[i] * NEEDLE_SWEEP;
      // La cara se dibuja en canvas (Y hacia abajo) y la aguja vive en 3D (Y arriba):
      // este atan2 es la conversión entre ambos sistemas.
      this.tmpRotation.makeRotationZ(Math.atan2(-Math.cos(angle), -Math.sin(angle)));
      this.tmpMatrix.multiplyMatrices(this.needleBases[i], this.tmpRotation);
      this.needles.setMatrixAt(i, this.tmpMatrix);
    }
    this.needles.instanceMatrix.needsUpdate = true;
  }
}
