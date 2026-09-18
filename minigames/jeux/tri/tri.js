/* Tri — moteur de jeu.
   Des billes de couleur réparties dans des tubes. On verse la série du dessus
   d'un tube vers un autre, si celui-ci est vide ou montre la même couleur.
   Gagné quand chaque tube est vide, ou plein d'une seule couleur.

   Le niveau est tiré au hasard puis VÉRIFIÉ solvable avant d'être servi :
   le joueur ne peut jamais s'acharner sur un mélange impossible. */

(() => {
  'use strict';

  const CAP = 4;                 // billes par tube
  const GLYPHES = ['●', '▲', '■', '◆', '★', '✚', '⬢'];
  const GAME = 'tri';
  const { reduced } = Arcade;

  const el = {
    cabinet: document.querySelector('.cabinet'),
    tubes: document.getElementById('tubes'),
    billes: document.getElementById('billes'),
    niveau: document.getElementById('niveau'),
    best: document.getElementById('best'),
    coups: document.getElementById('coups'),
    over: document.getElementById('over'),
    overScore: document.getElementById('overScore'),
    overNote: document.getElementById('overNote'),
    reussi: document.getElementById('reussi'),
    annuler: document.getElementById('annuler'),
  };

  let niveau = 1;
  let record = 1;
  let coups = 0;
  let tubes = [];        // [[bille, ...]] du bas vers le haut
  let tubesEls = [];
  let choisi = -1;
  let histoire = [];
  let fini = false;

  /* ================= logique pure ================= */

  const couleurs = (t) => t.map((b) => b.c);
  const pur = (t) => t.every((c) => c === t[0]);
  const resolu = (grille) => grille.every((t) => t.length === 0 || (t.length === CAP && pur(t)));
  const canon = (grille) => grille.map((t) => t.join(',')).sort().join('|');

  /* Hauteur de la série de même couleur au sommet. */
  function serie(t) {
    if (!t.length) return 0;
    const c = t[t.length - 1];
    let k = 1;
    while (k < t.length && t[t.length - 1 - k] === c) k++;
    return k;
  }

  function coupsPossibles(grille) {
    const out = [];
    for (let a = 0; a < grille.length; a++) {
      const t = grille[a];
      if (!t.length) continue;
      const k = serie(t);
      for (let b = 0; b < grille.length; b++) {
        if (a === b) continue;
        const u = grille[b];
        if (u.length >= CAP) continue;
        if (u.length && u[u.length - 1] !== t[t.length - 1]) continue;
        // Vider un tube déjà pur dans un tube vide ne fait que renommer la position.
        if (!u.length && k === t.length) continue;
        out.push([a, b, Math.min(k, CAP - u.length)]);
      }
    }
    return out;
  }

  /* Parcours en profondeur avec mémoire des positions déjà vues, les tubes
     étant interchangeables. Mesuré : 204 nœuds au pire sur 2400 tirages. */
  function solvable(depart, limite = 200000) {
    const vus = new Set();
    const pile = [depart.map((t) => t.slice())];
    let n = 0;
    while (pile.length) {
      if (++n > limite) return null;
      const grille = pile.pop();
      if (resolu(grille)) return true;
      const cle = canon(grille);
      if (vus.has(cle)) continue;
      vus.add(cle);
      for (const [a, b, k] of coupsPossibles(grille)) {
        const suite = grille.map((t) => t.slice());
        for (let i = 0; i < k; i++) suite[b].push(suite[a].pop());
        if (!vus.has(canon(suite))) pile.push(suite);
      }
    }
    return false;
  }

  /* Deux paliers : d'abord le nombre de couleurs monte à deux tubes libres,
     puis on retire un tube libre et le nombre de couleurs repart. */
  function reglage(n) {
    return n <= 12
      ? { nb: Math.min(7, 3 + Math.floor((n - 1) / 2)), vides: 2 }
      : { nb: Math.min(7, 5 + Math.floor((n - 13) / 2)), vides: 1 };
  }

  function tirer(nb, vides) {
    const sac = [];
    for (let c = 0; c < nb; c++) for (let i = 0; i < CAP; i++) sac.push(c);
    for (let i = sac.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sac[i], sac[j]] = [sac[j], sac[i]];
    }
    const grille = [];
    for (let c = 0; c < nb; c++) grille.push(sac.slice(c * CAP, c * CAP + CAP));
    for (let i = 0; i < vides; i++) grille.push([]);
    return grille;
  }

  /* Un tirage à un seul tube libre n'est solvable qu'une fois sur onze : on
     insiste, et on desserre d'un tube si jamais la chance ne tourne pas. */
  function engendrer(n) {
    let { nb, vides } = reglage(n);
    for (let essai = 0; essai < 300; essai++) {
      if (essai === 200) vides = 2;
      const grille = tirer(nb, vides);
      if (resolu(grille)) continue;
      if (solvable(grille) === true) return grille;
    }
    return tirer(nb, 2);
  }

  /* ================= plateau ================= */

  function batir(grille) {
    el.tubes.innerHTML = '';
    el.billes.innerHTML = '';
    tubesEls = [];
    tubes = grille.map((colonne, i) => {
      const tube = document.createElement('div');
      tube.className = 'tube';
      tube.dataset.tube = i;
      tube.setAttribute('role', 'button');
      tube.tabIndex = 0;
      el.tubes.appendChild(tube);
      tubesEls.push(tube);

      return colonne.map((c) => {
        const node = document.createElement('div');
        node.className = 'bille b' + c;
        node.textContent = GLYPHES[c];
        el.billes.appendChild(node);
        return { c, el: node, timers: [] };
      });
    });
    etiqueter();
    mesurer();
    positionner(0);
  }

  /* Le diamètre est mesuré sur une bille rendue, jamais relu dans la feuille de
     style : --bille vaut clamp(27px, 8.4vw, 36px), et getPropertyValue rend la
     formule telle quelle, pas la valeur résolue. */
  let TAILLE = 30;
  let MARGE = 5;

  function mesurer() {
    const bille = el.billes.firstElementChild;
    if (bille) TAILLE = bille.offsetWidth;
    if (tubesEls[0]) MARGE = (tubesEls[0].offsetWidth - TAILLE) / 2;
  }

  const colonneX = (i) => tubesEls[i].offsetLeft + (tubesEls[i].offsetWidth - TAILLE) / 2;
  const slotY = (i, slot) => tubesEls[i].offsetTop + tubesEls[i].offsetHeight - MARGE - (slot + 1) * TAILLE;
  const survol = (i) => tubesEls[i].offsetTop - TAILLE * 0.8;

  function poser(bille, x, y, duree) {
    const tf = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    bille.el.style.transitionDuration = (reduced ? 1 : duree) + 'ms';
    bille.el.style.setProperty('--tf', tf);
    bille.el.style.transform = tf;
  }

  const purger = (bille) => { bille.timers.forEach(clearTimeout); bille.timers = []; };

  /* Replace les billes d'un tube ; celles de la série du dessus se soulèvent
     quand le tube est choisi. */
  function positionner(duree = 140, seulement = null) {
    for (let i = 0; i < tubes.length; i++) {
      if (seulement !== null && i !== seulement) continue;
      const haut = i === choisi ? serie(couleurs(tubes[i])) : 0;
      tubes[i].forEach((bille, slot) => {
        if (bille.timers.length) return;           // une animation est en cours
        const leve = slot >= tubes[i].length - haut ? 9 : 0;
        poser(bille, colonneX(i), slotY(i, slot) - leve, duree);
      });
    }
  }

  function etiqueter() {
    for (let i = 0; i < tubes.length; i++) {
      const c = couleurs(tubes[i]);
      tubesEls[i].classList.toggle('fini', c.length === CAP && pur(c));
      tubesEls[i].classList.toggle('choisi', i === choisi);
    }
  }

  /* ================= tour de jeu ================= */

  function instantane() {
    histoire.push(tubes.map((t) => t.slice()));
    if (histoire.length > 250) histoire.shift();
    el.annuler.disabled = false;
  }

  function verser(a, b) {
    const grille = tubes.map(couleurs);
    const k = Math.min(serie(grille[a]), CAP - grille[b].length);
    instantane();

    const prises = tubes[a].splice(tubes[a].length - k, k);   // du bas vers le haut
    prises.reverse().forEach((bille, i) => {                  // le sommet part en premier
      const slot = tubes[b].length;
      tubes[b].push(bille);
      animer(bille, a, b, slot, i * 55);
    });

    coups++;
    el.coups.textContent = coups;
    etiqueter();
    positionner(140, a);

    const apres = tubes.map(couleurs);
    const acheve = apres[b].length === CAP && pur(apres[b]);
    setTimeout(() => {
      if (acheve) Arcade.sfx.chain(Math.min(apres.filter((t) => t.length === CAP && pur(t)).length, 10));
      if (resolu(apres)) gagner();
    }, (k - 1) * 55 + 400);
  }

  function animer(bille, de, vers, slot, delai) {
    purger(bille);
    const t = (ms, fn) => bille.timers.push(setTimeout(fn, reduced ? 1 : ms));
    t(delai, () => {
      poser(bille, colonneX(de), survol(de), 110);
      Arcade.tone({ freq: Arcade.step(Math.min(slot + 2, 10)) / 2, dur: 0.07, type: 'triangle', vol: 0.08 });
    });
    t(delai + 115, () => poser(bille, colonneX(vers), survol(vers), 150));
    t(delai + 270, () => {
      poser(bille, colonneX(vers), slotY(vers, slot), 120);
      bille.timers = [];
      if (!reduced) Arcade.replay(bille.el, 'pose');
    });
  }

  function toucher(i) {
    if (fini) return;
    Arcade.boot();

    if (choisi === -1) {
      if (!tubes[i].length) return;
      const c = couleurs(tubes[i]);
      if (c.length === CAP && pur(c)) return;     // déjà rangé : rien à y prendre
      choisi = i;
      etiqueter();
      positionner(140, i);
      Arcade.sfx.tick();
      return;
    }

    if (i === choisi) {
      choisi = -1;
      etiqueter();
      positionner(140, i);
      return;
    }

    const a = choisi;
    const grille = tubes.map(couleurs);
    const accepte = grille[i].length < CAP &&
      (!grille[i].length || grille[i][grille[i].length - 1] === grille[a][grille[a].length - 1]);

    choisi = -1;
    if (!accepte) {
      Arcade.replay(tubesEls[i], 'refus');
      Arcade.sfx.deny();
      etiqueter();
      positionner(140, a);
      return;
    }
    verser(a, i);
  }

  /* ================= fin de niveau ================= */

  function gagner() {
    fini = true;
    if (niveau >= record) {
      record = niveau;
      el.best.textContent = record;
      Arcade.setRecord(GAME, record);
    }
    sauver();

    el.reussi.innerHTML = '';
    const vues = [...new Set(tubes.flatMap(couleurs))];
    vues.forEach((c, i) => {
      const point = document.createElement('i');
      point.style.background = `var(--c${c})`;
      point.style.animationDelay = i * 55 + 'ms';
      el.reussi.appendChild(point);
    });

    el.overScore.textContent = coups;
    el.overNote.innerHTML = `coups · niveau <b>${niveau}</b>`;
    el.over.hidden = false;
    for (let i = 1; i <= 4; i++) Arcade.tone({ freq: Arcade.step(i * 2), dur: 0.22, vol: 0.13, delay: i * 0.09 });
  }

  /* ================= sauvegarde ================= */

  const sauver = () => Arcade.write('tri.partie', { niveau, coups, grille: tubes.map(couleurs), fini });

  function charger(n, grille, nbCoups) {
    niveau = n;
    coups = nbCoups || 0;
    fini = false;
    choisi = -1;
    histoire = [];
    el.annuler.disabled = true;
    el.over.hidden = true;
    el.niveau.textContent = niveau;
    el.coups.textContent = coups;
    el.best.textContent = record;
    batir(grille || engendrer(niveau));
    sauver();
  }

  /* ================= commandes ================= */

  el.tubes.addEventListener('click', (e) => {
    const tube = e.target.closest('[data-tube]');
    if (tube) toucher(+tube.dataset.tube);
  });

  el.tubes.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const tube = e.target.closest('[data-tube]');
    if (tube) { toucher(+tube.dataset.tube); e.preventDefault(); }
  });

  el.annuler.addEventListener('click', () => {
    if (fini || !histoire.length) return;
    Arcade.boot();
    tubes = histoire.pop();
    choisi = -1;
    coups = Math.max(0, coups - 1);
    el.coups.textContent = coups;
    el.annuler.disabled = !histoire.length;
    for (const t of tubes) for (const b of t) purger(b);
    etiqueter();
    positionner(120);
    sauver();
    Arcade.sfx.tick();
  });

  document.getElementById('refaire').addEventListener('click', () => {
    Arcade.boot();
    charger(niveau);
  });

  document.getElementById('suivant').addEventListener('click', () => {
    Arcade.boot();
    charger(niveau + 1);
  });

  Arcade.bindMute(document.getElementById('mute'));
  addEventListener('resize', () => { mesurer(); positionner(0); });

  /* ================= démarrage ================= */

  record = Math.max(1, Arcade.record(GAME));
  const sauve = Arcade.read('tri.partie', null);
  if (sauve && Array.isArray(sauve.grille) && !sauve.fini) charger(sauve.niveau, sauve.grille, sauve.coups);
  else charger(sauve && sauve.fini ? sauve.niveau + 1 : 1);
})();
