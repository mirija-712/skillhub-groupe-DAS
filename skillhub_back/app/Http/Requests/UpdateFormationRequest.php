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
