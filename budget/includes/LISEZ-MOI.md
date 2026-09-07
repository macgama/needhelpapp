# Les fichiers copiés du portail

Ce dossier reçoit `nha-core.php`, copié **à l'identique** depuis
`needhelpapp/includes/`. C'est le seul fichier qui parle à la base
centrale `6l3nq9_core` : identité, session partagée, abonnement.

Il ne doit jamais diverger d'une application à l'autre. `diagnostic.php`
côté portail compare les marqueurs de version des trois fichiers du socle
et signale un dépôt partiel — la panne la plus pénible à diagnostiquer,
parce que le code plante à un endroit sans rapport avec le fichier
oublié.

Le déploiement ne le transporte pas : `.github/workflows/deploiement.yml`
ne synchronise que le dossier de chaque application. Copiez-le à la main
lors de la mise en ligne, comme l'indique `budget/LISEZ-MOI.md`.
