/* =========================================================
   La liste des verbes de l'application.

   Elle est faite maison, et non reprise d'un site existant :
   d'une part une base compilée par un tiers lui appartient,
   d'autre part rien ne garantirait que notre moteur conjugue
   correctement chacun de ses verbes. Ici, chaque entrée a été
   confrontée au moteur avant d'être retenue.

   Le classement par groupe n'a pas d'usage à l'écran : il sert
   à la vérification, car une erreur de groupe est l'erreur la
   plus facile à commettre et la plus difficile à voir.
   ========================================================= */
(function (global) {
"use strict";

/* --- 1er groupe : verbes en -er ------------------------- */
const G1 = `
abaisser abandonner abattre_NON abîmer abolir_NON aborder aboutir_NON abriter accabler accélérer accepter
accompagner accomplir_NON accorder accrocher accueillir_NON accumuser_NON accuser acheter achever acquitter
activer adapter additionner adopter adorer adresser affaiblir_NON afficher affirmer affronter agacer agenouiller
aggraver agir_NON agiter aider aimer ajouter ajuster alerter aligner alimenter allonger allumer alourdir_NON
amener améliorer aménager amonceler amuser analyser ancrer animer annoncer annuler apaiser apercevoir_NON
aplatir_NON apporter apprécier approcher approfondir_NON approuver appuyer arracher arranger arrêter arriver
arroser aspirer assembler asseoir_NON assister associer assurer attacher attaquer atteler attendre_NON atterrir_NON
attirer attraper augmenter autoriser avaler avancer aventurer avertir_NON aveugler avouer
baisser balancer balayer baptiser barrer baser bâtir_NON battre_NON bavarder bénéficier blesser bloquer boiter
border boucher boucler bouger bouleverser bousculer boutonner briller briser bronzer brosser brouiller brûler
cacher calculer calmer camper capturer caresser casser causer céder célébrer cesser chanter changer charger charmer
chasser chauffer chercher chiffrer choquer chuchoter circuler citer claquer classer clouer coiffer coincer collectionner
coller colorer combattre_NON combiner commander commencer commenter comparer compléter compliquer composer comprendre_NON
compter concentrer conclure_NON condamner conduire_NON confier confirmer confondre_NON congeler conjuguer connaître_NON
conquérir_NON conseiller conserver considérer consoler constater construire_NON consulter contacter contempler continuer
contourner contribuer contrôler convaincre_NON convoquer copier corriger costumer côtoyer coucher couler couper courir_NON
coûter couvrir_NON cracher craindre_NON créer creuser crier critiquer croiser croire_NON cueillir_NON cuisiner cultiver
danser dater débarrasser déborder déboucher débuter décaler déceler décevoir_NON décharger déchirer décider déclarer
décoller décorer découper découvrir_NON décrire_NON défendre_NON défiler définir_NON dégager dégeler dégonfler déguiser
déjeuner délivrer demander démarrer déménager démolir_NON démontrer dénoncer dépasser dépêcher dépendre_NON déplacer
déplier déposer déranger dérober dérouler désigner désirer dessiner détacher détendre_NON déterminer détester détruire_NON
développer dévorer diminuer dîner diriger discuter disparaître_NON disposer disputer distinguer distribuer diviser
donner dormir_NON doubler douter dresser durer
échanger échapper échouer éclairer éclater écarter économiser écouter écraser écrire_NON éditer éduquer effacer
effectuer effrayer égaler élever éliminer éloigner emballer embarquer embrasser emmener émouvoir_NON empêcher employer
emporter emprunter encadrer encourager endormir_NON enfermer enfoncer engager enlever ennuyer enregistrer enseigner
entendre_NON enterrer entourer entraîner entrer entretenir_NON envahir_NON envelopper envier envoyer_NON épeler épouser
éprouver équiper escalader espérer essayer essuyer estimer étaler éteindre_NON étendre_NON étinceler étonner étouffer
étudier évaluer éveiller éviter examiner exclure_NON excuser exécuter exercer exiger expédier expliquer explorer exploser
exporter exposer exprimer
fabriquer fâcher faciliter façonner faiblir_NON fatiguer favoriser feindre_NON féliciter fermer feuilleter ficeler figurer
filer filmer filtrer finir_NON fixer flatter flotter foncer fonctionner fonder forcer former fouiller fournir_NON franchir_NON
frapper freiner fréquenter frissonner frotter fuir_NON fumer
gagner garantir_NON garder garer gaspiller geler gêner gérer glisser gonfler goûter grandir_NON gratter graver grimper
gronder grossir_NON guérir_NON guetter guider
habiller habiter habituer hacher haleter harceler hausser héberger hériter hésiter heurter hurler
identifier ignorer illuminer illustrer imaginer imiter immobiliser importer imposer impressionner improviser imprimer
incliner indiquer influencer informer inquiéter inscrire_NON insister inspirer installer instruire_NON insulter intégrer
interdire_NON intéresser interpréter interroger interrompre_NON intervenir_NON introduire_NON inventer inviter isoler
jaillir_NON jeter jouer juger jurer justifier
laisser lancer laver lever libérer licencier lier limiter livrer loger longer louer lutter
maigrir_NON maintenir_NON manger manier manifester manipuler manquer maquiller marcher marquer marteler masquer mélanger
menacer ménager mener mentionner mériter mesurer mettre_NON meubler modeler modifier moduler monter montrer moquer mordre_NON
motiver moudre_NON mouiller mourir_NON multiplier munir_NON murmurer
nager naître_NON naviguer négliger négocier neiger nettoyer niveler nommer noter nourrir_NON noyer nuire_NON numéroter
obéir_NON objecter obliger observer obtenir_NON occuper offrir_NON opposer ordonner organiser orienter oser ôter oublier
ouvrir_NON
pâlir_NON parcourir_NON pardonner parfumer parier parler partager participer particulariser partir_NON parvenir_NON passer
passionner patienter payer pêcher peindre_NON peler pencher pendre_NON penser percer percevoir_NON perdre_NON perfectionner
permettre_NON persuader peser photographier pincer piquer placer plaindre_NON plaire_NON plaisanter planter pleurer pleuvoir_NON
plier plonger polir_NON porter poser posséder poursuivre_NON pousser pouvoir_NON pratiquer précéder préciser prédire_NON
préférer prendre_NON préparer présenter préserver presser prêter prévenir_NON prévoir_NON prier priver procéder proclamer
produire_NON profiter programmer progresser prolonger promener promettre_NON prononcer proposer protéger prouver publier
punir_NON
quitter
raccourcir_NON raconter rafraîchir_NON rajouter ralentir_NON ramasser ramener ranger rappeler rapporter rapprocher rassembler
rassurer rattraper réagir_NON réaliser recevoir_NON réchauffer rechercher réciter réclamer recoller récolter recommander
recommencer récompenser reconnaître_NON recopier recouvrir_NON reculer rédiger redouter réduire_NON réfléchir_NON refuser
regarder régler regretter rejeter rejoindre_NON réjouir_NON relever relier remarquer rembourser remercier remettre_NON
remonter remplacer remplir_NON remuer rencontrer rendre_NON renfermer renoncer renouveler renseigner rentrer renverser
renvoyer réparer repasser repérer répéter replier répondre_NON reposer repousser reprendre_NON représenter reprocher
réserver résister résoudre_NON respecter respirer ressembler ressentir_NON rester résumer rétablir_NON retenir_NON retirer
retomber retourner retrouver réunir_NON réussir_NON rêver revenir_NON revoir_NON rincer rire_NON risquer rompre_NON ronger
rougir_NON rouler ruisseler
saisir_NON salir_NON saluer satisfaire_NON sauter sauver savoir_NON scier sécher secouer secourir_NON séduire_NON séjourner
sélectionner sembler semer sentir_NON séparer serrer servir_NON siffler signaler signer simplifier situer soigner songer
sonner sortir_NON souffler souffrir_NON souhaiter soulager soulever souligner soupçonner sourire_NON soutenir_NON souvenir_NON
subir_NON succéder sucer suffire_NON suggérer suivre_NON supporter supposer supprimer surgir_NON surmonter surprendre_NON
surveiller survivre_NON
taire_NON taper téléphoner témoigner tendre_NON tenir_NON tenter terminer tirer tolérer tomber tordre_NON toucher tourner
tousser tracer traduire_NON trahir_NON traiter transformer transmettre_NON transporter travailler traverser trembler tremper
tricher trier tromper troubler trouver tuer
unir_NON user utiliser
vaincre_NON valider valoir_NON vanter varier veiller vendre_NON venir_NON vérifier verser vêtir_NON vider vieillir_NON
viser visiter vivre_NON voir_NON voler vouloir_NON voyager
`;

/* --- 2e groupe : verbes en -ir qui font « nous finissons » --- */
const G2 = `
abolir aboutir accomplir affaiblir affranchir agir agrandir alourdir amincir anéantir aplatir applaudir approfondir
arrondir assainir assortir atterrir avertir bannir bâtir bénir blanchir blêmir bondir brandir brunir choisir
convertir définir démolir désobéir divertir durcir éblouir éclaircir élargir embellir emplir endurcir enfouir
engloutir enrichir ensevelir envahir épaissir épanouir établir éteindre_NON étourdir faiblir farcir finir fleurir
fournir fraîchir franchir frémir garantir gémir grandir grossir guérir hennir infléchir investir jaillir jaunir jouir
maigrir meurtrir moisir mollir mugir munir mûrir nourrir noircir obéir obscurcir pâlir périr pétrir polir pourrir
préétablir punir raccourcir racornir raffermir rafraîchir raidir ralentir réagir réfléchir refroidir régir réjouir
remplir répartir resplendir ressurgir rétablir réunir réussir rougir rugir saisir salir subir surgir tiédir trahir
unir vernir vieillir vomir vrombir
`;

/* --- 3e groupe : chacun a été vérifié un par un ---------- */
const G3 = `
abattre absoudre_NON accourir accroître accueillir acquérir admettre aller apercevoir apparaître appartenir apprendre
assaillir asseoir atteindre attendre avoir battre boire bouillir combattre commettre comparaître comprendre compromettre
concevoir conclure concourir conduire confondre connaître conquérir consentir construire contenir contraindre contredire
convaincre correspondre corrompre coudre courir couvrir craindre croire croître cueillir décevoir découdre découvrir
décrire défaillir défaire défendre démentir démettre dépeindre dépendre descendre desservir détendre détenir détruire
devenir devoir dire disparaître dissoudre_NON distendre dormir écrire élire émettre émouvoir endormir enfreindre
entendre entreprendre entretenir entrevoir envoyer éteindre être exclure extraire_NON faire falloir feindre fendre
fondre fuir haïr inclure induire inscrire instruire interdire interrompre intervenir introduire joindre lire maintenir
maudire médire mentir mettre mordre moudre mourir mouvoir naître nuire obtenir offrir omettre ouvrir paraître parcourir
parvenir peindre perdre permettre plaindre plaire pleuvoir poursuivre pourvoir pouvoir prédire prendre prescrire pressentir
prétendre prévaloir prévenir prévoir produire promettre promouvoir proscrire recevoir reconduire reconnaître recoudre
recourir recouvrir récrire recueillir redescendre redevenir redire réduire refaire rejoindre relire reluire remettre
rendre renaître rentrer_NON repartir repeindre rependre repentir_NON répondre reprendre reproduire requérir résoudre
ressentir ressortir restreindre retenir revenir revêtir revivre revoir rire rompre rouvrir satisfaire savoir secourir
séduire sentir servir sortir souffrir soumettre sourire souscrire circonscrire soustraire_NON soutenir souvenir_NON subvenir suffire
suivre surprendre survenir survivre suspendre taire teindre tendre tenir tondre tordre traduire traire_NON transcrire
transmettre tressaillir vaincre valoir vendre venir vêtir vivre voir vouloir
`;

function nettoie(bloc){
  return bloc.split(/\s+/)
    .filter(v => v && v.indexOf('_NON') < 0)   // rangés ailleurs, ou volontairement écartés
    .map(v => v.trim());
}

const TOUS = []
  .concat(nettoie(G1), nettoie(G2), nettoie(G3))
  .filter((v, i, t) => t.indexOf(v) === i)
  .sort((a, b) => a.localeCompare(b, 'fr'));

const API = {
  tous: TOUS,
  parGroupe: { g1: nettoie(G1), g2: nettoie(G2), g3: nettoie(G3) },
  /** Première lettre, accents retirés, pour l'index alphabétique. */
  lettre: (v) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase()
};

if (typeof module !== 'undefined' && module.exports) module.exports = API;
global.Verbes = API;

})(typeof window !== 'undefined' ? window : globalThis);
