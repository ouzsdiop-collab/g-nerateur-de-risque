const router = require('express').Router();
const { z } = require('zod');
const { saveWaitlistEntry } = require('../services/storage.service');

const WaitlistSchema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
  date: z.string().optional()
});

router.post('/waitlist', async (req, res, next) => {
  try {
    const parsed = WaitlistSchema.parse(req.body);
    const entry = {
      email: parsed.email.trim().toLowerCase(),
      source: parsed.source || 'generator_pro_interest',
      date: parsed.date || new Date().toISOString()
    };
    await saveWaitlistEntry(entry);
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Email invalide.' });
    }
    next(err);
  }
});

module.exports = router;
