import * as THREE from "three";
import { GameStateManager, Note } from "@/game/state";
import { PlayerController } from "./player";
import { LevelEnvironment } from "./environment";
import { LevelGate } from "./gate";
import { SearchRadar } from "../ui/radar";

export class Game3DRenderer {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  
  private player: PlayerController | null = null;
  private environment: LevelEnvironment | null = null;
  private gate: LevelGate | null = null;
  private radar: SearchRadar | null = null;
  
  // Note target object state
  private activeNoteMesh: THREE.Group | null = null;
  private activeNotePos = new THREE.Vector3();
  private activeNoteChallenge: Note | null = null;
  private noteFloatingOffset = 0;
  private noteHasBeenTriggered = false;

  private isDisposed = false;
  private loggedFrameError = false;
  private clock = new THREE.Clock();

  // Camera Cutscene (Pan to gate)
  private cutsceneActive = false;
  private cutsceneTime = 0;
  private cutsceneDuration = 3.0; // 3 seconds total

  constructor(canvasId: string, private stateManager: GameStateManager) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) throw new Error("Canvas element not found");

    this.radar = new SearchRadar(this.stateManager);

    // Init Three.js
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Handle Window Resize
    window.addEventListener("resize", this.onWindowResize);

    // Subscribe to state changes to reload environment/players
    this.stateManager.subscribe((state) => {
      if (state.isPlaying && !this.player) {
        this.loadLevel(state.currentLevel);
      } else if (!state.isPlaying && this.player) {
        this.clearLevel();
      }

      // Handle Gate Unlocking
      if (state.isGateUnlocked && this.gate) {
        this.gate.unlock();
      }
    });

    // Start loop
    this.animate();
  }

  private onWindowResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  public loadLevel(level: number): void {
    this.clearLevel();

    const state = this.stateManager.getState();
    const arenaSize = this.stateManager.levels[level].arenaSize;

    // 1. Spawnea el environment
    this.environment = new LevelEnvironment(level, this.scene, arenaSize);

    // 2. Spawnea el Player
    this.player = new PlayerController(level, this.stateManager["audio"]);
    this.scene.add(this.player.mesh);

    // 3. Spawnea el Gate
    this.gate = new LevelGate(level, this.scene, arenaSize);

    // 4. Spawnea la primera nota
    this.spawnNextChallenge();

    this.clock.getDelta(); // reset clock
  }

  public clearLevel(): void {
    this.stopNoteSound();
    if (this.player) {
      this.scene.remove(this.player.mesh);
      this.player = null;
    }
    if (this.environment) {
      this.environment.clear();
      this.environment = null;
    }
    if (this.gate) {
      this.gate.clear();
      this.gate = null;
    }
    if (this.activeNoteMesh) {
      this.scene.remove(this.activeNoteMesh);
      this.activeNoteMesh = null;
    }
    this.activeNoteChallenge = null;
    this.cutsceneActive = false;
    
    // Clear leftover lighting/lights
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
  }

  // Triggered when note is answered or initial warmup confirmed
  public spawnNextChallenge(): void {
    if (this.activeNoteMesh) {
      this.scene.remove(this.activeNoteMesh);
      this.activeNoteMesh = null;
    }
    this.noteHasBeenTriggered = false;

    const state = this.stateManager.getState();
    if (state.selectedNotes.length === 0) return;

    // Pick random note from selected notes
    const challengeNote = state.selectedNotes[Math.floor(Math.random() * state.selectedNotes.length)];
    this.activeNoteChallenge = challengeNote;

    // Generate random far coordinate
    const arenaSize = this.stateManager.levels[state.currentLevel].arenaSize;
    const half = arenaSize / 2 - 15;
    const playerPos = this.player ? this.player.mesh.position : new THREE.Vector3(0,0,0);

    // Search distance
    let minDist = 80;
    let maxDist = 130;
    if (state.currentLevel === 3) {
      minDist = 180;
      maxDist = 260;
    } else if (state.currentLevel === 5) {
      minDist = 80;
      maxDist = 160;
    }

    let targetX = 0, targetZ = 0;
    for (let attempts = 0; attempts < 50; attempts++) {
      const dist = minDist + Math.random() * (maxDist - minDist);
      const angle = Math.random() * Math.PI * 2;
      const px = Math.max(-half, Math.min(half, playerPos.x + Math.cos(angle) * dist));
      const pz = Math.max(-half, Math.min(half, playerPos.z + Math.sin(angle) * dist));
      
      const realDist = Math.sqrt((px - playerPos.x)**2 + (pz - playerPos.z)**2);
      if (realDist >= minDist) {
        targetX = px;
        targetZ = pz;
        break;
      }
    }

    let targetY = 1.5;
    if (state.currentLevel === 2) {
      targetY = -35 + Math.random() * 45; // -35m to +10m
    } else if (state.currentLevel === 3) {
      targetY = playerPos.y + (Math.random() - 0.5) * 20.0;
    } else if (state.currentLevel === 4) {
      targetY = 1.0 + Math.random() * 1.5;
    } else if (state.currentLevel === 5) {
      targetY = playerPos.y + (Math.random() - 0.5) * 16.0;
    }

    this.activeNotePos.set(targetX, targetY, targetZ);
    this.noteFloatingOffset = Math.random() * Math.PI * 2;

    // Render Note Mesh
    this.activeNoteMesh = this.buildNoteTargetMesh(state.currentLevel, challengeNote.note_index);
    this.activeNoteMesh.position.copy(this.activeNotePos);
    this.scene.add(this.activeNoteMesh);

    // A new note spawned: start the search timer (radar appears after the hint delay)
    if (this.radar) this.radar.resetSearch();
  }

  // Triggered when answering incorrectly: teleports note and player
  public resetChallengePosition(): void {
    if (this.player) {
      this.player.resetPosition();
    }
    
    // Teleport active note far from center (where player is teleported)
    const state = this.stateManager.getState();
    const arenaSize = this.stateManager.levels[state.currentLevel].arenaSize;
    const half = arenaSize / 2 - 15;
    
    let minDist = 80;
    let maxDist = 120;
    let px = 0, pz = 0;
    for (let i = 0; i < 30; i++) {
      const dist = minDist + Math.random() * (maxDist - minDist);
      const angle = Math.random() * Math.PI * 2;
      px = Math.max(-half, Math.min(half, Math.cos(angle) * dist));
      pz = Math.max(-half, Math.min(half, Math.sin(angle) * dist));
      if (Math.sqrt(px*px + pz*pz) >= minDist) break;
    }
    
    let py = 1.5;
    if (state.currentLevel === 2) py = -35 + Math.random() * 45;
    else if (state.currentLevel === 3) py = (Math.random() - 0.5) * 20;
    else if (state.currentLevel === 4) py = 1.0 + Math.random() * 1.5;
    else if (state.currentLevel === 5) py = (Math.random() - 0.5) * 16;

    this.activeNotePos.set(px, py, pz);
    if (this.activeNoteMesh) {
      this.activeNoteMesh.position.copy(this.activeNotePos);
    }
    this.noteHasBeenTriggered = false;

    // Note relocated after a miss: restart the search timer
    if (this.radar) this.radar.resetSearch();
  }

  // Build the 3D visual target representation
  private buildNoteTargetMesh(level: number, noteIndex: number): THREE.Group {
    const group = new THREE.Group();
    const noteColors = [
      0xff0000, 0xff4500, 0xffa500, 0xffd700, 0xffff00, 0x9acd32,
      0x008000, 0x00ced1, 0x0000ff, 0x8a2be2, 0xee82ee, 0xc71585
    ];
    const color = noteColors[noteIndex] || 0xffffff;
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.1,
      metalness: 0.2,
      emissive: color,
      emissiveIntensity: 0.5
    });

    if (level === 1) {
      // Color Cube
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), mat);
      group.add(cube);
    } 
    else if (level === 2) {
      // Piñata star (Golden center sphere + 5 colorful cones)
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.1, emissive: 0xffd700, emissiveIntensity: 0.25 })
      );
      group.add(core);

      const coneColors = [0xff2b6e, 0xff8c00, 0xffd700, 0x00d4ff, 0xcc44ff];
      const directions = [
        new THREE.Vector3(0, 1, 0), // Up
        new THREE.Vector3(0.7, -0.4, 0.5).normalize(),
        new THREE.Vector3(-0.7, -0.4, 0.5).normalize(),
        new THREE.Vector3(-0.7, -0.4, -0.5).normalize(),
        new THREE.Vector3(0.7, -0.4, -0.5).normalize()
      ];

      for (let i = 0; i < 5; i++) {
        const cMat = new THREE.MeshStandardMaterial({
          color: coneColors[i],
          emissive: coneColors[i],
          emissiveIntensity: 0.35,
          roughness: 0.3
        });
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.8, 12), cMat);
        
        // Align Y axis (+Y is cone tip) to direction vector
        const dir = directions[i];
        cone.position.copy(dir).multiplyScalar(0.7);
        
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(up, dir);
        cone.setRotationFromQuaternion(quaternion);

        group.add(cone);
      }
    } 
    else if (level === 3) {
      // Space crystal: glowing core + 6 spikes + orbital ring + own light (Godot _build_space_crystal)
      const base = new THREE.Color(color);
      const white = new THREE.Color(1, 1, 1);
      const yAxis = new THREE.Vector3(0, 1, 0);
      const crystal = new THREE.Group();
      crystal.scale.setScalar(2.5); // Godot scales the crystal node by 2.5

      const coreMat = new THREE.MeshStandardMaterial({ color: base, roughness: 0.05, metalness: 0.2, emissive: base, emissiveIntensity: 1.4 });
      crystal.add(new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), coreMat));

      const dirs = [
        new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
      ];
      const dist = 0.7 + 2.2 * 0.5 - 0.1;
      for (const dir of dirs) {
        const sc = base.clone().lerp(white, Math.random() * 0.25);
        const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.55, 2.2, 8),
          new THREE.MeshStandardMaterial({ color: sc, emissive: sc, emissiveIntensity: 1.1, roughness: 0.05, metalness: 0.2 }));
        spike.quaternion.setFromUnitVectors(yAxis, dir);
        spike.position.copy(dir).multiplyScalar(dist);
        crystal.add(spike);
      }

      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.2, 8, 32), new THREE.MeshBasicMaterial({ color: base }));
      ring.rotation.x = 0.5 + Math.random() * 0.5;
      crystal.add(ring);

      group.add(crystal);
      group.add(new THREE.PointLight(base, 9, 40)); // crystal beacon glow
    }
    else if (level === 4) {
      // Will-o'-the-wisp (fuego fatuo): bright unshaded core + translucent ghostly
      // auras + flame tail + its own light. Faithful to Godot NoteCube _build_will_o_wisp.
      const base = new THREE.Color(color);
      const wisp = new THREE.Color(
        Math.min(base.r * 0.3, 1.0),
        Math.min(base.g * 0.5 + 0.4, 1.0),
        Math.min(base.b * 0.4 + 0.5, 1.0)
      );
      const wispLight = wisp.clone().lerp(new THREE.Color(1, 1, 1), 0.7);

      const core = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 10), new THREE.MeshBasicMaterial({ color: wispLight }));
      core.scale.y = 1.2;
      const aura = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8),
        new THREE.MeshBasicMaterial({ color: wisp, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }));
      const aura2 = new THREE.Mesh(new THREE.SphereGeometry(1.35, 10, 6),
        new THREE.MeshBasicMaterial({ color: wisp, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.24, 0.85, 10),
        new THREE.MeshBasicMaterial({ color: wisp, transparent: true, opacity: 0.45, depthWrite: false }));
      tail.position.y = -0.5;

      // Strong own light so the wisp lights up the surrounding swamp
      const glow = new THREE.PointLight(wisp, 22.0, 18);
      group.add(core, aura, aura2, tail, glow);
    }
    else if (level === 5) {
      // Hot-air balloon (envelope + basket)
      const env = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 12, 12),
        mat
      );
      env.scale.set(1, 1.4, 1); // egg-like envelope
      env.position.y = 0.8;

      const basket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.3, 0.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.9 })
      );
      basket.position.y = -0.5;

      // Draw 4 strings connecting env to basket
      const stringMat = new THREE.MeshBasicMaterial({ color: 0x8b6b5a });
      const offsets = [[-0.2, -0.2], [-0.2, 0.2], [0.2, -0.2], [0.2, 0.2]];
      for (const offset of offsets) {
        const str = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4), stringMat);
        str.position.set(offset[0], 0.1, offset[1]);
        group.add(str);
      }

      group.add(env, basket);
    }

    return group;
  }

  private stopNoteSound(): void {
    // Stops active notes
    this.stateManager["audio"].stopAllNotes();
  }

  public triggerGateCutscene(): void {
    this.cutsceneActive = true;
    this.cutsceneTime = 0;
  }

  private animate = () => {
    if (this.isDisposed) return;
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1); // clamp delta
    const time = this.clock.getElapsedTime();

    const state = this.stateManager.getState();

    if (state.isPlaying && this.player && this.environment && this.gate) {
      try {
      // 1. Update player physics and inputs
      const arenaSize = this.stateManager.levels[state.currentLevel].arenaSize;
      this.player.update(delta, arenaSize);

      // 2. Check environment obstacle collisions and displace player
      const displacement = this.environment.checkCollisions(this.player.mesh.position, 0.9);
      this.player.mesh.position.add(displacement);

      // 3. Update active gate open animation and check trigger
      this.gate.update(delta, time);
      if (state.isGateUnlocked && this.gate.checkTrigger(this.player.mesh.position)) {
        this.stateManager.completeLevel();
      }

      // 4. Update decorative moving meshes
      this.environment.update(delta, time);

      // 5. Float and rotate active Note Object
      if (this.activeNoteMesh) {
        this.activeNoteMesh.rotation.y += delta * 0.8;
        this.activeNoteMesh.position.y = this.activeNotePos.y + Math.sin(time * 2.0 + this.noteFloatingOffset) * 0.15;

        // Check proximity collision with note
        const dist = this.player.mesh.position.distanceTo(this.activeNoteMesh.position);
        if (dist < 3.2 && !this.noteHasBeenTriggered) {
          this.noteHasBeenTriggered = true;
          this.stateManager.setChallenge(this.activeNoteChallenge!);
          this.stateManager["audio"].playNote(state.selectedInstrument, this.activeNoteChallenge!.note_index, this.activeNoteChallenge!.octave);
          
          // Animate small bounce scale
          const m = this.activeNoteMesh;
          m.scale.set(1.4, 1.4, 1.4);
          setTimeout(() => {
            m.scale.set(1.0, 1.0, 1.0);
          }, 120);
        }
      }

      // 6. Camera Follow System with Cutscene Support
      if (this.cutsceneActive) {
        this.cutsceneTime += delta;
        if (this.cutsceneTime >= this.cutsceneDuration) {
          this.cutsceneActive = false;
        }

        // Panning camera looking at the unlocked Gate
        const gatePos = this.gate.position;
        const panCamPos = gatePos.clone().add(new THREE.Vector3(0, 6.0, -15.0)); // Look closer
        
        this.camera.position.lerp(panCamPos, delta * 3.5);
        this.camera.lookAt(gatePos.x, gatePos.y + 2.0, gatePos.z);
      } 
      else {
        // Normal Gameplay camera follow
        const playerForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.player.mesh.quaternion);
        const playerUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.player.mesh.quaternion);

        let camOffset: THREE.Vector3;
        if (state.currentLevel === 1 || state.currentLevel === 4) {
          // Terrestrial follow behind. The crocodile (lvl 4) is larger, so sit
          // the camera further back and higher (matches Godot's croc cam).
          const isCroc = state.currentLevel === 4;
          const relativeOffset = isCroc ? new THREE.Vector3(0, 4.0, -8.5) : new THREE.Vector3(0, 2.5, -6.0);
          camOffset = relativeOffset.applyMatrix4(this.player.mesh.matrixWorld);
          this.camera.position.lerp(camOffset, delta * 6.0);
          const lookY = this.player.mesh.position.y + (isCroc ? 0.6 : 1.2);
          this.camera.lookAt(this.player.mesh.position.x, lookY, this.player.mesh.position.z);
          this.camera.up.set(0, 1, 0); // Always upright in terrestrial
        } else {
          // 6DOF follow behind and copy local up vector for rolls.
          // Level 5's unicorn is taller, so pull the camera further back and higher
          // and look slightly ahead so it sits in the lower third (like Godot).
          const isUnicorn = state.currentLevel === 5;
          const back = isUnicorn ? -9.0 : -5.5;
          const up = isUnicorn ? 4.0 : 1.8;
          camOffset = this.player.mesh.position.clone()
            .addScaledVector(playerForward, back)
            .addScaledVector(playerUp, up);

          this.camera.position.lerp(camOffset, delta * 5.0);
          this.camera.up.copy(playerUp);
          if (isUnicorn) {
            const lookAt = this.player.mesh.position.clone().addScaledVector(playerForward, 5.0).addScaledVector(playerUp, 1.0);
            this.camera.lookAt(lookAt);
          } else {
            this.camera.lookAt(this.player.mesh.position);
          }
        }
      }

      // Update Search Radar
      if (this.radar) {
        this.radar.update(
          delta,
          this.player ? this.player.mesh.position : null,
          this.activeNoteMesh ? this.activeNotePos : null,
          this.camera
        );
      }
      } catch (err) {
        // Never let one bad frame freeze the canvas: log once, keep rendering.
        if (!this.loggedFrameError) {
          this.loggedFrameError = true;
          console.error("Gameplay update threw (rendering continues):", err);
        }
      }
    }

    // Render step
    this.renderer.render(this.scene, this.camera);
  };

  public getActiveNotePosition(): THREE.Vector3 | null {
    if (!this.activeNoteMesh) return null;
    return this.activeNotePos;
  }

  public getPlayerPosition(): THREE.Vector3 | null {
    if (!this.player) return null;
    return this.player.mesh.position;
  }

  public getCameraTransform(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public dispose(): void {
    this.isDisposed = true;
    window.removeEventListener("resize", this.onWindowResize);
    this.clearLevel();
    this.renderer.dispose();
  }
}
