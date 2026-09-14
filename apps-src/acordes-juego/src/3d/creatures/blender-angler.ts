import * as THREE from "three";
import dataUrl from "./assets/rape-abisal.json?url";
import type { CreatureVisual } from "./base";
import type { PartData } from "./blender-squid";
import { makeHalo } from "./halo";

// Rape Abisal modelado por Astra en Blender (art/blender/rape-abisal/, kit.export_parts).
// Boca hacia −Z. El señuelo cuelga de la punta de la caña y ES la luz que el jugador ve.

const TAU = Math.PI * 2;
let parts: PartData[] | undefined;
let pending: Promise<void> | undefined;

/** Se descarga una vez antes de la inmersión; la geometría queda fuera del bundle JS. */
export function preloadBlenderAngler(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Rape Abisal: HTTP ${response.status}`);
    parts = (await response.json() as { meshes: PartData[] }).meshes;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

export function buildBlenderAngler(color: number): CreatureVisual {
  if (!parts) throw new Error("Rape Abisal must be preloaded before starting the dive.");
  const group = new THREE.Group();
  group.name = "Rape Abisal · Blender";

  const byPart = (name: string) => parts!.filter((p) => p.part === name);
  const rodData = byPart("rod")[0];
  // La caña gira desde su base y arrastra al señuelo, que cuelga de su punta.
  const rod = new THREE.Group();
  rod.position.fromArray(rodData.pivot);
  group.add(rod);

  let lureMat!: THREE.MeshStandardMaterial;
  let lure!: THREE.Mesh;
  let jaw!: THREE.Mesh;
  let tail!: THREE.Mesh;
  const fins: { mesh: THREE.Mesh; side: number }[] = [];

  for (const part of parts) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
    geometry.setIndex(part.index);
    geometry.computeBoundingSphere();

    const isLure = part.part === "lure";
    const material = new THREE.MeshStandardMaterial({
      // El señuelo toma el color de la familia; la piel conserva su pigmento.
      color: isLure ? color : new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
      vertexColors: Boolean(part.vertexColor) && !isLure,
      metalness: part.metalness,
      roughness: part.roughness,
      emissive: isLure ? color : 0x000000,
      emissiveIntensity: isLure ? part.emission : 0,
      side: part.part === "fin" || part.part === "tail" ? THREE.DoubleSide : THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;

    if (part.part === "rod") {
      rod.add(mesh);
    } else if (isLure) {
      mesh.position.set(
        part.pivot[0] - rodData.pivot[0],
        part.pivot[1] - rodData.pivot[1],
        part.pivot[2] - rodData.pivot[2],
      );
      rod.add(mesh);
      lure = mesh;
      lureMat = material;
    } else {
      mesh.position.fromArray(part.pivot);
      group.add(mesh);
      if (part.part === "jaw") jaw = mesh;
      if (part.part === "tail") tail = mesh;
      if (part.part === "fin") fins.push({ mesh, side: Math.sign(part.pivot[0]) || 1 });
    }
  }

  const lureHalo = makeHalo(color, 1.6, 0.6);
  lureHalo.position.copy(lure.position);
  rod.add(lureHalo);

  return {
    group,
    glowMaterials: [lureMat],
    glowSprites: [lureHalo],
    bodyRadius: 1.6,
    // Amplitudes y frecuencias de ENTREGA.md (ciclos/s → rad/s con TAU).
    animate(_dt, elapsed) {
      rod.rotation.z = Math.sin(elapsed * TAU * 0.28) * 0.18;
      rod.rotation.x = Math.sin(elapsed * TAU * 0.21 + 0.5) * 0.045;
      lure.scale.setScalar(1 + Math.sin(elapsed * TAU * 0.8) * 0.05);
      jaw.rotation.x = -Math.max(0, Math.sin(elapsed * TAU * 0.22)) * 0.25;
      tail.rotation.y = Math.sin(elapsed * TAU * 0.42) * 0.2;
      for (const { mesh, side } of fins) mesh.rotation.z = side * Math.sin(elapsed * TAU * 0.55) * 0.16;
      group.rotation.z = Math.sin(elapsed * TAU * 0.16) * 0.045;
    },
    // Las notas llegan escalonadas → el señuelo parpadea una vez por nota.
    flashSegment(_index, intensity) {
      lureMat.emissiveIntensity += intensity * 4;
      lureHalo.material.opacity = Math.min(1, lureHalo.material.opacity + intensity * 0.4);
    },
  };
}
