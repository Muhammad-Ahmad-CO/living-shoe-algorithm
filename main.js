const canvas = document.getElementById('generative-canvas');
const ctx = canvas.getContext('2d');
const energyReadout = document.getElementById('energy-readout');

const pointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5, active: false };
const particles = [];
const pairLinks = [];
let scrollProgress = 0;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function createParticle(index, total) {
  const t = index / Math.max(1, total - 1);
  const xBase = 0.18 + 0.64 * t;
  const yBase = 0.58 + Math.sin(t * Math.PI * 1.7) * 0.16;

  return {
    baseX: xBase,
    baseY: yBase,
    x: xBase,
    y: yBase,
    vx: 0,
    vy: 0,
    jitter: Math.random() * Math.PI * 2,
    seed: Math.random() * 1000,
    phase: (Math.random() * 0.9 + 0.1),
    size: Math.random() * 2 + 1.2,
  };
}

function initializeParticles() {
  particles.length = 0;
  pairLinks.length = 0;

  const count = 700;
  for (let i = 0; i < count; i += 1) {
    particles.push(createParticle(i, count));
  }

  for (let i = 0; i < particles.length; i += 1) {
    for (let j = i + 1; j < particles.length; j += 1) {
      const a = particles[i];
      const b = particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 0.02) {
        pairLinks.push([i, j]);
      }
    }
  }
}

function updateScrollProgress() {
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  scrollProgress = maxScroll > 0 ? clamp(window.scrollY / maxScroll, 0, 1) : 0;
}

function drawBackground(width, height, t) {
  const grad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.54,
    0,
    width * 0.5,
    height * 0.54,
    width * 0.8
  );

  grad.addColorStop(0, 'rgba(85, 116, 166, 0.25)');
  grad.addColorStop(0.38, 'rgba(36, 70, 110, 0.14)');
  grad.addColorStop(1, 'rgba(6, 9, 12, 0.04)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const shine = ctx.createLinearGradient(0, 0, width, height);
  shine.addColorStop(0, 'rgba(159, 224, 255, 0.06)');
  shine.addColorStop(1, 'rgba(126, 240, 205, 0.04)');
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, width, height);

  const beam = 0.22 + (Math.sin(t * 0.9) + 1) * 0.08;
  ctx.fillStyle = `rgba(255, 211, 154, ${beam})`;
  ctx.fillRect(width * 0.58, 0, width * 0.24, height);
}

function animateParticles(time) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const t = time * 0.001;

  const growth = 0.2 + scrollProgress * 1.2;
  const sway = (Math.sin(t * 1.4) + 1) * 0.24;

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    const shapeX = p.baseX * width;
    const shapeY = (p.baseY + Math.sin(p.jitter + t * 1.5) * 0.08) * height;

    const dx = shapeX - p.x;
    const dy = shapeY - p.y;
    p.vx += dx * 0.012 * (1 + growth * 0.75);
    p.vy += dy * 0.012 * (1 + growth * 0.75);

    const mx = pointer.x - width * 0.5;
    const my = pointer.y - height * 0.5;
    const distX = (p.x - pointer.x) / (width || 1);
    const distY = (p.y - pointer.y) / (height || 1);
    const dist = Math.hypot(distX, distY) || 0.0001;

    if (pointer.active) {
      const force = clamp(1 - dist * 2.5, 0, 1);
      p.vx += (mx / (width || 1)) * force * 22;
      p.vy += (my / (height || 1)) * force * 22;
    }

    p.vx *= 0.92;
    p.vy *= 0.92;

    p.x += p.vx + Math.cos(t + p.seed) * 0.09 * (0.7 + growth * 0.6);
    p.y += p.vy + Math.sin(t * 1.4 + p.seed) * 0.09 * (0.7 + growth * 0.6);

    const boundsX = 0.12 + 0.74 * (0.4 + growth * 0.3);
    p.x = clamp(p.x, width * (0.12 + 0.06 * Math.sin(t + p.seed)), width * boundsX);
    p.y = clamp(p.y, height * 0.18, height * 0.82);
  }

  drawBackground(width, height, t);

  ctx.lineWidth = 1.15;
  ctx.strokeStyle = 'rgba(159, 224, 255, 0.18)';
  ctx.fillStyle = 'rgba(159, 224, 255, 0.10)';

  const visiblePairs = pairLinks.filter(([aIndex, bIndex]) => {
    const a = particles[aIndex];
    const b = particles[bIndex];
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < width * 0.45;
  });

  for (let i = 0; i < visiblePairs.length; i += 1) {
    const [aIndex, bIndex] = visiblePairs[i];
    const a = particles[aIndex];
    const b = particles[bIndex];
    const alpha = 0.12 + scrollProgress * 0.38;
    ctx.strokeStyle = `rgba(159, 224, 255, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    const glow = 0.16 + scrollProgress * 0.9;
    const radius = (1.6 + (Math.sin(t * 2 + p.seed) + 1) * 0.8) * (0.7 + growth * 0.46);
    ctx.beginPath();
    ctx.fillStyle = `rgba(126, 240, 205, ${glow})`;
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.moveTo(width * 0.2, height * 0.64);
  for (let i = 0; i <= 100; i += 1) {
    const x = width * (0.2 + (i / 100) * 0.6);
    const wave = Math.sin(i * 0.38 + t * 2.4) * (18 + scrollProgress * 55);
    const y = height * (0.58 + (Math.cos((i / 100) * Math.PI * 1.6 + t) * 0.12) + wave / height);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(width * 0.8, height * 0.64);
  ctx.lineTo(width * 0.77, height * 0.42);
  ctx.closePath();

  const fill = ctx.createLinearGradient(0, height * 0.3, width, height * 0.7);
  fill.addColorStop(0, 'rgba(159, 224, 255, 0.1)');
  fill.addColorStop(0.5, 'rgba(126, 240, 205, 0.18)');
  fill.addColorStop(1, 'rgba(255, 211, 154, 0.08)');
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.strokeStyle = `rgba(236, 242, 255, ${0.25 + scrollProgress * 0.45})`;
  ctx.lineWidth = 1.3 + scrollProgress * 1.2;
  ctx.stroke();

  energyReadout.textContent = (0.15 + scrollProgress * 1.55).toFixed(2);
  requestAnimationFrame(animateParticles);
}

function onPointerMove(event) {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
}

function onPointerLeave() {
  pointer.active = false;
}

window.addEventListener('resize', () => {
  resizeCanvas();
  updateScrollProgress();
});

window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerleave', onPointerLeave);
window.addEventListener('scroll', updateScrollProgress, { passive: true });

resizeCanvas();
initializeParticles();
updateScrollProgress();
requestAnimationFrame(animateParticles);
