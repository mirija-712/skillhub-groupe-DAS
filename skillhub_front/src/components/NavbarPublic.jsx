import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import "./css/navbar-skillhub.css";

export default function NavbarPublic() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const utilisateur = authApi.getUtilisateur();
  const estConnecte = !!utilisateur;

  const handleDeconnexion = async () => {
    try {
      await authApi.deconnexion();
    } finally {
      authApi.removeToken();
      authApi.setUtilisateur(null);
      navigate("/");
    }
  };

  const dashboardPath = utilisateur?.role === "formateur" ? "/dashboard/formateur" : "/dashboard/apprenant";
  const profilLabel = utilisateur ? [utilisateur.prenom, utilisateur.nom].filter(Boolean).join(" ") || utilisateur.email : "";

  return (
    <header className="navbar-skillhub">
      <div className="navbar-container">
        <Link className="navbar-logo" to="/" onClick={() => setMenuOpen(false)}>
          <span className="logo-icon">S</span>
          <span className="logo-text">Skill-Hub</span>
        </Link>

        <button
          type="button"
          className="navbar-toggle"
          aria-label="Menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`nav-list-wrap ${menuOpen ? "active" : ""}`}>
          <ul className="nav-list">
            <li><Link className="nav-link" to="/" onClick={() => setMenuOpen(false)}>Accueil</Link></li>
            <li><Link className="nav-link" to="/formations" onClick={() => setMenuOpen(false)}>Formations</Link></li>
            {estConnecte ? (
              <>
                <li>
                  <Link className="nav-link" to={dashboardPath} onClick={() => setMenuOpen(false)}>
                    {profilLabel || "Mon espace"}
                  </Link>
                </li>
                <li>
                  <button type="button" className="btn-deconnexion" onClick={handleDeconnexion}>
                    Déconnexion
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link className="nav-link btn-profile" to="/connexion" onClick={() => setMenuOpen(false)}>
                    Connexion
                  </Link>
                </li>
                <li>
                  <Link className="nav-link btn-profile btn-inscription" to="/inscription" onClick={() => setMenuOpen(false)}>
                    S&apos;inscrire
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </header>
  );
}
