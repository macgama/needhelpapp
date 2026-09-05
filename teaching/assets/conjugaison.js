"use strict";

/* =========================================================
   La conjugaison — interface
   Trois écrans : composer un exercice, s'entraîner, consulter
   la conjugaison complète d'un verbe.
   ========================================================= */
const $ = (id) => document.getElementById(id);
/* Deux moteurs, une seule interface. Le français reste le défaut ;
   l'anglais s'ajoute avec ses propres temps et sa propre liste. Tout le
   reste de la page ignore laquelle est active, ce qui a permis de brancher
   la seconde sans toucher aux exercices. */
const MOTEURS = {
  fr: { moteur: window.Conjugueur,   verbes: window.Verbes,
        nom: 'français', note: '984 verbes français, 24 temps.' },
  en: { moteur: window.ConjugueurEN, verbes: window.VerbesEN,
        nom: 'anglais',  note: '332 verbes anglais, 18 temps, les irréguliers au complet.' },
  it: { moteur: window.ConjugueurIT, verbes: window.VerbesIT,
        nom: 'italien',  note: '222 verbes italiens, 17 temps, du presente au congiuntivo trapassato.' },
  de: { moteur: window.ConjugueurDE, verbes: window.VerbesDE,
        nom: 'allemand', note: '247 verbes allemands, 13 temps, verbes forts et préfixes séparables.' }
};
let langueVerbes = 'fr';
let C = MOTEURS.fr.moteur;

/* Listes de verbes proposées, du plus courant au plus exigeant. */
const LISTES = {
  essentiels: {
    nom: 'Les huit essentiels',
    detail: 'être, avoir, aller, faire, dire, pouvoir, vouloir, venir',
    verbes: ['être','avoir','aller','faire','dire','pouvoir','vouloir','venir']
  },
  premier: {
    nom: '1er groupe',
    detail: 'les verbes en -er, y compris les pièges orthographiques',
    verbes: ['chanter','manger','placer','appeler','jeter','acheter','lever','espérer',
             'employer','payer','commencer','nager','étudier','oublier','donner','regarder',
             'trouver','penser','arriver','rester']
  },
  deuxieme: {
    nom: '2e groupe',
    detail: 'les verbes en -ir qui font « nous finissons »',
    verbes: ['finir','choisir','grandir','réussir','remplir','punir','obéir','nourrir',
             'saisir','bâtir','ralentir','applaudir','avertir','rougir','vieillir','guérir']
  },
  troisieme: {
    nom: '3e groupe',
    detail: 'les irréguliers les plus fréquents',
    verbes: ['prendre','mettre','partir','sortir','voir','savoir','devoir','écrire','lire',
             'boire','croire','vivre','suivre','connaître','courir','ouvrir','recevoir',
             'attendre','rendre','répondre','craindre','peindre','conduire','tenir','rire']
  },
  tous: {
    nom: 'Toute la liste',
    detail: 'les 984 verbes de l\u2019application, tirés au hasard',
    verbes: []            // rempli à la volée : voir verbesChoisis
  },
  pieges: {
    nom: 'Les pièges',
    detail: 'ceux qu\u2019on écrit de travers une fois sur deux',
    verbes: ['appeler','jeter','acheter','espérer','employer','payer','manger','placer',
             'vaincre','haïr','naître','mourir','valoir','acquérir','résoudre','coudre']
  }
};

const state = {
  questions: [],
  index: 0,
  reponses: [],
  parVerbe: true
};

/* =========================================================
   Composer l'exercice
   ========================================================= */
/* ---------- changer de langue ----------
   Tout est remis à zéro : les temps, la sélection de verbes et la liste
   consultable diffèrent d'une langue à l'autre, et mélanger un verbe
   anglais avec le subjonctif français n'aurait aucun sens. */
function changerLangueVerbes(code){
  if (!MOTEURS[code]) return;
  langueVerbes = code;
  C = MOTEURS[code].moteur;
  V = MOTEURS[code].verbes;
  verbesChoisis = [];
  listeOuverte = null;
  majOngletComposer('neuf');

  const sel = $('c-langue');
  if (sel) sel.value = code;
  const note = $('c-langue-note');
  if (note) note.textContent = MOTEURS[code].note;

  remplirTemps();
  peindreRaccourcis();
  peindreVerbes();
  peindreListe();
  $('verbe-consulte').value = '';
  consulter();
  memoriser();
}

/* =========================================================
   Les temps : 24 cases, groupées par mode
   ========================================================= */
const DEFAUT_TEMPS = ['present', 'imparfait', 'futur'];

function remplirTemps(){
  const box = $('temps');
  box.innerHTML = '';
  const modes = {};
  C.TEMPS.forEach(t => { (modes[t.mode] = modes[t.mode] || []).push(t); });

  Object.keys(modes).forEach(mode => {
    const bloc = document.createElement('div');
    bloc.className = 'temps-bloc';
    const titre = document.createElement('h4');
    titre.textContent = mode;
    bloc.appendChild(titre);
    modes[mode].forEach(t => {
      const l = document.createElement('label');
      l.className = 'check';
      const i = document.createElement('input');
      i.type = 'checkbox';
      i.className = 'temps';
      i.value = t.code;
      i.checked = DEFAUT_TEMPS.indexOf(t.code) >= 0;
      l.appendChild(i);
      l.appendChild(document.createTextNode(' ' + t.nom));
      bloc.appendChild(l);
    });
    box.appendChild(bloc);
  });
}

function tempsChoisis(){
  return Array.prototype.map.call(document.querySelectorAll('.temps:checked'), i => i.value);
}

function cocherTout(oui){
  document.querySelectorAll('.temps').forEach(i => { i.checked = oui; });
  memoriser();
}

/* =========================================================
   La sélection : des verbes et des temps, que l'on peut
   enregistrer, retrouver et partager. C'est la même chose
   qu'une « liste » — d'où la disparition de l'ancien éditeur
   séparé, qui faisait le même travail deux fois.
   ========================================================= */
let verbesChoisis = [];     // les verbes de la sélection en cours
let listeOuverte = null;    // la liste enregistrée dont elle provient

function direVerbes(msg, genre){
  $('verbes-note').className = 'status' + (genre ? ' ' + genre : '');
  $('verbes-note').textContent = msg || '';
}

function peindreRaccourcis(){
  const box = $('raccourcis');
  box.innerHTML = '';
  if (langueVerbes !== 'fr'){
    // chaque langue a ses regroupements naturels : les irréguliers en
    // anglais, les trois conjugaisons en italien
    const groupes = (langueVerbes === 'it')
      ? [['are', 'Les verbes en -are', V.parGroupe.are],
         ['ere', 'Les verbes en -ere', V.parGroupe.ere],
         ['ire', 'Les verbes en -ire', V.parGroupe.ire],
         ['tous', 'Toute la liste', V.tous]]
      : (langueVerbes === 'de')
      ? [['forts', 'Les verbes forts', V.parGroupe.forts],
         ['faibles', 'Les verbes faibles', V.parGroupe.faibles],
         ['separables', 'Les verbes à particule', V.parGroupe.separables],
         ['tous', 'Toute la liste', V.tous]]
      : [['irreguliers', 'Les irréguliers', V.parGroupe.irreguliers],
         ['reguliers', 'Les réguliers', V.parGroupe.reguliers],
         ['tous', 'Toute la liste', V.tous]];
    groupes.forEach(([cle, nom, source]) => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.textContent = '+ ' + nom;
      b.onclick = () => {
        let n = 0;
        source.forEach(v => { if (verbesChoisis.indexOf(v) < 0){ verbesChoisis.push(v); n++; } });
        peindreVerbes();
        direVerbes(n ? n + (n > 1 ? ' verbes ajoutés.' : ' verbe ajouté.') : 'Ils y étaient déjà.', 'ok');
      };
      box.appendChild(b);
    });
    return;
  }
  Object.keys(LISTES).forEach(cle => {
    const l = LISTES[cle];
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = '+ ' + l.nom;
    b.title = l.detail;
    b.onclick = () => {
      const source = (cle === 'tous') ? V.tous : l.verbes;
      let n = 0;
      source.forEach(v => { if (verbesChoisis.indexOf(v) < 0){ verbesChoisis.push(v); n++; } });
      peindreVerbes();
      direVerbes(n ? n + (n > 1 ? ' verbes ajoutés.' : ' verbe ajouté.') : 'Ils y étaient déjà.', 'ok');
    };
    box.appendChild(b);
  });
}

function peindreVerbes(){
  const box = $('verbes-choisis');
  box.innerHTML = '';
  if (!verbesChoisis.length){
    box.innerHTML = '<span class="hint">Aucun verbe pour l\u2019instant.</span>';
    return;
  }
  verbesChoisis.forEach(v => {
    const b = document.createElement('button');
    b.textContent = v;
    b.title = 'Retirer ' + v;
    b.onclick = () => { verbesChoisis = verbesChoisis.filter(x => x !== v); peindreVerbes(); };
    box.appendChild(b);
  });
  const compte = document.createElement('span');
  compte.className = 'hint';
  compte.style.width = '100%';
  compte.textContent = verbesChoisis.length + (verbesChoisis.length > 1 ? ' verbes choisis.' : ' verbe choisi.');
  box.appendChild(compte);
}

function ajouterVerbes(saisie){
  const refuses = [];
  const inconnus = [];      // acceptés, mais absents de la liste
  let ajoutes = 0;
  String(saisie || '').split(/[,;\n]+/).forEach(mot => {
    const v = mot.trim().toLowerCase();
    if (!v) return;
    if (!C.connait(v)){ refuses.push(v); return; }
    // en anglais tout mot se conjugue comme un régulier : une faute de frappe
    // passerait sans bruit, alors on la signale sans pour autant l'interdire
    if (langueVerbes === 'en' && V.tous.indexOf(v) < 0) inconnus.push(v);
    if (verbesChoisis.indexOf(v) < 0){ verbesChoisis.push(v); ajoutes++; }
  });
  peindreVerbes();
  if (refuses.length){
    direVerbes('Non reconnu' + (refuses.length > 1 ? 's' : '') + ' : ' + refuses.join(', ')
      + '. Vérifie l\u2019orthographe de l\u2019infinitif.', 'err');
  } else if (inconnus.length){
    direVerbes(ajoutes + (ajoutes > 1 ? ' verbes ajoutés' : ' verbe ajouté') + ', mais '
      + inconnus.join(', ') + (inconnus.length > 1 ? ' ne figurent pas' : ' ne figure pas')
      + ' dans la liste : ' + (inconnus.length > 1 ? 'ils seront conjugués' : 'il sera conjugué')
      + ' comme des réguliers. Vérifie l\u2019orthographe.', 'err');
  } else {
    direVerbes(ajoutes ? ajoutes + (ajoutes > 1 ? ' verbes ajoutés.' : ' verbe ajouté.') : '', 'ok');
  }
  return ajoutes;
}

/** Charge une sélection — la sienne, ou celle d'un autre — dans l'écran Composer. */
function ouvrirSelection(liste, reprise){
  if (liste.langue && liste.langue !== langueVerbes) changerLangueVerbes(liste.langue);
  majOngletComposer(reprise ? 'reprise' : 'modifier');
  listeOuverte = reprise ? null : (liste.id ? liste : null);
  verbesChoisis = (liste.verbs || []).slice();
  if (Array.isArray(liste.tenses) && liste.tenses.length){
    document.querySelectorAll('.temps').forEach(i => { i.checked = liste.tenses.indexOf(i.value) >= 0; });
  }
  $('liste-nom').value = liste.name || '';
  $('liste-publique').checked = !reprise && !!liste.is_public;
  peindreVerbes();
  direListe(reprise
    ? 'Sélection reprise. Enregistre-la pour la retrouver dans « Mes listes ».'
    : (liste.id ? 'Enregistrer remplacera « ' + liste.name + ' ».' : ''), '');
  aller('composer');
}

function verbesChoisisTotal(){ return verbesChoisis.slice(); }

function melange(t){
  for (let i = t.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    const x = t[i]; t[i] = t[j]; t[j] = x;
  }
  return t;
}

/** Toutes les questions possibles pour la sélection courante. */
function questionsPossibles(verbes, temps){
  const possibles = [];
  verbes.forEach(v => {
    const conj = C.conjugue(v);
    if (!conj) return;
    temps.forEach(t => {
      const formes = conj[t];
      if (!formes) return;
      formes.forEach((f, i) => {
        if (!f || f === '—') return;   // « potere » n'a pas d'impératif
        possibles.push({ verbe:v, temps:t, personne:i, attendu:f,
                         variantes: C.variantes(v, t, i) });
      });
    });
  });

  return possibles;
}

/** Le tirage commun à l'exercice et à la feuille imprimée. */
function tirage(){
  const verbes = verbesChoisisTotal();
  const temps = tempsChoisis();
  const nb = parseInt($('nb-questions').value, 10);

  if (!verbes.length){
    Avis.fenetre('Il n\u2019y a encore rien à travailler',
      'Pour t\u2019entraîner, il faut des verbes. Ajoute-les toi-même, reprends une de tes '
        + 'sélections, ou vas en chercher une dans la bibliothèque partagée.',
      [{ texte:'Ajouter des verbes', principal:true, action: () => { aller('composer'); $('ajout-verbe').focus(); } },
       { texte:'Mes listes', action: () => aller('listes') },
       { texte:'La bibliothèque', action: () => aller('biblio') }]);
    return null;
  }
  if (!temps.length){
    Avis.fenetre('Aucun temps choisi',
      'Coche au moins un temps dans la grille : c\u2019est lui qui décide des questions posées.',
      [{ texte:'Choisir un temps', principal:true, action: () => aller('composer') }]);
    return null;
  }

  const possibles = questionsPossibles(verbes, temps);
  if (!possibles.length){ dire('Ces verbes n\u2019existent pas à ces temps-là.', 'err'); return null; }
  return melange(possibles).slice(0, Math.min(nb, possibles.length));
}

/* =========================================================
   La feuille imprimable
   On construit un document dans la page, que la feuille de style
   d'impression laisse seul visible. Le navigateur produit alors le
   PDF par « Enregistrer au format PDF ». Rien à installer, rien à
   envoyer au serveur : le texte de l'exercice reste chez l'utilisateur.
   ========================================================= */
function nomTemps(code){
  const t = C.TEMPS.find(x => x.code === code);
  return t ? (t.mode + ' ' + t.nom).toLowerCase() : code;
}

/* Ce qui précède le trait : sans cette indication, « prendre à l'imparfait »
   ne désigne pas une seule réponse. Trois cas, les mêmes qu'à l'écran :
   l'impératif nomme sa personne, les temps à forme unique le disent, les
   autres donnent le pronom sujet. */
function amorce(q){
  const def = C.TEMPS.find(x => x.code === q.temps);
  if (def && def.imperatif) return C.IMPER_PERSONNES[q.personne] + ' : ';
  if (def && def.pers === 1) return '';
  return C.sujet(q.temps, q.personne, q.attendu);
}

function construireFeuille(questions){
  const titre = $('liste-nom').value.trim() || 'Exercice de conjugaison';
  const aujourdhui = new Date().toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
  const temps = tempsChoisis().map(nomTemps);
  const verbes = verbesChoisisTotal();

  const entete = (sousTitre) => {
    const e = document.createElement('div');
    e.className = 'feuille-entete';
    const h = document.createElement('h1');
    h.textContent = titre + (sousTitre ? ' — ' + sousTitre : '');
    e.appendChild(h);
    const i = document.createElement('div');
    i.className = 'infos';
    const g = document.createElement('span');
    g.textContent = questions.length + ' questions · '
      + verbes.length + (verbes.length > 1 ? ' verbes' : ' verbe') + ' · '
      + temps.slice(0, 4).join(', ') + (temps.length > 4 ? '…' : '');
    const d = document.createElement('span');
    d.textContent = aujourdhui;
    i.appendChild(g); i.appendChild(d);
    e.appendChild(i);
    return e;
  };

  // --- page des questions
  const qp = $('feuille-questions');
  qp.innerHTML = '';
  qp.appendChild(entete(''));

  const nom = document.createElement('p');
  nom.className = 'feuille-nom';
  nom.textContent = 'Nom : ............................................        Classe : ....................        Note :  ......... / ' + questions.length;
  qp.appendChild(nom);

  const consigne = document.createElement('p');
  consigne.className = 'feuille-consigne';
  consigne.textContent = 'Écris la forme demandée sur les pointillés.';
  qp.appendChild(consigne);

  const ol = document.createElement('ol');
  ol.className = 'feuille-questions';
  questions.forEach(q => {
    const li = document.createElement('li');
    const v = document.createElement('span');
    v.className = 'q-verbe';
    v.textContent = q.verbe;
    const t = document.createElement('span');
    t.className = 'q-temps';
    t.textContent = ' (' + nomTemps(q.temps) + ') ';
    const a = document.createElement('span');
    a.textContent = amorce(q);
    const trait = document.createElement('span');
    trait.className = 'q-trait';
    li.appendChild(v); li.appendChild(t); li.appendChild(a); li.appendChild(trait);
    ol.appendChild(li);
  });
  qp.appendChild(ol);

  const pied = document.createElement('p');
  pied.className = 'feuille-pied';
  pied.textContent = 'Le corrigé se trouve sur la page suivante.';
  qp.appendChild(pied);

  // --- page du corrigé
  const cp = $('feuille-corrige');
  cp.innerHTML = '';
  cp.appendChild(entete('corrigé'));
  const oc = document.createElement('ol');
  oc.className = 'feuille-corrige';
  questions.forEach(q => {
    const li = document.createElement('li');
    const a = document.createElement('span');
    a.textContent = q.verbe + ' (' + nomTemps(q.temps) + ') : ';
    const r = document.createElement('span');
    r.className = 'c-reponse';
    r.textContent = (amorce(q) + q.attendu).replace(/\s+/g, ' ').trim();
    li.appendChild(a); li.appendChild(r);
    oc.appendChild(li);
  });
  cp.appendChild(oc);
}

function composer(){
  const questions = tirage();
  if (!questions) return;
  state.questions = questions;
  state.index = 0;
  state.reponses = [];
  aller('exercice');
  poserQuestion();
}

function dire(msg, genre){
  $('compose-note').className = 'status' + (genre ? ' ' + genre : '');
  $('compose-note').textContent = msg;
}

/* =========================================================
   S'entraîner
   ========================================================= */
function nomTemps(code){
  const t = C.TEMPS.find(x => x.code === code);
  return t ? (t.mode.toLowerCase() === 'indicatif' ? t.nom : t.mode.toLowerCase() + ' ' + t.nom) : code;
}

function poserQuestion(){
  const q = state.questions[state.index];
  const def = C.TEMPS.find(x => x.code === q.temps);

  $('avance').textContent = 'Question ' + (state.index + 1) + ' sur ' + state.questions.length;
  $('barre-avance').style.width = Math.round(state.index / state.questions.length * 100) + '%';
  $('q-verbe').textContent = q.verbe;
  $('q-temps').textContent = nomTemps(q.temps);

  if (def.imperatif){
    $('q-sujet').textContent = C.IMPER_PERSONNES[q.personne] + ' :';
    $('q-pronom').textContent = '';
  } else if (def.pers === 1){
    $('q-sujet').textContent = 'une seule forme :';
    $('q-pronom').textContent = '';
  } else {
    $('q-sujet').textContent = '';
    $('q-pronom').textContent = C.sujet(q.temps, q.personne, q.attendu);
  }

  $('reponse').value = '';
  $('reponse').disabled = false;
  $('verifier').disabled = false;
  $('verifier').textContent = 'Vérifier';
  $('verdict').className = 'verdict';
  $('verdict').textContent = '';
  $('indice').hidden = false;
  $('indice-texte').hidden = true;
  $('reponse').focus();
}

/* Les fautes d'accent sont des fautes ; les majuscules et les
   espaces en trop, non. Le participe accordé au féminin passe. */
function correspond(saisie, attendu, temps, autres){
  const propre = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[’]/g, "'");
  const a = propre(saisie), b = propre(attendu);
  if (a === b) return true;
  // « je paye » vaut « je paie »
  if ((autres || []).some(v => propre(v) === a)) return true;
  // « je suis allée » vaut « je suis allé »
  const variantes = [b, b + 'e', b + 's', b + 'es'];
  if (/^(suis|es|est|sommes|êtes|sont|étais|était|étions|étiez|étaient|serai|sera|serons|serez|seront|serais|serait|serions|seriez|seraient|fus|fut|fûmes|fûtes|furent|sois|soit|soyons|soyez|soient)\s/.test(b)){
    const parts = b.split(' ');
    const pp = parts.pop();
    ['', 'e', 's', 'es'].forEach(fin => variantes.push(parts.join(' ') + ' ' + pp + fin));
  }
  return variantes.indexOf(a) >= 0;
}

function verifier(){
  const q = state.questions[state.index];
  if ($('reponse').disabled){ suivante(); return; }

  const saisie = $('reponse').value;
  if (!saisie.trim()){ $('reponse').focus(); return; }

  const juste = correspond(saisie, q.attendu, q.temps, q.variantes);
  state.reponses.push({ q:q, saisie:saisie.trim(), juste:juste });

  $('verdict').className = 'verdict ' + (juste ? 'bon' : 'faux');
  $('verdict').textContent = juste
    ? 'Juste.'
    : 'On écrit : ' + (C.sujet(q.temps, q.personne, q.attendu) + q.attendu).trim();
  $('reponse').disabled = true;
  $('verifier').textContent = (state.index + 1 < state.questions.length) ? 'Question suivante' : 'Voir le bilan';
  $('verifier').focus();
}

function suivante(){
  state.index++;
  if (state.index >= state.questions.length){ bilan(); return; }
  poserQuestion();
}

function bilan(){
  const bons = state.reponses.filter(r => r.juste).length;
  const total = state.reponses.length;
  const pct = Math.round(bons / total * 100);

  $('score-chiffre').textContent = bons + '/' + total;
  $('score-mot').textContent = pct === 100 ? 'Sans faute !'
    : (pct >= 80 ? 'Bon travail.' : (pct >= 50 ? 'À revoir.' : 'Il faut reprendre ces temps-là.'));

  const ul = $('bilan-liste');
  ul.innerHTML = '';
  state.reponses.filter(r => !r.juste).forEach(r => {
    const li = document.createElement('li');
    const g = document.createElement('span');
    g.innerHTML = '<b>' + r.q.verbe + '</b> · ' + nomTemps(r.q.temps);
    const f = document.createElement('span');
    f.className = 'faux-mot';
    f.innerHTML = '<s>' + echappe(r.saisie) + '</s> <em>' + echappe(r.q.attendu) + '</em>';
    li.appendChild(g); li.appendChild(f);
    ul.appendChild(li);
  });
  $('bilan-vide').hidden = bons !== total;
  enregistrerBilan(bons, total);
  aller('bilan');
}

function echappe(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* =========================================================
   Mes listes : seulement les siennes, et celles reprises.
   L'édition, elle, se fait dans « Composer » : c'est la même
   chose, et deux éditeurs auraient divergé.
   ========================================================= */
let mesListes = [];

function direListe(msg, genre){
  $('liste-note').className = 'status' + (genre ? ' ' + genre : '');
  $('liste-note').textContent = msg || '';
}

async function chargerMesListes(){
  const ouvert = Compte.connecte();   // un compte gratuit garde déjà cinq éléments
  const bloc = $('listes-hors-compte');
  bloc.hidden = ouvert || !Compte.disponible();
  $('listes-box').hidden = !ouvert;
  if (!ouvert){
    bloc.querySelector('p').textContent = Compte.connecte()
      ? 'Un compte gratuit garde cinq sélections et en reprend cinq. Publier et partager demandent un abonnement.'
      : 'Crée un compte pour garder tes sélections : cinq gratuitement, sur chaque application.';
    $('listes-inscription').textContent = 'Créer un compte';
    mesListes = [];
    return;
  }
  try {
    mesListes = (await Compte.appel('lists')).lists || [];
  } catch(e){ mesListes = []; }
  peindreMesListes();
}

function ligneListe(l){
  const li = document.createElement('li');

  const nom = document.createElement('span');
  nom.className = 'nom';
  nom.textContent = l.name;
  li.appendChild(nom);

  if (l.is_public){
    const b = document.createElement('span');
    b.className = 'badge pub';
    b.textContent = 'publiée';
    li.appendChild(b);
  }
  if (l.borrowed){
    const b = document.createElement('span');
    b.className = 'badge';
    b.textContent = 'reprise';
    li.appendChild(b);
  }

  const ouvrir = document.createElement('button');
  ouvrir.className = 'mini';
  ouvrir.textContent = 'Utiliser';
  ouvrir.onclick = () => ouvrirSelection(l, !!l.borrowed);
  li.appendChild(ouvrir);

  // publier et partager restent réservés aux abonnés
  if (!l.borrowed && Compte.abonne()){
    const pub = document.createElement('button');
    pub.className = 'mini';
    pub.textContent = l.is_public ? 'Dépublier' : 'Publier';
    pub.onclick = async () => {
      try {
        await Compte.appel('list_publish', { id:l.id, public: !l.is_public });
        await chargerMesListes();
        $('mes-listes-note').textContent = l.is_public
          ? '« ' + l.name + ' » est retirée de la bibliothèque.'
          : '« ' + l.name + ' » est publiée dans la bibliothèque.';
      } catch(e){ $('mes-listes-note').textContent = 'Opération impossible : ' + e.message + '.'; }
    };
    li.appendChild(pub);

    const partager = document.createElement('button');
    partager.className = 'mini';
    partager.textContent = 'Partager';
    partager.onclick = () => partagerListe(l);
    li.appendChild(partager);
  }

  const suppr = document.createElement('button');
  suppr.className = 'mini del';
  suppr.textContent = 'Supprimer';
  suppr.onclick = async () => {
    if (!window.confirm('Supprimer « ' + l.name + ' » ?')) return;
    try { await Compte.appel('list_delete', { id:l.id }); } catch(e){}
    if (listeOuverte && listeOuverte.id === l.id) listeOuverte = null;
    chargerMesListes();
  };
  li.appendChild(suppr);

  const meta = document.createElement('p');
  meta.className = 'meta';
  const bouts = [l.verbs.length + (l.verbs.length > 1 ? ' verbes' : ' verbe')];
  if (l.tenses && l.tenses.length) bouts.push(l.tenses.length + (l.tenses.length > 1 ? ' temps' : ' temps'));
  if (l.borrowed) bouts.push('partagée par ' + (l.origin_owner || 'un autre utilisateur'));
  bouts.push(l.verbs.slice(0, 6).join(', ') + (l.verbs.length > 6 ? '…' : ''));
  meta.textContent = bouts.join(' · ');
  li.appendChild(meta);

  return li;
}

function peindreMesListes(){
  const miennes = mesListes.filter(l => !l.borrowed);
  const reprises = mesListes.filter(l => l.borrowed);
  $('mes-listes').innerHTML = '';
  $('listes-reprises').innerHTML = '';
  miennes.forEach(l => $('mes-listes').appendChild(ligneListe(l)));
  reprises.forEach(l => $('listes-reprises').appendChild(ligneListe(l)));
  $('titre-mes-listes').hidden = !miennes.length;
  $('titre-reprises-listes').hidden = !reprises.length;
  $('listes-vide').hidden = mesListes.length > 0;
  $('mes-listes-note').textContent = mesListes.length
    ? 'Ouvre une liste avec « Utiliser » : elle revient dans Composer, prête à être travaillée ou modifiée.'
    : '';
}

async function partagerListe(l){
  try {
    const r = await Compte.appel('list_share', { id:l.id });
    const url = window.location.origin + window.location.pathname + '?l=' + r.share_token;
    const issue = await Compte.partager(
      'Liste de verbes : ' + l.name,
      'Voici une sélection de verbes à travailler : « ' + l.name + ' ».',
      url
    );
    $('mes-listes-note').textContent =
      issue === 'partage' ? 'Liste partagée.'
      : issue === 'copie' ? 'Lien copié : ' + url
      : issue === 'annule' ? ''
      : 'Lien à recopier : ' + url;
  } catch(e){
    $('mes-listes-note').textContent = 'Partage impossible : ' + e.message + '.';
  }
}

/* =========================================================
   La bibliothèque des sélections partagées
   ========================================================= */
let biblioMinuteur = null;

async function chercherBiblio(){
  const ul = $('biblio-liste');
  $('biblio-note').textContent = 'Recherche…';
  try {
    const r = await Compte.appel('library_lists', null, { q: $('biblio-q').value.trim() });
    const listes = r.lists || [];
    ul.innerHTML = '';
    listes.forEach(l => ul.appendChild(ligneBiblio(l, r.connecte, r.abonne)));
    $('biblio-note').textContent = listes.length
      ? listes.length + (listes.length > 1 ? ' sélections partagées' : ' sélection partagée')
        + ' par les utilisateurs.' + (r.connecte ? '' : ' Crée un compte pour les ouvrir.')
      : 'Aucune sélection ne correspond pour l\u2019instant.';
  } catch(e){
    ul.innerHTML = '';
    $('biblio-note').textContent = 'Recherche impossible : ' + e.message + '.';
  }
}

function ligneBiblio(l, connecte, abonne){
  const li = document.createElement('li');
  const nom = document.createElement('span');
  nom.className = 't';
  nom.textContent = l.name;
  li.appendChild(nom);

  const utiliser = document.createElement('button');
  utiliser.className = 'mini';
  utiliser.textContent = connecte ? 'Utiliser' : 'Ouvrir avec un compte';
  utiliser.onclick = async () => {
    if (!connecte){ Compte.ouvrir('register'); Compte.mode('register'); return; }
    try {
      const r = await Compte.appel('list_open', null, { t: l.share_token });
      ouvrirSelection(r.list, true);
    } catch(e){ $('biblio-note').textContent = 'Ouverture impossible : ' + e.message + '.'; }
  };
  li.appendChild(utiliser);

  if (connecte){
    const garder = document.createElement('button');
    garder.className = 'mini';
    garder.textContent = 'Enregistrer chez moi';
    garder.onclick = async () => {
      try {
        const r = await Compte.appel('list_borrow', { token: l.share_token });
        await chargerMesListes();
        $('biblio-note').textContent = r.already
          ? 'Elle était déjà dans tes listes.'
          : '« ' + l.name + ' » est enregistrée dans tes listes.';
      } catch(e){ $('biblio-note').textContent = 'Impossible : ' + e.message + '.'; }
    };
    li.appendChild(garder);
  }

  const signaler = document.createElement('button');
  signaler.className = 'mini del';
  signaler.textContent = 'Signaler';
  signaler.onclick = async () => {
    if (!window.confirm('Signaler cette liste comme inappropriée ?')) return;
    try {
      const r = await Compte.appel('list_report', { id: l.id });
      $('biblio-note').textContent = (r.count >= 3)
        ? 'Merci. Cette liste est retirée en attendant vérification.'
        : 'Merci, le signalement est enregistré.';
    } catch(e){ $('biblio-note').textContent = 'Signalement impossible : ' + e.message + '.'; }
  };
  li.appendChild(signaler);

  const meta = document.createElement('span');
  meta.className = 'meta';
  meta.textContent = (l.proprietaire ? 'de ' + l.proprietaire + ' · ' : '')
    + l.verbs.length + ' verbes'
    + (l.tenses && l.tenses.length ? ' · ' + l.tenses.length + ' temps' : '');
  li.appendChild(meta);
  return li;
}

/* =========================================================
   Tous les verbes
   ========================================================= */
let V = MOTEURS.fr.verbes;
const LETTRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function groupeDe(v){
  if (langueVerbes === 'en'){
    return V.parGroupe.irreguliers.indexOf(v) >= 0 ? 'irr.' : 'rég.';
  }
  if (langueVerbes === 'it'){
    if (V.parGroupe.are.indexOf(v) >= 0) return '-are';
    if (V.parGroupe.ere.indexOf(v) >= 0) return '-ere';
    return '-ire';
  }
  if (langueVerbes === 'de'){
    if (V.parGroupe.separables.indexOf(v) >= 0) return 'part.';
    return V.parGroupe.forts.indexOf(v) >= 0 ? 'fort' : 'faible';
  }
  if (V.parGroupe.g1.indexOf(v) >= 0) return '1er';
  if (V.parGroupe.g2.indexOf(v) >= 0) return '2e';
  return '3e';
}


function verbesFiltres(){
  const q = $('verbe-consulte').value.trim().toLowerCase();
  const g = $('liste-groupe').value;
  const groupe = V.parGroupe[g];
  const base = (g && groupe) ? groupe.slice().sort((a, b) => a.localeCompare(b, 'fr')) : V.tous;
  if (!q) return base;
  const sansAcc = C.sansAccent(q);
  return base.filter(v => C.sansAccent(v).indexOf(sansAcc) >= 0);
}

function peindreListe(){
  const liste = verbesFiltres();
  const box = $('liste-verbes');
  box.innerHTML = '';

  const parLettre = {};
  liste.forEach(v => {
    const l = V.lettre(v);
    (parLettre[l] = parLettre[l] || []).push(v);
  });

  // l'alphabet : les lettres sans verbe restent visibles mais inertes
  const nav = $('alphabet');
  nav.innerHTML = '';
  LETTRES.forEach(l => {
    const b = document.createElement('button');
    b.textContent = l;
    b.disabled = !parLettre[l];
    b.onclick = () => {
      const cible = $('lettre-' + l);
      if (cible) cible.scrollIntoView({ behavior:'smooth', block:'start' });
    };
    nav.appendChild(b);
  });

  Object.keys(parLettre).sort().forEach(l => {
    const bloc = document.createElement('div');
    bloc.className = 'bloc-lettre';
    bloc.id = 'lettre-' + l;
    const h = document.createElement('h3');
    h.textContent = l;
    bloc.appendChild(h);
    const mots = document.createElement('div');
    mots.className = 'mots';
    parLettre[l].forEach(v => {
      const b = document.createElement('button');
      b.innerHTML = echappe(v) + '<span class="g">' + groupeDe(v) + '</span>';
      b.onclick = () => ouvrirVerbe(v);
      mots.appendChild(b);
    });
    bloc.appendChild(mots);
    box.appendChild(bloc);
  });

  $('liste-note').textContent = liste.length
    ? liste.length + ' verbes' + ($('verbe-consulte').value.trim() ? ' trouvés' : ' dans la liste')
      + '. Un verbe absent de la liste se conjugue tout de même : écris-le dans le champ ci-dessus.'
    : 'Aucun verbe de la liste ne correspond. Le moteur conjugue pourtant aussi ceux qui n\u2019y figurent pas.';
}

function ouvrirVerbe(v){
  $('verbe-consulte').value = v;
  consulter();
  aller('consulter');
}

$('retour-liste').onclick = () => {
  $('verbe-consulte').value = '';
  consulter();
};
$('ajouter-ce-verbe').onclick = () => {
  const v = $('verbe-consulte').value.trim().toLowerCase();
  if (!v || !C.connait(v)) return;
  ajouterVerbes(v);
  aller('composer');
};
$('liste-groupe').addEventListener('change', peindreListe);

/* =========================================================
   Consulter un verbe
   ========================================================= */
/* Un seul écran pour chercher et pour consulter : tant que la saisie ne
   désigne pas un verbe connu, on montre la liste filtrée ; dès qu'elle en
   désigne un, sa conjugaison prend la place. */
function consulter(){
  const v = $('verbe-consulte').value.trim().toLowerCase();
  const box = $('tableau');
  const conj = v ? C.conjugue(v) : null;

  $('zone-tableau').hidden = !conj;
  $('zone-liste').hidden = !!conj;
  $('consulte-note').className = 'status';

  if (!conj){
    box.innerHTML = '';
    peindreListe();
    $('consulte-note').textContent = (v && !C.connait(v))
      ? 'Aucun verbe ne porte ce nom. La liste ci-dessous montre ce qui s\u2019en approche.'
      : '';
    return;
  }

  $('consulte-note').className = 'status';
  // la carte d'identité d'un verbe n'est pas la même d'une langue à l'autre
  if (langueVerbes === 'de'){
    const connuDe = V.tous.indexOf(v) >= 0;
    $('consulte-note').textContent =
      (conj.fort ? 'verbe fort' : 'verbe faible')
      + (conj.trennbar ? ' · particule séparable : ' + conj.praefix : '')
      + ' · auxiliaire : ' + conj.hilfsverb
      + ' · Präteritum : ' + conj.praeteritum[0]
      + ' · Partizip II : ' + conj.partizipII[0]
      + (connuDe ? '' : ' · absent de la liste');
  } else if (langueVerbes === 'it'){
    const connu = V.tous.indexOf(v) >= 0;
    $('consulte-note').textContent =
      conj.groupe ? ('verbe en -' + conj.groupe + (conj.isc ? ' (en -isc-)' : '')
        + ' · auxiliaire : ' + conj.ausiliare
        + ' · participio : ' + conj.participio[0]
        + ' · gerundio : ' + conj.gerundio[0]
        + (conj.irregulier ? ' · irrégulier' : '')
        + (connu ? '' : ' · absent de la liste')) : '';
  } else if (langueVerbes === 'en'){
    const connu = V.tous.indexOf(v) >= 0;
    $('consulte-note').textContent =
      (conj.irregulier ? 'verbe irrégulier' : 'verbe régulier')
      + ' · ' + conj.base + ' / ' + conj.preterit + ' / ' + conj.participe
      + ' · 3e personne : ' + conj.troisieme
      + (connu ? '' : ' · absent de la liste : conjugué comme un régulier');
  } else {
    $('consulte-note').textContent = (V.tous.indexOf(v) >= 0 ? groupeDe(v) + ' groupe · ' : '')
      + 'auxiliaire : ' + conj.auxiliaire
      + ' · participe passé : ' + conj.participePasse
      + (conj.participePresent ? ' · participe présent : ' + conj.participePresent : '');
  }

  let html = '';
  let modeCourant = '';
  C.TEMPS.forEach(t => {
    const formes = conj[t.code];
    if (!formes || !formes.some(f => f)) return;
    if (t.mode !== modeCourant){
      modeCourant = t.mode;
      html += '<h3 class="mode-titre">' + modeCourant + '</h3>';
    }
    html += '<div class="temps-bloc"><h4>' + t.nom + '</h4><ul>';
    if (t.pers !== 6){
      formes.forEach((f, i) => {
        if (f) html += '<li><span class="p">' + (t.imperatif ? '' : '') + '</span>' + echappe(f) + '</li>';
      });
    } else {
      formes.forEach((f, i) => {
        if (!f || f === '—') return;   // « potere » n'a pas d'impératif
        html += '<li><span class="p">' + echappe(C.sujet(t.code, i, f)) + '</span>' + echappe(f) + '</li>';
      });
    }
    html += '</ul></div>';
  });
  box.innerHTML = html;
}


/* =========================================================
   Le nom de l'onglet dit ce qu'on est en train de faire.
   « Créer une sélection » pendant qu'on en modifie une déjà enregistrée
   laisse croire qu'on en fabrique une seconde.
   ========================================================= */
function majOngletComposer(etat){
  const b = document.getElementById('onglet-composer');
  if (!b) return;
  b.textContent = (etat === 'reprise') ? 'Modifier la sélection'
    : (etat === 'modifier') ? 'Modifier la sélection'
    : 'Créer une sélection';
  const note = document.getElementById('note-origine');
  if (note){
    note.hidden = (etat !== 'reprise');
  }
}

/* =========================================================
   Navigation
   ========================================================= */
const ECRANS = ['composer', 'exercice', 'bilan', 'listes', 'biblio', 'liste', 'resultats'];
/* On ne peut pas s'entraîner sans sélection : la fenêtre le dit et
   propose les trois chemins qui y mènent. */
/** Une série est en cours tant qu'il reste des questions à poser. */
function exerciceEnCours(){
  return state.questions && state.questions.length > 0 && state.index < state.questions.length;
}

function aller(nom){
  if (nom === 'exercice' && !exerciceEnCours() && !verbesChoisisTotal().length){
    Avis.fenetre('Il n\u2019y a encore rien à travailler',
      'Pour t\u2019entraîner, il faut des verbes. Ajoute-les toi-même, reprends une de tes '
        + 'sélections, ou vas en chercher une dans la bibliothèque partagée.',
      [{ texte:'Ajouter des verbes', principal:true, action: () => { aller('composer'); $('ajout-verbe').focus(); } },
       { texte:'Mes listes', action: () => aller('listes') },
       { texte:'La bibliothèque', action: () => aller('biblio') }]);
    return;
  }
  ECRANS.forEach(e => { $('ecran-' + e).className = 'panel' + (e === nom ? ' on' : ''); });
  if (nom === 'resultats') chargerResultats();
  if (nom === 'listes') chargerMesListes();
  if (nom === 'biblio') chercherBiblio();
  if (nom === 'liste' && !$('liste-verbes').innerHTML) peindreListe();
  document.querySelectorAll('.step').forEach(b => {
    const cible = b.dataset.ecran;
    b.setAttribute('aria-current', cible === nom ? 'true' : 'false');
  });
  window.scrollTo({ top:0, behavior:'smooth' });
}

document.querySelectorAll('.step').forEach(b => {
  b.onclick = () => aller(b.dataset.ecran);
});

$('composer-btn').onclick = composer;

$('imprimer-btn').onclick = () => {
  if (!Compte.connecte() || !Compte.abonne()){
    dire('L\u2019impression fait partie de l\u2019abonnement. L\u2019exercice à l\u2019écran, lui, reste gratuit.', 'err');
    if (Compte.connecte()) setTimeout(() => { window.location.href = 'abonnement.html'; }, 1400);
    else { Compte.ouvrir('register'); Compte.mode('register'); }
    return;
  }
  const questions = tirage();
  if (!questions) return;
  construireFeuille(questions);
  dire(questions.length + ' questions et leur corrigé sont prêts. Dans la fenêtre d\u2019impression, '
     + 'choisis « Enregistrer au format PDF ».', 'ok');
  setTimeout(() => window.print(), 120);
};
$('verifier').onclick = verifier;
$('abandonner').onclick = () => { if (state.reponses.length) bilan(); else aller('composer'); };
$('recommencer').onclick = () => { composer(); };
$('nouvel-exercice').onclick = () => aller('composer');
$('indice').onclick = () => {
  const q = state.questions[state.index];
  $('indice-texte').hidden = false;
  $('indice-texte').textContent = 'Le verbe commence par « ' + q.attendu.slice(0, 2) + '… » et compte '
    + q.attendu.replace(/\s/g, '').length + ' lettres.';
};
$('reponse').addEventListener('keydown', (e) => { if (e.key === 'Enter'){ e.preventDefault(); verifier(); } });
$('verbe-consulte').addEventListener('input', consulter);

function cocherTout(valeur){
  document.querySelectorAll('.temps').forEach(i => { i.checked = valeur; });
  memoriser();
}
/* ---------- la sélection : ajouter, vider, enregistrer ---------- */
$('ajouter-verbe').onclick = () => { ajouterVerbes($('ajout-verbe').value); $('ajout-verbe').value = ''; };
$('ajout-verbe').addEventListener('keydown', (e) => {
  if (e.key === 'Enter'){ e.preventDefault(); $('ajouter-verbe').onclick(); }
});
$('vider-verbes').onclick = () => { verbesChoisis = []; peindreVerbes(); direVerbes(''); };
$('vers-mes-listes').onclick = () => aller('listes');

$('liste-nouvelle').onclick = () => {
  listeOuverte = null;
  majOngletComposer('neuf');
  verbesChoisis = [];
  $('liste-nom').value = '';
  $('liste-publique').checked = false;
  peindreVerbes();
  direListe('Nouvelle sélection.', '');
};

$('liste-enregistrer').onclick = async () => {
  if (!Compte.connecte()){
    Compte.ouvrir('register'); Compte.mode('register');
    return;
  }
  const nom = $('liste-nom').value.trim();
  if (!nom){ direListe('Donne un nom à cette sélection.', 'err'); $('liste-nom').focus(); return; }
  if (!verbesChoisis.length){ direListe('Ajoute au moins un verbe.', 'err'); return; }
  const temps = tempsChoisis();
  if (!temps.length){ direListe('Choisis au moins un temps.', 'err'); return; }

  try {
    const corps = { name:nom, verbs:verbesChoisis, tenses:temps,
                    is_public:$('liste-publique').checked, langue:langueVerbes };
    if (listeOuverte) corps.id = listeOuverte.id;
    const r = await Compte.appel('list_save', corps);
    await chargerMesListes();
    listeOuverte = mesListes.find(l => l.id === (corps.id || r.id)) || null;
    Avis.succes('« ' + nom + ' » est enregistrée' + ($('liste-publique').checked ? ' et publiée.' : '.'));
    direListe('', '');
  } catch(e){
    direListe('Enregistrement impossible : ' + e.message + '.', 'err');
  }
};

$('tout-cocher').onclick = () => cocherTout(true);
$('tout-decocher').onclick = () => cocherTout(false);

/* =========================================================
   Compte : mémoriser les réglages et les résultats
   ========================================================= */
const Compte = window.Compte;
let reglagesCharges = false;

function reglagesActuels(){
  return {
    langue: langueVerbes,
    verbes: verbesChoisis.slice(0, 200),
    temps: tempsChoisis(),
    nb: $('nb-questions').value
  };
}
function appliquerReglages(r){
  if (!r) return;
  if (r.langue && MOTEURS[r.langue] && r.langue !== langueVerbes) changerLangueVerbes(r.langue);
  if (Array.isArray(r.verbes) && r.verbes.length){
    verbesChoisis = r.verbes.filter(v => C.connait(v));
    peindreVerbes();
  }
  if (Array.isArray(r.temps) && r.temps.length){
    document.querySelectorAll('.temps').forEach(i => { i.checked = r.temps.indexOf(i.value) >= 0; });
  }
  if (r.nb) $('nb-questions').value = r.nb;
}

let minuteur = null;
function memoriser(){
  if (!reglagesCharges || !Compte.connecte()) return;
  clearTimeout(minuteur);
  minuteur = setTimeout(() => {
    Compte.appel('settings', { settings: Object.assign(reglagesServeur || {}, { conjugaison: reglagesActuels() }) })
          .catch(() => {});
  }, 700);
}

let reglagesServeur = null;
async function chargerReglages(){
  reglagesCharges = false;
  if (Compte.connecte()){
    try {
      const r = await Compte.appel('settings');
      reglagesServeur = r.settings || {};
      appliquerReglages(reglagesServeur.conjugaison);
    } catch(e){ reglagesServeur = {}; }
  }
  reglagesCharges = true;
}

/* Le bilan rejoint l'historique du compte, celui-là même que
   remplit La dictée : un élève y voit ses deux entraînements. */
async function enregistrerBilan(bons, total){
  if (!Compte.connecte() || !Compte.abonne()) return;
  const noms = tempsChoisis().map(nomTemps);
  const etiquette = 'Conjugaison · ' + (noms.length > 2 ? noms.length + ' temps' : noms.join(', '));
  try {
    await Compte.appel('attempt_save', {
      label: etiquette.slice(0, 110), words: total, correct: bons, errors: total - bons
    });
    chargerResultats();
  } catch(e){}
}

async function chargerResultats(){
  const ul = $('res-liste');
  const ouvert = Compte.connecte();   // un compte gratuit garde déjà cinq éléments
  $('res-hors-compte').hidden = ouvert || !Compte.disponible();
  if (!ouvert){
    $('res-hors-compte').querySelector('p').textContent = Compte.connecte()
      ? 'Le suivi des résultats fait partie de l\u2019abonnement. Les exercices, eux, restent gratuits et sans limite.'
      : 'Sans compte, les résultats disparaissent en fermant l\u2019onglet. Un compte et un abonnement les gardent d\u2019une séance à l\u2019autre.';
    $('res-inscription').textContent = Compte.connecte() ? 'Voir l\u2019abonnement' : 'Créer un compte';
    ul.innerHTML = '';
    $('res-note').textContent = Compte.disponible()
      ? ''
      : 'Les résultats demandent une connexion au serveur du site.';
    return;
  }
  try {
    const r = await Compte.appel('attempts');
    const list = r.attempts || [];
    ul.innerHTML = '';
    list.forEach(a => {
      const li = document.createElement('li');
      const g = document.createElement('span');
      g.innerHTML = '<b>' + echappe(a.label) + '</b>';
      const d = new Date(String(a.created_at || '').replace(' ', 'T'));
      const q = document.createElement('span');
      q.className = 'faux-mot';
      q.textContent = a.correct + '/' + a.words
        + (isNaN(d) ? '' : ' · ' + d.toLocaleDateString('fr-FR', { day:'numeric', month:'short' }));
      li.appendChild(g); li.appendChild(q);
      ul.appendChild(li);
    });
    $('res-note').textContent = list.length
      ? 'Quinze dernières séries, dictées et conjugaison confondues.'
      : 'Aucune série terminée pour l\u2019instant.';
  } catch(e){
    ul.innerHTML = '';
    $('res-note').textContent = 'Résultats indisponibles : ' + e.message + '.';
  }
}

$('res-inscription').onclick = () => {
  if (Compte.connecte()){ window.location.href = 'abonnement.html'; return; }
  Compte.ouvrir('register'); Compte.mode('register');
};
$('nb-questions').addEventListener('change', memoriser);
document.addEventListener('change', (e) => {
  if (e.target && e.target.className && String(e.target.className).indexOf('temps') >= 0) memoriser();
});

/* =========================================================
   Démarrage
   ========================================================= */
$('c-langue').onchange = () => changerLangueVerbes($('c-langue').value);
remplirTemps();
peindreRaccourcis();
peindreVerbes();
peindreListe();
consulter();

$('biblio-go').onclick = chercherBiblio;
$('biblio-q').addEventListener('input', () => {
  clearTimeout(biblioMinuteur);
  biblioMinuteur = setTimeout(chercherBiblio, 400);
});
$('verbe-consulte').addEventListener('input', consulter);

Compte.demarrer(async () => {
  await chargerReglages();
  await chargerMesListes();
  chargerResultats();
});

// liste reçue par un lien : ?l=…
(async function listeRecue(){
  let t = null;
  try { t = new URLSearchParams(window.location.search).get('l'); } catch(e){}
  if (!t) return;
  try { history.replaceState(null, '', window.location.pathname); } catch(e){}
  try {
    const r = await Compte.appel('list_open', null, { t: t });
    ouvrirSelection(r.list, true);
    dire('Liste reçue : « ' + r.list.name + ' », ' + r.list.verbs.length
       + ' verbes. Elle est chargée, prête à être travaillée.', 'ok');
  } catch(e){
    dire('Ce lien de liste ne fonctionne plus.', 'err');
  }
})();

/* =========================================================
   Contrôle de version
   Une page servie depuis le cache du navigateur, ou un fichier
   oublié lors de l'envoi, produisent des pannes incompréhensibles.
   Autant les nommer.
   ========================================================= */
(function verifierVersion(){
  const VERSION = '2026-11-05';
  const corps = document.body || document.documentElement;
  const page = (corps && corps.getAttribute) ? corps.getAttribute('data-version') : null;
  if (page === VERSION) return;
  const message = 'La page (' + (page || 'version inconnue') + ') et le script (' + VERSION
    + ') ne correspondent pas. Recharge en vidant le cache — Ctrl+Maj+R, ou Cmd+Maj+R sur Mac —'
    + ' et vérifie que tous les fichiers ont bien été envoyés sur le serveur.';
  console.warn('[teaching] ' + message);
  if (window.alerter) window.alerter(message);
})();

/* La feuille de style doit suivre : voir --css-version */
(function(){
  const V = '2026-11-05';
  if (window.verifierStyles) window.verifierStyles(V);
})();
