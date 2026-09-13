import * as THREE from "three";
import modelUrl from "./assets/pez-prisma.json?url";
import type { CreatureVisual } from "./base";

type Model = typeof import("./assets/pez-prisma.json");
let model: Model | undefined;
let pending: Promise<void> | undefined;
export function preloadBlenderSchool(): Promise<void> {
  return pending ??= fetch(modelUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Pez Prisma: HTTP ${response.status}`);
    model = await response.json() as Model;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

/** Seven instanced Blender meshes, with independent tail pivots. No generated anatomy. */
export function buildBlenderSchool(_color: number, count = 46): CreatureVisual {
  if (!model) throw new Error("Pez Prisma must be preloaded before starting the dive.");
  const group = new THREE.Group(); group.name = "Cardumen Prisma · Blender";
  const glowMaterials: THREE.MeshStandardMaterial[] = [];
  const parts = model.meshes.map((part) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
    geometry.setIndex(part.index); geometry.computeBoundingSphere();
    const isBody = part.name.includes("Escamas");
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(...part.color as [number, number, number]),
      vertexColors: true, metalness: part.metalness, roughness: part.roughness,
      side: THREE.DoubleSide, transparent: part.alpha < 1, opacity: part.alpha,
      depthWrite: part.alpha >= 1, emissive: isBody ? 0x264942 : 0x000000,
      emissiveIntensity: isBody ? .16 : 0,
    });
    material.forceSinglePass = true;
    if (isBody) glowMaterials.push(material);
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.name = part.name; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // The school has a bounded animated volume. Avoid a stale instance bounding sphere.
    mesh.frustumCulled = false; group.add(mesh);
    return { mesh, pivot: new THREE.Vector3().fromArray(part.pivot), tail: part.part === "tail" };
  });
  const fish = new THREE.Object3D(), tail = new THREE.Object3D();
  const matrix = new THREE.Matrix4(), tint = new THREE.Color();
  const flashes = new Float32Array(count);
  const offsets = Array.from({ length: count }, (_, i) => {
    const r = Math.sqrt((i + .5) / count), a = i * 2.399963;
    return new THREE.Vector3(Math.cos(a) * r * 1.65, Math.sin(i * 1.77) * .8 * r, Math.sin(a) * r * 2.6);
  });
  let flee = 0;
  const animate = (dt: number, elapsed: number) => {
    const heading = count === 1 ? Math.PI / 2 : Math.sin(elapsed * .22) * .7;
    const c = Math.cos(heading), s = Math.sin(heading), compact = 1 - flee * .52;
    for (let i = 0; i < count; i++) {
      const p = offsets[i];
      if (count === 1) fish.position.set(0, 0, 0);
      else fish.position.set((p.x*c+p.z*s)*compact, (p.y+.06*Math.sin(elapsed*2+i)) * compact, (p.z*c-p.x*s)*compact);
      fish.rotation.set(.035*Math.sin(elapsed*1.7+i), heading+.05*Math.sin(elapsed*1.5+i*.8), .025*Math.sin(elapsed+i));
      fish.scale.setScalar(count === 1 ? 1 : .31 + .045*Math.sin(i*2.1));
      fish.updateMatrix();
      tint.setRGB(1 + flashes[i]*1.8, 1 + flashes[i]*1.8, 1 + flashes[i]*1.8);
      for (const part of parts) {
        tail.position.copy(part.pivot);
        tail.rotation.set(0, part.tail ? Math.sin(elapsed*(8+flee*9)+i*.85)*.32 : 0, 0);
        tail.updateMatrix(); matrix.multiplyMatrices(fish.matrix, tail.matrix);
        part.mesh.setMatrixAt(i, matrix); part.mesh.setColorAt(i, tint);
      }
      flashes[i] = Math.max(0, flashes[i] - dt * 4);
    }
    for (const part of parts) {
      part.mesh.instanceMatrix.needsUpdate = true;
      if (part.mesh.instanceColor) part.mesh.instanceColor.needsUpdate = true;
    }
  };
  animate(0, 0);
  return {
    group, glowMaterials, glowSprites: [], bodyRadius: count === 1 ? 1.3 : 3.2, animate,
    flashSegment(index, intensity, noteCount) {
      for (let i = Math.floor(index*count/noteCount); i < Math.floor((index+1)*count/noteCount); i++) flashes[i] = intensity;
    },
    fleeAnimate(dt, elapsed, progress) { flee = Math.min(1, progress); animate(dt, elapsed); },
  };
}
