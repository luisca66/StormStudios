import type { ModelData } from "./model";

export interface ModelStats {
  parts: number;
  triangles: number;
  /** Triángulos de la parte más grande: el presupuesto de un kit instanciado es por pieza. */
  maxPartTriangles: number;
  vertices: number;
  /** Mallas que dibuja el modelo tal cual (una por parte), antes de fusionar o instanciar. */
  drawCalls: number;
  materials: number;
  vertexColors: boolean;
  vertexEmission: boolean;
}

export function modelStats(model: ModelData): ModelStats {
  let vertices = 0;
  let maxPartTriangles = 0;
  const materials = new Set<string>();
  for (const part of model.parts) {
    vertices += part.geometry.getAttribute("position").count;
    maxPartTriangles = Math.max(maxPartTriangles, (part.geometry.index?.count ?? 0) / 3);
    materials.add(JSON.stringify(part.material));
  }
  return {
    parts: model.parts.length,
    triangles: model.triangles,
    maxPartTriangles,
    vertices,
    drawCalls: model.parts.length,
    materials: materials.size,
    vertexColors: model.parts.some((p) => p.geometry.hasAttribute("color")),
    vertexEmission: model.parts.some((p) => p.geometry.hasAttribute("_emission")),
  };
}
