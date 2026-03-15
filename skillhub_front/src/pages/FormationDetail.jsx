import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import NavbarPublic from "../components/NavbarPublic";
import Footer from "../components/Footer";
import { formationsApi, formatFormationForDisplay, getImageUrl } from "../api/formations";
import { inscriptionsApi } from "../api/inscriptions";
import { authApi } from "../api/auth";
import { IMG_PLACEHOLDER } from "../constants";
import "./css/formation-detail.css";

const LEVEL_LABELS = { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" };

export default function FormationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formation, setFormation] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [inscrit, setInscrit] = useState(false);
  const [enCoursInscription, setEnCoursInscription] = useState(false);

  const user = authApi.getUtilisateur();

  useEffect(() => {
    if (!id) return;
    formationsApi
      .getFormation(id)
      .then((f) => {
        setFormation(formatFormationForDisplay(f) || f);
      })
      .catch(() => setFormation(null))
      .finally(() => setChargement(false));
  }, [id]);

  useEffect(() => {
    if (!user || user.role !== "participant" || !id) return;
    inscriptionsApi
      .getFormationsSuivies()
      .then((list) => setInscrit(list.some((f) => String(f.id) === String(id))))
      .catch(() => setInscrit(false));
  }, [user, id]);

  const handleSuivre = async () => {
    if (!user) {
      navigate("/connexion", { state: { from: { pathname: `/formation/${id}` } } });
      return;
    }
    if (user.role !== "participant") return;
    setEnCoursInscription(true);
    try {
      await inscriptionsApi.inscrire(Number(id));
      setInscrit(true);
      navigate(`/apprendre/${id}`);
    } catch (e) {
      if (e.status === 422) setInscrit(true);
    } finally {
      setEnCoursInscription(false);
    }
  };

  if (chargement || !formation) {
    return (
      <>
        <NavbarPublic />
        <main className="page-formation-detail"><p className="text-muted">Chargement...</p></main>
        <Footer />
      </>
    );
  }

  const modules = formation.modules || [];
  const niveauLabel = LEVEL_LABELS[formation.level] || formation.levelLabel || formation.level;

  return (
    <>
      <NavbarPublic />
      <main className="page-formation-detail">
        <div className="container-detail">
          <div className="detail-header">
            <div className="detail-image">
              <img src={getImageUrl(formation.image_url) || IMG_PLACEHOLDER} alt="" />
            </div>
            <div className="detail-infos">
              <h1>{formation.nom || formation.title}</h1>
              <p className="detail-description">{formation.description}</p>
              <div className="detail-meta">
                <span className="badge-niveau">{niveauLabel}</span>
                <span>Catégorie : {formation.domaine || formation.categorie?.libelle || "—"}</span>
                <span>Formateur : {formation.formateur || "—"}</span>
                <span>{formation.inscriptions_count ?? 0} apprenant(s)</span>
                <span>{formation.nombre_de_vues ?? 0} vues</span>
              </div>
              <div className="detail-actions">
                {user?.role === "participant" && (
                  inscrit ? (
                    <Link to={`/apprendre/${id}`} className="btn btn-primary">
                      Continuer la formation
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSuivre}
                      disabled={enCoursInscription}
                    >
                      {enCoursInscription ? "Inscription..." : "Suivre la formation"}
                    </button>
                  )
                )}
                {!user && (
                  <button type="button" className="btn btn-primary" onClick={handleSuivre}>
                    Suivre la formation
                  </button>
                )}
                {user?.role === "formateur" && user.id === formation.id_formateur && (
                  <Link to="/dashboard/formateur" className="btn btn-outline-secondary">
                    Gérer dans mon espace
                  </Link>
                )}
              </div>
            </div>
          </div>

          <section className="detail-modules">
            <h2>Modules</h2>
            {modules.length === 0 ? (
              <p className="text-muted">Aucun module pour le moment.</p>
            ) : (
              <ul className="liste-modules">
                {modules.map((mod, i) => (
                  <li key={mod.id}>
                    <strong>Module {mod.ordre ?? i + 1}</strong> – {mod.titre}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
