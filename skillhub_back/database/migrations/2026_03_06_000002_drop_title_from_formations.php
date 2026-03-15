<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Suppression de la colonne title (on utilise uniquement "nom" pour le titre de la formation).
     */
    public function up(): void
    {
        if (Schema::hasColumn('formations', 'title')) {
            Schema::table('formations', function (Blueprint $table) {
                $table->dropColumn('title');
            });
        }
    }

    /**
     * Restauration de la colonne title en cas de rollback.
     */
    public function down(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->string('title', 200)->nullable()->after('nom');
        });
    }
};
