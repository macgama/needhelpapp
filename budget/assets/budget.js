/* =========================================================
   budget — le script de la page
   Aucune dépendance : ni cadriciel, ni outil de construction.
   On dépose, ça tourne — comme le reste de NeedHelpApp.
   ========================================================= */
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

let CSRF = '';
let D = null;          // le livre entier, tel que l'API le rend
let MOIS = '';
let versionVue = 0;

/* ---------------------------------------------------------
   L'argent

   Les montants voyagent en centimes entiers. Un budget tenu
   en flottants finit par afficher 0.30000000000000004, et un
   total qui ne tombe pas juste ruine la confiance dans tout
   le reste.
   --------------------------------------------------------- */
const fr = (c) => {
  if (c === null || c === undefined) return '—';
  const s = c < 0 ? '−' : '';
  const a = Math.abs(c);
  return s + String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
           + '.' + String(a % 100).padStart(2, '0');
};
const signe = (c) => (c < 0 ? 'negatif' : c > 0 ? 'positif' : '');

/* ---------------------------------------------------------
   L'API
   --------------------------------------------------------- */
async function api(action, data) {
  const url = '/api/index.php?a=' + action;
  const opts = data
    ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF': CSRF },
        body: JSON.stringify(data) }
    : {};
  const r = await fetch(url, opts);
  let j;
  try { j = await r.json(); }
  catch (e) { throw new Error('réponse illisible du serveur (' + r.status + ')'); }
  if (j.error) throw new Error(j.error);
  return j;
}

function avis(texte, genre = 'note') {
  const el = $('#avis');
  el.textContent = texte;
  el.className = 'avis ' + genre;
  if (texte && genre !== 'erreur') setTimeout(() => { if (el.textContent === texte) el.textContent = ''; }, 4000);
}

/* Toute action d'écriture passe par ici : un seul endroit affiche les
   erreurs, un seul endroit recharge. Sans cela, chaque formulaire
   inventerait sa manière de rater. */
async function agir(action, data, message) {
  try {
    const r = await api(action, data);
    if (message) avis(message, 'bien');
    await charger();
    return r;
  } catch (e) {
    avis(e.message, 'erreur');
    return null;
  }
}

/* ---------------------------------------------------------
   Le chargement
   --------------------------------------------------------- */
async function charger() {
  D = await api('tout&mois=' + encodeURIComponent(MOIS));
  versionVue = D.livre.version;
  $('#livre-nom').textContent = D.livre.nom;
  $('#r-nom').value = D.livre.nom;
  $('#r-code').textContent = D.livre.code;
  peindre();
}

function peindre() {
  peindreTableau();
  peindreOperations();
  peindreBudget();
  peindreEmprunts();
  peindreReglages();
  remplirSelecteurs();
}

/* ---------------------------------------------------------
   Tableau de bord
   --------------------------------------------------------- */
const DETTE = new Set(['dette', 'carte']);

function peindreTableau() {
  let avoirs = 0, dettes = 0;
  D.comptes.filter(c => !c.archive).forEach(c => {
    const v = c.type === 'bien' && c.valeur !== null ? c.valeur : c.solde;
    if (DETTE.has(c.type)) dettes += Math.abs(v); else avoirs += v;
  });
  $('#t-avoirs').textContent = fr(avoirs);
  $('#t-dettes').textContent = fr(dettes);
  const net = avoirs - dettes;
  $('#t-net').textContent = fr(net);
  $('#t-net').className = 'valeur somme ' + signe(net);

  let entrees = 0, sorties = 0;
  D.operations.forEach(o => {
    if (o.sens === 'entree') entrees += o.montant;
    else if (o.sens === 'sortie') sorties += o.montant;
  });
  $('#t-mois-label').textContent = 'Reste du mois';
  $('#t-mois').textContent = fr(entrees - sorties);
  $('#t-mois').className = 'valeur somme ' + signe(entrees - sorties);

  const boite = $('#t-comptes');
  boite.innerHTML = '';
  const actifs = D.comptes.filter(c => !c.archive);
  $('#t-vide').hidden = actifs.length > 0;
  actifs.forEach(c => {
    const v = c.type === 'bien' && c.valeur !== null ? c.valeur : c.solde;
    const el = document.createElement('div');
    el.className = 'carte';
    el.style.setProperty('--teinte', c.couleur);
    el.innerHTML = `<div class="type"></div><div class="nom"></div>
                    <div class="somme ${signe(DETTE.has(c.type) ? -Math.abs(v) : v)}"></div>`;
    el.querySelector('.type').textContent = libelleType(c.type);
    el.querySelector('.nom').textContent = c.nom;
    el.querySelector('.somme').textContent = fr(DETTE.has(c.type) ? -Math.abs(v) : v);
    boite.appendChild(el);
  });
}

const TYPES = { courant:'Compte courant', epargne:'Épargne', especes:'Espèces',
                carte:'Carte de crédit', placement:'Placement', bien:'Bien',
                dette:'Dette', prevoyance:'Prévoyance' };
const libelleType = t => TYPES[t] || t;

/* ---------------------------------------------------------
   Opérations
   --------------------------------------------------------- */
function peindreOperations() {
  const comptes = Object.fromEntries(D.comptes.map(c => [c.id, c]));
  const cats = Object.fromEntries(D.categories.map(c => [c.id, c]));
  const ul = $('#op-liste');
  ul.innerHTML = '';

  let entrees = 0, sorties = 0;
  D.operations.forEach(o => {
    if (o.sens === 'entree') entrees += o.montant;
    else if (o.sens === 'sortie') sorties += o.montant;

    const li = document.createElement('li');
    li.className = 'ligne' + (o.pointe ? ' pointee' : '');
    li.innerHTML = `<button class="pointer" aria-pressed="${o.pointe}" title="Pointer">✓</button>
      <span class="jour"></span>
      <span class="corps"><span class="libelle"></span><span class="meta"></span></span>
      <span class="montant"></span>
      <button class="bouton pale petit" data-modifier>Modifier</button>`;
    li.querySelector('.jour').textContent = o.jour.slice(8) + '.' + o.jour.slice(5, 7);
    li.querySelector('.libelle').textContent = o.libelle || '(sans libellé)';
    const cat = o.categorie ? cats[o.categorie] : null;
    li.querySelector('.meta').textContent = o.sens === 'virement'
      ? (comptes[o.compte]?.nom || '?') + ' → ' + (comptes[o.vers]?.nom || '?')
      : [comptes[o.compte]?.nom, cat ? (cat.emoji + ' ' + cat.nom).trim() : null]
          .filter(Boolean).join(' · ');
    const m = li.querySelector('.montant');
    m.textContent = (o.sens === 'entree' ? '+' : o.sens === 'sortie' ? '−' : '') + fr(o.montant);
    m.className = 'montant somme ' + (o.sens === 'entree' ? 'positif' : o.sens === 'sortie' ? 'negatif' : '');

    li.querySelector('.pointer').onclick = () =>
      agir('operation_pointer', { id: o.id, pointe: o.pointe ? 0 : 1 });
    li.querySelector('[data-modifier]').onclick = () => remplirFormeOperation(o);
    ul.appendChild(li);
  });

  $('#op-resume').textContent = D.operations.length === 0
    ? 'Aucune opération ce mois-ci.'
    : `${D.operations.length} opération(s) · ${fr(entrees)} de recettes, ${fr(sorties)} de dépenses, reste ${fr(entrees - sorties)}`;
}

function remplirFormeOperation(o) {
  $('#op-id').value = o ? o.id : '';
  $('#op-sens').value = o ? o.sens : 'sortie';
  $('#op-montant').value = o ? (o.montant / 100).toFixed(2) : '';
  $('#op-jour').value = o ? o.jour : new Date().toISOString().slice(0, 10);
  $('#op-libelle').value = o ? (o.libelle || '') : '';
  if (o) { $('#op-compte').value = o.compte; if (o.vers) $('#op-vers').value = o.vers;
           $('#op-categorie').value = o.categorie || ''; }
  $('#op-valider').textContent = o ? 'Modifier' : 'Enregistrer';
  $('#op-annuler').hidden = !o;
  majSensOperation();
  if (o) $('#op-forme').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function majSensOperation() {
  const virement = $('#op-sens').value === 'virement';
  $('#op-vers-bloc').hidden = !virement;
  $('#op-cat-bloc').hidden = virement;
}

/* ---------------------------------------------------------
   Budget par enveloppe
   --------------------------------------------------------- */
function peindreBudget() {
  const boite = $('#b-liste');
  boite.innerHTML = '';
  const depense = {};
  D.operations.filter(o => o.sens === 'sortie' && o.categorie)
              .forEach(o => { depense[o.categorie] = (depense[o.categorie] || 0) + o.montant; });

  D.categories.filter(c => c.sens === 'sortie' && !c.archive).forEach(c => {
    const prevu = D.enveloppes[c.id] || 0;
    const fait = depense[c.id] || 0;
    const reste = prevu - fait;
    const part = prevu > 0 ? Math.min(100, Math.round(fait / prevu * 100)) : 0;

    const div = document.createElement('div');
    div.className = 'enveloppe-ligne';
    div.innerHTML = `<div class="haut">
        <b></b>
        <input type="text" inputmode="decimal" style="width:6.5rem;min-height:34px;padding:.3rem .5rem" placeholder="—">
        <span class="somme discret" data-reste></span>
      </div>
      <div class="jauge${prevu > 0 && fait > prevu ? ' depasse' : ''}"><span style="width:${part}%"></span></div>`;
    div.querySelector('b').textContent = (c.emoji + ' ' + c.nom).trim();
    const champ = div.querySelector('input');
    champ.value = prevu ? (prevu / 100).toFixed(2) : '';
    champ.onchange = () => agir('enveloppe_definir',
      { categorie: c.id, mois: MOIS, montant: champ.value }, 'Enveloppe enregistrée');
    div.querySelector('[data-reste]').textContent = prevu
      ? `${fr(fait)} dépensé, ${reste < 0 ? 'dépassé de ' + fr(-reste) : 'reste ' + fr(reste)}`
      : (fait ? fr(fait) + ' dépensé' : '');
    boite.appendChild(div);
  });
}

/* ---------------------------------------------------------
   Emprunts
   --------------------------------------------------------- */
/* Les valeurs de la base sont des mots-clés, pas des libellés : les
   afficher telles quelles donnait « HYPOTHEQUE · INDIRECT » en tête de
   carte. */
const GENRES = { hypotheque:'Hypothèque', pret:'Prêt personnel', leasing:'Leasing',
                 credit:'Crédit', prive:'Prêt privé' };
const MODES  = { indirect:'amortissement indirect', direct:'amortissement direct',
                 annuites:'mensualité constante', constant:'amortissement constant',
                 infine:'remboursement in fine' };
const PERIODES = { mensuel:'par mois', trimestriel:'par trimestre',
                   semestriel:'par semestre', annuel:'par an' };

const AIDE_MODE = {
  indirect: "Le capital ne baisse pas : vous ne versez que les intérêts à la banque, et l'amortissement va sur un 3e pilier nanti qui remboursera le capital à l'échéance. La déduction fiscale est maintenue.",
  direct:   "La dette diminue réellement à chaque échéance, et les intérêts suivent le solde. Au terme d'une tranche à taux fixe, le capital non amorti reste dû et se renégocie.",
  annuites: "Mensualité constante : la part d'intérêt décroît, celle de capital croît. C'est la forme du prêt personnel, du leasing et du crédit.",
  constant: "Vous remboursez la même part de capital à chaque fois, donc la mensualité baisse dans le temps.",
  infine:   "Vous ne payez que les intérêts, et remboursez tout le capital en une fois à l'échéance.",
};

function peindreEmprunts() {
  const boite = $('#e-liste');
  boite.innerHTML = '';
  const comptes = Object.fromEntries(D.comptes.map(c => [c.id, c]));

  if (!D.emprunts.length) {
    boite.innerHTML = '<p class="discret">Aucun emprunt enregistré. Une hypothèque, un leasing ou un prêt personnel se suivent tous ici.</p>';
    return;
  }
  D.emprunts.forEach(e => {
    const div = document.createElement('div');
    div.className = 'carte';
    div.style.marginBottom = 'var(--e3)';
    div.innerHTML = `<div class="type"></div><div class="nom"></div>
      <p class="discret" data-cond style="margin:.3rem 0 0"></p>
      <div class="rangee" style="margin-top:var(--e3)">
        <button class="bouton pale petit" data-voir>Voir l'échéancier</button>
        <button class="bouton pale petit" data-suppr>Supprimer</button>
      </div>`;
    div.querySelector('.type').textContent =
      (GENRES[e.genre] || e.genre) + ' · ' + (MODES[e.mode] || e.mode);
    div.querySelector('.nom').textContent = e.nom + (e.preteur ? ' — ' + e.preteur : '');
    div.querySelector('[data-cond]').textContent =
      `${fr(e.capital)} CHF à ${(e.taux / 100).toFixed(2)} % l'an, échéance ${PERIODES[e.periodicite] || e.periodicite}, depuis le ${e.debut}`;
    div.querySelector('[data-voir]').onclick = () => voirEcheancier(e);
    div.querySelector('[data-suppr]').onclick = () => {
      if (confirm('Supprimer « ' + e.nom +' » et son échéancier ?'))
        agir('emprunt_supprimer', { id: e.id }, 'Emprunt supprimé');
    };
    boite.appendChild(div);
  });
}

async function voirEcheancier(e) {
  const cible = $('#e-echeancier');
  cible.innerHTML = '<p class="discret">Calcul en cours…</p>';
  try {
    const r = await api('echeancier&id=' + e.id);
    const reste = r.echeances.length ? r.echeances[r.echeances.length - 1].restant : 0;
    let html = `<h2>${e.nom}</h2>
      <div class="synthese">
        <div><div class="etiquette">Intérêts sur la durée</div><div class="valeur somme negatif">${fr(r.total_interets)}</div></div>
        <div><div class="etiquette">Capital amorti</div><div class="valeur somme">${fr(r.total_capital)}</div></div>
        <div><div class="etiquette">Total versé</div><div class="valeur somme">${fr(r.total_verse)}</div></div>
        <div><div class="etiquette">Restera dû au terme</div><div class="valeur somme ${reste ? 'negatif' : ''}">${fr(reste)}</div></div>
      </div>`;
    if (e.mode === 'indirect') {
      html += `<p class="avis note">Amortissement indirect : la dette ne diminue pas.
        Le versement au 3e pilier n'apparaît pas dans cet échéancier — c'est un
        virement vers un compte de prévoyance, donc un <b>actif</b>, pas une
        diminution de dette. Notez-le comme tel pour que votre fortune nette
        soit juste.</p>`;
    } else if (reste > 0) {
      html += `<p class="avis note">Au terme, ${fr(reste)} CHF resteront dus.
        C'est normal pour une tranche à taux fixe : le solde se renégocie, il ne
        se rembourse pas d'un coup.</p>`;
    }
    html += '<div class="tableau-cadre"><table><thead><tr><th>N°</th><th>Date</th>' +
            '<th class="num">Versé</th><th class="num">Intérêt</th><th class="num">Capital</th>' +
            '<th class="num">Reste dû</th></tr></thead><tbody>' +
      r.echeances.map(l => `<tr><td>${l.numero}</td><td>${l.jour}</td>` +
        `<td class="num">${fr(l.montant)}</td><td class="num">${fr(l.interet)}</td>` +
        `<td class="num">${fr(l.capital)}</td><td class="num">${fr(l.restant)}</td></tr>`).join('') +
      '</tbody></table></div>';
    cible.innerHTML = html;
    cible.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    cible.innerHTML = '';
    avis(err.message, 'erreur');
  }
}

/* ---------------------------------------------------------
   Réglages
   --------------------------------------------------------- */
function peindreReglages() {
  const ul = $('#r-comptes');
  ul.innerHTML = '';
  D.comptes.forEach(c => {
    const li = document.createElement('li');
    li.className = 'ligne';
    li.innerHTML = `<span class="corps"><span class="libelle"></span><span class="meta"></span></span>
      <span class="montant somme"></span>
      <button class="bouton pale petit" data-mod>Modifier</button>
      <button class="bouton pale petit" data-sup>Supprimer</button>`;
    li.querySelector('.libelle').textContent = c.nom;
    li.querySelector('.meta').textContent = libelleType(c.type) + (c.archive ? ' · archivé' : '');
    li.querySelector('.montant').textContent = fr(c.solde);
    li.querySelector('[data-mod]').onclick = () => {
      $('#rc-id').value = c.id; $('#rc-nom').value = c.nom;
      $('#rc-type').value = c.type; $('#rc-initial').value = (c.initial / 100).toFixed(2);
      $('#rc-annuler').hidden = false;
      $('#r-compte').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    li.querySelector('[data-sup]').onclick = async () => {
      const r = await agir('compte_supprimer', { id: c.id });
      if (r === null && confirm('Ce compte porte des opérations, qui seront supprimées avec lui. Continuer ?'))
        agir('compte_supprimer', { id: c.id, confirme: 1 }, 'Compte supprimé');
    };
    ul.appendChild(li);
  });

  const uc = $('#r-categories');
  uc.innerHTML = '';
  D.categories.forEach(c => {
    const li = document.createElement('li');
    li.className = 'ligne';
    li.innerHTML = `<span class="corps"><span class="libelle"></span><span class="meta"></span></span>
      <button class="bouton pale petit" data-sup>Retirer</button>`;
    li.querySelector('.libelle').textContent = (c.emoji + ' ' + c.nom).trim();
    li.querySelector('.meta').textContent = c.sens === 'entree' ? 'recette' : 'dépense';
    li.querySelector('[data-sup]').onclick = () => {
      if (confirm('Retirer « ' + c.nom + ' » ? Les opérations sont conservées, elles perdent seulement leur catégorie.'))
        agir('categorie_supprimer', { id: c.id }, 'Catégorie retirée');
    };
    uc.appendChild(li);
  });

  api('journal').then(j => {
    const uj = $('#r-journal');
    uj.innerHTML = '';
    j.journal.forEach(l => {
      const li = document.createElement('li');
      li.className = 'ligne';
      li.innerHTML = '<span class="jour"></span><span class="corps"><span class="meta"></span></span>';
      li.querySelector('.jour').textContent = l.created_at.slice(8, 10) + '.' + l.created_at.slice(5, 7);
      li.querySelector('.meta').textContent = (l.name || 'quelqu\'un') + ' — ' + l.action.replace(/_/g, ' ');
      uj.appendChild(li);
    });
  }).catch(() => {});
}

function remplirSelecteurs() {
  const actifs = D.comptes.filter(c => !c.archive);
  const options = (sel, liste, vide) => {
    const garde = sel.value;
    sel.innerHTML = (vide ? '<option value="">—</option>' : '') +
      liste.map(c => `<option value="${c.id}"></option>`).join('');
    Array.from(sel.options).forEach(o => {
      const c = liste.find(x => String(x.id) === o.value);
      if (c) o.textContent = c.emoji ? (c.emoji + ' ' + c.nom).trim() : c.nom;
    });
    if (garde) sel.value = garde;
  };
  options($('#op-compte'), actifs, false);
  options($('#op-vers'), actifs, false);
  options($('#op-categorie'), D.categories.filter(c => !c.archive), true);
  options($('#e-compte'), actifs, false);
  options($('#e-compte-3a'), actifs, true);
}

/* ---------------------------------------------------------
   Le démarrage
   --------------------------------------------------------- */
async function demarrer() {
  MOIS = new Date().toISOString().slice(0, 7);
  $('#op-mois').value = MOIS;
  $('#op-jour').value = new Date().toISOString().slice(0, 10);
  $('#e-debut').value = new Date().toISOString().slice(0, 10);
  $('#e-mode-aide').textContent = AIDE_MODE.indirect;

  let s;
  try { s = await api('session'); }
  catch (e) { avis('Le serveur ne répond pas : ' + e.message, 'erreur'); return; }
  CSRF = s.csrf;

  if (s.portail) {
    $('#btn-connexion').href = s.portail.connexion;
    $('#btn-inscription').href = s.portail.inscription;
    $('#lien-connexion').href = s.portail.connexion;
    $('#lien-profil').href = s.portail.profil;
  }
  if (!s.user) {
    $('#lien-connexion').hidden = false;
    return;                       // on reste sur l'accueil
  }
  $('#lien-profil').hidden = false;
  $('#accueil').hidden = true;
  $('#application').hidden = false;

  try { await charger(); }
  catch (e) { avis(e.message, 'erreur'); }

  /* Le compteur de version : les autres membres du ménage voient les
     changements sans recharger. On ne demande que le numéro, pas tout
     le livre — c'est ce qui rend le procédé tenable sur un hébergement
     mutualisé. */
  setInterval(async () => {
    if (document.hidden) return;
    try {
      const v = await api('version');
      if (v.version && v.version !== versionVue) { await charger(); }
    } catch (e) { /* une coupure passagère ne mérite pas de message */ }
  }, 8000);
}

/* ---------------------------------------------------------
   Les branchements
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  $$('#onglets button').forEach(b => b.onclick = () => {
    $$('#onglets button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    $$('.panneau').forEach(p => p.classList.toggle('actif', p.id === 'vue-' + b.dataset.vue));
  });

  $('#op-sens').onchange = majSensOperation;
  $('#op-mois').onchange = async () => { MOIS = $('#op-mois').value; await charger(); };
  $('#op-annuler').onclick = () => remplirFormeOperation(null);

  $('#op-forme').onsubmit = async (ev) => {
    ev.preventDefault();
    const d = {
      id: $('#op-id').value || null, sens: $('#op-sens').value,
      montant: $('#op-montant').value, jour: $('#op-jour').value,
      compte: $('#op-compte').value, vers: $('#op-vers').value,
      categorie: $('#op-categorie').value || null, libelle: $('#op-libelle').value,
    };
    if (await agir('operation_enregistrer', d, 'Opération enregistrée')) remplirFormeOperation(null);
  };

  $('#e-mode').onchange = () => {
    $('#e-mode-aide').textContent = AIDE_MODE[$('#e-mode').value] || '';
    $('#e-3a-bloc').hidden = $('#e-mode').value !== 'indirect';
  };

  $('#e-forme').onsubmit = async (ev) => {
    ev.preventDefault();
    const d = {
      id: $('#e-id').value || null, nom: $('#e-nom').value, preteur: $('#e-preteur').value,
      genre: $('#e-genre').value, mode: $('#e-mode').value,
      capital: $('#e-capital').value, taux: $('#e-taux').value,
      amortissement: $('#e-amortissement').value, periodicite: $('#e-periodicite').value,
      debut: $('#e-debut').value, duree_mois: $('#e-duree').value || null,
      compte: $('#e-compte').value, compte_3a: $('#e-compte-3a').value || null,
    };
    const r = await agir('emprunt_enregistrer', d, 'Échéancier calculé');
    if (r) { ev.target.closest('details').open = false; ev.target.reset();
             const e = D.emprunts.find(x => x.id === r.id); if (e) voirEcheancier(e); }
  };

  $('#r-livre').onsubmit = (ev) => {
    ev.preventDefault();
    agir('livre_renommer', { nom: $('#r-nom').value }, 'Livre renommé');
  };
  $('#r-nouveau-code').onclick = () => {
    if (confirm('L\'ancien code cessera de fonctionner. Continuer ?'))
      agir('livre_nouveau_code', {}, 'Nouveau code');
  };

  $('#rc-annuler').onclick = () => {
    $('#rc-id').value = ''; $('#r-compte').reset(); $('#rc-annuler').hidden = true;
  };
  $('#r-compte').onsubmit = async (ev) => {
    ev.preventDefault();
    const d = { id: $('#rc-id').value || null, nom: $('#rc-nom').value,
                type: $('#rc-type').value, initial: $('#rc-initial').value || '0' };
    if (await agir('compte_enregistrer', d, 'Compte enregistré')) {
      $('#rc-id').value = ''; ev.target.reset(); $('#rc-annuler').hidden = true;
    }
  };

  demarrer();
});
