# Le socle du portail

Ce dossier attend deux fichiers **copiés depuis le portail**
needhelpapp.com, à l'identique :

- `nha-core.php` — identité, session partagée, droits
- `http.php`     — utilitaires JSON (facultatif ici)

Ils ne sont pas livrés avec teaching : ils appartiennent au portail, et
les dupliquer dans le dépôt reviendrait à en avoir deux versions qui
finiraient par diverger. Copiez-les à chaque mise à jour du portail.

**Et déclarez teaching dans la table `apps` de la base centrale**, avant la
première connexion :

    INSERT INTO apps (code, name, position, active)
    VALUES ('teaching', 'L''apprentissage scolaire', 1, 1);

Sans cette ligne, on ne peut pas ouvrir de session depuis teaching :
`sessions.created_app_id` s'y réfère. Le symptôme est trompeur — la
connexion vaut du portail vers teaching, mais jamais l'inverse. Le fichier
`sql/applications.sql` du portail contient cette instruction.

Il faut aussi `config/nha.php`, avec les identifiants de la base centrale
`6l3nq9_core` et les clés Stripe. Le même fichier sert au portail et ici.

Enfin, déclarez le code de l'application. Dans le `.htaccess` de teaching :

    SetEnv NHA_APP teaching

Sans cette ligne, les droits seraient lus pour « portail » et non pour
« teaching ».

## Sans ces fichiers

Teaching continue de fonctionner avec son propre système de comptes. Le
pont (`api/nha.php`) le vérifie et retombe proprement sur l'ancien
mécanisme. C'est utile en développement, et cela évite qu'une copie
oubliée mette le site à terre.
