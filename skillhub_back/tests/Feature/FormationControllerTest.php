<?php

namespace Tests\Feature;

use App\Models\CategorieFormation;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FormationControllerTest extends TestCase
{
    use RefreshDatabase;

    private Utilisateur $formateur;

    protected function setUp(): void
    {
        parent::setUp();
        $this->formateur = Utilisateur::factory()->formateur()->create();
        CategorieFormation::factory()->create();
    }

    private function getAuthToken(): string
    {
        return auth('api')->login($this->formateur);
    }

    /**
     * Vérifie qu'une requête POST sans token retourne 401.
     */
    public function test_post_formation_without_token_returns_401(): void
    {
        $response = $this->postJson('/api/formations', [
            'title' => 'Formation PHP',
            'description' => 'Description de la formation',
            'price' => 199.99,
            'duration' => 24,
            'level' => 'beginner',
        ]);

        $response->assertStatus(401);
    }

    /**
     * Vérifie qu'une requête valide avec utilisateur connecté fonctionne correctement (201).
     */
    public function test_post_formation_with_valid_user_returns_201(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getAuthToken())
            ->postJson('/api/formations', [
                'title' => 'Formation PHP',
                'description' => 'Description de la formation',
                'price' => 199.99,
                'duration' => 24,
                'level' => 'beginner',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Formation créée avec succès',
                'formation' => [
                    'title' => 'Formation PHP',
                    'description' => 'Description de la formation',
                    'price' => 199.99,
                    'duration' => 24,
                    'level' => 'beginner',
                ],
            ]);

        $this->assertDatabaseHas('formations', [
            'nom' => 'Formation PHP',
            'id_formateur' => $this->formateur->id,
        ]);
    }
}
