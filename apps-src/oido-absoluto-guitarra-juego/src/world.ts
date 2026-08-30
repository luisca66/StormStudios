import * as THREE from "three";
import { generateMaze, type MazeLayout } from "./maze";
import { animateRobot, createRobot, reactRobot, type RobotRig } from "./robot";

type WorldCallbacks = {
  onNodeReached: () => void;
  onPortalEntered: () => void;
};

const STRING_X = [-15, -9, -3, 3, 9, 15];
const NODE_COLORS = [0x74c7c9, 0xd8a64b, 0xcf6d82, 0x8ea4dd, 0xe8d8b5];
const PLAYER_RADIUS = 0.62;

export class GuitarWorld {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, 0.1, 260);
  private clock = new THREE.Clock();
  private player = new THREE.Group();
  private robotRig!: RobotRig;
  private strings: THREE.Mesh[] = [];
  private mazeGroup = new THREE.Group();
  private mazeWalls: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
  private currentMaze: MazeLayout | null = null;
  private target: THREE.Group | null = null;
  private targetHalo: THREE.Mesh | null = null;
  private targetReady = false;
  private portal = new THREE.Group();
  private portalCore!: THREE.Mesh;
  private portalRings: THREE.Mesh[] = [];
  private gateUnlocked = false;
  private portalFocusTime = 0;
  private gameplayEnabled = false;
  private movementEnabled = false;
  private yaw = 0;
  private speed = 0;
  private keys = new Set<string>();
  private virtualKeys = new Set<string>();
  private disposed = false;
  private reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(canvas: HTMLCanvasElement, private callbacks: WorldCallbacks) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color(0x080e10);
    this.scene.fog = new THREE.FogExp2(0x080e10, 0.0125);

    this.buildLights();
    this.buildInstrumentWorld();
    this.buildPlayer();
    this.buildPortal();
    this.resetPlayer();

    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
    window.addEventListener("blur", this.clearKeys);
    this.animate();
  }

  setGameplay(enabled: boolean) {
    this.gameplayEnabled = enabled;
    this.movementEnabled = enabled;
    this.player.visible = enabled;
    if (!enabled) {
      this.removeTarget();
      this.removeMaze();
      this.lockPortal();
    }
  }

  setMovement(enabled: boolean) {
    this.movementEnabled = enabled;
    if (!enabled) this.speed = 0;
  }

  setVirtualControl(control: string, active: boolean) {
    if (active) this.virtualKeys.add(control);
    else this.virtualKeys.delete(control);
  }

  spawnNode() {
    this.removeTarget();
    const nextStart = this.currentMaze?.goal;
    const preservedPosition = nextStart ? this.player.position.clone() : null;
    const maze = generateMaze(nextStart);
    this.buildMaze(maze, preservedPosition ?? undefined);
    const node = new THREE.Group();
    const color = NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)];
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.15,
      metalness: 0.15,
      roughness: 0.28,
    });

    const shape = Math.floor(Math.random() * 3);
    const core = shape === 0
      ? new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), material)
      : shape === 1
        ? new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 0), material)
        : new THREE.Mesh(new THREE.TorusKnotGeometry(0.48, 0.16, 48, 8), material);
    core.castShadow = true;
    node.add(core);

    this.targetHalo = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.04, 8, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.62 }),
    );
    this.targetHalo.rotation.x = Math.PI / 2;
    node.add(this.targetHalo);
    node.add(new THREE.PointLight(color, 8, 13, 2));

    this.target = node;
    this.target.position.set(maze.goalPosition.x, 2.4, maze.goalPosition.z);
    this.target.rotation.set(Math.random(), Math.random(), Math.random());
    this.scene.add(node);
    this.targetReady = true;
    if (preservedPosition) {
      this.player.position.copy(preservedPosition);
      this.speed = 0;
    } else {
      this.resetPlayer();
    }
  }

  resolveCorrect() {
    if (!this.target) return;
    reactRobot(this.robotRig, true);
    this.pulseStrings();
    const target = this.target;
    target.scale.setScalar(1.7);
    target.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.emissiveIntensity = 3;
      }
    });
    window.setTimeout(() => {
      if (this.target === target) this.removeTarget();
    }, 420);
  }

  resolveWrong() {
    reactRobot(this.robotRig, false);
    this.spawnNode();
  }

  unlockPortal() {
    this.gateUnlocked = true;
    this.setMovement(false);
    this.removeMaze();
    this.portalFocusTime = this.reducedMotion ? 0.45 : 2.35;
    this.portalCore.visible = true;
    this.portalCore.scale.setScalar(0.01);
    this.portalRings.forEach((ring) => {
      const material = ring.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 1.8;
    });
  }

  lockPortal() {
    this.gateUnlocked = false;
    this.portalFocusTime = 0;
    if (this.portalCore) {
      this.portalCore.visible = false;
      this.portalCore.scale.setScalar(1);
    }
    this.portalRings.forEach((ring) => {
      const material = ring.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.16;
    });
  }

  resetPlayer() {
    const start = this.currentMaze?.startPosition ?? { x: 0, z: 53 };
    this.player.position.set(start.x, 1.1, start.z);
    this.yaw = 0;
    this.player.rotation.y = 0;
    this.speed = 0;
  }

  debugReachNode() {
    if (!this.target || !this.targetReady) return;
    this.targetReady = false;
    this.speed = 0;
    this.callbacks.onNodeReached();
  }

  debugEnterPortal() {
    if (!this.gateUnlocked) return;
    this.gateUnlocked = false;
    this.callbacks.onPortalEntered();
  }

  getTelemetry() {
    const destination = this.gateUnlocked ? this.portal.position : this.target?.position;
    if (!destination) return { distance: 0, bearing: 0, destination: "node" as const, routeSeconds: 0 };
    const dx = destination.x - this.player.position.x;
    const dz = destination.z - this.player.position.z;
    const absoluteBearing = Math.atan2(dx, -dz);
    let bearing = absoluteBearing - this.yaw;
    while (bearing > Math.PI) bearing -= Math.PI * 2;
    while (bearing < -Math.PI) bearing += Math.PI * 2;
    return {
      distance: Math.round(Math.hypot(dx, dz)),
      bearing,
      destination: this.gateUnlocked ? "portal" as const : "node" as const,
      routeSeconds: this.currentMaze ? Math.round(this.currentMaze.estimatedSeconds) : 0,
    };
  }

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight(0x8dbbc0, 0x321c18, 1.55));
    const key = new THREE.DirectionalLight(0xf4dcae, 3.2);
    key.position.set(-24, 36, 18);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -70;
    key.shadow.camera.right = 70;
    key.shadow.camera.top = 90;
    key.shadow.camera.bottom = -90;
    this.scene.add(key);
    const edge = new THREE.DirectionalLight(0x477e91, 1.7);
    edge.position.set(30, 12, -50);
    this.scene.add(edge);
  }

  private buildInstrumentWorld() {
    const ebony = new THREE.MeshStandardMaterial({ color: 0x191717, roughness: 0.72, metalness: 0.04 });
    const cedar = new THREE.MeshStandardMaterial({ color: 0x8b4e2e, roughness: 0.76, metalness: 0.02 });
    const cedarTop = new THREE.MeshStandardMaterial({ color: 0xb97443, roughness: 0.82, metalness: 0.01 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xb99858, roughness: 0.32, metalness: 0.78 });

    const voidFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(320, 320),
      new THREE.MeshStandardMaterial({ color: 0x060a0b, roughness: 1 }),
    );
    voidFloor.rotation.x = -Math.PI / 2;
    voidFloor.position.y = -1.2;
    voidFloor.receiveShadow = true;
    this.scene.add(voidFloor);

    const soundboard = new THREE.Mesh(new THREE.CylinderGeometry(31, 31, 1.6, 64), cedarTop);
    soundboard.scale.z = 1.22;
    soundboard.position.set(0, -0.25, -62);
    soundboard.receiveShadow = true;
    this.scene.add(soundboard);

    const waistLeft = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, 1.7, 48), cedar);
    waistLeft.scale.z = 1.1;
    waistLeft.position.set(-12, -0.3, -42);
    this.scene.add(waistLeft);
    const waistRight = waistLeft.clone();
    waistRight.position.x = 12;
    this.scene.add(waistRight);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(36.8, 1.25, 130), ebony);
    neck.position.set(0, 0, 9);
    neck.receiveShadow = true;
    this.scene.add(neck);

    for (let i = 0; i < 18; i += 1) {
      const z = 55 - i * 6.75;
      const fret = new THREE.Mesh(new THREE.BoxGeometry(37, 0.16, 0.2), brass);
      fret.position.set(0, 0.72, z);
      this.scene.add(fret);
      if ([3, 5, 7, 9, 12, 15, 17].includes(i)) {
        const dot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.32, 0.08, 24),
          new THREE.MeshStandardMaterial({ color: 0xe9dfc9, roughness: 0.35 }),
        );
        dot.position.set(i === 12 ? -1.2 : 0, 0.72, z - 3.3);
        if (i === 12) {
          const dot2 = dot.clone();
          dot2.position.x = 1.2;
          this.scene.add(dot2);
        }
        this.scene.add(dot);
      }
    }

    STRING_X.forEach((x, index) => {
      const radius = 0.035 + (5 - index) * 0.012;
      const material = new THREE.MeshStandardMaterial({
        color: index < 3 ? 0xc4a05f : 0xd9e1df,
        emissive: index < 3 ? 0x5e371c : 0x527477,
        emissiveIntensity: 0.08,
        roughness: 0.22,
        metalness: index < 3 ? 0.72 : 0.42,
      });
      const string = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 152, 8), material);
      string.rotation.x = Math.PI / 2;
      string.position.set(x, 0.97, -2);
      this.scene.add(string);
      this.strings.push(string);
    });

    const dustCount = 520;
    const positions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 115;
      positions[i * 3 + 1] = 1 + Math.random() * 34;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 180;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xd8bd83, size: 0.1, transparent: true, opacity: 0.42 })));
  }

  private buildMaze(layout: MazeLayout, clearAt?: THREE.Vector3) {
    this.removeMaze();
    this.currentMaze = layout;
    this.mazeGroup = new THREE.Group();
    this.mazeGroup.name = "Varetaje laberíntico";
    this.mazeWalls = [];

    const wood = new THREE.MeshStandardMaterial({
      color: 0x704127,
      emissive: 0x24110a,
      emissiveIntensity: 0.22,
      roughness: 0.7,
      metalness: 0.03,
    });
    const brass = new THREE.MeshStandardMaterial({
      color: 0xc6a25a,
      emissive: 0x563817,
      emissiveIntensity: 0.45,
      roughness: 0.34,
      metalness: 0.64,
    });

    layout.walls.forEach((wall) => {
      const clearance = PLAYER_RADIUS + 0.22;
      if (clearAt &&
        clearAt.x + clearance > wall.x - wall.width / 2 &&
        clearAt.x - clearance < wall.x + wall.width / 2 &&
        clearAt.z + clearance > wall.z - wall.depth / 2 &&
        clearAt.z - clearance < wall.z + wall.depth / 2
      ) return;

      const panel = new THREE.Mesh(new THREE.BoxGeometry(wall.width, 1.18, wall.depth), wood);
      panel.position.set(wall.x, 1.16, wall.z);
      panel.castShadow = true;
      panel.receiveShadow = true;
      this.mazeGroup.add(panel);

      const inlay = new THREE.Mesh(new THREE.BoxGeometry(wall.width + 0.03, 0.07, wall.depth + 0.03), brass);
      inlay.position.set(wall.x, 1.79, wall.z);
      this.mazeGroup.add(inlay);

      this.mazeWalls.push({
        minX: wall.x - wall.width / 2,
        maxX: wall.x + wall.width / 2,
        minZ: wall.z - wall.depth / 2,
        maxZ: wall.z + wall.depth / 2,
      });
    });

    const entrance = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.92, 32),
      new THREE.MeshBasicMaterial({ color: 0x74c7c9, transparent: true, opacity: 0.66, side: THREE.DoubleSide }),
    );
    entrance.rotation.x = -Math.PI / 2;
    entrance.position.set(layout.startPosition.x, 0.78, layout.startPosition.z);
    this.mazeGroup.add(entrance);

    this.scene.add(this.mazeGroup);
  }

  private removeMaze() {
    this.scene.remove(this.mazeGroup);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.mazeGroup.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      geometries.add(child.geometry);
      const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
      meshMaterials.forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.mazeGroup = new THREE.Group();
    this.mazeWalls = [];
    this.currentMaze = null;
  }

  private buildPlayer() {
    this.robotRig = createRobot();
    this.player = this.robotRig.root;
    this.player.visible = false;
    this.scene.add(this.player);
  }

  private buildPortal() {
    this.portal.position.set(0, 6.8, -70);
    const ringColors = [0xd8a64b, 0x74c7c9, 0xcf6d82];
    [5.2, 4.5, 3.8].forEach((radius, index) => {
      const material = new THREE.MeshStandardMaterial({
        color: ringColors[index],
        emissive: ringColors[index],
        emissiveIntensity: 0.16,
        metalness: 0.45,
        roughness: 0.24,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.16, 12, 64), material);
      ring.rotation.z = index * 0.35;
      this.portal.add(ring);
      this.portalRings.push(ring);
    });
    this.portalCore = new THREE.Mesh(
      new THREE.CircleGeometry(3.55, 64),
      new THREE.MeshBasicMaterial({ color: 0x76cfd1, transparent: true, opacity: 0.48, side: THREE.DoubleSide }),
    );
    this.portalCore.position.z = 0.08;
    this.portalCore.visible = false;
    this.portal.add(this.portalCore);
    this.portal.add(new THREE.PointLight(0x74c7c9, 14, 32, 2));
    this.scene.add(this.portal);
    this.lockPortal();
  }

  private removeTarget() {
    if (!this.target) return;
    this.scene.remove(this.target);
    this.target = null;
    this.targetHalo = null;
    this.targetReady = false;
  }

  private pulseStrings() {
    this.strings.forEach((string, index) => {
      window.setTimeout(() => {
        const material = string.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 2.2;
        window.setTimeout(() => { material.emissiveIntensity = 0.08; }, 380);
      }, index * 55);
    });
  }

  private keyDown = (event: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
    this.keys.add(event.key.toLowerCase());
  };

  private keyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key.toLowerCase());
  };

  private clearKeys = () => {
    this.keys.clear();
    this.virtualKeys.clear();
  };

  private pressed(...keys: string[]) {
    return keys.some((key) => this.keys.has(key) || this.virtualKeys.has(key));
  }

  private resize = () => {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  };

  private animate = () => {
    if (this.disposed) return;
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.getElapsedTime();

    if (this.gameplayEnabled) {
      this.updatePlayer(delta);
      animateRobot(this.robotRig, time, this.speed, delta);
      this.updateTarget(time, delta);
      this.updatePortal(time, delta);
      if (this.portalFocusTime > 0) {
        this.portalFocusTime = Math.max(0, this.portalFocusTime - delta);
        if (this.portalFocusTime === 0 && this.gateUnlocked) this.setMovement(true);
      }
      this.updateCamera(delta);
    } else {
      const orbit = time * 0.055;
      this.camera.position.set(Math.sin(orbit) * 36, 27, 62 + Math.cos(orbit) * 20);
      this.camera.lookAt(0, 0, -18);
    }

    this.renderer.render(this.scene, this.camera);
  };

  private updatePlayer(delta: number) {
    if (this.movementEnabled) {
      const turn = (this.pressed("d", "arrowright", "right") ? 1 : 0) - (this.pressed("a", "arrowleft", "left") ? 1 : 0);
      this.yaw += turn * delta * 1.75;
      const thrust = (this.pressed("w", "arrowup", " ", "forward") ? 1 : 0) - (this.pressed("s", "arrowdown", "back") ? 1 : 0);
      const targetSpeed = thrust * (thrust > 0 ? 8.8 : 4.2);
      this.speed = THREE.MathUtils.damp(this.speed, targetSpeed, 5.5, delta);
      const direction = new THREE.Vector3(Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const movement = direction.multiplyScalar(this.speed * delta);
      this.movePlayer(movement.x, movement.z);
      this.player.rotation.y = -this.yaw;
      this.player.position.y = 1.1 + Math.sin(this.clock.elapsedTime * 6) * Math.min(Math.abs(this.speed) / 65, 0.1);
    }

    if (this.target && this.targetReady && this.player.position.distanceTo(this.target.position) < 2.55) {
      this.targetReady = false;
      this.speed = 0;
      this.callbacks.onNodeReached();
    }
    if (this.gateUnlocked && this.player.position.distanceTo(this.portal.position) < 6.2) {
      this.gateUnlocked = false;
      this.callbacks.onPortalEntered();
    }
  }

  private movePlayer(deltaX: number, deltaZ: number) {
    const nextX = this.player.position.x + deltaX;
    if (!this.collides(nextX, this.player.position.z)) this.player.position.x = nextX;
    else this.speed *= 0.42;

    const nextZ = this.player.position.z + deltaZ;
    if (!this.collides(this.player.position.x, nextZ)) this.player.position.z = nextZ;
    else this.speed *= 0.42;
  }

  private collides(x: number, z: number) {
    return this.mazeWalls.some((wall) =>
      x + PLAYER_RADIUS > wall.minX &&
      x - PLAYER_RADIUS < wall.maxX &&
      z + PLAYER_RADIUS > wall.minZ &&
      z - PLAYER_RADIUS < wall.maxZ,
    );
  }

  private updateTarget(time: number, delta: number) {
    if (!this.target) return;
    this.target.position.y = 2.4 + Math.sin(time * 2.3) * 0.24;
    this.target.rotation.y += delta * 0.8;
    this.target.rotation.x += delta * 0.18;
    if (this.targetHalo) {
      const pulse = 1 + Math.sin(time * 3.4) * 0.09;
      this.targetHalo.scale.setScalar(pulse);
    }
  }

  private updatePortal(time: number, delta: number) {
    this.portalRings.forEach((ring, index) => {
      ring.rotation.z += delta * (this.gateUnlocked ? 0.36 + index * 0.16 : 0.035);
    });
    if (this.gateUnlocked && this.portalCore.scale.x < 1) {
      const next = Math.min(1, this.portalCore.scale.x + delta * 1.45);
      this.portalCore.scale.setScalar(next);
    }
    if (!this.reducedMotion) this.portal.position.y = 6.8 + Math.sin(time * 0.85) * 0.18;
  }

  private updateCamera(delta: number) {
    if (this.portalFocusTime > 0) {
      const desired = this.portal.position.clone().add(new THREE.Vector3(0, 4.5, 14));
      this.camera.position.lerp(desired, 1 - Math.exp(-delta * 2.8));
      this.camera.lookAt(this.portal.position);
      return;
    }
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const behind = forward.clone().multiplyScalar(-11.8);
    const desired = this.player.position.clone().add(behind).add(new THREE.Vector3(0, 8.8, 0));
    this.camera.position.lerp(desired, 1 - Math.exp(-delta * 5.2));
    const look = this.player.position.clone().add(forward.multiplyScalar(5.4)).add(new THREE.Vector3(0, 0.9, 0));
    this.camera.lookAt(look);
  }
}
