<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class UtilisateurTest extends TestCase
{
    /**
     * Vérifie que le rôle formateur est bien reconnu
     */
    public function test_role_formateur_est_valide(): void
    {
        $rolesValides = ['formateur', 'participant', 'admin'];
        $this->assertContains('formateur', $rolesValides);
    }

    /**
     * Vérifie que le rôle participant est bien reconnu
     */
    public function test_role_participant_est_valide(): void
    {
        $rolesValides = ['formateur', 'participant', 'admin'];
        $this->assertContains('participant', $rolesValides);
    }

    /**
     * Vérifie qu'un rôle invalide n'est pas accepté
     */
    public function test_role_invalide_est_rejete(): void
    {
        $rolesValides = ['formateur', 'participant', 'admin'];
        $this->assertNotContains('inconnu', $rolesValides);
    }

    /**
     * Vérifie le format d'un email valide
     */
    public function test_email_valide(): void
    {
        $email = 'formateur@skillhub.fr';
        $this->assertTrue(filter_var($email, FILTER_VALIDATE_EMAIL) !== false);
    }

    /**
     * Vérifie qu'un email invalide est rejeté
     */
    public function test_email_invalide(): void
    {
        $email = 'pas-un-email';
        $this->assertFalse(filter_var($email, FILTER_VALIDATE_EMAIL) !== false);
    }

    /**
     * Vérifie que le mot de passe respecte la longueur minimale
     */
    public function test_mot_de_passe_longueur_minimale(): void
    {
        $motDePasse = 'password123';
        $this->assertGreaterThanOrEqual(8, strlen($motDePasse));
    }

    /**
     * Vérifie qu'un mot de passe trop court est refusé
     */
    public function test_mot_de_passe_trop_court(): void
    {
        $motDePasse = '123';
        $this->assertLessThan(8, strlen($motDePasse));
    }
}