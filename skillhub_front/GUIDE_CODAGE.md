# Guide de codage — Frontend SkillHub (React + Vite)

Guide pour **recoder le frontend depuis zéro**. Chaque section contient le code à reproduire et des explications.

---

## Sommaire

1. [Vue d’ensemble](#1-vue-densemble)
2. [Configuration (Vite, constantes)](#2-configuration-vite-constantes)
3. [Point d’entrée et routage](#3-point-dentrée-et-routage)
4. [Couche API](#4-couche-api)
5. [Gardes de route](#5-gardes-de-route)
6. [Pages et composants](#6-pages-et-composants)
7. [Conventions](#7-conventions)

---

## 1. Vue d’ensemble

- **Stack** : React 19, Vite 7, React Router 7, Bootstrap 5.
- **Rôle** : SPA qui consomme l’API Laravel (préfixe `/api`). En dev, Vite proxy `/api` et `/storage` vers le backend.
- **Auth** : token JWT et objet utilisateur dans `localStorage`. Vérification via `GET /api/auth/me` sur les routes protégées.
- **Rôles** : `participant` (apprenant), `formateur`. Routes protégées par composants `RouteApprenant` et `RouteFormateur`.

Ordre de recodage conseillé : constantes → Vite proxy → couche API (utils, auth, formations, inscriptions) → main/App et routes → gardes → pages (connexion, catalogue, détail, dashboards, modals).

---

## 2. Configuration (Vite, constantes)

### 2.1 Constantes

Fichier : `src/constants.js`.

```javascript
// En dev avec Vite, /api est proxyfié vers le back. En prod on peut mettre VITE_API_URL dans .env.
export const API_URL = import.meta.env.VITE_API_URL || "/api";

// Quand une formation n'a pas d'image, on affiche ce placeholder.
export const IMG_PLACEHOLDER = "https://via.placeholder.com/300x180?text=Formation";
```

### 2.2 Proxy Vite

Fichier : `vite.config.js`. En développement, les requêtes vers `/api` et `/storage` sont redirigées vers le backend (ex. `http://localhost:8000`).

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

---

## 3. Point d’entrée et routage

### 3.1 Point d’entrée

Fichier : `src/main.jsx`. On monte l’app React dans `#root` et on enveloppe avec `BrowserRouter` pour pouvoir utiliser `Link`, `useNavigate`, `useParams` partout.

```javascript
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

### 3.2 Routes (App.jsx)

Fichier : `src/App.jsx`. On importe Bootstrap, on définit toutes les routes. Les routes formateur et apprenant sont enveloppées dans des gardes. Les pages lourdes (Home, Mes_Ateliers, Gestion_Ateliers) sont en lazy loading avec `Suspense`.

```javascript
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

        <Route path="/dashboard/apprenant" element={<RouteApprenant><DashboardApprenant /></RouteApprenant>} />
        <Route path="/apprendre/:id" element={<RouteApprenant><Apprendre /></RouteApprenant>} />

        <Route path="/dashboard/formateur" element={<RouteFormateur><Home /></RouteFormateur>} />
        <Route path="/Mes_Ateliers" element={<RouteFormateur><Mes_Ateliers /></RouteFormateur>} />
        <Route path="/Gestion_Ateliers" element={<RouteFormateur><Gestion_Ateliers /></RouteFormateur>} />
      </Routes>
    </Suspense>
  );
}

export default App;
```

---

## 4. Couche API

### 4.1 utils.js

Centralise le parse JSON des réponses (pour éviter les erreurs si le serveur renvoie du HTML) et le message d’erreur affiché à l’utilisateur.

```javascript
export async function parseJsonResponse(response) {
  try {
    const text = await response.text();
    if (!text || !text.trim()) return {};
    return JSON.parse(text);
  } catch (error) {
    return { message: "Réponse serveur invalide (non JSON)." };
  }
}

export function getMessageErreurApi(err, fallback = "Une erreur est survenue.") {
  if (!err) return fallback;
  const status = err.status;
  if (status === 401) return "Session expirée ou non authentifié. Veuillez vous reconnecter.";
  if (status === 403) return "Accès refusé. Droits insuffisants.";
  if (status === 404) return err.message || "Ressource introuvable.";
  if (status === 422) {
    const erreurs = err.erreurs || err.errors;
    if (erreurs && typeof erreurs === "object") {
      const list = Object.values(erreurs).flat().filter(Boolean);
      if (list.length) return list.join(" ");
    }
  }
  return err.message || fallback;
}
```

### 4.2 auth.js

Inscription, connexion, déconnexion, `me`, et getters/setters pour le token et l’utilisateur dans `localStorage`. Toutes les requêtes auth utilisent `parseJsonResponse` ; en cas d’erreur on throw un objet `{ status, message, erreurs? }`.

```javascript
import { parseJsonResponse } from "./utils";
import { API_URL } from "../constants";

export const authApi = {
  async inscription(data) {
    const res = await fetch(`${API_URL}/auth/inscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json;
  },

  async connexion(data) {
    const res = await fetch(`${API_URL}/auth/connexion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json;
  },

  async me() {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) return null;
    return json.utilisateur;
  },

  async deconnexion() {
    const token = localStorage.getItem("token");
    if (!token) return { message: "Déconnexion réussie" };
    const res = await fetch(`${API_URL}/auth/deconnexion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json;
  },

  getToken() {
    return localStorage.getItem("token");
  },

  setToken(token) {
    localStorage.setItem("token", token);
  },

  removeToken() {
    localStorage.removeItem("token");
    localStorage.removeItem("utilisateur");
  },

  setUtilisateur(utilisateur) {
    if (utilisateur) {
      localStorage.setItem("utilisateur", JSON.stringify(utilisateur));
    } else {
      localStorage.removeItem("utilisateur");
    }
  },

  getUtilisateur() {
    const u = localStorage.getItem("utilisateur");
    return u ? JSON.parse(u) : null;
  },
};
```

### 4.3 formations.js

- **getImageUrl(imageUrl)** : si l’URL est absolue (http), retourne le pathname pour le proxy ; sinon retourne l’URL avec `/` si besoin.
- **getAuthHeaders(json)** : `Authorization: Bearer` si token ; `Content-Type: application/json` seulement si `json === true` (à false pour FormData).
- **getFormations(params)** : GET `/api/formations` avec token (formateur voit ses formations par défaut).
- **getFormationsCatalogue(params)** : GET sans token pour le catalogue public.
- **getFormation(id)** : GET `/api/formations/:id`.
- **createFormation(data)** : POST ; si `data` est `FormData`, pas de Content-Type.
- **updateFormation(id, data)** : FormData → POST, sinon PUT.
- **deleteFormation(id)** : DELETE.
- **getCategories()** : GET `/api/categories`.
- **formatFormationForDisplay(f)** : formateur en string (prenom + nom), domaine, date FR, levelLabel, image_url via getImageUrl.
- **formatAtelierForCarte(f)** : id, titre, date, statut (classe CSS), statutLabel.

```javascript
import { parseJsonResponse } from "./utils";
import { API_URL } from "../constants";

export function getImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http")) return new URL(imageUrl).pathname;
  return imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
}

function getAuthHeaders(json = true) {
  const token = localStorage.getItem("token");
  const headers = { ...(token && { Authorization: `Bearer ${token}` }) };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

export const formationsApi = {
  async getFormations(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/formations${qs ? `?${qs}` : ""}`, { headers: getAuthHeaders() });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return { formations: json.formations ?? [], meta: json.meta ?? null };
  },

  async getFormationsCatalogue(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/formations${qs ? `?${qs}` : ""}`, { headers: { "Content-Type": "application/json" } });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return { formations: json.formations ?? [], meta: json.meta ?? null };
  },

  async getFormation(id) {
    const res = await fetch(`${API_URL}/formations/${id}`, { headers: getAuthHeaders() });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json.formation;
  },

  async createFormation(data) {
    const isFormData = data instanceof FormData;
    const res = await fetch(`${API_URL}/formations`, {
      method: "POST",
      headers: getAuthHeaders(!isFormData),
      body: isFormData ? data : JSON.stringify(data),
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json.formation;
  },

  async updateFormation(id, data) {
    const isFormData = data instanceof FormData;
    const res = await fetch(`${API_URL}/formations/${id}`, {
      method: isFormData ? "POST" : "PUT",
      headers: getAuthHeaders(!isFormData),
      body: isFormData ? data : JSON.stringify(data),
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json.formation;
  },

  async deleteFormation(id) {
    const res = await fetch(`${API_URL}/formations/${id}`, { method: "DELETE", headers: getAuthHeaders() });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json;
  },

  async getCategories() {
    const res = await fetch(`${API_URL}/categories`);
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json.categories;
  },
};

const LEVEL_LABELS = { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" };

export function formatFormationForDisplay(f) {
  if (!f) return null;
  const formateurNom = f.formateur ? [f.formateur.prenom, f.formateur.nom].filter(Boolean).join(" ") : "";
  const dateStr = f.created_at ? new Date(f.created_at).toLocaleDateString("fr-FR") : "";
  return {
    ...f,
    formateur: formateurNom,
    domaine: f.categorie?.libelle || "",
    heures: f.duree_heures,
    date: dateStr,
    description: f.description || "",
    level: f.level || "",
    levelLabel: LEVEL_LABELS[f.level] || f.level || "",
    image_url: getImageUrl(f.image_url) || f.image_url,
  };
}

export function formatAtelierForCarte(f) {
  if (!f) return null;
  const statutMap = { "En Cours": "en-cours", Terminé: "termine", "À venir": "a-venir" };
  const dateStr = f.created_at ? new Date(f.created_at).toLocaleDateString("fr-FR") : "";
  return {
    id: f.id,
    titre: f.nom,
    date: dateStr,
    statut: statutMap[f.statut] || "en-cours",
    statutLabel: f.statut || "En cours",
  };
}
```

### 4.4 inscriptions.js

Appels réservés à l’apprenant (token requis) : formations suivies, s’inscrire, se désinscrire, mettre à jour la progression.

```javascript
import { parseJsonResponse } from "./utils";
import { API_URL } from "../constants";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
    "Content-Type": "application/json",
  };
}

export const inscriptionsApi = {
  async getFormationsSuivies() {
    const res = await fetch(`${API_URL}/apprenant/formations`, { headers: getAuthHeaders() });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json.formations ?? [];
  },

  async inscrire(formationId) {
    const res = await fetch(`${API_URL}/formations/${formationId}/inscription`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json;
  },

  async desinscrire(formationId) {
    const res = await fetch(`${API_URL}/formations/${formationId}/inscription`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json;
  },

  async updateProgression(formationId, progression) {
    const res = await fetch(`${API_URL}/formations/${formationId}/progression`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ progression }),
    });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return json;
  },
};
```

---

## 5. Gardes de route

### 5.1 RouteFormateur

Au montage : s’il n’y a pas de token → redirection. Sinon appel `authApi.me()` : si pas d’utilisateur ou `role !== 'formateur'` → `removeToken` et redirection. Sinon `setUtilisateur` et affichage des `children`. En cas d’erreur (token expiré) → `removeToken` et redirection. On garde `location` dans le state pour pouvoir rediriger après connexion.

```javascript
import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi } from "../api/auth";

function RouteFormateur({ children }) {
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
        if (!utilisateur || utilisateur.role !== "formateur") {
          authApi.removeToken();
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
    return <div className="d-flex justify-content-center align-items-center min-vh-100">Vérification...</div>;
  }
  if (!verification.ok) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }
  return children;
}

export default RouteFormateur;
```

### 5.2 RouteApprenant

Même logique avec `role === 'participant'`. Pas de `removeToken` quand le rôle est mauvais (optionnel), mais redirection vers connexion.

```javascript
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
```

---

## 6. Pages et composants

### 6.1 Login (connexion/login.jsx)

- État : `formData` (email, mot_de_passe), `erreur`, `chargement`.
- Submit : `authApi.connexion(formData)` → `setToken`, `setUtilisateur`, puis `navigate` vers `/dashboard/formateur` ou `/dashboard/apprenant` selon `res.utilisateur.role`.
- En cas d’erreur : `setErreur(getMessageErreurApi(err))`.
- Layout : NavbarPublic, formulaire (email, mot de passe), lien vers inscription, Footer.

```javascript
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavbarPublic from "../components/NavbarPublic";
import Footer from "../components/Footer";
import { authApi } from "../api/auth";
import { getMessageErreurApi } from "../api/utils";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", mot_de_passe: "" });
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErreur("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      const res = await authApi.connexion(formData);
      authApi.setToken(res.token);
      authApi.setUtilisateur(res.utilisateur);
      const dashboard = res.utilisateur?.role === "formateur" ? "/dashboard/formateur" : "/dashboard/apprenant";
      navigate(dashboard);
    } catch (err) {
      setErreur(getMessageErreurApi(err, "Erreur de connexion."));
    } finally {
      setChargement(false);
    }
  };

  return (
    <>
      <NavbarPublic />
      <main className="page-auth">
        <form onSubmit={handleSubmit}>
          <input name="email" type="email" value={formData.email} onChange={handleChange} required />
          <input name="mot_de_passe" type="password" value={formData.mot_de_passe} onChange={handleChange} required />
          {erreur && <p className="erreur-auth">{erreur}</p>}
          <button type="submit" disabled={chargement}>{chargement ? "Connexion..." : "Se connecter"}</button>
          <p><Link to="/inscription">S'inscrire</Link></p>
        </form>
      </main>
      <Footer />
    </>
  );
}

export default Login;
```

### 6.2 Inscription (connexion/inscription.jsx)

- formData : email, mot_de_passe, nom, prenom, role (défaut `'participant'`).
- Submit : `authApi.inscription(formData)` → message succès, reset champs, après 2 s `navigate('/')`.
- Select rôle : Apprenant (participant) / Formateur (formateur).

### 6.3 Accueil (pages/Accueil.jsx)

- `formationsApi.getFormationsCatalogue({ per_page: 6 })` → `formatFormationForDisplay` → affichage des 6 formations à la une.
- Sections : hero, étapes d’inscription, liens connexion élève/formateur, valeurs, grille formations + lien « Voir toutes les formations » vers `/formations`.

### 6.4 FormationsCatalogue (pages/FormationsCatalogue.jsx)

- Charger les catégories : GET `/api/categories` (ou `formationsApi.getCategories()`).
- Filtres : recherche (texte), id_categorie, level. À chaque changement, `getFormationsCatalogue({ per_page: 20, page: 1, recherche, id_categorie, level })`.
- Afficher la grille avec `formatFormationForDisplay`, lien « Voir détail » vers `/formation/:id`.

### 6.5 FormationDetail (pages/FormationDetail.jsx)

- `useParams().id` → `getFormation(id)` puis `formatFormationForDisplay`.
- Si utilisateur connecté et rôle participant : `getFormationsSuivies()` pour savoir si déjà inscrit.
- Bouton « Suivre la formation » : si non connecté → `navigate('/connexion', { state: { from: { pathname: `/formation/${id}` } } })`. Si participant → `inscriptionsApi.inscrire(id)` puis `navigate(`/apprendre/${id}`)`.
- Afficher : image (getImageUrl ou IMG_PLACEHOLDER), description, meta (niveau, catégorie, formateur, inscriptions_count, nombre_de_vues), liste des modules (ordre + titre). Si inscrit : lien « Continuer la formation » vers `/apprendre/:id`. Si formateur propriétaire : lien « Gérer dans mon espace ».

### 6.6 DashboardApprenant

- `inscriptionsApi.getFormationsSuivies()` → liste avec progression.
- Pour chaque formation : carte (image, titre, description tronquée, niveau, barre de progression), boutons « Suivre » (lien `/apprendre/:id`) et « Ne plus suivre » (confirm + `desinscrire(formationId)` puis retirer de la liste).

### 6.7 Apprendre (pages/Apprendre.jsx)

- `useParams().id` → `getFormation(id)` et `getFormationsSuivies()` pour récupérer la progression.
- Slider ou input 0–100 : à chaque changement, `inscriptionsApi.updateProgression(id, value)`.
- Afficher les modules : titre, type (video/ressource → lien `url_ressource`), contenu texte (ex. `dangerouslySetInnerHTML` avec `\n` → `<br />`).
- Lien « Retour à mon espace » vers `/dashboard/apprenant`.

### 6.8 Home (formateur)

- `formationsApi.getFormations({ id_formateur: user.id, page: 1, per_page: 15 })` → stats (total, en cours, terminés) et les 9 premiers en `formatAtelierForCarte`.
- Lien « Créer une formation » vers `/Gestion_Ateliers`.
- Header formateur (déconnexion, etc.).

### 6.9 Gestion_Ateliers (formateur)

- Liste : `getFormations({ id_formateur: user.id, page, per_page: 15 })` → `formatFormationForDisplay`.
- Filtres locaux : recherche texte, prix min/max sur la liste chargée.
- Bouton « + Ajouter formation » → ouvrir le modal/composant Ajouter_Ateliers.
- Clic « Modifier » → ouvrir Modal_Formation en mode modifier avec la formation.
- Clic « Supprimer » → confirm puis `deleteFormation(id)`, recharger la liste.
- **Sauvegarde (modal)** : si nouvelle image → FormData (nom, duree_heures, prix, statut, description, level, id_categorie, image). Sinon JSON. `updateFormation(id, payload)` puis recharger et fermer le modal.

### 6.10 Modal_Formation

- Props : formation, mode ('voir' | 'modifier'), show, onClose, onSave, onDelete, categories.
- État : formData (nom, description, heures, prix, level, statut, id_categorie, image_url, etc.), imageFile, imagePreview.
- À l’ouverture : remplir formData depuis la formation.
- Mode voir : affichage lecture seule + boutons Modifier / Supprimer. Mode modifier : champs éditables + bouton Enregistrer.
- Submit : appeler `onSave({ ...formation, ...formData, id_categorie, imageFile })`. Le parent fait `updateFormation` puis ferme.
- Supprimer : confirm → `onDelete(formation.id)` puis `onClose()`.

### 6.11 Ajouter_Ateliers (modal création formation)

- formData : title, description, price, duration, level, id_categorie.
- Validation côté client (champs requis, level dans la liste, catégorie si categories.length > 0).
- Si image : FormData (title, description, price, duration, level, id_categorie, image). Sinon JSON.
- `formationsApi.createFormation(payload)` → `onSuccess()` et `onClose()`, reset formulaire et aperçu. Gestion 422 : afficher erreurs par champ.

---

## 7. Conventions

- **Token et utilisateur** : toujours via `authApi` (getToken, setToken, getUtilisateur, setUtilisateur, removeToken). Vérifier l’accès avec `me()` sur les routes protégées.
- **Erreurs API** : utiliser `parseJsonResponse(res)` puis en cas d’échec `throw { status: res.status, ...json }` ; côté UI `getMessageErreurApi(err)` pour le message.
- **Images** : avec fichier, envoyer en FormData sans `Content-Type` (le navigateur met la boundary). Sans fichier, JSON. Côté affichage : `getImageUrl(image_url) || IMG_PLACEHOLDER`.
- **Formations** : pour l’affichage liste/détail, utiliser `formatFormationForDisplay` (formateur en string, domaine, levelLabel, date FR). Pour les cartes atelier formateur : `formatAtelierForCarte`.
- **Niveaux** : codes back `beginner`, `intermediate`, `advanced` → libellés « Débutant », « Intermédiaire », « Avancé » (LEVEL_LABELS ou constantes).

En suivant ce guide et en recopiant les extraits dans les bons fichiers, vous recréez le frontend SkillHub depuis zéro avec les mêmes appels API et la même structure que le projet actuel.
