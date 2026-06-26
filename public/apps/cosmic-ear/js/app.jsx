        // React/ReactDOM se cargan como UMD globales (ver index.html). Exponemos
        // los hooks y createRoot como bindings locales (el JSX classic usa React.createElement).
        const { useState, useEffect, useRef } = React;
        const { createRoot } = ReactDOM;

        const LANG = new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'es';
        const TXT = {
            es: {
                subtitle: 'ENTRENAMIENTO AUDITIVO ESPACIAL',
                loadingSounds: 'CARGANDO SONIDOS...',
                audioReady: 'Audio listo ✓',
                enableMicrophone: 'ACTIVAR MICRÓFONO',
                micActive: 'Micrófono activo ✓',
                micPermissionDenied: 'Permiso denegado',
                micError: 'Error de micrófono',
                moonCount: 'Número de Lunas',
                missionDuration: 'Duración de la Misión',
                minutes: 'minutos',
                backgroundMusic: 'Música de Fondo',
                startMission: 'INICIAR MISIÓN',
                enableMicShort: 'ACTIVA EL MICRÓFONO',
                developedBy: 'Desarrollado por',
                forLabel: 'para',
                exit: 'SALIR',
                time: 'Tiempo',
                planet: 'Planeta',
                note: 'Nota',
                noteNumber: (n) => `Nota ${n}`,
                speed: 'Velocidad',
                direction: 'Dirección',
                spaceKey: 'ESPACIO',
                accelerate: 'Acelerar',
                sing: 'Cantar',
                clickPlanet: '🎯 Haz click en el planeta',
                listenPrompt: '🎵 Escucha...',
                completedPrompt: '🎉 ¡Completado!',
                singPrompt: '🎤 ¡Canta!',
                playingStatus: '🎵 Reproduciendo...',
                holdStatus: '✨ ¡Mantén!',
                listeningStatus: '🎤 Escuchando...',
                timeUp: '¡TIEMPO AGOTADO!',
                missionCompleted: 'MISIÓN COMPLETADA',
                finalScore: 'Puntuación Final',
                points: 'puntos',
                newMission: '🔄 NUEVA MISIÓN',
                excellentEar: '🏆 ¡Excelente oído musical!',
                veryGood: '⭐ ¡Muy bien!',
                goodWork: '👍 ¡Buen trabajo!',
                keepPracticing: '💪 ¡Sigue practicando!'
            },
            en: {
                subtitle: 'SPACE EAR TRAINING',
                loadingSounds: 'LOADING SOUNDS...',
                audioReady: 'Audio ready ✓',
                enableMicrophone: 'ENABLE MICROPHONE',
                micActive: 'Microphone active ✓',
                micPermissionDenied: 'Permission denied',
                micError: 'Microphone error',
                moonCount: 'Number of Moons',
                missionDuration: 'Mission Duration',
                minutes: 'minutes',
                backgroundMusic: 'Background Music',
                startMission: 'START MISSION',
                enableMicShort: 'ENABLE THE MICROPHONE',
                developedBy: 'Developed by',
                forLabel: 'for',
                exit: 'EXIT',
                time: 'Time',
                planet: 'Planet',
                note: 'Note',
                noteNumber: (n) => `Note ${n}`,
                speed: 'Speed',
                direction: 'Direction',
                spaceKey: 'SPACE',
                accelerate: 'Accelerate',
                sing: 'Sing',
                clickPlanet: '🎯 Click on the planet',
                listenPrompt: '🎵 Listen...',
                completedPrompt: '🎉 Completed!',
                singPrompt: '🎤 Sing!',
                playingStatus: '🎵 Playing...',
                holdStatus: '✨ Hold!',
                listeningStatus: '🎤 Listening...',
                timeUp: 'TIME UP!',
                missionCompleted: 'MISSION COMPLETE',
                finalScore: 'Final Score',
                points: 'points',
                newMission: '🔄 NEW MISSION',
                excellentEar: '🏆 Excellent musical ear!',
                veryGood: '⭐ Great job!',
                goodWork: '👍 Nice work!',
                keepPracticing: '💪 Keep practicing!'
            }
        };
        const t = TXT[LANG];

        const IconMusic = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
        const IconPlay = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
        const IconLogOut = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;
        const IconMic = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>;

        const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const INSTRUMENTS = ["Piano", "Cello", "Corno", "Coro", "Fagot"];
        // Samples e instrumentos: bucket R2 (mismo que usa la webapp Desglose).
        const BASE_URL = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";
        // Música ambiente: subcarpeta del mismo bucket.
        const MUSIC_BASE = `${BASE_URL}/music/desglose`;
        const NOTE_COLORS = { "C": 0xff0000, "C#": 0xff4400, "D": 0xff8800, "D#": 0xffcc00, "E": 0xffff00, "F": 0x88ff00, "F#": 0x00ff00, "G": 0x00ff88, "G#": 0x00ffff, "A": 0x0088ff, "A#": 0x0000ff, "B": 0x8800ff };
        const MUSIC_TRACKS = [
            { id: 'space-ambient.mp3', name: 'Space Ambient', icon: '🌌' },
            { id: 'cosmic-song.mp3', name: 'Cosmic Song', icon: '🎵' },
            { id: 'orbital-drift.mp3', name: 'Orbital Drift', icon: '🛸' },
            { id: 'silent-orbits.mp3', name: 'Silent Orbits', icon: '🌠' }
        ];

        const getSampleUrl = (inst, ni, oo) => `${BASE_URL}/${inst}/${encodeURIComponent(NOTES[ni])}${4 + oo}.mp3`;

        const getNoteFromPitch = (freq) => {
            const noteNum = 12 * (Math.log(freq / 440) / Math.log(2));
            const midi = Math.round(noteNum) + 69;
            return { note: NOTES[((midi % 12) + 12) % 12], index: ((midi % 12) + 12) % 12, octave: Math.floor(midi / 12) - 1, cents: Math.floor((noteNum - Math.round(noteNum)) * 100), frequency: freq };
        };

        const autoCorrelate = (buf, sr) => {
            let SIZE = buf.length, rms = 0;
            for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
            rms = Math.sqrt(rms / SIZE);
            if (rms < 0.002) return -1;
            let r1 = 0, r2 = SIZE - 1;
            for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < 0.05) { r1 = i; break; }
            for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < 0.05) { r2 = SIZE - i; break; }
            buf = buf.slice(r1, r2); SIZE = buf.length;
            if (SIZE < 2) return -1;
            let c = new Array(SIZE).fill(0);
            for (let i = 0; i < SIZE; i++) for (let j = 0; j < SIZE - i; j++) c[i] += buf[j] * buf[j + i];
            let d = 0; while (d < SIZE - 1 && c[d] > c[d + 1]) d++;
            let maxval = -1, maxpos = -1;
            for (let i = d; i < SIZE; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
            if (maxpos < 1 || maxpos >= SIZE - 1) return -1;
            let T0 = maxpos, x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1], a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2;
            if (a) T0 -= b / (2 * a);
            return sr / T0;
        };

        const createStarfield = (n = 2000) => {
            const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
            for (let i = 0; i < n; i++) {
                const r = 500 + Math.random() * 1000, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
                pos[i*3] = r * Math.sin(p) * Math.cos(t); pos[i*3+1] = r * Math.sin(p) * Math.sin(t); pos[i*3+2] = r * Math.cos(p);
                col[i*3] = col[i*3+1] = col[i*3+2] = 0.5 + Math.random() * 0.5;
            }
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
            return new THREE.Points(geo, new THREE.PointsMaterial({ size: 2, vertexColors: true, transparent: true, opacity: 0.8 }));
        };

        const createNebula = () => new THREE.Mesh(new THREE.SphereGeometry(800, 32, 32), new THREE.ShaderMaterial({
            side: THREE.BackSide, uniforms: { uTime: { value: 0 } },
            vertexShader: `varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `uniform float uTime; varying vec3 vP; float n(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453); }
                void main() { vec3 d = normalize(vP); float n1 = n(d * 3.0 + uTime * 0.01), n2 = n(d * 5.0 - uTime * 0.02);
                vec3 c = mix(vec3(0.0, 0.03, 0.1), vec3(0.08, 0.0, 0.15), n1 * 0.5); c = mix(c, vec3(0.0, 0.08, 0.08), n2 * 0.3); gl_FragColor = vec4(c, 1.0); }`
        }));

        const createSpaceship = () => {
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

        // Particle system for success effect
        const createParticleSystem = (scene) => {
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
        const createShootingStarSystem = (scene) => {
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

        const generatePlanet = (id, pos, numMoons) => {
            const notes = [];
            for (let i = 0; i < numMoons; i++) {
                const semitone = Math.floor(Math.random() * 60);
                const ni = semitone % 12;
                const octave = 2 + Math.floor(semitone / 12);
                notes.push({ note: NOTES[ni], index: ni, octave, solved: false });
            }
            notes.sort((a, b) => a.octave !== b.octave ? a.octave - b.octave : a.index - b.index);
            const instrument = INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)];
            return { id, position: pos, notes, instrument, size: 1.5 + numMoons * 0.3, primaryColor: NOTE_COLORS[notes[0].note], name: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(Math.random() * 999)}`, completed: false };
        };

        const createPlanetMesh = (pl) => {
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

        function App() {
            const [gameState, setGameState] = useState('intro');
            const [numMoons, setNumMoons] = useState(2);
            const [selectedMusic, setSelectedMusic] = useState('space-ambient.mp3');
            const [gameDuration, setGameDuration] = useState(5); // Duración en minutos (3+)
            const [loadingProgress, setLoadingProgress] = useState(0);
            const [isLoaded, setIsLoaded] = useState(false);
            const [micReady, setMicReady] = useState(false);
            const [micError, setMicError] = useState(null);
            const [score, setScore] = useState(0);
            const [nearestPlanet, setNearestPlanet] = useState(null);
            const [canInteract, setCanInteract] = useState(false);
            const [hoveredPlanet, setHoveredPlanet] = useState(null);
            const [speed, setSpeed] = useState(0);
            const [tunerActive, setTunerActive] = useState(false);
            const [activePlanet, setActivePlanet] = useState(null);
            const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
            const [noteStatuses, setNoteStatuses] = useState([]);
            const [detectedNote, setDetectedNote] = useState({ note: '-', cents: 0, frequency: 0 });
            const [inputVolume, setInputVolume] = useState(0);
            const [isMatching, setIsMatching] = useState(false);
            const [tunerPhase, setTunerPhase] = useState('playing');
            const [planetStartTime, setPlanetStartTime] = useState(null);
            const [scorePopup, setScorePopup] = useState(null);
            const [gameTimeLeft, setGameTimeLeft] = useState(5 * 60); // Ahora usa gameDuration
            const [gameOver, setGameOver] = useState(false);
            const [planetTimeElapsed, setPlanetTimeElapsed] = useState(0); // Cronómetro que cuenta hacia adelante

            const mountRef = useRef(null);
            const sceneRef = useRef(null);
            const cameraRef = useRef(null);
            const rendererRef = useRef(null);
            const shipRef = useRef(null);
            const planetMeshesRef = useRef([]);
            const nebulaRef = useRef(null);
            const keysPressed = useRef({});
            const velocityRef = useRef(new THREE.Vector3());
            const shipRotationRef = useRef({ pitch: 0, yaw: 0, roll: 0 });
            const raycasterRef = useRef(new THREE.Raycaster());
            const mouseRef = useRef(new THREE.Vector2());
            const audioCtxRef = useRef(null);
            const analyserRef = useRef(null);
            const micStreamRef = useRef(null);
            const micSourceRef = useRef(null);
            const engineOscRef = useRef(null);
            const engineGainRef = useRef(null);
            const pitchRafRef = useRef(null);
            const audioCacheRef = useRef({});
            const matchStartRef = useRef(null);
            const hoveredPlanetRef = useRef(null);
            const activePlanetMeshRef = useRef(null);
            const animationRef = useRef(null);
            const pitchDetectionActiveRef = useRef(false);
            const particleSystemRef = useRef(null);
            const ambientMusicRef = useRef(null);
            const thrusterNoiseRef = useRef(null);
            const thrusterGainRef = useRef(null);

            useEffect(() => {
                const loadSamples = async () => {
                    const urls = [];
                    INSTRUMENTS.forEach(inst => {
                        for (let oo = -2; oo <= 2; oo++) {
                            for (let ni = 0; ni < 12; ni++) urls.push(getSampleUrl(inst, ni, oo));
                        }
                    });
                    urls.push(`${BASE_URL}/acierto.mp3`);
                    urls.push(`${BASE_URL}/error.mp3`);
                    MUSIC_TRACKS.forEach(track => urls.push(`${MUSIC_BASE}/${track.id}`));

                    let loaded = 0;
                    const loadAudio = (url) => new Promise(resolve => {
                        const audio = new Audio();
                        audio.src = url;
                        audio.preload = 'auto';
                        const done = () => { audioCacheRef.current[url] = audio; loaded++; setLoadingProgress(Math.floor((loaded / urls.length) * 100)); resolve(); };
                        audio.addEventListener('canplaythrough', done, { once: true });
                        audio.addEventListener('error', done, { once: true });
                        setTimeout(done, 3000);
                        audio.load();
                    });

                    for (let i = 0; i < urls.length; i += 10) {
                        await Promise.all(urls.slice(i, i + 10).map(loadAudio));
                    }
                    setIsLoaded(true);
                };
                loadSamples();
            }, []);

            const requestMicPermission = async () => {
                try {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
                    if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
                    
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    micStreamRef.current = stream;
                    const analyser = audioCtxRef.current.createAnalyser();
                    analyser.fftSize = 2048;
                    analyserRef.current = analyser;
                    audioCtxRef.current.createMediaStreamSource(stream).connect(analyser);
                    setMicReady(true);
                    startPitchDetection();
                } catch (err) {
                    setMicError(err.name === 'NotAllowedError' ? t.micPermissionDenied : t.micError);
                }
            };

            const startPitchDetection = () => {
                if (pitchDetectionActiveRef.current) return;
                pitchDetectionActiveRef.current = true;
                const detect = () => {
                    if (!pitchDetectionActiveRef.current || !analyserRef.current || !audioCtxRef.current) {
                        if (pitchDetectionActiveRef.current) pitchRafRef.current = requestAnimationFrame(detect);
                        return;
                    }
                    try {
                        const buf = new Float32Array(analyserRef.current.fftSize);
                        analyserRef.current.getFloatTimeDomainData(buf);
                        let rms = 0;
                        for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
                        setInputVolume(Math.min(100, Math.sqrt(rms / buf.length) * 500));
                        const pitch = autoCorrelate(buf, audioCtxRef.current.sampleRate);
                        if (pitch !== -1 && pitch > 55 && pitch < 4000) setDetectedNote(getNoteFromPitch(pitch));
                        else setDetectedNote(prev => ({ ...prev, frequency: 0 }));
                    } catch (e) {}
                    pitchRafRef.current = requestAnimationFrame(detect);
                };
                detect();
            };

            useEffect(() => {
                return () => {
                    pitchDetectionActiveRef.current = false;
                    if (pitchRafRef.current) cancelAnimationFrame(pitchRafRef.current);
                    if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
                };
            }, []);

            // Game timer countdown
            useEffect(() => {
                if (gameState !== 'playing' || gameOver) return;

                const timer = setInterval(() => {
                    setGameTimeLeft(prev => {
                        if (prev <= 1) {
                            setGameOver(true);
                            clearInterval(timer);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);

                return () => clearInterval(timer);
            }, [gameState, gameOver]);

            // Planet timer - counts UP from 0 to measure how long player takes
            useEffect(() => {
                if (!tunerActive) {
                    setPlanetTimeElapsed(0);
                    return;
                }

                const startTime = Date.now();
                const timer = setInterval(() => {
                    setPlanetTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
                }, 100); // Update every 100ms for smooth display

                return () => clearInterval(timer);
            }, [tunerActive]);

            const startEngineSound = async () => {
                if (!audioCtxRef.current || engineOscRef.current) return;
                if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
                const bufferSize = audioCtxRef.current.sampleRate * 2;
                const noiseBuffer = audioCtxRef.current.createBuffer(1, bufferSize, audioCtxRef.current.sampleRate);
                const data = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                const noise = audioCtxRef.current.createBufferSource();
                noise.buffer = noiseBuffer; noise.loop = true;
                const gain = audioCtxRef.current.createGain(), filter = audioCtxRef.current.createBiquadFilter();
                filter.type = 'lowpass'; filter.frequency.value = 200; gain.gain.value = 0;
                noise.connect(filter); filter.connect(gain); gain.connect(audioCtxRef.current.destination); noise.start();
                engineOscRef.current = noise; engineGainRef.current = gain;
            };

            const startThrusterSound = async () => {
                if (!audioCtxRef.current || thrusterNoiseRef.current) return;
                const bufferSize = audioCtxRef.current.sampleRate * 2;
                const noiseBuffer = audioCtxRef.current.createBuffer(1, bufferSize, audioCtxRef.current.sampleRate);
                const data = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                const noise = audioCtxRef.current.createBufferSource();
                noise.buffer = noiseBuffer; noise.loop = true;
                const gain = audioCtxRef.current.createGain(), filter = audioCtxRef.current.createBiquadFilter();
                filter.type = 'bandpass'; filter.frequency.value = 7000; filter.Q.value = 2;
                gain.gain.value = 0;
                noise.connect(filter); filter.connect(gain); gain.connect(audioCtxRef.current.destination); noise.start();
                thrusterNoiseRef.current = noise; thrusterGainRef.current = gain;
            };

            const updateEngineSound = (spd, thrust) => {
                if (!engineOscRef.current || !audioCtxRef.current) return;
                try {
                    engineGainRef.current.gain.setTargetAtTime(thrust ? 0.5 : (spd > 0.01 ? 0.15 : 0), audioCtxRef.current.currentTime, 0.2);
                } catch(e) {}
            };

            const playSampleChord = (notes, inst) => {
                notes.forEach(n => {
                    const url = getSampleUrl(inst, n.index, n.octave - 4);
                    if (audioCacheRef.current[url]) { const a = audioCacheRef.current[url]; a.currentTime = 0; a.volume = 0.4; a.play().catch(() => {}); }
                });
            };

            const playSuccessSound = () => {
                const url = `${BASE_URL}/acierto.mp3`;
                if (audioCacheRef.current[url]) { const a = audioCacheRef.current[url]; a.currentTime = 0; a.volume = 0.6; a.play().catch(() => {}); }
            };

            const dissolveMoonWithParticles = (moonIndex, color) => {
                if (!activePlanetMeshRef.current) return;
                const moon = activePlanetMeshRef.current.children.find(c => c.userData.isMoon && c.userData.moonIndex === moonIndex);
                if (moon && particleSystemRef.current) {
                    // Spawn particles at moon position (world coordinates)
                    const worldPos = new THREE.Vector3();
                    moon.getWorldPosition(worldPos);
                    particleSystemRef.current.spawnParticles(worldPos, color);
                    moon.userData.dissolving = true;
                    moon.userData.dissolveProgress = 0;
                }
            };

            const calculatePlanetScore = (numNotes, startTime) => {
                // Calcular tiempo transcurrido con mínimo de 0.5 segundos
                let timeElapsed = (Date.now() - startTime) / 1000; // segundos
                timeElapsed = Math.max(0.5, timeElapsed);

                // Multiplicadores según número de notas
                const multipliers = { 1: 1.0, 2: 1.5, 3: 2.5, 4: 4.0, 5: 6.0 };
                const multiplier = multipliers[numNotes] || 1.0;

                // Fórmula: 100 * (1 / tiempo) * multiplicador
                const basePoints = 100 * (1 / timeElapsed) * multiplier;

                // Máximo 2000 puntos por planeta
                return Math.min(2000, Math.round(basePoints));
            };

            const openTunerForPlanet = (planetMesh) => {
                const pl = planetMesh.userData.planetData;
                if (pl.completed) return;
                const firstUnsolved = pl.notes.findIndex(n => !n.solved);
                if (firstUnsolved === -1) return;

                setActivePlanet({...pl});
                setCurrentNoteIndex(firstUnsolved);
                setNoteStatuses(pl.notes.map(n => n.solved ? 'correct' : 'pending'));
                setTunerPhase('playing');
                setIsMatching(false);
                matchStartRef.current = null;
                activePlanetMeshRef.current = planetMesh;
                planetMesh.userData.moonsOrbitPaused = true;
                setTunerActive(true);
                if (ambientMusicRef.current) { try { ambientMusicRef.current.pause(); } catch(e) {} }

                // Iniciar cronómetro si es la primera vez que se abre este planeta
                if (!planetMesh.userData.startTime) {
                    planetMesh.userData.startTime = Date.now();
                    setPlanetStartTime(Date.now());
                }

                playSampleChord(pl.notes, pl.instrument);
                setTimeout(() => setTunerPhase('listening'), 1500);
            };

            const closeTuner = () => {
                if (activePlanetMeshRef.current) activePlanetMeshRef.current.userData.moonsOrbitPaused = false;
                setTunerActive(false);
                setActivePlanet(null);
                activePlanetMeshRef.current = null;
                if (ambientMusicRef.current) { try { ambientMusicRef.current.play(); } catch(e) {} }
            };

            // Note matching effect
            useEffect(() => {
                if (!tunerActive || tunerPhase !== 'listening' || !activePlanet) return;
                const planetMesh = activePlanetMeshRef.current;
                if (!planetMesh) return;
                
                const realPlanetData = planetMesh.userData.planetData;
                const currentUnsolved = realPlanetData.notes.findIndex((n, i) => !n.solved && i >= currentNoteIndex);
                if (currentUnsolved === -1) return;

                const target = realPlanetData.notes[currentUnsolved];
                const match = detectedNote.frequency > 0 && detectedNote.note === target.note && Math.abs(detectedNote.cents) < 30;
                
                if (match) {
                    if (!matchStartRef.current) matchStartRef.current = Date.now();
                    setIsMatching(true);
                    if (Date.now() - matchStartRef.current >= 700) {
                        playSuccessSound();
                        dissolveMoonWithParticles(currentUnsolved, NOTE_COLORS[target.note]);
                        
                        realPlanetData.notes[currentUnsolved].solved = true;
                        setNoteStatuses(prev => { const n = [...prev]; n[currentUnsolved] = 'correct'; return n; });

                        const remaining = realPlanetData.notes.filter(n => !n.solved);
                        if (remaining.length === 0) {
                            // Calcular puntos basados en tiempo
                            const startTime = planetMesh.userData.startTime;
                            const earnedPoints = calculatePlanetScore(realPlanetData.notes.length, startTime);

                            setScore(s => s + earnedPoints);
                            setScorePopup({ points: earnedPoints, show: true });
                            setTimeout(() => setScorePopup(null), 2000);

                            realPlanetData.completed = true;
                            setTunerPhase('success');
                            setTimeout(closeTuner, 1200);
                        } else {
                            const next = realPlanetData.notes.findIndex((n, i) => !n.solved && i > currentUnsolved);
                            setCurrentNoteIndex(next !== -1 ? next : realPlanetData.notes.findIndex(n => !n.solved));
                            matchStartRef.current = null;
                            setIsMatching(false);
                        }
                    }
                } else { matchStartRef.current = null; setIsMatching(false); }
            }, [detectedNote, tunerActive, tunerPhase, currentNoteIndex, activePlanet]);

            useEffect(() => { hoveredPlanetRef.current = hoveredPlanet; }, [hoveredPlanet]);

            const exitGame = () => {
                if (engineOscRef.current) { try { engineOscRef.current.stop(); } catch(e) {} engineOscRef.current = null; }
                if (thrusterNoiseRef.current) { try { thrusterNoiseRef.current.stop(); } catch(e) {} thrusterNoiseRef.current = null; }
                if (ambientMusicRef.current) { try { ambientMusicRef.current.pause(); ambientMusicRef.current.currentTime = 0; } catch(e) {} ambientMusicRef.current = null; }
                setGameState('intro');
                setScore(0);
                setTunerActive(false);
                setActivePlanet(null);
                setGameOver(false);
                setGameTimeLeft(gameDuration * 60);
                setScorePopup(null);
            };

            // Three.js scene
            useEffect(() => {
                if (!mountRef.current || gameState === 'intro') return;

                const scene = new THREE.Scene(); sceneRef.current = scene;
                const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
                camera.position.set(0, 3, 10); cameraRef.current = camera;
                const renderer = new THREE.WebGLRenderer({ antialias: true });
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                mountRef.current.appendChild(renderer.domElement); rendererRef.current = renderer;

                scene.add(new THREE.AmbientLight(0x222244, 0.5));
                const sun = new THREE.DirectionalLight(0xffffff, 1); sun.position.set(100, 50, 100); scene.add(sun);
                scene.add(createStarfield());
                const nebula = createNebula(); scene.add(nebula); nebulaRef.current = nebula;
                const ship = createSpaceship(); scene.add(ship); shipRef.current = ship;

                // Create particle system
                particleSystemRef.current = createParticleSystem(scene);

                // Create shooting star system
                const shootingStarSystem = createShootingStarSystem(scene);

                planetMeshesRef.current = [];
                for (let i = 0; i < 15; i++) {
                    const d = 25 + Math.random() * 150, t = Math.random() * Math.PI * 2, p = (Math.random() - 0.5) * Math.PI * 0.5;
                    const pos = new THREE.Vector3(d * Math.cos(p) * Math.cos(t), d * Math.sin(p), d * Math.cos(p) * Math.sin(t));
                    const pl = generatePlanet(i, pos, numMoons);
                    const mesh = createPlanetMesh(pl);
                    scene.add(mesh);
                    planetMeshesRef.current.push(mesh);
                }

                startEngineSound();
                startThrusterSound();
                const ambientUrl = `${MUSIC_BASE}/${selectedMusic}`;
                if (audioCacheRef.current[ambientUrl]) {
                    const music = audioCacheRef.current[ambientUrl];
                    music.loop = true; music.volume = 0.4;
                    music.play().catch(() => {});
                    ambientMusicRef.current = music;
                }

                const onKeyDown = e => { keysPressed.current[e.code] = true; if (e.code === 'Escape' && tunerActive) closeTuner(); };
                const onKeyUp = e => { keysPressed.current[e.code] = false; };
                const onMouseMove = e => { mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1; mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1; };
                const onClick = () => {
                    if (gameState !== 'playing' || tunerActive) return;
                    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
                    const hits = raycasterRef.current.intersectObjects(planetMeshesRef.current.flatMap(p => p.children.filter(c => c.userData.isPlanetCore)), false);
                    if (hits.length > 0) {
                        const clicked = hits[0].object.parent;
                        if (shipRef.current.position.distanceTo(clicked.position) < 12 && !clicked.userData.planetData.completed) {
                            openTunerForPlanet(clicked);
                        }
                    }
                };

                window.addEventListener('keydown', onKeyDown);
                window.addEventListener('keyup', onKeyUp);
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('click', onClick);

                const clock = new THREE.Clock();
                const animate = () => {
                    animationRef.current = requestAnimationFrame(animate);
                    const time = clock.getElapsedTime();
                    if (nebulaRef.current) nebulaRef.current.material.uniforms.uTime.value = time;

                    // Update particles
                    if (particleSystemRef.current) particleSystemRef.current.updateParticles();

                    // Update shooting stars
                    if (shootingStarSystem) shootingStarSystem.updateShootingStars();

                    // Ship controls (disabled during tuner but ship still visible)
                    if (shipRef.current && gameState === 'playing' && !tunerActive) {
                        const ship = shipRef.current, keys = keysPressed.current;

                        // Rotations using quaternions for local axis rotations
                        const rotationSpeed = 0.03;

                        // Yaw (left/right) - rotate around ship's local Y axis (up)
                        if (keys['KeyA'] || keys['ArrowLeft']) {
                            const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed);
                            ship.quaternion.multiplyQuaternions(ship.quaternion, yawQuat);
                        }
                        if (keys['KeyD'] || keys['ArrowRight']) {
                            const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -rotationSpeed);
                            ship.quaternion.multiplyQuaternions(ship.quaternion, yawQuat);
                        }

                        // Pitch (up/down) - rotate around ship's local X axis (right)
                        if (keys['KeyW'] || keys['ArrowUp']) {
                            const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotationSpeed);
                            ship.quaternion.multiplyQuaternions(ship.quaternion, pitchQuat);
                        }
                        if (keys['KeyS'] || keys['ArrowDown']) {
                            const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -rotationSpeed);
                            ship.quaternion.multiplyQuaternions(ship.quaternion, pitchQuat);
                        }

                        // Roll (rotate around forward axis)
                        if (keys['KeyQ']) {
                            const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotationSpeed);
                            ship.quaternion.multiplyQuaternions(ship.quaternion, rollQuat);
                        }
                        if (keys['KeyE']) {
                            const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -rotationSpeed);
                            ship.quaternion.multiplyQuaternions(ship.quaternion, rollQuat);
                        }

                        const thrust = keys['Space'] || keys['ShiftLeft'];
                        if (thrust) {
                            const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
                            velocityRef.current.add(dir.multiplyScalar((keys['ShiftLeft'] ? 0.7 : 0.5) * 0.004));
                            ship.userData.engine.material.opacity = 0.8 + Math.sin(time * 20) * 0.2;
                            ship.userData.engineLight.intensity = 3 + Math.sin(time * 20);
                        } else { ship.userData.engine.material.opacity = 0.4; ship.userData.engineLight.intensity = 1; }

                        let spd = velocityRef.current.length();
                        if (spd > 2) { velocityRef.current.multiplyScalar(2 / spd); spd = 2; }

                        const newPos = ship.position.clone().add(velocityRef.current);
                        let collision = false;
                        planetMeshesRef.current.forEach(pg => {
                            if (newPos.distanceTo(pg.position) < pg.userData.collisionRadius + 2) {
                                collision = true;
                                velocityRef.current.copy(newPos.clone().sub(pg.position).normalize().multiplyScalar(0.1));
                            }
                        });
                        if (!collision) ship.position.add(velocityRef.current);
                        velocityRef.current.multiplyScalar(0.98);
                        updateEngineSound(spd, thrust);
                        const steering = keys['KeyA'] || keys['KeyD'] || keys['KeyW'] || keys['KeyS'] || keys['ArrowLeft'] || keys['ArrowRight'] || keys['ArrowUp'] || keys['ArrowDown'] || keys['KeyQ'] || keys['KeyE'];
                        if (thrusterGainRef.current && audioCtxRef.current) {
                            try { thrusterGainRef.current.gain.setTargetAtTime(steering ? 0.3 : 0, audioCtxRef.current.currentTime, steering ? 0.005 : 0.05); } catch(e) {}
                        }
                        setSpeed(Math.round(spd * 100));

                        const camOff = new THREE.Vector3(0, 2, 8).applyQuaternion(ship.quaternion);
                        cameraRef.current.position.lerp(ship.position.clone().add(camOff), 0.1);
                        cameraRef.current.up.copy(new THREE.Vector3(0, 1, 0).applyQuaternion(ship.quaternion));
                        cameraRef.current.lookAt(ship.position);
                    }

                    if (gameState === 'playing' && !tunerActive) {
                        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
                        const hits = raycasterRef.current.intersectObjects(planetMeshesRef.current.flatMap(p => p.children.filter(c => c.userData.isPlanetCore)), false);
                        const hovered = hits.length > 0 ? hits[0].object.parent : null;
                        setHoveredPlanet(hovered && !hovered.userData.planetData.completed ? hovered.userData.planetData.id : null);
                    }

                    // Animate planets
                    planetMeshesRef.current.forEach(pg => {
                        pg.children[0].rotation.y += 0.002;
                        const glow = pg.children.find(c => c.userData.isGlow);
                        if (glow) { 
                            const isHovered = pg.userData.planetData.id === hoveredPlanetRef.current;
                            const tgt = isHovered && !pg.userData.planetData.completed ? 0.4 : 0; 
                            glow.material.opacity += (tgt - glow.material.opacity) * 0.1; 
                        }
                        pg.children.forEach(c => {
                            if (c.userData.isMoon) {
                                if (c.userData.dissolving) {
                                    c.userData.dissolveProgress += 0.04;
                                    const p = c.userData.dissolveProgress;
                                    c.scale.setScalar(1 + p * 3);
                                    c.material.opacity = Math.max(0, 1 - p);
                                    c.material.emissiveIntensity = 2 + p * 8;
                                    if (p >= 1) c.visible = false;
                                } else if (!pg.userData.moonsOrbitPaused && c.visible) {
                                    const a = time * c.userData.orbitSpeed + c.userData.orbitOffset;
                                    c.position.set(Math.cos(a) * c.userData.orbitRadius, Math.sin(a * 2) * 0.3, Math.sin(a) * c.userData.orbitRadius);
                                }
                            }
                        });
                    });

                    if (shipRef.current) {
                        let nearest = null, nearestDist = Infinity, nearestMesh = null;
                        planetMeshesRef.current.forEach(pg => {
                            if (!pg.userData.planetData.completed) {
                                const d = shipRef.current.position.distanceTo(pg.position);
                                if (d < nearestDist) { nearestDist = d; nearest = { ...pg.userData.planetData, distance: Math.round(d) }; nearestMesh = pg; }
                            }
                        });
                        setNearestPlanet(nearest);
                        setCanInteract(nearest && nearestDist < 12);
                    }

                    renderer.render(scene, cameraRef.current);
                };
                animate();

                const onResize = () => { cameraRef.current.aspect = window.innerWidth / window.innerHeight; cameraRef.current.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
                window.addEventListener('resize', onResize);

                return () => {
                    window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp);
                    window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('click', onClick);
                    window.removeEventListener('resize', onResize);
                    if (animationRef.current) cancelAnimationFrame(animationRef.current);
                    if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement);
                    renderer.dispose();
                };
            }, [gameState === 'intro' ? 'intro' : 'game', numMoons]);

            const startGame = async () => {
                if (audioCtxRef.current?.state === 'suspended') await audioCtxRef.current.resume();
                setGameTimeLeft(gameDuration * 60); // Use selected duration
                setGameOver(false);
                setScore(0);
                setGameState('playing');
            };

            const canStart = isLoaded && micReady;

            return (
                <div className="w-full h-full relative">
                    <div ref={mountRef} className="w-full h-full" style={{ cursor: gameState === 'playing' && !tunerActive ? 'crosshair' : 'default' }} />
                    
                    {/* INTRO SCREEN */}
                    {gameState === 'intro' && (
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-purple-950 to-black flex items-center justify-center">
                            <div className="bg-slate-900/90 p-8 rounded-2xl border border-cyan-500/50 text-center max-w-md w-full mx-4 shadow-2xl">
                                <h1 className="font-orbitron text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-purple-500 to-yellow-400 bg-clip-text text-transparent">COSMIC EAR</h1>
                                <p className="text-gray-400 mb-6 text-sm tracking-widest">{t.subtitle}</p>
                                
                                {!isLoaded ? (
                                    <div className="mb-4">
                                        <div className="text-cyan-400 text-sm font-bold mb-2 flex items-center justify-center gap-2 animate-pulse">
                                            <IconMusic /> {t.loadingSounds}
                                        </div>
                                        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-white/10">
                                            <div className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full transition-all duration-200" style={{ width: `${loadingProgress}%` }}></div>
                                        </div>
                                        <div className="text-right text-xs text-gray-400 mt-1 font-mono">{loadingProgress}%</div>
                                    </div>
                                ) : (
                                    <div className="mb-4 bg-green-900/30 border border-green-500/30 p-2 rounded-lg text-green-300 text-xs flex items-center justify-center gap-2">
                                        <IconMusic /> {t.audioReady}
                                    </div>
                                )}

                                {micError ? (
                                    <div className="mb-4 bg-red-900/30 border border-red-500/30 p-3 rounded-lg text-red-300 text-sm">
                                        ❌ {micError}
                                    </div>
                                ) : !micReady ? (
                                    <button onClick={requestMicPermission} className="mb-4 w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all">
                                        <IconMic /> {t.enableMicrophone}
                                    </button>
                                ) : (
                                    <div className="mb-4 bg-green-900/30 border border-green-500/30 p-2 rounded-lg text-green-300 text-xs flex items-center justify-center gap-2">
                                        <IconMic /> {t.micActive}
                                    </div>
                                )}

                                <p className="text-gray-300 mb-3 text-xs uppercase tracking-widest">{t.moonCount}</p>
                                <div className="flex gap-3 justify-center mb-6">
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <button key={n} onClick={() => setNumMoons(n)}
                                            className={`relative w-14 h-14 rounded-xl border-2 font-bold font-orbitron text-xl transition-all ${numMoons === n ? 'bg-cyan-600 border-cyan-400 text-white scale-110 shadow-lg shadow-cyan-500/50' : 'bg-slate-800 border-slate-600 text-gray-400 hover:bg-slate-700'}`}>
                                            {n}
                                        </button>
                                    ))}
                                </div>

                                <p className="text-gray-300 mb-3 text-xs uppercase tracking-widest">{t.missionDuration}</p>
                                <div className="flex items-center justify-center gap-4 mb-6">
                                    <button onClick={() => setGameDuration(Math.max(3, gameDuration - 1))}
                                        className="w-12 h-12 rounded-xl bg-slate-800 border-2 border-slate-600 hover:bg-slate-700 text-white font-bold text-2xl transition-all">
                                        -
                                    </button>
                                    <div className="bg-black/50 border-2 border-yellow-500/50 rounded-xl px-8 py-3 min-w-[120px] text-center">
                                        <div className="font-orbitron text-3xl font-bold text-yellow-400">
                                            {gameDuration}:00
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">{t.minutes}</div>
                                    </div>
                                    <button onClick={() => setGameDuration(gameDuration + 1)}
                                        className="w-12 h-12 rounded-xl bg-slate-800 border-2 border-slate-600 hover:bg-slate-700 text-white font-bold text-2xl transition-all">
                                        +
                                    </button>
                                </div>

                                <p className="text-gray-300 mb-3 text-xs uppercase tracking-widest">{t.backgroundMusic}</p>
                                <div className="mb-6">
                                    <select value={selectedMusic} onChange={(e) => setSelectedMusic(e.target.value)}
                                        className="w-full bg-slate-800 border-2 border-slate-600 hover:border-purple-400 text-white font-bold py-3 px-4 rounded-xl transition-all cursor-pointer focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/50">
                                        {MUSIC_TRACKS.map(track => (
                                            <option key={track.id} value={track.id}>{track.icon} {track.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <button onClick={startGame} disabled={!canStart}
                                    className={`w-full py-4 rounded-xl font-bold font-orbitron flex items-center justify-center gap-3 text-lg transition-all ${canStart ? 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg cursor-pointer' : 'bg-slate-700 text-gray-500 cursor-not-allowed'}`}>
                                    <IconPlay /> {canStart ? t.startMission : t.enableMicShort}
                                </button>
                                
                                <p className="text-gray-500 text-xs mt-6">{t.developedBy} Luis Cárdenas {t.forLabel} <a href="https://stormstudios.com.mx" target="_blank" className="text-cyan-400 hover:underline">Storm Studios Learning</a></p>
                            </div>
                        </div>
                    )}

                    {/* PLAYING HUD - Always visible */}
                    {gameState === 'playing' && (
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Top bar - Always visible with high z-index */}
                            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-auto z-50">
                                <div>
                                    <h1 className="font-orbitron text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">COSMIC EAR</h1>
                                    <div className="text-cyan-400 font-orbitron text-2xl font-bold mt-1">{score} pts</div>
                                    <button onClick={exitGame} className="mt-2 bg-red-600/80 hover:bg-red-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-lg">
                                        <IconLogOut /> {t.exit}
                                    </button>
                                </div>
                                <div className="bg-black/70 border border-yellow-500/50 rounded-lg px-4 py-2 backdrop-blur-sm">
                                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t.time}</div>
                                    <div className="font-orbitron text-yellow-400 font-bold text-lg">
                                        {Math.floor(gameTimeLeft / 60)}:{(gameTimeLeft % 60).toString().padStart(2, '0')}
                                    </div>
                                </div>
                            </div>

                            {/* Score Popup */}
                            {scorePopup && scorePopup.show && (
                                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce">
                                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-orbitron font-bold text-4xl px-8 py-4 rounded-2xl shadow-2xl shadow-yellow-500/50 border-4 border-yellow-300">
                                        +{scorePopup.points} pts
                                    </div>
                                </div>
                            )}

                            {/* Planet info - top right */}
                            {nearestPlanet && !tunerActive && (
                                <div className={`absolute top-20 right-4 bg-black/70 border rounded-lg p-4 min-w-[180px] backdrop-blur-sm transition-all ${canInteract ? 'border-green-500 shadow-lg shadow-green-500/30' : 'border-purple-500/50'}`}>
                                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t.planet}</div>
                                    <div className="font-orbitron text-purple-400 font-bold">{nearestPlanet.name}</div>
                                    <div className="text-sm text-gray-300">{nearestPlanet.distance}u</div>
                                    <div className="flex gap-1 mt-2 flex-wrap">
                                        {nearestPlanet.notes.map((n, i) => (
                                            <span key={i} className={`px-2 py-1 rounded text-xs font-bold font-orbitron ${n.solved ? 'bg-gray-600 line-through opacity-50' : 'bg-gradient-to-r from-cyan-500 to-purple-500'}`}>{t.noteNumber(i + 1)}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Speed - bottom left */}
                            <div className="absolute bottom-20 left-4">
                                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-orbitron">{t.speed}</div>
                                <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all" style={{ width: `${Math.min(speed, 100)}%` }} />
                                </div>
                            </div>

                            {/* Controls - bottom center */}
                            {!tunerActive && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-6 py-3 rounded-xl border border-white/10 flex gap-6 text-sm backdrop-blur-sm">
                                    <div className="flex items-center gap-2"><span className="bg-slate-700 px-2 py-1 rounded font-mono text-xs">WASD</span><span className="text-gray-400">{t.direction}</span></div>
                                    <div className="flex items-center gap-2"><span className="bg-slate-700 px-2 py-1 rounded font-mono text-xs">QE</span><span className="text-gray-400">Roll</span></div>
                                    <div className="flex items-center gap-2"><span className="bg-slate-700 px-2 py-1 rounded font-mono text-xs">{t.spaceKey}</span><span className="text-gray-400">{t.accelerate}</span></div>
                                    <div className="flex items-center gap-2"><span className="bg-slate-700 px-2 py-1 rounded font-mono text-xs">CLICK</span><span className="text-gray-400">{t.sing}</span></div>
                                </div>
                            )}

                            {/* Click prompt */}
                            {canInteract && !tunerActive && (
                                <div className="absolute top-[15%] left-1/2 -translate-x-1/2 font-orbitron text-green-400 text-xl animate-pulse text-center bg-black/60 px-5 py-2 rounded-xl border border-green-500/40 backdrop-blur-sm">
                                    {t.clickPlanet}
                                </div>
                            )}

                            {/* TUNER - Bottom right corner, doesn't block space view */}
                            {tunerActive && activePlanet && (
                                <div className="absolute bottom-4 right-4 pointer-events-auto">
                                    <div className="bg-black/85 border-2 border-cyan-500/70 rounded-2xl p-5 w-[320px] backdrop-blur-md shadow-2xl shadow-cyan-500/20">
                                        <div className="mb-3">
                                            <div className="font-orbitron text-lg text-purple-400 font-bold text-center">{activePlanet.name}</div>
                                        </div>

                                        <div className="flex justify-between items-center mb-3">
                                            <div className="text-gray-400 text-sm text-center flex-1">
                                                {tunerPhase === 'playing' ? t.listenPrompt : tunerPhase === 'success' ? t.completedPrompt : t.singPrompt}
                                            </div>
                                            <div className="bg-slate-800/80 border-2 border-cyan-400/50 rounded-lg px-4 py-2">
                                                <div className="text-xs text-gray-400 uppercase tracking-wider text-center mb-1">⏱️ {t.time}</div>
                                                <div className="font-orbitron text-cyan-300 font-bold text-xl text-center">
                                                    {Math.floor(planetTimeElapsed / 60)}:{(planetTimeElapsed % 60).toString().padStart(2, '0')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        <div className="flex justify-center gap-2 mb-4">
                                            {activePlanet.notes.map((n, i) => (
                                                <div key={i} className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center font-orbitron transition-all border-2 ${
                                                    noteStatuses[i] === 'correct' ? 'bg-green-600/50 border-green-400 opacity-50 scale-90' :
                                                    i === currentNoteIndex && tunerPhase === 'listening' ? (isMatching ? 'bg-green-500/40 border-green-400 scale-105 shadow-lg shadow-green-500/50' : 'bg-cyan-600/40 border-cyan-400 animate-pulse') :
                                                    'bg-slate-800/50 border-slate-600'
                                                }`}>
                                                    <div className="text-xs font-bold opacity-70">{t.note}</div>
                                                    <div className="text-lg font-bold">{i + 1}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Afinador visual removido: es entrenamiento auditivo puro (sin letras ni aguja). */}

                                        {/* Status */}
                                        <div className={`font-orbitron text-xs py-2 px-3 rounded-lg text-center mt-3 ${
                                            tunerPhase === 'playing' ? 'bg-purple-600/30 border border-purple-400 text-purple-300' :
                                            tunerPhase === 'success' ? 'bg-green-600/30 border border-green-400 text-green-300' :
                                            isMatching ? 'bg-green-600/30 border border-green-400 text-green-300' :
                                            'bg-cyan-600/30 border border-cyan-400 text-cyan-300'
                                        }`}>
                                            {tunerPhase === 'playing' && t.playingStatus}
                                            {tunerPhase === 'listening' && (isMatching ? t.holdStatus : t.listeningStatus)}
                                            {tunerPhase === 'success' && '🎉 +' + (activePlanet.notes.length * 100) + ' pts'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* GAME OVER SCREEN */}
                    {gameOver && (
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50">
                            <div className="bg-gradient-to-b from-slate-900 to-purple-950 p-10 rounded-3xl border-2 border-cyan-500 text-center max-w-lg w-full mx-4 shadow-2xl shadow-cyan-500/30">
                                <h1 className="font-orbitron text-5xl font-bold mb-4 bg-gradient-to-r from-red-500 via-yellow-500 to-purple-500 bg-clip-text text-transparent animate-pulse">
                                    {t.timeUp}
                                </h1>
                                <p className="text-gray-400 mb-6 text-lg">{t.missionCompleted}</p>

                                <div className="bg-black/50 border-2 border-cyan-400 rounded-2xl p-6 mb-6">
                                    <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">{t.finalScore}</div>
                                    <div className="font-orbitron text-6xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                                        {score}
                                    </div>
                                    <div className="text-gray-400 text-sm mt-2">{t.points}</div>
                                </div>

                                <div className="flex gap-3 justify-center">
                                    <button onClick={() => { setGameOver(false); setGameState('intro'); setScore(0); }}
                                        className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold font-orbitron py-3 px-6 rounded-xl transition-all shadow-lg">
                                        {t.newMission}
                                    </button>
                                    <button onClick={exitGame}
                                        className="bg-red-600/80 hover:bg-red-500 text-white font-bold font-orbitron py-3 px-6 rounded-xl transition-all">
                                        🚪 {t.exit}
                                    </button>
                                </div>

                                <p className="text-gray-500 text-xs mt-6">
                                    {score >= 5000 ? t.excellentEar : score >= 3000 ? t.veryGood : score >= 1500 ? t.goodWork : t.keepPracticing}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        createRoot(document.getElementById('root')).render(<App />);
