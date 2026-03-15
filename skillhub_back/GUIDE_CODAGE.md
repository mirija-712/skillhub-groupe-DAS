# Guide de codage — Backend SkillHub (Laravel API)

Guide pour **recoder le backend depuis zéro**. Chaque section contient le code à reproduire et des explications.

---

## Sommaire

1. [Vue d’ensemble](#1-vue-densemble)
2. [Configuration et bootstrap](#2-configuration-et-bootstrap)
3. [Migrations (base de données)](#3-migrations-base-de-données)
4. [Modèles Eloquent](#4-modèles-eloquent)
5. [Middleware](#5-middleware)
6. [Form Requests](#6-form-requests)
7. [Contrôleurs API](#7-contrôleurs-api)
8. [Routes API](#8-routes-api)
9. [Service ActivityLog](#9-service-activitylog)
10. [Config auth (JWT)](#10-config-auth-jwt)

---

## 1. Vue d’ensemble

- **Stack** : PHP 8.2, Laravel 12, JWT (tymon/jwt-auth).
- **Rôle** : API REST JSON, préfixe `/api`.
- **Auth** : guard `api` (JWT). Rôles : `participant` (apprenant), `formateur`.
- **Tables** : utilisateurs, categorie_formations, formations, modules, inscriptions.

Ordre de recodage conseillé : migrations → modèles → config auth → middleware → Form Requests → contrôleurs → routes → bootstrap (exceptions JSON) → service ActivityLog.

---

## 2. Configuration et bootstrap

### 2.1 Alias middleware et exceptions JSON

Fichier : `bootstrap/app.php`. On enregistre le middleware `formateur` et on force le rendu JSON pour toutes les requêtes `api/*`.

```php
<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'formateur' => \App\Http\Middleware\VerifierFormateur::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $request, \Throwable $e) => $request->is('api/*'));

        $exceptions->renderable(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'Erreur de validation',
                    'erreurs' => $e->errors(),
                ], 422);
            }
        });

        $exceptions->renderable(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') && $request->expectsJson()) {
                return response()->json(['message' => 'Token manquant ou invalide. Veuillez vous reconnecter.'], 401);
            }
        });

        $exceptions->renderable(function (UnauthorizedHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                $message = $e->getMessage();
                if (str_contains($message, 'expired')) {
                    $message = 'Token expiré. Veuillez vous reconnecter.';
                } elseif (str_contains($message, 'invalid') || str_contains($message, 'malformed')) {
                    $message = 'Token invalide. Veuillez vous reconnecter.';
                } elseif (str_contains($message, 'not provided')) {
                    $message = 'Token manquant.';
                }
                return response()->json(['message' => $message], 401);
            }
        });

        $exceptions->renderable(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'Ressource introuvable'], 404);
            }
        });

        $exceptions->renderable(function (HttpException $e, Request $request) {
            if ($request->is('api/*') && $e->getStatusCode() >= 500) {
                return response()->json([
                    'message' => 'Erreur serveur. Veuillez réessayer plus tard.',
                ], $e->getStatusCode());
            }
        });

        $exceptions->renderable(function (\Throwable $e, Request $request) {
            if ($request->is('api/*')) {
                if ($e instanceof \Tymon\JWTAuth\Exceptions\JWTException) {
                    $message = str_contains(strtolower($e->getMessage()), 'not provided')
                        ? 'Token manquant.'
                        : 'Token invalide ou expiré. Veuillez vous reconnecter.';
                    return response()->json(['message' => $message], 401);
                }
                $status = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;
                return response()->json([
                    'message' => config('app.debug') ? $e->getMessage() : 'Une erreur inattendue est survenue.',
                ], $status);
            }
        });
    })->create();
```

**Explication** : `shouldRenderJsonWhen` fait que toute exception sur `api/*` renvoie du JSON. Les `renderable` personnalisent les réponses 422, 401, 404, 500 et les erreurs JWT pour que le front reçoive toujours un objet avec `message` (et `erreurs` en 422).

---

## 3. Migrations (base de données)

Créer les migrations dans cet ordre (dépendances FK).

### 3.1 Table `utilisateurs`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('utilisateurs', function (Blueprint $table) {
            $table->id();
            $table->string('email', 100)->unique();
            $table->string('mot_de_passe');
            $table->string('nom', 100);
            $table->string('prenom', 100)->nullable();
            $table->enum('role', ['participant', 'formateur'])->default('participant');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('utilisateurs');
    }
};
```

### 3.2 Table `categorie_formations`

```php
Schema::create('categorie_formations', function (Blueprint $table) {
    $table->id();
    $table->string('libelle', 100)->unique();
    $table->timestamps();
});
```

### 3.3 Table `formations`

```php
Schema::create('formations', function (Blueprint $table) {
    $table->id();
    $table->foreignId('id_formateur')->constrained('utilisateurs')->cascadeOnDelete();
    $table->foreignId('id_categorie')->constrained('categorie_formations')->restrictOnDelete();
    $table->string('nom', 200);
    $table->text('description')->nullable();
    $table->decimal('duree_heures', 5, 2);
    $table->decimal('prix', 10, 2)->default(0);
    $table->enum('level', ['beginner', 'intermediate', 'advanced'])->nullable();
    $table->string('statut', 50)->default('En Cours');
    $table->string('image_url', 500)->nullable();
    $table->unsignedInteger('nombre_de_vues')->default(0);
    $table->timestamps();
});
```

(On peut partir de la migration d’origine avec date/heure puis ajouter une migration pour supprimer date/heure et ajouter level + nombre_de_vues ; ici version “finale” simplifiée.)

### 3.4 Table `modules`

```php
Schema::create('modules', function (Blueprint $table) {
    $table->id();
    $table->foreignId('formation_id')->constrained('formations')->cascadeOnDelete();
    $table->string('titre', 200);
    $table->text('contenu')->nullable();
    $table->string('type_contenu', 50)->default('texte');
    $table->string('url_ressource', 500)->nullable();
    $table->unsignedSmallInteger('ordre')->default(1);
    $table->timestamps();
});
```

### 3.5 Table `inscriptions`

```php
Schema::create('inscriptions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('utilisateur_id')->constrained('utilisateurs')->cascadeOnDelete();
    $table->foreignId('formation_id')->constrained('formations')->cascadeOnDelete();
    $table->unsignedTinyInteger('progression')->default(0);
    $table->timestamp('date_inscription')->useCurrent();
    $table->timestamps();
    $table->unique(['utilisateur_id', 'formation_id']);
});
```

---

## 4. Modèles Eloquent

### 4.1 Utilisateur (JWT + Auth)

La table est `utilisateurs`, le champ mot de passe `mot_de_passe`. Laravel/JWT attendent `password` : on utilise `getAuthPassword()` pour leur donner `mot_de_passe`.

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class Utilisateur extends Authenticatable implements JWTSubject
{
    use HasFactory;

    protected $table = 'utilisateurs';

    protected $fillable = [
        'email',
        'mot_de_passe',
        'nom',
        'prenom',
        'role',
    ];

    protected $hidden = ['mot_de_passe'];

    protected function casts(): array
    {
        return [
            'mot_de_passe' => 'hashed',
        ];
    }

    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [
            'email' => $this->email,
            'role' => $this->role,
        ];
    }

    public function getAuthPassword()
    {
        return $this->mot_de_passe;
    }

    public function inscriptions(): HasMany
    {
        return $this->hasMany(Inscription::class);
    }

    public function isFormateur(): bool
    {
        return $this->role === 'formateur';
    }

    public function isApprenant(): bool
    {
        return $this->role === 'participant';
    }
}
```

### 4.2 CategorieFormation

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CategorieFormation extends Model
{
    use HasFactory;

    protected $table = 'categorie_formations';

    protected $fillable = ['libelle'];

    public function formations(): HasMany
    {
        return $this->hasMany(Formation::class, 'id_categorie');
    }
}
```

### 4.3 Formation

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Formation extends Model
{
    use HasFactory;

    protected $table = 'formations';

    protected $fillable = [
        'id_formateur',
        'id_categorie',
        'nom',
        'description',
        'duree_heures',
        'prix',
        'level',
        'statut',
        'image_url',
        'nombre_de_vues',
    ];

    protected function casts(): array
    {
        return [
            'duree_heures' => 'decimal:2',
            'prix' => 'decimal:2',
        ];
    }

    public function formateur(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'id_formateur');
    }

    public function categorie(): BelongsTo
    {
        return $this->belongsTo(CategorieFormation::class, 'id_categorie');
    }

    public function modules(): HasMany
    {
        return $this->hasMany(Module::class)->orderBy('ordre');
    }

    public function inscriptions(): HasMany
    {
        return $this->hasMany(Inscription::class);
    }
}
```

### 4.4 Module

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Module extends Model
{
    use HasFactory;

    protected $table = 'modules';

    protected $fillable = [
        'formation_id',
        'titre',
        'contenu',
        'type_contenu',
        'url_ressource',
        'ordre',
    ];

    public function formation(): BelongsTo
    {
        return $this->belongsTo(Formation::class);
    }
}
```

### 4.5 Inscription

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inscription extends Model
{
    use HasFactory;

    protected $table = 'inscriptions';

    protected $fillable = [
        'utilisateur_id',
        'formation_id',
        'progression',
    ];

    protected function casts(): array
    {
        return [
            'date_inscription' => 'datetime',
        ];
    }

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class);
    }

    public function formation(): BelongsTo
    {
        return $this->belongsTo(Formation::class);
    }
}
```

---

## 5. Middleware

Fichier : `app/Http/Middleware/VerifierFormateur.php`. Réservé aux utilisateurs connectés avec le rôle `formateur`.

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifierFormateur
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== 'formateur') {
            return response()->json([
                'message' => 'Accès réservé aux formateurs uniquement.',
            ], 403);
        }

        return $next($request);
    }
}
```

---

## 6. Form Requests

### 6.1 RegisterRequest

Fichier : `app/Http/Requests/RegisterRequest.php`.

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => 'required|email|unique:utilisateurs,email',
            'mot_de_passe' => 'required|string|min:6',
            'nom' => 'required|string|max:100',
            'prenom' => 'nullable|string|max:100',
            'role' => 'required|in:participant,formateur',
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => "L'email est requis.",
            'email.email' => "L'email n'est pas valide.",
            'email.unique' => 'Cet email est déjà utilisé.',
            'mot_de_passe.required' => 'Le mot de passe est requis.',
            'mot_de_passe.min' => 'Le mot de passe doit contenir au moins :min caractères.',
            'nom.required' => 'Le nom est requis.',
            'role.required' => 'Le rôle est requis.',
            'role.in' => 'Le rôle doit être Apprenant ou Formateur.',
        ];
    }
}
```

### 6.2 StoreFormationRequest

Le front envoie `title`, `description`, `price`, `duration`, `level` ; le contrôleur mappe vers `nom`, `duree_heures`, `prix`.

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFormationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:200',
            'description' => 'required|string|max:2000',
            'price' => 'required|numeric|min:0',
            'duration' => 'required|numeric|min:0',
            'level' => ['required', Rule::in(['beginner', 'intermediate', 'advanced'])],
            'id_categorie' => 'nullable|exists:categorie_formations,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Le titre est requis.',
            'description.required' => 'La description est requise.',
            'price.required' => 'Le prix est requis.',
            'duration.required' => 'La durée est requise.',
            'level.required' => 'Le niveau est requis.',
            'level.in' => 'Le niveau doit être beginner, intermediate ou advanced.',
        ];
    }
}
```

### 6.3 UpdateFormationRequest

Tous les champs en `sometimes` pour mise à jour partielle (nom, description, duree_heures, prix, level, statut, id_categorie, image).

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFormationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_categorie' => 'sometimes|exists:categorie_formations,id',
            'nom' => 'sometimes|string|max:200',
            'description' => 'sometimes|nullable|string|max:2000',
            'duree_heures' => 'sometimes|numeric|min:0',
            'prix' => 'sometimes|numeric|min:0',
            'level' => ['sometimes', Rule::in(['beginner', 'intermediate', 'advanced'])],
            'statut' => ['sometimes', Rule::in(['En Cours', 'Terminé'])],
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'image_url' => 'nullable|string|max:500',
        ];
    }
}
```

---

## 7. Contrôleurs API

### 7.1 AuthController

- **register** : `RegisterRequest` → `Utilisateur::create($request->validated())` en transaction, 201.
- **login** : validation email + mot_de_passe, puis `auth('api')->attempt(['email' => ..., 'password' => $request->mot_de_passe])`. Réponse : token + utilisateur (id, email, nom, prenom, role).
- **logout** : `auth('api')->logout()`, 200.
- **me** : utilisateur connecté ou 401.
- **refresh** : nouveau token JWT, 200 ou 401.

Exemple pour **login** (le reste suit la même logique) :

```php
public function login(Request $request): JsonResponse
{
    $validator = Validator::make($request->all(), [
        'email' => 'required|email',
        'mot_de_passe' => 'required|string',
    ], [
        'email.required' => "L'email est requis.",
        'mot_de_passe.required' => 'Le mot de passe est requis.',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'message' => 'Erreur de validation',
            'erreurs' => $validator->errors(),
        ], 422);
    }

    $credentials = [
        'email' => $request->email,
        'password' => $request->mot_de_passe,
    ];

    if (! $token = auth('api')->attempt($credentials)) {
        return response()->json(['message' => 'Email ou mot de passe incorrect.'], 401);
    }

    $utilisateur = auth('api')->user();

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
}
```

**Important** : JWT attend la clé `password` ; le front envoie `mot_de_passe`, d’où le mapping dans `$credentials`.

### 7.2 CategorieFormationController

```php
public function index(): JsonResponse
{
    $categories = CategorieFormation::orderBy('libelle')->get(['id', 'libelle']);
    return response()->json(['categories' => $categories]);
}
```

### 7.3 FormationController (résumé)

- **index(Request)** : `Formation::with(['formateur:id,nom,prenom', 'categorie:id,libelle'])->withCount('inscriptions')`. Si user formateur et pas de `id_formateur` en query → filtrer par `id_formateur = user->id`. Filtres : id_formateur, id_categorie, statut, level, recherche (like nom/description). Pagination `per_page` (max 50), `page`. Réponse : `{ formations, meta }`.
- **show($id)** : with formateur, categorie, modules, withCount inscriptions. Si pas trouvé → 404. Puis `increment('nombre_de_vues')`, refresh, `ActivityLogService::logCourseView`. Réponse : `{ formation }`.
- **store(StoreFormationRequest)** : id_formateur = user()->id. Mapping : nom = title, duree_heures = duration, prix = price. id_categorie par défaut = première catégorie (sinon 422). statut = 'En Cours'. Si fichier image : `storeAs('formations', Str::uuid().'.'.$extension, 'public')`, image_url = '/storage/...'. Créer la formation puis 3 modules par défaut ("Module 1 – À compléter", etc.). Log `logCourseCreation`. Réponse 201 avec formation + champs title, description, price, duration, level pour le front.
- **update(UpdateFormationRequest, $id)** : Formation::find($id), 404 si absent. Vérifier id_formateur === user()->id, sinon 403. Si nouvelle image : supprimer l’ancienne (convertir image_url en chemin disque), stocker la nouvelle comme en store. Mettre à jour les champs validés. Log `logCourseUpdate` (old/new values). Réponse : formation avec title, description, price, duration, level.
- **destroy($id)** : même vérif 404 + propriétaire. Supprimer l’image disque si présente. delete(). Log `logCourseDeletion`.

Méthode utilitaire pour passer de l’URL d’image au chemin disque :

```php
private static function imageUrlToStoragePath(?string $imageUrl): ?string
{
    if (! $imageUrl) return null;
    $imageUrl = ltrim($imageUrl, '/');
    if (str_starts_with($imageUrl, 'storage/')) {
        return substr($imageUrl, 8);
    }
    return $imageUrl;
}
```

**Note** : Si la route est `formations/{formation}`, le paramètre de la méthode doit s’appeler `$formation` (Laravel lie le segment au nom du paramètre). On peut alors faire `$id = $formation` ou utiliser directement `Formation::find($formation)`.

### 7.4 ModuleController

- **index($formationId)** : Formation::find ou 404, puis modules orderBy ordre.
- **store(Request, $formationId)** : vérifier formation + propriétaire (id_formateur === auth()->id()). Valider titre, contenu, type_contenu (texte|video|ressource), url_ressource, ordre. ordre par défaut = max(ordre)+1. Créer module, 201.
- **update(Request, $id)** : charger module avec formation, vérifier propriétaire. Valider en sometimes. update(), retour module fresh.
- **destroy($id)** : même vérif propriétaire, delete().

### 7.5 InscriptionController

- **store($formationId)** : rôle participant uniquement (403 sinon). Formation existante (404). Pas déjà inscrit (422 si doublon). Inscription::create(utilisateur_id, formation_id, progression 0). Log logCourseEnrollment. 201.
- **destroy($formationId)** : participant uniquement. Trouver inscription user+formation, 404 si absente. delete(). 200.
- **index()** : participant uniquement. Inscriptions de l’user with formation.formateur, formation.categorie, orderBy date_inscription desc. Retourner les formations avec progression et date_inscription sur chaque élément.
- **updateProgression($formationId)** : inscription user+formation, 404 si absente. progression = request input, borné 0–100. update. Réponse avec progression.

---

## 8. Routes API

Fichier : `routes/api.php`. Toutes les URLs sont sous `/api`.

```php
<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategorieFormationController;
use App\Http\Controllers\Api\FormationController;
use App\Http\Controllers\Api\InscriptionController;
use App\Http\Controllers\Api\ModuleController;
use Illuminate\Support\Facades\Route;

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

    Route::post('formations/{formationId}/inscription', [InscriptionController::class, 'store']);
    Route::delete('formations/{formationId}/inscription', [InscriptionController::class, 'destroy']);
    Route::get('apprenant/formations', [InscriptionController::class, 'index']);
    Route::put('formations/{formationId}/progression', [InscriptionController::class, 'updateProgression']);
});
```

Pour `update` et `destroy` le paramètre de route est `{formation}` : dans le contrôleur utiliser `(UpdateFormationRequest $request, int $formation)` puis `Formation::find($formation)`.

---

## 9. Service ActivityLog

Fichier : `app/Services/ActivityLogService.php`. Enregistre les événements (vue, inscription, création, mise à jour, suppression de formation) dans les logs Laravel (format structuré).

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class ActivityLogService
{
    public function logCourseView(?int $userId, int $courseId): void
    {
        $this->log([
            'event' => 'course_view',
            'user_id' => $userId,
            'course_id' => $courseId,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function logCourseEnrollment(int $userId, int $courseId): void
    {
        $this->log([
            'event' => 'course_enrollment',
            'user_id' => $userId,
            'course_id' => $courseId,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function logCourseCreation(int $courseId, int $createdBy): void
    {
        $this->log([
            'event' => 'course_creation',
            'course_id' => $courseId,
            'created_by' => $createdBy,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function logCourseUpdate(int $courseId, int $updatedBy, array $oldValues, array $newValues): void
    {
        $this->log([
            'event' => 'course_update',
            'course_id' => $courseId,
            'updated_by' => $updatedBy,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function logCourseDeletion(int $courseId, int $deletedBy): void
    {
        $this->log([
            'event' => 'course_deletion',
            'course_id' => $courseId,
            'deleted_by' => $deletedBy,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    private function log(array $payload): void
    {
        Log::channel('single')->info('activity_log', $payload);
    }
}
```

---

## 10. Config auth (JWT)

Dans `config/auth.php` :

- **Guards** : guard `api` avec driver `jwt` et provider `utilisateurs`.
- **Providers** : provider `utilisateurs` avec driver `eloquent` et model `App\Models\Utilisateur`.

Exemple de configuration :

```php
'guards' => [
    'api' => [
        'driver' => 'jwt',
        'provider' => 'utilisateurs',
    ],
],

'providers' => [
    'utilisateurs' => [
        'driver' => 'eloquent',
        'model' => App\Models\Utilisateur::class,
    ],
],
```

Package : `tymon/jwt-auth`. Clé JWT et TTL dans `.env` (JWT_SECRET, JWT_TTL, etc.).

---

En suivant ce guide et en recopiant les extraits de code dans les bons fichiers, vous recréez le backend SkillHub depuis zéro avec les mêmes comportements et la même API.
