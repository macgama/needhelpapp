pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "conduite"

// Le moteur de décision est une compilation à part, sans Android. Gradle
// substitue tout seul la dépendance `com.needhelpapp.conduite:moteur` par
// le projet inclus : l'application le voit comme une bibliothèque, alors
// qu'il se compile et s'éprouve sans le SDK Android.
includeBuild("moteur")

include(":app")
