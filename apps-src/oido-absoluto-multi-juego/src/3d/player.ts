import * as THREE from "three";
import { AudioEngine } from "@/audio/engine";
import { ASSET_BASE } from "@/config";

export class PlayerController {
  public mesh: THREE.Group;
  private keys: Record<string, boolean> = {};
  
  // Movement variables
  private speed = 0;
  private maxSpeed = 8.0;
  private acceleration = 12.0;
  private friction = 0.95;
  private turnSpeed = 1.8;
  
  // 6DOF variables
  private pitchSpeed = 1.2;
  private yawSpeed = 1.2;
  private rollSpeed = 1.4;

  // Animation time tracker
  private animTime = 0;

  // Parts for animation
  private bodyMesh!: THREE.Mesh;
  private leftFoot?: THREE.Object3D;
  private rightFoot?: THREE.Object3D;
  private leftHand?: THREE.Object3D;
  private rightHand?: THREE.Object3D;

  private leftFin?: THREE.Object3D;
  private rightFin?: THREE.Object3D;
  private tailPivot?: THREE.Object3D;

  private wingLeft?: THREE.Object3D;
  private wingRight?: THREE.Object3D;
  private thrusterGlow?: THREE.Mesh;
  private engineLight?: THREE.PointLight;

  // Detailed crocodile (level 4) — Godot CrocodilePlayer.gd
  private crocModel?: THREE.Group;
  private crocBody?: THREE.Mesh;
  private crocHead?: THREE.Object3D;
  private crocLegs: THREE.Object3D[] = [];
  private crocTail: THREE.Object3D[] = [];
  private crocBlinkers: { node: THREE.Object3D; base: THREE.Vector3 }[] = [];
  private crocBlinkTimer = 0;
  private crocNextBlink = 3;
  private crocBlinkPhase = -1; // -1 = open; 0..1 = blink progress

  // Detailed unicorn (level 5) — faithful port of Godot UnicornPlayer.gd
  private unicornModel?: THREE.Group;
  private uniManeLobes: THREE.Object3D[] = [];
  private uniTailLobes: THREE.Object3D[] = [];
  private uniLegs: THREE.Object3D[] = [];
  private uniHornGlow?: THREE.Mesh;
  private uniWingL?: THREE.Object3D;
  private uniWingR?: THREE.Object3D;
  private uniMagicLight?: THREE.PointLight;

  constructor(private level: number, private audio: AudioEngine) {
    this.mesh = new THREE.Group();
    this.setupControls();
    this.buildCharacter();
  }

  private setupControls(): void {
    window.addEventListener("keydown", (e) => {
      this.keys[e.key.toLowerCase()] = true;
      // Also check space
      if (e.key === " ") this.keys["space"] = true;
    });
    window.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
      if (e.key === " ") this.keys["space"] = false;
    });
    // Prevent space scrolling
    window.addEventListener("keydown", (e) => {
      if (e.key === " " && document.activeElement === document.body) {
        e.preventDefault();
      }
    });
  }

  public resetPosition(): void {
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.set(0, 0, 0);
    this.speed = 0;
    if (this.level === 2) {
      this.mesh.position.y = -20; // Start middle depth
    } else if (this.level === 3) {
      this.mesh.position.y = 0;
    } else if (this.level === 4) {
      this.mesh.position.y = 0; // croc model sits its body at +0.5 in model space
    } else if (this.level === 5) {
      this.mesh.position.y = 3; // Float near the cloud field (Godot frame)
    } else {
      this.mesh.position.y = 0;
    }
  }

  private buildCharacter(): void {
    if (this.level === 1) {
      this.buildGlub();
    } else if (this.level === 2) {
      this.buildFish();
    } else if (this.level === 3) {
      this.buildSpaceship();
    } else if (this.level === 4) {
      this.buildCrocodile();
    } else if (this.level === 5) {
      this.buildUnicorn();
    }
    this.resetPosition();
  }

  // LEVEL 1: GLUB (Humanoid)
  private buildGlub(): void {
    // Set half speed and acceleration
    this.maxSpeed = 4.0;
    this.acceleration = 6.0;

    // Body: sphere of radius 1.0, positioned at Y=1.5
    const bodyGeo = new THREE.SphereGeometry(1.0, 32, 32);
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: 0xff4081, 
      roughness: 0.3, 
      metalness: 0.1 
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.position.set(0, 1.5, 0);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.mesh.add(this.bodyMesh);

    // Feet Material (deep pink/crimson)
    const footMat = new THREE.MeshStandardMaterial({ 
      color: 0xc60055, 
      roughness: 0.5 
    });
    
    // Left Foot: footBase + toe
    const leftFootGroup = new THREE.Group();
    leftFootGroup.position.set(-0.6, 0.3, 0);
    
    const footBaseGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const leftFootBase = new THREE.Mesh(footBaseGeo, footMat);
    leftFootBase.scale.set(1.0, 0.6, 1.8);
    leftFootBase.castShadow = true;
    
    const toeGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const leftToe = new THREE.Mesh(toeGeo, footMat);
    leftToe.position.set(0, -0.1, -0.7);
    leftToe.scale.set(1.5, 0.8, 1.0);
    leftToe.castShadow = true;
    
    leftFootGroup.add(leftFootBase, leftToe);
    this.mesh.add(leftFootGroup);
    this.leftFoot = leftFootGroup;

    // Right Foot
    const rightFootGroup = new THREE.Group();
    rightFootGroup.position.set(0.6, 0.3, 0);
    
    const rightFootBase = new THREE.Mesh(footBaseGeo, footMat);
    rightFootBase.scale.set(1.0, 0.6, 1.8);
    rightFootBase.castShadow = true;
    
    const rightToe = new THREE.Mesh(toeGeo, footMat);
    rightToe.position.set(0, -0.1, -0.7);
    rightToe.scale.set(1.5, 0.8, 1.0);
    rightToe.castShadow = true;
    
    rightFootGroup.add(rightFootBase, rightToe);
    this.mesh.add(rightFootGroup);
    this.rightFoot = rightFootGroup;

    // Hands
    const handGeo = new THREE.SphereGeometry(0.3, 16, 16);
    
    const leftHandMesh = new THREE.Mesh(handGeo, footMat);
    leftHandMesh.position.set(-1.1, 1.5, 0);
    leftHandMesh.castShadow = true;
    this.mesh.add(leftHandMesh);
    this.leftHand = leftHandMesh;

    const rightHandMesh = new THREE.Mesh(handGeo, footMat);
    rightHandMesh.position.set(1.1, 1.5, 0);
    rightHandMesh.castShadow = true;
    this.mesh.add(rightHandMesh);
    this.rightHand = rightHandMesh;
  }

  // LEVEL 2: FISH (Red Fish)
  private buildFish(): void {
    // Movement configuration - forward speed restored, rotation kept at 0.3
    this.maxSpeed = 6.0;
    this.acceleration = 8.0;
    this.friction = 0.97;
    this.pitchSpeed = 0.3;       // Godot turn_speed = 0.3
    this.yawSpeed = 0.3;
    this.rollSpeed = 0.3;

    // Colors matching FishPlayer.gd
    const skinColor = 0xe61a1a;   // Color(0.9, 0.1, 0.1)
    const bellyColor = 0xffd93d;  // Color(1.0, 0.85, 0.24)
    const finColor = 0xd90d0d;    // Color(0.85, 0.05, 0.05)
    const dorsalColor = 0xbc0000; // fin_color.darkened(0.1)
    const mouthColor = 0x800000;  // Color(0.5, 0.0, 0.0)

    // Body: sphere of radius 1.0
    const bodyGeo = new THREE.SphereGeometry(1.0, 24, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.4, metalness: 0.05 });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.scale.set(0.6, 0.8, 1.0);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.mesh.add(this.bodyMesh);

    // Belly: lower sphere (yellow)
    const bellyGeo = new THREE.SphereGeometry(0.95, 24, 12);
    const bellyMat = new THREE.MeshStandardMaterial({ color: bellyColor, roughness: 0.4 });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, -0.3, 0);
    belly.scale.set(0.6, 0.5, 1.0);
    belly.castShadow = true;
    belly.receiveShadow = true;
    this.bodyMesh.add(belly);

    // Mouth: torus at front
    const mouthGeo = new THREE.TorusGeometry(0.14, 0.06, 12, 12);
    const mouthMat = new THREE.MeshStandardMaterial({ color: mouthColor, roughness: 0.6 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.15, 0.95);
    mouth.rotation.x = Math.PI / 2.0;
    mouth.castShadow = true;
    this.bodyMesh.add(mouth);

    // Eyes: white base + black pupil (no eyes for Glub, but Fish has eyes!)
    const eyeGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const pupilGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

    for (const side of [-1.0, 1.0]) {
      const eye = new THREE.Mesh(eyeGeo, whiteMat);
      eye.position.set(side * 0.35, -0.1, 0.45);
      eye.scale.set(1.0, 1.0, 0.7);
      eye.castShadow = true;
      this.bodyMesh.add(eye);

      const pupil = new THREE.Mesh(pupilGeo, blackMat);
      pupil.position.set(side * 0.35, -0.1, 0.55);
      pupil.castShadow = true;
      this.bodyMesh.add(pupil);
    }

    // Left & Right Fins: Cylinder top=0.04, bottom=0.52, height=0.9 (Enlarged for visibility)
    const finGeo = new THREE.CylinderGeometry(0.04, 0.52, 0.9, 12);
    const finMat = new THREE.MeshStandardMaterial({ color: finColor, roughness: 0.4 });

    this.leftFin = new THREE.Mesh(finGeo, finMat);
    this.leftFin.position.set(-0.8, -0.1, 0.1);
    this.leftFin.rotation.set(0, 0.3, Math.PI / 2.5);
    this.leftFin.scale.set(1.8, 0.35, 1.25);
    this.leftFin.castShadow = true;
    this.bodyMesh.add(this.leftFin);

    this.rightFin = new THREE.Mesh(finGeo, finMat);
    this.rightFin.position.set(0.8, -0.1, 0.1);
    this.rightFin.rotation.set(0, -0.3, -Math.PI / 2.5);
    this.rightFin.scale.set(1.8, 0.35, 1.25);
    this.rightFin.castShadow = true;
    this.bodyMesh.add(this.rightFin);

    // Dorsal Fin: Cylinder top=0.02, bottom=0.3, height=0.6
    const dorsalGeo = new THREE.CylinderGeometry(0.02, 0.3, 0.6, 12);
    const dorsalMat = new THREE.MeshStandardMaterial({ color: dorsalColor, roughness: 0.4 });
    const dorsal = new THREE.Mesh(dorsalGeo, dorsalMat);
    dorsal.position.set(0, 0.8, -0.2);
    dorsal.rotation.x = -0.4;
    dorsal.scale.set(0.2, 1.0, 0.8);
    dorsal.castShadow = true;
    this.bodyMesh.add(dorsal);

    // Tail Pivot & Tail (Tail extends backwards from pivot)
    this.tailPivot = new THREE.Group();
    this.tailPivot.position.set(0, 0, -0.9);
    this.bodyMesh.add(this.tailPivot);

    const tailGeo = new THREE.CylinderGeometry(0.02, 0.5, 0.8, 12);
    const tail = new THREE.Mesh(tailGeo, finMat);
    tail.rotation.x = Math.PI / 2.0; // Point backwards
    tail.position.set(0, 0, -0.4);
    tail.scale.set(0.3, 1.0, 1.0); // Flattened fin
    this.tailPivot.add(tail);
  }

  // LEVEL 3: SPACESHIP
  private buildSpaceship(): void {
    // Forward speed reduced 40% (longer travel = forget the previous note, key to
    // the absolute-pitch training). Rotation thrusters stay boosted below.
    this.maxSpeed = 6.75; // was 11.25
    this.acceleration = 15.0;
    this.friction = 0.97;
    // Maneuvering thrusters +25% (forward propulsion unchanged); roll (Q/E) faster still
    this.pitchSpeed = 0.234;
    this.yawSpeed = 0.234;
    this.rollSpeed = 0.35;

    // Colors matching SpacePlayer.gd
    const hullColor = 0x262638;    // Color(0.15, 0.15, 0.22)
    const accentColor = 0x8c33e6;  // Color(0.55, 0.2, 0.9)
    const cockpitColor = 0x33b3ff; // Color(0.2, 0.7, 1.0, 0.7)

    // Materials
    const hullMat = new THREE.MeshStandardMaterial({
      color: hullColor,
      roughness: 0.3,
      metalness: 0.6,
      emissive: accentColor,
      emissiveIntensity: 0.08
    });

    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x33334c, // hullColor lightened slightly
      roughness: 0.4,
      metalness: 0.5,
      emissive: accentColor,
      emissiveIntensity: 0.05
    });

    const cockpitMat = new THREE.MeshStandardMaterial({
      color: cockpitColor,
      transparent: true,
      opacity: 0.7,
      roughness: 0.0,
      metalness: 0.3,
      emissive: 0x1a80cc,
      emissiveIntensity: 0.3
    });

    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a26, // very dark metal
      roughness: 0.3,
      metalness: 0.8
    });

    // 1. FUSELAGE: cylinder tapered (cone in threejs or cylinder with top/bottom radii)
    // CylinderGeometry: top, bottom, height, radialSegments
    const fusGeo = new THREE.CylinderGeometry(0.15, 0.6, 3.0, 10);
    fusGeo.rotateX(Math.PI / 2.0); // points forward along +Z
    this.bodyMesh = new THREE.Mesh(fusGeo, hullMat);
    this.bodyMesh.position.set(0, 0, 0.3);
    this.bodyMesh.castShadow = true;
    this.mesh.add(this.bodyMesh);

    // 2. COCKPIT: sphere flattened/stretched at front
    const cockGeo = new THREE.SphereGeometry(0.45, 12, 8);
    const cockpit = new THREE.Mesh(cockGeo, cockpitMat);
    cockpit.position.set(0, 0.1, 1.4);
    cockpit.scale.set(1.0, 0.7, 1.2);
    this.bodyMesh.add(cockpit);

    // 3. WINGS (left & right)
    const wingGeo = new THREE.CylinderGeometry(0.04, 0.5, 2.0, 8);
    
    this.wingLeft = new THREE.Mesh(wingGeo, wingMat);
    this.wingLeft.position.set(-1.4, 0.0, 0.0);
    this.wingLeft.rotation.set(0, 0, Math.PI / 2.2);
    this.wingLeft.scale.set(1.0, 0.18, 1.5);
    this.wingLeft.castShadow = true;
    this.bodyMesh.add(this.wingLeft);

    this.wingRight = new THREE.Mesh(wingGeo, wingMat);
    this.wingRight.position.set(1.4, 0.0, 0.0);
    this.wingRight.rotation.set(0, 0, -Math.PI / 2.2);
    this.wingRight.scale.set(1.0, 0.18, 1.5);
    this.wingRight.castShadow = true;
    this.bodyMesh.add(this.wingRight);

    // 4. TAIL FIN
    const tailGeo = new THREE.CylinderGeometry(0.03, 0.4, 1.2, 6);
    const tail = new THREE.Mesh(tailGeo, wingMat);
    tail.position.set(0, 0.4, -1.0);
    tail.scale.set(0.15, 1.0, 0.9);
    tail.castShadow = true;
    this.bodyMesh.add(tail);

    // 5. ENGINES (left & right tubes)
    const engGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.7, 10);
    engGeo.rotateX(Math.PI / 2.0); // points backward along Z
    
    const engL = new THREE.Mesh(engGeo, engineMat);
    engL.position.set(-0.9, -0.15, -1.1);
    engL.castShadow = true;
    this.bodyMesh.add(engL);

    const engR = new THREE.Mesh(engGeo, engineMat);
    engR.position.set(0.9, -0.15, -1.1);
    engR.castShadow = true;
    this.bodyMesh.add(engR);

    // 6. THRUSTER GLOW: cone at back (cylinder top=0.0, bottom=0.35, height=1.0)
    const glowGeo = new THREE.CylinderGeometry(0.0, 0.35, 1.0, 10);
    glowGeo.rotateX(Math.PI / 2.0);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xcc80ff,
      transparent: true,
      opacity: 0.8
    });
    this.thrusterGlow = new THREE.Mesh(glowGeo, glowMat);
    this.thrusterGlow.position.set(0, 0, -2.0); // -1.5 (pivot) + -0.5 (local offset)
    this.thrusterGlow.scale.set(1.0, 1.0, 0.0); // Starts invisible
    this.bodyMesh.add(this.thrusterGlow);

    // 7. ENGINE LIGHT (PointLight)
    this.engineLight = new THREE.PointLight(0xb366ff, 0, 8.0);
    this.engineLight.position.set(0, 0, -1.5);
    this.bodyMesh.add(this.engineLight);
  }

  // LEVEL 4: CROCODILE (detailed — Godot CrocodilePlayer.gd)
  private buildCrocodile(): void {
    const model = new THREE.Group();
    // Godot croc faces -Z; webapp terrestrial forward is +Z, so flip the model.
    model.rotation.y = Math.PI;
    this.crocModel = model;
    this.mesh.add(model);

    const skinMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.176, 0.353, 0.153), roughness: 0.85, metalness: 0.03 });
    const lomoMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.13, 0.25, 0.10), roughness: 0.92 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.72, 0.78, 0.55), roughness: 0.55 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(1, 1, 0), emissive: new THREE.Color(1.0, 0.9, 0.0), emissiveIntensity: 1.2 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.04, 0.02, 0.0), roughness: 0.2, metalness: 0.15 });
    const clawMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.82, 0.79, 0.60), roughness: 0.5 });

    // Body + belly + dorsal scutes
    this.crocBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 3.0), skinMat);
    this.crocBody.position.set(0, 0.5, 0); model.add(this.crocBody);
    const belly = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 2.7), bellyMat);
    belly.position.set(0, 0.21, 0); model.add(belly);
    for (let i = 0; i < 5; i++) {
      const h = 0.20 - i * 0.025;
      const scute = new THREE.Mesh(new THREE.BoxGeometry(0.14 - i * 0.01, h, 0.20), lomoMat);
      scute.position.set(0, 0.8 + h * 0.5, -1.1 + i * 0.55); model.add(scute);
    }

    // Head group (skull + snout + jaw + eyes)
    const head = new THREE.Group(); head.position.set(0, 0.6, -1.5); model.add(head); this.crocHead = head;
    const skull = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.35, 0.9), skinMat);
    skull.position.set(0, 0.15, -0.05); head.add(skull);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.35, 1.7), skinMat);
    snout.position.set(0, 0.0, -0.95); head.add(snout);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.15, 1.6), bellyMat);
    jaw.position.set(0, -0.22, -0.85); head.add(jaw);
    for (const sx of [-0.45, 0.45]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 7), eyeMat);
      eye.position.set(sx, 0.32, -0.15); head.add(eye);
      const pupil = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8), pupilMat);
      pupil.position.set(sx, 0.32, -0.005); pupil.rotation.x = Math.PI / 2; pupil.scale.set(0.28, 1, 1); head.add(pupil);
      this.crocBlinkers.push({ node: eye, base: eye.scale.clone() });
      this.crocBlinkers.push({ node: pupil, base: pupil.scale.clone() });
    }

    // Segmented tail (4 chained segments)
    let parent: THREE.Object3D = model;
    let attachZ = 1.5, attachY = 0.5;
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, attachY, attachZ); parent.add(seg);
      const segLen = 0.8 - i * 0.1, segW = 0.8 - i * 0.15, segH = 0.4 - i * 0.05;
      const segMesh = new THREE.Mesh(new THREE.BoxGeometry(segW, segH, segLen), skinMat);
      segMesh.position.set(0, 0, segLen / 2); seg.add(segMesh);
      this.crocTail.push(seg);
      parent = seg; attachZ = segLen; attachY = 0.0;
    }

    // Legs (pivot + leg + foot + 3 claws)
    const legPos = [[0.7, 0.8, -1.0], [-0.7, 0.8, -1.0], [0.7, 0.8, 1.0], [-0.7, 0.8, 1.0]];
    for (const lp of legPos) {
      const pivot = new THREE.Group(); pivot.position.set(lp[0], lp[1], lp[2]); model.add(pivot);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), skinMat);
      leg.position.y = -0.4; pivot.add(leg);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.10, 0.42), skinMat);
      foot.position.set(0, -0.84, 0.10); pivot.add(foot);
      for (let c = 0; c < 3; c++) {
        const claw = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.05, 0.16, 6), clawMat);
        claw.position.set((c - 1) * 0.13, -0.86, 0.28); claw.rotation.x = -0.45; pivot.add(claw);
      }
      this.crocLegs.push(pivot);
    }
  }

  // LEVEL 5: UNICORN (detailed pegasus — Godot UnicornPlayer.gd)
  private buildUnicorn(): void {
    const model = new THREE.Group();
    this.unicornModel = model;
    this.mesh.add(model);

    // ----- Materials -----
    const bodyMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.98, 0.94, 1.0), roughness: 0.3, metalness: 0.05 });
    const bodyAccent = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.94, 0.88, 1.0), roughness: 0.4 });
    const maneColors = [
      new THREE.Color(1.0, 0.40, 0.60), new THREE.Color(1.0, 0.60, 0.80), new THREE.Color(1.0, 0.80, 0.33),
      new THREE.Color(0.53, 0.87, 1.0), new THREE.Color(0.67, 0.40, 1.0), new THREE.Color(0.40, 0.93, 0.73)
    ];
    const maneMats = maneColors.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, emissive: c, emissiveIntensity: 0.35 }));
    const hornMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(1.0, 0.87, 0.2), roughness: 0.1, metalness: 0.85, emissive: new THREE.Color(1.0, 0.67, 0.0), emissiveIntensity: 0.4 });
    const hoofMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.93, 0.67, 1.0), roughness: 0.3, metalness: 0.3 });
    const noseMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(1.0, 0.73, 0.87), roughness: 0.6 });
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const irisMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.53, 0.13, 0.8), roughness: 0.1, emissive: new THREE.Color(0.40, 0.07, 0.67), emissiveIntensity: 0.5 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.13, 0, 0.13), roughness: 0.1 });
    const innerEarMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(1.0, 0.67, 0.73), roughness: 0.6 });

    // ----- Body / belly / rump -----
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.08, 18, 14), bodyMat);
    body.scale.set(1.05, 1.0, 1.12); body.position.set(0, 1.08, 0); body.castShadow = true;
    model.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), bodyAccent);
    belly.scale.set(0.9, 0.7, 0.85); belly.position.set(0, 0.78, 0.42); model.add(belly);
    const rump = new THREE.Mesh(new THREE.SphereGeometry(0.78, 12, 10), bodyMat);
    rump.scale.set(0.92, 0.88, 0.8); rump.position.set(0, 1.15, -0.62); model.add(rump);

    // ----- Neck -----
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 0.95, 10), bodyMat);
    neck.rotation.x = 0.5; neck.position.set(0, 1.98, 0.52); model.add(neck);

    // ----- Head -----
    const head = new THREE.Group(); head.position.set(0, 2.9, 1.15); model.add(head);
    const headM = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 12), bodyMat);
    headM.scale.set(0.95, 1.02, 1.05); head.add(headM);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), bodyMat);
    snout.scale.set(0.85, 0.7, 1.1); snout.position.set(0, -0.22, 0.6); head.add(snout);
    for (const s of [-1, 1]) {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), noseMat);
      nostril.position.set(s * 0.15, -0.2, 0.88); head.add(nostril);
    }

    // ----- Spiral horn + glow -----
    const hornGroup = new THREE.Group(); hornGroup.position.set(0, 0.72, 0.25); head.add(hornGroup);
    for (let i = 0; i < 6; i++) {
      const r = 0.088 - i * 0.012; const h = 0.21;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.006, r * 0.65), r, h, 8), hornMat);
      seg.position.y = i * h * 0.86; seg.rotation.y = i * 0.45; hornGroup.add(seg);
    }
    const hornTip = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.02, 0.2, 7), hornMat);
    hornTip.position.y = 6 * 0.21 * 0.86; hornGroup.add(hornTip);
    this.uniHornGlow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 1.0, 0.67), transparent: true, opacity: 0.85 }));
    this.uniHornGlow.position.y = 6 * 0.21 * 0.86 + 0.08; hornGroup.add(this.uniHornGlow);
    hornGroup.rotation.x = -0.15;

    // ----- Ears -----
    for (const s of [-1, 1]) {
      const earGroup = new THREE.Group(); earGroup.position.set(s * 0.5, 0.66, 0.06); head.add(earGroup);
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.13, 0.36, 7), bodyMat);
      ear.rotation.z = s * -0.22; earGroup.add(ear);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.08, 0.22, 7), innerEarMat);
      inner.position.y = 0.02; inner.rotation.z = s * -0.22; earGroup.add(inner);
    }

    // ----- Eyes -----
    for (const s of [-1, 1]) {
      const eyeGroup = new THREE.Group(); eyeGroup.position.set(s * 0.62, 0.14, 0.42); eyeGroup.rotation.y = s * -0.5; head.add(eyeGroup);
      eyeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.155, 10, 8), eyeWhiteMat));
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.105, 9, 7), irisMat); iris.position.set(s * 0.04, 0.03, 0.1); eyeGroup.add(iris);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 6), pupilMat); pupil.position.set(s * 0.055, 0.03, 0.13); eyeGroup.add(pupil);
    }

    // ----- Mane (rainbow lobes along neck/back) -----
    const maneSegs: number[][] = [
      [0.22, 3.38, 0.95, 0.22, 0.36, 0.2, 0], [-0.18, 3.42, 0.9, 0.2, 0.33, 0.2, 1],
      [0.08, 3.28, 0.78, 0.26, 0.3, 0.22, 2], [0.26, 2.98, 0.5, 0.3, 0.44, 0.3, 3],
      [-0.22, 2.92, 0.44, 0.26, 0.42, 0.28, 0], [0.18, 2.76, 0.32, 0.32, 0.42, 0.32, 4],
      [-0.2, 2.68, 0.28, 0.28, 0.4, 0.28, 1], [0.32, 2.5, 0.05, 0.34, 0.52, 0.36, 5],
      [-0.28, 2.44, 0.02, 0.3, 0.5, 0.33, 2], [0.24, 2.28, -0.1, 0.32, 0.54, 0.38, 0],
      [-0.26, 2.22, -0.07, 0.28, 0.52, 0.34, 3], [0.36, 2.02, -0.14, 0.38, 0.56, 0.4, 4],
      [-0.32, 1.96, -0.11, 0.34, 0.54, 0.38, 1], [0.28, 1.8, -0.2, 0.34, 0.52, 0.42, 5],
      [-0.3, 1.74, -0.17, 0.3, 0.5, 0.38, 2]
    ];
    for (const sd of maneSegs) {
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.3, 9, 7), maneMats[sd[6]]);
      lobe.scale.set(sd[3] / 0.3, sd[4] / 0.3, sd[5] / 0.3); lobe.position.set(sd[0], sd[1], sd[2]);
      model.add(lobe); this.uniManeLobes.push(lobe);
    }

    // ----- Tail (cascade of color) -----
    const tailRoot = new THREE.Group(); tailRoot.position.set(0, 1.05, -1.08); model.add(tailRoot);
    const tailSegs: number[][] = [
      [0, 0.35, 0, 0.52, 0.62, 0.46, 0], [0.3, 0.15, 0.06, 0.4, 0.56, 0.38, 1],
      [-0.3, 0.12, 0.04, 0.36, 0.54, 0.36, 2], [0.2, -0.15, 0.05, 0.34, 0.62, 0.34, 3],
      [-0.22, -0.12, 0.02, 0.3, 0.6, 0.32, 4], [0.1, -0.42, 0.06, 0.28, 0.56, 0.3, 5],
      [-0.12, -0.4, 0.01, 0.26, 0.52, 0.28, 0], [0, -0.62, 0.04, 0.24, 0.48, 0.26, 1],
      [0.38, 0.52, 0.1, 0.42, 0.44, 0.38, 2], [-0.34, 0.5, 0.08, 0.38, 0.42, 0.34, 5],
      [0.05, 0.72, 0.06, 0.3, 0.35, 0.3, 3]
    ];
    for (const td of tailSegs) {
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.3, 9, 7), maneMats[td[6]]);
      lobe.scale.set(td[3] / 0.3, td[4] / 0.3, td[5] / 0.3); lobe.position.set(td[0], td[1], td[2]);
      tailRoot.add(lobe); this.uniTailLobes.push(lobe);
    }

    // ----- Legs (upper + knee + lower + hoof) -----
    const legDefs = [[0.52, 1.05, -0.28], [-0.52, 1.05, -0.28], [0.48, 1.05, 0.52], [-0.48, 1.05, 0.52]];
    for (const ld of legDefs) {
      const lg = new THREE.Group(); lg.position.set(ld[0], ld[1], ld[2]); model.add(lg); this.uniLegs.push(lg);
      const up = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.82, 8), bodyMat); up.position.y = -0.41; lg.add(up);
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.135, 8, 7), bodyMat); kn.position.y = -0.85; lg.add(kn);
      const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.10, 0.75, 8), bodyMat); lo.position.y = -1.3; lg.add(lo);
      const hf = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.13, 0.16, 9), hoofMat); hf.position.y = -1.72; lg.add(hf);
    }

    // ----- Wings -----
    this.buildUnicornWings(model);

    // ----- Magic glow light -----
    this.uniMagicLight = new THREE.PointLight(new THREE.Color(1.0, 0.55, 1.0), 8.0, 12);
    this.uniMagicLight.position.set(0, 2.0, 0); model.add(this.uniMagicLight);
  }

  private buildUnicornWings(model: THREE.Group): void {
    const wingMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.97, 0.93, 1.0), roughness: 0.22, metalness: 0.04, emissive: new THREE.Color(0.92, 0.82, 1.0), emissiveIntensity: 0.12, side: THREE.DoubleSide });
    const featherMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.99, 0.96, 1.0), roughness: 0.28, emissive: new THREE.Color(1.0, 0.88, 1.0), emissiveIntensity: 0.08, side: THREE.DoubleSide });

    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 1.12, 1.55, 0.08);
      model.add(pivot);
      if (side === -1) this.uniWingL = pivot; else this.uniWingR = pivot;

      const wingMain = new THREE.Mesh(new THREE.SphereGeometry(1.0, 14, 10), wingMat);
      wingMain.scale.set(1.25, 0.065, 0.82); wingMain.position.set(side * 1.22, 0.0, 0.15);
      pivot.add(wingMain);

      // 5 primary feathers (trailing edge)
      for (let f = 0; f < 5; f++) {
        const feather = new THREE.Mesh(new THREE.SphereGeometry(0.5, 7, 5), featherMat);
        feather.scale.set(0.065, 0.13, 0.82 - f * 0.06);
        feather.position.set(side * 0.08, -0.38 - f * 0.06, side * (0.55 + f * 0.38));
        feather.rotation.y = side * THREE.MathUtils.degToRad(4.0 + f * 3.5);
        pivot.add(feather);
      }
      // 3 secondary feathers (inner)
      for (let f = 0; f < 3; f++) {
        const feather = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 5), featherMat);
        feather.scale.set(0.065, 0.11, 0.58 - f * 0.05);
        feather.position.set(0.0, -0.58, side * (0.28 + f * 0.26));
        pivot.add(feather);
      }
    }
  }

  // General Update loop
  public update(delta: number, boundarySize: number): void {
    if (this.level === 1 || this.level === 4) {
      this.updateTerrestrial(delta, boundarySize);
    } else {
      this.update6DOF(delta, boundarySize);
    }

    // Tick animations
    this.animTime += delta;
    this.animateCharacter(delta);
  }

  // Terrestrial updates (Prairie, Swamp)
  private updateTerrestrial(delta: number, boundarySize: number): void {
    // SPACE / W to move forward, S to move back
    let inputY = 0;
    if (this.keys["space"] || this.keys["w"]) inputY = 1;
    else if (this.keys["s"]) inputY = -1;

    // Rotate player mesh with A / D
    if (this.keys["a"]) {
      this.mesh.rotation.y += this.turnSpeed * delta;
    }
    if (this.keys["d"]) {
      this.mesh.rotation.y -= this.turnSpeed * delta;
    }

    // Direction vector of the player
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(this.mesh.quaternion);

    // Update position
    this.mesh.position.addScaledVector(direction, inputY * this.maxSpeed * delta);
    
    // Clamp to boundaries
    const half = boundarySize / 2 - 2;
    this.mesh.position.x = Math.max(-half, Math.min(half, this.mesh.position.x));
    this.mesh.position.z = Math.max(-half, Math.min(half, this.mesh.position.z));

    // Steps audio trigger
    const moving = inputY !== 0;
    const soundPath = this.level === 4 ? `${ASSET_BASE}/samples/steps-mud.mp3` : `${ASSET_BASE}/samples/steps.mp3`;
    if (moving) {
      this.audio.startLoop("steps", soundPath, 0.4);
    } else {
      this.audio.stopLoop("steps");
    }
  }

  // 6DOF updates (Ocean, Cosmos, Clouds)
  private update6DOF(delta: number, boundarySize: number): void {
    // Pitch (W/S) — Rotate on local X axis
    if (this.keys["w"]) {
      this.mesh.rotateOnAxis(new THREE.Vector3(1, 0, 0), this.pitchSpeed * delta);
    }
    if (this.keys["s"]) {
      this.mesh.rotateOnAxis(new THREE.Vector3(1, 0, 0), -this.pitchSpeed * delta);
    }

    // Yaw (A/D) — Rotate on local Y axis
    if (this.keys["a"]) {
      this.mesh.rotateOnAxis(new THREE.Vector3(0, 1, 0), this.yawSpeed * delta);
    }
    if (this.keys["d"]) {
      this.mesh.rotateOnAxis(new THREE.Vector3(0, 1, 0), -this.yawSpeed * delta);
    }

    // Roll (Q/E) — Rotate on local Z axis (Inverted to user preference)
    if (this.keys["q"]) {
      this.mesh.rotateOnAxis(new THREE.Vector3(0, 0, 1), -this.rollSpeed * delta);
    }
    if (this.keys["e"]) {
      this.mesh.rotateOnAxis(new THREE.Vector3(0, 0, 1), this.rollSpeed * delta);
    }

    // Space: Propulsion forward
    const propulsionActive = this.keys["space"];
    const activeMaxSpeed = (this.level === 2 || this.level === 3) ? this.maxSpeed : 6.0;
    const activeAccel = (this.level === 2 || this.level === 3) ? this.acceleration : 8.0;

    if (propulsionActive) {
      this.speed = Math.min(this.speed + activeAccel * delta, activeMaxSpeed);
    } else {
      this.speed *= this.friction;
    }

    // Move forward in local orientation vector
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(this.mesh.quaternion);
    this.mesh.position.addScaledVector(direction, this.speed * delta);

    // Boundaries check
    const half = boundarySize / 2 - 4;
    this.mesh.position.x = Math.max(-half, Math.min(half, this.mesh.position.x));
    this.mesh.position.z = Math.max(-half, Math.min(half, this.mesh.position.z));
    
    // Altitude check
    if (this.level === 2) {
      // Ocean depth boundaries (floor: -49m, ceiling: 15m)
      this.mesh.position.y = Math.max(-48, Math.min(15, this.mesh.position.y));
    } else if (this.level === 3) {
      // Cosmos depth boundaries (-250m to 250m)
      this.mesh.position.y = Math.max(-240, Math.min(240, this.mesh.position.y));
    } else if (this.level === 5) {
      // Clouds altitude band around the cloud field (Godot frame)
      this.mesh.position.y = Math.max(-40, Math.min(120, this.mesh.position.y));
    }

    // Play loop audios
    const moving = propulsionActive || this.speed > 1.0;
    if (this.level === 2) {
      if (moving) this.audio.startLoop("water", `${ASSET_BASE}/samples/sound_of_water_under.mp3`, 0.45);
      else this.audio.stopLoop("water");
    } else if (this.level === 3) {
      const isRotating = this.keys["w"] || this.keys["s"] || this.keys["a"] || this.keys["d"] || this.keys["q"] || this.keys["e"];
      const isThrusting = propulsionActive;
      
      if (isThrusting) {
        this.audio.startLoop("main_thrust", `${ASSET_BASE}/samples/space_ship_main_thrust.mp3`, 0.50);
      } else {
        this.audio.stopLoop("main_thrust");
      }

      if (isRotating) {
        this.audio.startLoop("thrusters", `${ASSET_BASE}/samples/space_ship_thrusters.mp3`, 0.35);
      } else {
        this.audio.stopLoop("thrusters");
      }
    } else if (this.level === 5) {
      if (moving) {
        this.audio.startLoop("wings", `${ASSET_BASE}/samples/unicorn-wings.mp3`, 0.45);
      } else {
        this.audio.stopLoop("wings");
      }
    }
  }

  // Animation cycles
  private animateCharacter(delta: number): void {
    const t = this.animTime * 8; // speed up tick cycles

    // Level 1: Humanoid Glub
    if (this.level === 1 && this.bodyMesh) {
      const isMoving = this.keys["space"] || this.keys["w"] || this.keys["s"];
      
      if (isMoving) {
        if (this.leftFoot && this.rightFoot && this.leftHand && this.rightHand) {
          // Feet Swing (inverted Z swing sign because +Z is forward in Three.js)
          const lfLift = Math.max(0, Math.sin(t));
          const lfZ = -Math.cos(t) * 0.6; // stride_length = 0.6
          this.leftFoot.position.set(-0.6, 0.3 + lfLift * 0.5, lfZ);
          this.leftFoot.rotation.x = -lfLift * 0.5;

          const rfLift = Math.max(0, Math.sin(t + Math.PI));
          const rfZ = -Math.cos(t + Math.PI) * 0.6;
          this.rightFoot.position.set(0.6, 0.3 + rfLift * 0.5, rfZ);
          this.rightFoot.rotation.x = -rfLift * 0.5;

          // Hands Swing (inverted Z swing sign)
          this.leftHand.position.set(-1.1, 1.5 + Math.cos(t) * 0.2, -Math.sin(t) * 0.4);
          this.rightHand.position.set(1.1, 1.5 + Math.cos(t + Math.PI) * 0.2, -Math.sin(t + Math.PI) * 0.4);

          // Body Bobbing
          this.bodyMesh.position.y = 1.5 + Math.abs(Math.sin(t)) * 0.1;

          // Squash & Stretch
          const squash = 1.0 + Math.abs(Math.sin(t)) * 0.05;
          const stretch = 1.0 - Math.abs(Math.sin(t)) * 0.03;
          this.bodyMesh.scale.set(stretch, squash, stretch);
        }
      } else {
        // Return smoothly to idle neutral position
        if (this.leftFoot && this.rightFoot && this.leftHand && this.rightHand) {
          this.leftFoot.position.lerp(new THREE.Vector3(-0.6, 0.3, 0), 5.0 * delta);
          this.leftFoot.rotation.x = THREE.MathUtils.lerp(this.leftFoot.rotation.x, 0, 5.0 * delta);
          
          this.rightFoot.position.lerp(new THREE.Vector3(0.6, 0.3, 0), 5.0 * delta);
          this.rightFoot.rotation.x = THREE.MathUtils.lerp(this.rightFoot.rotation.x, 0, 5.0 * delta);
          
          this.leftHand.position.lerp(new THREE.Vector3(-1.1, 1.5, 0), 5.0 * delta);
          this.rightHand.position.lerp(new THREE.Vector3(1.1, 1.5, 0), 5.0 * delta);
          
          this.bodyMesh.position.y = THREE.MathUtils.lerp(this.bodyMesh.position.y, 1.5, 5.0 * delta);
          this.bodyMesh.scale.lerp(new THREE.Vector3(1, 1, 1), 5.0 * delta);
        }
      }
    }

    // Level 2: Fish
    if (this.level === 2 && this.bodyMesh) {
      const isAnyInput = this.keys["space"] || this.keys["w"] || this.keys["s"] || this.keys["a"] || this.keys["d"] || this.keys["q"] || this.keys["e"];
      
      // Tail waving: aletes only when moving forward
      if (this.speed > 0.3 && this.tailPivot) {
        const tailAmp = Math.min(this.speed / this.maxSpeed, 0.6) * 0.25; // max amplitude = 0.3
        this.tailPivot.rotation.y = Math.sin(this.animTime * 6.0) * tailAmp;
      } else if (this.tailPivot) {
        this.tailPivot.rotation.y = THREE.MathUtils.lerp(this.tailPivot.rotation.y, 0.0, 3 * delta);
      }

      // Fins rotation: wave faster during input, else sways gently
      if (this.leftFin && this.rightFin) {
        if (isAnyInput || this.speed > 0.3) {
          const finAmp = 0.4;
          this.leftFin.rotation.x = Math.sin(this.animTime * 10.0) * finAmp;
          this.rightFin.rotation.x = Math.sin(this.animTime * 10.0) * finAmp;
        } else {
          // Soft idle fin movement
          this.leftFin.rotation.x = Math.sin(this.animTime * 1.5) * 0.1;
          this.rightFin.rotation.x = Math.sin(this.animTime * 1.5) * 0.1;
        }
      }

      // Body stretch & squash relative to speed
      const stretch = 1.0 + (this.speed / this.maxSpeed) * 0.15;
      const targetZ = stretch * 1.0;
      const targetX = (1.0 / Math.sqrt(stretch)) * 0.6;
      const targetY = (1.0 / Math.sqrt(stretch)) * 0.8;
      this.bodyMesh.scale.z = THREE.MathUtils.lerp(this.bodyMesh.scale.z, targetZ, 5 * delta);
      this.bodyMesh.scale.x = THREE.MathUtils.lerp(this.bodyMesh.scale.x, targetX, 5 * delta);
      this.bodyMesh.scale.y = THREE.MathUtils.lerp(this.bodyMesh.scale.y, targetY, 5 * delta);

      // Smooth ocean wave sway (always active but fades if moving)
      const targetSwayZ = isAnyInput ? 0.0 : Math.sin(this.animTime * 0.8) * 0.06;
      const targetSwayX = isAnyInput ? 0.0 : Math.sin(this.animTime * 0.5 + 1.0) * 0.04;
      const targetSwayY = isAnyInput ? 0.0 : Math.sin(this.animTime * 0.6 + 2.0) * 0.15;

      this.bodyMesh.rotation.z = THREE.MathUtils.lerp(this.bodyMesh.rotation.z, targetSwayZ, 3 * delta);
      this.bodyMesh.rotation.x = THREE.MathUtils.lerp(this.bodyMesh.rotation.x, targetSwayX, 3 * delta);
      this.bodyMesh.position.y = THREE.MathUtils.lerp(this.bodyMesh.position.y, targetSwayY, 3 * delta);
    }

    // Level 3: Spaceship
    if (this.level === 3 && this.bodyMesh) {
      const thrustRatio = this.speed / this.maxSpeed;
      const t = this.animTime;

      // 1. Thruster glow: scale.z grows with velocity, with slight high-frequency plasma flicker
      if (this.thrusterGlow) {
        const flicker = 1.0 + Math.sin(t * 30.0) * 0.08;
        const targetScaleZ = THREE.MathUtils.lerp(0.0, 1.8, thrustRatio) * flicker;
        this.thrusterGlow.scale.z = THREE.MathUtils.lerp(this.thrusterGlow.scale.z, targetScaleZ, 6.0 * delta);
        // keep width/height scaling at 1.0 (or slightly flicker them)
        const baseWidth = thrustRatio > 0.05 ? 1.0 + Math.sin(t * 40.0) * 0.05 : 0.0;
        this.thrusterGlow.scale.x = THREE.MathUtils.lerp(this.thrusterGlow.scale.x, baseWidth, 6.0 * delta);
        this.thrusterGlow.scale.y = THREE.MathUtils.lerp(this.thrusterGlow.scale.y, baseWidth, 6.0 * delta);
      }

      // 2. Engine point light intensity: scales up with thrust
      if (this.engineLight) {
        const targetIntensity = thrustRatio * 3.0;
        this.engineLight.intensity = THREE.MathUtils.lerp(this.engineLight.intensity, targetIntensity, 6.0 * delta);
      }

      // 3. Wings: tilt with yaw (A/D)
      let yawInput = 0.0;
      if (this.keys["a"]) yawInput = 1.0;
      else if (this.keys["d"]) yawInput = -1.0;

      if (this.wingLeft && this.wingRight) {
        // Left wing angle
        const targetWingL = Math.PI / 2.2 + yawInput * 0.3;
        this.wingLeft.rotation.z = THREE.MathUtils.lerp(this.wingLeft.rotation.z, targetWingL, 4.0 * delta);
        
        // Right wing angle
        const targetWingR = -Math.PI / 2.2 + yawInput * 0.3;
        this.wingRight.rotation.z = THREE.MathUtils.lerp(this.wingRight.rotation.z, targetWingR, 4.0 * delta);
      }

      // 4. Smooth space drift: idle bobbing on rotations and Y position
      const targetDriftZ = Math.sin(t * 0.5) * 0.04;
      const targetDriftX = Math.sin(t * 0.35 + 1.0) * 0.03;
      const targetDriftY = Math.sin(t * 0.4 + 2.0) * 0.12;

      // We lerp the base rotations and offset position
      this.bodyMesh.rotation.z = THREE.MathUtils.lerp(this.bodyMesh.rotation.z, targetDriftZ, 2.0 * delta);
      this.bodyMesh.rotation.x = THREE.MathUtils.lerp(this.bodyMesh.rotation.x, targetDriftX, 2.0 * delta);
      this.bodyMesh.position.y = THREE.MathUtils.lerp(this.bodyMesh.position.y, targetDriftY, 2.0 * delta);

      // 5. Warp stretch: body stretches slightly with speed
      const stretch = 1.0 + thrustRatio * 0.1;
      this.bodyMesh.scale.z = THREE.MathUtils.lerp(this.bodyMesh.scale.z, stretch, 5.0 * delta);
      this.bodyMesh.scale.x = THREE.MathUtils.lerp(this.bodyMesh.scale.x, 1.0, 5.0 * delta);
      this.bodyMesh.scale.y = THREE.MathUtils.lerp(this.bodyMesh.scale.y, 1.0, 5.0 * delta);
    }

    // Level 4: Crocodile (detailed)
    if (this.level === 4 && this.crocModel) {
      const tt = this.animTime;
      const walk = tt * 10.0;
      const isMoving = this.keys["space"] || this.keys["w"] || this.keys["s"];

      if (isMoving) {
        // Legs alternate as diagonal pairs (0&3 / 1&2)
        if (this.crocLegs.length === 4) {
          this.crocLegs[0].rotation.x = Math.sin(walk) * 0.5;
          this.crocLegs[1].rotation.x = Math.sin(walk + Math.PI) * 0.5;
          this.crocLegs[2].rotation.x = Math.sin(walk + Math.PI) * 0.5;
          this.crocLegs[3].rotation.x = Math.sin(walk) * 0.5;
        }
        for (let i = 0; i < this.crocTail.length; i++) {
          this.crocTail[i].rotation.y = Math.sin(walk * 0.8 - i * 0.6) * 0.3;
        }
        this.crocModel.position.y = Math.abs(Math.sin(walk)) * 0.1;
        if (this.crocBody) {
          const squash = 1.0 + Math.abs(Math.sin(walk)) * 0.04;
          const squeeze = 1.0 - Math.abs(Math.sin(walk)) * 0.02;
          this.crocBody.scale.lerp(new THREE.Vector3(squeeze, squash, squeeze), 8.0 * delta);
        }
        if (this.crocHead) this.crocHead.rotation.x = THREE.MathUtils.lerp(this.crocHead.rotation.x, Math.sin(walk * 0.5) * 0.06, 6.0 * delta);
      } else {
        for (const lg of this.crocLegs) lg.rotation.x = THREE.MathUtils.lerp(lg.rotation.x, 0, 5.0 * delta);
        for (let i = 0; i < this.crocTail.length; i++) this.crocTail[i].rotation.y = Math.sin(tt * 4.0 - i * 0.6) * 0.1;
        this.crocModel.position.y = THREE.MathUtils.lerp(this.crocModel.position.y, 0, 5.0 * delta);
        if (this.crocBody) {
          const breath = Math.sin(tt * 1.8) * 0.022;
          this.crocBody.scale.lerp(new THREE.Vector3(1.0, 1.0 + breath, 1.0), 2.5 * delta);
        }
        if (this.crocHead) this.crocHead.rotation.x = THREE.MathUtils.lerp(this.crocHead.rotation.x, 0, 4.0 * delta);
      }

      this.updateCrocBlink(delta);
    }

    // Level 5: Unicorn (detailed pegasus)
    if (this.level === 5 && this.unicornModel) {
      const tt = this.animTime;
      const thrustRatio = Math.min(this.speed / 6.0, 1.0);

      // Horn glow pulse
      if (this.uniHornGlow) {
        const m = this.uniHornGlow.material as THREE.MeshBasicMaterial;
        m.opacity = 0.6 + Math.abs(Math.sin(tt * 4.0)) * 0.4;
        this.uniHornGlow.scale.setScalar(0.9 + Math.sin(tt * 4.0) * 0.25);
      }

      // Magic light flicker
      if (this.uniMagicLight) {
        this.uniMagicLight.intensity = 6.0 + Math.sin(tt * 2.5) * 3.0;
      }

      // Wings flap (faster while propelling)
      if (this.uniWingL && this.uniWingR) {
        const wingSpeed = 1.4 + thrustRatio * 0.6;
        const wingAmp = 0.24 + thrustRatio * 0.08;
        const flap = Math.sin(tt * wingSpeed) * wingAmp;
        this.uniWingL.rotation.z = flap;
        this.uniWingR.rotation.z = -flap;
      }

      if (thrustRatio > 0.15) {
        // Gentle gallop while flying
        const gallopSpeed = 3.5 + thrustRatio * 2.0;
        const phases = [0.0, Math.PI, Math.PI * 0.5, Math.PI * 1.5];
        for (let i = 0; i < this.uniLegs.length; i++) {
          this.uniLegs[i].rotation.x = Math.sin(tt * gallopSpeed + phases[i]) * 0.25 * thrustRatio;
        }
        for (let i = 0; i < this.uniTailLobes.length; i++) {
          this.uniTailLobes[i].rotation.x = THREE.MathUtils.lerp(this.uniTailLobes[i].rotation.x,
            -0.3 * thrustRatio + Math.sin(tt * 5.0 + i * 0.4) * 0.18 * thrustRatio, 4.0 * delta);
          this.uniTailLobes[i].rotation.z = Math.sin(tt * 4.0 + i * 0.3) * 0.12;
        }
        for (let i = 0; i < this.uniManeLobes.length; i++) {
          this.uniManeLobes[i].rotation.x = THREE.MathUtils.lerp(this.uniManeLobes[i].rotation.x,
            0.18 * thrustRatio + Math.sin(tt * 5.0 + i * 0.3) * 0.08 * thrustRatio, 4.0 * delta);
        }
        this.unicornModel.position.y = THREE.MathUtils.lerp(this.unicornModel.position.y, 0, 3.0 * delta);
        this.unicornModel.rotation.z = THREE.MathUtils.lerp(this.unicornModel.rotation.z, 0, 2.0 * delta);
      } else {
        // Ethereal hover at rest
        this.unicornModel.position.y = THREE.MathUtils.lerp(this.unicornModel.position.y, Math.sin(tt * 0.9) * 0.13, 3.0 * delta);
        this.unicornModel.rotation.z = THREE.MathUtils.lerp(this.unicornModel.rotation.z, Math.sin(tt * 0.6) * 0.022, 2.0 * delta);
        for (let i = 0; i < this.uniLegs.length; i++) {
          this.uniLegs[i].rotation.x = THREE.MathUtils.lerp(this.uniLegs[i].rotation.x, 0, 5.0 * delta);
        }
        for (let i = 0; i < this.uniTailLobes.length; i++) {
          this.uniTailLobes[i].rotation.z = THREE.MathUtils.lerp(this.uniTailLobes[i].rotation.z, Math.sin(tt * 0.9 + i * 0.35) * 0.13, 3.0 * delta);
          this.uniTailLobes[i].rotation.x = THREE.MathUtils.lerp(this.uniTailLobes[i].rotation.x, Math.sin(tt * 0.65 + i * 0.28) * 0.08, 3.0 * delta);
        }
        for (let i = 0; i < this.uniManeLobes.length; i++) {
          this.uniManeLobes[i].rotation.z = THREE.MathUtils.lerp(this.uniManeLobes[i].rotation.z, Math.sin(tt * 0.75 + i * 0.3) * 0.06, 3.0 * delta);
          this.uniManeLobes[i].rotation.x = THREE.MathUtils.lerp(this.uniManeLobes[i].rotation.x, 0, 3.0 * delta);
        }
      }
    }
  }

  // Crocodile eye blink (independent of movement)
  private updateCrocBlink(delta: number): void {
    if (this.crocBlinkers.length === 0) return;
    if (this.crocBlinkPhase < 0) {
      this.crocBlinkTimer += delta;
      if (this.crocBlinkTimer < this.crocNextBlink) return;
      this.crocBlinkPhase = 0; this.crocBlinkTimer = 0;
    }
    this.crocBlinkPhase += delta / 0.18; // ~0.18s blink
    let openness = 1.0 - 0.92 * Math.sin(Math.min(Math.max(this.crocBlinkPhase, 0), 1) * Math.PI);
    if (this.crocBlinkPhase >= 1.0) {
      this.crocBlinkPhase = -1; openness = 1.0;
      this.crocNextBlink = 2 + Math.random() * 4;
    }
    for (const b of this.crocBlinkers) {
      b.node.scale.set(b.base.x, b.base.y * openness, b.base.z);
    }
  }
}
