# Room génère des implémentations que la minification ne doit pas raboter.
-keep class com.needhelpapp.conduite.donnees.base.** { *; }

# Le service d'accessibilité et les receveurs sont instanciés par le
# système, par leur nom : rien ne les référence depuis le code.
-keep class com.needhelpapp.conduite.surveillance.ServiceAccessibilite { *; }
-keep class com.needhelpapp.conduite.service.RecepteurDemarrage { *; }
-keep class com.needhelpapp.conduite.detection.RecepteurActivite { *; }
