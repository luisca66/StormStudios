// Aeronaves ambientales por capa (PLAN-AERONAVES-POR-CAPA): UNA a la vez, cruza
// el cilindro como cuerda lejos del jugador y muere fundida en la niebla. Puro
// ambiente — sin radar, sin click, sin colisión. F1–F4: avioneta, jet,
// estratosférico y satélite. Math.random() a propósito: el
// RNG sembrado del mundo no debe consumirse aquí (reproducibilidad de nubes).

import * as THREE from "three";
import { FLYBY, LAYERS, WORLD, layerAtY } from "@/config";

export type FlybyKind = "plane" | "jet" | "strato" | "satellite";

export interface FlybySoundState {
  kind: FlybyKind;
  distance: number;
}

const KIND_BY_LAYER: Partial<Record<number, FlybyKind>> = {
  2: "plane",
  3: "jet",
  4: "strato",
  5: "satellite",
};

class Flyby {
  readonly group = new THREE.Group();
  /** Sub-grupo del modelo: recibe el balanceo sin pelearse con el lookAt. */
  private readonly model = new THREE.Group();
  private readonly prop: THREE.Object3D | null;
  private readonly velocity: THREE.Vector3;
  private readonly disposables: (THREE.BufferGeometry | THREE.Material)[] = [];
  private satelliteBodyMat: THREE.MeshStandardMaterial | null = null;
  private satelliteBeaconMat: THREE.MeshStandardMaterial | null = null;

  constructor(
    readonly kind: FlybyKind,
    from: THREE.Vector3,
    to: THREE.Vector3,
  ) {
    this.prop = this.buildModel(kind);
    this.group.add(this.model);
    this.group.position.copy(from);
    this.group.lookAt(to); // los modelos se construyen con el morro hacia +z
    this.velocity = to.clone().sub(from).normalize().multiplyScalar(FLYBY.speeds[kind]);
  }

  update(dt: number, elapsed: number): void {
    this.group.position.addScaledVector(this.velocity, dt);
    if (this.prop) this.prop.rotation.z += 26 * dt; // hélice
    if (this.kind === "satellite") {
      // Casi horizontal: deriva orbital sobria, con destello especular cada ~4 s.
      this.model.rotation.z = Math.sin(elapsed * 0.18) * 0.02;
      const flash = Math.pow(
        Math.max(0, Math.sin((elapsed * Math.PI * 2) / 4)),
        18,
      );
      if (this.satelliteBodyMat) {
        this.satelliteBodyMat.emissiveIntensity = 0.12 + flash * 1.9;
      }
      if (this.satelliteBeaconMat) {
        const blink = Math.sin((elapsed * Math.PI * 2) / 1.6) > 0.72;
        this.satelliteBeaconMat.emissiveIntensity = blink ? 3.2 : 0.08;
      }
    } else {
      this.model.rotation.z = Math.sin(elapsed * 0.7) * 0.06; // balanceo sutil
    }
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
      case "strato":
        return this.buildStrato();
      case "satellite":
        return this.buildSatellite();
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

  private buildStrato(): null {
    // Avión estratosférico tipo U-2: esbelto, alas MUY largas y delgadas, cola
    // en T, metal oscuro. Estela única fina y larga. 5 meshes + 1 = 6 draw calls.
    const metal = this.mat(0x30343a, 0.45);

    const fusGeo = new THREE.CylinderGeometry(0.28, 0.28, 6, 8);
    fusGeo.rotateX(Math.PI / 2);
    this.mesh(fusGeo, metal);
    const noseGeo = new THREE.ConeGeometry(0.28, 1.2, 8);
    noseGeo.rotateX(Math.PI / 2);
    const nose = this.mesh(noseGeo, metal);
    nose.position.set(0, 0, 3.6);
    const wing = this.mesh(new THREE.BoxGeometry(13, 0.07, 0.9), metal);
    wing.position.set(0, 0.05, 0.2);
    // Cola en T: aleta vertical con el plano horizontal encima.
    const fin = this.mesh(new THREE.BoxGeometry(0.07, 1.1, 0.8), metal);
    fin.position.set(0, 0.6, -2.7);
    const tailplane = this.mesh(new THREE.BoxGeometry(3.2, 0.06, 0.7), metal);
    tailplane.position.set(0, 1.15, -2.7);

    this.buildContrail([0], 0, -3.2, 45, 0.18, 0.7);
    return null;
  }

  private buildSatellite(): null {
    // Satélite low-poly: cuerpo de foil dorado, paneles solares emisivos, antena
    // y baliza. Sin estela ni PointLight. 5 meshes = 5 draw calls.
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      roughness: 0.32,
      metalness: 0.85,
      emissive: 0x5a3300,
      emissiveIntensity: 0.12,
    });
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x24558c,
      roughness: 0.5,
      metalness: 0.35,
      emissive: 0x0a2d66,
      emissiveIntensity: 0.55,
    });
    const antennaMat = this.mat(0xc7c9cc, 0.3);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xff5544,
      roughness: 0.4,
      emissive: 0xff1808,
      emissiveIntensity: 0.08,
    });
    this.disposables.push(bodyMat, panelMat, beaconMat);
    this.satelliteBodyMat = bodyMat;
    this.satelliteBeaconMat = beaconMat;

    this.mesh(new THREE.BoxGeometry(1.5, 1.1, 1.5), bodyMat);
    for (const side of [-1, 1]) {
      const panel = this.mesh(new THREE.BoxGeometry(3.6, 0.08, 1.4), panelMat);
      panel.position.set(side * 2.55, 0, 0);
    }
    const antenna = this.mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6), antennaMat);
    antenna.position.set(0, 1.42, 0);
    const beacon = this.mesh(new THREE.SphereGeometry(0.16, 6, 4), beaconMat);
    beacon.position.set(0, 2.35, 0);
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

  /** Datos mínimos para que audio aplique el SFX y su atenuación por distancia. */
  soundState(playerPos: THREE.Vector3): FlybySoundState | null {
    if (!this.active) return null;
    return {
      kind: this.active.kind,
      distance: this.active.group.position.distanceTo(playerPos),
    };
  }

  private armTimer(): void {
    this.timer = FLYBY.intervalMin + Math.random() * (FLYBY.intervalMax - FLYBY.intervalMin);
  }

  /** Cuerda del cilindro a Y constante, lejos del jugador en vertical. */
  private spawn(kind: FlybyKind, playerPos: THREE.Vector3): void {
    const layer = layerAtY(playerPos.y);
    const band = LAYERS.find((l) => l.num === layer.num) ?? LAYERS[0];
    // Cada pasada sortea si va arriba o abajo y una separación distinta. Se
    // conserva un margen de 10 u respecto a los límites visuales de la capa.
    const yMin = band.yBottom + 10;
    const yMax = band.yTop - 10;
    const roomBelow = playerPos.y - yMin;
    const roomAbove = yMax - playerPos.y;
    const directions: number[] = [];
    if (roomBelow >= FLYBY.yClearance) directions.push(-1);
    if (roomAbove >= FLYBY.yClearance) directions.push(1);
    const sign = directions[Math.floor(Math.random() * directions.length)] ?? 1;
    const available = sign > 0 ? roomAbove : roomBelow;
    const maxOffset = Math.min(FLYBY.yVariationMax, available);
    const offset =
      FLYBY.yClearance + Math.random() * Math.max(0, maxOffset - FLYBY.yClearance);
    const y = THREE.MathUtils.clamp(playerPos.y + sign * offset, yMin, yMax);
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
