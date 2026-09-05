"use strict";

/* =========================================================
   Les exercices de calcul, sans interface.

   Sept familles, calquées sur la progression romande. Chacune
   engendre ses questions à partir de réglages, et donne la
   réponse attendue : rien n'est stocké, tout est calculé.

   Le vocabulaire est celui de l'école — « livrets », « sauts » —
   pour qu'un élève retrouve ce que dit son enseignant.
   ========================================================= */
(function (global) {

/* ---------- outils ---------- */
function entre(a, b){ return a + Math.floor(Math.random() * (b - a + 1)); }
function piocher(t){ return t[Math.floor(Math.random() * t.length)]; }
function melanger(t){
  const c = t.slice();
  for (let i = c.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

/* Une question : ce qu'on montre, ce qu'on attend, et de quoi
   fabriquer un indice honnête sans donner la réponse. */
function question(enonce, reponse, aide){
  return { enonce: enonce, reponse: String(reponse), aide: aide || '' };
}

/* =========================================================
   1. Les livrets
   ========================================================= */
function livrets(r){
  const choisis = (r.livrets && r.livrets.length) ? r.livrets : [2, 5, 10];
  const max = r.jusqua || 10;
  const a = piocher(choisis);
  const b = entre(1, max);
  // le livret n'est pas toujours en premier : l'ordre ne doit pas devenir un repère
  const inverse = (r.sens === 'inverse') || (r.sens !== 'direct' && Math.random() < 0.5);
  const g = inverse ? b : a;
  const d = inverse ? a : b;
  return question(g + ' × ' + d, a * b, 'C\u2019est le livret de ' + a + '.');
}

/* =========================================================
   2. Les compléments
   ========================================================= */
function complements(r){
  const cible = r.cible || 100;
  let n;
  if (cible <= 20) n = entre(1, cible - 1);
  else if (cible === 100) n = r.dizaines ? entre(1, 9) * 10 : entre(1, 99);
  else n = entre(1, cible - 1);
  return question(n + ' + ? = ' + cible, cible - n,
    'Combien manque-t-il à ' + n + ' pour atteindre ' + cible + ' ?');
}

/* =========================================================
   3. Les tables de division
   ========================================================= */
function divisions(r){
  const choisis = (r.livrets && r.livrets.length) ? r.livrets : [2, 5, 10];
  const max = r.jusqua || 10;
  const d = piocher(choisis);
  const q = entre(1, max);
  return question((d * q) + ' : ' + d, q, 'Dans le livret de ' + d + '.');
}

/* =========================================================
   4. Les calculs à trous
   ========================================================= */
function trous(r){
  const max = r.jusqua || 100;
  const soustraction = (r.operation === 'soustraction')
    || (r.operation !== 'addition' && Math.random() < 0.5);

  if (!soustraction){
    const total = entre(Math.max(3, Math.floor(max / 3)), max);
    const a = entre(1, total - 1);
    return (Math.random() < 0.5)
      ? question(a + ' + ? = ' + total, total - a, 'Que faut-il ajouter à ' + a + ' ?')
      : question('? + ' + a + ' = ' + total, total - a, 'Le total moins ' + a + '.');
  }
  const debut = entre(Math.max(3, Math.floor(max / 3)), max);
  const reste = entre(1, debut - 1);
  return (Math.random() < 0.5)
    ? question(debut + ' − ? = ' + reste, debut - reste, 'De ' + reste + ' à ' + debut + '.')
    : question('? − ' + (debut - reste) + ' = ' + reste, debut, 'Le reste plus ce qu\u2019on a retiré.');
}

/* =========================================================
   5. Les progressions (les sauts)
   ========================================================= */
function progressions(r){
  const montre = r.montre || 4;          // termes montrés
  const demandes = r.demandes || 2;      // termes à trouver
  const type = r.type || 'plus';
  let depart, saut;

  if (type === 'fois'){
    saut = piocher(r.sauts && r.sauts.length ? r.sauts : [2, 3]);
    depart = entre(1, 5);
  } else {
    saut = piocher(r.sauts && r.sauts.length ? r.sauts : [2, 3, 5, 10]);
    depart = (type === 'moins') ? entre(saut * (montre + demandes), 200) : entre(0, 20);
  }

  const suite = [];
  let v = depart;
  for (let i = 0; i < montre + demandes; i++){
    suite.push(v);
    v = (type === 'fois') ? v * saut : (type === 'moins' ? v - saut : v + saut);
  }
  const visibles = suite.slice(0, montre);
  const attendus = suite.slice(montre);
  const signe = type === 'fois' ? '× ' + saut : (type === 'moins' ? '− ' + saut : '+ ' + saut);

  return question(
    visibles.join(' ; ') + ' ; ' + attendus.map(() => '?').join(' ; '),
    attendus.join(' ; '),
    'Regarde ce qui sépare deux nombres voisins.'
  );
}

/* =========================================================
   6. Les carrés et les racines carrées
   ========================================================= */
function carres(r){
  const max = r.jusqua || 12;
  const n = entre(1, max);
  const racine = (r.sens === 'racine')
    || (r.sens !== 'carre' && Math.random() < 0.5);
  return racine
    ? question('√' + (n * n), n, 'Quel nombre multiplié par lui-même donne ' + (n * n) + ' ?')
    : question(n + '²', n * n, n + ' × ' + n + '.');
}

/* =========================================================
   7. Les doubles et les moitiés
   ========================================================= */
function doubles(r){
  const max = r.jusqua || 100;
  const moitie = (r.sens === 'moitie')
    || (r.sens !== 'double' && Math.random() < 0.5);
  if (moitie){
    const n = entre(1, Math.floor(max / 2)) * 2;   // toujours pair : la moitié reste entière
    return question('la moitié de ' + n, n / 2, 'Partage ' + n + ' en deux parts égales.');
  }
  const n = entre(1, max);
  return question('le double de ' + n, n * 2, n + ' + ' + n + '.');
}

/* =========================================================
   Les quatre opérations

   Ici on ne calcule plus de tête : on pose l'opération. Deux
   réglages commandent tout, l'ordre de grandeur des nombres et
   le nombre de décimales — c'est ainsi que la difficulté se
   gradue à l'école.

   Tous les calculs se font sur des entiers, puis on replace la
   virgule : additionner 0,1 et 0,2 en virgule flottante donne
   0,30000000000000004, ce qu'un élève aurait du mal à écrire.
   ========================================================= */
const ORDRES = [10, 20, 50, 100, 1000, 10000, 100000];

function facteur(decimales){ return Math.pow(10, decimales || 0); }

/** Met un entier mis à l'échelle sous sa forme décimale, virgule comprise. */
function decimal(entier, decimales){
  if (!decimales) return String(entier);
  const s = (entier / facteur(decimales)).toFixed(decimales);
  return s.replace('.', ',');
}

function addition(r){
  const ordre = r.ordre || 100;
  const d = r.decimales || 0;
  const termes = Math.max(2, Math.min(4, r.termes || 2));
  const f = facteur(d);

  const parts = [];
  let somme = 0;
  for (let i = 0; i < termes; i++){
    // chaque terme est de l'ordre demandé, divisé par le nombre de termes
    const n = entre(1, Math.max(2, Math.round(ordre * f / termes)));
    parts.push(n);
    somme += n;
  }
  return question(
    parts.map(n => decimal(n, d)).join(' + '),
    decimal(somme, d),
    'Aligne les virgules avant d\u2019additionner.'
  );
}

function soustraction(r){
  const ordre = r.ordre || 100;
  const d = r.decimales || 0;
  const f = facteur(d);

  const grand = entre(Math.max(3, Math.round(ordre * f / 3)), Math.round(ordre * f));
  const petit = entre(1, grand - 1);
  return question(
    decimal(grand, d) + ' − ' + decimal(petit, d),
    decimal(grand - petit, d),
    'Aligne les virgules, puis retiens si besoin.'
  );
}

function multiplication(r){
  const ordre = r.ordre || 100;
  const d = r.decimales || 0;
  const chiffres = r.multiplicateur || 1;      // 1, 2 ou 3 chiffres
  const f = facteur(d);

  const a = entre(2, Math.max(3, Math.round(ordre * f)));
  const b = (chiffres === 1) ? entre(2, 9)
          : (chiffres === 2) ? entre(11, 99)
          : entre(101, 999);
  return question(
    decimal(a, d) + ' × ' + b,
    decimal(a * b, d),
    d ? 'Le produit a autant de décimales que le premier nombre.'
      : 'Pose la multiplication, chiffre par chiffre.'
  );
}

function division(r){
  const ordre = r.ordre || 100;
  const chiffres = r.diviseur || 1;
  const avecReste = !!r.reste;

  const b = (chiffres === 1) ? entre(2, 9) : entre(11, 99);
  const quotient = entre(2, Math.max(3, Math.round(ordre / b)));
  const reste = avecReste ? entre(0, b - 1) : 0;
  const a = quotient * b + reste;

  return question(
    a + ' : ' + b,
    reste ? (quotient + ' reste ' + reste) : String(quotient),
    avecReste ? 'Réponds sous la forme « 12 reste 3 ».'
              : 'Combien de fois ' + b + ' tient-il dans ' + a + ' ?'
  );
}

/* =========================================================
   Pour les plus grands

   Six familles du cycle 3. Toutes engendrent leurs questions
   par construction plutôt que par tirage-puis-vérification :
   on part de la réponse et l'on remonte à l'énoncé, ce qui
   garantit des nombres qui tombent juste.
   ========================================================= */

function pgcd(a, b){ a = Math.abs(a); b = Math.abs(b); while (b){ [a, b] = [b, a % b]; } return a || 1; }
function ppcm(a, b){ return Math.abs(a * b) / pgcd(a, b); }

/** Un nombre négatif s'écrit entre parenthèses dans un calcul. */
function relatif(n){ return n < 0 ? '(−' + Math.abs(n) + ')' : String(n); }
function signe(n){ return n < 0 ? '−' + Math.abs(n) : String(n); }

/* ---------------------------------------------------------
   1. Les priorités des opérations
   --------------------------------------------------------- */
function priorites(r){
  const niveau = r.niveau || 2;          // 1 : deux opérations, 3 : avec puissances
  const parentheses = (r.parentheses !== false) && niveau >= 2;

  for (let essai = 0; essai < 60; essai++){
    const a = entre(2, 12), b = entre(2, 9), c = entre(2, 12);
    const plus = piocher(['+', '−']);
    let enonce, valeur;

    const forme = (niveau === 1) ? entre(1, 2)
                : (niveau === 2) ? entre(1, 4)
                : entre(1, 6);

    if (forme === 1){                     // a + b × c
      valeur = (plus === '+') ? a + b * c : a - b * c;
      enonce = a + ' ' + plus + ' ' + b + ' × ' + c;
    } else if (forme === 2){              // a × b + c
      valeur = (plus === '+') ? a * b + c : a * b - c;
      enonce = a + ' × ' + b + ' ' + plus + ' ' + c;
    } else if (forme === 3 && parentheses){  // (a + b) × c
      valeur = (plus === '+') ? (a + b) * c : (a - b) * c;
      enonce = '(' + a + ' ' + plus + ' ' + b + ') × ' + c;
    } else if (forme === 4 && parentheses){  // a × (b + c)
      valeur = (plus === '+') ? a * (b + c) : a * (b - c);
      enonce = a + ' × (' + b + ' ' + plus + ' ' + c + ')';
    } else if (forme === 5){              // a² + b × c
      valeur = a * a + b * c;
      enonce = a + '² + ' + b + ' × ' + c;
    } else {                              // a × b − c²
      valeur = a * b - c * c;
      enonce = a + ' × ' + b + ' − ' + c + '²';
    }
    if (!enonce) continue;
    if (!r.negatifs && valeur < 0) continue;
    if (!Number.isInteger(valeur)) continue;
    return question(enonce, valeur,
      'Multiplications et divisions d\u2019abord, additions et soustractions ensuite'
      + (parentheses ? ' — mais les parenthèses passent avant tout.' : '.'));
  }
  return question('2 + 3 × 4', 14, 'La multiplication passe avant l\u2019addition.');
}

/* ---------------------------------------------------------
   2. Les entiers relatifs
   --------------------------------------------------------- */
function relatifs(r){
  const max = r.jusqua || 20;
  const ops = r.operation || 'addition';
  const a = entre(-max, max) || 1;
  const b = entre(-max, max) || 1;

  if (ops === 'multiplication'){
    return question(relatif(a) + ' × ' + relatif(b), signe(a * b),
      'Deux signes identiques donnent un résultat positif.');
  }
  if (ops === 'division'){
    const q = entre(-9, 9) || 2;
    const d = entre(-9, 9) || 2;
    return question(relatif(q * d) + ' : ' + relatif(d), signe(q),
      'Le signe suit la même règle qu\u2019à la multiplication.');
  }
  const plus = Math.random() < 0.5;
  return question(relatif(a) + (plus ? ' + ' : ' − ') + relatif(b),
    signe(plus ? a + b : a - b),
    'Soustraire un nombre revient à ajouter son opposé.');
}

/* ---------------------------------------------------------
   3. Les fractions
   --------------------------------------------------------- */
function fraction(n, d){
  if (d < 0){ n = -n; d = -d; }
  const g = pgcd(n, d);
  const nn = n / g, dd = d / g;
  if (dd === 1) return String(nn);
  return signe(nn) + '/' + dd;
}

function fractions(r){
  const ops = r.operation || 'addition';
  const max = r.jusqua || 12;

  if (ops === 'simplifier'){
    const d = entre(2, max);
    const n = entre(1, max);
    const k = entre(2, 6);
    return question('Simplifie ' + (n * k) + '/' + (d * k), fraction(n, d),
      'Cherche le plus grand diviseur commun.');
  }
  if (ops === 'multiplication'){
    const a = entre(1, max), b = entre(2, max), c = entre(1, max), d = entre(2, max);
    return question(a + '/' + b + ' × ' + c + '/' + d, fraction(a * c, b * d),
      'On multiplie les numérateurs entre eux, et les dénominateurs entre eux.');
  }
  if (ops === 'division'){
    const a = entre(1, max), b = entre(2, max), c = entre(1, max), d = entre(2, max);
    return question(a + '/' + b + ' : ' + c + '/' + d, fraction(a * d, b * c),
      'Diviser, c\u2019est multiplier par l\u2019inverse.');
  }
  // addition et soustraction : dénominateurs différents
  const b = entre(2, max), d = entre(2, max);
  const a = entre(1, b * 2), c = entre(1, d * 2);
  const m = ppcm(b, d);
  const moins = (ops === 'soustraction') || (ops === 'melange' && Math.random() < 0.5);
  const num = moins ? (a * (m / b) - c * (m / d)) : (a * (m / b) + c * (m / d));
  if (moins && num < 0){
    return question(c + '/' + d + ' − ' + a + '/' + b, fraction(-num, m),
      'Mets les deux fractions au même dénominateur.');
  }
  return question(a + '/' + b + (moins ? ' − ' : ' + ') + c + '/' + d, fraction(num, m),
    'Mets les deux fractions au même dénominateur : ' + m + '.');
}

/* ---------------------------------------------------------
   4. Les changements d'unités
   --------------------------------------------------------- */
const UNITES = {
  longueur: { nom:'longueur', echelles:[['km',1000],['m',1],['dm',0.1],['cm',0.01],['mm',0.001]] },
  masse:    { nom:'masse',    echelles:[['t',1000],['kg',1],['g',0.001],['mg',0.000001]] },
  capacite: { nom:'capacité', echelles:[['l',1],['dl',0.1],['cl',0.01],['ml',0.001]] },
  aire:     { nom:'aire',     echelles:[['km²',1000000],['ha',10000],['a',100],['m²',1],['dm²',0.01],['cm²',0.0001]] },
  volume:   { nom:'volume',   echelles:[['m³',1000],['dm³',1],['cm³',0.001],['mm³',0.000001]] }
};

function unites(r){
  const cle = r.grandeur && UNITES[r.grandeur] ? r.grandeur : 'longueur';
  const ech = UNITES[cle].echelles;

  for (let essai = 0; essai < 40; essai++){
    const i = entre(0, ech.length - 1);
    let j = entre(0, ech.length - 1);
    if (i === j) continue;
    // on limite l'écart : convertir des mm en km n'apprend rien de plus
    if (Math.abs(i - j) > (r.ecart || 2)) continue;

    const valeur = entre(1, 999) / (Math.random() < 0.4 ? 10 : 1);
    const facteurConv = ech[i][1] / ech[j][1];
    const resultat = valeur * facteurConv;
    if (resultat < 0.001 || resultat > 1000000) continue;

    const propre = (x) => {
      const s = x.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
      return s.replace('.', ',');
    };
    return question(propre(valeur) + ' ' + ech[i][0] + ' = ? ' + ech[j][0],
      propre(resultat),
      cle === 'aire' ? 'Chaque échelon vaut 100 pour les aires.'
      : cle === 'volume' ? 'Chaque échelon vaut 1000 pour les volumes.'
      : 'Chaque échelon vaut 10.');
  }
  return question('1 km = ? m', '1000', 'Un kilomètre vaut mille mètres.');
}

/* ---------------------------------------------------------
   5. Les pourcents
   --------------------------------------------------------- */
function pourcents(r){
  const ops = r.operation || 'pourcent';
  const pcts = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80];
  const p = piocher(pcts);

  if (ops === 'rabais'){
    const prix = entre(2, 40) * 10;
    const reste = prix * (100 - p) / 100;
    return question('Un article coûte ' + prix + ' francs. Rabais de ' + p + ' %. Nouveau prix ?',
      Number.isInteger(reste) ? String(reste) : reste.toFixed(2).replace('.', ','),
      'Calcule le rabais, puis retire-le du prix.');
  }
  if (ops === 'trouver'){
    const total = entre(2, 40) * 10;
    const part = total * p / 100;
    if (!Number.isInteger(part)) return pourcents(r);
    return question(part + ' est quel pourcentage de ' + total + ' ?', p + ' %',
      'Divise la part par le total, puis multiplie par cent.');
  }
  const n = entre(2, 40) * 10;
  const v = n * p / 100;
  return question(p + ' % de ' + n,
    Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ','),
    'Un pour-cent, c\u2019est le centième.');
}

/* ---------------------------------------------------------
   6. L'algèbre
   --------------------------------------------------------- */
function terme(coef, lettre){
  if (coef === 0) return '0';
  if (coef === 1) return lettre;
  if (coef === -1) return '−' + lettre;
  return signe(coef) + lettre;
}

function algebre(r){
  const ops = r.operation || 'reduire';
  const x = r.lettre || 'x';

  if (ops === 'developper'){
    const a = entre(2, 9), b = entre(1, 9), c = entre(1, 9);
    const moins = Math.random() < 0.4;
    return question(a + '(' + b + x + (moins ? ' − ' : ' + ') + c + ')',
      terme(a * b, x) + (moins ? ' − ' : ' + ') + (a * c),
      'Multiplie chaque terme de la parenthèse.');
  }
  if (ops === 'equation'){
    const sol = entre(1, 12);
    const a = entre(2, 9), b = entre(1, 20);
    const plus = Math.random() < 0.6;
    const droite = plus ? a * sol + b : a * sol - b;
    return question(a + x + (plus ? ' + ' : ' − ') + b + ' = ' + droite, x + ' = ' + sol,
      'Isole ' + x + ' : retire d\u2019abord ' + b + ', puis divise par ' + a + '.');
  }
  // réduire
  const a = entre(2, 9), b = entre(2, 9), c = entre(1, 9);
  const moins = Math.random() < 0.5;
  const coef = moins ? a - b : a + b;
  return question(a + x + (moins ? ' − ' : ' + ') + b + x + ' + ' + c,
    (coef === 0 ? '' : terme(coef, x) + ' + ') + c,
    'On n\u2019additionne que les termes semblables.');
}

/* =========================================================
   Les nombres

   Ce que l'on fait avec les nombres eux-mêmes, avant de les
   faire entrer dans un calcul : les décomposer, les comparer,
   les écrire autrement.
   ========================================================= */

/** Une question dont la réponse s'arrondit : on dit à combien. */
function questionArrondie(enonce, valeur, decimales, aide){
  const r = Number(valeur.toFixed(decimales));
  const q = question(enonce, String(r).replace('.', ','), aide);
  q.tolerance = Math.pow(10, -decimales) / 2;
  return q;
}

function facteursPremiers(n){
  const f = [];
  let m = n;
  for (let d = 2; d * d <= m; d++){
    while (m % d === 0){ f.push(d); m /= d; }
  }
  if (m > 1) f.push(m);
  return f;
}

function estPremier(n){
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

function diviseurs(r){
  const ops = r.operation || 'pgdc';
  const max = r.jusqua || 60;

  // on construit les nombres depuis leur diviseur commun : les réponses
  // tombent juste et restent dans les ordres de grandeur de l'école
  const g = entre(2, 12);
  const a = g * entre(2, Math.max(3, Math.floor(max / g)));
  const b = g * entre(2, Math.max(3, Math.floor(max / g)));

  if (ops === 'ppmc'){
    return question('PPMC de ' + a + ' et ' + b, ppcm(a, b),
      'Le plus petit nombre que les deux divisent.');
  }
  if (ops === 'premiers'){
    const n = entre(12, Math.max(40, max * 2));
    return question('Décompose ' + n + ' en facteurs premiers',
      facteursPremiers(n).join(' × '),
      'Divise par 2, puis 3, puis 5… jusqu\u2019à ne plus pouvoir.');
  }
  return question('PGDC de ' + a + ' et ' + b, pgcd(a, b),
    'Le plus grand nombre qui divise les deux.');
}

function scientifique(r){
  const sens = r.sens || 'vers';
  // la mantisse doit rester entre 1 et 10 : c'est la définition même
  const mantisse = (entre(100, 999) / 100);
  const exposant = entre(-4, 8) || 3;
  const ecriture = String(mantisse).replace('.', ',') + ' · 10^' + exposant;
  const valeur = mantisse * Math.pow(10, exposant);

  const decimal = (exposant >= 0)
    ? String(Math.round(valeur * 100) / 100).replace('.', ',')
    : valeur.toFixed(Math.max(0, 2 - exposant)).replace(/0+$/, '').replace('.', ',');

  if (sens === 'depuis'){
    return question('Écris ' + decimal + ' en notation scientifique', ecriture,
      'Un seul chiffre avant la virgule, puis la puissance de dix.');
  }
  return question('Écris ' + ecriture + ' en notation décimale', decimal,
    'Déplace la virgule de ' + Math.abs(exposant) + ' rang(s).');
}

function arrondis(r){
  const rang = r.rang || 'unite';
  const rangs = { millier:1000, centaine:100, dizaine:10, unite:1, dixieme:0.1, centieme:0.01 };
  const pas = rangs[rang] || 1;
  const nom = { millier:'au millier', centaine:'à la centaine', dizaine:'à la dizaine',
                unite:'à l\u2019unité', dixieme:'au dixième', centieme:'au centième' }[rang];

  const brut = (pas >= 1) ? entre(pas, pas * 100) : entre(1, 9999) / 100;
  const arrondi = Math.round(brut / pas) * pas;
  const afficher = (x) => {
    const s = (pas < 1) ? x.toFixed(pas === 0.1 ? 1 : 2) : String(Math.round(x));
    return s.replace('.', ',');
  };
  return question('Arrondis ' + String(brut).replace('.', ',') + ' ' + nom,
    afficher(arrondi),
    'Regarde le chiffre juste après le rang demandé.');
}

/* =========================================================
   Les grandeurs et les mesures
   ========================================================= */
function temps(r){
  const ops = r.operation || 'conversion';

  if (ops === 'somme'){
    const h1 = entre(0, 3), m1 = entre(0, 59), h2 = entre(0, 3), m2 = entre(0, 59);
    const total = (h1 * 60 + m1) + (h2 * 60 + m2);
    const deux = (n) => (n < 10 ? '0' : '') + n;
    return question(h1 + ' h ' + deux(m1) + ' + ' + h2 + ' h ' + deux(m2),
      Math.floor(total / 60) + ' h ' + deux(total % 60),
      'Soixante minutes font une heure.');
  }
  if (ops === 'secondes'){
    const m = entre(2, 200);
    return question(m + ' min = ? s', m * 60, 'Une minute vaut soixante secondes.');
  }
  const total = entre(70, 800);
  return question(total + ' min = ? h ? min',
    Math.floor(total / 60) + ' h ' + (total % 60) + ' min',
    'Divise par soixante : le quotient donne les heures, le reste les minutes.');
}

function vitesse(r){
  const cherche = r.cherche || 'vitesse';
  const v = entre(2, 24) * 5;              // km/h, multiple de 5
  const h = entre(1, 8);
  const d = v * h;

  if (cherche === 'distance'){
    return question('À ' + v + ' km/h pendant ' + h + ' h, quelle distance ?', d + ' km',
      'La distance, c\u2019est la vitesse multipliée par le temps.');
  }
  if (cherche === 'temps'){
    return question('Parcourir ' + d + ' km à ' + v + ' km/h prend combien de temps ?', h + ' h',
      'Le temps, c\u2019est la distance divisée par la vitesse.');
  }
  return question(d + ' km en ' + h + ' h, quelle vitesse moyenne ?', v + ' km/h',
    'La vitesse, c\u2019est la distance divisée par le temps.');
}

function echelles(r){
  const cherche = r.cherche || 'reel';
  const ech = piocher([100, 200, 500, 1000, 2000, 5000, 25000]);
  const surPlan = entre(1, 40) / (Math.random() < 0.5 ? 1 : 2);   // en cm
  const reelCm = surPlan * ech;
  const reelM = reelCm / 100;

  if (cherche === 'plan'){
    return question('À l\u2019échelle 1:' + ech + ', quelle longueur sur le plan pour '
      + String(reelM).replace('.', ',') + ' m ?',
      String(surPlan).replace('.', ',') + ' cm',
      'Divise la longueur réelle par ' + ech + '.');
  }
  return question('À l\u2019échelle 1:' + ech + ', ' + String(surPlan).replace('.', ',')
    + ' cm sur le plan valent combien en réalité ?',
    String(reelM).replace('.', ',') + ' m',
    'Multiplie par ' + ech + ', puis convertis en mètres.');
}

function interets(r){
  const cherche = r.cherche || 'interet';
  const capital = entre(1, 40) * 500;
  const taux = piocher([1, 1.5, 2, 2.5, 3, 4, 5]);
  const annees = entre(1, 6);
  const interet = capital * taux / 100 * annees;

  if (cherche === 'capital'){
    return question('Un capital rapporte ' + String(interet).replace('.', ',')
      + ' francs en ' + annees + ' an(s) à ' + String(taux).replace('.', ',') + ' %. Quel capital ?',
      capital + ' francs',
      'Remonte : divise par le taux et par la durée.');
  }
  return question('Capital de ' + capital + ' francs à ' + String(taux).replace('.', ',')
    + ' % pendant ' + annees + ' an(s). Intérêt ?',
    String(interet).replace('.', ',') + ' francs',
    'Intérêt = capital × taux ÷ 100 × durée.');
}

/* =========================================================
   Les fonctions
   ========================================================= */
function proportionnalite(r){
  const ops = r.operation || 'quatrieme';
  const k = entre(2, 12);
  const a = entre(2, 12);
  const c = entre(2, 15);

  if (ops === 'reconnaitre'){
    const proportionnel = Math.random() < 0.5;
    const b = a * k;
    const d = proportionnel ? c * k : c * k + entre(1, 5);
    return question('Le tableau ' + a + ' → ' + b + ' et ' + c + ' → ' + d
      + ' est-il proportionnel ? (oui ou non)', proportionnel ? 'oui' : 'non',
      'Compare les deux rapports.');
  }
  return question('Si ' + a + ' vaut ' + (a * k) + ', combien vaut ' + c + ' ?', c * k,
    'Cherche par combien on multiplie : ' + (a * k) + ' ÷ ' + a + '.');
}

function affine(r){
  const cherche = r.cherche || 'image';
  const a = entre(-6, 6) || 2;
  const b = entre(-10, 10);
  const x = entre(-6, 6);
  const y = a * x + b;
  const f = 'f(x) = ' + terme(a, 'x') + (b >= 0 ? ' + ' + b : ' − ' + Math.abs(b));

  if (cherche === 'antecedent'){
    return question(f + '. Pour quel x a-t-on f(x) = ' + signe(y) + ' ?', 'x = ' + signe(x),
      'Résous l\u2019équation ' + terme(a, 'x') + (b >= 0 ? ' + ' + b : ' − ' + Math.abs(b)) + ' = ' + signe(y) + '.');
  }
  if (cherche === 'pente'){
    const x2 = x + entre(1, 5);
    const y2 = a * x2 + b;
    return question('Une droite passe par (' + signe(x) + ' ; ' + signe(y) + ') et ('
      + signe(x2) + ' ; ' + signe(y2) + '). Quelle est sa pente ?', signe(a),
      'La pente, c\u2019est la différence des y divisée par celle des x.');
  }
  return question(f + '. Calcule f(' + signe(x) + ')', signe(y),
    'Remplace x par ' + signe(x) + '.');
}

/* =========================================================
   L'algèbre : le calcul littéral qui va plus loin
   ========================================================= */
function binomes(r){
  const ops = r.operation || 'developper';
  const x = r.lettre || 'x';

  if (ops === 'remarquable'){
    const a = entre(1, 9), b = entre(1, 9);
    const forme = entre(1, 3);
    if (forme === 1){
      return question('(' + terme(a, x) + ' + ' + b + ')²',
        terme(a * a, x + '²') + ' + ' + (2 * a * b) + x + ' + ' + (b * b),
        'Le carré du premier, le double produit, le carré du second.');
    }
    if (forme === 2){
      return question('(' + terme(a, x) + ' − ' + b + ')²',
        terme(a * a, x + '²') + ' − ' + (2 * a * b) + x + ' + ' + (b * b),
        'Attention au signe du double produit.');
    }
    return question('(' + terme(a, x) + ' + ' + b + ')(' + terme(a, x) + ' − ' + b + ')',
      terme(a * a, x + '²') + ' − ' + (b * b),
      'Le double produit disparaît.');
  }

  // (ax + b)(cx + d)
  const a = entre(1, 6), b = entre(-9, 9) || 2, c = entre(1, 6), d = entre(-9, 9) || 3;
  const p = a * c, q = a * d + b * c, cst = b * d;
  const morceau = (coef, suffixe) => (coef < 0 ? ' − ' : ' + ') + Math.abs(coef) + suffixe;
  return question('(' + terme(a, x) + (b >= 0 ? ' + ' + b : ' − ' + Math.abs(b)) + ')('
      + terme(c, x) + (d >= 0 ? ' + ' + d : ' − ' + Math.abs(d)) + ')',
    terme(p, x + '²') + morceau(q, x) + morceau(cst, ''),
    'Chaque terme du premier facteur multiplie chaque terme du second.');
}

function equation2(r){
  const forme = r.forme || 'carre';
  const x = r.lettre || 'x';

  if (forme === 'factorisee'){
    const p = entre(1, 9), q = entre(1, 9);
    // (x − p)(x − q) = 0 développé
    return question(x + '² − ' + (p + q) + x + ' + ' + (p * q) + ' = 0',
      (p <= q) ? (x + ' = ' + p + ' ou ' + x + ' = ' + q)
               : (x + ' = ' + q + ' ou ' + x + ' = ' + p),
      'Cherche deux nombres dont la somme fait ' + (p + q) + ' et le produit ' + (p * q) + '.');
  }
  const k = entre(1, 15);
  return question(x + '² = ' + (k * k), x + ' = ' + k + ' ou ' + x + ' = −' + k,
    'Un carré a deux racines, l\u2019une positive et l\u2019autre négative.');
}

/* =========================================================
   L'espace : la géométrie qui se calcule

   Les constructions à la règle et au compas ne se corrigent pas
   à l'écran ; ce qui se calcule, oui. Les nombres sont choisis
   pour tomber juste, et π vaut 3,14 comme au cours.
   ========================================================= */
const PI = 3.14;

/* Les triplets pythagoriciens évitent les racines approchées. */
const TRIPLETS = [[3,4,5],[6,8,10],[5,12,13],[9,12,15],[8,15,17],[12,16,20],
                  [7,24,25],[20,21,29],[10,24,26],[15,20,25],[18,24,30],[9,40,41]];

function aires(r){
  const forme = r.forme || 'rectangle';

  if (forme === 'triangle'){
    const b = entre(2, 20) * 2, h = entre(2, 15);
    return question('Aire d\u2019un triangle de base ' + b + ' cm et de hauteur ' + h + ' cm',
      (b * h / 2) + ' cm²', 'Base fois hauteur, divisé par deux.');
  }
  if (forme === 'disque'){
    const rayon = entre(1, 15);
    const a = PI * rayon * rayon;
    return question('Aire d\u2019un disque de rayon ' + rayon + ' cm (π = 3,14)',
      String(Math.round(a * 100) / 100).replace('.', ',') + ' cm²',
      'π multiplié par le rayon au carré.');
  }
  if (forme === 'trapeze'){
    const B = entre(4, 20), b = entre(2, B - 1), h = entre(2, 12) * 2;
    return question('Aire d\u2019un trapèze de bases ' + B + ' et ' + b + ' cm, hauteur ' + h + ' cm',
      ((B + b) * h / 2) + ' cm²', 'La somme des bases, fois la hauteur, divisé par deux.');
  }
  if (forme === 'perimetre'){
    const rayon = entre(1, 20);
    return question('Périmètre d\u2019un cercle de rayon ' + rayon + ' cm (π = 3,14)',
      String(Math.round(2 * PI * rayon * 100) / 100).replace('.', ',') + ' cm',
      'Deux fois π fois le rayon.');
  }
  const L = entre(2, 25), l = entre(2, 20);
  return question('Aire d\u2019un rectangle de ' + L + ' cm sur ' + l + ' cm',
    (L * l) + ' cm²', 'Longueur fois largeur.');
}

function volumes(r){
  const forme = r.forme || 'pave';

  if (forme === 'cylindre'){
    const rayon = entre(1, 10), h = entre(2, 20);
    const v = PI * rayon * rayon * h;
    return question('Volume d\u2019un cylindre de rayon ' + rayon + ' cm et de hauteur ' + h + ' cm (π = 3,14)',
      String(Math.round(v * 100) / 100).replace('.', ',') + ' cm³',
      'L\u2019aire du disque de base, multipliée par la hauteur.');
  }
  if (forme === 'pyramide'){
    const base = entre(2, 15) * 3;
    const h = entre(2, 12);
    return question('Volume d\u2019une pyramide de base ' + base + ' cm² et de hauteur ' + h + ' cm',
      (base * h / 3) + ' cm³', 'Le tiers de l\u2019aire de base fois la hauteur.');
  }
  const L = entre(2, 15), l = entre(2, 12), h = entre(2, 12);
  return question('Volume d\u2019un pavé de ' + L + ' × ' + l + ' × ' + h + ' cm',
    (L * l * h) + ' cm³', 'Longueur fois largeur fois hauteur.');
}

function pythagore(r){
  const [a, b, c] = piocher(TRIPLETS);
  const cherche = (r.cherche === 'cote') || (r.cherche !== 'hypotenuse' && Math.random() < 0.4);

  if (cherche){
    return question('Un triangle rectangle a une hypoténuse de ' + c + ' cm et un côté de '
      + a + ' cm. Quel est l\u2019autre côté ?', b + ' cm',
      'Le carré de l\u2019hypoténuse moins le carré du côté connu.');
  }
  return question('Un triangle rectangle a des côtés de ' + a + ' et ' + b
    + ' cm. Quelle est l\u2019hypoténuse ?', c + ' cm',
    'La somme des carrés des deux côtés.');
}

function angles(r){
  const ops = r.operation || 'triangle';

  if (ops === 'complementaire'){
    const a = entre(5, 85);
    const supplementaire = Math.random() < 0.5;
    return question(supplementaire
      ? 'Quel angle est supplémentaire de ' + a + '° ?'
      : 'Quel angle est complémentaire de ' + a + '° ?',
      (supplementaire ? 180 - a : 90 - a) + '°',
      supplementaire ? 'Deux angles supplémentaires font 180°.' : 'Deux angles complémentaires font 90°.');
  }
  if (ops === 'quadrilatere'){
    const a = entre(50, 120), b = entre(50, 120), c = entre(50, 120);
    if (a + b + c >= 350) return angles(r);
    return question('Trois angles d\u2019un quadrilatère mesurent ' + a + '°, ' + b + '° et '
      + c + '°. Quel est le quatrième ?', (360 - a - b - c) + '°',
      'Les quatre angles d\u2019un quadrilatère font 360°.');
  }
  const a = entre(20, 120), b = entre(20, 150 - a);
  return question('Deux angles d\u2019un triangle mesurent ' + a + '° et ' + b
    + '°. Quel est le troisième ?', (180 - a - b) + '°',
    'Les trois angles d\u2019un triangle font 180°.');
}

function trigonometrie(r){
  const [a, b, c] = piocher(TRIPLETS);
  const rapport = r.rapport === 'melange' || !r.rapport
    ? piocher(['sin', 'cos', 'tan']) : r.rapport;

  const valeurs = { sin: a / c, cos: b / c, tan: a / b };
  const aides = {
    sin: 'Le côté opposé divisé par l\u2019hypoténuse.',
    cos: 'Le côté adjacent divisé par l\u2019hypoténuse.',
    tan: 'Le côté opposé divisé par le côté adjacent.'
  };
  return questionArrondie(
    'Triangle rectangle : côté opposé ' + a + ' cm, côté adjacent ' + b
      + ' cm, hypoténuse ' + c + ' cm. Calcule ' + rapport + ' α au centième.',
    valeurs[rapport], 2, aides[rapport]);
}

/* =========================================================
   Le catalogue
   ========================================================= */
const FAMILLES = {
  livrets: {
    groupe: 'Calcul mental',
    nom: 'Les livrets', engendre: livrets,
    consigne: 'Calcule.',
    defaut: { livrets: [2, 5, 10], jusqua: 10, sens: 'melange' }
  },
  complements: {
    groupe: 'Calcul mental',
    nom: 'Les compléments', engendre: complements,
    consigne: 'Complète.',
    defaut: { cible: 100, dizaines: false }
  },
  divisions: {
    groupe: 'Calcul mental',
    nom: 'Les tables de division', engendre: divisions,
    consigne: 'Calcule.',
    defaut: { livrets: [2, 5, 10], jusqua: 10 }
  },
  trous: {
    groupe: 'Calcul mental',
    nom: 'Les calculs à trous', engendre: trous,
    consigne: 'Trouve le nombre manquant.',
    defaut: { jusqua: 100, operation: 'melange' }
  },
  progressions: {
    groupe: 'Calcul mental',
    nom: 'Les progressions', engendre: progressions,
    consigne: 'Continue la suite.',
    defaut: { type: 'plus', sauts: [2, 3, 5, 10], montre: 4, demandes: 2 }
  },
  carres: {
    groupe: 'Calcul mental',
    nom: 'Les carrés et racines carrées', engendre: carres,
    consigne: 'Calcule.',
    defaut: { jusqua: 12, sens: 'melange' }
  },
  doubles: {
    groupe: 'Calcul mental',
    nom: 'Les doubles et les moitiés', engendre: doubles,
    consigne: 'Calcule.',
    defaut: { jusqua: 100, sens: 'melange' }
  },

  addition: {
    groupe: 'Les opérations posées',
    nom: 'L\u2019addition', engendre: addition,
    consigne: 'Pose et calcule.',
    defaut: { ordre: 100, decimales: 0, termes: 2 }
  },
  soustraction: {
    groupe: 'Les opérations posées',
    nom: 'La soustraction', engendre: soustraction,
    consigne: 'Pose et calcule.',
    defaut: { ordre: 100, decimales: 0 }
  },
  multiplication: {
    groupe: 'Les opérations posées',
    nom: 'La multiplication', engendre: multiplication,
    consigne: 'Pose et calcule.',
    defaut: { ordre: 100, decimales: 0, multiplicateur: 1 }
  },
  division: {
    groupe: 'Les opérations posées',
    nom: 'La division', engendre: division,
    consigne: 'Pose et calcule.',
    defaut: { ordre: 100, diviseur: 1, reste: false }
  },

  priorites: {
    groupe: 'Les nombres',
    nom: 'Les priorités des opérations', engendre: priorites,
    consigne: 'Calcule en respectant les priorités.',
    defaut: { niveau: 2, parentheses: true, negatifs: false }
  },
  relatifs: {
    groupe: 'Les nombres',
    nom: 'Les entiers relatifs', engendre: relatifs,
    consigne: 'Calcule.',
    defaut: { jusqua: 20, operation: 'addition' }
  },
  fractions: {
    groupe: 'Les nombres',
    nom: 'Les fractions', engendre: fractions,
    consigne: 'Calcule et simplifie.',
    defaut: { operation: 'addition', jusqua: 12 }
  },
  unites: {
    groupe: 'Grandeurs et mesures',
    nom: 'Les changements d\u2019unités', engendre: unites,
    consigne: 'Convertis.',
    defaut: { grandeur: 'longueur', ecart: 2 }
  },
  pourcents: {
    groupe: 'Grandeurs et mesures',
    nom: 'Les pourcents', engendre: pourcents,
    consigne: 'Calcule.',
    defaut: { operation: 'pourcent' }
  },
  algebre: {
    groupe: 'Fonctions et algèbre',
    nom: 'Le calcul littéral', engendre: algebre,
    consigne: 'Réduis ou résous.',
    defaut: { operation: 'reduire', lettre: 'x' }
  },

  /* ---- les nombres ---- */
  diviseurs: {
    groupe: 'Les nombres',
    nom: 'Diviseurs et multiples', engendre: diviseurs,
    consigne: 'Cherche.',
    defaut: { operation: 'pgdc', jusqua: 60 }
  },
  scientifique: {
    groupe: 'Les nombres',
    nom: 'La notation scientifique', engendre: scientifique,
    consigne: 'Récris le nombre.',
    defaut: { sens: 'vers' }
  },
  arrondis: {
    groupe: 'Les nombres',
    nom: 'Les arrondis', engendre: arrondis,
    consigne: 'Arrondis.',
    defaut: { rang: 'unite' }
  },

  /* ---- les grandeurs et mesures ---- */
  temps: {
    groupe: 'Grandeurs et mesures',
    nom: 'Les durées', engendre: temps,
    consigne: 'Calcule.',
    defaut: { operation: 'conversion' }
  },
  vitesse: {
    groupe: 'Grandeurs et mesures',
    nom: 'Vitesse, distance, temps', engendre: vitesse,
    consigne: 'Calcule.',
    defaut: { cherche: 'vitesse' }
  },
  echelles: {
    groupe: 'Grandeurs et mesures',
    nom: 'Les échelles', engendre: echelles,
    consigne: 'Calcule.',
    defaut: { cherche: 'reel' }
  },
  interets: {
    groupe: 'Grandeurs et mesures',
    nom: 'Les intérêts', engendre: interets,
    consigne: 'Calcule.',
    defaut: { cherche: 'interet' }
  },

  /* ---- les fonctions et l'algèbre ---- */
  proportionnalite: {
    groupe: 'Fonctions et algèbre',
    nom: 'La proportionnalité', engendre: proportionnalite,
    consigne: 'Complète.',
    defaut: { operation: 'quatrieme' }
  },
  affine: {
    groupe: 'Fonctions et algèbre',
    nom: 'Les fonctions affines', engendre: affine,
    consigne: 'Calcule.',
    defaut: { cherche: 'image' }
  },
  binomes: {
    groupe: 'Fonctions et algèbre',
    nom: 'Les produits de binômes', engendre: binomes,
    consigne: 'Développe et réduis.',
    defaut: { operation: 'developper', lettre: 'x' }
  },
  equation2: {
    groupe: 'Fonctions et algèbre',
    nom: 'Les équations du 2e degré', engendre: equation2,
    consigne: 'Résous.',
    defaut: { forme: 'carre', lettre: 'x' }
  },

  /* ---- l'espace ---- */
  aires: {
    groupe: 'L\u2019espace',
    nom: 'Aires et périmètres', engendre: aires,
    consigne: 'Calcule.',
    defaut: { forme: 'rectangle' }
  },
  volumes: {
    groupe: 'L\u2019espace',
    nom: 'Les volumes', engendre: volumes,
    consigne: 'Calcule.',
    defaut: { forme: 'pave' }
  },
  pythagore: {
    groupe: 'L\u2019espace',
    nom: 'Le théorème de Pythagore', engendre: pythagore,
    consigne: 'Calcule.',
    defaut: { cherche: 'hypotenuse' }
  },
  angles: {
    groupe: 'L\u2019espace',
    nom: 'Les angles', engendre: angles,
    consigne: 'Calcule.',
    defaut: { operation: 'triangle' }
  },
  trigonometrie: {
    groupe: 'L\u2019espace',
    nom: 'La trigonométrie', engendre: trigonometrie,
    consigne: 'Calcule.',
    defaut: { rapport: 'melange' }
  }
};

/**
 * Engendre une série. On évite les répétitions immédiates tant que
 * la famille peut fournir assez de questions différentes : réciter
 * deux fois la même ligne n'apprend rien.
 */
function serie(famille, reglages, nombre){
  const f = FAMILLES[famille];
  if (!f) return [];
  const r = Object.assign({}, f.defaut, reglages || {});
  const n = Math.max(1, Math.min(100, nombre || 20));

  const sorties = [];
  const vues = {};
  let essais = 0;
  while (sorties.length < n && essais < n * 30){
    essais++;
    const q = f.engendre(r);
    if (vues[q.enonce] && essais < n * 12) continue;   // on insiste, sans s'entêter
    vues[q.enonce] = true;
    sorties.push(q);
  }
  return sorties;
}

/** Réduit une fraction écrite « a/b », ou rend null si ce n'en est pas une. */
function litFraction(t){
  const m = /^(-?\d+)\s*\/\s*(\d+)$/.exec(String(t).replace(/[−–—]/g, '-').trim());
  if (!m) return null;
  const n = parseInt(m[1], 10), d = parseInt(m[2], 10);
  if (!d) return null;
  const g = pgcd(n, d);
  return { n: n, d: d, num: n / g, den: d / g, reduite: (g === 1) };
}

/**
 * Le jugement complet : juste, juste mais simplifiable, ou faux.
 *
 * Une fraction exacte mais non réduite n'est pas une erreur de calcul :
 * on la compte juste, et on montre à l'élève ce qu'il peut encore faire.
 * L'ignorer serait injuste ; se taire ne lui apprendrait rien.
 */
function juger(donnee, attendue, tolerance){
  if (!juste(donnee, attendue)){
    /* Une réponse arrondie peut différer du centième attendu sans être
       fausse : la question dit alors quelle marge elle accepte. */
    if (tolerance){
      const n = (t) => Number(String(t).replace(/[−–—]/g, '-').replace(',', '.').replace(/[^\d.,-]/g, ''));
      const a = n(donnee), b = n(attendue);
      if (!isNaN(a) && !isNaN(b) && Math.abs(a - b) <= tolerance) return { etat: 'juste' };
    }
    return { etat: 'faux' };
  }

  const f = litFraction(donnee);
  if (f && !f.reduite){
    const reduite = (f.den === 1) ? String(f.num) : (f.num + '/' + f.den);
    return {
      etat: 'simplifiable',
      forme: reduite,
      note: 'Juste. Mais ' + f.n + '/' + f.d + ' peut encore se simplifier : '
          + reduite + '. Divise le haut et le bas par ' + pgcd(f.n, f.d) + '.'
    };
  }
  return { etat: 'juste' };
}

/**
 * La réponse donnée vaut-elle la réponse attendue ?
 *
 * L'espace pose un vrai conflit : il sépare les milliers dans « 1 000 » et
 * les termes dans « 12 15 ». On tranche d'après la réponse attendue — si
 * elle comporte plusieurs termes, l'espace sépare ; sinon il ne compte pas.
 */
function juste(donnee, attendue){
  const nettoyer = (s) => String(s == null ? '' : s)
    .replace(/\u2212/g, '-')          // le signe moins typographique
    .replace(/[’']/g, '')             // apostrophe suisse des milliers
    .replace(',', '.')
    .trim();

  const brut = nettoyer(donnee);
  const cible = nettoyer(attendue);
  if (brut === '') return false;

  const nombre = (x) => {
    const n = Number(x);
    return isNaN(n) ? null : n;
  };

  if (cible.indexOf(';') >= 0){
    // une suite : l'ordre compte, le séparateur non
    const decouper = (s) => s.split(/[;\s]+/).filter(Boolean);
    const a = decouper(brut), b = decouper(cible);
    if (a.length !== b.length) return false;
    return a.every((x, i) => {
      const na = nombre(x), nb = nombre(b[i]);
      return (na !== null && nb !== null) ? na === nb : x === b[i];
    });
  }

  /* Les écritures particulières du cycle 3 : le signe moins sous toutes
     ses formes, le pour-cent avec ou sans espace, « x = 5 » ou « 5 ». */
  const nettoyerAvance = (x) => x.toLowerCase()
    .replace(/[−–—]/g, '-')
    // le signe % est déjà dans la question : ne pas l'écrire n'est pas une faute
    .replace(/\s*%\s*/g, '')
    .replace(/^[a-z]\s*=\s*/, '')      // « x = 5 » vaut « 5 »
    .replace(/\s*\/\s*/g, '/')        // « 3 / 4 » vaut « 3/4 »
    .replace(/\s+/g, ' ').trim();

  /* On regarde les deux côtés : l'élève peut répondre « 4/2 » là où l'on
     attend « 2 », et cette réponse est juste. */
  const formeSavante = (t) => /[%\/]|[a-z]/i.test(t);
  if ((formeSavante(cible) || formeSavante(brut)) && !/reste/.test(cible)){
    const na = nettoyerAvance(brut), nb2 = nettoyerAvance(cible);
    if (na === nb2) return true;
    const fa = Number(na.replace(',', '.')), fb = Number(nb2.replace(',', '.'));
    if (!isNaN(fa) && !isNaN(fb)) return fa === fb;
    /* Une fraction se compare par sa valeur : 2/4 vaut 1/2, et 4/2 vaut 2.
       Le second cas compte : une division de fractions tombe souvent juste. */
    const valeur = (t) => {
      const m = /^(-?\d+)\/(\d+)$/.exec(t);
      if (m) return (+m[1]) / (+m[2]);
      const n = Number(t.replace(',', '.'));
      return isNaN(n) ? null : n;
    };
    const va = valeur(na), vb = valeur(nb2);
    if (va !== null && vb !== null) return Math.abs(va - vb) < 1e-9;
    return false;
  }

  /* « 12 reste 3 » s'écrit aussi « 12 r 3 » ou « 12 R3 » : on ramène
     toutes ces formes à la même avant de comparer. */
  const normaliserReste = (x) => x.toLowerCase()
    .replace(/\s*(reste|rest|r)\s*/g, ' reste ')
    .replace(/\s+/g, ' ').trim();
  if (/reste/.test(cible)){
    return normaliserReste(brut) === normaliserReste(cible);
  }

  // une valeur unique : les espaces ne sont que des séparateurs de milliers
  const a = brut.replace(/\s/g, '');
  const b = cible.replace(/\s/g, '');
  if (a === b) return true;
  const na = nombre(a), nb = nombre(b);
  return (na !== null && nb !== null) && na === nb;
}

const API = { FAMILLES, ORDRES, serie, juste, juger, litFraction, entre, piocher, melanger };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
global.Maths = API;

})(typeof window !== 'undefined' ? window : globalThis);
