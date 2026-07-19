// Aeronaves ambientales por capa (PLAN-AERONAVES-POR-CAPA): UNA a la vez, cruza
// el cilindro como cuerda lejos del jugador y muere fundida en la niebla. Puro
// ambiente — sin radar, sin click, sin colisión. F1: avioneta de hélice (capa 2);
// F2–F4 añadirán jet, estratosférico y satélite. Math.random() a propósito: el
// RNG sembrado del mundo no debe consumirse aquí (reproducibilidad de nubes).

import * as THREE from "three";
import { FLYBY, LAYERS, WORLD, layerAtY } from "@/config";

type FlybyKind = "plane" | "jet" | "strato" | "satellite";

const KIND_BY_LAYER: Partial<Record<number, FlybyKind>> = {
  2: "plane",
  3: "jet",
  // 4: "strato" (F3) · 5: "satellite" (F4)
};

class Flyby {
  readonly group = new THREE.Group();
  /** Sub-grupo del modelo: recibe el balanceo sin pelearse con el lookAt. */
  private readonly model = new THREE.Group();
  private readonly prop: THREE.Object3D | null;
  private readonly velocity: THREE.Vector3;
  private readonly disposables: (THREE.BufferGeometry | THREE.Material)[] = [];

  constructor(kind: FlybyKind, from: THREE.Vector3, to: THREE.Vector3) {
    this.prop = this.buildModel(kind);
    this.group.add(this.model);
    this.group.position.copy(from);
    this.group.lookAt(to); // los modelos se construyen con el morro hacia +z
    this.velocity = to.clone().sub(from).normalize().multiplyScalar(FLYBY.speeds[kind]);
  }

  update(dt: number, elapsed: number): void {
    this.group.position.addScaledVector(this.velocity, dt);
    if (this.prop) this.prop.rotation.z += 26 * dt; // hélice
    this.model.rotation.z = Math.sin(elapsed * 0.7) * 0.06; // balanceo sutil
  }

  get isGone(): boolean {
    const p = this.group.position;
    return Math.hypot(p.x, p.z) > WORLD.radius + FLYBY.edgeMargin + 5;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.group);
    for (const d of this.disposables) d.dispose();
  }

  private mat(color: number, roughness = 0.85): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({ color, roughness });
    this.disposables.push(m);
    return m;
  }

  private mesh(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
    this.disposables.push(geo);
    const m = new THREE.Mesh(geo, mat);
    this.model.add(m);
    return m;
  }

  /** Devuelve el nodo de la hélice si el modelo la tiene. */
  private buildModel(kind: FlybyKind): THREE.Object3D | null {
    switch (kind) {
      case "jet":
        return this.buildJet();
      default:
        return this.buildPlane();
    }
  }

  private buildPlane(): THREE.Object3D {
    // Avioneta de ala alta tipo Cessna: crema + rojo, 6 draw calls.
    const cream = this.mat(0xf3ead7);
    const red = this.mat(0xb5402e);
    const dark = this.mat(0x2a2a2a, 0.6);

    this.mesh(new THREE.BoxGeometry(0.7, 0.7, 3.2), cream); // fuselaje
    const noseGeo = new THREE.ConeGeometry(0.34, 0.7, 6);
    noseGeo.rotateX(Math.PI / 2); // punta hacia +z (morro)
    const nose = this.mesh(noseGeo, red);
    nose.position.set(0, 0, 1.9);
    const wing = this.mesh(new THREE.BoxGeometry(7, 0.1, 1.1), red); // ala alta
    wing.position.set(0, 0.42, 0.35);
    const tailplane = this.mesh(new THREE.BoxGeometry(2.2, 0.07, 0.7), cream);
    tailplane.position.set(0, 0.1, -1.5);
    const fin = this.mesh(new THREE.BoxGeometry(0.07, 0.85, 0.7), red);
    fin.position.set(0, 0.55, -1.5);
    const prop = this.mesh(new THREE.BoxGeometry(0.14, 1.7, 0.06), dark);
    prop.position.set(0, 0, 2.3);
    return prop;
  }

  private buildJet(): null {
    // Jet comercial: fuselaje blanco, alas en flecha, 2 motores + estela doble.
    // 7 meshes + 1 de estela = 8 draw calls mientras está en pantalla.
    const white = this.mat(0xf4f4f0, 0.7);
    const blue = this.mat(0x3a5a8c, 0.7);
    const dark = this.mat(0x2a2a2a, 0.6);

    const fusGeo = new THREE.CylinderGeometry(0.45, 0.45, 5, 8);
    fusGeo.rotateX(Math.PI / 2); // eje a lo largo de z
    this.mesh(fusGeo, white);
    const noseGeo = new THREE.ConeGeometry(0.45, 1.1, 8);
    noseGeo.rotateX(Math.PI / 2); // punta hacia +z
    const nose = this.mesh(noseGeo, white);
    nose.position.set(0, 0, 3.05);
    for (const side of [-1, 1]) {
      const wing = this.mesh(new THREE.BoxGeometry(4.2, 0.1, 1.3), white);
      wing.position.set(side * 2.1, -0.15, -0.2);
      wing.rotation.y = side * 0.42; // flecha hacia atrás
      const engine = this.mesh(new THREE.CylinderGeometry(0.26, 0.26, 1.1, 8), dark);
      engine.geometry.rotateX(Math.PI / 2);
      engine.position.set(side * 1.7, -0.5, 0.4);
    }
    const fin = this.mesh(new THREE.BoxGeometry(0.09, 1.4, 1.1), blue);
    fin.position.set(0, 0.9, -2.3);
    fin.rotation.x = -0.35; // aleta inclinada hacia atrás

    this.buildContrail([-1.7, 1.7], -0.5, -1.0, 30, 0.35, 1.3);
    return null;
  }

  /** Estela: cintas en cruz con alpha por vértice que muere hacia la cola.
   * UN solo mesh para todas (1 draw call); viaja rígida con el grupo. */
  private buildContrail(
    xs: number[],
    y: number,
    zHead: number,
    length: number,
    wHead: number,
    wTail: number,
  ): void {
    const pos: number[] = [];
    const col: number[] = [];
    const quad = (a: number[], b: number[], c: number[], d: number[], aHead: number) => {
      // a-b = borde cabeza (alpha aHead), c-d = borde cola (alpha 0).
      pos.push(...a, ...b, ...c, ...b, ...d, ...c);
      col.push(1, 1, 1, aHead, 1, 1, 1, aHead, 1, 1, 1, 0, 1, 1, 1, aHead, 1, 1, 1, 0, 1, 1, 1, 0);
    };
    const zTail = zHead - length;
    for (const x of xs) {
      // Cinta horizontal + cinta vertical (cruz: visible desde cualquier ángulo).
      quad(
        [x - wHead / 2, y, zHead],
        [x + wHead / 2, y, zHead],
        [x - wTail / 2, y, zTail],
        [x + wTail / 2, y, zTail],
        0.5,
      );
      quad(
        [x, y - wHead / 2, zHead],
        [x, y + wHead / 2, zHead],
        [x, y - wTail / 2, zTail],
        [x, y + wTail / 2, zTail],
        0.5,
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 4));
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.disposables.push(geo, mat);
    this.model.add(new THREE.Mesh(geo, mat));
  }
}

export class FlybyManager {
  private active: Flyby | null = null;
  private timer: number = FLYBY.firstDelay;

  constructor(private scene: THREE.Scene) {}

  update(dt: number, playerPos: THREE.Vector3, elapsed: number): void {
    if (this.active) {
      this.active.update(dt, elapsed);
      if (this.active.isGone) {
        this.active.dispose(this.scene);
        this.active = null;
        this.armTimer();
      }
      return;
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    const kind = KIND_BY_LAYER[layerAtY(playerPos.y).num];
    if (!kind) {
      this.armTimer(); // capa sin aeronave (1, o aún no implementada)
      return;
    }
    this.spawn(kind, playerPos);
  }

  reset(): void {
    if (this.active) {
      this.active.dispose(this.scene);
      this.active = null;
    }
    this.timer = FLYBY.firstDelay;
  }

  private armTimer(): void {
    this.timer = FLYBY.intervalMin + Math.random() * (FLYBY.intervalMax - FLYBY.intervalMin);
  }

  /** Cuerda del cilindro a Y constante, lejos del jugador en vertical. */
  private spawn(kind: FlybyKind, playerPos: THREE.Vector3): void {
    const layer = layerAtY(playerPos.y);
    const band = LAYERS.find((l) => l.num === layer.num) ?? LAYERS[0];
    // Y dentro de la banda, empujada a ≥ yClearance del jugador.
    let y = band.yBottom + 10 + Math.random() * (band.yTop - band.yBottom - 20);
    if (Math.abs(y - playerPos.y) < FLYBY.yClearance) {
      const sign = y >= playerPos.y ? 1 : -1;
      y = THREE.MathUtils.clamp(
        playerPos.y + sign * FLYBY.yClearance,
        band.yBottom + 10,
        band.yTop - 10,
      );
    }
    const r = WORLD.radius + FLYBY.edgeMargin;
    const a = Math.random() * Math.PI * 2;
    const lateral = (Math.random() - 0.5) * 80; // offset ≤ 40 u para variedad
    const from = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    const to = new THREE.Vector3(
      -Math.cos(a) * r - Math.sin(a) * lateral,
      y,
      -Math.sin(a) * r + Math.cos(a) * lateral,
    );
    this.active = new Flyby(kind, from, to);
    this.scene.add(this.active.group);
  }
}
