<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ajout des colonnes description et level (beginner/intermediate/advanced) à la table formations.
     */
    public function up(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->text('description')->nullable()->after('nom');
            $table->enum('level', ['beginner', 'intermediate', 'advanced'])->nullable()->after('description');
        });
    }

    /**
     * Suppression de description et level en cas de rollback.
     */
    public function down(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->dropColumn(['description', 'level']);
        });
    }
};
