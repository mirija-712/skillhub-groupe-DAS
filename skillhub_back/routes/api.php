<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategorieFormationController;
use App\Http\Controllers\Api\FormationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes API - Toutes les URLs sont préfixées par /api
|--------------------------------------------------------------------------
*/

// --- Auth : inscription et connexion sans token, le reste avec JWT
Route::prefix('auth')->group(function () {
    Route::post('inscription', [AuthController::class, 'register']);
    Route::post('connexion', [AuthController::class, 'login']);

    Route::middleware('auth:api')->group(function () {
        Route::post('deconnexion', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::post('refresh', [AuthController::class, 'refresh']);
    });
});

// --- Catégories : public, pas besoin de se connecter (pour le select du formulaire d'ajout)
Route::get('categories', [CategorieFormationController::class, 'index']);

// --- Formations : il faut être connecté (auth:api). Création / modification / suppression réservées aux formateurs.
Route::middleware('auth:api')->group(function () {
    Route::get('formations', [FormationController::class, 'index']);
    Route::get('formations/{formation}', [FormationController::class, 'show']);

    Route::middleware('formateur')->group(function () {
        Route::post('formations', [FormationController::class, 'store']);
        // Deux routes pour update : PUT = JSON (sans image), POST = FormData (avec nouvelle image)
        Route::put('formations/{formation}', [FormationController::class, 'update']);
        Route::post('formations/{formation}', [FormationController::class, 'update']);
        Route::delete('formations/{formation}', [FormationController::class, 'destroy']);
    });
});
