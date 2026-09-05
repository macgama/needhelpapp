"use strict";

/* Plusieurs avertissements peuvent survenir en même temps — version
   décalée et serveur en panne, par exemple. Ils s'ajoutent au lieu de se
   remplacer : masquer le second parce que le premier est arrivé ferait
   perdre justement l'information utile. */
function alerter(message){
  const w = document.getElementById('warn');
  if (!w || !message) return;
  const liste = window.__alertes = window.__alertes || [];
  if (liste.indexOf(message) >= 0) return;   // pas deux fois le même
  liste.push(message);
  w.className = 'warn on';
  w.innerHTML = '';
  liste.forEach(m => {
    const p = document.createElement('p');
    p.style.margin = '0 0 4px';
    p.textContent = m;
    w.appendChild(p);
  });
}


/* =========================================================
   Textes d'exemple
   ========================================================= */
const EXEMPLES_META = [
  { title:'Le chat gris', level:'n2' },
  { title:"L'orage",      level:'n4' },
  { title:'La cabane',    level:'n5' }
];
const SAMPLES = [
`Le petit chat gris dort sur le tapis du salon. Quand ma sœur arrive, il ouvre un œil, puis il se cache sous le fauteuil. Elle pose une soucoupe de lait près de la porte et attend sans bouger.`,

`L'orage a éclaté vers la fin de l'après-midi. Les nuages sombres roulaient au-dessus des toits, et les premières gouttes ont frappé les vitres de la cuisine. Nous avons fermé les volets, allumé une bougie, et nous sommes restés serrés autour de la table jusqu'au dernier grondement.`,

`Les enfants avaient promis de terminer la cabane avant les vacances. Ils ont transporté les planches que le voisin leur avait données, puis ils les ont clouées les unes aux autres, malgré la pluie qui tombait depuis le matin. Lorsque le toit fut enfin posé, ils se sont assis à l'intérieur, fiers et trempés, et ils ont écouté l'eau glisser au-dessus de leurs têtes.`
];

/* =========================================================
   Raccourcis DOM
   ========================================================= */
const $ = (id) => document.getElementById(id);
const els = {
  text:$('text'), answer:$('answer'), answer2:$('answer2'),
  voice:$('voice'), rate:$('rate'), words:$('words'), speed:$('speed'),
  rateVal:$('rate-val'), wordsVal:$('words-val'), speedVal:$('speed-val'),
  punct:$('opt-punct'), repeatMode:$('opt-repeat'), intro:$('opt-intro'),
  review:$('opt-review'), hide:$('opt-hide'),
  caps:$('opt-caps'), punctCheck:$('opt-punct-check'),
  read:$('read'), readText:$('read-text'), counter:$('counter'), phaseLabel:$('phase-label'), dot:$('dot'),
  fill:$('stroke-fill'), nib:$('stroke-nib'), strokebox:$('strokebox'),
  strokeLabel:$('stroke-label'), strokeTime:$('stroke-time'),
  play:$('play'), repeat:$('repeat'), prev:$('prev'), next:$('next'),
  more:$('more'), done:$('done'), start:$('start'),
  warn:$('warn'), count:$('count'), result:$('result'),
  savedList:$('saved-list'), savedEmpty:$('saved-empty'), saveName:$('save-name'),
  aiOn:$('ai-on'), aiBox:$('ai-box'), aiProvider:$('ai-provider'), aiKey:$('ai-key'),
  aiVoice:$('ai-voice'), aiLoad:$('ai-load'), aiTest:$('ai-test'), aiStatus:$('ai-status'),
  aiKeyLabel:$('ai-key-label'), aiHelp:$('ai-help'),
  pick:$('pick'), file:$('file'), tidy:$('tidy'), dropZone:$('drop-zone'), importStatus:$('import-status')
};

/* =========================================================
   Découpage du texte
   ========================================================= */
function countWords(s){ const m = s.match(/[A-Za-zÀ-ÖØ-öø-ÿŒœ0-9'’\-]+/g); return m ? m.length : 0; }

// découpe équilibrée, réservée aux phrases très longues de la lecture d'ensemble
function chunkByWords(t, max){
  const tok = t.split(/\s+/).filter(Boolean);
  const n = Math.ceil(tok.length / max);
  if (n <= 1) return [t];
  const size = Math.ceil(tok.length / n);
  const out = [];
  for (let i=0;i<tok.length;i+=size) out.push(tok.slice(i,i+size).join(' '));
  return out;
}

// recolle les groupes de un ou deux mots au groupe voisin
function mergeSmall(parts, max){
  const out = [];
  for (const p of parts){
    const prev = out[out.length-1];
    if (prev && countWords(p) < 3 && countWords(prev) + countWords(p) <= max + 2){
      out[out.length-1] = prev + ' ' + p;
    } else out.push(p);
  }
  if (out.length > 1 && countWords(out[0]) < 3 && countWords(out[0]) + countWords(out[1]) <= max + 2){
    out[1] = out[0] + ' ' + out[1];
    out.shift();
  }
  return out;
}

/* Une dictée se lit par membres de phrase, jamais au milieu d'un groupe de
   mots : on ne coupe qu'à une ponctuation. Un membre plus long que la taille
   demandée reste donc entier — il sera simplement relu deux fois. */
function splitLong(t, max){
  if (countWords(t) <= max) return [t];
  const pieces = t.match(/[^,;:]+[,;:]*\s*/g) || [t];
  const parts = pieces.map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) return [t];

  const merged = [];
  let cur = '';
  for (const p of parts){
    if (!cur) cur = p;
    else if (countWords(cur) + countWords(p) <= max) cur += ' ' + p;
    else { merged.push(cur); cur = p; }
  }
  if (cur) merged.push(cur);
  return merged;
}

/* Le dernier groupe d'un paragraphe porte un retour à la ligne : il sera
   annoncé à voix haute, et retiré de l'affichage et des comptages. */
function makeSegments(text, max){
  const segs = [];
  const paragraphs = text.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  paragraphs.forEach((p, iPara) => {
    const sentences = p.match(/[^.!?…]+[.!?…]*\s*/g) || [p];
    const here = [];
    for (const s of sentences){
      const t = s.trim();
      if (!t) continue;
      const parts = splitLong(t, max);
      for (const part of parts) if (part.trim()) here.push(part.trim());
    }
    const groupes = mergeSmall(here, max);
    groupes.forEach((s, i) => {
      const dernier = (i === groupes.length - 1) && (iPara < paragraphs.length - 1);
      segs.push(dernier ? s + '\n' : s);
    });
  });
  return segs;
}

/** Le texte d'un groupe, sans la marque de fin de paragraphe. */
function texteGroupe(seg){ return String(seg || '').replace(/\n/g, '').trim(); }

/* Pour la lecture d'un trait : des phrases entières, pas des groupes.
   On ne coupe une phrase que si elle dépasse la limite des navigateurs. */
function makeSentences(text){
  const out = [];
  const paragraphs = text.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  for (const p of paragraphs){
    const sentences = p.match(/[^.!?…]+[.!?…]*\s*/g) || [p];
    for (const s of sentences){
      const t = s.trim();
      if (!t) continue;
      if (t.length <= 220){ out.push(t); continue; }
      const pieces = t.match(/[^,;:]+[,;:]*\s*/g) || [t];
      let cur = '';
      for (const piece of pieces){
        const q = piece.trim();
        if (!q) continue;
        if (!cur) cur = q;
        else if ((cur + ' ' + q).length <= 220) cur += ' ' + q;
        else { out.push(cur); cur = q; }
      }
      if (cur) out.push(cur);
    }
  }
  return out;
}

/* =========================================================
   Texte prononcé
   ========================================================= */
/* Les quatre langues de la dictée. Chacune apporte le nom de ses signes,
   sa formule de retour à la ligne, et le code de langue qui sert à choisir
   une voix. Ajouter une langue ne demande que d'étendre ce tableau. */
const LANGUES_DICTEE = {
  fr: {
    nom: 'français', code: 'fr',
    aLaLigne: 'à la ligne',
    marks: {
      ',':'virgule', ';':'point-virgule', ':':'deux points',
      '.':'point', '!':"point d'exclamation", '?':"point d'interrogation",
      '…':'points de suspension',
      '«':'ouvrez les guillemets', '»':'fermez les guillemets',
      '"':'guillemets', '“':'ouvrez les guillemets', '”':'fermez les guillemets'
    }
  },
  de: {
    nom: 'allemand', code: 'de',
    aLaLigne: 'neue Zeile',
    marks: {
      ',':'Komma', ';':'Semikolon', ':':'Doppelpunkt',
      '.':'Punkt', '!':'Ausrufezeichen', '?':'Fragezeichen',
      '…':'Auslassungspunkte',
      '«':'Anführungszeichen auf', '»':'Anführungszeichen zu',
      '"':'Anführungszeichen', '“':'Anführungszeichen auf', '”':'Anführungszeichen zu'
    }
  },
  en: {
    nom: 'anglais', code: 'en',
    aLaLigne: 'new line',
    marks: {
      ',':'comma', ';':'semicolon', ':':'colon',
      '.':'full stop', '!':'exclamation mark', '?':'question mark',
      '…':'ellipsis',
      '«':'open quotes', '»':'close quotes',
      '"':'quotes', '“':'open quotes', '”':'close quotes'
    }
  },
  it: {
    nom: 'italien', code: 'it',
    aLaLigne: 'a capo',
    marks: {
      ',':'virgola', ';':'punto e virgola', ':':'due punti',
      '.':'punto', '!':'punto esclamativo', '?':'punto interrogativo',
      '…':'puntini di sospensione',
      '«':'aprite le virgolette', '»':'chiudete le virgolette',
      '"':'virgolette', '“':'aprite le virgolette', '”':'chiudete le virgolette'
    }
  }
};

let langueDictee = 'fr';

/* Une dictée porte sa langue, et ne se travaille que dans celle-là.
   Lire un texte allemand avec une voix française n'apprendrait rien —
   ni la prononciation, ni l'orthographe. Le verrou se pose dès qu'une
   dictée existante est ouverte ; il ne reste levé que devant un texte
   qu'on est en train d'écrire, où la langue se décide justement. */
let langueVerrouillee = false;

function langue(){ return LANGUES_DICTEE[langueDictee] || LANGUES_DICTEE.fr; }

/* Une dictée d'allemand se dicte normalement en allemand, « Punkt » compris.
   Mais un francophone débutant peut avoir besoin d'entendre « point ». Le
   choix lui revient ; par défaut on reste dans la langue du texte. */
function langueDesSignes(){
  const opt = document.getElementById('opt-signes-fr');
  return (opt && opt.checked) ? LANGUES_DICTEE.fr : langue();
}
const MARKS_DE = () => langueDesSignes().marks;

const QUOTES = /[«»"“”]/;

/* Les signes prononcés dans le fil du texte, sans pause : on remplace
   chaque signe par son nom dans la langue choisie. */
function toSpeechInline(txt){
  const m = MARKS_DE();
  let s = ' ' + txt + ' ';
  s = s.replace(/«/g, ' ' + m['«'] + ' ')
       .replace(/»/g, ' ' + m['»'] + ' ')
       .replace(/[“”"]/g, ' ' + m['"'] + ' ')
       .replace(/…/g, ' ' + m['…'] + ' ')
       .replace(/\.\.\./g, ' ' + m['…'] + ' ')
       .replace(/,/g, ' ' + m[','] + ' ')
       .replace(/;/g, ' ' + m[';'] + ' ')
       .replace(/:/g, ' ' + m[':'] + ' ')
       .replace(/\?/g, ' ' + m['?'] + ' ')
       .replace(/!/g, ' ' + m['!'] + ' ')
       .replace(/\.(?!\d)/g, ' ' + m['.'] + ' ');
  return s.replace(/\s+/g,' ').trim();
}

/* ---------- le choix de la langue ---------- */
function remplirLangues(){
  const sel = document.getElementById('d-langue');
  if (sel){
    sel.innerHTML = '';
    Object.keys(LANGUES_DICTEE).forEach(code => {
      const o = document.createElement('option');
      o.value = code;
      o.textContent = LANGUES_DICTEE[code].nom;
      sel.appendChild(o);
    });
    sel.value = langueDictee;
  }
  const lib = document.getElementById('lib-langue');
  if (lib){
    lib.innerHTML = '<option value="">Toutes les langues</option>';
    Object.keys(LANGUES_DICTEE).forEach(code => {
      const o = document.createElement('option');
      o.value = code;
      o.textContent = LANGUES_DICTEE[code].nom;
      lib.appendChild(o);
    });
  }
}

/* Changer de langue change la voix, le nom des signes et la façon de lire :
   c'est le réglage le plus lourd de conséquences de la page. */
function changerLangue(code, silencieux, forcer){
  const nouvelle = LANGUES_DICTEE[code] ? code : 'fr';

  // le verrou ne cède qu'à un appel qui le sait
  if (langueVerrouillee && !forcer && nouvelle !== langueDictee){
    const sel = document.getElementById('d-langue');
    if (sel) sel.value = langueDictee;
    if (!silencieux && typeof dire === 'function'){
      dire('Cette dictée est en ' + langue().nom + ' : elle ne se travaille que dans cette langue.', 'err');
    }
    return;
  }
  if (nouvelle === langueDictee && silencieux) { majOptionSignes(); majVerrouLangue(); return; }

  // on met de côté les réglages de la langue qu'on quitte
  if (typeof reglagesLangues === 'object' && els && els.voice){
    reglagesLangues[langueDictee] = lireChamps();
  }
  langueDictee = nouvelle;

  const sel = document.getElementById('d-langue');
  if (sel) sel.value = langueDictee;

  // puis on rappelle ceux de la nouvelle, ou on part de valeurs adaptées
  const connus = reglagesLangues[langueDictee];
  ecrireChamps(connus || reglagesParDefaut(langueDictee));
  majOptionSignes();
  if (typeof syncLabels === 'function') syncLabels();

  majVerrouLangue();
  if (!silencieux && typeof dire === 'function'){
    dire(connus
      ? 'Langue : ' + langue().nom + '. Tes réglages pour cette langue sont rappelés.'
      : 'Langue : ' + langue().nom + '. Lecture ralentie et groupes plus courts, comme il convient à une langue étrangère.',
      'ok');
  }
  if (typeof savePrefs === 'function') savePrefs();
}

/* Pose ou lève le verrou, et le dit à l'écran. */
function verrouillerLangue(oui){
  langueVerrouillee = !!oui;
  majVerrouLangue();
}

function majVerrouLangue(){
  const sel = document.getElementById('d-langue');
  if (sel) sel.disabled = langueVerrouillee;
  const note = document.getElementById('note-langue');
  if (note){
    note.hidden = !langueVerrouillee;
    note.textContent = 'Cette dictée est en ' + langue().nom
      + ' : elle ne se travaille que dans cette langue.';
  }
  const bouton = document.getElementById('changer-langue');
  if (bouton){
    // on ne peut retaguer que sa propre dictée, jamais celle d'un autre
    const sienne = (typeof ouverte !== 'undefined' && ouverte && !ouverte.borrowed)
                || (typeof modifie !== 'undefined' && modifie);
    bouton.hidden = !langueVerrouillee || !sienne;
  }
}

/* Découpe un texte en prises de parole successives : les fragments de phrase
   d'un côté, les noms des signes de l'autre. Le signe reste dans le fragment
   pour que l'intonation soit juste, et son nom est dit séparément. */
function speechParts(txt, mode){
  const source = String(txt || '');
  const aLaLigne = /\n/.test(source);      // dernier groupe d'un paragraphe
  txt = source.replace(/\n/g, '');

  const suite = (parts) => {
    if (aLaLigne) parts.push({ s: langueDesSignes().aLaLigne, mark:true });
    return parts;
  };
  const plain = (s) => s.replace(QUOTES, ' ').replace(/\s+/g,' ').trim();
  if (mode === 'off'){
    const s = plain(String(txt).replace(/[«»"“”]/g,' '));
    return s ? [{s:s, mark:false}] : [];   // lecture d'ensemble : rien n'est annoncé
  }
  if (mode === 'inline'){
    const s = toSpeechInline(txt);
    return suite(s ? [{s:s, mark:false}] : []);
  }

  const parts = [];
  let buf = '';
  const flush = () => {
    const s = buf.replace(/[«»"“”]/g,' ').replace(/\s+/g,' ').trim();
    if (s) parts.push({s:s, mark:false});
    buf = '';
  };
  for (let i=0;i<txt.length;i++){
    const ch = txt[i];
    if (ch === '…' || (ch === '.' && txt.substr(i,3) === '...')){
      buf += (ch === '…') ? '…' : '...';
      flush();
      parts.push({s:'points de suspension', mark:true});
      i += (ch === '…') ? 0 : 2;
      continue;
    }
    if (MARKS_DE()[ch]){
      if (ch === '.' && /\d/.test(txt.charAt(i+1) || '')){ buf += ch; continue; }  // nombre décimal
      if (QUOTES.test(ch)){          // le guillemet n'est pas prononcé, seul son nom l'est
        flush();
        parts.push({s:MARKS_DE()[ch], mark:true});
        continue;
      }
      buf += ch;                     // le signe reste dans le fragment : l'intonation est juste
      flush();
      parts.push({s:MARKS_DE()[ch], mark:true});
      continue;
    }
    buf += ch;
  }
  flush();
  return suite(parts);
}

function partsText(parts){ return parts.map(p => p.s).join(' '); }

/* =========================================================
   Voix du navigateur : on classe par qualité
   ========================================================= */
let voices = [];
let savedVoiceId = null;
const supported = ('speechSynthesis' in window) && ('SpeechSynthesisUtterance' in window);

// les fabricants signalent leurs bonnes voix par un mot-clé dans le nom
function voiceQuality(v){
  const n = (v.name || '').toLowerCase();
  if (/premium|enhanced|neural|natural|siri|wavenet|studio/.test(n)) return 2;   // voix téléchargée, très naturelle
  if (/google/.test(n) || v.localService === false) return 1;                    // voix en ligne, correcte
  return 0;                                                                      // voix système d'origine
}
function voiceScore(v){
  const n = (v.name || '').toLowerCase();
  const lang = (v.lang || '').toLowerCase().replace('_','-');
  const code = langue().code;
  let s = voiceQuality(v) * 40;
  if (lang.indexOf(code) === 0) s += 200;
  if (lang === code + '-' + code) s += 12;          // fr-fr, de-de, it-it
  if (/microsoft/.test(n) && /online|natural/.test(n)) s += 15;
  if (/compact|eloquence|espeak|festival|pico/.test(n)) s -= 60;
  return s;
}
const QUALITY_LABEL = ['voix d\u2019origine', 'en ligne', 'naturelle'];

function loadVoices(){
  if (!supported) return;
  voices = window.speechSynthesis.getVoices() || [];
  const code = langue().code;
  const fr = voices.filter(v => (v.lang||'').toLowerCase().indexOf(code) === 0);
  const list = (fr.length ? fr : voices).slice().sort((a,b) => voiceScore(b) - voiceScore(a));
  const prev = els.voice.value;
  els.voice.innerHTML = '';
  list.forEach(v => {
    const o = document.createElement('option');
    o.value = v.voiceURI || v.name;
    o.textContent = v.name + ' — ' + QUALITY_LABEL[voiceQuality(v)] + (fr.length ? '' : ' · ' + v.lang);
    els.voice.appendChild(o);
  });
  const wanted = prev || savedVoiceId;
  if (wanted && list.some(v => (v.voiceURI||v.name) === wanted)) els.voice.value = wanted;
  else if (list.length) els.voice.selectedIndex = 0;   // la meilleure voix disponible

  const hint = $('voice-hint');
  if (!list.length){
    hint.textContent = "Aucune voix trouvée. Recharge la page ; si rien n\u2019apparaît, essaie un autre navigateur.";
  } else if (!fr.length){
    hint.textContent = 'Aucune voix ' + langue().nom + ' sur cet appareil : la lecture utilisera une autre langue, '
      + 'ce qui déformera la prononciation. Installe une voix ' + langue().nom
      + ' dans les réglages du système, ou change la langue de la dictée.';
  } else if (voiceQuality(list[0]) === 0){
    hint.textContent = "Seules des voix d\u2019origine sont installées : elles sonnent robotiques. Le dépliant ci-dessous explique comment en installer une meilleure, gratuitement.";
  } else {
    hint.textContent = "La meilleure voix disponible est sélectionnée. Écoute un groupe pour vérifier.";
  }
}
function currentVoice(){
  const id = els.voice.value;
  return voices.find(v => (v.voiceURI || v.name) === id) || null;
}
if (supported){
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  setTimeout(loadVoices, 400);
  setTimeout(loadVoices, 1500);
} else {
  els.warn.className = 'warn on';
  els.warn.textContent = "Ce navigateur ne sait pas lire de texte à voix haute. Ouvre la page avec Chrome, Edge ou Safari.";
}

/* =========================================================
   Voix IA en ligne (facultatif)
   ========================================================= */
const ai = {
  on:false, provider:'elevenlabs', key:'', voice:'',
  cache:new Map(), audio:null, pending:new Map()
};
const EL_DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM';   // Rachel, voix de démonstration d'ElevenLabs
const GOOGLE_DEFAULT_VOICE = 'fr-FR-Neural2-A';

function aiSay(msg, kind){
  els.aiStatus.textContent = msg || '';
  els.aiStatus.className = 'status' + (kind ? ' ' + kind : '');
}
function aiSync(){
  ai.provider = els.aiProvider.value;
  ai.key = els.aiKey.value.trim();
  ai.voice = els.aiVoice.value;
  ai.on = els.aiOn.checked && !!ai.key;
  els.aiKeyLabel.textContent = ai.provider === 'elevenlabs' ? 'Clé API ElevenLabs' : 'Clé API Google Cloud';
  els.aiHelp.innerHTML = ai.provider === 'elevenlabs'
    ? 'Crée un compte sur elevenlabs.io, puis copie la clé depuis ton profil. L\u2019offre gratuite couvre environ dix dictées par mois. Charge tes voix et choisis une voix française : l\u2019accent sera bien meilleur.'
    : 'Il faut un projet Google Cloud avec l\u2019API Text-to-Speech activée, puis une clé API. La mise en route est plus longue, mais l\u2019offre gratuite est large (environ cent dictées par mois en voix Neural2).';
}
['ai-provider','ai-key','ai-voice','ai-on'].forEach(id => {
  $(id).addEventListener('change', () => {
    if (id === 'ai-provider'){ els.aiVoice.innerHTML = '<option value="">Voix par défaut</option>'; ai.cache.clear(); }
    if (id === 'ai-key' || id === 'ai-provider') ai.cache.clear();
    els.aiBox.hidden = !els.aiOn.checked;
    aiSync();
    if (els.aiOn.checked && !ai.key) aiSay('Colle ta clé API pour activer la voix IA.', 'err');
    else aiSay('');
  });
});
els.aiKey.addEventListener('input', aiSync);

async function aiFetchAudio(text){
  const cacheKey = ai.provider + '|' + ai.voice + '|' + text;
  if (ai.cache.has(cacheKey)) return ai.cache.get(cacheKey);
  if (ai.pending.has(cacheKey)) return ai.pending.get(cacheKey);

  const job = (async () => {
    let url;
    if (ai.provider === 'elevenlabs'){
      const id = ai.voice || EL_DEFAULT_VOICE;
      const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(id), {
        method:'POST',
        headers:{'xi-api-key':ai.key, 'Content-Type':'application/json', 'Accept':'audio/mpeg'},
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability:0.5, similarity_boost:0.8, style:0 }
        })
      });
      if (!r.ok) throw new Error('ElevenLabs a répondu ' + r.status);
      url = URL.createObjectURL(await r.blob());
    } else {
      const r = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(ai.key), {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          input: text.indexOf('<speak>') === 0 ? { ssml: text } : { text: text },
          voice:{ languageCode:'fr-FR', name: ai.voice || GOOGLE_DEFAULT_VOICE },
          audioConfig:{ audioEncoding:'MP3' }
        })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.audioContent) throw new Error('Google a répondu ' + r.status);
      url = 'data:audio/mp3;base64,' + j.audioContent;
    }
    ai.cache.set(cacheKey, url);
    ai.pending.delete(cacheKey);
    return url;
  })();

  ai.pending.set(cacheKey, job);
  job.catch(() => ai.pending.delete(cacheKey));
  return job;
}

function playAudio(url, token){
  return new Promise((resolve) => {
    const a = new Audio(url);
    ai.audio = a;
    a.playbackRate = parseFloat(els.rate.value);
    try { a.preservesPitch = true; a.mozPreservesPitch = true; a.webkitPreservesPitch = true; } catch(e){}
    let over = false;
    const stop = () => { if (over) return; over = true; clearInterval(iv); resolve(); };
    a.addEventListener('ended', stop);
    a.addEventListener('error', stop);
    const iv = setInterval(() => {
      if (state.token !== token){ try{ a.pause(); }catch(e){} stop(); return; }
      a.playbackRate = parseFloat(els.rate.value);
      if (state.paused && !a.paused) { try{ a.pause(); }catch(e){} }
      else if (!state.paused && a.paused && !a.ended) { a.play().catch(()=>{}); }
    }, 120);
    a.play().catch(stop);
  });
}

els.aiLoad.onclick = async () => {
  aiSync();
  if (!ai.key){ aiSay('Colle d\u2019abord ta clé API.', 'err'); return; }
  aiSay('Chargement des voix…');
  try{
    let items = [];
    if (ai.provider === 'elevenlabs'){
      const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers:{'xi-api-key':ai.key} });
      if (!r.ok) throw new Error('réponse ' + r.status);
      const j = await r.json();
      items = (j.voices||[]).map(v => ({ id:v.voice_id, name:v.name }));
    } else {
      const r = await fetch('https://texttospeech.googleapis.com/v1/voices?languageCode=fr-FR&key=' + encodeURIComponent(ai.key));
      if (!r.ok) throw new Error('réponse ' + r.status);
      const j = await r.json();
      items = (j.voices||[])
        .map(v => v.name)
        .filter(n => /Neural2|Studio|Wavenet/i.test(n))
        .sort()
        .map(n => ({ id:n, name:n.replace('fr-FR-','') }));
    }
    if (!items.length) throw new Error('aucune voix reçue');
    els.aiVoice.innerHTML = '';
    items.forEach(it => {
      const o = document.createElement('option');
      o.value = it.id; o.textContent = it.name;
      els.aiVoice.appendChild(o);
    });
    aiSync();
    aiSay(items.length + ' voix chargées. Choisis-en une, puis teste-la.', 'ok');
  } catch(e){
    aiSay('Impossible de charger les voix : ' + e.message + '. Vérifie la clé et ta connexion.', 'err');
  }
};

els.aiTest.onclick = async () => {
  aiSync();
  if (!ai.key){ aiSay('Colle d\u2019abord ta clé API.', 'err'); return; }
  aiSay('Génération de l\u2019extrait…');
  try{
    const url = await aiFetchAudio(partsToRequest(speechParts('Le petit chat gris dort sur le tapis du salon.', els.punct.value)));
    await playAudio(url, state.token);
    aiSay('La voix IA fonctionne. Elle sera utilisée pour la dictée.', 'ok');
  } catch(e){
    aiSay('Échec : ' + e.message + '. Vérifie la clé, la voix choisie et ta connexion.', 'err');
  }
};

/* =========================================================
   Moteur de lecture
   ========================================================= */
const state = {
  segs:[], sentences:[], index:0, phase:'idle',
  running:false, paused:false, token:0, skip:false, extra:0
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function makeUtterance(part){
  const u = new SpeechSynthesisUtterance(part.s);
  const v = currentVoice();
  if (v) u.voice = v;
  u.lang = (v && v.lang) ? v.lang : (langue().code + '-' + langue().code.toUpperCase());
  const rate = parseFloat(els.rate.value);
  // le nom d'un signe se dit plus bas, un peu plus lentement et plus doucement :
  // on l'entend comme une indication, pas comme un mot de la phrase
  u.rate = part.mark ? Math.max(0.4, rate * 0.92) : rate;
  u.pitch = part.mark ? 0.75 : 1;
  u.volume = part.mark ? 0.9 : 1;
  return u;
}

/* Toutes les prises de parole sont mises dans la file d'un coup : le navigateur
   les enchaîne lui-même, sans le silence qu'introduisait un appel par phrase.
   Le court battement entre deux énoncés sert justement à détacher le signe. */
function speakBrowser(parts, token){
  return new Promise(resolve => {
    if (!supported || !parts.length){ resolve(); return; }
    let done = false, started = false, watcher = null;
    const finish = () => { if (done) return; done = true; if (watcher) clearInterval(watcher); resolve(); };

    try { window.speechSynthesis.cancel(); } catch(e){}
    setTimeout(() => {
      if (done) return;
      if (state.token !== token){ finish(); return; }
      try { if (!state.paused) window.speechSynthesis.resume(); } catch(e){}
      parts.forEach((p, i) => {
        const u = makeUtterance(p);
        u.onstart = () => { started = true; };
        if (i === parts.length - 1){ u.onend = finish; u.onerror = finish; }
        try { window.speechSynthesis.speak(u); } catch(e){ if (i === parts.length - 1) finish(); }
      });
      watcher = setInterval(() => {
        if (state.token !== token){ finish(); return; }
        if (!started) return;
        if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) finish();
      }, 350);
    }, 80);

    setTimeout(() => {
      if (!done && !started && !window.speechSynthesis.speaking && !window.speechSynthesis.pending) finish();
    }, 7000);
  });
}

/* Côté voix IA, le même détachement passe par des silences : balises de pause
   pour ElevenLabs, SSML pour Google, qui permet en plus de baisser le ton. */
function xmlEsc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function capFirst(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

function partsToRequest(parts){
  const hasMark = parts.some(p => p.mark);
  if (ai.provider === 'google'){
    const voice = ai.voice || GOOGLE_DEFAULT_VOICE;
    if (!hasMark || /chirp/i.test(voice)) {        // les voix Chirp n'acceptent pas le SSML
      return parts.map(p => p.mark ? '. ' + capFirst(p.s) + '.' : p.s).join(' ')
                  .replace(/([.,;:!?…])\s+\./g, '$1');
    }
    return '<speak>' + parts.map(p => p.mark
      ? '<break time="400ms"/><prosody pitch="-2.5st" rate="94%" volume="-2dB">' + xmlEsc(p.s) + '</prosody><break time="260ms"/>'
      : xmlEsc(p.s)).join(' ') + '</speak>';
  }
  if (!hasMark) return parts.map(p => p.s).join(' ');
  return parts.map(p => p.mark
    ? '<break time="0.4s" /> ' + capFirst(p.s) + '. <break time="0.25s" />'
    : p.s).join(' ');
}

function groupParts(parts, maxChars){
  const groups = [];
  let cur = [], len = 0;
  for (const p of parts){
    const l = p.s.length + 45;
    if (cur.length && len + l > maxChars){ groups.push(cur); cur = []; len = 0; }
    cur.push(p); len += l;
  }
  if (cur.length) groups.push(cur);
  return groups;
}

async function say(parts, token){
  const list = (Array.isArray(parts) ? parts : [parts]).filter(p => p && p.s);
  if (!list.length) return;
  if (ai.on && ai.key){
    try {
      for (const g of groupParts(list, 3500)){
        const url = await aiFetchAudio(partsToRequest(g));
        if (state.token !== token) return;
        await playAudio(url, token);
        if (state.token !== token) return;
      }
      return;
    } catch(e){
      els.aiOn.checked = false; ai.on = false;
      aiSay('La voix IA a échoué (' + e.message + '). La voix du navigateur prend le relais.', 'err');
    }
  }
  await speakBrowser(list, token);
}

function prefetch(parts){
  if (!ai.on || !ai.key) return;
  const groups = groupParts(parts.filter(p => p && p.s), 3500);
  if (groups.length) aiFetchAudio(partsToRequest(groups[0])).catch(() => {});
}

function pauseDuration(seg){
  const chars = texteGroupe(seg).replace(/\s/g,'').length;
  return Math.min(90000, Math.max(1800, Math.round(chars * parseFloat(els.speed.value) * 1000)));
}

function setStroke(ratio, msLeft, live){
  const pct = Math.max(0, Math.min(100, ratio*100));
  els.fill.style.width = pct + '%';
  els.nib.style.left = pct + '%';
  els.strokebox.classList.toggle('live', !!live);
  els.strokeTime.textContent = live ? Math.ceil(msLeft/1000) + ' s' : '';
}

async function writingPause(total, token, midRead){
  let left = total, span = total, fired = false;
  state.skip = false; state.extra = 0;
  els.strokeLabel.textContent = 'À toi d\u2019écrire.';
  while (left > 0){
    if (state.token !== token) return 'cancel';
    if (state.skip){ state.skip = false; setStroke(1,0,false); return 'skip'; }
    if (state.extra){ left += state.extra; span += state.extra; state.extra = 0; }
    if (midRead && !fired && left <= span * 0.55 && !state.paused){
      fired = true;
      els.strokeLabel.textContent = 'Deuxième lecture — continue d\u2019écrire.';
      await midRead();
      if (state.token !== token) return 'cancel';
      els.strokeLabel.textContent = 'À toi d\u2019écrire.';
      left += 1500; span += 1500;
      continue;
    }
    if (!state.paused) left -= 60;
    setStroke(1 - left/span, left, true);
    await sleep(60);
  }
  setStroke(1, 0, false);
  return 'done';
}

async function waitWhilePaused(token){
  while (state.paused && state.token === token) await sleep(80);
}

function phaseText(){
  if (state.phase === 'intro') return 'Lecture du texte en entier — écoute sans écrire';
  if (state.phase === 'dictee') return 'Dictée en cours';
  if (state.phase === 'relecture') return 'Relecture — vérifie ce que tu as écrit';
  if (state.phase === 'fin') return 'Dictée terminée';
  return 'Prêt à commencer';
}

function render(writing){
  els.phaseLabel.textContent = state.paused ? 'En pause' : phaseText();
  els.dot.className = 'dot' + (writing && !state.paused ? ' writing' : '');
  const n = state.segs.length;
  const continuous = (state.phase === 'intro' || state.phase === 'relecture');

  if (state.phase === 'dictee') els.counter.textContent = 'Groupe ' + Math.min(state.index+1, n) + ' sur ' + n;
  else if (state.phase === 'fin') els.counter.textContent = n + ' groupes · terminé';
  else if (continuous) els.counter.textContent = 'lecture continue';
  else els.counter.textContent = n ? n + ' groupes' : '—';

  if (state.phase === 'fin'){
    els.read.classList.remove('dense');
    els.readText.className = '';
    els.readText.textContent = 'C\u2019est fini. Relis-toi, puis passe à la correction.';
  } else if (continuous){
    if (els.hide.checked && state.phase === 'intro'){
      els.read.classList.remove('dense');
      els.readText.className = 'masked';
      els.readText.textContent = 'Écoute le texte en entier.';
    } else {
      els.read.classList.add('dense');
      els.readText.className = 'small';
      els.readText.textContent = els.text.value.trim();
    }
  } else {
    els.read.classList.remove('dense');
    const seg = state.segs[state.index];
    if (!seg){
      els.readText.className = 'masked';
      els.readText.textContent = 'Écoute bien…';
    } else if (els.hide.checked){
      els.readText.className = 'masked';
      els.readText.textContent = '· · · · · ·  ' + countWords(seg) + ' mots  · · · · · ·';
    } else {
      els.readText.className = '';
      els.readText.textContent = texteGroupe(seg);
    }
  }

  els.play.textContent = state.running ? (state.paused ? '▶ Reprendre' : '❚❚ Pause') : '▶ Lancer';
  const idle = !state.running;
  els.repeat.disabled = idle;
  els.more.disabled = idle || continuous;
  els.done.disabled = idle || continuous;
  els.prev.disabled = continuous;
  els.next.textContent = state.phase === 'intro' ? 'Passer à la dictée →' : 'Suivant →';
}

async function runner(token){
  while (state.token === token){
    await waitWhilePaused(token);
    if (state.token !== token) return;

    if (state.phase === 'intro' || state.phase === 'relecture'){
      render(false);
      setStroke(0,0,false);
      els.strokeLabel.textContent = state.phase === 'intro'
        ? 'Écoute, n\u2019écris pas encore.'
        : 'Relecture — corrige si besoin.';
      // la lecture d'ensemble et la relecture se font sans annoncer les signes
      const parts = [];
      state.sentences.forEach(s => speechParts(s, 'off').forEach(p => parts.push(p)));
      if (state.phase === 'intro' && state.segs.length) prefetch(speechParts(state.segs[0], els.punct.value));
      await say(parts, token);
      if (state.token !== token) return;
      if (state.phase === 'intro'){
        state.phase = 'dictee'; state.index = 0;
        render(false);
        await sleep(1000);
        continue;
      }
      finish(); return;
    }

    if (state.phase === 'dictee'){
      if (state.index >= state.segs.length){
        if (els.review.checked){ state.phase = 'relecture'; state.index = 0; render(false); await sleep(900); continue; }
        finish(); return;
      }
      if (state.index < 0) state.index = 0;
      render(false);
      setStroke(0,0,false);
      els.strokeLabel.textContent = 'Lecture du groupe…';

      const groupe = state.segs[state.index];
      const spoken = speechParts(groupe, els.punct.value);
      // un membre de phrase long ne se retient pas d'une seule écoute
      const long = countWords(groupe) > parseInt(els.words.value, 10) + 2;
      const mode = (els.repeatMode.value === '1' && long) ? '2' : els.repeatMode.value;
      await say(spoken, token);
      if (state.token !== token) return;
      await waitWhilePaused(token);

      if (mode === '2'){
        els.strokeLabel.textContent = 'Deuxième lecture…';
        await sleep(800);
        if (state.token !== token) return;
        await say(spoken, token);
        if (state.token !== token) return;
        await waitWhilePaused(token);
      }

      const next = state.segs[state.index + 1];
      if (next) prefetch(speechParts(next, els.punct.value));

      render(true);
      const mid = (mode === 'mid') ? (() => say(spoken, token)) : null;
      const r = await writingPause(pauseDuration(state.segs[state.index]), token, mid);
      if (r === 'cancel') return;
      state.index++;
      continue;
    }
    return;
  }
}

function stopSpeech(){
  state.token++;
  if (supported){ try { window.speechSynthesis.cancel(); } catch(e){} }
  if (ai.audio){ try { ai.audio.pause(); } catch(e){} ai.audio = null; }
}

function finish(){
  state.phase = 'fin';
  state.running = false;
  state.paused = false;
  setStroke(1,0,false);
  els.strokeLabel.textContent = 'Dictée terminée.';
  render(false);
}

function startFrom(phase){
  stopSpeech();
  state.phase = phase;
  state.running = true;
  state.paused = false;
  const token = state.token;
  render(false);
  runner(token);
}

function restart(){
  if (!state.running) return;
  stopSpeech();
  state.paused = false;
  const token = state.token;
  render(false);
  runner(token);
}

/* =========================================================
   Commandes
   ========================================================= */
els.play.onclick = () => {
  if (!state.running){
    if (!state.segs.length) return;
    if (state.phase === 'fin' || state.phase === 'idle') state.index = 0;
    const wantIntro = els.intro.checked && (state.phase === 'idle' || state.phase === 'fin');
    startFrom(wantIntro ? 'intro' : 'dictee');
    return;
  }
  state.paused = !state.paused;
  if (supported){
    try { state.paused ? window.speechSynthesis.pause() : window.speechSynthesis.resume(); } catch(e){}
  }
  render(false);
};
els.repeat.onclick = () => { if (state.running) restart(); };
els.prev.onclick = () => {
  if (!state.segs.length || state.phase === 'intro' || state.phase === 'relecture') return;
  state.index = Math.max(0, state.index - 1);
  if (state.running) restart(); else render(false);
};
els.next.onclick = () => {
  if (!state.segs.length) return;
  if (state.phase === 'intro'){
    state.phase = 'dictee'; state.index = 0;
    if (state.running) restart(); else render(false);
    return;
  }
  if (state.phase === 'relecture') return;
  state.index++;
  if (state.running) restart(); else render(false);
};
els.more.onclick = () => { state.extra += 5000; };
els.done.onclick = () => { state.skip = true; };

document.addEventListener('keydown', (e) => {
  const t = e.target;
  const typing = t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT');
  if (!$('panel-1').classList.contains('on')) return;
  if (typing){
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && state.running){ e.preventDefault(); els.done.click(); }
    return;
  }
  if (e.key === ' '){ e.preventDefault(); els.play.click(); }
  else if (e.key === 'r' || e.key === 'R'){ e.preventDefault(); els.repeat.click(); }
  else if (e.key === 'ArrowLeft'){ e.preventDefault(); els.prev.click(); }
  else if (e.key === 'ArrowRight'){ e.preventDefault(); els.next.click(); }
  else if (e.key === 'Enter' && state.running){ e.preventDefault(); els.done.click(); }
});

/* =========================================================
   Navigation
   ========================================================= */
function go(i){
  for (let k=0;k<3;k++){
    $('panel-'+k).className = 'panel' + (k===i ? ' on' : '');
    $('tab-'+k).setAttribute('aria-current', k===i ? 'true' : 'false');
  }
  if (i !== 1 && state.running){ stopSpeech(); state.running = false; state.paused = false; render(false); }
  window.scrollTo({top:0, behavior:'smooth'});
}
Array.prototype.forEach.call(document.querySelectorAll('.step'), (b) => {
  b.onclick = () => {
    if (b.disabled) return;
    const panneau = parseInt(b.dataset.panel, 10);
    if (b.dataset.mode === 'neuve'){
      if (!peutQuitterLeTexte()) return;
      nouvelleDictee();
      go(panneau, 0);
      return;
    }
    if (b.dataset.mode === 'ouverte'){ go(panneau, 5); return; }
    go(panneau);
  };
});

function updateCount(){
  const txt = els.text.value.trim();
  const segs = txt ? makeSegments(txt, parseInt(els.words.value,10)) : [];
  els.count.textContent = txt ? (countWords(txt) + ' mots · ' + segs.length + ' groupes') : '';
  els.start.disabled = !txt;
  return segs;
}
els.text.addEventListener('input', updateCount);
els.words.addEventListener('input', updateCount);

els.start.onclick = () => {
  if (!els.text.value.trim()){
    Avis.fenetre('Il n\u2019y a pas encore de texte',
      'Pour lancer une dictée, il faut un texte. Écris-le ou importe-le, reprends une de tes '
        + 'dictées, ou vas en chercher une dans la bibliothèque partagée.',
      [{ texte:'Écrire un texte', principal:true, action: () => { go(0); els.text.focus(); } },
       { texte:'Mes dictées', action: () => go(3) },
       { texte:'La bibliothèque', action: () => go(4) }]);
    return;
  }
  /* Dernier garde-fou : une dictée ouverte impose sa langue avant la
     lecture. Un réglage resté de travers ne doit pas faire lire un texte
     allemand par une voix française. */
  const source = empruntee || ouverte;
  if (source && source.lang && source.lang !== langueDictee){
    changerLangue(source.lang, true, true);
    verrouillerLangue(true);
  }
  const segs = updateCount();
  if (!segs.length) return;
  ai.cache.clear();
  state.segs = segs;
  state.sentences = makeSentences(els.text.value.trim());
  state.index = 0;
  state.phase = 'idle';
  state.running = false;
  $('tab-1').disabled = false;
  $('tab-2').disabled = false;
  go(1);
  render(false);
  setTimeout(() => els.play.click(), 350);
};

$('preview').onclick = () => {
  const segs = updateCount();
  const sample = segs.length ? segs[0] : 'Voici un exemple de dictée lue à voix haute.';
  stopSpeech();
  say(speechParts(sample, els.punct.value), state.token);
};

$('back-setup').onclick = () => go(0, $('tab-5').hidden ? 0 : 5);
$('to-correction').onclick = () => {
  if (els.answer.value.trim() && !els.answer2.value.trim()) els.answer2.value = els.answer.value;
  go(2);
};


function syncLabels(){
  els.rateVal.textContent = parseFloat(els.rate.value).toFixed(2).replace('.',',') + '×';
  els.wordsVal.textContent = els.words.value;
  const s = parseFloat(els.speed.value);
  els.speedVal.textContent = s < 0.3 ? 'rapide' : (s < 0.45 ? 'assez rapide' : (s < 0.65 ? 'normal' : (s < 0.85 ? 'tranquille' : 'très large')));
}
['rate','words','speed'].forEach(id => $(id).addEventListener('input', syncLabels));

/* =========================================================
   Correction
   ========================================================= */
/* Une même ponctuation s'écrit de plusieurs façons selon le clavier :
   trois points ou le caractère « … », guillemets droits ou français,
   apostrophe droite ou courbe, tiret court ou long. Ce sont les mêmes
   signes ; les compter faux serait une faute de l'application, pas de
   l'élève. */
function normaliserPonctuation(texte){
  return String(texte || '')
    .replace(/\.\.\.+/g, '…')
    .replace(/[’‘‚‛]/g, "'")
    .replace(/[«»„“”"]/g, '"')
    .replace(/[–—―]/g, '-')
    .replace(/\u00a0|\u202f/g, ' ');
}

function tokenize(text, opts){
  text = normaliserPonctuation(text);
  const out = [];
  const re = /[A-Za-zÀ-ÖØ-öø-ÿŒœ0-9]+(?:[’'\-][A-Za-zÀ-ÖØ-öø-ÿŒœ0-9]+)*|[.,;:!?…"]/g;
  let m;
  while ((m = re.exec(text)) !== null){
    const raw = m[0];
    const isPunct = /^[.,;:!?…"]$/.test(raw);
    if (isPunct && !opts.punct) continue;
    let key = raw.replace(/[’]/g, "'").replace(/œ/g,'oe').replace(/Œ/g,'OE').replace(/æ/g,'ae').replace(/Æ/g,'AE');
    if (!opts.caps) key = key.toLowerCase();
    out.push({raw:raw, key:key, punct:isPunct});
  }
  return out;
}

function levenshtein(x, y){
  const n = x.length, m = y.length;
  if (!n) return m;
  if (!m) return n;
  let prev = new Array(m+1), cur = new Array(m+1);
  for (let j=0;j<=m;j++) prev[j] = j;
  for (let i=1;i<=n;i++){
    cur[0] = i;
    for (let j=1;j<=m;j++){
      cur[j] = Math.min(prev[j]+1, cur[j-1]+1, prev[j-1] + (x[i-1]===y[j-1] ? 0 : 1));
    }
    const t = prev; prev = cur; cur = t;
  }
  return prev[m];
}

function similar(x, y){
  const la = x.length, lb = y.length, big = Math.max(la, lb);
  if (!big) return 0;
  if (Math.abs(la-lb) / big > 0.5) return 0;
  return 1 - levenshtein(x, y) / big;
}

/* On préfère apparier deux mots proches (« chats » / « chat ») plutôt que de
   déclarer l'un oublié et l'autre en trop : la correction reste lisible. */
function diff(a, b){
  const n = a.length, m = b.length;
  const GAP = -1, SUB_NEAR = -0.25, SUB_FAR = -2.5, MATCH = 2;
  const mat = [], ptr = [];
  for (let i=0;i<=n;i++){ mat.push(new Float64Array(m+1)); ptr.push(new Int8Array(m+1)); }
  for (let j=1;j<=m;j++){ mat[0][j] = j * GAP; ptr[0][j] = 2; }
  for (let i=1;i<=n;i++){ mat[i][0] = i * GAP; ptr[i][0] = 1; }

  const cost = (i, j) => {
    if (a[i].key === b[j].key) return MATCH;
    if (a[i].punct !== b[j].punct) return SUB_FAR;
    return similar(a[i].key, b[j].key) >= 0.5 ? SUB_NEAR : SUB_FAR;
  };

  for (let i=1;i<=n;i++){
    for (let j=1;j<=m;j++){
      const d = mat[i-1][j-1] + cost(i-1, j-1);
      const u = mat[i-1][j] + GAP;
      const l = mat[i][j-1] + GAP;
      let best = d, dir = 0;
      if (u > best){ best = u; dir = 1; }
      if (l > best){ best = l; dir = 2; }
      mat[i][j] = best; ptr[i][j] = dir;
    }
  }

  const ops = [];
  let i = n, j = m;
  while (i > 0 || j > 0){
    const dir = (i > 0 && j > 0) ? ptr[i][j] : (i > 0 ? 1 : 2);
    if (dir === 0){
      ops.push(a[i-1].key === b[j-1].key
        ? {t:'ok', exp:a[i-1], got:b[j-1]}
        : {t:'wrong', exp:a[i-1], got:b[j-1]});
      i--; j--;
    } else if (dir === 1){
      ops.push({t:'missing', exp:a[i-1]}); i--;
    } else {
      ops.push({t:'extra', got:b[j-1]}); j--;
    }
  }
  return ops.reverse();
}

function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

$('check').onclick = () => {
  const original = els.text.value.trim();
  const mine = els.answer2.value.trim();
  if (!original){ els.result.innerHTML = '<p class="empty">Il faut d\u2019abord un texte à l\u2019étape 1.</p>'; return; }
  if (!mine){ els.result.innerHTML = '<p class="empty">Recopie ta dictée dans le cadre ci-dessus, puis clique sur « Corriger ma dictée ».</p>'; return; }

  const opts = {caps: els.caps.checked, punct: els.punctCheck.checked};
  const a = tokenize(original, opts);
  const b = tokenize(mine, opts);
  const ops = diff(a, b);

  let ok=0, wrong=0, missing=0, extra=0, html='';
  for (const o of ops){
    if (o.t==='ok'){ ok++; html += '<span class="w">'+esc(o.got.raw)+'</span> '; }
    else if (o.t==='wrong'){ wrong++; html += '<span class="w wrong"><s>'+esc(o.got.raw)+'</s><em>'+esc(o.exp.raw)+'</em></span> '; }
    else if (o.t==='missing'){ missing++; html += '<span class="w missing"><em>'+esc(o.exp.raw)+'</em></span> '; }
    else { extra++; html += '<span class="w extra"><s>'+esc(o.got.raw)+'</s></span> '; }
  }
  const errors = wrong + missing + extra;
  const total = a.length || 1;
  const pct = Math.round(ok / total * 100);
  const word = errors === 0 ? 'Sans faute !' : (errors === 1 ? '1 faute' : errors + ' fautes');
  const note = errors === 0 ? 'Bravo, tout est juste.'
    : (pct >= 90 ? 'C\u2019est presque parfait : relis les mots soulignés.'
    : (pct >= 75 ? 'Bon travail. Reprends les mots corrigés à l\u2019écrit.'
    : 'Refais la dictée après avoir relu les mots corrigés.'));

  els.result.innerHTML =
    '<div class="score">' +
      '<div class="mark">' + errors + '<small>' + (errors>1?'fautes':'faute') + '</small></div>' +
      '<div class="score-detail">' +
        '<p><strong>' + word + '</strong> — ' + note + '</p>' +
        '<p>' + ok + ' mots justes sur ' + a.length + ' (' + pct + '\u00a0%)</p>' +
        '<p style="color:var(--grey);font-size:13.5px">' + wrong + ' mal écrits · ' + missing + ' oubliés · ' + extra + ' en trop</p>' +
      '</div>' +
    '</div>' +
    '<div class="paper paper--margin copy">' + html + '</div>' +
    '<div class="legend">' +
      '<span><i style="background:#9B9BA6"></i> barré : ce que tu as écrit</span>' +
      '<span><i style="background:var(--red)"></i> à la main : le mot juste</span>' +
      '<span style="color:var(--red)">^ mot oublié</span>' +
    '</div>' +
    '<div class="actions"><button class="btn btn--ghost" id="again">Refaire la dictée</button></div>';

  const again = $('again');
  if (again) again.onclick = () => {
    state.index = 0; state.phase = 'idle'; state.running = false;
    go(1); render(false);
  };
};

/* =========================================================
   Importer un texte : PDF, photo, fichier texte
   ========================================================= */
const CDN = {
  pdf: ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'],
  pdfWorker: ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
              'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'],
  ocr: ['https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js',
        'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js'],
  ocrWorker: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/worker.min.js',
  ocrCore: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.0',
  ocrLang: 'https://tessdata.projectnaptha.com/4.0.0'
};

function setImport(msg, kind){
  els.importStatus.textContent = msg || '';
  els.importStatus.className = 'status' + (kind ? ' ' + kind : '');
}

function loadScript(src){
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => resolve(src);
    s.onerror = () => { s.parentNode && s.parentNode.removeChild(s); reject(new Error('inaccessible')); };
    document.head.appendChild(s);
  });
}

/* Certains environnements (dont l'aperçu intégré à une conversation) interdisent
   de lancer un processus de calcul en arrière-plan. On le teste une fois. */
let workersOk = null;
function backgroundWorkersAllowed(){
  if (workersOk !== null) return workersOk;
  workersOk = false;
  try {
    const url = URL.createObjectURL(new Blob(['self.close();'], {type:'text/javascript'}));
    const w = new Worker(url);
    w.terminate();
    URL.revokeObjectURL(url);
    workersOk = true;
  } catch(e){ workersOk = false; }
  return workersOk;
}

const NO_WORKER_HELP = 'Cet aperçu interdit les calculs en arrière-plan, dont la lecture d\u2019image a besoin. '
  + 'Télécharge la page et ouvre-la depuis ton ordinateur : l\u2019import de photos y fonctionne. '
  + 'Sinon, envoie la photo dans la conversation pour récupérer le texte.';

let pdfReady = null;
function ensurePdf(){
  if (pdfReady) return pdfReady;
  pdfReady = (async () => {
    for (let i=0;i<CDN.pdf.length;i++){
      try {
        await loadScript(CDN.pdf[i]);
        if (!window.pdfjsLib) continue;
        // sans processus en arrière-plan, on charge le module de lecture dans la
        // page elle-même : pdf.js s'en sert alors directement
        if (!backgroundWorkersAllowed()){
          try { await loadScript(CDN.pdfWorker[i]); } catch(e){}
        }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfWorker[i];
        return window.pdfjsLib;
      } catch(e){}
    }
    throw new Error('le lecteur de PDF n\u2019a pas pu être chargé (connexion ?)');
  })();
  pdfReady.catch(() => { pdfReady = null; });
  return pdfReady;
}

let ocrReady = null;
function ensureOcr(){
  if (ocrReady) return ocrReady;
  ocrReady = (async () => {
    for (const url of CDN.ocr){
      try { await loadScript(url); if (window.Tesseract) return window.Tesseract; } catch(e){}
    }
    throw new Error('la reconnaissance de texte n\u2019a pas pu être chargée (connexion ?)');
  })();
  ocrReady.catch(() => { ocrReady = null; });
  return ocrReady;
}

/* Une photo de cahier passe mieux en niveaux de gris contrastés et agrandie. */
function prepareCanvas(img, targetWidth){
  const scale = Math.min(3, Math.max(1, targetWidth / (img.naturalWidth || img.width || targetWidth)));
  const c = document.createElement('canvas');
  c.width = Math.round((img.naturalWidth || img.width) * scale);
  c.height = Math.round((img.naturalHeight || img.height) * scale);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, c.width, c.height);
  try{
    const d = ctx.getImageData(0, 0, c.width, c.height);
    const p = d.data;
    let min = 255, max = 0;
    for (let i=0;i<p.length;i+=4){
      const g = (p[i]*0.3 + p[i+1]*0.59 + p[i+2]*0.11) | 0;
      p[i] = p[i+1] = p[i+2] = g;
      if (g < min) min = g;
      if (g > max) max = g;
    }
    const span = Math.max(1, max - min);
    if (span < 250){
      for (let i=0;i<p.length;i+=4){
        const v = Math.max(0, Math.min(255, ((p[i] - min) * 255 / span) | 0));
        p[i] = p[i+1] = p[i+2] = v;
      }
    }
    ctx.putImageData(d, 0, 0);
  } catch(e){ /* image d'une autre origine : on garde l'original */ }
  return c;
}

function loadImage(file){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); setTimeout(() => URL.revokeObjectURL(url), 5000); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image illisible par le navigateur')); };
    img.src = url;
  });
}

let ocrWarned = false;
async function ocrCanvas(canvas){
  if (!backgroundWorkersAllowed()) throw new Error(NO_WORKER_HELP);
  const T = await ensureOcr();
  if (!ocrWarned){
    ocrWarned = true;
    setImport('Premier import : téléchargement du dictionnaire français, cela peut prendre une minute…');
  }
  const worker = await T.createWorker('fra', 1, {
    workerPath: CDN.ocrWorker,
    corePath: CDN.ocrCore,
    langPath: CDN.ocrLang,
    logger: (m) => {
      if (m && m.status === 'recognizing text'){
        setImport('Lecture du texte… ' + Math.round((m.progress || 0) * 100) + '\u00a0%');
      }
    }
  });
  try {
    const r = await worker.recognize(canvas);
    return (r && r.data && r.data.text) ? r.data.text : '';
  } finally {
    try { await worker.terminate(); } catch(e){}
  }
}

async function readPdf(file){
  const lib = await ensurePdf();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await lib.getDocument({ data: data }).promise;
  let text = '';
  for (let p = 1; p <= pdf.numPages; p++){
    setImport('Lecture de la page ' + p + ' sur ' + pdf.numPages + '…');
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    for (const it of content.items){
      text += it.str;
      if (it.hasEOL) text += '\n';
    }
    text += '\n\n';
  }
  if (text.replace(/\s/g, '').length >= 25) return text;

  // pas de couche texte : c'est un scan, il faut lire l'image
  if (!backgroundWorkersAllowed()) throw new Error('ce PDF est un scan, sans texte à extraire. ' + NO_WORKER_HELP);
  setImport('Ce PDF est un scan : lecture de l\u2019image…');
  const pages = Math.min(pdf.numPages, 3);
  let out = '';
  for (let p = 1; p <= pages; p++){
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 2 });
    const c = document.createElement('canvas');
    c.width = viewport.width; c.height = viewport.height;
    await page.render({ canvasContext: c.getContext('2d'), viewport: viewport }).promise;
    out += await ocrCanvas(c) + '\n\n';
  }
  return out;
}

/* Remet en forme un texte importé ou collé : numéros de ligne d'un manuel,
   mots coupés en fin de ligne, phrases éclatées, confusions courantes de l'OCR. */
function cleanText(raw){
  let t = String(raw || '').replace(/\r/g, '').replace(/\u00a0/g, ' ');

  // les numéros de ligne d'abord, sinon ils empêchent de recoller les mots coupés
  t = t.split('\n')
       .map(l => l.replace(/[ \t]+/g, ' ').trim().replace(/^\d{1,2}[.)]?\s+(?=[A-Za-zÀ-ÖØ-öø-ÿŒœ«])/, ''))
       .join('\n');

  // erreurs de lecture typiques d'une photo
  t = t.replace(/\bI'/g, "l'")
       .replace(/\bsceur/gi, 'sœur').replace(/\bceil\b/gi, 'œil')
       .replace(/\bceuf/gi, 'œuf').replace(/\bceuvre/gi, 'œuvre');

  // mot coupé par un retour à la ligne : on recolle en gardant le trait d'union,
  // qui appartient au mot dans « après-midi » ou « au-dessus »
  t = t.replace(/([A-Za-zÀ-ÖØ-öø-ÿŒœ])[-\u2010\u2011]\n[ \t]*([a-zà-öø-ÿœ])/g, '$1-$2');

  const out = [];
  for (const l of t.split('\n')){
    if (!l){ if (out.length && out[out.length-1] !== '') out.push(''); continue; }
    const prev = out.length ? out[out.length-1] : '';
    if (prev && !/[.!?…:»"]$/.test(prev) && /^[a-zà-öø-ÿœ«(]/.test(l)) out[out.length-1] = prev + ' ' + l;
    else out.push(l);
  }
  return out.join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\s+([,.])/g, '$1')      // pas d'espace avant la virgule ni le point
            .replace(/\s+([;:!?])/g, ' $1')   // une seule espace avant les autres, comme en français
            .trim();
}

async function importFile(file){
  if (!file) return;
  const name = file.name || 'fichier';
  const type = file.type || '';
  setImport('Ouverture de « ' + name + ' »…');
  try {
    let text = '';
    if (/\.(txt|text|md)$/i.test(name) || type.indexOf('text/') === 0){
      text = await file.text();
    } else if (/\.pdf$/i.test(name) || type === 'application/pdf'){
      text = await readPdf(file);
    } else if (type.indexOf('image/') === 0 || /\.(png|jpe?g|webp|gif|bmp)$/i.test(name)){
      setImport('Préparation de l\u2019image…');
      const img = await loadImage(file);
      text = await ocrCanvas(prepareCanvas(img, 1800));
    } else {
      throw new Error('format non reconnu — il faut un PDF, une image ou un fichier texte');
    }
    const clean = cleanText(text);
    if (!clean){
      setImport('Aucun texte trouvé. Pour une photo, cadre bien la page, à plat et sans ombre — ou recopie le texte à la main.', 'err');
      return;
    }
    els.text.value = clean;
    updateCount();
    setImport('Texte importé. Relis-le et corrige-le avant de lancer : la dictée et la correction se basent sur ce texte.', 'ok');
    els.text.focus();
  } catch(e){
    const m = (e && e.message) ? e.message : 'fichier illisible';
    setImport('Échec : ' + m + (/[.!?]$/.test(m) ? '' : '.'), 'err');
  }
}

els.pick.onclick = () => els.file.click();
els.file.onchange = (e) => {
  const f = e.target.files && e.target.files[0];
  importFile(f);
  e.target.value = '';
};
els.tidy.onclick = () => {
  const before = els.text.value;
  const after = cleanText(before);
  els.text.value = after;
  updateCount();
  setImport(after === before ? 'Le texte était déjà en forme.' : 'Texte remis en forme.', 'ok');
};

// on prévient dès le départ plutôt que de laisser l'enfant découvrir l'échec
if (!backgroundWorkersAllowed()){
  els.pick.textContent = 'Importer un PDF ou un fichier texte';
  setImport('Photos et PDF scannés : indisponibles dans cet aperçu, qui interdit les calculs en arrière-plan. Télécharge la page et ouvre-la depuis ton ordinateur pour les utiliser.');
}

['dragenter','dragover'].forEach(ev => els.dropZone.addEventListener(ev, (e) => {
  e.preventDefault(); e.stopPropagation();
  els.dropZone.classList.add('drop-on');
}));
['dragleave','dragend'].forEach(ev => els.dropZone.addEventListener(ev, (e) => {
  e.preventDefault();
  if (ev === 'dragleave' && els.dropZone.contains(e.relatedTarget)) return;
  els.dropZone.classList.remove('drop-on');
}));
els.dropZone.addEventListener('drop', (e) => {
  e.preventDefault(); e.stopPropagation();
  els.dropZone.classList.remove('drop-on');
  if (typeof modeOuvert === 'function' && modeOuvert()) return;   // pas d'import sur une dictée ouverte
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) importFile(f);
});


/* =========================================================
   Dialogue avec le serveur
   L'application doit rester utilisable sans lui : ouverte
   depuis un dossier, ou hébergée sans la partie PHP.
   ========================================================= */
const API = 'api/index.php';
const net = { available:false, user:null, csrf:null, abonnement:null, offre:null, google:'', panne:null };
const abonne = () => !!(net.abonnement && net.abonnement.abonne);

/* Les paramètres de recherche passent par un objet : les coller au nom de
   l'action donnait une esperluette encodée, et le serveur n'y comprenait rien. */
function apiUrl(action, params){
  let url = API + '?a=' + encodeURIComponent(action);
  if (params){
    Object.keys(params).forEach(k => {
      const v = params[k];
      if (v === null || v === undefined || v === '') return;
      url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(v);
    });
  }
  return url;
}

async function apiCall(action, body, params, isRetry){
  const opts = { method: body ? 'POST' : 'GET', credentials:'same-origin', headers:{} };
  if (body){
    opts.headers['Content-Type'] = 'application/json';
    opts.headers['X-CSRF'] = net.csrf || '';
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(apiUrl(action, params), opts);
  const txt = await r.text();
  let data;
  try { data = JSON.parse(txt); }
  catch(e){ throw new Error('le serveur n\u2019a pas répondu correctement'); }

  // le jeton de session change après une déconnexion ou une longue inactivité :
  // on le reprend et on retente une fois, sans que l'utilisateur voie l'incident
  if (r.status === 419 && !isRetry){
    const s = await apiCall('session');
    net.csrf = s.csrf || null;
    net.user = s.user || null;
    net.abonnement = s.abonnement || null;
    net.portail = s.portail || null;
    const oubli = $('auth-forgot');
    if (oubli && net.portail && net.portail.motdepasse){
      oubli.onclick = () => { window.open(net.portail.motdepasse, '_blank', 'noopener'); };
    }
    return apiCall(action, body, params, true);
  }
  if (!r.ok || data.error) throw new Error(data.error || ('erreur ' + r.status));
  return data;
}

/* =========================================================
   Où sont rangées les données
   ========================================================= */
const KEY = 'dictees';
const PREFS = 'reglages';
const mem = {};

let localKind = 'memory';
(function detectStorage(){
  if (window.storage && window.storage.get){ localKind = 'app'; return; }
  try {
    window.localStorage.setItem('__test__', '1');
    window.localStorage.removeItem('__test__');
    localKind = 'local';
  } catch(e){ localKind = 'memory'; }
})();

const kv = {
  async get(k){
    if (localKind === 'app'){
      try { const r = await window.storage.get(k); return (r && r.value) ? r.value : null; } catch(e){ return null; }
    }
    if (localKind === 'local'){
      try { return window.localStorage.getItem(k); } catch(e){ return null; }
    }
    return mem[k] || null;
  },
  async set(k, v){
    mem[k] = v;
    if (localKind === 'app'){
      try { await window.storage.set(k, v); return true; } catch(e){ return false; }
    }
    if (localKind === 'local'){
      try { window.localStorage.setItem(k, v); return true; } catch(e){ return false; }
    }
    return false;
  }
};

/* =========================================================
   Niveaux scolaires
   Un même code désigne la même année d'école dans les quatre
   systèmes : n1 est la première année où l'on apprend à écrire.
   La base ne stocke que le code, chacun le lit dans son vocabulaire.
   ========================================================= */
const NIVEAUX = [
  { code:'n1', age:'6–7 ans',   ch:'3H',  fr:'CP',  be:'P1', qc:'1re année' },
  { code:'n2', age:'7–8 ans',   ch:'4H',  fr:'CE1', be:'P2', qc:'2e année' },
  { code:'n3', age:'8–9 ans',   ch:'5H',  fr:'CE2', be:'P3', qc:'3e année' },
  { code:'n4', age:'9–10 ans',  ch:'6H',  fr:'CM1', be:'P4', qc:'4e année' },
  { code:'n5', age:'10–11 ans', ch:'7H',  fr:'CM2', be:'P5', qc:'5e année' },
  { code:'n6', age:'11–12 ans', ch:'8H',  fr:'6e',  be:'P6', qc:'6e année' },
  { code:'n7', age:'12–13 ans', ch:'9H',  fr:'5e',  be:'S1', qc:'Secondaire 1' },
  { code:'n8', age:'13–14 ans', ch:'10H', fr:'4e',  be:'S2', qc:'Secondaire 2' },
  { code:'n9', age:'14–15 ans', ch:'11H', fr:'3e',  be:'S3', qc:'Secondaire 3' }
];
function currentSys(){ const v = $('sys').value; return NIVEAUX[0][v] ? v : 'ch'; }
function levelName(code){
  const n = NIVEAUX.find(x => x.code === code);
  return n ? n[currentSys()] : '';
}
function levelFull(code){
  const n = NIVEAUX.find(x => x.code === code);
  return n ? (n[currentSys()] + ' · ' + n.age) : 'niveau non précisé';
}
function fillLevelSelects(){
  const sys = currentSys();
  const garder = { 'd-level': $('d-level').value, 'lib-level': $('lib-level').value };
  const options = (premier) => {
    let html = '<option value="">' + premier + '</option>';
    NIVEAUX.forEach(n => {
      html += '<option value="' + n.code + '">' + n[sys] + ' — ' + n.age + '</option>';
    });
    return html;
  };
  $('d-level').innerHTML = options('Non précisé');
  $('lib-level').innerHTML = options('Tous les niveaux');
  $('d-level').value = garder['d-level'] || '';
  $('lib-level').value = garder['lib-level'] || '';
}

function newLocalId(){ return 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
const onServer = () => !!net.user;

const store = {
  cache:null,
  async localList(){
    const raw = await kv.get(KEY);
    let list = [];
    try { list = raw ? JSON.parse(raw) : []; } catch(e){ list = []; }
    if (!Array.isArray(list)) list = [];
    return list.map(d => ({
      id: d.id || newLocalId(),
      title: d.title || d.name || 'Dictée',     // d.name : dictées d'une version précédente
      author: d.author || '',
      level: d.level || '',
      text: d.text || ''
    }));
  },
  async localWrite(list){ return kv.set(KEY, JSON.stringify(list.slice(0, 60))); },

  async list(force){
    if (this.cache && !force) return this.cache;
    if (onServer()){
      try { this.cache = (await apiCall('dictations')).dictations || []; }
      catch(e){ this.cache = []; }
    } else {
      this.cache = await this.localList();
    }
    return this.cache;
  },
  async add(item){
    if (onServer()){
      const r = await apiCall('dictation_save', {
        title:item.title, author:item.author || '', level:item.level || '',
        text:item.text, is_public: !!item.is_public
      });
      await this.list(true);
      return r.id ? Object.assign({}, item, { id:r.id, share_token:r.share_token || null }) : null;
    }
    const list = await this.localList();
    const nouvelle = Object.assign({}, item, { id:newLocalId() });
    list.unshift(nouvelle);
    const ok = await this.localWrite(list);
    this.cache = list;
    return ok ? nouvelle : null;
  },
  async update(id, item){
    if (onServer()){
      const r = await apiCall('dictation_save', {
        id:id, title:item.title, author:item.author || '', level:item.level || '',
        text:item.text, is_public: !!item.is_public
      });
      await this.list(true);
      return Object.assign({}, item, { id:id, share_token:r.share_token || null });
    }
    const list = await this.localList();
    const i = list.findIndex(d => String(d.id) === String(id));
    if (i < 0) return null;
    list[i] = Object.assign({}, item, { id:id });
    const ok = await this.localWrite(list);
    this.cache = list;
    return ok ? list[i] : null;
  },
  async setPublic(id, publier){
    if (!onServer()) return false;
    await apiCall('dictation_publish', { id:id, public: !!publier });
    await this.list(true);
    return true;
  },
  async remove(item){
    if (onServer()){
      await apiCall('dictation_delete', { id:item.id });
      await this.list(true);
      return true;
    }
    const list = (await this.localList()).filter(d => d.id !== item.id);
    const ok = await this.localWrite(list);
    this.cache = list;
    return ok;
  },
  async merge(items){
    const existing = await this.list(true);
    let added = 0;
    for (const d of items){
      if (!d || !d.text) continue;
      const titre = d.title || d.name || 'Dictée restaurée';
      if (existing.some(x => x.text === d.text && x.title === titre)) continue;
      await this.add({ title: titre, author: d.author || '', level: d.level || '', text: String(d.text) });
      added++;
    }
    await this.list(true);
    return added;
  }
};

const STORAGE_NOTE = {
  server: 'Tes dictées sont dans ton compte : tu les retrouves sur tous tes appareils.',
  app: 'Les dictées restent disponibles quand tu reviens sur la page.',
  local: 'Les dictées sont gardées dans ce navigateur, sur cet appareil.',
  memory: 'Ce navigateur refuse d\u2019enregistrer, sans doute en navigation privée. Utilise « Exporter » pour garder tes dictées dans un fichier.'
};
function storageKind(){ return onServer() ? 'server' : localKind; }

/* Sur le site en ligne, sans compte, on peut tout faire sauf conserver :
   la personne de passage repart d'une page blanche à la visite suivante.
   Ouverte depuis un dossier, sans serveur, l'application garde en local. */
/* Trois situations, et non deux :
   sans compte, on ne garde rien ;
   avec un compte gratuit, on garde cinq dictées et on en reprend cinq ;
   avec un abonnement, plus rien n'est compté, et l'on publie. */
function guestMode(){ return net.available && !abonne(); }
function sansCompte(){ return net.available && !net.user; }

/* Invitation adaptée : s'inscrire, ou s'abonner. */
function inviter(raison){
  if (sansCompte()){
    openAuth('register');
    authSay(raison + ' Commence par créer ton compte, c\u2019est gratuit.', '');
    return;
  }
  // l'abonnement se prend sur le portail : il vaut pour toutes les applications
  if (net.portail && net.portail.actif){
    window.location.href = net.portail.abonnement;
    return;
  }
  window.location.href = 'abonnement.html';
}

async function paintSaved(){
  const sansRien = sansCompte();
  const nonAbonne = !sansRien && !abonne();
  $('guest-note').hidden = !sansRien;
  $('mine-box').hidden = sansRien;
  els.savedEmpty.style.display = 'none';
  if (sansRien){
    els.savedList.innerHTML = '';
    $('saved-reprises').innerHTML = '';
    return;
  }
  // compte gratuit ou abonnement échu : on n'efface jamais rien
  $('abo-rappel').hidden = !nonAbonne;

  const list = await store.list();
  const miennes = list.filter(d => !d.borrowed);
  const reprises = list.filter(d => d.borrowed);

  els.savedList.innerHTML = '';
  $('saved-reprises').innerHTML = '';
  els.savedList.className = 'saved-liste';
  $('saved-reprises').className = 'saved-liste';
  $('titre-creations').hidden = !miennes.length;
  $('titre-reprises').hidden = !reprises.length;
  els.savedEmpty.style.display = list.length ? 'none' : 'block';
  $('saved-note').textContent = STORAGE_NOTE[storageKind()];

  miennes.forEach(d => els.savedList.appendChild(ligneDictee(d)));
  reprises.forEach(d => $('saved-reprises').appendChild(ligneDictee(d)));

  // dire où l'on en est de sa part gratuite, plutôt que de le laisser découvrir
  if (nonAbonne){
    const rappel = $('abo-rappel');
    const p = (rappel && rappel.querySelector) ? rappel.querySelector('p') : null;
    if (p){
      p.innerHTML = 'Compte gratuit : ' + miennes.length + ' dictée' + (miennes.length > 1 ? 's' : '')
        + ' sur 5, et ' + reprises.length + ' reprise' + (reprises.length > 1 ? 's' : '') + ' sur 5. '
        + 'Publier, partager et suivre ses résultats demandent un abonnement. '
        + 'Rien n\u2019est jamais effacé. <a href="abonnement.html">Voir l\u2019abonnement</a>';
    }
  }
}

/* Une ligne de « Mes dictées ».
   Deux auteurs ne doivent pas se confondre : `author` est celui du texte —
   Maupassant, La Fontaine — tandis que `origin_owner` est la personne qui a
   composé la dictée et l'a partagée. */
function ligneDictee(d){
  const li = document.createElement('li');

  const nom = document.createElement('span');
  nom.className = 'nom';
  nom.textContent = d.title;
  li.appendChild(nom);

  if (d.level){
    const b = document.createElement('span');
    b.className = 'badge';
    b.textContent = levelName(d.level);
    li.appendChild(b);
  }
  if (d.borrowed){
    const b = document.createElement('span');
    b.className = 'badge';
    b.textContent = 'reprise';
    li.appendChild(b);
  }
  if (d.is_public){
    const b = document.createElement('span');
    b.className = 'badge pub';
    b.textContent = 'publiée';
    li.appendChild(b);
  }

  const open = document.createElement('button');
  open.className = 'mini'; open.textContent = 'Ouvrir';
  open.onclick = () => {
    if (!peutQuitterLeTexte()) return;
    ouvrirDansEditeur(d, false);
    go(0, 5);
  };
  li.appendChild(open);

  if (onServer() && !d.borrowed && abonne()){
    const sh = document.createElement('button');
    sh.className = 'mini'; sh.textContent = 'Partager';
    sh.onclick = () => shareDictation(d);
    li.appendChild(sh);

    const pub = document.createElement('button');
    pub.className = 'mini';
    pub.textContent = d.is_public ? 'Dépublier' : 'Publier';
    pub.onclick = async () => {
      if (d.is_public && !window.confirm('Retirer « ' + d.title + ' » de la bibliothèque partagée ? Le lien de partage déjà envoyé, lui, continuera de fonctionner.')) return;
      try {
        await store.setPublic(d.id, !d.is_public);
        if (ouverte && String(ouverte.id) === String(d.id)){
          ouverte.is_public = !d.is_public;
          $('d-public').checked = ouverte.is_public;
        }
        await paintSaved();
        libSearch();
        $('saved-note').textContent = d.is_public
          ? '« ' + d.title + ' » est retirée de la bibliothèque.'
          : '« ' + d.title + ' » est publiée dans la bibliothèque.';
      } catch(e){
        $('saved-note').textContent = 'Opération impossible : ' + e.message + '.';
      }
    };
    li.appendChild(pub);
  }

  const del = document.createElement('button');
  del.className = 'mini del'; del.textContent = 'Supprimer';
  del.onclick = async () => { await store.remove(d); paintSaved(); };
  li.appendChild(del);

  const meta = document.createElement('p');
  meta.className = 'meta';
  const bouts = [];
  if (d.lang && d.lang !== 'fr' && LANGUES_DICTEE[d.lang]) bouts.push('en ' + LANGUES_DICTEE[d.lang].nom);
  if (d.author) bouts.push('texte de ' + d.author);
  if (d.borrowed) bouts.push('dictée partagée par ' + (d.origin_owner || 'un autre utilisateur'));
  else bouts.push('composée par toi');
  if (d.word_count) bouts.push(d.word_count + ' mots');
  meta.textContent = bouts.join(' · ');
  li.appendChild(meta);

  return li;
}

/* Le lien est composé à partir de l'adresse réellement affichée : le serveur,
   derrière un proxy ou un alias de domaine, ne connaît pas toujours la sienne. */
function lienVers(parametre, jeton){
  return window.location.origin + window.location.pathname + '?' + parametre + '=' + jeton;
}

async function shareDictation(d){
  try {
    const r = await apiCall('dictation_share', { id:d.id });
    const url = r.share_token ? lienVers('d', r.share_token) : r.url;

    // sur mobile et tablette, la feuille de partage du système propose
    // WhatsApp, Messages, le courrier… ailleurs on copie le lien
    if (navigator.share){
      try {
        await navigator.share({
          title: 'Dictée : ' + d.title,
          text: 'Voici une dictée à faire : « ' + d.title + ' »',
          url: url
        });
        $('saved-note').textContent = 'Lien partagé.';
        return;
      } catch(e){
        if (e && e.name === 'AbortError'){ $('saved-note').textContent = ''; return; }
      }
    }
    let copie = false;
    try { await navigator.clipboard.writeText(url); copie = true; } catch(e){}
    $('saved-note').textContent = (copie ? 'Lien copié : ' : 'Lien à recopier : ') + url;
  } catch(e){
    $('saved-note').textContent = 'Partage impossible : ' + e.message + '.';
  }
}

function dire(msg, genre){
  $('save-state').className = 'status' + (genre ? ' ' + genre : '');
  $('save-state').textContent = msg;
}

$('save').onclick = async () => {
  if (sansCompte()){
    Avis.fenetre('Il faut un compte pour garder ta dictée',
      'Un compte gratuit garde cinq dictées, et cinq reprises dans la bibliothèque. '
        + 'La création prend une minute, et rien n\u2019est jamais effacé ensuite.',
      [{ texte:'Créer un compte', principal:true, action: () => inviter('') },
       { texte:'Plus tard' }]);
    return;
  }
  if (empruntee){
    if (ouverte){ dire('Elle est déjà dans tes dictées.', 'ok'); return; }
    try {
      const r = await apiCall('dictation_borrow', { token: empruntee.token });
      store.cache = null;
      await paintSaved();
      const liste = await store.list();
      ouverte = liste.find(d => String(d.id) === String(r.id)) || null;
      majEtatEnregistrement();
      Avis.succes(r.already
        ? 'Elle était déjà dans tes dictées.'
        : '« ' + empruntee.title + ' » est enregistrée dans tes dictées, au nom de son auteur.');
    } catch(e){
      Avis.erreur('Impossible de l\u2019enregistrer : ' + e.message + '.');
    }
    return;
  }

  const text = els.text.value.trim();
  if (!text){ dire('La feuille est vide : colle d\u2019abord le texte de la dictée.', 'err'); return; }

  const titre = els.saveName.value.trim();
  if (!titre){
    Avis.erreur('Il faut un titre pour retrouver cette dictée.');
    els.saveName.focus();
    return;
  }

  const item = {
    title: titre,
    author: $('d-author').value.trim(),
    level: $('d-level').value,
    text: text,
    is_public: $('d-public').checked
  };

  // Deuxième enregistrement et suivants : on remplace, on n'empile pas.
  if (ouverte){
    const changeTitre = ouverte.title !== item.title;
    const ok = window.confirm(
      changeTitre
        ? 'Remplacer « ' + ouverte.title + ' » par la version affichée, désormais intitulée « ' + item.title + ' » ?'
        : 'Remplacer « ' + ouverte.title + ' » par la version affichée ?'
    );
    if (!ok) return;
  }

  let enregistree = null;
  try {
    enregistree = ouverte
      ? await store.update(ouverte.id, item)
      : await store.add(item);
  } catch(e){ enregistree = null; }

  if (!enregistree){
    Avis.erreur('Impossible d\u2019enregistrer. Utilise « Exporter » depuis Mes dictées pour conserver ce texte.');
    return;
  }

  ouverte = enregistree;
  modifie = false;
  montrerOngletOuverte(ouverte.title);
  appliquerMode();
  $('editor-title').textContent = 'Modifier la dictée';
  majEtatEnregistrement();
  Avis.succes(item.is_public
    ? '« ' + item.title + ' » est enregistrée et publiée dans la bibliothèque.'
    : '« ' + item.title + ' » est enregistrée.');
  if (item.is_public) libSearch();
};

$('export').onclick = async () => {
  // l'export reste ouvert même sans abonnement : on ne retient les données
  // de personne. Seuls ceux qui n'ont pas de compte n'ont rien à exporter.
  if (sansCompte()){ inviter('Il n\u2019y a encore rien à exporter.'); return; }
  const list = await store.list();
  if (!list.length){ $('saved-note').textContent = 'Il n\u2019y a encore aucune dictée à exporter.'; return; }
  const blob = new Blob([JSON.stringify({ dictees: list }, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'mes-dictees.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

$('restore').onclick = () => {
  if (sansCompte()){ inviter('Restaurer une sauvegarde suppose un endroit où la ranger.'); return; }
  $('restore-file').click();
};
$('restore-file').onchange = async (e) => {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const incoming = Array.isArray(data) ? data : (data && data.dictees);
    if (!Array.isArray(incoming)) throw new Error('fichier non reconnu');
    const added = await store.merge(incoming);
    await paintSaved();
    go(3);
    $('saved-note').textContent = added
      ? added + (added > 1 ? ' dictées ajoutées.' : ' dictée ajoutée.')
      : 'Ces dictées étaient déjà dans la liste.';
  } catch(err){
    $('saved-note').textContent = 'Restauration impossible : ' + (err.message || 'fichier illisible') + '.';
  }
};

/* =========================================================
   L'éditeur : une dictée ouverte à la fois
   Enregistrer une dictée déjà enregistrée la remplace, au lieu
   d'en empiler une copie de plus à chaque clic.
   ========================================================= */
let ouverte = null;      // la dictée en cours d'édition, null si elle est neuve
let modifie = false;
let empruntee = null;    // dictée d'un autre : jeton d'origine et auteur

function marquerModifie(){
  modifie = true;
  majEtatEnregistrement();
}
function majEtatEnregistrement(){
  const el = $('save-state');
  if (empruntee && ouverte){
    el.className = 'status ok';
    el.textContent = '« ' + ouverte.title + ' » est dans tes dictées, telle que son auteur l\u2019a écrite.';
    return;
  }
  if (empruntee){
    el.className = 'status';
    el.textContent = 'Enregistre-la pour la retrouver sans repasser par la bibliothèque.';
    return;
  }
  if (!ouverte){
    el.className = 'status';
    el.textContent = modifie ? 'Nouvelle dictée, pas encore enregistrée.' : '';
    return;
  }
  el.className = 'status' + (modifie ? '' : ' ok');
  el.textContent = modifie
    ? '« ' + ouverte.title +' » est ouverte et modifiée. Enregistrer remplacera la version gardée.'
    : '« ' + ouverte.title + ' » est enregistrée.';
}
/* Petits accesseurs tolérants : si la page servie est plus ancienne que ce
   script — un fichier oublié à l'envoi, un cache de navigateur — l'élément
   manquant est simplement ignoré au lieu d'interrompre tout l'enchaînement. */
function pose(id, propriete, valeur){
  const e = (typeof id === 'string') ? $(id) : id;
  if (e) e[propriete] = valeur;
}

/* Une dictée est ouverte dès qu'elle vient de « Mes dictées », de la
   bibliothèque, ou qu'elle a déjà été enregistrée. */
function modeOuvert(){ return !!(ouverte || empruntee); }

/* Deux réglages d'un même écran.
   En création, on prépare un texte : import, restauration, remise en forme.
   Sur une dictée ouverte, ces outils n'ont plus lieu d'être — et si elle est
   celle d'un autre, les champs sont en outre verrouillés. */
function appliquerMode(){
  const ouvert = modeOuvert();
  pose('titre-preparer', 'textContent', ouvert ? 'Le texte' : 'Préparer le texte');
  pose('import-head', 'hidden', ouvert);
  pose('tidy', 'hidden', ouvert);

  /* Une dictée venue de la bibliothèque se modifie librement : c'est la
     copie qu'on a chez soi. L'originale n'est pas touchée, et la version
     adaptée ne pourra pas être republiée. */
  const venue = !!empruntee;
  [els.text, els.saveName, $('d-author')].forEach(e => pose(e, 'readOnly', false));
  pose('d-level', 'disabled', false);
  pose('d-public', 'disabled', venue);
  pose('public-ligne', 'hidden', venue);
  pose('pick', 'disabled', false);
  pose('tidy', 'disabled', false);
  pose('emprunt', 'hidden', !venue);
  if (venue){
    const auteur = empruntee.author ? ' de ' + empruntee.author : '';
    pose('emprunt-texte', 'textContent', '« ' + empruntee.title + ' »' + auteur
      + ' vient de la bibliothèque. Tu peux la faire, la modifier et la garder : tes changements '
      + 'iront dans tes dictées, sans toucher à l\u2019originale. Elle ne pourra pas être republiée.');
  }
  pose(els.start, 'disabled', !els.text.value.trim());
  pose('save', 'textContent', venue ? 'Enregistrer dans mes dictées' : 'Enregistrer');
}

/* L'onglet doit nommer ce qu'on est en train de faire. « Créer une dictée »
   pendant qu'on en modifie une déjà écrite déroute : on croit en fabriquer
   une seconde. */
function montrerOngletOuverte(titre){
  const t = $('tab-5');
  if (!t) return;
  t.hidden = !titre;
  if (titre) t.textContent = 'Modifier la dictée';
  const neuf = $('tab-0');
  if (neuf) neuf.hidden = !!titre;   // on ne crée pas et ne modifie pas à la fois
}

function nouvelleDictee(){
  ouverte = null;
  modifie = false;
  empruntee = null;
  verrouillerLangue(false);   // un texte qu'on écrit choisit encore sa langue
  const neuf = $('tab-0');
  if (neuf) neuf.hidden = false;
  montrerOngletOuverte(null);
  els.text.value = '';
  els.saveName.value = '';
  $('d-author').value = '';
  $('d-level').value = '';
  $('d-public').checked = false;
  $('import-status').textContent = '';
  $('import-status').className = 'status';
  $('editor-title').textContent = 'Créer une dictée';
  $('editor-sub').textContent = 'Donne-lui un titre, colle ou importe le texte, et c\u2019est prêt.';
  updateCount();
  appliquerMode();      // indispensable : c'est lui qui déverrouille les champs
  majEtatEnregistrement();
  els.saveName.focus();
}
function ouvrirDansEditeur(d, neuve, emprunt){
  // la dictée impose sa langue, et l'on ne pourra plus en changer
  changerLangue((d && d.lang) ? d.lang : 'fr', true, true);
  ouverte = neuve ? null : d;
  empruntee = emprunt || (d && d.borrowed ? d : null);
  els.text.value = d.text || '';
  els.saveName.value = d.title || '';
  $('d-author').value = d.author || '';
  $('d-level').value = d.level || '';
  $('d-public').checked = !neuve && !!d.is_public;
  $('editor-title').textContent = neuve ? 'Créer une dictée' : 'Modifier la dictée';
  $('editor-sub').textContent = neuve
    ? 'Le texte est repris ; donne-lui un titre pour l\u2019enregistrer chez toi.'
    : 'Enregistrer remplacera la version gardée.';
  modifie = !!neuve && !empruntee;
  if (empruntee){
    $('editor-title').textContent = 'Modifier la dictée';
    $('editor-sub').textContent = 'Elle vient de la bibliothèque : tes modifications seront enregistrées '
      + 'dans tes dictées, sans toucher à l\u2019originale.';
  }
  montrerOngletOuverte(d.title || 'sans titre');
  verrouillerLangue(true);
  updateCount();
  appliquerMode();
  majEtatEnregistrement();
}

/* Ne pas perdre un texte en cours en ouvrant autre chose. */
function peutQuitterLeTexte(){
  if (!modifie || !els.text.value.trim()) return true;
  return window.confirm('Le texte affiché n\u2019est pas enregistré. Il sera remplacé. Continuer ?');
}

['text','save-name','d-author','d-level','d-public'].forEach(id => {
  const e = $(id);
  if (e) e.addEventListener('input', marquerModifie);
  if (e && (e.tagName === 'SELECT' || e.type === 'checkbox')) e.addEventListener('change', marquerModifie);
});

/* =========================================================
   Bibliothèque partagée, ouverte à tous, même sans compte
   ========================================================= */
let libTimer = null;

/* Les trois exemples vivent dans la page : ils marchent sans compte,
   sans connexion, et donnent de quoi essayer tout de suite. */
function exemples(){
  return SAMPLES.map((texte, i) => ({
    id: 'exemple-' + i,
    title: EXEMPLES_META[i].title,
    author: 'Exemple',
    level: EXEMPLES_META[i].level,
    text: texte,
    word_count: countWords(texte),
    exemple: true
  }));
}

async function libSearch(){
  const q = $('lib-q').value.trim();
  const niveau = $('lib-level').value;
  const ul = $('lib-list');

  const locaux = exemples().filter(d => {
    if (niveau && d.level !== niveau) return false;
    if (!q) return true;
    const m = q.toLowerCase();
    return d.title.toLowerCase().indexOf(m) >= 0 || d.author.toLowerCase().indexOf(m) >= 0;
  });

  $('lib-note').textContent = 'Recherche…';
  try {
    const r = await apiCall('library', null, { q: q, level: niveau });
    const list = locaux.concat(r.dictations || []);
    ul.innerHTML = '';
    list.forEach(d => ul.appendChild(libRow(d)));
    if (!list.length){
      $('lib-note').textContent = (q || niveau)
        ? 'Aucune dictée ne correspond. Essaie un autre mot, ou un autre niveau.'
        : 'La bibliothèque est encore vide. Publie la première dictée !';
    } else {
      const partagees = list.length - locaux.length;
      const bouts = [];
      if (locaux.length) bouts.push(locaux.length + (locaux.length > 1 ? ' exemples' : ' exemple'));
      if (partagees) bouts.push(partagees + (partagees > 1 ? ' dictées partagées' : ' dictée partagée') + ' par les utilisateurs');
      $('lib-note').textContent = bouts.join(' et ') + '. Le contenu partagé est celui de ses auteurs.'
        + (guestMode() && partagees ? ' Un compte est nécessaire pour ouvrir leur texte ; les exemples sont libres.' : '');
    }
  } catch(e){
    // le serveur est muet : il reste au moins les exemples
    ul.innerHTML = '';
    locaux.forEach(d => ul.appendChild(libRow(d)));
    $('lib-note').textContent = locaux.length
      ? 'Les dictées des autres utilisateurs ne sont pas accessibles pour l\u2019instant. Voici les exemples.'
      : 'Recherche impossible : ' + e.message + '.';
  }
}

function libRow(d){
  const li = document.createElement('li');

  const t = document.createElement('span');
  t.className = 't';
  t.textContent = d.title;
  li.appendChild(t);

  if (d.level){
    const b = document.createElement('span');
    b.className = 'badge';
    b.textContent = levelName(d.level);
    li.appendChild(b);
  }
  if (d.exemple){
    const b = document.createElement('span');
    b.className = 'badge pub';
    b.textContent = 'exemple';
    li.appendChild(b);
  }

  const use = document.createElement('button');
  use.className = 'mini';
  use.textContent = (d.exemple || !guestMode()) ? 'Utiliser' : 'Ouvrir avec un compte';
  use.onclick = () => {
    if (!peutQuitterLeTexte()) return;
    if (d.exemple){                     // rien à demander au serveur
      ouvrirDansEditeur(d, true);
      go(0);
      return;
    }
    if (sansCompte()){
      inviter('Le catalogue est ouvert à tous ; crée un compte pour ouvrir le texte d\u2019une dictée partagée.');
      return;
    }
    openShared(d.share_token, true);
  };
  li.appendChild(use);

  if (!d.exemple){
    const flag = document.createElement('button');
    flag.className = 'mini del';
    flag.textContent = 'Signaler';
    flag.onclick = async () => {
      if (!window.confirm('Signaler cette dictée comme inappropriée ? Le responsable du site en sera averti.')) return;
      try {
        const r = await apiCall('dictation_report', { id: d.id });
        $('lib-note').textContent = (r.count >= 3)
          ? 'Merci. Cette dictée est retirée de la bibliothèque en attendant vérification.'
          : 'Merci, le signalement est enregistré. La dictée sera retirée automatiquement au troisième signalement.';
      } catch(e){ $('lib-note').textContent = 'Signalement impossible : ' + e.message + '.'; }
    };
    li.appendChild(flag);
  }

  const meta = document.createElement('span');
  meta.className = 'meta';
  meta.textContent = ((d.lang && LANGUES_DICTEE[d.lang] && d.lang !== 'fr') ? LANGUES_DICTEE[d.lang].nom + ' · ' : '')
    + (d.author ? 'texte de ' + d.author + ' · ' : '')
    + (d.level ? levelFull(d.level) + ' · ' : '')
    + d.word_count + ' mots';
  li.appendChild(meta);

  return li;
}

/* Ouvre une dictée reçue par lien ou choisie dans la bibliothèque. */
async function openShared(token, silencieux){
  if (!token) return;

  // on sépare l'appel au serveur de l'affichage : un pépin d'affichage ne
  // doit pas faire croire que la dictée est inaccessible
  let d;
  try {
    d = (await apiCall('dictation_open', null, { t: token })).dictation;
  } catch(e){
    if (silencieux) $('lib-note').textContent = 'Impossible d\u2019ouvrir cette dictée : ' + e.message + '.';
    else {
      $('import-status').className = 'status err';
      $('import-status').textContent = 'Ce lien de dictée ne fonctionne plus.';
    }
    return;
  }

  // dictée d'un autre : consultable, jouable, mais pas modifiable
  ouvrirDansEditeur(d, true, { token: token, title: d.title, author: d.author });
  go(0, 5);
  pose('import-status', 'className', 'status ok');
  pose('import-status', 'textContent', '« ' + d.title + ' »'
    + (d.author ? ', de ' + d.author : '')
    + (d.level ? ', ' + levelFull(d.level) : '')
    + ' — le texte est prêt.');
}

$('lib-go').onclick = libSearch;
$('lib-level').addEventListener('change', libSearch);
$('lib-q').addEventListener('input', () => { clearTimeout(libTimer); libTimer = setTimeout(libSearch, 400); });
$('lib-q').addEventListener('keydown', (e) => { if (e.key === 'Enter'){ clearTimeout(libTimer); libSearch(); } });
$('sys').addEventListener('change', () => { fillLevelSelects(); paintSaved(); libSearch(); });

/* =========================================================
   Réglages retenus (jamais la clé API)
   ========================================================= */
const PREF_FIELDS = ['rate','words','speed','sys','opt-punct','opt-repeat','opt-intro','opt-review','opt-hide','opt-caps','opt-punct-check','opt-signes-fr'];
let prefsLoaded = false;

/* =========================================================
   Les réglages, langue par langue

   Une dictée d'allemand ne se lit pas comme une dictée de
   français : plus lentement, par groupes plus courts, avec
   une voix allemande. Chaque langue garde donc ses propres
   réglages, et changer de langue les rappelle.
   ========================================================= */

/* Le point de départ d'une langue encore jamais réglée. Pour une
   langue étrangère, on ralentit et on raccourcit les groupes : c'est
   ce qu'un enseignant fait spontanément. */
function reglagesParDefaut(code){
  const etrangere = (code !== 'fr');
  return {
    rate:  etrangere ? '0.85' : '1',
    words: etrangere ? '6' : '8',
    'opt-repeat': etrangere ? '2' : '1',
    'opt-signes-fr': false
  };
}

let reglagesLangues = {};      // { fr:{...}, de:{...} }

function lireChamps(){
  const o = {};
  PREF_FIELDS.forEach(id => {
    const e = $(id);
    if (e) o[id] = (e.type === 'checkbox') ? e.checked : e.value;
  });
  o.voice = els.voice.value;
  return o;
}

function ecrireChamps(o){
  if (!o) return;
  PREF_FIELDS.forEach(id => {
    const e = $(id);
    if (!e || !(id in o)) return;
    if (e.type === 'checkbox') e.checked = !!o[id];
    else e.value = o[id];
  });
  if (o.voice){ savedVoiceId = o.voice; if (supported) loadVoices(); }
  else { savedVoiceId = null; if (supported) loadVoices(); }
}

function readPrefs(){
  reglagesLangues[langueDictee] = lireChamps();
  return { langue: langueDictee, parLangue: reglagesLangues };
}

function applyPrefs(o){
  if (!o) return;

  if (o.parLangue && typeof o.parLangue === 'object'){
    reglagesLangues = o.parLangue;
  } else {
    // ancien format : un seul jeu de réglages, qui devient celui du français
    const ancien = {};
    PREF_FIELDS.concat(['voice']).forEach(id => { if (id in o) ancien[id] = o[id]; });
    reglagesLangues = { fr: ancien };
  }

  const code = (o.langue && LANGUES_DICTEE[o.langue]) ? o.langue : 'fr';
  langueDictee = code;
  const sel = document.getElementById('d-langue');
  if (sel) sel.value = code;
  ecrireChamps(reglagesLangues[code] || reglagesParDefaut(code));
  majOptionSignes();
}

/* L'option n'a de sens que pour une dictée en langue étrangère. */
function majOptionSignes(){
  const etrangere = langueDictee !== 'fr';
  ['ligne-signes-fr', 'aide-signes-fr'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.hidden = !etrangere;
  });
  const titre = document.getElementById('titre-reglages-lecture');
  if (titre) titre.textContent = 'Réglages de lecture — ' + langue().nom;
}

async function loadPrefs(){
  let o = null;
  if (onServer()){
    try { o = (await apiCall('settings')).settings; } catch(e){ o = null; }
  }
  // de passage sur le site : on ne va rien chercher, rien n'a été écrit
  if (!o && !guestMode()){
    const raw = await kv.get(PREFS);
    if (raw){ try { o = JSON.parse(raw); } catch(e){ o = null; } }
  }
  applyPrefs(o);
  prefsLoaded = true;
  syncLabels();
  updateCount();
  render(false);
}

let prefTimer = null;
function savePrefs(){
  if (!prefsLoaded) return;
  if (guestMode()) return;      // sans compte, on ne laisse aucune trace sur l'appareil
  const o = readPrefs();
  kv.set(PREFS, JSON.stringify(o));
  if (onServer()){
    clearTimeout(prefTimer);
    prefTimer = setTimeout(() => { apiCall('settings', { settings:o }).catch(() => {}); }, 600);
  }
}
PREF_FIELDS.concat(['voice']).forEach(id => {
  const e = $(id);
  if (e) e.addEventListener('change', () => { savedVoiceId = els.voice.value; savePrefs(); });
});

/* =========================================================
   Historique des résultats
   ========================================================= */
function currentLabel(){
  const t = els.text.value.trim().split(/\s+/).slice(0, 6).join(' ');
  return (els.saveName.value.trim() || t || 'Dictée').slice(0, 110);   // le champ Titre
}

/* Le résultat rejoint le profil dès la correction, sans rien demander :
   c'est le suivi de la progression qui donne sa valeur au compte. */
window.onCorrected = async (stats) => {
  const note = document.getElementById('enregistrement-note');
  const dire = (msg, genre) => {
    if (note){ note.className = 'status' + (genre ? ' ' + genre : ''); note.textContent = msg; }
  };

  if (!onServer()){ dire(''); return; }
  if (sansCompte()){
    dire('Crée un compte pour garder ce résultat et suivre tes progrès.');
    return;
  }
  if (!abonne()){
    dire('Le suivi des résultats fait partie de l\u2019abonnement : celui-ci n\u2019a pas été enregistré.');
    return;
  }

  dire('Enregistrement du résultat…');
  try {
    await apiCall('attempt_save', {
      label: currentLabel(),
      dictation_id: ouverte ? ouverte.id : 0,
      words: stats.total, correct: stats.ok, errors: stats.errors
    });
    dire('Résultat enregistré dans ton profil. Il apparaît dans « Mes résultats ».', 'ok');
    loadHistory();
    chargerSuivi();
  } catch(e){
    dire('Le résultat n\u2019a pas pu être enregistré : ' + e.message + '.', 'err');
  }
};

/* =========================================================
   Mes résultats : une ligne par dictée, ses essais dans l'ordre
   ========================================================= */
function classeEssai(erreurs, mots){
  if (erreurs === 0) return 'essai zero';
  return (mots && erreurs / mots > 0.15) ? 'essai beaucoup' : 'essai peu';
}

async function chargerSuivi(){
  const invite = $('res-invite');
  const box = $('res-box');
  if (sansCompte()){
    invite.hidden = false; box.hidden = true;
    $('res-invite-texte').textContent = 'Le suivi des résultats demande un compte, puis un abonnement. '
      + 'Sans cela, la correction fonctionne mais rien n\u2019est conservé.';
    $('res-bouton').textContent = 'Créer un compte';
    $('res-bouton').onclick = () => inviter('Suivre tes résultats fait partie de l\u2019abonnement.');
    return;
  }
  if (!abonne()){
    invite.hidden = false; box.hidden = true;
    $('res-invite-texte').textContent = 'Le suivi des résultats fait partie de l\u2019abonnement. '
      + 'Les résultats déjà enregistrés ne sont pas effacés : ils réapparaîtront si tu te réabonnes.';
    $('res-bouton').textContent = 'Voir l\u2019abonnement';
    $('res-bouton').onclick = () => { window.location.href = 'abonnement.html'; };
    return;
  }
  invite.hidden = true; box.hidden = false;

  const ul = $('res-liste');
  try {
    const r = await apiCall('attempts_par_dictee');
    const dictees = r.dictees || [];
    ul.innerHTML = '';
    dictees.forEach(d => ul.appendChild(ligneSuivi(d)));
    $('res-note').textContent = dictees.length
      ? dictees.length + (dictees.length > 1 ? ' dictées suivies.' : ' dictée suivie.')
        + ' Chaque carré est un essai, du plus ancien au plus récent.'
      : 'Aucun résultat pour l\u2019instant. Fais une dictée, puis clique sur « Corriger ma dictée ».';
  } catch(e){
    ul.innerHTML = '';
    $('res-note').textContent = 'Résultats indisponibles : ' + e.message + '.';
  }
}

function ligneSuivi(d){
  const li = document.createElement('li');

  const tete = document.createElement('div');
  tete.className = 'tete';
  const nom = document.createElement('b');
  nom.textContent = d.label;
  tete.appendChild(nom);

  const nb = document.createElement('span');
  nb.className = 'badge';
  nb.textContent = d.nb + (d.nb > 1 ? ' essais' : ' essai');
  tete.appendChild(nb);

  const quand = document.createElement('span');
  quand.className = 'quand';
  const dt = new Date(String(d.derniere_date || '').replace(' ', 'T'));
  quand.textContent = isNaN(dt) ? '' : 'dernier le ' + dt.toLocaleDateString('fr-FR', {day:'numeric', month:'short'});
  tete.appendChild(quand);
  li.appendChild(tete);

  const essais = document.createElement('div');
  essais.className = 'essais';
  d.essais.forEach(e => {
    const c = document.createElement('span');
    c.className = classeEssai(e.errors, e.words);
    c.title = e.correct + ' mots justes sur ' + e.words;
    c.innerHTML = e.errors + '<small>' + (e.errors > 1 ? 'fautes' : 'faute') + '</small>';
    essais.appendChild(c);
  });
  li.appendChild(essais);

  if (d.nb > 1){
    const t = document.createElement('p');
    t.className = 'tendance';
    const ecart = d.premier_erreurs - d.dernier_erreurs;
    if (ecart > 0) t.innerHTML = '<b>' + ecart + ' faute' + (ecart > 1 ? 's' : '') + ' de moins</b> qu\u2019au premier essai.';
    else if (ecart < 0) t.innerHTML = '<b class="pire">' + (-ecart) + ' faute' + (-ecart > 1 ? 's' : '') + ' de plus</b> qu\u2019au premier essai.';
    else t.textContent = 'Autant de fautes qu\u2019au premier essai.';
    if (d.meilleur_erreurs === 0) t.innerHTML += ' Une fois sans faute.';
    li.appendChild(t);
  }
  return li;
}

async function loadHistory(){
  if (!onServer()){ $('history-card').hidden = true; return; }
  try {
    const list = (await apiCall('attempts')).attempts || [];
    $('history-card').hidden = false;
    const ul = $('history-list');
    ul.innerHTML = '';
    list.forEach(a => {
      const li = document.createElement('li');
      const b = document.createElement('b');
      const errs = Number(a.errors);
      b.textContent = errs === 0 ? 'sans faute' : (errs + (errs > 1 ? ' fautes' : ' faute'));
      const s = document.createElement('span');
      s.textContent = a.label;
      const w = document.createElement('span');
      w.className = 'when';
      const d = new Date((a.created_at || '').replace(' ', 'T'));
      w.textContent = isNaN(d) ? '' : d.toLocaleDateString('fr-FR', {day:'numeric', month:'short'});
      li.appendChild(b); li.appendChild(s); li.appendChild(w);
      ul.appendChild(li);
    });
    $('history-note').textContent = list.length
      ? 'Les résultats sont gardés dans ton compte.'
      : 'Tes prochains résultats apparaîtront ici.';
  } catch(e){ $('history-card').hidden = true; }
}

/* =========================================================
   Compte : ouvrir une session, en créer une
   ========================================================= */
let authMode = 'login';
let resetToken = null;

function paintAccount(){
  // le menu du haut est partagé par toutes les pages : voir assets/menu.js
  if (window.MenuCompte) window.MenuCompte.peindre(net.user, abonne(), net.available);
  pose('delete-account', 'hidden', !net.user);
}

$('delete-account').onclick = async () => {
  if (!net.user) return;
  const sure = window.confirm(
    'Cela effacera définitivement ton compte, tes dictées et tes résultats. '
    + 'Pense à les exporter avant. Continuer ?'
  );
  if (!sure) return;
  try {
    await apiCall('account_delete', {});
    net.user = null;
    store.cache = null;
    paintAccount();
    await paintSaved();
    loadHistory();
    $('saved-note').textContent = 'Compte supprimé.';
  } catch(e){
    $('saved-note').textContent = 'Suppression impossible : ' + e.message + '.';
  }
};

const AUTH_MODES = {
  login:    { titre:'Se connecter',          sous:'Retrouve tes dictées et tes réglages sur tous tes appareils.',
              bouton:'Se connecter',         autre:'Créer un compte' },
  register: { titre:'Créer un compte',       sous:'Un compte garde tes dictées, tes réglages et tes résultats.',
              bouton:'Créer mon compte',     autre:"J'ai déjà un compte" },
  forgot:   { titre:'Mot de passe oublié',   sous:'Indique ton adresse : tu recevras un lien pour en choisir un nouveau.',
              bouton:'Envoyer le lien',      autre:'Revenir à la connexion' },
  reset:    { titre:'Nouveau mot de passe',  sous:'Choisis un mot de passe d\u2019au moins 8 caractères.',
              bouton:'Enregistrer',          autre:'Revenir à la connexion' }
};

function setAuthMode(mode){
  authMode = mode;
  const m = AUTH_MODES[mode];
  $('auth-title').textContent = m.titre;
  $('auth-sub').textContent = m.sous;
  $('auth-submit').textContent = m.bouton;
  $('auth-switch').textContent = m.autre;

  $('name-field').hidden = mode !== 'register';
  $('email-field').hidden = mode === 'reset';
  $('password-field').hidden = mode === 'forgot';
  $('auth-forgot').hidden = mode !== 'login';
  $('auth-password').setAttribute('autocomplete', mode === 'login' ? 'current-password' : 'new-password');
  $('auth-password').placeholder = mode === 'login' ? 'Ton mot de passe' : 'Au moins 8 caractères';
  authSay('');
}
function authSay(msg, kind){
  $('auth-status').textContent = msg || '';
  $('auth-status').className = 'status' + (kind ? ' ' + kind : '');
}
/* Le formulaire reste ici : le serveur ouvre une session du portail, donc
   se connecter depuis la dictée vaut pour toutes les applications. */
function openAuth(mode){
  $('auth-modal').hidden = false;
  setAuthMode(mode === 'register' ? 'register' : 'login');
  setTimeout(() => $('auth-email').focus(), 60);
}
function closeAuth(){ $('auth-modal').hidden = true; $('auth-password').value = ''; }

/* « Continuer avec Google », si le site est configuré pour cela. */
async function installerGoogle(){
  if (!net.google || !window.ConnexionGoogle) return;
  const zone = $('zone-google');
  const bloc = $('zone-google-bloc');
  if (!zone) return;
  const pose = await window.ConnexionGoogle.installer(net.google, zone, async (jeton) => {
    authSay('Connexion en cours…');
    try {
      const avant = await store.localList();
      const r = await apiCall('google', { credential: jeton });
      await afterSignIn(r, avant);
    } catch(e){
      authSay('Connexion Google impossible : ' + e.message + '.', 'err');
    }
  });
  if (bloc) bloc.hidden = !pose;
}

$('open-auth').onclick = openAuth;
$('guest-signup').onclick = () => inviter('Crée un compte pour garder tes dictées : cinq gratuitement.');
$('auth-close').onclick = closeAuth;
$('auth-switch').onclick = () => setAuthMode(authMode === 'login' ? 'register' : 'login');
$('auth-forgot').onclick = () => setAuthMode('forgot');
$('auth-modal').addEventListener('click', (e) => { if (e.target === $('auth-modal')) closeAuth(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('auth-modal').hidden) closeAuth(); });
['auth-email','auth-password','auth-name'].forEach(id => {
  $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') $('auth-submit').click(); });
});

/* Une fois connecté, quel que soit le chemin emprunté. */
async function afterSignIn(r, localBefore){
  net.user = r.user;
  net.csrf = r.csrf || net.csrf;
  const nouveauCompte = !!r.nouveau;
  try {
    const s = await apiCall('session');
    net.abonnement = s.abonnement || null;
    net.portail = s.portail || null;
    const oubli = $('auth-forgot');
    if (oubli && net.portail && net.portail.motdepasse){
      oubli.onclick = () => { window.open(net.portail.motdepasse, '_blank', 'noopener'); };
    }
    net.offre = s.offre || null;
  } catch(e){}
  store.cache = null;
  let message = '';
  if (localBefore && localBefore.length){
    const added = await store.merge(localBefore);    // on ne perd rien en se connectant
    if (added) message = added + (added > 1 ? ' dictées reprises dans le compte.' : ' dictée reprise dans le compte.');
  }
  closeAuth();
  paintAccount();
  await loadPrefs();
  await paintSaved();
  loadHistory();
  if (message) $('saved-note').textContent = message;
  if (nouveauCompte && window.Bienvenue) window.Bienvenue.inscription(net.user);
}

$('auth-submit').onclick = async () => {
  const email = $('auth-email').value.trim();
  const password = $('auth-password').value;
  const name = $('auth-name').value.trim();

  if (authMode === 'forgot' && !email){ authSay('Indique ton adresse e-mail.', 'err'); return; }
  if (authMode === 'reset' && !password){ authSay('Choisis un mot de passe.', 'err'); return; }
  if (authMode !== 'forgot' && authMode !== 'reset' && (!email || !password)){
    authSay('Il faut une adresse et un mot de passe.', 'err'); return;
  }
  if (authMode !== 'login' && authMode !== 'forgot' && password.length < 8){
    authSay('Le mot de passe doit faire au moins 8 caractères.', 'err'); return;
  }

  $('auth-submit').disabled = true;
  try {
    if (authMode === 'forgot'){
      authSay('Envoi en cours…');
      await apiCall('password_forgot', { email:email });
      // le serveur répond la même chose que l'adresse existe ou non
      authSay('Si un compte existe avec cette adresse, le lien vient de partir. Pense à regarder les indésirables.', 'ok');
      return;
    }
    if (authMode === 'reset'){
      authSay('Enregistrement…');
      const r = await apiCall('password_reset', { token:resetToken, password:password });
      resetToken = null;
      await afterSignIn(r, await store.localList());
      return;
    }
    authSay(authMode === 'register' ? 'Création du compte…' : 'Connexion…');
    // une dictée déjà rangée localement, avant qu'un serveur existe, n'est pas perdue
    const before = await store.localList();
    const r = await apiCall(authMode, { email:email, password:password, name:name });
    await afterSignIn(r, before);
  } catch(e){
    authSay(e.message || 'opération impossible', 'err');
  } finally {
    $('auth-submit').disabled = false;
  }
};

$('logout').onclick = async () => {
  /* On appelle le serveur d'abord : c'est lui qui ferme la session du
     portail. Puis on renvoie vers needhelpapp.com, pour que la page
     d'accueil reflète elle aussi la déconnexion. */
  let versPortail = null;
  try {
    const r = await apiCall('logout', {});
    net.csrf = r.csrf || net.csrf;      // le serveur en délivre un nouveau
    versPortail = r.portail || null;
  } catch(e){}
  net.user = null;
  net.abonnement = null;
  store.cache = null;
  paintAccount();
  await paintSaved();
  loadHistory();
  if (versPortail){ window.location.href = versPortail; return; }
};

/* =========================================================
   Adaptation à la taille de l'écran
   ========================================================= */
const wide = window.matchMedia('(min-width:960px)');

function syncSettingsPanel(){
  // sur ordinateur les réglages restent dépliés, sur petit écran ils se replient
  if (wide.matches) $('settings-card').open = true;
}

function updateDock(){
  const dock = $('dock');
  if (!dock) return;
  const show = $('panel-1').classList.contains('on') && !wide.matches;
  dock.hidden = !show;
  document.body.classList.toggle('docked', show);
  if (!show) return;
  pose('dock-play', 'textContent', state.running ? (state.paused ? '▶' : '❚❚') : '▶');
  pose('dock-repeat', 'disabled', els.repeat.disabled);
  pose('dock-more', 'disabled', els.more.disabled);
  pose('dock-done', 'disabled', els.done.disabled);
}

$('dock-play').onclick = () => els.play.click();
$('dock-repeat').onclick = () => els.repeat.click();
$('dock-more').onclick = () => els.more.click();
$('dock-done').onclick = () => els.done.click();

// on prolonge l'affichage du moteur plutôt que de le modifier
const engineRender = render;
render = function(writing){ engineRender(writing); updateDock(); };

/* Cinq destinations désormais : la création, mes dictées, la bibliothèque,
   puis les deux temps de la dictée elle-même. */
const PANELS = ['0', '1', '2', '3', '4', '6'];
const ONGLETS = ['0', '1', '2', '3', '4', '5', '6'];

/* L'onglet 5 mène au même écran que le 0, mais sans le vider : « Créer une
   dictée » part toujours d'une feuille blanche, « La dictée ouverte »
   retrouve celle qu'on est en train de faire. */
go = function(i, onglet){
  const cible = String(i);
  const actif = (onglet === undefined) ? cible : String(onglet);
  PANELS.forEach(k => {
    $('panel-' + k).className = 'panel' + (k === cible ? ' on' : '');
  });
  ONGLETS.forEach(k => {
    const t = $('tab-' + k);
    if (t) t.setAttribute('aria-current', k === actif ? 'true' : 'false');
  });
  if (cible !== '1' && state.running){
    stopSpeech(); state.running = false; state.paused = false; render(false);
  }
  if (cible === '3') paintSaved();
  if (cible === '4') libSearch();
  if (cible === '6') chargerSuivi();
  window.scrollTo({ top:0, behavior:'smooth' });
  updateDock();
};

$('new-dictation').onclick = () => { nouvelleDictee(); go(0); };

wide.addEventListener('change', () => { syncSettingsPanel(); updateDock(); });

/* =========================================================
   Démarrage
   ========================================================= */
els.answer.addEventListener('input', () => { els.answer2.value = els.answer.value; });
syncLabels();
aiSync();
updateCount();
syncSettingsPanel();
fillLevelSelects();
remplirLangues();
if ($('d-langue')) $('d-langue').onchange = () => changerLangue($('d-langue').value);

/* Retaguer sa propre dictée reste possible : on a pu se tromper en la
   créant. Mais c'est un acte délibéré, pas un réglage qu'on effleure. */
if ($('changer-langue')) $('changer-langue').onclick = () => {
  if (!window.confirm('Changer la langue de cette dictée ?\n\n'
      + 'Le texte ne change pas, mais il sera lu par une voix ' + 'différente, '
      + 'et la dictée changera de rayon dans la bibliothèque.')) return;
  verrouillerLangue(false);
  dire('Tu peux choisir une autre langue. Enregistre ensuite pour la garder.', 'ok');
  $('d-langue').focus();
};
if ($('lib-langue')) $('lib-langue').onchange = () => libSearch();
appliquerMode();      // état de départ cohérent : rien n'est verrouillé
majEtatEnregistrement();
render(false);
setStroke(0,0,false);

(async function boot(){
  // Un serveur qui répond mal n'est pas un serveur absent : dans le premier
  // cas on garde les boutons et l'on affiche ce qui ne va pas.
  try {
    const r = await fetch(apiUrl('session'), { credentials:'same-origin' });
    const txt = await r.text();
    let s = null;
    try { s = JSON.parse(txt); } catch(e){}
    net.available = true;
    if (!s || s.error){
      net.panne = (s && s.error) || 'le serveur ne répond pas correctement';
      net.user = null; net.abonnement = null;
    } else {
      net.panne = null;
      net.csrf = s.csrf || null;
      net.user = s.user || null;
      net.abonnement = s.abonnement || null;
    net.portail = s.portail || null;
    const oubli = $('auth-forgot');
    if (oubli && net.portail && net.portail.motdepasse){
      oubli.onclick = () => { window.open(net.portail.motdepasse, '_blank', 'noopener'); };
    }
      net.offre = s.offre || null;
      net.google = s.google || '';
    }
  } catch(e){
    net.available = false;      // pas de serveur : tout reste sur l'appareil
    net.user = null;
  }

  if (net.panne) alerter('Le serveur signale un problème : ' + net.panne);
  paintAccount();
  installerGoogle();
  await loadPrefs();
  await paintSaved();
  loadHistory();

  fillLevelSelects();
  libSearch();

  // lien de partage d'une dictée : ?d=...
  try {
    const partage = new URLSearchParams(window.location.search).get('d');
    if (partage && net.available){
      history.replaceState(null, '', window.location.pathname);
      await openShared(partage, false);
    }
  } catch(e){}

  // lien reçu par e-mail : on ouvre directement le choix du nouveau mot de passe
  try {
    const t = new URLSearchParams(window.location.search).get('reset');
    if (t && net.available){
      resetToken = t;
      history.replaceState(null, '', window.location.pathname);  // le jeton ne reste pas dans la barre d'adresse
      $('auth-modal').hidden = false;
      setAuthMode('reset');
      setTimeout(() => $('auth-password').focus(), 60);
    }
  } catch(e){}
})();

window.addEventListener('beforeunload', () => { if (supported){ try{ window.speechSynthesis.cancel(); }catch(e){} } });

/* =========================================================
   Contrôle de version
   Une page servie depuis le cache du navigateur, ou un fichier
   oublié lors de l'envoi, produisent des pannes incompréhensibles.
   Autant les nommer.
   ========================================================= */
(function verifierVersion(){
  const VERSION = '2026-11-05';
  const corps = document.body || document.documentElement;
  const page = (corps && corps.getAttribute) ? corps.getAttribute('data-version') : null;
  if (page === VERSION) return;
  const message = 'La page (' + (page || 'version inconnue') + ') et le script (' + VERSION
    + ') ne correspondent pas. Recharge en vidant le cache — Ctrl+Maj+R, ou Cmd+Maj+R sur Mac —'
    + ' et vérifie que tous les fichiers ont bien été envoyés sur le serveur.';
  console.warn('[teaching] ' + message);
  alerter(message);
})();

/* La feuille de style doit suivre : voir --css-version */
(function(){
  const V = '2026-11-05';
  if (window.verifierStyles) window.verifierStyles(V);
})();
