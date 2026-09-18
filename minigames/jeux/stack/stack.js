/* Stack — moteur de jeu.
   Une barre glisse au-dessus de la tour. On appuie, elle se pose : ce qui
   dépasse du bloc d'en dessous est coupé et tombe, et la barre part de la
   largeur restante. Poser pile-poil ne coûte rien, et trois fois de suite
   rend du terrain. La partie s'arrête quand il ne reste plus rien à poser. */

(() => {
  'use strict';

  const GAME = 'stack';
  const { reduced } = Arcade;

  const BLOCK_H = 26;      // hauteur d'un étage, en px écran
  const PERFECT = 3.5;     // tolérance du pile-poil, en px
  const REGAIN = 6;        // largeur rendue par parfait au-delà du 3e
  const GRAVITY = 1250;    // chute des débris, px/s²

  const el = {
    root: document.documentElement,
    cabinet: document.querySelector('.cabinet'),
    stage: document.querySelector('.stage'),
    screen: document.getElementById('screen'),
    canvas: document.getElementById('sky'),
    height: document.getElementById('height'),
    best: document.getElementById('best'),
    streak: document.getElementById('streak'),
    over: document.getElementById('over'),
    overScore: document.getElementById('overScore'),
    overNote: document.getElementById('overNote'),
  };

  const ctx = el.canvas.getContext('2d');

  let W = 340;
  let H = 528;
  let startW = 200;

  let tower = [];      // du bas vers le haut : { x, w, hue }
  let mover = null;    // { x, w, dir, hue }
  let debris = [];
  let stars = [];

  let cam = 0;
  let height = 0;
  let best = 0;
  let streak = 0;
  let perfects = 0;
  let over = false;
  let flash = null;    // { row, x, w, t }
  let last = 0;

  /* ---------- repères ---------- */

  const ground = () => H - 24;                       // le socle
  const topOf = (row) => ground() - (row + 1) * BLOCK_H + cam;
  const hueAt = (row) => (188 + row * 5) % 360;
  const speed = () => Math.min(470, 130 + height * 7);

  /* ---------- toile ---------- */

  function resize() {
    const inner = el.cabinet.clientWidth - 32;       // padding-inline
    const w = Math.max(220, Math.min(inner - 36, 360));
    const h = Math.min(Math.round(w * 1.42), 520);
    const factor = W ? w / W : 1;

    W = w;
    H = h;
    el.root.style.setProperty('--screen-w', w + 'px');
    el.root.style.setProperty('--screen-h', h + 'px');
    el.root.style.setProperty('--panel-w', w + 36 + 'px');   // toile + les deux rails

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.canvas.width = Math.round(w * dpr);
    el.canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // La tour est stockée en pixels : on la remet à l'échelle du nouveau cadre.
    if (factor !== 1) {
      for (const b of tower) { b.x *= factor; b.w *= factor; }
      if (mover) { mover.x *= factor; mover.w *= factor; }
      for (const d of debris) { d.x *= factor; d.w *= factor; }
      startW *= factor;
    }
    makeStars();
  }

  function makeStars() {
    stars = [];
    const count = Math.round((W * H) / 5200);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.1 + 0.4,
        a: Math.random() * 0.6 + 0.25,
      });
    }
  }

  /* ---------- rendu ---------- */

  const lerp = (a, b, t) => a + (b - a) * t;

  function mix(c1, c2, t) {
    const r = Math.round(lerp(c1[0], c2[0], t));
    const g = Math.round(lerp(c1[1], c2[1], t));
    const b = Math.round(lerp(c1[2], c2[2], t));
    return `rgb(${r},${g},${b})`;
  }

  // Le ciel s'assombrit à mesure que la tour prend de l'altitude.
  const SKY_LOW_TOP = [18, 48, 64], SKY_HIGH_TOP = [4, 6, 15];
  const SKY_LOW_BOT = [29, 79, 82], SKY_HIGH_BOT = [10, 24, 38];

  function drawSky(alt) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, mix(SKY_LOW_TOP, SKY_HIGH_TOP, alt));
    g.addColorStop(1, mix(SKY_LOW_BOT, SKY_HIGH_BOT, alt));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (alt <= 0.04) return;
    for (const s of stars) {
      // léger parallaxe : le ciel défile plus lentement que la tour
      const y = ((s.y + cam * 0.3) % H + H) % H;
      ctx.globalAlpha = s.a * alt;
      ctx.fillStyle = '#e8f4ff';
      ctx.beginPath();
      ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function slab(x, y, w, hue, glow) {
    if (w <= 0) return;
    ctx.fillStyle = `hsl(${hue}, 56%, 58%)`;
    ctx.fillRect(x, y, w, BLOCK_H);
    ctx.fillStyle = `hsl(${hue}, 60%, 72%)`;
    ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = `hsl(${hue}, 48%, 40%)`;
    ctx.fillRect(x, y + BLOCK_H - 4, w, 4);
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, BLOCK_H - 1);
    if (glow) {
      ctx.save();
      ctx.shadowColor = `hsl(${hue}, 70%, 65%)`;
      ctx.shadowBlur = 16;
      ctx.strokeStyle = `hsl(${hue}, 70%, 76%)`;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, BLOCK_H - 1);
      ctx.restore();
    }
  }

  function draw() {
    const alt = Math.min(1, height / 55);
    drawSky(alt);

    // le sol, tant qu'il est à l'écran
    const gy = ground() + cam;
    if (gy < H + 20) {
      ctx.fillStyle = 'rgba(4,10,14,.9)';
      ctx.fillRect(0, gy, W, H - gy);
      ctx.fillStyle = 'rgba(79,216,232,.25)';
      ctx.fillRect(0, gy, W, 1);
    }

    for (const d of debris) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, d.a);
      ctx.translate(d.x + d.w / 2, d.y + cam + BLOCK_H / 2);
      ctx.rotate(d.rot);
      slab(-d.w / 2, -BLOCK_H / 2, d.w, d.hue, false);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < tower.length; i++) {
      const y = topOf(i);
      if (y > H || y < -BLOCK_H) continue;
      slab(tower[i].x, y, tower[i].w, tower[i].hue, false);
    }

    if (flash) {
      const y = topOf(flash.row);
      ctx.save();
      ctx.globalAlpha = Math.max(0, flash.t) * 0.85;
      ctx.fillStyle = '#fff';
      ctx.fillRect(flash.x, y, flash.w, BLOCK_H);
      const grow = (1 - flash.t) * 16;
      ctx.globalAlpha = Math.max(0, flash.t) * 0.7;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(flash.x - grow, y - grow, flash.w + grow * 2, BLOCK_H + grow * 2);
      ctx.restore();
    }

    if (mover && !over) slab(mover.x, topOf(tower.length), mover.w, mover.hue, true);
  }

  /* ---------- boucle ---------- */

  function frame(now) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;

    if (mover && !over) {
      mover.x += mover.dir * speed() * dt;
      if (mover.x <= 0) { mover.x = 0; mover.dir = 1; }
      if (mover.x + mover.w >= W) { mover.x = W - mover.w; mover.dir = -1; }
    }

    const target = Math.max(0, H * 0.62 - ground() + tower.length * BLOCK_H);
    cam = reduced ? target : cam + (target - cam) * Math.min(1, dt * 7);

    for (const d of debris) {
      d.vy += GRAVITY * dt;
      d.y += d.vy * dt;
      d.rot += d.vr * dt;
      d.a -= dt * 0.9;
    }
    debris = debris.filter((d) => d.a > 0);

    if (flash) {
      flash.t -= dt * 2.6;
      if (flash.t <= 0) flash = null;
    }

    draw();
    requestAnimationFrame(frame);
  }

  /* ---------- tour de jeu ---------- */

  function nextMover() {
    const below = tower[tower.length - 1];
    const dir = tower.length % 2 ? 1 : -1;
    mover = {
      w: below.w,
      x: dir > 0 ? 0 : W - below.w,
      dir,
      hue: hueAt(tower.length),
    };
  }

  function place() {
    if (over || !mover) return;
    const below = tower[tower.length - 1];
    const delta = mover.x - below.x;

    if (Math.abs(delta) <= PERFECT) {
      mover.x = below.x;
      streak++;
      perfects++;
      if (streak >= 3) mover.w = Math.min(startW, mover.w + REGAIN);
      Arcade.sfx.chain(Math.min(streak, 10));
      Arcade.shake(el.stage, Math.min(streak, 3));
      if (!reduced) flash = { row: tower.length, x: mover.x, w: mover.w, t: 1 };
    } else {
      const kept = below.w - Math.abs(delta);
      const cutX = delta > 0 ? below.x + below.w : mover.x;
      const cutW = Math.min(Math.abs(delta), mover.w);

      if (!reduced) {
        debris.push({
          x: cutX,
          w: cutW,
          y: ground() - (tower.length + 1) * BLOCK_H,
          vy: -40,
          vr: (delta > 0 ? 1 : -1) * (1.2 + Math.random()),
          rot: 0,
          a: 1,
          hue: mover.hue,
        });
      }

      if (kept <= 0) {
        mover = null;
        Arcade.sfx.deny();
        finish();
        return;
      }

      mover.x = Math.max(mover.x, below.x);
      mover.w = kept;
      streak = 0;
      Arcade.sfx.thud();
    }

    tower.push({ x: mover.x, w: mover.w, hue: mover.hue });
    height = tower.length - 1;
    updateHud();
    nextMover();
  }

  function updateHud() {
    el.height.textContent = height;
    el.streak.innerHTML = `${streak}<i>×</i>`;
    el.streak.classList.toggle('live', streak > 0);
    if (height > best) {
      best = height;
      el.best.textContent = best;
      Arcade.setRecord(GAME, best);
      Arcade.replay(el.best, 'flash');
    }
  }

  function finish() {
    over = true;
    Arcade.sfx.over();
    el.overScore.textContent = height;
    const etages = height > 1 ? 'étages' : 'étage';
    el.overNote.innerHTML = perfects
      ? `${etages}, dont <b>${perfects}</b> ${perfects > 1 ? 'poses parfaites' : 'pose parfaite'}`
      : `${etages} · aucune pose parfaite, visez l'aplomb`;
    el.over.hidden = false;
  }

  function reset() {
    over = false;
    height = 0;
    streak = 0;
    perfects = 0;
    debris = [];
    flash = null;
    cam = 0;
    best = Arcade.record(GAME);

    resize();
    startW = Math.round(W * 0.58);
    tower = [{ x: Math.round((W - startW) / 2), w: startW, hue: hueAt(0) }];
    nextMover();

    el.best.textContent = best;
    el.over.hidden = true;
    updateHud();
  }

  /* ---------- entrées ---------- */

  const act = () => { Arcade.boot(); place(); };

  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'enter' || k === 'arrowdown' || k === 's') { act(); e.preventDefault(); }
    else if (k === 'r') { reset(); }
    else if (k === 'm') { document.getElementById('mute').click(); }
  });

  el.screen.addEventListener('pointerdown', (e) => {
    if (over) return;
    e.preventDefault();
    act();
  });

  document.getElementById('place').addEventListener('click', act);
  document.getElementById('restart').addEventListener('click', reset);
  document.getElementById('again').addEventListener('click', reset);
  Arcade.bindMute(document.getElementById('mute'));

  addEventListener('resize', resize);

  /* Reprise d'état quand la page est republiée sous les yeux d'un joueur. */
  const hot = window.claude?.hot;
  hot?.snapshot?.(() => ({ tower, height, perfects, streak, startW, W }));

  function start(data) {
    reset();
    if (data?.tower?.length > 1) {
      const factor = data.W ? W / data.W : 1;
      tower = data.tower.map((b) => ({ x: b.x * factor, w: b.w * factor, hue: b.hue }));
      startW = (data.startW || startW) * factor;
      height = tower.length - 1;
      streak = data.streak || 0;
      perfects = data.perfects || 0;
      cam = Math.max(0, H * 0.62 - ground() + tower.length * BLOCK_H);
      nextMover();
      updateHud();
    }
    requestAnimationFrame(frame);
  }

  if (hot?.ready) hot.ready(start);
  else start(hot?.data);
})();
