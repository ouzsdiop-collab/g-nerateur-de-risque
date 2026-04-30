const router = require('express').Router();
const publicKey = require('../middleware/publicKey');
const { suggestRisks } = require('../controllers/riskSuggestions.controller');

router.post('/risk-suggestions', publicKey, suggestRisks);

module.exports = router;
