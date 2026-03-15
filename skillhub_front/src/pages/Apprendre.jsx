import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import NavbarPublic from "../components/NavbarPublic";
import { formationsApi } from "../api/formations";
import { inscriptionsApi } from "../api/inscriptions";
import { getImageUrl } from "../api/formations";
import "./css/apprendre.css";

export default function Apprendre() {
  const { id } = useParams();
  const [formation, setFormation] = useState(null);
  const [progression, setProgression] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [sauvegardeProgression, setSauvegardeProgression] = useState(false);

  useEffect(() => {
    if (!id) return;
    formationsApi
      .getFormation(id)
      .then((f) => setFormation(f))
      .catch(() => setFormation(null))
      .finally(() => setChargement(false));
  }, [id]);

  useEffect(() => {
    if (!id || !formation) return;
    inscriptionsApi
      .getFormationsSuivies()
      .then((list) => {
        const f = list.find((x) => String(x.id) === String(id));
        if (f && f.progression != null) setProgression(f.progression);
      })
      .catch(() => {});
  }, [id, formation]);

  const handleProgressionChange = (value) => {
    const v = Math.max(0, Math.min(100, Number(value)));
    setProgression(v);
    setSauvegardeProgression(true);
    inscriptionsApi
      .updateProgression(Number(id), v)
      .then(() => setSauvegardeProgression(false))
      .catch(() => setSauvegardeProgression(false));
  };

  if (chargement || !formation) {
    return (
      <>
        <NavbarPublic />
        <main className="page-apprendre"><p className="text-muted">Chargement...</p></main>
      </>
    );
  }

  const modules = formation.modules || [];

  return (
    <>
      <NavbarPublic />
      <main className="page-apprendre">
        <div className="container-apprendre">
          <div className="apprendre-header">
            <h1>{formation.nom || formation.title}</h1>
            <p className="apprendre-description">{formation.description}</p>
          </div>

          <section className="apprendre-progression">
            <h2>Votre progression</h2>
            <div className="progression-control">
              <input
                type="range"
                min="0"
                max="100"
                value={progression}
                onChange={(e) => handleProgressionChange(e.target.value)}
              />
              <span>{progression} %</span>
              {sauvegardeProgression && <span className="text-muted small"> (enregistrement…)</span>}
            </div>
          </section>

          <section className="apprendre-modules">
            <h2>Contenu des modules</h2>
            {modules.length === 0 ? (
              <p className="text-muted">Aucun module pour le moment.</p>
            ) : (
              <div className="liste-modules-apprendre">
                {modules.map((mod, i) => (
                  <div key={mod.id} className="module-apprendre">
                    <h3>Module {mod.ordre ?? i + 1} – {mod.titre}</h3>
                    {mod.type_contenu === "video" && mod.url_ressource && (
                      <div className="module-video">
                        <a href={mod.url_ressource} target="_blank" rel="noopener noreferrer">
                          Voir la vidéo
                        </a>
                      </div>
                    )}
                    {mod.type_contenu === "ressource" && mod.url_ressource && (
                      <div className="module-ressource">
                        <a href={mod.url_ressource} target="_blank" rel="noopener noreferrer">
                          Ressource
                        </a>
                      </div>
                    )}
                    {mod.contenu && (
                      <div className="module-contenu" dangerouslySetInnerHTML={{ __html: mod.contenu.replace(/\n/g, "<br />") }} />
                    )}
                    {!mod.contenu && !mod.url_ressource && (
                      <p className="text-muted small">Contenu à venir.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <p>
            <Link to="/dashboard/apprenant" className="btn btn-outline-secondary">
              Retour à mon espace
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
