package com.needhelpapp.conduite.donnees.base

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

/**
 * L'historique des trajets. Il ne quitte jamais le téléphone.
 *
 * Aucun serveur, aucun compte, aucune synchronisation. Ce choix n'est
 * pas de la paresse : une base de trajets est une base de déplacements,
 * c'est-à-dire la donnée personnelle la plus révélatrice qui soit — elle
 * dit où l'on habite, où l'on travaille, et qui l'on visite le samedi
 * soir. Elle est également exclue des sauvegardes automatiques
 * (voir res/xml/regles_sauvegarde.xml).
 */
@Entity(tableName = "trajet")
data class Trajet(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    /** Heure murale, pour l'affichage. */
    val debutMs: Long,
    val finMs: Long? = null,
    val distanceM: Float = 0f,
    val vitesseMaxMs: Float = 0f,
    /** Nombre d'ouvertures d'application interceptées pendant le trajet. */
    val interceptions: Int = 0,
    /** L'utilisateur s'est-il déclaré passager ? */
    val passagerDeclare: Boolean = false,
)

/**
 * Hors de l'entité, à dessein : Room inspecte les champs d'une classe
 * annotée `@Entity`, et une propriété calculée qui s'y glisse est le
 * genre de détail qui fait échouer la génération avec un message peu
 * parlant. Une extension ne peut pas être confondue avec une colonne.
 */
val Trajet.dureeMs: Long? get() = finMs?.let { it - debutMs }

@Dao
interface TrajetDao {

    @Insert
    suspend fun inserer(trajet: Trajet): Long

    @Query(
        """
        UPDATE trajet SET finMs = :finMs, distanceM = :distanceM,
               vitesseMaxMs = :vitesseMaxMs, interceptions = :interceptions,
               passagerDeclare = :passager
        WHERE id = :id
        """,
    )
    suspend fun cloturer(
        id: Long,
        finMs: Long,
        distanceM: Float,
        vitesseMaxMs: Float,
        interceptions: Int,
        passager: Boolean,
    )

    @Query("SELECT * FROM trajet ORDER BY debutMs DESC LIMIT :limite")
    fun derniers(limite: Int = 60): Flow<List<Trajet>>

    /**
     * Un trajet ouvert que rien n'a refermé : le service a été tué par
     * le système en pleine route. On le retrouve au démarrage suivant
     * plutôt que de le laisser béant dans l'historique.
     */
    @Query("SELECT * FROM trajet WHERE finMs IS NULL ORDER BY debutMs DESC LIMIT 1")
    suspend fun trajetOuvert(): Trajet?

    @Query("DELETE FROM trajet")
    suspend fun toutEffacer()
}

@Database(entities = [Trajet::class], version = 1, exportSchema = false)
abstract class BaseConduite : RoomDatabase() {
    abstract fun trajets(): TrajetDao

    companion object {
        @Volatile
        private var instance: BaseConduite? = null

        fun obtenir(contexte: Context): BaseConduite =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    contexte.applicationContext,
                    BaseConduite::class.java,
                    "conduite.db",
                ).build().also { instance = it }
            }
    }
}
