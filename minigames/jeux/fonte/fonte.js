/* Fonte — une petite usine qu'on lance à la main et qui finit par tourner seule.

   Dans un jeu de ce genre, l'équilibrage est le jeu : si la chaîne s'étrangle ou
   si la courbe plafonne, il n'y a rien à sauver. Les chiffres ci-dessous sortent
   d'une simulation (scratchpad/fonte-sim*.mjs) qui fait tourner une heure d'usine
   en quelques millisecondes. Ce qu'elle mesure, avec ces valeurs :

       premier four       1,9 min       1 million d'écus    17 min
       premier lamineur   4,0 min       100 millions        22 min
       convertisseur     13,2 min       revenu à 60 min     4,5 Md/s
       aciérie           17,6 min       bâtiments           198/180/179/153/123

   Ni mur ni emballement : c'était la condition. */

(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  /* ---------- la table ---------- */

  const CROISS = 1.12;   // chaque exemplaire coûte 12 % de plus que le précédent
  const PAS = 9;         // et tous les neuf, la production du type double

  const BATIMENTS = [
    { cle: 'mineur', nom: 'Mineur', base: 12,
      quoi: 'Descend à la veine et remonte <b>0,5</b> minerai par seconde.',
      ore: 0.5 },
    { cle: 'four', nom: 'Four', base: 90,
      quoi: 'Avale <b>1,5</b> minerai par seconde et en tire <b>0,3</b> lingot.',
      mange: 1.5, lingot: 0.3 },
    { cle: 'lamineur', nom: 'Lamineur', base: 100,
      quoi: 'Avale <b>0,5</b> lingot par seconde et le vend <b>4</b> écus.',
      mange: 0.5, ecus: 4 },
    { cle: 'convertisseur', nom: 'Convertisseur', base: 1800,
      quoi: 'Avale <b>3</b> lingots par seconde et les vend <b>40</b> écus.',
      mange: 3, ecus: 40 },
    { cle: 'acierie', nom: 'Aciérie', base: 60000,
      quoi: 'Avale <b>12</b> lingots par seconde et les vend <b>320</b> écus.',
      mange: 12, ecus: 320 },
  ];
  const BAT = {};
  for (const b of BATIMENTS) BAT[b.cle] = b;
  const CLES = BATIMENTS.map((b) => b.cle);
  const VENDEURS = ['lamineur', 'convertisseur', 'acierie'];

  const AMELIOS = [
    { cle: 'pioche', nom: 'Pioche d\'acier',   cout: 120,   cible: 'pioche',        x: 5 },
    { cle: 'mine1',  nom: 'Galeries étayées',  cout: 900,   cible: 'mineur',        x: 2 },
    { cle: 'four1',  nom: 'Soufflet',          cout: 4000,  cible: 'four',          x: 2 },
    { cle: 'lam1',   nom: 'Cylindres rodés',   cout: 30000, cible: 'lamineur',      x: 3 },
    { cle: 'mine2',  nom: 'Veine profonde',    cout: 2.5e5, cible: 'mineur',        x: 3 },
    { cle: 'conv1',  nom: 'Oxygène pur',       cout: 2e6,   cible: 'convertisseur', x: 3 },
    { cle: 'four2',  nom: 'Récupérateur',      cout: 2e7,   cible: 'four',          x: 4 },
    { cle: 'acie1',  nom: 'Coulée continue',   cout: 2e8,   cible: 'acierie',       x: 3 },
  ];
  const NOM = { pioche: 'la pioche', mineur: 'les mineurs', four: 'les fours',
    lamineur: 'les lamineurs', convertisseur: 'les convertisseurs', acierie: 'les aciéries' };

  const FONTE_MAIN = 8;    // minerai pour un lingot, à la main
  const VENTE_MAIN = 5;    // écus pour un lingot, à la main
  const SEUIL_OR = 1e9;    // écus fondus avant que la refonte s'ouvre
  const PAR_OR = 0.04;     // ce que vaut un or, sur toute la production
  const ABSENCE_MAX = 4 * 3600;   // on ne rattrape pas plus de quatre heures
  const ABSENCE_TAUX = 0.5;       // et à mi-régime : l'usine sans personne tourne mal

  /* L'or d'une refonte suit un logarithme. Une racine ferait exploser la boucle :
     les gains d'un jeu comme celui-ci grimpent plus vite que n'importe quelle
     puissance, et deux refontes suffiraient à rendre la troisième gratuite. */
  const orPossible = (gagne) =>
    gagne < SEUIL_OR ? 0 : Math.floor(15 * Math.log10(gagne / 1e8));

  const palier = (n) => Math.pow(2, Math.floor(n / PAS));
  const cout = (cle, n) => Math.ceil(BAT[cle].base * Math.pow(CROISS, n));
  /* Somme géométrique : le prix de k exemplaires d'affilée. */
  const coutLot = (cle, n, k) =>
    Math.ceil(BAT[cle].base * Math.pow(CROISS, n) * (Math.pow(CROISS, k) - 1) / (CROISS - 1));
  const lotMax = (cle, n, ecus) => {
    const p = BAT[cle].base * Math.pow(CROISS, n);
    return Math.max(0, Math.floor(Math.log(1 + (ecus * (CROISS - 1)) / p) / Math.log(CROISS)));
  };

  /* ---------- état ---------- */

  const neuve = () => ({
    minerai: 0, lingots: 0, ecus: 0, gagne: 0, sommet: 0, clics: 0,
    n: { mineur: 0, four: 0, lamineur: 0, convertisseur: 0, acierie: 0 },
    prises: [],
  });

  let etat = neuve();
  let or = 0;
  let lot = 1;              // 1, 10 ou 'max' : réglage d'achat, pas de l'état
  const mult = { pioche: 1, mineur: 1, four: 1, lamineur: 1, convertisseur: 1, acierie: 1 };

  function recalculer() {
    for (const k in mult) mult[k] = 1;
    for (const a of AMELIOS) if (etat.prises.includes(a.cle)) mult[a.cible] *= a.x;
  }

  const bonus = () => 1 + PAR_OR * or;
  const sortie = (cle) => mult[cle] * palier(etat.n[cle]) * bonus();

  /* ---------- la chaîne ---------- */

  /* Débit en régime établi, stocks mis à part : sert à l'affichage et à juger
     si un étage tourne à vide. Les fours ne peuvent pas manger plus que ce que
     les mineurs sortent, les vendeurs pas plus que ce que les fours coulent. */
  function debit() {
    const n = etat.n;
    const ore = n.mineur * BAT.mineur.ore * sortie('mineur');
    const soif = n.four * BAT.four.mange;
    const oreUtil = Math.min(ore, soif);
    const lingot = (oreUtil / BAT.four.mange) * BAT.four.lingot * sortie('four');
    let demande = 0;
    for (const k of VENDEURS) demande += etat.n[k] * BAT[k].mange;
    const part = demande > 0 ? Math.min(1, lingot / demande) : 0;
    let ecus = 0;
    for (const k of VENDEURS) ecus += n[k] * part * BAT[k].ecus * sortie(k);
    return {
      ore, lingot, ecus, soif, demande,
      netOre: ore - oreUtil,
      netLingot: lingot - demande * part,
      fourSec: soif > ore + 1e-9,
      venteSec: demande > lingot + 1e-9,
    };
  }

  /* Une seconde d'usine, découpée en pas de temps. Même code pour le jeu, pour
     le rattrapage hors ligne et pour le banc d'essai. */
  function tourner(dt) {
    const n = etat.n;
    etat.minerai += n.mineur * BAT.mineur.ore * sortie('mineur') * dt;

    const soif = n.four * BAT.four.mange * dt;
    const pris = Math.min(etat.minerai, soif);
    etat.minerai -= pris;
    if (soif > 0) etat.lingots += (pris / BAT.four.mange) * BAT.four.lingot * sortie('four');

    let demande = 0;
    const veut = {};
    for (const k of VENDEURS) { veut[k] = n[k] * BAT[k].mange * dt; demande += veut[k]; }
    const part = demande > 0 ? Math.min(1, etat.lingots / demande) : 0;
    etat.lingots -= demande * part;
    let rentre = 0;
    for (const k of VENDEURS) rentre += n[k] * part * BAT[k].ecus * sortie(k) * dt;
    encaisser(rentre);
  }

  function encaisser(v) {
    if (!(v > 0)) return;
    etat.ecus += v;
    etat.gagne += v;
    if (etat.ecus > etat.sommet) etat.sommet = etat.ecus;
  }

  /* ---------- gestes à la main ---------- */

  function piocher() {
    etat.minerai += mult.pioche;
    etat.clics++;
    Arcade.sfx.tick();
    flotter('+' + nb(mult.pioche));
    rendre();
  }

  function fondreMain() {
    if (etat.minerai < FONTE_MAIN) return;
    const k = Math.floor(etat.minerai / FONTE_MAIN);
    etat.minerai -= k * FONTE_MAIN;
    etat.lingots += k;
    Arcade.sfx.thud();
    rendre();
  }

  function vendreMain() {
    if (etat.lingots < 1) return;
    const k = Math.floor(etat.lingots);
    etat.lingots -= k;
    encaisser(k * VENTE_MAIN);
    Arcade.sfx.thud();
    rendre();
  }

  /* ---------- achats ---------- */

  function acheter(cle, combien) {
    const n = etat.n[cle];
    let k = combien === 'max' ? lotMax(cle, n, etat.ecus) : combien;
    if (combien !== 'max') k = Math.min(k, lotMax(cle, n, etat.ecus));
    if (k < 1) return 0;
    etat.ecus -= coutLot(cle, n, k);
    const avant = palier(n);
    etat.n[cle] += k;
    if (palier(etat.n[cle]) > avant) Arcade.sfx.chain(Math.min(10, Math.floor(etat.n[cle] / PAS) + 1));
    else Arcade.sfx.thud();
    rendre();
    return k;
  }

  function prendre(cle) {
    const a = AMELIOS.find((x) => x.cle === cle);
    if (!a || etat.prises.includes(cle) || etat.ecus < a.cout) return;
    etat.ecus -= a.cout;
    etat.prises.push(cle);
    recalculer();
    Arcade.sfx.chain(Math.min(10, etat.prises.length + 2));
    annoncer(a.nom + " — " + NOM[a.cible] + ' ×' + a.x);
    rendre();
  }

  /* ---------- refonte ---------- */

  function refondre() {
    const gain = Math.max(0, orPossible(etat.gagne) - or);
    if (gain < 1) return;
    or += gain;
    Arcade.setRecord('fonte', or);
    etat = neuve();
    recalculer();
    Arcade.sfx.over();
    annoncer('Usine refondue : +' + gain + ' or, production ×' + bonus().toFixed(2).replace('.', ','));
    sauver();
    rendre();
  }

  /* ---------- écriture des nombres ---------- */

  /* k mille, M million, Md milliard, Bn billion, Bd billiard, Tn trillion —
     et au-delà, la puissance de dix, qui au moins ne ment pas. */
  const SUFFIXES = ['', ' k', ' M', ' Md', ' Bn', ' Bd', ' Tn', ' Td'];

  function nb(v) {
    if (!isFinite(v)) return '∞';
    if (v < 0) return '−' + nb(-v);
    if (v < 1000) {
      const s = v < 10 && Math.floor(v) !== v ? v.toFixed(1) : String(Math.floor(v));
      return s.replace('.', ',');
    }
    let i = 0, x = v;
    while (x >= 1000 && i < SUFFIXES.length - 1) { x /= 1000; i++; }
    if (x >= 1000) {
      const e = Math.floor(Math.log10(v));
      return (v / Math.pow(10, e)).toFixed(2).replace('.', ',') + ' ×10^' + e;
    }
    return (x >= 100 ? x.toFixed(0) : x.toFixed(2)).replace('.', ',') + SUFFIXES[i];
  }

  const taux = (v) => nb(v) + ' /s';

  function duree(s) {
    const h = Math.floor(s / 3600), m = Math.round((s - h * 3600) / 60);
    if (h && m) return h + ' h ' + m + ' min';
    if (h) return h + ' h';
    return Math.max(1, m) + ' min';
  }

  /* ---------- interface ---------- */

  const vue = {};

  function batir() {
    const atelier = $('atelier');
    for (const b of BATIMENTS) {
      const li = document.createElement('li');
      li.className = 'bati';
      li.hidden = true;
      li.innerHTML =
        '<div class="bati-tete">' +
          '<h3 class="bati-nom">' + b.nom + '</h3>' +
          '<span class="bati-compte">0</span>' +
        '</div>' +
        '<p class="bati-quoi">' + b.quoi + '</p>' +
        '<p class="bati-etat"><span class="bati-sortie"></span><span class="bati-palier"></span></p>' +
        '<button class="achat" type="button"><span class="achat-lot"></span>' +
        '<span class="achat-prix"></span></button>';
      atelier.appendChild(li);
      const bouton = li.querySelector('.achat');
      bouton.addEventListener('click', () => acheter(b.cle, lot));
      vue[b.cle] = {
        li, bouton,
        compte: li.querySelector('.bati-compte'),
        sortieTxt: li.querySelector('.bati-sortie'),
        palierTxt: li.querySelector('.bati-palier'),
        lotTxt: li.querySelector('.achat-lot'),
        prix: li.querySelector('.achat-prix'),
      };
    }

    const rangee = $('amelios');
    for (const a of AMELIOS) {
      const bouton = document.createElement('button');
      bouton.className = 'amelio';
      bouton.type = 'button';
      bouton.hidden = true;
      bouton.innerHTML = '<span class="amelio-nom">' + a.nom + '</span>' +
        '<span class="amelio-quoi">' + NOM[a.cible] + ' ×' + a.x + '</span>' +
        '<span class="amelio-prix">' + nb(a.cout) + '</span>';
      bouton.addEventListener('click', () => prendre(a.cle));
      rangee.appendChild(bouton);
      vue[a.cle] = { bouton };
    }
  }

  function rendre() {
    const d = debit();
    $('ecus').textContent = nb(etat.ecus);
    $('parSec').textContent = nb(d.ecus);
    $('or').textContent = String(or);
    $('orBonus').textContent = or ? '×' + bonus().toFixed(2).replace('.', ',') : 'aucun';

    $('minerai').textContent = nb(etat.minerai);
    $('lingots').textContent = nb(etat.lingots);
    $('mineraiTaux').textContent = taux(d.netOre);
    $('lingotsTaux').textContent = taux(d.netLingot);
    $('stockMinerai').classList.toggle('sec', d.fourSec && etat.n.four > 0);
    $('stockLingots').classList.toggle('sec', d.venteSec && etat.n.lamineur > 0);

    $('fondre').disabled = etat.minerai < FONTE_MAIN;
    $('vendre').disabled = etat.lingots < 1;
    $('mains').hidden = etat.n.four > 0 && etat.n.lamineur > 0;

    for (const b of BATIMENTS) {
      const v = vue[b.cle], n = etat.n[b.cle];
      if (v.li.hidden && (n > 0 || etat.sommet >= b.base * 0.35)) v.li.hidden = false;
      if (v.li.hidden) continue;
      v.compte.textContent = String(n);
      const k = lot === 'max' ? Math.max(1, lotMax(b.cle, n, etat.ecus)) : lot;
      const prix = coutLot(b.cle, n, k);
      v.lotTxt.textContent = k > 1 ? 'Acheter ×' + k : 'Acheter';
      v.prix.textContent = nb(prix) + ' écus';
      v.bouton.disabled = prix > etat.ecus;
      v.sortieTxt.textContent = n === 0 ? '—'
        : b.ore ? taux(n * b.ore * sortie(b.cle))
        : b.lingot ? taux((n * b.mange / BAT.four.mange) * b.lingot * sortie(b.cle)).replace('/s', ' lingot/s')
        : taux(n * b.ecus * sortie(b.cle));
      const reste = PAS - (n % PAS);
      v.palierTxt.textContent = n === 0 ? '' : '×2 dans ' + reste;
      v.li.classList.toggle('proche', n > 0 && reste <= 2);
    }

    for (const a of AMELIOS) {
      const v = vue[a.cle], prise = etat.prises.includes(a.cle);
      v.bouton.hidden = prise || etat.sommet < a.cout * 0.5;
      v.bouton.disabled = etat.ecus < a.cout;
    }
    $('amelios').hidden = !AMELIOS.some((a) => !vue[a.cle].bouton.hidden);

    const gain = Math.max(0, orPossible(etat.gagne) - or);
    const bloc = $('refonte');
    bloc.hidden = etat.gagne < SEUIL_OR * 0.1 && or === 0;
    if (!bloc.hidden) {
      const pret = gain >= 1;
      $('refondre').disabled = !pret;
      $('refonteNote').innerHTML = pret
        ? 'Tout repart de zéro, sauf l\'or : <b>+' + gain + ' or</b>, soit une production ×' +
          (1 + PAR_OR * (or + gain)).toFixed(2).replace('.', ',') + ' pour la suite.'
        : 'Il faut <b>' + nb(SEUIL_OR) + '</b> écus fondus pour la première refonte. ' +
          'Vous en êtes à ' + nb(etat.gagne) + '.';
    }
  }

  /* ---------- petits messages ---------- */

  let effacer = null;
  function annoncer(texte) {
    const n = $('annonce');
    n.textContent = texte;
    n.hidden = false;
    clearTimeout(effacer);
    effacer = setTimeout(() => { n.hidden = true; }, 6000);
  }

  function flotter(texte) {
    if (Arcade.reduced) return;
    const n = $('gain');
    n.textContent = texte;
    Arcade.replay(n, 'monte');
  }

  /* ---------- sauvegarde ---------- */

  function sauver() {
    Arcade.write('fonte', { v: 1, or, quand: Date.now(), etat });
  }

  function charger() {
    const sauve = Arcade.read('fonte', null);
    or = Math.max(Arcade.record('fonte'), (sauve && sauve.or) || 0);
    if (sauve && sauve.etat) {
      const e = sauve.etat;
      etat = Object.assign(neuve(), e);
      etat.n = Object.assign(neuve().n, e.n || {});
      etat.prises = Array.isArray(e.prises) ? e.prises.filter((c) => AMELIOS.some((a) => a.cle === c)) : [];
    }
    recalculer();

    /* Une usine à laquelle personne n'a encore touché mérite la consigne, même si
       une sauvegarde vide traîne déjà : ouvrir la page puis la fermer en crée une. */
    if (!etat.clics && !etat.gagne && !etat.n.mineur) {
      annoncer('Piochez : huit minerais font un lingot, et un lingot vaut cinq écus.');
      return;
    }
    if (!sauve) return;

    const absent = Math.min(ABSENCE_MAX, Math.max(0, (Date.now() - (sauve.quand || Date.now())) / 1000));
    if (absent < 60 || debit().ecus <= 0) return;
    const avant = etat.gagne;
    for (let t = 0; t < absent; t += 1) tourner(ABSENCE_TAUX);
    const gagne = etat.gagne - avant;
    if (gagne > 0) annoncer('Pendant votre absence : ' + duree(absent) + ' à mi-régime, +' + nb(gagne) + ' écus.');
  }

  /* ---------- boucle ---------- */

  let dernier = performance.now();
  function boucle(t) {
    const dt = Math.min(0.25, (t - dernier) / 1000);
    dernier = t;
    tourner(dt);
    rendre();
    requestAnimationFrame(boucle);
  }

  /* ---------- branchements ---------- */

  batir();
  charger();
  rendre();

  $('mine').addEventListener('click', () => { Arcade.boot(); piocher(); });
  $('fondre').addEventListener('click', fondreMain);
  $('vendre').addEventListener('click', vendreMain);
  $('refondre').addEventListener('click', refondre);

  for (const b of document.querySelectorAll('.lot')) {
    b.addEventListener('click', () => {
      lot = b.dataset.lot === 'max' ? 'max' : parseInt(b.dataset.lot, 10);
      for (const autre of document.querySelectorAll('.lot'))
        autre.setAttribute('aria-pressed', String(autre === b));
      rendre();
    });
  }

  /* Vider l'usine demande confirmation, mais sans boîte de dialogue : le bouton
     se transforme, et redevient sage tout seul si on ne confirme pas. */
  let arme = null;
  const vider = $('vider');
  vider.addEventListener('click', () => {
    if (!arme) {
      vider.textContent = 'Confirmer ?';
      vider.classList.add('arme');
      arme = setTimeout(() => {
        arme = null; vider.textContent = 'Vider l\'usine'; vider.classList.remove('arme');
      }, 4000);
      return;
    }
    clearTimeout(arme); arme = null;
    vider.textContent = 'Vider l\'usine'; vider.classList.remove('arme');
    etat = neuve();
    recalculer();
    sauver();
    annoncer('Usine vidée. L\'or, lui, ne se perd pas.');
    rendre();
  });

  Arcade.bindMute($('mute'));
  addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); Arcade.boot(); piocher(); }
  });
  setInterval(sauver, 5000);
  addEventListener('pagehide', sauver);
  document.addEventListener('visibilitychange', () => { if (document.hidden) sauver(); });

  requestAnimationFrame(boucle);

  /* Banc d'essai : la simulation qui a servi à régler les coûts tourne contre ce
     même code, sans repasser par l'interface. */
  window.Fonte = { etat: () => etat, or: () => or, tourner, debit, acheter, prendre, rendre, cout, nb };
})();
