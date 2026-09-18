/* Anagrammes — moteur de jeu.
   Sept lettres tirées d'un mot, quatre-vingt-dix secondes, le plus de mots
   français possible. Chaque lettre du tirage ne sert qu'une fois par mot.

   Les solutions sont précalculées grille par grille : le jeu n'embarque aucun
   dictionnaire complet, et valider un mot revient à interroger un ensemble. */

(() => {
  'use strict';

  const DUREE = 90;                                   // secondes
  const POINTS = { 3: 1, 4: 2, 5: 4, 6: 7, 7: 12 };
  const GAME = 'anagrammes';
  const { reduced } = Arcade;

  const el = {
    saisie: document.getElementById('saisie'),
    rack: document.getElementById('rack'),
    trouves: document.getElementById('trouves'),
    score: document.getElementById('score'),
    best: document.getElementById('best'),
    compte: document.getElementById('compte'),
    meter: document.getElementById('meter'),
    reste: document.getElementById('reste'),
    jauge: document.getElementById('jauge'),
    pret: document.getElementById('pret'),
    over: document.getElementById('over'),
    overScore: document.getElementById('overScore'),
    overNote: document.getElementById('overNote'),
    rates: document.getElementById('rates'),
  };

  let base = '';
  let mots = new Set();      // tous les mots trouvables de la grille
  let trouves = new Set();
  let rack = [];             // [{ lettre, el, prise }]
  let saisie = [];           // indices dans rack
  let score = 0;
  let record = 0;
  let etat = 'pret';         // 'pret' | 'court' | 'fini'
  let fin = 0;
  let horloge = 0;

  const melange = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  /* ---------- la grille ---------- */

  function tirer() {
    const ligne = window.Anagrammes[Math.floor(Math.random() * window.Anagrammes.length)];
    const liste = ligne.split(' ');
    base = liste[0];
    mots = new Set(liste);

    rack = melange([...base]).map((lettre) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'jeton';
      node.textContent = lettre;
      return { lettre, el: node, prise: false };
    });
    el.rack.innerHTML = '';
    for (const jeton of rack) el.rack.appendChild(jeton.el);
  }

  /* Réordonne les jetons encore libres, sans toucher au mot en cours. */
  function remuer() {
    if (etat !== 'court') return;
    Arcade.boot();
    const libres = rack.filter((j) => !j.prise);
    melange(libres);
    const ordre = [];
    let k = 0;
    for (const jeton of rack) ordre.push(jeton.prise ? jeton : libres[k++]);
    el.rack.innerHTML = '';
    ordre.forEach((jeton, i) => {
      el.rack.appendChild(jeton.el);
      if (!reduced && !jeton.prise) {
        jeton.el.style.animationDelay = i * 28 + 'ms';
        Arcade.replay(jeton.el, 'tourne');
      }
    });
    Arcade.sfx.tick();
  }

  /* ---------- la saisie ---------- */

  function rendreSaisie() {
    el.saisie.innerHTML = '';
    if (!saisie.length) {
      const vide = document.createElement('span');
      vide.className = 'vide';
      vide.textContent = 'Composez un mot';
      el.saisie.appendChild(vide);
      return;
    }
    for (const i of saisie) {
      const b = document.createElement('b');
      b.textContent = rack[i].lettre;
      el.saisie.appendChild(b);
    }
  }

  function marquerRack() {
    for (const jeton of rack) jeton.el.classList.toggle('prise', jeton.prise);
  }

  function taper(lettre) {
    if (etat !== 'court' || saisie.length >= 7) return;
    const i = rack.findIndex((j) => !j.prise && j.lettre === lettre);
    if (i < 0) { Arcade.sfx.deny(); return; }
    rack[i].prise = true;
    saisie.push(i);
    rendreSaisie();
    marquerRack();
    Arcade.tone({ freq: Arcade.step(Math.min(saisie.length, 10)) / 2, dur: 0.04, type: 'sine', vol: 0.05 });
  }

  function effacer() {
    if (etat !== 'court' || !saisie.length) return;
    rack[saisie.pop()].prise = false;
    rendreSaisie();
    marquerRack();
  }

  function vider() {
    for (const i of saisie) rack[i].prise = false;
    saisie = [];
    rendreSaisie();
    marquerRack();
  }

  /* Le vidage est immédiat, jamais différé : un vidage programmé pour plus tard
     avalerait les lettres tapées entre-temps, et on tape vite dans ce jeu. */
  function refuser(texte) {
    vider();
    message(texte);
    Arcade.replay(el.saisie, 'refus');
    Arcade.sfx.deny();
  }

  /* Le message s'affiche dans la ligne de saisie, jamais à la place du chrono :
     masquer le temps restant pendant une seconde est inacceptable ici. */
  function message(texte, alerte = true) {
    el.saisie.innerHTML = '';
    const node = document.createElement('span');
    node.className = 'vide' + (alerte ? ' alerte' : '');
    node.textContent = texte;
    el.saisie.appendChild(node);
    clearTimeout(message.t);
    message.t = setTimeout(rendreSaisie, 1000);
  }

  /* ---------- validation ---------- */

  function valider() {
    if (etat !== 'court') return;
    Arcade.boot();
    const mot = saisie.map((i) => rack[i].lettre).join('');
    if (mot.length < 3) return refuser('Trois lettres au minimum');
    if (trouves.has(mot)) return refuser('Déjà trouvé');
    if (!mots.has(mot)) return refuser('Mot inconnu');

    trouves.add(mot);
    const gain = POINTS[mot.length];
    score += gain;
    el.score.textContent = score;
    el.compte.textContent = trouves.size;
    Arcade.replay(el.score, 'flash');

    const chip = document.createElement('span');
    chip.className = 'mot' + (mot.length === 7 ? ' plein' : mot.length >= 5 ? ' long' : '');
    chip.innerHTML = `${mot}<span>+${gain}</span>`;
    el.trouves.prepend(chip);

    Arcade.sfx.chain(Math.min(mot.length - 2, 10));
    vider();
    if (mot.length === 7) message('Les sept lettres !', false);
    if (mot.length === 7) Arcade.shake(document.querySelector('.stage'), 3);
    if (score > record) {
      record = score;
      el.best.textContent = record;
      Arcade.setRecord(GAME, record);
    }
  }

  /* ---------- horloge ---------- */

  function tictac() {
    const reste = Math.max(0, (fin - Date.now()) / 1000);
    const s = Math.ceil(reste);
    el.reste.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    el.jauge.style.width = (reste / DUREE) * 100 + '%';
    el.meter.classList.toggle('hot', reste <= 15);
    if (reste <= 0) terminer();
  }

  /* ---------- déroulé ---------- */

  function preparer() {
    clearInterval(horloge);
    etat = 'pret';
    score = 0;
    trouves = new Set();
    saisie = [];
    record = Arcade.record(GAME);
    el.score.textContent = 0;
    el.compte.textContent = 0;
    el.best.textContent = record;
    el.trouves.innerHTML = '';
    el.over.hidden = true;
    el.pret.hidden = false;
    el.meter.classList.remove('hot');
    el.jauge.style.width = '100%';
    el.reste.textContent = '1:30';
    tirer();
    rendreSaisie();
  }

  function demarrer() {
    Arcade.boot();
    etat = 'court';
    el.pret.hidden = true;
    fin = Date.now() + DUREE * 1000;
    tictac();
    horloge = setInterval(tictac, 100);
  }

  function terminer() {
    if (etat === 'fini') return;
    etat = 'fini';
    clearInterval(horloge);
    vider();
    Arcade.sfx.over();

    const possibles = mots.size;
    const max = [...mots].reduce((s, m) => s + POINTS[m.length], 0);
    el.overScore.textContent = score;
    el.overNote.innerHTML =
      `points sur <b>${max}</b> · ${trouves.size} mot${trouves.size > 1 ? 's' : ''} sur ${possibles}`;

    // On ne révèle pas tout : le mot de sept lettres, puis les plus longs ratés.
    const rates = [...mots].filter((m) => !trouves.has(m) && m.length >= 5)
      .sort((a, b) => b.length - a.length || a.localeCompare(b)).slice(0, 9);
    el.rates.innerHTML = '';
    const vedette = document.createElement('i');
    vedette.className = 'base';
    vedette.textContent = base;
    el.rates.appendChild(vedette);
    for (const m of rates) {
      if (m === base) continue;
      const node = document.createElement('i');
      node.textContent = m;
      el.rates.appendChild(node);
    }
    el.over.hidden = false;
  }

  /* ---------- commandes ---------- */

  el.rack.addEventListener('click', (e) => {
    const node = e.target.closest('.jeton');
    if (!node) return;
    Arcade.boot();
    const i = rack.findIndex((j) => j.el === node);
    if (i >= 0 && !rack[i].prise) {
      rack[i].prise = true;
      saisie.push(i);
      rendreSaisie();
      marquerRack();
      Arcade.tone({ freq: Arcade.step(Math.min(saisie.length, 10)) / 2, dur: 0.04, type: 'sine', vol: 0.05 });
    }
  });

  const sansAccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (etat === 'pret') {
      if (e.key === 'Enter' || e.key === ' ') { demarrer(); e.preventDefault(); }
      return;
    }
    if (etat === 'fini') {
      if (e.key === 'Enter') { preparer(); demarrer(); e.preventDefault(); }
      return;
    }
    if (e.key === 'Enter') { valider(); e.preventDefault(); return; }
    if (e.key === 'Backspace') { effacer(); e.preventDefault(); return; }
    if (e.key === ' ') { remuer(); e.preventDefault(); return; }
    if (e.key === 'Escape') { vider(); e.preventDefault(); return; }
    const l = sansAccent(e.key);
    if (l.length === 1 && l >= 'A' && l <= 'Z') { taper(l); e.preventDefault(); }
  });

  document.getElementById('valider').addEventListener('click', valider);
  document.getElementById('effacer').addEventListener('click', () => { Arcade.boot(); effacer(); });
  document.getElementById('melanger').addEventListener('click', remuer);
  document.getElementById('demarrer').addEventListener('click', demarrer);
  document.getElementById('rejouer').addEventListener('click', () => { preparer(); demarrer(); });
  Arcade.bindMute(document.getElementById('mute'));

  preparer();
})();
