// Escena de una misión: cielo, nave, planetas, estación y asteroides, controles y bucle de dibujo.
// Extraído de main.jsx en la fase 1b paso 2 (PLAN-COSMIC-EAR.md). React la crea al empezar la misión y
// la destruye al salir; se comunica con React solo por los callbacks de `hooks`.

import * as THREE from "three";
import { MAX_SHIP_SPEED, THRUST_ACCELERATION } from "../config.js";
import { createAsteroids } from "./asteroids.js";
import { createParticleSystem, createShootingStarSystem } from "./effects.js";
import { createPlanetMesh, generatePlanet } from "./planets.js";
import { createNebula, createStarfield } from "./sky.js";
import { createSpaceship } from "./spaceship.js";
import { createStation } from "./station.js";

const INTERACT_DISTANCE = 12;
const ROTATION_SPEED = 0.03;
const STEER_KEYS = ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyQ', 'KeyE'];
const AXIS = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

/**
 * hooks:
 *   isTunerOpen()                 — con el afinador abierto la nave no se mueve ni se eligen planetas
 *   onPlanetClicked(planetGroup)  — clic en un planeta cercano y sin completar
 *   onEscape()
 *   onNearest(planetData | null, canInteract), onSpeed(percent)
 *   onEngine(speed, thrust), onSteering(steering)   — para el sonido del motor
 */
export class CosmicScene {
    constructor(mount, { numMoons, instrument }, hooks) {
        this.mount = mount;
        this.hooks = hooks;
        this.keys = {};
        this.velocity = new THREE.Vector3();
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.hoveredId = null;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(0, 3, 10);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mount.appendChild(this.renderer.domElement);

        this.buildWorld(numMoons, instrument);
        this.listen();
        this.clock = new THREE.Clock();
        this.frame = requestAnimationFrame(this.animate);
    }

    buildWorld(numMoons, instrument) {
        const scene = this.scene;
        // Luz cálida del sistema solar musical: cielo dorado, suelo violeta y un contraluz magenta.
        scene.add(new THREE.HemisphereLight(0xffe2b8, 0x2a1650, 1.6));
        const sun = new THREE.DirectionalLight(0xfff1d0, 2.4); sun.position.set(100, 50, 100); scene.add(sun);
        const rim = new THREE.DirectionalLight(0xff6fb5, 1.2); rim.position.set(-80, 20, -120); scene.add(rim);
        scene.add(createStarfield());
        this.nebula = createNebula(); scene.add(this.nebula);
        this.ship = createSpaceship(); scene.add(this.ship);
        this.particles = createParticleSystem(scene);
        this.shootingStars = createShootingStarSystem(scene);

        this.planets = [];
        for (let i = 0; i < 15; i++) {
            const d = 25 + Math.random() * 150, t = Math.random() * Math.PI * 2, p = (Math.random() - 0.5) * Math.PI * 0.5;
            const pos = new THREE.Vector3(d * Math.cos(p) * Math.cos(t), d * Math.sin(p), d * Math.cos(p) * Math.sin(t));
            const mesh = createPlanetMesh(generatePlanet(i, pos, numMoons, instrument));
            scene.add(mesh);
            this.planets.push(mesh);
        }
        this.station = createStation(); if (this.station) scene.add(this.station);
        this.asteroids = createAsteroids(this.planets); if (this.asteroids) scene.add(this.asteroids);
    }

    listen() {
        this.onKeyDown = e => { this.keys[e.code] = true; if (e.code === 'Escape' && this.hooks.isTunerOpen()) this.hooks.onEscape(); };
        this.onKeyUp = e => { this.keys[e.code] = false; };
        this.onMouseMove = e => { this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1; this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1; };
        this.onClick = () => {
            if (this.hooks.isTunerOpen()) return;
            const clicked = this.planetUnderMouse();
            if (clicked && this.ship.position.distanceTo(clicked.position) < INTERACT_DISTANCE && !clicked.userData.planetData.completed) {
                this.hooks.onPlanetClicked(clicked);
            }
        };
        this.onResize = () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('click', this.onClick);
        window.addEventListener('resize', this.onResize);
    }

    planetUnderMouse() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hits = this.raycaster.intersectObjects(this.planets.flatMap(p => p.children.filter(c => c.userData.isPlanetCore)), false);
        return hits.length > 0 ? hits[0].object.parent : null;
    }

    /** La luna `moonIndex` del planeta estalla en partículas de su color y se disuelve. */
    dissolveMoon(planetGroup, moonIndex, color) {
        const moon = planetGroup.children.find(c => c.userData.isMoon && c.userData.moonIndex === moonIndex);
        if (!moon || !this.particles) return;
        const worldPos = new THREE.Vector3();
        moon.getWorldPosition(worldPos);
        this.particles.spawnParticles(worldPos, color);
        moon.userData.dissolving = true;
        moon.userData.dissolveProgress = 0;
    }

    animate = () => {
        this.frame = requestAnimationFrame(this.animate);
        const dt = this.clock.getDelta();
        const time = this.clock.elapsedTime;
        this.nebula.material.uniforms.uTime.value = time;
        if (this.station) this.station.userData.update(time);
        if (this.asteroids) this.asteroids.userData.update(dt);
        if (this.particles) this.particles.updateParticles();
        if (this.shootingStars) this.shootingStars.updateShootingStars();

        if (!this.hooks.isTunerOpen()) {
            this.fly(time);
            const hovered = this.planetUnderMouse();
            this.hoveredId = hovered && !hovered.userData.planetData.completed ? hovered.userData.planetData.id : null;
        }
        this.animatePlanets(time);
        this.reportNearest();
        this.renderer.render(this.scene, this.camera);
    };

    /** Controles de la nave (rotación en ejes locales, empuje, choque con planetas) y cámara detrás. */
    fly(time) {
        const ship = this.ship, keys = this.keys;
        const turn = (axis, angle) => ship.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axis, angle));
        if (keys['KeyA'] || keys['ArrowLeft']) turn(AXIS.y, ROTATION_SPEED);
        if (keys['KeyD'] || keys['ArrowRight']) turn(AXIS.y, -ROTATION_SPEED);
        if (keys['KeyW'] || keys['ArrowUp']) turn(AXIS.x, ROTATION_SPEED);
        if (keys['KeyS'] || keys['ArrowDown']) turn(AXIS.x, -ROTATION_SPEED);
        if (keys['KeyQ']) turn(AXIS.z, ROTATION_SPEED);
        if (keys['KeyE']) turn(AXIS.z, -ROTATION_SPEED);

        const thrust = keys['Space'] || keys['ShiftLeft'];
        if (thrust) {
            const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
            this.velocity.add(dir.multiplyScalar((keys['ShiftLeft'] ? 0.7 : 0.5) * THRUST_ACCELERATION));
            ship.userData.engine.material.opacity = 0.8 + Math.sin(time * 20) * 0.2;
            ship.userData.engineLight.intensity = 3 + Math.sin(time * 20);
        } else { ship.userData.engine.material.opacity = 0.4; ship.userData.engineLight.intensity = 1; }

        let spd = this.velocity.length();
        if (spd > MAX_SHIP_SPEED) { this.velocity.multiplyScalar(MAX_SHIP_SPEED / spd); spd = MAX_SHIP_SPEED; }

        const newPos = ship.position.clone().add(this.velocity);
        let collision = false;
        this.planets.forEach(pg => {
            if (newPos.distanceTo(pg.position) < pg.userData.collisionRadius + 2) {
                collision = true;
                this.velocity.copy(newPos.clone().sub(pg.position).normalize().multiplyScalar(0.1));
            }
        });
        if (!collision) ship.position.add(this.velocity);
        this.velocity.multiplyScalar(0.98);
        this.hooks.onEngine(spd, thrust);
        this.hooks.onSteering(STEER_KEYS.some(k => keys[k]));
        this.hooks.onSpeed(Math.round(spd * 100));

        const camOff = new THREE.Vector3(0, 2, 8).applyQuaternion(ship.quaternion);
        this.camera.position.lerp(ship.position.clone().add(camOff), 0.1);
        this.camera.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(ship.quaternion));
        this.camera.lookAt(ship.position);
    }

    /** Giro, brillo al pasar el ratón, lunas en órbita o disolviéndose. */
    animatePlanets(time) {
        this.planets.forEach(pg => {
            pg.children[0].rotation.y += 0.002;
            const glow = pg.children.find(c => c.userData.isGlow);
            if (glow) {
                const tgt = pg.userData.planetData.id === this.hoveredId && !pg.userData.planetData.completed ? 0.4 : 0;
                glow.material.opacity += (tgt - glow.material.opacity) * 0.1;
            }
            pg.children.forEach(c => {
                if (!c.userData.isMoon) return;
                if (c.userData.dissolving) {
                    c.userData.dissolveProgress += 0.04;
                    const p = c.userData.dissolveProgress;
                    c.scale.setScalar((c.userData.baseScale ?? 1) * (1 + p * 3));
                    c.material.opacity = Math.max(0, 1 - p);
                    c.material.emissiveIntensity = 2 + p * 8;
                    if (p >= 1) c.visible = false;
                } else if (!pg.userData.moonsOrbitPaused && c.visible) {
                    const a = time * c.userData.orbitSpeed + c.userData.orbitOffset;
                    c.position.set(Math.cos(a) * c.userData.orbitRadius, Math.sin(a * 2) * 0.3, Math.sin(a) * c.userData.orbitRadius);
                }
            });
        });
    }

    reportNearest() {
        let nearest = null, nearestDist = Infinity;
        this.planets.forEach(pg => {
            if (pg.userData.planetData.completed) return;
            const d = this.ship.position.distanceTo(pg.position);
            if (d < nearestDist) { nearestDist = d; nearest = { ...pg.userData.planetData, distance: Math.round(d) }; }
        });
        this.hooks.onNearest(nearest, !!nearest && nearestDist < INTERACT_DISTANCE);
    }

    dispose() {
        cancelAnimationFrame(this.frame);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('click', this.onClick);
        window.removeEventListener('resize', this.onResize);
        if (this.renderer.domElement.parentNode === this.mount) this.mount.removeChild(this.renderer.domElement);
        this.renderer.dispose();
    }
}
