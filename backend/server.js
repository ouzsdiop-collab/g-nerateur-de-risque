require('dotenv').config();
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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'X-QHSE-Public-Key', 'Authorization']
  })
);
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
app.use('/api/duerp', leadLimiter, duerpRoutes);
app.use('/api/public', legalRoutes);

// Servir le frontend statique
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: err.message || 'Erreur serveur' });
});

app.listen(PORT, '0.0.0.0', () => console.log('Backend pret sur http://0.0.0.0:' + PORT));
