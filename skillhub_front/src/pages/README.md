# Pages (`src/pages`)

Organisation par espace :

| Dossier | Contenu |
|---------|---------|
| **`public/`** | Pages accessibles sans rôle (accueil, catalogue, détail formation). CSS dans `public/css/`. |
| **`espace-client/`** | Apprenant (participant) : tableau de bord, suivi de formation. CSS dans `espace-client/css/`. |
| **`espace-formateur/`** | Espace formateur : dashboard, liste « mes formations », gestion CRUD. CSS dans `espace-formateur/css/`. |

Les imports vers `components/`, `api/`, `assets/` utilisent `../../` depuis ces sous-dossiers.
