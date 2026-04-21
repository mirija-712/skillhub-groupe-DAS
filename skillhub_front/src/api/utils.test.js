import { describe, expect, it } from "vitest";
import { getMessageErreurApi, parseJsonResponse, ApiError } from "./utils";

describe("ApiError", () => {
  it("est une instance d'Error", () => {
    const err = new ApiError(404, { message: "Introuvable" });
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.message).toBe("Introuvable");
    expect(err.name).toBe("ApiError");
  });

  it("utilise un message par défaut si absent", () => {
    const err = new ApiError(500, {});
    expect(err.message).toBe("Erreur API");
  });

  it("expose les erreurs de validation dans erreurs", () => {
    const err = new ApiError(422, { erreurs: { email: ["Email requis"] } });
    expect(err.erreurs).toEqual({ email: ["Email requis"] });
  });

  it("supporte aussi errors (variante Laravel)", () => {
    const err = new ApiError(422, { errors: { nom: ["Requis"] } });
    expect(err.errors).toEqual({ nom: ["Requis"] });
  });
});

describe("parseJsonResponse", () => {
  it("retourne un objet vide quand la réponse est vide", async () => {
    const response = {
      text: async () => "",
    };

    await expect(parseJsonResponse(response)).resolves.toEqual({});
  });

  it("parse correctement un JSON valide", async () => {
    const response = {
      text: async () => '{"message":"ok","value":1}',
    };

    await expect(parseJsonResponse(response)).resolves.toEqual({ message: "ok", value: 1 });
  });

  it("retourne un message lisible quand le JSON est invalide", async () => {
    const response = {
      text: async () => "<html>500</html>",
    };

    await expect(parseJsonResponse(response)).resolves.toEqual({
      message: "Réponse serveur invalide (non JSON).",
    });
  });
});

describe("getMessageErreurApi", () => {
  it("retourne le fallback si l'erreur est absente", () => {
    expect(getMessageErreurApi(null, "Erreur personnalisée")).toBe("Erreur personnalisée");
  });

  it("retourne le message 401 attendu", () => {
    expect(getMessageErreurApi({ status: 401 })).toBe(
      "Session expirée ou non authentifié. Veuillez vous reconnecter."
    );
  });

  it("concatène les erreurs de validation 422", () => {
    const err = {
      status: 422,
      erreurs: {
        email: ["Email requis"],
        mot_de_passe: ["Mot de passe trop court"],
      },
    };

    expect(getMessageErreurApi(err)).toBe("Email requis Mot de passe trop court");
  });

  it("retourne le message de l'erreur quand disponible", () => {
    expect(getMessageErreurApi({ status: 500, message: "Erreur backend" })).toBe("Erreur backend");
  });
});
