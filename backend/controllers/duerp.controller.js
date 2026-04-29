const crypto = require('crypto');
const { z } = require('zod');
const { saveLead, readLocalLeads } = require('../services/storage.service');
const { notifyOwner } = require('../services/email.service');
const { normalizeScore, leadTemperature } = require('../services/scoring.service');
const LeadSchema = z.object({ lead: z.record(z.any()).optional(), duerp: z.record(z.any()).optional(), source: z.string().optional(), appVersion: z.string().optional() }).passthrough();
function getEmployees(v) {
  if (typeof v === 'number') return v;
  const s = String(v || '');
  if (s === 'moins20') return 19; if (s === '20-99') return 85; if (s === '100-499') return 220; if (s === '500plus') return 500;
  const n = parseInt(s.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}
exports.captureLead = async (req, res, next) => {
  try {
    const body = LeadSchema.parse(req.body);
    const lead = body.lead || body;
    const duerp = body.duerp || body.duerpPayload || {};
    const score = normalizeScore(lead.score || lead.globalScore || duerp.score);
    const criticalRisks = Number(lead.criticalRisks || lead.risques_critiques || duerp.critical_count || 0);
    const employees = getEmployees(lead.employees || lead.effectif || (duerp.company && duerp.company.workforce));
    const sector = lead.sector || lead.secteur || (duerp.company && duerp.company.sector) || 'non précisé';
    const record = {
      id: lead.id || crypto.randomUUID(), source: body.source || lead.source || 'duerp_generator', appVersion: body.appVersion || 'unknown',
      email: lead.email || lead.contactEmail || '', name: lead.name || lead.contactName || '',
      company: lead.company || lead.entreprise || (duerp.company && duerp.company.name) || 'Entreprise non précisée',
      country: lead.country || lead.pays || (duerp.meta && duerp.meta.country) || 'non précisé',
      sector, employees, score, criticalRisks,
      temperature: leadTemperature({ score, criticalCount: criticalRisks, employees, sector }),
      need: lead.need || 'diagnostic', duerp, rawLead: lead, createdAt: new Date().toISOString()
    };
    await saveLead(record);
    const emailStatus = await notifyOwner(record).catch(err => ({ skipped: true, error: err.message }));
    res.status(201).json({ ok: true, leadId: record.id, temperature: record.temperature, emailStatus });
  } catch (err) { next(err); }
};
exports.listLeads = async (_req, res, next) => {
  try { const leads = await readLocalLeads(); res.json({ ok: true, count: leads.length, leads }); }
  catch (err) { next(err); }
};
