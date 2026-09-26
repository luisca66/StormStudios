// Planetas y lunas: datos del acorde y malla.
// Extraído de main.jsx en la fase 1b (PLAN-COSMIC-EAR.md); el código no cambió.

import * as THREE from "three";
import { NOTES, NOTE_COLORS, shuffleArray } from "../config.js";

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

export const createPlanetMesh = (pl) => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.SphereGeometry(pl.size, 32, 32), new THREE.MeshStandardMaterial({ color: pl.primaryColor, metalness: 0.3, roughness: 0.7, emissive: pl.primaryColor, emissiveIntensity: 0.2 }));
    m.userData.isPlanetCore = true; g.add(m);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(pl.size * 1.3, 32, 32), new THREE.MeshBasicMaterial({ color: pl.primaryColor, transparent: true, opacity: 0.0, side: THREE.BackSide }));
    glow.userData.isGlow = true; g.add(glow);
    pl.notes.forEach((note, i) => {
        const moon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), new THREE.MeshStandardMaterial({ color: NOTE_COLORS[note.note], emissive: NOTE_COLORS[note.note], emissiveIntensity: 0.5, transparent: true, opacity: 1 }));
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
