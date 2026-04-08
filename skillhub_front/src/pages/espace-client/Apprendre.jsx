import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import NavbarPublic from "../../components/NavbarPublic";
import { formationsApi } from "../../api/formations";
import { inscriptionsApi } from "../../api/inscriptions";
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
