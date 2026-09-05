"use strict";

/* =========================================================
   Page de l'abonnement
   ========================================================= */
const $ = (id) => document.getElementById(id);
const Compte = window.Compte;

function dire(msg, genre){
  $('abo-note').className = 'status' + (genre ? ' ' + genre : '');
  $('abo-note').textContent = msg || '';
}

function dateFr(v){
  const d = new Date(String(v || '').replace(' ', 'T'));
  return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
}

function peindre(){
  const offre = Compte.offre() || {};
  const abo = Compte.abonnement();
  const connecte = Compte.connecte();

  $('prix-mensuel').innerHTML = offre.prix_mensuel
    ? offre.prix_mensuel.replace(/(par .*)$/, '<small>$1</small>')
    : '—';
  $('prix-annuel').textContent = offre.prix_annuel ? 'ou ' + offre.prix_annuel : '';
  $('ruban').hidden = !offre.economie;
  $('ruban').textContent = offre.economie || '';

  const dispo = !!offre.disponible;
  $('prendre-mensuel').disabled = !dispo;
  $('prendre-annuel').disabled = !dispo;

  const etat = $('etat');
  const abonne = abo && abo.abonne;
  const gerable = connecte && abo && abo.statut !== 'aucun';
  $('boutons-abo').hidden = abonne;
  $('boutons-gerer').hidden = !gerable;
  $('gerer-aide').hidden = !gerable;
  // le rattrapage n'a de sens que pour un compte connecté sans accès ouvert
  $('bloc-reparer').hidden = !(connecte && dispo && !abonne);

  if (!dispo){
    etat.hidden = false;
    $('etat-texte').textContent = 'L\u2019abonnement n\u2019est pas encore ouvert sur ce site. '
      + 'Tout reste utilisable en version gratuite.';
    return;
  }
  if (!connecte){
    etat.hidden = false;
    $('etat-texte').innerHTML = 'Connecte-toi ou crée un compte avant de t\u2019abonner : '
      + 'l\u2019abonnement est rattaché à ton compte.';
    return;
  }
  if (abo && abo.offert){
    etat.hidden = false;
    $('etat-texte').textContent = 'Ton compte a un accès complet et permanent, au titre de '
      + (abo.role === 'admin' ? 'l\u2019administration' : 'la modération') + '. Rien à payer.';
    $('boutons-abo').hidden = true;
    $('boutons-gerer').hidden = true;
    $('gerer-aide').hidden = true;
    $('bloc-reparer').hidden = true;
    return;
  }
  if (abonne){
    etat.hidden = false;
    const fin = dateFr(abo.fin);
    $('etat-texte').textContent = abo.statut === 'resilie'
      ? 'Ton abonnement est résilié : il reste actif jusqu\u2019au ' + fin + ', puis s\u2019arrêtera.'
      : 'Ton abonnement ' + (abo.plan === 'annuel' ? 'annuel' : 'mensuel') + ' est actif'
        + (fin ? ', prochaine échéance le ' + fin : '') + '.';
    return;
  }
  if (abo && abo.statut === 'impaye'){
    etat.hidden = false;
    $('etat-texte').textContent = 'Le dernier paiement n\u2019a pas abouti. '
      + 'Mets ta carte à jour depuis « Gérer mon abonnement ».';
    return;
  }
  etat.hidden = true;
}

async function souscrire(plan){
  if (!Compte.connecte()){
    Compte.ouvrir('register'); Compte.mode('register');
    Compte.dire('Crée ton compte : l\u2019abonnement y sera rattaché.', '');
    return;
  }
  dire('Ouverture de la page de paiement…');
  try {
    const r = await Compte.appel('abonnement_paiement', { plan: plan });
    if (r.url) window.location.href = r.url;
    else dire('Le service de paiement n\u2019a pas renvoyé de page.', 'err');
  } catch(e){
    const detail = e.detail ? ' (' + e.detail + ')' : '';
    dire('Impossible d\u2019ouvrir le paiement : ' + e.message + detail
       + (e.aide ? '. ' + e.aide : '.'), 'err');
  }
}

$('prendre-mensuel').onclick = () => souscrire('mensuel');
$('prendre-annuel').onclick = () => souscrire('annuel');
$('gerer').onclick = async () => {
  dire('Ouverture de ton espace de gestion…');
  try {
    const r = await Compte.appel('abonnement_gerer', {});
    if (!r.url){ dire('Espace de gestion indisponible.', 'err'); return; }
    if (r.public){
      // portail public : Stripe demandera l'adresse e-mail et enverra un code
      dire('Stripe va te demander ton adresse e-mail et t\u2019envoyer un code de connexion.', '');
      setTimeout(() => { window.location.href = r.url; }, 1800);
      return;
    }
    window.location.href = r.url;
  } catch(e){
    dire('Impossible d\u2019ouvrir la gestion : ' + e.message + '.', 'err');
  }
};

/* Retour depuis la page de paiement.
   On ne se fie pas à l'adresse : on demande au serveur de relire la session
   chez Stripe. C'est lui qui vérifie qu'elle est payée et qu'elle appartient
   bien à ce compte. L'accès s'ouvre alors sans dépendre de la notification. */
async function reparer(silencieux){
  try {
    const r = await Compte.appel('abonnement_resynchroniser', {});
    await Compte.rafraichir();
    peindre();
    if (r.trouve && Compte.abonne()){
      dire('Ton abonnement est retrouvé et ton accès est ouvert. Merci de ta patience.', 'ok');
      if (window.Bienvenue) window.Bienvenue.surAbonnement(Compte.utilisateur(), Compte.abonnement());
      return true;
    }
    if (!silencieux){
      dire('Aucun abonnement trouvé à ton adresse chez notre prestataire. '
         + 'Si tu as bien été débité, écris-nous : nous le rattacherons à la main.', 'err');
    }
  } catch(e){
    if (!silencieux) dire('Vérification impossible : ' + e.message + '.', 'err');
  }
  return false;
}

$('reparer').onclick = () => reparer(false);

(async function retourDePaiement(){
  let retour = null, session = null;
  try {
    const p = new URLSearchParams(window.location.search);
    retour = p.get('retour');
    session = p.get('session');
  } catch(e){}
  if (!retour) return;
  try { history.replaceState(null, '', window.location.pathname); } catch(e){}

  if (retour !== 'merci'){
    dire('Paiement abandonné : rien n\u2019a été débité.', '');
    return;
  }

  dire('Merci. Vérification du paiement…');
  if (session){
    try {
      await Compte.appel('abonnement_confirmer', { session: session });
      await Compte.rafraichir();
      peindre();
      if (Compte.abonne()){
        dire('Paiement confirmé, ton accès est ouvert. Merci !', 'ok');
        if (window.Bienvenue) window.Bienvenue.surAbonnement(Compte.utilisateur(), Compte.abonnement());
        return;
      }
    } catch(e){
      // on tente le second chemin avant d'inquiéter qui que ce soit
    }
  }
  if (await reparer(true)) return;

  // dernier recours : la notification finira peut-être par arriver
  let essais = 0;
  const attendre = setInterval(async () => {
    essais++;
    await Compte.rafraichir();
    peindre();
    if (Compte.abonne()){
      clearInterval(attendre);
      dire('Ton accès est ouvert. Merci !', 'ok');
    } else if (essais >= 6){
      clearInterval(attendre);
      dire('Le paiement est passé mais ton accès n\u2019est pas encore ouvert. '
         + 'Clique sur « Retrouver mon abonnement » ci-dessous.', 'err');
    }
  }, 3000);
})();

Compte.demarrer(peindre);
