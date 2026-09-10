plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.needhelpapp.conduite"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.needhelpapp.conduite"

        // 26 (Android 8) : c'est la version qui a introduit les canaux de
        // notification et TYPE_APPLICATION_OVERLAY, les deux briques sur
        // lesquelles tout le blocage repose. En dessous, il faudrait deux
        // chemins de code pour couvrir moins de 3 % du parc.
        minSdk = 26
        targetSdk = 35

        versionCode = 1
        versionName = "0.1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

dependencies {
    // Le moteur de décision. Gradle le remplace par la compilation
    // incluse `moteur/` (voir settings.gradle.kts) : rien n'est publié,
    // rien n'est téléchargé.
    implementation("com.needhelpapp.conduite:moteur:0.1.0")

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.service)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.activity.compose)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons)
    implementation(libs.androidx.navigation.compose)
    debugImplementation(libs.androidx.compose.ui.tooling)

    implementation(libs.androidx.datastore.preferences)

    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    // Reconnaissance d'activité. C'est la SEULE dépendance à Google, et
    // l'application doit tourner sans elle : voir SourceActivite, qui
    // bascule sur une implémentation vide quand les services Play sont
    // absents (Huawei, /e/OS, appareils dégooglisés).
    implementation(libs.play.services.location)
}
