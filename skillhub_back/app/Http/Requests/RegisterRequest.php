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
            'email.unique' => 'Cet email est déjà utilisé.',
            'role.in' => 'Le rôle doit être Apprenant ou Formateur.',
        ];
    }
}
