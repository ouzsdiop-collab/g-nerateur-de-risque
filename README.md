# QHSE Control — Générateur DUERP + Backend Leads

Pack prêt à ouvrir dans Cursor.

## Lancement rapide

```bash
npm run install:all
cp backend/.env.example backend/.env
npm run dev
```

Front : http://localhost:5173  
Backend : http://localhost:3000/health

## Connexion front/back

Le front `frontend/index.html` envoie les leads vers :

```txt
POST http://localhost:3000/api/public/duerp-leads
```

Le backend stocke par défaut dans :

```txt
backend/data/leads.json
```

Consultation locale :

```txt
http://localhost:3000/api/public/leads
```

## GitHub

```bash
git init
git add .
git commit -m "init qhse duerp lead magnet"
git branch -M main
git remote add origin https://github.com/TON-USER/qhse-duerp-leadmagnet.git
git push -u origin main
```

## Supabase optionnel

1. Crée un projet Supabase.
2. Exécute `backend/supabase.sql`.
3. Remplis `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans `backend/.env`.

## Email optionnel

Remplis SMTP dans `backend/.env`. Chaque lead sera envoyé à `LEAD_RECEIVER_EMAIL`.
