import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi } from "../api/auth";

export default function RouteApprenant({ children }) {
  const [verification, setVerification] = useState({ ok: null, loading: true });
  const location = useLocation();

  useEffect(() => {
    const token = authApi.getToken();
    if (!token) {
      setVerification({ ok: false, loading: false });
      return;
    }
    authApi
      .me()
      .then((utilisateur) => {
        if (!utilisateur || utilisateur.role !== "participant") {
          setVerification({ ok: false, loading: false });
        } else {
          authApi.setUtilisateur(utilisateur);
          setVerification({ ok: true, loading: false });
        }
      })
      .catch(() => {
        authApi.removeToken();
        setVerification({ ok: false, loading: false });
      });
  }, []);

  if (verification.loading) {
    return <div className="d-flex justify-content-center align-items-center min-vh-100">Chargement...</div>;
  }
  if (!verification.ok) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }
  return children;
}
