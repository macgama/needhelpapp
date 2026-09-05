"use strict";

/* =========================================================
   Conjugaison anglaise, pour des élèves francophones.

   L'interface du site reste en français ; ce sont les formes
   et les noms des temps qui sont anglais, comme au cours.

   Trois difficultés, et elles sont toutes orthographiques :
   le -s de la troisième personne, le -ing, et le -ed. Les
   verbes irréguliers, eux, ne se calculent pas : ils se savent.
   ========================================================= */
(function (global) {

/* ---------------------------------------------------------
   Les personnes
   --------------------------------------------------------- */
const PRONOMS = ['I', 'you', 'he', 'we', 'you', 'they'];
const PRONOMS_LONGS = ['I', 'you', 'he / she / it', 'we', 'you', 'they'];
const IMPER_PERSONNES = ['toi', 'nous'];

/* ---------------------------------------------------------
   Les temps enseignés
   Les noms restent anglais : c'est ainsi qu'on les apprend en
   classe, et traduire « present perfect » n'aiderait personne.
   --------------------------------------------------------- */
const TEMPS = [
  { code:'presentSimple',   mode:'Present', nom:'present simple',              pers:6 },
  { code:'presentCont',     mode:'Present', nom:'present continuous',          pers:6 },
  { code:'presentPerfect',  mode:'Present', nom:'present perfect',             pers:6 },
  { code:'presentPerfCont', mode:'Present', nom:'present perfect continuous',  pers:6 },

  { code:'pastSimple',      mode:'Past',    nom:'past simple',                 pers:6 },
  { code:'pastCont',        mode:'Past',    nom:'past continuous',             pers:6 },
  { code:'pastPerfect',     mode:'Past',    nom:'past perfect',                pers:6 },
  { code:'pastPerfCont',    mode:'Past',    nom:'past perfect continuous',     pers:6 },

  { code:'futureWill',      mode:'Future',  nom:'future simple (will)',        pers:6 },
  { code:'futureGoing',     mode:'Future',  nom:'going to',                    pers:6 },
  { code:'futureCont',      mode:'Future',  nom:'future continuous',           pers:6 },
  { code:'futurePerfect',   mode:'Future',  nom:'future perfect',              pers:6 },

  { code:'conditional',     mode:'Conditional', nom:'conditional (would)',     pers:6 },
  { code:'conditionalPerf', mode:'Conditional', nom:'conditional perfect',     pers:6 },

  { code:'imperatif',       mode:'Imperative', nom:'imperative', pers:2, imperatif:true },

  { code:'infinitif',       mode:'Forms',   nom:'infinitive',                  pers:1 },
  { code:'participePresent',mode:'Forms',   nom:'-ing form',                   pers:1 },
  { code:'participePasse',  mode:'Forms',   nom:'past participle',             pers:1 }
];

/* ---------------------------------------------------------
   Orthographe : le -s de la troisième personne
   --------------------------------------------------------- */
const VOYELLES = 'aeiou';
const estVoyelle = (c) => VOYELLES.indexOf(String(c).toLowerCase()) >= 0;

function troisieme(base){
  if (base === 'be') return 'is';
  if (base === 'have') return 'has';
  if (base === 'do') return 'does';
  if (base === 'go') return 'goes';
  // consonne + y → ies : carry → carries, mais play → plays
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + 'ies';
  // sifflantes et -o : add, wash, watch, fix, buzz, go
  if (/(s|sh|ch|x|z|o)$/.test(base)) return base + 'es';
  return base + 's';
}

/* ---------------------------------------------------------
   Orthographe : le redoublement de la consonne finale

   C'est la règle la plus délicate, parce qu'elle dépend de
   l'accent tonique, que rien dans l'écriture ne révèle. On
   applique donc ce qui est sûr — les monosyllabes —, la règle
   britannique du -l, et une liste explicite pour le reste.
   Enseigner l'anglais britannique suppose « travelled ».
   --------------------------------------------------------- */
const DOUBLENT = [
  'begin','forget','regret','prefer','refer','occur','admit','permit','commit',
  'submit','omit','transmit','control','patrol','equip','upset','propel','compel',
  'rebel','expel','repel','kidnap','worship','befit','acquit','allot','rebut',
  'unwrap','handicap','outfit','overrun','misfit'
];

function syllabes(base){
  const v = base.toLowerCase().replace(/e$/, '').match(/[aeiouy]+/g);
  return v ? v.length : 1;
}

function doubleFinale(base){
  const b = base.toLowerCase();
  if (!/[^aeiou]$/.test(b)) return false;         // finit par une voyelle
  if (/[wxy]$/.test(b)) return false;             // show, fix, play : jamais
  if (!/[aeiou][^aeiou]$/.test(b)) return false;  // il faut voyelle + consonne
  if (/[aeiou][aeiou][^aeiou]$/.test(b)) return false;  // deux voyelles : rain, need
  if (b.length < 3 && !/^[a-z]{2}$/.test(b)) return false;

  if (syllabes(b) === 1) return true;             // stop, run, plan, beg
  if (/l$/.test(b)) return true;                  // travel, cancel : anglais britannique
  return DOUBLENT.indexOf(b) >= 0;
}

/* ---------------------------------------------------------
   Orthographe : le -ing
   --------------------------------------------------------- */
const IE_EN_Y = ['lie', 'die', 'tie', 'vie'];

/* Le -e se garde là où le supprimer créerait une confusion ou une
   prononciation fausse : dye → dyeing, pour ne pas rejoindre dying. */
const GARDENT_LE_E = ['dye', 'singe', 'tinge', 'swinge', 'hoe', 'shoe', 'toe', 'canoe', 'age', 'eye'];

function ing(base){
  const b = base.toLowerCase();
  if (IE_EN_Y.indexOf(b) >= 0) return b.slice(0, -2) + 'ying';   // lie → lying
  if (b === 'be') return 'being';
  if (GARDENT_LE_E.indexOf(b) >= 0) return b + 'ing';            // dye → dyeing
  if (/c$/.test(b)) return b + 'king';                            // panic → panicking
  if (/ee$|oe$|ye$/.test(b)) return b + 'ing';                    // see, agree, hoe
  if (/e$/.test(b) && b.length > 2) return b.slice(0, -1) + 'ing'; // make → making
  if (doubleFinale(b)) return b + b.slice(-1) + 'ing';
  return b + 'ing';
}

/* ---------------------------------------------------------
   Orthographe : le -ed des verbes réguliers
   --------------------------------------------------------- */
function ed(base){
  const b = base.toLowerCase();
  if (/e$/.test(b)) return b + 'd';                               // like → liked
  if (/[^aeiou]y$/.test(b)) return b.slice(0, -1) + 'ied';        // carry → carried
  if (/c$/.test(b)) return b + 'ked';                             // panic → panicked
  if (doubleFinale(b)) return b + b.slice(-1) + 'ed';
  return b + 'ed';
}

global.__EN_ORTHO = { troisieme, ing, ed, doubleFinale, syllabes };

/* ---------------------------------------------------------
   Les verbes irréguliers
   base : [prétérit, participe passé]
   Un verbe irrégulier ne se calcule pas, il se sait : cette
   table est donc la seule source, et chaque entrée a été
   vérifiée une à une.
   --------------------------------------------------------- */
const IRREGULIERS = {
  'be':['was','been'], 'have':['had','had'], 'do':['did','done'], 'go':['went','gone'],
  'say':['said','said'], 'make':['made','made'], 'take':['took','taken'], 'come':['came','come'],
  'see':['saw','seen'], 'know':['knew','known'], 'get':['got','got'], 'give':['gave','given'],
  'find':['found','found'], 'think':['thought','thought'], 'tell':['told','told'],
  'become':['became','become'], 'show':['showed','shown'], 'leave':['left','left'],
  'feel':['felt','felt'], 'put':['put','put'], 'bring':['brought','brought'],
  'begin':['began','begun'], 'keep':['kept','kept'], 'hold':['held','held'],
  'write':['wrote','written'], 'stand':['stood','stood'], 'hear':['heard','heard'],
  'let':['let','let'], 'mean':['meant','meant'], 'set':['set','set'], 'meet':['met','met'],
  'run':['ran','run'], 'pay':['paid','paid'], 'sit':['sat','sat'], 'speak':['spoke','spoken'],
  'lie':['lay','lain'], 'lead':['led','led'], 'read':['read','read'], 'grow':['grew','grown'],
  'lose':['lost','lost'], 'fall':['fell','fallen'], 'send':['sent','sent'],
  'build':['built','built'], 'understand':['understood','understood'],
  'draw':['drew','drawn'], 'break':['broke','broken'], 'spend':['spent','spent'],
  'cut':['cut','cut'], 'rise':['rose','risen'], 'drive':['drove','driven'],
  'buy':['bought','bought'], 'wear':['wore','worn'], 'choose':['chose','chosen'],
  'seek':['sought','sought'], 'throw':['threw','thrown'], 'catch':['caught','caught'],
  'deal':['dealt','dealt'], 'win':['won','won'], 'forget':['forgot','forgotten'],
  'eat':['ate','eaten'], 'teach':['taught','taught'], 'sell':['sold','sold'],
  'fight':['fought','fought'], 'drink':['drank','drunk'], 'swim':['swam','swum'],
  'sing':['sang','sung'], 'ring':['rang','rung'], 'sleep':['slept','slept'],
  'fly':['flew','flown'], 'ride':['rode','ridden'], 'sink':['sank','sunk'],
  'blow':['blew','blown'], 'wake':['woke','woken'], 'shake':['shook','shaken'],
  'steal':['stole','stolen'], 'spread':['spread','spread'], 'hit':['hit','hit'],
  'hurt':['hurt','hurt'], 'cost':['cost','cost'], 'shut':['shut','shut'],
  'hide':['hid','hidden'], 'bite':['bit','bitten'], 'freeze':['froze','frozen'],
  'forgive':['forgave','forgiven'], 'lend':['lent','lent'], 'bend':['bent','bent'],
  'feed':['fed','fed'], 'shoot':['shot','shot'], 'sweep':['swept','swept'],
  'weep':['wept','wept'], 'creep':['crept','crept'], 'dig':['dug','dug'],
  'hang':['hung','hung'], 'stick':['stuck','stuck'], 'strike':['struck','struck'],
  'swear':['swore','sworn'], 'tear':['tore','torn'], 'bear':['bore','borne'],
  'beat':['beat','beaten'], 'burn':['burnt','burnt'], 'learn':['learnt','learnt'],
  'dream':['dreamt','dreamt'], 'smell':['smelt','smelt'], 'spell':['spelt','spelt'],
  'spill':['spilt','spilt'], 'spoil':['spoilt','spoilt'], 'kneel':['knelt','knelt'],
  'lay':['laid','laid'], 'light':['lit','lit'], 'lose':['lost','lost'],
  'quit':['quit','quit'], 'shine':['shone','shone'], 'shrink':['shrank','shrunk'],
  'sow':['sowed','sown'], 'spin':['spun','spun'], 'split':['split','split'],
  'spring':['sprang','sprung'], 'stink':['stank','stunk'], 'strive':['strove','striven'],
  'swing':['swung','swung'], 'thrust':['thrust','thrust'], 'tread':['trod','trodden'],
  'upset':['upset','upset'], 'weave':['wove','woven'], 'wind':['wound','wound'],
  'withdraw':['withdrew','withdrawn'], 'arise':['arose','arisen'], 'awake':['awoke','awoken'],
  'bind':['bound','bound'], 'bleed':['bled','bled'], 'breed':['bred','bred'],
  'burst':['burst','burst'], 'cast':['cast','cast'], 'cling':['clung','clung'],
  'flee':['fled','fled'], 'fling':['flung','flung'], 'forbid':['forbade','forbidden'],
  'grind':['ground','ground'], 'hurt':['hurt','hurt'], 'lean':['leant','leant'],
  'leap':['leapt','leapt'], 'mistake':['mistook','mistaken'], 'overcome':['overcame','overcome'],
  'rid':['rid','rid'], 'seek':['sought','sought'], 'sew':['sewed','sewn'],
  'shed':['shed','shed'], 'slide':['slid','slid'], 'sting':['stung','stung'],
  'undergo':['underwent','undergone'], 'wet':['wet','wet'], 'wring':['wrung','wrung']
};

/* Les composés se déduisent du verbe simple : understand est déjà là,
   mais retell, rewrite, foresee ou misunderstand n'ont pas à l'être. */
const PREFIXES = ['re', 'un', 'mis', 're', 'over', 'under', 'out', 'fore', 'with'];

function irregulierDe(base){
  if (IRREGULIERS[base]) return IRREGULIERS[base];
  for (const p of PREFIXES){
    if (base.length >= p.length + 2 && base.slice(0, p.length) === p){
      const reste = base.slice(p.length);
      if (IRREGULIERS[reste]){
        return [p + IRREGULIERS[reste][0], p + IRREGULIERS[reste][1]];
      }
    }
  }
  return null;
}

/* ---------------------------------------------------------
   La conjugaison
   --------------------------------------------------------- */
function radicaux(verbe){
  const base = String(verbe || '').toLowerCase().trim().replace(/^to\s+/, '');
  if (!/^[a-z][a-z' -]{1,28}$/.test(base)) return null;

  const irr = irregulierDe(base);
  return {
    base: base,
    tps: troisieme(base),                       // he works
    ing: ing(base),                             // working
    past: irr ? irr[0] : ed(base),              // worked / went
    pp: irr ? irr[1] : ed(base),                // worked / gone
    irregulier: !!irr
  };
}

/* « be » ne suit aucune règle : ses formes sont posées à la main. */
const ETRE_PRESENT = ['am', 'are', 'is', 'are', 'are', 'are'];
const ETRE_PASSE   = ['was', 'were', 'was', 'were', 'were', 'were'];

function conjugue(verbe){
  const r = radicaux(verbe);
  if (!r) return null;

  const troisiemePersonne = (t) => [0,1,2,3,4,5].map(i => i === 2 ? t : r.base);
  const avec = (aux, suite) => aux.map(a => a + ' ' + suite);
  const partout = (s) => [s, s, s, s, s, s];

  const etreP = (r.base === 'be') ? ETRE_PRESENT : ETRE_PRESENT;
  const etreQ = (r.base === 'be') ? ETRE_PASSE : ETRE_PASSE;
  const avoirP = ['have', 'have', 'has', 'have', 'have', 'have'];

  const out = {
    infinitif: ['to ' + r.base],
    participePresent: [r.ing],
    participePasse: [r.pp],

    presentSimple: (r.base === 'be') ? ETRE_PRESENT.slice() : troisiemePersonne(r.tps),
    presentCont:   avec(etreP, r.ing),
    presentPerfect: avec(avoirP, r.pp),
    presentPerfCont: avec(avoirP, 'been ' + r.ing),

    pastSimple: (r.base === 'be') ? ETRE_PASSE.slice() : partout(r.past),
    pastCont:   avec(etreQ, r.ing),
    pastPerfect: partout('had ' + r.pp),
    pastPerfCont: partout('had been ' + r.ing),

    futureWill: partout('will ' + r.base),
    futureGoing: avec(etreP, 'going to ' + r.base),
    futureCont: partout('will be ' + r.ing),
    futurePerfect: partout('will have ' + r.pp),

    conditional: partout('would ' + r.base),
    conditionalPerf: partout('would have ' + r.pp),

    imperatif: [r.base, "let's " + r.base],

    base: r.base,
    irregulier: r.irregulier,
    troisieme: r.tps,
    preterit: r.past,
    participe: r.pp
  };
  return out;
}

function forme(verbe, temps, personne){
  const c = conjugue(verbe);
  if (!c || !c[temps]) return null;
  return c[temps][personne] || null;
}

function connait(verbe){ return !!radicaux(verbe); }

/** Le sujet à afficher devant la forme. */
function sujet(temps, personne){
  const def = TEMPS.find(x => x.code === temps);
  if (!def || def.pers !== 6) return '';
  return PRONOMS[personne] + ' ';
}

function sansAccent(s){
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Formes également acceptées : contractions et orthographe américaine.
 * Même signature que le moteur français — (verbe, temps, personne) —
 * pour que la page n'ait pas à savoir quel moteur est actif.
 */
function variantes(verbe, temps, personne){
  const c = conjugue(verbe);
  if (!c || !c[temps]) return [];
  const attendu = c[temps][personne];
  if (!attendu) return [];
  return variantesDe(attendu).slice(1);   // la forme canonique est déjà connue
}

/* Les formes stockées ne portent pas le pronom — « will work », et non
   « I will work » —, donc les contractions n'ont pas lieu d'être ici.
   Restent les deux véritables variantes orthographiques. */
function variantesDe(attendu){
  const v = [attendu];
  // l'anglais américain ne redouble pas le -l : traveled, cancelling
  if (/lled|lling/.test(attendu)){
    v.push(attendu.replace(/lled/g, 'led').replace(/lling/g, 'ling'));
  }
  // burnt ou burned, learnt ou learned : les deux se disent
  const doubles = { burnt:'burned', learnt:'learned', dreamt:'dreamed', smelt:'smelled',
                    spelt:'spelled', spilt:'spilled', spoilt:'spoiled', leant:'leaned',
                    leapt:'leaped', knelt:'kneeled' };
  Object.keys(doubles).forEach(k => {
    if (attendu.indexOf(k) >= 0) v.push(attendu.replace(k, doubles[k]));
  });
  return v;
}

const API = {
  langue: 'en',
  TEMPS, PRONOMS, PRONOMS_LONGS, IMPER_PERSONNES,
  conjugue, forme, connait, sujet, sansAccent, variantes,
  irreguliers: Object.keys(IRREGULIERS)
};

global.__EN_IRREG = { IRREGULIERS, irregulierDe };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
global.ConjugueurEN = API;

})(typeof window !== 'undefined' ? window : globalThis);
