interface Particle {
  startX: number;
  startY: number;
  velocityX: number;
  velocityY: number;
  color: string;
  size: number;
}

const CONFETTI_COLORS = ["#B8860B", "#D4A843", "#E8C767", "#2E7D4F"];
const DURATION_MS = 1500;
const PARTICLE_COUNT = 34;

export function triggerConfetti(container: HTMLElement): void {
  try {
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
  } catch {
    // Continue if matchMedia is unavailable
  }

  const existing = container.querySelector(".confetti-canvas");
  if (existing) {
    existing.remove();
  }

  const canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const resize = () => {
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
    startX: Math.random(),
    startY: Math.random() * 0.3,
    velocityX: (Math.random() - 0.5) * 0.4,
    velocityY: Math.random() * 0.6 + 0.3,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: Math.random() * 6 + 2.5,
  }));

  const startTime = performance.now();

  const step = (now: number) => {
    const elapsed = now - startTime;
    const t = Math.min(1, Math.max(0, elapsed / DURATION_MS));
    const rect = container.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    const alpha = Math.max(0, Math.min(1, 1 - t));
    for (const p of particles) {
      const x = (p.startX + p.velocityX * t) * rect.width;
      const y = (p.startY + p.velocityY * t) * rect.height;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      canvas.remove();
    }
  };

  requestAnimationFrame(step);
}
