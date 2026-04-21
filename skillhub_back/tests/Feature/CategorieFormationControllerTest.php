<?php

namespace Tests\Feature;

use App\Models\CategorieFormation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategorieFormationControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_retourne_toutes_les_categories(): void
    {
        CategorieFormation::factory()->create(['libelle' => 'Programmation']);
        CategorieFormation::factory()->create(['libelle' => 'Design']);

        $response = $this->getJson('/api/categories');

        $response->assertStatus(200)
            ->assertJsonStructure(['categories' => [['id', 'libelle']]])
            ->assertJsonCount(2, 'categories');
    }

    public function test_index_sans_donnees_retourne_tableau_vide(): void
    {
        $response = $this->getJson('/api/categories');

        $response->assertStatus(200)
            ->assertJson(['categories' => []]);
    }

    public function test_categories_triees_par_libelle(): void
    {
        CategorieFormation::factory()->create(['libelle' => 'Zéro']);
        CategorieFormation::factory()->create(['libelle' => 'Alpha']);

        $response = $this->getJson('/api/categories');
        $categories = $response->json('categories');

        $this->assertSame('Alpha', $categories[0]['libelle']);
        $this->assertSame('Zéro', $categories[1]['libelle']);
    }

    public function test_index_accessible_sans_token(): void
    {
        $response = $this->getJson('/api/categories');
        $response->assertStatus(200);
    }
}
