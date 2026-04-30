const { z } = require('zod');

const BodySchema = z.object({
  context: z.any().optional().default({}),
  consultantCharter: z.string().max(12000).optional().default('')
});

const DEFAULT_CHARTER = `Expert QHSE terrain (mines, pétrole & gaz, énergie, BTP, Afrique). 
Chaque risque : situation → cause → exposition → conséquence. Pas de formulations vagues (« risque de chute », « risque d'accident »). 
Pas de doublons. Répartir par unité de travail. Gravité et probabilité entières 1–5.`;

function clampInt(n, lo, hi) {
  const x = parseInt(n, 10);
  if (Number.isNaN(x)) return lo;
  return Math.min(hi, Math.max(lo, x));
}

function levelFromGp(gp) {
  if (gp >= 16) return 'critical';
  if (gp >= 7) return 'major';
  return 'moderate';
}

function parseOpenAiJson(content) {
  if (!content || typeof content !== 'string') return { risks: [] };
  let s = content.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  try {
    return JSON.parse(s);
  } catch {
    return { risks: [] };
  }
}

function normalizeRiskItem(raw, idx, allowedUnitNames) {
  const title = String(raw.title || raw.intitule || '').trim().slice(0, 220);
  const description = String(raw.description || raw.detail || '').trim().slice(0, 900);
  const unit = String(raw.unit || raw.unite || raw.unitName || '').trim().slice(0, 120);
  const category = String(raw.category || raw.categorie || 'physique').trim().toLowerCase();
  const severity = clampInt(raw.severity ?? raw.gravite, 1, 5);
  const probability = clampInt(raw.probability ?? raw.probabilite, 1, 5);
  const gp = severity * probability;
  const confRaw = raw.confidence;
  let confidence = 0.72;
  if (typeof confRaw === 'number' && !Number.isNaN(confRaw)) confidence = Math.min(1, Math.max(0, confRaw));
  else if (typeof confRaw === 'string') {
    const l = confRaw.toLowerCase();
    if (l.includes('élev') || l.includes('eleve')) confidence = 0.88;
    else if (l.includes('moyen')) confidence = 0.7;
  }

  let unitFinal = unit;
  if (allowedUnitNames.length && unitFinal) {
    const nu = unitFinal.toLowerCase();
    const match = allowedUnitNames.find((n) => n.toLowerCase() === nu)
      || allowedUnitNames.find((n) => nu.includes(n.toLowerCase()) || n.toLowerCase().includes(nu));
    if (match) unitFinal = match;
  }

  return {
    id: `ai_${Date.now()}_${idx}_${Math.random().toString(16).slice(2, 8)}`,
    unit: unitFinal,
    title: title || `Risque ${idx + 1}`,
    description: description || 'À préciser après visite terrain.',
    category,
    severity,
    probability,
    gp,
    level: levelFromGp(gp),
    source: 'ai_suggestion',
    confidence,
    isSelected: true,
    isEdited: false
  };
}

exports.suggestRisks = async (req, res, next) => {
  try {
    const parsed = BodySchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'Corps de requête invalide' });
    }
    const { context, consultantCharter } = parsed.data;
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return res.json({
        ok: true,
        risks: [],
        message: 'Aucune suggestion automatique disponible'
      });
    }

    const units = context.unités || context.unites || context.units || [];
    const unitNames = (Array.isArray(units) ? units : [])
      .map((u) => (u && (u.name || u.nom)) ? String(u.name || u.nom).trim() : '')
      .filter(Boolean);

    const userPayload = {
      activité: context.activité || context.activite || '',
      secteur: context.secteur || '',
      pays: context.pays || '',
      unités: unitNames.length ? unitNames : (context.unités || context.unites || []),
      tâches: context.tâches || context.taches || context.tasks || '',
      équipements: context.équipements || context.equipements || context.equipment || '',
      contraintes: context.contraintes || context.constraints || '',
      incidents: context.incidents || ''
    };

    const charter = (consultantCharter && consultantCharter.trim()) || DEFAULT_CHARTER;
    const system = `${charter}

Tu réponds UNIQUEMENT par un JSON valide (objet) avec la clé "risks" : tableau de 5 à 10 objets maximum.
Chaque objet doit avoir : "unit" (nom d'unité EXACTEMENT parmi la liste fournie — si une seule unité, tous les risques la portent), "title", "description" (une phrase ou deux, situation → cause → exposition → conséquence), "category" (une parmi : physique, chimique, biologique, thermique, ergonomique, psychosocial, electrique, incendie, environnement), "severity" (1-5), "probability" (1-5), optionnel "confidence" (0 à 1).
Aucun doublon de scénario. Langage consultant, précis, sans "risque de chute" ni "risque d'accident" génériques.`;

    const user = `Contexte JSON :\n${JSON.stringify(userPayload, null, 2)}\n\nListe stricte des noms d'unités autorisés pour le champ "unit" : ${JSON.stringify(unitNames.length ? unitNames : ['Unité principale'])}`;

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.warn('[risk-suggestions] OpenAI error', r.status, errText.slice(0, 500));
      return res.json({
        ok: true,
        risks: [],
        message: 'Aucune suggestion automatique disponible'
      });
    }

    const data = await r.json();
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const parsedOut = parseOpenAiJson(content);
    let list = parsedOut.risks || parsedOut.suggestions || parsedOut.items || [];
    if (!Array.isArray(list)) list = [];

    const allowed = unitNames.length ? unitNames : ['Unité principale'];
    const normalized = list
      .slice(0, 10)
      .map((item, i) => normalizeRiskItem(item, i, allowed))
      .filter((x) => x.title && x.title.length > 2);

    if (!normalized.length) {
      return res.json({
        ok: true,
        risks: [],
        message: 'Aucune suggestion automatique disponible'
      });
    }

    return res.json({ ok: true, risks: normalized });
  } catch (err) {
    console.warn('[risk-suggestions]', err.message);
    return res.json({
      ok: true,
      risks: [],
      message: 'Aucune suggestion automatique disponible'
    });
  }
};
