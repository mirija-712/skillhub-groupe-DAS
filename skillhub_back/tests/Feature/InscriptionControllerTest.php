<?php

namespace Tests\Feature;

use App\Models\CategorieFormation;
use App\Models\Formation;
use App\Models\Inscription;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InscriptionControllerTest extends TestCase
{
    use RefreshDatabase;

    private Utilisateur $apprenant;
    private Formation $formation;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apprenant = Utilisateur::factory()->participant()->create();
        $categorie = CategorieFormation::factory()->create();
        $formateur = Utilisateur::factory()->formateur()->create();
        $this->formation = Formation::factory()->create([
            'id_formateur' => $formateur->id,
            'id_categorie' => $categorie->id,
        ]);
    }

    private function getToken(): string
    {
        return auth('api')->login($this->apprenant);
    }

    public function test_inscription_sans_token_retourne_401(): void
    {
        $response = $this->postJson("/api/formations/{$this->formation->id}/inscription");
        $response->assertStatus(401);
    }

    public function test_inscription_valide_retourne_201(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getToken())
            ->postJson("/api/formations/{$this->formation->id}/inscription");

        $response->assertStatus(201)->assertJson(['message' => 'Inscription enregistrée.']);
        $this->assertDatabaseHas('inscriptions', [
            'utilisateur_id' => $this->apprenant->id,
            'formation_id' => $this->formation->id,
        ]);
    }

    public function test_inscription_formation_inexistante_retourne_404(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getToken())
            ->postJson('/api/formations/9999/inscription');

        $response->assertStatus(404);
    }

    public function test_double_inscription_retourne_422(): void
    {
        $token = $this->getToken();
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/formations/{$this->formation->id}/inscription");

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/formations/{$this->formation->id}/inscription");

        $response->assertStatus(422)->assertJson(['message' => 'Vous êtes déjà inscrit à cette formation.']);
    }

    public function test_desinscription_valide_retourne_200(): void
    {
        Inscription::create([
            'utilisateur_id' => $this->apprenant->id,
            'formation_id' => $this->formation->id,
            'progression' => 0,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getToken())
            ->deleteJson("/api/formations/{$this->formation->id}/inscription");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('inscriptions', [
            'utilisateur_id' => $this->apprenant->id,
            'formation_id' => $this->formation->id,
        ]);
    }

    public function test_desinscription_inexistante_retourne_404(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getToken())
            ->deleteJson("/api/formations/{$this->formation->id}/inscription");

        $response->assertStatus(404);
    }

    public function test_liste_formations_suivies_retourne_200(): void
    {
        Inscription::create([
            'utilisateur_id' => $this->apprenant->id,
            'formation_id' => $this->formation->id,
            'progression' => 0,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getToken())
            ->getJson('/api/apprenant/formations');

        $response->assertStatus(200)->assertJsonStructure(['formations']);
        $this->assertCount(1, $response->json('formations'));
    }

    public function test_update_progression_valide(): void
    {
        Inscription::create([
            'utilisateur_id' => $this->apprenant->id,
            'formation_id' => $this->formation->id,
            'progression' => 0,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getToken())
            ->putJson("/api/formations/{$this->formation->id}/progression", ['progression' => 75]);

        $response->assertStatus(200)->assertJson(['progression' => 75]);
        $this->assertDatabaseHas('inscriptions', [
            'utilisateur_id' => $this->apprenant->id,
            'progression' => 75,
        ]);
    }

    public function test_update_progression_sans_inscription_retourne_404(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->getToken())
            ->putJson("/api/formations/{$this->formation->id}/progression", ['progression' => 50]);

        $response->assertStatus(404);
    }
}
