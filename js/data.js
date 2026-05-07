// =====================================================================
// data.js — load, normalize, score, and map signals to playbook themes.
// All client-side; no backend.
// =====================================================================

const DATA_FILES = [
  './data/data.json',
  './data/auto_data.json',
  './data/intel_briefs.json',
  './data/market_overlay.json',
  './data/initiative-taxonomy.v1.json'
];

// ---- Theme mapping: every signal maps to 0..N playbook themes -----
// Themes: tokenized | stablecoins | dlt
const THEME_MAP_INITIATIVE = {
  'Tokenized Securities / RWA':   ['tokenized'],
  'Stablecoins & Deposit Tokens': ['stablecoins'],
  'Stablecoins':                  ['stablecoins'],
  'Cross-Border Payments':        ['stablecoins'],
  'Payment Infrastructure':       ['stablecoins', 'dlt'],
  'CBDC':                         ['stablecoins'],
  'DLT / Blockchain Infrastructure': ['dlt'],
  'Settlement Infrastructure':    ['dlt'],
  'Interoperability & Standards': ['dlt'],
  'DeFi':                         ['dlt'],
  'Crypto / Digital Assets':      [],
  'Digital Asset Strategy':       [],
  'Leadership & Governance':      [],
  'Regulatory / Compliance':      [],
};

const THEMES = {
  tokenized: {
    id: 'tokenized',
    label: 'Tokenized Funds & RWAs',
    short: 'Tokenized',
    color: 'var(--color-theme-tokenized)',
    cssClass: 'theme-tag--tokenized',
    description: 'Tokenized money market funds, Treasuries, credit, and other real-world assets brought on-chain.',
    href: '#/playbooks/tokenized'
  },
  stablecoins: {
    id: 'stablecoins',
    label: 'Stablecoins & Settlement',
    short: 'Stablecoins',
    color: 'var(--color-theme-stablecoins)',
    cssClass: 'theme-tag--stablecoins',
    description: 'On-chain cash, deposit tokens, regulated stablecoins, and settlement rails for institutional flows.',
    href: '#/playbooks/stablecoins'
  },
  dlt: {
    id: 'dlt',
    label: 'Market Infrastructure & DLT',
    short: 'DLT & Infra',
    color: 'var(--color-theme-dlt)',
    cssClass: 'theme-tag--dlt',
    description: 'DLT in clearing, settlement, custody, and collateral — how FMIs and large banks modernize the plumbing.',
    href: '#/playbooks/dlt'
  }
};

// Institution categories — align to the 6 canonical institution_type classes,
// not the rougher `category` field. Aliases below absorb singletons (e.g.
// "Central Banks & Regulators" → regulators) so nothing is silently dropped.
const CATEGORY_LABELS = {
  global_banks:           { label: 'Global Banks', color: 'var(--color-cat-banks)' },
  asset_management:       { label: 'Asset Management', color: 'var(--color-cat-asset)' },
  payments:               { label: 'Payments', color: 'var(--color-cat-payments)' },
  exchanges_intermediaries: { label: 'Exchanges & Intermediaries', color: 'var(--color-cat-exchanges)' },
  regulators:             { label: 'Regulators', color: 'var(--color-cat-regulators)' },
  infrastructure:         { label: 'Infrastructure & Tech', color: 'var(--color-cat-ecosystem)' },
  intel_briefs:           { label: 'Intelligence Briefs', color: 'var(--color-primary)' }
};

// Map signal.institution_type → canonical category id used in CATEGORY_LABELS.
// Falls back to derive from signal.category when institution_type is absent.
function canonicalCategory(signal) {
  const it = signal.institution_type || '';
  if (it === 'Global Banks') return 'global_banks';
  if (it === 'Asset & Investment Management') return 'asset_management';
  if (it === 'Payments Providers' || it === 'Payment Service Providers' || it === 'Global Payment Networks') return 'payments';
  if (it === 'Exchanges & Central Intermediaries' || it === 'Exchanges & Trading Venues' || it === 'Financial Infrastructure Operators') return 'exchanges_intermediaries';
  if (it === 'Regulatory Agencies' || it === 'Central Banks & Regulators') return 'regulators';
  if (it === 'Infrastructure & Technology' || it === 'Digital Asset Infrastructure' || it === 'Financial Services & Credit Rating Agencies') return 'infrastructure';
  // Fallback: legacy category field
  const c = signal.category || '';
  if (c === 'global_banks') return 'global_banks';
  if (c === 'asset_management') return 'asset_management';
  if (c === 'payments') return 'payments';
  if (c === 'exchanges_intermediaries' || c === 'exchanges') return 'exchanges_intermediaries';
  if (c === 'regulators' || c === 'central_banks') return 'regulators';
  if (c === 'ecosystem' || c === 'financial_infrastructure' || c === 'digital_asset_services' || c === 'global_financial_services' || c === 'financial_services') return 'infrastructure';
  if (c === 'intel_briefs') return 'intel_briefs';
  return 'infrastructure';
}

// =====================================================================
// SCORING — derive importance tier from existing fields.
// Inputs available per signal:
//   signal_type, institution_type, fmi_areas, initiative_types, date,
//   importance_score (optional — if present, prefer it)
// Output:
//   tier: Structural | Material | Context | Noise
//   score: 0–100
// =====================================================================
const STRUCTURAL_SIGNAL_TYPES = new Set([
  'Platform / Infrastructure',
  'Strategic Initiative',
  'Investment / M&A',
  'Strategic Filing / Plan',
  'Regulatory / Compliance Framework',
  'Regulatory Action',
  'Infrastructure Upgrade'
]);
const MATERIAL_SIGNAL_TYPES = new Set([
  'Product Launch',
  'Strategic Partnership',
  'Pilot / Trial',
  'Leadership & Governance',
  'Intelligence Brief'
]);

const STRUCTURAL_INSTITUTION_TYPES = new Set([
  'Regulatory Agencies',
  'Central Banks & Regulators',
  'Global Banks',
  'Financial Infrastructure Operators',
  'Exchanges & Central Intermediaries'
]);

function computeTierAndScore(signal) {
  // Calibrated to target ~10% Structural / ~25% Material / ~50% Context / ~15% Noise.
  // Base by signal_type
  let score = 22;
  const st = signal.signal_type || '';
  if (STRUCTURAL_SIGNAL_TYPES.has(st)) score = 42;
  else if (MATERIAL_SIGNAL_TYPES.has(st)) score = 30;
  else if (st === 'Research / Report') score = 26;

  // 2. Institution type modifier (tight)
  if (STRUCTURAL_INSTITUTION_TYPES.has(signal.institution_type)) score += 6;
  if (signal.institution_type === 'Infrastructure & Technology' || signal.institution_type === 'Digital Asset Infrastructure') score -= 4;  // ecosystem noise tax

  // 3. FMI breadth
  if (Array.isArray(signal.fmi_areas) && signal.fmi_areas.length >= 2) score += 4;

  // 4. Tier-1 institution names — modest boost only
  const institution = (signal.institution || '').toLowerCase();
  const tier1 = ['bis', 'federal reserve', 'ecb', 'sec', 'cftc', 'bank of england', 'fca', 'esma', 'jpmorgan', 'blackrock', 'fidelity', 'goldman sachs', 'bny mellon', 'state street', 'visa', 'mastercard', 'swift', 'dtcc', 'nyse', 'nasdaq', 'morgan stanley', 'citigroup', 'hsbc'];
  if (tier1.some(t => institution.includes(t))) score += 6;

  // 5. Initiative coverage
  const inits = Array.isArray(signal.initiative_types) ? signal.initiative_types.length : 0;
  if (inits === 0) score -= 12;
  else if (inits >= 3) score += 4;
  else if (inits >= 2) score += 2;

  // 6. Recency: aggressive decay for older signals
  const days = daysSince(signal.date);
  if (days !== null) {
    if (days <= 14)       score += 8;
    else if (days <= 30)  score += 4;
    else if (days <= 90)  score += 0;
    else if (days <= 180) score -= 3;
    else if (days <= 365) score -= 6;
    else                  score -= 12;
  } else {
    score -= 6;  // unparseable date — discount
  }

  // 7. Auto-generated single-line items (often news rather than substantive moves) — small discount
  if (signal.auto_generated && (signal.description || '').length < 250 && !STRUCTURAL_INSTITUTION_TYPES.has(signal.institution_type)) {
    score -= 4;
  }

  // 8. Existing importance_score override
  if (typeof signal.importance_score === 'number' && signal.importance_score > 0) {
    score = Math.round(signal.importance_score);
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Tier thresholds
  let tier;
  if (score >= 58) tier = 'Structural';
  else if (score >= 44) tier = 'Material';
  else if (score >= 22) tier = 'Context';
  else tier = 'Noise';

  return { tier, score };
}

// Use latest signal date as the "today" anchor — keeps relative dates meaningful
// even when the deployed prototype is opened months after data refresh.
let _todayAnchor = null;
function setTodayAnchor(d) { _todayAnchor = d; }
function getTodayAnchor() {
  if (_todayAnchor) return _todayAnchor;
  return new Date();
}

function parseFlexibleDate(s) {
  if (!s || typeof s !== 'string') return null;
  // ISO (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.slice(0, 10));
    return isNaN(d) ? null : d;
  }
  // Try direct Date parse for things like "January 9, 2026"
  let d = new Date(s);
  if (!isNaN(d.getTime()) && d.getFullYear() > 2015 && d.getFullYear() < 2040) return d;
  // Patterns like "Q3 2025" → mid-quarter
  const qm = s.match(/^Q([1-4])\s+(\d{4})/);
  if (qm) {
    const month = (parseInt(qm[1], 10) - 1) * 3 + 1;
    return new Date(`${qm[2]}-${String(month).padStart(2, '0')}-15`);
  }
  // Patterns like "September 2025" → mid-month
  const ym = s.match(/^([A-Za-z]+)\s+(\d{4})/);
  if (ym) {
    const test = new Date(`${ym[1]} 15, ${ym[2]}`);
    if (!isNaN(test.getTime())) return test;
  }
  // Find the FIRST year mentioned (treat as the original publish year, not the latest one cited).
  // Year-only fallback resolves to mid-year (Jul 1) of the FIRST year mentioned, which is
  // conservative for vague labels like "2024 (expanded through 2025-2026)".
  const firstYear = s.match(/\b(19|20)\d{2}\b/);
  if (firstYear) {
    const y = parseInt(firstYear[0], 10);
    return new Date(`${y}-07-01`);
  }
  return null;
}

function daysSince(dateStr) {
  const d = parseFlexibleDate(dateStr);
  if (!d) return null;
  return Math.floor((getTodayAnchor().getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// =====================================================================
// THEME RESOLUTION — what playbook themes does this signal map to?
// =====================================================================
function resolveThemes(signal) {
  const seen = new Set();
  for (const init of (signal.initiative_types || [])) {
    const themes = THEME_MAP_INITIATIVE[init];
    if (themes) themes.forEach(t => seen.add(t));
  }
  // FMI-area heuristics for signals with empty initiative_types
  if (seen.size === 0) {
    const fmis = (signal.fmi_areas || []).join(' ').toLowerCase();
    if (fmis.includes('settlement') || fmis.includes('clearing') || fmis.includes('custody') || fmis.includes('collateral')) seen.add('dlt');
    if (fmis.includes('payment') || fmis.includes('stablecoin') || fmis.includes('digital currency')) seen.add('stablecoins');
    if (fmis.includes('tokeniz') || fmis.includes('rwa')) seen.add('tokenized');
  }
  // Description text fallback
  if (seen.size === 0) {
    const text = ((signal.description || '') + ' ' + (signal.initiative || '')).toLowerCase();
    if (text.includes('tokeniz') || text.includes('rwa') || text.includes('treasur')) seen.add('tokenized');
    if (text.includes('stablecoin') || text.includes('deposit token') || text.includes('settlement')) seen.add('stablecoins');
    if (text.includes('blockchain') || text.includes('dlt') || text.includes('distributed ledger') || text.includes('post-trade')) seen.add('dlt');
  }
  return Array.from(seen);
}

// =====================================================================
// PERSONA — which audiences should care most about this signal?
// =====================================================================
const PERSONA_RELEVANCE = {
  // each persona scored 0-3 based on signal characteristics
  fintech: (s) => {
    let n = 1;
    if (['Infrastructure & Technology', 'Digital Asset Infrastructure'].includes(s.institution_type)) n += 2;
    if ((s.initiative_types || []).some(i => ['DLT / Blockchain Infrastructure', 'Payment Infrastructure', 'Stablecoins & Deposit Tokens'].includes(i))) n += 1;
    return n;
  },
  asset_managers: (s) => {
    let n = 1;
    if (s.institution_type === 'Asset & Investment Management') n += 2;
    if ((s.initiative_types || []).some(i => ['Tokenized Securities / RWA', 'Crypto / Digital Assets'].includes(i))) n += 1;
    return n;
  },
  banks_fmis: (s) => {
    let n = 1;
    if (['Global Banks', 'Exchanges & Central Intermediaries', 'Financial Infrastructure Operators', 'Payments Providers', 'Global Payment Networks'].includes(s.institution_type)) n += 2;
    if ((s.initiative_types || []).some(i => ['DLT / Blockchain Infrastructure', 'Settlement Infrastructure', 'Stablecoins & Deposit Tokens', 'Payment Infrastructure'].includes(i))) n += 1;
    return n;
  },
  policy_risk: (s) => {
    let n = 1;
    if (['Regulatory Agencies', 'Central Banks & Regulators'].includes(s.institution_type)) n += 2;
    if (s.signal_type === 'Regulatory Action' || s.signal_type === 'Regulatory / Compliance Framework') n += 1;
    return n;
  }
};

const PERSONAS = {
  all:            { id: 'all',            label: 'All roles' },
  fintech:        { id: 'fintech',        label: 'Fintech Product & Strategy' },
  asset_managers: { id: 'asset_managers', label: 'Asset Managers / Institutional Investors' },
  banks_fmis:     { id: 'banks_fmis',     label: 'Banks & FMIs / Operations & Infra' },
  policy_risk:    { id: 'policy_risk',    label: 'Policy / Risk / Regulatory' }
};

// =====================================================================
// "Why this matters" generator (persona-aware)
// =====================================================================
function whyThisMatters(signal, persona = 'all') {
  const inst = signal.institution || 'This institution';
  const types = (signal.initiative_types || []).slice(0, 2).join(', ') || 'digital asset strategy';
  const fmis  = (signal.fmi_areas || []).slice(0, 2).join(' and ') || 'institutional infrastructure';
  const tier  = signal._tier;
  const horizon = tier === 'Structural'
    ? 'over the next 12–24 months'
    : tier === 'Material' ? 'over the next 6–18 months' : 'in current market context';
  const personaLens = {
    all:           `For institutions tracking ${types}, this is a ${tier.toLowerCase()} signal that resets execution assumptions for ${fmis} ${horizon}.`,
    fintech:       `For fintech and infrastructure providers, ${inst}'s move clarifies where institutional budgets and integration mandates are landing for ${types}.`,
    asset_managers:`For asset managers and institutional investors, this changes what is feasible — and approvable — for ${types} ${horizon}.`,
    banks_fmis:    `For banks, custodians, and FMIs, this shifts the practical roadmap for ${fmis} and the standards your peers will operate against.`,
    policy_risk:   `For policy, risk, and compliance functions, this is a supervisory and control-perimeter signal: how regulators and counterparties expect ${types} to be governed.`
  };
  return personaLens[persona] || personaLens.all;
}

// =====================================================================
// STABLE ID — every signal needs a slug for routing
// =====================================================================
function makeId(signal, idx) {
  const seed = (signal.institution || '') + '-' + (signal.initiative || '') + '-' + (signal.date || '') + '-' + idx;
  // simple non-crypto hash → base36
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h) ^ seed.charCodeAt(i);
  return Math.abs(h).toString(36);
}

// =====================================================================
// PUBLIC API
// =====================================================================
const SftSData = {
  signals: [],
  briefs: [],
  overlays: [],
  taxonomy: null,
  byId: new Map(),
  themes: THEMES,
  personas: PERSONAS,
  categoryLabels: CATEGORY_LABELS,
  loaded: false,
  loadPromise: null,

  async load() {
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      const [manual, auto, briefs, overlays, taxonomy] = await Promise.all(
        DATA_FILES.map(f => fetch(f).then(r => r.json()).catch(() => null))
      );
      // First pass: find latest date across all signals; use as "today" anchor.
      const all_raw = [...(manual || []), ...(auto || [])];
      let latest = null;
      for (const s of all_raw) {
        const d = parseFlexibleDate(s.date);
        if (d && (!latest || d > latest)) latest = d;
      }
      if (latest) setTodayAnchor(latest);
      // Second pass: normalize
      const all = [];
      (manual || []).forEach((s, i) => all.push(this._normalize(s, 'manual', i)));
      (auto   || []).forEach((s, i) => all.push(this._normalize(s, 'auto',   i)));
      this.signals = all;
      this.signals.forEach(s => this.byId.set(s._id, s));
      this.briefs = briefs || [];
      this.overlays = (overlays && overlays.overlays) ? overlays.overlays : [];
      this.taxonomy = taxonomy || null;
      this.todayAnchor = latest;
      this.loaded = true;
    })();
    return this.loadPromise;
  },

  _normalize(s, source, idx) {
    const out = Object.assign({}, s);
    out._source = source;
    out._id = makeId(s, source === 'auto' ? idx + 100000 : idx);
    out._themes = resolveThemes(s);
    out._category = canonicalCategory(s);  // canonical institution category id
    const sc = computeTierAndScore(s);
    out._tier = sc.tier;
    out._score = sc.score;
    out._daysOld = daysSince(s.date);
    return out;
  },

  byTheme(themeId) {
    return this.signals.filter(s => s._themes.includes(themeId));
  },

  byInstitutionCategory(cat) {
    if (cat === 'all') return this.signals;
    return this.signals.filter(s => s._category === cat);
  },

  related(signal, max = 5) {
    // related = same theme + closest score + not the same id
    const themes = signal._themes;
    const related = this.signals
      .filter(s => s._id !== signal._id)
      .filter(s => themes.length === 0 || s._themes.some(t => themes.includes(t)))
      .map(s => {
        let aff = 0;
        if (s.institution === signal.institution) aff += 4;
        if (s.institution_type === signal.institution_type) aff += 2;
        for (const t of (s.initiative_types || [])) if ((signal.initiative_types || []).includes(t)) aff += 1;
        const tierWeight = s._tier === 'Structural' ? 3 : s._tier === 'Material' ? 2 : 1;
        aff += tierWeight;
        const recency = s._daysOld !== null ? Math.max(0, 30 - s._daysOld) / 30 : 0;
        aff += recency * 2;
        return { s, aff };
      })
      .sort((a, b) => b.aff - a.aff)
      .slice(0, max)
      .map(x => x.s);
    return related;
  },

  themeStats(themeId) {
    const list = this.byTheme(themeId);
    const structural = list.filter(s => s._tier === 'Structural').length;
    const material = list.filter(s => s._tier === 'Material').length;
    const recent14 = list.filter(s => s._daysOld !== null && s._daysOld <= 14).length;
    return { total: list.length, structural, material, recent14 };
  },

  overlayForTheme(themeId) {
    const themeKey = themeId === 'tokenized' ? 'tokenizedFunds' : themeId === 'stablecoins' ? 'stablecoins' : 'dlt';
    return this.overlays.filter(o => o.theme === themeKey);
  },

  getPersonaRelevance(signal, persona) {
    const fn = PERSONA_RELEVANCE[persona];
    return fn ? fn(signal) : 1;
  },

  whyThisMatters,
  daysSince,

  THEMES, PERSONAS, CATEGORY_LABELS
};

window.SftSData = SftSData;
