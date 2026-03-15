// Garde de route : on n'affiche le contenu (children) que si l'utilisateur est connecté ET formateur.
// Sinon on redirige vers la page de connexion.
import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi } from "../api/auth";

function RouteFormateur({ children }) {
  // ok: null = en attente, true = formateur autorisé, false = redirection
  const [verification, setVerification] = useState({ ok: null, loading: true });
  const location = useLocation();

  useEffect(() => {
    const token = authApi.getToken();
    if (!token) {
      setVerification({ ok: false, loading: false });
      return;
    }

    // On vérifie côté serveur que le token est valide et qu'on a bien le rôle formateur.
    authApi
      .me()
      .then((utilisateur) => {
        if (!utilisateur || utilisateur.role !== "formateur") {
          authApi.removeToken();
          setVerification({ ok: false, loading: false });
        } else {
          authApi.setUtilisateur(utilisateur);
          setVerification({ ok: true, loading: false });
        }
      })
      .catch(() => {
        // Token expiré ou invalide : on nettoie et on considère comme non connecté.
        authApi.removeToken();
        setVerification({ ok: false, loading: false });
      });
  }, []);

  if (verification.loading) {
    return <div className="d-flex justify-content-center align-items-center min-vh-100">Vérification...</div>;
  }

  if (!verification.ok) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}

export default RouteFormateur;
