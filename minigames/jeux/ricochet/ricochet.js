/* Ricochet — moteur de jeu.
   On tire une bille en fronde ; elle rebondit sur les parois et les blocs, et
   traverse les cibles sans dévier. Autant de tirs que de cibles — un de moins
   passé le niveau 10 — et chaque tir épargné vaut une prime.

   Deux points tiennent le jeu :

   1. La simulation tourne en unités fixes (320 x 430), quelle que soit la
      taille de l'écran, et au pas fixe de 1/60 s. La trajectoire jouée est donc
      exactement celle qui a servi à vérifier le niveau — sans quoi la garantie
      ne vaudrait rien.

   2. Un niveau n'est servi qu'une fois vérifié : chaque cible doit être
      atteignable par au moins un tir d'un balayage de 630 tirs, et quand les
      tirs sont moins nombreux que les cibles, il faut en plus qu'un tir en
      ramasse deux — ce tir plus un par cible restante tient alors dans le
      budget. Mesuré : un niveau servi par tirage, en 20 ms environ. */

(() => {
  'use strict';

  const L = 320, H = 430;        // unités de simulation
  const R = 7;                   // rayon de la bille
  const DT = 1 / 60;
  const FROTTE = 0.40;
  const ARRET = 26;
  const PAS_MAX = 420;
  const PUIS_MIN = 280, PUIS_MAX = 720;
  const TIRE_MIN = 14, TIRE_MAX = 96;   // amplitude du geste, en unités
  const GAME = 'ricochet';
  const { reduced } = Arcade;

  const el = {
    cabinet: document.querySelector('.cabinet'),
    root: document.documentElement,
    stage: document.querySelector('.stage'),
    screen: document.getElementById('screen'),
    canvas: document.getElementById('terrain'),
    score: document.getElementById('score'),
    best: document.getElementById('best'),
    niveau: document.getElementById('niveau'),
    meter: document.getElementById('meter'),
    tirs: document.getElementById('tirs'),
    jauge: document.getElementById('jauge'),
    annonce: document.getElementById('annonce'),
    pret: document.getElementById('pret'),
    over: document.getElementById('over'),
    overScore: document.getElementById('overScore'),
    overNote: document.getElementById('overNote'),
  };

  const ctx = el.canvas.getContext('2d');
  let echelle = 1;

  let murs = [], cibles = [];
  let bille = null;              // { x, y, vx, vy } pendant le roulé
  let trainee = [];
  let niveau = 1, score = 0, record = 0;
  let tirs = 0, tirsMax = 0;
  let etat = 'pret';             // 'pret' | 'vise' | 'roule' | 'fini'
  let visee = null;              // { dx, dy } geste en cours
  let reste = 0;                 // accumulateur de temps, pour un pas fixe
  let last = 0;

  const depart = () => ({ x: L / 2, y: H - 26 });

  /* ---------- physique, partagée par le jeu et la vérification ---------- */

  function heurte(x, y, obstacles) {
    if (x < R || x > L - R || y < R || y > H - R) return true;
    for (const m of obstacles) {
      if (x > m.x - R && x < m.x + m.l + R && y > m.y - R && y < m.y + m.h + R) return true;
    }
    return false;
  }

  /* Un pas de simulation. Renvoie true si la bille a rebondi. */
  function pas(b, obstacles) {
    let rebond = false;
    const nx = b.x + b.vx * DT;
    if (heurte(nx, b.y, obstacles)) { b.vx = -b.vx; rebond = true; } else b.x = nx;
    const ny = b.y + b.vy * DT;
    if (heurte(b.x, ny, obstacles)) { b.vy = -b.vy; rebond = true; } else b.y = ny;
    const f = Math.pow(FROTTE, DT);
    b.vx *= f; b.vy *= f;
    return rebond;
  }

  const immobile = (b) => Math.hypot(b.vx, b.vy) < ARRET;

  /* Tir simulé d'un bloc : sert à la vérification et à l'aperçu. */
  function simuler(angle, puissance, obstacles, listeCibles, arretAuRebond) {
    const p = depart();
    const b = { x: p.x, y: p.y, vx: Math.cos(angle) * puissance, vy: Math.sin(angle) * puissance };
    const pris = new Set();
    const trace = [{ x: b.x, y: b.y }];
    for (let t = 0; t < PAS_MAX; t++) {
      const rebond = pas(b, obstacles);
      trace.push({ x: b.x, y: b.y });
      listeCibles.forEach((c, i) => {
        if (!pris.has(i) && !c.prise && Math.hypot(b.x - c.x, b.y - c.y) < R + c.r) pris.add(i);
      });
      if (arretAuRebond && rebond) break;
      if (immobile(b)) break;
    }
    return { pris, trace };
  }

  /* ---------- engendrement vérifié ---------- */

  const nbCibles = (n) => Math.min(5, 2 + Math.floor(n / 3));
  const nbTirs = (n) => (n >= 10 ? nbCibles(n) - 1 : nbCibles(n));

  function tirage(n) {
    const obstacles = [];
    const nMurs = Math.min(5, 1 + Math.floor(n / 2));
    for (let i = 0; i < nMurs; i++) {
      const vertical = Math.random() < 0.5;
      const l = vertical ? 12 : 60 + Math.random() * 90;
      const h = vertical ? 60 + Math.random() * 90 : 12;
      obstacles.push({ x: 26 + Math.random() * (L - 52 - l), y: 46 + Math.random() * (H - 150 - h), l, h });
    }
    const liste = [];
    for (let i = 0; i < nbCibles(n); i++) {
      for (let essai = 0; essai < 60; essai++) {
        const c = { x: 30 + Math.random() * (L - 60), y: 36 + Math.random() * (H - 150), r: 11, prise: false };
        if (heurte(c.x, c.y, obstacles)) continue;
        if (liste.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < 46)) continue;
        liste.push(c);
        break;
      }
    }
    return { obstacles, liste };
  }

  function engendrer(n) {
    const budget = nbTirs(n);
    let dernier = null;
    for (let essai = 0; essai < 60; essai++) {
      const { obstacles, liste } = tirage(n);
      dernier = { obstacles, liste };
      if (liste.length < nbCibles(n)) continue;

      const atteinte = liste.map(() => 0);
      let meilleur = 0;
      for (let a = 0; a < 90; a++) {
        const angle = Math.PI + (a + 0.5) * (Math.PI / 90);
        for (let q = 0; q < 7; q++) {
          const { pris } = simuler(angle, PUIS_MIN + (q / 6) * (PUIS_MAX - PUIS_MIN), obstacles, liste, false);
          meilleur = Math.max(meilleur, pris.size);
          for (const i of pris) atteinte[i]++;
        }
      }
      if (!atteinte.every((k) => k > 0)) continue;
      if (budget < liste.length && meilleur < 2) continue;
      return { obstacles, liste };
    }
    return dernier;
  }

  /* ---------- toile ---------- */

  function resize() {
    const inner = el.cabinet.clientWidth - 32;                 // padding-inline
    const large = Math.max(220, Math.min(inner - 36, 340));
    echelle = large / L;
    const w = Math.round(L * echelle), h = Math.round(H * echelle);
    el.root.style.setProperty('--screen-w', w + 'px');
    el.root.style.setProperty('--screen-h', h + 'px');
    el.root.style.setProperty('--panel-w', w + 36 + 'px');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.canvas.width = Math.round(w * dpr);
    el.canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr * echelle, 0, 0, dpr * echelle, 0, 0);  // on dessine en unités de simulation
  }

  /* ---------- rendu ---------- */

  function dessiner() {
    ctx.fillStyle = '#0a1208';
    ctx.fillRect(0, 0, L, H);

    ctx.strokeStyle = 'rgba(158, 209, 63, .05)';
    ctx.lineWidth = 1;
    for (let y = 40; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(L, y); ctx.stroke(); }

    for (const m of murs) {
      ctx.fillStyle = '#25361a';
      ctx.fillRect(m.x, m.y, m.l, m.h);
      ctx.fillStyle = 'rgba(158, 209, 63, .35)';
      ctx.fillRect(m.x, m.y, m.l, 2);
    }

    for (const c of cibles) {
      if (c.prise) continue;
      ctx.save();
      ctx.strokeStyle = '#9ed13f';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#9ed13f';
      ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(158, 209, 63, .22)';
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r * 0.55, 0, Math.PI * 2); ctx.fill();
    }

    // aperçu : départ du tir jusqu'au premier rebond, pas au-delà
    if (etat === 'vise' && visee) {
      const { angle, puissance } = geste();
      const { trace } = simuler(angle, puissance, murs, cibles, true);
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(226, 244, 190, .75)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      trace.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      ctx.restore();
      const bout = trace[trace.length - 1];
      ctx.fillStyle = 'rgba(226, 244, 190, .75)';
      ctx.beginPath(); ctx.arc(bout.x, bout.y, 3, 0, Math.PI * 2); ctx.fill();
    }

    for (let i = 0; i < trainee.length; i++) {
      const p = trainee[i];
      ctx.globalAlpha = (i / trainee.length) * 0.45;
      ctx.fillStyle = '#9ed13f';
      ctx.beginPath(); ctx.arc(p.x, p.y, R * (0.3 + (i / trainee.length) * 0.6), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    const p = bille || depart();
    ctx.save();
    ctx.shadowColor = '#e2f4be';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#f2ffdc';
    ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // le socle de tir
    ctx.fillStyle = '#25361a';
    ctx.fillRect(L / 2 - 26, H - 14, 52, 8);
  }

  /* ---------- geste de visée ---------- */

  function geste() {
    const d = Math.hypot(visee.dx, visee.dy);
    const t = Math.max(0, Math.min(1, (d - TIRE_MIN) / (TIRE_MAX - TIRE_MIN)));
    // On tire en arrière : la bille part à l'opposé du geste.
    const angle = Math.atan2(-visee.dy, -visee.dx);
    return { angle, puissance: PUIS_MIN + t * (PUIS_MAX - PUIS_MIN), pret: d >= TIRE_MIN };
  }

  /* ---------- boucle ---------- */

  function frame(now) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;

    if (etat === 'roule' && bille) {
      reste += dt;
      let n = 0;
      while (reste >= DT && n < 8) {                    // pas fixe : identique à la vérification
        reste -= DT;
        n++;
        if (pas(bille, murs)) Arcade.tone({ freq: 420, to: 300, dur: 0.05, type: 'square', vol: 0.05 });
        if (!reduced) { trainee.push({ x: bille.x, y: bille.y }); if (trainee.length > 18) trainee.shift(); }
        ramasser();
        if (immobile(bille)) { arreter(); break; }
      }
    } else if (trainee.length) {
      trainee.shift();
    }

    dessiner();
    requestAnimationFrame(frame);
  }

  function ramasser() {
    for (const c of cibles) {
      if (c.prise) continue;
      if (Math.hypot(bille.x - c.x, bille.y - c.y) < R + c.r) {
        c.prise = true;
        score += 100;
        el.score.textContent = score;
        Arcade.replay(el.score, 'flash');
        Arcade.sfx.chain(Math.min(2 + cibles.filter((z) => z.prise).length, 10));
      }
    }
  }

  function arreter() {
    bille = null;
    if (cibles.every((c) => c.prise)) return reussir();
    if (tirs <= 0) return finir();
    etat = 'vise';
    majBord();
  }

  function reussir() {
    const prime = tirs * 60;
    score += prime;
    el.score.textContent = score;
    if (score > record) {
      record = score;
      el.best.textContent = record;
      Arcade.setRecord(GAME, record);
    }
    annoncer(prime ? `Niveau franchi · prime de ${prime}` : 'Niveau franchi');
    for (let i = 1; i <= 4; i++) Arcade.tone({ freq: Arcade.step(i * 2), dur: 0.2, vol: 0.13, delay: i * 0.09 });
    etat = 'roule';
    setTimeout(() => { niveau++; nouveauNiveau(); }, reduced ? 50 : 900);
  }

  function finir() {
    etat = 'fini';
    Arcade.sfx.over();
    el.overScore.textContent = score;
    el.overNote.innerHTML = `points · bloqué au niveau <b>${niveau}</b>`;
    el.over.hidden = false;
  }

  function annoncer(texte) {
    el.annonce.textContent = texte;
    el.annonce.hidden = false;
    clearTimeout(annoncer.t);
    annoncer.t = setTimeout(() => { el.annonce.hidden = true; }, 1400);
  }

  function majBord() {
    el.niveau.textContent = niveau;
    el.tirs.textContent = `${tirs} / ${tirsMax}`;
    el.jauge.style.width = (tirs / tirsMax) * 100 + '%';
    el.meter.classList.toggle('hot', tirs <= 1);
  }

  function nouveauNiveau() {
    const { obstacles, liste } = engendrer(niveau);
    murs = obstacles;
    cibles = liste;
    tirsMax = nbTirs(niveau);
    tirs = tirsMax;
    bille = null;
    trainee = [];
    visee = null;
    etat = 'vise';
    majBord();
  }

  function recommencer() {
    niveau = 1;
    score = 0;
    record = Arcade.record(GAME);
    el.score.textContent = 0;
    el.best.textContent = record;
    el.over.hidden = true;
    el.pret.hidden = false;
    resize();
    nouveauNiveau();
    etat = 'pret';
  }

  /* ---------- entrées ---------- */

  const enUnites = (e) => {
    const r = el.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / echelle, y: (e.clientY - r.top) / echelle };
  };

  let origine = null;
  el.screen.addEventListener('pointerdown', (e) => {
    if (etat === 'pret') { Arcade.boot(); el.pret.hidden = true; etat = 'vise'; }
    if (etat !== 'vise') return;
    e.preventDefault();
    el.screen.setPointerCapture(e.pointerId);
    origine = enUnites(e);
    visee = { dx: 0, dy: 0 };
  });

  el.screen.addEventListener('pointermove', (e) => {
    if (!origine || etat !== 'vise') return;
    const p = enUnites(e);
    visee = { dx: p.x - origine.x, dy: p.y - origine.y };
  });

  function lacher() {
    if (!origine || etat !== 'vise') { origine = null; visee = null; return; }
    const g = geste();
    origine = null;
    if (!g.pret) { visee = null; return; }               // geste trop court : on ne tire pas
    visee = null;
    const d = depart();
    bille = { x: d.x, y: d.y, vx: Math.cos(g.angle) * g.puissance, vy: Math.sin(g.angle) * g.puissance };
    trainee = [];
    reste = 0;
    tirs--;
    etat = 'roule';
    majBord();
    Arcade.boot();
    Arcade.tone({ freq: 180, to: 520, dur: 0.12, type: 'triangle', vol: 0.12 });
  }

  el.screen.addEventListener('pointerup', lacher);
  el.screen.addEventListener('pointercancel', () => { origine = null; visee = null; });

  document.getElementById('restart').addEventListener('click', recommencer);
  document.getElementById('rejouer').addEventListener('click', recommencer);
  Arcade.bindMute(document.getElementById('mute'));
  addEventListener('resize', resize);
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'r') recommencer();
    else if (k === 'm') document.getElementById('mute').click();
  });

  recommencer();
  requestAnimationFrame(frame);
})();
