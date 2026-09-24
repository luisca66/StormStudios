// Ida y vuelta de todos los modelos de los juegos: JSON -> GLB (con y sin gltfpack) -> ModelData.
// La geometría debe ser la misma triángulo por triángulo. gltfpack puede reordenar vértices y
// triángulos, así que se empatan triángulos por cercanía, no los arreglos tal cual.

import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error script de Node sin tipos
import { jsonToGlb, packGlb } from "../scripts/json-to-glb.mjs";
import { parseModelJson, type ModelData, type ModelJson } from "../src";
import { parseModelGlb } from "../src/glb";

const appsSrc = path.resolve(__dirname, "../..");

/** Todos los JSON de `kit.export_parts` (los que tienen `meshes`) bajo apps-src/<juego>/src. */
export function partModels(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === "dist") continue;
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith(".json") && full.includes(`${path.sep}assets${path.sep}`)) {
        const json = JSON.parse(readFileSync(full, "utf8"));
        if (Array.isArray(json.meshes)) found.push(full);
      }
    }
  };
  for (const game of readdirSync(appsSrc)) {
    const src = path.join(appsSrc, game, "src");
    if (game !== "shared-3d" && statSync(path.join(appsSrc, game)).isDirectory()) {
      try { statSync(src); } catch { continue; }
      walk(src);
    }
  }
  return found.sort();
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

/**
 * Máximo error entre dos modelos. Por parte, cada triángulo de uno se empata con el más parecido del
 * otro (en ambos sentidos), buscando por centroide en una rejilla. Se ignoran los triángulos de área
 * cero (no se dibujan y gltfpack los quita) y, en normales, los vértices con normal nula en el
 * original (defecto del modelo que el exportador de GLB corrige).
 */
export function maxDifference(a: ModelData, b: ModelData): { position: number; normal: number; color: number; emission: number } {
  const worst = { position: 0, normal: 0, color: 0, emission: 0 };
  expect(b.parts.map((p) => p.name)).toEqual(a.parts.map((p) => p.name));
  a.parts.forEach((pa, i) => {
    const pb = b.parts[i];
    expect([pb.part, pb.segment, pb.variant]).toEqual([pa.part, pa.segment, pa.variant]);
    expect(pb.pivot.distanceTo(pa.pivot)).toBeLessThan(1e-5);
    for (let c = 0; c < 3; c++) expect(pb.material.color[c]).toBeCloseTo(pa.material.color[c], 5);
    expect(pb.material.alpha).toBeCloseTo(pa.material.alpha, 5);
    expect(pb.material.metalness).toBeCloseTo(pa.material.metalness, 5);
    expect(pb.material.roughness).toBeCloseTo(pa.material.roughness, 5);
    expect(pb.material.emission).toBeCloseTo(pa.material.emission, 5);
    expect(pb.geometry.hasAttribute("_emission")).toBe(pa.geometry.hasAttribute("_emission"));
    // gltfpack quita el color por vértice blanco puro; en glTF da lo mismo (se multiplica por 1).
    if (!pb.geometry.hasAttribute("color") && pa.geometry.hasAttribute("color")) {
      expect(Math.min(...(pa.geometry.getAttribute("color").array as Float32Array))).toBeGreaterThan(0.999);
    } else {
      expect(pb.geometry.hasAttribute("color")).toBe(pa.geometry.hasAttribute("color"));
    }
    const ta = triangles(pa.geometry);
    const tb = triangles(pb.geometry);
    expect(Math.abs(tb.length - ta.length)).toBeLessThanOrEqual(0);
    for (const [from, to] of [[ta, tb], [tb, ta]] as const) {
      const grid = buildGrid(to);
      for (const tri of from) {
        const match = nearest(tri, grid);
        worst.position = Math.max(worst.position, match.distance);
        for (let v = 0; v < 3; v++) {
          const va = tri.vertices[v];
          const vb = match.tri.vertices[v];
          if (!tri.zeroNormal[v] && !match.tri.zeroNormal[v]) {
            worst.normal = Math.max(worst.normal, Math.hypot(va[3] - vb[3], va[4] - vb[4], va[5] - vb[5]));
          }
          if (hasColor(pa) === hasColor(pb)) worst.color = Math.max(worst.color, Math.abs(va[6] - vb[6]), Math.abs(va[7] - vb[7]), Math.abs(va[8] - vb[8]));
          worst.emission = Math.max(worst.emission, Math.abs(va[9] - vb[9]), Math.abs(va[10] - vb[10]), Math.abs(va[11] - vb[11]));
        }
      }
    }
  });
  return worst;
}

const hasColor = (p: ModelData["parts"][number]) => p.geometry.hasAttribute("color");

interface Tri {
  /** [x,y,z,nx,ny,nz,r,g,b,er,eg,eb] por vértice, empezando por el vértice menor (mismo sentido). */
  vertices: number[][];
  zeroNormal: boolean[];
  centroid: [number, number, number];
}

const CELL = 0.05;
const cellKey = (x: number, y: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;

function buildGrid(tris: Tri[]): Map<string, Tri[]> {
  const grid = new Map<string, Tri[]>();
  for (const tri of tris) {
    const key = cellKey(...tri.centroid);
    const list = grid.get(key);
    if (list) list.push(tri);
    else grid.set(key, [tri]);
  }
  return grid;
}

function nearest(tri: Tri, grid: Map<string, Tri[]>): { tri: Tri; distance: number } {
  let best: { tri: Tri; distance: number; score: number } | undefined;
  const [cx, cy, cz] = tri.centroid.map((c) => Math.floor(c / CELL));
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
    for (const other of grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
      // Se elige por todo el vértice (posición, normal, color, emisión): hay triángulos encimados en
      // el mismo lugar con distinto color, y empatar solo por posición mezclaría sus colores.
      let distance = 0;
      let score = 0;
      for (let v = 0; v < 3; v++) {
        const p = tri.vertices[v];
        const q = other.vertices[v];
        distance = Math.max(distance, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
        for (let k = 0; k < p.length; k++) {
          if (k >= 3 && k < 6 && (tri.zeroNormal[v] || other.zeroNormal[v])) continue;
          score = Math.max(score, Math.abs(p[k] - q[k]));
        }
      }
      if (!best || score < best.score) best = { tri: other, distance, score };
    }
  }
  return best ?? { tri, distance: Infinity };
}

function triangles(geometry: ModelData["parts"][number]["geometry"]): Tri[] {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const color = geometry.getAttribute("color");
  const emission = geometry.getAttribute("_emission");
  const index = geometry.index!;
  const vertex = (i: number) => [
    position.getX(i), position.getY(i), position.getZ(i),
    normal.getX(i), normal.getY(i), normal.getZ(i),
    color ? color.getX(i) : 0, color ? color.getY(i) : 0, color ? color.getZ(i) : 0,
    emission ? emission.getX(i) : 0, emission ? emission.getY(i) : 0, emission ? emission.getZ(i) : 0,
  ];
  const out: Tri[] = [];
  for (let t = 0; t < index.count; t += 3) {
    const tri = [vertex(index.getX(t)), vertex(index.getX(t + 1)), vertex(index.getX(t + 2))];
    const [p, q, r] = tri;
    const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
    const w = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
    const area = Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2;
    if (area < 1e-9) continue;
    const less = (m: number[], n: number[]) => m[0] - n[0] || m[1] - n[1] || m[2] - n[2];
    let first = 0;
    for (let v = 1; v < 3; v++) if (less(tri[v], tri[first]) < 0) first = v;
    const vertices = [tri[first], tri[(first + 1) % 3], tri[(first + 2) % 3]];
    out.push({
      vertices,
      zeroNormal: vertices.map((v) => Math.hypot(v[3], v[4], v[5]) < 0.5),
      centroid: [(p[0] + q[0] + r[0]) / 3, (p[1] + q[1] + r[1]) / 3, (p[2] + q[2] + r[2]) / 3],
    });
  }
  return out;
}

const models = partModels();
const work = mkdtempSync(path.join(tmpdir(), "shared-3d-"));

describe("JSON -> GLB -> ModelData", () => {
  it("encuentra los modelos de los juegos", () => {
    expect(models.length).toBeGreaterThan(30);
  });

  for (const file of models) {
    const label = path.relative(appsSrc, file);
    it(`${label}: exacto sin comprimir y con meshopt`, async () => {
      const json = JSON.parse(readFileSync(file, "utf8")) as ModelJson;
      const original = parseModelJson(json);
      const raw = await jsonToGlb(json);
      const fromRaw = await parseModelGlb(toArrayBuffer(raw));
      expect(fromRaw.meta).toEqual(original.meta);
      const exact = maxDifference(original, fromRaw);
      expect(exact.position).toBeLessThan(1e-5);
      // Si alguna normal no es unitaria, GLTFExporter normaliza todas: el JSON las redondea a 4 decimales.
      expect(exact.normal).toBeLessThan(1e-4);
      expect(exact.color).toBeLessThan(1e-5);
      expect(exact.emission).toBeLessThan(1e-5);

      const rawPath = path.join(work, `${path.basename(file)}.glb`);
      const packedPath = path.join(work, `${path.basename(file)}.meshopt.glb`);
      writeFileSync(rawPath, raw);
      packGlb(rawPath, packedPath, "meshopt");
      const packed = await parseModelGlb(toArrayBuffer(readFileSync(packedPath)));
      expect(packed.meta).toEqual(original.meta);
      const diff = maxDifference(original, packed);
      expect(diff.position).toBeLessThan(1e-4);
      expect(diff.normal).toBeLessThan(1e-3);
      expect(diff.color).toBeLessThan(1e-4); // 16 bits
      expect(diff.emission).toBeLessThan(1e-4);
    }, 60_000);
  }
});
