// Entorno abisal (PLAN §5.1): color/niebla/luz por profundidad, god rays,
// nieve marina, superficie y fondo de la fosa. Sin criaturas (eso es F4).

import * as THREE from "three";
import { DEPTH_KEYFRAMES, WORLD } from "@/config";

const SNOW_COUNT = 1500;
const SNOW_BOX = 120; // cubo centrado en el jugador
const SNOW_FALL_SPEED = 0.5; // u/s hacia abajo (deriva relativa)

export interface DepthState {
  color: THREE.Color;
  fogDensity: number;
  ambient: number;
  sun: number;
}

export class Environment {
  private ambient: THREE.AmbientLight;
  private sun: THREE.DirectionalLight;
  private godRays: THREE.Group;
  private snow: THREE.Points;
  private snowPositions: THREE.BufferAttribute;
  private tmpColorA = new THREE.Color();
  private tmpColorB = new THREE.Color();
  readonly current: DepthState = {
    color: new THREE.Color(DEPTH_KEYFRAMES[0].color),
    fogDensity: DEPTH_KEYFRAMES[0].fogDensity,
    ambient: DEPTH_KEYFRAMES[0].ambient,
    sun: DEPTH_KEYFRAMES[0].sun,
  };

  constructor(private scene: THREE.Scene) {
    scene.fog = new THREE.FogExp2(DEPTH_KEYFRAMES[0].color, DEPTH_KEYFRAMES[0].fogDensity);
    scene.background = new THREE.Color(DEPTH_KEYFRAMES[0].color);

    this.ambient = new THREE.AmbientLight(0xcfe8ff, 1.0);
    scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xeaf6ff, 1.2);
    this.sun.position.set(25, 60, 12);
    scene.add(this.sun);

    this.godRays = this.buildGodRays();
    scene.add(this.godRays);

    const { points, attr } = this.buildSnow();
    this.snow = points;
    this.snowPositions = attr;
    scene.add(this.snow);

    scene.add(this.buildSurface());
    scene.add(this.buildFloor());
    this.buildThermoclines();
  }

  // Termoclinas: discos shimmer en cada frontera de zona (PLAN §5.1).
  // Cerrada = visible; abierta = se disuelve (la barrera física la pone player.depthLimit).
  private thermoclines = new Map<number, { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; open: boolean }>();

  private buildThermoclines(): void {
    for (const zone of [1, 2, 3, 4]) {
      const y = -150 * zone;
      const mat = new THREE.MeshBasicMaterial({
        color: 0x9fdcff,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(120, 40), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = y;
      this.scene.add(mesh);
      this.thermoclines.set(zone, { mesh, mat, open: false });
    }
  }

  setThermoclineOpen(boundaryZone: number, open: boolean): void {
    const tc = this.thermoclines.get(boundaryZone);
    if (tc) tc.open = open;
  }

  // Rayos de sol: solo cerca de la superficie (PLAN: mueren hacia −100).
  private buildGodRays(): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({
      color: 0xbfe8ff,
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 9; i++) {
      const width = 3 + Math.random() * 5;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, 130), material);
      const angle = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 8 + Math.random() * 40;
      plane.position.set(Math.cos(angle) * radius, -55, Math.sin(angle) * radius);
      plane.rotation.y = Math.random() * Math.PI;
      plane.rotation.z = (Math.random() - 0.5) * 0.12; // ligera inclinación
      group.add(plane);
    }
    return group;
  }

  private buildSnow(): { points: THREE.Points; attr: THREE.BufferAttribute } {
    const positions = new Float32Array(SNOW_COUNT * 3);
    for (let i = 0; i < SNOW_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * SNOW_BOX;
      positions[i * 3 + 1] = (Math.random() - 0.5) * SNOW_BOX;
      positions[i * 3 + 2] = (Math.random() - 0.5) * SNOW_BOX;
    }
    const geometry = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(positions, 3);
    geometry.setAttribute("position", attr);
    const material = new THREE.PointsMaterial({
      color: 0xa8cbe8,
      size: 0.22,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    return { points: new THREE.Points(geometry, material), attr };
  }

  // Superficie del agua vista desde abajo.
  private buildSurface(): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(700, 700),
      new THREE.MeshBasicMaterial({
        color: 0xbfe4ff,
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 1.5;
    return mesh;
  }

  // Fondo de la fosa (PLAN §5.1): relieve suave + chimeneas hidrotermales emisivas.
  private buildFloor(): THREE.Group {
    const group = new THREE.Group();

    const geometry = new THREE.PlaneGeometry(500, 500, 72, 72);
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const h =
        Math.sin(x * 0.08) * 2 +
        Math.cos(y * 0.11) * 1.7 +
        Math.sin(x * 0.023 + y * 0.031) * 4;
      pos.setZ(i, h);
    }
    geometry.computeVertexNormals();
    const floor = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: 0x0c1219, roughness: 1, metalness: 0 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = WORLD.bottomY;
    group.add(floor);

    // Chimeneas hidrotermales con brasa naranja.
    const chimneyPositions = [
      [14, 8], [-22, 15], [30, -18], [-12, -26], [4, 34], [-35, -6],
    ] as const;
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x141a20, roughness: 0.95 });
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0x2a1005,
      emissive: 0xff6a2a,
      emissiveIntensity: 1.6,
    });
    for (const [x, z] of chimneyPositions) {
      const height = 10 + Math.random() * 8;
      const body = new THREE.Mesh(new THREE.ConeGeometry(2.4, height, 7), bodyMat);
      body.position.set(x, WORLD.bottomY + height / 2, z);
      group.add(body);

      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), emberMat);
      ember.position.set(x, WORLD.bottomY + height + 0.4, z);
      group.add(ember);

      const light = new THREE.PointLight(0xff7a30, 1.4, 30, 1.6);
      light.position.copy(ember.position).y += 1.5;
      group.add(light);
    }
    return group;
  }

  // Interpola los keyframes §5.1 y aplica a escena/luces.
  applyDepth(y: number): DepthState {
    const kfs = DEPTH_KEYFRAMES;
    const clamped = Math.min(kfs[0].y, Math.max(kfs[kfs.length - 1].y, y));
    let a = kfs[0];
    let b = kfs[kfs.length - 1];
    for (let i = 0; i < kfs.length - 1; i++) {
      if (clamped <= kfs[i].y && clamped >= kfs[i + 1].y) {
        a = kfs[i];
        b = kfs[i + 1];
        break;
      }
    }
    const t = a.y === b.y ? 0 : (a.y - clamped) / (a.y - b.y);

    this.tmpColorA.setHex(a.color);
    this.tmpColorB.setHex(b.color);
    this.current.color.lerpColors(this.tmpColorA, this.tmpColorB, t);
    this.current.fogDensity = a.fogDensity + (b.fogDensity - a.fogDensity) * t;
    this.current.ambient = a.ambient + (b.ambient - a.ambient) * t;
    this.current.sun = a.sun + (b.sun - a.sun) * t;

    const fog = this.scene.fog as THREE.FogExp2;
    fog.color.copy(this.current.color);
    fog.density = this.current.fogDensity;
    (this.scene.background as THREE.Color).copy(this.current.color);
    this.ambient.intensity = this.current.ambient;
    this.sun.intensity = this.current.sun;

    return this.current;
  }

  update(dt: number, playerPos: THREE.Vector3, elapsed: number): void {
    // Rotación lentísima de los god rays.
    this.godRays.rotation.y = elapsed * 0.015;

    // Termoclinas: shimmer suave; al abrirse se disuelven.
    for (const tc of this.thermoclines.values()) {
      const target = tc.open ? 0 : 0.1 + Math.sin(elapsed * 1.3 + tc.mesh.position.y) * 0.05;
      tc.mat.opacity += (target - tc.mat.opacity) * Math.min(1, 2.5 * dt);
    }

    // Nieve marina: cae despacio y se recicla en un cubo alrededor del jugador.
    const arr = this.snowPositions.array as Float32Array;
    const half = SNOW_BOX / 2;
    for (let i = 0; i < SNOW_COUNT; i++) {
      const ix = i * 3;
      arr[ix + 1] -= SNOW_FALL_SPEED * dt;
      for (let axis = 0; axis < 3; axis++) {
        const center =
          axis === 0 ? playerPos.x : axis === 1 ? playerPos.y : playerPos.z;
        let v = arr[ix + axis];
        if (v < center - half) v += SNOW_BOX;
        else if (v > center + half) v -= SNOW_BOX;
        arr[ix + axis] = v;
      }
    }
    this.snowPositions.needsUpdate = true;
  }
}
