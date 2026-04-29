# QHSE Control - Générateur de risques (frontend + backend)

Pack prêt à ouvrir dans Cursor.

## Structure finale (référence)

```txt
project/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── routes/
│   ├── services/
│   ├── config/
│   ├── middleware/
│   └── supabase.sql
│
├── frontend/
│   ├── index.html
│   ├── manifest.webmanifest
│   └── sw.js
│
├── docs/
├── README.md
└── .gitignore
```

## Lancement local (recommandé)

```bash
cd backend
npm install
cp backend/.env.example backend/.env
npm run dev
```

Dans un autre terminal :

```bash
npx serve frontend -l 5173
```

Front : http://localhost:5173  
Backend : http://localhost:3000/health

## Connexion front/back

Le front `frontend/index.html` appelle le backend via :

```txt
API_BASE_URL = window.QHSE_API_BASE_URL || "https://api.qhsecontrol.com"
```

En local, tu peux surcharger côté navigateur :

```js
window.QHSE_API_BASE_URL = "http://localhost:3000";
```

Endpoint principal :

```txt
POST /api/public/duerp-leads
```

## Railway (production)

Railway doit lancer **uniquement** le backend dans `backend/`.

- **Root Directory** : `backend`
- **Build Command** : `npm install`
- **Start Command** : `npm start`
- **Port** : géré par `process.env.PORT` dans `backend/server.js`

Variables à définir dans Railway : recopier `backend/.env.example` (sans commiter `.env`).

## Supabase optionnel

1. Crée un projet Supabase.
2. Exécute `backend/supabase.sql`.
3. Remplis `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans `backend/.env`.

## Email optionnel

Remplis SMTP dans `backend/.env`. Chaque lead sera envoyé à `LEAD_RECEIVER_EMAIL`.
