// Planetas y lunas: datos del acorde y malla.
// Extraído de main.jsx en la fase 1b (PLAN-COSMIC-EAR.md); el código no cambió.

import * as THREE from "three";
import planetsUrl from "./assets/planetas.glb?url";
import moonsUrl from "./assets/lunas.glb?url";
import { buildPart, loadModel } from "../../../shared-3d/src";
import { INSTRUMENTS, NOTES, NOTE_COLORS, shuffleArray } from "../config.js";

export const generatePlanet = (id, pos, numMoons, instrumentOption) => {
    const notes = [];
    const semitones = shuffleArray(Array.from({ length: 60 }, (_, i) => i)).slice(0, numMoons);
    for (const semitone of semitones) {
        const ni = semitone % 12;
        const octave = 2 + Math.floor(semitone / 12);
        notes.push({ note: NOTES[ni], index: ni, octave, solved: false });
    }
    notes.sort((a, b) => a.octave !== b.octave ? a.octave - b.octave : a.index - b.index);
    const instrument = instrumentOption;
    return { id, position: pos, notes, instrument, size: 1.5 + numMoons * 0.3, primaryColor: NOTE_COLORS[notes[0].note], name: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(Math.random() * 999)}`, completed: false };
};

// ---- Modelos de Blender (fase 3 de PLAN-COSMIC-EAR.md) ----
// Planetas-instrumento de Astra (`<inst>_core` y `<inst>_ring`, radio 1) y lunas de Gemini
// (moon_smooth / moon_crater / moon_crystal, radio 1, casi blancas: se tiñen con la nota).
// Se piden al cargar el módulo; si no llegan, quedan las esferas de antes.
let planetModel, moonModel;
loadModel(planetsUrl).then((m) => { planetModel = m; }).catch((e) => console.error("Planetas de Blender:", e));
loadModel(moonsUrl).then((m) => { moonModel = m; }).catch((e) => console.error("Lunas de Blender:", e));
const MOON_PARTS = ["moon_smooth", "moon_crater", "moon_crystal"];

// El instrumento del planeta decide su forma; con «Aleatorio» se reparte por id.
const planetKind = (pl) => {
    const inst = INSTRUMENTS.includes(pl.instrument) ? pl.instrument : INSTRUMENTS[pl.id % INSTRUMENTS.length];
    return inst.toLowerCase();
};

const findPart = (model, name) => model && model.parts.find((part) => part.part === name);

export const createPlanetMesh = (pl) => {
    const g = new THREE.Group();
    const kind = planetKind(pl);
    const corePart = findPart(planetModel, `${kind}_core`);
    let m;
    if (corePart) {
        m = buildPart(corePart, { emissive: true, castShadow: false });
        m.position.set(0, 0, 0);
        m.scale.setScalar(pl.size);
    } else {
        m = new THREE.Mesh(new THREE.SphereGeometry(pl.size, 32, 32), new THREE.MeshStandardMaterial({ color: pl.primaryColor, metalness: 0.3, roughness: 0.7, emissive: pl.primaryColor, emissiveIntensity: 0.2 }));
    }
    m.userData.isPlanetCore = true; g.add(m);
    const ringPart = findPart(planetModel, `${kind}_ring`);
    if (ringPart) {
        const ring = buildPart(ringPart, { emissive: true, castShadow: false });
        ring.position.set(0, 0, 0);
        ring.scale.setScalar(pl.size);
        ring.rotation.x = 0.35;                                   // un poco inclinado, como un Saturno
        ring.onBeforeRender = () => { ring.rotation.y += 0.004; }; // gira despacio
        ring.userData.isRing = true;
        g.add(ring);
    }
    const glow = new THREE.Mesh(new THREE.SphereGeometry(pl.size * 1.3, 32, 32), new THREE.MeshBasicMaterial({ color: pl.primaryColor, transparent: true, opacity: 0.0, side: THREE.BackSide }));
    glow.userData.isGlow = true; g.add(glow);
    pl.notes.forEach((note, i) => {
        const moonPart = findPart(moonModel, MOON_PARTS[i % MOON_PARTS.length]);
        const moonGeo = moonPart ? moonPart.geometry : new THREE.SphereGeometry(0.4, 16, 16);
        const moon = new THREE.Mesh(moonGeo, new THREE.MeshStandardMaterial({ color: NOTE_COLORS[note.note], emissive: NOTE_COLORS[note.note], emissiveIntensity: 0.5, transparent: true, opacity: 1 }));
        if (moonPart) { moon.geometry = moonGeo; moon.userData.baseScale = 0.4; moon.scale.setScalar(0.4); }
        moon.userData.orbitRadius = pl.size * 2 + i * 0.8;
        moon.userData.orbitSpeed = 0.3 + i * 0.15;
        moon.userData.orbitOffset = (i / pl.notes.length) * Math.PI * 2;
        moon.userData.isMoon = true;
        moon.userData.moonIndex = i;
        moon.userData.baseColor = NOTE_COLORS[note.note];
        moon.userData.dissolving = false;
        moon.userData.dissolveProgress = 0;
        g.add(moon);
    });
    g.position.copy(pl.position);
    g.userData.planetData = pl;
    g.userData.collisionRadius = pl.size + 1.5;
    g.userData.moonsOrbitPaused = false;
    return g;
};
