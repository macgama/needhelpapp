# Le socle du portail

Ce dossier attend `nha-core.php`, **copié depuis le portail** à
l'identique. Il n'est pas livré ici : il appartient au portail, et le
dupliquer dans le dépôt reviendrait à en avoir deux versions qui
finiraient par diverger.

Il faut aussi `config/nha.php`, avec les identifiants de la base centrale
`6l3nq9_core`. Le même fichier sert au portail et à toutes les
applications.

Enfin, déclarez le code de l'application dans le `.htaccess` :

    SetEnv NHA_APP familyshop

Et exécutez `sql/application.sql` sur la base centrale, pour que
FamilyShop existe dans le catalogue.

## Sans ces fichiers

L'application affiche l'accroche mais personne ne peut se connecter :
elle n'a pas d'identité propre, et c'est voulu.
