"use strict";

/* Plusieurs avertissements peuvent survenir en même temps — version
   décalée et serveur en panne, par exemple. Ils s'ajoutent au lieu de se
   remplacer : masquer le second parce que le premier est arrivé ferait
   perdre justement l'information utile. */
function alerter(message){
  const w = document.getElementById('warn');
  if (!w || !message) return;
  const liste = window.__alertes = window.__alertes || [];
  if (liste.indexOf(message) >= 0) return;   // pas deux fois le même
  liste.push(message);
  w.className = 'warn on';
  w.innerHTML = '';
  liste.forEach(m => {
    const p = document.createElement('p');
    p.style.margin = '0 0 4px';
    p.textContent = m;
    w.appendChild(p);
  });
}

window.alerter = alerter;

/* =========================================================
   Bouton « Continuer avec Google »
   La bibliothèque de Google n'est chargée que si un identifiant
   client est configuré : sans abonnement à ce service, aucune
   requête ne part vers Google.
   ========================================================= */
window.ConnexionGoogle = (function () {

let chargee = null;

function charger(){
  if (chargee) return chargee;
  chargee = new Promise((resolve, reject) => {
    if (window.google && window.google.accounts) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('bibliothèque Google inaccessible'));
    document.head.appendChild(s);
  });
  chargee.catch(() => { chargee = null; });
  return chargee;
}

/**
 * @param clientId  identifiant public de l'application
 * @param zone      élément où dessiner le bouton
 * @param surJeton  reçoit le jeton signé à transmettre au serveur
 */
async function installer(clientId, zone, surJeton){
  if (!clientId || !zone) return false;
  try {
    await charger();
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (reponse) => { if (reponse && reponse.credential) surJeton(reponse.credential); },
      auto_select: false,
      cancel_on_tap_outside: true
    });
    zone.innerHTML = '';
    window.google.accounts.id.renderButton(zone, {
      type: 'standard', theme: 'outline', size: 'large',
      text: 'continue_with', shape: 'pill', locale: 'fr', width: 280
    });
    zone.hidden = false;
    return true;
  } catch(e){
    zone.hidden = true;   // pas de bibliothèque : on s'en tient au mot de passe
    return false;
  }
}

return { installer };

})();
