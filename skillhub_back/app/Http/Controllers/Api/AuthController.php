<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\Utilisateur;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use OpenApi\Annotations as OA;

/**
 * Auth : inscription, connexion, déconnexion, utilisateur connecté, refresh token.
 *
 * @OA\OpenApi(
 *
 *     @OA\Info(title="SkillHub API", version="1.0", description="API REST SkillHub - Formations et JWT"),
 *
 *     @OA\Server(url="/api", description="API"),
 *
 *     @OA\Components(
 *
 *         @OA\SecurityScheme(securityScheme="bearerAuth", type="http", scheme="bearer", bearerFormat="JWT")
 *     )
 * )
 */
class AuthController extends Controller
{
    /**
     * Inscription d'un nouvel utilisateur.
     *
     * @OA\Post(path="/auth/inscription", tags={"Auth"}, summary="Inscription",
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(required={"email","mot_de_passe","nom","role"},
     *
     *             @OA\Property(property="email", type="string", format="email"),
     *             @OA\Property(property="mot_de_passe", type="string", minLength=6),
     *             @OA\Property(property="nom", type="string", maxLength=100),
     *             @OA\Property(property="prenom", type="string", maxLength=100),
     *             @OA\Property(property="role", type="string", enum={"participant","formateur"})
     *         )
     *     ),
     *
     *     @OA\Response(response="201", description="Utilisateur créé"),
     *     @OA\Response(response="422", description="Erreur de validation")
     * )
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            DB::transaction(fn () => Utilisateur::create($request->validated()));

            return response()->json([
                'message' => 'Utilisateur créé avec succès. Vous pouvez maintenant vous connecter.',
            ], 201);
        } catch (Exception $e) {
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
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(required={"email","mot_de_passe"},
     *
     *             @OA\Property(property="email", type="string", format="email"),
     *             @OA\Property(property="mot_de_passe", type="string")
     *         )
     *     ),
     *
     *     @OA\Response(response="200", description="Connexion réussie - retourne token JWT"),
     *     @OA\Response(response="401", description="Identifiants incorrects"),
     *     @OA\Response(response="422", description="Erreur de validation")
     * )
     */
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $credentials = [
                'email' => $request->validated('email'),
                'password' => $request->validated('mot_de_passe'),
            ];

            if (! $token = auth('api')->attempt($credentials)) {
                return response()->json([
                    'message' => 'Email ou mot de passe incorrect.',
                ], 401);
            }

            $utilisateur = auth('api')->user();

            return response()->json([
                'message' => 'Connexion réussie',
                'utilisateur' => self::utilisateurPourApi($utilisateur),
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
     *
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
     *
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
            'utilisateur' => self::utilisateurPourApi($utilisateur),
        ]);
    }

    /**
     * Rafraîchir le token.
     *
     * @OA\Post(path="/auth/refresh", tags={"Auth"}, summary="Rafraîchir le token", security={{"bearerAuth":{}}},
     *
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

    /**
     * @return array<string, mixed>
     */
    private static function utilisateurPourApi(Utilisateur $u): array
    {
        return [
            'id' => $u->id,
            'email' => $u->email,
            'nom' => $u->nom,
            'prenom' => $u->prenom,
            'role' => $u->role,
        ];
    }
}
