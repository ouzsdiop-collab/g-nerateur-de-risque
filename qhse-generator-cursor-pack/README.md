# QHSE Control — Générateur de priorités HSE

Pack prêt à ouvrir dans Cursor.

## Contenu
- `index.html` : front final
- `server.js` : backend complet avec endpoints IA, leads PDF et demande de démo
- `.env.example` : variables d'environnement à copier vers `.env`
- `leads.json` : stockage local des leads
- `package.json` : dépendances Node

## Installation
```bash
npm install
cp .env.example .env
```

## Lancement local
```bash
npm start
```

Puis ouvrir :
- `http://localhost:3008/`

## Endpoints clés
- `POST /api/enhance-risk`
- `POST /api/global-plan`
- `POST /api/save-lead`
- `POST /api/send-lead-client-email`
- `POST /api/demo-request`
- `GET /api/health`

## Déploiement Railway
- repo GitHub avec ces fichiers
- commande de démarrage : `npm start`
- ajouter les variables du `.env`
