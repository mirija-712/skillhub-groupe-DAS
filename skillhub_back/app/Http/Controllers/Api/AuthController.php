<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use OpenApi\Annotations as OA;
use App\Models\Utilisateur;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

/**
 * Tout ce qui touche à l'auth : inscription, connexion, déconnexion, récupérer l'utilisateur connecté, refresh token.
 * À la connexion on vérifie le rôle : si c'est un participant on renvoie 403 (seuls les formateurs peuvent se connecter).
 *
 * @OA\OpenApi(
 *     @OA\Info(title="SkillHub API", version="1.0", description="API REST SkillHub - Formations et JWT"),
 *     @OA\Server(url="/api", description="API"),
 *     @OA\Components(
 *         @OA\SecurityScheme(securityScheme="bearerAuth", type="http", scheme="bearer", bearerFormat="JWT")
 *     )
 * )
 */
class AuthController extends Controller
{
    // Messages pour la validation de la connexion uniquement (email + mot_de_passe). L'inscription utilise RegisterRequest et ses messages.
    private const MESSAGES_LOGIN = [
        'email.required' => "L'email est requis.",
        'email.email' => "L'email n'est pas valide.",
        'mot_de_passe.required' => 'Le mot de passe est requis.',
        'mot_de_passe.string' => 'Le mot de passe doit être une chaîne de caractères.',
    ];

    /**
     * Inscription d'un nouvel utilisateur.
     *
     * @OA\Post(path="/auth/inscription", tags={"Auth"}, summary="Inscription",
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(required={"email","mot_de_passe","nom","role"},
     *             @OA\Property(property="email", type="string", format="email"),
     *             @OA\Property(property="mot_de_passe", type="string", minLength=6),
     *             @OA\Property(property="nom", type="string", maxLength=100),
     *             @OA\Property(property="prenom", type="string", maxLength=100),
     *             @OA\Property(property="role", type="string", enum={"participant","formateur"})
     *         )
     *     ),
     *     @OA\Response(response="201", description="Utilisateur créé"),
     *     @OA\Response(response="422", description="Erreur de validation")
     * )
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();
            // RegisterRequest a déjà validé email, mot_de_passe, nom, prenom (optionnel), role
            $utilisateur = Utilisateur::create($request->validated());

            DB::commit();

            return response()->json([
                'message' => 'Utilisateur créé avec succès. Vous pouvez maintenant vous connecter.',
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Erreur inscription: '.$e->getMessage(), ['trace' => $e->getTraceAsString()]);

            return response()->json([
                'message' => 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.',
            ], 500);
        }
    }

    /**
     * Connexion.
     *
     * @OA\Post(path="/auth/connexion", tags={"Auth"}, summary="Connexion",
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(required={"email","mot_de_passe"},
     *             @OA\Property(property="email", type="string", format="email"),
     *             @OA\Property(property="mot_de_passe", type="string")
     *         )
     *     ),
     *     @OA\Response(response="200", description="Connexion réussie - retourne token JWT"),
     *     @OA\Response(response="401", description="Identifiants incorrects"),
     *     @OA\Response(response="422", description="Erreur de validation")
     * )
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'mot_de_passe' => 'required|string',
        ], self::MESSAGES_LOGIN);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erreur de validation',
                'erreurs' => $validator->errors(),
            ], 422);
        }

        try {
            // JWT attend "password" ; le front envoie "mot_de_passe"
            $credentials = [
                'email' => $request->email,
                'password' => $request->mot_de_passe,
            ];

            if (! $token = auth('api')->attempt($credentials)) {
                return response()->json([
                    'message' => 'Email ou mot de passe incorrect.',
                ], 401);
            }

            $utilisateur = auth('api')->user();
            // Accès réservé aux formateurs : les participants ne peuvent pas se connecter à cette app
            if ($utilisateur->role !== 'formateur') {
                auth('api')->logout();

                return response()->json([
                    'message' => 'Accès réservé aux formateurs uniquement.',
                ], 403);
            }

            return response()->json([
                'message' => 'Connexion réussie',
                'utilisateur' => [
                    'id' => $utilisateur->id,
                    'email' => $utilisateur->email,
                    'nom' => $utilisateur->nom,
                    'prenom' => $utilisateur->prenom,
                    'role' => $utilisateur->role,
                ],
                'token' => $token,
                'type' => 'bearer',
            ]);
        } catch (Exception $e) {
            Log::error('Erreur connexion: '.$e->getMessage(), ['trace' => $e->getTraceAsString()]);

            return response()->json([
                'message' => 'Une erreur est survenue lors de la connexion. Veuillez réessayer.',
            ], 500);
        }
    }

    /**
     * Déconnexion (invalide le token).
     *
     * @OA\Post(path="/auth/deconnexion", tags={"Auth"}, summary="Déconnexion", security={{"bearerAuth":{}}},
     *     @OA\Response(response="200", description="Déconnexion réussie")
     * )
     */
    public function logout(): JsonResponse
    {
        try {
            auth('api')->logout();

            return response()->json(['message' => 'Déconnexion réussie']);
        } catch (Exception $e) {
            Log::warning('Erreur déconnexion: '.$e->getMessage());

            return response()->json(['message' => 'Déconnexion réussie']);
        }
    }

    /**
     * Utilisateur connecté.
     *
     * @OA\Get(path="/auth/me", tags={"Auth"}, summary="Utilisateur connecté", security={{"bearerAuth":{}}},
     *     @OA\Response(response="200", description="Données utilisateur"),
     *     @OA\Response(response="401", description="Non authentifié")
     * )
     */
    public function me(): JsonResponse
    {
        $utilisateur = auth('api')->user();

        if (! $utilisateur) {
            return response()->json(['message' => 'Utilisateur non authentifié.'], 401);
        }

        return response()->json([
            'utilisateur' => [
                'id' => $utilisateur->id,
                'email' => $utilisateur->email,
                'nom' => $utilisateur->nom,
                'prenom' => $utilisateur->prenom,
                'role' => $utilisateur->role,
            ],
        ]);
    }

    /**
     * Rafraîchir le token.
     *
     * @OA\Post(path="/auth/refresh", tags={"Auth"}, summary="Rafraîchir le token", security={{"bearerAuth":{}}},
     *     @OA\Response(response="200", description="Nouveau token"),
     *     @OA\Response(response="401", description="Token invalide ou expiré")
     * )
     */
    public function refresh(): JsonResponse
    {
        try {
            $token = auth('api')->refresh();

            return response()->json([
                'message' => 'Token rafraîchi',
                'token' => $token,
                'type' => 'bearer',
            ]);
        } catch (Exception $e) {
            Log::error('Erreur refresh token: '.$e->getMessage());

            return response()->json([
                'message' => 'Impossible de rafraîchir le token. Veuillez vous reconnecter.',
            ], 401);
        }
    }
}
