# Guide SonarCloud — SkillHub Groupe DAS




---

## 1. Qu'est-ce que SonarCloud ?

SonarCloud est un outil d'analyse de qualité de code en ligne. Il analyse automatiquement
le code source à chaque push GitHub et signale :

| Catégorie | Ce qu'il détecte |
|---|---|
| **Bugs** | Code qui peut planter ou se comporter incorrectement |
| **Vulnerabilities** | Failles de sécurité (injection, données exposées…) |
| **Code Smells** | Code difficile à maintenir (fonctions trop longues, noms confus…) |
| **Coverage** | Pourcentage du code couvert par les tests automatiques |
| **Duplications** | Code copié-collé entre plusieurs fichiers |

Le **Quality Gate** est un ensemble de règles : si une règle échoue, le build
GitHub Actions échoue aussi. C'est une porte de qualité obligatoire.

---

## 2. Architecture mise en place

```
GitHub Push
    │
    ▼
GitHub Actions CI Pipeline
    │
    ├── Job backend  ─── PHPUnit ──► clover.xml (couverture PHP)
    │
    ├── Job frontend ─── Vitest  ──► lcov.info  (couverture JS)
    │
    └── Job sonarcloud
            │
            ├── Télécharge clover.xml
            ├── Télécharge lcov.info
            └── Envoie tout à SonarCloud
                        │
                        ▼
                  Quality Gate
                  ✅ Passed / ❌ Failed
```

---

## 3. Fichiers créés ou modifiés

### 3.1 `sonar-project.properties` (nouveau — à la racine)

Fichier de configuration principal de SonarCloud.

```properties
sonar.projectKey=mirija-712_skillhub-groupe-DAS
sonar.organization=mirija-712
sonar.projectName=SkillHub Groupe DAS

sonar.sources=skillhub_back/app,skillhub_front/src
sonar.tests=skillhub_back/tests,skillhub_front/src/test

sonar.exclusions=skillhub_back/vendor/**,skillhub_front/node_modules/**,...

sonar.php.coverage.reportPaths=skillhub_back/reports/clover.xml
sonar.javascript.lcov.reportPaths=skillhub_front/coverage/lcov.info
```

**Pourquoi ce fichier ?**  
Sans ce fichier, SonarCloud ne sait pas où chercher le code ni où lire
les rapports de couverture. C'est le point d'entrée obligatoire.

---

### 3.2 `skillhub_back/phpunit.xml` (modifié)

Ajout de la génération du rapport de couverture PHP au format Clover :

```xml
<coverage>
    <report>
        <clover outputFile="reports/clover.xml"/>
    </report>
</coverage>
```

**Pourquoi ?**  
PHPUnit peut mesurer quelles lignes de code PHP sont exécutées pendant les tests.
Le fichier `clover.xml` contient ces informations. SonarCloud le lit pour
afficher le pourcentage de couverture du backend Laravel.

**Prérequis PHP** : l'extension `xdebug` doit être activée dans GitHub Actions
(configuré dans `ci.yml` : `coverage: xdebug`).

---

### 3.3 `skillhub_front/vite.config.js` (modifié)

Ajout de la configuration de couverture pour Vitest :

```js
coverage: {
  provider: 'v8',
  reporter: ['lcov', 'text', 'html'],
  reportsDirectory: './coverage',
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  },
}
```

**Pourquoi ?**  
Vitest peut mesurer quelles lignes JavaScript sont exécutées pendant les tests.
Le fichier `lcov.info` est généré dans `coverage/`. SonarCloud le lit pour
afficher le pourcentage de couverture du frontend React.

Le seuil de **80%** signifie que si moins de 80% du code est testé,
le build échoue — c'est l'objectif fixé.

**Prérequis** : le package `@vitest/coverage-v8` est installé automatiquement
dans le job CI (`npm install --save-dev @vitest/coverage-v8`).

---

### 3.4 `.github/workflows/ci.yml` (modifié)

**4 modifications :**

**a) Correction faute de frappe**
```yaml
# Avant (cassé)
permissions:
  contents: readm
# Après (corrigé)
permissions:
  contents: read
```

**b) Activation xdebug pour PHP coverage**
```yaml
# Avant
coverage: none
# Après
coverage: xdebug
```

**c) Activation coverage JavaScript**
```yaml
# Avant
- name: Unit tests (Vitest)
  run: npm run test
# Après
- name: Install coverage provider
  run: npm install --save-dev @vitest/coverage-v8
- name: Unit tests (Vitest + Coverage)
  run: npx vitest run --coverage
```

**d) Nouveau job SonarCloud**
```yaml
sonarcloud:
  name: SonarCloud — Analyse qualité
  runs-on: ubuntu-latest
  needs: [backend, frontend]   # attend que les tests soient finis
  steps:
    - Checkout
    - Download PHPUnit coverage (clover.xml)
    - Download frontend coverage (lcov.info)
    - SonarCloud Scan (avec SONAR_TOKEN secret)
```

Le job `docker-images` attend maintenant `sonarcloud` au lieu de `[backend, frontend]`.
Cela garantit que Docker ne se build que si SonarCloud valide le code.

---

## 4. Secret GitHub requis

| Nom du secret | Valeur | Où le configurer |
|---|---|---|
| `SONAR_TOKEN` | Token généré sur sonarcloud.io | GitHub → Settings → Secrets → Actions |

Ce token est créé par le propriétaire du repo (Steve / mirija-712) sur SonarCloud
puis ajouté dans les secrets GitHub. Il ne doit **jamais** apparaître en clair
dans le code.

---

## 5. Objectifs qualité fixés

| Métrique | Objectif |
|---|---|
| Coverage (lignes) | ≥ 80% |
| Coverage (fonctions) | ≥ 80% |
| Coverage (branches) | ≥ 80% |
| Duplications | 0% (aucun code dupliqué) |
| Security Hotspots | 0 non résolus |

---

## 6. Comment vérifier les résultats

1. Faire un push sur la branche `feature/sonarcloud` ou `dev`
2. Aller sur **https://github.com/mirija-712/skillhub-groupe-DAS/actions**
3. Attendre que le job `sonarcloud` passe (✅ vert)
4. Aller sur **https://sonarcloud.io/project/overview?id=mirija-712_skillhub-groupe-DAS**
5. Vérifier : Quality Gate ✅ Passed, Coverage ≥ 80%, Duplications 0%

---

## 7. Procédure Pull Request

```
feature/sonarcloud  ──► PR vers dev ──► merge si Quality Gate ✅
```

La PR doit mentionner :
- Ce qui a été fait (SonarCloud + coverage)
- Les résultats obtenus (capture SonarCloud)
