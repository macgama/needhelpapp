import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    kotlin("jvm") version "2.0.21"
}

group = "com.needhelpapp.conduite"
version = "0.1.0"

repositories {
    mavenCentral()
}

dependencies {
    testImplementation(kotlin("test"))
}

// On VISE le bytecode 17 — ce que réclame le greffon Android d'en face —
// sans EXIGER un JDK 17 pour compiler. La nuance a son importance : une
// `jvmToolchain(17)` fait échouer la compilation sur toute machine qui
// n'a qu'un JDK 21, et se met alors à télécharger un JDK entier. Viser
// une version tout en compilant avec celle qui est là marche partout.
java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.release.set(17)
}

tasks.test {
    useJUnitPlatform()
    testLogging {
        events("passed", "failed", "skipped")
    }
}
