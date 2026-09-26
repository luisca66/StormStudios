// Partículas de acierto y estrellas fugaces.
// Extraído de main.jsx en la fase 1b (PLAN-COSMIC-EAR.md); el código no cambió.

import * as THREE from "three";

// Particle system for success effect
export const createParticleSystem = (scene) => {
    const particles = [];
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);

    const spawnParticles = (position, color) => {
        const count = 20;
        for (let i = 0; i < count; i++) {
            const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 });
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                ),
                life: 1.0,
                decay: 0.02 + Math.random() * 0.02
            };
            scene.add(particle);
            particles.push(particle);
        }
    };

    const updateParticles = () => {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.position.add(p.userData.velocity.clone().multiplyScalar(0.1));
            p.userData.velocity.multiplyScalar(0.95);
            p.userData.life -= p.userData.decay;
            p.material.opacity = p.userData.life;
            p.scale.setScalar(1 + (1 - p.userData.life) * 2);

            if (p.userData.life <= 0) {
                scene.remove(p);
                p.geometry.dispose();
                p.material.dispose();
                particles.splice(i, 1);
            }
        }
    };

    return { spawnParticles, updateParticles };
};

// Shooting star system
export const createShootingStarSystem = (scene) => {
    const shootingStars = [];

    const spawnShootingStar = () => {
        // Random starting position in a sphere around the scene
        const distance = 300 + Math.random() * 400;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const startPos = new THREE.Vector3(
            distance * Math.sin(phi) * Math.cos(theta),
            distance * Math.sin(phi) * Math.sin(theta),
            distance * Math.cos(phi)
        );

        // Random direction (opposite to ensure it crosses view)
        const direction = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        ).normalize();

        // Create trail with multiple points
        const trailLength = 15;
        const points = [];
        for (let i = 0; i < trailLength; i++) {
            points.push(startPos.clone());
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            linewidth: 2
        });

        const line = new THREE.Line(geometry, material);

        // Create bright yellow point at the tip
        const pointGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const pointMat = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0
        });
        const point = new THREE.Mesh(pointGeo, pointMat);
        point.position.copy(startPos);
        scene.add(point);

        // Create glow effect around the point
        const glowGeo = new THREE.SphereGeometry(1.5, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffdd00,
            transparent: true,
            opacity: 0
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(startPos);
        scene.add(glow);

        line.userData = {
            velocity: direction.multiplyScalar(8 + Math.random() * 4),
            life: 1.0,
            maxLife: 1.0,
            fadeIn: true,
            trailPositions: points.map(p => p.clone()),
            point: point,
            glow: glow,
            flashTime: 0,
            flashInterval: 150 + Math.random() * 50 // 150-200ms
        };

        scene.add(line);
        shootingStars.push(line);
    };

    const updateShootingStars = () => {
        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const star = shootingStars[i];

            // Update trail positions
            const positions = star.userData.trailPositions;
            for (let j = positions.length - 1; j > 0; j--) {
                positions[j].copy(positions[j - 1]);
            }
            positions[0].add(star.userData.velocity);

            // Update geometry
            const posArray = new Float32Array(positions.length * 3);
            for (let j = 0; j < positions.length; j++) {
                posArray[j * 3] = positions[j].x;
                posArray[j * 3 + 1] = positions[j].y;
                posArray[j * 3 + 2] = positions[j].z;
            }
            star.geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

            // Update point and glow position to follow the tip
            const point = star.userData.point;
            const glow = star.userData.glow;
            if (point && glow) {
                point.position.copy(positions[0]);
                glow.position.copy(positions[0]);

                // Flash effect - update flash timer
                star.userData.flashTime += 16; // ~16ms per frame at 60fps
                if (star.userData.flashTime >= star.userData.flashInterval) {
                    star.userData.flashTime = 0;
                }

                // Calculate flash intensity (0 to 1)
                const flashProgress = star.userData.flashTime / star.userData.flashInterval;
                const flashIntensity = Math.sin(flashProgress * Math.PI); // Smooth flash
            }

            // Fade in/out
            if (star.userData.fadeIn) {
                star.material.opacity += 0.05;

                // Fade in point and glow
                if (point && glow) {
                    const flashProgress = star.userData.flashTime / star.userData.flashInterval;
                    const flashIntensity = Math.sin(flashProgress * Math.PI);

                    point.material.opacity = Math.min(1.0, point.material.opacity + 0.08) * (0.7 + flashIntensity * 0.3);
                    glow.material.opacity = Math.min(0.6, glow.material.opacity + 0.05) * (0.4 + flashIntensity * 0.6);
                }

                if (star.material.opacity >= 0.8) {
                    star.userData.fadeIn = false;
                }
            } else {
                star.userData.life -= 0.008;
                star.material.opacity = star.userData.life * 0.8;

                // Fade out point and glow
                if (point && glow) {
                    const flashProgress = star.userData.flashTime / star.userData.flashInterval;
                    const flashIntensity = Math.sin(flashProgress * Math.PI);

                    point.material.opacity = star.userData.life * (0.7 + flashIntensity * 0.3);
                    glow.material.opacity = star.userData.life * 0.6 * (0.4 + flashIntensity * 0.6);
                }
            }

            // Remove when done
            if (star.userData.life <= 0) {
                scene.remove(star);
                star.geometry.dispose();
                star.material.dispose();

                // Clean up point and glow
                if (point) {
                    scene.remove(point);
                    point.geometry.dispose();
                    point.material.dispose();
                }
                if (glow) {
                    scene.remove(glow);
                    glow.geometry.dispose();
                    glow.material.dispose();
                }

                shootingStars.splice(i, 1);
            }
        }
    };

    // Spawn shooting stars at random intervals (4-5 seconds)
    const scheduleNext = () => {
        const delay = 4000 + Math.random() * 1000; // 4-5 seconds
        setTimeout(() => {
            spawnShootingStar();
            scheduleNext();
        }, delay);
    };
    scheduleNext();

    return { updateShootingStars };
};
