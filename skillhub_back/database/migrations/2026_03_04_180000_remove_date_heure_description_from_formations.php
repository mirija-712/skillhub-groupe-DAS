<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Suppression des colonnes date, heure et description (refonte du schéma formations).
     */
    public function up(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->dropColumn(['date', 'heure', 'description']);
        });
    }

    /**
     * Restauration des colonnes en cas de rollback.
     */
    public function down(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->date('date')->after('nom');
            $table->time('heure')->nullable()->after('date');
            $table->text('description')->nullable()->after('nom');
        });
    }
};
