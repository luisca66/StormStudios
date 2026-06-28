import * as THREE from "three";

export class LevelGate {
  public group: THREE.Group;
  public position: THREE.Vector3;
  private isUnlocked = false;
  private animProgress = 0; // 0 to 1 for open/unlock animation
  
  // Specific mesh references
  private leftHinge?: THREE.Group;
  private rightHinge?: THREE.Group;
  private leftDoor?: THREE.Mesh;
  private rightDoor?: THREE.Mesh;
  private hatchPlate?: THREE.Mesh;
  private wormholeCore?: THREE.Mesh;
  private wormholeRing?: THREE.Mesh;
  private portalCurtain?: THREE.Mesh;
  private rainbowCurtain?: THREE.Mesh;
  // Level 5 rainbow portal
  private portalRings: THREE.Mesh[] = [];
  private portalOrbs: THREE.Object3D[] = [];
  // Level 4 swamp portal
  private swampRings: THREE.Mesh[] = [];
  private swampDisc?: THREE.Mesh;
  private swampGlowT = 0;
  // Level 3 wormhole
  private wormholeRings: { mesh: THREE.Mesh; spin: number }[] = [];
  private wormholeDisc?: THREE.Mesh;
  private wormholeGlow?: THREE.PointLight;
  private wormholeT = 0;

  constructor(private level: number, private scene: THREE.Scene, private arenaSize: number) {
    this.group = new THREE.Group();
    this.position = new THREE.Vector3();
    this.setupGate();
    this.scene.add(this.group);
  }

  public clear(): void {
    this.scene.remove(this.group);
  }

  public unlock(): void {
    this.isUnlocked = true;
  }

  public checkTrigger(playerPos: THREE.Vector3): boolean {
    if (!this.isUnlocked) return false;
    
    // Check distance in 3D or 2D based on level
    const dist = playerPos.distanceTo(this.position);
    
    // Trigger distance threshold (e.g. 5m for small gates, larger for portals)
    const triggerRadius = this.level === 3 ? 8.0 : this.level === 5 ? 7.0 : 5.0;
    return dist < triggerRadius;
  }

  public update(delta: number, time: number): void {
    if (this.isUnlocked && this.animProgress < 1.0) {
      this.animProgress = Math.min(1.0, this.animProgress + delta * 1.5); // Open in ~0.7s
    }

    const t = this.animProgress;

    if (this.level === 1) {
      // Rotate pivots: left opens outwards (positive Y rotation), right opens outwards (negative Y rotation)
      if (this.leftHinge && this.rightHinge) {
        this.leftHinge.rotation.y = t * 1.4; // 1.4 rad = ~80 degrees
        this.rightHinge.rotation.y = -t * 1.4;
      }
    } 
    else if (this.level === 2) {
      // Slide Hatch Plate horizontally
      if (this.hatchPlate) {
        this.hatchPlate.position.x = 110 + t * 8.0; // slide away
      }
    } 
    else if (this.level === 3) {
      this.wormholeT += delta;
      for (const r of this.wormholeRings) {
        r.mesh.rotation.z += r.spin * delta;
      }
      if (this.wormholeDisc) {
        const pulse = 0.85 + Math.sin(this.wormholeT * 2.5) * 0.15;
        this.wormholeDisc.scale.set(pulse, pulse, 1);
      }
      if (this.wormholeGlow) {
        const base = this.isUnlocked ? 22 : 12;
        this.wormholeGlow.intensity = base + Math.sin(this.wormholeT * 3.0) * 4;
      }
    }
    else if (this.level === 4) {
      // Spin rings (faster once unlocked) and flicker the disc
      this.swampGlowT += delta;
      const open = this.isUnlocked;
      for (let i = 0; i < this.swampRings.length; i++) {
        let speed = 0.3 + i * 0.12;
        if (open) speed *= 3.0;
        this.swampRings[i].rotation.z += speed * delta;
      }
      if (this.swampDisc) {
        const mat = this.swampDisc.material as THREE.MeshBasicMaterial;
        mat.opacity = open ? 0.55 + Math.sin(this.swampGlowT * 4.0) * 0.2 : 0.25;
      }
    } 
    else if (this.level === 5) {
      // Spin the rings (alternating directions)
      for (let i = 0; i < this.portalRings.length; i++) {
        const spin = (0.15 + i * 0.04) * (i % 2 === 0 ? 1 : -1);
        this.portalRings[i].rotation.z += spin * delta;
      }
      // Orbit the glowing orbs around the portal
      for (const orb of this.portalOrbs) {
        const m = (orb as any).orbitMeta;
        const angle = m.angle + time * m.speed;
        orb.position.set(
          Math.cos(angle) * m.radius,
          Math.sin(angle) * m.radius * Math.cos(m.tilt),
          Math.sin(angle) * m.radius * Math.sin(m.tilt)
        );
      }
    }
  }

  private setupGate(): void {
    if (this.level === 1) {
      // North wall gate at z = -arenaSize/2 (z = -150), y = 0
      this.position.set(0, 0, -this.arenaSize / 2);
      const zPos = -this.arenaSize / 2;
      
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 });
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.9 });

      // Door frame posts
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.5, 0.8), frameMat);
      postL.position.set(-3.4, 2.25, zPos);
      const postR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.5, 0.8), frameMat);
      postR.position.set(3.4, 2.25, zPos);
      this.group.add(postL, postR);

      // Two wooden doors swinging open from hinges (pivots)
      // Hinge L at X = -3.0
      this.leftHinge = new THREE.Group();
      this.leftHinge.position.set(-3.0, 2.0, zPos);
      this.leftDoor = new THREE.Mesh(new THREE.BoxGeometry(3.0, 4.0, 0.25), doorMat);
      this.leftDoor.position.set(1.5, 0, 0); // extends 3m to the right from hinge
      this.leftDoor.castShadow = true;
      this.leftHinge.add(this.leftDoor);

      // Hinge R at X = 3.0
      this.rightHinge = new THREE.Group();
      this.rightHinge.position.set(3.0, 2.0, zPos);
      this.rightDoor = new THREE.Mesh(new THREE.BoxGeometry(3.0, 4.0, 0.25), doorMat);
      this.rightDoor.position.set(-1.5, 0, 0); // extends 3m to the left from hinge
      this.rightDoor.castShadow = true;
      this.rightHinge.add(this.rightDoor);

      this.group.add(this.leftHinge, this.rightHinge);
    } 
    else if (this.level === 2) {
      // Hatch door at floor (y=-50), x=110, z=110
      this.position.set(110, -50, 110);

      const metalMat = new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.8, roughness: 0.2 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9 });

      // Circular hatch base rim
      const rim = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.6, 8, 24), metalMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(110, -49.6, 110);
      this.group.add(rim);

      // Hatch sliding plate
      this.hatchPlate = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 0.5, 16), metalMat);
      this.hatchPlate.position.set(110, -49.8, 110);
      
      const handle = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.15, 8, 16), goldMat);
      handle.position.y = 0.45;
      handle.rotation.x = Math.PI / 2;
      this.hatchPlate.add(handle);

      this.group.add(this.hatchPlate);
    } 
    else if (this.level === 3) {
      // Wormhole in the far corner of the cosmos (Godot: (280,0,280) scaled 4)
      this.position.set(280, 0, 280);
      const portal = new THREE.Group();
      portal.position.copy(this.position);
      this.group.add(portal);

      // 5 concentric glowing rings (purple → cyan), lying flat with slight tilt
      const radii = [4.0, 3.3, 2.6, 1.9, 1.2];
      const ringCols = [
        [0.6, 0.1, 1.0], [0.4, 0.2, 1.0], [0.2, 0.4, 1.0], [0.1, 0.7, 1.0], [0.8, 0.3, 1.0]
      ];
      for (let i = 0; i < radii.length; i++) {
        const r = radii[i] * 4; // bake the Godot scale of 4
        const c = ringCols[i];
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(r - 1.0, 1.0, 12, 48),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0], c[1], c[2]) })
        );
        ring.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3; // flat-ish portal
        portal.add(ring);
        this.wormholeRings.push({ mesh: ring, spin: (0.3 + Math.random() * 0.6) * (i % 2 === 0 ? 1 : -1) });
      }

      // Inner spiral galaxy disc (pulsing)
      this.wormholeDisc = new THREE.Mesh(
        new THREE.CircleGeometry(1.15 * 4, 32),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.1, 0.9), transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      this.wormholeDisc.rotation.x = -Math.PI / 2;
      this.wormholeDisc.position.y = 0.1;
      portal.add(this.wormholeDisc);

      // Vertical beacon beam so the player can spot it across the cosmos
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(10, 2, 260, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.2, 1.0), transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false })
      );
      beam.position.y = 130;
      portal.add(beam);

      // Central glow light
      this.wormholeGlow = new THREE.PointLight(new THREE.Color(0.6, 0.2, 1.0), 12, 160);
      portal.add(this.wormholeGlow);
    }
    else if (this.level === 4) {
      // Swamp portal in the far corner (matches the stone arch placed by the level)
      const c = this.arenaSize / 2 - 20;
      this.position.set(c, 3.5, c);

      const portal = new THREE.Group();
      portal.position.copy(this.position);
      portal.rotation.y = Math.atan2(-1, -1); // face the play area
      this.group.add(portal);

      const ringColor = new THREE.Color(0.18, 0.72, 0.38);
      const glowColor = new THREE.Color(0.35, 0.95, 0.55);

      // 4 concentric green rings (vertical = portal)
      const radii = [1.8, 2.5, 3.1, 3.6];
      const thick = [0.28, 0.22, 0.18, 0.14];
      for (let i = 0; i < radii.length; i++) {
        const tube = thick[i] / 2;
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(radii[i] - tube, tube, 8, 32),
          new THREE.MeshStandardMaterial({
            color: ringColor.clone().multiplyScalar(1 - i * 0.08),
            roughness: 0.6, emissive: ringColor.clone().multiplyScalar(1 - i * 0.08), emissiveIntensity: 0.6
          })
        );
        ring.rotation.z = Math.random() * Math.PI * 2;
        portal.add(ring); this.swampRings.push(ring);
      }

      // Glowing interior disc
      this.swampDisc = new THREE.Mesh(
        new THREE.CircleGeometry(1.7, 32),
        new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
      );
      portal.add(this.swampDisc);

      // 8 hanging vines/roots
      const vineMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.12, 0.35, 0.08), roughness: 0.9 });
      for (let i = 0; i < 8; i++) {
        const vh = 1.2 + Math.random() * 2.3;
        const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.025, vh, 6), vineMat);
        const ang = (i / 8) * Math.PI * 2 + (Math.random() - 0.5);
        const r = 2.5 + Math.random() * 1.5;
        vine.position.set(Math.cos(ang) * r, -vh * 0.5 - 0.5, Math.sin(ang) * r * 0.3);
        vine.rotation.z = (Math.random() - 0.5) * 0.4;
        portal.add(vine);
      }
    } 
    else if (this.level === 5) {
      // Rainbow portal at the far edge of the cloud field
      this.position.set(0, 8, -170);

      const portal = new THREE.Group();
      portal.position.copy(this.position);
      this.group.add(portal);

      // 7 concentric rainbow rings (vertical = portal facing +Z)
      const rainbow = [
        [1.0, 0.22, 0.22], [1.0, 0.60, 0.0], [1.0, 0.93, 0.0], [0.27, 0.87, 0.27],
        [0.27, 0.55, 1.0], [0.45, 0.18, 0.9], [0.75, 0.35, 1.0]
      ];
      for (let i = 0; i < rainbow.length; i++) {
        const ro = 8.0 + i * 0.9;
        const ringRadius = ro - 0.275; // tube radius 0.275 (Godot inner=ro-0.55)
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(ringRadius, 0.275, 8, 48),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(rainbow[i][0], rainbow[i][1], rainbow[i][2]) })
        );
        portal.add(ring);
        this.portalRings.push(ring);
      }

      // Translucent glowing center
      const center = new THREE.Mesh(
        new THREE.CircleGeometry(7.5, 32),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 0.75, 1.0), transparent: true, opacity: 0.22, side: THREE.DoubleSide })
      );
      portal.add(center);

      // 12 glowing orbs orbiting the portal
      const orbColors = [
        [1.0, 0.6, 0.8], [0.8, 0.9, 1.0], [1.0, 1.0, 0.6], [0.8, 0.6, 1.0], [0.6, 1.0, 0.8]
      ];
      for (let i = 0; i < 12; i++) {
        const c = orbColors[i % orbColors.length];
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.18 + (i % 3) * 0.06, 7, 5),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0], c[1], c[2]) })
        );
        (orb as any).orbitMeta = {
          angle: (Math.PI * 2 / 12) * i,
          radius: 9.5 + Math.sin(i * 1.3) * 1.5,
          speed: 0.4 + (i % 3) * 0.15,
          tilt: (i % 4) * 0.22
        };
        portal.add(orb);
        this.portalOrbs.push(orb);
      }
    }
  }
}
