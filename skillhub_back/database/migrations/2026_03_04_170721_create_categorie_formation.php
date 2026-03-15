<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Création de la table catégories de formation (libellé unique : ex. "Développement", "Design").
     */
    public function up(): void
    {
        Schema::create('categorie_formations', function (Blueprint $table) {
            $table->id();
            $table->string('libelle', 100)->unique();
            $table->timestamps();
        });
    }

    /**
     * Suppression de la table categorie_formations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categorie_formations');
    }
};
