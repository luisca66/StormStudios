import { GameController } from "@/game/controller";
import {
  Particle,
  createExplosion,
  drawLevelBackground,
  drawLevelPlayer,
  drawLevelEnemy,
  drawLevelMissile,
  drawFPSOverlayHUD
} from "@/game/levels";

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private controller: GameController;
  
  private animationId: number | null = null;
  private lastTime = 0;
  private elapsedTime = 0;
  
  // Game entities state
  private enemyX = 0;
  private enemyY = 0;
  private enemySize = 25;
  private currentApproachTime = 15.0;
  private playerAngle = -Math.PI / 2;
  private keysPressed: Record<string, boolean> = {};
  private turretSoundPlaying = false;
  private enemyInitialX = 0;
  private enemyInitialZ = 40.0;
  private lastChallenge: any = null;

  private enemy3D = { x: 0, y: 0, z: 40.0 }; // x: left/right, y: up/down, z: depth
  private turretAngle = 0; // horizontal turret angle in radians
  
  // Missile state
  private missileX = 0;
  private missileY = 0;
  private missileSpeed = 12;
  private missileAngle = 0;
  // Level 4 pseudo-3D missile
  private missile3D = { x: 0, y: 0, z: 0.0 };

  // Particles
  private particles: Particle[] = [];

  // Screen shake
  private shakeAmount = 0;

  constructor(canvas: HTMLCanvasElement, controller: GameController) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not acquire 2D canvas context");
    this.ctx = context;
    this.controller = controller;

    this.setupListeners();
    this.resizeCanvas();
    window.addEventListener("resize", this.resizeCanvas);
  }

  private resizeCanvas = () => {
    // Keep internal canvas dimensions matching display size
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  };

  private setupListeners() {
    // Aiming controls (keyboard A/D)
    window.addEventListener("keydown", (e) => {
      const state = this.controller.getState();
      if (state.screen !== "game") return;

      this.keysPressed[e.key.toLowerCase()] = true;
    });

    window.addEventListener("keyup", (e) => {
      this.keysPressed[e.key.toLowerCase()] = false;
    });
  }

  start() {
    this.resizeCanvas();
    this.lastTime = performance.now();
    this.elapsedTime = 0;
    this.particles = [];
    this.shakeAmount = 0;
    this.turretAngle = 0;
    this.playerAngle = -Math.PI / 2;
    this.keysPressed = {};
    this.lastChallenge = null; // Reset last challenge tracking
    if (this.turretSoundPlaying) {
      this.turretSoundPlaying = false;
      this.controller.audio.stopSFX("gira-torreta");
    }

    this.spawnEnemyData();

    const loop = (time: number) => {
      const dt = (time - this.lastTime) / 1000;
      this.lastTime = time;

      this.update(dt);
      this.draw();

      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.turretSoundPlaying) {
      this.turretSoundPlaying = false;
      this.controller.audio.stopSFX("gira-torreta");
    }
  }

  private spawnEnemyData() {
    const state = this.controller.getState();
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Reset positions
    this.elapsedTime = 0;

    // Determine approach time range
    // Lento: 20-25s, Normal: 15-20s, Rapido: 10-15s, Maestro: 5-10s
    let minTime = 15.0;
    let maxTime = 20.0;
    if (state.difficulty === "Lento") { minTime = 20.0; maxTime = 25.0; }
    else if (state.difficulty === "Rapido") { minTime = 10.0; maxTime = 15.0; }
    else if (state.difficulty === "Maestro") { minTime = 5.0; maxTime = 10.0; }
    this.currentApproachTime = minTime + Math.random() * (maxTime - minTime);

    if (isFirstPersonLevel(state.selectedLevel)) {
      // FPS Spawn: random X, fixed Y (1.5), Z far away (32 to 42).
      // Narrower corridors: level 7 river, level 13 vortex tunnel; others use the full arena.
      const zVal = 32.0 + Math.random() * 10.0;
      const spreadMap: Record<number, number> = { 7: 26.0, 13: 36.0 };
      const spread = spreadMap[state.selectedLevel] ?? 44.0;
      const xVal = (Math.random() - 0.5) * spread;
      this.enemy3D = {
        x: xVal,
        y: 1.5,
        z: zVal
      };
      this.enemyInitialX = xVal;
      this.enemyInitialZ = zVal;
    } else {
      // 2D Cenital Spawn: Semi-circle above the player
      const playerX = width / 2;
      const playerY = height - 80;

      const angle = Math.PI * 1.1 + Math.random() * Math.PI * 0.8; // Semi-circle on top
      const dist = Math.min(width, height) * 0.45 + Math.random() * 80;

      this.enemyX = playerX + Math.cos(angle) * dist;
      this.enemyY = playerY + Math.sin(angle) * dist;

      // Clamp on screen bounds
      this.enemyX = Math.max(40, Math.min(width - 40, this.enemyX));
      this.enemyY = Math.max(40, Math.min(height - 180, this.enemyY));
    }
  }

  private update(dt: number) {
    if (dt > 0.1) dt = 0.1; // Cap time step to avoid physics glitches

    const state = this.controller.getState();
    if (state.isGameOver || state.isLevelComplete) {
      this.updateParticles(dt);
      return;
    }

    // Auto-detect new challenge spawn and reset enemy position
    if (state.currentChallenge !== this.lastChallenge) {
      this.lastChallenge = state.currentChallenge;
      if (state.currentChallenge !== null) {
        this.spawnEnemyData();
      }
    }

    this.elapsedTime += dt;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const playerX = width / 2;
    const playerY = height - 80;

    // 1. Smooth turret rotation & manual rotation for all levels
    let rotating = false;
    if (isFirstPersonLevel(state.selectedLevel)) {
      const rotateSpeed = 0.8; // rads per second (Godot speed)
      const maxRotation = 0.87; // 50 degrees (Godot limit)

      const keyDirection =
        (this.keysPressed["d"] || this.keysPressed["arrowright"] ? 1 : 0) -
        (this.keysPressed["a"] || this.keysPressed["arrowleft"] ? 1 : 0);

      if (keyDirection !== 0) {
        this.turretAngle = Math.max(
          -maxRotation,
          Math.min(maxRotation, this.turretAngle + keyDirection * rotateSpeed * dt)
        );
        rotating = true;
      }
    } else {
      const rotateSpeed = 1.5; // rads per second
      if (this.keysPressed["a"] || this.keysPressed["arrowleft"]) {
        this.playerAngle -= rotateSpeed * dt;
        rotating = true;
      }
      if (this.keysPressed["d"] || this.keysPressed["arrowright"]) {
        this.playerAngle += rotateSpeed * dt;
        rotating = true;
      }
    }

    if (rotating) {
      if (!this.turretSoundPlaying) {
        this.turretSoundPlaying = true;
        this.controller.audio.playSFX("gira-torreta", true, 0.35);
      }
    } else {
      if (this.turretSoundPlaying) {
        this.turretSoundPlaying = false;
        this.controller.audio.stopSFX("gira-torreta");
      }
    }

    // Check if new challenge spawned (to reset enemy position)
    const currentChallenge = state.currentChallenge;
    const hasActiveEnemy = currentChallenge !== null && this.elapsedTime > 3.0; // Wait 3s sample play

    // 2. Update active enemy physics
    if (hasActiveEnemy) {
      const approachTime = this.currentApproachTime;

      const movingTime = this.elapsedTime - 3.0;
      const progress = Math.min(1.0, movingTime / approachTime);

      if (isFirstPersonLevel(state.selectedLevel)) {
        // FPS 3D movement: approaches player at (0, 1.5, 0)
        this.enemy3D.x = this.enemyInitialX * (1 - progress);
        this.enemy3D.z = this.enemyInitialZ - progress * this.enemyInitialZ;

        // Collision/Impact test (cockpit hit at z <= 3.0)
        if (this.enemy3D.z <= 3.0) {
          this.triggerPlayerImpact();
        }
      } else {
        // 2D Cenital movement: approaches player center
        const dx = playerX - this.enemyX;
        const dy = playerY - this.enemyY;
        const dist = Math.hypot(dx, dy);

        if (dist <= 30.0) {
          this.triggerPlayerImpact();
        } else {
          // Move enemy towards player
          const step = (dist * dt) / (approachTime - movingTime);
          this.enemyX += (dx / dist) * Math.min(step, dist);
          this.enemyY += (dy / dist) * Math.min(step, dist);
        }
      }
    }

    // 3. Update missile flight physics
    if (state.missileInFlight) {
      if (isFirstPersonLevel(state.selectedLevel)) {
        // FPS Laser flight: flies fast into Z depth
        if (this.missile3D.z === 0.0) {
          this.controller.triggerMissileFire();
          this.missile3D = { x: 0, y: 0, z: 2.0 };
        }
        
        this.missile3D.z += dt * 90.0; // Fly very fast in Z
        
        // Check impact with enemy at its depth
        if (this.missile3D.z >= this.enemy3D.z) {
          const cosA = Math.cos(this.turretAngle);
          const sinA = Math.sin(this.turretAngle);
          // Check alignment with crosshair in camera space
          const rx = this.enemy3D.x * cosA - this.enemy3D.z * sinA;
          
          if (Math.abs(rx) <= 2.5) {
            this.triggerEnemyHit();
          } else {
            // Missed! Reset laser
            this.missile3D = { x: 0, y: 0, z: 0.0 };
            this.controller.onMissileMissed();
          }
        }
      } else {
        // 2D Cenital missile flight: flies straight in direction of barrel when shot
        if (this.missileX === 0 && this.missileY === 0) {
          this.controller.triggerMissileFire();
          this.missileX = playerX;
          this.missileY = playerY;
          this.missileAngle = this.playerAngle;
        }

        const moveStep = this.missileSpeed * 60 * dt;
        this.missileX += Math.cos(this.missileAngle) * moveStep;
        this.missileY += Math.sin(this.missileAngle) * moveStep;

        const dx = this.enemyX - this.missileX;
        const dy = this.enemyY - this.missileY;
        const dist = Math.hypot(dx, dy);
        
        if (dist <= 25.0) {
          this.triggerEnemyHit();
        } else if (
          this.missileX < 0 || 
          this.missileX > width || 
          this.missileY < 0 || 
          this.missileY > height
        ) {
          // Missed: reset missile so player can try again
          this.missileX = 0;
          this.missileY = 0;
          this.controller.onMissileMissed();
        }
      }
    } else {
      // Reset missile position to player when not flying
      this.missileX = 0;
      this.missileY = 0;
      this.missile3D = { x: 0, y: 0, z: 0.0 };
    }

    // 4. Update particles
    this.updateParticles(dt);

    // 5. Update screen shake decay
    if (this.shakeAmount > 0) {
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 25);
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt * 60;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private triggerEnemyHit() {
    const state = this.controller.getState();
    let hitX = this.enemyX;
    let hitY = this.enemyY;

    if (isFirstPersonLevel(state.selectedLevel)) {
      // FPS Projections hit
      const proj = this.project3D(this.enemy3D.x, this.enemy3D.y, this.enemy3D.z);
      hitX = proj.x;
      hitY = proj.y;
    }

    this.particles.push(...createExplosion(hitX, hitY, state.selectedLevel));
    this.shakeAmount = 12;

    this.controller.onEnemyDestroyed();
    this.spawnEnemyData();
  }

  private triggerPlayerImpact() {
    const state = this.controller.getState();
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    let hitX = width / 2;
    let hitY = height - 80;
    
    if (isFirstPersonLevel(state.selectedLevel)) {
      // In FPS mode, cockpit explodes in the center and spreads out
      hitX = width / 2;
      hitY = height / 2;
      this.particles.push(...createExplosion(hitX, hitY, state.selectedLevel));
      this.particles.push(...createExplosion(hitX - 80, hitY + 30, state.selectedLevel));
      this.particles.push(...createExplosion(hitX + 80, hitY + 30, state.selectedLevel));
    } else {
      // Cenital modes: explosion at the player vehicle position
      this.particles.push(...createExplosion(hitX, hitY, state.selectedLevel));
    }

    this.shakeAmount = 25;
    this.controller.onEnemyReached();
    this.spawnEnemyData();
  }

  private draw() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const state = this.controller.getState();
    const time = performance.now() / 1000;

    this.ctx.save();
    
    // Apply camera shake if any
    if (this.shakeAmount > 0) {
      const sx = (Math.random() - 0.5) * this.shakeAmount;
      const sy = (Math.random() - 0.5) * this.shakeAmount;
      this.ctx.translate(sx, sy);
    }

    // 1. Draw static level environment background
    drawLevelBackground(this.ctx, width, height, state.selectedLevel, time, this.turretAngle);

    const hasActiveEnemy = state.currentChallenge !== null;


    // 2. Draw enemy if active
    if (hasActiveEnemy) {
      if (isFirstPersonLevel(state.selectedLevel)) {
        // Draw Level 4 pseudo-3D Enemy
        const proj = this.project3D(this.enemy3D.x, this.enemy3D.y, this.enemy3D.z);
        
        // Size scales exponentially as it gets closer (z decreases)
        const scale = 360 / Math.max(1.0, this.enemy3D.z);
        const drawnSize = Math.max(8, Math.min(220, 1.25 * scale));

        // Draw only if it is in front of the camera (z > 0)
        if (this.enemy3D.z > 0) {
          drawLevelEnemy(
            this.ctx,
            proj.x,
            proj.y,
            drawnSize,
            state.selectedLevel,
            state.currentChallenge!.rootDisplay,
            state.currentChallenge!.intervalKey ?? getLevelIntervalLabel(state.selectedLevel),
            state.currentChallenge!.direction === 1,
            time
          );
        }
      } else {
        // Draw Level 1, 2, or 3 2D Enemy
        drawLevelEnemy(
          this.ctx,
          this.enemyX,
          this.enemyY,
          this.enemySize,
          state.selectedLevel,
          state.currentChallenge!.rootDisplay,
          state.currentChallenge!.intervalKey ?? getLevelIntervalLabel(state.selectedLevel),
          state.currentChallenge!.direction === 1,
          time
        );
      }
    }

    // 3. Draw player or turret
    const playerX = width / 2;
    const playerY = height - 80;
    
    if (!isFirstPersonLevel(state.selectedLevel)) {
      drawLevelPlayer(
        this.ctx,
        playerX,
        playerY,
        state.selectedLevel,
        state.pitchHoldTime,
        time,
        this.playerAngle
      );
    } else {
      // First-person cockpit / boat overlay
      drawLevelPlayer(
        this.ctx,
        playerX,
        playerY,
        state.selectedLevel,
        state.pitchHoldTime,
        time
      );
    }

    // 4. Draw active missile in flight
    if (state.missileInFlight) {
      if (isFirstPersonLevel(state.selectedLevel)) {
        // Draw Level 4 Laser beam projectile flying forward from bottom center
        const projLaser = this.projectCameraSpace(0, -0.6, this.missile3D.z);

        drawLevelMissile(
          this.ctx,
          projLaser.x,
          projLaser.y,
          state.selectedLevel,
          0,
          time
        );
      } else {
        // Draw 2D Missile flying towards target
        drawLevelMissile(
          this.ctx,
          this.missileX,
          this.missileY,
          state.selectedLevel,
          this.missileAngle,
          time
        );
      }
    }

    // 5. Draw particles
    this.drawParticles();

    // 6. Draw FPS hud layout if Level 4 (crosshair stays in center)
    if (isFirstPersonLevel(state.selectedLevel)) {
      drawFPSOverlayHUD(
        this.ctx,
        width,
        height,
        0,
        state.pitchHoldTime,
        state.strikes,
        state.feedbackKind === "wrong" ? "wrong" : (this.shakeAmount > 16 ? "damage" : null),
        time,
        state.selectedLevel
      );
    }

    this.ctx.restore();
  }

  private drawParticles() {
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 5;
      this.ctx.shadowColor = p.color;
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private projectCameraSpace(x: number, y: number, z: number) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const fov = 350;
    const px = (x * fov) / Math.max(0.1, z) + width / 2;
    const py = (-y * fov) / Math.max(0.1, z) + height / 2;
    return { x: px, y: py };
  }

  private project3D(x: number, y: number, z: number) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const cameraY = 1.5;
    
    // Rotate coordinates around player/camera y-axis
    const cosA = Math.cos(this.turretAngle);
    const sinA = Math.sin(this.turretAngle);
    
    // Rotate in 3D: camera looks down Z axis.
    const rx = x * cosA - z * sinA;
    const rz = x * sinA + z * cosA;
    
    // Perspective projection
    const fov = 350; // Focal length
    const px = (rx * fov) / Math.max(0.1, rz) + width / 2;
    const py = (-(y - cameraY) * fov) / Math.max(0.1, rz) + height / 2;
    
    return { x: px, y: py };
  }
}

// Levels that use the pseudo-3D first-person camera (turret cockpit, river boat, bathyscaphe, vortex)
function isFirstPersonLevel(level: number): boolean {
  return level === 4 || level === 7 || level === 9 || level === 13;
}

function getLevelIntervalLabel(level: number): string {
  const map: Record<number, string> = {
    1: "5J", 2: "4J", 3: "3M", 4: "3m", 5: "6M", 6: "6m", 7: "2M", 8: "2m", 9: "7M", 10: "7m", 11: "9M", 12: "9m"
  };
  return map[level] ?? "ALL";
}
