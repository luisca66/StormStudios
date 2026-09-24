/**
 * Effects: motor de FX sobre un canvas que cubre la zona de juego.
 * Misiles con estela, explosiones de partículas, ondas de choque,
 * screen-shake y flash de pantalla. Todo en coordenadas locales (px CSS)
 * relativas al contenedor.
 */

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  gravity: number;
  drag: number;
}

interface Ring {
  x: number; y: number;
  r: number; maxR: number;
  life: number; maxLife: number;
  color: string; width: number;
}

interface Missile {
  sx: number; sy: number;
  tx: number; ty: number;
  x: number; y: number;
  t: number; duration: number;
  arc: number;
  color: string;
  trailAccum: number;
  onArrive: () => void;
}

const NEON_FIRE = ['#ffffff', '#ffe9a8', '#ffd35c', '#ff9d3c', '#ff5e3a', '#ff4fbf', '#00e5ff'];

export class Effects {
  private container: HTMLElement;
  private shakeEl: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private flashEl: HTMLDivElement;
  private resizeObs: ResizeObserver;

  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private missiles: Missile[] = [];

  private running = false;
  private lastTime = 0;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);

  private shakeMag = 0;
  private shakeT = 0;
  private shakeDur = 0;

  constructor(container: HTMLElement, shakeEl?: HTMLElement) {
    this.container = container;
    this.shakeEl = shakeEl ?? container;

    this.canvas = document.createElement('canvas');
    Object.assign(this.canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '30',
    } as CSSStyleDeclaration);
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true })!;

    this.flashEl = document.createElement('div');
    Object.assign(this.flashEl.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      opacity: '0',
      zIndex: '24',
      mixBlendMode: 'screen',
    } as CSSStyleDeclaration);
    container.appendChild(this.flashEl);

    this.resize();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);
  }

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /** Centro de un elemento en coordenadas locales del contenedor (px CSS). */
  public centerOf(el: HTMLElement): { x: number; y: number } {
    const cr = this.container.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    return {
      x: er.left + er.width / 2 - cr.left,
      y: er.top + er.height / 2 - cr.top,
    };
  }

  public get width() { return this.container.clientWidth; }
  public get height() { return this.container.clientHeight; }

  /** Lanza un misil que viaja del origen al destino y dispara onArrive al impactar. */
  public fireMissile(sx: number, sy: number, tx: number, ty: number, onArrive: () => void) {
    const dist = Math.hypot(tx - sx, ty - sy);
    this.missiles.push({
      sx, sy, tx, ty, x: sx, y: sy,
      t: 0,
      duration: Math.min(0.55, 0.22 + dist / 900),
      arc: Math.min(80, dist * 0.25),
      color: '#bff7ff',
      trailAccum: 0,
      onArrive,
    });
    this.ensureRunning();
  }

  /** Explosión: núcleo brillante, metralla, chispas y onda de choque. */
  public explosion(x: number, y: number, opts: { power?: number; colors?: string[]; ring?: string } = {}) {
    const power = opts.power ?? 1;
    const colors = opts.colors ?? NEON_FIRE;
    const count = Math.round(38 * power);

    // Metralla principal
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = (Math.random() * 160 + 90) * power;
      this.particles.push({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.6,
        size: (Math.random() * 3 + 2) * power,
        color: colors[(Math.random() * colors.length) | 0],
        gravity: 340,
        drag: 1.8,
      });
    }
    // Chispas rápidas y finas
    for (let i = 0; i < Math.round(16 * power); i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = (Math.random() * 360 + 180) * power;
      this.particles.push({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0,
        maxLife: 0.25 + Math.random() * 0.3,
        size: Math.random() * 1.6 + 0.8,
        color: '#ffffff',
        gravity: 120,
        drag: 2.6,
      });
    }
    // Ondas de choque
    this.rings.push({ x, y, r: 4, maxR: 60 * power, life: 0, maxLife: 0.45, color: opts.ring ?? '#ffffff', width: 3 });
    this.rings.push({ x, y, r: 2, maxR: 95 * power, life: 0, maxLife: 0.6, color: opts.ring ?? '#00e5ff', width: 2 });

    this.ensureRunning();
  }

  /** Sacudida de cámara. */
  public shake(magnitude: number, duration = 0.4) {
    this.shakeMag = Math.max(this.shakeMag, magnitude);
    this.shakeDur = Math.max(this.shakeDur, duration);
    this.shakeT = 0;
    this.ensureRunning();
  }

  /** Destello de color sobre la zona de juego. */
  public flash(color: string, duration = 0.4, peak = 0.55) {
    this.flashEl.style.transition = 'none';
    this.flashEl.style.background = color;
    this.flashEl.style.opacity = String(peak);
    // Forzar reflow para reiniciar la transición
    void this.flashEl.offsetWidth;
    this.flashEl.style.transition = `opacity ${duration}s ease-out`;
    this.flashEl.style.opacity = '0';
  }

  public destroy() {
    this.resizeObs.disconnect();
    this.canvas.remove();
    this.flashEl.remove();
    this.particles = [];
    this.rings = [];
    this.missiles = [];
    this.running = false;
  }

  private ensureRunning() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.frame);
  }

  private hasWork() {
    return this.particles.length > 0 || this.rings.length > 0 || this.missiles.length > 0 || this.shakeMag > 0;
  }

  private frame = (now: number) => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.update(dt);
    this.draw();
    if (this.hasWork()) {
      requestAnimationFrame(this.frame);
    } else {
      this.running = false;
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  };

  private update(dt: number) {
    // Misiles
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.t += dt / m.duration;
      const tt = m.t < 0.5 ? 2 * m.t * m.t : 1 - Math.pow(-2 * m.t + 2, 2) / 2; // easeInOutQuad
      m.x = m.sx + (m.tx - m.sx) * tt;
      m.y = m.sy + (m.ty - m.sy) * tt - Math.sin(Math.min(1, m.t) * Math.PI) * m.arc;

      // Estela
      m.trailAccum += dt;
      while (m.trailAccum > 0.012) {
        m.trailAccum -= 0.012;
        this.particles.push({
          x: m.x + (Math.random() * 4 - 2),
          y: m.y + (Math.random() * 4 - 2),
          vx: (Math.random() * 2 - 1) * 20,
          vy: (Math.random() * 2 - 1) * 20,
          life: 0,
          maxLife: 0.25 + Math.random() * 0.25,
          size: Math.random() * 2 + 1.5,
          color: Math.random() < 0.5 ? '#00e5ff' : '#ffd35c',
          gravity: 0,
          drag: 1.2,
        });
      }

      if (m.t >= 1) {
        this.missiles.splice(i, 1);
        m.onArrive();
      }
    }

    // Partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) { this.particles.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // Ondas
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life += dt;
      if (r.life >= r.maxLife) { this.rings.splice(i, 1); continue; }
      const k = r.life / r.maxLife;
      r.r = 4 + (r.maxR - 4) * (1 - Math.pow(1 - k, 3));
    }

    // Shake
    if (this.shakeMag > 0) {
      this.shakeT += dt;
      const k = Math.max(0, 1 - this.shakeT / this.shakeDur);
      if (k <= 0) {
        this.shakeMag = 0;
        this.shakeDur = 0;
        this.shakeEl.style.transform = '';
      } else {
        const m = this.shakeMag * k;
        const dx = (Math.random() * 2 - 1) * m;
        const dy = (Math.random() * 2 - 1) * m;
        this.shakeEl.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
      }
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = 'lighter';

    // Ondas de choque
    for (const r of this.rings) {
      const a = 1 - r.life / r.maxLife;
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Partículas: el brillo lo da el blending aditivo + un halo barato (sin shadowBlur).
    for (const p of this.particles) {
      const a = 1 - p.life / p.maxLife;
      const r = p.size * a;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = a * 0.22;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Misiles
    for (const m of this.missiles) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
