/* Rebond — moteur de jeu.
   La bille tombe toute seule et rebondit sur les parois du puits. Le seul
   pouvoir du joueur : inverser son sens horizontal. Il faut être en face du
   trou au moment d'atteindre la barre. Les trous rétrécissent et la chute
   accélère avec la profondeur, sans fin. */

(() => {
  'use strict';

  const GAME = 'rebond';
  const { reduced } = Arcade;

  const R = 11;          // rayon de la bille
  const EPAIS = 14;      // épaisseur d'une barre
  const ANCRE = 0.34;    // hauteur de la bille dans le puits, en fraction
  const MARGE = 7;       // épaisseur des parois

  const el = {
    root: document.documentElement,
    cabinet: document.querySelector('.cabinet'),
    stage: document.querySelector('.stage'),
    screen: document.getElementById('screen'),
    canvas: document.getElementById('puits'),
    depth: document.getElementById('depth'),
    best: document.getElementById('best'),
    gates: document.getElementById('gates'),
    pret: document.getElementById('pret'),
    over: document.getElementById('over'),
    overScore: document.getElementById('overScore'),
    overNote: document.getElementById('overNote'),
  };

  const ctx = el.canvas.getContext('2d');

  let W = 340;
  let H = 520;

  let etat = 'pret';     // 'pret' | 'court' | 'fini'
  let bille = null;
  let barres = [];
  let trainee = [];
  let eclats = [];
  let prochaine = 0;     // profondeur de la prochaine barre à engendrer
  let portes = 0;
  let record = 0;
  let eclair = 0;        // flash blanc à l'impact
  let last = 0;

  /* ---------- courbes de difficulté ---------- */
  /* Tout se règle sur la profondeur en mètres, un mètre valant dix pixels. */

  const metres = () => Math.max(0, Math.floor(bille.y / 10));
  const chute = (m) => Math.min(430, 190 + m * 0.5);          // px/s vers le bas

  /* La vitesse latérale décide de tout. Trop rapide, la bille traverse le puits
     entre deux barres et le joueur ne fait que subir les rebonds ; à 0,62 fois
     la chute, elle parcourt environ six dixièmes de l'écart entre deux barres,
     de quoi viser sans jamais pouvoir flâner. */
  const glisse = (m) => chute(m) * 0.62;                      // px/s de côté
  const trou = (m) => Math.max(54, 118 - m * 0.28);           // largeur du trou
  const ecart = (m) => Math.max(118, 185 - m * 0.22);         // entre deux barres

  /* ---------- toile ---------- */

  function resize() {
    const inner = el.cabinet.clientWidth - 32;                // padding-inline
    const w = Math.max(220, Math.min(inner - 36, 360));
    const h = Math.min(Math.round(w * 1.5), 540);
    const facteur = W ? w / W : 1;

    W = w;
    H = h;
    el.root.style.setProperty('--screen-w', w + 'px');
    el.root.style.setProperty('--screen-h', h + 'px');
    el.root.style.setProperty('--panel-w', w + 36 + 'px');    // toile + les deux rails

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.canvas.width = Math.round(w * dpr);
    el.canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Le puits est stocké en pixels : on le remet à l'échelle du nouveau cadre.
    if (facteur !== 1 && bille) {
      bille.x *= facteur;
      for (const b of barres) { b.x *= facteur; b.large *= facteur; }
    }
  }

  const camera = () => bille.y - H * ANCRE;

  /* ---------- engendrement ---------- */

  /* Le trou suivant reste à portée du précédent : à vitesse donnée, la bille
     peut toujours l'atteindre. La difficulté vient du trou qui rétrécit et du
     temps de réaction qui fond, jamais d'un passage impossible. */
  function engendrer() {
    const fond = camera() + H + 240;
    while (prochaine < fond) {
      const m = prochaine / 10;
      const large = trou(m);
      const demi = large / 2;
      const min = MARGE + demi + 4;
      const max = W - MARGE - demi - 4;

      let x;
      if (barres.length) {
        // Portée volontairement sous le déplacement possible en un intervalle
        // (0,62 × écart) : il reste de la marge pour se raviser.
        const avant = barres[barres.length - 1].x;
        const portee = 0.45 * ecart(m);
        x = avant + (Math.random() * 2 - 1) * portee;
        x = Math.max(min, Math.min(max, x));
      } else {
        x = W / 2;   // la première barre est toujours en face : le départ est loyal
      }

      barres.push({ y: prochaine, x, large, passee: false });
      prochaine += ecart(m);
    }
    barres = barres.filter((b) => b.y > camera() - 60);
  }

  /* ---------- boucle ---------- */

  function frame(now) {
    const dt = Math.min(0.033, last ? (now - last) / 1000 : 0);
    last = now;

    if (etat === 'court') avancer(dt);
    for (const e of eclats) {
      e.vy += 900 * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.a -= dt * 1.3;
    }
    eclats = eclats.filter((e) => e.a > 0);
    if (eclair > 0) eclair = Math.max(0, eclair - dt * 4);

    dessiner();
    requestAnimationFrame(frame);
  }

  function avancer(dt) {
    const m = metres();
    bille.y += chute(m) * dt;
    bille.x += Math.sign(bille.vx) * glisse(m) * dt;

    // rebond sur les parois
    if (bille.x < MARGE + R) { bille.x = MARGE + R; bille.vx = 1; paroi(); }
    else if (bille.x > W - MARGE - R) { bille.x = W - MARGE - R; bille.vx = -1; paroi(); }

    if (!reduced) {
      trainee.push({ x: bille.x, y: bille.y });
      if (trainee.length > 16) trainee.shift();
    }

    engendrer();

    for (const b of barres) {
      if (b.passee) continue;
      const dedans = bille.y + R > b.y && bille.y - R < b.y + EPAIS;
      if (dedans) {
        if (bille.x - R < b.x - b.large / 2 || bille.x + R > b.x + b.large / 2) {
          impact();
          return;
        }
      } else if (bille.y - R > b.y + EPAIS) {
        b.passee = true;
        portes++;
        el.gates.textContent = portes;
        if (portes % 10 === 0) Arcade.sfx.chain(Math.min(portes / 10, 10));
        else Arcade.sfx.tick();
      }
    }

    el.depth.textContent = m;
    if (m > record) {
      record = m;
      el.best.textContent = record;
      Arcade.setRecord(GAME, record);
    }
  }

  function paroi() {
    Arcade.tone({ freq: 320, to: 180, dur: 0.06, type: 'square', vol: 0.06 });
  }

  function impact() {
    etat = 'fini';
    eclair = 1;
    Arcade.shake(el.stage, 5);
    Arcade.tone({ freq: 90, to: 40, dur: 0.4, type: 'sawtooth', vol: 0.16 });
    Arcade.sfx.over();

    if (!reduced) {
      for (let i = 0; i < 20; i++) {
        const a = (Math.PI * 2 * i) / 20 + Math.random();
        const v = 110 + Math.random() * 170;
        eclats.push({ x: bille.x, y: bille.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, a: 1 });
      }
    }

    const m = metres();
    el.overScore.textContent = m;
    el.overNote.innerHTML = portes
      ? `mètres · <b>${portes}</b> ${portes > 1 ? 'portes franchies' : 'porte franchie'}`
      : 'mètres · aucune porte franchie';
    el.over.hidden = false;
  }

  /* ---------- rendu ---------- */

  const teinte = () => Math.min(1, metres() / 420);

  function dessiner() {
    const t = bille ? teinte() : 0;
    const cam = bille ? camera() : 0;

    // Le puits vire au magenta profond à mesure qu'on descend.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgb(${10 + t * 18}, ${16 + t * 2}, ${23 + t * 14})`);
    g.addColorStop(1, `rgb(${14 + t * 74}, ${22 - t * 8}, ${32 + t * 28})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // stries de vitesse : le défilement se voit même sans repère fixe
    ctx.strokeStyle = `rgba(255, 77, 141, ${0.05 + t * 0.07})`;
    ctx.lineWidth = 1;
    const pas = 34;
    for (let y = -((cam % pas) + pas) % pas; y < H; y += pas) {
      ctx.beginPath();
      ctx.moveTo(MARGE, y);
      ctx.lineTo(W - MARGE, y);
      ctx.stroke();
    }

    // Doublure du puits : unie, sans graduation. Les rails du châssis portent
    // déjà des traits, et deux rythmes côte à côte se mettaient à vibrer.
    ctx.fillStyle = '#14272e';
    ctx.fillRect(0, 0, MARGE, H);
    ctx.fillRect(W - MARGE, 0, MARGE, H);
    ctx.fillStyle = 'rgba(255, 210, 228, .14)';
    ctx.fillRect(MARGE - 1, 0, 1, H);
    ctx.fillRect(W - MARGE, 0, 1, H);

    for (const b of barres) {
      const y = b.y - cam;
      if (y < -EPAIS || y > H) continue;
      const gauche = b.x - b.large / 2;
      const droite = b.x + b.large / 2;
      ctx.fillStyle = b.passee ? '#5b2540' : '#ff4d8d';
      ctx.fillRect(MARGE, y, gauche - MARGE, EPAIS);
      ctx.fillRect(droite, y, W - MARGE - droite, EPAIS);
      if (!b.passee) {
        // les lèvres du trou, pour que la cible saute aux yeux
        ctx.fillStyle = '#ffd2e4';
        ctx.fillRect(gauche - 3, y, 3, EPAIS);
        ctx.fillRect(droite, y, 3, EPAIS);
      }
    }

    if (bille) {
      for (let i = 0; i < trainee.length; i++) {
        const p = trainee[i];
        ctx.globalAlpha = (i / trainee.length) * 0.4;
        ctx.fillStyle = '#ff4d8d';
        ctx.beginPath();
        ctx.arc(p.x, p.y - cam, R * (0.3 + (i / trainee.length) * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (etat !== 'fini') {
        ctx.save();
        ctx.shadowColor = '#ff4d8d';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#ffe8f1';
        ctx.beginPath();
        ctx.arc(bille.x, bille.y - cam, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    for (const e of eclats) {
      ctx.globalAlpha = Math.max(0, e.a);
      ctx.fillStyle = '#ffd2e4';
      ctx.beginPath();
      ctx.arc(e.x, e.y - cam, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (eclair > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${eclair * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------- cycle de vie ---------- */

  function reset() {
    resize();
    etat = 'pret';
    barres = [];
    trainee = [];
    eclats = [];
    portes = 0;
    eclair = 0;
    prochaine = 330;   // de quoi prendre ses marques avant la première barre
    bille = { x: W / 2, y: 0, vx: Math.random() < 0.5 ? -1 : 1 };
    record = Arcade.record(GAME);

    el.depth.textContent = 0;
    el.gates.textContent = 0;
    el.best.textContent = record;
    el.over.hidden = true;
    el.pret.hidden = false;
    engendrer();
  }

  /* ---------- entrées ---------- */

  function agir() {
    Arcade.boot();
    if (etat === 'pret') {
      etat = 'court';
      el.pret.hidden = true;
      return;
    }
    if (etat !== 'court') return;
    bille.vx = -bille.vx;
    Arcade.tone({ freq: bille.vx > 0 ? 560 : 470, dur: 0.05, type: 'triangle', vol: 0.07 });
  }

  el.screen.addEventListener('pointerdown', (e) => {
    if (etat === 'fini') return;       // laisse le bouton Rejouer recevoir le clic
    e.preventDefault();
    agir();
  });

  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'enter' || k === 'arrowleft' || k === 'arrowright') { agir(); e.preventDefault(); }
    else if (k === 'r') { reset(); }
    else if (k === 'm') { document.getElementById('mute').click(); }
  });

  document.getElementById('flip').addEventListener('click', agir);
  document.getElementById('restart').addEventListener('click', reset);
  document.getElementById('again').addEventListener('click', reset);
  Arcade.bindMute(document.getElementById('mute'));

  addEventListener('resize', resize);

  reset();
  requestAnimationFrame(frame);
})();
