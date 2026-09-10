# Room génère des implémentations que la minification ne doit pas raboter.
-keep class com.needhelpapp.conduite.donnees.base.** { *; }

# Les receveurs sont instanciés par le système, par leur nom : rien ne
# les référence depuis le code.
-keep class com.needhelpapp.conduite.service.RecepteurDemarrage { *; }
-keep class com.needhelpapp.conduite.detection.RecepteurActivite { *; }
