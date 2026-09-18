/* Quitte — moteur de jeu.
   Cinq descentes. À chaque palier on tire une carte du puits : un filon
   grossit la sacoche, un grondement arme son danger. Le deuxième grondement
   d'un même danger fait s'effondrer la galerie — et met fin à la série.
   Remonter met la sacoche à l'abri et ouvre la descente suivante.

   Tout le risque est lisible : il ne dépend que de ce qui reste dans le puits,
   et le chiffre affiché est exact, pas une approximation.

   Le réglage vient d'une simulation faite avant l'interface. Trois résultats
   l'ont fixé : une règle aveugle (« remonter toujours au palier N ») force un
   choix net entre moyenne et record ; ne lire que le risque immédiat, sans
   compter les descentes qu'un effondrement ferait perdre, fait perdre 19 % ;
   lire les deux en gagne 15 %. C'est cette dernière lecture que le tableau de
   bord rend possible, en montrant le risque ET les descentes restantes. */

(() => {
  'use strict';

  const FILONS = [1, 2, 3, 4, 5, 5, 7, 7, 9, 11, 11, 13, 14, 15, 17];
  const DANGERS = [
    { nom: 'Eau',    signe: '≈' },
    { nom: 'Gaz',    signe: '◈' },
    { nom: 'Roche',  signe: '▲' },
    { nom: 'Froid',  signe: '✳' },
  ];
  const COPIES = 3;
  const DESCENTES = 5;
  const GAME = 'quitte';
  const { reduced } = Arcade;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 50) : ms));

  const el = {
    dangers: document.getElementById('dangers'),
    puits: document.getElementById('puits'),
    sacoche: document.getElementById('sacoche'),
    reste: document.getElementById('reste'),
    score: document.getElementById('score'),
    best: document.getElementById('best'),
    descente: document.getElementById('descente'),
    meter: document.getElementById('meter'),
    risque: document.getElementById('risque'),
    jauge: document.getElementById('jauge'),
    pret: document.getElementById('pret'),
    over: document.getElementById('over'),
    overKicker: document.getElementById('overKicker'),
    overScore: document.getElementById('overScore'),
    overNote: document.getElementById('overNote'),
  };

  let jeu = [];            // cartes encore dans le puits
  let vus = [];            // grondements déjà entendus, par danger
  let sacoche = 0;
  let palier = 0;
  let descente = 1;
  let score = 0;
  let record = 0;
  let etat = 'pret';       // 'pret' | 'descend' | 'anime' | 'fini'

  /* ---------- le puits ---------- */

  function neufPaquet() {
    const p = FILONS.map((v) => ({ filon: v }));
    for (let t = 0; t < DANGERS.length; t++) for (let c = 0; c < COPIES; c++) p.push({ danger: t });
    for (let i = p.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    return p;
  }

  /* Le chiffre affiché au joueur : exact, calculé sur ce qui reste. */
  const mortelles = () => jeu.filter((c) => c.danger !== undefined && vus[c.danger] >= 1).length;
  const risque = () => (jeu.length ? mortelles() / jeu.length : 0);

  /* ---------- affichage ---------- */

  function montrerDangers() {
    el.dangers.innerHTML = '';
    DANGERS.forEach((d, i) => {
      const node = document.createElement('div');
      node.className = 'danger' + (vus[i] >= 1 ? ' arme' : '');
      node.innerHTML = `<span class="signe">${d.signe}</span><span class="nom">${d.nom}</span>`;
      node.setAttribute('aria-label', `${d.nom} : ${vus[i] >= 1 ? 'armé, le prochain fait tout s\'effondrer' : 'silencieux'}`);
      el.dangers.appendChild(node);
    });
  }

  function majBord() {
    const r = risque();
    el.sacoche.textContent = sacoche;
    el.sacoche.classList.remove('perdue');
    const m = mortelles();
    el.reste.innerHTML = `${jeu.length} carte${jeu.length > 1 ? 's' : ''} · ` +
      `<span style="color:${m ? 'var(--signal)' : 'var(--dim)'}">${m} mortelle${m > 1 ? 's' : ''}</span>`;
    el.risque.textContent = Math.round(r * 100) + ' %';
    el.jauge.style.width = Math.min(100, r * 100 * 2.2) + '%';   // échelle lisible : 45 % remplit la jauge
    el.meter.classList.toggle('hot', r >= 0.2);
    el.descente.textContent = `${descente} / ${DESCENTES}`;
    el.score.textContent = score;
  }

  function ajouterCarte(texte, classe, valeur) {
    const node = document.createElement('div');
    node.className = 'carte ' + classe;
    node.innerHTML = `<span class="prof">${palier}</span><span class="quoi">${texte}</span>` +
      (valeur !== undefined ? `<span class="valeur">+${valeur}</span>` : '');
    el.puits.appendChild(node);
    el.puits.scrollTop = el.puits.scrollHeight;
    return node;
  }

  /* ---------- tour de jeu ---------- */

  async function descendre() {
    if (etat !== 'descend' || !jeu.length) return;
    Arcade.boot();
    etat = 'anime';
    palier++;

    const carte = jeu.pop();
    if (carte.filon !== undefined) {
      sacoche += carte.filon;
      ajouterCarte('Filon', 'carte--filon', carte.filon);
      Arcade.tone({ freq: Arcade.step(Math.min(1 + Math.floor(carte.filon / 3), 10)), dur: 0.14, type: 'triangle', vol: 0.13 });
      majBord();
      etat = 'descend';
      return;
    }

    const d = DANGERS[carte.danger];
    vus[carte.danger]++;
    if (vus[carte.danger] === 1) {
      ajouterCarte(`${d.signe} ${d.nom} — grondement`, 'carte--gronde');
      Arcade.tone({ freq: 150, to: 108, dur: 0.3, type: 'sawtooth', vol: 0.11 });
      montrerDangers();
      majBord();
      etat = 'descend';
      return;
    }

    ajouterCarte(`${d.signe} ${d.nom} — la galerie cède`, 'carte--fatal');
    el.sacoche.classList.add('perdue');
    Arcade.shake(document.querySelector('.stage'), 5);
    Arcade.tone({ freq: 96, to: 38, dur: 0.5, type: 'sawtooth', vol: 0.17 });
    await wait(700);
    finir(false);
  }

  async function remonter() {
    if (etat !== 'descend') return;
    Arcade.boot();
    if (palier === 0) { Arcade.sfx.deny(); return; }
    etat = 'anime';

    score += sacoche;
    Arcade.replay(el.score, 'flash');
    Arcade.sfx.chain(Math.min(2 + Math.floor(sacoche / 12), 10));
    if (score > record) {
      record = score;
      el.best.textContent = record;
      Arcade.setRecord(GAME, record);
    }
    await wait(520);

    if (descente >= DESCENTES) return finir(true);
    descente++;
    nouvelleDescente();
  }

  function nouvelleDescente() {
    jeu = neufPaquet();
    vus = DANGERS.map(() => 0);
    sacoche = 0;
    palier = 0;
    el.puits.innerHTML = '';
    montrerDangers();
    majBord();
    etat = 'descend';
  }

  function finir(complete) {
    etat = 'fini';
    if (!complete) Arcade.sfx.over();
    el.overKicker.textContent = complete ? 'Série menée à bout' : 'Effondrement';
    el.overScore.textContent = score;
    el.overNote.innerHTML = complete
      ? `encaissé sur <b>${DESCENTES}</b> descentes`
      : `encaissé · série arrêtée à la descente <b>${descente}</b>`;
    el.over.hidden = false;
  }

  function recommencer() {
    score = 0;
    descente = 1;
    record = Arcade.record(GAME);
    el.best.textContent = record;
    el.over.hidden = true;
    el.pret.hidden = false;
    nouvelleDescente();
    etat = 'pret';
  }

  /* ---------- commandes ---------- */

  // Le voile d'attente recouvre l'écran et capte les clics : c'est lui qui lance.
  el.pret.addEventListener('click', () => {
    if (etat !== 'pret') return;
    Arcade.boot();
    el.pret.hidden = true;
    etat = 'descend';
    descendre();
  });

  document.getElementById('descendre').addEventListener('click', descendre);
  document.getElementById('remonter').addEventListener('click', remonter);
  document.getElementById('restart').addEventListener('click', recommencer);
  document.getElementById('rejouer').addEventListener('click', recommencer);
  Arcade.bindMute(document.getElementById('mute'));

  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (etat === 'pret' && (k === ' ' || k === 'enter' || k === 'arrowdown')) { el.pret.click(); e.preventDefault(); return; }
    if (k === 'arrowdown' || k === ' ') { descendre(); e.preventDefault(); }
    else if (k === 'arrowup' || k === 'enter') { remonter(); e.preventDefault(); }
    else if (k === 'r') recommencer();
    else if (k === 'm') document.getElementById('mute').click();
  });

  recommencer();
})();
