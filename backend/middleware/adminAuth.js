module.exports = function adminAuth(req, res, next) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return res.status(503).json({ ok: false, error: 'Admin non configure.' });
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== expected) return res.status(401).json({ ok: false, error: 'Non autorise.' });
  next();
};

