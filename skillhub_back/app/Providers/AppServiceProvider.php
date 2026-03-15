<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

/**
 * Fournisseur de services de l'application.
 * Utilisé pour enregistrer des bindings ou initialisations globales (actuellement vide).
 */
class AppServiceProvider extends ServiceProvider
{
    /**
     * Enregistrement des services (bindings, singletons, etc.).
     */
    public function register(): void
    {
        //
    }

    /**
     * Amorçage des services après enregistrement (events, observers, etc.).
     */
    public function boot(): void
    {
        //
    }
}
