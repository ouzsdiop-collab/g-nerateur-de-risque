const nodemailer = require('nodemailer');

/** Destinataire interne des alertes lead DUERP (équivalent historique LEAD_RECEIVER_EMAIL). */
function getLeadsToEmail() {
  return (process.env.LEADS_TO_EMAIL || process.env.LEAD_RECEIVER_EMAIL || '').trim();
}

function isEmailConfigured() {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    getLeadsToEmail()
  );
}

async function notifyOwner(record) {
  if (!isEmailConfigured()) return { skipped: true, reason: 'SMTP non configuré' };
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  const fromAddr = (process.env.MAIL_FROM || process.env.SMTP_USER || '').trim();
  const toAddr = getLeadsToEmail();
  const subject = `Nouveau lead DUERP ${record.temperature.toUpperCase()} — ${record.company}`;
  const text = `Nouveau lead DUERP\n\nEntreprise: ${record.company}\nContact: ${record.name}\nEmail: ${record.email}\nPays: ${record.country}\nSecteur: ${record.sector}\nEffectif: ${record.employees}\nScore: ${record.score}%\nRisques critiques: ${record.criticalRisks}\nTempérature: ${record.temperature}\nBesoin: ${record.need}\nDate: ${record.createdAt}`;
  const mailOpts = {
    from: `"QHSE Control" <${fromAddr}>`,
    to: toAddr,
    subject,
    text
  };
  const leadEmail = (record.email || '').trim();
  if (leadEmail) {
    mailOpts.replyTo = leadEmail;
  } else if (process.env.MAIL_REPLY_TO) {
    mailOpts.replyTo = process.env.MAIL_REPLY_TO.trim();
  }
  await transporter.sendMail(mailOpts);
  return { skipped: false };
}

module.exports = { notifyOwner, isEmailConfigured, getLeadsToEmail };
