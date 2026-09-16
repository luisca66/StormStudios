import * as THREE from "three";
import dataUrl from "./assets/cangrejo.json?url";
import type { FishPartData } from "./blender-fish";

// Cangrejo de El Océano, modelado en Blender por Astra (art/blender/cangrejo/).
// Ojos y pinzas a +Z, camina de lado por X; las puntas de las patas apoyan en y = 0.
// Partes: body, eyes, leg ×8 (0–3 lado −X, 4–7 lado +X), claw ×2, pincer ×2 (hija de su claw).

export interface BlenderCrab {
  root: THREE.Group;
  /** `walk` 0..1: cuánto está caminando (acompasa el paso de las patas). */
  update(delta: number, time: number, walk: number): void;
}

let parts: FishPartData[] | undefined;
let pending: Promise<void> | undefined;

export function preloadBlenderCrab(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Cangrejo: HTTP ${response.status}`);
    parts = (await response.json() as { meshes: FishPartData[] }).meshes;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

preloadBlenderCrab().catch((error: unknown) => console.error("Cangrejo de Blender:", error));

export function buildBlenderCrab(): BlenderCrab {
  if (!parts) throw new Error("El cangrejo debe precargarse antes de armarlo.");
  const root = new THREE.Group();
  root.name = "Cangrejo · Blender";
  // Todo el cuerpo articulado sube y baja junto: si solo botara el caparazón, las patas se despegarían.
  const rig = new THREE.Group();
  root.add(rig);

  let eyes: THREE.Object3D | undefined;
  const legs: THREE.Object3D[] = [];
  const claws: THREE.Object3D[] = [];
  const pincers: THREE.Object3D[] = [];

  for (const part of parts) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
    geometry.setIndex(part.index);
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
      vertexColors: Boolean(part.vertexColor),
      metalness: part.metalness,
      roughness: part.roughness,
    }));
    mesh.name = part.name;
    mesh.position.fromArray(part.pivot);
    mesh.castShadow = true;
    rig.add(mesh);

    const segment = part.segment ?? 0;
    if (part.part === "eyes") eyes = mesh;
    else if (part.part === "leg") legs[segment] = mesh;
    else if (part.part === "claw") claws[segment] = mesh;
    else if (part.part === "pincer") pincers[segment] = mesh;
  }

  // Jerarquía de la entrega: cada dedo móvil cuelga de su brazo y lo acompaña al levantarse.
  for (let i = 0; i < pincers.length; i++) {
    const claw = claws[i];
    const pincer = pincers[i];
    if (claw && pincer) claw.attach(pincer);
  }

  // Chasquido de pinzas: cada una a su aire, cada 3–5 s.
  const snaps = pincers.map(() => ({ timer: 1 + Math.random() * 4, open: 0, phase: "cerrada" as "cerrada" | "abriendo" | "cerrando" }));

  return {
    root,
    update(delta, time, walk) {
      const stride = time * 3.0;

      // Bote al andar (±0.1 u), todo el cuerpo a la vez.
      rig.position.y = Math.abs(Math.sin(stride)) * 0.1 * walk;

      // Patas: fases alternas (0 y π) dentro de cada lado. Se usa ±0.3 rad en X, un poco menos
      // que el ±0.4 de la entrega: en el extremo, las puntas se hundían 0.54 u en la arena.
      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        if (!leg) continue;
        const side = i < 4 ? -1 : 1;
        const phase = (i % 2) * Math.PI;
        leg.rotation.x = Math.sin(stride + phase) * 0.3 * walk;
        leg.rotation.z = Math.cos(stride + phase) * 0.1 * side * walk;
      }

      if (eyes) eyes.rotation.z = Math.sin(time * 0.8) * 0.15;
      if (claws[0]) claws[0].rotation.z = -Math.abs(Math.sin(time * 0.7)) * 0.15;
      if (claws[1]) claws[1].rotation.z = Math.abs(Math.sin(time * 0.7 + 1.3)) * 0.15;

      for (let i = 0; i < snaps.length; i++) {
        const s = snaps[i];
        const pincer = pincers[i];
        if (!pincer) continue;
        if (s.phase === "cerrada") {
          s.timer -= delta;
          if (s.timer <= 0) s.phase = "abriendo";
        } else if (s.phase === "abriendo") {
          s.open = Math.min(0.5, s.open + delta * 1.0); // abre despacio
          if (s.open >= 0.5) s.phase = "cerrando";
        } else {
          s.open = Math.max(0, s.open - delta * 4.0); // y cierra de golpe: ¡clac!
          if (s.open <= 0) { s.phase = "cerrada"; s.timer = 3 + Math.random() * 2; }
        }
        pincer.rotation.y = s.open; // +Y en los dos lados, como la pose comprobada en el script de Astra
      }
    },
  };
}
