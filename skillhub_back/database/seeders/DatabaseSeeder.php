<?php

namespace Database\Seeders;

use App\Models\Utilisateur;
use Illuminate\Database\Seeder;

/**
 * Seeder principal : crée des données de test si nécessaire.
 * Le projet utilise le modèle Utilisateur (table utilisateurs), pas User.
 */
class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Exemple : créer un formateur de test (décommente si besoin)
        // Utilisateur::factory()->formateur()->create([
        //     'email' => 'formateur@skillhub.local',
        //     'mot_de_passe' => 'password123',
        // ]);
    }
}
