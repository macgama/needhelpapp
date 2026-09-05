"use strict";

/* =========================================================
   Mon profil : le compte, ses données, son mot de passe.
   ========================================================= */
const $ = (id) => document.getElementById(id);
const Compte = window.Compte;
let profil = null;

function dire(zone, msg, genre){
  $(zone).className = 'status' + (genre ? ' ' + genre : '');
  $(zone).textContent = msg || '';
}
function dateFr(v){
  if (!v) return '—';
  const d = new Date(String(v).replace(' ', 'T'));
  return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
}

async function charger(){
  const connecte = Compte.connecte();
  $('hors-compte').hidden = connecte || !Compte.disponible();
  $('profil-box').hidden = !connecte;
  if (!connecte) return;

  try {
    const r = await Compte.appel('profil');
    profil = r;
    const p = r.profil, d = r.donnees, a = r.abonnement;

    $('p-email').textContent = p.email;
    $('p-inscrit').textContent = dateFr(p.inscrit_le);
    $('p-nom').value = p.nom || '';
    $('p-connexion').textContent = [p.mot_de_passe ? 'mot de passe' : null, p.google ? 'Google' : null]
      .filter(Boolean).join(' et ') || '—';

    $('p-abo').textContent = !a.abonne
      ? 'version gratuite'
      : (a.statut === 'resilie'
          ? 'résilié, actif jusqu\u2019au ' + dateFr(a.fin)
          : (a.plan === 'annuel' ? 'annuel' : 'mensuel') + ', échéance le ' + dateFr(a.fin));

    ['dictees','reprises','publiees','listes','resultats'].forEach(k => {
      $('d-' + k).textContent = d[k];
    });

    // un compte ouvert avec Google n'a pas de mot de passe : il en crée un
    $('mdp-titre').textContent = p.mot_de_passe ? 'Mot de passe' : 'Définir un mot de passe';
    $('mdp-actuel-champ').hidden = !p.mot_de_passe;
    $('p-mdp-enregistrer').textContent = p.mot_de_passe ? 'Modifier le mot de passe' : 'Définir le mot de passe';
    $('mdp-aide').textContent = p.mot_de_passe
      ? 'Le changer déconnecte tes autres appareils, ce qui est utile en cas de doute.'
      : 'Tu te connectes avec Google. Un mot de passe te permettra aussi d\u2019entrer sans lui.';
  } catch(e){
    dire('p-note', 'Impossible de lire ton profil : ' + e.message + '.', 'err');
  }
}

$('profil-connexion').onclick = () => Compte.ouvrir('login');

$('p-nom-enregistrer').onclick = async () => {
  try {
    const r = await Compte.appel('profil_nom', { nom: $('p-nom').value.trim() });
    await Compte.rafraichir();
    dire('p-note', r.nom ? 'Prénom enregistré.' : 'Prénom effacé.', 'ok');
  } catch(e){
    dire('p-note', 'Enregistrement impossible : ' + e.message + '.', 'err');
  }
};

$('p-mdp-enregistrer').onclick = async () => {
  const nouveau = $('p-nouveau').value;
  if (nouveau.length < 8){ dire('mdp-note', 'Il faut au moins 8 caractères.', 'err'); return; }
  try {
    await Compte.appel('mot_de_passe', { actuel: $('p-actuel').value, nouveau: nouveau });
    $('p-actuel').value = ''; $('p-nouveau').value = '';
    await charger();
    dire('mdp-note', 'Mot de passe enregistré. Tes autres appareils ont été déconnectés.', 'ok');
  } catch(e){
    dire('mdp-note', e.message + '.', 'err');
  }
};

$('p-export').onclick = async () => {
  dire('p-note', 'Préparation du fichier…');
  try {
    const tout = await Compte.appel('export_tout');
    const blob = new Blob([JSON.stringify(tout, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mes-donnees-teaching.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    dire('p-note', 'Fichier téléchargé.', 'ok');
  } catch(e){
    dire('p-note', 'Export impossible : ' + e.message + '.', 'err');
  }
};

$('p-supprimer').onclick = async () => {
  if (!window.confirm('Supprimer définitivement ton compte, tes dictées, tes listes et tes résultats ? '
    + 'Cette action est irréversible.')) return;
  if (!window.confirm('Dernière confirmation : tout sera effacé, sans possibilité de retour.')) return;
  try {
    await Compte.appel('account_delete', {});
    window.location.href = 'index.html';
  } catch(e){
    dire('sup-note', 'Suppression impossible : ' + e.message + '.', 'err');
  }
};

Compte.demarrer(charger);
