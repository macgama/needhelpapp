"use strict";

/* =========================================================
   Compte utilisateur — couche partagée
   Utilisée par les applications autres que la dictée, qui
   embarque historiquement la sienne. Même API, mêmes cookies,
   même compte : se connecter d'un côté vaut pour l'autre.
   ========================================================= */
window.Compte = (function () {

const API = 'api/index.php';
const net = { available:false, user:null, csrf:null, abonnement:null, offre:null, google:'', panne:null };
const $ = (id) => document.getElementById(id);

function url(action, params){
  let u = API + '?a=' + encodeURIComponent(action);
  if (params){
    Object.keys(params).forEach(k => {
      const v = params[k];
      if (v === null || v === undefined || v === '') return;
      u += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(v);
    });
  }
  return u;
}

async function appel(action, body, params, isRetry){
  const opts = { method: body ? 'POST' : 'GET', credentials:'same-origin', headers:{} };
  if (body){
    opts.headers['Content-Type'] = 'application/json';
    opts.headers['X-CSRF'] = net.csrf || '';
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(url(action, params), opts);
  const txt = await r.text();
  let data;
  try { data = JSON.parse(txt); }
  catch(e){ throw new Error('le serveur n\u2019a pas répondu correctement'); }

  if (r.status === 419 && !isRetry){
    const s = await appel('session');
    net.csrf = s.csrf || null;
    net.user = s.user || null;
    return appel(action, body, params, true);
  }
  if (!r.ok || data.error){
    const err = new Error(data.error || ('erreur ' + r.status));
    err.detail = data.detail || null;   // explication du prestataire, si demandée
    err.aide = data.aide || null;
    throw err;
  }
  return data;
}

/* ---------- affichage de la barre de compte ---------- */
let auMode = 'login';
const MODES = {
  login:    { titre:'Se connecter',        sous:'Retrouve tes résultats sur tous tes appareils.',
              bouton:'Se connecter',       autre:'Créer un compte' },
  register: { titre:'Créer un compte',     sous:'Un compte garde tes réglages et tes résultats.',
              bouton:'Créer mon compte',   autre:"J'ai déjà un compte" },
  forgot:   { titre:'Mot de passe oublié', sous:'Indique ton adresse : tu recevras un lien.',
              bouton:'Envoyer le lien',    autre:'Revenir à la connexion' }
};

function dire(msg, genre){
  const el = $('auth-status');
  if (!el) return;
  el.textContent = msg || '';
  el.className = 'status' + (genre ? ' ' + genre : '');
}

function mode(m){
  auMode = m;
  const d = MODES[m];
  $('auth-title').textContent = d.titre;
  $('auth-sub').textContent = d.sous;
  $('auth-submit').textContent = d.bouton;
  $('auth-switch').textContent = d.autre;
  $('name-field').hidden = m !== 'register';
  $('password-field').hidden = m === 'forgot';
  $('auth-forgot').hidden = m !== 'login';
  dire('');
}

function ouvrir(m){
  $('auth-modal').hidden = false;
  mode(m || 'login');
  setTimeout(() => $('auth-email').focus(), 60);
}
function fermer(){
  $('auth-modal').hidden = true;
  $('auth-password').value = '';
}

let surChangement = () => {};

/* Tout l'affichage du compte passe par le menu partagé : voir assets/menu.js.
   C'est lui qui montre la pastille, le prénom et le tiroir. */
function peindre(){
  if (net.panne && window.alerter) window.alerter('Le serveur signale un problème : ' + net.panne);
  if (!window.MenuCompte){
    console.error('[teaching] assets/menu.js n\u2019est pas chargé : le menu du compte ne peut pas s\u2019afficher.');
    return;
  }
  window.MenuCompte.peindre(net.user, !!(net.abonnement && net.abonnement.abonne), net.available);
}

function brancher(){
  if (!$('auth-modal')) return;
  $('open-auth').onclick = () => ouvrir('login');
  $('auth-close').onclick = fermer;
  $('auth-switch').onclick = () => mode(auMode === 'login' ? 'register' : 'login');
  $('auth-forgot').onclick = () => mode('forgot');
  $('auth-modal').addEventListener('click', (e) => { if (e.target === $('auth-modal')) fermer(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('auth-modal').hidden) fermer(); });
  ['auth-email','auth-password','auth-name'].forEach(id => {
    $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') $('auth-submit').click(); });
  });

  $('auth-submit').onclick = async () => {
    const email = $('auth-email').value.trim();
    const password = $('auth-password').value;
    const name = $('auth-name').value.trim();
    if (!email){ dire('Indique ton adresse e-mail.', 'err'); return; }
    if (auMode !== 'forgot' && !password){ dire('Indique ton mot de passe.', 'err'); return; }
    if (auMode === 'register' && password.length < 8){ dire('Le mot de passe doit faire au moins 8 caractères.', 'err'); return; }

    $('auth-submit').disabled = true;
    try {
      if (auMode === 'forgot'){
        /* Le portail détient les jetons et les courriels de
           réinitialisation. On y envoie donc la personne, avec son adresse
           déjà remplie, plutôt que d'appeler une action locale qui ne sait
           rien faire — c'est ce qui se produisait, et aucun message ne
           partait jamais. */
        if (net.portail && net.portail.motdepasse){
          window.location.href = net.portail.motdepasse
            + (net.portail.motdepasse.indexOf('?') >= 0 ? '&' : '?')
            + 'email=' + encodeURIComponent(email);
          return;
        }
        dire('Envoi en cours…');
        await appel('password_forgot', { email:email });
        dire('Si un compte existe avec cette adresse, le lien vient de partir.', 'ok');
        return;
      }
      dire(auMode === 'register' ? 'Création du compte…' : 'Connexion…');
      const r = await appel(auMode, { email:email, password:password, name:name });
      net.user = r.user;
      net.csrf = r.csrf || net.csrf;
      try { await lireSession(); } catch(e){}
      fermer();
      if (r.nouveau && window.Bienvenue) window.Bienvenue.inscription(net.user);
      peindre();
      surChangement();
    } catch(e){
      dire(e.message || 'opération impossible', 'err');
    } finally {
      $('auth-submit').disabled = false;
    }
  };

  $('logout').onclick = async () => {
    /* Se déconnecter d'une seule application n'aurait pas de sens : la
       session vaut pour tout le domaine. On passe donc par le portail,
       qui referme la session partout à la fois. */
    /* On passe par le serveur, qui ferme la session du portail, puis on
       revient sur needhelpapp.com : sans cela, sa page d'accueil montrerait
       encore un utilisateur connecté. */
    let versPortail = null;
    try {
      const r = await appel('logout', {});
      net.csrf = r.csrf || net.csrf;
      versPortail = r.portail || null;
    } catch(e){}
    if (versPortail || (net.portail && net.portail.actif)){
      window.location.href = versPortail || net.portail.deconnexion;
      return;
    }
    net.user = null;
    net.abonnement = null;
    peindre();
    surChangement();
  };
}

/* Deux échecs très différents, qu'il ne faut pas confondre :
   un serveur absent — page ouverte depuis un dossier — et un serveur qui
   répond mais se plaint. Dans le second cas, l'utilisateur doit garder ses
   boutons et lire ce qui ne va pas, au lieu de voir l'interface s'amputer. */
async function lireSession(){
  const r = await fetch(url('session'), { credentials:'same-origin' });
  const txt = await r.text();
  let s = null;
  try { s = JSON.parse(txt); } catch(e){}

  net.available = true;                 // le serveur a répondu, quoi qu'il ait dit
  if (!s || s.error){
    net.panne = (s && s.error) || 'le serveur ne répond pas correctement';
    net.user = null; net.abonnement = null;
    return;
  }
  net.panne = null;
  net.csrf = s.csrf || null;
  net.user = s.user || null;
  net.abonnement = s.abonnement || null;
  net.offre = s.offre || null;
  net.google = s.google || '';

  /* L'application peut être fermée le temps d'une mise à jour : on le dit
     franchement plutôt que de laisser les appels échouer un à un. */
  if (s.ouverte === false) fermeeMaintenance();
}

/**
 * La page d'attente d'une mise à jour.
 *
 * Une page qui explique vaut mieux qu'une erreur au milieu d'un exercice.
 * Les administrateurs ne la voient jamais : c'est à eux de vérifier que
 * tout fonctionne avant de rouvrir.
 */
function fermeeMaintenance(){
  if (document.getElementById('nha-maintenance')) return;
  const fond = document.createElement('div');
  fond.id = 'nha-maintenance';
  fond.setAttribute('role', 'alertdialog');
  fond.style.cssText =
      'position:fixed;inset:0;z-index:400;display:flex;align-items:center;'
    + 'justify-content:center;padding:24px;text-align:center;'
    + 'background:var(--paper,#FBF9F4);';
  fond.innerHTML =
      '<div style="max-width:30rem">'
    + '<h2 style="font-family:var(--font-display);font-weight:600;font-size:27px;'
    +   'letter-spacing:-.02em;margin:0 0 12px">Une mise à jour est en cours</h2>'
    + '<p style="color:var(--grey);line-height:1.6;margin:0 0 22px">'
    +   'L\u2019application revient dans quelques minutes. Rien de ce que vous avez '
    +   'enregistré n\u2019est perdu : tout vous attendra à votre retour.</p>'
    + '<p style="margin:0"><a class="btn" href="https://needhelpapp.com/">'
    +   'Revenir à NeedHelpApp</a></p>'
    + '</div>';
  document.body.appendChild(fond);
}

/* Le bouton Google n'apparaît que si le site est configuré pour cela. */
async function installerGoogle(){
  if (!net.google || !window.ConnexionGoogle) return;
  const zone = $('zone-google');
  const bloc = $('zone-google-bloc');
  if (!zone) return;
  const pose = await window.ConnexionGoogle.installer(net.google, zone, async (jeton) => {
    dire('Connexion en cours…');
    try {
      const r = await appel('google', { credential: jeton });
      net.user = r.user;
      net.csrf = r.csrf || net.csrf;
      try { await lireSession(); } catch(e){}
      fermer();
      if (r.nouveau && window.Bienvenue) window.Bienvenue.inscription(net.user);
      peindre();
      surChangement();
    } catch(e){
      dire('Connexion Google impossible : ' + e.message + '.', 'err');
    }
  });
  if (bloc) bloc.hidden = !pose;
}

/** Relit l'état du compte, par exemple au retour d'un paiement. */
async function rafraichir(){
  try { await lireSession(); } catch(e){}
  peindre();
  return net.abonnement;
}

async function demarrer(callback){
  surChangement = callback || (() => {});
  brancher();
  try {
    await lireSession();
  } catch(e){
    net.available = false;    // pas de serveur : l'application marche quand même
    net.user = null;
    net.abonnement = null;
  }
  peindre();
  installerGoogle();
  if (window.Bienvenue) window.Bienvenue.surAbonnement(net.user, net.abonnement);
  surChangement();
}

/* ---------- partager un lien ----------
   Sur mobile et tablette, on ouvre la feuille de partage du système :
   l'utilisateur y retrouve WhatsApp, Messages, le courrier, tout ce
   qu'il a installé. Ailleurs, on se rabat sur le presse-papiers. */
async function partager(titre, texte, lien){
  if (navigator.share){
    try {
      await navigator.share({ title: titre, text: texte, url: lien });
      return 'partage';
    } catch(e){
      if (e && e.name === 'AbortError') return 'annule';   // l'utilisateur a fermé la feuille
    }
  }
  try {
    await navigator.clipboard.writeText(lien);
    return 'copie';
  } catch(e){}
  return 'manuel';
}

return {
  demarrer, appel, ouvrir, mode, dire, partager, rafraichir,
  abonnement: () => net.abonnement,
  abonne: () => !!(net.abonnement && net.abonnement.abonne),
  offre: () => net.offre,
  connecte: () => !!net.user,
  disponible: () => net.available,
  utilisateur: () => net.user
};

})();
