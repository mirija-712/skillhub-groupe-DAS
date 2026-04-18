<?php

namespace Tests\Unit;

use App\Models\Utilisateur;
use PHPUnit\Framework\TestCase;

class UtilisateurTest extends TestCase
{
    public function test_formateur_role_helpers_return_expected_values(): void
    {
        $user = new Utilisateur([
            'email' => 'formateur@skillhub.fr',
            'nom' => 'Test',
            'prenom' => 'User',
            'role' => 'formateur',
        ]);

        $this->assertTrue($user->isFormateur());
        $this->assertFalse($user->isApprenant());
    }

    public function test_participant_role_helpers_return_expected_values(): void
    {
        $user = new Utilisateur([
            'email' => 'participant@skillhub.fr',
            'nom' => 'Test',
            'prenom' => 'User',
            'role' => 'participant',
        ]);

        $this->assertTrue($user->isApprenant());
        $this->assertFalse($user->isFormateur());
    }

    public function test_jwt_custom_claims_include_email_and_role(): void
    {
        $user = new Utilisateur([
            'email' => 'formateur@skillhub.fr',
            'role' => 'formateur',
        ]);

        $this->assertSame([
            'email' => 'formateur@skillhub.fr',
            'role' => 'formateur',
        ], $user->getJWTCustomClaims());
    }

    public function test_get_auth_password_uses_mot_de_passe_attribute(): void
    {
        $user = new Utilisateur();
        $user->setRawAttributes([
            'mot_de_passe' => 'hashed-secret-value',
        ]);

        $this->assertSame('hashed-secret-value', $user->getAuthPassword());
    }

    public function test_mot_de_passe_is_hidden_from_serialized_output(): void
    {
        $user = new Utilisateur([
            'email' => 'hidden@skillhub.fr',
            'nom' => 'Hidden',
            'prenom' => 'User',
            'role' => 'participant',
        ]);
        $user->setRawAttributes(array_merge($user->getAttributes(), [
            'mot_de_passe' => 'secret-value',
        ]));

        $this->assertArrayNotHasKey('mot_de_passe', $user->toArray());
    }
}
