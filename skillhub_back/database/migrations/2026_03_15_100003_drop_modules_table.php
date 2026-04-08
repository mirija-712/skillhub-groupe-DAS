<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('modules');
    }

    public function down(): void
    {
        // Rétablissement volontairement omis : la fonctionnalité modules a été retirée du projet.
    }
};
