# Guide de codage — Backend SkillHub (Laravel API)

Ce document recopie **le code source réel** du backend (fichiers du dépôt), avec des **explications courtes** pour chaque partie : *pourquoi c’est là* et *comment ça s’enchaîne*.

**Préfixe API :** tout dans `routes/api.php` est servi sous **`/api`** (ex. `POST http://localhost:8000/api/auth/connexion`).

---

## Sommaire

1. [Prérequis](#1-prérequis)
2. [`bootstrap/app.php`](#2-bootstrapappphp)
3. [`routes/api.php`](#3-routesapiphp)
4. [Migrations](#4-migrations)
5. [Modèles Eloquent](#5-modèles-eloquent)
6. [Middleware](#6-middleware)
7. [Form Requests](#7-form-requests)
8. [Contrôleurs API](#8-contrôleurs-api)
9. [`ActivityLogService`](#9-activitylogservice)
10. [`config/auth.php`](#10-configauthphp)
11. [`Controller.php` (base)](#11-controllerphp-base)
12. [Tableau des endpoints](#12-tableau-des-endpoints)

---

## 1. Prérequis

```bash
cd skillhub_back
composer install
cp .env.example .env   # si besoin
php artisan key:generate
php artisan jwt:secret
php artisan migrate
php artisan storage:link
php artisan serve
```

- **`APP_URL`** : doit correspondre à l’URL Laravel (ex. `http://127.0.0.1:8000`) — utilisé pour exposer **`image_url`** des formations en URL absolue dans le JSON.
- **`JWT_SECRET`**, **`JWT_TTL`** : JWT (`tymon/jwt-auth`).

---

## 2. `bootstrap/app.php`

**Explication :** enregistre les routes ; alias **`formateur`** et **`apprenant`** pour protéger certaines URLs ; pour **`api/*`**, force le rendu des erreurs en **JSON** (422 avec clé `erreurs`, messages 401 JWT lisibles) afin que le frontend React puisse toujours faire `response.json()`.

```php
<?php

/**
 * Point d'entrée de l'application Laravel.
 * Définit le routage (web, api, console), l'alias du middleware "formateur"
 * et le rendu des exceptions en JSON pour toutes les routes api/*.
 */

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
            'apprenant' => \App\Http\Middleware\VerifierApprenant::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Pour les routes api/* on renvoie toujours du JSON (le front attend du JSON)
        $exceptions->shouldRenderJsonWhen(fn (Request $request, \Throwable $e) => $request->is('api/*'));

        // 422 : erreurs de validation (champs manquants, format invalide, etc.)
        $exceptions->renderable(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'Erreur de validation',
                    'erreurs' => $e->errors(),
                ], 422);
            }
        });

        // 401 : non authentifié (token manquant ou invalide)
        $exceptions->renderable(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') && $request->expectsJson()) {
                return response()->json(['message' => 'Token manquant ou invalide. Veuillez vous reconnecter.'], 401);
            }
        });

        // 401 JWT : token expiré, invalide, ou non fourni
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

        // 404 : ressource non trouvée (ex. formation inexistante)
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

---

## 3. `routes/api.php`

**Explication :** auth publique (inscription / connexion) ; lecture catalogue **`GET formations`** sans login ; écriture formations réservée aux **formateurs** ; inscriptions et progression réservées aux **participants** (`middleware apprenant`).

```php
<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategorieFormationController;
use App\Http\Controllers\Api\FormationController;
use App\Http\Controllers\Api\InscriptionController;
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
    });

    // Inscription / désinscription / progression / liste suivies : apprenants uniquement
    Route::middleware('apprenant')->group(function () {
        Route::post('formations/{formationId}/inscription', [InscriptionController::class, 'store']);
        Route::delete('formations/{formationId}/inscription', [InscriptionController::class, 'destroy']);
        Route::get('apprenant/formations', [InscriptionController::class, 'index']);
        Route::put('formations/{formationId}/progression', [InscriptionController::class, 'updateProgression']);
    });
});
```

---

## 4. Migrations

**Explication :** historique du schéma. Ordre = noms de fichiers. Les **`modules`** sont créés puis la table est supprimée. **`nombre_de_vues`** est ajouté puis retiré (dernière migration). Pour **recoder uniquement l’état actuel**, tu peux te fier au schéma implicite des **modèles** après toutes les migrations.

Les fichiers complets sont dans `database/migrations/`. Contenu aligné sur le dépôt :

### `2026_03_04_170642_create_users.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Création de la table utilisateurs (email, mot_de_passe, nom, prenom, role participant|formateur).
     */
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

    /**
     * Suppression de la table utilisateurs.
     */
    public function down(): void
    {
        Schema::dropIfExists('utilisateurs');
    }
};
```

### `2026_03_04_170721_create_categorie_formation.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Création de la table catégories de formation (libellé unique : ex. "Développement", "Design").
     */
    public function up(): void
    {
        Schema::create('categorie_formations', function (Blueprint $table) {
            $table->id();
            $table->string('libelle', 100)->unique();
            $table->timestamps();
        });
    }

    /**
     * Suppression de la table categorie_formations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categorie_formations');
    }
};
```

### `2026_03_04_170743_create_formations.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Création de la table formations : lien formateur + catégorie, nom, description, durée, prix, statut, image.
     */
    public function up(): void
    {
        Schema::create('formations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_formateur')->constrained('utilisateurs')->cascadeOnDelete();
            $table->foreignId('id_categorie')->constrained('categorie_formations')->restrictOnDelete();
            $table->string('nom', 200);
            $table->text('description')->nullable();
            $table->date('date');
            $table->time('heure')->nullable();
            $table->decimal('duree_heures', 5, 2);
            $table->decimal('prix', 10, 2)->default(0);
            $table->string('statut', 50)->default('En Cours');
            $table->string('image_url', 500)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Suppression de la table formations.
     */
    public function down(): void
    {
        Schema::dropIfExists('formations');
    }
};
```

### `2026_03_04_180000_remove_date_heure_description_from_formations.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Suppression des colonnes date, heure et description (refonte du schéma formations).
     */
    public function up(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->dropColumn(['date', 'heure', 'description']);
        });
    }

    /**
     * Restauration des colonnes en cas de rollback.
     */
    public function down(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->date('date')->after('nom');
            $table->time('heure')->nullable()->after('date');
            $table->text('description')->nullable()->after('nom');
        });
    }
};
```

### `2026_03_06_000001_add_title_description_level_to_formations.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ajout des colonnes description et level (beginner/intermediate/advanced) à la table formations.
     */
    public function up(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->text('description')->nullable()->after('nom');
            $table->enum('level', ['beginner', 'intermediate', 'advanced'])->nullable()->after('description');
        });
    }

    /**
     * Suppression de description et level en cas de rollback.
     */
    public function down(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->dropColumn(['description', 'level']);
        });
    }
};
```

### `2026_03_06_000002_drop_title_from_formations.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Suppression de la colonne title (on utilise uniquement "nom" pour le titre de la formation).
     */
    public function up(): void
    {
        if (Schema::hasColumn('formations', 'title')) {
            Schema::table('formations', function (Blueprint $table) {
                $table->dropColumn('title');
            });
        }
    }

    /**
     * Restauration de la colonne title en cas de rollback.
     */
    public function down(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->string('title', 200)->nullable()->after('nom');
        });
    }
};
```

### `2026_03_15_100000_add_nombre_de_vues_to_formations.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->unsignedInteger('nombre_de_vues')->default(0)->after('image_url');
        });
    }

    public function down(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->dropColumn('nombre_de_vues');
        });
    }
};
```

### `2026_03_15_100001_create_modules_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('formation_id')->constrained('formations')->cascadeOnDelete();
            $table->string('titre', 200);
            $table->text('contenu')->nullable();
            $table->string('type_contenu', 50)->default('texte'); // texte, video, ressource
            $table->string('url_ressource', 500)->nullable();
            $table->unsignedSmallInteger('ordre')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modules');
    }
};
```

### `2026_03_15_100002_create_inscriptions_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('utilisateur_id')->constrained('utilisateurs')->cascadeOnDelete();
            $table->foreignId('formation_id')->constrained('formations')->cascadeOnDelete();
            $table->unsignedTinyInteger('progression')->default(0); // 0-100
            $table->timestamp('date_inscription')->useCurrent();
            $table->timestamps();
            $table->unique(['utilisateur_id', 'formation_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inscriptions');
    }
};
```

### `2026_03_15_100003_drop_modules_table.php`

```php
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
```

### `2026_04_09_150000_drop_vue_tracking_from_formations.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Suppression du compteur de vues et de la table associée (fonctionnalité retirée du projet).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('formation_vue_utilisateurs');

        if (Schema::hasColumn('formations', 'nombre_de_vues')) {
            Schema::table('formations', function (Blueprint $table) {
                $table->dropColumn('nombre_de_vues');
            });
        }
    }

    public function down(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->unsignedInteger('nombre_de_vues')->default(0)->after('image_url');
        });
    }
};
```

---

## 5. Modèles Eloquent

**Explication :**  
- **`Utilisateur`** : table `utilisateurs`, colonne **`mot_de_passe`** (hash) ; **`getAuthPassword()`** permet à `attempt()` d’utiliser cette colonne alors que le JSON d’API envoie `mot_de_passe`.  
- **`Formation`** : accessor **`imageUrl`** transforme `/storage/...` en URL absolue avec **`APP_URL`**.  
- **`Inscription`** : lie apprenant ↔ formation + `progression`.

### `app/Models/Utilisateur.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Tymon\JWTAuth\Contracts\JWTSubject;

/**
 * Modèle Utilisateur pour l'auth JWT. La table s'appelle "utilisateurs", le champ mot de passe "mot_de_passe".
 * getAuthPassword() dit à Laravel d'utiliser mot_de_passe pour vérifier le password. getJWTIdentifier et getJWTCustomClaims pour le token.
 */
class Utilisateur extends Authenticatable implements JWTSubject
{
    use HasFactory;

    protected $table = 'utilisateurs';

    /** Champs assignables en masse (inscription, etc.) */
    protected $fillable = [
        'email',
        'mot_de_passe',
        'nom',
        'prenom',
        'role',
    ];

    /** Ne pas exposer le mot de passe dans les réponses JSON */
    protected $hidden = [
        'mot_de_passe',
    ];

    protected function casts(): array
    {
        return [
            'mot_de_passe' => 'hashed',
        ];
    }

    /** Identifiant inclus dans le token JWT (id utilisateur) */
    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    /** Données additionnelles dans le payload du token (email, role) */
    public function getJWTCustomClaims(): array
    {
        return [
            'email' => $this->email,
            'role' => $this->role,
        ];
    }

    /** Indique à Laravel/JWT d'utiliser la colonne "mot_de_passe" pour l'authentification */
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

### `app/Models/Formation.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modèle Formation : une formation a un formateur (utilisateur) et une catégorie.
 * En BDD : nom, description, duree_heures, prix, level, statut, image_url.
 */
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
    ];

    protected function casts(): array
    {
        return [
            'duree_heures' => 'decimal:2',
            'prix' => 'decimal:2',
        ];
    }

    /**
     * En BDD : chemin relatif (/storage/formations/…). En JSON API : URL absolue pour que le front (Vite, autre domaine) charge l’image sans deviner le port Laravel.
     * APP_URL dans .env doit correspondre à l’URL du serveur (ex. http://localhost:8000 avec php artisan serve).
     */
    protected function imageUrl(): Attribute
    {
        return Attribute::make(
            get: function (?string $value) {
                if ($value === null || $value === '') {
                    return null;
                }
                if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) {
                    return $value;
                }
                $base = rtrim((string) config('app.url'), '/');

                return $base !== '' ? $base.$value : $value;
            },
        );
    }

    /** Relation : une formation appartient à un utilisateur (formateur) */
    public function formateur(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'id_formateur');
    }

    /** Relation : une formation appartient à une catégorie (domaine) */
    public function categorie(): BelongsTo
    {
        return $this->belongsTo(CategorieFormation::class, 'id_categorie');
    }

    /** Relation : inscriptions des apprenants à cette formation */
    public function inscriptions(): HasMany
    {
        return $this->hasMany(Inscription::class);
    }
}
```

### `app/Models/CategorieFormation.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modèle Catégorie de formation (ex. "Développement", "Design"). Table categorie_formations, champ principal : libelle.
 * Utilisé pour le select dans le formulaire d'ajout de formation.
 */
class CategorieFormation extends Model
{
    use HasFactory;

    protected $table = 'categorie_formations';

    protected $fillable = ['libelle'];

    /** Relation : une catégorie peut avoir plusieurs formations */
    public function formations(): HasMany
    {
        return $this->hasMany(Formation::class, 'id_categorie');
    }
}
```

### `app/Models/Inscription.php`

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

## 6. Middleware

**Explication :** après **`auth:api`**, ces middlewares vérifient le **rôle** dans la base. Sinon **403** JSON.

### `app/Http/Middleware/VerifierFormateur.php`

```php
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
```

### `app/Http/Middleware/VerifierApprenant.php`

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Routes réservées aux utilisateurs avec le rôle participant (apprenant).
 */
class VerifierApprenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== 'participant') {
            return response()->json([
                'message' => 'Réservé aux apprenants.',
            ], 403);
        }

        return $next($request);
    }
}
```

---

## 7. Form Requests

**Explication :** centralisent la validation. Les erreurs sont converties en **422** JSON par `bootstrap/app.php`.

### `app/Http/Requests/RegisterRequest.php`

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation du formulaire d'inscription. Le front envoie email, mot_de_passe, nom, prenom (optionnel), role.
 * Le rôle peut être "participant" (apprenant) ou "formateur".
 */
class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Règles : email unique, mot de passe min 6, role = participant ou formateur.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
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

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required' => "L'email est requis.",
            'email.email' => "L'email n'est pas valide.",
            'email.unique' => 'Cet email est déjà utilisé.',
            'mot_de_passe.required' => 'Le mot de passe est requis.',
            'mot_de_passe.string' => 'Le mot de passe doit être une chaîne de caractères.',
            'mot_de_passe.min' => 'Le mot de passe doit contenir au moins :min caractères.',
            'nom.required' => 'Le nom est requis.',
            'nom.string' => 'Le nom doit être une chaîne de caractères.',
            'nom.max' => 'Le nom ne peut pas dépasser :max caractères.',
            'prenom.string' => 'Le prénom doit être une chaîne de caractères.',
            'prenom.max' => 'Le prénom ne peut pas dépasser :max caractères.',
            'role.required' => 'Le rôle est requis.',
            'role.in' => 'Le rôle doit être Apprenant ou Formateur.',
        ];
    }
}
```

### `app/Http/Requests/LoginRequest.php`

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation de la connexion (email + mot_de_passe), comme RegisterRequest pour l'inscription.
 */
class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => 'required|email',
            'mot_de_passe' => 'required|string',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required' => "L'email est requis.",
            'email.email' => "L'email n'est pas valide.",
            'mot_de_passe.required' => 'Le mot de passe est requis.',
            'mot_de_passe.string' => 'Le mot de passe doit être une chaîne de caractères.',
        ];
    }
}
```

### `app/Http/Requests/StoreFormationRequest.php`

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validation de la création d'une formation. Le front envoie title, description, price, duration, level (obligatoires),
 * id_categorie et image en option. Le controller mappe ensuite title -> nom, etc.
 */
class StoreFormationRequest extends FormRequest
{
    /** L'autorisation (formateur) est gérée par le middleware "formateur" sur la route */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Règles : title, description, price, duration, level obligatoires ; id_categorie et image optionnels.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
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

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Le titre est requis.',
            'title.max' => 'Le titre ne peut pas dépasser :max caractères.',
            'description.required' => 'La description est requise.',
            'description.max' => 'La description ne peut pas dépasser :max caractères.',
            'price.required' => 'Le prix est requis.',
            'price.numeric' => 'Le prix doit être un nombre.',
            'price.min' => 'Le prix ne peut pas être négatif.',
            'duration.required' => 'La durée est requise.',
            'duration.numeric' => 'La durée doit être un nombre.',
            'duration.min' => 'La durée doit être positive.',
            'level.required' => 'Le niveau est requis.',
            'level.in' => 'Le niveau doit être beginner, intermediate ou advanced.',
            'id_categorie.exists' => 'La catégorie sélectionnée n\'existe pas.',
            'image.image' => 'Le fichier doit être une image (jpeg, png, jpg, gif, webp).',
            'image.max' => 'L\'image ne doit pas dépasser 2 Mo.',
        ];
    }
}
```

### `app/Http/Requests/UpdateFormationRequest.php`

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validation de la mise à jour d'une formation. Tous les champs en "sometimes" : on ne valide que ceux qui sont envoyés.
 * Le front envoie nom, description, level, duree_heures, prix, statut, id_categorie, et optionnellement image (FormData).
 */
class UpdateFormationRequest extends FormRequest
{
    /** L'autorisation (propriétaire de la formation) est vérifiée dans le contrôleur */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Tous les champs en "sometimes" : seuls les champs envoyés sont validés (PATCH-like).
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
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

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'id_categorie.exists' => 'La catégorie n\'existe pas.',
            'nom.max' => 'Le nom ne peut pas dépasser :max caractères.',
            'description.max' => 'La description ne peut pas dépasser :max caractères.',
            'level.in' => 'Le niveau doit être beginner, intermediate ou advanced.',
            'duree_heures.numeric' => 'La durée doit être un nombre.',
            'duree_heures.min' => 'La durée doit être positive.',
            'prix.numeric' => 'Le prix doit être un nombre.',
            'prix.min' => 'Le prix ne peut pas être négatif.',
            'statut.in' => 'Le statut doit être En Cours ou Terminé.',
            'image.image' => 'Le fichier doit être une image (jpeg, png, jpg, gif, webp).',
            'image.max' => 'L\'image ne doit pas dépasser 2 Mo.',
        ];
    }
}
```

---

## 8. Contrôleurs API

### `app/Http/Controllers/Api/AuthController.php`

**Explication :**  
- **register** : crée un `Utilisateur` dans une transaction.  
- **login** : `mot_de_passe` du JSON → clé **`password`** pour `auth('api')->attempt()` (convention Laravel).  
- **logout / me / refresh** : JWT standard.

```php
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
```

### `app/Http/Controllers/Api/CategorieFormationController.php`

```php
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
```

### `app/Http/Controllers/Api/InscriptionController.php`

**Explication :** uniquement pour **participants** (middleware `apprenant`). `index` renvoie les **formations** avec `progression` et `date_inscription` fusionnées depuis la ligne d’inscription.

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Models\Inscription;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;

/**
 * Inscriptions apprenants (middleware : rôle participant).
 */
class InscriptionController extends Controller
{
    public function store(int $formationId): JsonResponse
    {
        $userId = (int) auth()->id();

        $formation = Formation::find($formationId);
        if (! $formation) {
            return response()->json(['message' => 'Formation introuvable'], 404);
        }

        $exists = Inscription::where('utilisateur_id', $userId)->where('formation_id', $formationId)->exists();
        if ($exists) {
            return response()->json(['message' => 'Vous êtes déjà inscrit à cette formation.'], 422);
        }

        Inscription::create([
            'utilisateur_id' => $userId,
            'formation_id' => $formationId,
            'progression' => 0,
        ]);

        app(ActivityLogService::class)->logCourseEnrollment($userId, $formationId);

        return response()->json(['message' => 'Inscription enregistrée.'], 201);
    }

    public function destroy(int $formationId): JsonResponse
    {
        $userId = (int) auth()->id();

        $inscription = Inscription::where('utilisateur_id', $userId)->where('formation_id', $formationId)->first();
        if (! $inscription) {
            return response()->json(['message' => 'Inscription introuvable.'], 404);
        }

        $inscription->delete();

        return response()->json(['message' => 'Désinscription effectuée.']);
    }

    public function index(): JsonResponse
    {
        $userId = (int) auth()->id();

        $inscriptions = Inscription::where('utilisateur_id', $userId)
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

    public function updateProgression(int $formationId): JsonResponse
    {
        $userId = (int) auth()->id();

        $inscription = Inscription::where('utilisateur_id', $userId)->where('formation_id', $formationId)->first();
        if (! $inscription) {
            return response()->json(['message' => 'Inscription introuvable.'], 404);
        }

        $progression = (int) request()->input('progression', 0);
        $progression = max(0, min(100, $progression));
        $inscription->update(['progression' => $progression]);

        return response()->json(['message' => 'Progression enregistrée', 'progression' => $inscription->progression]);
    }
}
```

### `app/Http/Controllers/Api/FormationController.php`

**Explication :**  
- **index** : catalogue paginé ; si un **formateur** est connecté **sans** `?id_formateur=`, on ne liste que **ses** formations.  
- **show** : détail public ; **pas** de compteur de vues.  
- **store** : mappe `title`→`nom`, `duration`→`duree_heures`, `price`→`prix` ; `id_formateur` = user courant ; image optionnelle dans `storage/app/public/formations`.  
- **update** : propriétaire uniquement ; remplacement d’image possible (POST multipart).  
- **destroy** : suppression disque + ligne BDD.

*(Le fichier fait ~350 lignes ; il est recopié intégralement ci-dessous.)*

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFormationRequest;
use App\Http\Requests\UpdateFormationRequest;
use App\Models\CategorieFormation;
use App\Models\Formation;
use App\Services\ActivityLogService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * CRUD des formations. Index = liste paginée avec meta (pour le front), show = détail.
 * Store : le front envoie title, description, price, duration, level (et optionnellement id_categorie, image).
 * On mappe title -> nom, duration -> duree_heures, price -> prix, et on prend id_formateur depuis l'utilisateur connecté.
 * Update : pareil, avec PUT en JSON ou POST en FormData si on envoie une nouvelle image.
 */
class FormationController extends Controller
{
    /**
     * Liste des formations (paginée, avec filtres optionnels).
     *
     * @OA\Get(path="/formations", tags={"Formations"}, summary="Liste des formations", security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id_formateur", in="query", description="Filtrer par formateur", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="id_categorie", in="query", description="Filtrer par catégorie", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="statut", in="query", description="Filtrer par statut", @OA\Schema(type="string", enum={"En Cours","Terminé"})),
     *     @OA\Parameter(name="page", in="query", description="Numéro de page (défaut: 1)", @OA\Schema(type="integer", default=1)),
     *     @OA\Parameter(name="per_page", in="query", description="Nombre par page (défaut: 15, max: 50)", @OA\Schema(type="integer", default=15)),
     *
     *     @OA\Response(response="200", description="Liste paginée des formations",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="formations", type="array", @OA\Items(type="object")),
     *             @OA\Property(property="meta", type="object",
     *                 @OA\Property(property="current_page", type="integer", example=1),
     *                 @OA\Property(property="last_page", type="integer", example=5),
     *                 @OA\Property(property="per_page", type="integer", example=15),
     *                 @OA\Property(property="total", type="integer", example=73)
     *             )
     *         )
     *     )
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $query = Formation::with(['formateur:id,nom,prenom', 'categorie:id,libelle'])
            ->withCount('inscriptions');

        $user = auth()->user();
        if ($user && $user->role === 'formateur' && ! $request->has('id_formateur')) {
            $query->where('id_formateur', $user->id);
        }

        if ($request->filled('id_formateur')) {
            $query->where('id_formateur', $request->id_formateur);
        }
        if ($request->filled('id_categorie')) {
            $query->where('id_categorie', $request->id_categorie);
        }
        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('level')) {
            $query->where('level', $request->level);
        }
        if ($request->filled('recherche')) {
            $term = $request->recherche;
            $query->where(function ($q) use ($term) {
                $q->where('nom', 'like', '%'.$term.'%')
                    ->orWhere('description', 'like', '%'.$term.'%');
            });
        }

        $paginator = $query->orderBy('id', 'desc')->paginate(
            min((int) $request->input('per_page', 15), 50)
        );

        return response()->json([
            'formations' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * Détail d'une formation (catalogue, page formation).
     */
    public function show(int $id): JsonResponse
    {
        $formation = Formation::with(['formateur:id,nom,prenom', 'categorie:id,libelle'])
            ->withCount('inscriptions')
            ->find($id);

        if (! $formation) {
            return response()->json(['message' => 'Formation introuvable'], 404);
        }

        return response()->json(['formation' => $formation]);
    }

    /**
     * Créer une formation.
     * Payload : title, description, price, duration, level (obligatoires), id_categorie (optionnel), image (optionnel en multipart).
     * L'id_formateur est récupéré via l'utilisateur authentifié ; ne jamais l'envoyer depuis le front.
     *
     * @OA\Post(path="/formations", tags={"Formations"}, summary="Créer une formation", security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\MediaType(mediaType="application/json",
     *
     *             @OA\Schema(required={"title","description","price","duration","level"},
     *
     *                 @OA\Property(property="title", type="string", maxLength=200, example="Introduction à React"),
     *                 @OA\Property(property="description", type="string", maxLength=2000, example="Apprenez les bases de React."),
     *                 @OA\Property(property="price", type="number", minimum=0, example=199.99),
     *                 @OA\Property(property="duration", type="number", minimum=0, example=24),
     *                 @OA\Property(property="level", type="string", enum={"beginner","intermediate","advanced"}, example="beginner"),
     *                 @OA\Property(property="id_categorie", type="integer", nullable=true, description="Optionnel ; si absent, première catégorie utilisée")
     *             )
     *         ),
     *
     *         @OA\MediaType(mediaType="multipart/form-data",
     *
     *             @OA\Schema(required={"title","description","price","duration","level"},
     *
     *                 @OA\Property(property="title", type="string", maxLength=200),
     *                 @OA\Property(property="description", type="string", maxLength=2000),
     *                 @OA\Property(property="price", type="number", minimum=0),
     *                 @OA\Property(property="duration", type="number", minimum=0),
     *                 @OA\Property(property="level", type="string", enum={"beginner","intermediate","advanced"}),
     *                 @OA\Property(property="id_categorie", type="integer", nullable=true),
     *                 @OA\Property(property="image", type="string", format="binary", description="Image optionnelle (jpeg, png, jpg, gif, webp, max 2 Mo)")
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(response="201", description="Formation créée avec succès"),
     *     @OA\Response(response="401", description="Token absent"),
     *     @OA\Response(response="403", description="Token invalide ou accès réservé aux formateurs"),
     *     @OA\Response(response="422", description="Erreur de validation")
     * )
     */
    public function store(StoreFormationRequest $request): JsonResponse
    {
        $data = $request->validated();
        // id_formateur vient toujours du user connecté, jamais du front
        $data['id_formateur'] = $request->user()->id;
        // Mapping des noms de champs front (title, duration, price) vers la BDD (nom, duree_heures, prix)
        $data['nom'] = $data['title'];
        $data['duree_heures'] = $data['duration'];
        $data['prix'] = $data['price'];
        $data['id_categorie'] = $data['id_categorie'] ?? CategorieFormation::first()?->id;
        if ($data['id_categorie'] === null) {
            return response()->json([
                'message' => 'Aucune catégorie disponible. Créez d\'abord une catégorie de formation.',
            ], 422);
        }
        $data['statut'] = 'En Cours';
        unset($data['title'], $data['duration'], $data['price'], $data['image']);

        // Upload image optionnel : stockage dans storage/app/public/formations avec nom UUID
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = Str::uuid().'.'.$file->getClientOriginalExtension();
            $path = $file->storeAs('formations', $filename, 'public');
            $data['image_url'] = '/storage/'.$path;
        }

        $formation = Formation::create($data);

        $formation->load(['formateur:id,nom,prenom', 'categorie:id,libelle']);

        app(ActivityLogService::class)->logCourseCreation($formation->id, (int) $request->user()->id);

        return response()->json([
            'message' => 'Formation créée avec succès',
            'formation' => $this->formationPourReponseApi($formation),
        ], 201);
    }

    /**
     * Modifier une formation (PUT JSON ou POST multipart si image).
     * Réponse alignée sur store : formation avec title, description, price, duration, level.
     *
     * @OA\Put(path="/formations/{id}", tags={"Formations"}, summary="Modifier une formation", security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="id_categorie", type="integer"),
     *             @OA\Property(property="nom", type="string"),
     *             @OA\Property(property="description", type="string", maxLength=2000),
     *             @OA\Property(property="duree_heures", type="number"),
     *             @OA\Property(property="prix", type="number"),
     *             @OA\Property(property="level", type="string", enum={"beginner","intermediate","advanced"}),
     *             @OA\Property(property="statut", type="string", enum={"En Cours","Terminé"})
     *         )
     *     ),
     *
     *     @OA\Response(response="200", description="Formation mise à jour (réponse enrichie comme store)"),
     *     @OA\Response(response="403", description="Formation appartenant à un autre formateur"),
     *     @OA\Response(response="404", description="Formation introuvable"),
     *     @OA\Response(response="422", description="Erreur de validation")
     * )
     */
    public function update(UpdateFormationRequest $request, Formation $formation): JsonResponse
    {
        if ($formation->id_formateur !== (int) $request->user()->id) {
            return response()->json([
                'message' => 'Vous ne pouvez modifier que vos propres formations.',
            ], 403);
        }

        $oldValues = $formation->only(['nom', 'description', 'level', 'statut', 'duree_heures', 'prix']);

        try {
            $data = $request->validated();
            unset($data['image'], $data['image_url']);

            // Si nouvelle image : suppression de l'ancienne puis enregistrement de la nouvelle
            if ($request->hasFile('image')) {
                self::deleteStoredImageFile($formation->getRawOriginal('image_url'));

                $file = $request->file('image');
                $filename = Str::uuid().'.'.$file->getClientOriginalExtension();
                $path = $file->storeAs('formations', $filename, 'public');
                $data['image_url'] = '/storage/'.$path;
            }

            $formation->update($data);
            $formation->load(['formateur:id,nom,prenom', 'categorie:id,libelle']);

            $newValues = $formation->only(['nom', 'description', 'level', 'statut', 'duree_heures', 'prix']);
            app(ActivityLogService::class)->logCourseUpdate(
                (int) $formation->id,
                (int) $request->user()->id,
                $oldValues,
                $newValues
            );

            return response()->json([
                'message' => 'Formation mise à jour',
                'formation' => $this->formationPourReponseApi($formation),
            ]);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Une erreur est survenue lors de la mise à jour.',
            ], 500);
        }
    }

    /**
     * Supprimer une formation.
     *
     * @OA\Delete(path="/formations/{id}", tags={"Formations"}, summary="Supprimer une formation", security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response="200", description="Formation supprimée"),
     *     @OA\Response(response="403", description="Formation appartenant à un autre formateur"),
     *     @OA\Response(response="404", description="Formation introuvable")
     * )
     */
    public function destroy(Formation $formation): JsonResponse
    {
        if ($formation->id_formateur !== (int) auth()->id()) {
            return response()->json([
                'message' => 'Vous ne pouvez supprimer que vos propres formations.',
            ], 403);
        }

        try {
            $formationId = $formation->id;
            $userId = (int) auth()->id();

            self::deleteStoredImageFile($formation->getRawOriginal('image_url'));

            $formation->delete();

            app(ActivityLogService::class)->logCourseDeletion($formationId, $userId);

            return response()->json(['message' => 'Formation supprimée']);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Une erreur est survenue lors de la suppression.',
            ], 500);
        }
    }

    /**
     * Réponse JSON alignée avec le front : champs title, price, duration en plus des colonnes BDD.
     *
     * @return array<string, mixed>
     */
    private function formationPourReponseApi(Formation $formation): array
    {
        return array_merge($formation->toArray(), [
            'title' => $formation->nom,
            'description' => $formation->description,
            'price' => (float) $formation->prix,
            'duration' => (float) $formation->duree_heures,
            'level' => $formation->level,
        ]);
    }

    /** Supprime le fichier image sur le disque public (valeur telle qu’en BDD, pas l’URL JSON de l’accessor). */
    private static function deleteStoredImageFile(?string $rawImageUrlFromDb): void
    {
        $path = self::imageUrlToStoragePath($rawImageUrlFromDb);
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    /**
     * Convertit une image_url (ex: /storage/formations/xxx.jpg) en chemin de stockage (formations/xxx.jpg).
     */
    private static function imageUrlToStoragePath(?string $imageUrl): ?string
    {
        if (! $imageUrl) {
            return null;
        }
        if (str_starts_with($imageUrl, 'http://') || str_starts_with($imageUrl, 'https://')) {
            $path = parse_url($imageUrl, PHP_URL_PATH);
            $imageUrl = is_string($path) ? $path : '';
        }
        $imageUrl = ltrim($imageUrl, '/');
        if (str_starts_with($imageUrl, 'storage/')) {
            return substr($imageUrl, 8);
        }

        return $imageUrl;
    }
}
```

---

## 9. `ActivityLogService`

**Explication :** journalise création / mise à jour / suppression de formation et inscriptions (fichier de log Laravel `storage/logs/laravel.log` via canal `single`).

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

/**
 * Enregistre les événements importants pour l'historisation (CDC : MongoDB activity_logs).
 * Si MONGODB_URI est configuré, pourrait écrire dans une collection MongoDB.
 * Par défaut, écrit dans le log Laravel au format structuré.
 */
class ActivityLogService
{
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

## 10. `config/auth.php`

**Explication :** le guard **`api`** utilise le driver **`jwt`** et le provider **`utilisateurs`** → modèle **`App\Models\Utilisateur`**.

```php
<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Authentication Defaults
    |--------------------------------------------------------------------------
    |
    | This option defines the default authentication "guard" and password
    | reset "broker" for your application. You may change these values
    | as required, but they're a perfect start for most applications.
    |
    */

    'defaults' => [
        'guard' => env('AUTH_GUARD', 'web'),
        'passwords' => env('AUTH_PASSWORD_BROKER', 'users'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Authentication Guards
    |--------------------------------------------------------------------------
    |
    | Next, you may define every authentication guard for your application.
    | Of course, a great default configuration has been defined for you
    | which utilizes session storage plus the Eloquent user provider.
    |
    | All authentication guards have a user provider, which defines how the
    | users are actually retrieved out of your database or other storage
    | system used by your application. Typically, Eloquent is utilized.
    |
    | Supported: "session"
    |
    */

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'utilisateurs',
        ],
        'api' => [
            'driver' => 'jwt',
            'provider' => 'utilisateurs',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | User Providers
    |--------------------------------------------------------------------------
    |
    | All authentication guards have a user provider, which defines how the
    | users are actually retrieved out of your database or other storage
    | system used by your application. Typically, Eloquent is utilized.
    |
    | If you have multiple user tables or models you may configure multiple
    | providers to represent the model / table. These providers may then
    | be assigned to any extra authentication guards you have defined.
    |
    | Supported: "database", "eloquent"
    |
    */

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => env('AUTH_MODEL', App\Models\User::class),
        ],
        'utilisateurs' => [
            'driver' => 'eloquent',
            'model' => App\Models\Utilisateur::class,
        ],

        // 'users' => [
        //     'driver' => 'database',
        //     'table' => 'users',
        // ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Resetting Passwords
    |--------------------------------------------------------------------------
    |
    | These configuration options specify the behavior of Laravel's password
    | reset functionality, including the table utilized for token storage
    | and the user provider that is invoked to actually retrieve users.
    |
    | The expiry time is the number of minutes that each reset token will be
    | considered valid. This security feature keeps tokens short-lived so
    | they have less time to be guessed. You may change this as needed.
    |
    | The throttle setting is the number of seconds a user must wait before
    | generating more password reset tokens. This prevents the user from
    | quickly generating a very large amount of password reset tokens.
    |
    */

    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Password Confirmation Timeout
    |--------------------------------------------------------------------------
    |
    | Here you may define the number of seconds before a password confirmation
    | window expires and users are asked to re-enter their password via the
    | confirmation screen. By default, the timeout lasts for three hours.
    |
    */

    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),

];
```

---

## 11. `Controller.php` (base)

```php
<?php

namespace App\Http\Controllers;

/**
 * Contrôleur de base. Tous les contrôleurs API en héritent.
 */
abstract class Controller
{
}
```

---

## 12. Tableau des endpoints

| Méthode | Chemin (après `/api`) | Auth | Rôle |
|--------|------------------------|------|------|
| POST | `auth/inscription` | Non | — |
| POST | `auth/connexion` | Non | — |
| POST | `auth/deconnexion` | JWT | — |
| GET | `auth/me` | JWT | — |
| POST | `auth/refresh` | JWT | — |
| GET | `categories` | Non | — |
| GET | `formations` | Optionnel | Catalogue ; filtre auto si formateur |
| GET | `formations/{id}` | Non | — |
| POST | `formations` | JWT | formateur |
| PUT / POST | `formations/{formation}` | JWT | formateur (propriétaire) |
| DELETE | `formations/{formation}` | JWT | formateur (propriétaire) |
| POST | `formations/{formationId}/inscription` | JWT | participant |
| DELETE | `formations/{formationId}/inscription` | JWT | participant |
| GET | `apprenant/formations` | JWT | participant |
| PUT | `formations/{formationId}/progression` | JWT | participant |

---

**Note :** ce guide est une **copie de référence**. La **source de vérité** reste les fichiers dans le dépôt ; en cas de divergence après un commit, c’est le fichier PHP qui prime.
