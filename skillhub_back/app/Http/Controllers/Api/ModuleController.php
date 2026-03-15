<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Models\Module;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ModuleController extends Controller
{
    /**
     * Liste des modules d'une formation (ordre).
     */
    public function index(int $formationId): JsonResponse
    {
        $formation = Formation::find($formationId);
        if (! $formation) {
            return response()->json(['message' => 'Formation introuvable'], 404);
        }

        $modules = $formation->modules()->orderBy('ordre')->get();

        return response()->json(['modules' => $modules]);
    }

    /**
     * Ajouter un module (formateur propriétaire uniquement).
     */
    public function store(Request $request, int $formationId): JsonResponse
    {
        $formation = Formation::find($formationId);
        if (! $formation) {
            return response()->json(['message' => 'Formation introuvable'], 404);
        }
        if ($formation->id_formateur !== (int) auth()->id()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $validated = $request->validate([
            'titre' => 'required|string|max:200',
            'contenu' => 'nullable|string',
            'type_contenu' => 'nullable|string|in:texte,video,ressource',
            'url_ressource' => 'nullable|string|max:500',
            'ordre' => 'nullable|integer|min:1',
        ]);

        $validated['formation_id'] = $formationId;
        $validated['type_contenu'] = $validated['type_contenu'] ?? 'texte';
        $validated['ordre'] = $validated['ordre'] ?? ($formation->modules()->max('ordre') + 1);

        $module = Module::create($validated);

        return response()->json(['message' => 'Module ajouté', 'module' => $module], 201);
    }

    /**
     * Modifier un module (formateur propriétaire de la formation).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $module = Module::with('formation')->find($id);
        if (! $module) {
            return response()->json(['message' => 'Module introuvable'], 404);
        }
        if ($module->formation->id_formateur !== (int) auth()->id()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $validated = $request->validate([
            'titre' => 'sometimes|string|max:200',
            'contenu' => 'nullable|string',
            'type_contenu' => ['sometimes', Rule::in(['texte', 'video', 'ressource'])],
            'url_ressource' => 'nullable|string|max:500',
            'ordre' => 'sometimes|integer|min:1',
        ]);

        $module->update($validated);

        return response()->json(['message' => 'Module mis à jour', 'module' => $module->fresh()]);
    }

    /**
     * Supprimer un module.
     */
    public function destroy(int $id): JsonResponse
    {
        $module = Module::with('formation')->find($id);
        if (! $module) {
            return response()->json(['message' => 'Module introuvable'], 404);
        }
        if ($module->formation->id_formateur !== (int) auth()->id()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $module->delete();

        return response()->json(['message' => 'Module supprimé']);
    }
}
