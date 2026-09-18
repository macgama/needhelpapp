/* Fonderie — moteur de jeu.
   Le client commande un alliage de quatre doses tirées d'un jeu de métaux.
   On coule un essai, le laboratoire rend un rapport : combien de doses sont
   du bon métal à la bonne place, combien sont du bon métal mal placé. On
   recommence jusqu'à trouver la recette, ou jusqu'à épuiser les essais. */

(() => {
  'use strict';

  const DOSES = 4;
  const ESSAIS = 8;
  const GAME = 'fonderie';
  const { reduced } = Arcade;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 50) : ms));

  const METAUX = [
    { nom: 'Fer',    teinte: '#7f909e', encre: 'rgba(0,0,0,.6)',  glyphe: '▲' },
    { nom: 'Cuivre', teinte: '#c8763c', encre: 'rgba(0,0,0,.55)', glyphe: '●' },
    { nom: 'Étain',  teinte: '#e0dccc', encre: 'rgba(0,0,0,.55)', glyphe: '■' },
    { nom: 'Zinc',   teinte: '#6fae9e', encre: 'rgba(0,0,0,.55)', glyphe: '◆' },
    { nom: 'Nickel', teinte: '#c3c25e', encre: 'rgba(0,0,0,.55)', glyphe: '★' },
    { nom: 'Plomb',  teinte: '#5c6480', encre: 'rgba(255,255,255,.72)', glyphe: '✚' },
    { nom: 'Cobalt', teinte: '#5b7fd4', encre: 'rgba(255,255,255,.75)', glyphe: '⬢' },
  ];

  const el = {
    moules: document.getElementById('moules'),
    essais: document.getElementById('essais'),
    creuset: document.getElementById('creuset'),
    palette: document.getElementById('palette'),
    score: document.getElementById('score'),
    best: document.getElementById('best'),
    commandeNo: document.getElementById('commandeNo'),
    meter: document.getElementById('meter'),
    reste: document.getElementById('reste'),
    jauge: document.getElementById('jauge'),
    pret: document.getElementById('pret'),
    over: document.getElementById('over'),
    overKicker: document.getElementById('overKicker'),
    overScore: document.getElementById('overScore'),
    overNote: document.getElementById('overNote'),
    solution: document.getElementById('solution'),
  };

  let cible = [];
  let creuset = [];        // doses en préparation
  let coules = 0;          // essais déjà versés pour cette commande
  let commande = 1;
  let score = 0;
  let record = 0;
  let disponibles = 5;     // nombre de métaux offerts pour cette commande
  let etat = 'pret';       // 'pret' | 'joue' | 'analyse' | 'fini'

  /* Le vivier s'élargit aux deux premières commandes, puis reste à sept. */
  const metauxOfferts = (n) => Math.min(METAUX.length, 4 + n);
  const points = (essaisUtilises) => (ESSAIS + 1 - essaisUtilises) * 10;

  /* ---------- le rapport du laboratoire ---------- */

  /* Deux passes : les doses à leur place d'abord, les autres piochent dans ce
     qui reste. Sans ça, un essai à deux doses de cuivre contre une cible qui
     n'en a qu'une en compterait deux. */
  function analyser(essai) {
    let placees = 0, deplacees = 0;
    const resteCible = {}, resteEssai = {};
    for (let i = 0; i < DOSES; i++) {
      if (essai[i] === cible[i]) { placees++; continue; }
      resteCible[cible[i]] = (resteCible[cible[i]] || 0) + 1;
      resteEssai[essai[i]] = (resteEssai[essai[i]] || 0) + 1;
    }
    for (const m in resteEssai) deplacees += Math.min(resteEssai[m], resteCible[m] || 0);
    return { placees, deplacees };
  }

  /* ---------- fabrique d'éléments ---------- */

  function doseEl(metal, classes = '') {
    const node = document.createElement('div');
    node.className = 'dose ' + classes;
    if (metal === null || metal === undefined) {
      node.classList.add('creuse');
    } else {
      const m = METAUX[metal];
      node.style.setProperty('--metal', m.teinte);
      node.style.setProperty('--encre', m.encre);
      node.textContent = m.glyphe;
      node.title = m.nom;
    }
    return node;
  }

  function batirPalette() {
    el.palette.innerHTML = '';
    METAUX.forEach((m, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'metal';
      b.dataset.i = i;
      b.hidden = i >= disponibles;
      b.innerHTML = `<span class="pastille">${m.glyphe}</span><span class="nom">${m.nom}</span>`;
      b.querySelector('.pastille').style.setProperty('--metal', m.teinte);
      b.querySelector('.pastille').style.setProperty('--encre', m.encre);
      b.setAttribute('aria-label', m.nom);
      el.palette.appendChild(b);
    });
  }

  function montrerCommande(reveler) {
    el.moules.innerHTML = '';
    for (let i = 0; i < DOSES; i++) {
      if (reveler) {
        el.moules.appendChild(doseEl(cible[i]));
      } else {
        const m = document.createElement('div');
        m.className = 'moule';
        m.textContent = '?';
        el.moules.appendChild(m);
      }
    }
  }

  function montrerCreuset() {
    el.creuset.innerHTML = '';
    for (let i = 0; i < DOSES; i++) {
      const d = doseEl(creuset[i] ?? null, i === creuset.length - 1 ? 'neuve' : '');
      if (creuset[i] !== undefined) d.dataset.fente = i;
      el.creuset.appendChild(d);
    }
  }

  function majJauge() {
    el.reste.textContent = `${coules} / ${ESSAIS}`;
    el.jauge.style.width = (coules / ESSAIS) * 100 + '%';
    el.meter.classList.toggle('hot', ESSAIS - coules <= 2);
  }

  /* ---------- tour de jeu ---------- */

  function ajouter(metal) {
    if (etat !== 'joue' || creuset.length >= DOSES || metal >= disponibles) return;
    Arcade.boot();
    creuset.push(metal);
    montrerCreuset();
    Arcade.tone({ freq: Arcade.step(Math.min(metal + 1, 10)) / 2, dur: 0.05, type: 'sine', vol: 0.06 });
  }

  function retirer(fente) {
    if (etat !== 'joue') return;
    creuset.splice(fente === undefined ? creuset.length - 1 : fente, 1);
    montrerCreuset();
  }

  async function couler() {
    if (etat !== 'joue') return;
    Arcade.boot();
    if (creuset.length < DOSES) {
      Arcade.replay(el.creuset, 'refus');
      Arcade.sfx.deny();
      return;
    }

    etat = 'analyse';
    const essai = creuset.slice();
    const { placees, deplacees } = analyser(essai);
    coules++;
    creuset = [];
    montrerCreuset();
    majJauge();

    const ligne = document.createElement('div');
    ligne.className = 'essai';
    const rang = document.createElement('span');
    rang.className = 'rang';
    rang.textContent = coules;
    const doses = document.createElement('div');
    doses.className = 'doses';
    for (const m of essai) doses.appendChild(doseEl(m));
    const rapport = document.createElement('div');
    rapport.className = 'rapport';
    rapport.setAttribute('aria-label', `${placees} à leur place, ${deplacees} déplacées`);
    for (let i = 0; i < DOSES; i++) {
      const marque = document.createElement('i');
      if (i < placees) marque.className = 'placee';
      else if (i < placees + deplacees) marque.className = 'deplacee';
      rapport.appendChild(marque);
    }
    ligne.append(rang, doses, rapport);
    el.essais.appendChild(ligne);
    el.essais.scrollTop = el.essais.scrollHeight;

    Arcade.tone({ freq: 150, to: 90, dur: 0.18, type: 'sawtooth', vol: 0.09 });
    await wait(240);
    for (let i = 0; i < placees; i++) {
      Arcade.tone({ freq: Arcade.step(4 + i), dur: 0.14, type: 'triangle', vol: 0.13, delay: i * 0.1 });
    }

    if (placees === DOSES) return livrer();
    if (coules >= ESSAIS) return manquer();
    etat = 'joue';
  }

  async function livrer() {
    etat = 'analyse';
    const gagne = points(coules);
    score += gagne;
    el.score.textContent = score;
    Arcade.replay(el.score, 'flash');
    if (score > record) {
      record = score;
      el.best.textContent = record;
      Arcade.setRecord(GAME, record);
    }
    montrerCommande(true);
    Arcade.shake(document.querySelector('.stage'), 3);
    for (let i = 1; i <= 4; i++) Arcade.tone({ freq: Arcade.step(i * 2), dur: 0.2, vol: 0.13, delay: i * 0.09 });

    await wait(1300);
    commande++;
    nouvelleCommande();
  }

  function manquer() {
    etat = 'fini';
    Arcade.sfx.over();
    montrerCommande(true);
    el.solution.innerHTML = '';
    for (const m of cible) el.solution.appendChild(doseEl(m));
    el.overKicker.textContent = 'Commande manquée';
    el.overScore.textContent = score;
    el.overNote.innerHTML = `points · <b>${commande - 1}</b> commande${commande > 2 ? 's' : ''} livrée${commande > 2 ? 's' : ''}`;
    el.over.hidden = false;
  }

  /* ---------- cycle de vie ---------- */

  function nouvelleCommande() {
    disponibles = metauxOfferts(commande);
    cible = Array.from({ length: DOSES }, () => Math.floor(Math.random() * disponibles));
    creuset = [];
    coules = 0;
    el.commandeNo.textContent = commande;
    el.essais.innerHTML = '';
    batirPalette();
    montrerCommande(false);
    montrerCreuset();
    majJauge();
    etat = 'joue';
  }

  function recommencer() {
    commande = 1;
    score = 0;
    record = Arcade.record(GAME);
    el.score.textContent = 0;
    el.best.textContent = record;
    el.over.hidden = true;
    el.pret.hidden = false;
    nouvelleCommande();
    etat = 'pret';
  }

  /* ---------- commandes ---------- */

  // Le voile d'attente recouvre l'écran et capte les clics : c'est lui qui lance.
  el.pret.addEventListener('click', () => {
    if (etat !== 'pret') return;
    Arcade.boot();
    el.pret.hidden = true;
    etat = 'joue';
  });

  el.palette.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (b) ajouter(+b.dataset.i);
  });

  el.creuset.addEventListener('click', (e) => {
    const d = e.target.closest('[data-fente]');
    if (d) retirer(+d.dataset.fente);
  });

  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (etat === 'pret' && (e.key === 'Enter' || e.key === ' ')) { el.pret.click(); e.preventDefault(); return; }
    if (e.key >= '1' && e.key <= '7') { ajouter(+e.key - 1); e.preventDefault(); return; }
    if (e.key === 'Enter') { couler(); e.preventDefault(); return; }
    if (e.key === 'Backspace') { retirer(); e.preventDefault(); return; }
    const k = e.key.toLowerCase();
    if (k === 'r') recommencer();
    else if (k === 'm') document.getElementById('mute').click();
  });

  document.getElementById('couler').addEventListener('click', couler);
  document.getElementById('effacer').addEventListener('click', () => { Arcade.boot(); retirer(); });
  document.getElementById('restart').addEventListener('click', recommencer);
  document.getElementById('rejouer').addEventListener('click', recommencer);
  Arcade.bindMute(document.getElementById('mute'));

  recommencer();
})();
