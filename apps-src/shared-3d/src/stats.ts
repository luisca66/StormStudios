import type { ModelData } from "./model";

export interface ModelStats {
  parts: number;
  triangles: number;
  vertices: number;
  /** Mallas que dibuja el modelo tal cual (una por parte), antes de fusionar o instanciar. */
  drawCalls: number;
  materials: number;
  vertexColors: boolean;
  vertexEmission: boolean;
}

export function modelStats(model: ModelData): ModelStats {
  let vertices = 0;
  const materials = new Set<string>();
  for (const part of model.parts) {
    vertices += part.geometry.getAttribute("position").count;
    materials.add(JSON.stringify(part.material));
  }
  return {
    parts: model.parts.length,
    triangles: model.triangles,
    vertices,
    drawCalls: model.parts.length,
    materials: materials.size,
    vertexColors: model.parts.some((p) => p.geometry.hasAttribute("color")),
    vertexEmission: model.parts.some((p) => p.geometry.hasAttribute("_emission")),
  };
}
