// Page catalogue : on affiche les formations du formateur en cartes avec filtre recherche + prix.
// Clic sur "Voir la formation" = ouverture du modal en lecture seule.
import { useState, useEffect } from "react";
import Header from "../components/header";
import Modal_Formation from "../components/modal_formation";
import { formationsApi, formatFormationForDisplay } from "../api/formations";
import { authApi } from "../api/auth";
import { getMessageErreurApi } from "../api/utils";
import { IMG_PLACEHOLDER } from "../constants";
import "./css/mes_ateliers.css";

function Mes_Ateliers() {
  const [formations, setFormations] = useState([]);
  const [meta, setMeta] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [showModalFormation, setShowModalFormation] = useState(false);
  const [formationSelectionnee, setFormationSelectionnee] = useState(null);
  // Filtres côté client : recherche texte et fourchette de prix
  const [recherche, setRecherche] = useState("");
  const [prixMin, setPrixMin] = useState("");
  const [prixMax, setPrixMax] = useState("");
  const utilisateur = authApi.getUtilisateur();

  // Filtrage côté client sur la page courante : par texte (nom, domaine, formateur, description, niveau) et par fourchette de prix.
  const formationsFiltrees = formations.filter((f) => {
    const matchRecherche =
      !recherche ||
      [f.nom, f.domaine, f.formateur, f.description, f.levelLabel]
        .filter(Boolean)
        .some(
          (v) =>
            String(v)
              .toLowerCase()
              .includes(recherche.toLowerCase().trim())
        );
    const prix = Number(f.prix);
    const matchPrixMin = !prixMin || prix >= Number(prixMin);
    const matchPrixMax = !prixMax || prix <= Number(prixMax);
    return matchRecherche && matchPrixMin && matchPrixMax;
  });

  // Charge la liste des formations du formateur connecté (avec pagination)
  const chargerFormations = async (pageNum = 1) => {
    if (!utilisateur?.id) return;
    setChargement(true);
    setErreur("");
    try {
      const data = await formationsApi.getFormations({
        id_formateur: utilisateur.id,
        page: pageNum,
        per_page: 15,
      });
      setFormations((data.formations ?? []).map(formatFormationForDisplay));
      setMeta(data.meta ?? null);
    } catch (err) {
      setErreur(getMessageErreurApi(err));
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerFormations();
  }, [utilisateur?.id]);

  // Ouvre le modal en mode lecture seule avec la formation sélectionnée
  const handleVoirFormation = (id) => {
    const formation = formations.find((f) => f.id === id);
    setFormationSelectionnee(formation);
    setShowModalFormation(true);
  };

  const handleCloseModal = () => {
    setShowModalFormation(false);
    setFormationSelectionnee(null);
  };

  return (
    <>
      <Header />
      <main className="main-espace-formations">
        <div className="container">
          <h1 className="titre-page">Mes formations</h1>
          <p className="sous-titre-page">
            Catalogue des formations disponibles
          </p>

          {erreur && <p className="alert alert-danger">{erreur}</p>}
          {chargement ? (
            <p className="text-center py-5">Chargement...</p>
          ) : (meta?.total === 0 || (!meta && formations.length === 0)) ? (
            <p className="text-center py-5 text-muted">
              Aucune formation disponible.
            </p>
          ) : (
            <>
              <div className="barre-filtre-compacte d-flex flex-wrap gap-2 align-items-center mb-4">
                <input
                  type="text"
                  className="form-control champ-filtre-input"
                  placeholder="Rechercher (nom, description, niveau...)"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  aria-label="Recherche"
                />
                <input
                  type="number"
                  className="form-control champ-filtre-input"
                  placeholder="Prix min (€)"
                  value={prixMin}
                  onChange={(e) => setPrixMin(e.target.value)}
                  min="0"
                  step="0.01"
                  aria-label="Prix minimum"
                  style={{ maxWidth: "120px" }}
                />
                <input
                  type="number"
                  className="form-control champ-filtre-input"
                  placeholder="Prix max (€)"
                  value={prixMax}
                  onChange={(e) => setPrixMax(e.target.value)}
                  min="0"
                  step="0.01"
                  aria-label="Prix maximum"
                  style={{ maxWidth: "120px" }}
                />
              </div>

              <Modal_Formation
                formation={formationSelectionnee}
                mode="voir"
                show={showModalFormation}
                onClose={handleCloseModal}
              />

              {formationsFiltrees.length === 0 ? (
                <p className="text-center py-5 text-muted">
                  Aucun résultat pour ces critères de recherche.
                </p>
              ) : (
              <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-4">
                {formationsFiltrees.map((formation) => (
                  <div key={formation.id} className="col">
                    <div className="carte-formation h-100">
                      <div className="conteneur-image-formation">
                        <img
                          src={formation.image_url || IMG_PLACEHOLDER}
                          alt={formation.nom}
                          className="image-formation"
                        />
                        {formation.levelLabel && (
                          <span className={`badge-niveau-carte niveau-${formation.level || "default"}`}>
                            {formation.levelLabel}
                          </span>
                        )}
                        <div className="carte-prix-overlay">{formation.prix}€</div>
                      </div>
                      <div className="contenu-formation">
                        {formation.domaine && (
                          <span className="badge-domaine-carte">{formation.domaine}</span>
                        )}
                        <h2 className="nom-formation">{formation.nom}</h2>
                        {formation.description && (
                          <p className="description-formation-carte">{formation.description}</p>
                        )}
                        <div className="infos-formation">
                          <p className="formateur">
                            <span className="libelle">Formateur</span>
                            <span className="valeur">{formation.formateur}</span>
                          </p>
                          <p className="date">
                            <span className="libelle">Créée le</span>
                            <span className="valeur">{formation.date}</span>
                          </p>
                          <p className="heures">
                            <span className="libelle">Durée</span>
                            <span className="valeur">{formation.heures}h</span>
                          </p>
                          <p className="statut">
                            <span className="libelle">Statut</span>
                            <span className="valeur">{formation.statut}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          className="bouton-formation"
                          onClick={() => handleVoirFormation(formation.id)}
                        >
                          Voir la formation
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}

              {meta && (meta.last_page > 1 || meta.total > 0) && (
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-4">
                  <p className="text-muted mb-0 small">
                    {meta.total} formation{meta.total !== 1 ? "s" : ""}
                    {meta.last_page > 1 && ` · Page ${meta.current_page} sur ${meta.last_page}`}
                  </p>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      disabled={meta.current_page <= 1 || chargement}
                      onClick={() => chargerFormations(meta.current_page - 1)}
                    >
                      Précédent
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      disabled={meta.current_page >= meta.last_page || chargement}
                      onClick={() => chargerFormations(meta.current_page + 1)}
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

export default Mes_Ateliers;
