export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export function createExplosion(x: number, y: number, level: number): Particle[] {
  const particles: Particle[] = [];
  const count = 30 + Math.floor(Math.random() * 20);
  
  let colors = ["#00ffcc", "#00ff66", "#ffffff"];
  if (level === 2) colors = ["#00a2ff", "#00ffff", "#ffffff"];
  if (level === 3) colors = ["#ff5500", "#ffaa00", "#ffffbb"];
  if (level === 4) colors = ["#ff003c", "#ffaa00", "#00ff3c"];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 4.5;
    const maxLife = 30 + Math.floor(Math.random() * 30);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 4,
      alpha: 1.0,
      life: maxLife,
      maxLife
    });
  }
  return particles;
}

export function drawLevelBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  level: number,
  time: number,
  turretAngle = 0
) {
  if (level === 1) {
    // LEVEL 1: Neon Grid (Cenital Tank)
    ctx.fillStyle = "#090d14";
    ctx.fillRect(0, 0, width, height);

    // Draw cyber grid lines
    ctx.strokeStyle = "rgba(0, 255, 204, 0.08)";
    ctx.lineWidth = 1;
    const gridSpacing = 40;
    const scroll = (time * 20) % gridSpacing;

    for (let x = 0; x < width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = scroll; y < height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Side towers
    ctx.fillStyle = "rgba(10, 18, 25, 0.6)";
    ctx.strokeStyle = "rgba(0, 255, 204, 0.15)";
    ctx.fillRect(10, 50, 40, 120);
    ctx.strokeRect(10, 50, 40, 120);
    ctx.fillRect(width - 50, 80, 40, 100);
    ctx.strokeRect(width - 50, 80, 40, 100);

  } else if (level === 2) {
    // LEVEL 2: Ocean waves (Cenital Warship)
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#020f26");
    grad.addColorStop(1, "#08264d");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Draw water wave ripples
    ctx.strokeStyle = "rgba(0, 162, 255, 0.15)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const y = (height / 6) * i + Math.sin(time + i) * 12;
      ctx.beginPath();
      for (let x = 0; x < width + 10; x += 20) {
        const offset = Math.sin(x * 0.01 + time * 1.5 + i) * 6;
        if (x === 0) ctx.moveTo(x, y + offset);
        else ctx.lineTo(x, y + offset);
      }
      ctx.stroke();
    }

  } else if (level === 3) {
    // LEVEL 3: Castle Grass (Catapult)
    ctx.fillStyle = "#1e2215"; // Dark moss green
    ctx.fillRect(0, 0, width, height);

    // Draw dirt path/grid
    ctx.strokeStyle = "rgba(139, 115, 85, 0.08)";
    ctx.lineWidth = 2;
    for (let i = 0; i < width; i += 60) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }

    // Draw stone wall pillars on sides
    ctx.fillStyle = "#2d2d2a";
    ctx.strokeStyle = "#403f3b";
    ctx.lineWidth = 3;
    // Left wall blocks
    ctx.fillRect(0, 0, 35, height);
    ctx.strokeRect(0, -5, 35, height + 10);
    // Right wall blocks
    ctx.fillRect(width - 35, 0, 35, height);
    ctx.strokeRect(width - 35, -5, 35, height + 10);

  } else if (level === 4) {
    // LEVEL 4: FPS Visor Space
    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height / 2);
    skyGrad.addColorStop(0, "#04050c");
    skyGrad.addColorStop(1, "#0d0a1b");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height / 2);

    // Ground
    const groundGrad = ctx.createLinearGradient(0, height / 2, 0, height);
    groundGrad.addColorStop(0, "#0b0610");
    groundGrad.addColorStop(1, "#040206");
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, height / 2, width, height / 2);

    // Horizon line glow
    ctx.strokeStyle = "rgba(223, 115, 255, 0.34)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // 3D Perspective project helper (safely clipped to depth 2.0 to prevent division by zero / coordinate explosion)
    const project3D = (x: number, y: number, z: number) => {
      const cameraY = 1.5;
      const cosA = Math.cos(turretAngle);
      const sinA = Math.sin(turretAngle);
      const rx = x * cosA - z * sinA;
      const rz = x * sinA + z * cosA;
      const fov = 350;
      const px = (rx * fov) / Math.max(2.0, rz) + width / 2;
      const py = (-(y - cameraY) * fov) / Math.max(2.0, rz) + height / 2;
      return { x: px, y: py, rz };
    };

    const drawWorldPolyline = (points: Array<{ x: number; y: number; z: number }>) => {
      let previous: ReturnType<typeof project3D> | null = null;
      for (const point of points) {
        const projected = project3D(point.x, point.y, point.z);
        if (previous && previous.rz > 2.0 && projected.rz > 2.0) {
          ctx.beginPath();
          ctx.moveTo(previous.x, previous.y);
          ctx.lineTo(projected.x, projected.y);
          ctx.stroke();
        }
        previous = projected;
      }
    };

    // Ground grid lines: stronger than the other levels so aiming has a stable frame of reference.
    ctx.strokeStyle = "rgba(103, 214, 255, 0.12)";
    ctx.lineWidth = 1.1;

    // Transverse horizontal grid lines
    for (let zVal = 6; zVal <= 90; zVal += 8) {
      const points = [];
      for (let xVal = -80; xVal <= 80; xVal += 8) {
        points.push({ x: xVal, y: 0, z: zVal });
      }
      drawWorldPolyline(points);
    }

    // Longitudinal grid lines converging to horizon
    for (let xVal = -40; xVal <= 40; xVal += 10) {
      const points = [];
      for (let zVal = 5; zVal <= 90; zVal += 5) {
        points.push({ x: xVal, y: 0, z: zVal });
      }
      ctx.strokeStyle = xVal === 0 ? "rgba(122, 240, 201, 0.28)" : "rgba(103, 214, 255, 0.12)";
      ctx.lineWidth = xVal === 0 ? 1.8 : 1.1;
      drawWorldPolyline(points);
    }

    // Draw reference pillars / obelisks
    const pillars = [
      { x: -7, z: 10 }, { x: 7, z: 10 },
      { x: -12, z: 18 }, { x: 12, z: 18 },
      { x: -18, z: 30 }, { x: 18, z: 30 },
      { x: -28, z: 48 }, { x: 28, z: 48 }
    ];

    // Sort pillars by depth so we draw back-to-front
    pillars.sort((a, b) => b.z - a.z);

    for (const pil of pillars) {
      const pBase = project3D(pil.x, 0, pil.z);
      const pTop = project3D(pil.x, 5.0, pil.z); // 5.0 units high

      if (pBase.rz > 2.0) {
        const wBase = 180 / pBase.rz;
        const wTop = 100 / pBase.rz;

        // Draw obelisk trapezoid
        ctx.fillStyle = "rgba(78, 58, 128, 0.34)";
        ctx.strokeStyle = "rgba(223, 115, 255, 0.68)";
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.moveTo(pBase.x - wBase/2, pBase.y);
        ctx.lineTo(pTop.x - wTop/2, pTop.y);
        ctx.lineTo(pTop.x + wTop/2, pTop.y);
        ctx.lineTo(pBase.x + wBase/2, pBase.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing crystal cap
        ctx.fillStyle = "#00ffcc";
        ctx.shadowColor = "#00ffcc";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pTop.x, pTop.y, 40 / pBase.rz, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      }
    }
  }
}

export function drawLevelPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  level: number,
  charge: number,
  time: number,
  aimAngle = 0
) {
  ctx.save();
  ctx.translate(x, y);

  if (level === 1) {
    // LEVEL 1: Cyber Tank
    ctx.rotate(aimAngle - Math.PI / 2);

    // Treads
    ctx.fillStyle = "#161b22";
    ctx.fillRect(-22, -18, 10, 36);
    ctx.fillRect(12, -18, 10, 36);

    // Body
    ctx.fillStyle = "#21262d";
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-15, -15, 30, 30, 6);
    ctx.fill();
    ctx.stroke();

    // Turret cap
    ctx.fillStyle = "#00ffcc";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Barrel
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 22);
    ctx.stroke();

    // Barrel charge indicator
    if (charge > 0) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 22 * charge);
      ctx.stroke();
    }

  } else if (level === 2) {
    // LEVEL 2: Naval Warship
    ctx.rotate(aimAngle - Math.PI / 2);

    // Ship hull
    ctx.fillStyle = "#343d46";
    ctx.strokeStyle = "#00a2ff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 28); // Bow
    ctx.lineTo(14, 10);
    ctx.lineTo(12, -26); // Stern
    ctx.lineTo(-12, -26);
    ctx.lineTo(-14, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bridge deck
    ctx.fillStyle = "#4f5b66";
    ctx.fillRect(-6, -10, 12, 18);

    // Radar antenna rotating
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(time * 3.5) * 8, Math.sin(time * 3.5) * 2);
    ctx.stroke();

    // Gun Turret
    ctx.save();
    ctx.translate(0, 12);
    ctx.rotate(Math.sin(time * 0.8) * 0.4);
    ctx.fillStyle = "#232b35";
    ctx.fillRect(-5, -5, 10, 10);
    ctx.strokeStyle = "#00a2ff";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-5, -5, 10, 10);
    // Double barrel
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-3, 5, 2, 8 * (0.3 + 0.7 * charge));
    ctx.fillRect(1, 5, 2, 8 * (0.3 + 0.7 * charge));
    ctx.restore();

  } else if (level === 3) {
    // LEVEL 3: Wooden Catapult
    ctx.rotate(aimAngle - Math.PI / 2);

    // Frame
    ctx.fillStyle = "#5c4033"; // Wood brown
    ctx.strokeStyle = "#ffaa00";
    ctx.lineWidth = 2;
    ctx.fillRect(-18, -12, 6, 32);
    ctx.strokeRect(-18, -12, 6, 32);
    ctx.fillRect(12, -12, 6, 32);
    ctx.strokeRect(12, -12, 6, 32);
    ctx.fillRect(-14, -2, 28, 6);
    ctx.strokeRect(-14, -2, 28, 6);

    // Wheels
    ctx.fillStyle = "#2b1d0c";
    ctx.beginPath();
    ctx.arc(-20, -8, 6, 0, Math.PI*2);
    ctx.arc(20, -8, 6, 0, Math.PI*2);
    ctx.arc(-20, 14, 6, 0, Math.PI*2);
    ctx.arc(20, 14, 6, 0, Math.PI*2);
    ctx.fill();

    // Arm (catapult lever)
    ctx.save();
    // Arm rocks slightly back as charge increases
    ctx.translate(0, 8);
    ctx.rotate(charge * -0.25);
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(-3, -24, 6, 26);
    // Bucket/Spoon with glowing red fireball inside
    ctx.fillStyle = charge > 0.8 ? "#ff5500" : "#8b5a2b";
    ctx.beginPath();
    ctx.arc(0, -26, 8, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

  } else {
    // LEVEL 4: FPS Cockpit Overlay (no player rotation needed since camera rotates)

    // Left console
    ctx.fillStyle = "rgba(12, 8, 20, 0.85)";
    ctx.strokeStyle = "#df73ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-x - 10, y + 20);
    ctx.lineTo(-x + 100, y - 60);
    ctx.lineTo(-x + 140, y + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right console
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 20);
    ctx.lineTo(x - 100, y - 60);
    ctx.lineTo(x - 140, y + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Digital readout text on console
    ctx.fillStyle = "#df73ff";
    ctx.font = "bold 11px Courier New";
    ctx.fillText("SYS: ON", -x + 15, y - 10);
    ctx.fillText(`CHARGE: ${Math.round(charge * 100)}%`, -x + 15, y + 5);

    ctx.fillText("WEAPON: ST-4", x - 110, y - 10);
    ctx.fillText(charge >= 1.0 ? "LOCK: READY" : "LOCK: SEARCH", x - 110, y + 5);
  }

  ctx.restore();
}

export function drawLevelEnemy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  level: number,
  label: string,
  intervalLabel: string,
  isDirectionUp: boolean,
  time: number
) {
  ctx.save();
  ctx.translate(x, y);

  // Direction color theme: Up = Red/Cyan, Down = Blue/Teal
  const mainColor = isDirectionUp ? "#ff3b30" : "#007aff";
  const glowColor = isDirectionUp ? "rgba(255, 59, 48, 0.45)" : "rgba(0, 122, 255, 0.45)";

  // Outer glowing ring
  ctx.shadowColor = mainColor;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, size * 1.08 + Math.sin(time * 5.0) * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0; // Reset shadow

  if (level === 1) {
    // LEVEL 1: Alien Drone Orb
    ctx.fillStyle = "#1e222b";
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Floating micro-satellites
    ctx.fillStyle = mainColor;
    const orbitAngle = time * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(orbitAngle) * (size + 8), Math.sin(orbitAngle) * (size + 8), 4, 0, Math.PI*2);
    ctx.fill();

  } else if (level === 2) {
    // LEVEL 2: Submarine capsule
    ctx.fillStyle = "#11263b";
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 1.25, size * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Periscope and propeller
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.7);
    ctx.lineTo(0, -size * 1.1);
    ctx.lineTo(6, -size * 1.1);
    ctx.stroke();

    // Propeller spinning visual
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(size * 1.25, -5);
    ctx.lineTo(size * 1.25, 5);
    ctx.stroke();

  } else if (level === 3) {
    // LEVEL 3: Shield emblem
    ctx.fillStyle = "#2c2117";
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, -size * 0.6);
    ctx.lineTo(size * 0.8, size * 0.5);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.8, size * 0.5);
    ctx.lineTo(-size, -size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Shield inner cross
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -size + 4);
    ctx.lineTo(0, size - 4);
    ctx.moveTo(-size + 4, -size * 0.2);
    ctx.lineTo(size - 4, -size * 0.2);
    ctx.stroke();

  } else {
    // LEVEL 4: FPS incoming sphere
    ctx.fillStyle = "rgba(10, 5, 20, 0.9)";
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Retro visual rings inside the circle
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.6, 0, Math.PI*2);
    ctx.stroke();
  }

  // Draw note label inside enemy
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.round(size * 0.7)}px Outfit, Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Convert standard flat symbols to make them look nice
  const textNote = label.replace(/b/g, "♭").replace(/#/g, "♯");
  ctx.fillText(textNote, 0, -size * 0.12);

  // Draw interval challenge subscript label
  ctx.fillStyle = isDirectionUp ? "#ffc6c3" : "#cbe4ff";
  ctx.font = `bold ${Math.round(size * 0.38)}px Outfit, Inter, sans-serif`;
  const arrowSym = isDirectionUp ? "↑" : "↓";
  ctx.fillText(`${intervalLabel} ${arrowSym}`, 0, size * 0.45);

  ctx.restore();
}

export function drawLevelMissile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  level: number,
  aimAngle: number,
  time: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(aimAngle - Math.PI / 2);

  if (level === 1) {
    // LEVEL 1: Cyan plasma blast
    const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, 8);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.5, "#00ffcc");
    grad.addColorStop(1, "rgba(0, 255, 204, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

  } else if (level === 2) {
    // LEVEL 2: Torpedo with tail bubble
    ctx.fillStyle = "#1c2022";
    ctx.strokeStyle = "#00a2ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-3, -8, 6, 16, 2);
    ctx.fill();
    ctx.stroke();

    // Bubble trail node
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(0, -12 - Math.sin(time * 10) * 2, 2.5, 0, Math.PI*2);
    ctx.fill();

  } else if (level === 3) {
    // LEVEL 3: medieval fireball
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 11);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.3, "#ffcc00");
    grad.addColorStop(0.7, "#ff3300");
    grad.addColorStop(1, "rgba(255, 51, 0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();

  } else {
    // LEVEL 4: Laser ray beam
    ctx.strokeStyle = "#ff00a2";
    ctx.lineWidth = 4;
    ctx.shadowColor = "#ff00a2";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(0, 15);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawFPSOverlayHUD(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  aimXOffset: number,
  pitchLock: number,
  strikes: number,
  feedbackState: "correct" | "wrong" | "damage" | null,
  _time: number
) {
  const cx = width / 2 + aimXOffset;
  const cy = height / 2;

  // Vignette effect - telescoped view (Godot style top & bottom black bars)
  const vh = height * 0.08;
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(0, 0, width, vh);
  ctx.fillRect(0, height - vh, width, vh);

  // Red damage flash
  if (feedbackState === "damage" || feedbackState === "wrong") {
    ctx.fillStyle = "rgba(255, 59, 48, 0.22)";
    ctx.fillRect(0, 0, width, height);
  }

  // Crosshair digital sight
  const crossColor = strikes >= 3 ? "#ff3b30" : "#1df06a";
  ctx.strokeStyle = crossColor;
  ctx.lineWidth = 1.6;

  // Center cross lines
  const gap = 12;
  const length = 20;
  ctx.beginPath();
  // Horiz
  ctx.moveTo(cx - gap - length, cy);
  ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + gap, cy);
  ctx.lineTo(cx + gap + length, cy);
  // Vert
  ctx.moveTo(cx, cy - gap - length);
  ctx.lineTo(cx, cy - gap);
  ctx.moveTo(cx, cy + gap);
  ctx.lineTo(cx, cy + gap + length);
  ctx.stroke();

  // Outer circle
  ctx.strokeStyle = "rgba(29, 240, 106, 0.4)";
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  ctx.stroke();

  // Center dot
  ctx.fillStyle = crossColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Target Lock Indicator brackets (drawn when pitchLock is increasing)
  if (pitchLock > 0) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    const bracketSize = 40 + (1 - pitchLock) * 30; // Shrinks to lock on
    const bGap = bracketSize * 0.7;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(cx - bGap, cy - bracketSize);
    ctx.lineTo(cx - bracketSize, cy - bracketSize);
    ctx.lineTo(cx - bracketSize, cy - bGap);
    // Top-right
    ctx.moveTo(cx + bGap, cy - bracketSize);
    ctx.lineTo(cx + bracketSize, cy - bracketSize);
    ctx.lineTo(cx + bracketSize, cy - bGap);
    // Bottom-left
    ctx.moveTo(cx - bGap, cy + bracketSize);
    ctx.lineTo(cx - bracketSize, cy + bracketSize);
    ctx.lineTo(cx - bracketSize, cy + bGap);
    // Bottom-right
    ctx.moveTo(cx + bGap, cy + bracketSize);
    ctx.lineTo(cx + bracketSize, cy + bracketSize);
    ctx.lineTo(cx + bracketSize, cy + bGap);
    ctx.stroke();

    // Lock text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(pitchLock >= 0.95 ? "LOCKED" : `LOCKING: ${Math.round(pitchLock*100)}%`, cx, cy - 42);
  }
}
