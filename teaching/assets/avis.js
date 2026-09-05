"use strict";

/* =========================================================
   Les avis : ce que l'application dit à l'utilisateur.

   Deux formes, pour deux besoins qui n'ont rien à voir :

   — Une fenêtre, quand on ne peut pas continuer. Elle explique
     pourquoi et propose la sortie. Elle demande un clic, ce qui
     est justifié : on était bloqué.

   — Un bandeau, quand une action a réussi. Il s'affiche bien en
     vue puis s'efface seul. Demander un clic pour confirmer
     chaque enregistrement lasserait vite : on enregistre vingt
     fois par séance.
   ========================================================= */
window.Avis = (function () {

function fermerFenetre(){
  const m = document.getElementById('avis-modal');
  if (m && m.remove) m.remove();
}

/**
 * @param titre   la phrase qui dit ce qui se passe
 * @param texte   l'explication, et ce qu'il faut faire
 * @param actions [{texte, action|href, principal}] — trois au plus
 */
function fenetre(titre, texte, actions){
  fermerFenetre();

  const fond = document.createElement('div');
  fond.className = 'modal';
  fond.id = 'avis-modal';

  const carte = document.createElement('div');
  carte.className = 'modal-card avis';
  carte.setAttribute('role', 'alertdialog');
  carte.setAttribute('aria-modal', 'true');

  const croix = document.createElement('button');
  croix.className = 'modal-close';
  croix.setAttribute('aria-label', 'Fermer');
  croix.textContent = '×';
  croix.onclick = fermerFenetre;
  carte.appendChild(croix);

  const h = document.createElement('h2');
  h.className = 'title';
  h.textContent = titre;
  carte.appendChild(h);

  const p = document.createElement('p');
  p.className = 'sub';
  p.textContent = texte;
  carte.appendChild(p);

  const zone = document.createElement('div');
  zone.className = 'actions';
  (actions || [{ texte: 'J\u2019ai compris' }]).slice(0, 3).forEach(a => {
    const b = document.createElement(a.href ? 'a' : 'button');
    b.className = 'btn' + (a.principal ? ' btn--big' : ' btn--ghost');
    b.textContent = a.texte;
    if (a.href) b.href = a.href;
    else b.onclick = () => { fermerFenetre(); if (a.action) a.action(); };
    zone.appendChild(b);
  });
  carte.appendChild(zone);

  fond.appendChild(carte);
  fond.onclick = (e) => { if (e.target === fond) fermerFenetre(); };
  document.body.appendChild(fond);

  document.addEventListener('keydown', function echap(e){
    if (e.key === 'Escape'){ fermerFenetre(); document.removeEventListener('keydown', echap); }
  });

  // le premier bouton prend le clavier : on peut répondre sans la souris
  const premier = zone.querySelector('button, a');
  if (premier && premier.focus) premier.focus();
}

/* ---------- le bandeau des actions réussies ---------- */
let minuteur = null;

function bandeau(message, genre){
  const ancien = document.getElementById('avis-bandeau');
  if (ancien && ancien.remove) ancien.remove();
  clearTimeout(minuteur);

  const b = document.createElement('div');
  b.className = 'avis-bandeau' + (genre ? ' ' + genre : '');
  b.id = 'avis-bandeau';
  b.setAttribute('role', 'status');

  const marque = document.createElement('span');
  marque.className = 'marque';
  marque.setAttribute('aria-hidden', 'true');
  marque.textContent = (genre === 'err') ? '!' : '✓';
  b.appendChild(marque);

  const t = document.createElement('span');
  t.className = 'texte';
  t.textContent = message;
  b.appendChild(t);

  const x = document.createElement('button');
  x.className = 'fermer';
  x.setAttribute('aria-label', 'Fermer');
  x.textContent = '×';
  x.onclick = () => { if (b.remove) b.remove(); };
  b.appendChild(x);

  document.body.appendChild(b);
  // une erreur reste plus longtemps : on veut avoir le temps de la lire
  minuteur = setTimeout(() => { if (b.remove) b.remove(); }, genre === 'err' ? 7000 : 4200);
}

function succes(message){ bandeau(message, 'ok'); }
function erreur(message){ bandeau(message, 'err'); }

return { fenetre, fermer: fermerFenetre, succes, erreur, bandeau };

})();
