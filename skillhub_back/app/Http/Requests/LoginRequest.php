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
