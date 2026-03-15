import { parseJsonResponse } from "./utils";
import { API_URL } from "../constants";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
    "Content-Type": "application/json",
  };
}

export const inscriptionsApi = {
  async getFormationsSuivies() {
    const res = await fetch(`${API_URL}/apprenant/formations`, { headers: getAuthHeaders() });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json.formations ?? [];
  },

  async inscrire(formationId) {
    const res = await fetch(`${API_URL}/formations/${formationId}/inscription`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json;
  },

  async desinscrire(formationId) {
    const res = await fetch(`${API_URL}/formations/${formationId}/inscription`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json;
  },

  async updateProgression(formationId, progression) {
    const res = await fetch(`${API_URL}/formations/${formationId}/progression`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ progression }),
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json;
  },
};
