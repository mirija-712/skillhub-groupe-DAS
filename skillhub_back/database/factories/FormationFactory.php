<?php

namespace Database\Factories;

use App\Models\CategorieFormation;
use App\Models\Formation;
use App\Models\Utilisateur;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Formation>
 */
class FormationFactory extends Factory
{
    protected $model = Formation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id_formateur' => Utilisateur::factory(),
            'id_categorie' => CategorieFormation::factory(),
            'nom' => fake()->sentence(3),
            'description' => fake()->paragraph(2),
            'duree_heures' => fake()->randomFloat(2, 1, 40),
            'prix' => fake()->randomFloat(2, 0, 500),
            'level' => fake()->randomElement(['beginner', 'intermediate', 'advanced']),
            'statut' => fake()->randomElement(['En Cours', 'Terminé']),
            'image_url' => null,
        ];
    }
}
