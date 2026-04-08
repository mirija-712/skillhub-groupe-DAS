# SkillHub — Frontend (React + Vite)

Interface web du projet SkillHub : connexion, inscription, tableau de bord formateur, catalogue des formations et gestion des formations (CRUD). L’accès aux pages protégées est réservé aux **formateurs** ; les participants sont redirigés vers la page de connexion.

---

## 1. Prérequis

- **Node.js 18** ou plus
- **npm** (ou yarn / pnpm)

---

## 2. Structure du projet

```
skillhub_front/
├── public/
├── src/
│   ├── api/                              # Appels à l’API backend
│   │   ├── auth.js                       # Inscription, connexion, déconnexion, token, utilisateur
│   │   ├── formations.js                 # getFormations (paginé), getFormation, create, update, delete, getCategories
│   │   └── utils.js                      # parseJsonResponse, getMessageErreurApi (messages 401, 403, 422…)
│   ├── components/                       # Composants réutilisables
│   │   ├── ProtectedRoute.jsx            # Garde de route : token + rôle (participant ou formateur)
│   │   ├── header.jsx                    # Barre de navigation + bouton Déconnexion
│   │   ├── carte_atelier.jsx             # Carte atelier (titre, date, statut) pour le dashboard
│   │   ├── ajouter_ateliers.jsx          # Modal d’ajout de formation (titre, description, prix, durée, niveau, catégorie, image)
│   │   ├── modal_formation.jsx           # Modal détail / modification / suppression (badges prix/niveau/statut en mode lecture uniquement)
│   │   └── css/
│   │       ├── header.css
│   │       ├── carte_atelier.css
│   │       ├── ajouter_atelier.css
│   │       └── modal_formation.css
│   ├── connexion/                        # Pages d’authentification
│   │   ├── login.jsx                     # Page de connexion
│   │   ├── inscription.jsx               # Page d’inscription (formateurs, prénom optionnel)
│   │   └── css/
│   ├── pages/                            # Voir pages/README.md
│   │   ├── public/                       # Accueil, catalogue, détail formation (+ css/)
│   │   ├── espace-client/                # Apprenant : dashboard, apprendre (+ css/)
│   │   ├── espace-formateur/             # Formateur : Home, MesAteliers, GestionAteliers (+ css/)
│   │   └── README.md
│   ├── constants.js                      # API_URL, IMG_PLACEHOLDER
│   ├── App.jsx                           # Définition des routes
│   ├── main.jsx                          # Point d’entrée (React + BrowserRouter)
│   └── index.css                         # Styles globaux
├── index.html
├── vite.config.js                        # Proxy /api et /storage vers le backend (port 8000)
└── package.json
```

---

## 3. Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm install` | Installe les dépendances (React, React Router, Bootstrap, Vite). |
| `npm run dev` | Lance le serveur de développement. App sur http://localhost:5173. Requêtes `/api` et `/storage` → backend (port 8000). |
| `npm run build` | Build de production dans `dist/`. |
| `npm run preview` | Prévisualise le build. |
| `npm run lint` | ESLint (vérification du code). |

---

## 4. Installation pas à pas

1. Aller dans le dossier frontend :  
   `cd skillhub_front`

2. Installer les dépendances :  
   `npm install`

3. (Optionnel) Fichier `.env` à la racine :  
   `VITE_API_URL=http://localhost:8000/api`  
   Sinon le proxy Vite envoie `/api` vers le backend.

4. Démarrer le backend (autre terminal) :  
   `cd skillhub_back` puis `php artisan serve`

5. Démarrer le frontend :  
   `npm run dev`  
   Ouvrir **http://localhost:5173**.

---

## 5. Routes et fonctionnalités

| Route | Page | Accès | Description |
|-------|------|--------|-------------|
| `/` | Connexion | Public | Email + mot de passe. Redirection vers `/dashboard` si succès. Participants → 403. |
| `/inscription` | Inscription | Public | Email, mot de passe, nom ; prénom optionnel. Rôle « formateur ». Redirection vers `/` après succès. |
| `/dashboard` | Tableau de bord | Formateur | Stats (total ateliers via meta, en cours, terminés) et grille des ateliers récents (première page). |
| `/mes-formations` | Mes formations | Formateur | Liste paginée des formations (filtres recherche + prix min/max). Cartes avec badge niveau, prix en overlay, domaine. Bouton « Voir la formation » → modal lecture seule. |
| `/gestion-formations` | Gestion ateliers | Formateur | Liste paginée des formations du formateur. Filtres, boutons Ajouter / Modifier / Supprimer. Modals création, détail et modification (sauvegarde async, fermeture après succès). |

Les anciennes URLs `/Mes_Ateliers` et `/Gestion_Ateliers` redirigent vers les chemins ci-dessus.

**ProtectedRoute** : appelle `/api/auth/me` pour valider le token et le rôle. Si non connecté ou mauvais rôle → redirection vers `/connexion`.

---

## 6. Communication avec le backend

- **auth.js** : `/api/auth/inscription`, `/api/auth/connexion`, `/api/auth/deconnexion`, `/api/auth/me`. Token et utilisateur dans `localStorage`.
- **formations.js** : `getFormations(params)` retourne `{ formations, meta }` (pagination). Endpoints : liste paginée, détail, création (JSON ou FormData avec image), mise à jour, suppression, catégories.
- **utils.js** : `parseJsonResponse(response)` (message de fallback si réponse non JSON), `getMessageErreurApi(err, fallback)` (messages selon 401, 403, 422, etc.).
- Proxy Vite : `/api` et `/storage` → `http://localhost:8000`. Le backend doit tourner sur le port 8000 en dev.

---

## 7. Dépendances principales

- **react** / **react-dom** — Interface utilisateur.
- **react-router-dom** — Routing.
- **bootstrap** — Grilles et composants.
- **vite** — Serveur de dev et build. **@vitejs/plugin-react** pour React.

---

## 8. Build pour la production

1. `npm run build` → fichiers dans **`dist/`**.
2. Servir `dist/` avec un serveur web (Apache, Nginx, Vercel, Netlify, etc.).
3. En production, configurer **VITE_API_URL** vers l’URL réelle de l’API.

---

## 9. Résumé

- **Auth** : `src/connexion/` (login, inscription ; prénom optionnel).
- **Pages** : `src/pages/public/`, `espace-client/`, `espace-formateur/` (voir `pages/README.md`).
- **Composants** : `src/components/` (header, cartes, modals, ProtectedRoute). Cartes formation : badge niveau sur l’image, prix en overlay, badge domaine ; modal détail avec badges (prix, niveau, statut) uniquement en mode lecture.
- **API** : `src/api/` (auth, formations, utils avec gestion des erreurs par code HTTP).
