/* =========================================================
   Les verbes italiens de l'application.
   Choisis pour un élève francophone : ceux du programme,
   les irréguliers au complet, et rien d'inutile.
   ========================================================= */
(function (global) {
"use strict";

const ARE = `
abitare accettare accompagnare amare andare arrivare ascoltare aspettare aiutare
bastare baciare ballare bruciare buttare cambiare camminare cantare cenare cercare
chiamare cominciare comprare consigliare continuare controllare costare creare
cucinare curare dare desiderare dimenticare dimostrare disegnare domandare durare
entrare esistere fare fermare festeggiare firmare frequentare funzionare guardare
giocare girare guidare imparare incontrare indossare iniziare insegnare invitare
lasciare lavare lavorare mancare mandare mangiare mostrare nuotare occupare
ordinare organizzare pagare parlare partecipare passare pensare pesare portare
praticare preparare presentare prestare provare pulire-x raccontare regalare
ricordare rientrare rimanere-x ringraziare riposare ritornare salutare saltare
sbagliare scusare sembrare significare sognare sperare spiegare studiare suonare
svegliare telefonare tirare toccare tornare trovare usare viaggiare visitare
volare votare
`;

const ERE = `
accendere accorgere ammettere apparire-x avere bere cadere chiedere chiudere
comprendere conoscere convincere correggere correre credere crescere cuocere
decidere descrivere difendere dipendere dipingere dire-x discutere distruggere
dividere dovere esistere-x essere leggere mettere mordere muovere nascere
nascondere offendere parere perdere permettere piacere piangere porre potere
prendere promettere proteggere ricevere ridere rimanere rispondere rompere
sapere scegliere scendere scommettere scrivere sedere spendere spingere
stringere succedere svolgere tenere togliere tradurre uccidere vedere vendere
vincere vivere volere
`;

const IRE = `
aprire avvertire bollire capire condividere colpire coprire costruire cucire
definire dimagrire divertire dormire finire fuggire garantire gestire guarire
impedire inserire offrire partire preferire pulire punire restituire riempire
riferire riunire salire scoprire seguire sentire servire soffrire sparire
spedire stabilire subire suggerire trasferire ubbidire unire uscire venire
vestire
`;

function nettoie(bloc){
  return bloc.split(/\s+/)
    .map(v => v.replace(/-x$/, '').trim())
    .filter(v => v.length > 2);
}

const are = nettoie(ARE), ere = nettoie(ERE), ire = nettoie(IRE);
const TOUS = are.concat(ere, ire)
  .filter((v, i, t) => t.indexOf(v) === i)
  .sort((a, b) => a.localeCompare(b, 'it'));

const API = {
  tous: TOUS,
  parGroupe: { are: are, ere: ere, ire: ire },
  lettre: (v) => v.charAt(0).toUpperCase()
};

if (typeof module !== 'undefined' && module.exports) module.exports = API;
global.VerbesIT = API;

})(typeof window !== 'undefined' ? window : globalThis);
