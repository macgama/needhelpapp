/* NeedHelpApp — bouton de connexion Google. Chargé seulement si la
   fonctionnalité est configurée. Aucune dépendance hors la bibliothèque
   Google Identity Services. */
(function () {
  'use strict';

  var cible = document.getElementById('google-bouton');
  if (!cible) return;
  var avis = document.getElementById('google-avis');

  function jetonCsrf() {
    var m = document.cookie.match(/(?:^|;\s*)nha_csrf=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function surReponse(reponse) {
    avis.className = 'avis';
    avis.textContent = 'Connexion…';
    fetch('/api/google.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NHA-CSRF': jetonCsrf() },
      body: JSON.stringify({
        credential: reponse.credential,
        suite: cible.dataset.suite || '/profil.php'
      })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok && res.d.redirection) { window.location.href = res.d.redirection; return; }
        avis.className = 'avis erreur';
        avis.innerHTML = res.d.message || 'La connexion Google a échoué.';
      })
      .catch(function () {
        avis.className = 'avis erreur';
        avis.textContent = 'La connexion Google a échoué. Réessayez, ou utilisez un mot de passe.';
      });
  }

  // La bibliothèque Google est chargée en async : on attend qu'elle arrive,
  // sans bloquer la page, et on abandonne proprement au bout de cinq secondes.
  var essais = 0;
  (function attendre() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.initialize({
        client_id: cible.dataset.clientId,
        callback: surReponse,
        ux_mode: 'popup'
      });
      window.google.accounts.id.renderButton(cible, {
        theme: 'outline', size: 'large', locale: 'fr', text: 'continue_with', width: 320
      });
      return;
    }
    if (++essais > 50) {
      cible.textContent = 'Le bouton Google n\'a pas pu se charger. Utilisez un mot de passe.';
      cible.style.color = '#5B5470';
      cible.style.fontSize = '.9375rem';
      return;
    }
    setTimeout(attendre, 100);
  })();
})();
