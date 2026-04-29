module.exports = function publicKey(req, res, next) {
  const expected = process.env.PUBLIC_API_KEY;
  if (!expected) return next();
  const received = req.headers['x-qhse-public-key'];
  if (received !== expected) return res.status(401).json({ ok: false, error: 'Clé publique invalide' });
  next();
};
