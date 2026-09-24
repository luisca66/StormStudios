import { describe, expect, it } from "vitest";
import { buildModel, modelStats, parseModelJson, partsNamed } from "../src";

const json = {
  generator: "prueba",
  forward: "+Z",
  meshes: [
    { name: "cuerpo", part: "body", pivot: [0, 1, 0], position: [0, 0, 0, 1, 0, 0, 0, 1, 0], normal: [0, 0, 1, 0, 0, 1, 0, 0, 1], index: [0, 1, 2], vertexColor: [1, 0, 0, 1, 0, 0, 1, 0, 0], color: [0.5, 0.5, 0.5], alpha: 1, metalness: 0.1, roughness: 0.7 },
    { name: "pata.1", part: "leg", segment: 1, pivot: [1, 0, 0], position: [0, 0, 0, 1, 0, 0, 0, 1, 0], normal: [0, 0, 1, 0, 0, 1, 0, 0, 1], index: [0, 1, 2] },
    { name: "pata.0", part: "leg", segment: 0, pivot: [-1, 0, 0], position: [0, 0, 0, 1, 0, 0, 0, 1, 0], normal: [0, 0, 1, 0, 0, 1, 0, 0, 1], index: [0, 1, 2] },
  ],
};

describe("parseModelJson", () => {
  it("separa meta y partes", () => {
    const model = parseModelJson(json as never);
    expect(model.meta).toEqual({ generator: "prueba", forward: "+Z" });
    expect(model.triangles).toBe(3);
    expect(partsNamed(model, "leg").map((p) => p.name)).toEqual(["pata.0", "pata.1"]);
  });

  it("arma mallas en su pivote, con color por vértice si lo hay", () => {
    const built = buildModel(parseModelJson(json as never));
    const [body] = built.byPart("body");
    expect(body.position.toArray()).toEqual([0, 1, 0]);
    expect(body.material.vertexColors).toBe(true);
    expect(body.material.metalness).toBeCloseTo(0.1);
    expect(built.byPart("leg")[1].name).toBe("pata.1");
    expect(modelStats(parseModelJson(json as never))).toMatchObject({ parts: 3, drawCalls: 3, vertexColors: true });
  });
});
