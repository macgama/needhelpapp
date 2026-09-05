/* =========================================================
   Conjugueur français
   Trois niveaux, du plus général au plus particulier :
   1. les règles des verbes réguliers (-er, -ir du 2e groupe)
   2. les familles du 3e groupe (-dre, -indre, -uire, -aître)
   3. une table des verbes vraiment irréguliers, étendue aux
      composés par leur préfixe : « comprendre » suit « prendre ».
   ========================================================= */
(function (global) {
"use strict";

const PRONOMS = ['je', 'tu', 'il', 'nous', 'vous', 'ils'];
const PRONOMS_LONGS = ['je', 'tu', 'il / elle', 'nous', 'vous', 'ils / elles'];

const FIN = {
  imparfait:    ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'],
  futur:        ['ai', 'as', 'a', 'ons', 'ez', 'ont'],
  conditionnel: ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'],
  subjonctif:   ['e', 'es', 'e', 'ions', 'iez', 'ent'],
  ps: {
    a:  ['ai', 'as', 'a', 'âmes', 'âtes', 'èrent'],
    i:  ['is', 'is', 'it', 'îmes', 'îtes', 'irent'],
    u:  ['us', 'us', 'ut', 'ûmes', 'ûtes', 'urent'],
    in: ['ins', 'ins', 'int', 'înmes', 'întes', 'inrent']
  }
};

const TEMPS = [
  { code:'present',            mode:'Indicatif',    nom:'présent',            pers:6 },
  { code:'imparfait',          mode:'Indicatif',    nom:'imparfait',          pers:6 },
  { code:'passeSimple',        mode:'Indicatif',    nom:'passé simple',       pers:6 },
  { code:'futur',              mode:'Indicatif',    nom:'futur simple',       pers:6 },
  { code:'passeCompose',       mode:'Indicatif',    nom:'passé composé',      pers:6 },
  { code:'plusQueParfait',     mode:'Indicatif',    nom:'plus-que-parfait',   pers:6 },
  { code:'passeAnterieur',     mode:'Indicatif',    nom:'passé antérieur',    pers:6 },
  { code:'futurAnterieur',     mode:'Indicatif',    nom:'futur antérieur',    pers:6 },
  { code:'futurProche',        mode:'Indicatif',    nom:'futur proche',       pers:6 },
  { code:'subjonctif',         mode:'Subjonctif',   nom:'présent',            pers:6, que:true },
  { code:'subjonctifImparfait',mode:'Subjonctif',   nom:'imparfait',          pers:6, que:true },
  { code:'subjonctifPasse',    mode:'Subjonctif',   nom:'passé',              pers:6, que:true },
  { code:'subjonctifPQP',      mode:'Subjonctif',   nom:'plus-que-parfait',   pers:6, que:true },
  { code:'conditionnel',       mode:'Conditionnel', nom:'présent',            pers:6 },
  { code:'conditionnelPasse',  mode:'Conditionnel', nom:'passé 1re forme',    pers:6 },
  { code:'conditionnelPasse2', mode:'Conditionnel', nom:'passé 2e forme',     pers:6 },
  { code:'imperatif',          mode:'Impératif',    nom:'présent',            pers:3, imperatif:true },
  { code:'imperatifPasse',     mode:'Impératif',    nom:'passé',              pers:3, imperatif:true },
  { code:'infinitifPresent',   mode:'Infinitif',    nom:'présent',            pers:1 },
  { code:'infinitifPasse',     mode:'Infinitif',    nom:'passé',              pers:1 },
  { code:'participeTPresent',  mode:'Participe',    nom:'présent',            pers:1 },
  { code:'participeTPasse',    mode:'Participe',    nom:'passé',              pers:1 },
  { code:'gerondifPresent',    mode:'Gérondif',     nom:'présent',            pers:1 },
  { code:'gerondifPasse',      mode:'Gérondif',     nom:'passé',              pers:1 }
];

/* ---------------------------------------------------------
   Verbes qui se conjuguent avec être aux temps composés
   --------------------------------------------------------- */
const AVEC_ETRE = ['aller','arriver','entrer','rentrer','rester','tomber','retomber','naître','renaître',
  'mourir','partir','repartir','venir','revenir','devenir','parvenir','intervenir','survenir','provenir',
  'monter','remonter','descendre','redescendre','redevenir','sortir','ressortir','retourner','décéder','apparaître'];

/* ---------------------------------------------------------
   Familles orthographiques du 1er groupe
   --------------------------------------------------------- */
// -eler / -eter qui doublent la consonne : appeler → j'appelle
const DOUBLENT = ['appeler','rappeler','interpeller','épeler','renouveler','atteler','dételer','ficeler',
  'étinceler','morceler','ruisseler','amonceler','ensorceler','niveler','jeter','rejeter','projeter',
  'déjeter','cacheter','décacheter','empaqueter','dépaqueter','feuilleter','étiqueter','hoqueter','voleter'];
// -eler / -eter qui prennent un accent grave : acheter → j'achète
const ACCENTUENT = ['acheter','racheter','geler','dégeler','congeler','surgeler','peler','celer','déceler',
  'receler','ciseler','démanteler','écarteler','marteler','modeler','remodeler','harceler','crocheter',
  'fureter','haleter','corseter','bégueter'];

/* ---------------------------------------------------------
   Verbes irréguliers
   pres : les six formes du présent, sans pronom
   fut  : radical du futur (on y ajoute ai, as, a, ons, ez, ont)
   ps   : { t: type de passé simple, r: radical }
   subj : les six formes si elles ne se déduisent pas du présent
   pp   : participe passé masculin singulier
   --------------------------------------------------------- */
const IRREGULIERS = {
  'être': {
    pres:['suis','es','est','sommes','êtes','sont'],
    imp:'ét', fut:'ser', ps:{t:'u', r:'f'},
    subj:['sois','sois','soit','soyons','soyez','soient'],
    imper:['sois','soyons','soyez'],
    pp:'été', ppr:'étant', aux:'avoir'
  },
  'avoir': {
    pres:['ai','as','a','avons','avez','ont'],
    fut:'aur', ps:{t:'u', r:'e'},
    subj:['aie','aies','ait','ayons','ayez','aient'],
    imper:['aie','ayons','ayez'],
    pp:'eu', ppr:'ayant', aux:'avoir'
  },
  'aller': {
    pres:['vais','vas','va','allons','allez','vont'],
    fut:'ir', ps:{t:'a', r:'all'},
    subj:['aille','ailles','aille','allions','alliez','aillent'],
    imper:['va','allons','allez'],
    pp:'allé', aux:'être'
  },
  'faire': {
    pres:['fais','fais','fait','faisons','faites','font'],
    fut:'fer', ps:{t:'i', r:'f'},
    subj:['fasse','fasses','fasse','fassions','fassiez','fassent'],
    pp:'fait'
  },
  'dire': {
    pres:['dis','dis','dit','disons','dites','disent'],
    fut:'dir', ps:{t:'i', r:'d'}, pp:'dit'
  },
  'pouvoir': {
    pres:['peux','peux','peut','pouvons','pouvez','peuvent'],
    fut:'pourr', ps:{t:'u', r:'p'},
    subj:['puisse','puisses','puisse','puissions','puissiez','puissent'],
    imper:null, pp:'pu'
  },
  'vouloir': {
    pres:['veux','veux','veut','voulons','voulez','veulent'],
    fut:'voudr', ps:{t:'u', r:'vo'},
    subj:['veuille','veuilles','veuille','voulions','vouliez','veuillent'],
    imper:['veuille','veuillons','veuillez'], pp:'voulu'
  },
  'savoir': {
    pres:['sais','sais','sait','savons','savez','savent'],
    fut:'saur', ps:{t:'u', r:'s'},
    subj:['sache','saches','sache','sachions','sachiez','sachent'],
    imper:['sache','sachons','sachez'], pp:'su', ppr:'sachant'
  },
  'devoir': {
    pres:['dois','dois','doit','devons','devez','doivent'],
    fut:'devr', ps:{t:'u', r:'d'}, pp:'dû'
  },
  'voir': {
    pres:['vois','vois','voit','voyons','voyez','voient'],
    fut:'verr', ps:{t:'i', r:'v'}, pp:'vu'
  },
  'prévoir': {
    pres:['prévois','prévois','prévoit','prévoyons','prévoyez','prévoient'],
    fut:'prévoir', ps:{t:'i', r:'prév'}, pp:'prévu'
  },
  'venir': {
    pres:['viens','viens','vient','venons','venez','viennent'],
    fut:'viendr', ps:{t:'in', r:'v'}, pp:'venu', aux:'être'
  },
  'tenir': {
    pres:['tiens','tiens','tient','tenons','tenez','tiennent'],
    fut:'tiendr', ps:{t:'in', r:'t'}, pp:'tenu'
  },
  'prendre': {
    pres:['prends','prends','prend','prenons','prenez','prennent'],
    fut:'prendr', ps:{t:'i', r:'pr'},
    subj:['prenne','prennes','prenne','prenions','preniez','prennent'],
    pp:'pris'
  },
  'mettre': {
    pres:['mets','mets','met','mettons','mettez','mettent'],
    fut:'mettr', ps:{t:'i', r:'m'}, pp:'mis'
  },
  'partir': {
    pres:['pars','pars','part','partons','partez','partent'],
    fut:'partir', ps:{t:'i', r:'part'}, pp:'parti', aux:'être'
  },
  'sortir': {
    pres:['sors','sors','sort','sortons','sortez','sortent'],
    fut:'sortir', ps:{t:'i', r:'sort'}, pp:'sorti', aux:'être'
  },
  'dormir': {
    pres:['dors','dors','dort','dormons','dormez','dorment'],
    fut:'dormir', ps:{t:'i', r:'dorm'}, pp:'dormi'
  },
  'servir': {
    pres:['sers','sers','sert','servons','servez','servent'],
    fut:'servir', ps:{t:'i', r:'serv'}, pp:'servi'
  },
  'sentir': {
    pres:['sens','sens','sent','sentons','sentez','sentent'],
    fut:'sentir', ps:{t:'i', r:'sent'}, pp:'senti'
  },
  'mentir': {
    pres:['mens','mens','ment','mentons','mentez','mentent'],
    fut:'mentir', ps:{t:'i', r:'ment'}, pp:'menti'
  },
  'courir': {
    pres:['cours','cours','court','courons','courez','courent'],
    fut:'courr', ps:{t:'u', r:'co'}, pp:'couru'
  },
  'mourir': {
    pres:['meurs','meurs','meurt','mourons','mourez','meurent'],
    fut:'mourr', ps:{t:'u', r:'mo'}, pp:'mort', aux:'être'
  },
  'ouvrir': {
    pres:['ouvre','ouvres','ouvre','ouvrons','ouvrez','ouvrent'],
    fut:'ouvrir', ps:{t:'i', r:'ouvr'}, pp:'ouvert', erImper:true
  },
  'offrir': {
    pres:['offre','offres','offre','offrons','offrez','offrent'],
    fut:'offrir', ps:{t:'i', r:'offr'}, pp:'offert', erImper:true
  },
  'souffrir': {
    pres:['souffre','souffres','souffre','souffrons','souffrez','souffrent'],
    fut:'souffrir', ps:{t:'i', r:'souffr'}, pp:'souffert', erImper:true
  },
  'couvrir': {
    pres:['couvre','couvres','couvre','couvrons','couvrez','couvrent'],
    fut:'couvrir', ps:{t:'i', r:'couvr'}, pp:'couvert', erImper:true
  },
  'cueillir': {
    pres:['cueille','cueilles','cueille','cueillons','cueillez','cueillent'],
    fut:'cueiller', ps:{t:'i', r:'cueill'}, pp:'cueilli', erImper:true
  },
  'écrire': {
    pres:['écris','écris','écrit','écrivons','écrivez','écrivent'],
    fut:'écrir', ps:{t:'i', r:'écriv'}, pp:'écrit'
  },
  'lire': {
    pres:['lis','lis','lit','lisons','lisez','lisent'],
    fut:'lir', ps:{t:'u', r:'l'}, pp:'lu'
  },
  'boire': {
    pres:['bois','bois','boit','buvons','buvez','boivent'],
    fut:'boir', ps:{t:'u', r:'b'},
    subj:['boive','boives','boive','buvions','buviez','boivent'], pp:'bu'
  },
  'croire': {
    pres:['crois','crois','croit','croyons','croyez','croient'],
    fut:'croir', ps:{t:'u', r:'cr'}, pp:'cru'
  },
  'vivre': {
    pres:['vis','vis','vit','vivons','vivez','vivent'],
    fut:'vivr', ps:{t:'u', r:'véc'}, pp:'vécu'
  },
  'suivre': {
    pres:['suis','suis','suit','suivons','suivez','suivent'],
    fut:'suivr', ps:{t:'i', r:'suiv'}, pp:'suivi'
  },
  'plaire': {
    pres:['plais','plais','plaît','plaisons','plaisez','plaisent'],
    fut:'plair', ps:{t:'u', r:'pl'}, pp:'plu'
  },
  'rire': {
    pres:['ris','ris','rit','rions','riez','rient'],
    fut:'rir', ps:{t:'i', r:'r'}, pp:'ri'
  },
  'battre': {
    pres:['bats','bats','bat','battons','battez','battent'],
    fut:'battr', ps:{t:'i', r:'batt'}, pp:'battu'
  },
  'vaincre': {
    pres:['vaincs','vaincs','vainc','vainquons','vainquez','vainquent'],
    fut:'vaincr', ps:{t:'i', r:'vainqu'}, pp:'vaincu'
  },
  'valoir': {
    pres:['vaux','vaux','vaut','valons','valez','valent'],
    fut:'vaudr', ps:{t:'u', r:'val'},
    subj:['vaille','vailles','vaille','valions','valiez','vaillent'], pp:'valu'
  },
  'prévaloir': {
    pres:['prévaux','prévaux','prévaut','prévalons','prévalez','prévalent'],
    fut:'prévaudr', ps:{t:'u', r:'préval'},
    subj:['prévale','prévales','prévale','prévalions','prévaliez','prévalent'], pp:'prévalu'
  },
  'falloir': {
    pres:[null,null,'faut',null,null,null], defectif:true, imp:'fall',
    fut:'faudr', ps:{t:'u', r:'fall'},
    subj:[null,null,'faille',null,null,null], imper:null, pp:'fallu', ppr:null
  },
  'pleuvoir': {
    pres:[null,null,'pleut',null,null,null], defectif:true, imp:'pleuv',
    fut:'pleuvr', ps:{t:'u', r:'pl'},
    subj:[null,null,'pleuve',null,null,null], imper:null, pp:'plu', ppr:'pleuvant'
  },
  'recevoir': {
    pres:['reçois','reçois','reçoit','recevons','recevez','reçoivent'],
    fut:'recevr', ps:{t:'u', r:'reç'}, pp:'reçu'
  },
  'envoyer': {
    pres:['envoie','envoies','envoie','envoyons','envoyez','envoient'],
    fut:'enverr', ps:{t:'a', r:'envoy'}, pp:'envoyé', erImper:true
  },
  'acquérir': {
    pres:['acquiers','acquiers','acquiert','acquérons','acquérez','acquièrent'],
    fut:'acquerr', ps:{t:'i', r:'acqu'}, pp:'acquis'
  },
  'fuir': {
    pres:['fuis','fuis','fuit','fuyons','fuyez','fuient'],
    fut:'fuir', ps:{t:'i', r:'fu'}, pp:'fui'
  },
  'haïr': {
    pres:['hais','hais','hait','haïssons','haïssez','haïssent'],
    fut:'haïr', ps:{t:'i', r:'haï'}, pp:'haï'
  },
  'résoudre': {
    pres:['résous','résous','résout','résolvons','résolvez','résolvent'],
    fut:'résoudr', ps:{t:'u', r:'résol'}, pp:'résolu'
  },
  'coudre': {
    pres:['couds','couds','coud','cousons','cousez','cousent'],
    fut:'coudr', ps:{t:'i', r:'cous'}, pp:'cousu'
  },
  'naître': {
    pres:['nais','nais','naît','naissons','naissez','naissent'],
    fut:'naîtr', ps:{t:'i', r:'naqu'}, pp:'né', aux:'être'
  },
  'conclure': {
    pres:['conclus','conclus','conclut','concluons','concluez','concluent'],
    fut:'conclur', ps:{t:'u', r:'concl'}, pp:'conclu'
  },
  'suffire': {
    pres:['suffis','suffis','suffit','suffisons','suffisez','suffisent'],
    fut:'suffir', ps:{t:'i', r:'suff'}, pp:'suffi'
  },
  'bouillir': {
    pres:['bous','bous','bout','bouillons','bouillez','bouillent'],
    fut:'bouillir', ps:{t:'i', r:'bouill'}, pp:'bouilli'
  },
  'vêtir': {
    pres:['vêts','vêts','vêt','vêtons','vêtez','vêtent'],
    fut:'vêtir', ps:{t:'i', r:'vêt'}, pp:'vêtu'
  },
  'mouvoir': {
    pres:['meus','meus','meut','mouvons','mouvez','meuvent'],
    fut:'mouvr', ps:{t:'u', r:'m'}, pp:'mû'
  },
  'émouvoir': {
    pres:['émeus','émeus','émeut','émouvons','émouvez','émeuvent'],
    fut:'émouvr', ps:{t:'u', r:'ém'}, pp:'ému'
  },
  'promouvoir': {
    pres:['promeus','promeus','promeut','promouvons','promouvez','promeuvent'],
    fut:'promouvr', ps:{t:'u', r:'prom'}, pp:'promu'
  },
  'croître': {
    pres:['croîs','croîs','croît','croissons','croissez','croissent'],
    fut:'croîtr', ps:{t:'u', r:'cr'}, pp:'crû', ppr:'croissant'
  },
  'accroître': {
    pres:['accrois','accrois','accroît','accroissons','accroissez','accroissent'],
    fut:'accroîtr', ps:{t:'u', r:'accr'}, pp:'accru', ppr:'accroissant'
  },
  'moudre': {
    pres:['mouds','mouds','moud','moulons','moulez','moulent'],
    fut:'moudr', ps:{t:'u', r:'moul'}, pp:'moulu'
  },
  'rompre': {
    pres:['romps','romps','rompt','rompons','rompez','rompent'],
    fut:'rompr', ps:{t:'i', r:'romp'}, pp:'rompu'
  },
  'assaillir': {
    pres:['assaille','assailles','assaille','assaillons','assaillez','assaillent'],
    fut:'assaillir', ps:{t:'i', r:'assaill'}, pp:'assailli', erImper:true
  },
  'tressaillir': {
    pres:['tressaille','tressailles','tressaille','tressaillons','tressaillez','tressaillent'],
    fut:'tressaillir', ps:{t:'i', r:'tressaill'}, pp:'tressailli', erImper:true
  },
  'défaillir': {
    pres:['défaille','défailles','défaille','défaillons','défaillez','défaillent'],
    fut:'défaillir', ps:{t:'i', r:'défaill'}, pp:'défailli', erImper:true
  },
  'taire': {
    pres:['tais','tais','tait','taisons','taisez','taisent'],
    fut:'tair', ps:{t:'u', r:'t'}, pp:'tu'
  },
  'maudire': {
    pres:['maudis','maudis','maudit','maudissons','maudissez','maudissent'],
    fut:'maudir', ps:{t:'i', r:'maud'}, pp:'maudit', ppr:'maudissant'
  },
  'pourvoir': {
    pres:['pourvois','pourvois','pourvoit','pourvoyons','pourvoyez','pourvoient'],
    fut:'pourvoir', ps:{t:'u', r:'pourv'}, pp:'pourvu'
  },
  'exclure': {
    pres:['exclus','exclus','exclut','excluons','excluez','excluent'],
    fut:'exclur', ps:{t:'u', r:'excl'}, pp:'exclu'
  },
  'inclure': {
    pres:['inclus','inclus','inclut','incluons','incluez','incluent'],
    fut:'inclur', ps:{t:'u', r:'incl'}, pp:'inclus'
  },
  'asseoir': {
    pres:['assieds','assieds','assied','asseyons','asseyez','asseyent'],
    fut:'assiér', ps:{t:'i', r:'ass'},
    subj:['asseye','asseyes','asseye','asseyions','asseyiez','asseyent'], pp:'assis'
  }
};

/* Les composés suivent leur verbe simple : « comprendre » se conjugue
   comme « prendre », précédé de son préfixe. */
const BASES_COMPOSABLES = ['prendre','venir','tenir','mettre','faire','voir','partir','sortir','dormir',
  'servir','sentir','mentir','courir','ouvrir','offrir','couvrir','écrire','lire','battre','vaincre',
  'suivre','vivre','plaire','rire','croire','boire','dire','valoir','recevoir','conclure',
  'cueillir','acquérir','fuir','coudre','résoudre','rompre','vêtir']
  // les plus longs d'abord : « écrire » doit l'emporter sur « rire »
  .sort((a, b) => b.length - a.length);

// composés qui ne se devinent pas par la fin du mot
const ALIAS = { 'renaître':'naître', 'renaitre':'naître' };

/* Faux amis : ils finissent comme un verbe irrégulier sans lui ressembler.
   « répartir » se conjugue comme finir, « repartir » comme partir. */
const FAUX_COMPOSES = ['assortir', 'répartir', 'impartir', 'assouvir', 'départir'];

// « vous dites » ne vaut que pour dire et redire ; ailleurs, « vous prédisez »
const DISENT_REGULIER = ['prédire','interdire','contredire','médire','dédire'];

/* ---------------------------------------------------------
   Outils
   --------------------------------------------------------- */
function sansAccent(s){
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function estVoyelle(c){ return 'aàâeéèêëiîïoôuùûüyh'.indexOf(c) >= 0; }

function pronom(i, forme){
  if (i === 0 && forme && estVoyelle(forme.charAt(0))) return 'j’';
  return PRONOMS[i] + ' ';
}

/* ---------------------------------------------------------
   Construction des radicaux d'un verbe
   --------------------------------------------------------- */
function radicaux(verbe){
  const v = verbe.toLowerCase().trim();

  if (IRREGULIERS[v]) return Object.assign({ inf:v, prefixe:'' }, IRREGULIERS[v]);

  if (v.slice(-6) === 'cevoir') return familleCevoir(v);
  if (v.slice(-6) === 'quérir') return familleQuerir(v);
  if (v.slice(-5) === 'crire') return familleCrire(v);

  if (FAUX_COMPOSES.indexOf(v) >= 0) return deuxiemeGroupe(v);

  // composé d'un verbe irrégulier ? « comprendre » finit par « prendre »
  for (const base of BASES_COMPOSABLES){
    if (v.length > base.length && v.slice(-base.length) === base){
      const prefixe = v.slice(0, v.length - base.length);
      const b = IRREGULIERS[base];
      const copie = JSON.parse(JSON.stringify(b));
      if (base === 'dire' && DISENT_REGULIER.indexOf(v) >= 0) copie.pres[4] = 'disez';
      copie.inf = v;
      copie.prefixe = prefixe;
      if (AVEC_ETRE.indexOf(v) >= 0) copie.aux = 'être';
      else if (b.aux === 'être' && AVEC_ETRE.indexOf(v) < 0) copie.aux = 'avoir';
      return copie;
    }
  }

  // 1er groupe
  if (v.slice(-2) === 'er') return premierGroupe(v);

  if (ALIAS[v]) {
    const copie = JSON.parse(JSON.stringify(IRREGULIERS[ALIAS[v]]));
    copie.inf = v;
    copie.prefixe = v.slice(0, v.length - ALIAS[v].length);
    return copie;
  }

  // familles du 3e groupe
  if (v.slice(-5) === 'indre') return familleIndre(v);
  if (v.slice(-4) === 'uire') return familleUire(v);
  if (v.slice(-5) === 'aître' || v.slice(-6) === 'aitre') return familleAitre(v);
  if (v.slice(-3) === 'dre') return familleDre(v);

  // 2e groupe par défaut pour les verbes en -ir
  if (v.slice(-2) === 'ir') return deuxiemeGroupe(v);

  return null;
}

function premierGroupe(v){
  const r = v.slice(0, -2);            // chant
  const dernier = r.slice(-1);
  const avantDernier = r.slice(-2, -1);

  let altMuet = null, altFut = null;   // seconde orthographe admise, pour les verbes en -ayer
  let radMuet = r;                     // devant une terminaison muette : e, es, e, ent
  let radSonore = r;                   // devant ons, ez, ais…
  let futRad = v;                      // chanter → chanterai

  if (r.slice(-1) === 'c'){ radSonore = r; }        // placer : nous plaçons, traité plus bas
  if (DOUBLENT.indexOf(v) >= 0){
    radMuet = r + dernier;                            // appel → appell
    futRad = radMuet + 'er';
  } else if (ACCENTUENT.indexOf(v) >= 0){
    radMuet = r.slice(0, -2) + 'è' + dernier;         // achet → achèt
    futRad = radMuet + 'er';
  } else if (/[eé][^aeiouyéèêë]$/.test(r) || /[eé][^aeiouyéèêë][^aeiouyéèêë]?$/.test(r) === false){
    // rien : traité juste après
  }

  // e_er (lever) et é_er (espérer) : la voyelle passe à è devant une syllabe muette
  if (DOUBLENT.indexOf(v) < 0 && ACCENTUENT.indexOf(v) < 0){
    const m = r.match(/^(.*)([eé])([bcdfghjklmnpqrstvwxz]+)$/);
    if (m && m[3].length <= 2){
      radMuet = m[1] + 'è' + m[3];
      if (m[2] === 'e') futRad = radMuet + 'er';      // lever → je lèverai
    }
  }

  // -yer : y devient i devant une terminaison muette
  if (/[^aeiou]yer$/.test(v) || /[ou]yer$/.test(v)){
    radMuet = r.slice(0, -1) + 'i';
    futRad = radMuet + 'er';
  } else if (/ayer$/.test(v)){
    radMuet = r.slice(0, -1) + 'i';                   // payer → je paie
    futRad = radMuet + 'er';
    altMuet = r;                                      // … ou je paye, tout aussi correct
    altFut = r + 'er';
  }

  const cedille = (s) => (r.slice(-1) === 'c' ? s.replace(/c$/, 'ç') : s);
  const geant   = (s) => (r.slice(-2) === 'ge' ? s : (r.slice(-1) === 'g' ? s + 'e' : s));
  const devantAO = geant(cedille(radSonore));         // plaç, mange

  return {
    inf:v, prefixe:'', groupe:1,
    pres:[radMuet+'e', radMuet+'es', radMuet+'e', devantAO+'ons', radSonore+'ez', radMuet+'ent'],
    impRad: devantAO,
    // « nous mangeons » mais « nous mangions » : le e ne sert que devant a et o
    impArray:[devantAO+'ais', devantAO+'ais', devantAO+'ait', radSonore+'ions', radSonore+'iez', devantAO+'aient'],
    psArray:[devantAO+'ai', devantAO+'as', devantAO+'a', devantAO+'âmes', devantAO+'âtes', radSonore+'èrent'],
    fut: futRad,
    ps: { t:'a', r: devantAO },
    altMuet: altMuet, altFut: altFut,
    subj:[radMuet+'e', radMuet+'es', radMuet+'e', radSonore+'ions', radSonore+'iez', radMuet+'ent'],
    pp: r + 'é',
    ppr: devantAO + 'ant',
    erImper:true,
    aux: AVEC_ETRE.indexOf(v) >= 0 ? 'être' : 'avoir'
  };
}

function deuxiemeGroupe(v){
  const r = v.slice(0, -2);            // fin
  return {
    inf:v, prefixe:'', groupe:2,
    pres:[r+'is', r+'is', r+'it', r+'issons', r+'issez', r+'issent'],
    impRad: r + 'iss',
    fut: v,
    ps: { t:'i', r: r },
    pp: r + 'i',
    ppr: r + 'issant',
    aux: AVEC_ETRE.indexOf(v) >= 0 ? 'être' : 'avoir'
  };
}

function familleDre(v){
  const r = v.slice(0, -2);            // rend
  return {
    inf:v, prefixe:'', groupe:3,
    pres:[r+'s', r+'s', r, r+'ons', r+'ez', r+'ent'],
    impRad: r,
    fut: v.slice(0, -1),               // rendr
    ps: { t:'i', r: r },
    pp: r + 'u',
    ppr: r + 'ant',
    aux: AVEC_ETRE.indexOf(v) >= 0 ? 'être' : 'avoir'
  };
}

// inscrire, prescrire, souscrire, transcrire : ils suivent écrire,
// mais ne finissent pas par « écrire » et seraient pris pour des composés de rire
function familleCrire(v){
  const r = v.slice(0, -5);            // ins
  return {
    inf:v, prefixe:'', groupe:3,
    pres:[r+'cris', r+'cris', r+'crit', r+'crivons', r+'crivez', r+'crivent'],
    impRad: r + 'criv',
    fut: v.slice(0, -1),
    ps: { t:'i', r: r + 'criv' },
    pp: r + 'crit',
    ppr: r + 'crivant',
    aux:'avoir'
  };
}

// apercevoir, décevoir, percevoir, concevoir : la cédille devant o et u
function familleCevoir(v){
  const r = v.slice(0, -6);            // aper
  return {
    inf:v, prefixe:'', groupe:3,
    pres:[r+'çois', r+'çois', r+'çoit', r+'cevons', r+'cevez', r+'çoivent'],
    impRad: r + 'cev',
    fut: r + 'cevr',
    ps: { t:'u', r: r + 'ç' },
    pp: r + 'çu',
    ppr: r + 'cevant',
    aux:'avoir'
  };
}

// conquérir, requérir, s'enquérir
function familleQuerir(v){
  const r = v.slice(0, -6);            // con
  return {
    inf:v, prefixe:'', groupe:3,
    pres:[r+'quiers', r+'quiers', r+'quiert', r+'quérons', r+'quérez', r+'quièrent'],
    impRad: r + 'quér',
    fut: r + 'querr',
    ps: { t:'i', r: r + 'qu' },
    pp: r + 'quis',
    ppr: r + 'quérant',
    aux:'avoir'
  };
}

function familleIndre(v){
  const r = v.slice(0, -5);            // cra
  const voyelle = v.slice(-5, -4);     // le i de craindre, peindre, joindre
  const court = r + voyelle + 'n';     // crain
  const long = r + voyelle + 'gn';     // craign
  return {
    inf:v, prefixe:'', groupe:3,
    pres:[court+'s', court+'s', court+'t', long+'ons', long+'ez', long+'ent'],
    impRad: long,
    fut: v.slice(0, -1),
    ps: { t:'i', r: long },
    pp: court + 't',
    ppr: long + 'ant',
    aux:'avoir'
  };
}

function familleUire(v){
  const r = v.slice(0, -4);            // cond
  return {
    inf:v, prefixe:'', groupe:3,
    pres:[r+'uis', r+'uis', r+'uit', r+'uisons', r+'uisez', r+'uisent'],
    impRad: r + 'uis',
    fut: v.slice(0, -1),
    ps: { t:'i', r: r + 'uis' },
    pp: (/(nuire|luire)$/.test(v) ? r + 'ui' : r + 'uit'),
    ppr: r + 'uisant',
    aux:'avoir'
  };
}

function familleAitre(v){
  const r = v.slice(0, -5);            // conn
  return {
    inf:v, prefixe:'', groupe:3,
    pres:[r+'ais', r+'ais', r+'aît', r+'aissons', r+'aissez', r+'aissent'],
    impRad: r + 'aiss',
    fut: v.slice(0, -1),
    ps: { t:'u', r: r },
    pp: r + 'u',
    ppr: r + 'aissant',
    aux: AVEC_ETRE.indexOf(v) >= 0 ? 'être' : 'avoir'
  };
}

/* ---------------------------------------------------------
   Fabrication des temps
   --------------------------------------------------------- */
function avecPrefixe(p, formes){
  if (!p) return formes;
  return formes.map(f => (f === null ? null : p + f));
}

function simples(d){
  const p = d.prefixe || '';
  const pres = avecPrefixe(p, d.pres);

  // imparfait : radical du « nous » du présent
  let impRad = d.imp || d.impRad;
  if (!impRad){
    const nous = d.pres[3];
    impRad = nous ? nous.replace(/ons$/, '') : null;
  }
  const imparfait = d.impArray
    ? avecPrefixe(p, d.impArray)
    : (impRad ? FIN.imparfait.map(t => p + impRad + t)
              : [null, null, p + (d.imp || '') + 'ait', null, null, null]);

  const futur = FIN.futur.map(t => p + d.fut + t);
  const conditionnel = FIN.conditionnel.map(t => p + d.fut + t);

  const passeSimple = d.psArray
    ? avecPrefixe(p, d.psArray)
    : FIN.ps[d.ps.t].map(t => p + d.ps.r + t);

  let subj;
  if (d.subj){
    subj = avecPrefixe(p, d.subj);
  } else {
    const ils = d.pres[5];
    const base = ils ? ils.replace(/ent$/, '') : '';
    subj = [p+base+'e', p+base+'es', p+base+'e', p+impRad+'ions', p+impRad+'iez', p+base+'ent'];
  }

  let imperatif;
  if (d.imper === null){
    imperatif = [null, null, null];
  } else if (d.imper){
    imperatif = avecPrefixe(p, d.imper);
  } else {
    const tu = pres[1];
    imperatif = [
      d.erImper || d.groupe === 1 ? tu.replace(/s$/, '') : tu,
      pres[3], pres[4]
    ];
  }

  // subjonctif imparfait : « que je chantasse », bâti sur le passé simple
  const VOY = { a:'a', i:'i', u:'u', in:'in' };
  const CIRC = { a:'ât', i:'ît', u:'ût', in:'înt' };
  const psRad = d.ps.r;
  const base = psRad + VOY[d.ps.t];
  const subjImparfait = [
    p + base + 'sse', p + base + 'sses', p + psRad + CIRC[d.ps.t],
    p + base + 'ssions', p + base + 'ssiez', p + base + 'ssent'
  ];

  if (d.defectif){
    [imparfait, futur, conditionnel, passeSimple, subjImparfait].forEach(t => {
      for (let i = 0; i < 6; i++) if (i !== 2) t[i] = null;
    });
    imperatif = [null, null, null];
  }

  let alternatives = null;
  if (d.altMuet){
    const a = d.altMuet;
    alternatives = {
      present:[a+'e', a+'es', a+'e', null, null, a+'ent'],
      subjonctif:[a+'e', a+'es', a+'e', null, null, a+'ent'],
      futur: FIN.futur.map(t => d.altFut + t),
      conditionnel: FIN.conditionnel.map(t => d.altFut + t),
      imperatif:[a+'e', null, null]
    };
  }

  return { present:pres, imparfait, futur, conditionnel, passeSimple,
           subjonctif:subj, subjonctifImparfait:subjImparfait, imperatif, alternatives };
}

function auxiliaire(d){
  return d.aux === 'être' ? 'être' : 'avoir';
}

function composes(d, s){
  const auxNom = auxiliaire(d);
  const aux = conjugueSimples(auxNom);
  const p = d.prefixe || '';
  const pp = p + d.pp;

  // avec être, le participe s'accorde avec le sujet : « nous sommes allés »
  const accord = (i, taille) => {
    if (auxNom !== 'être') return pp;
    const pluriel = (taille === 3) ? (i >= 1) : (i >= 3);
    return pluriel ? pp + 's' : pp;
  };
  const monte = (temps) => {
    const formes = aux[temps];
    return formes.map((a, i) => (a === null || (d.defectif && formes.length === 6 && i !== 2))
      ? null : a + ' ' + accord(i, formes.length));
  };

  // « je vais chanter » : aller au présent suivi de l'infinitif
  const allerPres = conjugueSimples('aller').present;
  const futurProche = allerPres.map((a, i) => (d.defectif && i !== 2) ? null : a + ' ' + d.inf);

  const ppr = d.ppr === null ? null
    : p + (d.ppr || (d.impRad ? d.impRad + 'ant' : (d.pres[3] ? d.pres[3].replace(/ons$/, '') + 'ant' : '')));
  const auxPpr = auxNom === 'être' ? 'étant' : 'ayant';

  return {
    passeCompose:       monte('present'),
    plusQueParfait:     monte('imparfait'),
    futurAnterieur:     monte('futur'),
    passeAnterieur:     monte('passeSimple'),
    futurProche:        futurProche,
    conditionnelPasse:  monte('conditionnel'),
    conditionnelPasse2: monte('subjonctifImparfait'),
    subjonctifPasse:    monte('subjonctif'),
    subjonctifPQP:      monte('subjonctifImparfait'),
    imperatifPasse:     d.imper === null ? [null, null, null] : monte('imperatif'),
    infinitifPresent:   [d.inf],
    infinitifPasse:     [auxNom + ' ' + pp],
    participeTPresent:  [ppr],
    participeTPasse:    [pp],
    gerondifPresent:    ppr ? ['en ' + ppr] : [null],
    gerondifPasse:      ppr ? ['en ' + auxPpr + ' ' + pp] : [null]
  };
}

const cacheSimples = {};
function conjugueSimples(verbe){
  if (cacheSimples[verbe]) return cacheSimples[verbe];
  const d = radicaux(verbe);
  cacheSimples[verbe] = simples(d);
  return cacheSimples[verbe];
}

/* ---------------------------------------------------------
   Interface publique
   --------------------------------------------------------- */
function connait(verbe){
  return !!radicaux(String(verbe || '').toLowerCase().trim());
}

/**
 * D'où vient la conjugaison d'un verbe. Sert à vérifier une liste :
 * un verbe en -ir classé « 2e groupe » à tort se repère aussitôt.
 */
function origine(verbe){
  const v = String(verbe || '').toLowerCase().trim();
  if (IRREGULIERS[v]) return 'irrégulier';
  if (ALIAS[v]) return 'composé de ' + ALIAS[v];
  if (FAUX_COMPOSES.indexOf(v) >= 0) return '2e groupe';
  if (v.slice(-6) === 'cevoir') return 'famille -cevoir';
  if (v.slice(-6) === 'quérir') return 'famille -quérir';
  if (v.slice(-5) === 'crire') return 'famille -crire';
  for (const base of BASES_COMPOSABLES){
    if (v.length > base.length && v.slice(-base.length) === base) return 'composé de ' + base;
  }
  if (v.slice(-2) === 'er') return '1er groupe';
  if (v.slice(-5) === 'indre') return 'famille -indre';
  if (v.slice(-4) === 'uire') return 'famille -uire';
  if (v.slice(-5) === 'aître' || v.slice(-6) === 'aitre') return 'famille -aître';
  if (v.slice(-3) === 'dre') return 'famille -dre';
  if (v.slice(-2) === 'ir') return '2e groupe';
  return null;
}

function conjugue(verbe){
  const d = radicaux(String(verbe || '').toLowerCase().trim());
  if (!d) return null;
  const s = simples(d);
  const c = composes(d, s);
  const p = d.prefixe || '';
  return Object.assign({
    infinitif: d.inf,
    participePasse: p + d.pp,
    participePresent: d.ppr === null ? null : p + (d.ppr || (d.impRad ? d.impRad + 'ant' : (d.pres[3] ? d.pres[3].replace(/ons$/, '') + 'ant' : null))),
    auxiliaire: auxiliaire(d),
    defectif: !!d.defectif
  }, s, c);
}

/** Les autres orthographes admises pour une forme donnée, s'il y en a. */
function variantes(verbe, temps, personne){
  const t = conjugue(verbe);
  if (!t || !t.alternatives || !t.alternatives[temps]) return [];
  const v = t.alternatives[temps][personne];
  return v ? [v] : [];
}

/** Une forme précise : conjugue('chanter', 'imparfait', 4) → « chantiez ». */
function forme(verbe, temps, personne){
  const t = conjugue(verbe);
  if (!t || !t[temps]) return null;
  return t[temps][personne] || null;
}

/** Le sujet à afficher devant la forme, selon le mode. */
function sujet(temps, personne, forme){
  const def = TEMPS.find(x => x.code === temps);
  if (!def) return '';
  if (def.pers !== 6) return '';
  const base = pronom(personne, forme);
  if (def.que){
    if (personne === 0) return 'que ' + (estVoyelle((forme || '').charAt(0)) ? 'j’' : 'je ');
    return 'que ' + base;
  }
  return base;
}

const IMPER_PERSONNES = ['2e du singulier', '1re du pluriel', '2e du pluriel'];

const API = {
  TEMPS, PRONOMS, PRONOMS_LONGS, IMPER_PERSONNES,
  conjugue, forme, connait, origine, sujet, sansAccent, variantes,
  irreguliers: Object.keys(IRREGULIERS)
};

if (typeof module !== 'undefined' && module.exports) module.exports = API;
global.Conjugueur = API;

})(typeof window !== 'undefined' ? window : globalThis);
