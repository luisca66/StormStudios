import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
THREE.ColorManagement.enabled = false; // colores hex como en r128 (ver WebGLRenderer más abajo)
import "./styles.css";
import "./tailwind.css";
import { BASE_URL, INSTRUMENTS, INSTRUMENT_OPTIONS, MAX_SHIP_SPEED, MUSIC_TRACKS, NOTE_COLORS, THRUST_ACCELERATION, TUNER_LISTENING_DELAY_MS, getMusicTrackUrl, getSampleUrl, instrumentLabel, resolveInstrument, shuffleArray } from "./config.js";
import { t } from "./i18n.js";
import { PitchTrackerV2, getNoteFromPitch } from "./pitch/pitch-tracker.js";
import { createParticleSystem, createShootingStarSystem } from "./scene/effects.js";
import { createPlanetMesh, generatePlanet } from "./scene/planets.js";
import { createNebula, createStarfield } from "./scene/sky.js";
import { createSpaceship } from "./scene/spaceship.js";
import { IconLogOut, IconMic, IconMusic, IconPlay } from "./ui/icons.jsx";

function App() {
    const [gameState, setGameState] = useState('intro');
    const [numMoons, setNumMoons] = useState(2);
    const [selectedInstrument, setSelectedInstrument] = useState('Piano');
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
    const [holdProgress, setHoldProgress] = useState(0);
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
    const micStreamRef = useRef(null);
    const micSourceRef = useRef(null);
    const micWorkletRef = useRef(null);
    const micSinkRef = useRef(null);
    const pitchTrackerRef = useRef(new PitchTrackerV2());
    const engineOscRef = useRef(null);
    const engineGainRef = useRef(null);
    const pitchPollRef = useRef(null);
    const audioCacheRef = useRef({});
    const hoveredPlanetRef = useRef(null);
    const activePlanetMeshRef = useRef(null);
    const animationRef = useRef(null);
    const particleSystemRef = useRef(null);
    const ambientMusicRef = useRef(null);
    const musicQueueRef = useRef([]);
    const currentMusicTrackRef = useRef(null);
    const tunerListeningTimeoutRef = useRef(null);
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

            let loaded = 0;
            const loadAudio = (url) => new Promise(resolve => {
                const audio = new Audio();
                audio.src = url;
                audio.preload = 'auto';
                let settled = false;
                const done = () => {
                    if (settled) return;
                    settled = true;
                    audioCacheRef.current[url] = audio;
                    loaded++;
                    setLoadingProgress(Math.floor((loaded / urls.length) * 100));
                    resolve();
                };
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
            setMicError(null);
            if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
                throw new Error('microphone-unsupported');
            }
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
            if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            micStreamRef.current = stream;
            await audioCtxRef.current.audioWorklet.addModule('/apps/cosmic-ear/pitch-processor.js?v=2');

            const source = audioCtxRef.current.createMediaStreamSource(stream);
            const worklet = new AudioWorkletNode(audioCtxRef.current, 'pitch-processor');
            const sink = audioCtxRef.current.createGain();
            sink.gain.value = 0;
            source.connect(worklet);
            worklet.connect(sink).connect(audioCtxRef.current.destination);
            micSourceRef.current = source;
            micWorkletRef.current = worklet;
            micSinkRef.current = sink;

            worklet.port.onmessage = ({ data: frame }) => {
                pitchTrackerRef.current.handleFrame(frame);
                setInputVolume(Math.min(100, Math.max(0, frame.rms * 800)));
                if (frame.frequency > 0) setDetectedNote(getNoteFromPitch(frame.frequency));
                else setDetectedNote(prev => ({ ...prev, frequency: 0 }));
            };

            if (pitchPollRef.current) clearInterval(pitchPollRef.current);
            pitchPollRef.current = setInterval(() => {
                const state = pitchTrackerRef.current.getState();
                setIsMatching(state.isOnPitch);
                setHoldProgress(state.holdProgress);
            }, 50);

            console.info('[Mic] Cosmic Ear afinador v2 activo — hold 1.5s, gracia 0.25s, mediana 5 frames');
            setMicReady(true);
        } catch (err) {
            try { micSourceRef.current?.disconnect(); } catch(e) {}
            try { micWorkletRef.current?.disconnect(); } catch(e) {}
            try { micSinkRef.current?.disconnect(); } catch(e) {}
            if (micStreamRef.current) micStreamRef.current.getTracks().forEach(track => track.stop());
            micStreamRef.current = null;
            micSourceRef.current = null;
            micWorkletRef.current = null;
            micSinkRef.current = null;
            setMicError(err.name === 'NotAllowedError' ? t.micPermissionDenied : t.micError);
        }
    };

    useEffect(() => {
        return () => {
            if (pitchPollRef.current) clearInterval(pitchPollRef.current);
            pitchTrackerRef.current.stop();
            try { micSourceRef.current?.disconnect(); } catch(e) {}
            try { micWorkletRef.current?.disconnect(); } catch(e) {}
            try { micSinkRef.current?.disconnect(); } catch(e) {}
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
            const timbre = resolveInstrument(inst);
            const url = getSampleUrl(timbre, n.index, n.octave - 4);
            if (audioCacheRef.current[url]) { const a = audioCacheRef.current[url]; a.currentTime = 0; a.volume = 0.4; a.play().catch(() => {}); }
        });
    };

    const playSuccessSound = () => new Promise(resolve => {
        const url = `${BASE_URL}/acierto.mp3`;
        const a = audioCacheRef.current[url];
        if (!a) {
            resolve();
            return;
        }

        let fallbackId = null;
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            if (fallbackId !== null) clearTimeout(fallbackId);
            a.removeEventListener('ended', finish);
            a.removeEventListener('error', finish);
            resolve();
        };
        try {
            a.currentTime = 0;
            a.volume = 0.6;
            a.addEventListener('ended', finish, { once: true });
            a.addEventListener('error', finish, { once: true });
            const durationMs = Number.isFinite(a.duration) && a.duration > 0 ? Math.ceil(a.duration * 1000) + 250 : 15000;
            fallbackId = setTimeout(finish, durationMs);
            a.play().catch(finish);
        } catch(e) {
            finish();
        }
    });

    const getNextMusicTrackId = () => {
        if (musicQueueRef.current.length === 0) {
            const shuffled = shuffleArray(MUSIC_TRACKS);
            if (shuffled.length > 1 && shuffled[0] === currentMusicTrackRef.current) {
                [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
            }
            musicQueueRef.current = shuffled;
        }

        const nextTrack = musicQueueRef.current.shift();
        currentMusicTrackRef.current = nextTrack;
        return nextTrack;
    };

    const stopAmbientMusic = () => {
        if (!ambientMusicRef.current) return;
        try {
            ambientMusicRef.current.pause();
            ambientMusicRef.current.currentTime = 0;
            ambientMusicRef.current.onended = null;
            ambientMusicRef.current.onerror = null;
        } catch(e) {}
        ambientMusicRef.current = null;
    };

    const playRandomAmbientMusic = () => {
        stopAmbientMusic();
        const trackId = getNextMusicTrackId();
        if (!trackId) return;

        const url = getMusicTrackUrl(trackId);
        const music = audioCacheRef.current[url] || new Audio(url);
        audioCacheRef.current[url] = music;
        music.preload = 'auto';
        music.loop = false;
        music.volume = 0.4;
        music.currentTime = 0;
        music.onended = () => {
            if (ambientMusicRef.current === music) playRandomAmbientMusic();
        };
        music.onerror = () => {
            if (ambientMusicRef.current === music) playRandomAmbientMusic();
        };
        ambientMusicRef.current = music;
        music.play().catch(() => {});
    };

    const resumeAmbientMusic = () => {
        if (ambientMusicRef.current) {
            try { ambientMusicRef.current.play().catch(() => {}); } catch(e) {}
            return;
        }

        playRandomAmbientMusic();
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
        const multipliers = { 1: 1.0, 2: 1.5, 3: 2.5, 4: 4.0, 5: 6.0, 6: 9.0 };
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
        if (tunerListeningTimeoutRef.current) clearTimeout(tunerListeningTimeoutRef.current);

        setActivePlanet({...pl});
        setCurrentNoteIndex(firstUnsolved);
        setNoteStatuses(pl.notes.map(n => n.solved ? 'correct' : 'pending'));
        setTunerPhase('playing');
        setIsMatching(false);
        setHoldProgress(0);
        pitchTrackerRef.current.stop();
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
        tunerListeningTimeoutRef.current = setTimeout(() => {
            tunerListeningTimeoutRef.current = null;
            if (activePlanetMeshRef.current === planetMesh) setTunerPhase('listening');
        }, TUNER_LISTENING_DELAY_MS);
    };

    const closeTuner = ({ restartMusic = false } = {}) => {
        if (tunerListeningTimeoutRef.current) {
            clearTimeout(tunerListeningTimeoutRef.current);
            tunerListeningTimeoutRef.current = null;
        }
        if (activePlanetMeshRef.current) activePlanetMeshRef.current.userData.moonsOrbitPaused = false;
        pitchTrackerRef.current.stop();
        setHoldProgress(0);
        setIsMatching(false);
        setTunerActive(false);
        setActivePlanet(null);
        activePlanetMeshRef.current = null;
        if (restartMusic) playRandomAmbientMusic();
        else resumeAmbientMusic();
    };

    // Reinicia el objetivo v2 cada vez que cambia la luna activa.
    useEffect(() => {
        if (!tunerActive || tunerPhase !== 'listening' || !activePlanet) return;
        const planetMesh = activePlanetMeshRef.current;
        if (!planetMesh) return;
        const realPlanetData = planetMesh.userData.planetData;
        const currentUnsolved = realPlanetData.notes.findIndex((n, i) => !n.solved && i >= currentNoteIndex);
        if (currentUnsolved === -1) return;
        const target = realPlanetData.notes[currentUnsolved];
        const midi = (target.octave + 1) * 12 + target.index;
        const targetFrequency = 440 * Math.pow(2, (midi - 69) / 12);
        pitchTrackerRef.current.start(targetFrequency);
        setHoldProgress(0);
        setIsMatching(false);
        return () => pitchTrackerRef.current.stop();
    }, [tunerActive, tunerPhase, currentNoteIndex, activePlanet]);

    // Completa la luna cuando el afinador v2 llega a 1.5 s sostenidos.
    useEffect(() => {
        if (holdProgress < 1 || !tunerActive || tunerPhase !== 'listening' || !activePlanet) return;
        const planetMesh = activePlanetMeshRef.current;
        if (!planetMesh) return;
        const realPlanetData = planetMesh.userData.planetData;
        const currentUnsolved = realPlanetData.notes.findIndex((n, i) => !n.solved && i >= currentNoteIndex);
        if (currentUnsolved === -1) return;
        const target = realPlanetData.notes[currentUnsolved];
        pitchTrackerRef.current.stop();
        setHoldProgress(0);
        setIsMatching(false);

        const successSoundDone = playSuccessSound();
        dissolveMoonWithParticles(currentUnsolved, NOTE_COLORS[target.note]);
        realPlanetData.notes[currentUnsolved].solved = true;
        setNoteStatuses(prev => { const n = [...prev]; n[currentUnsolved] = 'correct'; return n; });

        const remaining = realPlanetData.notes.filter(n => !n.solved);
        if (remaining.length === 0) {
            const earnedPoints = calculatePlanetScore(realPlanetData.notes.length, planetMesh.userData.startTime);
            setScore(s => s + earnedPoints);
            setScorePopup({ points: earnedPoints, show: true });
            setTimeout(() => setScorePopup(null), 2000);
            realPlanetData.completed = true;
            setTunerPhase('success');
            successSoundDone.then(() => {
                if (activePlanetMeshRef.current === planetMesh) closeTuner({ restartMusic: true });
            });
        } else {
            const next = realPlanetData.notes.findIndex((n, i) => !n.solved && i > currentUnsolved);
            setCurrentNoteIndex(next !== -1 ? next : realPlanetData.notes.findIndex(n => !n.solved));
        }
    }, [holdProgress, tunerActive, tunerPhase, currentNoteIndex, activePlanet]);

    useEffect(() => { hoveredPlanetRef.current = hoveredPlanet; }, [hoveredPlanet]);

    const exitGame = () => {
        if (tunerListeningTimeoutRef.current) {
            clearTimeout(tunerListeningTimeoutRef.current);
            tunerListeningTimeoutRef.current = null;
        }
        if (engineOscRef.current) { try { engineOscRef.current.stop(); } catch(e) {} engineOscRef.current = null; }
        if (thrusterNoiseRef.current) { try { thrusterNoiseRef.current.stop(); } catch(e) {} thrusterNoiseRef.current = null; }
        stopAmbientMusic();
        pitchTrackerRef.current.stop();
        setHoldProgress(0);
        setIsMatching(false);
        setGameState('intro');
        setScore(0);
        setTunerActive(false);
        setActivePlanet(null);
        activePlanetMeshRef.current = null;
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
        // Three 0.160 (antes r128): luces y color como en r128 hasta el rediseño (PLAN-COSMIC-EAR.md),
        // que ilumina la escena de nuevo y quita estas dos líneas.
        renderer.useLegacyLights = true;
        renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
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
            const pl = generatePlanet(i, pos, numMoons, selectedInstrument);
            const mesh = createPlanetMesh(pl);
            scene.add(mesh);
            planetMeshesRef.current.push(mesh);
        }

        startEngineSound();
        startThrusterSound();
        playRandomAmbientMusic();

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
                    velocityRef.current.add(dir.multiplyScalar((keys['ShiftLeft'] ? 0.7 : 0.5) * THRUST_ACCELERATION));
                    ship.userData.engine.material.opacity = 0.8 + Math.sin(time * 20) * 0.2;
                    ship.userData.engineLight.intensity = 3 + Math.sin(time * 20);
                } else { ship.userData.engine.material.opacity = 0.4; ship.userData.engineLight.intensity = 1; }

                let spd = velocityRef.current.length();
                if (spd > MAX_SHIP_SPEED) { velocityRef.current.multiplyScalar(MAX_SHIP_SPEED / spd); spd = MAX_SHIP_SPEED; }

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
    }, [gameState === 'intro' ? 'intro' : 'game', numMoons, selectedInstrument]);

    const startGame = async () => {
        if (audioCtxRef.current?.state === 'suspended') await audioCtxRef.current.resume();
        musicQueueRef.current = [];
        currentMusicTrackRef.current = null;
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
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-purple-950 to-black flex items-center justify-center overflow-y-auto p-4">
                    <div className="bg-slate-900/90 p-6 rounded-2xl border border-cyan-500/50 text-center max-w-md w-full my-auto shadow-2xl">
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

                        <p className="text-gray-300 mb-3 text-xs uppercase tracking-widest">{t.instrument}</p>
                        <div className="grid grid-cols-3 gap-2 mb-5">
                            {INSTRUMENT_OPTIONS.map(inst => (
                                <button key={inst} onClick={() => setSelectedInstrument(inst)}
                                    className={`min-h-11 rounded-lg border-2 px-2 py-2 text-xs font-bold transition-all ${selectedInstrument === inst ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/40' : 'bg-slate-800 border-slate-600 text-gray-300 hover:bg-slate-700'}`}>
                                    {instrumentLabel(inst)}
                                </button>
                            ))}
                        </div>

                        <p className="text-gray-300 mb-3 text-xs uppercase tracking-widest">{t.moonCount}</p>
                        <div className="grid grid-cols-6 gap-2 mb-5">
                            {[1, 2, 3, 4, 5, 6].map(n => (
                                <button key={n} onClick={() => setNumMoons(n)}
                                    className={`relative h-12 rounded-xl border-2 font-bold font-orbitron text-lg transition-all ${numMoons === n ? 'bg-cyan-600 border-cyan-400 text-white scale-105 shadow-lg shadow-cyan-500/50' : 'bg-slate-800 border-slate-600 text-gray-400 hover:bg-slate-700'}`}>
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
                            <div className="flex items-center gap-2"><span className="bg-slate-700 px-2 py-1 rounded font-mono text-xs">QE</span><span className="text-gray-400">{t.roll}</span></div>
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
                            <div className="bg-black/85 border-2 border-cyan-500/70 rounded-2xl p-5 backdrop-blur-md shadow-2xl shadow-cyan-500/20" style={{ width: 'min(420px, calc(100vw - 2rem))' }}>
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
                                <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${activePlanet.notes.length}, minmax(0, 1fr))` }}>
                                    {activePlanet.notes.map((n, i) => (
                                        <div key={i} className={`h-14 min-w-0 rounded-lg flex flex-col items-center justify-center font-orbitron transition-all border-2 ${
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

                                {tunerPhase === 'listening' && (
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-800 border border-white/10">
                                        <div
                                            className={`h-full transition-all duration-75 ${isMatching ? 'bg-green-400' : 'bg-cyan-500'}`}
                                            style={{ width: `${Math.round(holdProgress * 100)}%` }}
                                        />
                                    </div>
                                )}

                                {/* Status */}
                                <div className={`font-orbitron text-xs py-2 px-3 rounded-lg text-center mt-3 ${
                                    tunerPhase === 'playing' ? 'bg-purple-600/30 border border-purple-400 text-purple-300' :
                                    tunerPhase === 'success' ? 'bg-green-600/30 border border-green-400 text-green-300' :
                                    isMatching ? 'bg-green-600/30 border border-green-400 text-green-300' :
                                    'bg-cyan-600/30 border border-cyan-400 text-cyan-300'
                                }`}>
                                    {tunerPhase === 'playing' && t.playingStatus}
                                    {tunerPhase === 'listening' && `${isMatching ? t.holdStatus : t.listeningStatus} ${Math.round(holdProgress * 100)}%`}
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
