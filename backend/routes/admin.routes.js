const router = require('express').Router();
const { z } = require('zod');
const requireAdmin = require('../middleware/requireAdmin');
const userService = require('../services/user.service');

router.use(requireAdmin);

router.get('/admin/users', async (_req, res, next) => {
  try {
    const users = await userService.listUsersForAdmin();
    res.json({ users });
  } catch (e) {
    next(e);
  }
});

const ActivateBody = z.object({ durationDays: z.coerce.number().int().min(1).max(36500) });

router.post('/admin/users/:id/activate-pro', async (req, res, next) => {
  try {
    const parsed = ActivateBody.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Body invalide: durationDays requis (1–36500).' });
    }
    const id = decodeURIComponent(String(req.params.id || ''));
    const result = await userService.activatePro(id, parsed.data.durationDays);
    if (!result.ok) return res.status(404).json({ error: result.error || 'Introuvable' });
    console.log('[admin] activate-pro', id, 'days=', parsed.data.durationDays, 'until=', result.user.proUntil);
    res.json({ ok: true, user: { id: result.user.id, plan: result.user.plan, proUntil: result.user.proUntil } });
  } catch (e) {
    next(e);
  }
});

router.post('/admin/users/:id/deactivate-pro', async (req, res, next) => {
  try {
    const id = decodeURIComponent(String(req.params.id || ''));
    const result = await userService.deactivatePro(id);
    if (!result.ok) return res.status(404).json({ error: result.error || 'Introuvable' });
    console.log('[admin] deactivate-pro', id);
    res.json({ ok: true, user: { id: result.user.id, plan: result.user.plan, proUntil: result.user.proUntil } });
  } catch (e) {
    next(e);
  }
});

router.post('/admin/users/:id/reset-free', async (req, res, next) => {
  try {
    const id = decodeURIComponent(String(req.params.id || ''));
    const result = await userService.resetFreeQuota(id);
    if (!result.ok) return res.status(404).json({ error: result.error || 'Introuvable' });
    console.log('[admin] reset-free', id);
    res.json({ ok: true, user: { id: result.user.id, freeDuerpUsed: result.user.freeDuerpUsed } });
  } catch (e) {
    next(e);
  }
});

router.post('/admin/users/:id/mark-interest', async (req, res, next) => {
  try {
    const id = decodeURIComponent(String(req.params.id || ''));
    const result = await userService.markInterestPro(id);
    if (!result.ok) return res.status(404).json({ error: result.error || 'Introuvable' });
    res.json({ ok: true, user: { id: result.user.id, interestPro: result.user.interestPro } });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
