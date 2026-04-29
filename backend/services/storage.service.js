const fs = require('fs/promises');
const path = require('path');
const { getSupabase } = require('../config/supabase');
const DATA_FILE = path.join(__dirname, '..', 'data', 'leads.json');
async function readLocalLeads() { try { return JSON.parse(await fs.readFile(DATA_FILE, 'utf8')); } catch { return []; } }
async function writeLocalLead(record) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const leads = await readLocalLeads();
  leads.unshift(record);
  await fs.writeFile(DATA_FILE, JSON.stringify(leads, null, 2));
  return record;
}
async function saveLead(record) {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('duerp_leads').insert({
      id: record.id, email: record.email, company: record.company, contact_name: record.name,
      sector: record.sector, country: record.country, employees: record.employees,
      score: record.score, critical_risks: record.criticalRisks, temperature: record.temperature,
      payload: record, created_at: record.createdAt
    });
    if (!error) return record;
    console.warn('Supabase insert failed, fallback JSON:', error.message);
  }
  return writeLocalLead(record);
}
module.exports = { saveLead, readLocalLeads };
