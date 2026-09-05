"use strict";

/* =========================================================
   Les messages d'accueil : à l'inscription, puis à la
   souscription. Chacun n'est montré qu'une fois par compte.

   La fenêtre est construite en JavaScript plutôt que recopiée
   dans chaque page : huit balisages identiques auraient fini
   par diverger.
   ========================================================= */
window.Bienvenue = (function () {

const VU_INSCRIPTION = 'teaching-vu-bienvenue-';
const VU_ABONNEMENT  = 'teaching-vu-abonne-';

function dejaVu(cle){
  try { return localStorage.getItem(cle) === '1'; } catch(e){ return true; }
}
function marquer(cle){
  try { localStorage.setItem(cle, '1'); } catch(e){}
}

function fermer(){
  const m = document.getElementById('bienvenue-modal');
  if (m) m.remove();
}

/**
 * @param titre    la phrase d'accueil
 * @param intro    une ligne de contexte
 * @param points   [{titre, texte}] — trois au plus, on ne lit pas davantage
 * @param actions  [{texte, href|action, principal}]
 */
function afficher(titre, intro, points, actions){
  fermer();

  const fond = document.createElement('div');
  fond.className = 'modal';
  fond.id = 'bienvenue-modal';

  const carte = document.createElement('div');
  carte.className = 'modal-card bienvenue';
  carte.setAttribute('role', 'dialog');
  carte.setAttribute('aria-modal', 'true');

  const croix = document.createElement('button');
  croix.className = 'modal-close';
  croix.setAttribute('aria-label', 'Fermer');
  croix.textContent = '×';
  croix.onclick = fermer;
  carte.appendChild(croix);

  const h = document.createElement('h2');
  h.className = 'title';
  h.textContent = titre;
  carte.appendChild(h);

  const p = document.createElement('p');
  p.className = 'sub';
  p.textContent = intro;
  carte.appendChild(p);

  const ul = document.createElement('ul');
  ul.className = 'bienvenue-points';
  points.slice(0, 3).forEach(pt => {
    const li = document.createElement('li');
    const b = document.createElement('b');
    b.textContent = pt.titre;
    li.appendChild(b);
    li.appendChild(document.createTextNode(' ' + pt.texte));
    ul.appendChild(li);
  });
  carte.appendChild(ul);

  const zone = document.createElement('div');
  zone.className = 'actions';
  actions.forEach(a => {
    const b = document.createElement(a.href ? 'a' : 'button');
    b.className = 'btn' + (a.principal ? ' btn--big' : ' btn--ghost');
    b.textContent = a.texte;
    if (a.href) b.href = a.href;
    else b.onclick = () => { fermer(); if (a.action) a.action(); };
    zone.appendChild(b);
  });
  carte.appendChild(zone);

  fond.appendChild(carte);
  fond.onclick = (e) => { if (e.target === fond) fermer(); };
  document.body.appendChild(fond);
  document.addEventListener('keydown', function echap(e){
    if (e.key === 'Escape'){ fermer(); document.removeEventListener('keydown', echap); }
  });
}

/** À la création d'un compte. */
function inscription(user){
  if (!user) return;
  const cle = VU_INSCRIPTION + user.id;
  if (dejaVu(cle)) return;
  marquer(cle);

  const prenom = user.name || '';
  afficher(
    prenom ? 'Bienvenue, ' + prenom + '.' : 'Bienvenue.',
    'Ton compte est créé. Voici ce qu\u2019il t\u2019ouvre, sans rien payer.',
    [
      { titre: 'Les quatre applications sont ouvertes.',
        texte: 'La dictée lue à voix haute et corrigée mot à mot, les 984 verbes de la conjugaison, le vocabulaire en allemand, anglais ou italien, et le calcul mental en sept familles.' },
      { titre: 'Cinq enregistrements par application.',
        texte: 'Ton compte garde cinq dictées, cinq listes de verbes, cinq listes de vocabulaire et cinq séries de calcul — plus cinq reprises dans chaque bibliothèque partagée.' },
      { titre: 'L\u2019abonnement lève le compte.',
        texte: 'Plus de limite, la publication, le partage avec ta classe, le suivi des progrès et les feuilles imprimables. Le reste demeure gratuit, sans limite de temps.' }
    ],
    [
      { texte: 'Voir l\u2019abonnement', href: 'abonnement.html', principal: true },
      { texte: 'Plus tard' }
    ]
  );
}

/** À l'ouverture d'un abonnement. */
function abonnement(user, plan){
  if (!user) return;
  const cle = VU_ABONNEMENT + user.id;
  if (dejaVu(cle)) return;
  marquer(cle);

  afficher(
    'Merci, ton abonnement est actif.',
    'Trois choses te sont désormais ouvertes.',
    [
      { titre: 'Tout est conservé.',
        texte: 'Tes dictées, tes listes de verbes et de vocabulaire te suivent d\u2019un appareil à l\u2019autre, et restent modifiables.' },
      { titre: 'Le partage.',
        texte: 'Publie une dictée ou une liste dans la bibliothèque, ou envoie-la par un lien — à ta classe, à tes enfants. Reprends celles des autres chez toi.' },
      { titre: 'Le suivi et le papier.',
        texte: 'Chaque correction s\u2019enregistre, et « Mes résultats » montre la progression série après série. Tu peux aussi imprimer un exercice avec son corrigé.' }
    ],
    [
      { texte: 'Commencer', principal: true },
      { texte: 'Gérer mon abonnement', href: 'abonnement.html' }
    ]
  );
}

/** Repère le passage à l'état abonné, quelle que soit la page. */
function surAbonnement(user, abo){
  if (!user || !abo || !abo.abonne) return;
  abonnement(user, abo.plan);
}

return { inscription, abonnement, surAbonnement, fermer };

})();
