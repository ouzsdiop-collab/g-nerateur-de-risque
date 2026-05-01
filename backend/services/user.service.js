const fs = require('fs/promises');
const path = require('path');

const USERS_FILE = path.join(__dirname, '..', 'data', 'app_users.json');

function isProUser(user) {
  if (!user || user.plan !== 'pro') return false;
  if (!user.proUntil) return false;
  const t = new Date(user.proUntil).getTime();
  if (Number.isNaN(t)) return false;
  return t > Date.now();
}

async function readUsers() {
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.users)) return [];
    return data.users.map((row) => normalizeUser(row)).filter((u) => u.id);
  } catch {
    return [];
  }
}

async function writeUsers(users) {
  await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify({ users }, null, 2));
}

function normalizeUser(row) {
  const now = new Date().toISOString();
  return {
    id: String(row.id || '').slice(0, 220),
    email: String(row.email || '').trim().slice(0, 200),
    plan: row.plan === 'pro' ? 'pro' : 'free',
    proUntil: row.proUntil == null ? null : String(row.proUntil),
    freeDuerpUsed: Math.max(0, Number(row.freeDuerpUsed) || 0),
    createdAt: row.createdAt || now,
    lastActiveAt: row.lastActiveAt || now,
    duerpCount: Math.max(0, Number(row.duerpCount) || 0),
    interestPro: !!row.interestPro,
    quotaGenAnchor: row.quotaGenAnchor == null ? null : Math.max(0, Number(row.quotaGenAnchor) || 0)
  };
}

function recomputeFreeUsed(u) {
  if (isProUser(u)) return;
  const anchor = u.quotaGenAnchor != null ? u.quotaGenAnchor : 0;
  u.freeDuerpUsed = Math.max(0, (u.duerpCount || 0) - anchor);
}

async function ensureUser(visitorId, email) {
  const id = String(visitorId || '').trim().slice(0, 220);
  if (!id) return null;
  const users = await readUsers();
  let u = users.find((x) => x.id === id);
  const now = new Date().toISOString();
  if (!u) {
    u = normalizeUser({
      id,
      email: email || '',
      plan: 'free',
      proUntil: null,
      freeDuerpUsed: 0,
      createdAt: now,
      lastActiveAt: now,
      duerpCount: 0,
      interestPro: false,
      quotaGenAnchor: null
    });
    users.push(u);
    await writeUsers(users);
    return u;
  }
  if (email && email.includes('@')) {
    u.email = String(email).trim().slice(0, 200);
  }
  await writeUsers(users);
  return u;
}

async function touchFromTrack({ userId, duerpGeneratedCount, email }) {
  const id = String(userId || '').trim().slice(0, 220);
  if (!id) return;
  const users = await readUsers();
  let u = users.find((x) => x.id === id);
  const now = new Date().toISOString();
  const dc = duerpGeneratedCount != null ? Math.max(0, parseInt(duerpGeneratedCount, 10) || 0) : 0;
  if (!u) {
    u = normalizeUser({
      id,
      email: email && email.includes('@') ? email : '',
      plan: 'free',
      proUntil: null,
      freeDuerpUsed: 0,
      createdAt: now,
      lastActiveAt: now,
      duerpCount: dc,
      interestPro: false,
      quotaGenAnchor: null
    });
    recomputeFreeUsed(u);
    users.push(u);
    await writeUsers(users);
    return;
  }
  u.lastActiveAt = now;
  if (email && String(email).includes('@')) u.email = String(email).trim().slice(0, 200);
  u.duerpCount = Math.max(u.duerpCount || 0, dc);
  recomputeFreeUsed(u);
  await writeUsers(users);
}

async function mergeEntitlementsPayload(visitorId, email, duerpGeneratedCount) {
  const u = await ensureUser(visitorId, email);
  if (!u) return null;
  if (duerpGeneratedCount != null) {
    const dc = Math.max(0, parseInt(duerpGeneratedCount, 10) || 0);
    u.duerpCount = Math.max(u.duerpCount || 0, dc);
  }
  recomputeFreeUsed(u);
  const users = await readUsers();
  const idx = users.findIndex((x) => x.id === u.id);
  if (idx >= 0) {
    users[idx] = u;
    await writeUsers(users);
  }
  return u;
}

async function listUsersForAdmin() {
  const users = await readUsers();
  return users
    .map((u) => ({
      id: u.id,
      email: u.email || '',
      plan: u.plan,
      proUntil: u.proUntil,
      freeDuerpUsed: u.freeDuerpUsed,
      duerpCount: u.duerpCount,
      lastActiveAt: u.lastActiveAt,
      interestPro: !!u.interestPro
    }))
    .sort((a, b) => String(b.lastActiveAt).localeCompare(String(a.lastActiveAt)));
}

async function getUserById(id) {
  const users = await readUsers();
  return users.find((x) => x.id === id) || null;
}

async function saveUser(u) {
  const users = await readUsers();
  const idx = users.findIndex((x) => x.id === u.id);
  if (idx < 0) return false;
  users[idx] = u;
  await writeUsers(users);
  return true;
}

async function activatePro(id, durationDays) {
  const u = await getUserById(id);
  if (!u) return { ok: false, error: 'Introuvable' };
  const days = Math.min(36500, Math.max(1, parseInt(durationDays, 10) || 0));
  if (!days) return { ok: false, error: 'durationDays invalide' };
  const until = new Date();
  until.setUTCDate(until.getUTCDate() + days);
  u.plan = 'pro';
  u.proUntil = until.toISOString();
  recomputeFreeUsed(u);
  await saveUser(u);
  return { ok: true, user: u };
}

async function deactivatePro(id) {
  const u = await getUserById(id);
  if (!u) return { ok: false, error: 'Introuvable' };
  u.plan = 'free';
  u.proUntil = null;
  recomputeFreeUsed(u);
  await saveUser(u);
  return { ok: true, user: u };
}

async function resetFreeQuota(id) {
  const u = await getUserById(id);
  if (!u) return { ok: false, error: 'Introuvable' };
  u.quotaGenAnchor = u.duerpCount || 0;
  u.freeDuerpUsed = 0;
  await saveUser(u);
  return { ok: true, user: u };
}

async function markInterestPro(id) {
  const u = await getUserById(id);
  if (!u) return { ok: false, error: 'Introuvable' };
  u.interestPro = true;
  await saveUser(u);
  return { ok: true, user: u };
}

module.exports = {
  isProUser,
  readUsers,
  ensureUser,
  touchFromTrack,
  mergeEntitlementsPayload,
  listUsersForAdmin,
  getUserById,
  activatePro,
  deactivatePro,
  resetFreeQuota,
  markInterestPro
};
