const router = require('express').Router();
const publicKey = require('../middleware/publicKey');
const adminAuth = require('../middleware/adminAuth');
const controller = require('../controllers/duerp.controller');
router.get('/config', (req, res) => res.json({ publicKey: process.env.PUBLIC_API_KEY || '' }));
router.post('/duerp-leads', publicKey, controller.captureLead);
router.post('/generate', publicKey, controller.captureLead);
router.get('/leads', adminAuth, controller.listLeads);
module.exports = router;
