const router = require('express').Router();
const { getSupabase } = require('../config/supabase');

router.get('/legal-sources', async (req, res, next) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase non configure.', sources: [] });
    const country = req.query.country || null;
    let query = supabase.from('legal_sources').select('*');
    if (country) query = query.eq('country', country);
    const { data, error } = await query.order('country').limit(500);
    if (error) return res.status(503).json({ ok: false, error: error.message, sources: [] });
    res.json({ ok: true, count: data.length, sources: data });
  } catch (err) { next(err); }
});

router.get('/risk-map', async (req, res, next) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase non configure.', map: [] });
    const { data, error } = await supabase.from('risk_legal_map').select('risk_tag, legal_source_id');
    if (error) return res.status(503).json({ ok: false, error: error.message, map: [] });
    res.json({ ok: true, count: data.length, map: data });
  } catch (err) { next(err); }
});

module.exports = router;

