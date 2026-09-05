"use strict";

/* =========================================================
   Le catalogue d'ingrédients.

   Il sert à une seule chose, mais elle est décisive : deviner le
   rayon d'un produit qu'on vient de saisir. Une liste triée par
   rayon se fait en un seul passage dans le magasin ; une liste
   dans l'ordre où l'on a pensé aux choses fait faire trois fois
   l'aller-retour entre les légumes et la crémerie.

   L'ordre des rayons suit celui d'un supermarché romand : on
   entre par les fruits et légumes, on finit par les boissons et
   l'entretien.
   ========================================================= */
/* Le même fichier sert au navigateur et aux bancs d'essai : envelopper
   plutôt que de dépendre de « window » évite d'en tenir deux versions. */
(function (global) {

const RAYONS = [
  { code:'legumes',    nom:'Fruits et légumes' },
  { code:'boucherie',  nom:'Boucherie' },
  { code:'poisson',    nom:'Poissonnerie' },
  { code:'cremerie',   nom:'Crémerie' },
  { code:'boulangerie',nom:'Boulangerie' },
  { code:'epicerie',   nom:'Épicerie salée' },
  { code:'sucre',      nom:'Épicerie sucrée' },
  { code:'surgeles',   nom:'Surgelés' },
  { code:'boissons',   nom:'Boissons' },
  { code:'entretien',  nom:'Entretien et maison' },
  { code:'hygiene',    nom:'Hygiène' },
  { code:'divers',     nom:'Divers' }
];

/* Chaque entrée : le rayon, et l'unité qu'on emploie le plus souvent.
   « 2 oignons » plutôt que « 200 g d'oignons » : l'unité par défaut
   évite d'avoir à choisir à chaque saisie. */
const CATALOGUE = {
  // --- fruits et légumes
  'oignon':['legumes','pièce'], 'échalote':['legumes','pièce'], 'ail':['legumes','gousse'],
  'carotte':['legumes','pièce'], 'pomme de terre':['legumes','kg'], 'tomate':['legumes','pièce'],
  'courgette':['legumes','pièce'], 'aubergine':['legumes','pièce'], 'poivron':['legumes','pièce'],
  'poireau':['legumes','pièce'], 'céleri':['legumes','pièce'], 'chou':['legumes','pièce'],
  'chou-fleur':['legumes','pièce'], 'brocoli':['legumes','pièce'], 'épinard':['legumes','g'],
  'salade':['legumes','pièce'], 'laitue':['legumes','pièce'], 'mâche':['legumes','g'],
  'concombre':['legumes','pièce'], 'radis':['legumes','botte'], 'betterave':['legumes','pièce'],
  'champignon':['legumes','g'], 'haricot':['legumes','g'], 'petit pois':['legumes','g'],
  'courge':['legumes','pièce'], 'potiron':['legumes','pièce'], 'navet':['legumes','pièce'],
  'fenouil':['legumes','pièce'], 'artichaut':['legumes','pièce'], 'asperge':['legumes','botte'],
  'persil':['legumes','botte'], 'basilic':['legumes','botte'], 'ciboulette':['legumes','botte'],
  'coriandre':['legumes','botte'], 'menthe':['legumes','botte'], 'thym':['legumes','botte'],
  'romarin':['legumes','botte'], 'gingembre':['legumes','g'], 'citron':['legumes','pièce'],
  'citron vert':['legumes','pièce'], 'orange':['legumes','pièce'], 'pomme':['legumes','pièce'],
  'poire':['legumes','pièce'], 'banane':['legumes','pièce'], 'fraise':['legumes','g'],
  'framboise':['legumes','g'], 'myrtille':['legumes','g'], 'raisin':['legumes','g'],
  'melon':['legumes','pièce'], 'pastèque':['legumes','pièce'], 'abricot':['legumes','g'],
  'pêche':['legumes','pièce'], 'prune':['legumes','g'], 'kiwi':['legumes','pièce'],
  'avocat':['legumes','pièce'], 'mangue':['legumes','pièce'], 'ananas':['legumes','pièce'],

  // --- boucherie
  'poulet':['boucherie','g'], 'blanc de poulet':['boucherie','g'], 'cuisse de poulet':['boucherie','pièce'],
  'bœuf':['boucherie','g'], 'viande hachée':['boucherie','g'], 'steak':['boucherie','pièce'],
  'porc':['boucherie','g'], 'côtelette':['boucherie','pièce'], 'lard':['boucherie','g'],
  'jambon':['boucherie','tranche'], 'saucisse':['boucherie','pièce'], 'cervelas':['boucherie','pièce'],
  'veau':['boucherie','g'], 'agneau':['boucherie','g'], 'dinde':['boucherie','g'],
  'rôti':['boucherie','g'], 'émincé':['boucherie','g'], 'salami':['boucherie','g'],
  'viande séchée':['boucherie','g'], 'bacon':['boucherie','g'],

  // --- poissonnerie
  'saumon':['poisson','g'], 'cabillaud':['poisson','g'], 'thon':['poisson','boîte'],
  'crevette':['poisson','g'], 'truite':['poisson','pièce'], 'perche':['poisson','g'],
  'moule':['poisson','kg'], 'sardine':['poisson','boîte'], 'poisson':['poisson','g'],

  // --- crémerie
  'lait':['cremerie','l'], 'beurre':['cremerie','g'], 'crème':['cremerie','dl'],
  'crème fraîche':['cremerie','dl'], 'yaourt':['cremerie','pièce'], 'fromage':['cremerie','g'],
  'gruyère':['cremerie','g'], 'parmesan':['cremerie','g'], 'mozzarella':['cremerie','pièce'],
  'féta':['cremerie','g'], 'chèvre':['cremerie','pièce'], 'raclette':['cremerie','g'],
  'œuf':['cremerie','pièce'], 'oeuf':['cremerie','pièce'], 'ricotta':['cremerie','g'],
  'mascarpone':['cremerie','g'], 'séré':['cremerie','g'], 'petit-suisse':['cremerie','pièce'],

  // --- boulangerie
  'pain':['boulangerie','pièce'], 'baguette':['boulangerie','pièce'], 'tresse':['boulangerie','pièce'],
  'croissant':['boulangerie','pièce'], 'pain de mie':['boulangerie','paquet'],
  'brioche':['boulangerie','pièce'], 'biscotte':['boulangerie','paquet'],

  // --- épicerie salée
  'pâtes':['epicerie','g'], 'spaghetti':['epicerie','g'], 'riz':['epicerie','g'],
  'quinoa':['epicerie','g'], 'lentille':['epicerie','g'], 'pois chiche':['epicerie','boîte'],
  'haricot rouge':['epicerie','boîte'], 'farine':['epicerie','g'], 'semoule':['epicerie','g'],
  'polenta':['epicerie','g'], 'huile':['epicerie','dl'], "huile d'olive":['epicerie','dl'],
  'vinaigre':['epicerie','dl'], 'sel':['epicerie','pincée'], 'poivre':['epicerie','pincée'],
  'moutarde':['epicerie','cs'], 'mayonnaise':['epicerie','cs'], 'ketchup':['epicerie','cs'],
  'tomate pelée':['epicerie','boîte'], 'concentré de tomate':['epicerie','cs'],
  'coulis de tomate':['epicerie','dl'], 'bouillon':['epicerie','cube'],
  'lait de coco':['epicerie','boîte'], 'curry':['epicerie','cc'], 'paprika':['epicerie','cc'],
  'cumin':['epicerie','cc'], 'curcuma':['epicerie','cc'], 'cannelle':['epicerie','cc'],
  'olive':['epicerie','g'], 'câpre':['epicerie','cs'], 'cornichon':['epicerie','pièce'],
  'levure':['epicerie','sachet'], 'chapelure':['epicerie','g'], 'maïzena':['epicerie','cs'],
  'sauce soja':['epicerie','cs'], 'miel':['epicerie','cs'], 'noix':['epicerie','g'],
  'amande':['epicerie','g'], 'noisette':['epicerie','g'], 'raisin sec':['epicerie','g'],

  // --- épicerie sucrée
  'sucre':['sucre','g'], 'chocolat':['sucre','g'], 'cacao':['sucre','cs'],
  'confiture':['sucre','pot'], 'céréales':['sucre','paquet'], 'biscuit':['sucre','paquet'],
  'compote':['sucre','pièce'], 'vanille':['sucre','sachet'], 'sucre glace':['sucre','g'],

  // --- surgelés
  'petits pois surgelés':['surgeles','g'], 'épinards surgelés':['surgeles','g'],
  'glace':['surgeles','l'], 'pizza':['surgeles','pièce'], 'frites':['surgeles','g'],

  // --- boissons
  'eau':['boissons','l'], 'jus':['boissons','l'], "jus d'orange":['boissons','l'],
  'vin':['boissons','bouteille'], 'vin blanc':['boissons','dl'], 'vin rouge':['boissons','dl'],
  'bière':['boissons','bouteille'], 'café':['boissons','g'], 'thé':['boissons','sachet'],
  'sirop':['boissons','bouteille'], 'limonade':['boissons','l'],

  // --- entretien et hygiène
  'lessive':['entretien','pièce'], 'liquide vaisselle':['entretien','pièce'],
  'éponge':['entretien','pièce'], 'sac poubelle':['entretien','paquet'],
  'papier ménage':['entretien','paquet'], 'papier aluminium':['entretien','pièce'],
  'film alimentaire':['entretien','pièce'], 'papier cuisson':['entretien','pièce'],
  'savon':['hygiene','pièce'], 'shampoing':['hygiene','pièce'],
  'dentifrice':['hygiene','pièce'], 'papier toilette':['hygiene','paquet'],
  'mouchoir':['hygiene','paquet'], 'couche':['hygiene','paquet']
};

/* On enlève accents, pluriels et articles pour reconnaître « les Oignons »
   comme « oignon ». Sans cela, chaque variante ferait une ligne de plus. */
function normaliser(texte){
  let t = String(texte || '').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^(de |du |des |la |le |les |l'|d')/, '')
    .replace(/[.,;:!?()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

/** Le singulier approximatif : suffisant pour rapprocher deux saisies. */
function singulier(mot){
  if (/eaux$/.test(mot)) return mot.slice(0, -1);
  if (/aux$/.test(mot))  return mot.slice(0, -3) + 'al';
  if (/[^aeiou]s$/.test(mot) && mot.length > 3) return mot.slice(0, -1);
  if (/x$/.test(mot) && mot.length > 3) return mot.slice(0, -1);
  return mot;
}

function cle(texte){
  return normaliser(texte).split(' ').map(singulier).join(' ');
}

/**
 * Devine le rayon et l'unité d'un produit saisi librement.
 * On cherche d'abord la correspondance exacte, puis la plus longue
 * entrée contenue dans le texte : « filet de poulet » trouve « poulet ».
 */
function deviner(texte){
  const k = cle(texte);
  if (CATALOGUE[k]) {
    return { rayon: CATALOGUE[k][0], unite: CATALOGUE[k][1], connu: true };
  }
  let meilleur = null;
  Object.keys(CATALOGUE).forEach(nom => {
    const kn = cle(nom);
    if (k === kn || k.indexOf(kn) >= 0 || kn.indexOf(k) >= 0){
      if (!meilleur || kn.length > meilleur.length) meilleur = kn;
    }
  });
  if (meilleur){
    const brut = Object.keys(CATALOGUE).find(n => cle(n) === meilleur);
    return { rayon: CATALOGUE[brut][0], unite: CATALOGUE[brut][1], connu: false };
  }
  return { rayon: 'divers', unite: '', connu: false };
}

/** Les produits proposés à la saisie, pour éviter de tout taper. */
function suggerer(debut, combien){
  const k = cle(debut);
  if (k === '') return [];
  const sortie = [];
  Object.keys(CATALOGUE).forEach(nom => {
    if (cle(nom).indexOf(k) === 0) sortie.push(nom);
  });
  Object.keys(CATALOGUE).forEach(nom => {
    if (sortie.indexOf(nom) < 0 && cle(nom).indexOf(k) > 0) sortie.push(nom);
  });
  return sortie.slice(0, combien || 6);
}

function nomRayon(code){
  const r = RAYONS.find(x => x.code === code);
  return r ? r.nom : 'Divers';
}

const API = { RAYONS, CATALOGUE, normaliser, cle, deviner, suggerer, nomRayon };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
global.Ingredients = API;

})(typeof window !== 'undefined' ? window : globalThis);
