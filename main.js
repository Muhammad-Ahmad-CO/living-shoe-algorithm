const canvas = document.getElementById('motion-canvas');
const ctx = canvas.getContext('2d');
const phaseLabel = document.getElementById('phase-label');
const energyValue = document.getElementById('energy-value');
const cursor = document.querySelector('.cursor');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let particles = [];
let links = [];
let width = 0;
let height = 0;
let scrollProgress = 0;
let energy = 0;
let pointer = { x: 0, y: 0, active: false };
let lastScrollY = window.scrollY;

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  pointer.x = width * 0.5;
  pointer.y = height * 0.55;
}

function initParticles() {
  particles = [];
  links = [];
  const count = 780;

  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const arc = Math.sin(t * Math.PI) * 0.12;
    particles.push({
      baseX: 0.18 + t * 0.64,
      baseY: 0.62 - arc,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      seed: Math.random() * 1000,
      radius: 1.0 + Math.random() * 2.2,
      offset: Math.random() * Math.PI * 2,
    });
  }

  for (let i = 0; i < particles.length; i += 1) {
    const a = particles[i];
    for (let j = i + 1; j < Math.min(i + 10, particles.length); j += 1) {
      const b = particles[j];
      if (Math.abs(a.baseX - b.baseX) < 0.04) {
        links.push([i, j]);
      }
    }
  }
}

function updateScrollState() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress = maxScroll > 0 ? clamp(window.scrollY / maxScroll, 0, 1) : 0;
  const delta = Math.abs(window.scrollY - lastScrollY);
  energy = clamp(energy + delta / 130, 0, 1.25);
  lastScrollY = window.scrollY;

  const phaseMap = [
    ['SEED / 01', 0],
    ['BOND / 02', 0.38],
    ['RETURN / 03', 0.7],
  ];

  let active = phaseMap[0];
  for (const item of phaseMap) {
    if (scrollProgress >= item[1]) active = item;
  }
  phaseLabel.textContent = active[0];
}

function drawBackground(time) {
  ctx.clearRect(0, 0, width, height);

  const radial = ctx.createRadialGradient(width * 0.52, height * 0.55, 0, width * 0.52, height * 0.55, width * 0.72);
  radial.addColorStop(0, 'rgba(134, 203, 255, 0.25)');
  radial.addColorStop(0.45, 'rgba(32, 54, 70, 0.14)');
  radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, width, height);

  const beam = ctx.createLinearGradient(0, 0, width, height);
  beam.addColorStop(0, 'rgba(183, 235, 255, 0.05)');
  beam.addColorStop(0.5, 'rgba(217,255,92,0.03)');
  beam.addColorStop(1, 'rgba(217,255,92,0.02)');
  ctx.fillStyle = beam;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 7; i += 1) {
    const radius = 60 + i * 26 + Math.sin(time * 0.001 + i) * 12;
    ctx.beginPath();
    ctx.arc(width * 0.55, height * 0.52, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.02 + i * 0.01})`;
    ctx.stroke();
  }
}

function drawShoe(phase) {
  const y = height * 0.67;
  ctx.beginPath();
  ctx.moveTo(width * 0.18, y + 8);
  ctx.bezierCurveTo(
    width * 0.28, height * 0.45,
    width * 0.45, height * 0.38,
    width * 0.58, height * 0.46
  );
  ctx.bezierCurveTo(
    width * 0.76, height * 0.47,
    width * 0.86, height * 0.53,
    width * 0.88, y + 18
  );
  ctx.bezierCurveTo(
    width * 0.72, y + 4,
    width * 0.44, y + 3,
    width * 0.18, y + 8
  );
  ctx.closePath();

  const fill = ctx.createLinearGradient(0, height * 0.38, width, y + 80);
  fill.addColorStop(0, `rgba(183, 235, 255, ${0.13 + phase * 0.13})`);
  fill.addColorStop(0.55, `rgba(157, 249, 199, ${0.18 + phase * 0.15})`);
  fill.addColorStop(1, `rgba(217,255,92, ${0.08 + phase * 0.12})`);

  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1.2 + phase * 1.2;
  ctx.strokeStyle = `rgba(255,255,255,${0.28 + phase * 0.28})`;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width * 0.24, y + 16);
  ctx.quadraticCurveTo(width * 0.52, height * 0.58, width * 0.82, y + 12);
  ctx.strokeStyle = 'rgba(255,255,255,0.24)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function renderFrame(time) {
  const phase = 0.3 + scrollProgress * 1.2;
  drawBackground(time);
  drawShoe(phase);

  const motionFactor = reducedMotion.matches ? 0.12 : 1;

  for (const p of particles) {
    const targetX = p.baseX * width;
    const targetY = (p.baseY + Math.sin(time * 0.0014 + p.seed) * 0.08) * height;

    p.vx += (targetX - p.x) * 0.012 * (1 + phase * 0.7);
    p.vy += (targetY - p.y) * 0.012 * (1 + phase * 0.7);

    if (pointer.active && !reducedMotion.matches) {
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const dist = Math.hypot(dx, dy) || 1;
      const force = clamp(1 - dist / (width * 0.34), 0, 1);
      p.vx += (dx / dist) * force * 0.7;
      p.vy += (dy / dist) * force * 0.7;
    }

    p.vx *= 0.92;
    p.vy *= 0.92;

    p.x += p.vx + Math.cos(time * 0.001 + p.seed) * 0.08 * motionFactor;
    p.y += p.vy + Math.sin(time * 0.0012 + p.seed) * 0.08 * motionFactor;

    p.x = clamp(p.x, width * 0.08, width * 0.92);
    p.y = clamp(p.y, height * 0.15, height * 0.86);
  }

  for (const [aIndex, bIndex] of links) {
    const a = particles[aIndex];
    const b = particles[bIndex];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    if (dist > width * 0.1) continue;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = `rgba(183, 235, 255, ${0.08 + phase * 0.18 + energy * 0.12})`;
    ctx.stroke();
  }

  for (const p of particles) {
    const pulse = 0.7 + phase * 0.5;
    ctx.beginPath();
    ctx.fillStyle = `rgba(217,255,92,${0.12 + phase * 0.28 + energy * 0.2})`;
    ctx.arc(p.x, p.y, p.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  energyValue.textContent = (0.18 + scrollProgress * 1.32 + energy * 0.45).toFixed(2);
  requestAnimationFrame(renderFrame);
}

window.addEventListener('resize', () => {
  resizeCanvas();
  updateScrollState();
});

window.addEventListener('scroll', () => {
  updateScrollState();
}, { passive: true });

window.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  pointer.active = true;
  cursor.style.left = `${event.clientX}px`;
  cursor.style.top = `${event.clientY}px`;
});

window.addEventListener('pointerleave', () => {
  pointer.active = false;
});

resizeCanvas();
initParticles();
updateScrollState();
requestAnimationFrame(renderFrame);
