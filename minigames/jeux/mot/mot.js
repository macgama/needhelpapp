/* Le Mot du Jour — moteur de jeu.
   Cinq lettres, six essais, un seul mot par jour, le même pour tout le monde.
   Le mot du jour se déduit de la date : aucun serveur, rien à synchroniser. */

(() => {
  'use strict';

  const LEN = 5;
  const ESSAIS = 6;
  const GAME = 'mot';
  const EPOCH = new Date(2026, 0, 1);      // jour n° 1 de la collection
  const { reduced } = Arcade;

  const decouper = (bloc) => {
    const out = [];
    for (let i = 0; i < bloc.length; i += LEN) out.push(bloc.slice(i, i + LEN));
    return out;
  };

  const SOLUTIONS = decouper(window.MotsDuJour.solutions);
  const DICO = new Set(decouper(window.MotsDuJour.dico));

  const el = {
    root: document.documentElement,
    tag: document.getElementById('tag'),
    board: document.getElementById('board'),
    clavier: document.getElementById('clavier'),
    toast: document.getElementById('toast'),
    panneau: document.getElementById('panneau'),
    verdict: document.getElementById('verdict'),
    repart: document.getElementById('repart'),
    compte: document.getElementById('compte'),
    partager: document.getElementById('partager'),
    copie: document.getElementById('copie'),
    contraste: document.getElementById('contraste'),
  };

  /* ---------- le mot du jour ---------- */

  function numeroDuJour() {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return Math.floor((t - EPOCH) / 86400000);
  }

  const jour = numeroDuJour();
  const MOT = SOLUTIONS[((jour % SOLUTIONS.length) + SOLUTIONS.length) % SOLUTIONS.length];

  /* ---------- état ---------- */

  let essais = [];        // mots déjà proposés
  let saisie = '';        // ligne en cours
  let fini = false;
  let gagne = false;
  let occupe = false;     // pendant l'animation de révélation
  let minuterie = 0;

  const AZERTY = ['AZERTYUIOP', 'QSDFGHJKLM', '↵WXCVBN⌫'];
  const touches = new Map();

  /* Sans accent et en majuscules : la seule forme que le jeu manipule. */
  const normaliser = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

  /* ---------- construction ---------- */

  function bati() {
    el.board.innerHTML = '';
    for (let r = 0; r < ESSAIS; r++) {
      const row = document.createElement('div');
      row.className = 'row';
      for (let c = 0; c < LEN; c++) row.appendChild(document.createElement('div')).className = 'case';
      el.board.appendChild(row);
    }

    el.clavier.innerHTML = '';
    for (const rang of AZERTY) {
      const krow = document.createElement('div');
      krow.className = 'krow';
      for (const touche of rang) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'touche' + (touche === '↵' || touche === '⌫' ? ' touche--large' : '');
        b.textContent = touche === '↵' ? 'Entrée' : touche;
        b.dataset.touche = touche;
        if (touche === '⌫') b.setAttribute('aria-label', 'Effacer');
        krow.appendChild(b);
        if (/[A-Z]/.test(touche)) touches.set(touche, b);
      }
      el.clavier.appendChild(krow);
    }
  }

  const ligne = (i) => el.board.children[i];
  const cases = (i) => ligne(i).children;

  /* ---------- règles ---------- */

  /* Deux passes, pour que les lettres en double soient comptées juste :
     les bien placées d'abord, le reste pioche dans ce qui reste. */
  function juger(mot) {
    const etats = Array(LEN).fill('absent');
    const reste = {};
    for (let i = 0; i < LEN; i++) {
      if (mot[i] === MOT[i]) etats[i] = 'place';
      else reste[MOT[i]] = (reste[MOT[i]] || 0) + 1;
    }
    for (let i = 0; i < LEN; i++) {
      if (etats[i] === 'place') continue;
      if (reste[mot[i]] > 0) {
        etats[i] = 'present';
        reste[mot[i]]--;
      }
    }
    return etats;
  }

  const RANG = { absent: 0, present: 1, place: 2 };

  function marquerClavier(mot, etats) {
    for (let i = 0; i < LEN; i++) {
      const b = touches.get(mot[i]);
      if (!b) continue;
      const actuel = b.dataset.etat || 'rien';
      if (actuel === 'rien' || RANG[etats[i]] > RANG[actuel]) {
        b.classList.remove('place', 'present', 'absent');
        b.classList.add(etats[i]);
        b.dataset.etat = etats[i];
      }
    }
  }

  /* ---------- affichage ---------- */

  function dessinerSaisie() {
    if (fini) return;
    const row = cases(essais.length);
    for (let i = 0; i < LEN; i++) {
      const lettre = saisie[i] || '';
      const c = row[i];
      if (c.textContent !== lettre) {
        c.textContent = lettre;
        c.classList.toggle('pleine', Boolean(lettre));
        if (lettre && !reduced) Arcade.replay(c, 'frappe');
      }
    }
  }

  function poser(index, mot, etats, anime) {
    const row = cases(index);
    for (let i = 0; i < LEN; i++) {
      const c = row[i];
      c.textContent = mot[i];
      c.classList.add('pleine');
      if (!anime) { c.classList.add(etats[i]); continue; }
      const delai = i * 170;
      setTimeout(() => {
        c.classList.add('retourne');
        setTimeout(() => c.classList.add(etats[i]), 200);
        // Une note par lettre : aigu si bien placée, médium si présente.
        const hauteur = etats[i] === 'place' ? 6 : etats[i] === 'present' ? 3 : 1;
        Arcade.tone({ freq: Arcade.step(hauteur) / 2, dur: 0.09, type: 'triangle', vol: 0.09 });
      }, delai);
    }
    return anime ? (LEN - 1) * 170 + 420 : 0;
  }

  function message(texte, duree = 1600) {
    el.toast.textContent = texte;
    el.toast.hidden = false;
    clearTimeout(message.t);
    message.t = setTimeout(() => { el.toast.hidden = true; }, duree);
  }

  /* ---------- statistiques ---------- */

  const statsVierges = () => ({ jouees: 0, gagnees: 0, serie: 0, meilleure: 0, dist: [0, 0, 0, 0, 0, 0], dernier: null });

  function lireStats() {
    const s = Arcade.read('mot.stats', null);
    if (!s || !Array.isArray(s.dist) || s.dist.length !== ESSAIS) return statsVierges();
    return s;
  }

  function enregistrer(victoire, coups) {
    const s = lireStats();
    s.jouees++;
    if (victoire) {
      s.gagnees++;
      s.dist[coups - 1]++;
      s.serie = s.dernier === jour - 1 ? s.serie + 1 : 1;
      s.meilleure = Math.max(s.meilleure, s.serie);
    } else {
      s.serie = 0;
    }
    s.dernier = jour;
    Arcade.write('mot.stats', s);
    Arcade.setRecord(GAME, s.meilleure);
    return s;
  }

  function afficherStats(s) {
    document.getElementById('sJouees').textContent = s.jouees;
    document.getElementById('sGagnees').textContent = s.jouees ? Math.round((s.gagnees / s.jouees) * 100) : 0;
    document.getElementById('sSerie').textContent = s.serie;
    document.getElementById('sMeilleure').textContent = s.meilleure;

    const max = Math.max(1, ...s.dist);
    const ici = fini && gagne ? essais.length : -1;
    el.repart.innerHTML = '';
    s.dist.forEach((n, i) => {
      const b = document.createElement('div');
      b.className = 'barre' + (i + 1 === ici ? ' ici' : '');
      b.innerHTML = `<span>${i + 1}</span><i style="width:${Math.max(8, (n / max) * 100)}%">${n}</i>`;
      el.repart.appendChild(b);
    });
  }

  /* ---------- partage ---------- */

  const CARRES = { place: '🟩', present: '🟨', absent: '⬛' };

  function grilleTexte() {
    const lignes = essais.map((mot) => juger(mot).map((e) => CARRES[e]).join(''));
    const note = gagne ? `${essais.length}/${ESSAIS}` : `X/${ESSAIS}`;
    return `Le Mot du Jour n° ${jour + 1} · ${note}\n\n${lignes.join('\n')}`;
  }

  async function partager() {
    const texte = grilleTexte();
    try {
      await navigator.clipboard.writeText(texte);
      message('Grille copiée');
      return;
    } catch (e) { /* presse-papiers refusé : on montre le texte à copier */ }
    el.copie.hidden = false;
    el.copie.value = texte;
    el.copie.focus();
    el.copie.select();
    message('Copiez le texte ci-dessous', 2400);
  }

  /* ---------- compte à rebours ---------- */

  function tictac() {
    const minuit = new Date();
    minuit.setHours(24, 0, 0, 0);
    let reste = Math.max(0, Math.floor((minuit - Date.now()) / 1000));
    const h = String(Math.floor(reste / 3600)).padStart(2, '0');
    const m = String(Math.floor((reste % 3600) / 60)).padStart(2, '0');
    const s = String(reste % 60).padStart(2, '0');
    el.compte.textContent = `${h}:${m}:${s}`;
  }

  /* ---------- fin de partie ---------- */

  function conclure(victoire, dejaCompte) {
    fini = true;
    gagne = victoire;
    el.clavier.hidden = true;

    const s = dejaCompte ? lireStats() : enregistrer(victoire, essais.length);

    el.verdict.innerHTML = victoire
      ? `<p class="verdict-mot">${MOT}</p><p>Trouvé en ${essais.length} ${essais.length > 1 ? 'essais' : 'essai'}.</p>`
      : `<p class="verdict-mot">${MOT}</p><p>C'était le mot. À demain.</p>`;

    afficherStats(s);
    el.panneau.hidden = false;
    tictac();
    clearInterval(minuterie);
    minuterie = setInterval(tictac, 1000);

    if (!dejaCompte) {
      if (victoire) {
        const depart = essais.length * 170 + 300;
        setTimeout(() => {
          ligne(essais.length - 1).classList.add('gagne');
          for (let i = 1; i <= 4; i++) Arcade.tone({ freq: Arcade.step(i * 2), dur: 0.2, vol: 0.13, delay: i * 0.1 });
        }, depart);
      } else {
        setTimeout(Arcade.sfx.over, essais.length * 170 + 300);
      }
    }
  }

  /* ---------- tour de jeu ---------- */

  function valider() {
    if (fini || occupe) return;
    if (saisie.length < LEN) {
      Arcade.replay(ligne(essais.length), 'refuse');
      Arcade.sfx.deny();
      message('Il manque des lettres');
      return;
    }
    if (!DICO.has(saisie)) {
      Arcade.replay(ligne(essais.length), 'refuse');
      Arcade.sfx.deny();
      message('Mot inconnu au dictionnaire');
      return;
    }

    const mot = saisie;
    const etats = juger(mot);
    const attente = poser(essais.length, mot, etats, !reduced);
    essais.push(mot);
    saisie = '';
    occupe = true;

    sauver();

    setTimeout(() => {
      marquerClavier(mot, etats);
      occupe = false;
      if (mot === MOT) conclure(true, false);
      else if (essais.length >= ESSAIS) conclure(false, false);
    }, attente);
  }

  function taper(lettre) {
    if (fini || occupe || saisie.length >= LEN) return;
    saisie += lettre;
    Arcade.sfx.tick();
    dessinerSaisie();
  }

  function effacer() {
    if (fini || occupe || !saisie) return;
    saisie = saisie.slice(0, -1);
    dessinerSaisie();
  }

  /* ---------- sauvegarde de la partie du jour ---------- */

  const sauver = () => Arcade.write('mot.partie', { jour, essais });

  function reprendre() {
    const p = Arcade.read('mot.partie', null);
    if (!p || p.jour !== jour || !Array.isArray(p.essais)) return;

    essais = p.essais.filter((m) => typeof m === 'string' && m.length === LEN);
    essais.forEach((mot, i) => {
      const etats = juger(mot);
      poser(i, mot, etats, false);
      marquerClavier(mot, etats);
    });

    if (essais.includes(MOT)) conclure(true, true);
    else if (essais.length >= ESSAIS) conclure(false, true);
  }

  /* ---------- entrées ---------- */

  el.clavier.addEventListener('click', (e) => {
    const b = e.target.closest('[data-touche]');
    if (!b) return;
    Arcade.boot();
    const t = b.dataset.touche;
    if (t === '↵') valider();
    else if (t === '⌫') effacer();
    else taper(t);
  });

  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    Arcade.boot();
    if (e.key === 'Enter') { valider(); e.preventDefault(); return; }
    if (e.key === 'Backspace') { effacer(); e.preventDefault(); return; }
    const l = normaliser(e.key);
    if (l.length === 1 && l >= 'A' && l <= 'Z') { taper(l); e.preventDefault(); }
  });

  el.partager.addEventListener('click', partager);

  document.getElementById('voirStats').addEventListener('click', () => {
    if (el.panneau.hidden) {
      afficherStats(lireStats());
      el.verdict.innerHTML = fini ? el.verdict.innerHTML : '<p>Partie en cours.</p>';
      el.partager.hidden = !fini;
      tictac();
      el.panneau.hidden = false;
    } else if (!fini) {
      el.panneau.hidden = true;
    }
  });

  el.contraste.addEventListener('click', () => {
    const actif = el.root.dataset.contraste !== '1';
    el.root.dataset.contraste = actif ? '1' : '0';
    el.contraste.setAttribute('aria-pressed', String(actif));
    Arcade.write('mot.contraste', actif);
  });

  Arcade.bindMute(document.getElementById('mute'));

  /* ---------- démarrage ---------- */

  bati();
  el.tag.textContent = `Mot n° ${jour + 1} · un seul par jour`;
  if (Arcade.read('mot.contraste', false)) {
    el.root.dataset.contraste = '1';
    el.contraste.setAttribute('aria-pressed', 'true');
  }
  reprendre();
})();
