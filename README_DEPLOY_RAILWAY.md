## Déploiement Railway — Générateur DUERP (fullstack)

### Objectif
Déployer **un seul service** Railway (Node/Express) qui :
- sert le frontend statique (`/frontend/index.html`)
- expose l’API (`/api/*`, `/api/public/*`, `/api/duerp/*`)

---

### 1) Pré-requis
- Repo GitHub connecté à Railway
- (Optionnel) Supabase configuré si vous voulez persister les leads / waitlist / events hors disque

---

### 2) Variables d’environnement Railway
Dans Railway → **Variables**, ajouter au minimum :

- **`PUBLIC_API_KEY`** : clé “publique” attendue par le frontend (renvoyée par `/api/public/config`).

Recommandé :
- **`CORS_ALLOWED_ORIGINS`** : allowlist séparée par des virgules.
  - Exemple : `https://<votre-projet>.up.railway.app,https://qhsecontrol.com`
  - Si vide : autorise automatiquement `*.railway.app` et `*.qhsecontrol.com` + requêtes sans header Origin.

Optionnel (si Supabase) :
- **`SUPABASE_URL`**
- **`SUPABASE_SERVICE_ROLE_KEY`** (pour écrire dans les tables via `storage.service.js`)
- **`SUPABASE_ANON_KEY`** (si vous utilisez le login `/api/public/auth/login` + `/api/public/auth/me`)

Optionnel (emails) :
- **`SMTP_HOST`**, **`SMTP_PORT`**, **`SMTP_SECURE`**, **`SMTP_USER`**, **`SMTP_PASS`**
- **`LEAD_RECEIVER_EMAIL`**

---

### 3) Build & Start commands (Railway)
Ce projet n’a pas de build frontend (HTML statique).

- **Build command** : `npm install`
- **Start command** : `npm start`

Le `package.json` racine lance `node backend/server.js`.

---

### 4) Ports (Railway)
Le serveur écoute :

- `process.env.PORT || 3000`

Railway injecte `PORT` automatiquement.

---

### 5) Frontend → Backend (production)
Le frontend utilise par défaut **la même origine** (`window.location.origin`) quand `window.QHSE_API_BASE_URL` n’est pas défini.

Vous pouvez forcer une API distante en définissant dans le HTML (ou via injection) :
- `window.QHSE_API_BASE_URL = "https://api.example.com"`

---

### 6) PDF en production
L’export PDF se fait **côté navigateur** via `jsPDF` (CDN). Il n’y a pas de dépendance serveur.

Si une politique CSP est activée plus tard, vérifier l’autorisation du CDN `cdnjs`.

---

### 7) Données (waitlist / tracking)
Sans Supabase, les endpoints écrivent dans :
- `backend/data/waitlist.json`
- `backend/data/analytics_events.json`

Sur Railway, le système de fichiers peut être **éphémère** (perte possible lors d’un redeploy).
Pour la persistance, utilisez Supabase (recommandé) ou un stockage externe.

