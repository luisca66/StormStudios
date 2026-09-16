import * as THREE from "three";
import dataUrl from "./assets/almeja.json?url";
import type { FishPartData } from "./blender-fish";

// Almeja con perla: el objetivo de nota de El Océano, modelada en Blender por Astra
// (art/blender/almeja/, kit.export_parts). Bisagra atrás (−Z), abre girando −X hasta 0.9 rad.
//
// Decisión de juego: la almeja espera ABIERTA con la perla encendida (es el faro que guía la
// búsqueda) y se cierra de golpe al tocarla, cuando suena la nota.

const OPEN_ANGLE = 0.9;

export interface BlenderClam {
  root: THREE.Group;
  /** Avanza la animación. `elapsed` en segundos desde que apareció. */
  update(delta: number, elapsed: number): void;
  /** El jugador la tocó: se cierra de golpe sobre la perla. */
  snapShut(): void;
  /** Falló y la almeja se teletransporta: vuelve a esperar abierta. */
  reopen(): void;
}

let parts: FishPartData[] | undefined;
let pending: Promise<void> | undefined;

export function preloadBlenderClam(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Almeja: HTTP ${response.status}`);
    parts = (await response.json() as { meshes: FishPartData[] }).meshes;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

preloadBlenderClam().catch((error: unknown) => console.error("Almeja de Blender:", error));

export function isClamReady(): boolean {
  return parts !== undefined;
}

/** `color`: el color de la nota; tiñe la perla y su luz. */
export function buildBlenderClam(color: number): BlenderClam {
  if (!parts) throw new Error("La almeja debe precargarse antes de armarla.");
  const root = new THREE.Group();
  root.name = "Almeja · Blender";

  const lids: THREE.Object3D[] = [];
  let mantle: THREE.Object3D | undefined;
  let pearlMaterial: THREE.MeshStandardMaterial | undefined;

  for (const part of parts) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
    geometry.setIndex(part.index);
    geometry.computeBoundingSphere();

    const isPearl = part.part === "pearl";
    const material = new THREE.MeshStandardMaterial({
      // La perla viene casi blanca: el color de la nota se aplica aquí.
      color: isPearl ? new THREE.Color(color) : new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
      vertexColors: Boolean(part.vertexColor) && !isPearl,
      metalness: part.metalness,
      roughness: part.roughness,
      emissive: isPearl ? new THREE.Color(color) : 0x000000,
      emissiveIntensity: isPearl ? 1.2 : 0,
      side: part.part === "mantle" ? THREE.DoubleSide : THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    mesh.position.fromArray(part.pivot);
    root.add(mesh);

    if (part.part === "shell_upper" || part.part === "lining_upper") lids.push(mesh);
    else if (part.part === "mantle") mantle = mesh;
    else if (isPearl) pearlMaterial = material;
  }

  // Faro: se ve mucho antes que la geometría, a 80–130 u de distancia.
  const beacon = new THREE.PointLight(color, 26, 90);
  root.add(beacon);

  let open = 0;        // apertura actual (0 = cerrada, 1 = abierta)
  let target = 1;      // espera abierta
  let closedFor = -1;  // segundos desde que se cerró (−1 = sigue abierta)

  return {
    root,
    update(delta, elapsed) {
      // Abre al aparecer con calma; al cerrarse va casi cuatro veces más rápido.
      const speed = target < open ? 5.0 : 1.4;
      open = THREE.MathUtils.clamp(open + Math.sign(target - open) * speed * delta, 0, 1);
      for (const lid of lids) lid.rotation.x = -OPEN_ANGLE * open;
      if (mantle) mantle.scale.setScalar(1 + Math.sin(elapsed * 0.8) * 0.04);
      if (pearlMaterial) {
        // Latido del faro; se apaga al quedar encerrada.
        const pulse = 1.05 + Math.sin(elapsed * 2.4) * 0.35;
        pearlMaterial.emissiveIntensity = THREE.MathUtils.lerp(pearlMaterial.emissiveIntensity, pulse * open, 6 * delta);
      }
      beacon.intensity = THREE.MathUtils.lerp(beacon.intensity, 26 * open, 6 * delta);
      if (closedFor >= 0) {
        closedFor += delta;
        // Pequeño rebote de la concha al morder la perla.
        const bounce = Math.max(0, 1 - closedFor * 3.5);
        root.scale.setScalar(1 + bounce * Math.sin(closedFor * 34) * 0.06);
      }
    },
    snapShut() {
      if (closedFor < 0) closedFor = 0;
      target = 0;
    },
    reopen() {
      closedFor = -1;
      target = 1;
      root.scale.setScalar(1);
    },
  };
}
