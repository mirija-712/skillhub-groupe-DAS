<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Suppression du compteur de vues et de la table associée (fonctionnalité retirée du projet).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('formation_vue_utilisateurs');

        if (Schema::hasColumn('formations', 'nombre_de_vues')) {
            Schema::table('formations', function (Blueprint $table) {
                $table->dropColumn('nombre_de_vues');
            });
        }
    }

    public function down(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->unsignedInteger('nombre_de_vues')->default(0)->after('image_url');
        });
    }
};
