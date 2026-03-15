<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Création de la table utilisateurs (email, mot_de_passe, nom, prenom, role participant|formateur).
     */
    public function up(): void
    {
        Schema::create('utilisateurs', function (Blueprint $table) {
            $table->id();
            $table->string('email', 100)->unique();
            $table->string('mot_de_passe');
            $table->string('nom', 100);
            $table->string('prenom', 100)->nullable();
            $table->enum('role', ['participant', 'formateur'])->default('participant');
            $table->timestamps();
        });
    }

    /**
     * Suppression de la table utilisateurs.
     */
    public function down(): void
    {
        Schema::dropIfExists('utilisateurs');
    }
};
