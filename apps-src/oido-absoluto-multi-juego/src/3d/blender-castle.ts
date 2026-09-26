import * as THREE from "three";
import modelUrl from "./assets/castillo.glb?url";
import { buildModel, loadModel, type ModelData } from "../../../shared-3d/src";

// Castillo de La Pradera, modelado por Astra en Blender (art/blender/castillo/, kit.export_glb).
// Origen en el centro de la planta, a nivel del piso; la puerta mira a +Z. Partes: `static`
// (7 mallas por material) y `flag` 0..2, con el pivote donde la tela se une al mástil.

// Ondeo de ENTREGA.md: amplitud (rad) y frecuencia (ciclos/s) por segment; fase = segment × 1.1.
const FLAG_WAVE = [
  { amplitude: 0.16, hz: 1.5 },
  { amplitude: 0.19, hz: 1.3 },
  { amplitude: 0.14, hz: 1.1 },
];

let model: ModelData | undefined;

/** Se pide al cargar el módulo: para cuando el jugador elige nivel ya está en memoria. */
export function preloadBlenderCastle(): Promise<void> {
  return loadModel(modelUrl).then((data) => { model = data; });
}

preloadBlenderCastle().catch((error: unknown) => console.error("Castillo de Blender:", error));

export const isCastleReady = (): boolean => model !== undefined;

export interface BlenderCastle {
  root: THREE.Group;
  update(time: number): void;
}

export function buildBlenderCastle(): BlenderCastle {
  if (!model) throw new Error("El castillo debe precargarse antes de armarlo.");
  const built = buildModel(model, { castShadow: true, receiveShadow: true });
  built.root.name = "Castillo · Blender";
  const flags = built.byPart("flag");
  for (const flag of flags) flag.material.side = THREE.DoubleSide; // tela: se ve por las dos caras
  return {
    root: built.root,
    update(time) {
      flags.forEach((flag, segment) => {
        const wave = FLAG_WAVE[segment] ?? FLAG_WAVE[0];
        flag.rotation.y = wave.amplitude * Math.sin(Math.PI * 2 * wave.hz * time + segment * 1.1);
      });
    },
  };
}
