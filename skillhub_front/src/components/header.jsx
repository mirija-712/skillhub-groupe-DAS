// Barre du haut : logo, liens Dashboard / Mes Ateliers / Gestion, bouton Déconnexion.
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import "./css/header.css";

function Header() {
  const navigate = useNavigate();
  const utilisateur = authApi.getUtilisateur();
  const estFormateur = utilisateur?.role === "formateur";

  // Même si le back échoue (ex. réseau), on se déconnecte côté front et on redirige.
  const handleDeconnexion = async () => {
    try {
      await authApi.deconnexion();
    } finally {
      authApi.removeToken();
      authApi.setUtilisateur(null);
      navigate("/");
    }
  };
  return (
    <>
      <header className="en-tete-skillhub">
        <nav className="navbar navbar-expand-lg navbar-dark" aria-label="Navigation principale">
          <div className="container">
            {/* Logo : redirige vers dashboard (formateur) ou Mes Ateliers selon le rôle */}
            <Link className="navbar-brand" to={estFormateur ? "/dashboard" : "/Mes_Ateliers"}>
              SkillHub EC
            </Link>
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
              aria-controls="navbarNav"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon" />
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav nav-centre">
                <li className="nav-item">
                  <Link className="nav-link" to="/dashboard">
                    Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/Mes_Ateliers">
                    Mes Ateliers
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/Gestion_Ateliers">
                    Gestion d&apos;Ateliers
                  </Link>
                </li>
              </ul>
              <button
                type="button"
                className="btn btn-deconnexion"
                onClick={handleDeconnexion}
              >
                Déconnexion
              </button>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}

export default Header;
