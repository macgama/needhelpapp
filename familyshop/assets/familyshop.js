"use strict";

/* =========================================================
   FamilyShop — l'application.

   Une page, quatre écrans, et un principe : l'état vient du
   serveur, jamais de l'écran. Chaque écriture renvoie l'état
   à jour, et l'on repeint. C'est un peu plus de données sur le
   réseau, mais cela supprime toute une famille de bogues où
   l'affichage et la base finissent par se contredire.
   ========================================================= */
(function () {

const VERSION = '2026-11-05';
const $ = (id) => document.getElementById(id);
const I = window.Ingredients;
const C = window.Consolider;

/* L'état, tel que le serveur le voit. */
let etat = { foyer:null, membres:[], recettes:[], menu:[], liste:[], habitudes:[], version:0 };
let ecran = 'liste';
let lundi = debutSemaine(new Date());
let recetteEditee = null;
let sondage = null;

/* ---------------------------------------------------------
   Le réseau

   On passe par Compte.appel() plutôt que par fetch : cette couche
   tient le jeton anti-rejeu à jour et rejoue la requête quand la
   session vient d'être renouvelée. Le refaire ici, c'était en tenir
   deux versions — et la première oubliait justement le jeton.
   --------------------------------------------------------- */
function appel(action, corps){
  return window.Compte.appel(action, corps);
}

/** Range ce que le serveur renvoie, sans écraser ce qu'il n'envoie pas. */
function absorber(d){
  ['foyer','membres','recettes','menu','liste','habitudes'].forEach(k => {
    if (d[k] !== undefined) etat[k] = d[k];
  });
  if (d.version !== undefined) etat.version = d.version;
}

async function toutCharger(){
  absorber(await appel('tout'));
  peindre();
}

/* ---------------------------------------------------------
   La synchronisation

   On ne demande pas la liste toutes les cinq secondes : on demande
   un nombre. S'il a bougé, alors seulement on recharge. Un foyer
   inactif ne coûte donc presque rien au serveur.

   Le sondage s'arrête quand l'onglet passe en arrière-plan : un
   téléphone dans une poche n'a aucune raison d'interroger le serveur.
   --------------------------------------------------------- */
function demarrerSondage(){
  arreterSondage();
  sondage = setInterval(async () => {
    if (document.hidden) return;
    try {
      const d = await appel('version');
      if (d.connecte && d.version !== etat.version){
        await toutCharger();
      }
    } catch(e){ /* réseau coupé : on réessaiera au tour suivant */ }
  }, 5000);
}
function arreterSondage(){ if (sondage){ clearInterval(sondage); sondage = null; } }

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && etat.foyer){
    // au retour, on rattrape tout de suite plutôt que d'attendre le tour
    appel('version').then(d => { if (d.connecte && d.version !== etat.version) toutCharger(); })
                    .catch(() => {});
  }
});

/* ---------------------------------------------------------
   Les dates
   --------------------------------------------------------- */
const JOURS = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août',
              'septembre','octobre','novembre','décembre'];

function debutSemaine(d){
  const x = new Date(d);
  const j = (x.getDay() + 6) % 7;      // lundi = 0
  x.setDate(x.getDate() - j);
  x.setHours(0, 0, 0, 0);
  return x;
}
function iso(d){
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
       + '-' + String(d.getDate()).padStart(2, '0');
}
function plus(d, n){ const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function estAujourdhui(d){ return iso(d) === iso(new Date()); }

/* ---------------------------------------------------------
   Navigation
   --------------------------------------------------------- */
function aller(nom){
  ecran = nom;
  ['liste','semaine','recettes','foyer'].forEach(e => {
    const p = $('ecran-' + e);
    if (p) p.className = 'panel' + (e === nom ? ' on' : '');
  });
  document.querySelectorAll('#onglets .step').forEach(b => {
    b.setAttribute('aria-current', b.dataset.ecran === nom ? 'true' : 'false');
  });
  window.scrollTo({ top:0, behavior:'smooth' });
}

/* ---------------------------------------------------------
   L'affichage
   --------------------------------------------------------- */
function peindre(){
  peindreListe();
  peindreSemaine();
  peindreRecettes();
  peindreFoyer();
}

function echappe(t){
  const d = document.createElement('div');
  d.textContent = String(t === null || t === undefined ? '' : t);
  return d.innerHTML;
}

function quantiteLisible(a){
  if (a.quantite === null || a.quantite === undefined) return '';
  const n = Math.round(a.quantite * 100) / 100;
  const s = Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
  return a.unite ? s + ' ' + a.unite : s;
}

/* ---------- la liste ---------- */
function peindreListe(){
  const corps = $('liste-corps');
  corps.innerHTML = '';
  const liste = etat.liste || [];

  const reste = liste.filter(a => !a.coche).length;
  $('liste-resume').textContent = liste.length === 0
    ? 'Rien à acheter pour l\u2019instant.'
    : (reste === 0
        ? 'Tout est pris. Bonne journée !'
        : reste + (reste > 1 ? ' articles à prendre' : ' article à prendre')
          + (liste.length - reste > 0 ? ' · ' + (liste.length - reste) + ' déjà dans le chariot' : ''));
  $('liste-vide').hidden = liste.length > 0;
  $('liste-ranger').hidden = (liste.length - reste) === 0;

  // on regroupe par rayon, dans l'ordre déjà décidé par le serveur
  const rayons = [];
  liste.forEach(a => {
    let r = rayons.find(x => x.code === a.rayon);
    if (!r){ r = { code:a.rayon, articles:[] }; rayons.push(r); }
    r.articles.push(a);
  });

  rayons.forEach(r => {
    const bloc = document.createElement('div');
    bloc.className = 'rayon';
    const h = document.createElement('h3');
    h.textContent = I.nomRayon(r.code);
    bloc.appendChild(h);

    const ul = document.createElement('ul');
    ul.className = 'articles';
    r.articles.forEach(a => ul.appendChild(ligneArticle(a)));
    bloc.appendChild(ul);
    corps.appendChild(bloc);
  });

  peindreHabitudes();
}

function ligneArticle(a){
  const li = document.createElement('li');
  li.className = 'article' + (a.coche ? ' pris' : '');
  li.setAttribute('role', 'button');
  li.setAttribute('tabindex', '0');

  const q = quantiteLisible(a);
  li.innerHTML =
      '<span class="case" aria-hidden="true">' + (a.coche ? '✓' : '') + '</span>'
    + '<span class="corps">'
    +   '<span class="nom">' + echappe(a.label) + '</span>'
    +   (q ? '<span class="quantite">' + echappe(q) + '</span>' : '')
    +   (a.origine === 'libre' ? '<span class="marque-libre">ajouté</span>' : '')
    +   (a.detail ? '<span class="detail">pour ' + echappe(a.detail) + '</span>' : '')
    +   (a.coche && a.coche_par ? '<span class="detail">pris par ' + echappe(a.coche_par) + '</span>' : '')
    + '</span>'
    + '<button class="retirer" aria-label="Retirer de la liste">×</button>';

  const basculer = async () => {
    /* On peint tout de suite, avant la réponse du serveur : au magasin,
       une case qui met une seconde à se cocher donne l'impression que
       l'application n'a pas entendu. On rétablit si l'appel échoue. */
    a.coche = !a.coche;
    peindreListe();
    try {
      const d = await appel('liste_cocher', { id:a.id, coche:a.coche });
      etat.version = d.version;
    } catch(e){
      a.coche = !a.coche;
      peindreListe();
      Avis.erreur('Impossible de cocher : ' + e.message);
    }
  };

  li.onclick = (e) => { if (!e.target.classList.contains('retirer')) basculer(); };
  li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); basculer(); } };
  li.querySelector('.retirer').onclick = async (e) => {
    e.stopPropagation();
    try { absorber(await appel('liste_supprimer', { id:a.id })); peindreListe(); }
    catch(err){ Avis.erreur(err.message); }
  };
  return li;
}

function peindreHabitudes(){
  const zone = $('habitudes');
  const puces = $('puces-habitudes');
  const dedans = new Set((etat.liste || []).map(a => I.cle(a.label)));
  const proposees = (etat.habitudes || []).filter(h => !dedans.has(h.cle)).slice(0, 10);
  zone.hidden = proposees.length === 0;
  puces.innerHTML = '';
  proposees.forEach(h => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = h.label;
    b.onclick = () => ajouter(h.label, null, h.unite || '', h.rayon);
    puces.appendChild(b);
  });
}

async function ajouter(label, quantite, unite, rayon){
  if (!label || !label.trim()) return;
  const devine = I.deviner(label);
  try {
    absorber(await appel('liste_ajouter', {
      label: label.trim(),
      quantite: quantite,
      unite: unite !== undefined && unite !== null ? unite : devine.unite,
      rayon: rayon || devine.rayon
    }));
    peindreListe();
  } catch(e){ Avis.erreur(e.message); }
}

/* ---------- la semaine ---------- */
function peindreSemaine(){
  const corps = $('semaine-corps');
  corps.innerHTML = '';
  const grille = document.createElement('div');
  grille.className = 'jours';

  for (let i = 0; i < 7; i++){
    const d = plus(lundi, i);
    const cle = iso(d);
    const carte = document.createElement('div');
    carte.className = 'jour' + (estAujourdhui(d) ? ' aujourdhui' : '');
    carte.innerHTML = '<h3>' + JOURS[d.getDay()] + '</h3>'
                    + '<span class="date">' + d.getDate() + ' ' + MOIS[d.getMonth()] + '</span>';

    ['midi', 'soir'].forEach(repas => {
      const pose = (etat.menu || []).find(m => m.jour === cle && m.repas === repas);
      const bloc = document.createElement('div');
      bloc.className = 'repas';
      bloc.innerHTML = '<span class="quand">' + repas + '</span>';

      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'plat' + (pose ? ' pose' : '');
      b.textContent = pose ? pose.nom : '+ ajouter';
      b.onclick = () => choisirPlat(cle, repas, pose);
      bloc.appendChild(b);

      /* Le nombre à table change plus souvent que le plat : garde
         alternée, invités, quelqu'un qui rentre tard. Il se règle donc
         ici même, sans rouvrir de fenêtre. */
      if (pose) bloc.appendChild(reglageCouverts(cle, repas, pose));
      carte.appendChild(bloc);
    });
    grille.appendChild(carte);
  }
  corps.appendChild(grille);
}

/** Le petit réglage « moins / n / plus » sous un repas posé. */
function reglageCouverts(jour, repas, pose){
  const zone = document.createElement('div');
  zone.className = 'couverts-reglage';

  const changer = async (delta) => {
    const voulu = Math.max(1, Math.min(20, pose.couverts + delta));
    if (voulu === pose.couverts) return;
    pose.couverts = voulu;          // on montre tout de suite
    peindreSemaine();
    try {
      absorber(await appel('menu_poser', {
        jour: jour, repas: repas,
        recipe_id: pose.recipe_id || 0,
        libelle: pose.recipe_id ? '' : pose.nom,
        couverts: voulu
      }));
      peindre();
    } catch(e){
      pose.couverts -= delta;
      peindreSemaine();
      Avis.erreur(e.message);
    }
  };

  const moins = document.createElement('button');
  moins.type = 'button'; moins.className = 'pas';
  moins.textContent = '−';
  moins.setAttribute('aria-label', 'Un couvert de moins');
  moins.onclick = (e) => { e.stopPropagation(); changer(-1); };

  const n = document.createElement('span');
  n.className = 'nb';
  n.textContent = pose.couverts + (pose.couverts > 1 ? ' couverts' : ' couvert');

  const plus = document.createElement('button');
  plus.type = 'button'; plus.className = 'pas';
  plus.textContent = '+';
  plus.setAttribute('aria-label', 'Un couvert de plus');
  plus.onclick = (e) => { e.stopPropagation(); changer(1); };

  zone.appendChild(moins); zone.appendChild(n); zone.appendChild(plus);
  return zone;
}

function choisirPlat(jour, repas, pose){
  const recettes = etat.recettes || [];
  if (!recettes.length && !pose){
    Avis.fenetre('Il n\u2019y a encore aucune recette',
      'Pour composer la semaine, il faut des plats. La première recette prend '
      + 'deux minutes : un nom, et la liste de ce qu\u2019il faut.',
      [{ texte:'Créer une recette', principal:true, action:() => { aller('recettes'); nouvelleRecette(); } },
       { texte:'Plus tard' }]);
    return;
  }

  const actions = [];
  if (pose){
    actions.push({ texte:'Retirer ce repas', action: async () => {
      try { absorber(await appel('menu_retirer', { jour, repas })); peindre(); Avis.succes('Repas retiré.'); }
      catch(e){ Avis.erreur(e.message); }
    }});
  }

  /* Une fenêtre de choix qui liste les recettes : on ne peut pas se servir
     d'Avis.fenetre, limitée à trois boutons. */
  ouvrirChoixRecette(jour, repas, pose, actions);
}

function ouvrirChoixRecette(jour, repas, pose, actionsSup){
  const ancien = $('choix-plat');
  if (ancien) ancien.remove();

  const fond = document.createElement('div');
  fond.className = 'modal';
  fond.id = 'choix-plat';
  const carte = document.createElement('div');
  carte.className = 'modal-card';
  carte.setAttribute('role', 'dialog');
  carte.setAttribute('aria-modal', 'true');

  const d = new Date(jour + 'T12:00:00');
  carte.innerHTML =
      '<button class="modal-close" aria-label="Fermer">×</button>'
    + '<h2 class="title">' + JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()]
    +   ' · ' + repas + '</h2>'
    + '<p class="sub">Choisissez un plat, ou écrivez ce que vous mangez.</p>';

  const couvertsLigne = document.createElement('label');
  couvertsLigne.className = 'champ';
  couvertsLigne.innerHTML = '<span>Combien à table&nbsp;?</span>';
  const couverts = document.createElement('input');
  couverts.type = 'number'; couverts.min = '1'; couverts.max = '20';
  couverts.value = pose ? pose.couverts : ((etat.foyer && etat.foyer.couverts) || 4);
  couvertsLigne.appendChild(couverts);
  carte.appendChild(couvertsLigne);

  const liste = document.createElement('div');
  liste.className = 'grille-recettes';
  liste.style.marginTop = '14px';
  (etat.recettes || []).forEach(r => {
    const b = document.createElement('button');
    b.className = 'carte-recette';
    b.type = 'button';
    b.innerHTML = '<h3>' + echappe(r.nom) + '</h3>'
      + '<span class="meta">pour ' + r.couverts + (r.minutes ? ' · ' + r.minutes + ' min' : '')
      + ' · ' + r.ingredients.length + ' ingrédients</span>';
    b.onclick = async () => {
      try {
        absorber(await appel('menu_poser', {
          jour, repas, recipe_id:r.id, couverts: parseInt(couverts.value, 10) || 4
        }));
        fond.remove(); peindre();
        Avis.succes('« ' + r.nom + ' » posé. La liste a suivi.');
      } catch(e){ Avis.erreur(e.message); }
    };
    liste.appendChild(b);
  });
  carte.appendChild(liste);

  const libre = document.createElement('form');
  libre.className = 'rejoindre';
  libre.style.marginTop = '16px';
  libre.innerHTML = '<input type="text" placeholder="Restaurant, restes, chez mamie…" maxlength="120" style="flex:1 1 auto;font-family:inherit;letter-spacing:0;text-transform:none">'
                  + '<button class="btn btn--ghost" type="submit">Poser</button>';
  libre.onsubmit = async (e) => {
    e.preventDefault();
    const texte = libre.querySelector('input').value.trim();
    if (!texte) return;
    try {
      absorber(await appel('menu_poser', {
        jour, repas, libelle:texte, couverts: parseInt(couverts.value, 10) || 4
      }));
      fond.remove(); peindre();
    } catch(err){ Avis.erreur(err.message); }
  };
  carte.appendChild(libre);

  (actionsSup || []).forEach(a => {
    const b = document.createElement('button');
    b.className = 'btn btn--ghost btn--danger';
    b.style.marginTop = '14px';
    b.textContent = a.texte;
    b.onclick = () => { fond.remove(); a.action(); };
    carte.appendChild(b);
  });

  carte.querySelector('.modal-close').onclick = () => fond.remove();
  fond.onclick = (e) => { if (e.target === fond) fond.remove(); };
  fond.appendChild(carte);
  document.body.appendChild(fond);
}

/* ---------- les recettes ---------- */
/* ---------------------------------------------------------
   L'illustration du plat

   Réservée aux administrateurs de NeedHelpApp — le rôle vient du
   portail, le serveur le revérifie, et masquer le bloc ne protège
   rien : c'est du confort, pas une barrière.
   --------------------------------------------------------- */
function estAdmin(){
  const u = window.Compte.utilisateur();
  return !!(u && u.role === 'admin');
}

function majIllustration(r){
  const bloc = $('r-illustration');
  if (!bloc) return;
  bloc.hidden = !estAdmin();
  if (bloc.hidden) return;

  const img = $('r-image-apercu');
  const a = r && r.image;
  img.hidden = !a;
  if (a) img.src = r.image;
  $('r-image-retirer').hidden = !a;
  $('r-image-fichier').value = '';
  $('r-image-etat').textContent = r
    ? (a ? 'Cette image sert à toutes les familles qui ont ce plat.'
         : 'Aucune image pour ce plat.')
    : 'Enregistrez d\u2019abord la recette : l\u2019image se rattache à son nom.';
  $('r-image-poser').disabled = !r;
}

async function deposerIllustration(){
  const nom = ($('r-nom').value || '').trim();
  const f = $('r-image-fichier').files[0];
  if (!nom){ Avis.erreur('Donnez d\u2019abord un nom au plat.'); return; }
  if (!f){ Avis.erreur('Choisissez une image.'); return; }

  const paquet = new FormData();
  paquet.append('libelle', nom);
  paquet.append('image', f);

  const bouton = $('r-image-poser');
  bouton.disabled = true;
  const avant = bouton.textContent;
  bouton.textContent = 'Envoi…';
  try {
    const d = await appel('illustration_poser', paquet);
    Avis.succes('Image déposée (' + d.largeur + '×' + d.hauteur
                + ', ' + Math.round(d.octets / 1024) + ' Ko).');
    absorber(await appel('tout'));
    peindreRecettes();
    const maj = (etat.recettes || []).find(x => recetteEditee && x.id === recetteEditee.id);
    majIllustration(maj || recetteEditee);
  } catch (e){
    Avis.erreur(e.message);
  } finally {
    bouton.disabled = false;
    bouton.textContent = avant;
  }
}

function peindreRecettes(){
  const corps = $('recettes-corps');
  const filtre = ($('recettes-recherche').value || '').toLowerCase().trim();
  corps.innerHTML = '';

  const toutes = etat.recettes || [];
  const vues = filtre
    ? toutes.filter(r => r.nom.toLowerCase().indexOf(filtre) >= 0
        || r.ingredients.some(i => i.label.toLowerCase().indexOf(filtre) >= 0))
    : toutes;

  $('recettes-resume').textContent = toutes.length === 0
    ? 'Aucune recette pour l\u2019instant.'
    : toutes.length + (toutes.length > 1 ? ' recettes' : ' recette')
      + (filtre ? ' · ' + vues.length + ' trouvée(s)' : '');
  $('recettes-vide').hidden = toutes.length > 0;

  vues.forEach(r => {
    const b = document.createElement('button');
    b.className = 'carte-recette';
    b.type = 'button';
    const apercu = r.ingredients.slice(0, 5).map(i => i.label).join(', ')
      + (r.ingredients.length > 5 ? '…' : '');
    b.innerHTML =
        (r.image
          ? '<img class="vignette" loading="lazy" alt="" src="' + echappe(r.image) + '">'
          : '')
      + '<span class="etoile" role="img" aria-label="' + (r.favori ? 'Favori' : 'Pas favori') + '">'
      +   (r.favori ? '★' : '☆') + '</span>'
      + '<h3>' + echappe(r.nom) + '</h3>'
      + '<span class="meta">pour ' + r.couverts + (r.minutes ? ' · ' + r.minutes + ' min' : '') + '</span>'
      + (apercu ? '<p class="apercu">' + echappe(apercu) + '</p>' : '');
    b.onclick = (e) => {
      if (e.target.classList.contains('etoile')){
        e.stopPropagation();
        appel('recette_favori', { id:r.id }).then(d => { absorber(d); peindreRecettes(); })
                                            .catch(err => Avis.erreur(err.message));
        return;
      }
      ouvrirRecette(r);
    };
    corps.appendChild(b);
  });
}

function nouvelleRecette(){ ouvrirRecette(null); }

function ouvrirRecette(r){
  recetteEditee = r;
  $('recette-editeur').hidden = false;
  $('recette-titre').textContent = r ? 'Modifier la recette' : 'Nouvelle recette';
  $('r-nom').value = r ? r.nom : '';
  $('r-couverts').value = r ? r.couverts : ((etat.foyer && etat.foyer.couverts) || 4);
  $('r-minutes').value = r ? r.minutes : 0;
  $('r-categorie').value = r ? r.categorie : 'plat';
  $('r-notes').value = r ? r.notes : '';
  $('r-supprimer').hidden = !r;
  $('r-source').hidden = true;
  majIllustration(r);

  const zone = $('r-ingredients');
  zone.innerHTML = '';
  const lignes = (r && r.ingredients.length) ? r.ingredients : [{ label:'', quantite:null, unite:'', rayon:'divers' }];
  lignes.forEach(i => zone.appendChild(ligneIngredient(i)));

  $('recette-editeur').scrollIntoView({ behavior:'smooth', block:'start' });
  setTimeout(() => $('r-nom').focus(), 200);
}

function ligneIngredient(i){
  const div = document.createElement('div');
  div.className = 'ligne-ingredient';

  const q = document.createElement('input');
  q.className = 'q'; q.type = 'text'; q.inputMode = 'decimal';
  q.placeholder = '—'; q.setAttribute('aria-label', 'Quantité');
  q.value = (i.quantite === null || i.quantite === undefined) ? '' : i.quantite;

  const u = document.createElement('select');
  u.className = 'u'; u.setAttribute('aria-label', 'Unité');
  remplirUnites(u, i.unite);

  const l = document.createElement('input');
  l.className = 'l'; l.type = 'text'; l.placeholder = 'Ingrédient';
  l.setAttribute('aria-label', 'Ingrédient'); l.value = i.label || '';

  const r = document.createElement('select');
  r.className = 'r'; r.setAttribute('aria-label', 'Rayon');
  I.RAYONS.forEach(x => {
    const o = document.createElement('option');
    o.value = x.code; o.textContent = x.nom;
    r.appendChild(o);
  });
  r.value = i.rayon || 'divers';

  /* Le rayon et l'unité se devinent pendant qu'on tape : ne les proposer
     qu'après coup obligerait à revenir en arrière sur chaque ligne. */
  l.oninput = () => {
    const d = I.deviner(l.value);
    if (d.connu || l.value.length > 3){
      r.value = d.rayon;
      if (!u.value && d.unite) u.value = d.unite;
    }
  };

  const x = document.createElement('button');
  x.className = 'x'; x.type = 'button'; x.textContent = '×';
  x.setAttribute('aria-label', 'Retirer cet ingrédient');
  x.onclick = () => div.remove();

  [q, u, l, r, x].forEach(e => div.appendChild(e));
  return div;
}

function remplirUnites(select, valeur){
  const unites = ['', 'g', 'kg', 'ml', 'cl', 'dl', 'l', 'cs', 'cc', 'pièce', 'tranche',
                  'gousse', 'botte', 'boîte', 'paquet', 'sachet', 'pot', 'bouteille',
                  'cube', 'pincée'];
  select.innerHTML = '';
  unites.forEach(u => {
    const o = document.createElement('option');
    o.value = u; o.textContent = u === '' ? '—' : u;
    select.appendChild(o);
  });
  select.value = valeur || '';
}

async function enregistrerRecette(){
  const nom = $('r-nom').value.trim();
  if (!nom){ Avis.erreur('Donne un nom à cette recette.'); $('r-nom').focus(); return; }

  const ingredients = [];
  document.querySelectorAll('#r-ingredients .ligne-ingredient').forEach(d => {
    const label = d.querySelector('.l').value.trim();
    if (!label) return;
    const q = d.querySelector('.q').value.trim();
    ingredients.push({
      label: label,
      quantite: q === '' ? null : q,
      unite: d.querySelector('.u').value,
      rayon: d.querySelector('.r').value
    });
  });
  if (!ingredients.length){
    Avis.erreur('Une recette sans ingrédient ne remplira aucune liste.');
    return;
  }

  try {
    const d = await appel('recette_enregistrer', {
      id: recetteEditee ? recetteEditee.id : 0,
      nom: nom,
      couverts: parseInt($('r-couverts').value, 10) || 4,
      minutes: parseInt($('r-minutes').value, 10) || 0,
      categorie: $('r-categorie').value,
      notes: $('r-notes').value,
      ingredients: ingredients
    });
    absorber(d);
    $('recette-editeur').hidden = true;
    recetteEditee = null;
    peindre();
    Avis.succes('« ' + nom + ' » est enregistrée : ' + d.ingredients + ' ingrédients.');
  } catch(e){ Avis.erreur(e.message); }
}

/* ---------- le foyer ---------- */
function peindreFoyer(){
  const f = etat.foyer;
  if (!f) return;
  $('f-nom').value = f.nom;
  $('f-couverts').value = f.couverts;
  $('f-code').textContent = f.code;

  const ul = $('f-membres');
  ul.innerHTML = '';
  (etat.membres || []).forEach(m => {
    const li = document.createElement('li');
    li.innerHTML =
        '<span class="pastille">' + echappe((m.nom || '?').charAt(0).toUpperCase()) + '</span>'
      + '<span class="qui"><b>' + echappe(m.nom) + '</b>'
      +   '<span class="role"> · ' + (m.role === 'proprietaire' ? 'a ouvert le foyer' : 'membre') + '</span></span>';
    if (f.mon_role === 'proprietaire' && m.role !== 'proprietaire'){
      const b = document.createElement('button');
      b.className = 'btn btn--ghost btn--tiny';
      b.textContent = 'Retirer';
      b.onclick = () => {
        Avis.fenetre('Retirer ' + m.nom + ' du foyer ?',
          'Cette personne ne verra plus la liste ni les recettes. Elle gardera '
          + 'son compte NeedHelpApp et repartira avec un foyer vide.',
          [{ texte:'Retirer', principal:true, action: async () => {
              try { absorber(await appel('foyer_retirer', { user_id:m.id })); peindreFoyer();
                    Avis.succes(m.nom + ' ne fait plus partie du foyer.'); }
              catch(e){ Avis.erreur(e.message); }
            }},
           { texte:'Annuler' }]);
      };
      li.appendChild(b);
    }
    ul.appendChild(li);
  });
}

/* ---------------------------------------------------------
   Les commandes
   --------------------------------------------------------- */
document.querySelectorAll('#onglets .step').forEach(b => {
  b.onclick = () => aller(b.dataset.ecran);
});

$('ajout-forme').onsubmit = (e) => {
  e.preventDefault();
  const label = $('ajout-label').value.trim();
  if (!label) return;
  const q = $('ajout-quantite').value.trim();
  ajouter(label, q === '' ? null : q, $('ajout-unite').value, null);
  $('ajout-label').value = '';
  $('ajout-quantite').value = '';
  $('ajout-suggestions').hidden = true;
  $('ajout-label').focus();
};

$('ajout-label').oninput = () => {
  const texte = $('ajout-label').value.trim();
  const zone = $('ajout-suggestions');
  if (texte.length < 2){ zone.hidden = true; return; }

  const mots = I.suggerer(texte, 6);
  zone.innerHTML = '';
  zone.hidden = mots.length === 0;
  mots.forEach(m => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = m;
    b.onclick = () => {
      $('ajout-label').value = m;
      const d = I.deviner(m);
      if (d.unite) $('ajout-unite').value = d.unite;
      zone.hidden = true;
      $('ajout-quantite').focus();
    };
    zone.appendChild(b);
  });

  // l'unité usuelle se propose d'elle-même
  const devine = I.deviner(texte);
  if (devine.connu && devine.unite) $('ajout-unite').value = devine.unite;
};

/* L'impression compose sa propre feuille, à part de l'écran : ce qu'on
   veut sur papier n'est pas ce qu'on veut à l'écran. On garde les articles
   déjà pris, barrés — un conjoint parti aux courses avec la feuille doit
   voir ce que l'autre a déjà rapporté. */
$('liste-imprimer').onclick = () => {
  const liste = etat.liste || [];
  if (!liste.length){
    Avis.erreur('La liste est vide : il n\u2019y a rien à imprimer.');
    return;
  }

  const rayons = [];
  liste.forEach(a => {
    let r = rayons.find(x => x.code === a.rayon);
    if (!r){ r = { code:a.rayon, articles:[] }; rayons.push(r); }
    r.articles.push(a);
  });

  const reste = liste.filter(a => !a.coche).length;
  const aujourd = new Date().toLocaleDateString('fr-CH',
    { weekday:'long', day:'numeric', month:'long' });

  let html = '<div class="f-entete">'
    + '<h1>' + echappe(etat.foyer ? etat.foyer.nom : 'Liste de courses') + '</h1>'
    + '<span class="quand">' + echappe(aujourd) + ' · '
    + reste + (reste > 1 ? ' articles' : ' article') + ' à prendre</span>'
    + '</div><div class="f-colonnes">';

  rayons.forEach(r => {
    html += '<div class="f-rayon"><h2>' + echappe(I.nomRayon(r.code)) + '</h2><ul>';
    r.articles.forEach(a => {
      const q = quantiteLisible(a);
      html += '<li' + (a.coche ? ' class="f-pris"' : '') + '>'
        + '<span class="f-case"></span>'
        + '<span class="f-nom">' + echappe(a.label) + '</span>'
        + (q ? '<span class="f-quantite">' + echappe(q) + '</span>' : '')
        + '</li>';
    });
    html += '</ul></div>';
  });

  html += '</div><div class="f-pied">FamilyShop · familyshop.needhelpapp.com</div>';
  $('feuille').innerHTML = html;
  window.print();
};

$('liste-ranger').onclick = () => {
  Avis.fenetre('Retirer ce qui est pris ?',
    'Les articles cochés quittent la liste. Ce qui n\u2019a pas été trouvé au '
    + 'magasin reste, pour la prochaine fois.',
    [{ texte:'Retirer', principal:true, action: async () => {
        try { absorber(await appel('liste_ranger', {})); peindreListe(); Avis.succes('Chariot rangé.'); }
        catch(e){ Avis.erreur(e.message); }
      }},
     { texte:'Annuler' }]);
};

$('semaine-precedente').onclick = () => { lundi = plus(lundi, -7); peindreSemaine(); };
$('semaine-suivante').onclick   = () => { lundi = plus(lundi, 7);  peindreSemaine(); };
$('semaine-aujourdhui').onclick = () => { lundi = debutSemaine(new Date()); peindreSemaine(); };

$('recette-nouvelle').onclick = nouvelleRecette;

/* Importer depuis une adresse.
   On rapporte le nom, les quantités et les ingrédients — des faits, que
   le droit d'auteur ne protège pas. On ne rapporte PAS les instructions :
   leur rédaction appartient à son auteur. On garde le lien, ce qui est
   d'ailleurs plus honnête envers le site que de le recopier. */
$('recette-web').onclick = () => {
  Avis.fenetre('Importer depuis une adresse',
    'Collez l\u2019adresse d\u2019une page de recette. Nous en tirons le nom, les '
    + 'quantités et les ingrédients. La façon de faire reste chez son auteur : '
    + 'un lien vers la page d\u2019origine sera ajouté aux notes.',
    [{ texte:'J\u2019ai compris' }]);

  const fond = document.getElementById('avis-modal');
  if (!fond) return;
  const carte = fond.querySelector('.modal-card');
  const forme = document.createElement('form');
  forme.className = 'rejoindre';
  forme.style.marginTop = '14px';
  forme.innerHTML = '<input type="url" placeholder="https://…" '
    + 'style="flex:1 1 auto;font-family:inherit;letter-spacing:0;text-transform:none" '
    + 'aria-label="Adresse de la recette">'
    + '<button class="btn" type="submit">Lire</button>';
  carte.insertBefore(forme, carte.querySelector('.actions'));
  setTimeout(() => forme.querySelector('input').focus(), 60);

  forme.onsubmit = async (e) => {
    e.preventDefault();
    const url = forme.querySelector('input').value.trim();
    if (!url) return;
    const bouton = forme.querySelector('button');
    bouton.disabled = true;
    bouton.textContent = 'Lecture…';
    try {
      const d = await appel('recette_lire_web', { url });
      Avis.fermer();
      proposerRecetteWeb(d.recette);
    } catch(err){
      bouton.disabled = false;
      bouton.textContent = 'Lire';
      Avis.erreur(err.message);
    }
  };
};

/** Ouvre l'éditeur pré-rempli : rien n'est enregistré sans relecture. */
function proposerRecetteWeb(r){
  aller('recettes');
  recetteEditee = null;
  $('recette-editeur').hidden = false;
  $('recette-titre').textContent = 'Recette importée — à vérifier';
  $('r-nom').value = r.nom || '';
  $('r-couverts').value = r.couverts || 4;
  $('r-minutes').value = r.minutes || 0;
  $('r-categorie').value = 'plat';
  $('r-notes').value = 'Recette d\u2019après ' + r.source;
  $('r-supprimer').hidden = true;

  const note = $('r-source');
  note.hidden = false;
  note.innerHTML = 'Lu depuis <a href="' + echappe(r.source) + '" target="_blank" rel="noopener">'
    + echappe(r.source.replace(/^https?:\/\//, '').split('/')[0]) + '</a>. '
    + 'Vérifiez les quantités : leur lecture automatique se trompe parfois. '
    + 'La façon de faire est restée sur le site d\u2019origine.';

  const zone = $('r-ingredients');
  zone.innerHTML = '';
  (r.ingredients || []).forEach(i => {
    const devine = I.deviner(i.label);
    zone.appendChild(ligneIngredient({
      label: i.label,
      quantite: i.quantite,
      unite: i.unite || devine.unite,
      rayon: devine.rayon
    }));
  });

  $('recette-editeur').scrollIntoView({ behavior:'smooth', block:'start' });
  Avis.succes(r.ingredients.length + ' ingrédients lus. Vérifiez, puis enregistrez.');
}

$('importer-depart').onclick = async () => {
  const b = $('importer-depart');
  b.disabled = true;
  b.textContent = 'Un instant…';
  try {
    const d = await appel('recettes_importer', { recettes: window.RecettesDepart.pretes() });
    absorber(d);
    peindre();
    Avis.succes(d.ajoutees + ' recettes ajoutées'
      + (d.sautees ? ', ' + d.sautees + ' déjà présentes' : '') + '.');
  } catch(e){ Avis.erreur(e.message); }
  b.disabled = false;
  b.textContent = 'Ajouter les 30 recettes';
};
$('recettes-recherche').oninput = peindreRecettes;
$('r-ajouter-ligne').onclick = () => {
  const zone = $('r-ingredients');
  const ligne = ligneIngredient({ label:'', quantite:null, unite:'', rayon:'divers' });
  zone.appendChild(ligne);
  ligne.querySelector('.l').focus();
};
$('r-enregistrer').onclick = enregistrerRecette;
$('r-annuler').onclick = () => { $('recette-editeur').hidden = true; recetteEditee = null; };
$('r-image-poser').onclick = deposerIllustration;
$('r-image-retirer').onclick = async () => {
  const nom = ($('r-nom').value || '').trim();
  if (!nom || !confirm('Retirer l\u2019illustration de « ' + nom + ' » ?\n\n'
      + 'Elle disparaîtra pour toutes les familles qui ont ce plat.')) return;
  try {
    await appel('illustration_retirer', { libelle: nom });
    Avis.succes('Illustration retirée.');
    absorber(await appel('tout'));
    peindreRecettes();
    majIllustration(null);
  } catch (e){ Avis.erreur(e.message); }
};

$('r-supprimer').onclick = () => {
  if (!recetteEditee) return;
  const nom = recetteEditee.nom;
  Avis.fenetre('Supprimer « ' + nom + ' » ?',
    'La recette disparaît, et les repas de la semaine qui s\u2019appuyaient dessus '
    + 'avec elle. La liste sera recalculée.',
    [{ texte:'Supprimer', principal:true, action: async () => {
        try {
          absorber(await appel('recette_supprimer', { id:recetteEditee.id }));
          $('recette-editeur').hidden = true; recetteEditee = null;
          peindre(); Avis.succes('« ' + nom + ' » est supprimée.');
        } catch(e){ Avis.erreur(e.message); }
      }},
     { texte:'Annuler' }]);
};

$('f-enregistrer').onclick = async () => {
  try {
    await appel('foyer_renommer', {
      nom: $('f-nom').value.trim(),
      couverts: parseInt($('f-couverts').value, 10) || 4
    });
    await toutCharger();
    Avis.succes('Foyer enregistré.');
  } catch(e){ Avis.erreur(e.message); }
};

$('f-copier').onclick = async () => {
  const code = etat.foyer ? etat.foyer.code : '';
  try { await navigator.clipboard.writeText(code); Avis.succes('Code copié : ' + code); }
  catch(e){ Avis.bandeau('Code du foyer : ' + code, 'ok'); }
};

$('f-nouveau-code').onclick = () => {
  Avis.fenetre('Changer le code du foyer ?',
    'L\u2019ancien code cessera de fonctionner. Ceux qui sont déjà dans le foyer '
    + 'y restent ; c\u2019est ainsi qu\u2019on empêche quelqu\u2019un d\u2019entrer avec un code '
    + 'qu\u2019on lui avait donné.',
    [{ texte:'Changer', principal:true, action: async () => {
        try { const d = await appel('foyer_nouveau_code', {});
              etat.foyer.code = d.code; peindreFoyer(); Avis.succes('Nouveau code : ' + d.code); }
        catch(e){ Avis.erreur(e.message); }
      }},
     { texte:'Annuler' }]);
};

$('f-rejoindre-forme').onsubmit = (e) => {
  e.preventDefault();
  const code = $('f-code-saisi').value.trim().toUpperCase();
  if (code.length < 8){ Avis.erreur('Un code de foyer compte huit caractères.'); return; }
  Avis.fenetre('Rejoindre ce foyer ?',
    'Vous quitterez le vôtre. Ses recettes et sa liste resteront chez ceux qui '
    + 'y sont encore — et disparaîtront si vous étiez seul.',
    [{ texte:'Rejoindre', principal:true, action: async () => {
        try {
          await appel('foyer_rejoindre', { code });
          $('f-code-saisi').value = '';
          await toutCharger();
          Avis.succes('Vous êtes dans « ' + etat.foyer.nom + ' ».');
        } catch(err){ Avis.erreur(err.message); }
      }},
     { texte:'Annuler' }]);
};

/* Les deux boutons de l'accueil mènent au même endroit : celui de la
   bannière, qu'on voit d'emblée, et celui du bas, qu'on atteint après
   avoir lu les arguments. */
['accueil-connexion', 'banniere-commencer'].forEach(id => {
  const b = $(id);
  if (b) b.onclick = () => { if (window.Compte) window.Compte.ouvrir('register'); };
});

/* ---------------------------------------------------------
   Le démarrage
   --------------------------------------------------------- */
function surChangement(){
  const connecte = window.Compte && window.Compte.connecte();
  $('ecran-accueil').hidden = !!connecte;
  $('ecran-accueil').className = 'panel' + (connecte ? '' : ' on');
  $('application').hidden = !connecte;
  $('tagline').textContent = connecte
    ? 'Les plats de la semaine, et la liste qui va avec.'
    : 'Les plats de la semaine, et la liste qui va avec.';

  if (connecte){
    remplirUnites($('ajout-unite'), '');
    toutCharger().then(demarrerSondage).catch(e => Avis.erreur(e.message));
  } else {
    arreterSondage();
  }
}

if (window.Compte){
  window.Compte.demarrer(surChangement, surChangement);
} else {
  surChangement();
}

/* La version de la feuille de style doit suivre celle du script : sans ce
   contrôle, un déploiement partiel donne une page qui paraît cassée sans
   qu'on sache pourquoi. */
(function verifierVersion(){
  const css = getComputedStyle(document.documentElement).getPropertyValue('--css-version');
  const propre = String(css || '').replace(/["'\s]/g, '');
  if (propre && propre !== VERSION){
    console.warn('[familyshop] la feuille (' + propre + ') et le script (' + VERSION
      + ') ne correspondent pas. Recharge en vidant le cache.');
  }
})();

})();
