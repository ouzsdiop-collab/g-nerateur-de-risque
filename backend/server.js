require('dotenv').config();
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const duerpRoutes = require('./routes/duerp.routes');
const legalRoutes = require('./routes/legal.routes');
const authRoutes = require('./routes/auth.routes');
const waitlistRoutes = require('./routes/waitlist.routes');
const trackRoutes = require('./routes/track.routes');
const riskSuggestionsRoutes = require('./routes/riskSuggestions.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));

function parseAllowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_ORIGIN || '';
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}
function isAllowedOrigin(origin, allowed) {
  if (!origin) return true; // curl / same-origin (no Origin header)
  if (allowed.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    if (host.endsWith('.railway.app')) return true;
    if (host === 'qhsecontrol.com' || host.endsWith('.qhsecontrol.com')) return true;
  } catch {}
  return false;
}
const allowedOrigins = parseAllowedOrigins();
app.use(cors({
  origin: function (origin, cb) {
    if (isAllowedOrigin(origin, allowedOrigins)) return cb(null, true);
    return cb(new Error('CORS blocked for origin: ' + origin));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-QHSE-Public-Key', 'Authorization']
}));
app.use(express.json({ limit: '15mb' }));

const leadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Trop de requetes.' }
});

app.get('/health', (_req, res) =>
  res.json({ ok: true, service: 'QHSE DUERP backend', at: new Date().toISOString() })
);

app.use('/api', leadLimiter, waitlistRoutes);
app.use('/api', leadLimiter, trackRoutes);
app.use('/api/public', leadLimiter, authRoutes);
app.use('/api/public', leadLimiter, duerpRoutes);
app.use('/api/public', leadLimiter, riskSuggestionsRoutes);
app.use('/api/duerp', leadLimiter, duerpRoutes);
app.use('/api/public', legalRoutes);

// Frontend : dossier racine ../frontend (dev / Railway fullstack), sinon backend/public (déploiements alternatifs).
const FRONTEND_DIR = fs.existsSync(path.join(__dirname, '..', 'frontend', 'index.html'))
  ? path.join(__dirname, '..', 'frontend')
  : path.join(__dirname, 'public');
app.use(express.static(FRONTEND_DIR));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ ok: false, error: 'Introuvable' });
  }
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (String(err && err.message || '').startsWith('CORS blocked')) {
    return res.status(403).json({ ok: false, error: 'CORS: origine non autorisée.' });
  }
  res.status(500).json({ ok: false, error: err.message || 'Erreur serveur' });
});

app.listen(PORT, '0.0.0.0', () => console.log('Backend pret sur http://0.0.0.0:' + PORT));
