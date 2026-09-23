const canvas = document.getElementById('motion-canvas');
const ctx = canvas.getContext('2d', { alpha: true });
const phaseLabel = document.getElementById('phase-label');
const energyValue = document.getElementById('energy-value');
const cursor = document.querySelector('.cursor');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const state = {
  width: 0,
  height: 0,
  progress: 0,
  energy: 0,
  scrollY: window.scrollY,
  lastFrame: 0,
  visible: true,
};

const pointer = { x: 0, y: 0, active: false };
const particles = [];
const links = [];
const phases = [
  ['SEED / 01', 0],
  ['BOND / 02', 0.38],
  ['RETURN / 03', 0.7],
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  state.width = rect.width;
  state.height = rect.height;
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  pointer.x = state.width * 0.52;
  pointer.y = state.height * 0.54;
}

function createParticles() {
  particles.length = 0;
  links.length = 0;

  // Adaptive count keeps the artwork smooth on small screens while preserving density on desktop.
  const count = state.width < 560 ? 360 : 680;
  for (let index = 0; index < count; index += 1) {
    const t = index / Math.max(1, count - 1);
    particles.push({
      baseX: 0.16 + t * 0.7,
      baseY: 0.61 - Math.sin(t * Math.PI) * 0.13 + Math.sin(t * 14) * 0.012,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      seed: Math.random() * 1000,
      radius: 0.8 + Math.random() * 2.1,
      band: Math.random(),
    });
  }

  for (let i = 0; i < particles.length; i += 1) {
    for (let j = i + 1; j < Math.min(i + 9, particles.length); j += 1) {
      if (Math.abs(particles[i].baseX - particles[j].baseX) < 0.04) links.push([i, j]);
    }
  }

  for (const particle of particles) {
    particle.x = particle.baseX * state.width;
    particle.y = particle.baseY * state.height;
  }
}

function updateScrollState() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  state.progress = maxScroll > 0 ? clamp(window.scrollY / maxScroll, 0, 1) : 0;
  const delta = Math.abs(window.scrollY - state.scrollY);
  state.energy = clamp(state.energy + delta / 140, 0, 1.2);
  state.scrollY = window.scrollY;

  let phase = phases[0];
  for (const item of phases) {
    if (state.progress >= item[1]) phase = item;
  }
  phaseLabel.textContent = phase[0];
}

function drawBackground(time) {
  const { width, height } = state;
  ctx.clearRect(0, 0, width, height);

  const radial = ctx.createRadialGradient(width * 0.52, height * 0.54, 0, width * 0.52, height * 0.54, width * 0.74);
  radial.addColorStop(0, 'rgba(131, 203, 255, 0.27)');
  radial.addColorStop(0.42, 'rgba(30, 63, 78, 0.16)');
  radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, width, height);

  const sweep = (Math.sin(time * 0.00035) + 1) / 2;
  const beam = ctx.createLinearGradient(width * (sweep - 0.3), 0, width * (sweep + 0.4), height);
  beam.addColorStop(0, 'rgba(183, 235, 255, 0)');
  beam.addColorStop(0.5, 'rgba(217, 255, 92, 0.07)');
  beam.addColorStop(1, 'rgba(217, 255, 92, 0)');
  ctx.fillStyle = beam;
  ctx.fillRect(0, 0, width, height);

  for (let index = 0; index < 7; index += 1) {
    const radius = 58 + index * 28 + Math.sin(time * 0.001 + index) * 8;
    ctx.beginPath();
    ctx.arc(width * 0.53, height * 0.53, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.018 + index * 0.008})`;
    ctx.stroke();
  }
}

function drawShoe(phase, time) {
  const { width, height } = state;
  const soleY = height * 0.68;
  const pulse = Math.sin(time * 0.0018) * 3 * (reducedMotion.matches ? 0.2 : 1);

  ctx.save();
  ctx.shadowColor = 'rgba(217, 255, 92, 0.24)';
  ctx.shadowBlur = 34 + phase * 20;
  const soleGradient = ctx.createLinearGradient(0, soleY, 0, soleY + height * 0.13);
  soleGradient.addColorStop(0, `rgba(183, 235, 255, ${0.15 + phase * 0.08})`);
  soleGradient.addColorStop(0.55, `rgba(155, 249, 199, ${0.18 + phase * 0.16})`);
  soleGradient.addColorStop(1, 'rgba(10, 22, 28, 0.15)');
  ctx.fillStyle = soleGradient;
  roundedRect(width * 0.18, soleY + pulse, width * 0.7, height * 0.13, height * 0.055);
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(width * 0.19, soleY + 12 + pulse);
  ctx.bezierCurveTo(width * 0.27, height * 0.46, width * 0.44, height * 0.38, width * 0.59, height * 0.46);
  ctx.bezierCurveTo(width * 0.75, height * 0.46, width * 0.85, height * 0.53, width * 0.87, soleY + 20 + pulse);
  ctx.bezierCurveTo(width * 0.7, soleY + 4, width * 0.43, soleY + 2, width * 0.19, soleY + 12 + pulse);
  ctx.closePath();

  const upperGradient = ctx.createLinearGradient(0, height * 0.35, width, soleY);
  upperGradient.addColorStop(0, `rgba(183, 235, 255, ${0.12 + phase * 0.1})`);
  upperGradient.addColorStop(0.55, `rgba(155, 249, 199, ${0.17 + phase * 0.14})`);
  upperGradient.addColorStop(1, `rgba(217, 255, 92, ${0.08 + phase * 0.1})`);
  ctx.fillStyle = upperGradient;
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.28 + phase * 0.25})`;
  ctx.lineWidth = 1.1 + phase;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width * 0.24, soleY + 17);
  ctx.quadraticCurveTo(width * 0.51, height * 0.58, width * 0.82, soleY + 13);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  for (let index = 0; index < 5; index += 1) {
    const x = width * (0.38 + index * 0.055);
    ctx.beginPath();
    ctx.moveTo(x, height * 0.47);
    ctx.lineTo(x + width * 0.035, height * 0.56);
    ctx.strokeStyle = `rgba(183, 235, 255, ${0.18 + phase * 0.05})`;
    ctx.stroke();
  }
}

function roundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function render(time) {
  if (!state.visible) {
    requestAnimationFrame(render);
    return;
  }

  const frameDelta = Math.min(34, time - state.lastFrame || 16.67);
  state.lastFrame = time;
  const phase = 0.28 + state.progress * 1.25;
  const movement = reducedMotion.matches ? 0.12 : 1;
  state.energy *= Math.pow(0.935, frameDelta / 16.67);

  drawBackground(time);
  drawShoe(phase, time);

  for (const particle of particles) {
    const targetX = particle.baseX * state.width;
    const targetY = (particle.baseY + Math.sin(time * 0.0013 + particle.seed) * 0.075 * movement) * state.height;
    particle.vx += (targetX - particle.x) * 0.012 * (1 + phase * 0.65);
    particle.vy += (targetY - particle.y) * 0.012 * (1 + phase * 0.65);

    if (pointer.active && !reducedMotion.matches) {
      const dx = particle.x - pointer.x;
      const dy = particle.y - pointer.y;
      const distance = Math.hypot(dx, dy) || 1;
      const force = clamp(1 - distance / (state.width * 0.34), 0, 1);
      particle.vx += (dx / distance) * force * 0.72;
      particle.vy += (dy / distance) * force * 0.72;
    }

    particle.vx *= 0.915;
    particle.vy *= 0.915;
    particle.x += particle.vx + Math.cos(time * 0.001 + particle.seed) * 0.07 * movement;
    particle.y += particle.vy + Math.sin(time * 0.0012 + particle.seed) * 0.07 * movement;
    particle.x = clamp(particle.x, state.width * 0.08, state.width * 0.92);
    particle.y = clamp(particle.y, state.height * 0.15, state.height * 0.87);
  }

  ctx.lineWidth = 0.8;
  for (const [aIndex, bIndex] of links) {
    const a = particles[aIndex];
    const b = particles[bIndex];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (distance > state.width * 0.1) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = `rgba(183, 235, 255, ${clamp(0.05 + phase * 0.14 + state.energy * 0.16, 0.03, 0.34)})`;
    ctx.stroke();
  }

  for (const particle of particles) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(217, 255, 92, ${clamp(0.1 + phase * 0.26 + state.energy * 0.22, 0.08, 0.72)})`;
    ctx.arc(particle.x, particle.y, particle.radius * (0.72 + phase * 0.38), 0, Math.PI * 2);
    ctx.fill();
  }

  energyValue.textContent = (0.16 + state.progress * 1.34 + state.energy * 0.46).toFixed(2);
  requestAnimationFrame(render);
}

canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  pointer.active = true;
});
canvas.addEventListener('pointerleave', () => { pointer.active = false; });
window.addEventListener('pointermove', (event) => {
  if (cursor) {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  }
});
window.addEventListener('pointerleave', () => { pointer.active = false; });
window.addEventListener('resize', () => { resizeCanvas(); createParticles(); });
window.addEventListener('scroll', updateScrollState, { passive: true });
document.addEventListener('visibilitychange', () => { state.visible = !document.hidden; });

const cards = document.querySelectorAll('.card');
const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      cards.forEach((card) => card.classList.toggle('active', card === entry.target));
    }
  });
}, { threshold: 0.55 });
cards.forEach((card) => cardObserver.observe(card));

resizeCanvas();
createParticles();
updateScrollState();
requestAnimationFrame(render);
