// Nave del jugador: modelo de Blender (art/blender/nave/, Claude) con la nave de primitivas de reserva.
// Extraído de main.jsx en la fase 1b (PLAN-COSMIC-EAR.md); el código no cambió.

import * as THREE from "three";
import shipUrl from "./assets/nave.glb?url";
import { buildModel, loadModel } from "../../../shared-3d/src";

const createPrimitiveSpaceship = () => {
    const g = new THREE.Group();

    // Materiales
    const matWhite = new THREE.MeshStandardMaterial({
        color: 0xd0d0d8,
        metalness: 0.6,
        roughness: 0.3
    });
    const matGray = new THREE.MeshStandardMaterial({
        color: 0x3a3a4a,
        metalness: 0.8,
        roughness: 0.2
    });
    const matOrange = new THREE.MeshStandardMaterial({
        color: 0xff6b00,
        metalness: 0.5,
        roughness: 0.3,
        emissive: 0xff3300,
        emissiveIntensity: 0.2
    });
    const matCockpit = new THREE.MeshStandardMaterial({
        color: 0x88ffaa,
        metalness: 0.1,
        roughness: 0.1,
        transparent: true,
        opacity: 0.6
    });
    const matEngine = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.9
    });

    // === FUSELAJE PRINCIPAL ===
    // Cuerpo central - forma de cuña aerodinámica
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(0, 0);
    bodyShape.lineTo(0.6, 0.15);
    bodyShape.lineTo(0.6, 0.35);
    bodyShape.lineTo(0, 0.5);
    bodyShape.lineTo(-0.6, 0.35);
    bodyShape.lineTo(-0.6, 0.15);
    bodyShape.closePath();

    const extrudeSettings = { depth: 3.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.05, bevelSegments: 3 };
    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
    const body = new THREE.Mesh(bodyGeo, matWhite);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 0, -1.5);
    g.add(body);

    // Nariz puntiaguda
    const noseGeo = new THREE.ConeGeometry(0.5, 1.5, 6);
    const nose = new THREE.Mesh(noseGeo, matWhite);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -2.5;
    g.add(nose);

    // Punta naranja de la nariz
    const noseTipGeo = new THREE.ConeGeometry(0.25, 0.4, 6);
    const noseTip = new THREE.Mesh(noseTipGeo, matOrange);
    noseTip.rotation.x = -Math.PI / 2;
    noseTip.position.z = -3.4;
    g.add(noseTip);

    // === CABINA ===
    const cockpitGeo = new THREE.SphereGeometry(0.4, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpit = new THREE.Mesh(cockpitGeo, matCockpit);
    cockpit.rotation.x = -Math.PI / 2;
    cockpit.position.set(0, 0.35, -1.2);
    cockpit.scale.set(1.2, 1, 1.8);
    g.add(cockpit);

    // Marco de cabina
    const cockpitFrameGeo = new THREE.TorusGeometry(0.45, 0.05, 8, 16, Math.PI);
    const cockpitFrame = new THREE.Mesh(cockpitFrameGeo, matGray);
    cockpitFrame.rotation.y = Math.PI / 2;
    cockpitFrame.position.set(0, 0.35, -1.2);
    g.add(cockpitFrame);

    // === ALAS PRINCIPALES ===
    const createWing = (side) => {
        const wingGroup = new THREE.Group();

        // Ala principal - forma angular
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(2.5, -0.8);
        wingShape.lineTo(3, -0.6);
        wingShape.lineTo(3, -0.3);
        wingShape.lineTo(0.5, 0.2);
        wingShape.closePath();

        const wingExtSettings = { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 };
        const wingGeo = new THREE.ExtrudeGeometry(wingShape, wingExtSettings);
        const wing = new THREE.Mesh(wingGeo, matWhite);
        wing.rotation.x = Math.PI / 2;
        wingGroup.add(wing);

        // Borde naranja del ala
        const wingTipShape = new THREE.Shape();
        wingTipShape.moveTo(2.5, -0.8);
        wingTipShape.lineTo(3, -0.6);
        wingTipShape.lineTo(3, -0.3);
        wingTipShape.lineTo(2.6, -0.5);
        wingTipShape.closePath();

        const wingTipGeo = new THREE.ExtrudeGeometry(wingTipShape, { depth: 0.1, bevelEnabled: false });
        const wingTip = new THREE.Mesh(wingTipGeo, matOrange);
        wingTip.rotation.x = Math.PI / 2;
        wingTip.position.y = 0.01;
        wingGroup.add(wingTip);

        // Detalle gris en ala
        const wingDetailGeo = new THREE.BoxGeometry(0.8, 0.12, 0.3);
        const wingDetail = new THREE.Mesh(wingDetailGeo, matGray);
        wingDetail.position.set(1.2, 0, -0.2);
        wingGroup.add(wingDetail);

        // Panel naranja en ala
        const wingPanelGeo = new THREE.BoxGeometry(0.4, 0.13, 0.15);
        const wingPanel = new THREE.Mesh(wingPanelGeo, matOrange);
        wingPanel.position.set(0.8, 0.01, 0);
        wingGroup.add(wingPanel);

        wingGroup.position.set(side * 0.5, 0.1, 0.3);
        wingGroup.scale.x = side;

        return wingGroup;
    };

    g.add(createWing(1));
    g.add(createWing(-1));

    // === ESTABILIZADORES TRASEROS (COLAS) ===
    const createTailFin = (side) => {
        const finGroup = new THREE.Group();

        // Aleta vertical
        const finShape = new THREE.Shape();
        finShape.moveTo(0, 0);
        finShape.lineTo(0.3, 0);
        finShape.lineTo(0.5, 0.8);
        finShape.lineTo(0.2, 1);
        finShape.lineTo(0, 0.7);
        finShape.closePath();

        const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01 });
        const fin = new THREE.Mesh(finGeo, matWhite);
        finGroup.add(fin);

        // Detalle naranja superior
        const finTipGeo = new THREE.BoxGeometry(0.25, 0.15, 0.08);
        const finTip = new THREE.Mesh(finTipGeo, matOrange);
        finTip.position.set(0.35, 0.85, 0.03);
        finGroup.add(finTip);

        // Panel gris
        const finPanelGeo = new THREE.BoxGeometry(0.2, 0.4, 0.08);
        const finPanel = new THREE.Mesh(finPanelGeo, matGray);
        finPanel.position.set(0.25, 0.35, 0.03);
        finGroup.add(finPanel);

        finGroup.position.set(side * 0.8, 0.2, 1.5);
        finGroup.rotation.x = -0.15;

        return finGroup;
    };

    g.add(createTailFin(1));
    g.add(createTailFin(-1));

    // === MOTOR TRASERO ===
    // Cuerpo del motor
    const engineBodyGeo = new THREE.CylinderGeometry(0.5, 0.6, 1, 8);
    const engineBody = new THREE.Mesh(engineBodyGeo, matGray);
    engineBody.rotation.x = Math.PI / 2;
    engineBody.position.z = 1.8;
    g.add(engineBody);

    // Anillo exterior del motor
    const engineRingGeo = new THREE.TorusGeometry(0.55, 0.08, 8, 16);
    const engineRing = new THREE.Mesh(engineRingGeo, matGray);
    engineRing.position.z = 2.3;
    g.add(engineRing);

    // Núcleo brillante del motor
    const engineCoreGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.3, 8);
    const engineCore = new THREE.Mesh(engineCoreGeo, matEngine);
    engineCore.rotation.x = Math.PI / 2;
    engineCore.position.z = 2.2;
    g.add(engineCore);

    // Resplandor interno del motor
    const engineGlowGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const engineGlow = new THREE.Mesh(engineGlowGeo, new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.8
    }));
    engineGlow.position.z = 2.1;
    g.add(engineGlow);

    // Detalles del motor (paneles naranjas)
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const detailGeo = new THREE.BoxGeometry(0.15, 0.15, 0.3);
        const detail = new THREE.Mesh(detailGeo, matOrange);
        detail.position.set(
            Math.cos(angle) * 0.45,
            Math.sin(angle) * 0.45,
            2
        );
        g.add(detail);
    }

    // === CAÑÓN INFERIOR ===
    const cannonGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.2, 6);
    const cannon = new THREE.Mesh(cannonGeo, matGray);
    cannon.rotation.x = -Math.PI / 2;
    cannon.position.set(0, -0.25, -2.2);
    g.add(cannon);

    // Punta del cañón
    const cannonTipGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.2, 6);
    const cannonTip = new THREE.Mesh(cannonTipGeo, matGray);
    cannonTip.rotation.x = -Math.PI / 2;
    cannonTip.position.set(0, -0.25, -2.9);
    g.add(cannonTip);

    // === DETALLES ADICIONALES ===
    // Paneles superiores
    const topPanelGeo = new THREE.BoxGeometry(0.3, 0.08, 0.5);
    const topPanel1 = new THREE.Mesh(topPanelGeo, matGray);
    topPanel1.position.set(0.25, 0.3, 0.5);
    g.add(topPanel1);

    const topPanel2 = new THREE.Mesh(topPanelGeo, matGray);
    topPanel2.position.set(-0.25, 0.3, 0.5);
    g.add(topPanel2);

    // Líneas naranjas decorativas
    const stripeGeo = new THREE.BoxGeometry(0.05, 0.02, 2);
    const stripe1 = new THREE.Mesh(stripeGeo, matOrange);
    stripe1.position.set(0.4, 0.26, -0.5);
    g.add(stripe1);

    const stripe2 = new THREE.Mesh(stripeGeo, matOrange);
    stripe2.position.set(-0.4, 0.26, -0.5);
    g.add(stripe2);

    // === ILUMINACIÓN DEL MOTOR ===
    const engineLight = new THREE.PointLight(0xff6600, 3, 15);
    engineLight.position.z = 2.5;
    g.add(engineLight);

    // Guardar referencias para animación
    g.userData = {
        engine: engineCore,
        engineLight: engineLight,
        engineGlow: engineGlow
    };

    // Escalar para el juego
    g.scale.set(0.7, 0.7, 0.7);

    return g;
};

// ---- Nave de Blender (fase 3 de PLAN-COSMIC-EAR.md) ----
// Partes: `hull` (todo lo fijo) y `engine` (disco del motor en +Z; el juego anima su opacidad).
// Se pide al cargar el módulo: para cuando empieza la misión ya está en memoria.
let shipModel;
loadModel(shipUrl).then((m) => { shipModel = m; }).catch((e) => console.error("Nave de Blender:", e));

export const createSpaceship = () => {
    if (!shipModel) return createPrimitiveSpaceship();
    const built = buildModel(shipModel, { emissive: true, castShadow: false });
    const g = built.root;
    const [engine] = built.byPart("engine");

    // Resplandor y luz del motor, como en la nave anterior (main.jsx los anima).
    const engineGlow = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 }));
    engineGlow.position.z = 2.72;
    g.add(engineGlow);
    const engineLight = new THREE.PointLight(0xff6600, 3, 15);
    engineLight.position.z = 3.1;
    g.add(engineLight);

    g.userData = { engine, engineLight, engineGlow };
    g.scale.set(0.7, 0.7, 0.7);
    return g;
};
