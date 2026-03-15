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
