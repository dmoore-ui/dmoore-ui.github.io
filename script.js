/*
  ============================================================
  PORTFOLIO SCRIPT — the moving parts CSS can't draw alone
  ============================================================
  1. Paints the flower tile for the drifting border (built on the same
     idea as sketchPark() in JayGUI's app/Backdrop.cpp). CSS does the drifting.
  2. Pauses the drift and smoke while the tab is hidden.
  3. A small burst of petals when you press "Tap in" (JayGUI's Done celebration).
  The page works fine without this file; you just get a plain grey border.
  ============================================================
*/

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- 1. The flowers ----------
  const TILE = 960;   // the flower field repeats every 960px

  // A seeded random generator, so it is the same bouquet every time.
  function seeded(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function paintFlowers() {
    const css = getComputedStyle(document.documentElement);
    const color = (name) => css.getPropertyValue(name).trim();
    const petals = [color('--flower-light'), color('--flower-light'), color('--flower-mid'), color('--flower-dark')];
    const edge = color('--flower-edge');
    const rand = seeded(1857);
    const uniform = (a, b) => a + rand() * (b - a);
    const pick = (list) => list[Math.floor(rand() * list.length)];

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = TILE;
    const p = canvas.getContext('2d');
    p.fillStyle = color('--color-bg');
    p.fillRect(0, 0, TILE, TILE);

    // Draws something at (x, y), plus its copies one tile away when it crosses an edge,
    // so the tile repeats without seams.
    function wrapped(x, y, r, draw) {
      for (const dx of [-TILE, 0, TILE]) {
        for (const dy of [-TILE, 0, TILE]) {
          const cx = x + dx, cy = y + dy;
          if (cx + r < 0 || cy + r < 0 || cx - r > TILE || cy - r > TILE) continue;
          p.save();
          p.translate(cx, cy);
          draw();
          p.restore();
        }
      }
    }

    // A soft shadow under everything, so the flowers sit on top of each other.
    p.shadowColor = 'rgba(40, 40, 50, 0.16)';
    p.shadowBlur = 8;
    p.shadowOffsetY = 3;

    // Leaves first, so the flowers cover them.
    for (let i = 0; i < 140; i++) {
      const len = uniform(16, 34), angle = uniform(0, Math.PI * 2);
      wrapped(uniform(0, TILE), uniform(0, TILE), len, () => {
        p.rotate(angle);
        p.beginPath();
        p.ellipse(len / 2, 0, len / 2, len / 5, 0, 0, Math.PI * 2);
        p.fillStyle = color('--flower-leaf');
        p.fill();
        p.lineWidth = 0.8;
        p.strokeStyle = edge;
        p.stroke();
      });
    }

    // Flowers: a ring of petals around a small centre.
    for (let i = 0; i < 260; i++) {
      const r = uniform(12, 32);
      const count = Math.floor(uniform(5, 9));
      const fill = pick(petals);
      const spin = uniform(0, Math.PI * 2);
      const layered = rand() < 0.35;     // some get a second, smaller ring, like a rose
      wrapped(uniform(0, TILE), uniform(0, TILE), r, () => {
        p.rotate(spin);
        const ring = (size, n) => {
          for (let k = 0; k < n; k++) {
            p.rotate((Math.PI * 2) / n);
            p.beginPath();
            p.ellipse(size * 0.5, 0, size * 0.5, size * 0.3, 0, 0, Math.PI * 2);
            p.fillStyle = fill;
            p.fill();
            p.lineWidth = 0.7;
            p.strokeStyle = edge;
            p.stroke();
          }
        };
        ring(r, count);
        if (layered) { p.rotate(Math.PI / count); ring(r * 0.6, count); }
        p.shadowColor = 'transparent';
        p.beginPath();
        p.arc(0, 0, r * 0.16, 0, Math.PI * 2);
        p.fillStyle = edge;
        p.fill();
      });
      p.shadowColor = 'rgba(40, 40, 50, 0.16)';
    }

    // Little buds scattered in the gaps.
    for (let i = 0; i < 180; i++) {
      const r = uniform(2.5, 5);
      wrapped(uniform(0, TILE), uniform(0, TILE), r, () => {
        p.beginPath();
        p.arc(0, 0, r, 0, Math.PI * 2);
        p.fillStyle = pick(petals);
        p.fill();
        p.lineWidth = 0.6;
        p.strokeStyle = edge;
        p.stroke();
      });
    }

    canvas.toBlob((png) => {
      if (png) document.documentElement.style.setProperty('--park-tile', `url("${URL.createObjectURL(png)}")`);
    });
  }

  paintFlowers();

  // ---------- 2. Pause the drift while the tab is hidden ----------
  document.addEventListener('visibilitychange', () => {
    document.documentElement.classList.toggle('is-hidden', document.hidden);
  });

  // ---------- 3. Petals on "Tap in" ----------
  const GRAVITY = 1400;      // px/s², the same as JayGUI's
  const button = document.querySelector('.hero .button');

  function burst(rect) {
    const colors = ['#ffffff', '#ffffff', '#e6e6ea', '#c4c4cb', '#e9ddff'];
    for (let i = 0; i < 26; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti';
      const x0 = rect.left + 8 + Math.random() * (rect.width - 16);
      const y0 = rect.top + Math.random() * rect.height * 0.4;
      const spread = (x0 - (rect.left + rect.width / 2)) / Math.max(1, rect.width / 2);
      const vx = spread * (120 + Math.random() * 200) + (Math.random() * 120 - 60);
      const vy = -(380 + Math.random() * 340);
      const life = 0.8 + Math.random() * 0.45;
      const spin = Math.random() * 1080 - 540;
      piece.style.left = x0 + 'px';
      piece.style.top = y0 + 'px';
      piece.style.setProperty('--size', (6 + Math.random() * 5) + 'px');
      piece.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
      document.body.appendChild(piece);

      // Real projectile motion, sampled into keyframes.
      const frames = [];
      for (let k = 0; k <= 12; k++) {
        const t = (k / 12) * life;
        frames.push({
          transform: `translate(${vx * t}px, ${vy * t + 0.5 * GRAVITY * t * t}px) rotate(${spin * t}deg)`,
          opacity: k < 8 ? 1 : 1 - (k - 8) / 4,
        });
      }
      piece.animate(frames, { duration: life * 1000, easing: 'linear' }).onfinish = () => piece.remove();
    }
  }

  if (button) {
    button.addEventListener('click', () => {
      if (!reduceMotion.matches) burst(button.getBoundingClientRect());
    });
  }
})();
