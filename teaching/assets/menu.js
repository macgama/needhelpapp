"use strict";

/* =========================================================
   Barre du haut : navigation entre les applications, et
   menu du compte. Partagé par toutes les pages.
   ========================================================= */
/* Contrôle de la feuille de style : voir --css-version dans les .css */
window.verifierStyles = function (attendue){
  try {
    const lue = getComputedStyle(document.documentElement)
      .getPropertyValue('--css-version').replace(/["'\s]/g, '');
    if (!lue){
      if (window.alerter) window.alerter('La feuille de style n\u2019est pas chargée : '
        + 'vérifie que assets/*.css sont bien sur le serveur.');
      return false;
    }
    if (lue !== attendue){
      if (window.alerter) window.alerter('La feuille de style (' + lue + ') est en retard sur le reste ('
        + attendue + '). Renvoie les fichiers assets/*.css, puis recharge en vidant le cache.');
      return false;
    }
  } catch(e){}
  return true;
};

window.MenuCompte = (function () {

const $ = (id) => document.getElementById(id);
let branche = false;

function fermer(){
  const t = $('compte-tiroir');
  if (t) t.hidden = true;
  const b = $('compte-bouton');
  if (b) b.setAttribute('aria-expanded', 'false');
}

function fermerLiens(){
  const l = $('liens-apps');
  const b = $('menu-burger');
  if (l) l.className = 'liens-apps';
  if (b) b.setAttribute('aria-expanded', 'false');
}

function brancher(){
  if (branche) return;
  // le menu des applications, sur petit écran
  const burger = $('menu-burger');
  const liens = $('liens-apps');
  if (burger && liens){
    burger.onclick = (e) => {
      e.stopPropagation();
      const ouvert = liens.className.indexOf('ouvert') >= 0;
      liens.className = 'liens-apps' + (ouvert ? '' : ' ouvert');
      burger.setAttribute('aria-expanded', ouvert ? 'false' : 'true');
      if (!ouvert) fermer();          // un seul panneau ouvert à la fois
    };
    document.addEventListener('click', (e) => {
      if (liens.className.indexOf('ouvert') < 0) return;
      if (!liens.contains(e.target) && e.target !== burger) fermerLiens();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermerLiens(); });
  }

  const bouton = $('compte-bouton');
  const tiroir = $('compte-tiroir');
  if (!bouton || !tiroir) return;
  branche = true;

  bouton.onclick = (e) => {
    e.stopPropagation();
    const ouvert = !tiroir.hidden;
    tiroir.hidden = ouvert;
    bouton.setAttribute('aria-expanded', ouvert ? 'false' : 'true');
    if (!ouvert) fermerLiens();
  };
  document.addEventListener('click', (e) => {
    if (tiroir.hidden) return;
    if (!tiroir.contains(e.target) && e.target !== bouton) fermer();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermer(); });
}

/**
 * @param u        l'utilisateur connecté, ou null
 * @param abonne   true si son abonnement est en cours
 * @param dispo    false quand il n'y a pas de serveur du tout
 */
function peindre(u, abonne, dispo, portail){
  brancher();
  const zone = $('account-state');
  if (!zone) return;
  zone.hidden = !dispo;
  if (!dispo) return;

  const nom = u ? (u.name || u.email.split('@')[0]) : '';
  const connexion = $('open-auth');
  const bouton = $('compte-bouton');
  if (connexion) connexion.hidden = !!u;
  if (bouton) bouton.hidden = !u;
  if (!u){ fermer(); return; }

  const initiale = $('compte-initiale');
  if (initiale) initiale.textContent = (nom.charAt(0) || '?').toUpperCase();
  const who = $('who');
  if (who){ who.hidden = false; who.textContent = nom; }

  const lien = $('lien-abo');
  if (lien) lien.textContent = abonne ? 'Mon abonnement' : 'S\u2019abonner';

  /* Avec le portail, le profil, l'abonnement et la déconnexion vivent sur
     needhelpapp.com : les laisser pointer ici mènerait à des pages qui ne
     savent plus rien de l'identité. */
  const tiroir = $('compte-tiroir');
  if (portail && portail.actif){
    const profil = tiroir ? tiroir.querySelector('a[href="profil.html"]') : null;
    if (profil) profil.setAttribute('href', portail.profil);
    const abo = $('lien-abo');
    if (abo && abo.setAttribute) abo.setAttribute('href', portail.abonnement);
    const sortir = $('logout');
    if (sortir) sortir.dataset.portail = portail.deconnexion;
  }

  const role = u.role || 'membre';
  const etat = $('compte-etat');
  if (etat){
    etat.textContent = role === 'admin' ? 'Administrateur'
      : role === 'moderateur' ? 'Modérateur'
      : abonne ? 'Abonné' : 'Version gratuite';
  }

  // le lien d'administration n'existe que pour les administrateurs ; le
  // serveur revérifie de toute façon à chaque appel
  const existant = $('lien-admin');
  if (role === 'admin' && !existant && tiroir){
    const a = document.createElement('a');
    a.id = 'lien-admin';
    a.href = 'admin.html';
    a.setAttribute('role', 'menuitem');
    a.textContent = 'Administration';
    tiroir.insertBefore(a, tiroir.querySelector('button'));
  } else if (role !== 'admin' && existant){
    existant.remove();
  }
}

return { peindre, fermer };

})();
