import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { inscriptionsApi } from "./inscriptions";

function mockFetch(ok, status, body) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    text: async () => JSON.stringify(body),
  });
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

// ===== getFormationsSuivies =====

describe("inscriptionsApi.getFormationsSuivies", () => {
  it("retourne la liste des formations suivies", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, { formations: [{ id: 1 }, { id: 2 }] }));
    const result = await inscriptionsApi.getFormationsSuivies();
    expect(result).toHaveLength(2);
  });

  it("retourne un tableau vide si la propriété formations est absente", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, {}));
    const result = await inscriptionsApi.getFormationsSuivies();
    expect(result).toEqual([]);
  });

  it("lance une ApiError (401) si non authentifié", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 401, { message: "Non authentifié" }));
    await expect(inscriptionsApi.getFormationsSuivies()).rejects.toMatchObject({ status: 401 });
  });
});

// ===== inscrire =====

describe("inscriptionsApi.inscrire", () => {
  it("retourne la confirmation d'inscription (201)", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 201, { message: "Inscription enregistrée." }));
    const res = await inscriptionsApi.inscrire(5);
    expect(res.message).toBe("Inscription enregistrée.");
  });

  it("lance une ApiError (422) si déjà inscrit", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 422, { message: "Vous êtes déjà inscrit à cette formation." }));
    await expect(inscriptionsApi.inscrire(5)).rejects.toMatchObject({ status: 422 });
  });

  it("lance une ApiError (404) si formation introuvable", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 404, { message: "Formation introuvable" }));
    await expect(inscriptionsApi.inscrire(9999)).rejects.toMatchObject({ status: 404 });
  });
});

// ===== desinscrire =====

describe("inscriptionsApi.desinscrire", () => {
  it("retourne la confirmation de désinscription (200)", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, { message: "Désinscription effectuée." }));
    const res = await inscriptionsApi.desinscrire(5);
    expect(res.message).toBe("Désinscription effectuée.");
  });

  it("lance une ApiError (404) si inscription introuvable", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 404, { message: "Inscription introuvable." }));
    await expect(inscriptionsApi.desinscrire(99)).rejects.toMatchObject({ status: 404 });
  });
});

// ===== updateProgression =====

describe("inscriptionsApi.updateProgression", () => {
  it("retourne la progression mise à jour", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, { message: "Progression enregistrée", progression: 75 }));
    const res = await inscriptionsApi.updateProgression(5, 75);
    expect(res.progression).toBe(75);
  });

  it("lance une ApiError (404) si inscription introuvable", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 404, { message: "Inscription introuvable." }));
    await expect(inscriptionsApi.updateProgression(99, 50)).rejects.toMatchObject({ status: 404 });
  });
});
