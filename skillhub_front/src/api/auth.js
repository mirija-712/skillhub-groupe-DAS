// ========== auth.js : tout ce qui touche à l'authentification ==========
// Inscription, connexion, déconnexion, et stockage du token + infos utilisateur dans localStorage.

import { parseJsonResponse, ApiError } from "./utils";
import { API_URL } from "../constants";

export const authApi = {
  // Envoie les données du formulaire d'inscription au back. Le back attend email, mot_de_passe, nom, prenom (optionnel), role.
  async inscription(data) {
    const res = await fetch(`${API_URL}/auth/inscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw new ApiError(res.status, json);
    return json;
  },

  // Connexion : on envoie email + mot_de_passe. Le back renvoie le token JWT + l'objet utilisateur.
  async connexion(data) {
    const res = await fetch(`${API_URL}/auth/connexion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw new ApiError(res.status, json);
    return json;
  },

  // Vérifie si le token est encore valide et récupère les infos de l'utilisateur connecté.
  // Utilisé par ProtectedRoute pour valider le token et le rôle.
  async me() {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) return null;
    return json.utilisateur;
  },

  async deconnexion() {
    const token = localStorage.getItem("token");
    if (!token) return { message: "Déconnexion réussie" };
    const res = await fetch(`${API_URL}/auth/deconnexion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw new ApiError(res.status, json);
    return json;
  },

  // Getters/setters pour le token et l'utilisateur. On les met en localStorage pour qu'ils survivent au rechargement de page.
  getToken() {
    return localStorage.getItem("token");
  },

  setToken(token) {
    localStorage.setItem("token", token);
  },

  removeToken() {
    localStorage.removeItem("token");
    localStorage.removeItem("utilisateur");
  },

  setUtilisateur(utilisateur) {
    if (utilisateur) {
      localStorage.setItem("utilisateur", JSON.stringify(utilisateur));
    } else {
      localStorage.removeItem("utilisateur");
    }
  },

  getUtilisateur() {
    const u = localStorage.getItem("utilisateur");
    return u ? JSON.parse(u) : null;
  },
};
