<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Models\Inscription;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;

class InscriptionController extends Controller
{
    /**
     * S'inscrire à une formation (apprenant uniquement).
     */
    public function store(int $formationId): JsonResponse
    {
        $user = auth()->user();
        if ($user->role !== 'participant') {
            return response()->json(['message' => 'Réservé aux apprenants.'], 403);
        }

        $formation = Formation::find($formationId);
        if (! $formation) {
            return response()->json(['message' => 'Formation introuvable'], 404);
        }

        $exists = Inscription::where('utilisateur_id', $user->id)->where('formation_id', $formationId)->exists();
        if ($exists) {
            return response()->json(['message' => 'Vous êtes déjà inscrit à cette formation.'], 422);
        }

        Inscription::create([
            'utilisateur_id' => $user->id,
            'formation_id' => $formationId,
            'progression' => 0,
        ]);

        app(ActivityLogService::class)->logCourseEnrollment((int) $user->id, $formationId);

        return response()->json(['message' => 'Inscription enregistrée.'], 201);
    }

    /**
     * Se désinscrire d'une formation.
     */
    public function destroy(int $formationId): JsonResponse
    {
        $user = auth()->user();
        if ($user->role !== 'participant') {
            return response()->json(['message' => 'Réservé aux apprenants.'], 403);
        }

        $inscription = Inscription::where('utilisateur_id', $user->id)->where('formation_id', $formationId)->first();
        if (! $inscription) {
            return response()->json(['message' => 'Inscription introuvable.'], 404);
        }

        $inscription->delete();

        return response()->json(['message' => 'Désinscription effectuée.']);
    }

    /**
     * Formations suivies par l'apprenant connecté (avec progression).
     */
    public function index(): JsonResponse
    {
        $user = auth()->user();
        if ($user->role !== 'participant') {
            return response()->json(['message' => 'Réservé aux apprenants.'], 403);
        }

        $inscriptions = Inscription::where('utilisateur_id', $user->id)
            ->with(['formation.formateur:id,nom,prenom', 'formation.categorie:id,libelle'])
            ->orderByDesc('date_inscription')
            ->get();

        $formations = $inscriptions->map(function (Inscription $ins) {
            $f = $ins->formation;
            $f->progression = $ins->progression;
            $f->date_inscription = $ins->date_inscription;

            return $f;
        });

        return response()->json(['formations' => $formations]);
    }

    /**
     * Mettre à jour la progression (page suivi).
     */
    public function updateProgression(int $formationId): JsonResponse
    {
        $user = auth()->user();
        $inscription = Inscription::where('utilisateur_id', $user->id)->where('formation_id', $formationId)->first();
        if (! $inscription) {
            return response()->json(['message' => 'Inscription introuvable.'], 404);
        }

        $progression = (int) request()->input('progression', 0);
        $progression = max(0, min(100, $progression));
        $inscription->update(['progression' => $progression]);

        return response()->json(['message' => 'Progression enregistrée', 'progression' => $inscription->progression]);
    }
}
