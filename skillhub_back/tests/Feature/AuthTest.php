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
}
