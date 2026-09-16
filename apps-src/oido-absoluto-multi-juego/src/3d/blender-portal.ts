import * as THREE from "three";
import dataUrl from "./assets/portal.json?url";
import type { FishPartData } from "./blender-fish";

// Portal atlante (art/blender/portal/, Astra). Aro apoyado en y = 0, radialmente simétrico,
// segmento 0 hacia +Z. Seis hojas de iris que se pliegan hacia abajo y afuera sobre bisagras
// de eje arbitrario (no alineadas a X/Y/Z: son tangentes al hexágono) y un núcleo `glow` cuya
// emisión sube al abrirse. Ver ENTREGA.md para los valores exactos.

interface PortalPartData extends FishPartData {
  alpha: number;
  emission: number;
  emissionColor: [number, number, number];
}

interface PortalJson {
  meshes: PortalPartData[];
  hingeAxes: [number, number, number][];
  openAngle: number;
  glowEmissionClosed: number;
  glowEmissionOpen: number;
}

export interface BlenderPortal {
  root: THREE.Group;
  /** 0 = cerrado, 1 = abierto del todo. Gira las seis hojas sobre su bisagra y sube `glow`. */
  setOpenAmount(t: number): void;
}

let data: PortalJson | undefined;
let pending: Promise<void> | undefined;

export function preloadBlenderPortal(): Promise<void> {
  return (pending ??= fetch(dataUrl)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Portal atlante: HTTP ${response.status}`);
      data = (await response.json()) as PortalJson;
    })
    .catch((error: unknown) => {
      pending = undefined;
      throw error;
    }));
}

preloadBlenderPortal().catch((error: unknown) => console.error("Portal atlante de Blender:", error));

export function buildBlenderPortal(): BlenderPortal {
  if (!data) throw new Error("Portal atlante debe precargarse antes de armarlo.");
  const root = new THREE.Group();
  root.name = "Portal atlante · Blender";

  const leaves: (THREE.Mesh | undefined)[] = new Array(6);
  let glowMaterial: THREE.MeshStandardMaterial | undefined;

  for (const part of data.meshes) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
    geometry.setIndex(part.index);
    geometry.computeBoundingSphere();

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
      vertexColors: Boolean(part.vertexColor),
      metalness: part.metalness,
      roughness: part.roughness,
      emissive: part.emission > 0
        ? new THREE.Color().setRGB(part.emissionColor[0], part.emissionColor[1], part.emissionColor[2])
        : 0x000000,
      emissiveIntensity: part.emission,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    mesh.position.fromArray(part.pivot);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);

    if (part.part === "iris_leaf" && part.segment !== undefined) leaves[part.segment] = mesh;
    if (part.part === "glow") glowMaterial = material;
  }

  if (leaves.some((leaf) => !leaf)) throw new Error("Portal atlante: faltan hojas del iris en el JSON.");
  if (!glowMaterial) throw new Error("Portal atlante: el JSON no trae la parte `glow`.");

  const hinges = leaves.map((leaf, i) => ({
    mesh: leaf!,
    axis: new THREE.Vector3().fromArray(data!.hingeAxes[i]).normalize(),
  }));
  const { openAngle, glowEmissionClosed, glowEmissionOpen } = data;
  const glow = glowMaterial;

  return {
    root,
    setOpenAmount(t) {
      const clamped = THREE.MathUtils.clamp(t, 0, 1);
      for (const hinge of hinges) hinge.mesh.quaternion.setFromAxisAngle(hinge.axis, clamped * openAngle);
      glow.emissiveIntensity = THREE.MathUtils.lerp(glowEmissionClosed, glowEmissionOpen, clamped);
    },
  };
}
