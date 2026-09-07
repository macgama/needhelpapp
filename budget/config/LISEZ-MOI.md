# La configuration du socle

Ce dossier reçoit `nha.php`, copié depuis `needhelpapp/config/`. Il porte
les identifiants de la base centrale, et il est refusé par son propre
`.htaccess`.

Il n'est ni versionné ni déployé : `deploiement.yml` exclut
`config/nha.php` précisément pour ne jamais l'écraser.
