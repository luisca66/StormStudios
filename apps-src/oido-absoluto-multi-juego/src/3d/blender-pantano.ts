import * as THREE from "three";
import crocUrl from "./assets/cocodrilo.glb?url";
import portalUrl from "./assets/portal-pantano.glb?url";
import mangrovesUrl from "./assets/manglares.glb?url";
import rocksUrl from "./assets/rocas-pantano.glb?url";
import plantsUrl from "./assets/plantas-pantano.glb?url";
import mushroomsUrl from "./assets/hongos.glb?url";
import spiderUrl from "./assets/arana.glb?url";
import { buildMaterial, buildModel } from "../../../shared-3d/src";
import { loadKit } from "./blender-kit-field";

// Nivel 4 «El Pantano» (PLAN-PANTANO-BLENDER.md): cocodrilo y kits (Claude), portal (Astra).
// Se piden al cargar el módulo; cada uso tiene su reserva de primitivas.
export const crocKit = loadKit(crocUrl, "Cocodrilo");
export const swampPortalKit = loadKit(portalUrl, "Portal del pantano");
export const mangrovesKit = loadKit(mangrovesUrl, "Manglares");
export const swampRocksKit = loadKit(rocksUrl, "Rocas del pantano");
export const swampPlantsKit = loadKit(plantsUrl, "Plantas del pantano");
export const mushroomsKit = loadKit(mushroomsUrl, "Hongos");
export const spiderKit = loadKit(spiderUrl, "Arañita");

/** Cuerpo y ojos de la arañita (art/blender/arana/); los ojos cuelgan del cuerpo para subir y bajar con él. */
export function buildSpiderBody(): THREE.Mesh {
  const built = buildModel(spiderKit.model(), { emissive: true, castShadow: true });
  const [body] = built.byPart("body");
  const [eyes] = built.byPart("eyes");
  eyes.position.sub(body.position);
  body.add(eyes);
  return body;
}

// ---- Cocodrilo: partes rígidas en el espacio de Godot (mira a −Z); el jugador gira el modelo π.

export interface BlenderCroc {
  body: THREE.Object3D;
  head: THREE.Object3D;
  blinkers: THREE.Object3D[];
  tail: THREE.Object3D[];
  legs: THREE.Object3D[];
}

/** Arma el cocodrilo dentro de `model` con la misma jerarquía que el de primitivas. */
export function buildBlenderCroc(model: THREE.Group): BlenderCroc {
  const built = buildModel(crocKit.model(), { emissive: true, castShadow: true });
  const [body] = built.byPart("body");
  const [head] = built.byPart("head");
  model.add(body, head);
  // Ojos y pupilas cuelgan de la cabeza para cabecear con ella.
  const blinkers: THREE.Object3D[] = [];
  for (const m of [...built.byPart("eye"), ...built.byPart("pupil")]) {
    m.position.sub(head.position);
    head.add(m);
    blinkers.push(m);
  }
  // Cola encadenada: cada segmento cuelga del anterior, con su pivote relativo.
  const tail = built.byPart("tail");
  let parent: THREE.Object3D = model;
  let parentPos = new THREE.Vector3();
  for (const seg of tail) {
    const world = seg.position.clone();
    seg.position.copy(world).sub(parentPos);
    parent.add(seg);
    parent = seg;
    parentPos = world;
  }
  const legs = built.byPart("leg");
  for (const leg of legs) model.add(leg);
  return { body, head, blinkers, tail, legs };
}

// ---- Portal: arco fijo (dos mallas), aros que giran en Z y remolino que late.

export interface SwampPortal {
  root: THREE.Object3D;
  setOpen(t: number): void;
  update(delta: number, time: number): void;
}

export function buildSwampPortal(): SwampPortal {
  const built = buildModel(swampPortalKit.model(), { emissive: true, castShadow: true });
  const rings = built.byPart("ring");
  const [core] = built.byPart("core");
  const coreBase = core?.material.emissiveIntensity ?? 1;
  let open = 0;
  return {
    root: built.root,
    setOpen(t) { open = t; },
    update(delta, time) {
      const boost = 1 + 2 * open;
      rings.forEach((r, i) => { if (r) r.rotation.z += (0.25 + i * 0.1) * (i % 2 ? -1 : 1) * boost * delta; });
      if (core) {
        core.rotation.z -= 0.35 * boost * delta;
        core.scale.setScalar(1 + Math.sin(time * Math.PI * 2 * 0.6) * 0.04);
        core.material.emissiveIntensity = coreBase * (1 + 1.4 * open);
      }
    },
  };
}

// ---- Kits instanciados: una InstancedMesh por pieza, giro en Y y escala; pivote en la base.

export interface Placement { part: string; x: number; z: number; y?: number; scale: number; rotY: number }

export function buildSwampField(model: ReturnType<typeof crocKit.model>, placements: Placement[], shadows = true): THREE.Group {
  const group = new THREE.Group();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (const part of model.parts) {
    const mine = placements.filter((pl) => pl.part === part.part);
    if (!mine.length) continue;
    const material = buildMaterial(part.material, part.geometry.hasAttribute("color"), { emissive: true });
    const mesh = new THREE.InstancedMesh(part.geometry, material, mine.length);
    mesh.name = part.name;
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    mine.forEach((pl, i) => {
      p.set(pl.x, pl.y ?? 0, pl.z);
      q.setFromAxisAngle(up, pl.rotY);
      s.setScalar(pl.scale);
      mesh.setMatrixAt(i, m.compose(p, q, s));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}
