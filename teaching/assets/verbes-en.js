/* =========================================================
   Les verbes anglais de l'application.

   Liste maison, pensée pour un élève francophone : les verbes
   du programme d'abord, les irréguliers au complet, et rien
   qu'un adulte ne rencontrerait jamais.
   ========================================================= */
(function (global) {
"use strict";

/* --- irréguliers : ils forment le cœur de l'apprentissage --- */
const IRREG = `
be have do go say make take come see know get give find think tell become show
leave feel put bring begin keep hold write stand hear let mean set meet run pay
sit speak lie lead read grow lose fall send build understand draw break spend cut
rise drive buy wear choose seek throw catch deal win forget eat teach sell fight
drink swim sing ring sleep fly ride sink blow wake shake steal spread hit hurt
cost shut hide bite freeze forgive lend bend feed shoot sweep weep creep dig hang
stick strike swear tear bear beat burn learn dream smell spell spill spoil kneel
lay light quit shine shrink spin split spring stink swing thrust tread upset weave
wind withdraw arise awake bind bleed breed burst cast cling flee fling forbid
grind lean leap mistake overcome rid sew shed slide sting undergo wet wring
`;

/* --- réguliers courants --- */
const REG = `
accept add admire agree allow answer appear arrive ask attack believe belong
borrow brush call carry change check clean climb close collect compare complete
consider continue cook copy count cover create cross cry dance decide describe
die discover discuss divide download dream dress drop dry earn empty encourage
end enjoy enter examine excuse exist expect explain explore fail fill finish
fix follow force form guess hate happen help hope hurry imagine improve include
increase inform introduce invent invite join joke jump kill kiss knock land last
laugh learn like listen live look love manage mark marry match matter measure
mention miss mix move name need note notice offer open order paint pass phone
pick plan play point practise prefer prepare present press pretend prevent
produce promise pull push realise receive record refuse relax remember remind
remove repair repeat reply report rescue rest return rise-up save shout show
sign smile smoke sound stare start stay stop study succeed suggest support
suppose surprise talk taste thank tidy touch train translate travel try turn
type use visit vote wait walk want warn wash waste watch water welcome whisper
wonder work worry wrap
`;

function nettoie(bloc){
  return bloc.split(/\s+/).filter(v => v && v.indexOf('-') < 0).map(v => v.trim());
}

const irreguliers = nettoie(IRREG);
const reguliers = nettoie(REG);
const TOUS = irreguliers.concat(reguliers)
  .filter((v, i, t) => t.indexOf(v) === i)
  .sort();

const API = {
  tous: TOUS,
  parGroupe: { irreguliers: irreguliers, reguliers: reguliers },
  lettre: (v) => v.charAt(0).toUpperCase()
};

if (typeof module !== 'undefined' && module.exports) module.exports = API;
global.VerbesEN = API;

})(typeof window !== 'undefined' ? window : globalThis);
