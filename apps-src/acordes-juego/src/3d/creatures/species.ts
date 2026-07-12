// Las 7 especies procedurales (PLAN §7). Cero assets externos: primitivas three.js
// + sprites de halo con textura canvas compartida. Cada fábrica recibe el color de
// bioluminiscencia (según familia del acorde) y devuelve un CreatureVisual.

import * as THREE from "three";
import type { CreatureVisual } from "./base";

// ---------- Halo compartido ----------
let glowTexture: THREE.CanvasTexture | null = null;

function getGlowTexture(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

function makeHalo(color: number, scale: number, opacity = 0.4): THREE.Sprite {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

function glowMat(color: number, base = 0x0a1016, intensity = 0.9): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: base,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.6,
    metalness: 0,
  });
}

// ---------- 1. Medusa Luna (zonas 1–2) ----------
function buildJellyfish(color: number): CreatureVisual {
  const group = new THREE.Group();
  const bellMat = glowMat(color, 0x0c1420, 0.8);
  bellMat.transparent = true;
  bellMat.opacity = 0.82;
  const bell = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    bellMat,
  );
  group.add(bell);

  // H4a: material propio por tentáculo para destellar nota a nota.
  const tentacleMats: THREE.MeshStandardMaterial[] = [];
  const tentacles: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const mat = glowMat(color, 0x0a1016, 0.7);
    const tentacle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.008, 1.7, 4), mat);
    tentacle.position.set(Math.cos(a) * 0.55, -0.9, Math.sin(a) * 0.55);
    tentacleMats.push(mat);
    tentacles.push(tentacle);
    group.add(tentacle);
  }
  group.add(makeHalo(color, 3.6));

  return {
    group,
    glowMaterials: [bellMat, ...tentacleMats],
    glowSprites: group.children.filter((c): c is THREE.Sprite => c instanceof THREE.Sprite),
    bodyRadius: 1.6,
    animate(_dt, elapsed) {
      const pulse = 1 + Math.sin(elapsed * 2.2) * 0.13;
      bell.scale.set(1 / Math.sqrt(pulse), pulse, 1 / Math.sqrt(pulse));
      for (let i = 0; i < tentacles.length; i++) {
        tentacles[i].rotation.x = Math.sin(elapsed * 1.8 + i) * 0.14;
        tentacles[i].rotation.z = Math.cos(elapsed * 1.5 + i) * 0.14;
      }
    },
    flashSegment(index, intensity) {
      tentacleMats[index % tentacleMats.length].emissiveIntensity += intensity * 3;
    },
  };
}

// ---------- 2. Cardumen Prisma (zonas 1–2) ----------
function buildSchool(color: number): CreatureVisual {
  const group = new THREE.Group();
  const COUNT = 46;
  const mat = glowMat(color, 0x0d141c, 0.8);
  const school = new THREE.InstancedMesh(new THREE.ConeGeometry(0.11, 0.42, 5), mat, COUNT);
  group.add(school);
  group.add(makeHalo(color, 4.5, 0.25));

  // Órbitas individuales (elipses inclinadas con fase propia).
  const params = Array.from({ length: COUNT }, () => ({
    r: 1.2 + Math.random() * 2.2,
    tilt: (Math.random() - 0.5) * 0.9,
    phase: Math.random() * Math.PI * 2,
    speed: 0.9 + Math.random() * 0.7,
    yOff: (Math.random() - 0.5) * 2.2,
  }));
  const dummy = new THREE.Object3D();
  // H4a: destello por sub-racimo (escala de instancia); H4c: huida compactando órbitas.
  const flashes = new Float32Array(COUNT);
  let fleeK = 0;

  const animate = (_dt: number, elapsed: number): void => {
    const orbitShrink = 1 - fleeK * 0.75; // H4c: los peces se compactan al huir
    for (let i = 0; i < COUNT; i++) {
      const p = params[i];
      const a = elapsed * p.speed + p.phase;
      const r = p.r * orbitShrink;
      dummy.position.set(
        Math.cos(a) * r,
        (p.yOff + Math.sin(a * 1.3) * 0.4 + Math.sin(a) * r * p.tilt * 0.3) * orbitShrink,
        Math.sin(a) * r,
      );
      // El cono apunta hacia donde nada (tangente de la órbita).
      dummy.lookAt(
        dummy.position.x - Math.sin(a) * r,
        dummy.position.y,
        dummy.position.z + Math.cos(a) * r,
      );
      dummy.rotateX(Math.PI / 2);
      dummy.scale.setScalar(1 + flashes[i] * 1.2);
      dummy.updateMatrix();
      school.setMatrixAt(i, dummy.matrix);
    }
    school.instanceMatrix.needsUpdate = true;
  };

  return {
    group,
    glowMaterials: [mat],
    glowSprites: group.children.filter((c): c is THREE.Sprite => c instanceof THREE.Sprite),
    bodyRadius: 3.2,
    animate,
    flashSegment(index, intensity, noteCount) {
      const j0 = Math.floor((index * COUNT) / noteCount);
      const j1 = Math.floor(((index + 1) * COUNT) / noteCount);
      for (let j = j0; j < j1; j++) flashes[j] = intensity;
    },
    fleeAnimate(dt, elapsed, progress) {
      fleeK = Math.min(1, progress);
      animate(dt, elapsed);
    },
  };
}

// ---------- 3. Calamar Vela (zonas 2–3) ----------
function buildSquid(color: number): CreatureVisual {
  const group = new THREE.Group();
  const bodyMat = glowMat(color, 0x101820, 0.75);
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.3, 9), bodyMat);
  body.rotation.x = Math.PI / 2; // punta hacia -Z (dirección de nado)
  group.add(body);

  const finMat = glowMat(color, 0x0c1319, 0.6);
  finMat.side = THREE.DoubleSide;
  const fins: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), finMat);
    fin.position.set(side * 0.35, 0, -0.75);
    fin.rotation.z = side * 0.5;
    fins.push(fin);
    group.add(fin);
  }

  // H4a: material propio por tentáculo — la nota i destella el par i.
  const tentacleMats: THREE.MeshStandardMaterial[] = [];
  const tentacles: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const mat = glowMat(color, 0x0a1016, 0.7);
    const tentacle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.01, 1.3, 4), mat);
    tentacle.rotation.x = Math.PI / 2;
    tentacle.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 1.7);
    tentacleMats.push(mat);
    tentacles.push(tentacle);
    group.add(tentacle);
  }
  group.add(makeHalo(color, 3.4));

  return {
    group,
    glowMaterials: [bodyMat, finMat, ...tentacleMats],
    glowSprites: group.children.filter((c): c is THREE.Sprite => c instanceof THREE.Sprite),
    bodyRadius: 2.0,
    animate(_dt, elapsed) {
      const squeeze = 1 + Math.sin(elapsed * 3.2) * 0.09;
      body.scale.set(1 / squeeze, 1, squeeze);
      for (let i = 0; i < tentacles.length; i++) {
        tentacles[i].rotation.z = Math.sin(elapsed * 2.6 + i * 0.7) * 0.2;
      }
      fins[0].rotation.y = Math.sin(elapsed * 2.0) * 0.35;
      fins[1].rotation.y = -Math.sin(elapsed * 2.0) * 0.35;
      group.rotation.y = Math.sin(elapsed * 0.4) * 0.5;
    },
    flashSegment(index, intensity) {
      const pair = (index * 2) % tentacleMats.length;
      tentacleMats[pair].emissiveIntensity += intensity * 3;
      tentacleMats[pair + 1].emissiveIntensity += intensity * 3;
    },
  };
}

// ---------- 4. Rape Abisal (zonas 3–4) — el señuelo ES la luz clickeable ----------
function buildAnglerfish(color: number): CreatureVisual {
  const group = new THREE.Group();
  const bodyMat = glowMat(color, 0x11151a, 0.25); // cuerpo casi apagado
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 10), bodyMat);
  body.scale.set(1, 0.82, 1.2);
  group.add(body);

  const jaw = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    bodyMat,
  );
  jaw.position.set(0, -0.28, -0.62);
  group.add(jaw);

  // Caña + señuelo brillante.
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 1.15, 4),
    glowMat(color, 0x0a1016, 0.4),
  );
  rod.position.set(0, 0.85, -0.55);
  rod.rotation.x = 0.7;
  group.add(rod);

  const lureMat = glowMat(color, 0x1a2026, 2.6);
  const lure = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), lureMat);
  lure.position.set(0, 1.22, -1.02);
  group.add(lure);
  const lureHalo = makeHalo(color, 1.6, 0.6);
  lureHalo.position.copy(lure.position);
  group.add(lureHalo);

  return {
    group,
    glowMaterials: [lureMat, bodyMat],
    glowSprites: group.children.filter((c): c is THREE.Sprite => c instanceof THREE.Sprite),
    bodyRadius: 1.6,
    animate(_dt, elapsed) {
      const sway = Math.sin(elapsed * 1.4) * 0.18;
      rod.rotation.z = sway;
      lure.position.x = Math.sin(elapsed * 1.4) * 0.2;
      lureHalo.position.x = lure.position.x;
      group.rotation.z = Math.sin(elapsed * 0.9) * 0.06;
      jaw.rotation.x = Math.max(0, Math.sin(elapsed * 0.7)) * 0.25;
    },
    // Las notas llegan escalonadas → el señuelo parpadea n veces, una por nota.
    flashSegment(_index, intensity) {
      lureMat.emissiveIntensity += intensity * 4;
      lureHalo.material.opacity = Math.min(1, lureHalo.material.opacity + intensity * 0.4);
    },
  };
}

// ---------- 5. Sifonóforo (zonas 3–5) — cadena ondulante de faroles ----------
function buildSiphonophore(color: number): CreatureVisual {
  const group = new THREE.Group();
  const BEADS = 16;
  // H4a: material propio por farol — la nota i enciende su grupo (16/nNotas).
  const beadMats: THREE.MeshStandardMaterial[] = [];
  const beads: THREE.Mesh[] = [];
  for (let i = 0; i < BEADS; i++) {
    const mat = glowMat(color, 0x121821, 1.3);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(i % 3 === 0 ? 0.3 : 0.2, 8, 6), mat);
    beadMats.push(mat);
    beads.push(bead);
    group.add(bead);
  }
  const halo = makeHalo(color, 5.0, 0.3);
  group.add(halo);

  return {
    group,
    glowMaterials: beadMats,
    glowSprites: [halo],
    bodyRadius: 3.4,
    animate(_dt, elapsed) {
      // Curva serpenteante recalculada por frame (barata: 16 puntos).
      for (let i = 0; i < BEADS; i++) {
        const t = i / (BEADS - 1);
        const wave = elapsed * 1.1 - i * 0.45;
        beads[i].position.set(
          Math.sin(wave) * 1.3 * (0.4 + t * 0.6),
          3.2 - t * 6.4,
          Math.cos(wave * 0.8) * 0.9 * t,
        );
      }
    },
    flashSegment(index, intensity, noteCount) {
      const size = Math.ceil(BEADS / noteCount);
      const j0 = index * size;
      for (let j = j0; j < Math.min(BEADS, j0 + size); j++) {
        beadMats[j].emissiveIntensity += intensity * 2.5;
      }
    },
  };
}

// ---------- 6. Pulpo Dumbo (zonas 4–5) ----------
function buildDumbo(color: number): CreatureVisual {
  const group = new THREE.Group();
  const bodyMat = glowMat(color, 0x141219, 0.7);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 10), bodyMat);
  body.scale.set(1, 0.85, 0.95);
  group.add(body);

  const earMat = glowMat(color, 0x10141a, 0.9);
  earMat.side = THREE.DoubleSide;
  const ears: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CircleGeometry(0.42, 10), earMat);
    ear.position.set(side * 0.62, 0.5, 0);
    ear.rotation.y = side * 0.6;
    ears.push(ear);
    group.add(ear);
  }

  // H4a: material propio por brazo — la nota i destella el par i.
  const armMats: THREE.MeshStandardMaterial[] = [];
  const arms: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const mat = glowMat(color, 0x0d1016, 0.6);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 0.7, 4), mat);
    arm.position.set(Math.cos(a) * 0.4, -0.75, Math.sin(a) * 0.4);
    arm.rotation.z = Math.cos(a) * 0.5;
    arm.rotation.x = -Math.sin(a) * 0.5;
    armMats.push(mat);
    arms.push(arm);
    group.add(arm);
  }
  group.add(makeHalo(color, 3.0));

  return {
    group,
    glowMaterials: [bodyMat, earMat, ...armMats],
    glowSprites: group.children.filter((c): c is THREE.Sprite => c instanceof THREE.Sprite),
    bodyRadius: 1.5,
    animate(_dt, elapsed) {
      ears[0].rotation.z = 0.4 + Math.sin(elapsed * 2.4) * 0.45;
      ears[1].rotation.z = -0.4 - Math.sin(elapsed * 2.4) * 0.45;
      group.rotation.y = Math.sin(elapsed * 0.3) * 0.8;
      for (let i = 0; i < arms.length; i++) {
        arms[i].rotation.y = Math.sin(elapsed * 1.6 + i) * 0.12;
      }
    },
    flashSegment(index, intensity) {
      const pair = (index * 2) % armMats.length;
      armMats[pair].emissiveIntensity += intensity * 3;
      armMats[pair + 1].emissiveIntensity += intensity * 3;
    },
  };
}

// ---------- 7. Leviatán (zona 5, raro, vale ×2) ----------
function buildLeviathan(color: number): CreatureVisual {
  const group = new THREE.Group();
  const SEGMENTS = 9;
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x05070c,
    emissive: 0x000000,
    roughness: 1,
  });
  // H4a: material propio por placa dorsal — la nota i destella la placa i
  // (y el "bramido" de aparición recorre las placas en ola, ver manager).
  const plateMats: THREE.MeshStandardMaterial[] = [];
  const segments: THREE.Mesh[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const radius = 3.2 * (1 - (i / SEGMENTS) * 0.75);
    const seg = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), bodyMat);
    seg.position.z = i * 4.6;
    segments.push(seg);
    group.add(seg);

    const plateMat = glowMat(color, 0x0a0f16, 1.8);
    const plate = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 4), plateMat);
    plate.position.set(0, radius * 0.95, i * 4.6);
    plateMats.push(plateMat);
    group.add(plate);
  }
  const halo = makeHalo(color, 14, 0.22);
  halo.position.z = 9;
  group.add(halo);

  return {
    group,
    glowMaterials: plateMats,
    glowSprites: [halo],
    bodyRadius: 11,
    animate(_dt, elapsed) {
      for (let i = 0; i < SEGMENTS; i++) {
        segments[i].position.x = Math.sin(elapsed * 0.5 - i * 0.42) * 2.4;
        const plate = group.children[i * 2 + 1] as THREE.Mesh;
        plate.position.x = segments[i].position.x;
      }
      group.rotation.y += _dt * 0.06; // cruza lentamente el campo visual
    },
    flashSegment(index, intensity) {
      plateMats[index % plateMats.length].emissiveIntensity += intensity * 3;
    },
  };
}

// ---------- Registro de especies ----------
export interface SpeciesDef {
  id: string;
  es: string;
  en: string;
  /** Zonas donde aparece (índices 1..5). */
  zones: number[];
  build(color: number): CreatureVisual;
}

export const SPECIES: SpeciesDef[] = [
  { id: "jellyfish", es: "Medusa Luna", en: "Moon Jelly", zones: [1, 2], build: buildJellyfish },
  { id: "school", es: "Cardumen Prisma", en: "Prism School", zones: [1, 2], build: buildSchool },
  { id: "squid", es: "Calamar Vela", en: "Sail Squid", zones: [2, 3], build: buildSquid },
  { id: "angler", es: "Rape Abisal", en: "Anglerfish", zones: [3, 4], build: buildAnglerfish },
  { id: "siphonophore", es: "Sifonóforo", en: "Siphonophore", zones: [3, 4, 5], build: buildSiphonophore },
  { id: "dumbo", es: "Pulpo Dumbo", en: "Dumbo Octopus", zones: [4, 5], build: buildDumbo },
  { id: "leviathan", es: "Leviatán", en: "Leviathan", zones: [5], build: buildLeviathan },
];

export function speciesForZone(zoneIndex: number): SpeciesDef[] {
  return SPECIES.filter((s) => s.zones.includes(zoneIndex) && s.id !== "leviathan");
}

export const LEVIATHAN = SPECIES[SPECIES.length - 1];
