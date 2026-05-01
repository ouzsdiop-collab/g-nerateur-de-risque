const router = require('express').Router();
const { z } = require('zod');
const { saveTrackEvent } = require('../services/storage.service');
const userService = require('../services/user.service');

const TrackSchema = z.object({
  event: z.string().min(1).max(96),
  date: z.string().optional(),
  userId: z.string().max(200).optional().nullable(),
  sessionId: z.string().max(200).optional().nullable(),
  duerpGeneratedCount: z.coerce.number().int().min(0).max(999999).optional().nullable(),
  email: z.string().max(200).optional().nullable()
});

router.post('/track', async (req, res, next) => {
  try {
    const parsed = TrackSchema.parse(req.body);
    const row = {
      event: parsed.event,
      date: parsed.date || new Date().toISOString(),
      userId: parsed.userId || null,
      sessionId: parsed.sessionId || null,
      duerpGeneratedCount: parsed.duerpGeneratedCount != null ? parsed.duerpGeneratedCount : null,
      receivedAt: new Date().toISOString()
    };
    await saveTrackEvent(row);
    if (parsed.userId) {
      try {
        await userService.touchFromTrack({
          userId: parsed.userId,
          duerpGeneratedCount: parsed.duerpGeneratedCount,
          email: parsed.email
        });
      } catch (e) {
        console.warn('touchFromTrack:', e.message);
      }
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: 'Payload invalide.' });
    }
    next(err);
  }
});

module.exports = router;
