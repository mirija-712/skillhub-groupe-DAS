import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import Accueil from "./pages/Accueil";
import Login from "./connexion/login";
import Inscription from "./connexion/inscription";
import FormationsCatalogue from "./pages/FormationsCatalogue";
import FormationDetail from "./pages/FormationDetail";
import DashboardApprenant from "./pages/DashboardApprenant";
import Apprendre from "./pages/Apprendre";
import RouteFormateur from "./components/RouteFormateur";
import RouteApprenant from "./components/RouteApprenant";
import "./App.css";

const Home = lazy(() => import("./pages/home"));
const Mes_Ateliers = lazy(() => import("./pages/mes_ateliers"));
const Gestion_Ateliers = lazy(() => import("./pages/gestion_ateliers"));

function App() {
  return (
    <Suspense fallback={<div className="d-flex justify-content-center align-items-center min-vh-100">Chargement...</div>}>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/formations" element={<FormationsCatalogue />} />
        <Route path="/formation/:id" element={<FormationDetail />} />

        <Route
          path="/dashboard/apprenant"
          element={
            <RouteApprenant>
              <DashboardApprenant />
            </RouteApprenant>
          }
        />
        <Route
          path="/apprendre/:id"
          element={
            <RouteApprenant>
              <Apprendre />
            </RouteApprenant>
          }
        />

        <Route
          path="/dashboard/formateur"
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
