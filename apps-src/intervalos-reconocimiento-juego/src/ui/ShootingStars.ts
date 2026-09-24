/**
 * ShootingStars: genera estrellas fugaces con trayectorias aleatorias que
 * cruzan toda la escena (de un borde a otro), cada una con ángulo, posición,
 * largo, color y velocidad distintos. Usa la Web Animations API (sin bucle
 * de render continuo) y se autolimpia.
 */
export class ShootingStars {
  private container: HTMLElement;
  private timer: number | null = null;
  private active = false;
  private stars = new Set<HTMLElement>();

  private readonly TINTS = ['#ffffff', '#bff7ff', '#ffd9f4', '#d9e4ff', '#fff3c4'];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public start() {
    if (this.active) return;
    this.active = true;
    this.scheduleNext(500);
  }

  public stop() {
    this.active = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.stars.forEach(s => s.remove());
    this.stars.clear();
  }

  private scheduleNext(delay: number) {
    this.timer = window.setTimeout(() => {
      if (!this.active) return;
      this.spawn();
      // De vez en cuando, una segunda casi seguida.
      if (Math.random() < 0.22) {
        window.setTimeout(() => { if (this.active) this.spawn(); }, 150 + Math.random() * 250);
      }
      this.scheduleNext(900 + Math.random() * 2700);
    }, delay);
  }

  /** Punto aleatorio justo fuera de un lado del contenedor. */
  private edgePoint(side: number, w: number, h: number, m: number) {
    switch (side) {
      case 0: return { x: Math.random() * w, y: -m };     // arriba
      case 1: return { x: w + m, y: Math.random() * h };  // derecha
      case 2: return { x: Math.random() * w, y: h + m };  // abajo
      default: return { x: -m, y: Math.random() * h };    // izquierda
    }
  }

  private spawn() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    const margin = 70;

    const startSide = Math.floor(Math.random() * 4);
    // Salida: opuesta la mayoría de las veces, a veces adyacente -> más variedad.
    const r = Math.random();
    const endSide = r < 0.6
      ? (startSide + 2) % 4
      : (startSide + (Math.random() < 0.5 ? 1 : 3)) % 4;

    const a = this.edgePoint(startSide, w, h, margin);
    const b = this.edgePoint(endSide, w, h, margin);

    const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);

    const star = document.createElement('div');
    star.className = 'shooting-star';
    const len = 70 + Math.random() * 140;
    const tint = this.TINTS[(Math.random() * this.TINTS.length) | 0];
    star.style.width = `${len}px`;
    star.style.background = `linear-gradient(90deg, transparent, ${tint})`;
    star.style.transformOrigin = 'right center';
    this.container.appendChild(star);
    this.stars.add(star);

    // Velocidad variable -> duración a partir de la distancia.
    const duration = Math.max(420, dist / (0.85 + Math.random() * 0.9));

    const anim = star.animate(
      [
        { transform: `translate(${a.x}px, ${a.y}px) rotate(${angle}deg)`, opacity: 0 },
        { opacity: 1, offset: 0.12 },
        { opacity: 1, offset: 0.82 },
        { transform: `translate(${b.x}px, ${b.y}px) rotate(${angle}deg)`, opacity: 0 },
      ],
      { duration, easing: 'linear' }
    );
    anim.onfinish = () => {
      star.remove();
      this.stars.delete(star);
    };
  }
}
