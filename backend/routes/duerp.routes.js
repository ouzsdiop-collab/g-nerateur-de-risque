const router = require('express').Router();
const publicKey = require('../middleware/publicKey');
const requireAdmin = require('../middleware/requireAdmin');
const controller = require('../controllers/duerp.controller');
router.get('/config', (req, res) => res.json({ publicKey: process.env.PUBLIC_API_KEY || '' }));
router.post('/duerp-leads', publicKey, controller.captureLead);
router.post('/generate', publicKey, controller.captureLead);
router.get('/leads', requireAdmin, controller.listLeads);
module.exports = router;
