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

    /**
     * Un apprenant ne peut pas créer de formation (403).
     */
    public function test_apprenant_cannot_create_formation(): void
    {
        $apprenant = Utilisateur::factory()->participant()->create();
        $token = auth('api')->login($apprenant);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/formations', [
                'title' => 'Ma formation',
                'description' => 'Description',
                'price' => 0,
                'duration' => 10,
                'level' => 'beginner',
            ]);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('formations', ['nom' => 'Ma formation']);
    }

    /**
     * Un formateur ne peut modifier que ses propres formations.
     */
    public function test_formateur_cannot_update_another_formateur_formation(): void
    {
        $autreFormateur = Utilisateur::factory()->formateur()->create();
        $categorie = CategorieFormation::first();
        $formation = \App\Models\Formation::factory()->create([
            'id_formateur' => $autreFormateur->id,
            'id_categorie' => $categorie->id,
        ]);
        $token = auth('api')->login($this->formateur);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/formations/' . $formation->id, [
                'nom' => 'Pirate',
                'description' => 'Modification non autorisée',
            ]);

        $response->assertStatus(403);
        $formation->refresh();
        $this->assertNotEquals('Pirate', $formation->nom);
    }
}
