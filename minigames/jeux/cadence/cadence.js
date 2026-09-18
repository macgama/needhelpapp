/* Cadence — moteur de jeu.
   Quatre voies, des notes qui descendent, une ligne de frappe.

   La règle qui tient tout le jeu : UNE SEULE HORLOGE, celle du son. La
   position d'une note à l'écran et le jugement d'une frappe se calculent
   tous deux depuis AudioContext.currentTime. L'horloge des images (rAF) ne
   sert qu'à décider quand redessiner, jamais à dater quoi que ce soit — les
   deux dérivent l'une par rapport à l'autre, et dans un jeu de rythme cette
   dérive est exactement ce qui rend une frappe juste « ratée ».

   La batterie est planifiée en avance à des instants absolus du contexte
   audio : ce qu'on entend et ce qu'on voit descendent du même nombre. */

(() => {
  'use strict';

  const VOIES = 4;
  const APPROCHE = 1.35;                 // secondes de descente visible
  const AVANCE = 1.8;                    // horizon de planification, en secondes
  const FENETRES = [
    { max: 0.045, nom: 'PARFAIT', points: 100, sante: 2 },
    { max: 0.090, nom: 'BIEN',    points: 60,  sante: 1.5 },
    { max: 0.150, nom: 'PASSABLE', points: 25, sante: 0.5 },
  ];
  /* Le seuil de survie se lit directement dans ces nombres : avec -5 par note
     manquée et +2 par parfaite, il faut en toucher un peu plus de sept sur dix
     pour se maintenir. Le premier réglage (-9) exigeait plus de huit sur dix,
     ce qui ne laissait pas le temps d'apprendre les voies. */
  const RATE = -5;                       // justesse perdue sur une note manquée
  const VIDE = -3;                       // justesse perdue sur une frappe dans le vide
  const GAME = 'cadence';
  const { reduced } = Arcade;

  const TEINTES = ['#17b3a0', '#3f9fd8', '#c78de0', '#e0b24a'];

  const el = {
    cabinet: document.querySelector('.cabinet'),
    root: document.documentElement,
    screen: document.getElementById('screen'),
    canvas: document.getElementById('piste'),
    score: document.getElementById('score'),
    best: document.getElementById('best'),
    combo: document.getElementById('combo'),
    meter: document.getElementById('meter'),
    justesse: document.getElementById('justesse'),
    jauge: document.getElementById('jauge'),
    pret: document.getElementById('pret'),
    over: document.getElementById('over'),
    overScore: document.getElementById('overScore'),
    overNote: document.getElementById('overNote'),
  };

  const ctx = el.canvas.getContext('2d');
  let W = 320, H = 430, ligneY = 0;

  let notes = [];
  let verdicts = [];        // { texte, voie, t, teinte }
  let lueurs = new Array(VOIES).fill(0);
  let prochain = 0;         // instant du prochain demi-temps à garnir
  let pasNo = 0;
  let score = 0, record = 0, combo = 0, meilleurCombo = 0;
  let sante = 70, jugees = 0, parfaites = 0;
  let etat = 'pret';        // 'pret' | 'joue' | 'fini'

  /* L'horloge du son. Si le contexte audio manque (navigateur qui le refuse),
     on retombe sur l'horloge murale : le jeu reste jouable, simplement moins
     précis — et c'est le seul endroit où performance.now() a le droit d'entrer. */
  const maintenant = () =>
    (Arcade.audio.ctx ? Arcade.audio.ctx.currentTime : performance.now() / 1000);

  const bpm = () => Math.min(152, 92 + jugees * 0.22);
  const demiTemps = () => 30 / bpm();

  /* ---------- toile ---------- */

  function resize() {
    const inner = el.cabinet.clientWidth - 32;
    const w = Math.max(220, Math.min(inner - 36, 340));
    const h = Math.round(w * 1.34);
    W = w; H = h; ligneY = Math.round(h * 0.82);
    el.root.style.setProperty('--screen-w', w + 'px');
    el.root.style.setProperty('--screen-h', h + 'px');
    el.root.style.setProperty('--panel-w', w + 36 + 'px');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.canvas.width = Math.round(w * dpr);
    el.canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const largeurVoie = () => W / VOIES;

  /* ---------- planification ---------- */

  /* On garnit AVANCE secondes de musique d'un coup : la batterie est posée à
     des instants absolus du contexte audio, et les notes portent ces mêmes
     instants. Rien n'est daté au moment où l'image est dessinée. */
  function alimenter() {
    const t = maintenant();
    while (prochain < t + AVANCE) {
      const surTemps = pasNo % 2 === 0;
      if (surTemps) sonner(prochain, 96, 54, 'sine', 0.13, 0.16);
      else sonner(prochain, 1250, 900, 'square', 0.03, 0.03);

      const densite = surTemps ? Math.min(0.72, 0.36 + jugees * 0.004)
                               : Math.min(0.42, 0.06 + jugees * 0.004);
      if (Math.random() < densite) {
        const libres = [];
        for (let v = 0; v < VOIES; v++) {
          if (!notes.some((n) => n.voie === v && Math.abs(n.t - prochain) < demiTemps() * 0.9)) libres.push(v);
        }
        if (libres.length) {
          notes.push({ voie: libres[Math.floor(Math.random() * libres.length)], t: prochain, jugee: false });
          // Une deuxième note simultanée, seulement une fois le jeu bien lancé.
          if (jugees > 40 && libres.length > 1 && Math.random() < 0.18) {
            const reste = libres.filter((v) => v !== notes[notes.length - 1].voie);
            notes.push({ voie: reste[Math.floor(Math.random() * reste.length)], t: prochain, jugee: false });
          }
        }
      }
      prochain += demiTemps();
      pasNo++;
    }
  }

  function sonner(tAbsolu, freq, to, type, vol, dur) {
    const c = Arcade.audio.ctx;
    if (!c) return;
    Arcade.tone({ freq, to, dur, type, vol, delay: Math.max(0, tAbsolu - c.currentTime) });
  }

  /* ---------- jugement ---------- */

  function frapper(voie) {
    if (etat !== 'joue') return;
    lueurs[voie] = 1;
    const t = maintenant();

    let cible = null, ecart = Infinity;
    for (const n of notes) {
      if (n.jugee || n.voie !== voie) continue;
      const d = Math.abs(n.t - t);
      if (d < ecart) { ecart = d; cible = n; }
    }

    const f = cible ? FENETRES.find((w) => ecart <= w.max) : null;
    if (!f) {
      sante = Math.max(0, sante + VIDE);
      combo = 0;
      annoncer('DANS LE VIDE', voie, '#d9534a');
      majBord();
      if (sante <= 0) finir();
      return;
    }

    cible.jugee = true;
    jugees++;
    if (f.nom === 'PARFAIT') parfaites++;
    combo++;
    meilleurCombo = Math.max(meilleurCombo, combo);
    score += Math.round(f.points * (1 + Math.min(combo, 50) / 25));
    sante = Math.min(100, sante + f.sante);

    // La mélodie appartient au joueur : chaque voie a sa note.
    Arcade.tone({ freq: 262 * Math.pow(2, [0, 4, 7, 12][voie] / 12), dur: 0.16, type: 'triangle', vol: 0.15 });
    annoncer(f.nom, voie, TEINTES[voie]);
    majBord();
  }

  function annoncer(texte, voie, teinte) {
    verdicts.push({ texte, voie, t: maintenant(), teinte });
    if (verdicts.length > 8) verdicts.shift();
  }

  function majBord() {
    el.score.textContent = score;
    el.combo.textContent = combo;
    el.justesse.textContent = Math.round(sante) + ' %';
    el.jauge.style.width = sante + '%';
    el.meter.classList.toggle('hot', sante <= 30);
    if (score > record) {
      record = score;
      el.best.textContent = record;
      Arcade.setRecord(GAME, record);
    }
  }

  /* ---------- boucle ---------- */

  function frame() {
    if (etat === 'joue') {
      alimenter();
      const t = maintenant();
      for (const n of notes) {
        if (!n.jugee && t > n.t + FENETRES[FENETRES.length - 1].max) {
          n.jugee = true;
          n.ratee = true;
          combo = 0;
          sante = Math.max(0, sante + RATE);
          annoncer('RATÉ', n.voie, '#d9534a');
          majBord();
        }
      }
      notes = notes.filter((n) => t < n.t + 0.9);
      verdicts = verdicts.filter((v) => t < v.t + 0.7);
      for (let v = 0; v < VOIES; v++) lueurs[v] = Math.max(0, lueurs[v] - 0.06);
      if (sante <= 0) finir();
    }
    dessiner();
    requestAnimationFrame(frame);
  }

  /* ---------- rendu ---------- */

  function dessiner() {
    const t = maintenant();
    const lv = largeurVoie();

    ctx.fillStyle = '#06100f';
    ctx.fillRect(0, 0, W, H);

    /* Les voies doivent se lire d'un coup d'œil : c'est ce qui permet
       d'associer une note à sa touche sans réfléchir. */
    for (let v = 0; v < VOIES; v++) {
      ctx.fillStyle = v % 2 ? 'rgba(255,255,255,.018)' : 'rgba(255,255,255,.05)';
      ctx.fillRect(v * lv, 0, lv, H);
      if (lueurs[v] > 0) {
        ctx.fillStyle = `rgba(23, 179, 160, ${lueurs[v] * 0.2})`;
        ctx.fillRect(v * lv, 0, lv, H);
      }
      if (v) {
        ctx.fillStyle = 'rgba(255,255,255,.07)';
        ctx.fillRect(v * lv - 0.5, 0, 1, H);
      }
      // la teinte de la voie, rappelée en haut : on sait où l'on tape
      ctx.fillStyle = TEINTES[v];
      ctx.globalAlpha = 0.5;
      ctx.fillRect(v * lv + 3, 0, lv - 6, 2);
      ctx.globalAlpha = 1;
    }

    // la ligne de frappe
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.fillRect(0, ligneY - 1, W, 2);
    ctx.fillStyle = 'var(--signal)';
    for (let v = 0; v < VOIES; v++) {
      ctx.fillStyle = TEINTES[v];
      ctx.globalAlpha = 0.35 + lueurs[v] * 0.6;
      ctx.fillRect(v * lv + 3, ligneY - 3, lv - 6, 6);
    }
    ctx.globalAlpha = 1;

    for (const n of notes) {
      if (n.jugee) continue;
      const avance = (n.t - t) / APPROCHE;                   // 1 en haut, 0 sur la ligne
      if (avance > 1.05) continue;
      const y = ligneY - avance * ligneY;
      ctx.save();
      ctx.fillStyle = TEINTES[n.voie];
      ctx.shadowColor = TEINTES[n.voie];
      ctx.shadowBlur = 10;
      const x = n.voie * lv + 5, w = lv - 10;
      ctx.beginPath();
      ctx.roundRect(x, y - 7, w, 14, 4);
      ctx.fill();
      ctx.restore();
    }

    for (const v of verdicts) {
      const age = (t - v.t) / 0.7;
      ctx.globalAlpha = Math.max(0, 1 - age);
      ctx.fillStyle = v.teinte;
      ctx.font = '700 12px Archivo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(v.texte, v.voie * lv + lv / 2, ligneY - 22 - age * 16);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- cycle de vie ---------- */

  function demarrer() {
    Arcade.boot();
    resize();
    notes = [];
    verdicts = [];
    pasNo = 0;
    score = 0; combo = 0; meilleurCombo = 0;
    sante = 70; jugees = 0; parfaites = 0;
    record = Arcade.record(GAME);
    el.best.textContent = record;
    el.over.hidden = true;
    el.pret.hidden = true;
    prochain = maintenant() + 1.2;       // une mesure de battement avant la première note
    etat = 'joue';
    majBord();
  }

  function finir() {
    if (etat === 'fini') return;
    etat = 'fini';
    Arcade.sfx.over();
    el.overScore.textContent = score;
    const taux = jugees ? Math.round((parfaites / jugees) * 100) : 0;
    el.overNote.innerHTML = `points · meilleur combo <b>${meilleurCombo}</b> · ${taux} % de parfaites`;
    el.over.hidden = false;
  }

  function recommencer() {
    etat = 'pret';
    notes = [];
    verdicts = [];
    score = 0; combo = 0; sante = 70; jugees = 0; parfaites = 0;
    record = Arcade.record(GAME);
    el.score.textContent = 0;
    el.combo.textContent = 0;
    el.best.textContent = record;
    el.over.hidden = true;
    el.pret.hidden = false;
    majBord();
    resize();
  }

  /* ---------- entrées ---------- */

  const TOUCHES = { d: 0, f: 1, j: 2, k: 3, arrowleft: 0, arrowdown: 1, arrowup: 2, arrowright: 3 };

  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (etat === 'pret' && (k === ' ' || k === 'enter')) { demarrer(); e.preventDefault(); return; }
    if (k in TOUCHES) { frapper(TOUCHES[k]); e.preventDefault(); return; }
    if (k === 'r') recommencer();
    else if (k === 'm') document.getElementById('mute').click();
  });

  el.screen.addEventListener('pointerdown', (e) => {
    if (etat === 'pret') { demarrer(); return; }
    if (etat !== 'joue') return;
    e.preventDefault();
    const r = el.canvas.getBoundingClientRect();
    frapper(Math.max(0, Math.min(VOIES - 1, Math.floor(((e.clientX - r.left) / r.width) * VOIES))));
  });

  el.pret.addEventListener('click', () => { if (etat === 'pret') demarrer(); });
  document.getElementById('restart').addEventListener('click', recommencer);
  document.getElementById('rejouer').addEventListener('click', recommencer);
  Arcade.bindMute(document.getElementById('mute'));
  addEventListener('resize', resize);

  recommencer();
  requestAnimationFrame(frame);
})();
