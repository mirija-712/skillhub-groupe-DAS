import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { authApi } from "./auth";

// Helper : mock de fetch avec une réponse JSON
function mockFetch(ok, status, body) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    text: async () => JSON.stringify(body),
  });
}

// Avant chaque test on vide le localStorage (jsdom le fournit nativement)
beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

// ===== getToken / setToken / removeToken =====

describe("authApi — gestion du token localStorage", () => {
  it("setToken stocke le token, getToken le récupère", () => {
    authApi.setToken("abc123");
    expect(authApi.getToken()).toBe("abc123");
  });

  it("getToken retourne null si rien n'est stocké", () => {
    expect(authApi.getToken()).toBeNull();
  });

  it("removeToken efface token et utilisateur", () => {
    authApi.setToken("tok");
    authApi.setUtilisateur({ id: 1 });
    authApi.removeToken();
    expect(authApi.getToken()).toBeNull();
    expect(authApi.getUtilisateur()).toBeNull();
  });
});

// ===== setUtilisateur / getUtilisateur =====

describe("authApi — gestion de l'utilisateur localStorage", () => {
  it("setUtilisateur/getUtilisateur sérialise et désérialise l'objet", () => {
    authApi.setUtilisateur({ id: 1, email: "a@b.fr", role: "formateur" });
    expect(authApi.getUtilisateur()).toEqual({ id: 1, email: "a@b.fr", role: "formateur" });
  });

  it("setUtilisateur(null) efface l'entrée", () => {
    authApi.setUtilisateur({ id: 1 });
    authApi.setUtilisateur(null);
    expect(authApi.getUtilisateur()).toBeNull();
  });

  it("getUtilisateur retourne null si rien en localStorage", () => {
    expect(authApi.getUtilisateur()).toBeNull();
  });
});

// ===== inscription =====

describe("authApi.inscription", () => {
  it("retourne les données si la réponse est OK (201)", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 201, { message: "Utilisateur créé avec succès." }));
    const res = await authApi.inscription({ email: "a@b.fr", mot_de_passe: "pass123", nom: "A", role: "participant" });
    expect(res.message).toContain("Utilisateur créé");
  });

  it("lance une ApiError (422) si validation échoue", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 422, { message: "Email invalide", erreurs: { email: ["Email invalide"] } }));
    await expect(authApi.inscription({})).rejects.toMatchObject({ status: 422 });
  });

  it("lance une ApiError (500) si erreur serveur", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 500, { message: "Erreur serveur" }));
    await expect(authApi.inscription({})).rejects.toMatchObject({ status: 500 });
  });
});

// ===== connexion =====

describe("authApi.connexion", () => {
  it("retourne token et utilisateur en cas de succès", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, { token: "jwt-xyz", utilisateur: { id: 1, email: "a@b.fr" } }));
    const res = await authApi.connexion({ email: "a@b.fr", mot_de_passe: "pass" });
    expect(res.token).toBe("jwt-xyz");
    expect(res.utilisateur.email).toBe("a@b.fr");
  });

  it("lance une ApiError (401) si identifiants incorrects", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 401, { message: "Email ou mot de passe incorrect." }));
    await expect(authApi.connexion({ email: "a@b.fr", mot_de_passe: "mauvais" })).rejects.toMatchObject({ status: 401 });
  });
});

// ===== me =====

describe("authApi.me", () => {
  it("retourne null immédiatement si aucun token en localStorage", async () => {
    expect(await authApi.me()).toBeNull();
  });

  it("retourne l'utilisateur si le token est valide", async () => {
    localStorage.setItem("token", "valid-token");
    vi.stubGlobal("fetch", mockFetch(true, 200, { utilisateur: { id: 1, email: "a@b.fr" } }));
    const user = await authApi.me();
    expect(user).toEqual({ id: 1, email: "a@b.fr" });
  });

  it("retourne null si le token est expiré ou invalide (401)", async () => {
    localStorage.setItem("token", "expired");
    vi.stubGlobal("fetch", mockFetch(false, 401, { message: "Expiré" }));
    expect(await authApi.me()).toBeNull();
  });
});

// ===== deconnexion =====

describe("authApi.deconnexion", () => {
  it("retourne un message de succès local si aucun token présent", async () => {
    const res = await authApi.deconnexion();
    expect(res.message).toBe("Déconnexion réussie");
  });

  it("appelle l'API et retourne le message si token présent", async () => {
    localStorage.setItem("token", "valid");
    vi.stubGlobal("fetch", mockFetch(true, 200, { message: "Déconnexion réussie" }));
    const res = await authApi.deconnexion();
    expect(res.message).toBe("Déconnexion réussie");
  });

  it("lance une ApiError (500) si l'API retourne une erreur", async () => {
    localStorage.setItem("token", "valid");
    vi.stubGlobal("fetch", mockFetch(false, 500, { message: "Erreur serveur" }));
    await expect(authApi.deconnexion()).rejects.toMatchObject({ status: 500 });
  });
});
