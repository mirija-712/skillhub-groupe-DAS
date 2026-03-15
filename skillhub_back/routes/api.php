<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategorieFormationController;
use App\Http\Controllers\Api\FormationController;
use App\Http\Controllers\Api\InscriptionController;
use App\Http\Controllers\Api\ModuleController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes API - Toutes les URLs sont préfixées par /api
|--------------------------------------------------------------------------
*/

// --- Auth
Route::prefix('auth')->group(function () {
    Route::post('inscription', [AuthController::class, 'register']);
    Route::post('connexion', [AuthController::class, 'login']);
    Route::middleware('auth:api')->group(function () {
        Route::post('deconnexion', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::post('refresh', [AuthController::class, 'refresh']);
    });
});

Route::get('categories', [CategorieFormationController::class, 'index']);

// --- Formations : liste et détail publics (catalogue, page accueil). Création / modification / suppression protégées.
Route::get('formations', [FormationController::class, 'index']);
Route::get('formations/{id}', [FormationController::class, 'show'])->whereNumber('id');

Route::middleware('auth:api')->group(function () {
    Route::middleware('formateur')->group(function () {
        Route::post('formations', [FormationController::class, 'store']);
        Route::put('formations/{formation}', [FormationController::class, 'update']);
        Route::post('formations/{formation}', [FormationController::class, 'update']);
        Route::delete('formations/{formation}', [FormationController::class, 'destroy']);

        Route::get('formations/{formationId}/modules', [ModuleController::class, 'index'])->whereNumber('formationId');
        Route::post('formations/{formationId}/modules', [ModuleController::class, 'store'])->whereNumber('formationId');
        Route::put('modules/{id}', [ModuleController::class, 'update'])->whereNumber('id');
        Route::delete('modules/{id}', [ModuleController::class, 'destroy'])->whereNumber('id');
    });

    // Inscription / désinscription (apprenant) et formations suivies
    Route::post('formations/{formationId}/inscription', [InscriptionController::class, 'store']);
    Route::delete('formations/{formationId}/inscription', [InscriptionController::class, 'destroy']);
    Route::get('apprenant/formations', [InscriptionController::class, 'index']);
    Route::put('formations/{formationId}/progression', [InscriptionController::class, 'updateProgression']);
});
