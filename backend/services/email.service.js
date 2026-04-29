const nodemailer = require('nodemailer');
function isEmailConfigured() { return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.LEAD_RECEIVER_EMAIL); }
async function notifyOwner(record) {
  if (!isEmailConfigured()) return { skipped: true, reason: 'SMTP non configuré' };
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  const subject = `Nouveau lead DUERP ${record.temperature.toUpperCase()} — ${record.company}`;
  const text = `Nouveau lead DUERP\n\nEntreprise: ${record.company}\nContact: ${record.name}\nEmail: ${record.email}\nPays: ${record.country}\nSecteur: ${record.sector}\nEffectif: ${record.employees}\nScore: ${record.score}%\nRisques critiques: ${record.criticalRisks}\nTempérature: ${record.temperature}\nBesoin: ${record.need}\nDate: ${record.createdAt}`;
  await transporter.sendMail({ from: process.env.SMTP_USER, to: process.env.LEAD_RECEIVER_EMAIL, subject, text });
  return { skipped: false };
}
module.exports = { notifyOwner };
