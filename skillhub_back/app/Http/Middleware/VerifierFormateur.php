<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware utilisé sur les routes de création / modification / suppression des formations.
 * Si l'utilisateur n'est pas connecté ou n'a pas le rôle "formateur", on renvoie 403.
 */
class VerifierFormateur
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Seuls les utilisateurs connectés avec le rôle "formateur" peuvent accéder aux routes protégées
        if (! $user || $user->role !== 'formateur') {
            return response()->json([
                'message' => 'Accès réservé aux formateurs uniquement.',
            ], 403);
        }

        return $next($request);
    }
}
