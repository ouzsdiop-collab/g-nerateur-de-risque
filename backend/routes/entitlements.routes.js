const router = require('express').Router();
const { z } = require('zod');
const userService = require('../services/user.service');

const BodySchema = z.object({
  visitorId: z.string().min(1).max(220),
  email: z.string().max(200).optional().nullable(),
  duerpGeneratedCount: z.coerce.number().int().min(0).max(999999).optional().nullable()
});

router.post('/entitlements', async (req, res, next) => {
  try {
    const parsed = BodySchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'Payload invalide.' });
    }
    const { visitorId, email, duerpGeneratedCount } = parsed.data;
    const u = await userService.mergeEntitlementsPayload(visitorId, email || '', duerpGeneratedCount);
    if (!u) return res.status(400).json({ ok: false, error: 'visitorId requis.' });
    const isPro = userService.isProUser(u);
    res.json({
      ok: true,
      plan: isPro ? 'pro' : 'free',
      proUntil: u.proUntil,
      freeDuerpUsed: isPro ? 0 : u.freeDuerpUsed,
      duerpCount: u.duerpCount,
      interestPro: !!u.interestPro,
      isPro
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
