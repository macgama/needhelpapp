"use strict";

/* =========================================================
   Conjugaison italienne, pour des élèves francophones.

   L'interface reste en français ; les temps portent leur nom
   italien, comme au cours.

   Trois conjugaisons — -are, -ere, -ire —, une variante en
   -isc-, quelques règles orthographiques, et une table
   d'irréguliers qui ne se calculent pas.
   ========================================================= */
(function (global) {

const PRONOMS = ['io', 'tu', 'lui', 'noi', 'voi', 'loro'];
const PRONOMS_LONGS = ['io', 'tu', 'lui / lei', 'noi', 'voi', 'loro'];
const IMPER_PERSONNES = ['tu', 'Lei', 'noi', 'voi'];

const TEMPS = [
  { code:'presente',        mode:'Indicativo',   nom:'presente',            pers:6 },
  { code:'imperfetto',      mode:'Indicativo',   nom:'imperfetto',          pers:6 },
  { code:'passatoProssimo', mode:'Indicativo',   nom:'passato prossimo',    pers:6 },
  { code:'passatoRemoto',   mode:'Indicativo',   nom:'passato remoto',      pers:6 },
  { code:'trapassatoPross', mode:'Indicativo',   nom:'trapassato prossimo', pers:6 },
  { code:'futuroSemplice',  mode:'Indicativo',   nom:'futuro semplice',     pers:6 },
  { code:'futuroAnteriore', mode:'Indicativo',   nom:'futuro anteriore',    pers:6 },

  { code:'condPresente',    mode:'Condizionale', nom:'presente',            pers:6 },
  { code:'condPassato',     mode:'Condizionale', nom:'passato',             pers:6 },

  { code:'congPresente',    mode:'Congiuntivo',  nom:'presente',            pers:6, che:true },
  { code:'congImperfetto',  mode:'Congiuntivo',  nom:'imperfetto',          pers:6, che:true },
  { code:'congPassato',     mode:'Congiuntivo',  nom:'passato',             pers:6, che:true },
  { code:'congTrapassato',  mode:'Congiuntivo',  nom:'trapassato',          pers:6, che:true },

  { code:'imperativo',      mode:'Imperativo',   nom:'imperativo', pers:4, imperatif:true },

  { code:'infinito',        mode:'Forme',        nom:'infinito',            pers:1 },
  { code:'gerundio',        mode:'Forme',        nom:'gerundio',            pers:1 },
  { code:'participio',      mode:'Forme',        nom:'participio passato',  pers:1 }
];

/* ---------------------------------------------------------
   Orthographe

   Trois ajustements, tous destinés à conserver le son de
   l'infinitif : cercare garde son [k] (cerchi), mangiare
   perd son i devenu inutile (mangi), studiare aussi.
   --------------------------------------------------------- */
function devantEouI(radical){
  if (/[cg]$/.test(radical)) return radical + 'h';   // cerc- → cerch-, pag- → pagh-
  return radical;
}
function sansIsuperflu(radical){
  if (/(ci|gi|gli|sci)$/.test(radical)) return radical.slice(0, -1);   // mangi- → mang-
  if (/i$/.test(radical)) return radical.slice(0, -1);                 // studi- → stud-
  return radical;
}

/* ---------------------------------------------------------
   Les terminaisons régulières
   --------------------------------------------------------- */
const FINS = {
  are: {
    presente:      ['o','i','a','iamo','ate','ano'],
    passatoRemoto: ['ai','asti','ò','ammo','aste','arono'],
    congPresente:  ['i','i','i','iamo','iate','ino'],
    imperfetto:    'av',
    congImperfetto:'ass',
    gerundio:      'ando',
    participio:    'ato',
    imperativo:    ['a','i','iamo','ate']
  },
  ere: {
    presente:      ['o','i','e','iamo','ete','ono'],
    passatoRemoto: ['ei','esti','é','emmo','este','erono'],
    congPresente:  ['a','a','a','iamo','iate','ano'],
    imperfetto:    'ev',
    congImperfetto:'ess',
    gerundio:      'endo',
    participio:    'uto',
    imperativo:    ['i','a','iamo','ete']
  },
  ire: {
    presente:      ['o','i','e','iamo','ite','ono'],
    passatoRemoto: ['ii','isti','ì','immo','iste','irono'],
    congPresente:  ['a','a','a','iamo','iate','ano'],
    imperfetto:    'iv',
    congImperfetto:'iss',
    gerundio:      'endo',
    participio:    'ito',
    imperativo:    ['i','a','iamo','ite']
  }
};

/* Les verbes en -isc- : finire → finisco. Ils sont la majorité
   des -ire, d'où le choix de les traiter comme la règle et non
   comme l'exception. */
const ISC_PRESENT = ['isco','isci','isce','iamo','ite','iscono'];
const ISC_CONG    = ['isca','isca','isca','iamo','iate','iscano'];
const ISC_IMPER   = ['isci','isca','iamo','ite'];

/* ---------------------------------------------------------
   Les auxiliaires

   Le choix entre essere et avere ne se déduit pas de la forme :
   il tient au sens du verbe. La liste est donc explicite.
   Avec essere, le participe s'accorde — d'où « siamo andati ».
   --------------------------------------------------------- */
const AVEC_ESSERE = [
  'essere','stare','andare','venire','arrivare','partire','uscire','entrare','tornare',
  'ritornare','restare','rimanere','nascere','morire','diventare','divenire','salire',
  'scendere','cadere','piacere','dispiacere','riuscire','sembrare','parere','succedere',
  'accadere','costare','durare','bastare','mancare','esistere','apparire','sparire',
  'scappare','fuggire','crescere','dimagrire','ingrassare','guarire','invecchiare',
  'cambiare','passare','salire','sorgere','giungere','tornare'
];

const ESSERE_PRESENT = ['sono','sei','è','siamo','siete','sono'];
const AVERE_PRESENT  = ['ho','hai','ha','abbiamo','avete','hanno'];
const ESSERE_IMPARF  = ['ero','eri','era','eravamo','eravate','erano'];
const AVERE_IMPARF   = ['avevo','avevi','aveva','avevamo','avevate','avevano'];
const ESSERE_FUTUR   = ['sarò','sarai','sarà','saremo','sarete','saranno'];
const AVERE_FUTUR    = ['avrò','avrai','avrà','avremo','avrete','avranno'];
const ESSERE_COND    = ['sarei','saresti','sarebbe','saremmo','sareste','sarebbero'];
const AVERE_COND     = ['avrei','avresti','avrebbe','avremmo','avreste','avrebbero'];
const ESSERE_CONG    = ['sia','sia','sia','siamo','siate','siano'];
const AVERE_CONG     = ['abbia','abbia','abbia','abbiamo','abbiate','abbiano'];
const ESSERE_CONGIMP = ['fossi','fossi','fosse','fossimo','foste','fossero'];
const AVERE_CONGIMP  = ['avessi','avessi','avesse','avessimo','aveste','avessero'];

/* Le participe s'accorde au pluriel avec essere : les trois
   premières personnes au singulier, les trois autres au pluriel. */
function accorde(participio, personne){
  if (personne < 3) return participio;
  return participio.replace(/o$/, 'i').replace(/a$/, 'e');
}

/* ---------------------------------------------------------
   Les verbes irréguliers

   Trois formes suffisent le plus souvent : le présent, le radical
   du passé simple, et le participe. Le reste s'en déduit —
   le subjonctif présent naît de la première personne du présent
   (io vado → che io vada), et le conditionnel du radical du futur.
   --------------------------------------------------------- */
const IRREGULIERS = {
  essere: { presente:['sono','sei','è','siamo','siete','sono'],
            imperfetto:['ero','eri','era','eravamo','eravate','erano'],
            passatoRemoto:['fui','fosti','fu','fummo','foste','furono'],
            futuroStem:'sar', participio:'stato', gerundio:'essendo',
            congPresente:['sia','sia','sia','siamo','siate','siano'],
            congImperfetto:['fossi','fossi','fosse','fossimo','foste','fossero'],
            imperativo:['sii','sia','siamo','siate'] },

  avere:  { presente:['ho','hai','ha','abbiamo','avete','hanno'],
            passatoRemoto:['ebbi','avesti','ebbe','avemmo','aveste','ebbero'],
            futuroStem:'avr', participio:'avuto',
            congPresente:['abbia','abbia','abbia','abbiamo','abbiate','abbiano'],
            imperativo:['abbi','abbia','abbiamo','abbiate'] },

  andare: { presente:['vado','vai','va','andiamo','andate','vanno'],
            futuroStem:'andr', participio:'andato',
            congPresente:['vada','vada','vada','andiamo','andiate','vadano'],
            imperativo:['va\u2019','vada','andiamo','andate'] },

  fare:   { presente:['faccio','fai','fa','facciamo','fate','fanno'],
            imperfettoStem:'facev',
            // fare vient de « facere » : les personnes régulières en gardent la trace
            passatoRemoto:['feci','facesti','fece','facemmo','faceste','fecero'],
            futuroStem:'far', participio:'fatto', gerundio:'facendo',
            congImperfettoStem:'facess',
            congPresente:['faccia','faccia','faccia','facciamo','facciate','facciano'],
            imperativo:['fa\u2019','faccia','facciamo','fate'] },

  dare:   { presente:['do','dai','dà','diamo','date','danno'],
            passatoRemoto:['diedi','desti','diede','demmo','deste','diedero'],
            futuroStem:'dar', participio:'dato',
            congPresente:['dia','dia','dia','diamo','diate','diano'],
            congImperfetto:['dessi','dessi','desse','dessimo','deste','dessero'],
            imperativo:['da\u2019','dia','diamo','date'] },

  stare:  { presente:['sto','stai','sta','stiamo','state','stanno'],
            passatoRemoto:['stetti','stesti','stette','stemmo','steste','stettero'],
            futuroStem:'star', participio:'stato',
            congPresente:['stia','stia','stia','stiamo','stiate','stiano'],
            congImperfetto:['stessi','stessi','stesse','stessimo','steste','stessero'],
            imperativo:['sta\u2019','stia','stiamo','state'] },

  dire:   { presente:['dico','dici','dice','diciamo','dite','dicono'],
            imperfettoStem:'dicev',
            passatoRemoto:['dissi','dicesti','disse','dicemmo','diceste','dissero'],
            futuroStem:'dir', participio:'detto', gerundio:'dicendo',
            congImperfettoStem:'dicess',
            congPresente:['dica','dica','dica','diciamo','diciate','dicano'],
            imperativo:['di\u2019','dica','diciamo','dite'] },

  venire: { presente:['vengo','vieni','viene','veniamo','venite','vengono'],
            passatoRemotoStem:'venn', futuroStem:'verr', participio:'venuto',
            congPresente:['venga','venga','venga','veniamo','veniate','vengano'],
            imperativo:['vieni','venga','veniamo','venite'] },

  uscire: { presente:['esco','esci','esce','usciamo','uscite','escono'],
            futuroStem:'uscir', participio:'uscito',
            congPresente:['esca','esca','esca','usciamo','usciate','escano'],
            imperativo:['esci','esca','usciamo','uscite'] },

  // « potere » et « dovere » n'ont pas d'impératif : on ne commande pas
  // à quelqu'un de pouvoir. Le tiret le dit, et l'exercice les écarte.
  potere: { presente:['posso','puoi','può','possiamo','potete','possono'],
            passatoRemotoStem:'pot', futuroStem:'potr', participio:'potuto',
            congPresente:['possa','possa','possa','possiamo','possiate','possano'],
            imperativo:['—','—','—','—'] },

  volere: { presente:['voglio','vuoi','vuole','vogliamo','volete','vogliono'],
            passatoRemotoStem:'voll', futuroStem:'vorr', participio:'voluto',
            congPresente:['voglia','voglia','voglia','vogliamo','vogliate','vogliano'],
            imperativo:['vogli','voglia','vogliamo','vogliate'] },

  dovere: { presente:['devo','devi','deve','dobbiamo','dovete','devono'],
            futuroStem:'dovr', participio:'dovuto',
            congPresente:['debba','debba','debba','dobbiamo','dobbiate','debbano'],
            imperativo:['—','—','—','—'] },

  sapere: { presente:['so','sai','sa','sappiamo','sapete','sanno'],
            passatoRemotoStem:'sepp', futuroStem:'sapr', participio:'saputo',
            congPresente:['sappia','sappia','sappia','sappiamo','sappiate','sappiano'],
            imperativo:['sappi','sappia','sappiamo','sappiate'] },

  bere:   { presente:['bevo','bevi','beve','beviamo','bevete','bevono'],
            imperfettoStem:'bevev',
            passatoRemoto:['bevvi','bevesti','bevve','bevemmo','beveste','bevvero'],
            futuroStem:'berr', participio:'bevuto', gerundio:'bevendo',
            congImperfettoStem:'bevess',
            congPresente:['beva','beva','beva','beviamo','beviate','bevano'],
            imperativo:['bevi','beva','beviamo','bevete'] },

  tenere: { presente:['tengo','tieni','tiene','teniamo','tenete','tengono'],
            passatoRemotoStem:'tenn', futuroStem:'terr', participio:'tenuto',
            congPresente:['tenga','tenga','tenga','teniamo','teniate','tengano'],
            imperativo:['tieni','tenga','teniamo','tenete'] },

  rimanere:{ presente:['rimango','rimani','rimane','rimaniamo','rimanete','rimangono'],
            passatoRemotoStem:'rimas', futuroStem:'rimarr', participio:'rimasto',
            congPresente:['rimanga','rimanga','rimanga','rimaniamo','rimaniate','rimangano'],
            imperativo:['rimani','rimanga','rimaniamo','rimanete'] },

  scegliere:{ presente:['scelgo','scegli','sceglie','scegliamo','scegliete','scelgono'],
            passatoRemotoStem:'scels', futuroStem:'sceglier', participio:'scelto',
            congPresente:['scelga','scelga','scelga','scegliamo','scegliate','scelgano'],
            imperativo:['scegli','scelga','scegliamo','scegliete'] },

  salire: { presente:['salgo','sali','sale','saliamo','salite','salgono'],
            futuroStem:'salir', participio:'salito',
            congPresente:['salga','salga','salga','saliamo','saliate','salgano'],
            imperativo:['sali','salga','saliamo','salite'] },

  morire: { presente:['muoio','muori','muore','moriamo','morite','muoiono'],
            futuroStem:'morir', participio:'morto',
            congPresente:['muoia','muoia','muoia','moriamo','moriate','muoiano'],
            imperativo:['muori','muoia','moriamo','morite'] },

  sedere: { presente:['siedo','siedi','siede','sediamo','sedete','siedono'],
            futuroStem:'sieder', participio:'seduto',
            congPresente:['sieda','sieda','sieda','sediamo','sediate','siedano'],
            imperativo:['siedi','sieda','sediamo','sedete'] },

  piacere:{ presente:['piaccio','piaci','piace','piacciamo','piacete','piacciono'],
            passatoRemotoStem:'piacqu', futuroStem:'piacer', participio:'piaciuto',
            congPresente:['piaccia','piaccia','piaccia','piacciamo','piacciate','piacciano'],
            imperativo:['piaci','piaccia','piacciamo','piacete'] },

  tradurre:{ presente:['traduco','traduci','traduce','traduciamo','traducete','traducono'],
            imperfettoStem:'traducev',
            passatoRemoto:['tradussi','traducesti','tradusse','traducemmo','traduceste','tradussero'],
            futuroStem:'tradurr', participio:'tradotto', gerundio:'traducendo',
            congImperfettoStem:'traducess',
            congPresente:['traduca','traduca','traduca','traduciamo','traduciate','traducano'],
            imperativo:['traduci','traduca','traduciamo','traducete'] }
};

/* Verbes réguliers au présent mais au passé simple ou au participe
   irréguliers : c'est le cas le plus fréquent en -ere. */
const PARTICIPES = {
  prendere:['pres','preso'], mettere:['mis','messo'], scrivere:['scriss','scritto'],
  leggere:['less','letto'], vedere:['vid','visto'], chiudere:['chius','chiuso'],
  aprire:[null,'aperto'], offrire:[null,'offerto'], soffrire:[null,'sofferto'],
  rompere:['rupp','rotto'], vivere:['viss','vissuto'], conoscere:['conobb','conosciuto'],
  nascere:['nacqu','nato'], chiedere:['chies','chiesto'], rispondere:['rispos','risposto'],
  decidere:['decis','deciso'], ridere:['ris','riso'], perdere:['pers','perso'],
  correre:['cors','corso'], scendere:['ses','sceso'], spendere:['spes','speso'],
  accendere:['acces','acceso'], succedere:['success','successo'],
  muovere:['moss','mosso'], vincere:['vins','vinto'], spingere:['spins','spinto'],
  piangere:['pians','pianto'], giungere:['giuns','giunto'], dipingere:['dipins','dipinto'],
  stringere:['strins','stretto'], scegliere:['scels','scelto'], cogliere:['cols','colto'],
  togliere:['tols','tolto'], nascondere:['nascos','nascosto'], rendere:['res','reso'],
  difendere:['difes','difeso'], dividere:['divis','diviso'], uccidere:['uccis','ucciso'],
  mordere:['mors','morso'], scoprire:[null,'scoperto'], coprire:[null,'coperto'],
  cuocere:['coss','cotto'], crescere:['crebb','cresciuto'], cadere:['cadd','caduto'],
  volere:['voll','voluto'], parere:['parv','parso'], apparire:['apparv','apparso'],
  esistere:[null,'esistito'], insistere:[null,'insistito'],
  correggere:['corress','corretto'], distruggere:['distruss','distrutto'],
  proteggere:['protess','protetto'], sorgere:['sors','sorto'], porre:['pos','posto']
};

/* ---------------------------------------------------------
   La conjugaison
   --------------------------------------------------------- */

/* Les -ire qui prennent -isc-. Ils sont majoritaires, mais la
   liste des autres est courte : on la nomme plutôt que de deviner. */
const IRE_SANS_ISC = [
  'dormire','partire','sentire','aprire','offrire','soffrire','coprire','scoprire',
  'servire','seguire','vestire','bollire','fuggire','divertire','avvertire','pentire',
  'venire','uscire','salire','morire','riempire','cucire','apparire','sparire'
];

function analyse(verbe){
  const v = String(verbe || '').toLowerCase().trim();
  if (!/^[a-zàèéìòù]{3,24}$/.test(v)) return null;

  let groupe = null;
  if (/are$/.test(v)) groupe = 'are';
  else if (/ere$|urre$|orre$/.test(v)) groupe = 'ere';
  else if (/ire$/.test(v)) groupe = 'ire';
  if (!groupe) return null;

  const radical = v.replace(/(are|ere|ire|urre|orre)$/, '');
  const irr = IRREGULIERS[v] || null;
  const part = PARTICIPES[v] || null;
  const isc = (groupe === 'ire') && !irr && IRE_SANS_ISC.indexOf(v) < 0;

  return { verbe:v, groupe:groupe, radical:radical, irr:irr, part:part, isc:isc };
}

/* Le radical du futur.
   Attention : il ne suit pas la règle du présent. « mangiare » donne
   mangerò — le i tombe après c et g —, mais « studiare » donne studierò,
   car il s'y prononce. Confondre les deux est la faute classique. */
function radicalFutur(a){
  if (a.irr && a.irr.futuroStem) return a.irr.futuroStem;
  if (a.groupe === 'are'){
    let r = a.radical;
    if (/(ci|gi)$/.test(r)) r = r.slice(0, -1);   // mangi- → mang-, cominci- → cominc-
    else r = devantEouI(r);                        // cerc- → cerch-, pag- → pagh-
    return r + 'er';
  }
  if (a.groupe === 'ere'){
    // futurs syncopés : la voyelle du radical tombe (vedrò, non vederò)
    if (FUTUR_SYNCOPE[a.verbe]) return FUTUR_SYNCOPE[a.verbe];
    return a.radical + 'er';
  }
  return a.radical + 'ir';
}

/* Les -ere dont le futur perd sa voyelle. Ils ne se devinent pas :
   cadere donne cadrò, mais credere donne crederò. */
const FUTUR_SYNCOPE = {
  vedere:'vedr', cadere:'cadr', vivere:'vivr', dovere:'dovr', potere:'potr',
  sapere:'sapr', andare:'andr', avere:'avr', bere:'berr', volere:'vorr',
  tenere:'terr', rimanere:'rimarr', venire:'verr', parere:'parr',
  valere:'varr', dolere:'dorr', porre:'porr', condurre:'condurr'
};

/** Les six formes du présent, avec les ajustements orthographiques. */
function presentRegulier(a){
  const fins = a.isc ? ISC_PRESENT : FINS[a.groupe].presente;
  return fins.map(f => {
    let r = a.radical;
    if (/^[ie]/.test(f)) r = devantEouI(r);     // cerchi, paghiamo
    if (/^i/.test(f)) r = sansIsuperflu(r);     // mangi, studi
    return r + f;
  });
}

function conjugue(verbe){
  const a = analyse(verbe);
  if (!a) return null;
  const irr = a.irr || {};
  const F = FINS[a.groupe];

  /* présent */
  const presente = irr.presente ? irr.presente.slice() : presentRegulier(a);

  /* imparfait : radical régulier, sauf fare, dire, bere, tradurre */
  const impStem = irr.imperfettoStem || (a.radical + F.imperfetto);
  const imperfetto = irr.imperfetto ? irr.imperfetto.slice()
    : ['o','i','a','amo','ate','ano'].map(f => impStem + f);

  /* passé simple : la plupart des irréguliers suivent le schéma 1-3-3,
     irrégulier aux 1re et 3e personnes, régulier ailleurs */
  let passatoRemoto;
  const prStem = irr.passatoRemotoStem || (a.part ? a.part[0] : null);
  if (irr.passatoRemoto){
    passatoRemoto = irr.passatoRemoto.slice();
  } else if (prStem){
    const reg = F.passatoRemoto;
    passatoRemoto = [prStem + 'i', a.radical + reg[1], prStem + 'e',
                     a.radical + reg[3], a.radical + reg[4], prStem + 'ero'];
  } else {
    passatoRemoto = F.passatoRemoto.map(f => a.radical + f);
  }

  /* participe et gérondif */
  const participio = irr.participio || (a.part ? a.part[1] : a.radical + F.participio);
  const gerundio = irr.gerundio || (a.radical + F.gerundio);

  /* futur et conditionnel : même radical */
  const rf = radicalFutur(a);
  const futuroSemplice = ['ò','ai','à','emo','ete','anno'].map(f => rf + f);
  const condPresente = ['ei','esti','ebbe','emmo','este','ebbero'].map(f => rf + f);

  /* subjonctif présent : il naît de la 1re personne du présent */
  let congPresente;
  if (irr.congPresente){
    congPresente = irr.congPresente.slice();
  } else if (a.isc){
    congPresente = ISC_CONG.map(f => a.radical + f);
  } else {
    const fins = F.congPresente;
    congPresente = fins.map((f, i) => {
      let r = a.radical;
      if (/^[ie]/.test(f)) r = devantEouI(r);
      if (/^i/.test(f)) r = sansIsuperflu(r);
      return r + f;
    });
  }

  /* subjonctif imparfait */
  const ciStem = irr.congImperfettoStem || (a.radical + F.congImperfetto);
  const congImperfetto = irr.congImperfetto ? irr.congImperfetto.slice()
    : ['i','i','e','imo','e','ero'].map((f, i) =>
        (i === 4) ? ciStem.replace(/s$/, '') + 'te' : ciStem + f);

  /* temps composés */
  const avecEssere = AVEC_ESSERE.indexOf(a.verbe) >= 0;
  const auxP  = avecEssere ? ESSERE_PRESENT : AVERE_PRESENT;
  const auxI  = avecEssere ? ESSERE_IMPARF  : AVERE_IMPARF;
  const auxF  = avecEssere ? ESSERE_FUTUR   : AVERE_FUTUR;
  const auxC  = avecEssere ? ESSERE_COND    : AVERE_COND;
  const auxCg = avecEssere ? ESSERE_CONG    : AVERE_CONG;
  const auxCi = avecEssere ? ESSERE_CONGIMP : AVERE_CONGIMP;
  const compose = (aux) => aux.map((x, i) =>
    x + ' ' + (avecEssere ? accorde(participio, i) : participio));

  /* impératif */
  let imperativo;
  if (irr.imperativo){
    imperativo = irr.imperativo.slice();
  } else if (a.isc){
    imperativo = ISC_IMPER.map(f => a.radical + f);
  } else {
    imperativo = F.imperativo.map(f => {
      let r = a.radical;
      if (/^[ie]/.test(f)) r = devantEouI(r);
      if (/^i/.test(f)) r = sansIsuperflu(r);
      return r + f;
    });
  }

  return {
    presente, imperfetto, passatoRemoto, futuroSemplice, condPresente,
    congPresente, congImperfetto, imperativo,
    passatoProssimo: compose(auxP),
    trapassatoPross: compose(auxI),
    futuroAnteriore: compose(auxF),
    condPassato:     compose(auxC),
    congPassato:     compose(auxCg),
    congTrapassato:  compose(auxCi),
    infinito: [a.verbe],
    gerundio: [gerundio],
    participio: [participio],

    verbe: a.verbe, groupe: a.groupe, isc: a.isc,
    ausiliare: avecEssere ? 'essere' : 'avere',
    irregulier: !!(a.irr || a.part)
  };
}

function forme(verbe, temps, personne){
  const c = conjugue(verbe);
  if (!c || !c[temps]) return null;
  return c[temps][personne] || null;
}
function connait(verbe){ return !!analyse(verbe); }

function sujet(temps, personne){
  const def = TEMPS.find(x => x.code === temps);
  if (!def || def.pers !== 6) return '';
  return (def.che ? 'che ' : '') + PRONOMS[personne] + ' ';
}
function sansAccent(s){
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
/* Formes également acceptées.
   Le passé simple des -ere réguliers a deux séries : credei ou credetti,
   credé ou credette. Les deux s'enseignent, les deux sont justes. */
function variantes(verbe, temps, personne){
  const c = conjugue(verbe);
  if (!c || !c[temps]) return [];
  const attendu = c[temps][personne];
  if (!attendu) return [];
  const v = [];
  const paires = [[/ei$/, 'etti'], [/é$/, 'ette'], [/erono$/, 'ettero']];
  paires.forEach(([re, rep]) => {
    if (re.test(attendu)) v.push(attendu.replace(re, rep));
  });
  return v;
}

const API = {
  langue: 'it',
  TEMPS, PRONOMS, PRONOMS_LONGS, IMPER_PERSONNES,
  conjugue, forme, connait, sujet, sansAccent, variantes,
  irreguliers: Object.keys(IRREGULIERS).concat(Object.keys(PARTICIPES))
};

if (typeof module !== 'undefined' && module.exports) module.exports = API;
global.ConjugueurIT = API;

global.__IT_BASE = { FINS, devantEouI, sansIsuperflu, ISC_PRESENT, ISC_CONG, ISC_IMPER,
                     TEMPS, PRONOMS, PRONOMS_LONGS, IMPER_PERSONNES,
                     IRREGULIERS, PARTICIPES, AVEC_ESSERE, accorde,
                     ESSERE_PRESENT, AVERE_PRESENT, ESSERE_IMPARF, AVERE_IMPARF,
                     ESSERE_FUTUR, AVERE_FUTUR, ESSERE_COND, AVERE_COND,
                     ESSERE_CONG, AVERE_CONG, ESSERE_CONGIMP, AVERE_CONGIMP };

})(typeof window !== 'undefined' ? window : globalThis);
