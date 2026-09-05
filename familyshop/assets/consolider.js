"use strict";

/* =========================================================
   La consolidation.

   Le cœur de l'application, et sa seule vraie difficulté.

   Trois recettes demandent « 2 oignons », « 200 g d'oignons »
   et « 1 oignon ». La liste ne doit pas porter trois lignes,
   mais une seule — et le calcul ne peut pas additionner des
   pièces avec des grammes.

   La règle retenue : on additionne ce qui se convertit (les
   masses entre elles, les volumes entre eux), et l'on juxtapose
   le reste. « 3 pièces + 200 g » est honnête ; « 203 » serait
   faux et ferait acheter n'importe quoi.
   ========================================================= */
(function (global) {

const I = (typeof require !== 'undefined' && typeof window === 'undefined')
  ? require('./ingredients.js')
  : global.Ingredients;

/* Les familles d'unités convertibles, ramenées à une base. */
const MASSES  = { 'g':1, 'gr':1, 'gramme':1, 'grammes':1, 'kg':1000, 'kilo':1000 };
const VOLUMES = { 'ml':1, 'cl':10, 'dl':100, 'l':1000, 'litre':1000, 'litres':1000 };

function familleDe(unite){
  const u = String(unite || '').toLowerCase().trim();
  if (MASSES[u] !== undefined)  return { famille:'masse',  facteur:MASSES[u] };
  if (VOLUMES[u] !== undefined) return { famille:'volume', facteur:VOLUMES[u] };
  return { famille: u === '' ? 'sans' : u, facteur: 1 };
}

/* Ce qui s'achète à l'unité : on ne met pas trois quarts de citron dans
   un panier. La mise à l'échelle en produit pourtant dès qu'un repas
   change de nombre de couverts. */
const COMPTABLES = ['pièce', 'gousse', 'tranche', 'botte', 'boîte', 'paquet',
                    'sachet', 'pot', 'bouteille', 'cube'];

/** Remet une quantité dans l'unité la plus lisible de sa famille. */
function presenter(valeur, famille){
  if (famille === 'masse'){
    return valeur >= 1000
      ? { q: arrondir(valeur / 1000), u: 'kg' }
      : { q: arrondir(valeur), u: 'g' };
  }
  if (famille === 'volume'){
    if (valeur >= 1000) return { q: arrondir(valeur / 1000), u: 'l' };
    if (valeur >= 100)  return { q: arrondir(valeur / 100),  u: 'dl' };
    return { q: arrondir(valeur), u: 'ml' };
  }
  if (COMPTABLES.indexOf(famille) >= 0){
    // vers le haut : mieux vaut un citron de trop que la recette ratée
    return { q: Math.ceil(valeur - 0.001), u: famille };
  }
  return { q: arrondir(valeur), u: famille === 'sans' ? '' : famille };
}

/* Deux décimales au plus, et pas de zéro inutile : « 1.5 » et non
   « 1.500 », « 3 » et non « 3.0 ». */
function arrondir(x){
  const n = Math.round(x * 100) / 100;
  return Number.isInteger(n) ? n : parseFloat(n.toFixed(2));
}

/**
 * Consolide des lignes d'ingrédients en une liste de courses.
 *
 * @param lignes [{label, quantite, unite, rayon, source}]
 *        `source` sert à dire d'où vient chaque chose : « pour Lasagnes ».
 * @return [{label, cle, rayon, quantites:[{q,u}], detail}]
 */
function consolider(lignes){
  const paquets = {};

  (lignes || []).forEach(l => {
    const label = String(l.label || '').trim();
    if (!label) return;

    const k = I.cle(label);
    if (!paquets[k]){
      const devine = I.deviner(label);
      paquets[k] = {
        cle: k,
        // on garde le libellé le plus court : « oignon » plutôt que
        // « oignons jaunes moyens », plus lisible dans un rayon
        label: label,
        rayon: l.rayon || devine.rayon,
        familles: {},
        sources: []
      };
    }
    const p = paquets[k];
    if (label.length < p.label.length) p.label = label;
    if (l.rayon && l.rayon !== 'divers') p.rayon = l.rayon;

    const f = familleDe(l.unite);
    const q = (l.quantite === null || l.quantite === undefined || l.quantite === '')
      ? null : Number(l.quantite);

    if (q === null || isNaN(q)){
      // « du sel », sans quantité : on retient qu'il en faut
      p.familles['sans-quantite'] = p.familles['sans-quantite'] || { total:null, famille:'sans' };
    } else {
      const cleF = f.famille;
      if (!p.familles[cleF]) p.familles[cleF] = { total:0, famille:cleF };
      p.familles[cleF].total += q * f.facteur;
    }
    if (l.source && p.sources.indexOf(l.source) < 0) p.sources.push(l.source);
  });

  return Object.keys(paquets).map(k => {
    const p = paquets[k];
    const quantites = [];
    Object.keys(p.familles).forEach(cleF => {
      if (cleF === 'sans-quantite') return;
      quantites.push(presenter(p.familles[cleF].total, p.familles[cleF].famille));
    });
    return {
      cle: p.cle,
      label: p.label,
      rayon: p.rayon,
      quantites: quantites,
      detail: p.sources.join(', ')
    };
  });
}

/** « 1.5 kg + 3 pièces », ou « — » quand aucune quantité n'est connue. */
function ecrire(quantites){
  if (!quantites || !quantites.length) return '';
  return quantites
    .map(x => (x.u ? x.q + ' ' + x.u : String(x.q)))
    .join(' + ');
}

/**
 * Met une recette à l'échelle du nombre de couverts.
 * Les quantités sans nombre — « du sel », « un peu de persil » — ne
 * se multiplient pas : on n'a pas besoin de quatre fois plus de sel.
 */
function mettreAlEchelle(quantite, couvertsRecette, couvertsVoulus){
  if (quantite === null || quantite === undefined || quantite === '') return null;
  const base = Number(couvertsRecette) || 4;
  const voulu = Number(couvertsVoulus) || base;
  if (base === voulu) return Number(quantite);
  return arrondir(Number(quantite) * voulu / base);
}

const API = { consolider, ecrire, mettreAlEchelle, familleDe, presenter, arrondir };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
global.Consolider = API;

})(typeof window !== 'undefined' ? window : globalThis);
