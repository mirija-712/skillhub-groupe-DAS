// Définition de toutes les routes de l'app.
// / et /inscription = pas de garde. Les autres sont enveloppées dans RouteFormateur pour vérifier qu'on est bien formateur.
import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import Home from "./pages/home";
import Login from "./connexion/login";
import Inscription from "./connexion/inscription";
import RouteFormateur from "./components/RouteFormateur";
import "./App.css";

// Lazy : on charge ces pages seulement quand on navigue dessus, ça réduit le premier chargement.
const Mes_Ateliers = lazy(() => import("./pages/mes_ateliers"));
const Gestion_Ateliers = lazy(() => import("./pages/gestion_ateliers"));

function App() {
  return (
    <Suspense fallback={<div className="d-flex justify-content-center align-items-center min-vh-100">Chargement...</div>}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/inscription" element={<Inscription />} />
        {/* Routes protégées : RouteFormateur appelle /auth/me et redirige vers / si pas formateur */}
        <Route
          path="/dashboard"
          element={
            <RouteFormateur>
              <Home />
            </RouteFormateur>
          }
        />
        <Route
          path="/Mes_Ateliers"
          element={
            <RouteFormateur>
              <Mes_Ateliers />
            </RouteFormateur>
          }
        />
        <Route
          path="/Gestion_Ateliers"
          element={
            <RouteFormateur>
              <Gestion_Ateliers />
            </RouteFormateur>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;
