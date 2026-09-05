"use strict";

/* =========================================================
   Trente recettes de départ.

   Écrites ici, dans nos mots. Ce n'est pas une précaution
   inutile : une recette en tant que méthode n'est pas
   protégée par le droit d'auteur, mais sa rédaction l'est,
   et un recueil l'est en tant que collection. Reprendre les
   textes d'un site ou d'un livre serait donc une copie, même
   si les ingrédients, eux, appartiennent à tout le monde.

   Ce sont des plats de tous les jours d'une cuisine de
   Suisse romande : ce qu'on fait un mardi soir, pas ce qu'on
   sert à Noël. Les quantités sont pour quatre.
   ========================================================= */
(function (global) {

/* [nom, minutes, catégorie, notes, [[ingrédient, quantité, unité], …]] */
const RECETTES = [

  ['Gratin de pommes de terre', 70, 'plat',
   'Émincer finement les pommes de terre, les disposer en couches dans un plat frotté d\u2019ail. Saler, poivrer, verser la crème et le lait à hauteur, couvrir de fromage râpé. Quarante minutes au four à 190°, puis dix minutes de plus si le dessus n\u2019est pas assez doré.',
   [['pomme de terre',1.2,'kg'],['crème',3,'dl'],['lait',2,'dl'],['gruyère',150,'g'],
    ['ail',2,'gousse'],['sel',null,'pincée'],['poivre',null,'pincée']]],

  ['Lasagnes à la viande', 90, 'plat',
   'Faire revenir l\u2019oignon et la carotte en petits dés, ajouter la viande, puis les tomates. Laisser mijoter quarante minutes à découvert. Préparer une béchamel avec le beurre, la farine et le lait. Alterner pâtes, viande et béchamel, finir par le fromage. Trente-cinq minutes à 190°.',
   [['viande hachée',500,'g'],['tomate pelée',2,'boîte'],['oignon',1,'pièce'],
    ['carotte',1,'pièce'],['ail',2,'gousse'],['lait',6,'dl'],['beurre',50,'g'],
    ['farine',50,'g'],['parmesan',80,'g'],['pâtes',250,'g'],['huile d\'olive',2,'cs']]],

  ['Curry de poulet au lait de coco', 35, 'plat',
   'Dorer le poulet en morceaux, réserver. Faire fondre l\u2019oignon, ajouter le curry et laisser chauffer une minute pour qu\u2019il libère son parfum. Remettre le poulet, verser le lait de coco, laisser réduire un quart d\u2019heure. Servir avec le riz.',
   [['poulet',600,'g'],['lait de coco',1,'boîte'],['oignon',1,'pièce'],
    ['ail',2,'gousse'],['gingembre',20,'g'],['curry',2,'cc'],['riz',300,'g'],
    ['huile',2,'cs'],['sel',null,'pincée']]],

  ['Risotto aux champignons', 40, 'plat',
   'Faire suer l\u2019échalote, nacrer le riz, déglacer au vin blanc. Ajouter le bouillon louche par louche en remuant, pendant dix-huit minutes environ. Incorporer les champignons poêlés à part, puis le beurre et le parmesan hors du feu.',
   [['riz',320,'g'],['champignon',400,'g'],['échalote',2,'pièce'],['vin blanc',1,'dl'],
    ['bouillon',1,'cube'],['beurre',40,'g'],['parmesan',60,'g'],['persil',1,'botte']]],

  ['Émincé de veau à la zurichoise', 30, 'plat',
   'Saisir la viande à feu vif par petites quantités, réserver. Faire fondre l\u2019échalote et les champignons, déglacer au vin blanc, ajouter la crème et laisser épaissir. Remettre la viande une minute, pas plus.',
   [['veau',600,'g'],['champignon',250,'g'],['échalote',2,'pièce'],['vin blanc',1,'dl'],
    ['crème',2,'dl'],['beurre',30,'g'],['farine',1,'cs'],['persil',1,'botte']]],

  ['Soupe de courge', 35, 'plat',
   'Faire revenir l\u2019oignon, ajouter la courge en cubes et la pomme de terre. Couvrir de bouillon, cuire vingt-cinq minutes, mixer. Un filet de crème au moment de servir.',
   [['courge',1,'pièce'],['pomme de terre',2,'pièce'],['oignon',1,'pièce'],
    ['bouillon',1,'cube'],['crème',1,'dl'],['sel',null,'pincée']]],

  ['Quiche aux poireaux', 55, 'plat',
   'Émincer les poireaux et les faire fondre doucement au beurre, vingt minutes, sans les colorer. Battre les œufs avec la crème et le lait, ajouter le fromage. Verser sur la pâte, enfourner trente-cinq minutes à 180°.',
   [['poireau',3,'pièce'],['œuf',3,'pièce'],['crème',2,'dl'],['lait',1,'dl'],
    ['gruyère',100,'g'],['beurre',30,'g'],['sel',null,'pincée']]],

  ['Spaghetti à la carbonara', 20, 'plat',
   'Faire rissoler le lard. Battre les œufs avec le parmesan et beaucoup de poivre. Égoutter les pâtes en gardant un peu d\u2019eau, les mélanger au lard hors du feu, puis aux œufs en remuant vite : la chaleur des pâtes suffit à lier.',
   [['spaghetti',400,'g'],['lard',150,'g'],['œuf',4,'pièce'],['parmesan',80,'g'],
    ['poivre',null,'pincée']]],

  ['Poulet rôti et légumes', 80, 'plat',
   'Frotter le poulet de sel, poivre et thym. L\u2019installer sur les légumes coupés gros, arroser d\u2019huile. Une heure dix à 190°, en arrosant deux ou trois fois avec le jus.',
   [['poulet',1.4,'kg'],['pomme de terre',800,'g'],['carotte',4,'pièce'],
    ['oignon',2,'pièce'],['ail',4,'gousse'],['thym',1,'botte'],['huile d\'olive',3,'cs']]],

  ['Chili con carne', 50, 'plat',
   'Dorer la viande, ajouter oignon et poivron, puis les épices. Verser les tomates et les haricots, laisser mijoter quarante minutes à petit feu. C\u2019est meilleur réchauffé le lendemain.',
   [['viande hachée',500,'g'],['haricot rouge',2,'boîte'],['tomate pelée',1,'boîte'],
    ['oignon',1,'pièce'],['poivron',1,'pièce'],['ail',2,'gousse'],['cumin',1,'cc'],
    ['paprika',1,'cc'],['riz',300,'g']]],

  ['Saumon au four et riz', 30, 'plat',
   'Poser les pavés sur du papier cuisson, un filet d\u2019huile, des rondelles de citron. Quinze minutes à 200°, le poisson doit rester nacré au centre.',
   [['saumon',600,'g'],['citron',1,'pièce'],['riz',300,'g'],['huile d\'olive',2,'cs'],
    ['sel',null,'pincée'],['poivre',null,'pincée']]],

  ['Tarte à la tomate et moutarde', 45, 'plat',
   'Étaler la moutarde sur le fond de pâte, couvrir de fromage râpé, ranger les rondelles de tomate. Un peu de thym, un filet d\u2019huile, trente minutes à 190°.',
   [['tomate',5,'pièce'],['moutarde',2,'cs'],['gruyère',120,'g'],['thym',1,'botte'],
    ['huile d\'olive',1,'cs']]],

  ['Boulettes de viande sauce tomate', 45, 'plat',
   'Mélanger la viande avec l\u2019œuf, la chapelure et l\u2019ail écrasé. Former des boulettes, les dorer, puis les laisser mijoter vingt-cinq minutes dans le coulis.',
   [['viande hachée',500,'g'],['œuf',1,'pièce'],['chapelure',50,'g'],['ail',2,'gousse'],
    ['coulis de tomate',5,'dl'],['oignon',1,'pièce'],['basilic',1,'botte'],['pâtes',350,'g']]],

  ['Rösti et œuf au plat', 30, 'plat',
   'Râper les pommes de terre, presser pour retirer l\u2019eau. Étaler dans le beurre chaud, tasser, laisser prendre dix minutes sans toucher. Retourner à l\u2019aide d\u2019une assiette et recommencer. Un œuf au plat par personne.',
   [['pomme de terre',1,'kg'],['beurre',50,'g'],['œuf',4,'pièce'],['sel',null,'pincée']]],

  ['Ratatouille', 55, 'plat',
   'Cuire chaque légume séparément à l\u2019huile d\u2019olive : c\u2019est plus long, mais chacun garde son goût. Tout réunir avec l\u2019ail et les herbes, laisser vingt minutes à couvert.',
   [['courgette',3,'pièce'],['aubergine',2,'pièce'],['poivron',2,'pièce'],
    ['tomate',5,'pièce'],['oignon',2,'pièce'],['ail',3,'gousse'],
    ['huile d\'olive',5,'cs'],['thym',1,'botte']]],

  ['Croque-monsieur au jambon', 20, 'plat',
   'Une fine béchamel, du jambon, du fromage entre deux tranches. Beurrer l\u2019extérieur et cuire à la poêle, ou dix minutes au four à 200°.',
   [['pain de mie',1,'paquet'],['jambon',8,'tranche'],['gruyère',150,'g'],
    ['beurre',40,'g'],['farine',20,'g'],['lait',2,'dl']]],

  ['Salade de lentilles au cervelas', 25, 'plat',
   'Cuire les lentilles vingt minutes avec la carotte et l\u2019oignon. Égoutter tiède, assaisonner tout de suite : elles absorbent mieux. Ajouter le cervelas en rondelles.',
   [['lentille',300,'g'],['cervelas',2,'pièce'],['carotte',1,'pièce'],['oignon',1,'pièce'],
    ['moutarde',1,'cs'],['vinaigre',2,'cs'],['huile',4,'cs'],['persil',1,'botte']]],

  ['Pâtes au pesto et haricots', 25, 'plat',
   'Cuire les haricots avec les pâtes les huit dernières minutes. Égoutter, mélanger au pesto détendu d\u2019une cuillère d\u2019eau de cuisson.',
   [['pâtes',400,'g'],['basilic',2,'botte'],['parmesan',60,'g'],['noix',40,'g'],
    ['ail',1,'gousse'],['huile d\'olive',1,'dl'],['haricot',200,'g']]],

  ['Poisson pané et purée', 40, 'plat',
   'Passer les filets dans la farine, l\u2019œuf battu puis la chapelure. Cuire à la poêle quatre minutes par face. Purée au lait chaud et beurre, jamais froid.',
   [['cabillaud',600,'g'],['chapelure',100,'g'],['œuf',2,'pièce'],['farine',50,'g'],
    ['pomme de terre',1,'kg'],['lait',2,'dl'],['beurre',50,'g'],['citron',1,'pièce']]],

  ['Soupe à l\u2019oignon gratinée', 50, 'plat',
   'Émincer les oignons et les laisser blondir vingt-cinq minutes à feu doux : c\u2019est là que tout se joue. Fariner, mouiller de bouillon, mijoter vingt minutes. Gratiner avec le pain et le fromage.',
   [['oignon',6,'pièce'],['beurre',40,'g'],['farine',1,'cs'],['bouillon',2,'cube'],
    ['pain',0.5,'pièce'],['gruyère',150,'g']]],

  ['Poêlée de légumes et pois chiches', 30, 'plat',
   'Rôtir les légumes en dés à feu vif, ajouter les pois chiches égouttés et les épices. Un filet de citron à la fin réveille l\u2019ensemble.',
   [['pois chiche',2,'boîte'],['courgette',2,'pièce'],['poivron',1,'pièce'],
    ['oignon',1,'pièce'],['cumin',1,'cc'],['paprika',1,'cc'],['citron',1,'pièce'],
    ['huile d\'olive',3,'cs']]],

  ['Papet vaudois', 75, 'plat',
   'Faire fondre le poireau au beurre, ajouter les pommes de terre et un peu de bouillon. Une heure à petit feu, jusqu\u2019à ce que tout se confonde. Pocher les saucisses à part, sans jamais faire bouillir.',
   [['poireau',1,'kg'],['pomme de terre',600,'g'],['saucisse',4,'pièce'],
    ['beurre',40,'g'],['vin blanc',1,'dl'],['bouillon',1,'cube'],['crème',1,'dl']]],

  ['Omelette aux herbes et salade', 15, 'plat',
   'Battre les œufs sans excès, verser dans le beurre mousseux, ramener les bords vers le centre. Retirer quand le dessus est encore un peu coulant.',
   [['œuf',8,'pièce'],['beurre',30,'g'],['persil',1,'botte'],['ciboulette',1,'botte'],
    ['salade',1,'pièce'],['vinaigre',1,'cs'],['huile',3,'cs']]],

  ['Pizza maison', 60, 'plat',
   'Étaler la pâte finement, une fine couche de coulis, la mozzarella en morceaux. Four le plus chaud possible, huit à dix minutes. Le basilic se met après cuisson.',
   [['farine',500,'g'],['levure',1,'sachet'],['coulis de tomate',3,'dl'],
    ['mozzarella',2,'pièce'],['jambon',4,'tranche'],['basilic',1,'botte'],
    ['huile d\'olive',3,'cs']]],

  ['Gratin de courgettes au riz', 55, 'plat',
   'Faire dégorger les courgettes râpées avec du sel, presser. Mélanger au riz cuit, aux œufs battus et au fromage. Trente-cinq minutes à 180°.',
   [['courgette',4,'pièce'],['riz',200,'g'],['œuf',3,'pièce'],['gruyère',120,'g'],
    ['crème',1,'dl'],['ail',1,'gousse']]],

  ['Sauté de porc aux carottes', 60, 'plat',
   'Dorer la viande, réserver. Faire revenir oignon et carottes, remettre la viande, mouiller à mi-hauteur. Quarante-cinq minutes à couvert.',
   [['porc',700,'g'],['carotte',6,'pièce'],['oignon',2,'pièce'],['bouillon',1,'cube'],
    ['moutarde',1,'cs'],['thym',1,'botte'],['pomme de terre',800,'g']]],

  ['Salade de pâtes au thon', 20, 'plat',
   'Cuire les pâtes, les rafraîchir. Mélanger au thon égoutté, aux tomates, aux olives et à la vinaigrette. Une heure au frais avant de servir.',
   [['pâtes',350,'g'],['thon',2,'boîte'],['tomate',3,'pièce'],['olive',100,'g'],
    ['oignon',1,'pièce'],['huile d\'olive',4,'cs'],['vinaigre',2,'cs'],['basilic',1,'botte']]],

  ['Crêpes', 30, 'dessert',
   'Mélanger farine, œufs et lait sans grumeaux, laisser reposer une heure si le temps le permet. Une louche par crêpe dans une poêle bien chaude à peine beurrée.',
   [['farine',250,'g'],['œuf',3,'pièce'],['lait',5,'dl'],['beurre',30,'g'],
    ['sucre',2,'cs'],['sel',null,'pincée']]],

  ['Gâteau au chocolat', 45, 'dessert',
   'Fondre chocolat et beurre ensemble. Ajouter le sucre, puis les œufs un à un, enfin la farine. Vingt-deux minutes à 180° : le centre doit rester moelleux.',
   [['chocolat',200,'g'],['beurre',150,'g'],['sucre',150,'g'],['œuf',4,'pièce'],
    ['farine',80,'g']]],

  ['Salade verte et vinaigrette', 10, 'entree',
   'Une cuillère de moutarde, une de vinaigre, du sel, puis trois d\u2019huile en fouettant. Assaisonner au dernier moment, jamais avant.',
   [['salade',1,'pièce'],['moutarde',1,'cc'],['vinaigre',1,'cs'],['huile',3,'cs'],
    ['échalote',1,'pièce'],['sel',null,'pincée']]]
];

/** Mises en forme pour l'API : les rayons sont devinés par le catalogue. */
function pretes(){
  const I = global.Ingredients;
  return RECETTES.map(([nom, minutes, categorie, notes, ingredients]) => ({
    nom: nom,
    couverts: 4,
    minutes: minutes,
    categorie: categorie,
    notes: notes,
    ingredients: ingredients.map(([label, quantite, unite]) => ({
      label: label,
      quantite: quantite,
      unite: unite,
      rayon: I.deviner(label).rayon
    }))
  }));
}

const API = { RECETTES, pretes, combien: RECETTES.length };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
global.RecettesDepart = API;

})(typeof window !== 'undefined' ? window : globalThis);
