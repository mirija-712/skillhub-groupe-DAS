# Guide de codage — Frontend SkillHub (React + Vite)

Ce document explique **comment le frontend est construit**, **dans quel ordre s’y retrouver**, et **reprend le code essentiel** tel qu’il existe dans le dépôt. Il s’adresse à quelqu’un qui découvre le projet ou souhaite **reproduire l’application** en comprenant les choix techniques.

---

## Sommaire

1. [À quoi sert ce guide](#1-à-quoi-sert-ce-guide)
2. [Concepts à connaître avant de commencer](#2-concepts-à-connaître-avant-de-commencer)
3. [Prérequis et lancement](#3-prérequis-et-lancement)
4. [Arborescence de `src/`](#4-arborescence-de-src)
5. [Ordre conseillé pour lire ou recoder le projet](#5-ordre-conseillé-pour-lire-ou-recoder-le-projet)
6. [Configuration : constantes, Vite, CSS global](#6-configuration--constantes-vite-css-global)
7. [Point d’entrée : `main.jsx`](#7-point-dentrée--mainjsx)
8. [Routage : `App.jsx`](#8-routage--appjsx)
9. [Couche API (`src/api/`)](#9-couche-api-srcapi)
10. [Garde de route : `ProtectedRoute`](#10-garde-de-route--protectedroute)
11. [Authentification : `connexion/`](#11-authentification--connexion)
12. [Organisation des pages (`src/pages/`)](#12-organisation-des-pages-srcpages)
13. [Détail par zone (public, client, formateur)](#13-détail-par-zone-public-client-formateur)
14. [Composants utiles : `FormationImage`](#14-composants-utiles--formationimage)
15. [Modales et formulaires formateur](#15-modales-et-formulaires-formateur)
16. [Conventions, erreurs API, images](#16-conventions-erreurs-api-images)
17. [Variables d’environnement (`.env`)](#17-variables-denvironnement-env)
18. [Dépannage rapide](#18-dépannage-rapide)

---

## 1. À quoi sert ce guide

- **Comprendre** où se trouve quoi (routes, API, pages par rôle).
- **Recoder** ou **étendre** une fonctionnalité sans se perdre.
- Avoir une **référence unique** alignée sur le code actuel (chemins `public/`, `espace-client/`, `espace-formateur/`, `getImageUrl`, `ProtectedRoute` async, etc.).

Ce n’est pas un cours React complet : on suppose que vous savez ce qu’est un composant, un `useState` et une `fetch`.

---

## 2. Concepts à connaître avant de commencer

| Concept | Rôle dans SkillHub |
|--------|---------------------|
| **SPA** | Une seule page HTML ; React affiche l’écran selon l’URL (`react-router-dom`). |
| **API REST Laravel** | Toutes les données passent par des URLs préfixées `/api` (ex. `/api/formations`). |
| **Proxy Vite** | En dev, le navigateur appelle `http://localhost:5173/api/...` ; Vite **transfère** vers `http://localhost:8000/api/...` (évite le CORS et simplifie les URLs). |
| **JWT** | Après connexion, le back renvoie un **token** ; le front le met dans `localStorage` et l’envoie en header `Authorization: Bearer ...`. |
| **Rôles** | `participant` (apprenant) et `formateur` ; le back les vérifie ; le front utilise `ProtectedRoute` pour les pages réservées. |

---

## 3. Prérequis et lancement

- **Node.js** 18+ et **npm**.
- **Backend Laravel** démarré (ex. `php artisan serve` sur le port **8000**).
- À la racine de `skillhub_front` : `npm install` puis `npm run dev` → interface sur **http://localhost:5173**.

Les requêtes vers `/api` et `/storage` sont proxifiées vers le backend (voir `vite.config.js`).

---

## 4. Arborescence de `src/`

```
src/
├── api/                    # Tous les appels HTTP vers Laravel
│   ├── auth.js             # Inscription, connexion, déconnexion, /auth/me
│   ├── formations.js       # CRUD formations, catégories, getImageUrl, formatFormationForDisplay
│   ├── inscriptions.js     # Inscriptions apprenant, progression
│   └── utils.js            # parseJsonResponse, getMessageErreurApi
├── assets/                 # Images statiques (logo, fonds, icônes)
├── components/             # Composants réutilisables (navbar, header formateur, modals…)
├── connexion/              # Pages login + inscription + CSS dédiés
├── pages/                  # Voir sous-arborescence ci-dessous + pages/README.md
├── App.jsx                 # Définition des routes
├── App.css                 # Thème SkillHub (variables CSS, boutons .btn-skillhub…)
├── main.jsx                # Monte React dans #root + BrowserRouter
├── constants.js            # API_URL, API_ORIGIN, IMG_PLACEHOLDER
└── index.css               # Reset minimal (layout #root), le détail visuel est dans App.css
```

### Pages (`src/pages/`)

| Dossier | Qui y accède | Fichiers principaux |
|---------|----------------|---------------------|
| **`public/`** | Tout le monde | `Accueil`, `FormationsCatalogue`, `FormationDetail` + `public/css/` |
| **`espace-client/`** | Apprenant connecté (`role === "participant"`) | `DashboardApprenant`, `Apprendre` + `espace-client/css/` |
| **`espace-formateur/`** | Formateur connecté | `Home`, `MesAteliers`, `GestionAteliers` + `espace-formateur/css/` |

**Important :** depuis ces sous-dossiers, les imports vers `components/`, `api/`, `assets/` utilisent **`../../`** (deux niveaux au-dessus), pas `../`.

Les fichiers CSS qui référencent des images dans `assets/` utilisent **`../../../assets/...`** (trois niveaux depuis `pages/xxx/css/`).

---

## 5. Ordre conseillé pour lire ou recoder le projet

1. `constants.js` + `vite.config.js` (comment l’API est joignable).
2. `api/utils.js` puis `api/auth.js` (flux d’auth).
3. `api/formations.js` + `api/inscriptions.js` (données métier).
4. `components/ProtectedRoute.jsx` (qui a le droit d’voir quelle page).
5. `App.jsx` (liste des URLs).
6. `connexion/login.jsx` (prise de token).
7. Pages dans l’ordre : `public/` → `espace-client/` → `espace-formateur/`.
8. Composants de formulaire / modals utilisés par le formateur.

---

## 6. Configuration : constantes, Vite, CSS global

### 6.1 `src/constants.js`

- **`API_URL`** : en dev, souvent `"/api"` (relatif → proxy Vite). En prod, on peut définir `VITE_API_URL=https://mon-api.com/api`.
- **`API_ORIGIN`** : origine du serveur Laravel **sans** `/api`, pour construire les URLs d’images `/storage/...` (ex. `http://localhost:8000`). Optionnel si le proxy `/storage` suffit.
- **`IMG_PLACEHOLDER`** : image de secours si aucune image de formation.

```javascript
export const API_URL = import.meta.env.VITE_API_URL || "/api";

/** Base Laravel pour /storage (ex. http://localhost:8000). Optionnel si le proxy Vite suffit. */
export const API_ORIGIN = String(import.meta.env.VITE_API_ORIGIN || "").replace(/\/$/, "");

export const IMG_PLACEHOLDER = "https://via.placeholder.com/300x180?text=Formation";
```

### 6.2 `vite.config.js`

Le serveur de dev redirige `/api` et `/storage` vers Laravel (`localhost:8000`). Sans cela, le navigateur interrogerait le port 5173 et ne trouverait pas l’API.

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

### 6.3 `src/index.css`

Uniquement la mise en page globale (`html`, `body`, `#root`). **Pas** de couleurs de thème ici : elles sont dans `App.css` pour rester cohérentes avec la maquette SkillHub.

### 6.4 `src/App.css`

Définit les **variables CSS** (`--skillhub-blue`, `--skillhub-orange`, etc.) et les classes utilitaires (`.btn-skillhub`, `.btn-skillhub-orange`, titres…). À ouvrir dans l’éditeur pour les détails.

---

## 7. Point d’entrée : `main.jsx`

- Monte l’application dans l’élément `#root` du `index.html`.
- Enveloppe l’app avec **`BrowserRouter`** : indispensable pour que `Routes`, `Link`, `useNavigate` fonctionnent.

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

---

## 8. Routage : `App.jsx`

- Importe **Bootstrap** (CSS + JS pour les composants comme le menu déroulant).
- Routes **publiques** : accueil, connexion, inscription, catalogue, détail formation.
- Routes **protégées** : enveloppées dans **`<ProtectedRoute role="participant">`** ou **`role="formateur"`**.
- Les pages formateur **lourdes** (`Home`, `MesAteliers`, `GestionAteliers`) sont chargées avec **`lazy`** + **`Suspense`** pour accélérer le premier affichage.
- Anciennes URLs **`/Mes_Ateliers`** et **`/Gestion_Ateliers`** → redirection vers **`/mes-formations`** et **`/gestion-formations`**.

```javascript
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import Accueil from "./pages/public/Accueil";
import Login from "./connexion/login";
import Inscription from "./connexion/inscription";
import FormationsCatalogue from "./pages/public/FormationsCatalogue";
import FormationDetail from "./pages/public/FormationDetail";
import DashboardApprenant from "./pages/espace-client/DashboardApprenant";
import Apprendre from "./pages/espace-client/Apprendre";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

const Home = lazy(() => import("./pages/espace-formateur/Home"));
const MesAteliers = lazy(() => import("./pages/espace-formateur/MesAteliers"));
const GestionAteliers = lazy(() => import("./pages/espace-formateur/GestionAteliers"));

function App() {
  return (
    <Suspense fallback={<div className="d-flex justify-content-center align-items-center min-vh-100">Chargement...</div>}>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/formations" element={<FormationsCatalogue />} />
        <Route path="/formation/:id" element={<FormationDetail />} />

        <Route path="/dashboard/apprenant" element={<ProtectedRoute role="participant"><DashboardApprenant /></ProtectedRoute>} />
        <Route path="/apprendre/:id" element={<ProtectedRoute role="participant"><Apprendre /></ProtectedRoute>} />

        <Route path="/dashboard/formateur" element={<ProtectedRoute role="formateur"><Home /></ProtectedRoute>} />
        <Route path="/mes-formations" element={<ProtectedRoute role="formateur"><MesAteliers /></ProtectedRoute>} />
        <Route path="/gestion-formations" element={<ProtectedRoute role="formateur"><GestionAteliers /></ProtectedRoute>} />

        <Route path="/Mes_Ateliers" element={<Navigate to="/mes-formations" replace />} />
        <Route path="/Gestion_Ateliers" element={<Navigate to="/gestion-formations" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
```

### Tableau récapitulatif des URLs

| URL | Fichier page | Accès |
|-----|----------------|-------|
| `/` | `pages/public/Accueil.jsx` | Public |
| `/connexion` | `connexion/login.jsx` | Public |
| `/inscription` | `connexion/inscription.jsx` | Public |
| `/formations` | `pages/public/FormationsCatalogue.jsx` | Public |
| `/formation/:id` | `pages/public/FormationDetail.jsx` | Public |
| `/dashboard/apprenant` | `pages/espace-client/DashboardApprenant.jsx` | `participant` |
| `/apprendre/:id` | `pages/espace-client/Apprendre.jsx` | `participant` |
| `/dashboard/formateur` | `pages/espace-formateur/Home.jsx` | `formateur` |
| `/mes-formations` | `pages/espace-formateur/MesAteliers.jsx` | `formateur` |
| `/gestion-formations` | `pages/espace-formateur/GestionAteliers.jsx` | `formateur` |

---

## 9. Couche API (`src/api/`)

### 9.1 `utils.js`

- **`parseJsonResponse`** : lit le corps en **texte** puis fait `JSON.parse`. Si le serveur renvoie une page HTML d’erreur, `response.json()` planterait ; ici on retourne au moins `{ message: ... }`.
- **`getMessageErreurApi`** : transforme l’objet d’erreur `{ status, message, erreurs }` en **phrase lisible** pour l’utilisateur (401, 403, 422 avec liste des champs).

```javascript
export async function parseJsonResponse(response) {
  try {
    const text = await response.text();
    if (!text || !text.trim()) return {};
    return JSON.parse(text);
  } catch {
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

### 9.2 `auth.js`

- Toutes les URLs commencent par **`API_URL`** (ex. `/api/auth/connexion`).
- En cas de réponse HTTP non OK, on lance **`throw { status: res.status, ...json }`** pour que l’UI puisse afficher le bon message.
- **`me()`** : utilisé par `ProtectedRoute` ; si le token est invalide, retourne `null`.

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

### 9.3 `formations.js` — points clés

- **`laravelBaseUrl()`** : déduit l’origine du serveur Laravel (variable `VITE_API_ORIGIN`, ou origine de `VITE_API_URL`, ou `http://localhost:8000` en dev).
- **`getImageUrl(imageUrl)`** : normalise l’URL renvoyée par l’API (`/storage/...` ou URL absolue) pour les balises `<img>`.
- **`getAuthHeaders(json)`** : si `json === false` (envoi **FormData**), on **ne met pas** `Content-Type` (le navigateur ajoute la boundary).
- **`createFormation` / `updateFormation`** : si le corps est un **`FormData`**, envoi en multipart ; sinon JSON.
- **`formatFormationForDisplay`** : adapte l’objet formation pour l’affichage (nom du formateur en une chaîne, libellé de niveau en français, `image_url` résolu).

Code complet actuel :

```javascript
// Appels API formations + catégories (JWT dans les headers quand il y a un token).

import { parseJsonResponse } from "./utils";
import { API_ORIGIN, API_URL } from "../constants";

/** URL du serveur Laravel (sans /api), pour les images /storage — ex. http://localhost:8000 */
function laravelBaseUrl() {
  if (API_ORIGIN) return API_ORIGIN;
  const viteApi = import.meta.env.VITE_API_URL || "";
  if (viteApi.startsWith("http")) {
    try {
      return new URL(viteApi).origin;
    } catch {
      return "";
    }
  }
  if (typeof window === "undefined") return "";
  const { hostname } = window.location;
  if (hostname !== "localhost" && hostname !== "127.0.0.1") return "";
  const port = import.meta.env.VITE_LARAVEL_PORT || "8000";
  return `http://${hostname}:${port}`;
}

/**
 * URL pour <img src>. L’API peut envoyer une URL complète ou /storage/…
 * On n’utilise que le chemin puis on préfixe avec laravelBaseUrl() (sinon chemin relatif → proxy Vite).
 */
export function getImageUrl(imageUrl) {
  if (imageUrl == null || String(imageUrl).trim() === "") return null;
  let path = String(imageUrl).trim().replace(/\\/g, "/");
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      path = new URL(path).pathname;
    } catch {
      return null;
    }
  }
  if (!path.startsWith("/")) path = `/${path}`;
  if (!path.startsWith("/storage")) return path;
  const base = laravelBaseUrl();
  return base ? `${base}${path}` : path;
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
    const url = `${API_URL}/formations${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    const json = await parseJsonResponse(res);
    if (!res.ok) throw { status: res.status, ...json };
    return { formations: json.formations ?? [], meta: json.meta ?? null };
  },

  async getFormationsCatalogue(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = `${API_URL}/formations${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
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
    const res = await fetch(`${API_URL}/formations/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
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
  const formateurNom = f.formateur
    ? [f.formateur.prenom, f.formateur.nom].filter(Boolean).join(" ")
    : "";
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
    image_url: getImageUrl(f.image_url) ?? f.image_url,
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

### 9.4 `inscriptions.js`

Réservé aux apprenants connectés : liste des formations suivies, inscription, désinscription, progression (PUT).

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

## 10. Garde de route : `ProtectedRoute`

Fichier : **`src/components/ProtectedRoute.jsx`**.

1. Au montage (et quand **`role`** change), lecture du token.
2. Appel **`authApi.me()`** (async) pour valider le JWT côté serveur.
3. Si pas d’utilisateur ou mauvais rôle → état « refusé », affichage d’une redirection vers **`/connexion`** avec **`state: { from: location }`** (pour pouvoir revenir après login).
4. Si le token est invalide (exception) → **`removeToken()`**.
5. Tant que la vérification est en cours → message « Chargement... ».

```javascript
import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi } from "../api/auth";

export default function ProtectedRoute({ children, role }) {
  const [verification, setVerification] = useState({ ok: null, loading: true });
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await Promise.resolve();
      const token = authApi.getToken();
      if (!token) {
        if (!cancelled) {
          setVerification({ ok: false, loading: false });
        }
        return;
      }
      try {
        const utilisateur = await authApi.me();
        if (cancelled) {
          return;
        }
        if (!utilisateur) {
          authApi.removeToken();
          setVerification({ ok: false, loading: false });
          return;
        }
        if (utilisateur.role !== role) {
          setVerification({ ok: false, loading: false });
          return;
        }
        authApi.setUtilisateur(utilisateur);
        setVerification({ ok: true, loading: false });
      } catch {
        if (!cancelled) {
          authApi.removeToken();
          setVerification({ ok: false, loading: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role]);

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

## 11. Authentification : `connexion/`

### Connexion (`login.jsx`)

1. État local : `email`, `mot_de_passe` (noms alignés sur le back : **`mot_de_passe`**).
2. Au submit : **`authApi.connexion(formData)`** → stocke **`res.token`** et **`res.utilisateur`**.
3. Redirection : **`/dashboard/formateur`** ou **`/dashboard/apprenant`** selon **`res.utilisateur.role`**.
4. Erreur : **`getMessageErreurApi(err)`** affichée sous le formulaire.
5. Layout : **`NavbarPublic`** + formulaire + **`Footer`**, styles dans **`connexion/css/login.css`**.

Code complet de **`src/connexion/login.jsx`** :

```javascript
// Page de connexion - style SkillHub1.0
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavbarPublic from "../components/NavbarPublic";
import Footer from "../components/Footer";
import { authApi } from "../api/auth";
import { getMessageErreurApi } from "../api/utils";
import "./css/login.css";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    mot_de_passe: "",
  });
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
      setErreur(getMessageErreurApi(err, "Erreur de connexion. Vérifiez que le backend est démarré."));
    } finally {
      setChargement(false);
    }
  };

  return (
    <>
      <NavbarPublic />
      <main className="page-auth">
        <div className="conteneur-auth">
          <div className="carte-auth">
            <h1 className="titre-auth">Connexion</h1>
            <p className="sous-titre-auth">Connectez-vous à votre compte SkillHub</p>

            <form onSubmit={handleSubmit} className="formulaire-auth">
              <div className="champ-auth">
                <label htmlFor="login-email" className="libelle-auth">
                  Email
                </label>
                <input
                  id="login-email"
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
                <label htmlFor="login-mot-de-passe" className="libelle-auth">
                  Mot de passe
                </label>
                <input
                  id="login-mot-de-passe"
                  name="mot_de_passe"
                  type="password"
                  className="champ-saisie-auth"
                  placeholder="••••••••"
                  value={formData.mot_de_passe}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
              </div>

              {erreur && <p className="erreur-auth">{erreur}</p>}
              <button type="submit" className="bouton-auth bouton-auth-principal" disabled={chargement}>
                {chargement ? "Connexion..." : "Se connecter"}
              </button>

              <p className="lien-bas-auth">
                Pas encore de compte ?{" "}
                <Link to="/inscription" className="lien-auth">
                  S&apos;inscrire
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default Login;
```

### Inscription (`inscription.jsx`)

- Champs : email, mot_de_passe, nom, prénom, **rôle** (`participant` ou `formateur`, défaut `participant`).
- Appel **`authApi.inscription(formData)`** ; en succès, message de confirmation, formulaire vidé, puis après **2 secondes** **`navigate("/")`** (accueil).
- Styles : **`connexion/css/login.css`** + **`connexion/css/inscription.css`**.
- Voir **`src/connexion/inscription.jsx`** pour le JSX complet (champs, accessibilité).

---

## 12. Organisation des pages (`src/pages/`)

Voir aussi **`src/pages/README.md`**.

- **`public/`** : tout visiteur.
- **`espace-client/`** : apprenant authentifié.
- **`espace-formateur/`** : formateur authentifié (header dédié `components/header.jsx` sur ces pages).

Chaque page importe son CSS avec **`./css/nomfichier.css`** (relatif au dossier de la page).

---

## 13. Détail par zone (public, client, formateur)

### Pages publiques (`pages/public/`)

| Fichier | Rôle |
|---------|------|
| **Accueil.jsx** | Hero, étapes, valeurs, aperçu des formations (`getFormationsCatalogue`), liens vers `/formations`, `/connexion`. |
| **FormationsCatalogue.jsx** | Liste paginée / filtres (recherche, catégorie, niveau). `getFormationsCatalogue` **sans** token. |
| **FormationDetail.jsx** | `useParams().id` → `getFormation(id)`. Bouton « Suivre » : si non connecté → redirection connexion avec **state** ; si participant → `inscriptionsApi.inscrire` puis `/apprendre/:id`. |

### Espace client (`pages/espace-client/`)

| Fichier | Rôle |
|---------|------|
| **DashboardApprenant.jsx** | `getFormationsSuivies()`, cartes avec progression, désinscription. |
| **Apprendre.jsx** | Détail + curseur / saisie de progression 0–100, `updateProgression`. |

### Espace formateur (`pages/espace-formateur/`)

| Fichier | Rôle |
|---------|------|
| **Home.jsx** | Tableau de bord : stats + ateliers récents (`getFormations` filtré par `id_formateur`). Lien vers `/gestion-formations`. |
| **MesAteliers.jsx** | Vue « catalogue » des formations avec modale **lecture** (`Modal_Formation` mode voir). |
| **GestionAteliers.jsx** | CRUD : `Ajouter_Ateliers`, `Modal_Formation` (voir / modifier), `deleteFormation`, filtres. |

Les noms de composants exportés dans les fichiers peuvent rester **`Mes_Ateliers`** / **`Gestion_Ateliers`** alors que le **fichier** s’appelle **`MesAteliers.jsx`** / **`GestionAteliers.jsx`** : c’est le **`export default`** qui compte pour les imports.

---

## 14. Composants utiles : `FormationImage`

Fichier : **`src/components/FormationImage.jsx`**.

- Utilise **`getImageUrl(imageUrl)`** et un placeholder si besoin.
- Prop **`src`** prioritaire (ex. aperçu local avant upload).
- En cas d’erreur de chargement (`onError`), affiche un **SVG** léger intégré (pas de requête réseau).

```javascript
import { useEffect, useState } from "react";
import { IMG_PLACEHOLDER } from "../constants";
import { getImageUrl } from "../api/formations";

const FALLBACK_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
      <rect fill="#e2e8f0" width="400" height="240"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="system-ui,sans-serif" font-size="15">Formation</text>
    </svg>`
  );

export default function FormationImage({ imageUrl, src, alt = "", className, loading, ...rest }) {
  const [failed, setFailed] = useState(false);

  const imgSrc = failed
    ? FALLBACK_SVG
    : src != null && src !== ""
      ? src
      : getImageUrl(imageUrl) || IMG_PLACEHOLDER;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset dérivé des props imageUrl/src
    setFailed(false);
  }, [imageUrl, src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
```

---

## 15. Modales et formulaires formateur

- **`components/ajouter_ateliers.jsx`** : création de formation ; envoi **JSON** ou **FormData** si image (champs attendus par le back : voir `formationsApi.createFormation` et la doc API Laravel).
- **`components/modal_formation.jsx`** : affichage / édition / suppression ; le parent (`GestionAteliers`) appelle **`updateFormation`** ou **`deleteFormation`**.

Pour le détail des champs (`title` vs `nom` côté create, etc.), se référer au **contrôleur Laravel** `FormationController` et au fichier source des modales.

---

## 16. Conventions, erreurs API, images

| Sujet | Convention |
|-------|------------|
| Token | Toujours via **`authApi`** ; ne pas dupliquer les clés `localStorage` à la main. |
| Erreurs | Après **`parseJsonResponse`**, si `!res.ok`, **`throw { status, ...json }`** ; dans l’UI, **`getMessageErreurApi(err)`**. |
| Images formation | Upload : **`FormData`** sans définir **`Content-Type`** manuellement. Affichage : **`FormationImage`** + **`getImageUrl`**. |
| Niveaux | API : `beginner`, `intermediate`, `advanced` ; affichage : libellés FR via **`formatFormationForDisplay`**. |

---

## 17. Variables d’environnement (`.env`)

Fichier optionnel à la racine de **`skillhub_front/`** (préfixe **`VITE_`** obligatoire pour que Vite les expose) :

| Variable | Exemple | Usage |
|----------|---------|--------|
| `VITE_API_URL` | `http://localhost:8000/api` | URL complète de l’API (production ou si pas de proxy). |
| `VITE_API_ORIGIN` | `http://localhost:8000` | Origine Laravel pour les URLs `/storage/...`. |
| `VITE_LARAVEL_PORT` | `8000` | Port si l’origine est déduite en local. |

Sans `.env`, **`API_URL`** vaut **`"/api"`** → le proxy Vite s’applique.

---

## 18. Dépannage rapide

| Problème | Piste |
|----------|--------|
| **401** partout | Token expiré ou absent ; se reconnecter ; vérifier que **`Authorization`** est bien envoyé dans **`getAuthHeaders`**. |
| **CORS en prod** | Le proxy n’existe qu’en **dev** ; en production, configurer **`VITE_API_URL`** vers l’URL réelle du backend et CORS côté Laravel. |
| **Images qui ne s’affichent pas** | Vérifier **`php artisan storage:link`**, fichier présent sous **`storage/app/public`**, et **`APP_URL`** côté Laravel ; tester l’URL directe `/storage/formations/...` sur le port du back. |
| **Page blanche après build** | Vérifier la console ; souvent une URL d’API incorrecte en prod. |

---

## Synthèse

1. **`constants` + proxy Vite** → savoir où partent les requêtes.  
2. **`api/*`** → tout le contrat avec Laravel.  
3. **`ProtectedRoute` + `authApi`** → qui accède à quelle route.  
4. **`App.jsx`** → carte des URLs.  
5. **`pages/public` / `espace-client` / `espace-formateur`** → séparation claire des écrans.  

En suivant cette structure et les fichiers cités **dans le dépôt**, vous pouvez naviguer dans le code ou le recréer de manière cohérente avec l’existant.
