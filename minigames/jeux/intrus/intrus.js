/* Intrus — moteur de jeu.
   Une grille de pastilles identiques, sauf une. La trouver avant le sablier.

   La différence change de NATURE d'une manche à l'autre. Ce n'est pas un
   caprice : une différence seulement colorée exclurait du jeu ceux qui
   distinguent mal les teintes. Ici la teinte n'est qu'une possibilité sur cinq,
   et chaque nature a son propre plancher — l'écart se resserre avec les manches
   mais ne descend jamais sous ce qu'un écran rend et qu'un œil voit. */

(() => {
  'use strict';

  const VIES = 3;
  const GAME = 'intrus';
  const { reduced } = Arcade;

  /* depart : écart à la manche 1 · plancher : écart minimal, jamais franchi.
     Les natures géométriques sont exprimées en PIXELS RENDUS, pas en
     pourcentage de la pastille : la grille passe de 3x3 à 6x6, donc un écart
     en pourcentage fondrait avec la tuile et deviendrait invisible sans que le
     réglage l'annonce. Le pivot est lui aussi ramené au déplacement d'un coin
     en pixels, puis reconverti en degrés selon la taille réelle. */
  const NATURES = [
    { cle: 'teinte',   nom: 'la teinte',   depart: 26, plancher: 9,   unite: 'deg' },
    { cle: 'clarte',   nom: 'la clarté',   depart: 15, plancher: 5,   unite: '%'   },
    { cle: 'rotation', nom: 'le pivot',    depart: 11, plancher: 4,   unite: 'px'  },
    { cle: 'taille',   nom: 'la taille',   depart: 12, plancher: 4.5, unite: 'px'  },
    { cle: 'decalage', nom: 'la position', depart: 10, plancher: 3.5, unite: 'px'  },
  ];

  const el = {
    grille: document.getElementById('grille'),
    nature: document.getElementById('nature'),
    score: document.getElementById('score'),
    best: document.getElementById('best'),
    vies: document.getElementById('vies'),
    meter: document.getElementById('meter'),
    meterLab: document.getElementById('meterLab'),
    chrono: document.getElementById('chrono'),
    jauge: document.getElementById('jauge'),
    pret: document.getElementById('pret'),
    over: document.getElementById('over'),
    overScore: document.getElementById('overScore'),
    overNote: document.getElementById('overNote'),
  };

  let manche = 1;
  let score = 0;
  let record = 0;
  let vies = VIES;
  let intrus = -1;
  let nature = NATURES[0];
  let fin = 0;                 // instant limite
  let horloge = 0;
  let etat = 'pret';           // 'pret' | 'cherche' | 'montre' | 'fini'

  /* ---------- courbes ---------- */

  const cotes = (n) => Math.min(6, 3 + Math.floor((n - 1) / 4));
  const duree = (n) => Math.max(3, 6 - (n - 1) * 0.18);
  /* L'écart fond d'environ 9 % par manche, mais s'arrête net au plancher. */
  const ecart = (nat, n) => Math.max(nat.plancher, nat.depart * Math.pow(0.91, n - 1));

  /* ---------- la grille ---------- */

  function poser() {
    const c = cotes(manche);
    nature = NATURES[Math.floor(Math.random() * NATURES.length)];
    const e = ecart(nature, manche);

    const teinte = Math.floor(Math.random() * 360);
    const clarte = 44 + Math.random() * 10;
    const sature = 34 + Math.random() * 14;
    const base = {
      teinte, clarte, sature,
      rond: 4 + Math.floor(Math.random() * 10),
      taille: 72,
      tourne: 0,
    };

    intrus = Math.floor(Math.random() * c * c);

    el.grille.style.gridTemplateColumns = `repeat(${c}, 1fr)`;
    el.grille.style.gridTemplateRows = `repeat(${c}, 1fr)`;
    el.grille.innerHTML = '';

    // Première passe : toutes les pastilles identiques.
    for (let i = 0; i < c * c; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'case';
      b.dataset.i = i;
      b.setAttribute('aria-label', `Pastille ${i + 1}`);
      const p = document.createElement('i');
      p.style.setProperty('--teinte', `hsl(${base.teinte}, ${base.sature}%, ${base.clarte}%)`);
      p.style.setProperty('--taille', base.taille + '%');
      p.style.setProperty('--rond', base.rond + 'px');
      b.appendChild(p);
      el.grille.appendChild(b);
    }

    // Deuxième passe : on mesure la pastille RENDUE, puis on applique l'écart
    // dans la bonne unité. C'est la seule façon d'avoir un plancher qui tienne
    // quelle que soit la taille de la grille.
    const modele = el.grille.children[0].firstChild;
    const cote = modele.offsetWidth || 40;
    const cible = el.grille.children[intrus].firstChild;

    if (nature.cle === 'teinte') {
      cible.style.setProperty('--teinte', `hsl(${(base.teinte + e) % 360}, ${base.sature}%, ${base.clarte}%)`);
    } else if (nature.cle === 'clarte') {
      cible.style.setProperty('--teinte', `hsl(${base.teinte}, ${base.sature}%, ${base.clarte + e}%)`);
    } else if (nature.cle === 'rotation') {
      // e est le déplacement voulu d'un coin, en pixels : on remonte à l'angle.
      const deg = Math.min(30, (e * Math.SQRT2 / Math.max(12, cote)) * 180 / Math.PI);
      cible.style.setProperty('--tourne', deg.toFixed(2) + 'deg');
    } else if (nature.cle === 'taille') {
      cible.style.setProperty('--taille', (cote + e).toFixed(1) + 'px');
    } else {
      const d = (e / Math.SQRT2).toFixed(2) + 'px';
      cible.style.setProperty('--dx', d);
      cible.style.setProperty('--dy', d);
    }

    el.nature.hidden = true;
    el.meterLab.textContent = `Manche ${manche}`;
    fin = performance.now() + duree(manche) * 1000;
    etat = 'cherche';
    clearInterval(horloge);
    horloge = setInterval(tictac, 60);
    tictac();
  }

  function tictac() {
    const reste = Math.max(0, (fin - performance.now()) / 1000);
    el.chrono.textContent = reste.toFixed(1).replace('.', ',') + ' s';
    el.jauge.style.width = (reste / duree(manche)) * 100 + '%';
    el.meter.classList.toggle('hot', reste <= 1.5);
    if (reste <= 0 && etat === 'cherche') rater(-1);
  }

  /* ---------- verdict ---------- */

  function choisir(i) {
    if (etat !== 'cherche') return;
    Arcade.boot();
    if (i === intrus) return trouver(i);
    rater(i);
  }

  function trouver(i) {
    etat = 'montre';
    clearInterval(horloge);
    const reste = Math.max(0, (fin - performance.now()) / 1000);
    const gain = 100 + Math.round(reste * 30);
    score += gain;
    el.score.textContent = score;
    Arcade.replay(el.score, 'flash');
    if (score > record) {
      record = score;
      el.best.textContent = record;
      Arcade.setRecord(GAME, record);
    }
    el.grille.children[i].classList.add('trouve');
    Arcade.sfx.chain(Math.min(2 + Math.floor(reste), 10));
    montrerNature();
    setTimeout(() => { manche++; poser(); }, reduced ? 50 : 620);
  }

  function rater(i) {
    etat = 'montre';
    clearInterval(horloge);
    vies--;
    majVies();
    if (i >= 0) el.grille.children[i].classList.add('rate');
    el.grille.children[intrus].classList.add('designe');
    Arcade.sfx.deny();
    Arcade.shake(document.querySelector('.stage'), 3);
    montrerNature();
    setTimeout(() => {
      if (vies <= 0) return finir();
      manche++;
      poser();
    }, reduced ? 50 : 1150);
  }

  function montrerNature() {
    el.nature.textContent = `c'était ${nature.nom}`;
    el.nature.hidden = false;
  }

  function finir() {
    etat = 'fini';
    Arcade.sfx.over();
    el.overScore.textContent = score;
    el.overNote.innerHTML = `points · ${manche - 1} manche${manche > 2 ? 's' : ''} passée${manche > 2 ? 's' : ''}`;
    el.over.hidden = false;
  }

  function majVies() {
    el.vies.innerHTML = '';
    for (let i = 0; i < VIES; i++) {
      const point = document.createElement('i');
      if (i >= vies) point.className = 'perdue';
      el.vies.appendChild(point);
    }
  }

  /* ---------- commandes ---------- */

  el.grille.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (b) choisir(+b.dataset.i);
  });

  // Le voile d'attente recouvre la grille et capte les clics : c'est lui qui lance.
  el.pret.addEventListener('click', () => {
    if (etat !== 'pret') return;
    Arcade.boot();
    el.pret.hidden = true;
    poser();
  });

  function recommencer() {
    clearInterval(horloge);
    manche = 1;
    score = 0;
    vies = VIES;
    record = Arcade.record(GAME);
    el.score.textContent = 0;
    el.best.textContent = record;
    el.over.hidden = true;
    el.pret.hidden = false;
    el.nature.hidden = true;
    majVies();
    poser();
    etat = 'pret';
    clearInterval(horloge);
    el.chrono.textContent = '6,0 s';
    el.jauge.style.width = '100%';
  }

  document.getElementById('restart').addEventListener('click', recommencer);
  document.getElementById('rejouer').addEventListener('click', recommencer);
  Arcade.bindMute(document.getElementById('mute'));
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (etat === 'pret' && (k === ' ' || k === 'enter')) { el.pret.click(); e.preventDefault(); }
    else if (k === 'r') recommencer();
    else if (k === 'm') document.getElementById('mute').click();
  });

  recommencer();
})();
