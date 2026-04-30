const router = require('express').Router();
const { createClient } = require('@supabase/supabase-js');

function getAuthSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function resolvePlanFromUser(user) {
  if (!user) return 'free';
  const meta = user.user_metadata || {};
  const app = user.app_metadata || {};
  const p = String(meta.plan || meta.tier || app.plan || '').toLowerCase();
  if (p === 'pro' || p === 'premium') return 'pro';
  return 'free';
}

/** Connexion — renvoie les jetons ; le plan Pro est lu depuis user_metadata.plan ou app_metadata.plan (ex. "pro"). */
router.post('/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim();
  const password = String(req.body?.password || '');
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email et mot de passe requis.' });
  }
  const supabase = getAuthSupabase();
  if (!supabase) {
    return res.status(503).json({ ok: false, error: 'Authentification non configurée (Supabase).' });
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return res.status(401).json({ ok: false, error: 'Identifiants invalides ou compte introuvable.' });
  }
  const plan = resolvePlanFromUser(data.user);
  return res.json({
    ok: true,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    plan,
    email: data.user.email || email
  });
});

/** Session courante — Authorization: Bearer <access_token> */
router.get('/auth/me', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return res.status(401).json({ ok: false, error: 'Non connecté.' });
  const supabase = getAuthSupabase();
  if (!supabase) {
    return res.status(503).json({ ok: false, error: 'Authentification non configurée (Supabase).' });
  }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ ok: false, error: 'Session invalide ou expirée.' });
  const plan = resolvePlanFromUser(user);
  return res.json({ ok: true, plan, email: user.email || '' });
});

module.exports = router;
