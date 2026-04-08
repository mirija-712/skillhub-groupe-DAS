import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import NavbarPublic from "../../components/NavbarPublic";
import Footer from "../../components/Footer";
import { formationsApi, formatFormationForDisplay } from "../../api/formations";
import FormationImage from "../../components/FormationImage";
import iconStep1 from "../../assets/style/intelligent-person-100.png";
import iconStep2 from "../../assets/style/graduation-100.png";
import iconStep3 from "../../assets/style/staircase-100.png";
import iconInnovation from "../../assets/style/innovation-100.png";
import iconAccessibilite from "../../assets/style/liberty-100.png";
import iconQualite from "../../assets/style/quality-100.png";
import "./css/accueil.css";

const STEPS_ICONS = [iconStep1, iconStep2, iconStep3];
const VALEURS_ICONS = [iconInnovation, iconAccessibilite, iconQualite];

const LEVEL_LABELS = { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" };

export default function Accueil() {
  const [formations, setFormations] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    formationsApi
      .getFormationsCatalogue({ per_page: 6 })
      .then((data) => {
        const list = (data.formations ?? []).map(formatFormationForDisplay).filter(Boolean);
        setFormations(list);
      })
      .catch(() => setFormations([]))
      .finally(() => setChargement(false));
  }, []);

  return (
    <>
      <NavbarPublic />
      <main className="page-accueil">
        {/* Hero intro - style SkillHub1.0 */}
        <section className="intro-skillhub">
          <div className="intro-container">
            <h1>Développez vos compétences avec SkillHub</h1>
            <p className="intro-text">
              SkillHub est une plateforme de formation en ligne qui connecte
              formateurs qualifiés et apprenants motivés, offrant un espace
              d&apos;apprentissage moderne où chacun peut créer, partager et suivre des
              formations adaptées à ses objectifs.
            </p>
            <Link to="/inscription" className="intro-btn">
              Créer un compte maintenant
            </Link>
          </div>
        </section>

        {/* Comment s'inscrire - 3 étapes */}
        <section className="ma-section-skillhub">
          <h2 className="skillhub-title">Comment s&apos;inscrire ?</h2>
          <div className="ma-section-grid">
            <div className="ma-section-container">
              <div className="step-icon-wrap">
                <div className="step-icon">
                  <img src={STEPS_ICONS[0]} alt="" width={52} height={52} />
                </div>
                <span className="step-badge" aria-hidden>1</span>
              </div>
              <h3>Première étape</h3>
              <p>Créez votre compte utilisateur, que vous soyez apprenant ou formateur.</p>
            </div>
            <div className="ma-section-container">
              <div className="step-icon-wrap">
                <div className="step-icon">
                  <img src={STEPS_ICONS[1]} alt="" width={52} height={52} />
                </div>
                <span className="step-badge" aria-hidden>2</span>
              </div>
              <h3>Deuxième étape</h3>
              <p>En tant qu&apos;apprenant, cherchez et choisissez vos formations. En tant que formateur, créez et gérez vos formations.</p>
            </div>
            <div className="ma-section-container">
              <div className="step-icon-wrap">
                <div className="step-icon">
                  <img src={STEPS_ICONS[2]} alt="" width={52} height={52} />
                </div>
                <span className="step-badge" aria-hidden>3</span>
              </div>
              <h3>Troisième étape</h3>
              <p>Profitez pleinement de nos services, disponibles à tout moment.</p>
            </div>
          </div>
        </section>

        {/* Split screen : Connexion Élève / Formateur */}
        <section className="split-screen-skillhub">
          <div className="left-side">
            <div className="side-img" aria-hidden />
            <h3 className="side-title">Espace Apprenant</h3>
            <Link to="/connexion" className="split-btn">
              Connexion Élève
            </Link>
          </div>
          <div className="right-side">
            <div className="side-img" aria-hidden />
            <h3 className="side-title">Espace Formateur</h3>
            <Link to="/connexion" className="split-btn trainer">
              Connexion Formateur
            </Link>
          </div>
        </section>

        {/* Nos valeurs - 3 cartes */}
        <section className="cards-section-skillhub">
          <h2 className="skillhub-title" id="titre-valeurs">Nos valeurs</h2>
          <div className="cards-grid">
            <div className="card-skillhub">
              <div className="card-icon">
                <img src={VALEURS_ICONS[0]} alt="" width={56} height={56} />
              </div>
              <h3>Innovation</h3>
              <p>Nous créons des solutions modernes pour faciliter l&apos;apprentissage.</p>
            </div>
            <div className="card-skillhub">
              <div className="card-icon">
                <img src={VALEURS_ICONS[1]} alt="" width={56} height={56} />
              </div>
              <h3>Accessibilité</h3>
              <p>Permettre à tous d&apos;apprendre facilement, où qu&apos;ils soient.</p>
            </div>
            <div className="card-skillhub">
              <div className="card-icon">
                <img src={VALEURS_ICONS[2]} alt="" width={56} height={56} />
              </div>
              <h3>Qualité</h3>
              <p>Nous garantissons des contenus fiables et des formations professionnelles.</p>
            </div>
          </div>
        </section>

        {/* Formations à la une */}
        <section className="apercu-formations-accueil">
          <h2 className="skillhub-title">Formations à la une</h2>
          {chargement ? (
            <p className="text-muted" style={{ textAlign: "center" }}>Chargement...</p>
          ) : formations.length === 0 ? (
            <p className="text-muted" style={{ textAlign: "center" }}>Aucune formation pour le moment.</p>
          ) : (
            <>
              <div className="grille-formations-accueil">
                {formations.map((f) => (
                  <div key={f.id} className="carte-formation-accueil">
                    <div className="carte-formation-accueil-image">
                      <FormationImage
                        imageUrl={f.image_url}
                        alt=""
                        loading="lazy"
                      />
                    </div>
                    <div className="carte-formation-accueil-body">
                      <h3>{f.nom || f.title}</h3>
                      <span className="badge-niveau">
                        {LEVEL_LABELS[f.level] || f.levelLabel || f.level}
                      </span>
                      <p className="formateur-nom">{f.formateur || "Formateur"}</p>
                      <Link to={`/formation/${f.id}`} className="btn">
                        Voir détail
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              <div className="centre-accueil">
                <Link to="/formations" className="btn">
                  Voir toutes les formations
                </Link>
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
