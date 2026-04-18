<?php

namespace Tests\Unit;

use App\Models\CategorieFormation;
use App\Models\Formation;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FormationTest extends TestCase
{
    use RefreshDatabase;

    public function test_image_url_accessor_returns_absolute_url_for_relative_path(): void
    {
        config(['app.url' => 'http://localhost:8000']);

        $formation = Formation::factory()->make([
            'image_url' => '/storage/formations/test-image.jpg',
        ]);

        $this->assertSame(
            'http://localhost:8000/storage/formations/test-image.jpg',
            $formation->image_url
        );
    }

    public function test_image_url_accessor_keeps_absolute_url_unchanged(): void
    {
        $formation = Formation::factory()->make([
            'image_url' => 'https://cdn.example.com/formations/test-image.jpg',
        ]);

        $this->assertSame(
            'https://cdn.example.com/formations/test-image.jpg',
            $formation->image_url
        );
    }

    public function test_formation_belongs_to_formateur_and_categorie(): void
    {
        $formateur = Utilisateur::factory()->formateur()->create();
        $categorie = CategorieFormation::factory()->create();

        $formation = Formation::factory()->create([
            'id_formateur' => $formateur->id,
            'id_categorie' => $categorie->id,
        ]);

        $this->assertTrue($formation->formateur->is($formateur));
        $this->assertTrue($formation->categorie->is($categorie));
    }

    public function test_decimal_casts_are_formatted_with_two_decimals(): void
    {
        $formation = Formation::factory()->make([
            'prix' => 120,
            'duree_heures' => 8,
        ]);

        $this->assertSame('120.00', $formation->prix);
        $this->assertSame('8.00', $formation->duree_heures);
    }
}
