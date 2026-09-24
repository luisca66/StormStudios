// Carga con caché: cada URL se pide una sola vez aunque varios ejemplares la usen.
// Acepta el JSON de `kit.export_parts` y el GLB; se distingue por la firma del archivo, no por la
// extensión (Vite puede renombrar los assets).

import { parseModelGlb } from "./glb";
import { parseModelJson, type ModelData, type ModelJson } from "./model";

const cache = new Map<string, Promise<ModelData>>();

export function loadModel(url: string): Promise<ModelData> {
  let pending = cache.get(url);
  if (!pending) {
    pending = fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
        return parseModel(await response.arrayBuffer());
      })
      .catch((error: unknown) => {
        cache.delete(url); // que el siguiente intento vuelva a pedirlo
        throw error;
      });
    cache.set(url, pending);
  }
  return pending;
}

export function parseModel(buffer: ArrayBuffer): Promise<ModelData> {
  if (isGlb(buffer)) return parseModelGlb(buffer);
  const json = JSON.parse(new TextDecoder().decode(buffer)) as ModelJson;
  return Promise.resolve(parseModelJson(json));
}

export function isGlb(buffer: ArrayBuffer): boolean {
  return buffer.byteLength >= 4 && new TextDecoder().decode(new Uint8Array(buffer, 0, 4)) === "glTF";
}
