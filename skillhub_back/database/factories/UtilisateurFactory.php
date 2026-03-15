<?php

namespace Database\Factories;

use App\Models\Utilisateur;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Utilisateur>
 */
class UtilisateurFactory extends Factory
{
    protected $model = Utilisateur::class;

    protected static ?string $password = null;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'mot_de_passe' => 'password123',
            'nom' => fake()->lastName(),
            'prenom' => fake()->firstName(),
            'role' => 'formateur',
        ];
    }

    public function formateur(): static
    {
        return $this->state(fn (array $attributes) => ['role' => 'formateur']);
    }

    public function participant(): static
    {
        return $this->state(fn (array $attributes) => ['role' => 'participant']);
    }
}
