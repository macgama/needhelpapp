/* =========================================================
   Les verbes allemands de l'application.
   Le programme des degrés 7 à 11, les verbes forts au complet,
   et les composés séparables les plus courants.
   ========================================================= */
(function (global) {
"use strict";

const FAIBLES = `
antworten arbeiten atmen baden bauen bedeuten bedienen begegnen behalten-x
benutzen beobachten bestellen besuchen bezahlen brauchen bringen-x buchstabieren
danken dauern decken dienen drehen drücken duschen entdecken entschuldigen
erklären erlauben erzählen fehlen feiern folgen fragen freuen fühlen führen
füllen glauben grüßen hängen-x heiraten hoffen holen hören interessieren kaufen
klettern kochen kosten lachen landen leben legen lehren leiten lernen lieben
lösen machen malen meinen merken mieten öffnen packen passen passieren planen
probieren putzen rauchen rechnen reden regnen reisen reparieren retten sagen
sammeln schenken schicken schmecken setzen spielen stellen studieren suchen
tanzen teilen telefonieren träumen üben verkaufen versuchen warten wecken
wechseln wandern wiederholen wohnen wünschen zahlen zeichnen zeigen
`;

const FORTS = `
beginnen beißen bekommen bergen befehlen betrügen bieten binden bitten bleiben
brechen brennen bringen denken dürfen empfehlen essen fahren fallen fangen
finden fliegen fließen geben gefallen gehen gelingen gelten geschehen gewinnen
greifen haben halten hängen heben heißen helfen kennen klingen kommen können
laden lassen laufen leiden leihen lesen liegen lügen mögen müssen nehmen nennen
pfeifen raten reiten rennen riechen rufen saufen schaffen scheinen schießen
schlafen schlagen schließen schneiden schreiben schreien schwimmen sehen sein
singen sitzen sollen sprechen springen stehen stehlen steigen sterben stoßen
streichen streiten tragen treffen treiben treten trinken tun vergessen
vergleichen verlieren verschwinden verstehen waschen wachsen werden werfen
wissen wollen ziehen zwingen
`;

const SEPARABLES = `
abfahren abholen anfangen ankommen anrufen ansehen anziehen aufhören aufmachen
aufräumen aufstehen aufwachen ausgehen aussehen aussteigen einkaufen einladen
einschlafen einsteigen fernsehen herkommen hinfallen losfahren mitbringen
mitkommen mitmachen nachdenken teilnehmen umsteigen umziehen vorbereiten
vorhaben vorlesen vorstellen weggehen weiterfahren wiederkommen zuhören
zumachen zurückgeben zurückkommen zusammenarbeiten
`;

function nettoie(bloc){
  return bloc.split(/\s+/).map(v => v.replace(/-x$/, '').trim()).filter(v => v.length > 2);
}

const faibles = nettoie(FAIBLES), forts = nettoie(FORTS), separables = nettoie(SEPARABLES);
const TOUS = faibles.concat(forts, separables)
  .filter((v, i, t) => t.indexOf(v) === i)
  .sort((a, b) => a.localeCompare(b, 'de'));

const API = {
  tous: TOUS,
  parGroupe: { faibles: faibles, forts: forts, separables: separables },
  lettre: (v) => v.charAt(0).toUpperCase()
};

if (typeof module !== 'undefined' && module.exports) module.exports = API;
global.VerbesDE = API;

})(typeof window !== 'undefined' ? window : globalThis);
