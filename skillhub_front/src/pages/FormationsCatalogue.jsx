import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import NavbarPublic from "../components/NavbarPublic";
import Footer from "../components/Footer";
import { formationsApi, formatFormationForDisplay, getImageUrl } from "../api/formations";
import { API_URL } from "../constants";
import { IMG_PLACEHOLDER } from "../constants";
import "./css/catalogue.css";

const LEVEL_LABELS = { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" };

export default function FormationsCatalogue() {
  const [formations, setFormations] = useState([]);
  const [meta, setMeta] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [niveau, setNiveau] = useState("");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setChargement(true);
    const params = { per_page: 20, page: 1 };
    if (recherche.trim()) params.recherche = recherche.trim();
    if (categorieId) params.id_categorie = categorieId;
    if (niveau) params.level = niveau;

    formationsApi
      .getFormationsCatalogue(params)
      .then((data) => {
        setFormations((data.formations ?? []).map(formatFormationForDisplay).filter(Boolean));
        setMeta(data.meta ?? null);
      })
      .catch(() => {
        setFormations([]);
        setMeta(null);
      })
      .finally(() => setChargement(false));
  }, [recherche, categorieId, niveau]);

  return (
    <>
      <NavbarPublic />
      <main className="page-catalogue">
        <div className="container-catalogue">
          <h1>Formations</h1>
          <div className="filtres-catalogue">
            <input
              type="search"
              placeholder="Rechercher une formation..."
              className="form-control filtre-recherche"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
            <select
              className="form-select filtre-select"
              value={categorieId}
              onChange={(e) => setCategorieId(e.target.value)}
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelle}
                </option>
              ))}
            </select>
            <select
              className="form-select filtre-select"
              value={niveau}
              onChange={(e) => setNiveau(e.target.value)}
            >
              <option value="">Tous les niveaux</option>
              <option value="beginner">Débutant</option>
              <option value="intermediate">Intermédiaire</option>
              <option value="advanced">Avancé</option>
            </select>
          </div>

          {chargement ? (
            <p className="text-muted">Chargement...</p>
          ) : formations.length === 0 ? (
            <p className="text-muted">Aucune formation trouvée.</p>
          ) : (
            <div className="grille-catalogue">
              {formations.map((f) => (
                <div key={f.id} className="carte-catalogue">
                  <div className="carte-catalogue-image">
                    <img src={getImageUrl(f.image_url) || IMG_PLACEHOLDER} alt="" loading="lazy" />
                  </div>
                  <div className="carte-catalogue-body">
                    <h3>{f.nom || f.title}</h3>
                    <p className="carte-catalogue-desc">{f.description?.slice(0, 100)}{f.description?.length > 100 ? "…" : ""}</p>
                    <span className="badge-niveau">{LEVEL_LABELS[f.level] || f.levelLabel}</span>
                    <div className="carte-catalogue-stats">
                      <span>{f.inscriptions_count ?? 0} apprenant(s)</span>
                      <span>{f.nombre_de_vues ?? 0} vues</span>
                    </div>
                    <Link to={`/formation/${f.id}`} className="btn btn-primary btn-sm">
                      Voir détail
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
