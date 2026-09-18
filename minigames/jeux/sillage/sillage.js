/* Sillage — moteur de jeu.
   On part de son territoire, on trace un sillage dans le vide, on revient :
   tout ce qu'on referme devient à soi. Des rôdeurs patrouillent le vide ;
   s'ils touchent le sillage avant le retour, la vie est perdue.

   La règle de remplissage tient en une phrase : après un retour, toute région
   du vide où ne se trouve aucun rôdeur est conquise. C'est ce qui rend les
   grandes boucles payantes et interdit d'enfermer un rôdeur pour rien. */

(() => {
  'use strict';

  const COLS = 30;
  const ROWS = 42;
  const VIDE = 0, TERRE = 1, TRACE = 2;
  const OBJECTIF = 0.7;          // part du terrain à conquérir pour passer au niveau
  const VIES = 3;
  const GAME = 'sillage';
  const { reduced } = Arcade;

  const DIRS = {
    gauche: [-1, 0], droite: [1, 0], haut: [0, -1], bas: [0, 1],
  };

  const el = {
    cabinet: document.querySelector('.cabinet'),
    root: document.documentElement,
    stage: document.querySelector('.stage'),
    screen: document.getElementById('screen'),
    canvas: document.getElementById('terrain'),
    score: document.getElementById('score'),
    best: document.getElementById('best'),
    vies: document.getElementById('vies'),
    meter: document.getElementById('meter'),
    meterLab: document.getElementById('meterLab'),
    meterLeft: document.getElementById('meterLeft'),
    jauge: document.getElementById('jauge'),
    pret: document.getElementById('pret'),
    pretTitre: document.getElementById('pretTitre'),
    pretTexte: document.getElementById('pretTexte'),
    pretAide: document.getElementById('pretAide'),
    annonce: document.getElementById('annonce'),
    over: document.getElementById('over'),
    overKicker: document.getElementById('overKicker'),
    overScore: document.getElementById('overScore'),
    overNote: document.getElementById('overNote'),
  };

  const ctx = el.canvas.getContext('2d');

  let cell = 10;
  let grille = new Uint8Array(COLS * ROWS);
  let joueur = null;             // { x, y, dir, suivant, prog, dehors }
  let rodeurs = [];
  let niveau = 1;
  let score = 0;
  let record = 0;
  let vies = VIES;
  let conquis = 0;               // cases possédées
  let etat = 'pret';             // 'pret' | 'court' | 'pause' | 'fini'
  let invulnerable = 0;
  let eclair = 0;
  let last = 0;

  const idx = (x, y) => y * COLS + x;
  const dedans = (x, y) => x >= 0 && x < COLS && y >= 0 && y < ROWS;

  /* ---------- courbes ---------- */

  const vitesseJoueur = () => Math.min(21, 15 + niveau * 0.5);
  const vitesseRodeur = () => Math.min(17, 8.5 + niveau * 0.7);
  /* Un seul rôdeur au départ : le premier niveau doit enseigner la règle du
     remplissage, pas la subir. */
  const nbRodeurs = () => Math.min(5, 1 + Math.floor(niveau / 2));

  /* ---------- toile ---------- */

  function resize() {
    const inner = el.cabinet.clientWidth - 32;                  // padding-inline
    const large = Math.max(200, Math.min(inner - 36, 340));
    cell = Math.max(6, Math.floor(large / COLS));
    const w = cell * COLS;
    const h = cell * ROWS;
    el.root.style.setProperty('--screen-w', w + 'px');
    el.root.style.setProperty('--screen-h', h + 'px');
    el.root.style.setProperty('--panel-w', w + 36 + 'px');       // toile + les deux rails

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.canvas.width = Math.round(w * dpr);
    el.canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- mise en place ---------- */

  function poserTerrain() {
    grille = new Uint8Array(COLS * ROWS);
    for (let x = 0; x < COLS; x++) { grille[idx(x, 0)] = TERRE; grille[idx(x, ROWS - 1)] = TERRE; }
    for (let y = 0; y < ROWS; y++) { grille[idx(0, y)] = TERRE; grille[idx(COLS - 1, y)] = TERRE; }
    conquis = compter();

    joueur = { x: Math.floor(COLS / 2), y: 0, dir: null, suivant: null, prog: 0, dehors: false };

    rodeurs = [];
    for (let i = 0; i < nbRodeurs(); i++) {
      const angle = Math.PI / 4 + (i * Math.PI) / 2 + Math.random() * 0.5;
      rodeurs.push({
        x: 4 + Math.random() * (COLS - 8),
        y: 6 + Math.random() * (ROWS - 12),
        vx: Math.cos(angle),
        vy: Math.sin(angle),
      });
    }
    invulnerable = 1.2;
  }

  function compter() {
    let n = 0;
    for (let i = 0; i < grille.length; i++) if (grille[i] === TERRE) n++;
    return n;
  }

  const part = () => conquis / (COLS * ROWS);

  /* ---------- conquête ---------- */

  /* Après un retour : le sillage devient terre, puis toute région du vide où
     ne se trouve aucun rôdeur est absorbée. */
  function conquerir() {
    for (let i = 0; i < grille.length; i++) if (grille[i] === TRACE) grille[i] = TERRE;

    const libre = new Uint8Array(grille.length);
    const pile = [];
    const amorcer = (x, y) => {
      if (!dedans(x, y)) return false;
      const i = idx(x, y);
      if (grille[i] === TERRE || libre[i]) return false;
      libre[i] = 1;
      pile.push(i);
      return true;
    };
    for (const r of rodeurs) {
      const x = Math.max(0, Math.min(COLS - 1, Math.floor(r.x)));
      const y = Math.max(0, Math.min(ROWS - 1, Math.floor(r.y)));
      if (amorcer(x, y)) continue;
      // Sa case est déjà terre : on amorce par les voisines, sinon la région
      // où il se trouve serait absorbée et il resterait enfermé dedans.
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) amorcer(x + dx, y + dy);
    }
    while (pile.length) {
      const i = pile.pop();
      const x = i % COLS, y = (i - x) / COLS;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!dedans(nx, ny)) continue;
        const j = idx(nx, ny);
        if (grille[j] === TERRE || libre[j]) continue;
        libre[j] = 1;
        pile.push(j);
      }
    }

    let gagne = 0;
    for (let i = 0; i < grille.length; i++) {
      if (grille[i] !== TERRE && !libre[i]) { grille[i] = TERRE; gagne++; }
    }

    conquis = compter();
    if (gagne) {
      // Une grande prise en une seule boucle vaut double : c'est le pari du jeu.
      const gros = gagne >= 60;
      score += gagne * (gros ? 2 : 1);
      el.score.textContent = score;
      Arcade.replay(el.score, 'flash');
      Arcade.sfx.chain(Math.min(2 + Math.floor(gagne / 40), 10));
      if (gros) Arcade.shake(el.stage, 3);
      if (score > record) {
        record = score;
        el.best.textContent = record;
        Arcade.setRecord(GAME, record);
      }
    }
    else {
      // Les deux régions contenaient un rôdeur : on le dit, sinon le joueur
      // croit à une panne.
      flasher('Un rôdeur dans la zone : rien de conquis');
      Arcade.sfx.deny();
    }
    majJauge();
    if (part() >= OBJECTIF) reussir();
  }

  function flasher(texte) {
    el.annonce.textContent = texte;
    el.annonce.hidden = false;
    clearTimeout(flasher.t);
    flasher.t = setTimeout(() => { el.annonce.hidden = true; }, 1500);
  }

  /* ---------- pas du joueur ---------- */

  function avancerJoueur() {
    if (joueur.suivant) {
      const [dx, dy] = DIRS[joueur.suivant];
      const contre = joueur.dir && DIRS[joueur.dir][0] === -dx && DIRS[joueur.dir][1] === -dy;
      // Demi-tour interdit tant qu'on est dehors : on se couperait le sillage.
      if (!(contre && joueur.dehors)) joueur.dir = joueur.suivant;
      joueur.suivant = null;
    }
    if (!joueur.dir) return;

    const [dx, dy] = DIRS[joueur.dir];
    const nx = joueur.x + dx, ny = joueur.y + dy;
    if (!dedans(nx, ny)) { joueur.dir = null; return; }

    joueur.x = nx;
    joueur.y = ny;
    const i = idx(nx, ny);

    if (grille[i] === TRACE) { mourir('sillage coupé par vous-même'); return; }
    if (grille[i] === VIDE) { grille[i] = TRACE; joueur.dehors = true; return; }
    if (joueur.dehors) { joueur.dehors = false; conquerir(); }
  }

  /* ---------- rôdeurs ---------- */

  function avancerRodeurs(dt) {
    const v = vitesseRodeur();
    for (const r of rodeurs) {
      const sx = r.x + r.vx * v * dt;
      const sy = r.y + r.vy * v * dt;
      const cx = Math.floor(sx), cy = Math.floor(r.y);
      if (!dedans(cx, cy) || grille[idx(cx, cy)] === TERRE) r.vx = -r.vx;
      else r.x = sx;
      const dx2 = Math.floor(r.x), dy2 = Math.floor(sy);
      if (!dedans(dx2, dy2) || grille[idx(dx2, dy2)] === TERRE) r.vy = -r.vy;
      else r.y = sy;

      const gx = Math.floor(r.x), gy = Math.floor(r.y);
      if (dedans(gx, gy) && grille[idx(gx, gy)] === TRACE) { mourir('sillage coupé'); return; }
      if (joueur.dehors && gx === joueur.x && gy === joueur.y) { mourir('rôdeur touché'); return; }
    }
  }

  /* ---------- vie et mort ---------- */

  function mourir(raison) {
    if (invulnerable > 0 || etat !== 'court') return;
    vies--;
    eclair = 1;
    Arcade.shake(el.stage, 5);
    Arcade.tone({ freq: 110, to: 45, dur: 0.35, type: 'sawtooth', vol: 0.15 });
    for (let i = 0; i < grille.length; i++) if (grille[i] === TRACE) grille[i] = VIDE;
    majVies();

    if (vies <= 0) { finir(raison); return; }

    // On repart d'un bord, à l'abri.
    joueur = { x: Math.floor(COLS / 2), y: 0, dir: null, suivant: null, prog: 0, dehors: false };
    invulnerable = 1.4;
  }

  function reussir() {
    etat = 'pause';
    for (let i = 1; i <= 4; i++) Arcade.tone({ freq: Arcade.step(i * 2), dur: 0.2, vol: 0.13, delay: i * 0.09 });
    const bonus = 100 + niveau * 50;
    score += bonus;
    el.score.textContent = score;
    if (score > record) {
      record = score;
      el.best.textContent = record;
      Arcade.setRecord(GAME, record);
    }
    niveau++;
    el.pretTitre.textContent = `Niveau ${niveau - 1} conquis`;
    el.pretTexte.innerHTML = `${Math.round(part() * 100)} % du terrain, prime de <b>${bonus}</b> points. ` +
      `Niveau ${niveau} : ${nbRodeurs()} rôdeurs, plus rapides.`;
    el.pretAide.textContent = 'Flèches, ou glissez sur le terrain';
    el.pret.hidden = false;
    poserTerrain();
    majJauge();
  }

  function finir(raison) {
    etat = 'fini';
    Arcade.sfx.over();
    el.overKicker.textContent = raison;
    el.overScore.textContent = score;
    el.overNote.innerHTML = `points · niveau <b>${niveau}</b> · ${Math.round(part() * 100)} % conquis`;
    el.over.hidden = false;
  }

  /* ---------- tableau de bord ---------- */

  function majVies() {
    el.vies.innerHTML = '';
    for (let i = 0; i < VIES; i++) {
      const point = document.createElement('i');
      if (i >= vies) point.className = 'perdue';
      el.vies.appendChild(point);
    }
  }

  function majJauge() {
    const p = part();
    el.meterLab.textContent = `Niveau ${niveau} · conquis`;
    el.meterLeft.textContent = `${Math.round(p * 100)} % sur ${Math.round(OBJECTIF * 100)} %`;
    el.jauge.style.width = Math.min(100, (p / OBJECTIF) * 100) + '%';
    el.meter.classList.toggle('hot', p >= OBJECTIF * 0.85);
  }

  /* ---------- rendu ---------- */

  function dessiner() {
    ctx.fillStyle = '#080d12';
    ctx.fillRect(0, 0, COLS * cell, ROWS * cell);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const v = grille[idx(x, y)];
        if (v === VIDE) continue;
        ctx.fillStyle = v === TERRE ? '#8a6a06' : '#ffe9a3';
        ctx.fillRect(x * cell, y * cell, cell, cell);
        if (v === TERRE) {
          ctx.fillStyle = 'rgba(232, 195, 58, .5)';
          ctx.fillRect(x * cell, y * cell, cell, 1);
        }
      }
    }

    if (joueur) {
      const clignote = invulnerable > 0 && Math.floor(invulnerable * 10) % 2 === 0;
      if (!clignote) {
        ctx.save();
        ctx.shadowColor = '#ffe9a3';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#fff6d8';
        ctx.fillRect(joueur.x * cell - 1, joueur.y * cell - 1, cell + 2, cell + 2);
        ctx.restore();
      }
    }

    for (const r of rodeurs) {
      const cx = (r.x + 0.5) * cell, cy = (r.y + 0.5) * cell;
      ctx.save();
      ctx.shadowColor = '#ff4d5e';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ff4d5e';
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#2a0a10';
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.24, 0, Math.PI * 2);
      ctx.fill();
    }

    if (eclair > 0) {
      ctx.fillStyle = `rgba(255, 77, 94, ${eclair * 0.45})`;
      ctx.fillRect(0, 0, COLS * cell, ROWS * cell);
    }
  }

  /* ---------- boucle ---------- */

  function frame(now) {
    const dt = Math.min(0.033, last ? (now - last) / 1000 : 0);
    last = now;

    if (etat === 'court') {
      if (invulnerable > 0) invulnerable = Math.max(0, invulnerable - dt);
      joueur.prog += vitesseJoueur() * dt;
      let pas = 0;
      while (joueur.prog >= 1 && pas < 4) { joueur.prog -= 1; avancerJoueur(); pas++; }
      if (etat === 'court') avancerRodeurs(dt);
    }
    if (eclair > 0) eclair = Math.max(0, eclair - dt * 2.5);

    dessiner();
    requestAnimationFrame(frame);
  }

  /* ---------- entrées ---------- */

  function virer(nom) {
    if (etat === 'pret' || etat === 'pause') { demarrer(); }
    if (etat !== 'court' || !DIRS[nom]) return;
    joueur.suivant = nom;
  }

  function demarrer() {
    Arcade.boot();
    etat = 'court';
    el.pret.hidden = true;
  }

  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    const nom = { arrowleft: 'gauche', q: 'gauche', a: 'gauche',
                  arrowright: 'droite', d: 'droite',
                  arrowup: 'haut', z: 'haut', w: 'haut',
                  arrowdown: 'bas', s: 'bas' }[k];
    if (nom) { virer(nom); e.preventDefault(); return; }
    if (k === ' ' || k === 'enter') { if (etat === 'pret' || etat === 'pause') demarrer(); e.preventDefault(); }
    else if (k === 'r') { recommencer(); }
    else if (k === 'm') { document.getElementById('mute').click(); }
  });

  document.querySelector('.pad--croix').addEventListener('click', (e) => {
    const b = e.target.closest('[data-dir]');
    if (b) virer(b.dataset.dir);
  });

  // Glisser sur le terrain : chaque déplacement franc donne une direction.
  let depart = null;
  el.screen.addEventListener('pointerdown', (e) => {
    if (etat === 'fini') return;
    e.preventDefault();
    el.screen.setPointerCapture(e.pointerId);
    depart = { x: e.clientX, y: e.clientY };
    if (etat === 'pret' || etat === 'pause') demarrer();
  });
  el.screen.addEventListener('pointermove', (e) => {
    if (!depart) return;
    const dx = e.clientX - depart.x, dy = e.clientY - depart.y;
    if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return;
    virer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'droite' : 'gauche') : (dy > 0 ? 'bas' : 'haut'));
    depart = { x: e.clientX, y: e.clientY };
  });
  const lacher = () => { depart = null; };
  el.screen.addEventListener('pointerup', lacher);
  el.screen.addEventListener('pointercancel', lacher);

  function recommencer() {
    niveau = 1;
    score = 0;
    vies = VIES;
    record = Arcade.record(GAME);
    etat = 'pret';
    el.score.textContent = 0;
    el.best.textContent = record;
    el.over.hidden = true;
    el.pretTitre.textContent = 'Prêt à tracer';
    el.pretTexte.textContent = 'Sortez de votre territoire, faites une boucle, revenez. Tout ce que ' +
      'vous refermez sans rôdeur dedans vous appartient. Si un rôdeur touche votre sillage avant ' +
      'le retour, vous perdez une vie.';
    el.pretAide.textContent = 'Flèches, ou glissez sur le terrain';
    el.pret.hidden = false;
    resize();
    poserTerrain();
    majVies();
    majJauge();
  }

  document.getElementById('restart').addEventListener('click', recommencer);
  document.getElementById('rejouer').addEventListener('click', recommencer);
  Arcade.bindMute(document.getElementById('mute'));
  addEventListener('resize', () => { resize(); });

  recommencer();
  requestAnimationFrame(frame);
})();
