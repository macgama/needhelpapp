"use strict";

/* =========================================================
   Les mathématiques : composer une série, s'entraîner,
   garder ses réglages, les partager, suivre ses progrès.
   Les calculs sont engendrés par assets/maths.js.
   ========================================================= */
const $ = (id) => document.getElementById(id);
const Compte = window.Compte;
const M = window.Maths;

/* Ce que chaque famille propose de régler, et comment on l'explique.
   Le vocabulaire est celui de l'école romande. */
const REGLAGES = {
  livrets: {
    explication: 'Le livret de 7, c\u2019est la table de 7. Choisis ceux que tu travailles.',
    champs: [
      { cle:'livrets', type:'pastilles', label:'Quels livrets ?', valeurs:[2,3,4,5,6,7,8,9,10,11,12], multiple:true },
      { cle:'jusqua', type:'choix', label:'Jusqu\u2019à combien ?', valeurs:[[10,'× 10'], [12,'× 12']] },
      { cle:'sens', type:'choix', label:'Dans quel ordre ?',
        valeurs:[['melange','Au hasard'], ['direct','Le livret d\u2019abord'], ['inverse','Le livret en second']] }
    ]
  },
  complements: {
    explication: 'Combien manque-t-il pour atteindre le nombre rond ?',
    champs: [
      { cle:'cible', type:'choix', label:'Compléter jusqu\u2019à', valeurs:[[10,'10'], [20,'20'], [100,'100'], [1000,'1000']] },
      { cle:'dizaines', type:'bascule', label:'Seulement des dizaines entières (à 100)' }
    ]
  },
  divisions: {
    explication: 'La division vue depuis le livret : 56 : 7, c\u2019est chercher dans le livret de 7.',
    champs: [
      { cle:'livrets', type:'pastilles', label:'Quels livrets ?', valeurs:[2,3,4,5,6,7,8,9,10,11,12], multiple:true },
      { cle:'jusqua', type:'choix', label:'Jusqu\u2019à combien ?', valeurs:[[10,'× 10'], [12,'× 12']] }
    ]
  },
  trous: {
    explication: 'Le nombre manquant peut être n\u2019importe où dans le calcul.',
    champs: [
      { cle:'jusqua', type:'choix', label:'Jusqu\u2019à', valeurs:[[20,'20'], [50,'50'], [100,'100'], [1000,'1000']] },
      { cle:'operation', type:'choix', label:'Quelle opération ?',
        valeurs:[['melange','Les deux'], ['addition','Additions'], ['soustraction','Soustractions']] }
    ]
  },
  progressions: {
    explication: 'On appelle cela des sauts : trouve la règle, puis continue.',
    champs: [
      { cle:'type', type:'choix', label:'Quel saut ?',
        valeurs:[['plus','En avançant'], ['moins','En reculant'], ['fois','En multipliant']] },
      { cle:'sauts', type:'pastilles', label:'De combien ?', valeurs:[2,3,4,5,6,7,8,9,10,25,50,100], multiple:true },
      { cle:'demandes', type:'choix', label:'Combien de nombres à trouver ?', valeurs:[[1,'1'], [2,'2'], [3,'3']] }
    ]
  },
  carres: {
    explication: 'Le carré d\u2019un nombre, et l\u2019opération inverse.',
    champs: [
      { cle:'jusqua', type:'choix', label:'Jusqu\u2019à', valeurs:[[10,'10²'], [12,'12²'], [15,'15²'], [20,'20²']] },
      { cle:'sens', type:'choix', label:'Quoi calculer ?',
        valeurs:[['melange','Les deux'], ['carre','Les carrés'], ['racine','Les racines']] }
    ]
  },
  doubles: {
    explication: 'Doubler, c\u2019est ajouter le nombre à lui-même. La moitié fait l\u2019inverse.',
    champs: [
      { cle:'jusqua', type:'choix', label:'Jusqu\u2019à', valeurs:[[20,'20'], [50,'50'], [100,'100'], [500,'500']] },
      { cle:'sens', type:'choix', label:'Quoi calculer ?',
        valeurs:[['melange','Les deux'], ['double','Les doubles'], ['moitie','Les moitiés']] }
    ]
  },

  /* Les quatre opérations : deux réglages commandent tout, l'ordre de
     grandeur des nombres et le nombre de décimales. */
  addition: {
    explication: 'Des additions à poser. Choisis la taille des nombres et les décimales.',
    champs: [
      { cle:'ordre', type:'choix', label:'Ordre de grandeur',
        valeurs:[[10,'10'], [20,'20'], [50,'50'], [100,'100'], [1000,'1000'], [10000,'10 000'], [100000,'100 000']] },
      { cle:'decimales', type:'choix', label:'Décimales',
        valeurs:[[0,'Nombres entiers'], [1,'1 décimale'], [2,'2 décimales'], [3,'3 décimales']] },
      { cle:'termes', type:'choix', label:'Combien de nombres ?', valeurs:[[2,'2'], [3,'3'], [4,'4']] }
    ]
  },
  soustraction: {
    explication: 'Des soustractions à poser. Le résultat reste toujours positif.',
    champs: [
      { cle:'ordre', type:'choix', label:'Ordre de grandeur',
        valeurs:[[10,'10'], [20,'20'], [50,'50'], [100,'100'], [1000,'1000'], [10000,'10 000'], [100000,'100 000']] },
      { cle:'decimales', type:'choix', label:'Décimales',
        valeurs:[[0,'Nombres entiers'], [1,'1 décimale'], [2,'2 décimales'], [3,'3 décimales']] }
    ]
  },
  multiplication: {
    explication: 'Des multiplications à poser. Le produit garde les décimales du premier nombre.',
    champs: [
      { cle:'ordre', type:'choix', label:'Ordre de grandeur',
        valeurs:[[10,'10'], [100,'100'], [1000,'1000'], [10000,'10 000']] },
      { cle:'multiplicateur', type:'choix', label:'Le multiplicateur',
        valeurs:[[1,'1 chiffre'], [2,'2 chiffres'], [3,'3 chiffres']] },
      { cle:'decimales', type:'choix', label:'Décimales',
        valeurs:[[0,'Nombres entiers'], [1,'1 décimale'], [2,'2 décimales']] }
    ]
  },
  division: {
    explication: 'Des divisions à poser. Avec reste, la réponse s\u2019écrit « 12 reste 3 ».',
    champs: [
      { cle:'ordre', type:'choix', label:'Ordre de grandeur',
        valeurs:[[100,'100'], [1000,'1000'], [10000,'10 000']] },
      { cle:'diviseur', type:'choix', label:'Le diviseur', valeurs:[[1,'1 chiffre'], [2,'2 chiffres']] },
      { cle:'reste', type:'bascule', label:'Divisions avec reste' }
    ]
  },

  /* ---- pour les plus grands ---- */
  priorites: {
    explication: 'Multiplications et divisions d\u2019abord, additions et soustractions ensuite — les parenthèses avant tout.',
    champs: [
      { cle:'niveau', type:'choix', label:'Difficulté',
        valeurs:[[1,'Deux opérations'], [2,'Avec parenthèses'], [3,'Avec des carrés']] },
      { cle:'negatifs', type:'bascule', label:'Autoriser les résultats négatifs' }
    ]
  },
  relatifs: {
    explication: 'Les nombres négatifs. Un nombre négatif s\u2019écrit entre parenthèses dans un calcul.',
    champs: [
      { cle:'operation', type:'choix', label:'Quelle opération ?',
        valeurs:[['addition','Addition et soustraction'], ['multiplication','Multiplication'], ['division','Division']] },
      { cle:'jusqua', type:'choix', label:'Jusqu\u2019à', valeurs:[[10,'10'], [20,'20'], [50,'50'], [100,'100']] }
    ]
  },
  fractions: {
    explication: 'La réponse doit être simplifiée : 6/8 s\u2019écrit 3/4.',
    champs: [
      { cle:'operation', type:'choix', label:'Quoi faire ?',
        valeurs:[['simplifier','Simplifier'], ['addition','Additionner'], ['soustraction','Soustraire'],
                 ['multiplication','Multiplier'], ['division','Diviser']] },
      { cle:'jusqua', type:'choix', label:'Dénominateurs jusqu\u2019à', valeurs:[[6,'6'], [10,'10'], [12,'12'], [20,'20']] }
    ]
  },
  unites: {
    explication: 'Un échelon vaut 10 pour les longueurs, 100 pour les aires, 1000 pour les volumes.',
    champs: [
      { cle:'grandeur', type:'choix', label:'Quelle grandeur ?',
        valeurs:[['longueur','Longueur'], ['masse','Masse'], ['capacite','Capacité'],
                 ['aire','Aire'], ['volume','Volume']] },
      { cle:'ecart', type:'choix', label:'Écart entre les unités',
        valeurs:[[1,'Un échelon'], [2,'Deux échelons'], [3,'Trois échelons']] }
    ]
  },
  pourcents: {
    explication: 'Un pour-cent, c\u2019est un centième.',
    champs: [
      { cle:'operation', type:'choix', label:'Quoi calculer ?',
        valeurs:[['pourcent','Le pourcent d\u2019un nombre'], ['rabais','Un rabais'], ['trouver','Trouver le pourcentage']] }
    ]
  },
  algebre: {
    explication: 'Le calcul littéral et les équations du premier degré.',
    champs: [
      { cle:'operation', type:'choix', label:'Quoi faire ?',
        valeurs:[['reduire','Réduire'], ['developper','Développer'], ['equation','Résoudre une équation']] },
      { cle:'lettre', type:'choix', label:'Quelle lettre ?', valeurs:[['x','x'], ['a','a'], ['n','n']] }
    ]
  },

  diviseurs: {
    explication: 'Le plus grand diviseur commun, le plus petit multiple commun, et la décomposition en facteurs premiers.',
    champs: [
      { cle:'operation', type:'choix', label:'Quoi chercher ?',
        valeurs:[['pgdc','Le PGDC'], ['ppmc','Le PPMC'], ['premiers','Les facteurs premiers']] },
      { cle:'jusqua', type:'choix', label:'Nombres jusqu\u2019à', valeurs:[[40,'40'], [60,'60'], [120,'120']] }
    ]
  },
  scientifique: {
    explication: 'Un seul chiffre avant la virgule, puis la puissance de dix. Écris « 3,2 · 10^5 ».',
    champs: [
      { cle:'sens', type:'choix', label:'Dans quel sens ?',
        valeurs:[['vers','Vers l\u2019écriture décimale'], ['depuis','Vers la notation scientifique']] }
    ]
  },
  arrondis: {
    explication: 'Regarde le chiffre juste après le rang demandé.',
    champs: [
      { cle:'rang', type:'choix', label:'À quel rang ?',
        valeurs:[['millier','Au millier'], ['centaine','À la centaine'], ['dizaine','À la dizaine'],
                 ['unite','À l\u2019unité'], ['dixieme','Au dixième'], ['centieme','Au centième']] }
    ]
  },
  temps: {
    explication: 'Soixante minutes font une heure, soixante secondes une minute.',
    champs: [
      { cle:'operation', type:'choix', label:'Quoi faire ?',
        valeurs:[['conversion','Minutes en heures'], ['secondes','Minutes en secondes'], ['somme','Additionner des durées']] }
    ]
  },
  vitesse: {
    explication: 'Trois grandeurs liées : la vitesse, la distance et le temps.',
    champs: [
      { cle:'cherche', type:'choix', label:'Quoi chercher ?',
        valeurs:[['vitesse','La vitesse'], ['distance','La distance'], ['temps','Le temps']] }
    ]
  },
  echelles: {
    explication: 'Une échelle 1:1000 signifie qu\u2019un centimètre sur le plan vaut mille centimètres en vrai.',
    champs: [
      { cle:'cherche', type:'choix', label:'Quoi chercher ?',
        valeurs:[['reel','La longueur réelle'], ['plan','La longueur sur le plan']] }
    ]
  },
  interets: {
    explication: 'Intérêt = capital × taux ÷ 100 × durée.',
    champs: [
      { cle:'cherche', type:'choix', label:'Quoi chercher ?',
        valeurs:[['interet','L\u2019intérêt'], ['capital','Le capital']] }
    ]
  },
  proportionnalite: {
    explication: 'Si l\u2019un double, l\u2019autre double aussi.',
    champs: [
      { cle:'operation', type:'choix', label:'Quoi faire ?',
        valeurs:[['quatrieme','Trouver la valeur manquante'], ['reconnaitre','Reconnaître une proportionnalité']] }
    ]
  },
  affine: {
    explication: 'Une fonction affine s\u2019écrit f(x) = ax + b. Sa représentation est une droite.',
    champs: [
      { cle:'cherche', type:'choix', label:'Quoi chercher ?',
        valeurs:[['image','Une image'], ['antecedent','Un antécédent'], ['pente','La pente d\u2019une droite']] }
    ]
  },
  binomes: {
    explication: 'Chaque terme du premier facteur multiplie chaque terme du second.',
    champs: [
      { cle:'operation', type:'choix', label:'Quoi faire ?',
        valeurs:[['developper','Développer un produit'], ['remarquable','Les identités remarquables']] },
      { cle:'lettre', type:'choix', label:'Quelle lettre ?', valeurs:[['x','x'], ['a','a'], ['n','n']] }
    ]
  },
  equation2: {
    explication: 'Écris les deux solutions : « x = 3 ou x = −3 ».',
    champs: [
      { cle:'forme', type:'choix', label:'Quelle forme ?',
        valeurs:[['carre','x² = k'], ['factorisee','x² + bx + c = 0']] },
      { cle:'lettre', type:'choix', label:'Quelle lettre ?', valeurs:[['x','x'], ['a','a'], ['n','n']] }
    ]
  },
  aires: {
    explication: 'Les figures planes. π vaut 3,14, comme au cours.',
    champs: [
      { cle:'forme', type:'choix', label:'Quelle figure ?',
        valeurs:[['rectangle','Le rectangle'], ['triangle','Le triangle'], ['trapeze','Le trapèze'],
                 ['disque','Le disque'], ['perimetre','Le périmètre du cercle']] }
    ]
  },
  volumes: {
    explication: 'Les solides. π vaut 3,14.',
    champs: [
      { cle:'forme', type:'choix', label:'Quel solide ?',
        valeurs:[['pave','Le pavé droit'], ['cylindre','Le cylindre'], ['pyramide','La pyramide']] }
    ]
  },
  pythagore: {
    explication: 'Dans un triangle rectangle, le carré de l\u2019hypoténuse égale la somme des carrés des deux côtés.',
    champs: [
      { cle:'cherche', type:'choix', label:'Quoi chercher ?',
        valeurs:[['hypotenuse','L\u2019hypoténuse'], ['cote','Un côté']] }
    ]
  },
  angles: {
    explication: 'Les angles d\u2019un triangle font 180°, ceux d\u2019un quadrilatère 360°.',
    champs: [
      { cle:'operation', type:'choix', label:'Quoi calculer ?',
        valeurs:[['triangle','Dans un triangle'], ['quadrilatere','Dans un quadrilatère'],
                 ['complementaire','Angles complémentaires et supplémentaires']] }
    ]
  },
  trigonometrie: {
    explication: 'Sinus, cosinus et tangente, dans un triangle rectangle.',
    champs: [
      { cle:'rapport', type:'choix', label:'Quel rapport ?',
        valeurs:[['melange','Les trois'], ['sin','Le sinus'], ['cos','Le cosinus'], ['tan','La tangente']] }
    ]
  }
};

let famille = 'livrets';
let reglages = Object.assign({}, M.FAMILLES.livrets.defaut);
let serieOuverte = null;
let mesSeries = [];
let biblioMinuteur = null;

const state = { questions:[], index:0, reponses:[], depart:0 };

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
   « Créer une série » pendant qu'on en modifie une déjà enregistrée
   laisse croire qu'on en fabrique une seconde.
   ========================================================= */
function majOngletComposer(etat){
  const b = document.getElementById('onglet-composer');
  if (!b) return;
  b.textContent = (etat === 'reprise') ? 'Modifier la série'
    : (etat === 'modifier') ? 'Modifier la série'
    : 'Créer une série';
  const note = document.getElementById('note-origine');
  if (note){
    note.hidden = (etat !== 'reprise');
  }
}

/* =========================================================
   Navigation
   ========================================================= */
const ECRANS = ['composer', 'exercice', 'bilan', 'series', 'biblio', 'resultats'];

function aller(nom){
  if (nom === 'exercice' && !enCours()){ commencer(); return; }
  ECRANS.forEach(e => { $('ecran-' + e).className = 'panel' + (e === nom ? ' on' : ''); });
  document.querySelectorAll('.step').forEach(b => {
    b.setAttribute('aria-current', b.dataset.ecran === nom ? 'true' : 'false');
  });
  window.scrollTo({ top:0, behavior:'smooth' });
  if (nom === 'series') chargerMesSeries();
  if (nom === 'biblio') chercherBiblio();
  if (nom === 'resultats') chargerResultats();
}
document.querySelectorAll('.step').forEach(b => { b.onclick = () => aller(b.dataset.ecran); });

function enCours(){
  return state.questions.length > 0 && state.index < state.questions.length;
}

/* =========================================================
   Le choix de la famille et ses réglages
   ========================================================= */
/* Dix-sept familles affichées ensemble, c'est un mur. On choisit donc en
   deux temps : le chapitre d'abord, ses familles ensuite. Sept cartes au
   plus à l'écran, ce qui se parcourt d'un regard. */
let chapitreOuvert = null;

function chapitres(){
  const liste = [];
  Object.keys(M.FAMILLES).forEach(cle => {
    const g = M.FAMILLES[cle].groupe || 'Calcul mental';
    let ch = liste.find(c => c.nom === g);
    if (!ch){ ch = { nom:g, familles:[] }; liste.push(ch); }
    ch.familles.push(cle);
  });
  return liste;
}

function chapitreDe(cle){
  return (M.FAMILLES[cle] && M.FAMILLES[cle].groupe) || 'Calcul mental';
}

function peindreFamilles(){
  const tous = chapitres();
  if (!chapitreOuvert || !tous.find(c => c.nom === chapitreOuvert)){
    chapitreOuvert = chapitreDe(famille);
  }

  // la barre des chapitres
  const barre = $('chapitres');
  barre.innerHTML = '';
  tous.forEach(ch => {
    const b = document.createElement('button');
    b.className = 'chapitre';
    b.setAttribute('aria-current', ch.nom === chapitreOuvert ? 'true' : 'false');
    const t = document.createElement('b');
    t.textContent = ch.nom;
    const n = document.createElement('span');
    n.textContent = ch.familles.length + ' familles';
    b.appendChild(t); b.appendChild(n);
    b.onclick = () => { chapitreOuvert = ch.nom; peindreFamilles(); };
    barre.appendChild(b);
  });

  // les familles du chapitre ouvert
  const dans = $('etape-dans');
  if (dans) dans.textContent = '— ' + chapitreOuvert;
  const box = $('familles');
  box.innerHTML = '';
  const ch = tous.find(c => c.nom === chapitreOuvert);
  (ch ? ch.familles : []).forEach(cle => {
    const b = document.createElement('button');
    b.className = 'famille';
    b.setAttribute('aria-current', cle === famille ? 'true' : 'false');
    const t = document.createElement('b');
    t.textContent = M.FAMILLES[cle].nom;
    const s = document.createElement('span');
    s.textContent = resume(cle);
    b.appendChild(t); b.appendChild(s);
    b.onclick = () => choisirFamille(cle);
    box.appendChild(b);
  });
}

/** Un exemple vaut mieux qu'une description. */
function resume(cle){
  const q = M.serie(cle, {}, 1)[0];
  return q ? q.enonce.replace(/\s;\s\?.*$/, ' ; …') : '';
}

function choisirFamille(cle){
  famille = cle;
  chapitreOuvert = chapitreDe(cle);
  reglages = Object.assign({}, M.FAMILLES[cle].defaut);
  peindreFamilles();
  peindreReglages();
  serieOuverte = null;
}

function peindreReglages(){
  const def = REGLAGES[famille];
  $('titre-reglages').textContent = M.FAMILLES[famille].nom;
  $('explication-famille').textContent = def.explication;

  const box = $('reglages');
  box.innerHTML = '';
  def.champs.forEach(champ => {
    const groupe = document.createElement('div');
    groupe.className = 'reglage-groupe';
    const l = document.createElement('label');
    l.textContent = champ.label;
    groupe.appendChild(l);

    if (champ.type === 'bascule'){
      const wrap = document.createElement('label');
      wrap.className = 'check';
      const i = document.createElement('input');
      i.type = 'checkbox';
      i.checked = !!reglages[champ.cle];
      i.onchange = () => { reglages[champ.cle] = i.checked; apercu(); };
      wrap.appendChild(i);
      wrap.appendChild(document.createTextNode(' oui'));
      groupe.replaceChild(wrap, l);
      wrap.insertBefore(document.createTextNode(''), wrap.firstChild);
      const titre = document.createElement('label');
      titre.textContent = champ.label;
      groupe.insertBefore(titre, wrap);
      box.appendChild(groupe);
      return;
    }

    const zone = document.createElement('div');
    zone.className = 'pastilles';
    const valeurs = champ.valeurs.map(v => Array.isArray(v) ? v : [v, String(v)]);
    valeurs.forEach(([valeur, texte]) => {
      const b = document.createElement('button');
      b.className = 'pastille-choix';
      b.textContent = texte;
      const actif = champ.multiple
        ? (reglages[champ.cle] || []).indexOf(valeur) >= 0
        : reglages[champ.cle] === valeur;
      b.setAttribute('aria-pressed', actif ? 'true' : 'false');
      b.onclick = () => {
        if (champ.multiple){
          const liste = (reglages[champ.cle] || []).slice();
          const i = liste.indexOf(valeur);
          if (i >= 0){
            if (liste.length === 1) return;   // il en faut toujours un
            liste.splice(i, 1);
          } else liste.push(valeur);
          liste.sort((a, b) => a - b);
          reglages[champ.cle] = liste;
        } else {
          reglages[champ.cle] = valeur;
        }
        peindreReglages();
        apercu();
      };
      zone.appendChild(b);
    });
    groupe.appendChild(zone);
    box.appendChild(groupe);
  });
  apercu();
}

function apercu(){
  const ul = $('m-apercu');
  ul.innerHTML = '';
  M.serie(famille, reglages, 5).forEach(q => {
    const li = document.createElement('li');
    li.innerHTML = echappe(q.enonce) + ' = <b>' + echappe(q.reponse) + '</b>';
    ul.appendChild(li);
  });
}
$('m-retirer').onclick = apercu;

/* =========================================================
   L'exercice
   ========================================================= */
function commencer(questions){
  const q = questions || M.serie(famille, reglages, parseInt($('m-nb').value, 10));
  if (!q.length){
    dire('m-compose-note', 'Cette famille ne peut rien produire avec ces réglages.', 'err');
    return;
  }
  state.questions = q;
  state.index = 0;
  state.reponses = [];
  state.depart = Date.now();
  ECRANS.forEach(e => { $('ecran-' + e).className = 'panel' + (e === 'exercice' ? ' on' : ''); });
  document.querySelectorAll('.step').forEach(b => {
    b.setAttribute('aria-current', b.dataset.ecran === 'exercice' ? 'true' : 'false');
  });
  window.scrollTo({ top:0, behavior:'smooth' });
  poser();
}

function poser(){
  const q = state.questions[state.index];
  $('m-avance').textContent = 'Calcul ' + (state.index + 1) + ' sur ' + state.questions.length;
  $('m-barre').style.width = Math.round(state.index / state.questions.length * 100) + '%';
  $('m-consigne').textContent = M.FAMILLES[famille].consigne;
  $('m-enonce').textContent = q.enonce;
  $('m-verdict').textContent = '';
  $('m-verdict').className = 'verdict';
  $('m-reponse').value = '';
  $('m-reponse').disabled = false;
  $('m-verifier').disabled = false;
  $('m-verifier').textContent = 'Vérifier';
  $('m-reponse').focus();
}

function verifier(){
  const q = state.questions[state.index];
  if ($('m-verifier').textContent !== 'Vérifier'){ suivante(); return; }

  const donnee = $('m-reponse').value;
  const verdict = M.juger(donnee, q.reponse, q.tolerance);
  const juste = verdict.etat !== 'faux';
  state.reponses.push({ q:q, donnee:donnee, juste:juste, etat:verdict.etat, note:verdict.note });

  /* Trois verdicts. Une fraction exacte mais non réduite compte juste :
     ce n'est pas une erreur de calcul. On montre seulement ce qu'il reste
     à faire, sans le sanctionner. */
  $('m-verdict').className = 'verdict '
    + (verdict.etat === 'juste' ? 'bon' : verdict.etat === 'simplifiable' ? 'presque' : 'faux');
  $('m-verdict').textContent = (verdict.etat === 'juste') ? 'Juste.'
    : (verdict.etat === 'simplifiable') ? verdict.note
    : q.enonce + ' = ' + q.reponse;
  $('m-reponse').disabled = true;
  $('m-verifier').textContent = (state.index + 1 < state.questions.length) ? 'Calcul suivant' : 'Voir le bilan';
}

function suivante(){
  state.index++;
  if (state.index >= state.questions.length){ bilan(); return; }
  poser();
}

$('m-verifier').onclick = verifier;
$('m-reponse').addEventListener('keydown', (e) => { if (e.key === 'Enter'){ e.preventDefault(); verifier(); } });
$('m-indice').onclick = () => {
  const q = state.questions[state.index];
  $('m-verdict').className = 'verdict';
  $('m-verdict').textContent = q.aide || 'Prends le temps de poser le calcul.';
};
$('m-passer').onclick = () => {
  state.reponses.push({ q:state.questions[state.index], donnee:'', juste:false });
  suivante();
};
$('m-arreter').onclick = () => { if (state.reponses.length) bilan(); else aller('composer'); };
$('m-commencer').onclick = () => commencer();

function bilan(){
  const justes = state.reponses.filter(r => r.juste).length;
  const total = state.reponses.length;
  const secondes = Math.round((Date.now() - state.depart) / 1000);

  $('m-score').textContent = justes + '/' + total;
  const part = total ? justes / total : 0;
  $('m-score-mot').textContent = part === 1 ? 'Sans faute !'
    : part >= 0.8 ? 'Très bien.' : part >= 0.5 ? 'En progrès.' : 'À revoir.';

  $('m-temps').textContent = $('m-chrono').checked
    ? 'Temps : ' + Math.floor(secondes / 60) + ' min ' + (secondes % 60) + ' s'
      + (total ? ', soit ' + (secondes / total).toFixed(1) + ' s par calcul.' : '')
    : '';

  const fautes = state.reponses.filter(r => !r.juste);
  const aSimplifier = state.reponses.filter(r => r.etat === 'simplifiable');
  $('m-titre-fautes').hidden = !fautes.length && !aSimplifier.length;
  $('m-revoir').hidden = !fautes.length;
  const ul = $('m-fautes');
  ul.innerHTML = '';
  fautes.forEach(r => {
    const li = document.createElement('li');
    li.innerHTML = '<b>' + echappe(r.q.enonce) + '</b> = ' + echappe(r.q.reponse)
      + (r.donnee ? ' <span class="ta-reponse">tu as écrit : ' + echappe(r.donnee) + '</span>' : '');
    ul.appendChild(li);
  });
  aSimplifier.forEach(r => {
    const li = document.createElement('li');
    li.className = 'presque';
    li.innerHTML = '<b>' + echappe(r.q.enonce) + '</b> = ' + echappe(r.donnee)
      + ' <span class="ta-reponse">juste, mais se simplifie en ' + echappe(r.q.reponse) + '</span>';
    ul.appendChild(li);
  });
  if (aSimplifier.length){
    $('m-titre-fautes').textContent = fautes.length
      ? 'À revoir, et à simplifier'
      : 'Justes, mais à simplifier';
  } else {
    $('m-titre-fautes').textContent = 'Les calculs à revoir';
  }
  aller('bilan');
  enregistrerBilan(justes, total, secondes);
}

$('m-recommencer').onclick = () => commencer();
$('m-revoir').onclick = () => {
  const aRevoir = state.reponses.filter(r => !r.juste).map(r => r.q);
  if (aRevoir.length) commencer(aRevoir);
};
$('m-retour').onclick = () => aller('composer');

async function enregistrerBilan(justes, total, secondes){
  if (!Compte.connecte() || !Compte.abonne()){
    dire('m-bilan-note', Compte.connecte()
      ? 'Le suivi des résultats fait partie de l\u2019abonnement : celui-ci n\u2019a pas été enregistré.'
      : 'Crée un compte pour garder tes résultats et suivre tes progrès.', '');
    return;
  }
  try {
    await Compte.appel('math_attempt_save', {
      list_id: serieOuverte ? serieOuverte.id : 0,
      label: $('m-nom').value.trim() || M.FAMILLES[famille].nom,
      famille: famille, asked: total, correct: justes,
      errors: total - justes, secondes: secondes
    });
    dire('m-bilan-note', 'Résultat enregistré dans ton profil.', 'ok');
  } catch(e){
    dire('m-bilan-note', 'Le résultat n\u2019a pas pu être enregistré : ' + e.message + '.', 'err');
  }
}

/* =========================================================
   La feuille imprimable
   ========================================================= */
function construireFeuille(questions){
  const titre = $('m-nom').value.trim() || M.FAMILLES[famille].nom;
  const chapitre = $('m-chapitre').value.trim();
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
    g.textContent = (chapitre ? chapitre + ' · ' : '') + questions.length + ' calculs · '
      + M.FAMILLES[famille].nom.toLowerCase();
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
  consigne.textContent = M.FAMILLES[famille].consigne;
  qp.appendChild(consigne);

  const ol = document.createElement('ol');
  // deux colonnes : un calcul tient sur une demi-ligne, une feuille suffit
  ol.className = 'feuille-questions calculs';
  questions.forEach(q => {
    const li = document.createElement('li');
    const e = document.createElement('span');
    e.className = 'q-verbe';
    e.textContent = q.enonce.indexOf('?') >= 0 ? q.enonce : q.enonce + ' =';
    const trait = document.createElement('span');
    trait.className = 'q-trait';
    li.appendChild(e);
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
    a.textContent = q.enonce + ' = ';
    const r = document.createElement('span');
    r.className = 'c-reponse';
    r.textContent = q.reponse;
    li.appendChild(a); li.appendChild(r);
    oc.appendChild(li);
  });
  cp.appendChild(oc);
}

$('m-imprimer').onclick = () => {
  if (!Compte.connecte() || !Compte.abonne()){
    dire('m-compose-note', 'L\u2019impression fait partie de l\u2019abonnement. '
      + 'L\u2019exercice à l\u2019écran, lui, reste gratuit.', 'err');
    if (Compte.connecte()) setTimeout(() => { window.location.href = 'abonnement.html'; }, 1400);
    else { Compte.ouvrir('register'); Compte.mode('register'); }
    return;
  }
  const questions = M.serie(famille, reglages, parseInt($('m-nb').value, 10));
  construireFeuille(questions);
  dire('m-compose-note', questions.length + ' calculs et leur corrigé sont prêts. '
     + 'Dans la fenêtre d\u2019impression, choisis « Enregistrer au format PDF ».', 'ok');
  setTimeout(() => window.print(), 120);
};

/* =========================================================
   Mes séries
   ========================================================= */
function remplirFamilles(sel, tout){
  sel.innerHTML = '<option value="">' + tout + '</option>';
  Object.keys(M.FAMILLES).forEach(cle => {
    const o = document.createElement('option');
    o.value = cle;
    o.textContent = M.FAMILLES[cle].nom;
    sel.appendChild(o);
  });
}

async function chargerMesSeries(){
  const ouvert = Compte.connecte();   // un compte gratuit garde déjà cinq éléments
  const bloc = $('m-hors-compte');
  bloc.hidden = ouvert || !Compte.disponible();
  $('m-series-box').hidden = !ouvert;
  if (!ouvert){
    bloc.querySelector('p').textContent = Compte.connecte()
      ? 'Un compte gratuit garde cinq séries et en reprend cinq. Publier et partager demandent un abonnement.'
      : 'Crée un compte pour garder tes séries : cinq gratuitement, sur chaque application.';
    $('m-inscription').textContent = 'Créer un compte';
    mesSeries = [];
    return;
  }
  try {
    mesSeries = (await Compte.appel('math_lists')).lists || [];
  } catch(e){ mesSeries = []; }
  peindreMesSeries();
}

function ligneSerie(l){
  const li = document.createElement('li');
  const nom = document.createElement('span');
  nom.className = 'nom';
  nom.textContent = l.name;
  li.appendChild(nom);

  const fam = document.createElement('span');
  fam.className = 'badge';
  fam.textContent = (M.FAMILLES[l.famille] || {}).nom || l.famille;
  li.appendChild(fam);

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
  ouvrir.onclick = () => ouvrirSerie(l, !!l.borrowed);
  li.appendChild(ouvrir);

  // publier et partager restent réservés aux abonnés
  if (!l.borrowed && Compte.abonne()){
    const pub = document.createElement('button');
    pub.className = 'mini';
    pub.textContent = l.is_public ? 'Dépublier' : 'Publier';
    pub.onclick = async () => {
      try {
        await Compte.appel('math_publish', { id:l.id, public: !l.is_public });
        await chargerMesSeries();
        $('m-series-note').textContent = l.is_public
          ? '« ' + l.name + ' » est retirée de la bibliothèque.'
          : '« ' + l.name + ' » est publiée.';
      } catch(e){ $('m-series-note').textContent = 'Opération impossible : ' + e.message + '.'; }
    };
    li.appendChild(pub);

    const part = document.createElement('button');
    part.className = 'mini'; part.textContent = 'Partager';
    part.onclick = () => partagerSerie(l);
    li.appendChild(part);
  }

  const suppr = document.createElement('button');
  suppr.className = 'mini del'; suppr.textContent = 'Supprimer';
  suppr.onclick = async () => {
    if (!window.confirm('Supprimer « ' + l.name + ' » ?')) return;
    try { await Compte.appel('math_delete', { id:l.id }); } catch(e){}
    if (serieOuverte && serieOuverte.id === l.id) serieOuverte = null;
    chargerMesSeries();
  };
  li.appendChild(suppr);

  const meta = document.createElement('p');
  meta.className = 'meta';
  const bouts = [];
  if (l.chapter) bouts.push(l.chapter);
  bouts.push(l.nb + ' calculs');
  bouts.push(decrire(l.famille, l.reglages));
  if (l.borrowed) bouts.push('partagée par ' + (l.origin_owner || 'un autre utilisateur'));
  meta.textContent = bouts.join(' · ');
  li.appendChild(meta);
  return li;
}

/** Dire en clair ce que règle une série, sans obliger à l'ouvrir. */
function decrire(fam, r){
  r = r || {};
  if (fam === 'livrets' || fam === 'divisions'){
    return 'livrets ' + (r.livrets || []).join(', ') + ' jusqu\u2019à ' + (r.jusqua || 10);
  }
  if (fam === 'complements') return 'jusqu\u2019à ' + (r.cible || 100);
  if (fam === 'trous') return 'jusqu\u2019à ' + (r.jusqua || 100);
  if (fam === 'progressions'){
    const t = r.type === 'moins' ? 'en reculant' : (r.type === 'fois' ? 'en multipliant' : 'en avançant');
    return t + ' de ' + (r.sauts || []).join(', ');
  }
  if (fam === 'carres') return 'jusqu\u2019à ' + (r.jusqua || 12) + '²';
  if (fam === 'doubles') return 'jusqu\u2019à ' + (r.jusqua || 100);
  if (fam === 'addition' || fam === 'soustraction'){
    return 'jusqu\u2019à ' + (r.ordre || 100)
      + ((r.decimales || 0) ? ', ' + r.decimales + ' décimale' + (r.decimales > 1 ? 's' : '') : ', entiers')
      + (fam === 'addition' && (r.termes || 2) > 2 ? ', ' + r.termes + ' nombres' : '');
  }
  if (fam === 'multiplication'){
    return 'jusqu\u2019à ' + (r.ordre || 100) + ', multiplicateur à '
      + (r.multiplicateur || 1) + ' chiffre' + ((r.multiplicateur || 1) > 1 ? 's' : '');
  }
  if (fam === 'division'){
    return 'jusqu\u2019à ' + (r.ordre || 100) + ', diviseur à ' + (r.diviseur || 1)
      + ' chiffre' + ((r.diviseur || 1) > 1 ? 's' : '') + (r.reste ? ', avec reste' : ', exactes');
  }
  if (fam === 'priorites'){
    return (r.niveau === 1 ? 'deux opérations' : r.niveau === 3 ? 'avec des carrés' : 'avec parenthèses')
      + (r.negatifs ? ', résultats négatifs permis' : '');
  }
  if (fam === 'relatifs') return (r.operation || 'addition') + ', jusqu\u2019à ' + (r.jusqua || 20);
  if (fam === 'fractions') return (r.operation || 'addition') + ', dénominateurs jusqu\u2019à ' + (r.jusqua || 12);
  if (fam === 'unites') return (r.grandeur || 'longueur') + ', ' + (r.ecart || 2) + ' échelon(s)';
  if (fam === 'pourcents') return r.operation === 'rabais' ? 'rabais'
    : r.operation === 'trouver' ? 'trouver le pourcentage' : 'pourcent d\u2019un nombre';
  if (fam === 'algebre') return (r.operation || 'reduire') + ', lettre ' + (r.lettre || 'x');
  return '';
}

function filtrer(liste){
  const q = $('m-filtre').value.trim().toLowerCase();
  const f = $('m-filtre-famille').value;
  return liste.filter(l => {
    if (f && l.famille !== f) return false;
    if (!q) return true;
    return (l.name + ' ' + l.chapter).toLowerCase().indexOf(q) >= 0;
  });
}

function peindreMesSeries(){
  const visibles = filtrer(mesSeries);
  const miennes = visibles.filter(l => !l.borrowed);
  const reprises = visibles.filter(l => l.borrowed);
  $('m-mes-series').innerHTML = '';
  $('m-reprises').innerHTML = '';
  miennes.forEach(l => $('m-mes-series').appendChild(ligneSerie(l)));
  reprises.forEach(l => $('m-reprises').appendChild(ligneSerie(l)));
  $('m-titre-miennes').hidden = !miennes.length;
  $('m-titre-reprises').hidden = !reprises.length;
  $('m-series-vide').hidden = visibles.length > 0;
  $('m-series-vide').textContent = mesSeries.length
    ? 'Aucune série ne correspond à ce filtre.'
    : 'Aucune série enregistrée. Règle une famille dans « Composer », puis enregistre-la.';
}

$('m-filtre').addEventListener('input', peindreMesSeries);
$('m-filtre-famille').addEventListener('change', peindreMesSeries);
$('m-inscription').onclick = () => {
  if (Compte.connecte()){ window.location.href = 'abonnement.html'; return; }
  Compte.ouvrir('register'); Compte.mode('register');
};

function ouvrirSerie(l, reprise){
  majOngletComposer(reprise ? 'reprise' : 'modifier');
  famille = M.FAMILLES[l.famille] ? l.famille : 'livrets';
  reglages = Object.assign({}, M.FAMILLES[famille].defaut, l.reglages || {});
  // une série reprise se modifie : elle devient alors la sienne
  serieOuverte = l;
  $('m-nom').value = reprise ? l.name + ' (reprise)' : l.name;
  $('m-chapitre').value = l.chapter || '';
  $('m-nb').value = String(l.nb || 20);
  $('m-publique').checked = !reprise && !!l.is_public;
  peindreFamilles();
  peindreReglages();
  aller('composer');
  dire('m-note', reprise
    ? 'Série de ' + (l.origin_owner || 'quelqu\u2019un d\u2019autre') + '. Tu peux la modifier : elle deviendra la tienne, sans toucher à l\u2019originale.'
    : '« ' + l.name + ' » est ouverte. Enregistrer la remplacera.', 'ok');
}

async function partagerSerie(l){
  try {
    const r = await Compte.appel('math_share', { id:l.id });
    const url = window.location.origin + window.location.pathname + '?s=' + r.share_token;
    const issue = await Compte.partager('Série de calcul : ' + l.name,
      'Voici une série de calcul mental à travailler : « ' + l.name + ' ».', url);
    $('m-series-note').textContent =
      issue === 'partage' ? 'Série partagée.'
      : issue === 'copie' ? 'Lien copié : ' + url
      : issue === 'annule' ? '' : 'Lien à recopier : ' + url;
  } catch(e){
    $('m-series-note').textContent = 'Partage impossible : ' + e.message + '.';
  }
}

$('m-nouvelle').onclick = () => {
  serieOuverte = null;
  majOngletComposer('neuf');
  $('m-nom').value = '';
  $('m-chapitre').value = '';
  $('m-publique').checked = false;
  dire('m-note', 'Nouvelle série.', '');
};

$('m-enregistrer').onclick = async () => {
  if (!Compte.connecte()){
    Avis.fenetre('Il faut un compte pour garder ta série',
      'Un compte gratuit garde cinq séries par application, et cinq reprises dans chaque '
        + 'bibliothèque. La création prend une minute.',
      [{ texte:'Créer un compte', principal:true, action: () => { Compte.ouvrir('register'); Compte.mode('register'); } },
       { texte:'Plus tard' }]);
    return;
  }
  const nom = $('m-nom').value.trim();
  if (!nom){ Avis.erreur('Donne un nom à cette série avant de l\u2019enregistrer.'); $('m-nom').focus(); return; }
  try {
    const corps = {
      name: nom, chapter: $('m-chapitre').value.trim(), famille: famille,
      reglages: reglages, nb: parseInt($('m-nb').value, 10),
      is_public: $('m-publique').checked
    };
    if (serieOuverte) corps.id = serieOuverte.id;
    const r = await Compte.appel('math_save', corps);
    await chargerMesSeries();
    serieOuverte = mesSeries.find(l => l.id === (corps.id || r.id)) || null;
    majOngletComposer(serieOuverte ? 'modifier' : 'neuf');
    Avis.succes('« ' + nom + ' » est enregistrée'
      + ($('m-publique').checked ? ' et publiée.' : '.'));
    dire('m-note', '', '');
  } catch(e){
    Avis.erreur('Enregistrement impossible : ' + e.message + '.');
  }
};

/* =========================================================
   La bibliothèque partagée
   ========================================================= */
async function chercherBiblio(){
  const ul = $('m-biblio-liste');
  $('m-biblio-note').textContent = 'Recherche…';
  try {
    const r = await Compte.appel('math_library', null, {
      q: $('m-biblio-q').value.trim(), famille: $('m-biblio-famille').value
    });
    const listes = r.lists || [];
    ul.innerHTML = '';
    listes.forEach(l => ul.appendChild(ligneBiblio(l, r.connecte, r.abonne)));
    $('m-biblio-note').textContent = listes.length
      ? listes.length + (listes.length > 1 ? ' séries partagées.' : ' série partagée.')
        + (r.connecte ? '' : ' Crée un compte pour les ouvrir.')
      : 'Aucune série ne correspond pour l\u2019instant.';
  } catch(e){
    ul.innerHTML = '';
    $('m-biblio-note').textContent = 'Recherche impossible : ' + e.message + '.';
  }
}

function ligneBiblio(l, connecte, abonne){
  const li = document.createElement('li');
  const t = document.createElement('span');
  t.className = 't';
  t.textContent = l.name;
  li.appendChild(t);

  const fam = document.createElement('span');
  fam.className = 'badge';
  fam.textContent = (M.FAMILLES[l.famille] || {}).nom || l.famille;
  li.appendChild(fam);

  const utiliser = document.createElement('button');
  utiliser.className = 'mini';
  utiliser.textContent = connecte ? 'S\u2019entraîner' : 'Ouvrir avec un compte';
  utiliser.onclick = async () => {
    if (!connecte){ Compte.ouvrir('register'); Compte.mode('register'); return; }
    try {
      const r = await Compte.appel('math_open', null, { t: l.share_token });
      ouvrirSerie(r.list, true);
    } catch(e){ $('m-biblio-note').textContent = 'Ouverture impossible : ' + e.message + '.'; }
  };
  li.appendChild(utiliser);

  if (connecte){
    const garder = document.createElement('button');
    garder.className = 'mini';
    garder.textContent = 'Enregistrer chez moi';
    garder.onclick = async () => {
      try {
        const r = await Compte.appel('math_borrow', { token: l.share_token });
        await chargerMesSeries();
        $('m-biblio-note').textContent = r.already
          ? 'Elle était déjà dans tes séries.'
          : '« ' + l.name + ' » est enregistrée dans tes séries.';
      } catch(e){ $('m-biblio-note').textContent = 'Impossible : ' + e.message + '.'; }
    };
    li.appendChild(garder);
  }

  const signaler = document.createElement('button');
  signaler.className = 'mini del';
  signaler.textContent = 'Signaler';
  signaler.onclick = async () => {
    if (!window.confirm('Signaler cette série comme inappropriée ?')) return;
    try {
      const r = await Compte.appel('math_report', { id: l.id });
      $('m-biblio-note').textContent = (r.count >= 3)
        ? 'Merci. Cette série est retirée en attendant vérification.'
        : 'Merci, le signalement est enregistré.';
    } catch(e){ $('m-biblio-note').textContent = 'Signalement impossible : ' + e.message + '.'; }
  };
  li.appendChild(signaler);

  const meta = document.createElement('span');
  meta.className = 'meta';
  meta.textContent = (l.proprietaire ? 'de ' + l.proprietaire + ' · ' : '')
    + (l.chapter ? l.chapter + ' · ' : '') + l.nb + ' calculs · ' + decrire(l.famille, l.reglages);
  li.appendChild(meta);
  return li;
}

$('m-biblio-q').addEventListener('input', () => {
  clearTimeout(biblioMinuteur);
  biblioMinuteur = setTimeout(chercherBiblio, 400);
});
$('m-biblio-famille').addEventListener('change', chercherBiblio);

/* =========================================================
   Mes résultats
   ========================================================= */
async function chargerResultats(){
  const invite = $('m-res-invite');
  const box = $('m-res-box');
  if (!Compte.connecte()){
    invite.hidden = false; box.hidden = true;
    $('m-res-invite-texte').textContent = 'Le suivi des résultats demande un compte, puis un abonnement.';
    $('m-res-bouton').textContent = 'Créer un compte';
    $('m-res-bouton').onclick = () => { Compte.ouvrir('register'); Compte.mode('register'); };
    return;
  }
  if (!Compte.abonne()){
    invite.hidden = false; box.hidden = true;
    $('m-res-invite-texte').textContent = 'Le suivi des résultats fait partie de l\u2019abonnement. '
      + 'Les résultats déjà enregistrés ne sont pas effacés.';
    $('m-res-bouton').textContent = 'Voir l\u2019abonnement';
    $('m-res-bouton').onclick = () => { window.location.href = 'abonnement.html'; };
    return;
  }
  invite.hidden = true; box.hidden = false;

  try {
    const r = await Compte.appel('math_attempts');
    const listes = r.listes || [];
    const ul = $('m-res-liste');
    ul.innerHTML = '';
    listes.forEach(d => ul.appendChild(ligneSuivi(d)));
    $('m-res-note').textContent = listes.length
      ? listes.length + (listes.length > 1 ? ' séries suivies.' : ' série suivie.')
        + ' Chaque carré est une séance, de la plus ancienne à la plus récente.'
      : 'Aucun résultat pour l\u2019instant. Fais une série, le bilan s\u2019enregistrera tout seul.';
  } catch(e){
    $('m-res-note').textContent = 'Résultats indisponibles : ' + e.message + '.';
  }
}

function ligneSuivi(d){
  const li = document.createElement('li');
  const tete = document.createElement('div');
  tete.className = 'tete';
  const nom = document.createElement('b');
  nom.textContent = d.label || (M.FAMILLES[d.famille] || {}).nom || 'Calcul';
  tete.appendChild(nom);
  const nb = document.createElement('span');
  nb.className = 'badge';
  nb.textContent = d.nb + (d.nb > 1 ? ' séances' : ' séance');
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
    c.title = e.correct + ' sur ' + e.asked + (e.secondes ? ' — ' + e.secondes + ' s' : '');
    c.innerHTML = e.errors + '<small>' + (e.errors > 1 ? 'fautes' : 'faute') + '</small>';
    essais.appendChild(c);
  });
  li.appendChild(essais);

  if (d.nb > 1){
    const t = document.createElement('p');
    t.className = 'tendance';
    const ecart = d.premier_erreurs - d.dernier_erreurs;
    if (ecart > 0) t.innerHTML = '<b>' + ecart + ' faute' + (ecart > 1 ? 's' : '') + ' de moins</b> qu\u2019à la première séance.';
    else if (ecart < 0) t.innerHTML = '<b class="pire">' + (-ecart) + ' de plus</b> qu\u2019à la première séance.';
    else t.textContent = 'Autant de fautes qu\u2019à la première séance.';
    if (d.meilleur_erreurs === 0) t.innerHTML += ' Une fois sans faute.';
    li.appendChild(t);
  }
  return li;
}

/* =========================================================
   Démarrage
   ========================================================= */
/* Les trois encadrés de l'accueil ouvrent chacun leur chapitre. */
(function chapitreDemande(){
  let c = null;
  try { c = new URLSearchParams(window.location.search).get('c'); } catch(e){}
  const table = { mental:'Calcul mental', operations:'Les opérations posées',
                  nombres:'Les nombres', mesures:'Grandeurs et mesures',
                  algebre:'Fonctions et algèbre', espace:'L\u2019espace' };
  if (c && table[c]){
    chapitreOuvert = table[c];
    const premiere = Object.keys(M.FAMILLES).find(f => (M.FAMILLES[f].groupe || '') === table[c]);
    if (premiere){ famille = premiere; reglages = Object.assign({}, M.FAMILLES[premiere].defaut); }
    try { history.replaceState(null, '', window.location.pathname); } catch(e){}
  }
})();

remplirFamilles($('m-filtre-famille'), 'Toutes les familles');
remplirFamilles($('m-biblio-famille'), 'Toutes les familles');
peindreFamilles();
peindreReglages();

// série reçue par un lien : ?s=…
(async function serieRecue(){
  let t = null;
  try { t = new URLSearchParams(window.location.search).get('s'); } catch(e){}
  if (!t) return;
  try { history.replaceState(null, '', window.location.pathname); } catch(e){}
  try {
    const r = await Compte.appel('math_open', null, { t: t });
    ouvrirSerie(r.list, true);
  } catch(e){
    dire('m-note', 'Ce lien de série ne fonctionne plus.', 'err');
  }
})();

Compte.demarrer(() => { chargerMesSeries(); });

/* Contrôles de version : voir INSTALLATION.md */
(function verifierVersion(){
  const VERSION = '2026-11-05';
  const corps = document.body || document.documentElement;
  const page = (corps && corps.getAttribute) ? corps.getAttribute('data-version') : null;
  if (page !== VERSION){
    const message = 'La page (' + (page || 'version inconnue') + ') et le script (' + VERSION
      + ') ne correspondent pas. Recharge en vidant le cache — Ctrl+Maj+R, ou Cmd+Maj+R sur Mac —'
      + ' et vérifie que tous les fichiers ont bien été envoyés sur le serveur.';
    console.warn('[teaching] ' + message);
    if (window.alerter) window.alerter(message);
  }
  if (window.verifierStyles) window.verifierStyles(VERSION);
})();
