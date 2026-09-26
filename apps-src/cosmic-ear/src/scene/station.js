// Estación de salida: plataforma de despegue bajo la nave (art/blender/estacion/, Claude).
// Partes: `pad` (fija), `pad_ring` (anillo dorado que gira), `pad_lights` y `pad_beacons` (laten).

import * as THREE from "three";
import stationUrl from "./assets/estacion.glb?url";
import { buildModel, loadModel } from "../../../shared-3d/src";

let stationModel;
loadModel(stationUrl).then((m) => { stationModel = m; }).catch((e) => console.error("Estación de Blender:", e));

// La nave arranca en el origen; la cubierta queda justo debajo de ella.
export const createStation = () => {
    if (!stationModel) return null;
    const built = buildModel(stationModel, { emissive: true, castShadow: false });
    const g = built.root;
    g.position.set(0, -1.1, 0);
    const [ring] = built.byPart("pad_ring");
    const glowing = [...built.byPart("pad_lights"), ...built.byPart("pad_beacons")];
    const base = glowing.map((m) => m.material.emissiveIntensity);
    g.userData.update = (time) => {
        ring.rotation.y = time * 0.25;
        glowing.forEach((m, i) => { m.material.emissiveIntensity = base[i] * (0.7 + 0.3 * Math.sin(time * 2.2 + i * 1.7)); });
    };
    return g;
};
