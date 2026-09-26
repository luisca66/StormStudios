import * as THREE from "three";
import asteroidsUrl from "./assets/asteroides-cosmos.glb?url";
import planetsUrl from "./assets/planetas-cosmos.glb?url";
import crystalUrl from "./assets/cristal-nota.glb?url";
import portalUrl from "./assets/portal-cosmos.glb?url";
import rocketUrl from "./assets/cohete.glb?url";
import { buildMaterial, buildModel, loadModel } from "../../../shared-3d/src";
import { loadKit } from "./blender-kit-field";

// Nivel 3 «El Cosmos» (PLAN-COSMOS-BLENDER.md): cohete (Claude), portal (Astra), asteroides, planetas y
// cristal de nota (Gemini). Se piden al cargar el módulo; cada uso tiene su reserva de primitivas.
export const cosmosAsteroidsKit = loadKit(asteroidsUrl, "Asteroides del Cosmos");
export const cosmosPlanetsKit = loadKit(planetsUrl, "Planetas del Cosmos");
export const noteCrystalKit = loadKit(crystalUrl, "Cristal de nota");
export const cosmosPortalKit = loadKit(portalUrl, "Portal del Cosmos");
export const rocketKit = loadKit(rocketUrl, "Cohete");

export interface Animated {
  root: THREE.Object3D;
  update(delta: number, time: number): void;
}

// ---- Asteroides: 3 variantes instanciadas que dan tumbos (radio del modelo ≈ 0.5 m).

export interface AsteroidPlacement { position: THREE.Vector3; radius: number }
const ASTEROID_PARTS = ["asteroid_a", "asteroid_b", "asteroid_c"];
const ASTEROID_MODEL_RADIUS = 0.5;

export function buildAsteroidField(placements: AsteroidPlacement[]): Animated {
  const root = new THREE.Group();
  const model = cosmosAsteroidsKit.model();
  const tumblers: { mesh: THREE.InstancedMesh; items: { p: AsteroidPlacement; q: THREE.Quaternion; spin: THREE.Quaternion }[] }[] = [];
  ASTEROID_PARTS.forEach((name, v) => {
    const part = model.parts.find((p) => p.part === name);
    const mine = placements.filter((_, i) => i % ASTEROID_PARTS.length === v);
    if (!part || !mine.length) return;
    const mesh = new THREE.InstancedMesh(part.geometry, buildMaterial(part.material, part.geometry.hasAttribute("color")), mine.length);
    mesh.name = part.name;
    mesh.frustumCulled = false; // se mueven por todo el nivel: la caja de la pieza base no sirve
    root.add(mesh);
    tumblers.push({
      mesh,
      items: mine.map((p) => ({
        p,
        q: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3)),
        // giro lento por segundo, como los dodecaedros de antes (±0.2–0.3 rad/s)
        spin: new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.6, 0)),
      })),
    });
  });
  const m = new THREE.Matrix4(), s = new THREE.Vector3(), step = new THREE.Quaternion();
  const identity = new THREE.Quaternion();
  const write = (delta: number) => {
    for (const { mesh, items } of tumblers) {
      items.forEach((it, i) => {
        step.slerpQuaternions(identity, it.spin, delta);
        it.q.multiply(step);
        s.setScalar(it.p.radius / ASTEROID_MODEL_RADIUS);
        mesh.setMatrixAt(i, m.compose(it.p.position, it.q, s));
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
  write(0);
  return { root, update: (delta) => write(delta) };
}

// ---- Planetas de fondo: cuerpo + anillo que gira despacio.

export interface PlanetPlacement { part: "planet_a" | "planet_b" | "planet_c"; position: THREE.Vector3; radius: number }

export function buildCosmosPlanets(placements: PlanetPlacement[]): Animated {
  const root = new THREE.Group();
  const built = buildModel(cosmosPlanetsKit.model(), { emissive: true, castShadow: false });
  const rings: THREE.Object3D[] = [];
  for (const pl of placements) {
    const [body] = built.byPart(pl.part);
    if (!body) continue;
    const g = new THREE.Group();
    g.position.copy(pl.position);
    g.scale.setScalar(pl.radius);
    body.position.set(0, 0, 0);
    g.add(body);
    const [ring] = built.byPart(pl.part.replace("planet", "ring"));
    if (ring) { ring.position.set(0, 0, 0); g.add(ring); rings.push(ring); }
    root.add(g);
  }
  return { root, update: (delta) => { for (const r of rings) r.rotation.y += delta * 0.05; } };
}

// ---- Cristal de nota: casi blanco en el modelo, se tiñe con el color de la nota.

export function buildNoteCrystal(color: THREE.ColorRepresentation): THREE.Group {
  const built = buildModel(noteCrystalKit.model(), { castShadow: false });
  const base = new THREE.Color(color);
  const [crystal] = built.byPart("crystal");
  const [ring] = built.byPart("ring");
  crystal.material = new THREE.MeshStandardMaterial({ color: base, roughness: 0.1, metalness: 0.2, emissive: base, emissiveIntensity: 1.1, vertexColors: true, flatShading: true });
  ring.material = new THREE.MeshStandardMaterial({ color: base.clone().lerp(new THREE.Color(0xffffff), 0.35), emissive: base, emissiveIntensity: 0.9, roughness: 0.3, vertexColors: true });
  ring.onBeforeRender = () => { ring.rotation.z += 0.01; };
  built.root.scale.setScalar(2.5);
  return built.root;
}

// ---- Portal: 3 aros que giran en Z en sentidos alternos y un remolino que late.

export interface CosmosPortal extends Animated { setOpen(t: number): void }

export function buildCosmosPortal(): CosmosPortal {
  const built = buildModel(cosmosPortalKit.model(), { emissive: true, castShadow: false });
  const rings = built.byPart("ring");
  const [core] = built.byPart("core");
  const coreBase = core?.material.emissiveIntensity ?? 1;
  const speeds = [0.12, -0.18, 0.24];
  let open = 0;
  // Brillo del centro: el remolino es de brazos finos y dejaba ver el fondo.
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture(), color: 0xb8a4ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  glow.scale.setScalar(26);
  built.root.add(glow);
  return {
    root: built.root,
    setOpen(t) { open = t; },
    update(delta, time) {
      const boost = 1 + 2 * open;
      rings.forEach((r, i) => { if (r) r.rotation.z += (speeds[i] ?? 0.15) * boost * delta; });
      if (core) {
        core.rotation.z += 0.3 * boost * delta;
        core.scale.setScalar(1 + Math.sin(time * Math.PI * 2 * 0.65) * 0.04);
        core.material.emissiveIntensity = coreBase * (1 + 1.3 * open);
      }
      glow.material.opacity = 0.45 + 0.35 * open + Math.sin(time * 2.5) * 0.08;
    },
  };
}

let radialCache: THREE.Texture | undefined;
function radialTexture(): THREE.Texture {
  if (radialCache) return radialCache;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  radialCache = new THREE.CanvasTexture(c);
  return radialCache;
}

// ---- Cohete del jugador: body fijo, wing 0/1 (pivote en la raíz) y flame (pivote en la tobera).

export function buildRocket() {
  const built = buildModel(rocketKit.model(), { emissive: true, castShadow: true });
  const [body] = built.byPart("body");
  const wings = built.byPart("wing");
  const [flame] = built.byPart("flame");
  return { root: built.root, body, wings, flame };
}

// ---- Nebulosas (código): varios sprites suaves y aditivos; sin aristas desde ningún ángulo.

export function buildNebula(position: THREE.Vector3, color: THREE.ColorRepresentation, size: number): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(position);
  const count = 5 + ((Math.random() * 3) | 0);
  for (let i = 0; i < count; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTexture(), color, transparent: true, opacity: 0.1 + Math.random() * 0.08,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    sprite.scale.setScalar(size * (1.2 + Math.random() * 1.2));
    sprite.position.set((Math.random() - 0.5) * size, (Math.random() - 0.5) * size * 0.6, (Math.random() - 0.5) * size);
    g.add(sprite);
  }
  return g;
}

// ---- Galaxias espirales lejanas (código): nubes de puntos de colores.

export function buildGalaxy(position: THREE.Vector3, radius: number, inner: number, outer: number, tilt: THREE.Euler): THREE.Points {
  const count = 1400, arms = 3;
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const a = new THREE.Color(inner), b = new THREE.Color(outer), c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const t = Math.pow(Math.random(), 0.7);
    const arm = (i % arms) / arms * Math.PI * 2;
    const ang = arm + t * 5.5 + (Math.random() - 0.5) * 0.5;
    const r = t * radius;
    pos[i * 3] = Math.cos(ang) * r + (Math.random() - 0.5) * radius * 0.08;
    pos[i * 3 + 1] = (Math.random() - 0.5) * radius * 0.05 * (1 - t);
    pos[i * 3 + 2] = Math.sin(ang) * r + (Math.random() - 0.5) * radius * 0.08;
    c.copy(a).lerp(b, t);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: radius * 0.03, map: radialTexture(), vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  points.position.copy(position);
  points.rotation.copy(tilt);
  return points;
}
