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
  if (level === 5) colors = ["#ffcc00", "#ff9500", "#fffbe0"];
  if (level === 6) colors = ["#33ccff", "#bfe9ff", "#ffffff"];
  if (level === 7) colors = ["#ffe600", "#aaff00", "#ffffff"];
  if (level === 8) colors = ["#cc33ff", "#e6b3ff", "#ffffff"];
  if (level === 9) colors = ["#3366ff", "#66ffee", "#ffffff"];
  if (level === 10) colors = ["#ff3333", "#ffaa00", "#fff2cc"];
  if (level === 11) colors = ["#ffffff", "#ffe9a8", "#bcd9ff"];
  if (level === 12) colors = ["#cccccc", "#999999", "#ffffff"];
  if (level === 13) colors = ["#ff80df", "#80ffea", "#ffffff"];

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

    // Pulse waves lighting up grid intersections from the center
    const cx1 = width / 2;
    const cy1 = height / 2;
    for (let x = 0; x < width; x += gridSpacing) {
      for (let y = scroll; y < height; y += gridSpacing) {
        const d = Math.hypot(x - cx1, y - cy1);
        const wave = Math.sin(time * 2.2 - d * 0.02);
        if (wave > 0.86) {
          ctx.fillStyle = `rgba(0, 255, 204, ${(wave - 0.86) * 2.2})`;
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Data pulses racing down the vertical lines
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(0, 255, 204, 0.55)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const lane = ((i * 3 + 2) * gridSpacing) % width;
      const head = ((time * (120 + i * 35)) % (height + 60)) - 30;
      ctx.beginPath();
      ctx.moveTo(lane, head);
      ctx.lineTo(lane, head - 22);
      ctx.stroke();
    }
    ctx.lineCap = "butt";

    // Data towers with blinking windows and beacons
    const towers1 = [
      { tx: 10, ty: 50, tw: 40, th: 120 },
      { tx: width - 50, ty: 80, tw: 40, th: 100 },
      { tx: 14, ty: height - 190, tw: 34, th: 90 },
      { tx: width - 46, ty: height - 230, tw: 32, th: 110 }
    ];
    for (let ti = 0; ti < towers1.length; ti++) {
      const t1 = towers1[ti];
      ctx.fillStyle = "rgba(10, 18, 25, 0.85)";
      ctx.strokeStyle = "rgba(0, 255, 204, 0.2)";
      ctx.lineWidth = 1.5;
      ctx.fillRect(t1.tx, t1.ty, t1.tw, t1.th);
      ctx.strokeRect(t1.tx, t1.ty, t1.tw, t1.th);

      for (let wy = 0; wy < 4; wy++) {
        for (let wx = 0; wx < 2; wx++) {
          const on = Math.sin(time * 1.8 + ti * 3.1 + wy * 2.3 + wx * 4.7) > 0.2;
          ctx.fillStyle = on ? "rgba(0, 255, 204, 0.5)" : "rgba(0, 255, 204, 0.08)";
          ctx.fillRect(t1.tx + 7 + wx * (t1.tw - 20), t1.ty + 10 + (wy * (t1.th - 24)) / 3.4, 6, 5);
        }
      }

      // Antenna with blinking beacon
      ctx.strokeStyle = "rgba(0, 255, 204, 0.35)";
      ctx.beginPath();
      ctx.moveTo(t1.tx + t1.tw / 2, t1.ty);
      ctx.lineTo(t1.tx + t1.tw / 2, t1.ty - 14);
      ctx.stroke();
      if (Math.sin(time * 3 + ti * 1.7) > 0.5) {
        ctx.fillStyle = "#00ffcc";
        ctx.shadowColor = "#00ffcc";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(t1.tx + t1.tw / 2, t1.ty - 16, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

  } else if (level === 2) {
    // LEVEL 2: Ocean waves (Cenital Warship)
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#020f26");
    grad.addColorStop(1, "#08264d");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Water wave ripples with foam flecks on the crests
    for (let i = 0; i < 8; i++) {
      const y = (height / 8) * i + Math.sin(time + i) * 12;
      ctx.strokeStyle = "rgba(0, 162, 255, 0.15)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < width + 10; x += 20) {
        const offset = Math.sin(x * 0.01 + time * 1.5 + i) * 6;
        if (x === 0) ctx.moveTo(x, y + offset);
        else ctx.lineTo(x, y + offset);
      }
      ctx.stroke();

      ctx.fillStyle = "rgba(210, 235, 255, 0.25)";
      for (let x = (i * 53) % 40; x < width; x += 120) {
        const offset = Math.sin(x * 0.01 + time * 1.5 + i) * 6;
        ctx.beginPath();
        ctx.arc(x, y + offset - 2, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Rocky islet with a lighthouse and sweeping beam
    const lhX = 70;
    const lhY = 84;
    ctx.fillStyle = "#12263b";
    ctx.beginPath();
    ctx.ellipse(lhX, lhY + 6, 34, 20, 0.2, 0, Math.PI * 2);
    ctx.fill();

    const beamA = time * 0.8;
    const beamGrad = ctx.createRadialGradient(lhX, lhY, 4, lhX, lhY, 190);
    beamGrad.addColorStop(0, "rgba(255, 250, 200, 0.28)");
    beamGrad.addColorStop(1, "rgba(255, 250, 200, 0)");
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(lhX, lhY);
    ctx.arc(lhX, lhY, 190, beamA - 0.16, beamA + 0.16);
    ctx.closePath();
    ctx.fill();

    // Tower seen from above: white gallery, red lantern ring, glowing lamp
    ctx.fillStyle = "#dfe4ec";
    ctx.beginPath();
    ctx.arc(lhX, lhY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c23b3b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(lhX, lhY, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#fff7cc";
    ctx.beginPath();
    ctx.arc(lhX, lhY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Channel buoys bobbing on the swell
    const buoys: [number, number, number][] = [
      [width * 0.82, height * 0.2, 0],
      [width * 0.2, height * 0.62, 1],
      [width * 0.7, height * 0.75, 2]
    ];
    for (const [bx, by, bi] of buoys) {
      const bobY = by + Math.sin(time * 1.6 + bi * 2.1) * 3;
      ctx.fillStyle = "#8a2f2f";
      ctx.beginPath();
      ctx.arc(bx, bobY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      if (Math.sin(time * 2.5 + bi * 2.6) > 0.6) {
        ctx.fillStyle = "#ffd24d";
        ctx.shadowColor = "#ffd24d";
        ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.arc(bx, bobY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      // Expanding ripple ring around each buoy
      const rip = (time * 0.7 + bi * 0.4) % 1;
      ctx.strokeStyle = `rgba(210, 235, 255, ${0.25 * (1 - rip)})`;
      ctx.beginPath();
      ctx.arc(bx, bobY, 7 + rip * 14, 0, Math.PI * 2);
      ctx.stroke();
    }

  } else if (level === 3) {
    // LEVEL 3: Castle Grass (Catapult)
    ctx.fillStyle = "#1e2215"; // Dark moss green
    ctx.fillRect(0, 0, width, height);

    // Mown field strips
    ctx.fillStyle = "rgba(139, 155, 85, 0.05)";
    for (let i = 0; i < width; i += 120) {
      ctx.fillRect(i, 0, 60, height);
    }

    // Dirt road winding through the field, with wheel ruts
    ctx.strokeStyle = "rgba(139, 115, 85, 0.25)";
    ctx.lineWidth = 26;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(width * 0.62, height);
    ctx.quadraticCurveTo(width * 0.5, height * 0.55, width * 0.64, 0);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.strokeStyle = "rgba(60, 48, 34, 0.35)";
    ctx.lineWidth = 2;
    for (let s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.moveTo(width * 0.62 + s * 7, height);
      ctx.quadraticCurveTo(width * 0.5 + s * 7, height * 0.55, width * 0.64 + s * 7, 0);
      ctx.stroke();
    }

    // Stone walls with block seams, battlements and torches
    for (let s = 0; s < 2; s++) {
      const wx = s === 0 ? 0 : width - 35;
      ctx.fillStyle = "#2d2d2a";
      ctx.fillRect(wx, 0, 35, height);
      ctx.strokeStyle = "#403f3b";
      ctx.lineWidth = 2;
      ctx.strokeRect(wx, -5, 35, height + 10);

      // Block seams
      ctx.strokeStyle = "rgba(64, 63, 59, 0.8)";
      ctx.lineWidth = 1.2;
      for (let yy = 0; yy < height; yy += 26) {
        ctx.beginPath();
        ctx.moveTo(wx, yy);
        ctx.lineTo(wx + 35, yy);
        ctx.stroke();
      }

      // Battlement teeth jutting into the courtyard
      ctx.fillStyle = "#35352f";
      for (let yy = 8; yy < height; yy += 34) {
        ctx.fillRect(s === 0 ? 31 : width - 41, yy, 10, 14);
      }

      // Torches with flickering glow
      for (let yy = 40; yy < height; yy += 130) {
        const tx3 = s === 0 ? 41 : width - 41;
        const flick3 = 0.7 + Math.sin(time * 11 + yy) * 0.3;
        const tg = ctx.createRadialGradient(tx3, yy, 2, tx3, yy, 26);
        tg.addColorStop(0, `rgba(255, 170, 60, ${0.30 * flick3})`);
        tg.addColorStop(1, "rgba(255, 170, 60, 0)");
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.arc(tx3, yy, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, ${190 + Math.floor(flick3 * 40)}, 80, 0.9)`;
        ctx.beginPath();
        ctx.arc(tx3, yy, 3 + flick3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Corner watchtowers with waving pennants
    for (let ti = 0; ti < 2; ti++) {
      const tx3 = ti === 0 ? 35 : width - 35;
      const ty3 = 24;
      ctx.fillStyle = "#3a3a33";
      ctx.strokeStyle = "#55544c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx3, ty3, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Conical roof ridges (top view)
      ctx.beginPath();
      ctx.moveTo(tx3 - 22, ty3);
      ctx.lineTo(tx3 + 22, ty3);
      ctx.moveTo(tx3, ty3 - 22);
      ctx.lineTo(tx3, ty3 + 22);
      ctx.stroke();
      // Pennant streaming in the wind
      const wav = Math.sin(time * 3 + ti * 2) * 4;
      ctx.fillStyle = "#c23b3b";
      ctx.beginPath();
      ctx.moveTo(tx3, ty3);
      ctx.lineTo(tx3 + 16, ty3 + 3 + wav);
      ctx.lineTo(tx3 + 6, ty3 + 7);
      ctx.closePath();
      ctx.fill();
    }

    // Scattered boulders and hay bales
    const props3: [number, number, number, number][] = [
      [0.2, 0.35, 8, 0], [0.78, 0.5, 6, 1], [0.3, 0.72, 7, 0], [0.85, 0.25, 9, 1]
    ];
    for (const [nx, ny, r, kind] of props3) {
      const px3 = nx * width;
      const py3 = ny * height;
      if (kind === 0) {
        ctx.fillStyle = "#3c3c34";
        ctx.strokeStyle = "#55544c";
      } else {
        ctx.fillStyle = "#8a7a34";
        ctx.strokeStyle = "#a5943f";
      }
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px3, py3, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (kind === 1) {
        // Hay bale spiral
        ctx.beginPath();
        ctx.arc(px3, py3, r * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

  } else if (level === 4) {
    // LEVEL 4: FPS Visor Space
    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height / 2);
    skyGrad.addColorStop(0, "#04050c");
    skyGrad.addColorStop(1, "#0d0a1b");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height / 2);

    // Twinkling starfield above the horizon
    const fr4 = (v: number) => v - Math.floor(v);
    for (let i = 0; i < 40; i++) {
      const sx4 = fr4(i * 0.7132) * width;
      const sy4 = fr4(i * 0.2917) * (height / 2 - 20);
      const tw = 0.4 + Math.sin(time * (1 + fr4(i * 0.53) * 2) + i) * 0.35;
      ctx.fillStyle = `rgba(230, 220, 255, ${tw})`;
      ctx.fillRect(sx4, sy4, 1.6, 1.6);
    }

    // Ringed planet hanging over the horizon
    const plX = width * 0.78;
    const plY = height * 0.3;
    ctx.fillStyle = "#3d2a5e";
    ctx.strokeStyle = "rgba(223, 115, 255, 0.5)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(plX, plY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(122, 240, 201, 0.45)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(plX, plY, 42, 10, -0.28, 0, Math.PI * 2);
    ctx.stroke();

    // Occasional shooting star
    const ssPhase = (time * 0.31) % 1;
    if (ssPhase < 0.12) {
      const sp4 = ssPhase / 0.12;
      const ssx = width * (0.15 + ((Math.floor(time * 0.31) * 47) % 60) / 100) + sp4 * 120;
      const ssy = 30 + sp4 * 70;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * (1 - sp4)})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(ssx, ssy);
      ctx.lineTo(ssx - 26, ssy - 14);
      ctx.stroke();
    }

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

        // Glowing crystal cap, breathing slowly
        const crystalPulse = 1 + Math.sin(time * 3 + pil.x) * 0.18;
        ctx.fillStyle = "#00ffcc";
        ctx.shadowColor = "#00ffcc";
        ctx.shadowBlur = 6 + Math.sin(time * 3 + pil.x) * 4;
        ctx.beginPath();
        ctx.arc(pTop.x, pTop.y, (40 / pBase.rz) * crystalPulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      }
    }
  } else if (level === 5) {
    // LEVEL 5: Valle de Giza (Cenital Scarab Tank)
    // Sun-baked sand at dusk
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#3a2a12");
    grad.addColorStop(0.6, "#2c2010");
    grad.addColorStop(1, "#1f160a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Wind-carved dune ripples seen from above
    ctx.strokeStyle = "rgba(255, 204, 0, 0.07)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) {
      const y = (height / 9) * i + Math.sin(time * 0.4 + i * 1.7) * 8;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 16) {
        const offset = Math.sin(x * 0.008 + i * 2.1) * 14 + Math.sin(x * 0.03 + time * 0.6) * 3;
        if (x === 0) ctx.moveTo(x, y + offset);
        else ctx.lineTo(x, y + offset);
      }
      ctx.stroke();
    }

    // The Nile winding along the right edge
    const riverBankX = (y: number) => width - 52 + Math.sin(y * 0.012 + 1.5) * 18;
    ctx.fillStyle = "rgba(16, 54, 84, 0.9)";
    ctx.beginPath();
    ctx.moveTo(width, 0);
    for (let y = 0; y <= height; y += 14) {
      ctx.lineTo(riverBankX(y), y);
    }
    ctx.lineTo(riverBankX(height), height);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Water glints drifting downstream
    ctx.strokeStyle = "rgba(103, 214, 255, 0.28)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const y = (time * 26 + (i * height) / 6) % height;
      const bank = riverBankX(y);
      ctx.beginPath();
      ctx.moveTo(bank + 8, y);
      ctx.lineTo(bank + 22 + Math.sin(time * 2 + i * 1.9) * 6, y);
      ctx.stroke();
    }

    // Top-down pyramids: square base, two sunlit faces, two in shadow
    const drawPyramidTopDown = (px: number, py: number, s: number, rot: number) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      const corners = [[-s, -s], [s, -s], [s, s], [-s, s]];
      // Sun sits top-left: N and W faces lit, S and E in shadow
      const faceColors = ["#7d6228", "#2e220c", "#241a08", "#5d4a1e"];
      for (let f = 0; f < 4; f++) {
        const a = corners[f];
        const b = corners[(f + 1) % 4];
        ctx.fillStyle = faceColors[f];
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(255, 204, 0, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-s, -s, s * 2, s * 2);
      ctx.beginPath();
      ctx.moveTo(-s, -s); ctx.lineTo(s, s);
      ctx.moveTo(s, -s); ctx.lineTo(-s, s);
      ctx.stroke();
      // Golden capstone catching the light
      ctx.fillStyle = "#ffcc00";
      ctx.shadowColor = "#ffcc00";
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(2.5, s * 0.09), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    // Giza trio: Keops, Kefren, Micerinos
    drawPyramidTopDown(84, 100, 42, 0.12);
    drawPyramidTopDown(178, 186, 30, -0.08);
    drawPyramidTopDown(64, 226, 19, 0.3);

    // Palm trees swaying along the river bank
    for (let i = 0; i < 4; i++) {
      const py = height * (0.14 + i * 0.24);
      const px = riverBankX(py) - 20;
      ctx.strokeStyle = "rgba(74, 148, 74, 0.6)";
      ctx.lineWidth = 2;
      for (let f = 0; f < 7; f++) {
        const ang = (f / 7) * Math.PI * 2 + Math.sin(time * 0.8 + i * 2.2) * 0.09;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(ang) * 12, py + Math.sin(ang) * 12);
        ctx.stroke();
      }
      ctx.fillStyle = "#2a5a2a";
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (level === 6) {
    // LEVEL 6: Fiordo Polar (Cenital Narwhal)
    // Deep arctic water
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#04121f");
    grad.addColorStop(1, "#0a1d30");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Aurora borealis ribbons sweeping across the sky
    ctx.lineCap = "round";
    const auroraColors = [
      "rgba(51, 255, 180, 0.10)",
      "rgba(51, 204, 255, 0.09)",
      "rgba(170, 100, 255, 0.07)"
    ];
    for (let band = 0; band < 3; band++) {
      ctx.beginPath();
      const baseY = height * (0.12 + band * 0.1);
      for (let x = 0; x <= width; x += 12) {
        const y = baseY
          + Math.sin(x * 0.006 + time * 0.5 + band * 2.4) * 26
          + Math.sin(x * 0.017 - time * 0.3) * 10;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = auroraColors[band];
      ctx.lineWidth = 26 + Math.sin(time * 0.7 + band * 1.4) * 8;
      ctx.stroke();
    }
    ctx.lineCap = "butt";

    // Drifting ice floes (cracked plates)
    const floes = [
      { cx: 0.18, cy: 0.32, r: 55, drift: 0 },
      { cx: 0.78, cy: 0.2, r: 42, drift: 1.8 },
      { cx: 0.62, cy: 0.55, r: 34, drift: 3.5 },
      { cx: 0.12, cy: 0.72, r: 46, drift: 5.1 },
      { cx: 0.88, cy: 0.78, r: 38, drift: 2.6 }
    ];
    for (const f of floes) {
      const fx = f.cx * width + Math.sin(time * 0.22 + f.drift) * 9;
      const fy = f.cy * height + Math.cos(time * 0.17 + f.drift) * 7;

      // Irregular plate outline
      ctx.fillStyle = "rgba(190, 225, 245, 0.10)";
      ctx.strokeStyle = "rgba(51, 204, 255, 0.28)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let v = 0; v < 7; v++) {
        const ang = (v / 7) * Math.PI * 2 + f.drift;
        const rad = f.r * (0.75 + 0.25 * Math.sin(f.drift * 3 + v * 2.7));
        const px = fx + Math.cos(ang) * rad;
        const py = fy + Math.sin(ang) * rad;
        if (v === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crack lines across the plate
      ctx.strokeStyle = "rgba(51, 204, 255, 0.15)";
      ctx.beginPath();
      ctx.moveTo(fx - f.r * 0.5, fy + f.r * 0.2);
      ctx.lineTo(fx + f.r * 0.15, fy - f.r * 0.1);
      ctx.lineTo(fx + f.r * 0.55, fy + f.r * 0.35);
      ctx.moveTo(fx + f.r * 0.15, fy - f.r * 0.1);
      ctx.lineTo(fx + f.r * 0.1, fy - f.r * 0.6);
      ctx.stroke();
    }

    // Falling snow drifting with the wind
    const fract = (v: number) => v - Math.floor(v);
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    for (let i = 0; i < 40; i++) {
      const speed = 18 + fract(i * 0.613) * 26;
      const sy = fract(i * 0.364 + (time * speed) / height) * height;
      const sx = ((fract(i * 0.7548) * width + Math.sin(time * 0.8 + i) * 14) % width + width) % width;
      ctx.globalAlpha = 0.3 + fract(i * 0.53) * 0.45;
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + fract(i * 0.917) * 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  } else if (level === 7) {
    // LEVEL 7: Río de la Jungla (first-person river boat, sailing upriver)
    const horizon = height / 2;

    // Humid night sky in the canopy gap
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGrad.addColorStop(0, "#02120a");
    skyGrad.addColorStop(1, "#0d2b14");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizon);

    // Low tropical moon
    ctx.fillStyle = "rgba(255, 250, 214, 0.9)";
    ctx.shadowColor = "rgba(255, 250, 214, 0.9)";
    ctx.shadowBlur = 28;
    ctx.beginPath();
    ctx.arc(width * 0.63, horizon * 0.5, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Dark river water below the horizon
    const waterGrad = ctx.createLinearGradient(0, horizon, 0, height);
    waterGrad.addColorStop(0, "#0d2f1d");
    waterGrad.addColorStop(1, "#03130a");
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, horizon, width, height - horizon);

    // Moonlight lane on the water
    const laneGrad = ctx.createLinearGradient(0, horizon, 0, height);
    laneGrad.addColorStop(0, "rgba(255, 250, 214, 0.13)");
    laneGrad.addColorStop(1, "rgba(255, 250, 214, 0)");
    ctx.fillStyle = laneGrad;
    ctx.beginPath();
    ctx.moveTo(width * 0.63 - 9, horizon);
    ctx.lineTo(width * 0.63 + 9, horizon);
    ctx.lineTo(width * 0.63 + 62, height);
    ctx.lineTo(width * 0.63 - 62, height);
    ctx.closePath();
    ctx.fill();

    // Same first-person camera as Level 4
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

    // Ripples drifting toward the boat: the forward-motion illusion
    ctx.strokeStyle = "rgba(160, 255, 190, 0.16)";
    ctx.lineWidth = 1.2;
    const flow = (time * 7) % 9;
    for (let zBase = 6; zBase <= 92; zBase += 9) {
      const zVal = zBase - flow;
      if (zVal < 2.5) continue;
      ctx.beginPath();
      let started = false;
      for (let xVal = -45; xVal <= 45; xVal += 6) {
        const p = project3D(xVal, Math.sin(xVal * 0.7 + time * 2) * 0.06, zVal);
        if (p.rz <= 2.0) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Jungle walls: tree billboards streaming past as we sail
    const trees: { x: number; z: number; h: number; seed: number }[] = [];
    for (let i = 0; i < 26; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const lane = 14 + ((i * 7) % 3) * 6;
      const z = ((((i * 331) % 88) - time * 7) % 88 + 88) % 88 + 3;
      trees.push({
        x: side * (lane + ((i * 17) % 5)),
        z,
        h: 5 + ((i * 13) % 4),
        seed: i
      });
    }

    // Painter's algorithm: far trees first
    const projectedTrees = trees
      .map(tr => ({ tr, base: project3D(tr.x, 0, tr.z), top: project3D(tr.x, tr.h, tr.z) }))
      .filter(p => p.base.rz > 2.2)
      .sort((a, b) => b.base.rz - a.base.rz);

    for (const { tr, base, top } of projectedTrees) {
      const wTrunk = 60 / base.rz;

      // Trunk
      ctx.fillStyle = "rgba(34, 46, 20, 0.92)";
      ctx.strokeStyle = "rgba(122, 240, 150, 0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(base.x - wTrunk, base.y);
      ctx.lineTo(top.x - wTrunk * 0.55, top.y);
      ctx.lineTo(top.x + wTrunk * 0.55, top.y);
      ctx.lineTo(base.x + wTrunk, base.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Canopy clusters
      const rCan = (140 + (tr.seed % 3) * 50) / base.rz;
      ctx.fillStyle = "rgba(20, 62, 30, 0.88)";
      ctx.beginPath();
      ctx.arc(top.x, top.y, rCan, 0, Math.PI * 2);
      ctx.arc(top.x - rCan * 0.7, top.y + rCan * 0.25, rCan * 0.7, 0, Math.PI * 2);
      ctx.arc(top.x + rCan * 0.7, top.y + rCan * 0.25, rCan * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Moonlit rim on the crown
      ctx.strokeStyle = "rgba(160, 255, 190, 0.13)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(top.x, top.y, rCan, -Math.PI * 0.9, -Math.PI * 0.1);
      ctx.stroke();
    }

    // Fireflies wandering over the water
    for (let i = 0; i < 14; i++) {
      const fz = ((((i * 53) % 60) - time * 3) % 60 + 60) % 60 + 5;
      const fx = Math.sin(time * 0.7 + i * 2.6) * 10 + (i % 2 === 0 ? -8 : 8);
      const fy = 1.2 + Math.sin(time * 1.3 + i) * 0.8;
      const p = project3D(fx, fy, fz);
      if (p.rz <= 2.0) continue;
      const glow = 0.5 + Math.sin(time * 4 + i * 1.7) * 0.5;
      ctx.fillStyle = `rgba(255, 240, 60, ${0.25 + glow * 0.6})`;
      ctx.shadowColor = "#ffe600";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.min(4, 120 / p.rz) * (0.5 + glow * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Overhead canopy fringe closing the frame (screen-space)
    ctx.fillStyle = "rgba(6, 24, 12, 0.9)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const scallop = width / 14;
    for (let sx = 0; sx <= width; sx += scallop) {
      const dip = 24 + Math.sin(sx * 0.03 + time * 0.4) * 8 + ((sx / scallop) % 3) * 14;
      ctx.lineTo(sx, dip);
    }
    ctx.lineTo(width, 0);
    ctx.closePath();
    ctx.fill();
  } else if (level === 8) {
    // LEVEL 8: Tormenta Eléctrica (cenital storm glider above the clouds)
    ctx.fillStyle = "#151022";
    ctx.fillRect(0, 0, width, height);

    // Rolling cloud banks drifting
    for (let i = 0; i < 12; i++) {
      const cx = ((i * 173.3) % (width + 240)) - 120 + Math.sin(time * 0.3 + i) * 20;
      const cy = ((i * 97.7) % (height + 160)) - 80 + Math.cos(time * 0.2 + i * 1.7) * 12;
      const r = 60 + (i % 4) * 28;
      const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      g.addColorStop(0, "rgba(88, 70, 130, 0.30)");
      g.addColorStop(1, "rgba(88, 70, 130, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Deterministic lightning strikes with sheet flash
    for (let k = 0; k < 3; k++) {
      const phase = (time * 0.45 + k * 0.37) % 1;
      if (phase < 0.08) {
        const strength = 1 - phase / 0.08;
        ctx.fillStyle = `rgba(204, 51, 255, ${0.10 * strength})`;
        ctx.fillRect(0, 0, width, height);

        const seed = Math.floor(time * 0.45 + k * 0.37);
        const bx = (((seed * 733 + k * 311) % 100) / 100) * width;
        ctx.strokeStyle = `rgba(240, 210, 255, ${0.85 * strength})`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#cc33ff";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        let px = bx;
        let py = 0;
        ctx.moveTo(px, py);
        while (py < height) {
          px += Math.sin(seed * 3.1 + py * 0.05 + k) * 26;
          py += 34;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // Driving rain streaks
    ctx.strokeStyle = "rgba(190, 170, 255, 0.16)";
    ctx.lineWidth = 1.2;
    const fall = time * 500;
    for (let i = 0; i < 34; i++) {
      const rx = (i * 149.7) % width;
      const ry = (((i * 211.3) + fall) % (height + 40)) - 20;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 7, ry + 16);
      ctx.stroke();
    }
  } else if (level === 9) {
    // LEVEL 9: Abismo Bioluminiscente (first-person bathyscaphe)
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#010816");
    grad.addColorStop(0.5, "#02101f");
    grad.addColorStop(1, "#000509");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Same first-person camera as Level 4
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

    // Sonar ping expanding from the sub
    const ping = (time * 0.5) % 1;
    ctx.strokeStyle = `rgba(102, 179, 255, ${0.35 * (1 - ping)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 30 + ping * Math.min(width, height) * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    // Hydrothermal vents: rock spires with glowing fissures
    const spires = [
      { x: -9, z: 12, h: 3.2 }, { x: 8, z: 15, h: 4.2 },
      { x: -16, z: 26, h: 5.5 }, { x: 15, z: 30, h: 4.6 },
      { x: -4, z: 44, h: 6.0 }, { x: 24, z: 52, h: 7.0 }
    ]
      .map(s => ({ ...s, base: project3D(s.x, 0, s.z), top: project3D(s.x, s.h, s.z) }))
      .filter(s => s.base.rz > 2.1)
      .sort((a, b) => b.base.rz - a.base.rz);

    for (const sp of spires) {
      const wB = 150 / sp.base.rz;
      const wT = 40 / sp.base.rz;
      ctx.fillStyle = "rgba(10, 22, 34, 0.95)";
      ctx.strokeStyle = "rgba(102, 179, 255, 0.30)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(sp.base.x - wB / 2, sp.base.y);
      ctx.lineTo(sp.top.x - wT / 2, sp.top.y);
      ctx.lineTo(sp.top.x + wT / 2, sp.top.y);
      ctx.lineTo(sp.base.x + wB / 2, sp.base.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing fissure up the spire
      ctx.strokeStyle = "rgba(102, 255, 238, 0.5)";
      ctx.beginPath();
      ctx.moveTo(sp.base.x, sp.base.y);
      ctx.lineTo((sp.base.x + sp.top.x) / 2 + wT * 0.3, (sp.base.y + sp.top.y) / 2);
      ctx.lineTo(sp.top.x, sp.top.y);
      ctx.stroke();

      // Vent glow at the tip
      ctx.fillStyle = "rgba(102, 255, 238, 0.5)";
      ctx.shadowColor = "#66ffee";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(sp.top.x, sp.top.y, 30 / sp.base.rz, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Jellyfish drifting past
    for (let i = 0; i < 6; i++) {
      const jz = ((((i * 47) % 55) - time * 1.6) % 55 + 55) % 55 + 6;
      const jx = Math.sin(time * 0.4 + i * 2.3) * 14 + (i % 2 ? 9 : -9);
      const jy = 2.2 + Math.sin(time * 0.9 + i * 1.3) * 1.0;
      const p = project3D(jx, jy, jz);
      if (p.rz <= 2.1) continue;
      const r = 90 / p.rz;
      const pulse = 1 + Math.sin(time * 3 + i) * 0.12;

      // Bell
      ctx.fillStyle = "rgba(120, 170, 255, 0.22)";
      ctx.strokeStyle = "rgba(150, 200, 255, 0.45)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * pulse, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tentacles
      ctx.strokeStyle = "rgba(150, 200, 255, 0.30)";
      for (let tt = -2; tt <= 2; tt++) {
        ctx.beginPath();
        ctx.moveTo(p.x + tt * r * 0.3, p.y);
        ctx.quadraticCurveTo(
          p.x + tt * r * 0.42 + Math.sin(time * 2 + i + tt) * r * 0.18, p.y + r * 0.9,
          p.x + tt * r * 0.34, p.y + r * 1.6
        );
        ctx.stroke();
      }
    }

    // Marine snow
    const frac9 = (v: number) => v - Math.floor(v);
    for (let i = 0; i < 46; i++) {
      const sy = frac9(i * 0.317 - time * (0.01 + frac9(i * 0.71) * 0.02)) * height;
      const sx = frac9(i * 0.613 + Math.sin(time * 0.5 + i) * 0.004) * width;
      ctx.fillStyle = "rgba(200, 225, 255, 0.4)";
      ctx.globalAlpha = 0.15 + frac9(i * 0.43) * 0.4;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8 + frac9(i * 0.89) * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (level === 10) {
    // LEVEL 10: Caldera Volcánica (cenital magma golem)
    ctx.fillStyle = "#160b08";
    ctx.fillRect(0, 0, width, height);

    // Basalt plate cells
    ctx.strokeStyle = "rgba(255, 90, 40, 0.06)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < width; i += 70) {
      for (let j = 0; j < height; j += 70) {
        ctx.strokeRect(i + ((j / 70) % 2) * 22, j, 62, 62);
      }
    }

    // Glowing magma cracks, pulsing
    const pulse10 = 0.55 + Math.sin(time * 2.2) * 0.25;
    const cracks: [number, number][][] = [
      [[0.06, 0.2], [0.2, 0.32], [0.16, 0.5], [0.3, 0.62]],
      [[0.85, 0.1], [0.72, 0.28], [0.8, 0.45]],
      [[0.4, 0.85], [0.55, 0.7], [0.7, 0.78], [0.82, 0.66]],
      [[0.15, 0.9], [0.28, 0.78]]
    ];
    ctx.lineCap = "round";
    for (const crack of cracks) {
      ctx.beginPath();
      crack.forEach(([nx, ny], idx) => {
        if (idx === 0) ctx.moveTo(nx * width, ny * height);
        else ctx.lineTo(nx * width, ny * height);
      });
      // Outer glow pass + hot core pass over the same path
      ctx.strokeStyle = `rgba(255, 90, 20, ${0.16 * pulse10})`;
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 170, 60, ${0.75 * pulse10})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.lineCap = "butt";

    // Lava lake along the left edge
    const lavaBank = (yy: number) => 60 + Math.sin(yy * 0.014 + 0.8) * 16;
    ctx.fillStyle = "#7a1e06";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let yy = 0; yy <= height; yy += 14) ctx.lineTo(lavaBank(yy), yy);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Bright lava veins flowing
    ctx.strokeStyle = "rgba(255, 170, 60, 0.5)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const yy = (time * 14 + (i * height) / 4) % height;
      ctx.beginPath();
      ctx.moveTo(6, yy);
      ctx.lineTo(lavaBank(yy) - 10 + Math.sin(time * 2 + i) * 5, yy + 8);
      ctx.stroke();
    }

    // Rising embers
    const fr10 = (v: number) => v - Math.floor(v);
    for (let i = 0; i < 22; i++) {
      const ey = (1 - fr10(i * 0.37 + time * (0.05 + fr10(i * 0.61) * 0.05))) * height;
      const ex = fr10(i * 0.73) * width + Math.sin(time * 1.5 + i) * 9;
      ctx.fillStyle = `rgba(255, ${140 + Math.floor(fr10(i * 0.31) * 80)}, 40, ${0.25 + fr10(i * 0.53) * 0.5})`;
      ctx.beginPath();
      ctx.arc(ex, ey, 1 + fr10(i * 0.91) * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (level === 11) {
    // LEVEL 11: Templo Celestial (cenital, floating temple above a cloud sea)
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#101528");
    grad.addColorStop(1, "#1c2340");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Sea of clouds drifting far below
    for (let i = 0; i < 10; i++) {
      const cx = ((i * 197.3 + time * 9) % (width + 220)) - 110;
      const cy = (i * 131.7) % height;
      const r = 55 + (i % 3) * 30;
      const g = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r);
      g.addColorStop(0, "rgba(215, 225, 250, 0.10)");
      g.addColorStop(1, "rgba(215, 225, 250, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Marble sanctuary platform under the player
    const pcx = width / 2;
    const pcy = height - 80;
    const pr = 120;
    ctx.fillStyle = "rgba(230, 234, 245, 0.10)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pcx, pcy, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Golden inlay rings
    ctx.strokeStyle = "rgba(255, 233, 168, 0.30)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(pcx, pcy, pr * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pcx, pcy, pr * 0.45, 0, Math.PI * 2);
    ctx.stroke();

    // Column capitals around the rim (top view)
    for (let c = 0; c < 8; c++) {
      const a = (c / 8) * Math.PI * 2 + Math.PI / 8;
      const colX = pcx + Math.cos(a) * pr * 0.88;
      const colY = pcy + Math.sin(a) * pr * 0.88;
      ctx.fillStyle = "rgba(240, 243, 250, 0.5)";
      ctx.beginPath();
      ctx.arc(colX, colY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 233, 168, 0.5)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(colX, colY, 9.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Rising light motes
    const fr11 = (v: number) => v - Math.floor(v);
    for (let i = 0; i < 18; i++) {
      const my = (1 - fr11(i * 0.41 + time * 0.04)) * height;
      const mx = fr11(i * 0.67) * width + Math.sin(time + i) * 8;
      ctx.fillStyle = `rgba(255, 250, 230, ${0.15 + fr11(i * 0.29) * 0.35})`;
      ctx.beginPath();
      ctx.arc(mx, my, 1.2 + fr11(i * 0.83) * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (level === 12) {
    // LEVEL 12: Mar de la Tranquilidad (cenital lunar rover)
    ctx.fillStyle = "#232326";
    ctx.fillRect(0, 0, width, height);

    // Regolith speckle
    const fr12 = (v: number) => v - Math.floor(v);
    for (let i = 0; i < 90; i++) {
      const gx = fr12(i * 0.7391) * width;
      const gy = fr12(i * 0.4133) * height;
      ctx.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.arc(gx, gy, 1 + fr12(i * 0.29) * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Craters, sun from the top-left
    const craters: [number, number, number][] = [
      [0.16, 0.18, 46], [0.68, 0.12, 30], [0.85, 0.42, 54],
      [0.32, 0.55, 24], [0.1, 0.78, 36], [0.55, 0.8, 18], [0.45, 0.3, 14]
    ];
    for (const [nx, ny, r] of craters) {
      const cx = nx * width;
      const cy = ny * height;
      const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.1, cx, cy, r);
      g.addColorStop(0, "#1a1a1d");
      g.addColorStop(1, "#2a2a2e");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      // Shadow rim (inner, sun side)
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 1.5, Math.PI * 0.75, Math.PI * 1.75);
      ctx.stroke();
      // Sunlit rim (outer, far side)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 1, -Math.PI * 0.25, Math.PI * 0.75);
      ctx.stroke();
    }

    // Abandoned lander (top view) as a landmark
    const lmX = width - 90;
    const lmY = 90;
    ctx.strokeStyle = "#8f8f98";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let a = 0; a < 4; a++) {
      const ang = (a * Math.PI) / 2 + Math.PI / 4;
      ctx.moveTo(lmX, lmY);
      ctx.lineTo(lmX + Math.cos(ang) * 22, lmY + Math.sin(ang) * 22);
    }
    ctx.stroke();
    ctx.fillStyle = "#3a3a40";
    ctx.beginPath();
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      const px = lmX + Math.cos(ang) * 12;
      const py = lmY + Math.sin(ang) * 12;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Gold foil glint
    ctx.fillStyle = "rgba(255, 204, 0, 0.35)";
    ctx.beginPath();
    ctx.arc(lmX, lmY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Rover wheel tracks trailing behind the player
    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 3;
    for (let s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.moveTo(width / 2 + s * 12, height - 60);
      ctx.quadraticCurveTo(width / 2 + s * 30, height * 0.7, width / 2 + s * 90, height * 0.45);
      ctx.stroke();
    }
  } else if (level === 13) {
    // LEVEL 13: El Vórtice (first-person hyperspace of random intervals)
    ctx.fillStyle = "#0d0314";
    ctx.fillRect(0, 0, width, height);

    // Steering parallax: vortex center shifts opposite to the turret angle
    const vcx = width / 2 - Math.sin(turretAngle) * width * 0.55;
    const vcy = height / 2;
    const fr13 = (v: number) => v - Math.floor(v);
    const maxR = Math.hypot(width, height) * 0.75;

    // Tunnel rings flying past
    for (let k = 0; k < 9; k++) {
      const f = fr13(k / 9 + time * 0.22);
      const r = 12 + Math.pow(f, 2.6) * maxR;
      const hue = (k * 40 + time * 30) % 360;
      ctx.strokeStyle = `hsla(${hue}, 95%, 65%, ${0.5 * (1 - f * 0.6)})`;
      ctx.lineWidth = 1.5 + f * 4;
      ctx.beginPath();
      ctx.arc(vcx, vcy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Warp star streaks radiating outward
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + (i % 2) * 0.12;
      const f = fr13(i * 0.317 + time * 0.5);
      const d0 = 30 + f * maxR * 0.8;
      const d1 = d0 + 14 + f * 46;
      ctx.strokeStyle = `rgba(255, 128, 223, ${0.12 + f * 0.4})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(vcx + Math.cos(a) * d0, vcy + Math.sin(a) * d0);
      ctx.lineTo(vcx + Math.cos(a) * d1, vcy + Math.sin(a) * d1);
      ctx.stroke();
    }

    // Floating chaos glyphs (spinning wireframe diamonds)
    for (let i = 0; i < 5; i++) {
      const gx = width * (0.15 + i * 0.18) + Math.sin(time * 0.6 + i * 2.1) * 24;
      const gy = height * (0.22 + ((i * 37) % 3) * 0.24) + Math.cos(time * 0.5 + i) * 18;
      const gr = 10 + (i % 3) * 6;
      const rot = time * (0.8 + i * 0.3);
      const hue = (i * 72 + time * 50) % 360;
      ctx.strokeStyle = `hsla(${hue}, 90%, 70%, 0.5)`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let v = 0; v < 4; v++) {
        const a = rot + (v / 4) * Math.PI * 2;
        const px = gx + Math.cos(a) * gr;
        const py = gy + Math.sin(a) * gr * 0.6;
        if (v === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
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

    // Hover glow under the hull
    ctx.fillStyle = "rgba(0, 255, 204, 0.10)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 27, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Treads with rolling link marks
    ctx.fillStyle = "#161b22";
    ctx.fillRect(-22, -18, 10, 36);
    ctx.fillRect(12, -18, 10, 36);
    ctx.strokeStyle = "rgba(0, 255, 204, 0.30)";
    ctx.lineWidth = 1.2;
    const linkScroll = (time * 26) % 7;
    for (let s = -1; s <= 1; s += 2) {
      const tx0 = s === -1 ? -22 : 12;
      for (let yy = -18 + linkScroll; yy < 18; yy += 7) {
        ctx.beginPath();
        ctx.moveTo(tx0 + 1.5, yy);
        ctx.lineTo(tx0 + 8.5, yy);
        ctx.stroke();
      }
    }

    // Body
    ctx.fillStyle = "#21262d";
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-15, -15, 30, 30, 6);
    ctx.fill();
    ctx.stroke();

    // Deck lights blinking alternately at the corners
    for (let c = 0; c < 4; c++) {
      const on = Math.sin(time * 4 + c * 1.57) > 0;
      ctx.fillStyle = on ? "rgba(0, 255, 204, 0.9)" : "rgba(0, 255, 204, 0.2)";
      ctx.beginPath();
      ctx.arc((c % 2 === 0 ? -1 : 1) * 11, (c < 2 ? -1 : 1) * 11, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Turret cap with radar sweep
    ctx.fillStyle = "#00ffcc";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 13, time * 4, time * 4 + 0.9);
    ctx.stroke();

    // Barrel
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 22);
    ctx.stroke();

    // Barrel charge indicator + hot muzzle when ready
    if (charge > 0) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 22 * charge);
      ctx.stroke();
    }
    if (charge >= 1.0) {
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#00ffcc";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 24, 3 + Math.sin(time * 10), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

  } else if (level === 2) {
    // LEVEL 2: Naval Warship
    ctx.rotate(aimAngle - Math.PI / 2);

    // Bow wake foam peeling off in a V
    ctx.strokeStyle = "rgba(210, 235, 255, 0.35)";
    ctx.lineWidth = 1.6;
    for (let s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.moveTo(s * 4, 26);
      ctx.quadraticCurveTo(s * 14, 10 - ((time * 30) % 8), s * 22, -6 - ((time * 30) % 8));
      ctx.stroke();
    }
    // Stern wash trailing behind
    ctx.strokeStyle = "rgba(210, 235, 255, 0.22)";
    for (let w = 0; w < 3; w++) {
      const wy = -30 - w * 7 - ((time * 26) % 7);
      ctx.beginPath();
      ctx.moveTo(-9, wy);
      ctx.lineTo(9, wy);
      ctx.stroke();
    }

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

    // Port (red) / starboard (green) navigation lights, alternating
    const navOn = Math.sin(time * 3.2) > 0;
    ctx.fillStyle = navOn ? "#ff5050" : "rgba(255, 80, 80, 0.25)";
    ctx.beginPath();
    ctx.arc(-11, 6, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = navOn ? "rgba(77, 255, 136, 0.25)" : "#4dff88";
    ctx.beginPath();
    ctx.arc(11, 6, 1.8, 0, Math.PI * 2);
    ctx.fill();

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

    // Pennant fluttering on the frame
    const wav3 = Math.sin(time * 4) * 3;
    ctx.fillStyle = "#c23b3b";
    ctx.beginPath();
    ctx.moveTo(-16, -12);
    ctx.lineTo(-26, -16 + wav3 * 0.4);
    ctx.lineTo(-17, -8);
    ctx.closePath();
    ctx.fill();

    // Arm (catapult lever)
    ctx.save();
    // Arm rocks slightly back as charge increases
    ctx.translate(0, 8);
    ctx.rotate(charge * -0.25);
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(-3, -24, 6, 26);

    // Payload heats up gradually as the note holds
    ctx.fillStyle = "#8b5a2b";
    ctx.beginPath();
    ctx.arc(0, -26, 8, 0, Math.PI * 2);
    ctx.fill();
    if (charge > 0) {
      ctx.fillStyle = `rgba(255, 85, 0, ${charge})`;
      ctx.shadowColor = "#ff5500";
      ctx.shadowBlur = 12 * charge;
      ctx.beginPath();
      ctx.arc(0, -26, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Embers rising off the payload
      if (charge > 0.5) {
        ctx.fillStyle = "rgba(255, 190, 80, 0.8)";
        for (let e = 0; e < 3; e++) {
          const et = (time * 1.6 + e * 0.37) % 1;
          ctx.beginPath();
          ctx.arc(Math.sin(time * 5 + e * 2) * 5, -26 - et * 16, 1.8 * (1 - et), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();

  } else if (level === 5) {
    // LEVEL 5: Golden Scarab Tank
    ctx.rotate(aimAngle - Math.PI / 2);

    // Scuttling legs (3 per side), wiggle speeds up while charging
    ctx.strokeStyle = "#8a6a1c";
    ctx.lineWidth = 3;
    for (let s = -1; s <= 1; s += 2) {
      for (let l = 0; l < 3; l++) {
        const ly = -14 + l * 10;
        const wiggle = Math.sin(time * (5 + charge * 6) + l * 1.3 + s) * 2.5;
        ctx.beginPath();
        ctx.moveTo(s * 11, ly);
        ctx.lineTo(s * (20 + wiggle), ly + 7);
        ctx.stroke();
      }
    }

    // Elytra (wing covers)
    ctx.fillStyle = "#3d2f13";
    ctx.strokeStyle = "#ffcc00";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, -4, 14, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Elytra split line
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, 10);
    ctx.stroke();

    // Sacred gem on the back, pulses when weapon is ready
    ctx.fillStyle = charge >= 1.0 ? "#ffffff" : "#b28a00";
    ctx.beginPath();
    ctx.arc(0, -8, 3.5 + (charge >= 1.0 ? Math.sin(time * 8) * 1.2 : 0), 0, Math.PI * 2);
    ctx.fill();

    // Head (front)
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.arc(0, 16, 7, 0, Math.PI * 2);
    ctx.fill();

    // Sun-disc cannon barrel
    ctx.strokeStyle = "#ffcc00";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(0, 32);
    ctx.stroke();

    // Barrel charge indicator
    if (charge > 0) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.lineTo(0, 16 + 16 * charge);
      ctx.stroke();
    }

  } else if (level === 6) {
    // LEVEL 6: Mechanized Narwhal
    ctx.rotate(aimAngle - Math.PI / 2);

    // Tail fluke sways, faster while charging
    const sway = Math.sin(time * (3 + charge * 5)) * 0.35;
    ctx.save();
    ctx.translate(0, -20);
    ctx.rotate(sway);
    ctx.fillStyle = "#12384f";
    ctx.strokeStyle = "#33ccff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.lineTo(-13, -9);
    ctx.lineTo(-3, -1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.lineTo(13, -9);
    ctx.lineTo(3, -1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Side flippers
    ctx.fillStyle = "#12384f";
    ctx.strokeStyle = "#33ccff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-13, 2, 6.5, 3.5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(13, 2, 6.5, 3.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Body (armored hull)
    ctx.fillStyle = "#1a4a66";
    ctx.strokeStyle = "#33ccff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, -2, 12, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mottled narwhal skin plates
    ctx.fillStyle = "rgba(51, 204, 255, 0.3)";
    const spots: [number, number, number][] = [[-5, -12, 2], [6, -8, 2.5], [-6, 0, 1.8], [4, 6, 2.2], [0, -4, 1.5]];
    for (const [sx, sy, sr] of spots) {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Blowhole core, pulses white when weapon is ready
    ctx.fillStyle = charge >= 1.0 ? "#ffffff" : "#2596be";
    ctx.beginPath();
    ctx.arc(0, 6, 3 + (charge >= 1.0 ? Math.sin(time * 8) * 1.2 : 0), 0, Math.PI * 2);
    ctx.fill();

    // Spiral tusk cannon
    ctx.strokeStyle = "#bfe9ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(0, 38);
    ctx.stroke();

    // Spiral grooves on the tusk
    ctx.strokeStyle = "rgba(26, 74, 102, 0.9)";
    ctx.lineWidth = 1.2;
    for (let g = 0; g < 5; g++) {
      const gy = 18 + g * 4;
      ctx.beginPath();
      ctx.moveTo(-2, gy);
      ctx.lineTo(2, gy + 2);
      ctx.stroke();
    }

    // Charge indicator climbing the tusk
    if (charge > 0) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.lineTo(0, 16 + 22 * charge);
      ctx.stroke();
    }

  } else if (level === 7) {
    // LEVEL 7: Canoe prow + jungle vignette (first-person overlay).
    // Engine calls this with (x, y) = (width/2, height-80), so recover screen dims.
    const W = x * 2;
    const H = y + 80;
    const lx = (sx: number) => sx - x;
    const ly = (sy: number) => sy - y;

    // Foreground leaves crowding the frame edges
    ctx.fillStyle = "rgba(8, 30, 14, 0.92)";
    for (let s = -1; s <= 1; s += 2) {
      const edgeX = s === -1 ? 0 : W;
      for (let l = 0; l < 3; l++) {
        const leafY = H * (0.2 + l * 0.28);
        const swayA = Math.sin(time * 0.9 + l * 2.1 + (s === 1 ? 1.5 : 0)) * 0.08;
        ctx.save();
        ctx.translate(lx(edgeX), ly(leafY));
        ctx.rotate(s * (-0.5 + l * 0.32) + swayA);
        ctx.beginPath();
        ctx.ellipse(s * -20, 0, 65, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Dugout canoe prow rising from the bottom
    ctx.fillStyle = "#2e1d10";
    ctx.strokeStyle = "#7a4a22";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(lx(W / 2 - 150), ly(H + 4));
    ctx.quadraticCurveTo(lx(W / 2), ly(H - 150), lx(W / 2 + 150), ly(H + 4));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Plank seams following the prow curve
    ctx.strokeStyle = "rgba(122, 74, 34, 0.55)";
    ctx.lineWidth = 1.5;
    for (let pl = 1; pl <= 3; pl++) {
      const shrink = 1 - pl * 0.22;
      ctx.beginPath();
      ctx.moveTo(lx(W / 2 - 150 * shrink), ly(H + 4));
      ctx.quadraticCurveTo(lx(W / 2), ly(H - 150 * shrink), lx(W / 2 + 150 * shrink), ly(H + 4));
      ctx.stroke();
    }

    // Carved totem cannon seated on the prow tip
    const tipY = H - 68;
    ctx.fillStyle = "#4a2f18";
    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(lx(W / 2 - 14), ly(tipY - 34), 28, 40, 5);
    ctx.fill();
    ctx.stroke();

    // Totem eyes glow as the note charges
    const eyeGlow = charge >= 1.0 ? 0.75 + Math.sin(time * 8) * 0.25 : 0.25 + charge * 0.5;
    ctx.fillStyle = `rgba(255, 230, 0, ${eyeGlow})`;
    ctx.shadowColor = "#ffe600";
    ctx.shadowBlur = charge >= 1.0 ? 10 : 4;
    ctx.beginPath();
    ctx.arc(lx(W / 2 - 6), ly(tipY - 22), 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lx(W / 2 + 6), ly(tipY - 22), 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Totem mouth doubles as dart muzzle and charge meter
    ctx.fillStyle = "#1c1208";
    ctx.beginPath();
    ctx.roundRect(lx(W / 2 - 8), ly(tipY - 10), 16, 8, 3);
    ctx.fill();
    if (charge > 0) {
      ctx.fillStyle = "#ffe600";
      ctx.beginPath();
      ctx.roundRect(lx(W / 2 - 8), ly(tipY - 10), 16 * charge, 8, 3);
      ctx.fill();
    }

  } else if (level === 8) {
    // LEVEL 8: Storm Glider (electric zeppelin)
    ctx.rotate(aimAngle - Math.PI / 2);

    // Twin propellers spinning (faster while charging)
    ctx.strokeStyle = "rgba(230, 220, 255, 0.65)";
    ctx.lineWidth = 2;
    for (let s = -1; s <= 1; s += 2) {
      ctx.save();
      ctx.translate(s * 16, -8);
      ctx.rotate(time * (14 + charge * 10) * s);
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(7, 0);
      ctx.moveTo(0, -7);
      ctx.lineTo(0, 7);
      ctx.stroke();
      ctx.restore();
    }

    // Hull
    ctx.fillStyle = "#241a38";
    ctx.strokeStyle = "#cc33ff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cabin
    ctx.fillStyle = "#3a2d5c";
    ctx.beginPath();
    ctx.roundRect(-5, -6, 10, 14, 3);
    ctx.fill();

    // Tesla coil nose
    ctx.strokeStyle = "#e6b3ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(0, 30);
    ctx.stroke();
    for (let r = 0; r < 3; r++) {
      ctx.beginPath();
      ctx.arc(0, 22 + r * 3, 2.4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Static arcs crackling at the tip while charging
    if (charge > 0) {
      ctx.strokeStyle = `rgba(240, 210, 255, ${0.4 + charge * 0.6})`;
      ctx.lineWidth = 1.4;
      for (let a = 0; a < 3; a++) {
        const ang = time * 9 + a * 2.1;
        ctx.beginPath();
        ctx.moveTo(0, 30);
        ctx.lineTo(Math.sin(ang) * 7 * charge, 30 + 6 * charge + Math.cos(ang * 1.3) * 3);
        ctx.stroke();
      }
    }

  } else if (level === 9) {
    // LEVEL 9: Bathyscaphe porthole (first-person overlay)
    const W = x * 2;
    const H = y + 80;
    const lx = (sx: number) => sx - x;
    const ly = (sy: number) => sy - y;

    // Hull vignette with circular window (reverse winding punches the hole)
    const R = Math.min(W, H) * 0.62;
    ctx.fillStyle = "rgba(6, 10, 16, 0.96)";
    ctx.beginPath();
    ctx.rect(lx(0), ly(0), W, H);
    ctx.arc(lx(W / 2), ly(H / 2), R, 0, Math.PI * 2, true);
    ctx.fill();

    // Window rim + rivets
    ctx.strokeStyle = "#28455e";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(lx(W / 2), ly(H / 2), R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#66b3ff";
    for (let rv = 0; rv < 12; rv++) {
      const a = (rv / 12) * Math.PI * 2 + 0.13;
      ctx.beginPath();
      ctx.arc(lx(W / 2 + Math.cos(a) * R), ly(H / 2 + Math.sin(a) * R), 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bottom console: depth gauge + harpoon charge
    ctx.fillStyle = "rgba(8, 16, 26, 0.9)";
    ctx.strokeStyle = "#66b3ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(lx(W / 2 - 120), ly(H - 46), 240, 34, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#66b3ff";
    ctx.font = "bold 11px Courier New";
    ctx.textAlign = "left";
    ctx.fillText(`PROF: ${(3800 + Math.sin(time * 0.4) * 6).toFixed(0)}m`, lx(W / 2 - 105), ly(H - 25));
    ctx.fillText(charge >= 1.0 ? "ARPÓN: LISTO" : `CARGA: ${Math.round(charge * 100)}%`, lx(W / 2 + 8), ly(H - 25));

  } else if (level === 10) {
    // LEVEL 10: Obsidian Golem
    ctx.rotate(aimAngle - Math.PI / 2);

    // Shoulder plates
    ctx.fillStyle = "#221410";
    ctx.strokeStyle = "#ff3333";
    ctx.lineWidth = 2;
    for (let s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.moveTo(s * 10, -14);
      ctx.lineTo(s * 22, -8);
      ctx.lineTo(s * 20, 6);
      ctx.lineTo(s * 9, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Torso
    ctx.fillStyle = "#1a0e0a";
    ctx.strokeStyle = "#ff3333";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-11, -16, 22, 32, 6);
    ctx.fill();
    ctx.stroke();

    // Molten core: brightness follows the charge
    const coreGlow = 0.35 + charge * 0.65;
    ctx.fillStyle = `rgba(255, 140, 40, ${coreGlow})`;
    ctx.shadowColor = "#ff5a14";
    ctx.shadowBlur = 4 + charge * 10;
    ctx.beginPath();
    ctx.arc(0, -2, 6 + (charge >= 1.0 ? Math.sin(time * 8) * 1.5 : 0), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cracks radiating from the core
    ctx.strokeStyle = `rgba(255, 140, 40, ${0.3 + charge * 0.5})`;
    ctx.lineWidth = 1.4;
    for (let a = 0; a < 4; a++) {
      const ang = a * 1.57 + 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * 7, -2 + Math.sin(ang) * 7);
      ctx.lineTo(Math.cos(ang) * 11, -2 + Math.sin(ang) * 11);
      ctx.stroke();
    }

    // Magma cannon arm
    ctx.strokeStyle = "#ff3333";
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(0, 30);
    ctx.stroke();
    if (charge > 0) {
      ctx.strokeStyle = "#ffcc66";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(0, 12 + 18 * charge);
      ctx.stroke();
    }

  } else if (level === 11) {
    // LEVEL 11: Seraph Guardian
    ctx.rotate(aimAngle - Math.PI / 2);

    // Fanned feather wings, beating gently
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillStyle = "rgba(235, 240, 252, 0.28)";
    ctx.lineWidth = 1.6;
    const beat = Math.sin(time * (2 + charge * 4)) * 0.12;
    for (let s = -1; s <= 1; s += 2) {
      for (let f = 0; f < 3; f++) {
        ctx.save();
        ctx.translate(s * 7, -6);
        ctx.rotate(s * (0.55 + f * 0.38 + beat));
        ctx.beginPath();
        ctx.ellipse(s * 13, 0, 15, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // Marble robe silhouette
    ctx.fillStyle = "#dfe4f0";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.quadraticCurveTo(11, 6, 8, -10);
    ctx.quadraticCurveTo(0, -18, -8, -10);
    ctx.quadraticCurveTo(-11, 6, 0, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Halo
    ctx.strokeStyle = "rgba(255, 233, 168, 0.9)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, -6, 6.5, 0, Math.PI * 2);
    ctx.stroke();

    // Light lance
    ctx.strokeStyle = "#ffffff";
    ctx.shadowColor = "#fff7d6";
    ctx.shadowBlur = 6 + charge * 8;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(0, 34);
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (charge > 0) {
      ctx.strokeStyle = "rgba(255, 233, 168, 0.95)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.lineTo(0, 14 + 20 * charge);
      ctx.stroke();
    }

  } else if (level === 12) {
    // LEVEL 12: Lunar Rover
    ctx.rotate(aimAngle - Math.PI / 2);

    // Six wheels
    ctx.fillStyle = "#111114";
    ctx.strokeStyle = "#8f8f98";
    ctx.lineWidth = 1.5;
    for (let s = -1; s <= 1; s += 2) {
      for (let w = 0; w < 3; w++) {
        ctx.beginPath();
        ctx.roundRect(s * 14 - 3, -16 + w * 12, 6, 9, 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Chassis
    ctx.fillStyle = "#3a3a40";
    ctx.strokeStyle = "#c8c8d0";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-11, -18, 22, 34, 5);
    ctx.fill();
    ctx.stroke();

    // Solar panel
    ctx.fillStyle = "#1c2a4a";
    ctx.strokeStyle = "#5577aa";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-8, -14, 16, 12, 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(0, -2);
    ctx.moveTo(-8, -8);
    ctx.lineTo(8, -8);
    ctx.stroke();

    // Radar dish scanning
    ctx.save();
    ctx.translate(0, 4);
    ctx.rotate(Math.sin(time * 1.4) * 0.9);
    ctx.strokeStyle = "#c8c8d0";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, Math.PI * 0.15, Math.PI * 0.85, true);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -4);
    ctx.stroke();
    ctx.restore();

    // Railgun rail
    ctx.strokeStyle = "#e8e8ee";
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(0, 32);
    ctx.stroke();
    if (charge > 0) {
      ctx.strokeStyle = charge >= 1.0 ? "#ffffff" : "#9fd0ff";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.lineTo(0, 14 + 18 * charge);
      ctx.stroke();
    }

  } else if (level === 13) {
    // LEVEL 13: Glitch cockpit (first-person overlay)
    const W = x * 2;
    const H = y + 80;
    const lx = (sx: number) => sx - x;
    const ly = (sy: number) => sy - y;

    // Angular neon consoles
    ctx.fillStyle = "rgba(20, 6, 28, 0.88)";
    ctx.strokeStyle = "#ff80df";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx(-6), ly(H + 6));
    ctx.lineTo(lx(W * 0.16), ly(H - 78));
    ctx.lineTo(lx(W * 0.34), ly(H - 40));
    ctx.lineTo(lx(W * 0.30), ly(H + 6));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lx(W + 6), ly(H + 6));
    ctx.lineTo(lx(W * 0.84), ly(H - 78));
    ctx.lineTo(lx(W * 0.66), ly(H - 40));
    ctx.lineTo(lx(W * 0.70), ly(H + 6));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cyan scanlines shimmering across the consoles
    ctx.strokeStyle = "rgba(128, 255, 234, 0.25)";
    ctx.lineWidth = 1;
    for (let sl = 0; sl < 4; sl++) {
      const yy = H - 66 + sl * 16 + ((time * 22) % 16);
      ctx.beginPath();
      ctx.moveTo(lx(W * 0.02), ly(yy));
      ctx.lineTo(lx(W * 0.30), ly(yy + 8));
      ctx.moveTo(lx(W * 0.70), ly(yy + 8));
      ctx.lineTo(lx(W * 0.98), ly(yy));
      ctx.stroke();
    }

    // Console readouts — the interval is unknown until it sounds
    ctx.fillStyle = "#ff80df";
    ctx.font = "bold 11px Courier New";
    ctx.textAlign = "left";
    const glitchChar = ["?", "#", "%", "?"][Math.floor(time * 6) % 4];
    ctx.fillText(`INTERVALO: ${glitchChar}${glitchChar}`, lx(W * 0.05), ly(H - 24));
    ctx.fillText(charge >= 1.0 ? "PRISMA: LISTO" : `PRISMA: ${Math.round(charge * 100)}%`, lx(W * 0.72), ly(H - 24));

    // Central charge diamond
    const dPulse = charge >= 1.0 ? 1 + Math.sin(time * 9) * 0.18 : 1;
    ctx.strokeStyle = charge >= 1.0 ? "#ffffff" : "#ff80df";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx(W / 2), ly(H - 58 - 12 * dPulse));
    ctx.lineTo(lx(W / 2 + 9 * dPulse), ly(H - 46));
    ctx.lineTo(lx(W / 2), ly(H - 34 + 12 * (dPulse - 1)));
    ctx.lineTo(lx(W / 2 - 9 * dPulse), ly(H - 46));
    ctx.closePath();
    ctx.stroke();
    if (charge > 0) {
      ctx.fillStyle = `rgba(255, 128, 223, ${0.25 + charge * 0.6})`;
      ctx.fill();
    }

  } else {
    // LEVEL 4: FPS Cockpit Overlay (no player rotation needed since camera rotates).
    // Engine calls this with (x, y) = (width/2, height-80), so recover screen dims.
    const W = x * 2;
    const H = y + 80;
    const lx = (sx: number) => sx - x;
    const ly = (sy: number) => sy - y;

    // Console wedges at the bottom corners
    ctx.fillStyle = "rgba(12, 8, 20, 0.85)";
    ctx.strokeStyle = "#df73ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx(-10), ly(H + 8));
    ctx.lineTo(lx(-10), ly(H - 64));
    ctx.lineTo(lx(W * 0.30), ly(H - 34));
    ctx.lineTo(lx(W * 0.34), ly(H + 8));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lx(W + 10), ly(H + 8));
    ctx.lineTo(lx(W + 10), ly(H - 64));
    ctx.lineTo(lx(W * 0.70), ly(H - 34));
    ctx.lineTo(lx(W * 0.66), ly(H + 8));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Digital readouts
    ctx.fillStyle = "#df73ff";
    ctx.font = "bold 11px Courier New";
    ctx.textAlign = "left";
    ctx.fillText("SYS: ON", lx(24), ly(H - 34));
    ctx.fillText(`CHARGE: ${Math.round(charge * 100)}%`, lx(24), ly(H - 19));
    ctx.fillText("WEAPON: ST-4", lx(W - 118), ly(H - 34));
    ctx.fillText(charge >= 1.0 ? "LOCK: READY" : "LOCK: SEARCH", lx(W - 118), ly(H - 19));

    // Status LEDs blinking on the left console
    for (let d = 0; d < 3; d++) {
      const on = Math.sin(time * (2.4 + d * 0.9) + d * 2.1) > 0;
      ctx.fillStyle = on ? "#7af0c9" : "rgba(122, 240, 201, 0.18)";
      ctx.beginPath();
      ctx.arc(lx(28 + d * 14), ly(H - 50), 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Charge bar on the right console
    ctx.strokeStyle = "#df73ff";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(lx(W - 118), ly(H - 58), 96, 8);
    if (charge > 0) {
      ctx.fillStyle = charge >= 1.0 ? "#ffffff" : "#df73ff";
      ctx.fillRect(lx(W - 116), ly(H - 56), 92 * charge, 4);
    }
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

    // Gyroscopic arc segments spinning inside
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1.6;
    for (let seg = 0; seg < 3; seg++) {
      const a0 = time * 1.8 + seg * 2.09;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.72, a0, a0 + 0.9);
      ctx.stroke();
    }

    // Twin micro-satellites counter-orbiting
    ctx.fillStyle = mainColor;
    const orbitAngle = time * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(orbitAngle) * (size + 8), Math.sin(orbitAngle) * (size + 8), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(Math.cos(-orbitAngle * 1.4 + 2) * (size + 12), Math.sin(-orbitAngle * 1.4 + 2) * (size + 12), 2.6, 0, Math.PI * 2);
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

    // Propeller actually spinning
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.8;
    const propA = time * 12;
    ctx.beginPath();
    ctx.moveTo(size * 1.25 + Math.sin(propA) * 2, -Math.cos(propA) * 6);
    ctx.lineTo(size * 1.25 - Math.sin(propA) * 2, Math.cos(propA) * 6);
    ctx.stroke();

    // Bubbles streaming off the propeller
    ctx.fillStyle = "rgba(210, 235, 255, 0.4)";
    for (let b = 0; b < 3; b++) {
      const bt = (time * 0.9 + b * 0.33) % 1;
      ctx.beginPath();
      ctx.arc(size * (1.3 + bt * 0.8), -bt * size * 0.6, 2.5 * (1 - bt) + 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Periscope lens glint
    if (Math.sin(time * 2.7) > 0.75) {
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(6, -size * 1.1, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

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

    // Rivets around the border
    ctx.fillStyle = glowColor;
    const rivets3: [number, number][] = [
      [0, -size * 0.85], [size * 0.82, -size * 0.5], [size * 0.68, size * 0.42],
      [0, size * 0.85], [-size * 0.68, size * 0.42], [-size * 0.82, -size * 0.5]
    ];
    for (const [rx3, ry3] of rivets3) {
      ctx.beginPath();
      ctx.arc(rx3, ry3, size * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }

    // Torchlight glint sweeping across the face
    const gl3 = ((time * 0.5) % 1) * 2 - 1;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, -size * 0.6);
    ctx.lineTo(size * 0.8, size * 0.5);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.8, size * 0.5);
    ctx.lineTo(-size, -size * 0.6);
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = "rgba(255, 240, 200, 0.18)";
    ctx.lineWidth = size * 0.35;
    ctx.beginPath();
    ctx.moveTo(gl3 * size * 2 - size * 0.5, -size);
    ctx.lineTo(gl3 * size * 2 + size * 0.5, size);
    ctx.stroke();
    ctx.restore();

  } else if (level === 5) {
    // LEVEL 5: Winged sarcophagus drone
    const flap = Math.sin(time * 6) * 0.3;
    ctx.fillStyle = "rgba(255, 204, 0, 0.16)";
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 1.5;
    for (let s = -1; s <= 1; s += 2) {
      ctx.save();
      ctx.rotate(s * flap);
      ctx.beginPath();
      ctx.ellipse(s * size * 1.2, 0, size * 0.85, size * 0.35, s * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Cartouche body
    ctx.fillStyle = "#2b2109";
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-size * 0.9, -size, size * 1.8, size * 2, size * 0.65);
    ctx.fill();
    ctx.stroke();

    // Golden trim band
    ctx.strokeStyle = "rgba(255, 204, 0, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-size * 0.72, -size * 0.82, size * 1.44, size * 1.64, size * 0.5);
    ctx.stroke();

  } else if (level === 6) {
    // LEVEL 6: Crystalline snowflake drone (six arms for level six)
    const spin = time * 0.7;
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2;
    for (let arm = 0; arm < 6; arm++) {
      const a = spin + (arm / 6) * Math.PI * 2;
      const ex = Math.cos(a) * size * 1.55;
      const ey = Math.sin(a) * size * 1.55;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // Side branches on each arm
      const bx = Math.cos(a) * size * 1.1;
      const by = Math.sin(a) * size * 1.1;
      for (let s = -1; s <= 1; s += 2) {
        const ba = a + s * 0.6;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(ba) * size * 0.38, by + Math.sin(ba) * size * 0.38);
        ctx.stroke();
      }

      // Crystal tip
      ctx.fillStyle = "#bfe9ff";
      ctx.beginPath();
      ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hexagonal ice core
    ctx.fillStyle = "rgba(8, 30, 46, 0.92)";
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let v = 0; v < 6; v++) {
      const a = spin * 0.4 + (v / 6) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * size * 1.02;
      const py = Math.sin(a) * size * 1.02;
      if (v === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner frost sheen
    ctx.strokeStyle = "rgba(191, 233, 255, 0.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.62, 0, Math.PI * 2);
    ctx.stroke();

  } else if (level === 7) {
    // LEVEL 7: Giant mech-hornet
    // Wing blur (fast flap)
    const flap = 0.45 + Math.abs(Math.sin(time * 26)) * 0.55;
    ctx.fillStyle = `rgba(220, 240, 255, ${0.12 + flap * 0.18})`;
    for (let s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.ellipse(s * size * 0.95, -size * 0.5, size * 0.85, size * 0.32 * flap, s * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Abdomen
    ctx.fillStyle = "#221a06";
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.85, size * 0.6, size * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Warning stripes clipped to the abdomen
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, size * 0.85, size * 0.6, size * 0.85, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(255, 230, 0, 0.8)";
    ctx.fillRect(-size, size * 0.85, size * 2, size * 0.2);
    ctx.fillRect(-size, size * 1.25, size * 2, size * 0.2);
    ctx.restore();

    // Stinger
    ctx.fillStyle = "#ffe600";
    ctx.beginPath();
    ctx.moveTo(-size * 0.12, size * 1.6);
    ctx.lineTo(size * 0.12, size * 1.6);
    ctx.lineTo(0, size * 1.95);
    ctx.closePath();
    ctx.fill();

    // Thorax core (holds the note label)
    ctx.fillStyle = "#161104";
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head with glowing eyes and antennae
    ctx.fillStyle = "#221a06";
    ctx.beginPath();
    ctx.arc(0, -size * 1.15, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffe600";
    ctx.beginPath();
    ctx.arc(-size * 0.14, -size * 1.2, size * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.14, -size * 1.2, size * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffe600";
    ctx.lineWidth = 1.3;
    for (let s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.moveTo(s * size * 0.12, -size * 1.45);
      ctx.quadraticCurveTo(s * size * 0.4, -size * 1.75, s * size * 0.55, -size * 1.6);
      ctx.stroke();
    }

  } else if (level === 8) {
    // LEVEL 8: Storm wisp — thundercloud with a flickering bolt heart
    ctx.fillStyle = "#332a52";
    ctx.beginPath();
    ctx.arc(-size * 0.55, size * 0.15, size * 0.55, 0, Math.PI * 2);
    ctx.arc(0, -size * 0.25, size * 0.72, 0, Math.PI * 2);
    ctx.arc(size * 0.55, size * 0.18, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Dark core so the note stays readable
    ctx.fillStyle = "#1c1530";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2);
    ctx.fill();

    // Flickering lightning heart
    const flick = 0.6 + Math.sin(time * 17) * 0.4;
    ctx.strokeStyle = `rgba(240, 210, 255, ${0.35 + flick * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, -size * 0.45);
    ctx.lineTo(size * 0.05, -size * 0.05);
    ctx.lineTo(-size * 0.12, size * 0.05);
    ctx.lineTo(size * 0.3, size * 0.5);
    ctx.stroke();

  } else if (level === 9) {
    // LEVEL 9: Abyssal anglerfish
    // Lure stalk bobbing overhead
    const bob = Math.sin(time * 2.4) * size * 0.08;
    ctx.strokeStyle = "rgba(150, 200, 255, 0.6)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.9);
    ctx.quadraticCurveTo(size * 0.28, -size * 1.5, size * 0.05, -size * 1.55 + bob);
    ctx.stroke();

    // Glowing lure
    const lureGlow = 0.7 + Math.sin(time * 5) * 0.3;
    ctx.fillStyle = `rgba(190, 255, 250, ${lureGlow})`;
    ctx.shadowColor = "#66ffee";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(size * 0.05, -size * 1.55 + bob, size * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Body
    ctx.fillStyle = "#0a1626";
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Needle teeth along the lower jaw
    ctx.fillStyle = "#cfe8ff";
    for (let t = -2; t <= 2; t++) {
      ctx.beginPath();
      ctx.moveTo(t * size * 0.18 - size * 0.05, size * 0.68);
      ctx.lineTo(t * size * 0.18 + size * 0.05, size * 0.68);
      ctx.lineTo(t * size * 0.18, size * 0.92);
      ctx.closePath();
      ctx.fill();
    }

    // Beady glinting eyes
    ctx.fillStyle = "#9fd0ff";
    ctx.beginPath();
    ctx.arc(-size * 0.35, -size * 0.35, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.35, -size * 0.35, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

  } else if (level === 10) {
    // LEVEL 10: Magma imp — molten core under cracked crust plates
    const g10 = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size);
    g10.addColorStop(0, "#ff9a3c");
    g10.addColorStop(1, "#7a1e06");
    ctx.fillStyle = g10;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Dark crust plates (center one keeps the note readable)
    ctx.fillStyle = "rgba(26, 14, 10, 0.85)";
    const plates: [number, number, number][] = [
      [-0.45, -0.4, 0.34], [0.4, -0.3, 0.3], [-0.25, 0.42, 0.3], [0.35, 0.45, 0.26], [0.02, -0.02, 0.42]
    ];
    for (const [px, py, pr] of plates) {
      ctx.beginPath();
      ctx.arc(px * size, py * size, pr * size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flame wisp licking off the top
    const lick = Math.sin(time * 7) * size * 0.1;
    ctx.fillStyle = "rgba(255, 170, 60, 0.8)";
    ctx.beginPath();
    ctx.moveTo(-size * 0.25, -size * 0.85);
    ctx.quadraticCurveTo(-size * 0.15 + lick, -size * 1.35, size * 0.05 + lick, -size * 1.1);
    ctx.quadraticCurveTo(size * 0.1, -size * 0.95, size * 0.3, -size * 0.8);
    ctx.closePath();
    ctx.fill();

  } else if (level === 11) {
    // LEVEL 11: Errant spirit orb
    // Wispy ribbons trailing around it
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 2;
    for (let r = 0; r < 3; r++) {
      const a = time * 1.6 + r * 2.09;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * size * 0.9, Math.sin(a) * size * 0.9);
      ctx.quadraticCurveTo(
        Math.cos(a + 0.9) * size * 1.5, Math.sin(a + 0.9) * size * 1.5,
        Math.cos(a + 1.6) * size * 1.15, Math.sin(a + 1.6) * size * 1.15
      );
      ctx.stroke();
    }

    // Orb body: dark heart with a pale rim
    const g11 = ctx.createRadialGradient(0, 0, size * 0.3, 0, 0, size);
    g11.addColorStop(0, "#141a30");
    g11.addColorStop(0.8, "#232c4e");
    g11.addColorStop(1, "rgba(235, 240, 252, 0.28)");
    ctx.fillStyle = g11;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Inner sparkles orbiting
    ctx.fillStyle = "rgba(255, 250, 230, 0.85)";
    for (let sp = 0; sp < 3; sp++) {
      const a = -time * 2.2 + sp * 2.09;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * size * 0.55, Math.sin(a) * size * 0.55, size * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (level === 12) {
    // LEVEL 12: Tumbling meteoroid
    ctx.save();
    ctx.rotate(time * 0.9);
    ctx.fillStyle = "#2e2e33";
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let v = 0; v < 9; v++) {
      const a = (v / 9) * Math.PI * 2;
      const rr = size * (0.82 + 0.18 * Math.sin(v * 2.7));
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (v === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pockmark craters
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    const pocks: [number, number, number][] = [[-0.35, -0.2, 0.2], [0.3, 0.25, 0.16], [0.05, -0.45, 0.12]];
    for (const [rx, ry, rr] of pocks) {
      ctx.beginPath();
      ctx.arc(rx * size, ry * size, rr * size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

  } else if (level === 13) {
    // LEVEL 13: Chaos polyhedron — colors shift, interval unknown until heard
    const hue = (time * 60) % 360;
    ctx.save();
    ctx.rotate(time * 1.1);
    ctx.strokeStyle = `hsla(${hue}, 90%, 70%, 0.8)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let v = 0; v < 6; v++) {
      const a = (v / 6) * Math.PI * 2;
      const px = Math.cos(a) * size * 1.28;
      const py = Math.sin(a) * size * 1.28;
      if (v === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Counter-rotating inner triangle
    ctx.rotate(-time * 3.4);
    ctx.strokeStyle = `hsla(${(hue + 140) % 360}, 90%, 70%, 0.55)`;
    ctx.beginPath();
    for (let v = 0; v < 3; v++) {
      const a = (v / 3) * Math.PI * 2;
      const px = Math.cos(a) * size * 1.28;
      const py = Math.sin(a) * size * 1.28;
      if (v === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Void core
    ctx.fillStyle = "#150b1e";
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

  } else {
    // LEVEL 4: FPS incoming sphere
    // Thruster flare flickering behind the hull
    const flare4 = 0.6 + Math.sin(time * 13) * 0.4;
    ctx.fillStyle = `rgba(223, 115, 255, ${0.25 * flare4})`;
    ctx.beginPath();
    ctx.ellipse(0, size * 1.15, size * 0.4, size * 0.55 * flare4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(10, 5, 20, 0.9)";
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Gyroscopic ring wobbling around the hull
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 1.25, size * (0.08 + Math.abs(Math.sin(time * 1.4)) * 0.45), 0, 0, Math.PI * 2);
    ctx.stroke();

    // Retro visual rings inside the circle
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
    ctx.stroke();

    // Blinking hull lights
    ctx.fillStyle = "#ffffff";
    for (let li = 0; li < 3; li++) {
      if (Math.sin(time * 4 + li * 2.1) > 0.4) {
        const a = li * 2.09 + 0.5;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * size * 0.82, Math.sin(a) * size * 0.82, size * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    }
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

    // Plasma spark trail
    ctx.fillStyle = "rgba(0, 255, 204, 0.55)";
    for (let p = 0; p < 3; p++) {
      const off = -9 - p * 6 - ((time * 60) % 6);
      ctx.beginPath();
      ctx.arc(Math.sin(time * 14 + p * 2) * 2, off, 2.2 - p * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (level === 2) {
    // LEVEL 2: Torpedo with tail bubble
    ctx.fillStyle = "#1c2022";
    ctx.strokeStyle = "#00a2ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-3, -8, 6, 16, 2);
    ctx.fill();
    ctx.stroke();

    // Bubble wake streaming behind
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    for (let b = 0; b < 3; b++) {
      const off = -12 - b * 5 - ((time * 40) % 5);
      ctx.beginPath();
      ctx.arc(Math.sin(time * 10 + b) * 2, off, 2.5 - b * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Spinning tail propeller
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 1.4;
    const pa2 = time * 18;
    ctx.beginPath();
    ctx.moveTo(-Math.cos(pa2) * 4, -8);
    ctx.lineTo(Math.cos(pa2) * 4, -8);
    ctx.stroke();

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

    // Ember-and-smoke trail
    for (let e = 0; e < 4; e++) {
      const et = (time * 2.2 + e * 0.25) % 1;
      ctx.fillStyle = e % 2 === 0
        ? `rgba(255, 150, 40, ${0.5 * (1 - et)})`
        : `rgba(90, 80, 70, ${0.35 * (1 - et)})`;
      ctx.beginPath();
      ctx.arc(Math.sin(time * 9 + e * 1.9) * 3, -12 - et * 18, 3.2 * (1 - et) + 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (level === 5) {
    // LEVEL 5: Spinning solar disc
    ctx.rotate(time * 12);
    const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, 10);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.45, "#ffcc00");
    grad.addColorStop(1, "rgba(255, 204, 0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Radiating sun rays
    ctx.strokeStyle = "rgba(255, 220, 80, 0.9)";
    ctx.lineWidth = 2;
    for (let r = 0; r < 4; r++) {
      const a = (r / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
      ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
      ctx.stroke();
    }

  } else if (level === 6) {
    // LEVEL 6: Icicle shard, sharp tip forward
    const grad = ctx.createLinearGradient(0, -14, 0, 16);
    grad.addColorStop(0, "rgba(51, 204, 255, 0)");
    grad.addColorStop(0.55, "#bfe9ff");
    grad.addColorStop(1, "#ffffff");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#33ccff";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#33ccff";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(-4.5, 2);
    ctx.lineTo(-2.5, -12);
    ctx.lineTo(2.5, -12);
    ctx.lineTo(4.5, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Frost sparkle trail
    ctx.fillStyle = "rgba(191, 233, 255, 0.7)";
    for (let s = 0; s < 3; s++) {
      const off = -16 - s * 7 - ((time * 40) % 7);
      ctx.beginPath();
      ctx.arc(Math.sin(time * 9 + s * 2.1) * 3, off, 1.8 - s * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (level === 7) {
    // LEVEL 7: Blow-dart energy bolt
    ctx.shadowColor = "#ffe600";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "#ffe600";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 12);
    ctx.stroke();

    // Hardened tip
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(-3, 10);
    ctx.lineTo(3, 10);
    ctx.lineTo(0, 18);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Leaf fletching
    ctx.fillStyle = "#38b24a";
    for (let s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.ellipse(s * 3.4, -9, 4.5, 2, s * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (level === 8) {
    // LEVEL 8: Ball lightning
    const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, 9);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.5, "#cc33ff");
    grad.addColorStop(1, "rgba(204, 51, 255, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    // Crackling sparks
    ctx.strokeStyle = "rgba(240, 210, 255, 0.9)";
    ctx.lineWidth = 1.4;
    for (let a = 0; a < 4; a++) {
      const ang = time * 20 + a * 1.57;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * 4, Math.sin(ang) * 4);
      ctx.lineTo(
        Math.cos(ang) * (9 + Math.sin(time * 31 + a) * 3),
        Math.sin(ang) * (9 + Math.cos(time * 27 + a) * 3)
      );
      ctx.stroke();
    }

  } else if (level === 9) {
    // LEVEL 9: Supercavitating harpoon
    ctx.shadowColor = "#66b3ff";
    ctx.shadowBlur = 9;
    ctx.fillStyle = "#cfe8ff";
    ctx.strokeStyle = "#66b3ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(-3, 6);
    ctx.lineTo(-2.2, -12);
    ctx.lineTo(2.2, -12);
    ctx.lineTo(3, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Cavitation bubble trail
    ctx.fillStyle = "rgba(200, 235, 255, 0.5)";
    for (let b = 0; b < 3; b++) {
      const off = -14 - b * 6 - ((time * 50) % 6);
      ctx.beginPath();
      ctx.arc(Math.sin(time * 11 + b * 2) * 2.5, off, 2 - b * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (level === 10) {
    // LEVEL 10: Magma glob
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 10);
    grad.addColorStop(0, "#fff2cc");
    grad.addColorStop(0.4, "#ffaa00");
    grad.addColorStop(0.8, "#ff3333");
    grad.addColorStop(1, "rgba(255, 51, 51, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Dripping molten trail
    ctx.fillStyle = "rgba(255, 120, 40, 0.65)";
    for (let d = 0; d < 3; d++) {
      const off = -10 - d * 6 - ((time * 45) % 6);
      ctx.beginPath();
      ctx.arc(Math.sin(time * 8 + d) * 2, off, 2.4 - d * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (level === 11) {
    // LEVEL 11: Lance of light
    ctx.shadowColor = "#fff7d6";
    ctx.shadowBlur = 12;
    const grad = ctx.createLinearGradient(0, -16, 0, 18);
    grad.addColorStop(0, "rgba(255, 255, 255, 0)");
    grad.addColorStop(0.6, "#fff7d6");
    grad.addColorStop(1, "#ffffff");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.lineTo(-3, 0);
    ctx.lineTo(0, -16);
    ctx.lineTo(3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Halo ring trailing behind
    ctx.strokeStyle = "rgba(255, 233, 168, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -10 - ((time * 30) % 8), 4.5, 0, Math.PI * 2);
    ctx.stroke();

  } else if (level === 12) {
    // LEVEL 12: White-hot railgun slug
    ctx.strokeStyle = "#ffffff";
    ctx.shadowColor = "#9fd0ff";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(0, -6);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Ionized trail fading
    ctx.strokeStyle = "rgba(159, 208, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, -20);
    ctx.stroke();

  } else if (level === 13) {
    // LEVEL 13: Prism bolt cycling through the spectrum
    const hue = (time * 240) % 360;
    ctx.strokeStyle = `hsl(${hue}, 95%, 70%)`;
    ctx.fillStyle = `hsla(${hue}, 95%, 70%, 0.35)`;
    ctx.shadowColor = `hsl(${hue}, 95%, 70%)`;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.save();
    ctx.rotate(time * 9);
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(8, 6);
    ctx.lineTo(-8, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;

  } else {
    // LEVEL 4: Laser ray beam with white-hot core
    ctx.strokeStyle = "#ff00a2";
    ctx.lineWidth = 5;
    ctx.shadowColor = "#ff00a2";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(0, 16);
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(0, 14);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Sparking tip
    ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + Math.sin(time * 30) * 0.4})`;
    ctx.beginPath();
    ctx.arc(0, 16, 3, 0, Math.PI * 2);
    ctx.fill();
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
  _time: number,
  level = 4
) {
  const cx = width / 2 + aimXOffset;
  const cy = height / 2;

  // Per-level HUD accent: green cockpit (4), amber jungle (7), abyss blue (9), vortex pink (13)
  const HUD_ACCENTS: Record<number, [string, string]> = {
    7: ["#ffe600", "rgba(255, 230, 0, 0.4)"],
    9: ["#66b3ff", "rgba(102, 179, 255, 0.4)"],
    13: ["#ff80df", "rgba(255, 128, 223, 0.4)"]
  };
  const [accent, accentDim] = HUD_ACCENTS[level] ?? ["#1df06a", "rgba(29, 240, 106, 0.4)"];

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
  const crossColor = strikes >= 3 ? "#ff3b30" : accent;
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
  ctx.strokeStyle = accentDim;
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
