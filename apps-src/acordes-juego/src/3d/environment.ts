// Entorno abisal (PLAN §5.1): color/niebla/luz por profundidad, god rays,
// nieve marina, superficie y fondo de la fosa. Sin criaturas (eso es F4).
// H3 (PLAN-HITOS-2): pared de la fosa, decorado por zona y balizas de expedición.

import * as THREE from "three";
import { DEPTH_KEYFRAMES, WORLD, ZONES, FAMILY_GLOW, depthMeters } from "@/config";
import { SPECIES } from "./creatures/species";
import type { CreatureVisual } from "./creatures/base";

const SNOW_COUNT = 1500;
const SNOW_BOX = 120; // cubo centrado en el jugador
const SNOW_FALL_SPEED = 0.5; // u/s hacia abajo (deriva relativa)

// RNG sembrado (LCG): el mundo decorado es idéntico entre sesiones — importante
// como referencia espacial para el jugador y para QA.
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function cssColor(hex: number, alpha: number): string {
  return `rgba(${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255},${alpha})`;
}

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

    // H3: referencias en la oscuridad (pared, decorado por zona, balizas).
    const rng = makeRng(20260712);
    this.buildTrenchWall(rng);
    this.buildLandmarks(rng);
    this.buildBeacons(rng);
  }

  // ---------- H3: estado animado del decorado ----------
  private rockMat = new THREE.MeshStandardMaterial({ color: 0x101820, roughness: 1, metalness: 0 });
  private columns: { attr: THREE.BufferAttribute; yTop: number; yBottom: number; speed: number }[] = [];
  private beacons: { lampMat: THREE.MeshBasicMaterial; haloMat: THREE.SpriteMaterial; phase: number }[] = [];
  private anemoneMat: THREE.MeshStandardMaterial | null = null;
  private decoJellies: { visual: CreatureVisual; baseY: number; phase: number }[] = [];
  private beaconHaloTex: THREE.CanvasTexture | null = null;

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

  // ---------- H3a. Pared de la fosa: el cilindro del mundo hecho roca visible ----------
  private buildTrenchWall(rng: () => number): void {
    const geo = new THREE.CylinderGeometry(WORLD.radius + 6, WORLD.radius + 6, 750, 48, 24, true);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const a = Math.atan2(z, x);
      const bump =
        Math.sin(a * 6 + y * 0.045) * 2.2 +
        Math.cos(a * 13 - y * 0.02) * 1.4 +
        Math.sin(y * 0.11 + a * 2) * 1.6;
      // bump acotado por abajo: la roca nunca invade el clamp del jugador (radio 90).
      const r = WORLD.radius + 6 + Math.max(-2.5, bump);
      pos.setX(i, Math.cos(a) * r);
      pos.setZ(i, Math.sin(a) * r);
    }
    geo.computeVertexNormals();
    const wall = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: 0x0d151d, roughness: 1, metalness: 0, side: THREE.BackSide }),
    );
    wall.position.y = -375;
    this.scene.add(wall);
    this.scene.add(this.buildWallVeins(rng));
    this.buildPinnacles(rng);
  }

  // Vetas emisivas en la pared: textura procedural (una vez); alpha crece con la
  // profundidad (nada arriba de −300 → plena abajo), color = FAMILY_GLOW por zona.
  private buildWallVeins(rng: () => number): THREE.Mesh {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const yStartPx = (300 / 750) * 512; // fila del canvas que corresponde a −300
    for (let line = 0; line < 30; line++) {
      let x = 12 + rng() * 488;
      let y = yStartPx + rng() * 120;
      ctx.lineWidth = 1.5 + rng() * 2;
      while (y < 512) {
        const ny = y + 10 + rng() * 18;
        const nx = Math.min(500, Math.max(12, x + (rng() - 0.5) * 16));
        const zone = ZONES[Math.min(4, Math.floor((y / 512) * 5))];
        const alpha = Math.min(1, (y - yStartPx) / (512 - yStartPx) + 0.15);
        ctx.strokeStyle = cssColor(FAMILY_GLOW[zone.families[0]], alpha);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        x = nx;
        y = ny;
      }
    }
    const veins = new THREE.Mesh(
      new THREE.CylinderGeometry(WORLD.radius + 4.5, WORLD.radius + 4.5, 750, 48, 1, true),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    veins.position.y = -375;
    return veins;
  }

  // Zona 5: anillo de pináculos altos cerca de la pared (estrechan visualmente).
  private buildPinnacles(rng: () => number): void {
    const mesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1, 1, 6),
      new THREE.MeshStandardMaterial({ color: 0x0b1118, roughness: 1 }),
      12,
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 12; i++) {
      const a = rng() * Math.PI * 2;
      const r = 58 + rng() * 24;
      const h = 40 + rng() * 45;
      dummy.position.set(Math.cos(a) * r, WORLD.bottomY + h / 2, Math.sin(a) * r);
      dummy.scale.set(3 + rng() * 3, h, 3 + rng() * 3);
      dummy.rotation.y = rng() * Math.PI;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    this.scene.add(mesh);
  }

  // ---------- H3b. Decoración por zona (estática, construida una vez) ----------
  private buildLandmarks(rng: () => number): void {
    this.buildBubbleColumns(rng); // z1
    this.buildShipwreck(rng); // z1
    this.buildArches(rng); // z2
    this.buildDecoJellies(rng); // z2
    this.buildCoralGarden(rng); // z3
    this.buildWhaleFall(rng); // z4
    this.buildAnemones(rng); // z4
    this.buildVentColumns(rng); // z5
  }

  // Columna de partículas ascendentes (burbujas z1 / venteos z5), reciclada en Y.
  private addRisingColumn(
    x: number, z: number, yBottom: number, yTop: number, count: number,
    color: number, size: number, speed: number, radius: number, rng: () => number,
  ): void {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2;
      const rr = rng() * radius;
      positions[i * 3] = x + Math.cos(a) * rr;
      positions[i * 3 + 1] = yBottom + rng() * (yTop - yBottom);
      positions[i * 3 + 2] = z + Math.sin(a) * rr;
    }
    const geo = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(positions, 3);
    geo.setAttribute("position", attr);
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color, size, sizeAttenuation: true, transparent: true, opacity: 0.7,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    this.scene.add(points);
    this.columns.push({ attr, yTop, yBottom, speed });
  }

  private buildBubbleColumns(rng: () => number): void {
    for (let i = 0; i < 3; i++) {
      const a = rng() * Math.PI * 2;
      const r = 30 + rng() * 40;
      this.addRisingColumn(Math.cos(a) * r, Math.sin(a) * r, -142, -2, 40, 0xbfe4ff, 0.4, 3, 1.6, rng);
    }
  }

  // Silueta de barco hundido a lo lejos, escorado contra la pared (z1).
  private buildShipwreck(rng: () => number): void {
    const ship = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x0a0f14, roughness: 1 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.2, 20), mat);
    ship.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5, 4), mat);
    bow.rotation.x = Math.PI / 2;
    bow.position.set(0, 0, 12.4);
    ship.add(bow);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.1, 5), mat);
    cabin.position.set(0, 2.6, -3);
    ship.add(cabin);
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 3.2, 8), mat);
    funnel.position.set(0, 4.2, -0.5);
    ship.add(funnel);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9, 5), mat);
    mast.position.set(0, 5.5, 5.5);
    ship.add(mast);
    const a = rng() * Math.PI * 2;
    ship.position.set(Math.cos(a) * 84, -136, Math.sin(a) * 84); // semienterrado en la pared
    ship.rotation.set(0.08, rng() * Math.PI * 2, 0.32);
    this.scene.add(ship);
  }

  // Arcos rocosos (z2): toros parciales deformados, de pie, cerca de la pared.
  private buildArches(rng: () => number): void {
    for (let i = 0; i < 4; i++) {
      const arc = Math.PI * (0.65 + rng() * 0.25);
      const geo = new THREE.TorusGeometry(8 + rng() * 6, 1.4 + rng() * 0.8, 7, 18, arc);
      const pos = geo.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        pos.setXYZ(
          v,
          pos.getX(v) + (rng() - 0.5) * 0.5,
          pos.getY(v) + (rng() - 0.5) * 0.5,
          pos.getZ(v) + (rng() - 0.5) * 0.5,
        );
      }
      geo.computeVertexNormals();
      const archMesh = new THREE.Mesh(geo, this.rockMat);
      const a = rng() * Math.PI * 2;
      const r = 55 + rng() * 25;
      archMesh.position.set(Math.cos(a) * r, -175 - rng() * 100, Math.sin(a) * r);
      archMesh.rotation.z = Math.PI / 2 - arc / 2; // arco centrado arriba, patas abajo
      archMesh.rotation.y = rng() * Math.PI * 2;
      this.scene.add(archMesh);
    }
  }

  // Medusas decorativas (z2): reusa la fábrica visual SIN Creature → sin clickSphere
  // ni blip de sonar. Tinte pálido para no confundirse con los colores de familia.
  private buildDecoJellies(rng: () => number): void {
    const build = SPECIES[0].build; // buildJellyfish
    for (let i = 0; i < 5; i++) {
      const visual = build(0x8ea6c8);
      const a = rng() * Math.PI * 2;
      const r = 55 + rng() * 28;
      const baseY = -170 - rng() * 115;
      visual.group.position.set(Math.cos(a) * r, baseY, Math.sin(a) * r);
      visual.group.scale.setScalar(1.2 + rng() * 0.6);
      this.scene.add(visual.group);
      this.decoJellies.push({ visual, baseY, phase: rng() * Math.PI * 2 });
    }
  }

  // Jardín de corales bioluminiscentes (z3): ramas instanciadas saliendo de la pared
  // hacia el centro, con puntas ámbar tenues (visibles sin luz).
  private buildCoralGarden(rng: () => number): void {
    const COUNT = 45;
    const branches = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.35, 4.5, 5),
      new THREE.MeshStandardMaterial({ color: 0x152430, roughness: 0.9 }),
      COUNT,
    );
    const tips = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.22, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xcc8f3f }),
      COUNT,
    );
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    const patches = Array.from({ length: 6 }, () => ({ a: rng() * Math.PI * 2, y: -320 - rng() * 110 }));
    for (let i = 0; i < COUNT; i++) {
      const p = patches[i % patches.length];
      const a = p.a + (rng() - 0.5) * 0.12;
      const base = new THREE.Vector3(
        Math.cos(a) * (WORLD.radius + 4),
        p.y + (rng() - 0.5) * 9,
        Math.sin(a) * (WORLD.radius + 4),
      );
      dir.set(-Math.cos(a), (rng() - 0.5) * 0.9, -Math.sin(a)).normalize();
      const s = 0.8 + rng() * 0.5;
      dummy.quaternion.setFromUnitVectors(up, dir);
      dummy.position.copy(base).addScaledVector(dir, 2.25 * s);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      branches.setMatrixAt(i, dummy.matrix);
      dummy.position.copy(base).addScaledVector(dir, 4.4 * s);
      dummy.quaternion.identity();
      dummy.updateMatrix();
      tips.setMatrixAt(i, dummy.matrix);
    }
    this.scene.add(branches, tips);
  }

  // Osamenta de ballena (z4): losa de apoyo + espina + costillas instanciadas + cráneo.
  // Hueso pálido con emisivo tenue para que se lea sin encender el foco.
  private buildWhaleFall(rng: () => number): void {
    const group = new THREE.Group();
    const bone = new THREE.MeshStandardMaterial({
      color: 0x9aa8b0, roughness: 0.9, emissive: 0x36434c, emissiveIntensity: 0.4,
    });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(28, 2.2, 11), this.rockMat);
    group.add(slab);
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 24, 6), bone);
    spine.rotation.z = Math.PI / 2;
    spine.position.y = 4.6;
    group.add(spine);
    const arc = Math.PI * 0.85;
    const ribs = new THREE.InstancedMesh(new THREE.TorusGeometry(3.4, 0.2, 6, 14, arc), bone, 9);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 9; i++) {
      const s = 1 - i * 0.055;
      dummy.position.set(-10 + i * 2.4, 4.6 - 3.4 * s, 0);
      dummy.rotation.set(0, Math.PI / 2, Math.PI / 2 - arc / 2); // plano ⟂ espina, arco arriba
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      ribs.setMatrixAt(i, dummy.matrix);
    }
    group.add(ribs);
    const skull = new THREE.Mesh(new THREE.ConeGeometry(1.9, 5.5, 6), bone);
    skull.rotation.z = Math.PI / 2; // punta hacia −x (extremo de la espina)
    skull.position.set(-14, 3, 0);
    group.add(skull);
    const a = rng() * Math.PI * 2;
    group.position.set(Math.cos(a) * 62, -586, Math.sin(a) * 62);
    group.rotation.y = rng() * Math.PI * 2;
    this.scene.add(group);
  }

  // Anémonas-farol (z4): 15 esferas emisivas instanciadas; parpadeo lento compartido
  // (una sola malla, se anima emissiveIntensity del material en update).
  private buildAnemones(rng: () => number): void {
    this.anemoneMat = new THREE.MeshStandardMaterial({
      color: 0x1a1008, emissive: 0xffa050, emissiveIntensity: 0.9,
    });
    const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.35, 8, 6), this.anemoneMat, 15);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 15; i++) {
      const a = rng() * Math.PI * 2;
      const r = 42 + rng() * 44;
      dummy.position.set(Math.cos(a) * r, -458 - rng() * 138, Math.sin(a) * r);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    this.scene.add(mesh);
  }

  // Venteos (z5): columnas de partículas cálidas sobre 2 de las chimeneas del fondo.
  private buildVentColumns(rng: () => number): void {
    this.addRisingColumn(14, 8, -746, -696, 50, 0xff9a50, 0.32, 2.2, 2.2, rng);
    this.addRisingColumn(-22, 15, -746, -696, 50, 0xff9a50, 0.32, 2.2, 2.2, rng);
  }

  // ---------- H3c. Balizas de expedición (migajas de pan verticales) ----------
  private buildBeacons(rng: () => number): void {
    // 1 junto a cada termoclina (4) + 2 por zona a media altura (10) = 14.
    const spots: { y: number; zone: number }[] = [];
    for (const z of [1, 2, 3, 4]) spots.push({ y: -150 * z + 2, zone: z });
    for (const z of ZONES) {
      const mid = (z.yTop + z.yBottom) / 2;
      spots.push({ y: mid + (rng() - 0.5) * 50, zone: z.index });
      spots.push({ y: mid + (rng() - 0.5) * 50, zone: z.index });
    }
    const postMat = new THREE.MeshStandardMaterial({ color: 0x1a222c, roughness: 0.8, metalness: 0.4 });
    const postGeo = new THREE.CylinderGeometry(0.12, 0.16, 2.4, 6);
    for (const spot of spots) {
      const glow = FAMILY_GLOW[ZONES[spot.zone - 1].families[0]];
      const a = rng() * Math.PI * 2;
      const r = 30 + rng() * 30;
      const beacon = new THREE.Group();
      beacon.position.set(Math.cos(a) * r, spot.y, Math.sin(a) * r);
      beacon.add(new THREE.Mesh(postGeo, postMat));
      const lampMat = new THREE.MeshBasicMaterial({ color: glow, transparent: true });
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), lampMat);
      lamp.position.y = 1.55;
      beacon.add(lamp);
      const haloMat = new THREE.SpriteMaterial({
        map: this.getBeaconHalo(), color: glow, transparent: true, opacity: 0.4,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const halo = new THREE.Sprite(haloMat);
      halo.scale.set(4, 4, 1);
      halo.position.y = 1.55;
      beacon.add(halo);
      beacon.add(this.buildDepthLabel(depthMeters(spot.y)));
      this.scene.add(beacon);
      this.beacons.push({ lampMat, haloMat, phase: rng() * Math.PI * 2 });
    }
  }

  private getBeaconHalo(): THREE.CanvasTexture {
    if (this.beaconHaloTex) return this.beaconHaloTex;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    this.beaconHaloTex = new THREE.CanvasTexture(canvas);
    return this.beaconHaloTex;
  }

  // Letrero de profundidad ("−4 000 m"): CanvasTexture 128×48, Orbitron si ya cargó.
  private buildDepthLabel(meters: number): THREE.Sprite {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 48;
    const ctx = canvas.getContext("2d")!;
    const font = document.fonts?.check("600 22px Orbitron") ? "Orbitron" : "monospace";
    ctx.font = `600 22px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(207,232,255,0.92)";
    const label = `−${meters.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} m`;
    ctx.fillText(label, 64, 24);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }),
    );
    sprite.scale.set(5.2, 1.95, 1);
    sprite.position.y = 3.1;
    return sprite;
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

    // H3: columnas de burbujas/venteos ascienden y se reciclan.
    for (const col of this.columns) {
      const a = col.attr.array as Float32Array;
      for (let i = 1; i < a.length; i += 3) {
        a[i] += col.speed * dt;
        if (a[i] > col.yTop) a[i] = col.yBottom;
      }
      col.attr.needsUpdate = true;
    }

    // H3: balizas — parpadeo sin(elapsed*3 + fase) en lámpara y halo.
    for (const b of this.beacons) {
      const k = Math.max(0.18, 0.62 + 0.38 * Math.sin(elapsed * 3 + b.phase));
      b.lampMat.opacity = k;
      b.haloMat.opacity = 0.42 * k;
    }

    // H3: anémonas-farol — parpadeo lento compartido (una sola malla instanciada).
    if (this.anemoneMat) {
      this.anemoneMat.emissiveIntensity = 0.55 + (Math.sin(elapsed * 0.8) + 1) * 0.35;
    }

    // H3: medusas decorativas — deriva vertical lenta + su animación de campana.
    for (const j of this.decoJellies) {
      j.visual.group.position.y = j.baseY + Math.sin(elapsed * 0.25 + j.phase) * 2.5;
      j.visual.group.rotation.y += dt * 0.05;
      j.visual.animate?.(dt, elapsed + j.phase);
    }
  }
}
