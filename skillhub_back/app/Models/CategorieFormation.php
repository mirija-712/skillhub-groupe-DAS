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
