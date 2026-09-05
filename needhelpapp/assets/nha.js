/* NeedHelpApp — comportements partagés. Aucune dépendance. */
(function () {
  'use strict';

  /* ---------- menu mobile ---------- */
  var bascule = document.querySelector('.bascule');
  var nav = document.getElementById('navigation');
  if (bascule && nav) {
    bascule.addEventListener('click', function () {
      var ouvert = nav.classList.toggle('ouverte');
      bascule.setAttribute('aria-expanded', String(ouvert));
    });
  }

  /* ---------- jeton anti-CSRF (double soumission) ---------- */
  function jeton() {
    var m = document.cookie.match(/(?:^|;\s*)nha_csrf=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  /**
   * Traduit une réponse non JSON en explication utilisable.
   * Le détail complet reste dans la console du navigateur.
   */
  function diagnostic(statut, texte, url) {
    if (statut === 404) {
      return 'Le script ' + url + ' est introuvable sur le serveur. '
        + 'Le dossier /api/ n\'a probablement pas été déposé.';
    }
    if (statut === 403) {
      return 'Le serveur refuse l\'accès à ' + url + ' (403).';
    }
    if (statut >= 500) {
      // Un fatal PHP affiché à l'écran commence souvent par « Fatal error ».
      var m = /(Fatal error|Parse error|Warning|Uncaught)[^<]{0,200}/.exec(texte || '');
      return 'Erreur du serveur (' + statut + ')'
        + (m ? ' : ' + m[0].trim() : '. Détail dans la console du navigateur.');
    }
    if (!texte) {
      return 'Le serveur a répondu ' + statut + ' sans contenu.';
    }
    return 'Réponse inattendue du serveur (' + statut + '). '
      + 'Ouvrez la console du navigateur pour le détail.';
  }

  /**
   * Envoie un formulaire en JSON vers son action et affiche la réponse.
   * Le formulaire doit contenir un élément .avis pour le retour.
   */
  window.nhaEnvoyer = function (form, apres) {
    var avis = form.querySelector('.avis');
    var bouton = form.querySelector('button[type=submit]');
    var libelle = bouton ? bouton.textContent : '';
    var donnees = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      donnees[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });

    /* On retire un « hidden » éventuel : une page qui en pose un sur le
       paragraphe de réponse rendait l'envoi muet — le message était bien
       écrit, mais invisible. Le CSS masque déjà un avis vide. */
    if (avis) { avis.className = 'avis'; avis.textContent = ''; avis.removeAttribute('hidden'); }
    if (bouton) { bouton.disabled = true; bouton.textContent = 'Un instant…'; }

    // On lit d'abord la réponse en TEXTE. Si le serveur renvoie une page
    // d'erreur PHP ou un 404 en HTML, r.json() lèverait une exception et
    // l'erreur réelle serait perdue : c'est exactement ce qu'il ne faut pas.
    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NHA-CSRF': jeton() },
      body: JSON.stringify(donnees)
    })
      .then(function (r) {
        return r.text().then(function (texte) {
          var d = null;
          try { d = JSON.parse(texte); } catch (e) { /* pas du JSON */ }
          return { ok: r.ok, statut: r.status, d: d, texte: texte };
        });
      })
      .then(function (res) {
        if (bouton) { bouton.disabled = false; bouton.textContent = libelle; }

        if (res.d === null) {
          // Le serveur n'a pas répondu en JSON : on montre ce qu'il a dit.
          console.error('[NeedHelpApp] réponse non JSON de ' + form.action,
                        res.statut, res.texte);
          if (avis) {
            avis.className = 'avis erreur';
            avis.textContent = diagnostic(res.statut, res.texte, form.action);
            avis.removeAttribute('hidden');
          }
          return;
        }
        if (!res.ok) {
          if (avis) {
            avis.className = 'avis erreur';
            avis.innerHTML = res.d.message || 'Une erreur est survenue.';
            avis.removeAttribute('hidden');
          }
          return;
        }
        if (res.d.redirection) { window.location.href = res.d.redirection; return; }
        if (avis) {
          avis.className = 'avis succes';
          avis.innerHTML = res.d.message || 'C\'est enregistré.';
          avis.removeAttribute('hidden');
          /* Sur un formulaire long, la réponse s'affiche parfois hors de
             l'écran : on l'y ramène, et le rôle « status » la fait lire
             aux lecteurs d'écran. */
          if (avis.scrollIntoView) avis.scrollIntoView({ block:'nearest', behavior:'smooth' });
        }
        if (typeof apres === 'function') apres(res.d, form);
      })
      .catch(function (err) {
        console.error('[NeedHelpApp] échec réseau vers ' + form.action, err);
        if (bouton) { bouton.disabled = false; bouton.textContent = libelle; }
        if (avis) {
          avis.className = 'avis erreur';
          avis.textContent = 'Impossible de joindre le serveur. Vérifiez votre connexion, '
            + 'puis réessayez. Si cela persiste : contact@needhelpapp.com.';
        }
      });
  };

  Array.prototype.forEach.call(document.querySelectorAll('form[data-json]'), function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      window.nhaEnvoyer(form, function (d, f) {
        if (f.dataset.reinitialiser === 'oui') f.reset();
      });
    });
  });

  /* ---------- indicateur de robustesse du mot de passe ---------- */
  var mdp = document.querySelector('input[data-jauge]');
  if (mdp) {
    var jauge = document.querySelector('.jauge span');
    mdp.addEventListener('input', function () {
      var v = mdp.value, n = 0;
      if (v.length >= 10) n++;
      if (v.length >= 14) n++;
      if (/[^A-Za-z0-9]/.test(v) || (/[A-Za-z]/.test(v) && /[0-9]/.test(v))) n++;
      var couleurs = ['#8E2A2A', '#8E2A2A', '#A0521A', '#1B6547'];
      jauge.style.width = (n / 3 * 100) + '%';
      jauge.style.background = couleurs[n];
    });
  }

  /* ---------- filtre des domaines (page d'accueil) ---------- */
  var champ = document.getElementById('filtre');
  if (champ) {
    var cartes = Array.prototype.slice.call(document.querySelectorAll('.domaine'));
    var compteur = document.getElementById('compteur');
    var vide = document.getElementById('vide');
    var initial = compteur.textContent;

    function sansAccents(t) {
      return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    champ.addEventListener('input', function () {
      var q = sansAccents(champ.value.trim());
      if (!q) {
        cartes.forEach(function (c) { c.hidden = false; });
        vide.hidden = true;
        compteur.textContent = initial;
        return;
      }
      var n = 0;
      cartes.forEach(function (c) {
        var ok = sansAccents(c.dataset.mots + ' ' + c.textContent).indexOf(q) !== -1;
        c.hidden = !ok;
        if (ok) n++;
      });
      vide.hidden = n > 0;
      compteur.textContent = n === 0 ? 'Aucun domaine ne correspond.'
        : (n === 1 ? 'Un domaine correspond.' : n + ' domaines correspondent.');
    });
  }
})();


/* =====================================================================
   L'accueil
   ===================================================================== */
(function () {

  /* --- le filtre du catalogue ---
     On cache, on ne supprime pas : le lecteur d'écran doit compter les
     mêmes éléments que l'œil, et l'on veut pouvoir revenir en arrière
     sans reconstruire la liste. */
  const champ = document.getElementById('filtre');
  const grille = document.getElementById('grille');
  const compteur = document.getElementById('compteur');
  const vide = document.getElementById('vide');

  if (champ && grille) {
    const tuiles = Array.prototype.slice.call(grille.children);
    const sansAccent = (t) => t.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const filtrer = () => {
      const q = sansAccent(champ.value.trim());
      let vus = 0;
      tuiles.forEach(function (li) {
        const foin = sansAccent(
          (li.dataset.mots || '') + ' ' + (li.textContent || ''));
        const montrer = q === '' || foin.indexOf(q) >= 0;
        li.hidden = !montrer;
        if (montrer) vus++;
      });
      if (vide) vide.hidden = vus > 0;
      if (compteur) {
        compteur.textContent = q === ''
          ? tuiles.length + ' domaines au catalogue.'
          : vus + (vus > 1 ? ' domaines correspondent.' : ' domaine correspond.');
      }
    };
    champ.addEventListener('input', filtrer);
    filtrer();
  }

  /* --- l'apparition au défilement ---
     Un observateur plutôt qu'un écouteur de défilement : le navigateur
     fait le travail, sans recalculer à chaque pixel. Et l'on cesse
     d'observer une fois l'élément vu — il n'a plus rien à nous apprendre. */
  const aParaitre = document.querySelectorAll('.apparait');
  if (aParaitre.length) {
    const moinsDeMouvement = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (moinsDeMouvement || !('IntersectionObserver' in window)) {
      aParaitre.forEach(function (e) { e.classList.add('vu'); });
    } else {
      const oeil = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (entree) {
          if (!entree.isIntersecting) return;
          entree.target.classList.add('vu');
          oeil.unobserve(entree.target);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
      aParaitre.forEach(function (e) { oeil.observe(e); });
    }
  }

  /* --- l'en-tête pose un trait une fois qu'on a quitté le haut --- */
  const entete = document.querySelector('.entete');
  if (entete) {
    const sentinelle = document.createElement('div');
    sentinelle.style.cssText = 'position:absolute;top:0;height:1px;width:1px';
    document.body.prepend(sentinelle);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        entete.classList.toggle('pose', !e[0].isIntersecting);
      }).observe(sentinelle);
    }
  }

})();
