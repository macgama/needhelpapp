"use strict";

/* =========================================================
   Le vocabulaire : composer des listes bilingues et les apprendre.
   Les exercices sont ouverts à tous ; garder, partager et suivre
   ses résultats demandent un compte abonné, comme ailleurs.
   ========================================================= */
const $ = (id) => document.getElementById(id);
const Compte = window.Compte;

const LANGUES = { fr:'français', de:'allemand', en:'anglais', it:'italien' };
const DRAPEAUX = { fr:'FR', de:'DE', en:'EN', it:'IT' };

let mots = [];              // [{source, target, note}]
let listeOuverte = null;    // liste enregistrée en cours d'édition
let mesListes = [];
let biblioMinuteur = null;

const state = { questions:[], index:0, reponses:[], indice:false, source:'fr', cible:'de' };

/** Une série est en cours tant qu'il reste des questions à poser. */
function enCours(){
  return state.questions.length > 0 && state.index < state.questions.length;
}

function dire(zone, msg, genre){
  const e = $(zone);
  if (!e) return;
  e.className = 'status' + (genre ? ' ' + genre : '');
  e.textContent = msg || '';
}
function echappe(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}


/* =========================================================
   Le nom de l'onglet dit ce qu'on est en train de faire.
   « Créer une liste » pendant qu'on en modifie une déjà enregistrée
   laisse croire qu'on en fabrique une seconde.
   ========================================================= */
function majOngletComposer(etat){
  const b = document.getElementById('onglet-composer');
  if (!b) return;
  b.textContent = (etat === 'reprise') ? 'Modifier la liste'
    : (etat === 'modifier') ? 'Modifier la liste'
    : 'Créer une liste';
  const note = document.getElementById('note-origine');
  if (note){
    note.hidden = (etat !== 'reprise');
  }
}

/* =========================================================
   Navigation
   ========================================================= */
const ECRANS = ['composer', 'cartes', 'cartes-bilan', 'exercice', 'bilan', 'listes', 'biblio', 'resultats'];

/* On peut cliquer sur « S'entraîner » sans avoir composé : dans ce cas on
   lance une série avec les mots à l'écran, et à défaut on renvoie vers la
   composition en disant pourquoi. Un écran vide n'explique rien. */
/* Cliquer sur « S'entraîner » sans avoir de mots ne doit pas mener à un
   écran vide : on explique ce qui manque, et on donne les trois chemins
   qui y remédient. */
/** Affiche un écran, sans poser de question. */
function montrer(nom){
  ECRANS.forEach(e => { $('ecran-' + e).className = 'panel' + (e === nom ? ' on' : ''); });
  document.querySelectorAll('.step').forEach(b => {
    b.setAttribute('aria-current', b.dataset.ecran === nom ? 'true' : 'false');
  });
  window.scrollTo({ top:0, behavior:'smooth' });
}

function riendAtravailler(quoi){
  Avis.fenetre(
    'Il n\u2019y a encore rien à travailler',
    'Pour ' + quoi + ', il faut des mots. Saisis-les toi-même, reprends une de tes listes, '
      + 'ou vas en chercher une dans la bibliothèque partagée.',
    [
      { texte: 'Créer une liste', principal: true, action: () => { montrer('composer'); $('v-nom').focus(); } },
      { texte: 'Mes listes', action: () => aller('listes') },
      { texte: 'La bibliothèque', action: () => aller('biblio') }
    ]
  );
}

function aller(nom){
  if (nom === 'cartes' && !paquetEnCours()){
    if (motsRetenus().length < 1){ riendAtravailler('réviser avec les cartes'); return; }
    lancerCartes();
    return;
  }
  if (nom === 'exercice' && !enCours()){
    const prets = motsRetenus();
    if (prets.length >= 2){
      lancer(preparerQuestions(prets, parseInt($('v-nb').value, 10), $('v-sens').value));
      return;
    }
    if (!motsRemplis().length){ riendAtravailler('t\u2019entraîner'); return; }
    montrer('composer');
    dire('v-compose-note', 'Coche au moins deux mots à travailler.', 'err');
    return;
  }
  montrer(nom);
  if (nom === 'listes') chargerMesListes();
  if (nom === 'biblio') chercherBiblio();
  if (nom === 'resultats') chargerResultats();
}
document.querySelectorAll('.step').forEach(b => { b.onclick = () => aller(b.dataset.ecran); });

/* =========================================================
   Les langues
   ========================================================= */
function remplirLangues(){
  const options = (sel, exclu) => {
    const garde = sel.value;
    sel.innerHTML = '';
    Object.keys(LANGUES).forEach(code => {
      if (code === exclu) return;      // on n'apprend pas sa propre langue
      const o = document.createElement('option');
      o.value = code;
      o.textContent = LANGUES[code];
      sel.appendChild(o);
    });
    if (garde && garde !== exclu) sel.value = garde;
  };
  options($('langue-source'), null);
  options($('langue-cible'), $('langue-source').value);
  [$('v-filtre-langue'), $('v-biblio-langue')].forEach(sel => {
    sel.innerHTML = '<option value="">Toutes les langues</option>';
    Object.keys(LANGUES).forEach(code => {
      const o = document.createElement('option');
      o.value = code;
      o.textContent = LANGUES[code];
      sel.appendChild(o);
    });
  });
}

/* Deux langues identiques n'ont pas de sens : on décale la seconde. */
/* La langue maternelle est retirée de la liste des langues apprises :
   proposer « français → français » n'aurait aucun sens. */
function verifierLangues(){
  const source = $('langue-source').value;
  const cibleAvant = $('langue-cible').value;

  const sel = $('langue-cible');
  sel.innerHTML = '';
  Object.keys(LANGUES).forEach(code => {
    if (code === source) return;
    const o = document.createElement('option');
    o.value = code;
    o.textContent = LANGUES[code];
    sel.appendChild(o);
  });
  const premier = sel.options && sel.options.length ? sel.options[0].value : '';
  sel.value = (cibleAvant && cibleAvant !== source) ? cibleAvant : premier;

  state.source = source;
  state.cible = sel.value;
  $('entete-source').textContent = LANGUES[state.source];
  $('entete-cible').textContent = LANGUES[state.cible];
  memoriser();
  peindreMots();
}

/* =========================================================
   La saisie des mots
   ========================================================= */
function ligneMot(m, i){
  const l = document.createElement('div');
  l.className = 'mot-ligne' + (m.choisi === false ? ' ecarte' : '');

  // la case décide de ce qu'on travaille aujourd'hui, sans toucher à la liste
  const coche = document.createElement('input');
  coche.type = 'checkbox';
  coche.checked = m.choisi !== false;
  coche.title = 'Travailler ce mot';
  // taille posée ici aussi : si la feuille de style est en retard, la case
  // ne s'étire pas sur toute la colonne et la ligne reste lisible
  coche.style.width = '18px';
  coche.style.height = '18px';
  coche.style.minHeight = '0';
  coche.style.padding = '0';
  coche.onchange = () => {
    mots[i].choisi = coche.checked;
    l.className = 'mot-ligne' + (coche.checked ? '' : ' ecarte');
    majCompteMots();
  };
  l.appendChild(coche);

  const a = document.createElement('input');
  a.type = 'text'; a.value = m.source; a.placeholder = LANGUES[state.source];
  a.oninput = () => { mots[i].source = a.value; majCompteMots(); };

  const b = document.createElement('input');
  b.type = 'text'; b.value = m.target; b.placeholder = LANGUES[state.cible];
  b.oninput = () => { mots[i].target = b.value; majCompteMots(); };

  const n = document.createElement('input');
  n.type = 'text'; n.value = m.note; n.placeholder = 'note'; n.className = 'note';
  n.oninput = () => { mots[i].note = n.value; };

  const x = document.createElement('button');
  x.className = 'retirer'; x.textContent = '×'; x.title = 'Retirer cette ligne';
  x.onclick = () => { mots.splice(i, 1); peindreMots(); };

  // Entrée sur la dernière ligne en ajoute une : on saisit sans quitter le clavier
  [a, b, n].forEach(champ => {
    champ.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (i === mots.length - 1) ajouterLigne();
      const suivante = $('v-mots').children[i + 1];
      if (suivante) suivante.querySelector('input').focus();
    });
  });

  [a, b, n, x].forEach(el => l.appendChild(el));
  return l;
}

function peindreMots(){
  const box = $('v-mots');
  box.innerHTML = '';
  if (!mots.length){
    for (let i = 0; i < 8; i++) mots.push({ source:'', target:'', note:'', choisi:true });
  }
  mots.forEach((m, i) => box.appendChild(ligneMot(m, i)));
  majCompteMots();
}

function ajouterLigne(){
  mots.push({ source:'', target:'', note:'', choisi:true });
  peindreMots();
  const dernier = $('v-mots').lastChild;
  if (dernier) dernier.querySelector('input').focus();
}

/** Toutes les paires complètes de la liste. C'est ce qui s'enregistre. */
function motsRemplis(){
  return mots.filter(m => String(m.source).trim() && String(m.target).trim())
             .map(m => ({ source:m.source.trim(), target:m.target.trim(),
                          note:String(m.note || '').trim(), choisi:m.choisi !== false }));
}

/** Celles que l'on travaille maintenant. C'est ce qui alimente l'exercice. */
function motsRetenus(){
  return motsRemplis().filter(m => m.choisi);
}

function majCompteMots(){
  const total = motsRemplis().length;
  const retenus = motsRetenus().length;
  if (!total){
    $('v-compte-mots').textContent = 'Aucune paire complète : il faut les deux colonnes.';
    return;
  }
  $('v-compte-mots').textContent = (retenus === total)
    ? total + (total > 1 ? ' mots, tous retenus.' : ' mot.')
    : retenus + ' mot' + (retenus > 1 ? 's' : '') + ' retenu' + (retenus > 1 ? 's' : '')
      + ' sur ' + total + '. Seuls ceux-là seront demandés.';
}

function cocherTous(oui){
  mots.forEach(m => { m.choisi = oui; });
  peindreMots();
}

$('v-ajouter-ligne').onclick = ajouterLigne;
$('v-tout-cocher').onclick = () => cocherTous(true);
$('v-tout-decocher').onclick = () => cocherTous(false);

$('v-coller').onclick = () => {
  const texte = window.prompt(
    'Colle ta liste, une paire par ligne.\nSépare les deux langues par une tabulation, un point-virgule ou « = ».\n\nExemple :\nla mère = die Mutter');
  if (!texte) return;
  const n = importerTexte(texte.replace(/\s+=\s+/g, '\t'));
  dire('v-note', n ? n + ' paires ajoutées.' : 'Aucune paire reconnue dans ce texte.', n ? 'ok' : 'err');
};

/* =========================================================
   Import d'un fichier
   Excel n'est pas lu directement : son format est une archive
   compressée qui demanderait une bibliothèque de plus, chargée
   depuis Internet, pour un gain nul — « Enregistrer sous → CSV »
   prend deux secondes et fonctionne partout, hors ligne compris.
   ========================================================= */

/** Découpe une ligne CSV en respectant les guillemets. */
function decouperCsv(ligne, sep){
  const cases = [];
  let courant = '';
  let dansGuillemets = false;
  for (let i = 0; i < ligne.length; i++){
    const c = ligne[i];
    if (c === '"'){
      if (dansGuillemets && ligne[i + 1] === '"'){ courant += '"'; i++; }
      else dansGuillemets = !dansGuillemets;
    } else if (c === sep && !dansGuillemets){
      cases.push(courant); courant = '';
    } else {
      courant += c;
    }
  }
  cases.push(courant);
  return cases.map(x => x.trim());
}

/** Le séparateur le plus probable : celui qui découpe le plus régulièrement. */
function devinerSeparateur(lignes){
  const candidats = ['\t', ';', ',', '|'];
  let meilleur = ';', score = 0;
  candidats.forEach(sep => {
    const compte = lignes.slice(0, 10).map(l => decouperCsv(l, sep).length);
    const min = Math.min.apply(null, compte);
    if (min >= 2 && min > score){ score = min; meilleur = sep; }
  });
  return meilleur;
}

function importerTexte(texte){
  texte = String(texte || '').replace(/^\uFEFF/, '');   // marque d'ordre des octets d'Excel
  const lignes = texte.split(/\r\n|\r|\n/).filter(l => l.trim());
  if (!lignes.length) return 0;

  const sep = devinerSeparateur(lignes);
  let ajoutes = 0;
  let premiere = true;

  lignes.forEach(ligne => {
    const cases = decouperCsv(ligne, sep);
    if (cases.length < 2) return;
    const [a, b, c] = cases;
    if (!a || !b) return;

    // une ligne d'en-têtes ne se traduit pas
    if (premiere){
      premiere = false;
      const entete = (a + ' ' + b).toLowerCase();
      if (/fran[cç]ais|allemand|anglais|italien|mot|word|traduction|deutsch|english/.test(entete)) return;
    }
    mots.push({ source:a, target:b, note:(c || '').trim(), choisi:true });
    ajoutes++;
  });
  mots = mots.filter(m => m.source || m.target);
  peindreMots();
  return ajoutes;
}

$('v-importer').onclick = () => $('v-fichier').click();

$('v-fichier').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  if (/\.xlsx?$/i.test(f.name)){
    dire('v-note', 'Les fichiers Excel ne se lisent pas directement. Dans Excel : '
      + 'Fichier → Enregistrer sous → « CSV UTF-8 (délimité par des virgules) », puis reprends ici.', 'err');
    e.target.value = '';
    return;
  }
  const lecteur = new FileReader();
  lecteur.onload = () => {
    const n = importerTexte(lecteur.result);
    dire('v-note', n
      ? n + (n > 1 ? ' paires importées' : ' paire importée') + ' depuis ' + f.name + '.'
      : 'Aucune paire reconnue. Il faut deux colonnes par ligne : le mot et sa traduction.',
      n ? 'ok' : 'err');
  };
  lecteur.onerror = () => dire('v-note', 'Lecture du fichier impossible.', 'err');
  lecteur.readAsText(f, 'UTF-8');
  e.target.value = '';
});

$('v-ajouter-dix').onclick = () => {
  for (let i = 0; i < 10; i++) mots.push({ source:'', target:'', note:'', choisi:true });
  peindreMots();
};

$('v-pretes').onclick = () => {
  const dispo = window.VocabPretes.filter(l => l.langue === state.cible);
  if (!dispo.length){
    dire('v-note', 'Aucune liste toute prête en ' + LANGUES[state.cible] + ' pour l\u2019instant.', '');
    return;
  }
  const choix = window.prompt('Quelle liste ?\n\n'
    + dispo.map((l, i) => (i + 1) + '. ' + l.nom + ' (' + l.chapitre + ')').join('\n'), '1');
  const i = parseInt(choix, 10) - 1;
  if (isNaN(i) || !dispo[i]) return;
  chargerPrete(dispo[i]);
};

function chargerPrete(l){
  listeOuverte = null;
  mots = l.mots.map(m => ({ source:m.s, target:m.t, note:m.n || '', choisi:true }));
  $('v-nom').value = l.nom;
  $('v-chapitre').value = l.chapitre;
  $('v-publique').checked = false;
  peindreMots();
  dire('v-note', 'Liste chargée. Tu peux t\u2019entraîner tout de suite, ou la modifier.', 'ok');
}

/* =========================================================
   L'exercice
   ========================================================= */
function sansAccent(s){
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/* Tolérance : casse, espaces, ponctuation d'entourage, et l'article
   initial que l'on oublie souvent — « die Mutter » ou « Mutter ». Les
   accents et les trémas, eux, comptent : ils font partie du mot. */
function normaliser(s){
  return String(s || '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.,;:!?"«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ARTICLES = /^(le|la|les|l'|un|une|des|der|die|das|den|dem|ein|eine|the|a|an|il|lo|la|i|gli|le|un|uno|una)\s+/;

function sansArticle(s){ return normaliser(s).replace(ARTICLES, ''); }
function articleDe(s){
  const m = normaliser(s).match(ARTICLES);
  return m ? m[1] : '';
}

/**
 * Trois verdicts, et non deux : « juste », « le mot est bon mais le
 * déterminant manque ou se trompe », et « faux ». La distinction compte :
 * en allemand comme en français, le genre s'apprend avec le mot, et un
 * enfant qui écrit « Mutter » n'a pas fait la même erreur que celui qui
 * écrit « Vater ».
 */
function juger(donnee, attendue, exigerArticle){
  const d = normaliser(donnee);
  if (!d) return { etat:'faux' };

  const variantes = String(attendue).split(/\s*[\/,]\s*/).map(x => x.trim()).filter(Boolean);
  for (const v of variantes){
    if (d === normaliser(v)) return { etat:'juste' };
  }
  for (const v of variantes){
    if (sansArticle(d) === sansArticle(v)){
      const attendu = articleDe(v);
      if (!attendu || !exigerArticle) return { etat:'juste' };
      return { etat:'article', attendu:v, article:attendu };
    }
  }
  return { etat:'faux' };
}

function preparerQuestions(source, nb, sens){
  const liste = source.slice();
  for (let i = liste.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [liste[i], liste[j]] = [liste[j], liste[i]];
  }
  const retenus = (nb > 0) ? liste.slice(0, Math.min(nb, liste.length)) : liste;
  return retenus.map(m => {
    const versLaLangue = (sens === 'melange') ? (Math.random() < 0.5) : (sens === 'vers');
    return {
      montre: versLaLangue ? m.source : m.target,
      attendu: versLaLangue ? m.target : m.source,
      note: m.note,
      sens: versLaLangue ? 'vers' : 'depuis'
    };
  });
}

$('v-commencer').onclick = () => {
  const source = motsRetenus();
  if (source.length < 2){
    dire('v-compose-note', motsRemplis().length >= 2
      ? 'Coche au moins deux mots à travailler.'
      : 'Il faut au moins deux paires complètes pour s\u2019entraîner.', 'err');
    return;
  }
  lancer(preparerQuestions(source, parseInt($('v-nb').value, 10), $('v-sens').value));
};

function lancer(questions){
  state.questions = questions;
  state.index = 0;
  state.reponses = [];
  aller('exercice');
  poser();
}

function poser(){
  const q = state.questions[state.index];
  state.indice = false;
  $('v-avance').textContent = 'Question ' + (state.index + 1) + ' sur ' + state.questions.length;
  $('v-barre').style.width = Math.round(state.index / state.questions.length * 100) + '%';
  $('v-consigne').textContent = q.sens === 'vers'
    ? 'Écris en ' + LANGUES[state.cible] + ' :'
    : 'Écris en ' + LANGUES[state.source] + ' :';
  $('v-mot').textContent = q.montre;
  $('v-indice-note').textContent = '';
  $('v-verdict').textContent = '';
  $('v-verdict').className = 'verdict';
  $('v-reponse').value = '';
  $('v-reponse').disabled = false;
  $('v-verifier').disabled = false;
  $('v-verifier').textContent = 'Vérifier';
  $('v-reponse').focus();
}

function verifier(){
  const q = state.questions[state.index];
  if ($('v-verifier').textContent !== 'Vérifier'){ suivante(); return; }

  const donnee = $('v-reponse').value;
  const verdict = juger(donnee, q.attendu, $('v-articles').checked);
  const juste = verdict.etat === 'juste';
  state.reponses.push({ q:q, donnee:donnee, juste:juste, etat:verdict.etat });

  $('v-verdict').className = 'verdict ' + (juste ? 'bon' : (verdict.etat === 'article' ? 'presque' : 'faux'));
  if (juste){
    $('v-verdict').textContent = 'Juste.' + (q.note ? ' (' + q.note + ')' : '');
  } else if (verdict.etat === 'article'){
    $('v-verdict').textContent = 'Le mot est bon, mais il faut son déterminant : ' + verdict.attendu;
  } else {
    $('v-verdict').textContent = 'On écrit : ' + q.attendu + (q.note ? ' (' + q.note + ')' : '');
  }
  $('v-reponse').disabled = true;
  $('v-verifier').textContent = (state.index + 1 < state.questions.length) ? 'Question suivante' : 'Voir le bilan';
}

function suivante(){
  state.index++;
  if (state.index >= state.questions.length){ bilan(); return; }
  poser();
}

$('v-verifier').onclick = verifier;
$('v-reponse').addEventListener('keydown', (e) => { if (e.key === 'Enter'){ e.preventDefault(); verifier(); } });

$('v-indice').onclick = () => {
  const q = state.questions[state.index];
  const a = String(q.attendu);
  $('v-indice-note').textContent = 'Commence par « ' + a.slice(0, Math.max(1, Math.ceil(a.length / 3)))
    + '… » et compte ' + a.replace(/\s/g, '').length + ' lettres.';
  state.indice = true;
};
$('v-passer').onclick = () => {
  const q = state.questions[state.index];
  state.reponses.push({ q:q, donnee:'', juste:false });
  suivante();
};
$('v-arreter').onclick = () => { if (state.reponses.length) bilan(); else aller('composer'); };

function bilan(){
  const justes = state.reponses.filter(r => r.juste).length;
  const total = state.reponses.length;
  $('v-score').textContent = justes + '/' + total;
  const part = total ? justes / total : 0;
  $('v-score-mot').textContent = part === 1 ? 'Sans faute !'
    : part >= 0.8 ? 'Très bien.' : part >= 0.5 ? 'En progrès.' : 'À revoir.';

  const fautes = state.reponses.filter(r => !r.juste);
  $('v-titre-fautes').hidden = !fautes.length;
  $('v-revoir-fautes').hidden = !fautes.length;
  const ul = $('v-fautes');
  ul.innerHTML = '';
  fautes.forEach(r => {
    const li = document.createElement('li');
    li.innerHTML = '<b>' + echappe(r.q.montre) + '</b> → ' + echappe(r.q.attendu)
      + (r.donnee ? ' <span class="ta-reponse">tu as écrit : ' + echappe(r.donnee) + '</span>' : '')
      + (r.q.note ? ' <span class="ta-reponse">' + echappe(r.q.note) + '</span>' : '');
    ul.appendChild(li);
  });
  aller('bilan');
  enregistrerBilan(justes, total);
}

$('v-recommencer').onclick = () => lancer(preparerQuestions(motsRetenus(), parseInt($('v-nb').value, 10), $('v-sens').value));
$('v-revoir-fautes').onclick = () => {
  const aRevoir = state.reponses.filter(r => !r.juste).map(r => ({
    source: r.q.sens === 'vers' ? r.q.montre : r.q.attendu,
    target: r.q.sens === 'vers' ? r.q.attendu : r.q.montre,
    note: r.q.note
  }));
  if (!aRevoir.length) return;
  lancer(preparerQuestions(aRevoir, 0, $('v-sens').value));
};
$('v-retour').onclick = () => aller('composer');

async function enregistrerBilan(justes, total){
  if (!Compte.connecte() || !Compte.abonne()){
    dire('v-bilan-note', Compte.connecte()
      ? 'Le suivi des résultats fait partie de l\u2019abonnement : celui-ci n\u2019a pas été enregistré.'
      : 'Crée un compte pour garder tes résultats et suivre tes progrès.', '');
    return;
  }
  try {
    await Compte.appel('vocab_attempt_save', {
      list_id: listeOuverte ? listeOuverte.id : 0,
      label: $('v-nom').value.trim() || 'Vocabulaire',
      direction: $('v-sens').value === 'depuis' ? 'depuis' : 'vers',
      asked: total, correct: justes, errors: total - justes
    });
    dire('v-bilan-note', 'Résultat enregistré dans ton profil.', 'ok');
  } catch(e){
    dire('v-bilan-note', 'Le résultat n\u2019a pas pu être enregistré : ' + e.message + '.', 'err');
  }
}

/* =========================================================
   La feuille imprimable
   Construite dans la page, que la feuille de style d'impression
   laisse seule visible. Le navigateur produit le PDF : rien à
   installer, et les mots ne quittent pas l'appareil.
   ========================================================= */
function construireFeuille(questions){
  const titre = $('v-nom').value.trim() || 'Vocabulaire';
  const chapitre = $('v-chapitre').value.trim();
  const aujourdhui = new Date().toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });

  const entete = (sousTitre) => {
    const e = document.createElement('div');
    e.className = 'feuille-entete';
    const h = document.createElement('h1');
    h.textContent = titre + (sousTitre ? ' — ' + sousTitre : '');
    e.appendChild(h);
    const i = document.createElement('div');
    i.className = 'infos';
    const g = document.createElement('span');
    g.textContent = (chapitre ? chapitre + ' · ' : '')
      + questions.length + ' mots · ' + LANGUES[state.source] + ' → ' + LANGUES[state.cible];
    const d = document.createElement('span');
    d.textContent = aujourdhui;
    i.appendChild(g); i.appendChild(d);
    e.appendChild(i);
    return e;
  };

  const qp = $('feuille-questions');
  qp.innerHTML = '';
  qp.appendChild(entete(''));

  const nom = document.createElement('p');
  nom.className = 'feuille-nom';
  nom.textContent = 'Nom : ............................................        Classe : ....................        Note :  ......... / ' + questions.length;
  qp.appendChild(nom);

  const consigne = document.createElement('p');
  consigne.className = 'feuille-consigne';
  consigne.textContent = $('v-articles').checked
    ? 'Traduis chaque mot. N\u2019oublie pas le déterminant.'
    : 'Traduis chaque mot sur les pointillés.';
  qp.appendChild(consigne);

  const ol = document.createElement('ol');
  // deux colonnes au-delà de quinze mots : une feuille au lieu de deux
  ol.className = 'feuille-questions' + (questions.length > 15 ? ' deux' : '');
  questions.forEach(q => {
    const li = document.createElement('li');
    const m = document.createElement('span');
    m.className = 'q-verbe';
    m.textContent = q.montre;
    const trait = document.createElement('span');
    trait.className = 'q-trait';
    li.appendChild(m);
    li.appendChild(document.createTextNode(' '));
    li.appendChild(trait);
    ol.appendChild(li);
  });
  qp.appendChild(ol);

  const pied = document.createElement('p');
  pied.className = 'feuille-pied';
  pied.textContent = 'Le corrigé se trouve sur la page suivante.';
  qp.appendChild(pied);

  const cp = $('feuille-corrige');
  cp.innerHTML = '';
  cp.appendChild(entete('corrigé'));
  const oc = document.createElement('ol');
  oc.className = 'feuille-corrige';
  questions.forEach(q => {
    const li = document.createElement('li');
    const a = document.createElement('span');
    a.textContent = q.montre + ' : ';
    const r = document.createElement('span');
    r.className = 'c-reponse';
    r.textContent = q.attendu + (q.note ? '  (' + q.note + ')' : '');
    li.appendChild(a); li.appendChild(r);
    oc.appendChild(li);
  });
  cp.appendChild(oc);
}

$('v-imprimer').onclick = () => {
  if (!Compte.connecte() || !Compte.abonne()){
    dire('v-compose-note', 'L\u2019impression fait partie de l\u2019abonnement. '
      + 'L\u2019exercice à l\u2019écran, lui, reste gratuit.', 'err');
    if (Compte.connecte()) setTimeout(() => { window.location.href = 'abonnement.html'; }, 1400);
    else { Compte.ouvrir('register'); Compte.mode('register'); }
    return;
  }
  const prets = motsRetenus();
  if (prets.length < 2){
    dire('v-compose-note', motsRemplis().length >= 2
      ? 'Coche au moins deux mots à imprimer.'
      : 'Il faut au moins deux paires complètes.', 'err');
    return;
  }
  const questions = preparerQuestions(prets, parseInt($('v-nb').value, 10), $('v-sens').value);
  construireFeuille(questions);
  dire('v-compose-note', questions.length + ' mots et leur corrigé sont prêts. '
     + 'Dans la fenêtre d\u2019impression, choisis « Enregistrer au format PDF ».', 'ok');
  setTimeout(() => window.print(), 120);
};

/* =========================================================
   Mes listes
   ========================================================= */
async function chargerMesListes(){
  const ouvert = Compte.connecte();   // un compte gratuit garde déjà cinq éléments
  const bloc = $('v-hors-compte');
  bloc.hidden = ouvert || !Compte.disponible();
  $('v-listes-box').hidden = !ouvert;
  if (!ouvert){
    bloc.querySelector('p').textContent = Compte.connecte()
      ? 'Un compte gratuit garde cinq listes et en reprend cinq. Publier et partager demandent un abonnement.'
      : 'Crée un compte pour garder tes listes : cinq gratuitement, sur chaque application.';
    $('v-inscription').textContent = 'Créer un compte';
    mesListes = [];
    return;
  }
  try {
    mesListes = (await Compte.appel('vocab_lists')).lists || [];
  } catch(e){ mesListes = []; }
  peindreMesListes();
}

function ligneListe(l){
  const li = document.createElement('li');

  const nom = document.createElement('span');
  nom.className = 'nom';
  nom.textContent = l.name;
  li.appendChild(nom);

  const paire = document.createElement('span');
  paire.className = 'badge';
  paire.textContent = DRAPEAUX[l.source] + ' → ' + DRAPEAUX[l.target];
  li.appendChild(paire);

  if (l.is_public){
    const b = document.createElement('span');
    b.className = 'badge pub'; b.textContent = 'publiée';
    li.appendChild(b);
  }
  if (l.borrowed){
    const b = document.createElement('span');
    b.className = 'badge'; b.textContent = 'reprise';
    li.appendChild(b);
  }

  const ouvrir = document.createElement('button');
  ouvrir.className = 'mini'; ouvrir.textContent = 'Ouvrir';
  ouvrir.onclick = () => ouvrirListe(l);
  li.appendChild(ouvrir);

  // publier et partager restent réservés aux abonnés
  if (!l.borrowed && Compte.abonne()){
    const pub = document.createElement('button');
    pub.className = 'mini';
    pub.textContent = l.is_public ? 'Dépublier' : 'Publier';
    pub.onclick = async () => {
      try {
        await Compte.appel('vocab_publish', { id:l.id, public: !l.is_public });
        await chargerMesListes();
        $('v-listes-note').textContent = l.is_public
          ? '« ' + l.name + ' » est retirée de la bibliothèque.'
          : '« ' + l.name + ' » est publiée.';
      } catch(e){ $('v-listes-note').textContent = 'Opération impossible : ' + e.message + '.'; }
    };
    li.appendChild(pub);

    const part = document.createElement('button');
    part.className = 'mini'; part.textContent = 'Partager';
    part.onclick = () => partagerListe(l);
    li.appendChild(part);
  }

  const suppr = document.createElement('button');
  suppr.className = 'mini del'; suppr.textContent = 'Supprimer';
  suppr.onclick = async () => {
    if (!window.confirm('Supprimer « ' + l.name + ' » et tous ses mots ?')) return;
    try { await Compte.appel('vocab_delete', { id:l.id }); } catch(e){}
    if (listeOuverte && listeOuverte.id === l.id) listeOuverte = null;
    chargerMesListes();
  };
  li.appendChild(suppr);

  const meta = document.createElement('p');
  meta.className = 'meta';
  const bouts = [];
  if (l.chapter) bouts.push(l.chapter);
  bouts.push(l.nb + (l.nb > 1 ? ' mots' : ' mot'));
  bouts.push(LANGUES[l.source] + ' → ' + LANGUES[l.target]);
  if (l.borrowed) bouts.push('partagée par ' + (l.origin_owner || 'un autre utilisateur'));
  meta.textContent = bouts.join(' · ');
  li.appendChild(meta);
  return li;
}

function filtrer(liste){
  const q = $('v-filtre').value.trim().toLowerCase();
  const langue = $('v-filtre-langue').value;
  return liste.filter(l => {
    if (langue && l.target !== langue) return false;
    if (!q) return true;
    return (l.name + ' ' + l.chapter).toLowerCase().indexOf(q) >= 0;
  });
}

function peindreMesListes(){
  const visibles = filtrer(mesListes);
  const miennes = visibles.filter(l => !l.borrowed);
  const reprises = visibles.filter(l => l.borrowed);
  $('v-mes-listes').innerHTML = '';
  $('v-reprises').innerHTML = '';
  miennes.forEach(l => $('v-mes-listes').appendChild(ligneListe(l)));
  reprises.forEach(l => $('v-reprises').appendChild(ligneListe(l)));
  $('v-titre-miennes').hidden = !miennes.length;
  $('v-titre-reprises').hidden = !reprises.length;
  $('v-listes-vide').hidden = visibles.length > 0;
  $('v-listes-vide').textContent = mesListes.length
    ? 'Aucune liste ne correspond à ce filtre.'
    : 'Aucune liste enregistrée. Compose-en une dans « Composer », puis enregistre-la.';
}

$('v-filtre').addEventListener('input', peindreMesListes);
$('v-filtre-langue').addEventListener('change', peindreMesListes);
$('v-inscription').onclick = () => {
  if (Compte.connecte()){ window.location.href = 'abonnement.html'; return; }
  Compte.ouvrir('register'); Compte.mode('register');
};

async function ouvrirListe(l){
  try {
    const r = await Compte.appel('vocab_list', null, { id: l.id });
    const d = r.list;
    // une liste reprise se modifie : elle devient alors la sienne
    listeOuverte = d;
    majOngletComposer(d.borrowed ? 'reprise' : 'modifier');
    mots = (d.words || []).map(m => ({ source:m.source, target:m.target, note:m.note, choisi:true }));
    $('v-nom').value = d.borrowed ? d.name + ' (reprise)' : d.name;
    $('v-chapitre').value = d.chapter;
    $('langue-source').value = d.source;
    $('langue-cible').value = d.target;
    verifierLangues();
    $('v-publique').checked = !!d.is_public && !d.borrowed;
    peindreMots();
    aller('composer');
    dire('v-note', d.borrowed
      ? 'Liste de ' + (l.origin_owner || 'quelqu\u2019un d\u2019autre') + '. Tu peux la modifier : elle deviendra la tienne, sans toucher à l\u2019originale.'
      : '« ' + d.name + ' » est ouverte. Enregistrer la remplacera.', 'ok');
  } catch(e){
    $('v-listes-note').textContent = 'Ouverture impossible : ' + e.message + '.';
  }
}

async function partagerListe(l){
  try {
    const r = await Compte.appel('vocab_share', { id:l.id });
    const url = window.location.origin + window.location.pathname + '?v=' + r.share_token;
    const issue = await Compte.partager('Vocabulaire : ' + l.name,
      'Voici une liste de vocabulaire à apprendre : « ' + l.name + ' ».', url);
    $('v-listes-note').textContent =
      issue === 'partage' ? 'Liste partagée.'
      : issue === 'copie' ? 'Lien copié : ' + url
      : issue === 'annule' ? '' : 'Lien à recopier : ' + url;
  } catch(e){
    $('v-listes-note').textContent = 'Partage impossible : ' + e.message + '.';
  }
}

/* =========================================================
   Enregistrer la liste composée
   ========================================================= */
$('v-nouvelle').onclick = () => {
  listeOuverte = null;
  majOngletComposer('neuf');
  mots = [];
  $('v-nom').value = '';
  $('v-chapitre').value = '';
  $('v-publique').checked = false;
  peindreMots();
  dire('v-note', 'Nouvelle liste.', '');
};

$('v-enregistrer').onclick = async () => {
  if (!Compte.connecte()){
    Avis.fenetre('Il faut un compte pour garder ta liste',
      'Un compte gratuit garde cinq listes par application, et cinq reprises dans chaque '
        + 'bibliothèque. La création prend une minute.',
      [{ texte:'Créer un compte', principal:true, action: () => { Compte.ouvrir('register'); Compte.mode('register'); } },
       { texte:'Plus tard' }]);
    return;
  }
  const nom = $('v-nom').value.trim();
  const remplis = motsRemplis();
  if (!nom){ Avis.erreur('Donne un nom à cette liste avant de l\u2019enregistrer.'); $('v-nom').focus(); return; }
  if (!remplis.length){ Avis.erreur('Il faut au moins une paire complète : le mot et sa traduction.'); return; }

  try {
    const corps = {
      name: nom,
      chapter: $('v-chapitre').value.trim(),
      source: $('langue-source').value,
      target: $('langue-cible').value,
      is_public: $('v-publique').checked,
      // la liste garde tous ses mots : la sélection ne vaut que pour la séance
      words: remplis.map(m => ({ source:m.source, target:m.target, note:m.note }))
    };
    if (listeOuverte) corps.id = listeOuverte.id;
    const r = await Compte.appel('vocab_save', corps);
    await chargerMesListes();
    listeOuverte = mesListes.find(l => l.id === (corps.id || r.id)) || null;
    majOngletComposer(listeOuverte ? 'modifier' : 'neuf');
    Avis.succes('« ' + nom + ' » est enregistrée : ' + r.mots
      + (r.mots > 1 ? ' mots' : ' mot') + ($('v-publique').checked ? ', et publiée.' : '.'));
    dire('v-note', '', '');
  } catch(e){
    Avis.erreur('Enregistrement impossible : ' + e.message + '.');
  }
};

/* =========================================================
   La bibliothèque partagée
   ========================================================= */
async function chercherBiblio(){
  const ul = $('v-biblio-liste');
  $('v-biblio-note').textContent = 'Recherche…';
  try {
    const r = await Compte.appel('vocab_library', null, {
      q: $('v-biblio-q').value.trim(), langue: $('v-biblio-langue').value
    });
    const listes = r.lists || [];
    ul.innerHTML = '';
    listes.forEach(l => ul.appendChild(ligneBiblio(l, r.connecte, r.abonne)));
    $('v-biblio-note').textContent = listes.length
      ? listes.length + (listes.length > 1 ? ' listes partagées.' : ' liste partagée.')
        + (r.connecte ? '' : ' Crée un compte pour les ouvrir.')
      : 'Aucune liste ne correspond pour l\u2019instant.';
  } catch(e){
    ul.innerHTML = '';
    $('v-biblio-note').textContent = 'Recherche impossible : ' + e.message + '.';
  }
}

function ligneBiblio(l, connecte, abonne){
  const li = document.createElement('li');
  const t = document.createElement('span');
  t.className = 't';
  t.textContent = l.name;
  li.appendChild(t);

  const langue = document.createElement('span');
  langue.className = 'badge';
  langue.textContent = DRAPEAUX[l.source] + ' → ' + DRAPEAUX[l.target];
  li.appendChild(langue);

  const utiliser = document.createElement('button');
  utiliser.className = 'mini';
  utiliser.textContent = connecte ? 'S\u2019entraîner' : 'Ouvrir avec un compte';
  utiliser.onclick = async () => {
    if (!connecte){ Compte.ouvrir('register'); Compte.mode('register'); return; }
    try {
      const r = await Compte.appel('vocab_open', null, { t: l.share_token });
      chargerDepuisPartage(r.list);
    } catch(e){ $('v-biblio-note').textContent = 'Ouverture impossible : ' + e.message + '.'; }
  };
  li.appendChild(utiliser);

  if (connecte){
    const garder = document.createElement('button');
    garder.className = 'mini';
    garder.textContent = 'Enregistrer chez moi';
    garder.onclick = async () => {
      try {
        const r = await Compte.appel('vocab_borrow', { token: l.share_token });
        await chargerMesListes();
        $('v-biblio-note').textContent = r.already
          ? 'Elle était déjà dans tes listes.'
          : '« ' + l.name + ' » est enregistrée dans tes listes.';
      } catch(e){ $('v-biblio-note').textContent = 'Impossible : ' + e.message + '.'; }
    };
    li.appendChild(garder);
  }

  const signaler = document.createElement('button');
  signaler.className = 'mini del';
  signaler.textContent = 'Signaler';
  signaler.onclick = async () => {
    if (!window.confirm('Signaler cette liste comme inappropriée ?')) return;
    try {
      const r = await Compte.appel('vocab_report', { id: l.id });
      $('v-biblio-note').textContent = (r.count >= 3)
        ? 'Merci. Cette liste est retirée en attendant vérification.'
        : 'Merci, le signalement est enregistré.';
    } catch(e){ $('v-biblio-note').textContent = 'Signalement impossible : ' + e.message + '.'; }
  };
  li.appendChild(signaler);

  const meta = document.createElement('span');
  meta.className = 'meta';
  meta.textContent = (l.proprietaire ? 'de ' + l.proprietaire + ' · ' : '')
    + (l.chapter ? l.chapter + ' · ' : '') + l.nb + ' mots';
  li.appendChild(meta);
  return li;
}

function chargerDepuisPartage(d){
  listeOuverte = null;
  majOngletComposer('neuf');
  mots = (d.words || []).map(m => ({ source:m.source, target:m.target, note:m.note, choisi:true }));
  $('v-nom').value = d.name;
  $('v-chapitre').value = d.chapter;
  $('langue-source').value = d.source;
  $('langue-cible').value = d.target;
  verifierLangues();
  $('v-publique').checked = false;
  peindreMots();
  aller('composer');
  dire('v-note', 'Liste ouverte. Elle appartient à son auteur : l\u2019enregistrer en fera une copie à toi.', 'ok');
}

$('v-biblio-q').addEventListener('input', () => {
  clearTimeout(biblioMinuteur);
  biblioMinuteur = setTimeout(chercherBiblio, 400);
});
$('v-biblio-langue').addEventListener('change', chercherBiblio);

/* =========================================================
   Mes résultats
   ========================================================= */
async function chargerResultats(){
  const invite = $('v-res-invite');
  const box = $('v-res-box');
  if (!Compte.connecte()){
    invite.hidden = false; box.hidden = true;
    $('v-res-invite-texte').textContent = 'Le suivi des résultats demande un compte, puis un abonnement.';
    $('v-res-bouton').textContent = 'Créer un compte';
    $('v-res-bouton').onclick = () => { Compte.ouvrir('register'); Compte.mode('register'); };
    return;
  }
  if (!Compte.abonne()){
    invite.hidden = false; box.hidden = true;
    $('v-res-invite-texte').textContent = 'Le suivi des résultats fait partie de l\u2019abonnement. '
      + 'Les résultats déjà enregistrés ne sont pas effacés.';
    $('v-res-bouton').textContent = 'Voir l\u2019abonnement';
    $('v-res-bouton').onclick = () => { window.location.href = 'abonnement.html'; };
    return;
  }
  invite.hidden = true; box.hidden = false;

  try {
    const r = await Compte.appel('vocab_attempts');
    const listes = r.listes || [];
    const ul = $('v-res-liste');
    ul.innerHTML = '';
    listes.forEach(d => ul.appendChild(ligneSuivi(d)));
    $('v-res-note').textContent = listes.length
      ? listes.length + (listes.length > 1 ? ' listes suivies.' : ' liste suivie.')
        + ' Chaque carré est une série, de la plus ancienne à la plus récente.'
      : 'Aucun résultat pour l\u2019instant. Fais une série, le bilan s\u2019enregistrera tout seul.';
  } catch(e){
    $('v-res-note').textContent = 'Résultats indisponibles : ' + e.message + '.';
  }
}

function ligneSuivi(d){
  const li = document.createElement('li');
  const tete = document.createElement('div');
  tete.className = 'tete';
  const nom = document.createElement('b');
  nom.textContent = d.label || 'Vocabulaire';
  tete.appendChild(nom);
  const nb = document.createElement('span');
  nb.className = 'badge';
  nb.textContent = d.nb + (d.nb > 1 ? ' séries' : ' série');
  tete.appendChild(nb);
  const quand = document.createElement('span');
  quand.className = 'quand';
  const dt = new Date(String(d.derniere_date || '').replace(' ', 'T'));
  quand.textContent = isNaN(dt) ? '' : 'dernière le ' + dt.toLocaleDateString('fr-FR', {day:'numeric', month:'short'});
  tete.appendChild(quand);
  li.appendChild(tete);

  const essais = document.createElement('div');
  essais.className = 'essais';
  d.essais.forEach(e => {
    const c = document.createElement('span');
    const part = e.asked ? e.errors / e.asked : 0;
    c.className = 'essai ' + (e.errors === 0 ? 'zero' : (part > 0.3 ? 'beaucoup' : 'peu'));
    c.title = e.correct + ' sur ' + e.asked + (e.direction === 'depuis' ? ' — sens inverse' : '');
    c.innerHTML = e.errors + '<small>' + (e.errors > 1 ? 'fautes' : 'faute') + '</small>';
    essais.appendChild(c);
  });
  li.appendChild(essais);

  if (d.nb > 1){
    const t = document.createElement('p');
    t.className = 'tendance';
    const ecart = d.premier_erreurs - d.dernier_erreurs;
    if (ecart > 0) t.innerHTML = '<b>' + ecart + ' faute' + (ecart > 1 ? 's' : '') + ' de moins</b> qu\u2019à la première série.';
    else if (ecart < 0) t.innerHTML = '<b class="pire">' + (-ecart) + ' de plus</b> qu\u2019à la première série.';
    else t.textContent = 'Autant de fautes qu\u2019à la première série.';
    if (d.meilleur_erreurs === 0) t.innerHTML += ' Une fois sans faute.';
    li.appendChild(t);
  }
  return li;
}

/* =========================================================
   Réglages retenus, lien partagé, démarrage
   ========================================================= */
const CLE = 'teaching-vocab';

function memoriser(){
  const r = { source:$('langue-source').value, cible:$('langue-cible').value,
              sens:$('v-sens').value, nb:$('v-nb').value, articles:$('v-articles').checked };
  try { localStorage.setItem(CLE, JSON.stringify(r)); } catch(e){}
  if (Compte.connecte()){
    Compte.appel('settings', { settings: { vocab: r } }).catch(() => {});
  }
}

function appliquerReglages(r){
  if (!r) return;
  if (r.source && LANGUES[r.source]) $('langue-source').value = r.source;
  if (r.cible && LANGUES[r.cible]) $('langue-cible').value = r.cible;
  if (r.sens) $('v-sens').value = r.sens;
  if (r.nb) $('v-nb').value = r.nb;
  if (typeof r.articles === 'boolean') $('v-articles').checked = r.articles;
}

async function chargerReglages(){
  let r = null;
  try { r = JSON.parse(localStorage.getItem(CLE) || 'null'); } catch(e){}
  if (Compte.connecte()){
    try {
      const s = (await Compte.appel('settings')).settings;
      if (s && s.vocab) r = s.vocab;
    } catch(e){}
  }
  appliquerReglages(r);
  verifierLangues();
}

['langue-source','langue-cible'].forEach(id => $(id).addEventListener('change', verifierLangues));
['v-sens','v-nb','v-articles'].forEach(id => $(id).addEventListener('change', memoriser));

// liste reçue par un lien : ?v=…
(async function listeRecue(){
  let t = null;
  try { t = new URLSearchParams(window.location.search).get('v'); } catch(e){}
  if (!t) return;
  try { history.replaceState(null, '', window.location.pathname); } catch(e){}
  try {
    const r = await Compte.appel('vocab_open', null, { t: t });
    chargerDepuisPartage(r.list);
  } catch(e){
    dire('v-note', 'Ce lien de liste ne fonctionne plus.', 'err');
  }
})();

remplirLangues();
peindreMots();
Compte.demarrer(async () => {
  await chargerReglages();
  chargerMesListes();
});

/* Contrôle de version : voir INSTALLATION.md */
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

/* =========================================================
   Les cartes
   Un paquet que l'on retourne une à une. On se juge soi-même :
   « je savais » écarte la carte, « à revoir » la remet dans le
   paquet. C'est la révision, pas l'évaluation — d'où l'absence
   d'enregistrement dans les résultats.
   ========================================================= */
const paquet = { cartes:[], index:0, retournee:false, sues:0, aRevoir:[] };

function paquetEnCours(){
  return paquet.cartes.length > 0 && paquet.index < paquet.cartes.length;
}

function lancerCartes(source){
  const mots = source || motsRetenus();
  if (mots.length < 1){
    aller('composer');
    dire('v-compose-note', motsRemplis().length
      ? 'Coche au moins un mot à réviser.'
      : 'Commence par saisir des mots, ou charge une liste toute prête.', 'err');
    return;
  }
  const sens = $('v-sens').value;
  paquet.cartes = preparerQuestions(mots, 0, sens);
  paquet.index = 0;
  paquet.sues = 0;
  paquet.aRevoir = [];
  ECRANS.forEach(e => { $('ecran-' + e).className = 'panel' + (e === 'cartes' ? ' on' : ''); });
  document.querySelectorAll('.step').forEach(b => {
    b.setAttribute('aria-current', b.dataset.ecran === 'cartes' ? 'true' : 'false');
  });
  window.scrollTo({ top:0, behavior:'smooth' });
  poserCarte();
}

function poserCarte(){
  const c = paquet.cartes[paquet.index];
  paquet.retournee = false;
  $('carte').className = 'carte';
  $('carte').setAttribute('aria-label', 'Carte ' + (paquet.index + 1) + ', cliquer pour retourner');
  $('c-avance').textContent = 'Carte ' + (paquet.index + 1) + ' sur ' + paquet.cartes.length;
  $('c-barre').style.width = Math.round(paquet.index / paquet.cartes.length * 100) + '%';

  const langueRecto = c.sens === 'vers' ? state.source : state.cible;
  const langueVerso = c.sens === 'vers' ? state.cible : state.source;
  // un libellé vide vaut mieux qu'un « undefined » affiché à un enfant
  $('c-langue-avant').textContent = LANGUES[langueRecto] || '';
  $('c-langue-arriere').textContent = LANGUES[langueVerso] || '';
  $('c-recto').textContent = c.montre;
  $('c-verso').textContent = c.attendu;
  $('c-note').textContent = c.note || '';
  $('c-jugement').hidden = true;
}

function retourner(){
  if (paquet.retournee) return;
  paquet.retournee = true;
  $('carte').className = 'carte retournee';
  $('c-jugement').hidden = false;
}

function jugerCarte(su){
  if (!paquet.retournee) return;
  const c = paquet.cartes[paquet.index];
  if (su) paquet.sues++;
  else paquet.aRevoir.push(c);
  paquet.index++;
  if (paquet.index >= paquet.cartes.length){ bilanCartes(); return; }
  poserCarte();
}

$('carte').onclick = retourner;
$('c-su').onclick = () => jugerCarte(true);
$('c-revoir').onclick = () => jugerCarte(false);
$('c-melanger').onclick = () => {
  const restantes = paquet.cartes.slice(paquet.index);
  if (restantes.length < 2) return;
  paquet.cartes = paquet.cartes.slice(0, paquet.index)
    .concat(restantes.sort(() => Math.random() - 0.5));
  poserCarte();
};
$('c-arreter').onclick = () => { if (paquet.index > 0) bilanCartes(); else aller('composer'); };
$('v-cartes').onclick = () => lancerCartes();

/* Le clavier : la révision se fait vite, la souris ralentit. */
document.addEventListener('keydown', (e) => {
  if ($('ecran-cartes').className.indexOf('on') < 0) return;
  const champ = document.activeElement && document.activeElement.tagName === 'INPUT';
  if (champ) return;
  if (e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); retourner(); }
  else if (e.key === 'ArrowRight'){ e.preventDefault(); jugerCarte(true); }
  else if (e.key === 'ArrowLeft'){ e.preventDefault(); jugerCarte(false); }
});

function bilanCartes(){
  const total = paquet.sues + paquet.aRevoir.length;
  $('c-score').textContent = paquet.sues + '/' + total;
  const part = total ? paquet.sues / total : 0;
  $('c-score-mot').textContent = part === 1 ? 'Toutes sues !'
    : part >= 0.8 ? 'Presque toutes.' : part >= 0.5 ? 'En bonne voie.' : 'À reprendre.';

  $('c-titre-revoir').hidden = !paquet.aRevoir.length;
  $('c-refaire-revoir').hidden = !paquet.aRevoir.length;
  const ul = $('c-liste-revoir');
  ul.innerHTML = '';
  paquet.aRevoir.forEach(c => {
    const li = document.createElement('li');
    li.innerHTML = '<b>' + echappe(c.montre) + '</b> → ' + echappe(c.attendu)
      + (c.note ? ' <span class="ta-reponse">' + echappe(c.note) + '</span>' : '');
    ul.appendChild(li);
  });
  aller('cartes-bilan');
}

/** Les cartes mises de côté redeviennent un paquet. */
function versMots(cartes){
  return cartes.map(c => ({
    source: c.sens === 'vers' ? c.montre : c.attendu,
    target: c.sens === 'vers' ? c.attendu : c.montre,
    note: c.note
  }));
}

$('c-refaire-revoir').onclick = () => {
  if (!paquet.aRevoir.length) return;
  lancerCartes(versMots(paquet.aRevoir));
};
$('c-refaire-tout').onclick = () => lancerCartes();
$('c-vers-exercice').onclick = () => {
  const source = paquet.aRevoir.length ? versMots(paquet.aRevoir) : motsRetenus();
  if (source.length < 2){
    aller('composer');
    dire('v-compose-note', 'Il faut au moins deux mots pour l\u2019exercice écrit.', 'err');
    return;
  }
  lancer(preparerQuestions(source, parseInt($('v-nb').value, 10), $('v-sens').value));
};
