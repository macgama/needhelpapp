"use strict";

/* =========================================================
   La zone d'administration.
   Tout ce qui est ici est aussi contrôlé par le serveur :
   cacher un bouton ne protège rien.
   ========================================================= */
const $ = (id) => document.getElementById(id);
const Compte = window.Compte;

const ROLES = { membre:'Membre', moderateur:'Modérateur', admin:'Administrateur' };

function dateFr(v){
  if (!v) return '—';
  const d = new Date(String(v).replace(' ', 'T'));
  return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit' });
}
function txt(parent, contenu, classe){
  const s = document.createElement('span');
  if (classe) s.className = classe;
  s.textContent = contenu;
  parent.appendChild(s);
  return s;
}

/* ---------- navigation entre les vues ---------- */
document.querySelectorAll('#onglets button').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('#onglets button').forEach(x => x.setAttribute('aria-current', x === b ? 'true' : 'false'));
    ['comptes','contenus','facturation'].forEach(v => { $('vue-' + v).hidden = (v !== b.dataset.vue); });
    if (b.dataset.vue === 'contenus') chargerContenus();
    if (b.dataset.vue === 'facturation') chargerFacturation();
  };
});

/* ---------- le résumé ---------- */
async function chargerResume(){
  try {
    const r = (await Compte.appel('admin_resume')).resume;
    const box = $('resume');
    box.innerHTML = '';
    [['comptes','comptes'], ['abonnes','abonnés'], ['impayes','en échec'],
     ['dictees_pub','dictées publiées'], ['signalements','signalements']].forEach(([cle, mot]) => {
      const d = document.createElement('div');
      d.className = 'chiffre';
      const b = document.createElement('b');
      b.textContent = r[cle] < 0 ? '—' : r[cle];
      const s = document.createElement('span');
      s.textContent = mot;
      d.appendChild(b); d.appendChild(s);
      box.appendChild(d);
    });
  } catch(e){
    $('resume').innerHTML = '';
  }
}

/* ---------- les comptes ---------- */
let minuteur = null;

async function chargerComptes(){
  $('note-comptes').textContent = 'Chargement…';
  try {
    const r = await Compte.appel('admin_comptes', null, {
      q: $('q-comptes').value.trim(), filtre: $('filtre-comptes').value
    });
    const corps = $('corps-comptes');
    corps.innerHTML = '';
    (r.comptes || []).forEach(c => corps.appendChild(ligneCompte(c)));

    /* Le rôle est global : le changer ici le change partout. Le dire évite
       de croire qu'on nomme un « administrateur de l'apprentissage ». */
    const note = $('note-roles');
    if (note){
      const central = (r.comptes || []).some(c => c.central);
      note.hidden = !central;
      note.textContent = 'Le rôle et l\u2019abonnement viennent du compte NeedHelpApp : '
        + 'les modifier ici vaut pour toutes les applications.';
    }
    $('note-comptes').textContent = (r.comptes || []).length
      ? (r.comptes.length === 100 ? 'Les 100 comptes les plus récents. Affine la recherche pour aller plus loin.'
                                  : r.comptes.length + ' compte(s).')
      : 'Aucun compte ne correspond.';
  } catch(e){
    $('note-comptes').textContent = 'Lecture impossible : ' + e.message + '.';
  }
}

function ligneCompte(c){
  const tr = document.createElement('tr');

  const td1 = document.createElement('td');
  const nom = document.createElement('b');
  nom.style.fontWeight = '500';
  nom.textContent = c.nom || '—';
  td1.appendChild(nom);
  td1.appendChild(document.createElement('br'));
  txt(td1, c.email, 'mono');
  if (c.google){ td1.appendChild(document.createElement('br')); txt(td1, 'via Google', 'mono'); }
  tr.appendChild(td1);

  const td2 = document.createElement('td');
  const sel = document.createElement('select');
  Object.keys(ROLES).forEach(cle => {
    const o = document.createElement('option');
    o.value = cle;
    o.textContent = ROLES[cle];
    sel.appendChild(o);
  });
  sel.value = c.role;
  sel.className = 'r-' + c.role;
  sel.disabled = (c.central === false);   // pas encore rattaché au portail
  sel.title = sel.disabled
    ? 'Ce compte n\u2019est pas encore rattaché au portail : il le sera à sa prochaine visite.'
    : 'Rôle valable pour toutes les applications';
  sel.onchange = async () => {
    const avant = c.role;
    try {
      await Compte.appel('admin_role', { id:c.id, role:sel.value });
      c.role = sel.value;
      sel.className = 'r-' + c.role;
      $('note-comptes').textContent = c.email + ' est désormais ' + ROLES[c.role].toLowerCase() + '.';
      chargerResume();
    } catch(e){
      sel.value = avant;
      $('note-comptes').textContent = 'Changement refusé : ' + e.message + '.';
    }
  };
  td2.appendChild(sel);
  tr.appendChild(td2);

  const td3 = document.createElement('td');
  if (c.role === 'admin' || c.role === 'moderateur'){
    txt(td3, 'accès offert', 'badge');
  } else if (c.statut === 'actif'){
    txt(td3, (c.plan === 'annuel' ? 'annuel' : 'mensuel') + ', jusqu\u2019au ' + dateFr(c.fin));
  } else if (c.statut === 'resilie'){
    txt(td3, 'résilié, jusqu\u2019au ' + dateFr(c.fin));
  } else if (c.statut === 'impaye'){
    txt(td3, 'paiement en échec', 'r-admin');
  } else {
    txt(td3, 'version gratuite', 'r-membre');
  }
  tr.appendChild(td3);

  const td4 = document.createElement('td');
  txt(td4, dateFr(c.inscrit), 'mono');
  td4.appendChild(document.createElement('br'));
  txt(td4, c.visite ? 'vu le ' + dateFr(c.visite) : 'jamais revenu', 'mono');
  tr.appendChild(td4);

  return tr;
}

$('q-comptes').addEventListener('input', () => {
  clearTimeout(minuteur);
  minuteur = setTimeout(chargerComptes, 350);
});
$('filtre-comptes').addEventListener('change', chargerComptes);

/* ---------- les contenus publiés ---------- */
async function chargerContenus(){
  $('note-contenus').textContent = 'Chargement…';
  const type = $('type-contenu').value;
  try {
    const r = await Compte.appel('admin_contenus', null, {
      type: type, signales: $('que-signales').checked ? '1' : ''
    });
    const corps = $('corps-contenus');
    corps.innerHTML = '';
    (r.contenus || []).forEach(c => corps.appendChild(ligneContenu(c, r.type)));
    $('note-contenus').textContent = (r.contenus || []).length
      ? r.contenus.length + ' contenu(s) publié(s).'
      : ($('que-signales').checked ? 'Aucun signalement en attente.' : 'Rien de publié pour l\u2019instant.');
  } catch(e){
    $('note-contenus').textContent = 'Lecture impossible : ' + e.message + '.';
  }
}

function ligneContenu(c, type){
  const tr = document.createElement('tr');

  const td1 = document.createElement('td');
  const t = document.createElement('b');
  t.style.fontWeight = '500';
  t.textContent = c.titre;
  td1.appendChild(t);
  const detail = [c.author, c.chapter, c.lang_target, c.level].filter(Boolean).join(' · ');
  if (detail){ td1.appendChild(document.createElement('br')); txt(td1, detail, 'mono'); }
  tr.appendChild(td1);

  const td2 = document.createElement('td');
  txt(td2, c.proprietaire || '—');
  td2.appendChild(document.createElement('br'));
  txt(td2, c.email, 'mono');
  tr.appendChild(td2);

  const td3 = document.createElement('td');
  const n = parseInt(c.reports, 10) || 0;
  txt(td3, n ? n + (n > 1 ? ' signalements' : ' signalement') : '—', n ? 'r-admin' : 'r-membre');
  tr.appendChild(td3);

  const td4 = document.createElement('td');
  const dep = document.createElement('button');
  dep.className = 'mini';
  dep.textContent = 'Dépublier';
  dep.onclick = async () => {
    if (!window.confirm('Retirer « ' + c.titre + ' » de la bibliothèque ? '
      + 'Le contenu reste chez son auteur, il n\u2019est pas effacé.')) return;
    try {
      await Compte.appel('admin_depublier', { type:type, id:c.id });
      chargerContenus(); chargerResume();
    } catch(e){ $('note-contenus').textContent = 'Impossible : ' + e.message + '.'; }
  };
  td4.appendChild(dep);

  if (n > 0){
    const eff = document.createElement('button');
    eff.className = 'mini';
    eff.textContent = 'Signalements infondés';
    eff.onclick = async () => {
      try {
        await Compte.appel('admin_signalements_effacer', { type:type, id:c.id });
        chargerContenus(); chargerResume();
      } catch(e){ $('note-contenus').textContent = 'Impossible : ' + e.message + '.'; }
    };
    td4.appendChild(eff);
  }
  tr.appendChild(td4);
  return tr;
}

$('type-contenu').addEventListener('change', chargerContenus);
$('que-signales').addEventListener('change', chargerContenus);

/* ---------- la facturation ---------- */
async function chargerFacturation(){
  $('note-facturation').textContent = 'Chargement…';
  try {
    const r = await Compte.appel('admin_facturation');
    const corps = $('corps-facturation');
    corps.innerHTML = '';
    (r.evenements || []).forEach(e => {
      const tr = document.createElement('tr');
      [dateFr(e.created_at), e.email || '—', e.type, e.resume || '—'].forEach((v, i) => {
        const td = document.createElement('td');
        txt(td, v, i === 2 ? 'mono' : '');
        tr.appendChild(td);
      });
      corps.appendChild(tr);
    });
    $('note-facturation').textContent = (r.evenements || []).length
      ? 'Les 40 dernières notifications reçues du prestataire de paiement.'
      : 'Aucune notification reçue. Si des paiements ont eu lieu, vérifie le webhook '
        + 'avec api/paiement-test.php.';
  } catch(e){
    $('note-facturation').textContent = 'Lecture impossible : ' + e.message + '.';
  }
}

/* ---------- démarrage ---------- */
Compte.demarrer(() => {
  const u = Compte.utilisateur();
  const admin = !!(u && u.role === 'admin');
  $('pas-admin').hidden = admin;
  $('admin-box').hidden = !admin;
  if (!admin){
    $('pas-admin-texte').textContent = u
      ? 'Cette page est réservée à l\u2019administration. Ton compte n\u2019a pas ce rôle.'
      : 'Cette page est réservée à l\u2019administration. Connecte-toi.';
    return;
  }
  chargerResume();
  chargerComptes();
});
