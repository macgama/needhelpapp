"use strict";

/* =========================================================
   Conjugaison allemande, pour des élèves francophones.

   C'est la plus difficile des quatre, pour quatre raisons qui
   se cumulent : les verbes forts changent de voyelle, les
   préfixes se détachent, l'auxiliaire du parfait dépend du
   sens, et le Konjunktiv II a deux formes concurrentes.

   Chacune est traitée séparément, et vérifiée séparément.
   ========================================================= */
(function (global) {

const PRONOMS = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];
const PRONOMS_LONGS = ['ich', 'du', 'er / sie / es', 'wir', 'ihr', 'sie / Sie'];
const IMPER_PERSONNES = ['du', 'ihr', 'Sie'];

const TEMPS = [
  { code:'praesens',        mode:'Indikativ',   nom:'Präsens',          pers:6 },
  { code:'praeteritum',     mode:'Indikativ',   nom:'Präteritum',       pers:6 },
  { code:'perfekt',         mode:'Indikativ',   nom:'Perfekt',          pers:6 },
  { code:'plusquamperfekt', mode:'Indikativ',   nom:'Plusquamperfekt',  pers:6 },
  { code:'futurI',          mode:'Indikativ',   nom:'Futur I',          pers:6 },
  { code:'futurII',         mode:'Indikativ',   nom:'Futur II',         pers:6 },

  { code:'konjunktivII',    mode:'Konjunktiv',  nom:'Konjunktiv II',           pers:6 },
  { code:'konjunktivIIWuerde', mode:'Konjunktiv', nom:'Konjunktiv II (würde)', pers:6 },
  { code:'konjunktivIIVerg',mode:'Konjunktiv',  nom:'Konjunktiv II du passé',  pers:6 },

  { code:'imperativ',       mode:'Imperativ',   nom:'Imperativ', pers:3, imperatif:true },

  { code:'infinitiv',       mode:'Formen',      nom:'Infinitiv',        pers:1 },
  { code:'partizipI',       mode:'Formen',      nom:'Partizip I',       pers:1 },
  { code:'partizipII',      mode:'Formen',      nom:'Partizip II',      pers:1 }
];

/* ---------------------------------------------------------
   Les préfixes

   Séparables : ils partent en fin de proposition — ich stehe
   auf —, et le ge- du participe se glisse entre le préfixe et
   le radical : aufgestanden.

   Inséparables : rien ne bouge, et le participe n'a pas de
   ge- du tout : besucht, verkauft.
   --------------------------------------------------------- */
const INSEPARABLES = ['be', 'ge', 'er', 'ver', 'zer', 'ent', 'emp', 'miss'];

const SEPARABLES = [
  'ab','an','auf','aus','bei','ein','fort','her','herunter','herauf','heraus','herein',
  'hin','hinaus','hinein','hinunter','los','mit','nach','vor','vorbei','weg','weiter',
  'zu','zurück','zusammen','fest','statt','teil','fern','frei','hoch','wieder','durch',
  'über','um','unter','voll','wider'
];

/* « über », « um », « unter », « durch » sont tantôt séparables,
   tantôt non, selon le verbe et le sens. On tranche par une liste :
   deviner produirait des formes fausses une fois sur deux. */
const INSEPARABLE_MALGRE_TOUT = [
  'übersetzen','überlegen','überraschen','überzeugen','übernehmen','überleben',
  'unterschreiben','unterhalten','unterrichten','unterbrechen','unterstützen',
  'umarmen','umgeben','durchschauen','wiederholen','übertreiben','überqueren'
];

function prefixe(verbe){
  if (INSEPARABLE_MALGRE_TOUT.indexOf(verbe) >= 0) return { type:'inseparable', p:'' };
  // les plus longs d'abord : « zurück » avant « zu »
  const separables = SEPARABLES.slice().sort((a, b) => b.length - a.length);
  for (const p of separables){
    if (verbe.length > p.length + 3 && verbe.indexOf(p) === 0){
      return { type:'separable', p:p, reste:verbe.slice(p.length) };
    }
  }
  for (const p of INSEPARABLES){
    if (verbe.length > p.length + 3 && verbe.indexOf(p) === 0){
      return { type:'inseparable', p:p, reste:verbe.slice(p.length) };
    }
  }
  return { type:'simple', p:'' };
}

/* ---------------------------------------------------------
   L'insertion du -e-

   arbeiten → du arbeitest : sans le e, la terminaison serait
   imprononçable. Même chose après -chn, -ffn, -gn, -tm.
   --------------------------------------------------------- */
function besoinDuE(radical){
  if (/[dt]$/.test(radical)) return true;
  if (/(chn|ffn|gn|tm|dm)$/.test(radical)) return true;
  return false;
}

/* reisen → du reist, heißen → du heißt : le s de la terminaison
   se fond dans la sifflante du radical. */
function sifflante(radical){
  return /(s|ß|z|x|tz)$/.test(radical);
}

/* sammeln → ich sammle : le e du radical tombe. */
function radicalEnEln(verbe){
  return /(eln|ern)$/.test(verbe);
}

/* ---------------------------------------------------------
   Les verbes forts

   p2  : radical des 2e et 3e personnes du singulier, quand la
         voyelle change (geben → gibst, gibt ; fahren → fährst)
   prät: radical du prétérit (gab, fuhr)
   pp  : participe passé (gegeben, gefahren)
   aux : « sein » quand il le faut, « haben » sinon
   k2  : Konjunktiv II simple, là où il s'emploie vraiment
   --------------------------------------------------------- */
const FORTS = {
  // être, avoir, devenir : les trois piliers
  sein:    { pres:['bin','bist','ist','sind','seid','sind'], prät:'war', ppFull:'gewesen',
             aux:'sein', k2:'wär', imperatif:['sei','seid','seien Sie'] },
  haben:   { pres:['habe','hast','hat','haben','habt','haben'], prät:'hatte',
             ppFull:'gehabt', aux:'haben', k2:'hätt', imperatif:['hab','habt','haben Sie'] },
  werden:  { pres:['werde','wirst','wird','werden','werdet','werden'], prät:'wurde',
             ppFull:'geworden', aux:'sein', k2:'würd' },

  // les modaux : pas de -t à la troisième personne du singulier
  können:  { pres:['kann','kannst','kann','können','könnt','können'], prät:'konnte',
             ppFull:'gekonnt', aux:'haben', k2:'könnt', sansImperatif:true },
  müssen:  { pres:['muss','musst','muss','müssen','müsst','müssen'], prät:'musste',
             ppFull:'gemusst', aux:'haben', k2:'müsst', sansImperatif:true },
  dürfen:  { pres:['darf','darfst','darf','dürfen','dürft','dürfen'], prät:'durfte',
             ppFull:'gedurft', aux:'haben', k2:'dürft', sansImperatif:true },
  sollen:  { pres:['soll','sollst','soll','sollen','sollt','sollen'], prät:'sollte',
             ppFull:'gesollt', aux:'haben', k2:'sollt', sansImperatif:true },
  wollen:  { pres:['will','willst','will','wollen','wollt','wollen'], prät:'wollte',
             ppFull:'gewollt', aux:'haben', k2:'wollt', sansImperatif:true },
  mögen:   { pres:['mag','magst','mag','mögen','mögt','mögen'], prät:'mochte',
             ppFull:'gemocht', aux:'haben', k2:'möcht', sansImperatif:true },
  wissen:  { pres:['weiß','weißt','weiß','wissen','wisst','wissen'], prät:'wusste',
             ppFull:'gewusst', aux:'haben', k2:'wüsst' },

  // e → i / ie
  geben:   { p2:'gib',  prät:'gab',  pp:'gegeben', aux:'haben', k2:'gäb' },
  nehmen:  { p2:'nimm', prät:'nahm', pp:'genommen', aux:'haben', k2:'nähm' },
  sehen:   { p2:'sieh', prät:'sah',  pp:'gesehen', aux:'haben', k2:'säh' },
  lesen:   { p2:'lies', prät:'las',  pp:'gelesen', aux:'haben', k2:'läs' },
  essen:   { p2:'iss',  prät:'aß',   pp:'gegessen', aux:'haben', k2:'äß' },
  sprechen:{ p2:'sprich', prät:'sprach', pp:'gesprochen', aux:'haben', k2:'spräch' },
  helfen:  { p2:'hilf', prät:'half', pp:'geholfen', aux:'haben', k2:'hülf' },
  treffen: { p2:'triff', prät:'traf', pp:'getroffen', aux:'haben', k2:'träf' },
  vergessen:{ p2:'vergiss', prät:'vergaß', pp:'vergessen', aux:'haben' },
  werfen:  { p2:'wirf', prät:'warf', pp:'geworfen', aux:'haben' },
  sterben: { p2:'stirb', prät:'starb', pp:'gestorben', aux:'sein' },
  brechen: { p2:'brich', prät:'brach', pp:'gebrochen', aux:'haben' },
  empfehlen:{ p2:'empfiehl', prät:'empfahl', pp:'empfohlen', aux:'haben' },
  stehlen: { p2:'stiehl', prät:'stahl', pp:'gestohlen', aux:'haben' },

  // a → ä
  fahren:  { p2:'fähr', prät:'fuhr', pp:'gefahren', aux:'sein', k2:'führ' },
  schlafen:{ p2:'schläf', prät:'schlief', pp:'geschlafen', aux:'haben' },
  tragen:  { p2:'träg', prät:'trug', pp:'getragen', aux:'haben', k2:'trüg' },
  laufen:  { p2:'läuf', prät:'lief', pp:'gelaufen', aux:'sein' },
  fallen:  { p2:'fäll', prät:'fiel', pp:'gefallen', aux:'sein' },
  halten:  { p2:'hält', prät:'hielt', pp:'gehalten', aux:'haben' },
  lassen:  { p2:'läss', prät:'ließ', pp:'gelassen', aux:'haben' },
  waschen: { p2:'wäsch', prät:'wusch', pp:'gewaschen', aux:'haben' },
  wachsen: { p2:'wächs', prät:'wuchs', pp:'gewachsen', aux:'sein' },
  schlagen:{ p2:'schläg', prät:'schlug', pp:'geschlagen', aux:'haben' },
  laden:   { p2:'läd', prät:'lud', pp:'geladen', aux:'haben' },
  raten:   { p2:'rät', prät:'riet', pp:'geraten', aux:'haben' },
  gefallen:{ p2:'gefäll', prät:'gefiel', pp:'gefallen', aux:'haben' },

  // voyelle inchangée au présent
  gehen:   { prät:'ging', pp:'gegangen', aux:'sein', k2:'ging' },
  kommen:  { prät:'kam',  pp:'gekommen', aux:'sein', k2:'käm' },
  finden:  { prät:'fand', pp:'gefunden', aux:'haben', k2:'fänd' },
  bleiben: { prät:'blieb', pp:'geblieben', aux:'sein', k2:'blieb' },
  heißen:  { prät:'hieß', pp:'geheißen', aux:'haben' },
  schreiben:{ prät:'schrieb', pp:'geschrieben', aux:'haben' },
  trinken: { prät:'trank', pp:'getrunken', aux:'haben' },
  singen:  { prät:'sang', pp:'gesungen', aux:'haben' },
  springen:{ prät:'sprang', pp:'gesprungen', aux:'sein' },
  schwimmen:{ prät:'schwamm', pp:'geschwommen', aux:'sein' },
  beginnen:{ prät:'begann', pp:'begonnen', aux:'haben' },
  gewinnen:{ prät:'gewann', pp:'gewonnen', aux:'haben' },
  bringen: { prät:'brachte', pp:'gebracht', aux:'haben', k2:'brächt' },
  denken:  { prät:'dachte', pp:'gedacht', aux:'haben', k2:'dächt' },
  kennen:  { prät:'kannte', pp:'gekannt', aux:'haben' },
  nennen:  { prät:'nannte', pp:'genannt', aux:'haben' },
  rennen:  { prät:'rannte', pp:'gerannt', aux:'sein' },
  brennen: { prät:'brannte', pp:'gebrannt', aux:'haben' },
  stehen:  { prät:'stand', pp:'gestanden', aux:'haben', k2:'stünd' },
  verstehen:{ prät:'verstand', pp:'verstanden', aux:'haben' },
  tun:     { pres:['tue','tust','tut','tun','tut','tun'], prät:'tat', pp:'getan', aux:'haben', k2:'tät' },
  ziehen:  { prät:'zog', pp:'gezogen', aux:'haben' },
  fliegen: { prät:'flog', pp:'geflogen', aux:'sein' },
  schließen:{ prät:'schloss', pp:'geschlossen', aux:'haben' },
  verlieren:{ prät:'verlor', pp:'verloren', aux:'haben' },
  bieten:  { prät:'bot', pp:'geboten', aux:'haben' },
  schießen:{ prät:'schoss', pp:'geschossen', aux:'haben' },
  fließen: { prät:'floss', pp:'geflossen', aux:'sein' },
  riechen: { prät:'roch', pp:'gerochen', aux:'haben' },
  schreien:{ prät:'schrie', pp:'geschrien', aux:'haben' },
  steigen: { prät:'stieg', pp:'gestiegen', aux:'sein' },
  scheinen:{ prät:'schien', pp:'geschienen', aux:'haben' },
  treiben: { prät:'trieb', pp:'getrieben', aux:'haben' },
  leihen:  { prät:'lieh', pp:'geliehen', aux:'haben' },
  liegen:  { prät:'lag', pp:'gelegen', aux:'haben', k2:'läg' },
  sitzen:  { prät:'saß', pp:'gesessen', aux:'haben', k2:'säß' },
  bitten:  { prät:'bat', pp:'gebeten', aux:'haben' },
  binden:  { prät:'band', pp:'gebunden', aux:'haben' },
  verbinden:{ prät:'verband', pp:'verbunden', aux:'haben' },
  gelingen:{ prät:'gelang', pp:'gelungen', aux:'sein' },
  klingen: { prät:'klang', pp:'geklungen', aux:'haben' },
  zwingen: { prät:'zwang', pp:'gezwungen', aux:'haben' },
  verschwinden:{ prät:'verschwand', pp:'verschwunden', aux:'sein' },
  geschehen:{ p2:'geschieh', prät:'geschah', pp:'geschehen', aux:'sein' },
  bekommen:{ prät:'bekam', pp:'bekommen', aux:'haben' },
  vergleichen:{ prät:'verglich', pp:'verglichen', aux:'haben' },
  streichen:{ prät:'strich', pp:'gestrichen', aux:'haben' },
  greifen: { prät:'griff', pp:'gegriffen', aux:'haben' },
  pfeifen: { prät:'pfiff', pp:'gepfiffen', aux:'haben' },
  reiten:  { prät:'ritt', pp:'geritten', aux:'sein' },
  schneiden:{ prät:'schnitt', pp:'geschnitten', aux:'haben' },
  streiten:{ prät:'stritt', pp:'gestritten', aux:'haben' },
  leiden:  { prät:'litt', pp:'gelitten', aux:'haben' },
  beißen:  { prät:'biss', pp:'gebissen', aux:'haben' },
  heben:   { prät:'hob', pp:'gehoben', aux:'haben' },
  schaffen:{ prät:'schuf', pp:'geschaffen', aux:'haben' },
  fangen:  { p2:'fäng', prät:'fing', pp:'gefangen', aux:'haben' },
  hängen:  { prät:'hing', pp:'gehangen', aux:'haben' },
  rufen:   { prät:'rief', pp:'gerufen', aux:'haben' },
  stoßen:  { p2:'stöß', prät:'stieß', pp:'gestoßen', aux:'haben' },
  betrügen:{ prät:'betrog', pp:'betrogen', aux:'haben' },
  lügen:   { prät:'log', pp:'gelogen', aux:'haben' },
  saufen:  { p2:'säuf', prät:'soff', pp:'gesoffen', aux:'haben' },
  gelten:  { p2:'gilt', prät:'galt', pp:'gegolten', aux:'haben' },
  treten:  { p2:'tritt', prät:'trat', pp:'getreten', aux:'sein' },
  bergen:  { p2:'birg', prät:'barg', pp:'geborgen', aux:'haben' },
  befehlen:{ p2:'befiehl', prät:'befahl', pp:'befohlen', aux:'haben' }
};

/* Composés dont l'auxiliaire diffère du verbe simple : « stehen »
   prend haben, mais « aufstehen » prend sein — on se lève d'un lieu
   vers un autre. Cela ne se déduit pas, cela se sait. */
const COMPOSES_SEIN = [
  'aufstehen','ankommen','mitkommen','zurückkommen','herkommen','hinkommen',
  'weggehen','ausgehen','hingehen','zurückgehen','losgehen','umziehen',
  'einschlafen','aufwachen','abfahren','losfahren','wegfahren','zurückfahren',
  'einsteigen','aussteigen','umsteigen','aufwachsen','entstehen','aufbrechen',
  'wegrennen','davonlaufen','weglaufen','zurücklaufen','durchfallen','hinfallen',
  'umfallen','vorbeikommen','vorbeigehen','heimkommen','wiederkommen'
];

/* Verbes faibles conjugués avec « sein » : ils décrivent un
   déplacement ou un changement d'état. */
const FAIBLES_SEIN = [
  'reisen','wandern','folgen','begegnen','passieren','aufwachen','einschlafen',
  'landen','klettern','eilen','stürzen','platzen','verreisen','umziehen','auswandern'
];

/* ---------------------------------------------------------
   La conjugaison
   --------------------------------------------------------- */
function analyse(verbe){
  const v = String(verbe || '').toLowerCase().trim();
  if (!/^[a-zäöüß]{3,26}$/.test(v)) return null;
  if (!/e?n$/.test(v)) return null;

  const pre = prefixe(v);
  // le verbe de base sert à trouver la forme forte : « ankommen » se
  // conjugue sur « kommen », et il aurait été absurde de tout redoubler
  const simple = (pre.type !== 'simple' && pre.reste) ? pre.reste : v;
  const fort = FORTS[v] || (pre.type !== 'simple' ? FORTS[simple] : null) || null;

  const radical = v.replace(/e?n$/, '');
  const radicalSimple = simple.replace(/e?n$/, '');

  /* Le noyau est ce qui se conjugue : « stehen » pour aufstehen, dont le
     préfixe se détache ; « besuchen » tout entier, dont le préfixe reste. */
  const noyau = (pre.type === 'separable') ? pre.reste : v;

  return {
    verbe: v, pre: pre, simple: simple, fort: fort, noyau: noyau,
    radical: radical, radicalSimple: radicalSimple,
    ieren: /ieren$/.test(v)
  };
}

/**
 * Les six formes du présent.
 *
 * Le noyau à conjuguer n'est pas toujours le verbe entier : « aufstehen »
 * se conjugue sur « stehen », le préfixe partant en fin de proposition ;
 * mais « besuchen » se conjugue tout entier, son préfixe étant inséparable.
 */
function presentFormes(a){
  const f = a.fort;

  if (f && f.pres){
    // formes entièrement données : sein, haben, werden, les modaux
    if (a.pre.type === 'inseparable' && !FORTS[a.verbe]){
      return f.pres.map(x => a.pre.p + x);
    }
    return f.pres.slice();
  }

  const noyau = a.noyau;                       // verbe sans préfixe séparable
  const r = noyau.replace(/e?n$/, '');
  let p2 = (f && f.p2) ? f.p2 : null;
  // le changement de voyelle vaut aussi pour le composé : er versteht
  if (p2 && a.pre.type === 'inseparable' && !FORTS[a.verbe]) p2 = a.pre.p + p2;

  const e = besoinDuE(r);
  const sif = sifflante(r);
  const r1 = radicalEnEln(noyau) ? r.replace(/e([lr])$/, '$1') : r;

  if (p2){
    /* Avec changement de voyelle, le -e- de liaison ne s'insère pas :
       du lädst, et non « du lädest ». La consonne finale du radical
       absorbe la terminaison : er hält, er isst. */
    return [
      r1 + 'e',
      p2 + (sifflante(p2) ? 't' : 'st'),
      p2 + (/t$/.test(p2) ? '' : 't'),     // er hält, mais er lässt
      noyau,
      r + (e ? 'et' : 't'),
      noyau
    ];
  }
  return [
    r1 + 'e',
    r + (e ? 'est' : (sif ? 't' : 'st')),
    r + (e ? 'et' : 't'),
    noyau,
    r + (e ? 'et' : 't'),
    noyau
  ];
}

/**
 * Les six formes du prétérit.
 * Un radical fort ne prend rien à la première personne (ich gab), un
 * radical faible porte déjà son -te (ich hatte, ich brachte).
 */
function preteritFormes(a){
  const f = a.fort;
  if (f){
    let r = f.prät;
    if (a.pre.type === 'inseparable' && !FORTS[a.verbe]) r = a.pre.p + r;
    if (/e$/.test(r)){
      const base = r.slice(0, -1);            // hatt-, wusst-, bracht-
      return [base + 'e', base + 'est', base + 'e', base + 'en', base + 'et', base + 'en'];
    }
    const e = besoinDuE(r);
    return [r, r + (e ? 'est' : 'st'), r, r + 'en', r + (e ? 'et' : 't'), r + 'en'];
  }
  const noyau = a.noyau.replace(/e?n$/, '');
  const base = noyau + (besoinDuE(noyau) ? 'ete' : 'te');
  return [base, base + 'st', base, base + 'n', base + 't', base + 'n'];
}

/**
 * Le participe passé.
 * Trois cas : le ge- se glisse après un préfixe séparable
 * (aufgestanden), disparaît après un préfixe inséparable (besucht) et
 * devant -ieren (studiert), et se met devant partout ailleurs (gemacht).
 */
function participeII(a){
  const f = a.fort;
  const pre = a.pre;

  /* le participe du verbe simple, tel que la table le donne */
  const brut = f ? (f.ppFull || f.pp) : null;

  if (pre.type === 'separable'){
    const noyauPart = brut || ('ge' + a.noyau.replace(/e?n$/, '')
      + (besoinDuE(a.noyau.replace(/e?n$/, '')) ? 'et' : 't'));
    return pre.p + noyauPart;
  }

  if (pre.type === 'inseparable'){
    if (FORTS[a.verbe] && brut) return brut;           // donné tel quel
    if (brut){
      // gegeben → begeben : on retire le ge- du verbe simple
      const sansGe = (brut.indexOf('ge') === 0) ? brut.slice(2) : brut;
      return pre.p + sansGe;
    }
    const r = a.radical;
    return r + (besoinDuE(r) ? 'et' : 't');
  }

  if (brut) return brut;
  if (a.ieren) return a.radical + 't';                  // studiert
  const r = a.radical;
  return 'ge' + r + (besoinDuE(r) ? 'et' : 't');
}

const WERDEN_PRES = ['werde','wirst','wird','werden','werdet','werden'];
const HABEN_PRES  = ['habe','hast','hat','haben','habt','haben'];
const SEIN_PRES   = ['bin','bist','ist','sind','seid','sind'];
const HABEN_PRAET = ['hatte','hattest','hatte','hatten','hattet','hatten'];
const SEIN_PRAET  = ['war','warst','war','waren','wart','waren'];
const WUERDE      = ['würde','würdest','würde','würden','würdet','würden'];
const HAETTE      = ['hätte','hättest','hätte','hätten','hättet','hätten'];
const WAERE       = ['wäre','wärst','wäre','wären','wärt','wären'];

function conjugue(verbe){
  const a = analyse(verbe);
  if (!a) return null;
  const f = a.fort || {};
  const sep = (a.pre.type === 'separable') ? a.pre.p : '';

  /* le préfixe séparable part en fin de proposition */
  const detache = (forme) => sep ? (forme + ' ' + sep) : forme;

  const praesens = presentFormes(a).map(detache);
  const praeteritum = preteritFormes(a).map(detache);
  const pp = participeII(a);
  const infinitif = a.verbe;

  /* L'auxiliaire du composé prime sur celui du verbe simple :
     stehen prend haben, aufstehen prend sein. */
  const avecSein = (COMPOSES_SEIN.indexOf(a.verbe) >= 0)
    || (FORTS[a.verbe] && FORTS[a.verbe].aux === 'sein')
    || (a.pre.type === 'simple' && f.aux === 'sein')
    || (a.pre.type === 'inseparable' && f.aux === 'sein' && !COMPOSES_SEIN.length === false && f.aux === 'sein')
    || FAIBLES_SEIN.indexOf(a.verbe) >= 0;

  const auxPres  = avecSein ? SEIN_PRES  : HABEN_PRES;
  const auxPraet = avecSein ? SEIN_PRAET : HABEN_PRAET;
  const auxK2    = avecSein ? WAERE      : HAETTE;

  const perfekt        = auxPres.map(x => x + ' ' + pp);
  const plusquamperfekt= auxPraet.map(x => x + ' ' + pp);
  const futurI         = WERDEN_PRES.map(x => x + ' ' + infinitif);
  const futurII        = WERDEN_PRES.map(x => x + ' ' + pp + ' ' + (avecSein ? 'sein' : 'haben'));

  /* Konjunktiv II : forme simple quand elle s'emploie, würde sinon.
     Pour un verbe faible, la forme simple se confond avec le prétérit —
     c'est précisément pourquoi l'allemand recourt à würde. */
  const konjunktivIIWuerde = WUERDE.map(x => detache(x + ' ' + infinitif));
  let konjunktivII;
  if (f.k2){
    const r = f.k2;
    const e = besoinDuE(r);
    konjunktivII = [r + 'e', r + 'est', r + 'e', r + 'en', r + 'et', r + 'en'].map(detache);
  } else {
    konjunktivII = konjunktivIIWuerde.slice();
  }
  const konjunktivIIVerg = auxK2.map(x => x + ' ' + pp);

  /* Impératif : du, ihr, Sie.
     Seuls les verbes en e → i changent de voyelle à l'impératif —
     gib !, iss !, sprich ! —, jamais ceux en a → ä : on dit fahr !,
     et non « fähr ! ». C'est une faute fréquente, y compris des moteurs. */
  let imperativ;
  if (f.imperatif){
    imperativ = f.imperatif.slice();
  } else if (f.sansImperatif){
    imperativ = ['—', '—', '—'];
  } else {
    const rn = a.noyau.replace(/e?n$/, '');
    const rn1 = radicalEnEln(a.noyau) ? rn.replace(/e([lr])$/, '$1') : rn;
    const p2 = f.p2 || null;
    const umlaut = p2 && /[äöü]/.test(p2) && !/[äöü]/.test(rn);
    const du = (p2 && !umlaut) ? p2
      : (besoinDuE(rn) || radicalEnEln(a.noyau) || /ieren$/.test(a.noyau))
        ? rn1 + 'e'                       // arbeite !, sammle !, studiere !
        : rn1;
    const ihr = rn + (besoinDuE(rn) ? 'et' : 't');
    imperativ = sep
      ? [du + ' ' + sep, ihr + ' ' + sep, a.noyau + ' Sie ' + sep]
      : [du, ihr, a.verbe + ' Sie'];
  }

  return {
    praesens, praeteritum, perfekt, plusquamperfekt, futurI, futurII,
    konjunktivII, konjunktivIIWuerde, konjunktivIIVerg, imperativ,
    infinitiv: [a.verbe],
    partizipI: [a.verbe + 'd'],
    partizipII: [pp],

    verbe: a.verbe,
    fort: !!a.fort,
    hilfsverb: avecSein ? 'sein' : 'haben',
    trennbar: a.pre.type === 'separable',
    praefix: a.pre.p || ''
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
  return PRONOMS[personne] + ' ';
}
function sansAccent(s){
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/* Les deux Konjunktiv II sont également corrects pour beaucoup de
   verbes : celui qui répond « würde geben » là où l'on attend « gäbe »
   n'a pas fait de faute. */
function variantes(verbe, temps, personne){
  const c = conjugue(verbe);
  if (!c) return [];
  if (temps === 'konjunktivII' && c.konjunktivIIWuerde[personne] !== c.konjunktivII[personne]){
    return [c.konjunktivIIWuerde[personne]];
  }
  if (temps === 'konjunktivIIWuerde' && c.konjunktivII[personne] !== c.konjunktivIIWuerde[personne]){
    return [c.konjunktivII[personne]];
  }
  return [];
}

const API = {
  langue: 'de',
  TEMPS, PRONOMS, PRONOMS_LONGS, IMPER_PERSONNES,
  conjugue, forme, connait, sujet, sansAccent, variantes,
  irreguliers: Object.keys(FORTS)
};

if (typeof module !== 'undefined' && module.exports) module.exports = API;
global.ConjugueurDE = API;

global.__DE_BASE = { TEMPS, PRONOMS, PRONOMS_LONGS, IMPER_PERSONNES,
                     FORTS, FAIBLES_SEIN,
                     prefixe, besoinDuE, sifflante, radicalEnEln,
                     SEPARABLES, INSEPARABLES, INSEPARABLE_MALGRE_TOUT };

})(typeof window !== 'undefined' ? window : globalThis);
