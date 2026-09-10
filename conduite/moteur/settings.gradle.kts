/*
 * Le moteur est une compilation Gradle À PART, et ce n'est pas un détail
 * d'organisation.
 *
 * Il ne dépend ni d'Android, ni du greffon Android, ni du SDK : c'est du
 * Kotlin sur JVM. On peut donc l'ouvrir, le compiler et l'éprouver sur
 * n'importe quelle machine, sans Android Studio et sans les deux
 * gigaoctets qui vont avec. C'est ce qui a permis d'écrire les tests de
 * ce dossier sur une machine qui n'avait pas le SDK.
 *
 * L'application Android l'inclut avec `includeBuild`.
 */
rootProject.name = "moteur"
