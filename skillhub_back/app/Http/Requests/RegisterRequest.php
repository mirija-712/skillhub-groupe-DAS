<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation du formulaire d'inscription. Le front envoie email, mot_de_passe, nom, prenom (optionnel), role.
 * On impose role = formateur car l'inscription est réservée aux formateurs.
 */
class RegisterRequest extends FormRequest
{
    /** Inscription ouverte à tous (pas de vérification de droit ici) */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Règles de validation : email unique, mot de passe min 6, role obligatoirement "formateur".
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
            'role' => 'required|in:formateur',
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
            'role.in' => 'Seuls les formateurs peuvent s\'inscrire.',
        ];
    }
}
