<?php

namespace Tests\Feature;

use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_with_valid_credentials_returns_token(): void
    {
        $user = Utilisateur::factory()->formateur()->create(['email' => 'formateur@test.com']);

        $response = $this->postJson('/api/auth/connexion', [
            'email' => 'formateur@test.com',
            'mot_de_passe' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'utilisateur' => ['id', 'email', 'role']])
            ->assertJson(['utilisateur' => ['email' => 'formateur@test.com', 'role' => 'formateur']]);
    }

    public function test_login_with_invalid_credentials_returns_401(): void
    {
        Utilisateur::factory()->formateur()->create(['email' => 'user@test.com']);

        $response = $this->postJson('/api/auth/connexion', [
            'email' => 'user@test.com',
            'mot_de_passe' => 'wrongpassword',
        ]);

        $response->assertStatus(401);
    }

    public function test_apprenant_can_login(): void
    {
        $user = Utilisateur::factory()->participant()->create(['email' => 'apprenant@test.com']);

        $response = $this->postJson('/api/auth/connexion', [
            'email' => 'apprenant@test.com',
            'mot_de_passe' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJson(['utilisateur' => ['role' => 'participant']]);
    }

    public function test_protected_route_without_token_returns_401(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(401);
    }

    public function test_register_with_valid_data_returns_201(): void
    {
        $response = $this->postJson('/api/auth/inscription', [
            'email' => 'nouveau@test.com',
            'mot_de_passe' => 'password123',
            'nom' => 'Dupont',
            'prenom' => 'Marie',
            'role' => 'participant',
        ]);

        $response->assertStatus(201)
            ->assertJson(['message' => 'Utilisateur créé avec succès. Vous pouvez maintenant vous connecter.']);

        $this->assertDatabaseHas('utilisateurs', ['email' => 'nouveau@test.com']);
    }

    public function test_register_with_duplicate_email_returns_422(): void
    {
        Utilisateur::factory()->create(['email' => 'existant@test.com']);

        $response = $this->postJson('/api/auth/inscription', [
            'email' => 'existant@test.com',
            'mot_de_passe' => 'password123',
            'nom' => 'Test',
            'role' => 'participant',
        ]);

        $response->assertStatus(422);
    }

    public function test_me_with_valid_token_returns_user(): void
    {
        $user = Utilisateur::factory()->formateur()->create(['email' => 'me@test.com']);
        $token = auth('api')->login($user);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJsonStructure(['utilisateur' => ['id', 'email', 'role']])
            ->assertJson(['utilisateur' => ['email' => 'me@test.com']]);
    }

    public function test_logout_with_valid_token_returns_200(): void
    {
        $user = Utilisateur::factory()->participant()->create();
        $token = auth('api')->login($user);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/auth/deconnexion');

        $response->assertStatus(200)
            ->assertJson(['message' => 'Déconnexion réussie']);
    }
}
