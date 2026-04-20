import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import OpenAI from "openai";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3008;
const aiEnabled = Boolean(process.env.OPENAI_API_KEY);

const openai = aiEnabled
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/** Autorise notamment Origin: null (page ouverte en file:// qui appelle l’API sur localhost). */
app.use(cors({ origin: "*" }));
/** PDF joint en base64 — limite relevée pour usage interne/B2B raisonnable */
app.use(express.json({ limit: "15mb" }));
app.use(express.static(__dirname));

const MAX_CALLS = 4;
const sessionUsage = new Map();
const leadsFile = path.join(__dirname, "leads.json");

function safeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sectorHumanLabel(code) {
  const map = {
    mine: "Mine / carrière",
    btp: "BTP / chantier",
    industrie: "Industrie / production",
    maintenance: "Maintenance industrielle",
    logistique: "Logistique / entrepôt"
  };
  return map[code] || (code ? code : "non précisé");
}

/** Email hors domaines grand public → +points scoring */
function isLikelyProfessionalEmail(email) {
  const lower = safeString(email).toLowerCase();
  const at = lower.indexOf("@");
  if (at < 0) return false;
  const domain = lower.slice(at + 1);
  const free = [
    "gmail.com",
    "googlemail.com",
    "yahoo.fr",
    "yahoo.com",
    "hotmail.fr",
    "hotmail.com",
    "outlook.fr",
    "outlook.com",
    "live.fr",
    "live.com",
    "icloud.com",
    "me.com",
    "msn.com",
    "laposte.net",
    "free.fr",
    "orange.fr",
    "wanadoo.fr",
    "proton.me",
    "protonmail.com"
  ];
  return !free.includes(domain);
}

/** Scoring simple lead B2B (0–100) + température */
function scoreLeadPayload(body) {
  let pts = 0;
  const criticalCount = Number(body.criticalCount) || 0;
  const rawGs = Number(body.score);
  const globalScore = Number.isFinite(rawGs) ? rawGs : 100;
  const company = safeString(body.company);
  const email = safeString(body.email);
  const planGenerated =
    body.planGenerated === true ||
    body.planGenerated === "true" ||
    body.planGenerated === 1;

  if (criticalCount >= 1) pts += 30;
  if (globalScore < 80) pts += 20;
  if (company.length >= 2) pts += 20;
  if (isLikelyProfessionalEmail(email)) pts += 20;
  if (planGenerated) pts += 10;

  const leadScore = Math.min(100, Math.max(0, pts));
  let leadTemperature = "froid";
  if (leadScore >= 65) leadTemperature = "chaud";
  else if (leadScore >= 40) leadTemperature = "moyen";

  return { leadScore, leadTemperature };
}

function getSessionId(req) {
  return safeString(req.body.sessionId) || safeString(req.headers["x-session-id"]) || req.ip;
}

function getUsage(sessionId) {
  return sessionUsage.get(sessionId) || 0;
}

function incrementUsage(sessionId) {
  const next = getUsage(sessionId) + 1;
  sessionUsage.set(sessionId, next);
  return next;
}

function remainingCalls(sessionId) {
  return Math.max(0, MAX_CALLS - getUsage(sessionId));
}

function ensureLeadFile() {
  try {
    if (!fs.existsSync(leadsFile)) {
      fs.writeFileSync(leadsFile, "[]", "utf8");
    }
  } catch (err) {
    console.error("ensureLeadFile:", err);
    throw err;
  }
}

/** Réinitialise leads.json à [] en cas de fichier corrompu ou vide illisible */
function resetLeadsFileToEmpty() {
  try {
    fs.writeFileSync(leadsFile, "[]", "utf8");
  } catch (err) {
    console.error("resetLeadsFileToEmpty:", err);
    throw err;
  }
}

function readLeadsArray() {
  try {
    ensureLeadFile();
    let raw = "";
    try {
      raw = fs.readFileSync(leadsFile, "utf8");
    } catch (readErr) {
      console.error("readLeadsArray read:", readErr);
      resetLeadsFileToEmpty();
      return [];
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      resetLeadsFileToEmpty();
      return [];
    }
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (parseErr) {
      console.error("readLeadsArray JSON invalide — fichier réinitialisé:", parseErr);
      resetLeadsFileToEmpty();
      return [];
    }
    if (!Array.isArray(parsed)) {
      console.error("readLeadsArray: contenu non tableau — réinitialisation");
      resetLeadsFileToEmpty();
      return [];
    }
    return parsed;
  } catch (err) {
    console.error("readLeadsArray:", err);
    return [];
  }
}

function writeLeadsArray(arr) {
  if (!Array.isArray(arr)) {
    throw new Error("writeLeadsArray: attendu un tableau");
  }
  try {
    fs.writeFileSync(leadsFile, JSON.stringify(arr, null, 2), "utf8");
  } catch (err) {
    console.error("writeLeadsArray:", err);
    throw err;
  }
}

function appendLeadSafe(lead) {
  const existing = readLeadsArray();
  existing.push(lead);
  writeLeadsArray(existing);
}

function escapeHtmlEmail(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildLeadNotificationText(lead) {
  const sectorLabel = sectorHumanLabel(safeString(lead.sector));
  const lines = [
    "Nouveau lead — outil diagnostic QHSE",
    "",
    `Nom : ${safeString(lead.name) || "—"}`,
    `Email : ${safeString(lead.email) || "—"}`,
    `Entreprise : ${safeString(lead.company) || "—"}`,
    `Secteur : ${sectorLabel}`,
    `Site : ${safeString(lead.site) || "—"}`,
    `Activité : ${safeString(lead.activity) || "—"}`,
    `Score global : ${lead.score ?? 0}`,
    `Nombre de risques : ${lead.riskCount ?? 0}`,
    `Risques critiques : ${lead.criticalCount ?? 0}`,
    `Température lead : ${safeString(lead.leadTemperature) || "—"} (score ${lead.leadScore ?? "—"}/100)`,
    `Date de création : ${safeString(lead.createdAt) || "—"}`,
    "",
    `ID : ${safeString(lead.id) || "—"}`
  ];
  return lines.join("\n");
}

function buildLeadNotificationHtml(lead) {
  const sectorLabel = escapeHtmlEmail(sectorHumanLabel(safeString(lead.sector)));
  const row = (label, value) =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;width:180px;vertical-align:top">${escapeHtmlEmail(
      label
    )}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827">${value}</td></tr>`;

  const v = escapeHtmlEmail;
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"></head>
<body style="font-family:Segoe UI,Inter,Helvetica,Arial,sans-serif;line-height:1.5;color:#111827;margin:0;padding:24px;background:#f3f4f6">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
    <h1 style="margin:0 0 20px;font-size:18px;font-weight:700;color:#111827">Nouveau lead QHSE Control</h1>
    <table style="width:100%;border-collapse:collapse">${row(
      "Nom",
      v(safeString(lead.name) || "—")
    )}${row("Email", v(safeString(lead.email) || "—"))}${row(
      "Entreprise",
      v(safeString(lead.company) || "—")
    )}${row("Secteur", sectorLabel)}${row("Site", v(safeString(lead.site) || "—"))}${row(
      "Activité",
      v(safeString(lead.activity) || "—")
    )}${row("Score global", String(lead.score ?? 0))}${row(
      "Nombre de risques",
      String(lead.riskCount ?? 0)
    )}${row("Risques critiques", String(lead.criticalCount ?? 0))}${row(
      "Température lead",
      `${v(safeString(lead.leadTemperature) || "—")} (${v(String(lead.leadScore ?? "—"))}/100)`
    )}${row("Date de création", v(safeString(lead.createdAt) || "—"))}</table>
    <p style="margin:16px 0 0;font-size:12px;color:#6b7280">ID : ${v(safeString(lead.id) || "—")}</p>
  </div>
</body></html>`;
}

function isLeadNotifyConfigured() {
  const to = safeString(process.env.NOTIFY_EMAIL_TO);
  const host = safeString(process.env.SMTP_HOST);
  const user = safeString(process.env.SMTP_USER);
  const pass = safeString(process.env.SMTP_PASS);
  const from = safeString(process.env.SMTP_FROM);
  return Boolean(to && host && user && pass && from);
}

let notifyTransporter = null;

function getNotifyTransporter() {
  if (notifyTransporter) return notifyTransporter;
  const port = Number(process.env.SMTP_PORT) || 587;
  notifyTransporter = nodemailer.createTransport({
    host: safeString(process.env.SMTP_HOST),
    port,
    secure: port === 465,
    auth: {
      user: safeString(process.env.SMTP_USER),
      pass: safeString(process.env.SMTP_PASS)
    }
  });
  return notifyTransporter;
}

/**
 * Envoie une notification interne pour un lead déjà persisté.
 * Ne lance pas d’erreur vers l’appelant : journalise uniquement en cas d’échec.
 */
async function sendLeadNotificationEmail(lead) {
  if (!isLeadNotifyConfigured()) {
    return;
  }
  try {
    const transporter = getNotifyTransporter();
    const to = safeString(process.env.NOTIFY_EMAIL_TO);
    const from = safeString(process.env.SMTP_FROM);
    await transporter.sendMail({
      from,
      to,
      subject: "Nouveau lead QHSE Control",
      text: buildLeadNotificationText(lead),
      html: buildLeadNotificationHtml(lead)
    });
  } catch (err) {
    console.error(
      "[sendLeadNotificationEmail] Échec envoi email notification lead:",
      err?.message || err
    );
  }
}

function buildLeadClientText(lead, hasAttachment) {
  const name = safeString(lead.name);
  const company = safeString(lead.company);
  const criticalCount = Number(lead.criticalCount) || 0;
  const riskCount = Number(lead.riskCount) || 0;
  const score = Number(lead.score) || 0;
  const sector = sectorHumanLabel(safeString(lead.sector));
  const greet = name ? `Bonjour ${name},` : "Bonjour,";
  const attachLine = hasAttachment
    ? "Votre plan d'action HSE est en pièce jointe."
    : "Votre plan d'action HSE a été généré — vous pouvez le retrouver dans le document téléchargé.";
  let diagLine = "";
  if (criticalCount >= 1 && company) {
    diagLine = `Sur les ${riskCount} risque${riskCount > 1 ? "s" : ""} identifiés pour ${company}, ${criticalCount} ${criticalCount > 1 ? "sont classés critiques" : "est classé critique"} (score global : ${score}/100).`;
  } else if (riskCount >= 1 && company) {
    diagLine = `Le diagnostic de ${company} fait ressortir ${riskCount} point${riskCount > 1 ? "s" : ""} à traiter (score global : ${score}/100).`;
  }
  let urgencyLine = "";
  if (criticalCount >= 2) {
    urgencyLine = `Avec ${criticalCount} risques critiques, les premières actions terrain ne peuvent pas attendre — le plan joint vous donne les priorités pour les 7 prochains jours.`;
  } else if (criticalCount === 1) {
    urgencyLine = "Le risque critique identifié demande une action rapide. Le plan joint vous donne le cap pour les 7 prochains jours.";
  } else {
    urgencyLine = "Les points identifiés sont à traiter avant qu'ils ne deviennent critiques. Le plan joint vous donne une feuille de route claire.";
  }
  return [
    greet, "",
    attachLine, "",
    diagLine, "",
    urgencyLine, "",
    "---", "",
    "La vraie difficulté, ce n'est pas de savoir quoi faire.",
    `C'est de s'assurer que chaque action est assignée, datée et suivie — surtout en ${sector} où les équipes terrain changent vite.`, "",
    "C'est exactement ce que QHSE Control permet : un tableau de bord centralisé où chaque risque devient une action tracée, avec responsable et échéance.", "",
    "Si vous voulez voir comment ça fonctionne sur un cas concret (30 min, sans engagement) :",
    "Répondez à ce mail avec « DÉMO » et je vous propose un créneau cette semaine.", "",
    "— L'équipe QHSE Control",
    "qhsecontrol@outlook.com"
  ].join("\n");
}

function buildLeadClientHtml(lead, hasAttachment) {
  const v = escapeHtmlEmail;
  const name = safeString(lead.name);
  const company = safeString(lead.company);
  const criticalCount = Number(lead.criticalCount) || 0;
  const riskCount = Number(lead.riskCount) || 0;
  const score = Number(lead.score) || 0;
  const sector = sectorHumanLabel(safeString(lead.sector));
  const greet = name ? `Bonjour ${v(name)},` : "Bonjour,";
  const attachLine = hasAttachment
    ? "Votre plan d'action HSE est en pièce jointe."
    : "Votre plan d'action HSE a été généré — vous pouvez le retrouver dans le document téléchargé.";
  let diagLine = "";
  if (criticalCount >= 1 && company) {
    diagLine = `Sur les <strong>${riskCount} risque${riskCount > 1 ? "s" : ""}</strong> identifiés pour <strong>${v(company)}</strong>, <strong style="color:#b91c1c">${criticalCount} ${criticalCount > 1 ? "sont classés critiques" : "est classé critique"}</strong> (score global&nbsp;: <strong>${score}/100</strong>).`;
  } else if (riskCount >= 1 && company) {
    diagLine = `Le diagnostic de <strong>${v(company)}</strong> fait ressortir <strong>${riskCount} point${riskCount > 1 ? "s" : ""}</strong> à traiter (score global&nbsp;: <strong>${score}/100</strong>).`;
  }
  let urgencyLine = "";
  if (criticalCount >= 2) {
    urgencyLine = `Avec ${criticalCount} risques critiques, les premières actions terrain ne peuvent pas attendre — le plan joint vous donne les priorités pour les <strong>7 prochains jours</strong>.`;
  } else if (criticalCount === 1) {
    urgencyLine = "Le risque critique identifié demande une action rapide. Le plan joint vous donne le cap pour les <strong>7 prochains jours</strong>.";
  } else {
    urgencyLine = "Les points identifiés sont à traiter avant qu'ils ne deviennent critiques. Le plan joint vous donne une feuille de route claire.";
  }
  const criticalBanner = criticalCount >= 1
    ? `<div style="margin:20px 0;padding:14px 18px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:14px;color:#991b1b">⚠️ <strong>${criticalCount} risque${criticalCount > 1 ? "s critiques détectés" : " critique détecté"}</strong> — action terrain prioritaire requise.</div>`
    : "";
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Segoe UI,Inter,Helvetica,Arial,sans-serif;line-height:1.6;color:#1e293b;margin:0;padding:24px;background:#f1f5f9">
  <div style="max-width:580px;margin:0 auto">
    <div style="background:#0f766e;border-radius:10px 10px 0 0;padding:18px 28px">
      <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-.02em">QHSE Control</span>
      <span style="font-size:12px;color:#99f6e4;font-weight:500;margin-left:16px">Plan d'action HSE</span>
    </div>
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:28px 32px">
      <p style="margin:0 0 18px;font-size:15px;font-weight:600">${greet}</p>
      <p style="margin:0 0 14px;font-size:14px;color:#475569">${v(attachLine)}</p>
      ${diagLine ? `<p style="margin:0 0 14px;font-size:14px">${diagLine}</p>` : ""}
      ${criticalBanner}
      <p style="margin:0 0 20px;font-size:14px">${urgencyLine}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
      <p style="margin:0 0 10px;font-size:14px;color:#475569">La vraie difficulté, ce n'est pas de savoir quoi faire.<br>C'est de s'assurer que chaque action est <strong>assignée, datée et suivie</strong> — surtout en <strong>${v(sector)}</strong> où les équipes terrain changent vite.</p>
      <p style="margin:0 0 20px;font-size:14px;color:#475569">C'est exactement ce que <strong>QHSE Control</strong> permet : un tableau de bord centralisé où chaque risque devient une action tracée, avec responsable et échéance.</p>
      <div style="background:#f0fdf9;border:1px solid #99f6e4;border-radius:10px;padding:20px 24px;margin-bottom:24px">
        <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#0f766e">Voir QHSE Control en action sur votre secteur (30 min, sans engagement)</p>
        <p style="margin:0 0 14px;font-size:13px;color:#475569">Répondez à cet email avec <strong>« DÉMO »</strong> et je vous propose un créneau cette semaine.</p>
        <a href="mailto:qhsecontrol@outlook.com?subject=D%C3%89MO%20QHSE%20Control&body=Bonjour%2C%20je%20souhaite%20voir%20une%20d%C3%A9mo%20de%20QHSE%20Control."
           style="display:inline-block;background:#0f766e;color:#ffffff;font-size:14px;font-weight:700;padding:12px 22px;border-radius:8px;text-decoration:none">
          Demander une démo →
        </a>
      </div>
      <p style="margin:0;font-size:13px;color:#94a3b8">— L'équipe QHSE Control · <a href="mailto:qhsecontrol@outlook.com" style="color:#0f766e">qhsecontrol@outlook.com</a></p>
    </div>
  </div>
</body></html>`;
}

/**
 * Email au prospect — échec journalisé uniquement (ne pas bloquer le flux métier).
 * @param {object} lead - au minimum email, optionnellement name
 * @param {{ attachment?: Buffer, filename?: string }} [opts]
 */
async function sendLeadClientEmail(lead, opts) {
  opts = opts || {};
  if (!isLeadNotifyConfigured()) {
    console.warn(
      "[sendLeadClientEmail] SMTP non configuré — email prospect ignoré."
    );
    return false;
  }
  const to = safeString(lead.email);
  if (!to) {
    console.error("[sendLeadClientEmail] Email destinataire manquant.");
    return false;
  }
  try {
    const transporter = getNotifyTransporter();
    const from = safeString(process.env.SMTP_FROM);
    const attachments =
      opts.attachment &&
      Buffer.isBuffer(opts.attachment) &&
      opts.attachment.length > 0
        ? [
            {
              filename: safeString(opts.filename) || "synthese_hse.pdf",
              content: opts.attachment,
              contentType: "application/pdf"
            }
          ]
        : [];
    const hasAttachment = attachments.length > 0;
    await transporter.sendMail({
      from,
      to,
      subject: "Votre plan d’action HSE",
      text: buildLeadClientText(lead, hasAttachment),
      html: buildLeadClientHtml(lead, hasAttachment),
      attachments
    });
    return true;
  } catch (err) {
    console.error(
      "[sendLeadClientEmail] Échec envoi email prospect :",
      err?.message || err
    );
    return false;
  }
}

/** Parse JSON from model output (strip markdown fences if present) */
function extractJsonObject(text) {
  if (!text || typeof text !== "string") return null;
  let t = text.trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (fence) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

const FALLBACK_PLAN_STRUCTURED = {
  immediate:
    "- Boucler la zone critique avant reprise travaux\n- Nommer un pilote terrain pour la journée\n- Contrôler EPI portés par équipe présente",
  shortTerm:
    "- Fixer une date de revue sous 30 jours sur les causes racines\n- Ajouter point sécurité au briefing quotidien",
  prevention:
    "- Photo / croquis du réglage avant/après pour éviter récidive\n- Ré-audit rapide après changement de méthode",
  vigilance:
    "- Surveiller en priorité la zone à plus fort score G×P jusqu’à preuve du réglage",
  recommendation:
    "- Sans suivi structuré (actions datées, responsables, états), le plan redescend vite : trace tout dans un outil type QHSE Control."
};

function normalizePlanStructured(raw) {
  if (!raw || typeof raw !== "object") return null;
  const o = {
    immediate: safeString(raw.immediate) || safeString(raw.priorite_immediate),
    shortTerm: safeString(raw.shortTerm) || safeString(raw.court_terme),
    prevention: safeString(raw.prevention) || safeString(raw.prevention_stabilisation),
    vigilance: safeString(raw.vigilance) || safeString(raw.point_de_vigilance),
    recommendation: safeString(raw.recommendation) || safeString(raw.recommandation_finale)
  };
  const hasContent = Object.values(o).some(Boolean);
  return hasContent ? o : null;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, aiEnabled, maxCalls: MAX_CALLS });
});

app.post("/api/leads", (req, res) => {
  try {
    const lead = {
      createdAt: new Date().toISOString(),
      sessionId: safeString(req.body.sessionId),
      company: safeString(req.body.company),
      name: safeString(req.body.name),
      email: safeString(req.body.email),
      site: safeString(req.body.site),
      activity: safeString(req.body.activity),
      sector: safeString(req.body.sector),
      riskCount: Number(req.body.riskCount) || 0,
      score: Number(req.body.score) || 0,
      criticalCount: Number(req.body.criticalCount) || 0,
      source: "risk-tool"
    };

    if (!lead.company || !lead.name || !lead.email) {
      return res.status(400).json({ error: "Missing required lead fields." });
    }

    appendLeadSafe(lead);
    return res.json({ ok: true });
  } catch (error) {
    console.error("Lead save error:", error);
    return res.status(500).json({ error: "Unable to save lead." });
  }
});

/** Capture lead + scoring — utilisé avant export PDF */
app.post("/api/save-lead", (req, res) => {
  try {
    const email = safeString(req.body.email);
    const company = safeString(req.body.company);

    if (!email || !company) {
      return res.status(400).json({
        success: false,
        error: "Email et entreprise sont obligatoires."
      });
    }

    const { leadScore, leadTemperature } = scoreLeadPayload(req.body);

    const lead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      name: safeString(req.body.name),
      email,
      company,
      sector: safeString(req.body.sector),
      site: safeString(req.body.site),
      activity: safeString(req.body.activity),
      score: Number(req.body.score) || 0,
      riskCount: Number(req.body.riskCount) || 0,
      criticalCount: Number(req.body.criticalCount) || 0,
      planGenerated:
        req.body.planGenerated === true ||
        req.body.planGenerated === "true" ||
        req.body.planGenerated === 1,
      leadScore,
      leadTemperature,
      sessionId: safeString(req.body.sessionId),
      source: "risk-tool-pdf",
      createdAt: new Date().toISOString()
    };

    appendLeadSafe(lead);
    void sendLeadNotificationEmail(lead);
    /** Scoring interne — ne jamais renvoyer au client */
    return res.json({
      success: true,
      id: lead.id
    });
  } catch (error) {
    console.error("/api/save-lead erreur:", error);
    return res.status(500).json({
      success: false,
      error: "Impossible d'enregistrer le lead sur le serveur."
    });
  }
});


/** Demande de démo depuis le générateur */
app.post("/api/demo-request", async (req, res) => {
  try {
    const email = safeString(req.body.email);
    const company = safeString(req.body.company);

    if (!email || !company) {
      return res.status(400).json({
        success: false,
        error: "Email et entreprise sont obligatoires."
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Adresse email invalide."
      });
    }

    const { leadScore, leadTemperature } = scoreLeadPayload(req.body);
    const lead = {
      id: `demo_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      name: safeString(req.body.name),
      email,
      phone: safeString(req.body.phone),
      company,
      sector: safeString(req.body.sector),
      site: safeString(req.body.site),
      activity: safeString(req.body.activity),
      score: Number(req.body.score) || 0,
      riskCount: Number(req.body.riskCount) || 0,
      criticalCount: Number(req.body.criticalCount) || 0,
      planGenerated:
        req.body.planGenerated === true ||
        req.body.planGenerated === "true" ||
        req.body.planGenerated === 1,
      leadScore: Math.min(100, leadScore + 10),
      leadTemperature: leadScore >= 55 ? "chaud" : leadTemperature,
      sessionId: safeString(req.body.sessionId),
      source: "demo-request",
      createdAt: new Date().toISOString()
    };

    appendLeadSafe(lead);
    void sendLeadNotificationEmail(lead);
    const clientEmailSent = await sendLeadClientEmail(lead);

    return res.json({ success: true, id: lead.id, clientEmailSent });
  } catch (error) {
    console.error("/api/demo-request erreur:", error);
    return res.status(500).json({
      success: false,
      error: "Impossible d'enregistrer la demande de démo."
    });
  }
});

/**
 * Envoi email prospect après génération PDF (pièce jointe si fournie).
 * Échec SMTP : journalisé ; réponse 200 pour ne pas casser le flux téléchargement.
 */
app.post("/api/send-lead-client-email", async (req, res) => {
  try {
    const email = safeString(req.body.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Adresse email invalide."
      });
    }

    let attachment = null;
    const rawB64 = req.body.pdfBase64;
    if (rawB64 != null && typeof rawB64 === "string" && rawB64.trim()) {
      try {
        attachment = Buffer.from(rawB64.trim(), "base64");
        const maxPdf = 12 * 1024 * 1024;
        if (attachment.length === 0 || attachment.length > maxPdf) {
          console.warn(
            "[send-lead-client-email] PDF invalide ou trop volumineux — envoi sans pièce jointe."
          );
          attachment = null;
        }
      } catch (e) {
        console.error(
          "[send-lead-client-email] Décodage PDF impossible :",
          e?.message || e
        );
        attachment = null;
      }
    }

    const leadLite = {
      name: safeString(req.body.name),
      email,
      company: safeString(req.body.company),
      sector: safeString(req.body.sector),
      score: Number(req.body.score) || 0,
      criticalCount: Number(req.body.criticalCount) || 0,
      riskCount: Number(req.body.riskCount) || 0
    };

    const ok = await sendLeadClientEmail(leadLite, {
      attachment,
      filename: safeString(req.body.pdfFilename) || "synthese_hse.pdf"
    });

    return res.json({ success: true, clientEmailSent: ok });
  } catch (error) {
    console.error("/api/send-lead-client-email erreur:", error?.message || error);
    /** Ne pas bloquer le front après téléchargement réussi */
    return res.json({ success: true, clientEmailSent: false });
  }
});

/** Middleware protection admin — routes internes uniquement */
function requireAdminToken(req, res, next) {
  const adminToken = safeString(process.env.ADMIN_TOKEN);
  if (!adminToken) {
    // Si ADMIN_TOKEN non configuré, bloquer par défaut
    return res.status(403).json({ ok: false, error: "Route non disponible." });
  }
  const provided =
    safeString(req.headers["x-admin-token"]) ||
    safeString(req.query.token);
  if (provided !== adminToken) {
    return res.status(403).json({ ok: false, error: "Accès non autorisé." });
  }
  next();
}

/** Liste des leads (usage interne / export rapide) */
app.get("/api/leads", requireAdminToken, (_req, res) => {
  try {
    const list = readLeadsArray();
    res.json({ ok: true, count: list.length, leads: list });
  } catch (error) {
    console.error("GET /api/leads:", error);
    res.status(500).json({ ok: false, error: "Impossible de lire les leads." });
  }
});

/** Export CSV simple */
app.get("/api/leads/export.csv", requireAdminToken, (_req, res) => {
  try {
    const list = readLeadsArray();
    const headers = [
      "id",
      "createdAt",
      "name",
      "email",
      "company",
      "sector",
      "site",
      "score",
      "riskCount",
      "criticalCount",
      "leadScore",
      "leadTemperature",
      "planGenerated"
    ];
    const escapeCsv = val => {
      const s = val == null ? "" : String(val);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows = list.map(l =>
      headers.map(h => escapeCsv(l[h])).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="leads_qhse_export.csv"'
    );
    res.send("\ufeff" + csv);
  } catch (error) {
    console.error("GET /api/leads/export.csv:", error);
    res.status(500).send("Erreur export CSV");
  }
});

/**
 * Proposition IA uniquement — le client applique après validation humaine.
 * Le quota est consommé lorsque l’appel IA (ou fallback) réussit : coût API réel.
 */
app.post("/api/enhance-risk", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    if (getUsage(sessionId) >= MAX_CALLS) {
      return res.status(429).json({ error: "Quota IA atteint", remaining: 0 });
    }

    const sector = safeString(req.body.sector);
    const zone = safeString(req.body.zone);
    const label = safeString(req.body.label);
    const activity = safeString(req.body.activity);
    const site = safeString(req.body.site);

    if (!label) {
      return res.status(400).json({ error: "Missing risk label." });
    }

    if (!aiEnabled) {
      const proposal = {
        label,
        cause: "Cause à confirmer sur le terrain avec l’équipe.",
        measure:
          "Mettre en place une mesure corrective adaptée au contexte réel (circulation, consigne, EPI).",
        gravity: 3,
        probability: 3
      };
      incrementUsage(sessionId);
      return res.json({
        proposal,
        remaining: remainingCalls(sessionId),
        fallback: true
      });
    }

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: `Tu es un chef HSE / QHSE terrain (Afrique francophone comprise).
Style : phrases courtes, terrain, sans jargon juridique, sans généralités.

RÈGLE ABSOLUE — ADAPTATION AU SECTEUR :
Le message utilisateur indique un secteur métier (mine, BTP, industrie, maintenance, logistique).
Tu DOIS adapter le vocabulaire, les causes probables et les mesures à CE secteur (pas un discours générique).

Repères :
- Mine / carrière : circulation engins & piétons, fosses/stériles, tir, poussières silice, explosifs, ventilation.
- BTP / chantier : travaux en hauteur, échafaudages, garde-corps, LT-CT, levage, GC, terrassements.
- Industrie / production : carters machines, consignation énergétique, chimie, bruit, interfaces opérateur-machine.
- Maintenance industrielle : LOTO, permis d’intervention, espace confiné, pièces chaudes, reprise d’énergie.
- Logistique / entrepôt : quais, chariots, manutention, stockage, circulation poids lourds.

Réponds UNIQUEMENT avec un JSON valide :
{"label":"","cause":"","measure":"","gravity":3,"probability":3}
gravité et probabilité : entiers de 1 à 5.
La mesure doit être immédiatement applicable sur le terrain de CE secteur.`
        },
        {
          role: "user",
          content: `Contexte terrain — adapte ta réponse au secteur indiqué ci-dessous.
Secteur : ${sectorHumanLabel(sector)} (code: ${sector || "—"})
Site : ${site || "non précisé"}
Zone : ${zone || "non précisée"}
Activité : ${activity || "non précisée"}

Risque brut saisi par l’utilisateur : ${label}`
        }
      ]
    });

    const text = response.output_text?.trim();
    let parsed = extractJsonObject(text);
    if (!parsed || typeof parsed !== "object") {
      parsed = {};
    }

    incrementUsage(sessionId);

    const proposal = {
      label: safeString(parsed.label) || label,
      cause: safeString(parsed.cause) || "À préciser après observation terrain.",
      measure: safeString(parsed.measure) || "Définir une mesure avec le responsable de zone.",
      gravity: Math.min(5, Math.max(1, Number(parsed.gravity) || 3)),
      probability: Math.min(5, Math.max(1, Number(parsed.probability) || 3))
    };

    return res.json({
      proposal,
      remaining: remainingCalls(sessionId)
    });
  } catch (error) {
    console.error("Enhance risk error:", error);
    return res.status(500).json({ error: "Server error while enhancing risk." });
  }
});

app.post("/api/global-plan", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    if (getUsage(sessionId) >= MAX_CALLS) {
      return res.status(429).json({ error: "Quota IA atteint", remaining: 0 });
    }

    const sector = safeString(req.body.sector);
    const activity = safeString(req.body.activity);
    const risks = Array.isArray(req.body.risks) ? req.body.risks : [];

    if (!risks.length) {
      return res.status(400).json({ error: "Missing risks list." });
    }

    if (!aiEnabled) {
      incrementUsage(sessionId);
      const structured = { ...FALLBACK_PLAN_STRUCTURED };
      return res.json({
        planStructured: structured,
        plan: formatPlanAsText(structured),
        remaining: remainingCalls(sessionId),
        fallback: true
      });
    }

    const risksListForPrompt = risks
      .map(
        r =>
          `- ${safeString(r.label)} (G${Number(r.gravity) || 3} P${Number(r.probability) || 3})`
      )
      .join("\n");

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: `Tu es un RESPONSABLE HSE SENIOR sur site industriel en Afrique (mine, BTP, industrie, maintenance, logistique).

Tu travailles sous contrainte : production, délais, équipes parfois petites, moyens limités.

MISSION : produire un PLAN D’ACTION IMMÉDIAT qui pousse à l’action dans les 24-48h, pas un document de comité.

RÈGLES ABSOLUES :
- Phrases très courtes. Chaque ligne (sauf "vigilance" un peu plus libre) = une action terrain.
- Verbes d’action en tête : Installer, Séparer, Former, Boucler, Contrôler, Barrer, Marquer, Couper, etc.
- Zéro théorie. Zéro jargon inutile. Pas de juridisme.
- INTERDIT (formulations vagues) : "mettre en place", "assurer la sécurité", "renforcer la communication" sans dire quoi/où/qui.
- Sois DIRECTIF : qui/quoi/où possible en une ligne.

ADAPTATION SECTEUR (non négociable) :
- Mine : circulation engins/piétons, fosses, tir, poussières, gaz, explosifs…
- BTP : échafaudage, garde-corps, LT-CT, GC, levage, tranchées…
- Industrie : consignation, carters, chimie, bruit, interfaces opérateur…
- Maintenance : LOTO, permis, consignation, zones actives…
- Logistique : quais, chariots, manutention, stockage, circulation PL…

REMPLISSAGE DES CLÉS JSON :
- "immediate" : MAXIMUM 3 lignes d’actions critiques sur 0-7 jours (texte multi-lignes, chaque ligne commence souvent par un tiret "- ")
- "shortTerm" : actions organisationnelles simples ~30 jours, lignes courtes
- "prevention" : éviter répétition (audit flash, consigne écrite, marquage sol…)
- "vigilance" : le risque ou point le PLUS DANGEREUX à surveiller (2-5 lignes max)
- "recommendation" : pourquoi un suivi structuré (dates, responsables, état d’avancement) est nécessaire — 2-4 lignes

SORTIE : réponds UNIQUEMENT avec un JSON valide EXACTEMENT aux clés :
{
  "immediate": "",
  "shortTerm": "",
  "prevention": "",
  "vigilance": "",
  "recommendation": ""
}

Chaque valeur en français. Pour les listes, utilise des lignes avec préfixe "- ".

EXEMPLES DE BONNES LIGNES :
- Installer balisage zone chargement quai 3
- Séparer flux engins et piétons sur rampe Nord
- Former opérateurs 15 min avant prise de poste`
        },
        {
          role: "user",
          content: `CONTEXTE TERRAIN
Secteur : ${sectorHumanLabel(sector)} (code : ${sector || "—"})
Activité : ${activity || "non précisée"}

RISQUES IDENTIFIÉS :
${risksListForPrompt}

Produis le JSON. Le lecteur doit avoir l’impression de devoir agir demain matin. Pas de plan générique.`
        }
      ]
    });

    incrementUsage(sessionId);

    const text = response.output_text?.trim();
    let structured = normalizePlanStructured(extractJsonObject(text));
    if (!structured) {
      structured = { ...FALLBACK_PLAN_STRUCTURED };
      structured.recommendation +=
        "\n\n(Détail IA : reformulation automatique indisponible — compléter sur le terrain.)";
    }

    return res.json({
      planStructured: structured,
      plan: formatPlanAsText(structured),
      remaining: remainingCalls(sessionId)
    });
  } catch (error) {
    console.error("Global plan error:", error);
    return res.status(500).json({ error: "Server error while generating plan." });
  }
});

function formatPlanAsText(s) {
  return [
    "PRIORITÉ IMMÉDIATE (0–7 JOURS)",
    s.immediate,
    "",
    "ACTIONS COURT TERME (≈30 JOURS)",
    s.shortTerm,
    "",
    "PRÉVENTION / STABILISATION",
    s.prevention,
    "",
    "POINT DE VIGILANCE",
    s.vigilance,
    "",
    "RECOMMANDATION FINALE",
    s.recommendation
  ].join("\n");
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
