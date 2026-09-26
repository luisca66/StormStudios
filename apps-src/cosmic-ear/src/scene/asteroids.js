// Asteroides decorativos (art/blender/asteroides/, Gemini): 3 variantes instanciadas.
// Cinturones que giran despacio alrededor de algunos planetas, más una nube suelta entre planetas.
// Sin colisión: son adorno.

import * as THREE from "three";
import asteroidsUrl from "./assets/asteroides.glb?url";
import { buildPart, loadModel } from "../../../shared-3d/src";

let asteroidModel;
loadModel(asteroidsUrl).then((m) => { asteroidModel = m; }).catch((e) => console.error("Asteroides de Blender:", e));
const VARIANTS = ["asteroid_a", "asteroid_b", "asteroid_c"];

const randomRotation = () => new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);

// placements: [{ position, scale }] -> un grupo con una InstancedMesh por variante.
const buildField = (placements) => {
    const g = new THREE.Group();
    VARIANTS.forEach((name, v) => {
        const part = asteroidModel.parts.find((p) => p.part === name);
        const mine = placements.filter((_, i) => i % VARIANTS.length === v);
        if (!part || mine.length === 0) return;
        const proto = buildPart(part, { castShadow: false });
        const mesh = new THREE.InstancedMesh(part.geometry, proto.material, mine.length);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion();
        mine.forEach((p, i) => {
            q.setFromEuler(randomRotation());
            m.compose(p.position, q, new THREE.Vector3().setScalar(p.scale));
            mesh.setMatrixAt(i, m);
        });
        mesh.frustumCulled = false;   // el grupo gira: la caja de la geometría base no sirve
        g.add(mesh);
    });
    return g;
};

// Anillo de rocas más allá de la última luna, inclinado.
const buildBelt = (planetGroup) => {
    const pl = planetGroup.userData.planetData;
    const radius = pl.size * 2 + pl.notes.length * 0.8 + 3;
    const placements = [];
    const count = 30;
    for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.15;
        const r = radius + (Math.random() - 0.5) * 2.2;
        placements.push({
            position: new THREE.Vector3(Math.cos(a) * r, (Math.random() - 0.5) * 0.8, Math.sin(a) * r),
            scale: 0.3 + Math.random() * 0.6,
        });
    }
    const belt = buildField(placements);
    belt.position.copy(planetGroup.position);
    belt.rotation.order = "ZXY";   // gira en su propio eje Y y después se inclina
    belt.rotation.set(0.25 + Math.random() * 0.3, 0, (Math.random() - 0.5) * 0.4);
    belt.userData.spin = (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.03);
    return belt;
};

// Rocas sueltas entre planetas, lejos de la estación y de cada planeta.
const buildScatter = (planetGroups, count = 90) => {
    const placements = [];
    let tries = 0;
    while (placements.length < count && tries++ < count * 20) {
        const d = 18 + Math.random() * 170, t = Math.random() * Math.PI * 2, p = (Math.random() - 0.5) * Math.PI * 0.6;
        const pos = new THREE.Vector3(d * Math.cos(p) * Math.cos(t), d * Math.sin(p), d * Math.cos(p) * Math.sin(t));
        if (planetGroups.some((pg) => pg.position.distanceTo(pos) < pg.userData.collisionRadius + 12)) continue;
        placements.push({ position: pos, scale: 0.5 + Math.random() * 0.9 });
    }
    return buildField(placements);
};

// Devuelve un grupo con cinturones (uno de cada tres planetas) y la nube suelta; `update(dt)` los hace girar.
export const createAsteroids = (planetGroups) => {
    if (!asteroidModel) return null;
    const root = new THREE.Group();
    const belts = planetGroups.filter((_, i) => i % 3 === 0).map(buildBelt);
    belts.forEach((b) => root.add(b));
    root.add(buildScatter(planetGroups));
    root.userData.update = (dt) => { belts.forEach((b) => { b.rotation.y += b.userData.spin * dt; }); };
    return root;
};
