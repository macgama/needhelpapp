<?php
/**
 * Bouton « Se connecter avec Google ».
 *
 *   nha_bouton_google('/profil.php');
 *
 * N'affiche rien si google_client_id n'est pas configuré : le site reste
 * parfaitement utilisable sans Google, et aucun script Google n'est chargé
 * tant que la fonctionnalité n'est pas activée — ce qui évite d'avoir à
 * demander un consentement pour un service qu'on n'utilise pas.
 *
 * Toute la logique est dans /assets/google.js : aucun script en ligne, ce
 * qui permet de garder une politique de sécurité de contenu stricte.
 */
function nha_bouton_google(string $suite = '/profil.php'): void {
    $clientId = (string)nha_config('google_client_id', '');
    if ($clientId === '') { return; }
    ?>
    <p class="separateur">ou</p>
    <div id="google-bouton"
         data-client-id="<?= e($clientId) ?>"
         data-suite="<?= e($suite) ?>"
         style="display:flex;justify-content:center"></div>
    <p class="avis" id="google-avis" role="alert"></p>
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <script src="/assets/google.js" defer></script>
    <?php
}
