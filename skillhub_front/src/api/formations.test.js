import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { formatFormationForDisplay, formatAtelierForCarte, getImageUrl, formationsApi } from "./formations";

describe("getImageUrl", () => {
  it("retourne null quand la valeur est vide", () => {
    expect(getImageUrl("")).toBeNull();
    expect(getImageUrl(null)).toBeNull();
  });

  it("préfixe /storage avec le port Laravel local par défaut", () => {
    vi.stubGlobal("window", { location: { hostname: "localhost" } });
    expect(getImageUrl("/storage/formations/test.jpg")).toBe("http://localhost:8000/storage/formations/test.jpg");
    vi.unstubAllGlobals();
  });

  it("laisse intact un chemin qui ne commence pas par /storage", () => {
    expect(getImageUrl("/images/logo.png")).toBe("/images/logo.png");
  });

  it("convertit une URL absolue backend en URL locale stable", () => {
    vi.stubGlobal("window", { location: { hostname: "127.0.0.1" } });
    expect(getImageUrl("http://localhost:8000/storage/formations/a.jpg")).toBe(
      "http://127.0.0.1:8000/storage/formations/a.jpg"
    );
    vi.unstubAllGlobals();
  });
});

describe("formatFormationForDisplay", () => {
  it("retourne null si la formation est absente", () => {
    expect(formatFormationForDisplay(null)).toBeNull();
  });

  it("mappe les champs clés pour l'affichage catalogue", () => {
    vi.stubGlobal("window", { location: { hostname: "localhost" } });
    const input = {
      id: 10,
      nom: "React avancé",
      description: "Formation complète",
      duree_heures: 12,
      level: "advanced",
      image_url: "/storage/formations/react.jpg",
      created_at: "2026-04-17T00:00:00.000Z",
      formateur: { prenom: "Steve", nom: "Ravalomanana" },
      categorie: { libelle: "Développement web" },
    };

    const output = formatFormationForDisplay(input);

    expect(output.formateur).toBe("Steve Ravalomanana");
    expect(output.domaine).toBe("Développement web");
    expect(output.heures).toBe(12);
    expect(output.levelLabel).toBe("Avancé");
    expect(output.image_url).toBe("http://localhost:8000/storage/formations/react.jpg");
    expect(output.date).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    vi.unstubAllGlobals();
  });
});

describe("formatAtelierForCarte", () => {
  it("retourne null si la formation est absente", () => {
    expect(formatAtelierForCarte(null)).toBeNull();
  });

  it("mappe les champs pour la carte atelier En Cours", () => {
    const output = formatAtelierForCarte({
      id: 3,
      nom: "Mon atelier",
      statut: "En Cours",
      created_at: "2026-04-17T00:00:00.000Z",
    });
    expect(output.titre).toBe("Mon atelier");
    expect(output.statut).toBe("en-cours");
    expect(output.statutLabel).toBe("En Cours");
    expect(output.date).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("mappe le statut Terminé", () => {
    expect(formatAtelierForCarte({ id: 1, nom: "T", statut: "Terminé" }).statut).toBe("termine");
  });

  it("utilise 'en-cours' comme statut par défaut si inconnu", () => {
    expect(formatAtelierForCarte({ id: 1, nom: "T", statut: "Inconnu" }).statut).toBe("en-cours");
  });

  it("retourne statutLabel vide comme 'En cours' si statut absent", () => {
    const output = formatAtelierForCarte({ id: 1, nom: "T" });
    expect(output.statutLabel).toBe("En cours");
  });
});

// Helpers pour les tests API avec fetch mocké
function mockFetch(ok, status, body) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    text: async () => JSON.stringify(body),
  });
}

describe("formationsApi.getCategories", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retourne la liste des catégories", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, { categories: [{ id: 1, libelle: "Dev" }] }));
    const result = await formationsApi.getCategories();
    expect(result).toEqual([{ id: 1, libelle: "Dev" }]);
  });

  it("lance une ApiError si erreur serveur (500)", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 500, { message: "Erreur" }));
    await expect(formationsApi.getCategories()).rejects.toMatchObject({ status: 500 });
  });
});

describe("formationsApi.getFormations", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("retourne formations et meta", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, { formations: [{ id: 1 }], meta: { total: 1 } }));
    const result = await formationsApi.getFormations();
    expect(result.formations).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it("retourne tableau vide si formations absent", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, {}));
    const result = await formationsApi.getFormations();
    expect(result.formations).toEqual([]);
    expect(result.meta).toBeNull();
  });

  it("lance une ApiError (401) si non autorisé", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 401, { message: "Non autorisé" }));
    await expect(formationsApi.getFormations()).rejects.toMatchObject({ status: 401 });
  });
});

describe("formationsApi.getFormationsCatalogue", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retourne formations sans authentification", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, { formations: [{ id: 5 }], meta: null }));
    const result = await formationsApi.getFormationsCatalogue();
    expect(result.formations).toHaveLength(1);
  });

  it("lance une ApiError si erreur", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 503, { message: "Service indisponible" }));
    await expect(formationsApi.getFormationsCatalogue()).rejects.toMatchObject({ status: 503 });
  });
});

describe("formationsApi.getFormation", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("retourne la formation par ID", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, { formation: { id: 7, nom: "React" } }));
    const f = await formationsApi.getFormation(7);
    expect(f.id).toBe(7);
  });

  it("lance une ApiError (404) si introuvable", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 404, { message: "Introuvable" }));
    await expect(formationsApi.getFormation(999)).rejects.toMatchObject({ status: 404 });
  });
});

describe("formationsApi.getModules", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("retourne la liste des modules", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, { modules: [{ id: 1, titre: "Intro" }] }));
    const modules = await formationsApi.getModules(1);
    expect(modules).toHaveLength(1);
  });

  it("retourne tableau vide si modules absent", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, {}));
    const modules = await formationsApi.getModules(1);
    expect(modules).toEqual([]);
  });
});

describe("formationsApi.createModule", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("retourne le module créé (201)", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 201, { module: { id: 1, titre: "Intro" } }));
    const m = await formationsApi.createModule(1, { titre: "Intro", contenu: "..." });
    expect(m.id).toBe(1);
  });

  it("lance une ApiError (403) si non autorisé", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 403, { message: "Accès refusé" }));
    await expect(formationsApi.createModule(1, {})).rejects.toMatchObject({ status: 403 });
  });
});

describe("formationsApi.updateModule", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("retourne le module mis à jour", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, { module: { id: 2, titre: "Modifié" } }));
    const m = await formationsApi.updateModule(2, { titre: "Modifié" });
    expect(m.titre).toBe("Modifié");
  });

  it("lance une ApiError (404) si module introuvable", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 404, { message: "Module introuvable" }));
    await expect(formationsApi.updateModule(999, {})).rejects.toMatchObject({ status: 404 });
  });
});

describe("formationsApi.deleteModule", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("retourne la confirmation de suppression", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, { message: "Module supprimé" }));
    const res = await formationsApi.deleteModule(1);
    expect(res.message).toBe("Module supprimé");
  });

  it("lance une ApiError (404) si module introuvable", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 404, { message: "Introuvable" }));
    await expect(formationsApi.deleteModule(999)).rejects.toMatchObject({ status: 404 });
  });
});

describe("formationsApi.updateModuleCompletion", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("retourne module et progression mis à jour", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, { module: { id: 1 }, progression: 50 }));
    const res = await formationsApi.updateModuleCompletion(1, 1, true);
    expect(res.progression).toBe(50);
  });

  it("lance une ApiError (401) si non authentifié", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 401, { message: "Non authentifié" }));
    await expect(formationsApi.updateModuleCompletion(1, 1, false)).rejects.toMatchObject({ status: 401 });
  });
});

describe("formationsApi.createFormation", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("retourne la formation créée (201)", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 201, { formation: { id: 10, nom: "React" } }));
    const f = await formationsApi.createFormation({ title: "React", description: "...", price: 0, duration: 10, level: "beginner" });
    expect(f.id).toBe(10);
  });

  it("lance une ApiError (422) si payload invalide", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 422, { message: "Validation échouée" }));
    await expect(formationsApi.createFormation({})).rejects.toMatchObject({ status: 422 });
  });

  it("fonctionne avec un FormData (multipart)", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 201, { formation: { id: 11 } }));
    const fd = new FormData();
    fd.append("title", "Test");
    const f = await formationsApi.createFormation(fd);
    expect(f.id).toBe(11);
  });
});

describe("formationsApi.updateFormation", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("retourne la formation mise à jour (JSON)", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, { formation: { id: 5, nom: "Nouveau" } }));
    const f = await formationsApi.updateFormation(5, { nom: "Nouveau" });
    expect(f.nom).toBe("Nouveau");
  });

  it("fonctionne avec un FormData (POST multipart)", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, { formation: { id: 5 } }));
    const fd = new FormData();
    fd.append("nom", "Nouveau");
    const f = await formationsApi.updateFormation(5, fd);
    expect(f.id).toBe(5);
  });

  it("lance une ApiError (403) si non propriétaire", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 403, { message: "Accès refusé" }));
    await expect(formationsApi.updateFormation(5, {})).rejects.toMatchObject({ status: 403 });
  });
});

describe("formationsApi.deleteFormation", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("retourne la confirmation de suppression", async () => {
    vi.stubGlobal("fetch", mockFetch(true, 200, { message: "Formation supprimée" }));
    const res = await formationsApi.deleteFormation(5);
    expect(res.message).toBe("Formation supprimée");
  });

  it("lance une ApiError (404) si formation introuvable", async () => {
    vi.stubGlobal("fetch", mockFetch(false, 404, { message: "Introuvable" }));
    await expect(formationsApi.deleteFormation(999)).rejects.toMatchObject({ status: 404 });
  });
});

describe("getImageUrl — cas limites", () => {
  it("retourne null pour une URL absolue invalide/malformée", () => {
    expect(getImageUrl("http://[invalid")).toBeNull();
  });

  it("retourne le chemin relatif tel quel s'il ne commence pas par /storage", () => {
    expect(getImageUrl("/images/logo.png")).toBe("/images/logo.png");
  });

  it("retourne le chemin sans base si hostname n'est pas localhost", () => {
    vi.stubGlobal("window", { location: { hostname: "production.example.com" } });
    const result = getImageUrl("/storage/formations/img.jpg");
    expect(result).toBe("/storage/formations/img.jpg");
    vi.unstubAllGlobals();
  });
});
