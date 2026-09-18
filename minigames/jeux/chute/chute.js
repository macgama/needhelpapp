/* Chute — moteur de jeu.
   Grille 5 x 7. On vise une colonne, on lâche une tuile, elle tombe.
   Toute tuile identique et adjacente fusionne, la gravité reprend,
   et les cascades s'enchaînent avec un multiplicateur de combo.
   Tous les N coups, une rangée pousse par le bas : c'est l'horloge. */

(() => {
  'use strict';

  const COLS = 5;
  const ROWS = 7;
  const GAP = 8;
  const MAX_CELL = 66;
  const GAME = 'chute';

  const { reduced, ms, wait } = Arcade;

  const el = {
    root: document.documentElement,
    cabinet: document.querySelector('.cabinet'),
    stage: document.querySelector('.stage'),
    playfield: document.getElementById('playfield'),
    cells: document.getElementById('cells'),
    layer: document.getElementById('tiles'),
    guide: document.getElementById('guide'),
    combo: document.getElementById('combo'),
    score: document.getElementById('score'),
    best: document.getElementById('best'),
    next: document.getElementById('next'),
    meter: document.getElementById('meter'),
    meterLab: document.getElementById('meterLab'),
    meterLeft: document.getElementById('meterLeft'),
    meterFill: document.getElementById('meterFill'),
    mute: document.getElementById('mute'),
    over: document.getElementById('over'),
    overScore: document.getElementById('overScore'),
    overNote: document.getElementById('overNote'),
  };

  let cell = 62;
  let uid = 0;
  let board = [];
  let held = null;      // tuile en attente, au-dessus de la grille
  let queued = 2;       // valeur de la tuile suivante
  let aim = 2;          // colonne visée
  let score = 0;
  let best = 0;
  let peak = 2;         // plus haute valeur atteinte
  let drops = 0;        // coups joués depuis la dernière montée
  let level = 0;        // nombre de montées déjà encaissées
  let busy = false;
  let over = false;
  let comboTimer = 0;

  /* ---------- son ---------- */
  /* Le socle fournit le synthétiseur ; Chute n'ajoute que son grondement. */

  const sfx = {
    aim: Arcade.sfx.tick,
    land: Arcade.sfx.thud,
    merge: (combo) => Arcade.sfx.chain(combo),
    nope: Arcade.sfx.deny,
    over: Arcade.sfx.over,
    push() {
      Arcade.tone({ freq: 120, to: 44, dur: 0.34, type: 'sawtooth', vol: 0.13 });
      Arcade.tone({ freq: 240, to: 150, dur: 0.18, type: 'square', vol: 0.05 });
    },
  };

  /* ---------- géométrie ---------- */

  function layout() {
    // .stage se dimensionne sur son contenu : on mesure le cabinet, sinon boucle.
    const inner = el.cabinet.clientWidth - 32;   // padding-inline
    const avail = Math.min(inner - 36 - 12, 400); // rails + marge du puits
    cell = Math.max(38, Math.min(MAX_CELL, Math.floor((avail - GAP * (COLS - 1)) / COLS)));
    const gw = COLS * cell + GAP * (COLS - 1);
    const gh = ROWS * cell + GAP * (ROWS - 1);
    const s = el.root.style;
    s.setProperty('--cell', cell + 'px');
    s.setProperty('--gap', GAP + 'px');
    s.setProperty('--cols', COLS);
    s.setProperty('--grid-w', gw + 'px');
    s.setProperty('--grid-h', gh + 'px');
    s.setProperty('--pad-top', cell + GAP + 'px');
    s.setProperty('--panel-w', gw + 36 + 'px');   // plateau + les deux rails

    for (const t of allTiles()) place(t, 0);
    if (held) place(held, 0);
    moveGuide(0);
    if (board.length) updateLanding();
  }

  const x = (col) => col * (cell + GAP);
  const y = (row) => row * (cell + GAP);

  function place(t, dur, easing) {
    const tf = `translate(${x(t.col)}px, ${y(t.row)}px)`;
    t.el.style.transitionDuration = ms(dur) + 'ms';
    if (easing) t.el.style.transitionTimingFunction = easing;
    t.el.style.setProperty('--tf', tf);
    t.el.style.transform = tf;
  }

  function moveGuide(dur) {
    el.guide.style.transitionDuration = ms(dur) + 'ms';
    el.guide.style.setProperty('--gx', x(aim) + 'px');
    el.guide.style.transform = `translateX(${x(aim)}px)`;
  }

  /* ---------- tuiles ---------- */

  const tier = (v) => Math.min(12, Math.max(1, Math.round(Math.log2(v))));

  function dress(node, v) {
    node.className = node.className.replace(/\b(t\d+|d\d)\b/g, '').trim();
    node.classList.add('t' + tier(v));
    const digits = String(v).length;
    if (digits > 2) node.classList.add('d' + Math.min(5, digits));
    node.textContent = v;
  }

  function makeTile(value, row, col) {
    const node = document.createElement('div');
    node.className = 'tile';
    dress(node, value);
    el.layer.appendChild(node);
    const t = { id: ++uid, value, row, col, el: node };
    place(t, 0);
    return t;
  }

  function* allTiles() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) if (board[r][c]) yield board[r][c];
    }
  }

  /* ---------- pioche ---------- */

  /* La fenêtre de tirage glisse vers le haut avec la partie : le plafond monte
     pour suivre la progression, et le plancher finit par retirer les petites
     valeurs, qui sinon encombreraient le plateau jusqu'à la fin. */
  function pool() {
    const ceiling = Math.max(4, Math.min(64, peak / 4));
    const floor = Math.max(2, Math.min(8, peak / 64));
    const out = [];
    for (let v = floor; v <= ceiling; v *= 2) out.push(v);
    return out.length ? out : [2];
  }

  function roll() {
    const values = pool();
    const weights = values.map((_, i) => Math.pow(0.5, i));
    const total = weights.reduce((a, b) => a + b, 0);
    let pick = Math.random() * total;
    for (let i = 0; i < values.length; i++) {
      pick -= weights[i];
      if (pick <= 0) return values[i];
    }
    return values[0];
  }

  function spawn() {
    held = makeTile(queued, -1, aim);
    held.el.classList.add('held');
    queued = roll();
    dress(el.next, queued);
  }

  /* ---------- règles ---------- */

  function groups() {
    const seen = new Set();
    const out = [];
    for (const start of allTiles()) {
      if (seen.has(start.id)) continue;
      seen.add(start.id);
      const stack = [start];
      const group = [];
      while (stack.length) {
        const t = stack.pop();
        group.push(t);
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const r = t.row + dr;
          const c = t.col + dc;
          if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
          const n = board[r][c];
          if (n && !seen.has(n.id) && n.value === start.value) {
            seen.add(n.id);
            stack.push(n);
          }
        }
      }
      if (group.length > 1) out.push(group);
    }
    return out;
  }

  function merge(preferred, combo) {
    const found = groups();
    if (!found.length) return false;

    let gained = 0;
    for (const group of found) {
      const anchor = group.includes(preferred)
        ? preferred
        : group.reduce((a, b) => (b.row > a.row || (b.row === a.row && b.col > a.col) ? b : a));

      const value = anchor.value * 2;
      for (const t of group) {
        if (t === anchor) continue;
        board[t.row][t.col] = null;
        collapse(t, anchor);
      }
      anchor.value = value;
      peak = Math.max(peak, value);
      dress(anchor.el, value);
      restart(anchor.el, 'pop');

      shockwave(anchor);
      sparks(anchor, 4 + group.length * 2);

      const points = value * (group.length - 1) * combo;
      gained += points;
      floatText(anchor, points, combo);
    }

    sfx.merge(combo);
    shake(combo);
    banner(combo);

    score += gained;
    el.score.textContent = score;
    restart(el.score, 'flash');
    if (score > best) {
      best = score;
      el.best.textContent = best;
      save();
    }
    return true;
  }

  function collapse(t, anchor) {
    t.el.style.transitionDuration = ms(180) + 'ms';
    t.el.style.transitionTimingFunction = 'cubic-bezier(.4,0,.2,1)';
    t.el.style.transform = `translate(${x(anchor.col)}px, ${y(anchor.row)}px) scale(.3)`;
    t.el.style.opacity = '0';
    setTimeout(() => t.el.remove(), ms(220));
  }

  function gravity() {
    let moved = false;
    for (let c = 0; c < COLS; c++) {
      let write = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        const t = board[r][c];
        if (!t) continue;
        if (r !== write) {
          board[r][c] = null;
          board[write][c] = t;
          t.row = write;
          place(t, 70 + (write - r) * 34, 'cubic-bezier(.45,.05,.6,.35)');
          moved = true;
        }
        write--;
      }
    }
    return moved;
  }

  async function resolve(dropped) {
    let combo = 0;
    let preferred = dropped;
    for (;;) {
      combo++;
      if (!merge(preferred, combo)) break;
      await wait(240);
      if (gravity()) await wait(280);
      preferred = null;
    }
  }

  /* ---------- la montée ---------- */

  const pushEvery = () => Math.max(8, 14 - level);

  async function pushRow() {
    if (board[0].some(Boolean)) {   // une colonne touche déjà le plafond
      finish('écrasé par la montée');
      return;
    }
    sfx.push();
    shake(3);

    for (let r = 1; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = board[r][c];
        if (!t) continue;
        board[r - 1][c] = t;
        board[r][c] = null;
        t.row = r - 1;
        place(t, 240, 'cubic-bezier(.3,.9,.3,1)');
      }
    }

    const low = pool();
    for (let c = 0; c < COLS; c++) {
      const value = Math.random() < 0.72 ? low[0] : (low[1] ?? low[0]);
      const t = makeTile(value, ROWS, c);      // sous le cadre, hors champ
      t.el.classList.add('fresh');
      void t.el.offsetWidth;                   // fige la position de départ
      t.row = ROWS - 1;
      board[ROWS - 1][c] = t;
      place(t, 240, 'cubic-bezier(.3,.9,.3,1)');
    }

    level++;
    drops = 0;
    await wait(280);
    await resolve(null);
  }

  /* ---------- effets ---------- */

  function restart(node, cls) {
    node.classList.remove('pop', 'land');
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }

  function shockwave(t) {
    if (reduced) return;
    const ring = document.createElement('div');
    ring.className = 'ring';
    ring.style.setProperty('--tf', `translate(${x(t.col)}px, ${y(t.row)}px)`);
    ring.style.borderColor = `var(--t${tier(t.value)})`;
    el.layer.appendChild(ring);
    setTimeout(() => ring.remove(), 480);
  }

  function sparks(t, count) {
    if (reduced) return;
    const color = `var(--t${tier(t.value)})`;
    const cx = x(t.col) + cell / 2 - 3;
    const cy = y(t.row) + cell / 2 - 3;
    for (let i = 0; i < count; i++) {
      const s = document.createElement('div');
      s.className = 'spark';
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const dist = cell * (0.5 + Math.random() * 0.55);
      s.style.setProperty('--tf', `translate(${cx}px, ${cy}px)`);
      s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      s.style.background = color;
      el.layer.appendChild(s);
      setTimeout(() => s.remove(), 560);
    }
  }

  const shake = (strength) => Arcade.shake(el.stage, strength);

  function banner(combo) {
    if (combo < 2) return;
    el.combo.innerHTML = `<span>Cascade ×${combo}</span>`;
    el.combo.hidden = false;
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => { el.combo.hidden = true; }, ms(780));
  }

  function floatText(t, points, combo) {
    const node = document.createElement('div');
    node.className = 'float';
    node.style.setProperty('--tf', `translate(${x(t.col)}px, ${y(t.row)}px)`);
    node.innerHTML = combo > 1 ? `+${points} <b>×${combo}</b>` : `+${points}`;
    el.layer.appendChild(node);
    setTimeout(() => node.remove(), ms(720));
  }

  function updateMeter() {
    const need = pushEvery();
    const left = Math.max(0, need - drops);
    el.meterLab.textContent = `Montée · palier ${level + 1}`;
    el.meterLeft.textContent = left <= 1 ? 'coup suivant' : `${left} coups`;
    el.meterFill.style.width = Math.min(100, (drops / need) * 100) + '%';
    el.meter.classList.toggle('hot', left <= 2);
  }

  /* Le repère d'atterrissage : la case libre la plus basse de la colonne visée. */
  function updateLanding() {
    const mark = el.guide.firstElementChild;
    let r = ROWS - 1;
    while (r >= 0 && board[r][aim]) r--;
    if (r < 0) { mark.style.opacity = '0'; return; }
    mark.style.opacity = '1';
    mark.style.transform = `translateY(${cell + GAP + y(r)}px)`;
  }

  function markDanger() {
    el.playfield.classList.toggle('danger', board[0].some(Boolean));
  }

  /* ---------- tour de jeu ---------- */

  const columnFull = (c) => board[0][c] !== null;

  function setAim(c) {
    const next = Math.max(0, Math.min(COLS - 1, c));
    if (next === aim) return;
    aim = next;
    moveGuide(110);
    sfx.aim();
    if (held) {
      held.col = aim;
      place(held, 110, 'cubic-bezier(.2,.8,.3,1)');
    }
    el.guide.classList.toggle('blocked', columnFull(aim));
    updateLanding();
  }

  async function drop() {
    if (busy || over || !held) return;
    if (columnFull(aim)) {
      restart(el.guide, 'blocked');
      sfx.nope();
      return;
    }
    busy = true;

    let row = ROWS - 1;
    while (board[row][aim]) row--;

    const t = held;
    held = null;
    t.el.classList.remove('held');
    t.row = row;
    board[row][aim] = t;

    const fall = 110 + (row + 1) * 32;
    place(t, fall, 'cubic-bezier(.45,.05,.6,.35)');
    await wait(fall + 20);
    restart(t.el, 'land');
    sfx.land();

    await resolve(t);

    drops++;
    if (!over && drops >= pushEvery()) await pushRow();

    updateMeter();
    markDanger();
    updateLanding();

    if (!over) {
      if (board[0].every(Boolean)) finish('les cinq colonnes sont pleines');
      else {
        spawn();
        el.guide.classList.toggle('blocked', columnFull(aim));
      }
    }
    busy = false;
  }

  function finish(reason) {
    if (over) return;
    over = true;
    sfx.over();
    el.overScore.textContent = score;
    el.overNote.textContent =
      `${reason} · plus haute tuile : ${peak}` + (score >= best && score > 0 ? ' · nouveau record' : '');
    el.over.hidden = false;
  }

  /* ---------- persistance ---------- */

  const save = () => Arcade.setRecord(GAME, best);
  const load = () => Arcade.record(GAME);

  /* ---------- cycle de vie ---------- */

  function reset(state) {
    el.layer.innerHTML = '';
    el.cells.innerHTML = '';
    for (let i = 0; i < ROWS * COLS; i++) el.cells.appendChild(document.createElement('div'));

    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    score = state?.score ?? 0;
    peak = state?.peak ?? 2;
    aim = state?.aim ?? Math.floor(COLS / 2);
    drops = state?.drops ?? 0;
    level = state?.level ?? 0;
    over = false;
    busy = false;
    held = null;
    el.combo.hidden = true;

    best = Math.max(load(), state?.best ?? 0, score);
    el.score.textContent = score;
    el.best.textContent = best;
    el.over.hidden = true;
    el.playfield.classList.remove('danger');
    el.guide.classList.remove('blocked');

    if (state?.cells?.length) {
      for (const c of state.cells) board[c.row][c.col] = makeTile(c.value, c.row, c.col);
    }
    layout();

    queued = state?.held ?? state?.queued ?? roll();
    spawn();
    if (state?.held && state?.queued) {
      queued = state.queued;
      dress(el.next, queued);
    }

    updateMeter();
    markDanger();
    updateLanding();
    if (board[0].every(Boolean)) finish('les cinq colonnes sont pleines');
  }

  function snapshot() {
    return {
      score, peak, aim, best, drops, level, queued,
      held: held ? held.value : null,
      cells: [...allTiles()].map((t) => ({ row: t.row, col: t.col, value: t.value })),
    };
  }

  /* ---------- entrées ---------- */

  addEventListener('keydown', (e) => {
    Arcade.boot();
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a' || k === 'q') { setAim(aim - 1); e.preventDefault(); }
    else if (k === 'arrowright' || k === 'd') { setAim(aim + 1); e.preventDefault(); }
    else if (k === ' ' || k === 'arrowdown' || k === 's' || k === 'enter') { drop(); e.preventDefault(); }
    else if (k === 'r') { reset(); }
    else if (k === 'm') { el.mute.click(); }
  });

  const colFromEvent = (e) => {
    const box = el.playfield.getBoundingClientRect();
    return Math.floor((e.clientX - box.left - 6) / (cell + GAP));
  };

  let pointing = false;
  el.playfield.addEventListener('pointerdown', (e) => {
    Arcade.boot();
    if (over) return;
    pointing = true;
    el.playfield.setPointerCapture(e.pointerId);
    setAim(colFromEvent(e));
  });
  el.playfield.addEventListener('pointermove', (e) => {
    if (pointing) setAim(colFromEvent(e));
  });
  el.playfield.addEventListener('pointerup', () => {
    if (!pointing) return;
    pointing = false;
    drop();
  });
  el.playfield.addEventListener('pointercancel', () => { pointing = false; });

  document.getElementById('left').addEventListener('click', () => { Arcade.boot(); setAim(aim - 1); });
  document.getElementById('right').addEventListener('click', () => { Arcade.boot(); setAim(aim + 1); });
  document.getElementById('drop').addEventListener('click', () => { Arcade.boot(); drop(); });
  document.getElementById('restart').addEventListener('click', () => reset());
  document.getElementById('again').addEventListener('click', () => reset());

  addEventListener('resize', layout);

  Arcade.bindMute(el.mute);

  /* Reprise d'état quand la page est republiée sous les yeux d'un joueur. */
  const hot = window.claude?.hot;
  hot?.snapshot?.(snapshot);
  if (hot?.ready) hot.ready((data) => reset(data && data.cells ? data : undefined));
  else reset(hot?.data && hot.data.cells ? hot.data : undefined);
})();
