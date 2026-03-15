<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modèle Formation : une formation a un formateur (utilisateur) et une catégorie.
 * En BDD : nom, description, duree_heures, prix, level, statut, image_url, nombre_de_vues.
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
        'nombre_de_vues',
    ];

    protected function casts(): array
    {
        return [
            'duree_heures' => 'decimal:2',
            'prix' => 'decimal:2',
        ];
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

    /** Relation : une formation a plusieurs modules (ordre) */
    public function modules(): HasMany
    {
        return $this->hasMany(Module::class)->orderBy('ordre');
    }

    /** Relation : inscriptions des apprenants à cette formation */
    public function inscriptions(): HasMany
    {
        return $this->hasMany(Inscription::class);
    }
}
