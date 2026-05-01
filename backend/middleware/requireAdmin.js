/** Vérifie le header x-admin-secret (jamais exposer ADMIN_SECRET côté client embarqué). */
function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    return res.status(503).json({ error: 'Admin non configuré' });
  }
  const sent = req.get('x-admin-secret') || '';
  if (String(sent) !== String(expected)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

module.exports = requireAdmin;
