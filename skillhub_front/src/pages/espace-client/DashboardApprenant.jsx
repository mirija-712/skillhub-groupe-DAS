import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import NavbarPublic from "../../components/NavbarPublic";
import { inscriptionsApi } from "../../api/inscriptions";
import { formatFormationForDisplay } from "../../api/formations";
import { getMessageErreurApi } from "../../api/utils";
import FormationImage from "../../components/FormationImage";
import "./css/dashboard-apprenant.css";

const LEVEL_LABELS = { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" };

export default function DashboardApprenant() {
  const [formations, setFormations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [desinscriptionId, setDesinscriptionId] = useState(null);

  useEffect(() => {
    inscriptionsApi
      .getFormationsSuivies()
      .then((list) => {
        setFormations(list.map((f) => formatFormationForDisplay(f) || f));
      })
      .catch((err) => {
        setErreur(getMessageErreurApi(err));
        setFormations([]);
      })
      .finally(() => setChargement(false));
  }, []);

  const handleNePlusSuivre = (formationId, titre) => {
    if (!window.confirm(`Ne plus suivre « ${titre} » ?`)) return;
    setDesinscriptionId(formationId);
    inscriptionsApi
      .desinscrire(formationId)
      .then(() => {
        setFormations((prev) => prev.filter((f) => f.id !== formationId));
      })
      .catch((err) => setErreur(getMessageErreurApi(err)))
      .finally(() => setDesinscriptionId(null));
  };

  return (
    <>
      <NavbarPublic />
      <main className="page-dashboard-apprenant">
        <div className="container-dashboard-apprenant">
          <h1>Mon espace apprenant</h1>
          <p className="sous-titre">Formations auxquelles vous êtes inscrit.</p>

          {erreur && <div className="alert alert-danger">{erreur}</div>}

          {chargement ? (
            <p className="text-muted">Chargement...</p>
          ) : formations.length === 0 ? (
            <p className="text-muted">Vous ne suivez aucune formation. <Link to="/formations">Parcourir les formations</Link>.</p>
          ) : (
            <div className="grille-formations-apprenant">
              {formations.map((f) => (
                <div key={f.id} className="carte-formation-apprenant">
                  <div className="carte-image">
                    <FormationImage imageUrl={f.image_url} alt="" loading="lazy" />
                  </div>
                  <div className="carte-body">
                    <h3>{f.nom || f.title}</h3>
                    <p className="carte-desc">{f.description?.slice(0, 80)}{f.description?.length > 80 ? "…" : ""}</p>
                    <span className="badge-niveau">{LEVEL_LABELS[f.level] || f.levelLabel}</span>
                    {f.progression != null && (
                      <div className="progression-bar">
                        <div className="progression-fill" style={{ width: `${f.progression}%` }} />
                        <span>{f.progression} %</span>
                      </div>
                    )}
                    <div className="carte-actions">
                      <Link to={`/apprendre/${f.id}`} className="btn btn-primary btn-sm">
                        Suivre
                      </Link>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleNePlusSuivre(f.id, f.nom || f.title)}
                        disabled={desinscriptionId === f.id}
                      >
                        Ne plus suivre
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
