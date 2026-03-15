<?php

namespace Database\Factories;

use App\Models\CategorieFormation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CategorieFormation>
 */
class CategorieFormationFactory extends Factory
{
    protected $model = CategorieFormation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'libelle' => fake()->unique()->words(2, true),
        ];
    }
}
