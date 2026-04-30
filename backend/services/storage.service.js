const fs = require('fs/promises');
const path = require('path');
const { getSupabase } = require('../config/supabase');
const DATA_FILE = path.join(__dirname, '..', 'data', 'leads.json');
const WAITLIST_FILE = path.join(__dirname, '..', 'data', 'waitlist.json');
const ANALYTICS_FILE = path.join(__dirname, '..', 'data', 'analytics_events.json');
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
async function readLocalWaitlist() {
  try {
    return JSON.parse(await fs.readFile(WAITLIST_FILE, 'utf8'));
  } catch {
    return [];
  }
}
async function saveWaitlistEntry(entry) {
  await fs.mkdir(path.dirname(WAITLIST_FILE), { recursive: true });
  const list = await readLocalWaitlist();
  list.unshift(entry);
  await fs.writeFile(WAITLIST_FILE, JSON.stringify(list, null, 2));
  return entry;
}
async function readAnalyticsEvents() {
  try {
    return JSON.parse(await fs.readFile(ANALYTICS_FILE, 'utf8'));
  } catch {
    return [];
  }
}
async function saveTrackEvent(row) {
  await fs.mkdir(path.dirname(ANALYTICS_FILE), { recursive: true });
  const list = await readAnalyticsEvents();
  list.unshift(row);
  await fs.writeFile(ANALYTICS_FILE, JSON.stringify(list, null, 2));
  return row;
}
module.exports = { saveLead, readLocalLeads, saveWaitlistEntry, readLocalWaitlist, saveTrackEvent, readAnalyticsEvents };
