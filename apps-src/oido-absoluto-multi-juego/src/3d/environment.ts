import * as THREE from "three";
import { buildReefField, preloadBlenderReef, ReefField, ReefPart, ReefPlacement } from "./blender-reef";
import { BlenderWhale, buildBlenderWhale, preloadBlenderWhale } from "./blender-whale";
import { BlenderTurtle, buildBlenderTurtle, preloadBlenderTurtle } from "./blender-turtle";
import { BlenderAtlantis, buildBlenderAtlantis, preloadBlenderAtlantis } from "./blender-atlantis";
import { BlenderCrab, buildBlenderCrab, preloadBlenderCrab } from "./blender-crab";

export interface Obstacle {
  x: number;
  y: number;
  z: number;
  radius: number;
  height?: number; // Optional height for cylinder collision shapes
}

export class LevelEnvironment {
  public group: THREE.Group;
  private obstacles: Obstacle[] = [];
  public altarCrystal?: THREE.Mesh; // Reference to animate rotating crystal
  
  // Decorative moving items
  private animatedMeshes: { mesh: THREE.Object3D; type: string; meta: any }[] = [];
  private rippleTimer = 3.0; // level 4: time until next water ripple
  // Nivel 2: agua soleada (cáusticas en la arena, rayos de sol y superficie vista desde abajo)
  private causticMap?: THREE.CanvasTexture;
  private causticMap2?: THREE.CanvasTexture;
  private sunShafts: THREE.Mesh[] = [];
  private waterSurface?: THREE.Mesh;
  private reef?: ReefField;
  private atlantis?: BlenderAtlantis;
  private shootingStarTimer = 3.0; // level 3: time until next shooting star
  
  constructor(private level: number, private scene: THREE.Scene, private arenaSize: number) {
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.buildEnvironment();
  }

  // Sea-floor height at (x, z). Level 2 is a basin: flat sand at -50 that rises
  // into a rim near the arena edge, replacing the old glass "fish-tank" walls.
  // Other levels have no terrain height (returns -Infinity).
  public getFloorHeight(x: number, z: number): number {
    if (this.level !== 2) return -Infinity;
    return LevelEnvironment.oceanFloorHeight(x, z, this.arenaSize);
  }

  /**
   * Altura mínima libre en (x, z): el suelo o, si ahí hay un edificio (obstáculo cilíndrico),
   * su techo. Sirve para que un objetivo de nota no aparezca dentro de Atlántida.
   */
  public getClearanceHeight(x: number, z: number, margin = 4): number {
    // Solo el océano es 3D con edificios; en los niveles de tierra la nota va al ras del suelo.
    if (this.level !== 2) return -Infinity;
    let top = this.getFloorHeight(x, z);
    for (const obs of this.obstacles) {
      if (obs.height === undefined) continue; // esferas móviles (ballena, tortugas): no cuentan
      if (Math.hypot(x - obs.x, z - obs.z) < obs.radius + margin) {
        top = Math.max(top, obs.y + obs.height);
      }
    }
    return top + margin;
  }

  private static oceanFloorHeight(x: number, z: number, arenaSize: number): number {
    const half = arenaSize / 2;
    // Rounded-square distance so the rim follows the square arena without sharp corners
    const d = Math.pow(Math.pow(Math.abs(x), 6) + Math.pow(Math.abs(z), 6), 1 / 6);
    const start = half - 25, end = half + 10;
    const t = THREE.MathUtils.clamp((d - start) / (end - start), 0, 1);
    const rim = t * t * (3 - 2 * t) * 42;
    // Gentle dunes so the sand isn't a perfect plane
    const dunes = Math.sin(x * 0.045) * Math.cos(z * 0.038) * 0.6 + Math.sin((x + z) * 0.021) * 0.4;
    return -50 + rim + dunes * (1 - t * 0.5);
  }

  public getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  public clear(): void {
    this.scene.remove(this.group);
    this.obstacles = [];
    this.animatedMeshes = [];
    this.sunShafts = [];
    this.causticMap?.dispose();
    this.causticMap2?.dispose();
    this.causticMap = undefined;
    this.causticMap2 = undefined;
    this.waterSurface = undefined;
    this.reef = undefined;
    this.atlantis = undefined;
    this.altarCrystal = undefined;
    // Reset fog
    this.scene.fog = null;
  }

  private buildEnvironment(): void {
    if (this.level === 1) {
      this.buildPrairie();
    } else if (this.level === 2) {
      this.buildOcean();
    } else if (this.level === 3) {
      this.buildCosmos();
    } else if (this.level === 4) {
      this.buildSwamp();
    } else if (this.level === 5) {
      this.buildClouds();
    }
  }

  // Check and push back player from obstacles (returns displacement vector)
  public checkCollisions(playerPos: THREE.Vector3, playerRadius: number): THREE.Vector3 {
    const displacement = new THREE.Vector3(0, 0, 0);

    for (const obs of this.obstacles) {
      const dx = playerPos.x - obs.x;
      const dz = playerPos.z - obs.z;
      
      // If obstacle is a cylinder shape (has height)
      if (obs.height !== undefined) {
        const dist2D = Math.sqrt(dx*dx + dz*dz);
        const minDist = obs.radius + playerRadius;
        
        // Check if player is within Y bounds plus player radius
        const withinY = (playerPos.y >= obs.y - playerRadius && playerPos.y <= obs.y + obs.height + playerRadius);
        
        if (dist2D < minDist && withinY) {
          // Horizontal overlap to escape
          const overlapH = minDist - dist2D;
          
          // Vertical overlap to escape (either pushing UP above top cap, or DOWN below bottom cap)
          const distToTop = (obs.y + obs.height + playerRadius) - playerPos.y;
          const distToBottom = playerPos.y - (obs.y - playerRadius);
          
          // Un edificio apoyado en la arena no tiene «por debajo»: jamás se sale hundiéndose.
          const grounded = obs.y <= this.getFloorHeight(obs.x, obs.z) + 5;
          const pushUp = grounded || distToTop < distToBottom;
          const overlapV = pushUp ? distToTop : distToBottom;
          
          // Choose the direction of the shortest exit vector (smallest overlap)
          if (overlapH < overlapV) {
            // Push horizontally
            const pushDir = new THREE.Vector3(dx, 0, dz);
            if (pushDir.lengthSq() < 0.0001) {
              pushDir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
            }
            pushDir.normalize();
            displacement.addScaledVector(pushDir, overlapH);
          } else {
            // Push vertically
            displacement.y += pushUp ? overlapV : -overlapV;
          }
        }
        continue;
      }
      
      // Default sphere/3D/2D collision check
      const is3D = (this.level === 2 || this.level === 3 || this.level === 5);
      const dy = is3D ? (playerPos.y - obs.y) : 0;
      
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
      const minDistance = obs.radius + playerRadius;
      
      if (distance < minDistance) {
        // Collided! Push player back
        const overlap = minDistance - distance;
        const pushDir = new THREE.Vector3(dx, is3D ? dy : 0, dz);
        
        if (pushDir.lengthSq() < 0.0001) {
          // If perfectly overlapping, push to random direction
          pushDir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
        }
        pushDir.normalize();
        
        // Accumulate displacement
        displacement.addScaledVector(pushDir, overlap);
      }
    }

    return displacement;
  }

  // Update animated details
  public update(delta: number, time: number): void {
    for (const item of this.animatedMeshes) {
      const { mesh, type, meta } = item;
      
      if (type === "butterfly") {
        meta.angle += delta * meta.speed;
        mesh.position.x = meta.centerX + Math.cos(meta.angle) * meta.radius;
        mesh.position.z = meta.centerZ + Math.sin(meta.angle) * meta.radius;
        mesh.position.y = meta.centerY + Math.sin(time * 5.0) * 0.3;
        mesh.rotation.y = -meta.angle + Math.PI / 2;
        // Wing flapping
        const leftWing = mesh.children[0];
        const rightWing = mesh.children[1];
        if (leftWing && rightWing) {
          leftWing.rotation.z = Math.sin(time * 25.0) * 0.8;
          rightWing.rotation.z = -Math.sin(time * 25.0) * 0.8;
        }
      } 
      else if (type === "turtle") {
        meta.angle += delta * meta.speed;
        mesh.position.x = Math.cos(meta.angle) * meta.radius;
        mesh.position.z = Math.sin(meta.angle) * meta.radius;
        mesh.position.y = meta.centerY + Math.sin(time * 0.5 + meta.offset) * 3.0;
        // Cabeza a +Z, igual que la ballena: el rumbo es el opuesto del ángulo de órbita.
        mesh.rotation.y = -meta.angle;
        // Se inclina un poco hacia donde sube o baja.
        mesh.rotation.x = Math.cos(time * 0.5 + meta.offset) * 0.12;
        meta.turtle?.update(time, meta.offset);
        if (meta.obsRef) {
          meta.obsRef.x = mesh.position.x;
          meta.obsRef.y = mesh.position.y;
          meta.obsRef.z = mesh.position.z;
        }
      } 
      else if (type === "bubble") {
        mesh.position.y += delta * meta.speed;
        mesh.position.x += Math.sin(time * 2 + meta.offset) * 0.05;
        if (mesh.position.y > 18.0) {
          mesh.position.y = -48.0;
        }
      } 
      else if (type === "whale") {
        meta.swimAngle += 0.08 * delta;
        const radius = 80.0;
        
        // Target positions (in world coordinates)
        const tx = Math.cos(meta.swimAngle) * radius;
        const tz = Math.sin(meta.swimAngle) * radius;
        const ty = -15.0 + Math.sin(time * 0.3) * 5.0; // majestic rising and diving
        
        // Lerp position
        mesh.position.lerp(new THREE.Vector3(tx, ty, tz), 1.5 * delta);
        
        // Lerp rotation.y (tangent direction)
        // Modelo con la cabeza a +Z: el rumbo es el opuesto del angulo de orbita
        // (comprobado midiendo morro contra velocidad, no a ojo).
        const targetAngle = -meta.swimAngle;
        mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, targetAngle, 1.5 * delta);
        
        // Pitch bobbing
        mesh.rotation.x = Math.sin(time * 1.5) * 0.05;
        
        // Cola, pectorales y mandíbula (valores de la entrega de Astra)
        meta.whale?.update(delta, time);

        // Burbujas del espiráculo, en el punto que marca el propio modelo
        if (meta.whale && time - meta.lastBubbleTime > 0.25) {
          meta.lastBubbleTime = time;
          mesh.updateMatrixWorld();
          this.spawnBlowholeBubble(meta.whale.blowhole.clone().applyMatrix4(mesh.matrixWorld));
        }

        // Update collider position dynamically
        if (meta.obsRef) {
          meta.obsRef.x = mesh.position.x;
          meta.obsRef.y = mesh.position.y;
          meta.obsRef.z = mesh.position.z;
        }
      }
      else if (type === "blowhole_bubble") {
        // Ascend
        mesh.position.y += delta * meta.speed;
        // Zigzag wiggle
        mesh.position.x += Math.sin(time * 3.0 + meta.phase) * 0.9 * delta;
        // Grow gently
        const s = mesh.scale.x + 0.18 * delta;
        mesh.scale.set(s, s, s);
        
        // Mark for deletion if too high
        if (mesh.position.y > meta.spawnY + 20.0) {
          meta.dead = true;
        }
      }
      else if (type === "asteroid") {
        mesh.rotation.x += meta.rotX * delta;
        mesh.rotation.y += meta.rotY * delta;
      }
      else if (type === "star") {
        // Twinkling
        const mat = (mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = meta.baseOpacity + Math.sin(time * meta.speed + meta.offset) * 0.3;
      }
      else if (type === "firefly") {
        const b = meta.base, off = meta.off;
        mesh.position.set(
          b.x + Math.sin(time * 0.55 + off) * 3.0 + Math.sin(time * 1.3 + off * 2.1) * 1.2,
          b.y + Math.sin(time * 0.9 + off * 1.5) * 0.8,
          b.z + Math.cos(time * 0.47 + off) * 3.0 + Math.cos(time * 1.1 + off * 1.8) * 1.0
        );
        mesh.scale.setScalar(0.9 + Math.sin(time * 6.5 + off) * 0.12);
        const m = (mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (m) m.opacity = 0.6 + Math.abs(Math.sin(time * 7.0 + off) * 0.3 + Math.sin(time * 13.5 + off * 3.0) * 0.15);
      }
      else if (type === "spider") {
        this.updateSpider(mesh, meta, delta);
      }
      else if (type === "ripple") {
        meta.age += delta;
        if (meta.age >= meta.maxAge) {
          meta.dead = true;
        } else {
          const progress = meta.age / meta.maxAge;
          mesh.scale.set(meta.maxR * progress, meta.maxR * progress, 1);
          const m = (mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
          if (m) m.opacity = (1 - progress) * 0.5;
        }
      }
      else if (type === "shooting_star") {
        meta.age += delta;
        mesh.position.addScaledVector(meta.dir, meta.speed * delta);
        const m = (mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (m) m.opacity = Math.max(0, 1 - meta.age / meta.lifetime);
        if (meta.age >= meta.lifetime) meta.dead = true;
      }
      else if (type === "crab") {
        this.updateCrab(mesh, meta, delta, time);
      }
      else if (type === "cloud") {
        // Horizontal drift direction
        mesh.position.addScaledVector(meta.driftDirection, meta.driftSpeed * delta);
        
        // Vertical sine wave bobbing
        mesh.position.y = meta.baseY + Math.sin(time * meta.bobSpeed + meta.bobOffset) * meta.bobAmount;

        // Wrap around boundary limits
        const limit = meta.limit;
        if (mesh.position.x > limit) mesh.position.x = -limit;
        else if (mesh.position.x < -limit) mesh.position.x = limit;

        if (mesh.position.z > limit) mesh.position.z = -limit;
        else if (mesh.position.z < -limit) mesh.position.z = limit;
      }
      // ===== Level 5 — Las Nubes =====
      else if (type === "sky_cloud") {
        const b = meta.base, off = meta.off, spd = meta.spd;
        mesh.position.set(
          b.x + Math.sin(time * spd * 0.12 + off) * 4.0,
          b.y + Math.sin(time * spd * 0.25 + off * 1.3) * 1.0,
          b.z + Math.cos(time * spd * 0.09 + off * 0.8) * 4.0
        );
      }
      else if (type === "sky_island") {
        mesh.position.y = meta.baseY + Math.sin(time * 0.5 + meta.bobOffset) * 0.8;
      }
      else if (type === "sparkle") {
        const b = meta.base, off = meta.off, spd = meta.spd;
        mesh.position.set(
          b.x + Math.sin(time * spd + off) * 2.2 + Math.sin(time * spd * 2.3 + off * 1.8) * 0.7,
          b.y + Math.sin(time * spd * 1.5 + off * 1.4) * 1.4,
          b.z + Math.cos(time * spd * 0.9 + off * 0.7) * 2.0
        );
        const s = 0.85 + Math.sin(time * 6.5 + off) * 0.15;
        mesh.scale.setScalar(s);
        const m = (mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (m) m.opacity = 0.7 + Math.abs(Math.sin(time * 7.0 + off) * 0.2 + Math.sin(time * 13.0 + off * 2.5) * 0.1);
      }
      else if (type === "kite") {
        const b = meta.base, off = meta.off;
        mesh.position.x = b.x + Math.sin(time * 0.40 + off * 0.7) * 0.8;
        mesh.position.y = b.y + Math.sin(time * 0.75 + off) * 1.2;
        mesh.rotation.z = Math.sin(time * 0.55 + off) * 0.08;
        mesh.rotation.y = Math.sin(time * 0.35 + off * 1.2) * 0.06;
        const bows = meta.bows as THREE.Object3D[];
        const n = bows.length;
        for (let bi = 0; bi < n; bi++) {
          const frac = (bi + 1) / (n + 1);
          bows[bi].position.set(
            Math.sin(time * 0.8 + off + frac * 1.5) * 0.4 * frac,
            -1.8 - frac * 2.6,
            Math.sin(time * 0.6 + off * 1.3 + frac * 1.2) * 0.18 * frac
          );
          bows[bi].rotation.z = Math.sin(time * 0.9 + off + frac * 2.0) * 0.25;
        }
      }
      else if (type === "bird") {
        this.updateBird(mesh, meta, delta, time);
      }
    }

    // Level 4: spawn periodic water ripples
    if (this.level === 4) {
      this.rippleTimer -= delta;
      if (this.rippleTimer <= 0) {
        this.rippleTimer = 1.5 + Math.random() * 3.5;
        this.spawnRipple(this.arenaSize / 2);
      }
    }

    // Level 3: spawn periodic shooting stars (sometimes in bursts)
    if (this.level === 2) {
      this.reef?.update(time);
      this.atlantis?.update(time);
      // Arrastre lento y cruzado de las dos capas de cáusticas + ondas de la superficie.
      if (this.causticMap) {
        this.causticMap.offset.set(time * 0.012, time * 0.008);
      }
      if (this.causticMap2) {
        this.causticMap2.offset.set(-time * 0.009, time * 0.014);
      }
      const surfaceMap = (this.waterSurface?.material as THREE.MeshBasicMaterial | undefined)?.map;
      if (surfaceMap) surfaceMap.offset.set(time * 0.006, -time * 0.004);
      for (let i = 0; i < this.sunShafts.length; i++) {
        const shaft = this.sunShafts[i];
        const mat = shaft.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.05 + Math.abs(Math.sin(time * 0.25 + i)) * 0.045;
        shaft.rotation.y = Math.sin(time * 0.06 + i) * 0.25;
      }
    }

    if (this.level === 3) {
      this.shootingStarTimer -= delta;
      if (this.shootingStarTimer <= 0) {
        this.shootingStarTimer = 4.0 + Math.random() * 6.0;
        const burst = Math.random() < 0.7 ? 1 : (Math.random() < 0.6 ? 2 : 3);
        for (let b = 0; b < burst; b++) this.spawnShootingStar(this.arenaSize / 2);
      }
    }

    // Rotate Atlantis altar crystal
    if (this.altarCrystal) {
      this.altarCrystal.rotation.y = time * 0.5;
      this.altarCrystal.rotation.x = Math.sin(time * 0.3) * 0.2;
    }

    // Clean up dead animated meshes (e.g. popped bubbles)
    for (let i = this.animatedMeshes.length - 1; i >= 0; i--) {
      const item = this.animatedMeshes[i];
      if (item.meta && item.meta.dead) {
        this.group.remove(item.mesh);
        this.animatedMeshes.splice(i, 1);
      }
    }
  }

  // ==================== TEXTURE GENERATORS ====================
  private generateGrassTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    
    // Base green
    ctx.fillStyle = "#2e5c1e";
    ctx.fillRect(0, 0, 512, 512);

    // Draw grass blades
    for (let i = 0; i < 25000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const h = 3 + Math.random() * 7;
      const angle = (Math.random() - 0.5) * 0.4;
      
      const g = 65 + Math.floor(Math.random() * 65);
      const r = 25 + Math.floor(Math.random() * 25);
      const b = 15 + Math.floor(Math.random() * 15);
      
      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.lineWidth = 1.0 + Math.random() * 1.0;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(angle) * h, y - h);
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(50, 50);
    return texture;
  }

  // Sand: warm base with fine grain and faint wave ripples (level 2 sea floor)
  private generateSandTexture(floorSize: number): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    // Warmer than the #d9c28f target: the blue underwater light cools it back down
    ctx.fillStyle = "#f2cf86";
    ctx.fillRect(0, 0, 512, 512);

    // Ripples: bands that wander sideways; whole periods across the canvas so it tiles
    for (let x = 0; x < 512; x += 4) {
      const bend = Math.sin((x / 512) * Math.PI * 2 * 2) * 10 + Math.sin((x / 512) * Math.PI * 2 * 5) * 3;
      for (let y = 0; y < 512; y += 2) {
        const wave = Math.sin(((y + bend) / 512) * Math.PI * 2 * 9);
        ctx.fillStyle = wave > 0 ? `rgba(255, 244, 215, ${wave * 0.14})` : `rgba(125, 90, 45, ${-wave * 0.12})`;
        ctx.fillRect(x, y, 4, 2);
      }
    }
    // Grain
    for (let i = 0; i < 30000; i++) {
      const light = Math.random() < 0.5;
      ctx.fillStyle = light ? `rgba(255, 246, 220, ${0.15 + Math.random() * 0.25})` : `rgba(110, 85, 50, ${0.12 + Math.random() * 0.2})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(floorSize / 24, floorSize / 24); // one tile ≈ 24 m
    texture.anisotropy = 4;
    return texture;
  }

  // Red de cáusticas: interferencia de tres ondas, recortada a las crestas.
  private generateCausticTexture(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const image = ctx.createImageData(size, size);
    const phase = Math.random() * Math.PI * 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * Math.PI * 2, v = (y / size) * Math.PI * 2;
        const w = Math.sin(u * 3 + Math.cos(v * 2 + phase) * 1.6)
                + Math.sin(v * 4 - Math.cos(u * 3 - phase) * 1.4)
                + Math.sin((u + v) * 2 + phase);
        const crest = Math.max(0, w / 3) ** 3.2; // solo las crestas brillan
        const i = (y * size + x) * 4;
        const level = Math.min(255, crest * 420);
        image.data[i] = level;
        image.data[i + 1] = level;
        image.data[i + 2] = level * 0.92;
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // Rayos de sol: conos muy abiertos y translúcidos que bajan desde la superficie.
  private spawnSunShafts(): void {
    const half = this.arenaSize / 2;
    const material = new THREE.MeshBasicMaterial({
      color: 0xdff3ff, transparent: true, opacity: 0.07,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    for (let i = 0; i < 9; i++) {
      const shaft = new THREE.Mesh(new THREE.ConeGeometry(7 + Math.random() * 9, 72, 10, 1, true), material);
      shaft.position.set((Math.random() - 0.5) * half * 1.7, -14, (Math.random() - 0.5) * half * 1.7);
      shaft.rotation.z = (Math.random() - 0.5) * 0.16;
      shaft.rotation.x = (Math.random() - 0.5) * 0.16;
      shaft.renderOrder = 2;
      this.group.add(shaft);
      this.sunShafts.push(shaft);
    }
  }

  // Superficie del agua vista desde abajo: techo brillante con ondas que se mueven.
  private spawnWaterSurface(): void {
    const size = this.arenaSize + 160;
    const texture = this.generateCausticTexture();
    texture.repeat.set(size / 110, size / 110);
    const surface = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({
        color: 0xbfe9f7, map: texture, transparent: true, opacity: 0.5,
        side: THREE.BackSide, depthWrite: false,
      })
    );
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 21;
    this.group.add(surface);
    this.waterSurface = surface;
  }

  private generateStoneTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    
    // Base gray
    ctx.fillStyle = "#5c5c63";
    ctx.fillRect(0, 0, 256, 256);
    
    ctx.strokeStyle = "#323235";
    ctx.lineWidth = 2.5;
    const rows = 12;
    const cols = 6;
    const h = 256 / rows;
    const w = 256 / cols;
    
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * h);
      ctx.lineTo(256, r * h);
      ctx.stroke();
    }
    
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (w / 2);
      for (let c = 0; c <= cols + 1; c++) {
        ctx.beginPath();
        ctx.moveTo(c * w - offset, r * h);
        ctx.lineTo(c * w - offset, (r + 1) * h);
        ctx.stroke();
      }
    }
    
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const shade = 65 + Math.random() * 25;
      ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade + 5}, 0.08)`;
      ctx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // ==================== LEVEL 1: PRAIRIE ====================
  private buildPrairie(): void {
    // Lighting: match Godot's triple light setup
    // 1. Hemisphere ambient
    const hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0x3b5e3b, 1.2);
    this.group.add(hemiLight);

    // 2. Main sun directional light
    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.5);
    dirLight.position.set(50, 80, -30);
    dirLight.castShadow = true;
    this.group.add(dirLight);

    // 3. Opposite fill light
    const fillLight = new THREE.DirectionalLight(0xdbe6f5, 0.5);
    fillLight.position.set(-50, 80, 30);
    this.group.add(fillLight);

    // 4. Lateral side light
    const sideLight = new THREE.DirectionalLight(0xd9ecf5, 0.35);
    sideLight.position.set(50, 40, 50);
    this.group.add(sideLight);

    // Fog: soft pastel sky blue
    this.scene.fog = new THREE.FogExp2(0xa0cce8, 0.007);
    this.scene.background = new THREE.Color(0xa0cce8);

    // Ground: procedural grass look
    const grassTex = this.generateGrassTexture();
    const groundGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize);
    const groundMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.95,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Shared stone material
    const stoneTex = this.generateStoneTexture();
    stoneTex.repeat.set(4, 4);
    const stoneMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      roughness: 0.9,
      metalness: 0.05
    });

    // Outer stone perimeter walls
    this.buildOuterWalls(6.0, stoneMat);

    // Medieval Castle
    this.buildCastle(0, 0, -40, stoneMat);

    // Hedge Maze
    this.buildHedgeMaze(60, 50);

    // Spawn 90 solid trees
    for (let i = 0; i < 90; i++) {
      const tx = (Math.random() - 0.5) * (this.arenaSize - 40);
      const tz = (Math.random() - 0.5) * (this.arenaSize - 40);
      
      // Avoid castle and spawn zone (center)
      const distToCenter = Math.sqrt(tx*tx + tz*tz);
      const distToCastle = Math.sqrt(tx*tx + (tz + 40)*(tz + 40));
      
      if (distToCenter > 15 && distToCastle > 25) {
        this.spawnTree(tx, tz);
      }
    }

    // Spawn 40 rocks
    for (let i = 0; i < 40; i++) {
      const rx = (Math.random() - 0.5) * (this.arenaSize - 30);
      const rz = (Math.random() - 0.5) * (this.arenaSize - 30);
      const distToCenter = Math.sqrt(rx*rx + rz*rz);
      const distToCastle = Math.sqrt(rx*rx + (rz + 40)*(rz + 40));
      
      if (distToCenter > 15 && distToCastle > 25) {
        this.spawnRock(rx, rz);
      }
    }

    // Spawn 15 animated butterflies
    for (let i = 0; i < 15; i++) {
      this.spawnButterfly();
    }

    // Spawn 12 cotton clouds in the sky (as defined in CloudSpawner.gd)
    for (let i = 0; i < 12; i++) {
      this.spawnCloud();
    }
  }

  private buildOuterWalls(height: number, stoneMat: THREE.Material): void {
    const thickness = 1.5;
    const size = this.arenaSize;

    // North (Gate wall: leave a gap at the center for the wood gate)
    const wallNLeft = new THREE.Mesh(new THREE.BoxGeometry(size / 2 - 6, height, thickness), stoneMat);
    wallNLeft.position.set(-size / 4 - 3, height / 2, -size / 2);
    const wallNRight = new THREE.Mesh(new THREE.BoxGeometry(size / 2 - 6, height, thickness), stoneMat);
    wallNRight.position.set(size / 4 + 3, height / 2, -size / 2);
    this.group.add(wallNLeft, wallNRight);

    // South (complete wall)
    const wallS = new THREE.Mesh(new THREE.BoxGeometry(size, height, thickness), stoneMat);
    wallS.position.set(0, height / 2, size / 2);
    this.group.add(wallS);

    // East
    const wallE = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, size), stoneMat);
    wallE.position.set(size / 2, height / 2, 0);
    this.group.add(wallE);

    // West
    const wallW = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, size), stoneMat);
    wallW.position.set(-size / 2, height / 2, 0);
    this.group.add(wallW);

    // Add wall obstacles to block player (several sphere checks along walls)
    for (let i = -size / 2; i <= size / 2; i += 8) {
      this.obstacles.push({ x: i, y: 0, z: size / 2, radius: thickness * 1.2 }); // South wall complete
      this.obstacles.push({ x: size / 2, y: 0, z: i, radius: thickness * 1.2 });
      this.obstacles.push({ x: -size / 2, y: 0, z: i, radius: thickness * 1.2 });
      
      // North wall: skip center gap around x=0
      if (Math.abs(i) > 4) {
        this.obstacles.push({ x: i, y: 0, z: -size / 2, radius: thickness * 1.2 });
      }
    }
  }

  private spawnTree(x: number, z: number): void {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);

    // Randomize scale of this tree (between 0.75 and 1.8)
    const scale = 0.75 + Math.random() * 1.05;

    // Trunk is kept relatively short/chaparrito (height 2.6 scaled)
    const trunkHeight = 2.6 * scale;
    const trunkRadiusTop = 0.16 * scale;
    const trunkRadiusBottom = 0.28 * scale;
    const trunkGeo = new THREE.CylinderGeometry(trunkRadiusTop, trunkRadiusBottom, trunkHeight, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // Foliage has varied green tones
    const foliageGreens = [0x2e7d32, 0x1b5e20, 0x388e3c, 0x27ae60, 0x1e824c];
    const foliageColor = foliageGreens[Math.floor(Math.random() * foliageGreens.length)];
    const folMat = new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.85 });

    // Foliage spheres are disproportionately LARGE compared to the short trunk!
    const r1 = (2.2 + Math.random() * 0.8) * scale;
    const r2 = (1.7 + Math.random() * 0.5) * scale;
    const r3 = (1.7 + Math.random() * 0.5) * scale;

    // Primary central sphere
    const f1 = new THREE.Mesh(new THREE.SphereGeometry(r1, 12, 12), folMat);
    f1.position.y = trunkHeight + r1 * 0.5;
    f1.castShadow = true;
    f1.receiveShadow = true;

    // Flanking spheres with unique offsets for organic variation
    const ox2 = (0.3 + Math.random() * 0.3) * r1;
    const oz2 = -(0.1 + Math.random() * 0.2) * r1;
    const oy2 = f1.position.y + r1 * 0.35;
    const f2 = new THREE.Mesh(new THREE.SphereGeometry(r2, 10, 10), folMat);
    f2.position.set(ox2, oy2, oz2);
    f2.castShadow = true;
    f2.receiveShadow = true;

    const ox3 = -(0.3 + Math.random() * 0.3) * r1;
    const oz3 = (0.1 + Math.random() * 0.2) * r1;
    const oy3 = f1.position.y + r1 * 0.3;
    const f3 = new THREE.Mesh(new THREE.SphereGeometry(r3, 10, 10), folMat);
    f3.position.set(ox3, oy3, oz3);
    f3.castShadow = true;
    f3.receiveShadow = true;

    tree.add(f1, f2, f3);

    this.group.add(tree);
    
    // Collision matches only the trunk footprint so player can walk under giant leaves
    this.obstacles.push({ x, y: 0, z, radius: trunkRadiusBottom * 1.3 });
  }

  private spawnRock(x: number, z: number): void {
    const scale = 0.5 + Math.random() * 1.5;
    const rockGeo = new THREE.DodecahedronGeometry(scale, 1);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.9 });
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(x, scale * 0.4, z);
    rock.scale.set(1.4, 0.8, 1.2);
    this.group.add(rock);

    this.obstacles.push({ x, y: 0, z, radius: scale * 1.1 });
  }

  private spawnButterfly(): void {
    const bGroup = new THREE.Group();
    const wingMat = new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff, side: THREE.DoubleSide });
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const wingGeo = new THREE.PlaneGeometry(0.2, 0.25);
    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.position.x = -0.1;
    const wingR = new THREE.Mesh(wingGeo, wingMat);
    wingR.position.x = 0.1;

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 4), bodyMat);
    body.rotation.x = Math.PI / 2;

    bGroup.add(wingL, wingR, body);
    this.group.add(bGroup);

    this.animatedMeshes.push({
      mesh: bGroup,
      type: "butterfly",
      meta: {
        centerX: (Math.random() - 0.5) * (this.arenaSize - 40),
        centerY: 1.5 + Math.random() * 3.0,
        centerZ: (Math.random() - 0.5) * (this.arenaSize - 40),
        angle: Math.random() * Math.PI * 2,
        radius: 3.0 + Math.random() * 6.0,
        speed: 0.5 + Math.random() * 0.8
      }
    });
  }

  private spawnCloud(xPos?: number, yPos?: number, zPos?: number): void {
    const cloud = new THREE.Group();
    
    // Set position
    const limit = this.arenaSize * 0.8;
    const px = xPos !== undefined ? xPos : (Math.random() - 0.5) * limit * 2;
    const pz = zPos !== undefined ? zPos : (Math.random() - 0.5) * limit * 2;
    const py = yPos !== undefined ? yPos : 25.0 + Math.random() * 20.0;
    cloud.position.set(px, py, pz);

    const cloudScale = 0.7 + Math.random() * 0.8; // general scale

    // configs: [offset_x, offset_y, offset_z, radius, squash_y]
    const configs = [
      [0.0, 0.0, 0.0, 5.0, 0.45],
      [-3.5, 0.5, 1.0, 4.0, 0.5],
      [3.0, 0.3, -0.5, 3.5, 0.5],
      [-1.5, -0.3, -1.5, 3.0, 0.55],
      [1.5, 0.6, 1.5, 3.5, 0.4],
    ];

    const brightness = 0.9 + Math.random() * 0.1;
    const opacity = 0.75 + Math.random() * 0.15;
    // Material is THREE.MeshBasicMaterial so it's unshaded and always bright, slightly transparent
    const cloudMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(brightness, brightness, brightness),
      transparent: true,
      opacity: opacity,
      depthWrite: false // prevent drawing sorting artifacts
    });

    for (let i = 0; i < 5; i++) {
      const cfg = configs[i];
      const r = cfg[3] * cloudScale;
      
      const sphereGeo = new THREE.SphereGeometry(r, 10, 8);
      const puff = new THREE.Mesh(sphereGeo, cloudMat);
      
      // Squash Y
      puff.scale.set(1.0, cfg[4], 1.0);
      
      puff.position.set(
        cfg[0] * cloudScale + (Math.random() - 0.5) * 1.0,
        cfg[1] * cloudScale,
        cfg[2] * cloudScale + (Math.random() - 0.5) * 1.0
      );
      cloud.add(puff);
    }

    this.group.add(cloud);

    // Add to animated meshes list
    const driftAngle = (Math.random() - 0.5) * 0.6; // Predominant direction with minor variations
    const dir = new THREE.Vector3(Math.cos(driftAngle), 0, Math.sin(driftAngle)).normalize();
    
    this.animatedMeshes.push({
      mesh: cloud,
      type: "cloud",
      meta: {
        driftDirection: dir,
        driftSpeed: 1.0 + Math.random() * 2.5,
        bobSpeed: 0.3 + Math.random() * 0.5,
        bobOffset: Math.random() * Math.PI * 2,
        bobAmount: 0.3 + Math.random() * 0.7,
        baseY: py,
        limit: limit
      }
    });
  }

  private buildCastle(x: number, y: number, z: number, stoneMat: THREE.Material): void {
    const castle = new THREE.Group();
    castle.position.set(x, y, z);

    const castleHalf = 20.0;
    const wh = 6.0;
    const wd = 2.0;
    const towerRadius = 3.0;
    const towerHeight = 10.0;
    const gateWidth = 6.0;
    const gateHeight = 5.0;
    const keepSize = new THREE.Vector3(10, 15, 10);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.85 });

    // 1. Towers at the 4 corners
    const towerGeo = new THREE.CylinderGeometry(towerRadius, towerRadius, towerHeight, 16);
    const roofGeo = new THREE.ConeGeometry(towerRadius + 1.0, 4.0, 16);

    const towerCorners = [
      [castleHalf, castleHalf],
      [-castleHalf, castleHalf],
      [castleHalf, -castleHalf],
      [-castleHalf, -castleHalf]
    ];

    for (const corner of towerCorners) {
      const tower = new THREE.Mesh(towerGeo, stoneMat);
      tower.position.set(corner[0], towerHeight / 2, corner[1]);
      
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(corner[0], towerHeight + 2.0, corner[1]);

      castle.add(tower, roof);
      
      // Colliders for the 4 corner towers (mapped to absolute positions)
      this.obstacles.push({ x: x + corner[0], y: 0, z: z + corner[1], radius: towerRadius * 1.1 });
    }

    // 2. Walls
    // Back wall
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(castleHalf * 2, wh, wd), stoneMat);
    wallBack.position.set(0, wh / 2, -castleHalf);
    castle.add(wallBack);

    // Left wall
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(wd, wh, castleHalf * 2), stoneMat);
    wallLeft.position.set(-castleHalf, wh / 2, 0);
    castle.add(wallLeft);

    // Right wall
    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(wd, wh, castleHalf * 2), stoneMat);
    wallRight.position.set(castleHalf, wh / 2, 0);
    castle.add(wallRight);

    // Front wall (two segments leaving a gateWidth gap)
    const frontSegW = (castleHalf * 2 - gateWidth) / 2;
    const frontSegL = new THREE.Mesh(new THREE.BoxGeometry(frontSegW, wh, wd), stoneMat);
    frontSegL.position.set(-(frontSegW / 2 + gateWidth / 2), wh / 2, castleHalf);
    const frontSegR = new THREE.Mesh(new THREE.BoxGeometry(frontSegW, wh, wd), stoneMat);
    frontSegR.position.set(frontSegW / 2 + gateWidth / 2, wh / 2, castleHalf);
    castle.add(frontSegL, frontSegR);

    // Lintel over the front gate
    const lintelH = wh - gateHeight;
    if (lintelH > 0) {
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(gateWidth + 0.5, lintelH, wd + 0.1), stoneMat);
      lintel.position.set(0, gateHeight + lintelH / 2, castleHalf);
      castle.add(lintel);
    }

    // 3. Battlements (Almenas) on all walls
    const spacing = 2.2;
    const battCount = Math.floor(castleHalf * 2.0 / spacing);

    // Back & Front Battlements
    for (let i = 0; i < battCount; i++) {
      const bx = -castleHalf + spacing * 0.5 + i * spacing;
      
      // Back wall battlement
      const bMeshBack = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, wd + 0.3), stoneMat);
      bMeshBack.position.set(bx, wh + 0.5, -castleHalf);
      castle.add(bMeshBack);

      // Front wall battlement (skip gate width gap)
      if (Math.abs(bx) >= gateWidth / 2 + 1.0) {
        const bMeshFront = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, wd + 0.3), stoneMat);
        bMeshFront.position.set(bx, wh + 0.5, castleHalf);
        castle.add(bMeshFront);
      }
    }

    // Left & Right Battlements
    for (let i = 0; i < battCount; i++) {
      const bz = -castleHalf + spacing * 0.5 + i * spacing;
      
      const bMeshL = new THREE.Mesh(new THREE.BoxGeometry(wd + 0.3, 1.0, 1.0), stoneMat);
      bMeshL.position.set(-castleHalf, wh + 0.5, bz);
      
      const bMeshR = new THREE.Mesh(new THREE.BoxGeometry(wd + 0.3, 1.0, 1.0), stoneMat);
      bMeshR.position.set(castleHalf, wh + 0.5, bz);
      
      castle.add(bMeshL, bMeshR);
    }

    // 4. Central Keep (Torreón central)
    const keep = new THREE.Mesh(new THREE.BoxGeometry(keepSize.x, keepSize.y, keepSize.z), stoneMat);
    keep.position.set(0, keepSize.y / 2, 0);
    castle.add(keep);

    // Keep Battlements
    const kSpacing = 2.0;
    const kw = keepSize.x / 2;
    const kd = keepSize.z / 2;
    const ky = keepSize.y + 0.5;

    for (let i = 0; i < Math.floor(keepSize.x / kSpacing); i++) {
      const kx = -kw + kSpacing * 0.5 + i * kSpacing;
      
      const bKeepFront = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.6), stoneMat);
      bKeepFront.position.set(kx, ky, kd);
      const bKeepBack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.6), stoneMat);
      bKeepBack.position.set(kx, ky, -kd);
      
      castle.add(bKeepFront, bKeepBack);
    }

    for (let i = 0; i < Math.floor(keepSize.z / kSpacing); i++) {
      const kz = -kd + kSpacing * 0.5 + i * kSpacing;
      
      const bKeepLeft = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.8), stoneMat);
      bKeepLeft.position.set(-kw, ky, kz);
      const bKeepRight = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.8), stoneMat);
      bKeepRight.position.set(kw, ky, kz);
      
      castle.add(bKeepLeft, bKeepRight);
    }

    this.group.add(castle);

    // 5. Add wall colliders to push player back (represented as sphere obstacles along walls)
    // Back wall colliders
    for (let bx = -castleHalf; bx <= castleHalf; bx += 4) {
      this.obstacles.push({ x: x + bx, y: 0, z: z - castleHalf, radius: wd * 1.1 });
      this.obstacles.push({ x: x - castleHalf, y: 0, z: z + bx, radius: wd * 1.1 });
      this.obstacles.push({ x: x + castleHalf, y: 0, z: z + bx, radius: wd * 1.1 });
      if (Math.abs(bx) >= gateWidth / 2) {
        this.obstacles.push({ x: x + bx, y: 0, z: z + castleHalf, radius: wd * 1.1 });
      }
    }
    
    // Central Keep collider
    this.obstacles.push({ x, y: 0, z, radius: Math.max(keepSize.x, keepSize.z) * 0.85 });
  }

  private buildHedgeMaze(x: number, z: number): void {
    const maze = new THREE.Group();
    maze.position.set(x, 0, z);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.9 });

    // Simple procedural block walls representing hedges
    const wallConfigs = [
      { px: 0, pz: 0, w: 12, h: 2, d: 2 },
      { px: -5, pz: 5, w: 2, h: 2, d: 8 },
      { px: 5, pz: -5, w: 2, h: 2, d: 8 },
      { px: -2, pz: -4, w: 8, h: 2, d: 2 },
      { px: 2, pz: 4, w: 8, h: 2, d: 2 }
    ];

    for (const w of wallConfigs) {
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(w.w, w.h, w.d), leafMat);
      hedge.position.set(w.px, w.h / 2, w.pz);
      maze.add(hedge);
      
      // Map wall as round obstacles for simplification
      const rad = Math.max(w.w, w.d) / 2;
      this.obstacles.push({ x: x + w.px, y: 0, z: z + w.pz, radius: rad });
    }

    this.group.add(maze);
  }

  // ==================== LEVEL 2: OCEAN ====================
  private buildOcean(): void {
    // Arrecife soleado: cielo turquesa arriba, rebote cálido de la arena abajo.
    const hemiLight = new THREE.HemisphereLight(0x59c8e0, 0xbfa678, 1.15);
    this.group.add(hemiLight);

    // Sol cálido casi vertical: es lo que devuelve el color a la arena y a las conchas.
    const sunLight = new THREE.DirectionalLight(0xfff3d6, 1.5);
    sunLight.position.set(20, 90, 10);
    this.group.add(sunLight);

    // Relleno frío desde el otro lado para que las sombras no se cierren del todo.
    const fill = new THREE.DirectionalLight(0x8fd8ef, 0.45);
    fill.position.set(-40, 60, 30);
    this.group.add(fill);

    // Niebla turquesa (antes azul marino): el fondo se aclara y el agua se siente soleada.
    this.scene.fog = new THREE.FogExp2(new THREE.Color(0x2c86a3).getHex(), 0.0065);
    this.scene.background = new THREE.Color(0x2c86a3);

    // Atlántida de Blender, posada en la arena en el centro del mapa
    this.buildAtlantis(0, -50, 0);

    // Sand basin: flat around Atlantis, rising into a rim at the arena edge (the
    // world boundary). Extends past the arena so the rim fades into the fog.
    const floorSize = this.arenaSize + 160;
    const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize, 96, 96);
    floorGeo.rotateX(-Math.PI / 2);
    const fp = floorGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < fp.count; i++) {
      fp.setY(i, LevelEnvironment.oceanFloorHeight(fp.getX(i), fp.getZ(i), this.arenaSize));
    }
    floorGeo.computeVertexNormals();
    // Per-vertex tint: soft patches of lighter/darker sand, cooler and darker up the rim
    const floorColors = new Float32Array(fp.count * 3);
    const tint = new THREE.Color();
    const half = this.arenaSize / 2;
    for (let i = 0; i < fp.count; i++) {
      const x = fp.getX(i), z = fp.getZ(i);
      const patch = 0.9 + Math.sin(x * 0.07 + Math.cos(z * 0.05) * 2.0) * Math.cos(z * 0.06) * 0.1;
      const d = Math.pow(Math.pow(Math.abs(x), 6) + Math.pow(Math.abs(z), 6), 1 / 6);
      const rim = THREE.MathUtils.clamp((d - (half - 25)) / 35, 0, 1);
      tint.setRGB(patch, patch, patch).lerp(new THREE.Color(0.62, 0.66, 0.68), rim * 0.6);
      floorColors.set([tint.r, tint.g, tint.b], i * 3);
    }
    floorGeo.setAttribute("color", new THREE.BufferAttribute(floorColors, 3));
    // Las cáusticas van como emisión: dos capas de la misma red luminosa que se arrastran
    // en direcciones distintas, que es lo que da la sensación de agua en movimiento.
    this.causticMap = this.generateCausticTexture();
    this.causticMap2 = this.generateCausticTexture();
    this.causticMap.repeat.set(floorSize / 26, floorSize / 26);   // red fina
    this.causticMap2.repeat.set(floorSize / 44, floorSize / 44);  // red más abierta encima
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.generateSandTexture(floorSize),
      vertexColors: true,
      roughness: 1.0,
      emissive: new THREE.Color(0xfff0cf),
      emissiveIntensity: 0.38,
      emissiveMap: this.causticMap,
    });
    this.group.add(new THREE.Mesh(floorGeo, floorMat));

    // Segunda capa de cáusticas, aditiva y con otra escala y deriva: al cruzarse con la
    // primera, la luz del suelo nunca repite el mismo dibujo.
    const causticLayer = new THREE.Mesh(floorGeo, new THREE.MeshBasicMaterial({
      map: this.causticMap2, color: 0xfff3d6, transparent: true, opacity: 0.18,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    causticLayer.position.y = 0.05; // justo encima de la arena, sin pelear por el z-buffer
    causticLayer.renderOrder = 1;
    this.group.add(causticLayer);

    this.spawnSunShafts();
    this.spawnWaterSurface();

    this.sowReef();

    // Tortugas marinas (sustituyen a los 8 calamares de primitivas)
    for (let i = 0; i < 4; i++) {
      this.spawnTurtle(i);
    }

    // Whale
    this.spawnWhale();

    // Crabs scuttling on the floor
    this.spawnCrabs();

    // Bubble particles ascending
    for (let i = 0; i < 60; i++) {
      this.spawnBubble();
    }
  }

  // Siembra del arrecife: corales y anémonas por el llano, rocas y algas también en la
  // ladera del borde, que hasta ahora estaba pelada. Un InstancedMesh por variante.
  private sowReef(): void {
    const half = this.arenaSize / 2;
    const placements: ReefPlacement[] = [];
    const corals: ReefPart[] = ["coral_branch", "coral_brain", "coral_cup", "coral_table"];
    const rocks: ReefPart[] = ["rock_a", "rock_b", "rock_c"];

    const put = (part: ReefPart, x: number, z: number, scale: number, sink = 0.2) => {
      placements.push({
        part, x, z,
        y: this.getFloorHeight(x, z) - sink,
        scale,
        rotation: Math.random() * Math.PI * 2,
      });
    };

    // Llano: se respeta la huella de Atlántida. La plataforma de Astra mide 47.4 u de radio; se
    // deja un margen para que los corales no nazcan pegados a la escalinata.
    const ATLANTIS_CLEARING = 53;
    const scatter = (count: number, pick: () => ReefPart, minScale: number, maxScale: number) => {
      for (let placed = 0, tries = 0; placed < count && tries < count * 6; tries++) {
        const x = (Math.random() - 0.5) * (this.arenaSize - 40);
        const z = (Math.random() - 0.5) * (this.arenaSize - 40);
        if (Math.hypot(x, z) < ATLANTIS_CLEARING) continue;
        placed++;
        put(pick(), x, z, minScale + Math.random() * (maxScale - minScale));
      }
    };
    scatter(46, () => corals[Math.floor(Math.random() * corals.length)], 0.8, 2.1);
    scatter(34, () => rocks[Math.floor(Math.random() * rocks.length)], 0.7, 2.0);
    scatter(30, () => "kelp", 0.9, 1.9);
    scatter(18, () => "anemone", 0.9, 1.8);

    // Cinturón del borde: la ladera se viste de rocas grandes, algas y algún coral.
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = half - 28 + Math.random() * 34;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const roll = Math.random();
      const part: ReefPart = roll < 0.5 ? rocks[Math.floor(Math.random() * rocks.length)]
        : roll < 0.8 ? "kelp"
        : corals[Math.floor(Math.random() * corals.length)];
      put(part, x, z, part.startsWith("rock") ? 1.4 + Math.random() * 2.6 : 1.0 + Math.random() * 1.4, 0.6);
    }

    preloadBlenderReef().then(() => {
      // El nivel pudo descargarse mientras llegaba el JSON.
      if (!this.group.parent) return;
      this.reef = buildReefField(placements);
      this.group.add(this.reef.group);
    }).catch((error: unknown) => console.error("Arrecife de Blender:", error));
  }

  private spawnCrabs(): void {
    const spots = [[-65, -75], [75, -50], [-80, 55], [45, -90]];
    for (const s of spots) this.spawnCrab(s[0], s[1]);
  }

  // Cangrejo de Blender (art/blender/cangrejo/, Astra): camina de lado alrededor de su rincón.
  private spawnCrab(x: number, z: number): void {
    const root = new THREE.Group();
    root.position.set(x, this.getFloorHeight(x, z), z);
    this.group.add(root);

    const meta: {
      center: THREE.Vector3; angle: number; radius: number; speed: number; crab?: BlenderCrab;
    } = {
      center: root.position.clone(),
      angle: Math.random() * Math.PI * 2,
      radius: 12 + Math.random() * 16,
      speed: 0.12 + Math.random() * 0.14,
    };
    this.animatedMeshes.push({ mesh: root, type: "crab", meta });

    preloadBlenderCrab().then(() => {
      if (!this.group.parent) return; // el nivel pudo descargarse mientras llegaba el JSON
      const crab = buildBlenderCrab();
      root.add(crab.root);
      meta.crab = crab;
    }).catch((error: unknown) => console.error("Cangrejo de Blender:", error));
  }

  private updateCrab(mesh: THREE.Object3D, meta: any, delta: number, time: number): void {
    const half = this.arenaSize / 2 - 20;
    meta.angle += meta.speed * delta;
    const tx = Math.max(-half, Math.min(half, meta.center.x + Math.cos(meta.angle) * meta.radius));
    const tz = Math.max(-half, Math.min(half, meta.center.z + Math.sin(meta.angle) * meta.radius));
    const prevX = mesh.position.x, prevZ = mesh.position.z;
    mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, tx, 2.5 * delta);
    mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, tz, 2.5 * delta);
    // Las patas apoyan en y = 0 del modelo: se sigue la arena por donde pisa.
    mesh.position.y = this.getFloorHeight(mesh.position.x, mesh.position.z);

    // Camina de lado: su eje X (el de marcha) se alinea con la dirección de avance.
    const dx = mesh.position.x - prevX, dz = mesh.position.z - prevZ;
    const step = Math.hypot(dx, dz);
    if (step > 0.0005) {
      const target = Math.atan2(-dz, dx);
      // Giro por el camino corto: sin la vuelta completa que daba el lerp de ángulos crudo.
      let turn = target - mesh.rotation.y;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      mesh.rotation.y += turn * Math.min(1, 2.5 * delta);
    }
    // Cuánto camina (0..1) según la velocidad real, para acompasar el paso de las patas.
    const walk = Math.min(1, (step / Math.max(delta, 0.0001)) / 1.5);
    meta.crab?.update(delta, time, walk);
  }

  // Atlántida hundida (art/blender/atlantida/, Astra). Los colisionadores vienen del propio
  // modelo (meta.colliders), así que si Astra cambia la planta no hay que tocar este código.
  private buildAtlantis(x: number, y: number, z: number): void {
    preloadBlenderAtlantis().then(() => {
      if (!this.group.parent) return; // el nivel pudo descargarse mientras llegaba el JSON
      const atlantis = buildBlenderAtlantis();
      atlantis.root.position.set(x, y, z);
      this.group.add(atlantis.root);
      this.atlantis = atlantis;
      this.altarCrystal = atlantis.crystal; // update() ya lo gira: y = t·0.5, x = sin(t·0.3)·0.2

      for (const c of atlantis.colliders) {
        this.obstacles.push({ x: x + c.x, y: y + c.base, z: z + c.z, radius: c.radius, height: c.height });
      }
    }).catch((error: unknown) => console.error("Atlántida de Blender:", error));
  }

  private spawnTurtle(index: number): void {
    const pivot = new THREE.Group();
    const scale = 0.9 + Math.random() * 0.5;
    pivot.scale.setScalar(scale);
    const radius = 35 + Math.random() * 50;
    const angle = (index / 4) * Math.PI * 2 + Math.random() * 0.6;
    const centerY = -30 + Math.random() * 30;
    pivot.position.set(Math.cos(angle) * radius, centerY, Math.sin(angle) * radius);
    this.group.add(pivot);

    const obsRef = { x: pivot.position.x, y: pivot.position.y, z: pivot.position.z, radius: 2.5 * scale };
    this.obstacles.push(obsRef);

    const meta: {
      angle: number; radius: number; centerY: number; speed: number; offset: number;
      obsRef: typeof obsRef; turtle?: BlenderTurtle;
    } = {
      angle,
      radius,
      centerY,
      speed: 0.05 + Math.random() * 0.06, // vuelta completa en 1.5–2 min
      offset: Math.random() * Math.PI * 2,
      obsRef,
    };
    this.animatedMeshes.push({ mesh: pivot, type: "turtle", meta });

    preloadBlenderTurtle().then(() => {
      if (!this.group.parent) return; // el nivel pudo descargarse mientras llegaba el JSON
      const turtle = buildBlenderTurtle();
      pivot.add(turtle.root);
      meta.turtle = turtle;
    }).catch((error: unknown) => console.error("Tortuga de Blender:", error));
  }

  private spawnWhale(): void {
    const pivot = new THREE.Group();
    pivot.position.set(60, -10, 60);
    this.group.add(pivot);

    const obsRef = { x: pivot.position.x, y: pivot.position.y, z: pivot.position.z, radius: 12.5 };
    this.obstacles.push(obsRef);

    const meta: { swimAngle: number; obsRef: typeof obsRef; lastBubbleTime: number; whale?: BlenderWhale } = {
      swimAngle: Math.random() * Math.PI * 2,
      obsRef,
      lastBubbleTime: 0,
    };
    this.animatedMeshes.push({ mesh: pivot, type: "whale", meta });

    preloadBlenderWhale().then(() => {
      if (!this.group.parent) return; // el nivel pudo descargarse mientras llegaba el JSON
      const whale = buildBlenderWhale();
      pivot.add(whale.root);
      meta.whale = whale;
    }).catch((error: unknown) => console.error("Ballena de Blender:", error));
  }

  private spawnBlowholeBubble(worldPos: THREE.Vector3): void {
    const scaleVal = 0.4 + Math.random() * 0.8;
    const r = 0.4 * scaleVal;
    
    // Bubble mesh
    const bubbleGeo = new THREE.SphereGeometry(r, 6, 6);
    const bubbleMat = new THREE.MeshBasicMaterial({
      color: 0xe0f7fa,
      opacity: 0.5,
      transparent: true
    });
    const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
    
    // Position with slight dispersion
    bubble.position.set(
      worldPos.x + (Math.random() - 0.5) * 2.0,
      worldPos.y,
      worldPos.z + (Math.random() - 0.5) * 2.0
    );
    
    this.group.add(bubble);

    this.animatedMeshes.push({
      mesh: bubble,
      type: "blowhole_bubble",
      meta: {
        spawnY: worldPos.y,
        speed: 3.5 + Math.random() * 2.5,
        phase: Math.random() * Math.PI * 2
      }
    });
  }

  private spawnBubble(): void {
    const bubbleGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.15, 6, 6);
    const bubbleMat = new THREE.MeshBasicMaterial({
      color: 0xe0f7fa,
      opacity: 0.35,
      transparent: true
    });
    const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
    bubble.position.set(
      (Math.random() - 0.5) * (this.arenaSize - 10),
      -50 + Math.random() * 65,
      (Math.random() - 0.5) * (this.arenaSize - 10)
    );
    this.group.add(bubble);

    this.animatedMeshes.push({
      mesh: bubble,
      type: "bubble",
      meta: {
        speed: 2.0 + Math.random() * 4.0,
        offset: Math.random() * Math.PI * 2
      }
    });
  }

  // ==================== LEVEL 3: COSMOS ====================
  // ==================== LEVEL 3: COSMOS (El Cosmos) ====================
  // Faithful port of Godot Level03_Cosmos.gd — starfield, nebula clusters,
  // ringed planets, tumbling asteroids and periodic shooting stars.
  private buildCosmos(): void {
    const half = this.arenaSize / 2;

    // Black space, dim violet ambient + faint star-light
    this.scene.fog = null;
    this.scene.background = new THREE.Color(0x000000);
    const ambient = new THREE.HemisphereLight(new THREE.Color(0.20, 0.12, 0.40), new THREE.Color(0.02, 0.02, 0.08), 0.45);
    this.group.add(ambient);
    const sun = new THREE.DirectionalLight(new THREE.Color(0.7, 0.6, 1.0), 0.5);
    sun.position.set(100, 100, -100);
    this.group.add(sun);

    // Starfield as a single Points cloud (1 draw call instead of 500 meshes)
    const starCount = 600;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const palette = [[1, 1, 1], [0.8, 0.9, 1], [1, 0.95, 0.7], [1, 0.8, 0.5], [0.7, 0.8, 1]];
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const dist = 80 + Math.random() * (half - 90);
      positions[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = dist * Math.cos(phi);
      const c = palette[(Math.random() * palette.length) | 0];
      colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    // Soft round sprite so stars render as dots, not squares
    const dotCanvas = document.createElement("canvas");
    dotCanvas.width = dotCanvas.height = 32;
    const dctx = dotCanvas.getContext("2d")!;
    const grad = dctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.45, "rgba(255,255,255,0.85)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    dctx.fillStyle = grad;
    dctx.beginPath(); dctx.arc(16, 16, 16, 0, Math.PI * 2); dctx.fill();
    const dotTex = new THREE.CanvasTexture(dotCanvas);
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      size: 2.4, sizeAttenuation: true, vertexColors: true, map: dotTex,
      transparent: true, depthWrite: false, alphaTest: 0.02
    }));
    this.group.add(stars);

    // Nebula clusters (3-5 huge translucent emissive blobs each)
    const nebulae = [
      { p: [80, 30, 60], c: [0.6, 0.1, 0.8], s: 45 },
      { p: [-90, -20, 80], c: [0.1, 0.3, 0.8], s: 55 },
      { p: [40, 60, -100], c: [0.8, 0.2, 0.4], s: 40 },
      { p: [-70, 40, -60], c: [0.2, 0.6, 0.9], s: 50 },
      { p: [110, -40, -80], c: [0.5, 0.1, 0.7], s: 60 }
    ];
    for (const n of nebulae) {
      const g = new THREE.Group(); g.position.set(n.p[0], n.p[1], n.p[2]);
      const col = new THREE.Color(n.c[0], n.c[1], n.c[2]);
      const count = 3 + ((Math.random() * 3) | 0);
      for (let j = 0; j < count; j++) {
        const s = n.s * (0.5 + Math.random() * 0.5);
        const cloud = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6),
          new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.04 + Math.random() * 0.05, side: THREE.DoubleSide, depthWrite: false }));
        cloud.position.set((Math.random() - 0.5) * n.s * 0.6, (Math.random() - 0.5) * n.s * 0.4, (Math.random() - 0.5) * n.s * 0.6);
        g.add(cloud);
      }
      this.group.add(g);
    }

    // Planets (Mars-ish, Neptune-ish, Jupiter-ish), two with rings
    const planets = [
      { p: [250, -40, 180], r: 20, c: [0.7, 0.4, 0.2], ring: [0.6, 0.5, 0.3] },
      { p: [-260, 60, -200], r: 14, c: [0.3, 0.5, 0.8], ring: null },
      { p: [180, 90, -270], r: 18, c: [0.85, 0.7, 0.4], ring: [0.7, 0.6, 0.3] }
    ];
    for (const pl of planets) {
      const col = new THREE.Color(pl.c[0], pl.c[1], pl.c[2]);
      const planet = new THREE.Mesh(new THREE.SphereGeometry(pl.r, 20, 14),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, emissive: col.clone().multiplyScalar(0.4), emissiveIntensity: 0.12 }));
      planet.position.set(pl.p[0], pl.p[1], pl.p[2]);
      this.group.add(planet);
      if (pl.ring) {
        const rc = new THREE.Color(pl.ring[0], pl.ring[1], pl.ring[2]);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(pl.r * 1.65, pl.r * 0.35, 2, 40),
          new THREE.MeshBasicMaterial({ color: rc, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
        ring.position.set(pl.p[0], pl.p[1], pl.p[2]);
        ring.rotation.x = Math.PI / 2 - 0.4; // tilted Saturn ring
        this.group.add(ring);
      }
    }

    // Tumbling asteroids
    const rockTints = [0x252528, 0x282422, 0x222826, 0x2a2620];
    for (let i = 0; i < 40; i++) {
      const ax = (Math.random() - 0.5) * (this.arenaSize - 60);
      const ay = (Math.random() - 0.5) * 350;
      const az = (Math.random() - 0.5) * (this.arenaSize - 60);
      if (Math.hypot(ax, ay, az) < 35) continue; // keep spawn clear
      const radius = 2.0 + Math.random() * 6.5;
      const asteroid = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 1),
        new THREE.MeshStandardMaterial({ color: rockTints[(Math.random() * rockTints.length) | 0], roughness: 0.95, metalness: 0.1 }));
      asteroid.position.set(ax, ay, az);
      asteroid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.group.add(asteroid);
      this.obstacles.push({ x: ax, y: ay, z: az, radius });
      this.animatedMeshes.push({
        mesh: asteroid, type: "asteroid",
        meta: { rotX: (Math.random() - 0.5) * 0.4, rotY: (Math.random() - 0.5) * 0.6 }
      });
    }
  }

  private spawnShootingStar(half: number): void {
    const dir = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 0.5 - 0.4, Math.random() * 2 - 1).normalize();
    const speed = 180 + Math.random() * 100;
    const origin = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
      .normalize().multiplyScalar(Math.min(half - 30, 150 + Math.random() * 130));
    const trailLen = 18 + Math.random() * 17;
    const pal = [[1, 1, 1], [0.8, 0.9, 1], [1, 0.98, 0.7], [0.7, 0.9, 1]];
    const c = pal[(Math.random() * pal.length) | 0];
    const star = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, trailLen, 5),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0], c[1], c[2]), transparent: true, opacity: 1, depthWrite: false }));
    star.position.copy(origin);
    star.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); // align trail with travel
    this.group.add(star);
    this.animatedMeshes.push({
      mesh: star, type: "shooting_star",
      meta: { dir, speed, age: 0, lifetime: 1.5 + Math.random() * 1.3, dead: false }
    });
  }

  // ==================== LEVEL 4: SWAMP ====================
  // ==================== LEVEL 4: SWAMP (El Pantano) ====================
  // Faithful port of Godot Level04_Swamp.gd — moody mangrove swamp with water
  // patches, lily pads, reeds, fireflies, bushes, ripples and wandering spiders.
  private buildSwamp(): void {
    const HALF = this.arenaSize / 2; // 140 when arenaSize = 280

    // Moody, dim green environment (matches Level04_Swamp.tscn — kept dark so the
    // fireflies, glowing water, wisp and crocodile eyes pop against the murk)
    const hemi = new THREE.HemisphereLight(new THREE.Color(0.10, 0.22, 0.08), new THREE.Color(0.03, 0.05, 0.02), 0.22);
    this.group.add(hemi);
    const sun = new THREE.DirectionalLight(new THREE.Color(0.45, 0.72, 0.38), 0.38);
    sun.position.set(-40, 60, 40);
    this.group.add(sun);

    this.scene.background = new THREE.Color(0.025, 0.05, 0.02);
    this.scene.fog = new THREE.FogExp2(new THREE.Color(0.07, 0.14, 0.05).getHex(), 0.013);

    // Muddy ground (darker so distant trees fade into the murk)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(this.arenaSize, this.arenaSize),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(0.12, 0.15, 0.07), roughness: 0.97 })
    );
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; this.group.add(ground);

    this.spawnWaterPatches(HALF);
    this.spawnMangroves(HALF, 120);
    this.spawnMossRocks(HALF);
    this.spawnLilyPads(HALF);
    this.spawnReeds(HALF);
    this.spawnSwampFireflies(HALF);
    this.spawnSwampBushes(HALF, 70);
    this.spawnSwampArch(HALF);
    this.spawnBoundarySwampTrees(HALF);
    this.spawnSpiders(HALF);
  }

  private spawnWaterPatches(half: number): void {
    for (let i = 0; i < 15; i++) {
      const r = 5 + Math.random() * 17;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.06, 0.22, 0.10), transparent: true, opacity: 0.72, roughness: 0.1,
        emissive: new THREE.Color(0.04, 0.14, 0.06), emissiveIntensity: 0.5, depthWrite: false
      });
      const water = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.06, 18), mat);
      water.position.set((Math.random() * 2 - 1) * (half - 8), 0.02, (Math.random() * 2 - 1) * (half - 8));
      this.group.add(water);
    }
  }

  private spawnMangroves(half: number, count: number): void {
    const trunkMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.18, 0.14, 0.08), roughness: 0.95 });
    const rootMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.16, 0.12, 0.06), roughness: 0.95 });
    const leafDark = new THREE.Color(0.08, 0.32, 0.06), leafLight = new THREE.Color(0.22, 0.52, 0.12);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() * 2 - 1) * (half - 4);
      const z = (Math.random() * 2 - 1) * (half - 4);
      if (Math.hypot(x, z) < 12) continue;
      const tree = new THREE.Group(); tree.position.set(x, 0, z);

      const height = 4 + Math.random() * 7;
      const tr = 0.18 + Math.random() * 0.30;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(tr * 0.55, tr, height, 8), trunkMat);
      trunk.position.y = height * 0.5; tree.add(trunk);

      // Aerial roots
      const roots = 2 + ((Math.random() * 2) | 0);
      for (let r = 0; r < roots; r++) {
        const rh = 1.5 + Math.random() * 1.5;
        const root = new THREE.Mesh(new THREE.CylinderGeometry(tr * 0.2, tr * 0.12, rh, 6), rootMat);
        const ang = (Math.PI * 2 / roots) * r + (Math.random() - 0.5) * 0.6;
        const spread = 0.6 + Math.random() * 0.8;
        root.position.set(Math.cos(ang) * spread, 1.2, Math.sin(ang) * spread);
        root.rotation.z = Math.cos(ang) * 0.5; root.rotation.x = Math.sin(ang) * 0.5;
        tree.add(root);
      }

      // Canopy (2 tall spheres, faintly emissive)
      for (let c = 0; c < 2; c++) {
        const cr = 1.8 + Math.random() * 1.7;
        const col = leafDark.clone().lerp(leafLight, Math.random());
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(cr, 12, 9),
          new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, emissive: col, emissiveIntensity: 0.08 }));
        canopy.scale.y = (1.2 + Math.random() * 0.6) * 0.5; // Godot height = cr*1.2..1.8 → rounded, slightly flat
        canopy.position.set((Math.random() - 0.5) * 2.4, height + cr * 0.5 + (Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 2.4);
        tree.add(canopy);
      }

      this.group.add(tree);
      this.obstacles.push({ x, y: 0, z, radius: tr * 1.6 });
    }
  }

  private spawnMossRocks(half: number): void {
    const rockColor = new THREE.Color(0.22, 0.28, 0.14);
    const mossColor = new THREE.Color(0.18, 0.50, 0.10);
    for (let i = 0; i < 20; i++) {
      const x = (Math.random() * 2 - 1) * (half - 3);
      const z = (Math.random() * 2 - 1) * (half - 3);
      if (Math.hypot(x, z) < 14) continue; // keep the spawn area clear
      const rs = 0.35 + Math.random() * 1.05;
      const root = new THREE.Group(); root.position.set(x, 0, z);

      const rock = new THREE.Mesh(new THREE.SphereGeometry(rs, 10, 7),
        new THREE.MeshStandardMaterial({ color: rockColor, roughness: 0.92 }));
      const hfac = 0.55 + Math.random() * 0.35; // vertical squash (Godot height = rs*hfac)
      rock.scale.set(0.7 + Math.random() * 0.6, hfac * 0.5, 0.7 + Math.random() * 0.6);
      rock.position.y = rs * 0.35;
      root.add(rock);

      const moss = new THREE.Mesh(new THREE.SphereGeometry(rs * 0.85, 10, 6),
        new THREE.MeshStandardMaterial({ color: mossColor, roughness: 0.88, emissive: mossColor, emissiveIntensity: 0.06 }));
      moss.scale.y = 0.5 / 0.85;
      moss.position.y = rs * 0.65;
      root.add(moss);

      this.group.add(root);
      this.obstacles.push({ x, y: 0, z, radius: rs * 0.9 });
    }
  }

  private spawnLilyPads(half: number): void {
    const padMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.18, 0.52, 0.14), roughness: 0.7 });
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() * 2 - 1) * (half - 5);
      const z = (Math.random() * 2 - 1) * (half - 5);
      const pr = 0.4 + Math.random() * 0.8;
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, 0.04, 16), padMat);
      pad.position.set(x, 0.04, z); this.group.add(pad);
      if (Math.random() > 0.6) {
        const fcol = Math.random() > 0.5 ? new THREE.Color(0.9, 0.85, 0.55) : new THREE.Color(0.95, 0.55, 0.75);
        const flower = new THREE.Mesh(new THREE.SphereGeometry(pr * 0.28, 10, 7),
          new THREE.MeshStandardMaterial({ color: fcol, emissive: fcol, emissiveIntensity: 0.45 }));
        flower.scale.y = 0.55 / 0.28 * 0.5; flower.position.set(x, 0.12, z); this.group.add(flower);
      }
    }
  }

  private spawnReeds(half: number): void {
    const reedMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.32, 0.55, 0.12), roughness: 0.85 });
    const tipMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.38, 0.24, 0.06), roughness: 0.9 });
    for (let i = 0; i < 80; i++) {
      const x = (Math.random() * 2 - 1) * (half - 2);
      const z = (Math.random() * 2 - 1) * (half - 2);
      const h = 1.2 + Math.random() * 2.3;
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, h, 6), reedMat);
      reed.position.set(x, h * 0.5, z);
      reed.rotation.z = (Math.random() - 0.5) * 0.16; reed.rotation.x = (Math.random() - 0.5) * 0.12;
      this.group.add(reed);
      if (Math.random() > 0.5) {
        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.06, 0.3, 8), tipMat);
        tip.position.set(x, h + 0.12, z); this.group.add(tip);
      }
    }
  }

  private spawnSwampFireflies(half: number): void {
    for (let i = 0; i < 25; i++) {
      const col = Math.random() > 0.3 ? new THREE.Color(0.55, 1.0, 0.28) : new THREE.Color(0.85, 1.0, 0.12);
      const fly = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95 }));
      const base = new THREE.Vector3(
        (Math.random() * 2 - 1) * (half - 5), 0.5 + Math.random() * 3.5, (Math.random() * 2 - 1) * (half - 5)
      );
      fly.position.copy(base); this.group.add(fly);
      this.animatedMeshes.push({ mesh: fly, type: "firefly", meta: { base: base.clone(), off: Math.random() * Math.PI * 2 } });
    }
  }

  private spawnSwampBushes(half: number, count: number): void {
    const leafColors = [
      new THREE.Color(0.08, 0.30, 0.05), new THREE.Color(0.12, 0.38, 0.08),
      new THREE.Color(0.06, 0.25, 0.04), new THREE.Color(0.20, 0.45, 0.10)
    ];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() * 2 - 1) * (half - 10);
      const z = (Math.random() * 2 - 1) * (half - 10);
      if (Math.hypot(x, z) < 18) continue;
      const bush = new THREE.Group(); bush.position.set(x, 0, z);
      const blobs = 2 + ((Math.random() * 3) | 0);
      for (let s = 0; s < blobs; s++) {
        const br = 2.2 + Math.random() * 2.3;
        const col = leafColors[(Math.random() * leafColors.length) | 0].clone().multiplyScalar(0.85 + Math.random() * 0.15);
        const blob = new THREE.Mesh(new THREE.SphereGeometry(br, 12, 8),
          new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, emissive: col, emissiveIntensity: 0.05 }));
        blob.scale.y = (1.5 + Math.random() * 0.7) * 0.5; // Godot height = br*1.5..2.2 → rounded mound
        blob.position.set((Math.random() - 0.5) * 4, br * (0.5 + Math.random() * 0.35), (Math.random() - 0.5) * 4);
        bush.add(blob);
      }
      this.group.add(bush);
      this.obstacles.push({ x, y: 0, z, radius: 3.0 });
    }
  }

  private spawnSwampArch(half: number): void {
    // Stone arch over the swamp portal (the portal itself is the level gate)
    const px = half - 20, pz = half - 20;
    const arch = new THREE.Mesh(new THREE.BoxGeometry(10, 0.8, 2),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(0.14, 0.12, 0.06), roughness: 0.95 }));
    arch.position.set(px, 6.5, pz); this.group.add(arch);
  }

  private spawnBoundarySwampTrees(half: number): void {
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.10, 0.20, 0.05), roughness: 0.95 });
    for (let side = 0; side < 4; side++) {
      for (let j = 0; j < 14; j++) {
        let x = 0, z = 0;
        const r = () => (Math.random() * 2 - 1) * half;
        const jitter = () => (Math.random() - 0.5) * 6;
        if (side === 0) { x = r(); z = -half + jitter(); }
        else if (side === 1) { x = r(); z = half + jitter(); }
        else if (side === 2) { x = -half + jitter(); z = r(); }
        else { x = half + jitter(); z = r(); }
        const h = 7 + Math.random() * 7;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, h, 7), mat);
        trunk.position.set(x, h * 0.5, z); this.group.add(trunk);
        this.obstacles.push({ x, y: 0, z, radius: 0.6 });
      }
    }
  }

  private spawnSpiders(half: number): void {
    const spots = [
      [15, 20, 1.10], [-20, -14, 0.90], [-100, -88, 1.0], [-42, -82, 1.20], [32, -98, 0.85], [92, -72, 1.15],
      [-72, -125, 0.95], [58, -118, 1.05], [-112, -28, 1.10], [-88, 22, 0.80], [88, -18, 1.0], [102, 32, 1.20],
      [-58, 82, 1.15], [32, 72, 0.85]
    ];
    const scale = half / 140; // keep proportions if arena differs
    for (const s of spots) {
      this.spawnSpider(s[0] * scale, s[2], s[1] * scale);
    }
  }

  private spawnSpider(x: number, sc: number, z: number): void {
    const root = new THREE.Group();
    root.position.set(x, 0, z); root.scale.setScalar(sc);
    const chitin = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.052, 0.038, 0.036), roughness: 0.84, metalness: 0.08 });
    const legMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.072, 0.052, 0.048), roughness: 0.9 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.7, 0.0) });

    const ab = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), chitin);
    ab.scale.set(1.0, 0.6, 1.52); ab.position.set(0, 0.38, 0.17); root.add(ab);
    const ceph = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 8), chitin);
    ceph.scale.set(0.94, 0.74, 0.96); ceph.position.set(0, 0.39, -0.33); root.add(ceph);
    const waist = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), chitin);
    waist.position.set(0, 0.38, -0.05); root.add(waist);

    const eyeCfg = [[0.098, 0.51, -0.50, 0.046], [-0.098, 0.51, -0.50, 0.046], [0.052, 0.525, -0.535, 0.030], [-0.052, 0.525, -0.535, 0.030]];
    for (const e of eyeCfg) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(e[3], 8, 6), eyeMat);
      eye.position.set(e[0], e[1], e[2]); root.add(eye);
    }

    // 8 legs (femur + tibia), pivots stored for the gait
    const legs: any[] = [];
    const zOff = [-0.22, -0.07, 0.07, 0.20];
    for (let i = 0; i < 4; i++) {
      for (const side of [-1, 1]) {
        const socket = new THREE.Group();
        socket.position.set(side * 0.27, 0.34, zOff[i]); root.add(socket);
        const fp = new THREE.Group();
        fp.rotation.z = side * THREE.MathUtils.degToRad(52); fp.rotation.x = (i - 1.5) * 0.28 * side;
        socket.add(fp);
        const femurLen = 0.46;
        const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.038, femurLen, 6), legMat);
        femur.position.y = -femurLen * 0.5; fp.add(femur);
        const tp = new THREE.Group();
        tp.position.y = -femurLen; tp.rotation.z = side * THREE.MathUtils.degToRad(-80); fp.add(tp);
        const tibiaLen = 0.60;
        const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.007, tibiaLen, 5), legMat);
        tibia.position.y = -tibiaLen * 0.5; tp.add(tibia);
        legs.push({ fp, baseRx: fp.rotation.x, baseRz: fp.rotation.z, side, idx: i });
      }
    }

    this.group.add(root);
    this.animatedMeshes.push({
      mesh: root, type: "spider",
      meta: {
        home: root.position.clone(), target: root.position.clone(), moving: false,
        wanderT: 0.3 + Math.random() * 4.7, animT: Math.random() * Math.PI * 2, body: ab, legs
      }
    });
  }

  private updateSpider(mesh: THREE.Object3D, meta: any, delta: number): void {
    const SPEED = 1.8, WANDER = 32;
    // Wander
    meta.wanderT -= delta;
    if (meta.wanderT <= 0) {
      meta.moving = !meta.moving;
      if (meta.moving) {
        meta.wanderT = 4 + Math.random() * 5;
        const ang = Math.random() * Math.PI * 2;
        const dist = 8 + Math.random() * (WANDER - 8);
        meta.target = meta.home.clone().add(new THREE.Vector3(Math.cos(ang) * dist, 0, Math.sin(ang) * dist));
      } else {
        meta.wanderT = 1.5 + Math.random() * 4;
      }
    }
    if (meta.moving) {
      const to = meta.target.clone().sub(mesh.position); to.y = 0;
      if (to.length() < 0.7) meta.moving = false;
      else {
        mesh.position.addScaledVector(to.normalize(), SPEED * delta);
        const want = Math.atan2(to.x, to.z) + Math.PI;
        mesh.rotation.y = want; // snap-ish; spiders turn quickly
      }
    }
    // Gait
    meta.animT += delta * (meta.moving ? 9.5 : 1.3);
    for (const leg of meta.legs) {
      const phase = (leg.idx % 2) * Math.PI + (leg.side < 0 ? 0 : Math.PI * 0.5);
      const wave = Math.sin(meta.animT + phase);
      const lift = Math.max(0, Math.cos(meta.animT + phase));
      if (meta.moving) {
        leg.fp.rotation.x = leg.baseRx + wave * 0.42;
        leg.fp.rotation.z = leg.baseRz - lift * 0.08 * Math.sign(leg.side);
      } else {
        leg.fp.rotation.x = THREE.MathUtils.lerp(leg.fp.rotation.x, leg.baseRx, 2.5 * delta);
        leg.fp.rotation.z = THREE.MathUtils.lerp(leg.fp.rotation.z, leg.baseRz, 3.0 * delta);
      }
    }
    if (meta.body) meta.body.position.y = 0.38 + (meta.moving ? Math.abs(Math.sin(meta.animT)) * 0.024 : Math.sin(meta.animT * 0.7) * 0.006);
  }

  private spawnRipple(half: number): void {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.85, 0.55), transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const ripple = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 6, 24), mat);
    ripple.rotation.x = -Math.PI / 2; // lie flat on the water
    ripple.position.set((Math.random() * 2 - 1) * (half - 5), 0.05, (Math.random() * 2 - 1) * (half - 5));
    this.group.add(ripple);
    this.animatedMeshes.push({
      mesh: ripple, type: "ripple",
      meta: { age: 0, maxAge: 1.5 + Math.random() * 2.0, maxR: 3 + Math.random() * 6, dead: false }
    });
  }

  // ==================== LEVEL 5: CLOUDS (Las Nubes) ====================
  // Faithful port of Godot Level05_Clouds.gd — pastel sky, volumetric clouds,
  // distant rainbows, floating islands with glowing flowers, sparkles, kites & birds.
  private buildClouds(): void {
    const HALF = this.arenaSize / 2; // 200 when arenaSize = 400

    // Pastel sky + ambient lavender + ethereal fog
    const hemi = new THREE.HemisphereLight(
      new THREE.Color(0.92, 0.88, 0.98), new THREE.Color(0.84, 0.88, 0.96), 1.0
    );
    this.group.add(hemi);

    const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.93, 0.88), 1.3);
    sun.position.set(60, 110, 90); // warm sun from above (Godot -42°/28°)
    this.group.add(sun);

    this.scene.background = new THREE.Color(0.72, 0.85, 0.96);
    this.scene.fog = new THREE.FogExp2(new THREE.Color(0.84, 0.88, 0.96).getHex(), 0.0018);

    this.spawnSkyClouds(HALF);
    this.spawnBigFeatureClouds(HALF);
    this.spawnRainbowArcs();
    this.spawnSkyIslands();
    this.spawnSparkles(HALF);
    this.spawnKites();
    this.spawnSkyBirds();
  }

  private spawnSkyClouds(half: number): void {
    const palette = [
      new THREE.Color(1.0, 0.97, 0.99), new THREE.Color(0.96, 0.93, 1.0),
      new THREE.Color(1.0, 0.93, 0.95), new THREE.Color(0.90, 0.96, 1.0),
      new THREE.Color(0.96, 1.0, 0.96)
    ];
    for (let i = 0; i < 90; i++) {
      const cx = (Math.random() * 2 - 1) * (half - 20);
      const cy = -8 + Math.random() * 43; // -8 .. 35
      const cz = (Math.random() * 2 - 1) * (half - 20);
      if (Math.hypot(cx, cz) < 25) continue;

      const root = new THREE.Group();
      root.position.set(cx, cy, cz);
      const base = palette[(Math.random() * palette.length) | 0];

      const blobs = 3 + ((Math.random() * 4) | 0);
      for (let b = 0; b < blobs; b++) {
        const br = 3.5 + Math.random() * 4.5;
        const f = 0.6 + Math.random() * 0.4; // vertical squash
        const col = new THREE.Color(
          base.r + (Math.random() - 0.5) * 0.06,
          base.g + (Math.random() - 0.5) * 0.06,
          base.b + (Math.random() - 0.5) * 0.06
        );
        const mat = new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.95,
          transparent: true,
          opacity: 0.82 + Math.random() * 0.16,
          depthWrite: false,
          emissive: col,
          emissiveIntensity: 0.35 // self-lit so clouds read bright white, not gray
        });
        const blob = new THREE.Mesh(new THREE.SphereGeometry(br, 10, 7), mat);
        blob.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 10);
        blob.scale.set(0.8 + Math.random() * 0.5, (f * 0.5) * (0.55 + Math.random() * 0.3), 0.9 + Math.random() * 0.3);
        root.add(blob);
      }
      this.group.add(root);
      this.animatedMeshes.push({
        mesh: root, type: "sky_cloud",
        meta: { base: root.position.clone(), off: Math.random() * Math.PI * 2, spd: 0.3 + Math.random() * 0.6 }
      });
    }
  }

  private spawnBigFeatureClouds(half: number): void {
    for (let i = 0; i < 20; i++) {
      const cx = (Math.random() * 2 - 1) * (half - 15);
      const cy = 20 + Math.random() * 40;
      const cz = (Math.random() * 2 - 1) * (half - 15);
      const root = new THREE.Group();
      root.position.set(cx, cy, cz);

      const blobs = 4 + ((Math.random() * 5) | 0);
      for (let b = 0; b < blobs; b++) {
        const br = 12 + Math.random() * 16;
        const f = 0.5 + Math.random() * 0.25;
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0.98, 0.95, 1.0),
          roughness: 0.98, transparent: true, opacity: 0.16 + Math.random() * 0.18, depthWrite: false,
          emissive: new THREE.Color(0.95, 0.93, 1.0), emissiveIntensity: 0.25
        });
        const blob = new THREE.Mesh(new THREE.SphereGeometry(br, 10, 7), mat);
        blob.position.set((Math.random() - 0.5) * 24, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 24);
        blob.scale.set(0.7 + Math.random() * 0.7, (f * 0.5) * (0.4 + Math.random() * 0.3), 0.8 + Math.random() * 0.5);
        root.add(blob);
      }
      this.group.add(root);
      this.animatedMeshes.push({
        mesh: root, type: "sky_cloud",
        meta: { base: root.position.clone(), off: Math.random() * Math.PI * 2, spd: 0.08 + Math.random() * 0.17 }
      });
    }
  }

  private spawnRainbowArcs(): void {
    const colors = [
      new THREE.Color(1.0, 0.25, 0.25), new THREE.Color(1.0, 0.65, 0.0), new THREE.Color(1.0, 0.93, 0.0),
      new THREE.Color(0.27, 0.87, 0.27), new THREE.Color(0.27, 0.55, 1.0), new THREE.Color(0.55, 0.18, 0.9)
    ];
    const spots = [
      new THREE.Vector3(-120, 15, -140), new THREE.Vector3(130, 8, -110), new THREE.Vector3(-90, 20, 120)
    ];
    for (const p of spots) {
      const root = new THREE.Group();
      root.position.copy(p);
      root.rotation.y = Math.random() * Math.PI * 2;
      for (let ci = 0; ci < colors.length; ci++) {
        const ro = 18 + ci * 1.8;
        const ringRadius = ro - 0.5; // torus center radius (inner = ro-1)
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(ringRadius, 0.5, 8, 32),
          new THREE.MeshBasicMaterial({ color: colors[ci], transparent: true, opacity: 0.55, side: THREE.DoubleSide })
        );
        root.add(ring); // default torus stands vertical (XY plane)
      }
      this.group.add(root);
    }
  }

  private spawnSkyIslands(): void {
    const spots = [
      new THREE.Vector3(55, -4, 60), new THREE.Vector3(-70, 2, -55), new THREE.Vector3(80, 5, -75),
      new THREE.Vector3(-50, -3, 80), new THREE.Vector3(30, 8, -40)
    ];
    const flowerColors = [
      new THREE.Color(1.0, 0.55, 0.75), new THREE.Color(0.75, 0.55, 1.0), new THREE.Color(0.55, 0.85, 1.0)
    ];
    for (const p of spots) {
      if (Math.hypot(p.x, p.z) < 30) continue;
      const island = new THREE.Group();
      island.position.copy(p);

      const cloudMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.96, 0.93, 1.0), roughness: 0.9 });
      const blobs = 3 + ((Math.random() * 3) | 0);
      for (let b = 0; b < blobs; b++) {
        const br = 3 + Math.random() * 3.5;
        const blob = new THREE.Mesh(new THREE.SphereGeometry(br, 12, 8), cloudMat);
        blob.position.set((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6);
        blob.scale.y = 0.55 * 0.5 * 2; // flattened (height = br*0.55)
        island.add(blob);
      }

      // Glowing magic flower on top
      const fcol = flowerColors[(Math.random() * 3) | 0];
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 6),
        new THREE.MeshStandardMaterial({ color: fcol, emissive: fcol, emissiveIntensity: 0.9, roughness: 0.4 })
      );
      flower.position.y = 2.5;
      island.add(flower);

      this.group.add(island);
      this.animatedMeshes.push({
        mesh: island, type: "sky_island",
        meta: { baseY: p.y, bobOffset: Math.random() * Math.PI * 2 }
      });
    }
  }

  private spawnSparkles(half: number): void {
    const colors = [
      new THREE.Color(1.0, 0.75, 0.9), new THREE.Color(0.75, 0.85, 1.0),
      new THREE.Color(1.0, 1.0, 0.75), new THREE.Color(0.85, 0.75, 1.0)
    ];
    for (let i = 0; i < 40; i++) {
      const pos = new THREE.Vector3(
        (Math.random() * 2 - 1) * (half - 10),
        -5 + Math.random() * 35,
        (Math.random() * 2 - 1) * (half - 10)
      );
      const gr = 0.12 + Math.random() * 0.23;
      const col = colors[(Math.random() * colors.length) | 0];
      const sparkle = new THREE.Mesh(
        new THREE.SphereGeometry(gr, 6, 4),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 })
      );
      sparkle.position.copy(pos);
      this.group.add(sparkle);
      this.animatedMeshes.push({
        mesh: sparkle, type: "sparkle",
        meta: { base: pos.clone(), off: Math.random() * Math.PI * 2, spd: 0.4 + Math.random() * 0.8 }
      });
    }
  }

  private spawnKites(): void {
    const panelPalette = [
      new THREE.Color(1.0, 0.40, 0.60), new THREE.Color(1.0, 0.80, 0.0),
      new THREE.Color(0.40, 0.87, 1.0), new THREE.Color(1.0, 0.53, 0.20)
    ];
    const bowPalette = [
      new THREE.Color(1.0, 0.40, 0.60), new THREE.Color(1.0, 0.80, 0.0), new THREE.Color(0.40, 0.87, 1.0),
      new THREE.Color(1.0, 0.53, 0.20), new THREE.Color(0.80, 0.40, 1.0), new THREE.Color(0.40, 0.90, 0.55)
    ];
    const spots = [
      [-80, 18, -60], [55, 12, -90], [-40, 25, 110], [100, 8, 40], [-120, 20, 20], [30, 30, -140], [-65, 14, -30],
      [90, 22, 80], [-30, 10, 75], [130, 16, -50], [-95, 28, 130], [45, 6, -170], [-150, 18, -80], [70, 32, 150]
    ];
    const TOP = new THREE.Vector3(0, 1.4, 0), RIGHT = new THREE.Vector3(1, 0.1, 0);
    const BOTTOM = new THREE.Vector3(0, -1.8, 0), LEFT = new THREE.Vector3(-1, 0.1, 0), CENTER = new THREE.Vector3(0, 0, 0);
    const panelDefs = [[TOP, RIGHT, CENTER], [RIGHT, BOTTOM, CENTER], [BOTTOM, LEFT, CENTER], [LEFT, TOP, CENTER]];
    const frameMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.98, 0.96, 1.0), roughness: 0.4, metalness: 0.1 });

    spots.forEach((s, ki) => {
      const root = new THREE.Group();
      root.position.set(s[0], s[1], s[2]);
      const sc = 0.9 + Math.random() * 0.7;
      root.scale.setScalar(sc);
      root.rotation.y = Math.random() * Math.PI * 2;
      const colorOffset = ki % 4;

      // Tilted body (flies into the wind)
      const body = new THREE.Group();
      body.rotation.x = -Math.PI / 4;
      root.add(body);

      // 4 triangular panels (double-sided)
      for (let pi = 0; pi < 4; pi++) {
        const [v0, v1, v2] = panelDefs[pi];
        const col = panelPalette[(pi + colorOffset) % 4];
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(
          [v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z], 3));
        geo.computeVertexNormals();
        const panel = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
          color: col, roughness: 0.25, emissive: col, emissiveIntensity: 0.1, side: THREE.DoubleSide
        }));
        body.add(panel);
      }

      // Frame: spine + cross + center knob
      const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 3.2, 6), frameMat);
      spine.position.set(0, -0.2, 0.02);
      body.add(spine);
      const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 2.05, 6), frameMat);
      cross.rotation.z = Math.PI / 2; cross.position.set(0, 0.1, 0.02);
      body.add(cross);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 7, 5), frameMat);
      knob.position.set(0, 0, 0.02);
      body.add(knob);

      // Tail of 6 bows (simplified to one flattened glowing sphere each)
      const bows: THREE.Object3D[] = [];
      for (let bi = 0; bi < 6; bi++) {
        const col = bowPalette[bi % bowPalette.length];
        const bow = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 8, 6),
          new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.18, roughness: 0.3 })
        );
        bow.scale.set(2.2, 1.0, 0.5);
        body.add(bow);
        bows.push(bow);
      }

      // Long trailing string (child of root, not tilted)
      const strLen = 600;
      const stringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.68, 0.65, 0.72), transparent: true, opacity: 0.6 });
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, strLen, 4), stringMat);
      str.position.set(0, -(strLen * 0.5) - 1.0, 0);
      root.add(str);

      this.group.add(root);
      this.animatedMeshes.push({
        mesh: root, type: "kite",
        meta: { base: root.position.clone(), off: Math.random() * Math.PI * 2, bows }
      });
    });
  }

  private spawnSkyBirds(): void {
    const palettes = [
      { body: 0x54aaff, wing: 0x3387ed, belly: 0xeef7ff, beak: 0xffcc33 },
      { body: 0xff87ba, wing: 0xed5499, belly: 0xffeef5, beak: 0xff9933 },
      { body: 0x54cc78, wing: 0x339955, belly: 0xeefff2, beak: 0xffcc22 },
      { body: 0xffde45, wing: 0xedaa12, belly: 0xfffff0, beak: 0xff8833 },
      { body: 0xba78ed, wing: 0x9945cc, belly: 0xf5eeff, beak: 0xffaa33 },
      { body: 0xff8833, wing: 0xde5412, belly: 0xfff2ee, beak: 0xffde22 }
    ];
    for (let i = 0; i < 7; i++) {
      const pal = palettes[i % palettes.length];
      const bird = new THREE.Group();
      bird.visible = false;
      const bodyMat = new THREE.MeshStandardMaterial({ color: pal.body, roughness: 0.35 });
      const wingMat = new THREE.MeshStandardMaterial({ color: pal.wing, roughness: 0.3, side: THREE.DoubleSide });
      const bellyMat = new THREE.MeshStandardMaterial({ color: pal.belly, roughness: 0.5 });
      const beakMat = new THREE.MeshStandardMaterial({ color: pal.beak, roughness: 0.3, metalness: 0.1 });
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x121233, roughness: 0.1 });

      const bodyRoot = new THREE.Group();
      bird.add(bodyRoot);

      const torso = new THREE.Mesh(new THREE.SphereGeometry(0.72, 14, 12), bodyMat);
      torso.scale.set(1.0, 1.05, 0.92);
      bodyRoot.add(torso);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 8), bellyMat);
      belly.scale.set(0.88, 0.8, 0.6); belly.position.set(0, -0.08, 0.42);
      bodyRoot.add(belly);

      const head = new THREE.Group();
      head.position.set(0, 0.72, 0.30);
      bodyRoot.add(head);
      const headM = new THREE.Mesh(new THREE.SphereGeometry(0.52, 14, 12), bodyMat);
      head.add(headM);
      // Beak (cones pointing +Z)
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.13, 0.30, 5), beakMat);
      upper.rotation.x = Math.PI / 2; upper.position.set(0, 0.0, 0.62);
      head.add(upper);
      for (const sgn of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 5), eyeMat);
        eye.position.set(sgn * 0.30, 0.10, 0.46);
        head.add(eye);
      }

      // Wings (pivots at sides)
      let wingL: THREE.Object3D | null = null, wingR: THREE.Object3D | null = null;
      for (const sgn of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(sgn * 0.60, 0.05, 0);
        bodyRoot.add(pivot);
        const wmain = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 8), wingMat);
        wmain.scale.set(sgn * 0.95, 0.065, 0.58); wmain.position.set(sgn * 0.55, 0, 0); wmain.rotation.x = 0.15;
        pivot.add(wmain);
        if (sgn === -1) wingL = pivot; else wingR = pivot;
      }

      // Tail fan (3 feathers)
      const tail = new THREE.Group();
      tail.position.set(0, -0.15, -0.65);
      bodyRoot.add(tail);
      for (const idx of [-1, 0, 1]) {
        const tf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5), wingMat);
        tf.scale.set(0.35, 1.0, 0.18); tf.rotation.x = Math.PI / 2 + 0.35; tf.rotation.y = idx * 0.22; tf.position.x = idx * 0.08;
        tail.add(tf);
      }

      this.group.add(bird);
      this.animatedMeshes.push({
        mesh: bird, type: "bird",
        meta: {
          state: "waiting", waitTimer: 0,
          waitDuration: 3.0 + i * 8.0 + Math.random() * (7.0 + i * 2.0),
          start: new THREE.Vector3(), end: new THREE.Vector3(),
          flySpeed: 14, flapPhase: 0, wingL, wingR, bodyRoot
        }
      });
    }
  }

  private startBirdCrossing(mesh: THREE.Object3D, meta: any): void {
    const H = 185;
    const y = 5 + Math.random() * 35;
    const dy = (Math.random() - 0.5) * 10;
    const r = () => (Math.random() * 2 - 1) * H;
    switch ((Math.random() * 4) | 0) {
      case 0: meta.start.set(r(), y, -H); meta.end.set(r(), y + dy, H); break;
      case 1: meta.start.set(r(), y, H); meta.end.set(r(), y + dy, -H); break;
      case 2: meta.start.set(H, y, r()); meta.end.set(-H, y + dy, r()); break;
      default: meta.start.set(-H, y, r()); meta.end.set(H, y + dy, r()); break;
    }
    meta.flySpeed = 12 + Math.random() * 8;
    meta.flapPhase = Math.random() * Math.PI * 2;
    mesh.position.copy(meta.start);
    const dir = meta.end.clone().sub(meta.start).normalize();
    mesh.rotation.y = Math.atan2(dir.x, dir.z);
    meta.state = "flying";
    mesh.visible = true;
  }

  private updateBird(mesh: THREE.Object3D, meta: any, delta: number, _time: number): void {
    if (meta.state === "waiting") {
      meta.waitTimer += delta;
      if (meta.waitTimer >= meta.waitDuration) {
        meta.waitTimer = 0;
        this.startBirdCrossing(mesh, meta);
      }
      return;
    }
    // flying
    meta.flapPhase += delta * 8.0;
    const flap = Math.sin(meta.flapPhase) * 0.70;
    if (meta.wingL) { meta.wingL.rotation.z = flap; meta.wingL.rotation.x = Math.sin(meta.flapPhase) * 0.15; }
    if (meta.wingR) { meta.wingR.rotation.z = -flap; meta.wingR.rotation.x = Math.sin(meta.flapPhase) * 0.15; }
    if (meta.bodyRoot) {
      meta.bodyRoot.position.y = Math.abs(Math.sin(meta.flapPhase * 0.5)) * 0.14;
      meta.bodyRoot.rotation.x = -0.12 + Math.sin(meta.flapPhase * 0.5) * 0.05;
    }
    const dir = meta.end.clone().sub(mesh.position).normalize();
    mesh.position.addScaledVector(dir, meta.flySpeed * delta);
    mesh.rotation.y = Math.atan2(dir.x, dir.z);
    mesh.rotation.z = -dir.x * 0.10;
    if (mesh.position.distanceTo(meta.end) < 6.0) {
      mesh.visible = false;
      meta.state = "waiting";
      meta.waitDuration = 12 + Math.random() * 28;
      meta.waitTimer = 0;
    }
  }
}
