/*
  ============================================================
  PORTFOLIO SCRIPT — the moving parts CSS can't draw alone
  ============================================================
  1. Paints the flower tile for the drifting border (using the same
     method as sketchPark() in JayGUI's app/Backdrop.cpp). CSS does the drifting.
  2. Pauses the drift and smoke while the tab is hidden.
  3. A small burst of petals when you press "Tap in" (JayGUI's Done celebration).
  The page works fine without this file; you just get a plain grey border.
  ============================================================
*/

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- 1. The flowers ----------
  // Painted the way JayGUI paints its park: soft round blobs gathered in loose
  // clusters, drawn at a quarter size and then enlarged, which softens them into
  // abstract blooms rather than outlined shapes.
  const TILE = 960;            // the field repeats every 960px
  const SKETCH = TILE / 4;     // drawn this small first

  // A seeded random generator, so it is the same bouquet every time.
  function seeded(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // "#c9566a" + 0.5 -> "rgba(201, 86, 106, 0.5)"
  function rgba(hex, alpha) {
    const n = parseInt(hex.replace('#', ''), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  function paintFlowers() {
    const css = getComputedStyle(document.documentElement);
    const color = (name) => css.getPropertyValue(name).trim();
    // White and pink turn up most often, as on the album's frame.
    const blooms = ['--bloom-white', '--bloom-white', '--bloom-pink', '--bloom-pink', '--bloom-rose',
                    '--bloom-peach', '--bloom-butter', '--bloom-lilac'].map(color);
    const leaves = [color('--leaf'), color('--leaf'), color('--leaf-deep')];
    const rand = seeded(1857);
    const uniform = (a, b) => a + rand() * (b - a);
    const normal = (sigma) => sigma * Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
    const pick = (list) => list[Math.floor(rand() * list.length)];

    const sketch = document.createElement('canvas');
    sketch.width = sketch.height = SKETCH;
    const p = sketch.getContext('2d');
    p.fillStyle = color('--color-bg');
    p.fillRect(0, 0, SKETCH, SKETCH);

    // A soft blob (round, or stretched into a leaf or petal), plus its copies one
    // tile away so the tile repeats without seams. Like JayGUI's blob().
    function blob(x, y, r, hex, alpha, stretch = 1, angle = 0) {
      const reach = r * stretch;
      for (const dx of [-SKETCH, 0, SKETCH]) {
        for (const dy of [-SKETCH, 0, SKETCH]) {
          const cx = x + dx, cy = y + dy;
          if (cx + reach < 0 || cy + reach < 0 || cx - reach > SKETCH || cy - reach > SKETCH) continue;
          p.save();
          p.translate(cx, cy);
          p.rotate(angle);
          p.scale(stretch, 1);
          const g = p.createRadialGradient(0, 0, 0, 0, 0, r);
          g.addColorStop(0, rgba(hex, alpha));
          g.addColorStop(0.55, rgba(hex, alpha * 0.75));
          g.addColorStop(1, rgba(hex, 0));
          p.fillStyle = g;
          p.beginPath();
          p.arc(0, 0, r, 0, Math.PI * 2);
          p.fill();
          p.restore();
        }
      }
    }

    // Winding stems, like the park's paths.
    p.strokeStyle = rgba(color('--stem'), 0.45);
    p.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const start = [uniform(0, SKETCH), uniform(0, SKETCH)];
      let [x, y] = start;
      const curves = [];
      for (let j = 0; j < 3; j++) {
        const c1 = [x + normal(30), y + normal(30)], c2 = [x + normal(35), y + normal(35)];
        const end = [x + normal(40), y + normal(40)];
        curves.push([c1, c2, end]);
        [x, y] = end;
      }
      p.lineWidth = uniform(0.6, 1.2);
      for (const dx of [-SKETCH, 0, SKETCH]) {
        for (const dy of [-SKETCH, 0, SKETCH]) {
          p.beginPath();
          p.moveTo(start[0] + dx, start[1] + dy);
          for (const [c1, c2, end] of curves)
            p.bezierCurveTo(c1[0] + dx, c1[1] + dy, c2[0] + dx, c2[1] + dy, end[0] + dx, end[1] + dy);
          p.stroke();
        }
      }
    }

    // Foliage: clumps of stretched green blobs, like the park's trees.
    for (let i = 0; i < 70; i++) {
      const cx = uniform(0, SKETCH), cy = uniform(0, SKETCH);
      const count = Math.floor(uniform(3, 8)), spread = uniform(4, 9);
      for (let j = 0; j < count; j++)
        blob(cx + normal(spread), cy + normal(spread), uniform(2.5, 5), pick(leaves), 0.55,
             uniform(1.6, 2.4), uniform(0, Math.PI));
    }

    // Blooms: a loose ring of soft petals, jittered so no two match,
    // a paler heart, and a warm centre.
    for (let i = 0; i < 95; i++) {
      const cx = uniform(0, SKETCH), cy = uniform(0, SKETCH);
      const size = uniform(4, 9);
      const hex = pick(blooms);
      const petals = Math.floor(uniform(5, 8));
      const spin = uniform(0, Math.PI * 2);
      for (let k = 0; k < petals; k++) {
        const a = spin + (k / petals) * Math.PI * 2 + normal(0.25);
        const d = size * uniform(0.45, 0.75);
        blob(cx + Math.cos(a) * d, cy + Math.sin(a) * d, size * uniform(0.55, 0.8), hex, 0.85,
             uniform(1.1, 1.5), a);
      }
      blob(cx, cy, size * 0.55, color('--bloom-white'), 0.55);
      blob(cx + normal(0.4), cy + normal(0.4), size * 0.22, color('--bloom-butter'), 0.9);
    }

    // Little buds in the gaps.
    for (let i = 0; i < 90; i++)
      blob(uniform(0, SKETCH), uniform(0, SKETCH), uniform(1.2, 2.4), pick(blooms), 0.8);

    // Enlarge in halving steps, each a smooth scale, so it comes out soft rather
    // than blocky (JayGUI's enlarge()). A margin of the opposite edges is wrapped
    // around it first, so the smoothing doesn't leave a seam at the tile's edge.
    const margin = SKETCH / 4;
    let img = document.createElement('canvas');
    img.width = img.height = SKETCH + margin * 2;
    const wrap = img.getContext('2d');
    for (const dx of [-SKETCH, 0, SKETCH])
      for (const dy of [-SKETCH, 0, SKETCH])
        wrap.drawImage(sketch, margin + dx, margin + dy);
    for (let scale = 2; scale <= 4; scale *= 2) {
      const next = document.createElement('canvas');
      next.width = next.height = (SKETCH + margin * 2) * scale;
      const n = next.getContext('2d');
      n.imageSmoothingQuality = 'high';
      n.drawImage(img, 0, 0, next.width, next.height);
      img = next;
    }
    const out = document.createElement('canvas');
    out.width = out.height = TILE;
    out.getContext('2d').drawImage(img, margin * 4, margin * 4, TILE, TILE, 0, 0, TILE, TILE);

    out.toBlob((png) => {
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
    const css = getComputedStyle(document.documentElement);
    const colors = ['--bloom-white', '--bloom-pink', '--bloom-rose', '--bloom-peach', '--bloom-butter', '--bloom-lilac']
      .map((name) => css.getPropertyValue(name).trim());
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
