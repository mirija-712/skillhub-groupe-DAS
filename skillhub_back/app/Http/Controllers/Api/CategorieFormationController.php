<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use OpenApi\Annotations as OA;
use App\Models\CategorieFormation;
use Illuminate\Http\JsonResponse;

/**
 * Simple liste des catégories (domaines). Pas d'auth, utilisé par le front pour le select "catégorie" dans le formulaire d'ajout.
 */
class CategorieFormationController extends Controller
{
    /**
     * Liste des catégories triées par libellé.
     *
     * @OA\Get(path="/categories", tags={"Catégories"}, summary="Liste des catégories",
     *     @OA\Response(response="200", description="Liste des catégories de formations")
     * )
     */
    public function index(): JsonResponse
    {
        // Liste publique : pas d'authentification requise (pour le formulaire d'ajout de formation)
        $categories = CategorieFormation::orderBy('libelle')->get(['id', 'libelle']);

        return response()->json(['categories' => $categories]);
    }
}
