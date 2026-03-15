// ========== formations.js : appels API formations + catégories ==========
// Liste, détail, création, mise à jour, suppression. On utilise le token JWT dans les headers.

import { parseJsonResponse } from "./utils";
import { API_URL } from "../constants";

// Les images sont servies par le back via /storage. Si on a une URL complète, on garde juste le path pour le proxy Vite.
export function getImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http")) return new URL(imageUrl).pathname;
  return imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
}

// En-têtes communs : Bearer token pour l'auth. Si on envoie du JSON on met Content-Type, sinon (FormData) on ne le met pas.
function getAuthHeaders(json = true) {
  const token = localStorage.getItem("token");
  const headers = { ...(token && { Authorization: `Bearer ${token}` }) };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

export const formationsApi = {
  // Liste paginée. params peut contenir id_formateur, page, per_page, etc. On retourne formations + meta pour la pagination.
  async getFormations(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = `${API_URL}/formations${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return {
      formations: json.formations ?? [],
      meta: json.meta ?? null,
    };
  },

  async getFormation(id) {
    const res = await fetch(`${API_URL}/formations/${id}`, { headers: getAuthHeaders() });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json.formation;
  },

  // Création : si on a une image on envoie en FormData, sinon en JSON. Le back attend title, description, price, duration, level...
  async createFormation(data) {
    const isFormData = data instanceof FormData;
    const res = await fetch(`${API_URL}/formations`, {
      method: "POST",
      headers: getAuthHeaders(!isFormData),
      body: isFormData ? data : JSON.stringify(data),
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json.formation;
  },

  // Mise à jour : PUT pour le JSON, POST pour FormData (quand on envoie une nouvelle image).
  async updateFormation(id, data) {
    const isFormData = data instanceof FormData;
    const res = await fetch(`${API_URL}/formations/${id}`, {
      method: isFormData ? "POST" : "PUT",
      headers: getAuthHeaders(!isFormData),
      body: isFormData ? data : JSON.stringify(data),
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json.formation;
  },

  async deleteFormation(id) {
    const res = await fetch(`${API_URL}/formations/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json;
  },

  // Catégories pour le select "domaine" dans le formulaire d'ajout. Pas d'auth requise.
  async getCategories() {
    const res = await fetch(`${API_URL}/categories`);
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json.categories;
  },
};

// Traduction des niveaux pour l'affichage dans les cartes et le modal.
const LEVEL_LABELS = { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" };

// On transforme l'objet formation du back pour que les composants aient tout sous la main : formateur en string, domaine, date FR, levelLabel...
export function formatFormationForDisplay(f) {
  if (!f) return null;
  const formateurNom = f.formateur
    ? [f.formateur.prenom, f.formateur.nom].filter(Boolean).join(" ")
    : "";
  const dateStr = f.created_at ? new Date(f.created_at).toLocaleDateString("fr-FR") : "";
  return {
    ...f,
    formateur: formateurNom,
    domaine: f.categorie?.libelle || "",
    heures: f.duree_heures,
    date: dateStr,
    description: f.description || "",
    level: f.level || "",
    levelLabel: LEVEL_LABELS[f.level] || f.level || "",
    image_url: getImageUrl(f.image_url) || f.image_url,
  };
}

// Version simplifiée pour les petites cartes du dashboard (titre, date, statut).
export function formatAtelierForCarte(f) {
  if (!f) return null;
  const statutMap = { "En Cours": "en-cours", Terminé: "termine", "À venir": "a-venir" };
  const dateStr = f.created_at ? new Date(f.created_at).toLocaleDateString("fr-FR") : "";
  return {
    id: f.id,
    titre: f.nom,
    date: dateStr,
    statut: statutMap[f.statut] || "en-cours",
    statutLabel: f.statut || "En cours",
  };
}
