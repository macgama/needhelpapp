/* Écho — moteur de jeu.
   La machine joue une suite de touches ; il faut la rejouer À L'ENVERS.
   C'est toute la différence avec un Simon : on ne peut pas répondre au fur et
   à mesure, il faut avoir retenu la suite entière avant de commencer.

   Chaque réussite ajoute une touche à la fin de la suite — donc au début de la
   réponse. */

(() => {
  'use strict';

  const N = 9;                                   // grille 3 x 3
  const DEPART = 2;                              // longueur de la première suite
  const VIES = 3;
  const GAME = 'echo';
  const { reduced } = Arcade;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 60) : ms));

  // Pentatonique majeure sur deux octaves : n'importe quelle suite sonne juste.
  const DEGRES = [0, 2, 4, 7, 9, 12, 14, 16, 19];
  const hauteur = (i) => 262 * Math.pow(2, DEGRES[i] / 12);

  const el = {
    grille: document.getElementById('grille'),
    longueur: document.getElementById('longueur'),
    best: document.getElementById('best'),
    vies: document.getElementById('vies'),
    meter: document.getElementById('meter'),
    consigne: document.getElementById('consigne'),
    avancement: document.getElementById('avancement'),
    jauge: document.getElementById('jauge'),
    pret: document.getElementById('pret'),
    pretTitre: document.getElementById('pretTitre'),
    pretTexte: document.getElementById('pretTexte'),
    pretAide: document.getElementById('pretAide'),
    over: document.getElementById('over'),
    overScore: document.getElementById('overScore'),
    overNote: document.getElementById('overNote'),
  };

  let touches = [];
  let suite = [];          // ce que la machine a joué, dans l'ordre
  let attendu = [];        // ce que le joueur doit produire : la suite renversée
  let pos = 0;
  let vies = VIES;
  let atteint = 0;         // plus longue suite réussie dans CETTE partie
  let record = 0;          // meilleure suite jamais réussie, tous jeux confondus
  let etat = 'pret';       // 'pret' | 'montre' | 'attend' | 'fini'

  /* La cadence se resserre avec la longueur, sans jamais devenir illisible. */
  const cadence = () => Math.max(300, 640 - (suite.length - DEPART) * 34);

  /* ---------- la grille ---------- */

  function batir() {
    el.grille.innerHTML = '';
    touches = [];
    for (let rang = 2; rang >= 0; rang--) {        // du haut vers le bas à l'affichage
      for (let col = 0; col < 3; col++) {
        const i = rang * 3 + col;                  // 0 = grave, en bas à gauche
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'touche';
        b.dataset.i = i;
        b.setAttribute('aria-label', `Touche ${i + 1}`);
        // La hauteur se lit surtout à la clarté : grave et sombre en bas, aigu
        // et clair en haut. La teinte ne bouge que de 24 degrés, pour que les
        // neuf touches restent visiblement le même instrument.
        const teinte = 228 - i * 3;
        b.style.setProperty('--fond', `hsl(${teinte}, 46%, ${18 + i * 2.5}%)`);
        b.style.setProperty('--vif', `hsl(${teinte}, 88%, ${56 + i * 2.6}%)`);
        b.style.setProperty('--halo', `hsla(${teinte}, 92%, 64%, .75)`);
        el.grille.appendChild(b);
        touches[i] = b;
      }
    }
  }

  async function allumer(i, duree) {
    touches[i].classList.add('vive');
    Arcade.tone({ freq: hauteur(i), dur: Math.min(0.42, duree / 1000 * 0.9), type: 'triangle', vol: 0.15 });
    await wait(duree);
    touches[i].classList.remove('vive');
  }

  /* ---------- déroulé d'un tour ---------- */

  async function montrer() {
    etat = 'montre';
    el.grille.classList.add('parle');
    majConsigne('La machine joue…', 0);
    el.meter.classList.add('ecoute');
    el.meter.classList.remove('repond');
    await wait(520);
    const pas = cadence();
    for (const i of suite) {
      if (etat !== 'montre') return;               // partie relancée entre-temps
      await allumer(i, pas * 0.62);
      await wait(pas * 0.38);
    }
    el.grille.classList.remove('parle');
    attendu = [...suite].reverse();
    pos = 0;
    etat = 'attend';
    el.meter.classList.remove('ecoute');
    el.meter.classList.add('repond');
    majConsigne('À vous, en commençant par la fin', 0);
  }

  function majConsigne(texte, faits) {
    el.consigne.textContent = texte;
    el.avancement.textContent = `${faits} / ${suite.length}`;
    el.jauge.style.width = (faits / Math.max(1, suite.length)) * 100 + '%';
  }

  async function jouer(i) {
    if (etat !== 'attend') return;
    Arcade.boot();

    if (i !== attendu[pos]) return rater(i);

    await allumer(i, 190);
    pos++;
    majConsigne('À vous, en commençant par la fin', pos);
    if (pos < attendu.length) return;

    // Suite complète : l'écho repart à l'endroit, en récompense.
    etat = 'montre';
    atteint = suite.length;
    if (suite.length > record) {
      record = suite.length;
      el.best.textContent = record;
      Arcade.setRecord(GAME, record);
      Arcade.replay(el.best, 'flash');
    }
    majConsigne('Écho complet', suite.length);
    await wait(240);
    for (const k of suite) await allumer(k, 110);
    await wait(320);

    suite.push(Math.floor(Math.random() * N));
    el.longueur.textContent = suite.length;
    montrer();
  }

  async function rater(i) {
    etat = 'montre';
    vies--;
    majVies();
    touches[i].classList.add('faute');
    Arcade.tone({ freq: 120, to: 60, dur: 0.4, type: 'sawtooth', vol: 0.16 });
    Arcade.shake(document.querySelector('.stage'), 4);
    await wait(520);
    touches[i].classList.remove('faute');

    if (vies <= 0) return finir();
    majConsigne('Raté — on rejoue la même', 0);
    await wait(700);
    montrer();
  }

  function finir() {
    etat = 'fini';
    Arcade.sfx.over();
    // Ce que cette partie a atteint, pas le record de toujours.
    el.overScore.textContent = atteint;
    el.overNote.innerHTML = atteint > 1
      ? `signaux rejoués à l'envers · bloqué à <b>${suite.length}</b>`
      : atteint === 1
        ? `signal rejoué à l'envers · bloqué à <b>${suite.length}</b>`
        : `aucune suite complétée · bloqué à <b>${suite.length}</b>`;
    el.meter.classList.remove('ecoute', 'repond');
    majConsigne('Partie terminée', 0);
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
    if (b) jouer(+b.dataset.i);
  });

  // Le voile d'attente recouvre la grille et capte les clics : c'est donc lui
  // qui lance la partie, sinon toucher une touche ne ferait rien.
  el.pret.addEventListener('click', () => { if (etat === 'pret') demarrer(); });

  addEventListener('keydown', (e) => {
    // Le pavé numérique reprend la disposition de la grille.
    const map = { '7': 6, '8': 7, '9': 8, '4': 3, '5': 4, '6': 5, '1': 0, '2': 1, '3': 2 };
    if (e.key in map) { if (etat === 'pret') demarrer(); else jouer(map[e.key]); e.preventDefault(); return; }
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'enter') { if (etat === 'pret') demarrer(); e.preventDefault(); }
    else if (k === 'r') { recommencer(); }
    else if (k === 'm') { document.getElementById('mute').click(); }
  });

  function demarrer() {
    Arcade.boot();
    el.pret.hidden = true;
    montrer();
  }

  function recommencer() {
    etat = 'pret';
    vies = VIES;
    atteint = 0;
    record = Arcade.record(GAME);
    suite = Array.from({ length: DEPART }, () => Math.floor(Math.random() * N));
    attendu = [];
    pos = 0;
    el.longueur.textContent = suite.length;
    el.best.textContent = record;
    el.over.hidden = true;
    el.pret.hidden = false;
    el.meter.classList.remove('ecoute', 'repond');
    el.grille.classList.remove('parle');
    for (const b of touches) b.classList.remove('vive', 'faute');
    majVies();
    majConsigne('Regardez bien', 0);
  }

  document.getElementById('restart').addEventListener('click', recommencer);
  document.getElementById('rejouer').addEventListener('click', recommencer);
  Arcade.bindMute(document.getElementById('mute'));

  batir();
  recommencer();
})();
