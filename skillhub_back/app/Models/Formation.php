<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle Formation : une formation a un formateur (utilisateur) et une catégorie.
 * En BDD on a nom, description, duree_heures, prix, level (beginner/intermediate/advanced), statut, image_url.
 */
class Formation extends Model
{
    use HasFactory;

    protected $table = 'formations';

    /** Champs assignables (création / mise à jour) */
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
}
