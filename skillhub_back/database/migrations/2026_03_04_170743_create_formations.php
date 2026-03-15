<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Création de la table formations : lien formateur + catégorie, nom, description, durée, prix, statut, image.
     */
    public function up(): void
    {
        Schema::create('formations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_formateur')->constrained('utilisateurs')->cascadeOnDelete();
            $table->foreignId('id_categorie')->constrained('categorie_formations')->restrictOnDelete();
            $table->string('nom', 200);
            $table->text('description')->nullable();
            $table->date('date');
            $table->time('heure')->nullable();
            $table->decimal('duree_heures', 5, 2);
            $table->decimal('prix', 10, 2)->default(0);
            $table->string('statut', 50)->default('En Cours');
            $table->string('image_url', 500)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Suppression de la table formations.
     */
    public function down(): void
    {
        Schema::dropIfExists('formations');
    }
};
