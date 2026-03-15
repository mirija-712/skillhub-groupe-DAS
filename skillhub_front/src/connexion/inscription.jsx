// Inscription : on envoie nom, prenom (optionnel), email, mot_de_passe. role est toujours "formateur".
// Après succès on affiche un message et on redirige vers la page de connexion au bout de 2 secondes.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { getMessageErreurApi } from "../api/utils";
import "./css/login.css";
import "./css/inscription.css";

function Inscription() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    mot_de_passe: "",
    nom: "",
    prenom: "",
    role: "formateur",
  });
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [chargement, setChargement] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErreur("");
  };

  // Envoie les données au back ; en cas de succès, redirige vers la page de connexion après 2 s
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");
    setSucces("");
    setChargement(true);
    try {
      const res = await authApi.inscription(formData);
      setSucces(
        res.message ||
          "Utilisateur créé avec succès. Vous pouvez maintenant vous connecter.",
      );
      setFormData({
        email: "",
        mot_de_passe: "",
        nom: "",
        prenom: "",
        role: "formateur",
      });
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      setErreur(
        getMessageErreurApi(
          err,
          "Erreur d'inscription. Vérifiez que le backend est démarré.",
        ),
      );
    } finally {
      setChargement(false);
    }
  };

  return (
    <main className="page-auth">
      <div className="conteneur-auth">
        <div className="carte-auth">
          <h1 className="titre-auth">Inscription</h1>
          <p className="sous-titre-auth">Créez votre compte SkillHub</p>

          <form onSubmit={handleSubmit} className="formulaire-auth">
            <div className="ligne-auth">
              <div className="champ-auth">
                <label htmlFor="inscription-prenom" className="libelle-auth">
                  Prénom
                </label>
                <input
                  id="inscription-prenom"
                  name="prenom"
                  type="text"
                  className="champ-saisie-auth"
                  placeholder="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                />
              </div>
              <div className="champ-auth">
                <label htmlFor="inscription-nom" className="libelle-auth">
                  Nom
                </label>
                <input
                  id="inscription-nom"
                  name="nom"
                  type="text"
                  className="champ-saisie-auth"
                  placeholder="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="champ-auth">
              <label htmlFor="inscription-email" className="libelle-auth">
                Email
              </label>
              <input
                id="inscription-email"
                name="email"
                type="email"
                className="champ-saisie-auth"
                placeholder="exemple@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="champ-auth">
              <label
                htmlFor="inscription-mot-de-passe"
                className="libelle-auth"
              >
                Mot de passe
              </label>
              <input
                id="inscription-mot-de-passe"
                name="mot_de_passe"
                type="password"
                className="champ-saisie-auth"
                placeholder="••••••••"
                value={formData.mot_de_passe}
                onChange={handleChange}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            {succes && <p className="succes-auth">{succes}</p>}
            {erreur && <p className="erreur-auth">{erreur}</p>}
            <button
              type="submit"
              className="bouton-auth bouton-auth-principal"
              disabled={chargement}
            >
              {chargement ? "Inscription..." : "S'inscrire"}
            </button>

            <p className="lien-bas-auth">
              Déjà un compte ?{" "}
              <Link to="/" className="lien-auth">
                Se connecter
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

export default Inscription;
