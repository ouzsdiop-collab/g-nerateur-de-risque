function normalizeScore(score) {
  if (typeof score === 'string') score = parseInt(score.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
}
function leadTemperature({ score, criticalCount, employees, sector }) {
  let points = 0;
  if (criticalCount >= 3) points += 4; else if (criticalCount >= 1) points += 2;
  if (score && score < 70) points += 3; else if (score && score < 85) points += 1;
  if (employees >= 100) points += 2; else if (employees >= 20) points += 1;
  if (['mines', 'btp', 'industrie', 'petrole', 'logistique'].includes(String(sector || '').toLowerCase())) points += 1;
  if (points >= 8) return 'chaud';
  if (points >= 5) return 'moyen';
  return 'froid';
}
module.exports = { normalizeScore, leadTemperature };
