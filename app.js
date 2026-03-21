// ===== THEME TOGGLE =====
(function(){
  const t = document.querySelector('[data-theme-toggle]');
  const r = document.documentElement;
  let d = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  r.setAttribute('data-theme', d);
  if (t) {
    updateToggleIcon();
    t.addEventListener('click', () => {
      d = d === 'dark' ? 'light' : 'dark';
      r.setAttribute('data-theme', d);
      updateToggleIcon();
      // Rebuild charts with new colors
      if (window._chartsReady) buildCharts();
    });
  }
  function updateToggleIcon() {
    if (!t) return;
    t.innerHTML = d === 'dark'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }
})();

// ===== MOBILE MENU =====
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const headerNav = document.getElementById('headerNav');

mobileMenuBtn?.addEventListener('click', () => {
  headerNav?.classList.toggle('open');
});

document.querySelectorAll('#headerNav a').forEach(link => {
  link.addEventListener('click', () => {
    headerNav?.classList.remove('open');
  });
});

document.addEventListener('click', (event) => {
  if (!headerNav || !mobileMenuBtn) return;
  if (!headerNav.classList.contains('open')) return;

  const clickInsideNav = headerNav.contains(event.target);
  const clickToggle = mobileMenuBtn.contains(event.target);
  if (!clickInsideNav && !clickToggle) {
    headerNav.classList.remove('open');
  }
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    headerNav?.classList.remove('open');
  }
});

function toggleCollapsible(sectionSelector, bodyId) {
  const section = document.querySelector(sectionSelector);
  const body = document.getElementById(bodyId);
  if (!section || !body) return;

  if (section.classList.contains('open')) {
    section.classList.remove('open');
    body.style.display = 'none';
  } else {
    section.classList.add('open');
    body.style.display = 'block';
  }
}

function openCollapsible(sectionSelector, bodyId) {
  const section = document.querySelector(sectionSelector);
  const body = document.getElementById(bodyId);
  if (!section || !body) return;
  if (!section.classList.contains('open')) section.classList.add('open');
  body.style.display = 'block';
}

// ===== ANALYTICS TRACKING =====
function trackSectionToggle(sectionName, isOpen) {
  if (window.trackEvent) {
    window.trackEvent('section_toggle', {
      section_name: sectionName,
      action: isOpen ? 'expanded' : 'collapsed'
    });
  }
}

function trackMatrixCellClick(sector, initiative) {
  if (window.trackEvent) {
    window.trackEvent('matrix_cell_click', {
      sector: sector,
      initiative: initiative
    });
  }
}

function trackSearch(searchTerm, context) {
  if (window.trackEvent) {
    window.trackEvent('search', {
      search_term: searchTerm,
      context: context
    });
  }
}

function trackFilter(filterType, filterValue) {
  if (window.trackEvent) {
    window.trackEvent('filter_applied', {
      filter_type: filterType,
      filter_value: filterValue
    });
  }
}

function trackDrillDown(sourceSection, targetSection) {
  if (window.trackEvent) {
    window.trackEvent('drill_down', {
      from: sourceSection,
      to: targetSection
    });
  }
}

function getSignalKey(signal) {
  return `${String(signal.institution || '').trim()}|${String(signal.initiative || '').trim()}`.toLowerCase();
}

// ===== SIGNAL LIBRARY TOGGLE =====
document.getElementById('libraryToggle')?.addEventListener('click', () => {
  const section = document.querySelector('.signal-library-section');
  const isOpen = !section?.classList.contains('open');
  toggleCollapsible('.signal-library-section', 'libraryBody');
  trackSectionToggle('Signal Catalogue', isOpen);
});

document.getElementById('directoryToggle')?.addEventListener('click', () => {
  const section = document.querySelector('#directory');
  const isOpen = !section?.classList.contains('open');
  toggleCollapsible('#directory', 'directoryBody');
  trackSectionToggle('Institutional Directory', isOpen);
});

document.getElementById('analyticsToggle')?.addEventListener('click', () => {
  const section = document.querySelector('#analytics');
  const isOpen = !section?.classList.contains('open');
  toggleCollapsible('#analytics', 'analyticsBody');
  trackSectionToggle('Signal Charts', isOpen);
});

document.getElementById('signalStrengthToggle')?.addEventListener('click', () => {
  const section = document.querySelector('#signal-strength');
  const isOpen = !section?.classList.contains('open');
  toggleCollapsible('#signal-strength', 'signalStrengthBody');
  trackSectionToggle('Signal Strength', isOpen);
});

document.getElementById('signalScoringToggle')?.addEventListener('click', () => {
  const section = document.querySelector('#signal-scoring');
  const isOpen = !section?.classList.contains('open');
  toggleCollapsible('#signal-scoring', 'signalScoringBody');
  trackSectionToggle('Signal Scoring', isOpen);
});

document.getElementById('sourceQualityToggle')?.addEventListener('click', () => {
  const section = document.querySelector('#source-quality');
  const isOpen = !section?.classList.contains('open');
  toggleCollapsible('#source-quality', 'sourceQualityBody');
  if (isOpen) {
    setTimeout(renderSourceQualityDistribution, 100);
  }
  trackSectionToggle('Source Quality Distribution', isOpen);
});

document.getElementById('methodologyToggle')?.addEventListener('click', () => {
  const section = document.querySelector('#methodology');
  const isOpen = !section?.classList.contains('open');
  toggleCollapsible('#methodology', 'methodologyBody');
  trackSectionToggle('Methodology', isOpen);
});

document.getElementById('initiativeSchemaToggle')?.addEventListener('click', () => {
  const section = document.querySelector('.methodology-section .initiative-schema-section');
  const isOpen = !section?.classList.contains('open');
  toggleCollapsible('.methodology-section .initiative-schema-section', 'initiativeSchemaBody');
  trackSectionToggle('Initiative Schema', isOpen);
});

document.getElementById('fmiSchemaToggle')?.addEventListener('click', () => {
  const section = document.querySelector('.fmi-schema-section');
  const isOpen = !section?.classList.contains('open');
  toggleCollapsible('.fmi-schema-section', 'fmiSchemaBody');
  trackSectionToggle('FMI Schema', isOpen);
});
// Auto-expand when navigating via anchor link (event delegation covers dynamically created links too)
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (href === '#signal-library' || href === '#intelligence') openCollapsible('.signal-library-section', 'libraryBody');
  if (href === '#directory') openCollapsible('#directory', 'directoryBody');
  if (href === '#signal-strength') openCollapsible('#signal-strength', 'signalStrengthBody');
  if (href === '#analytics') openCollapsible('#analytics', 'analyticsBody');
  if (href === '#methodology') openCollapsible('#methodology', 'methodologyBody');
});

// ===== ADDITIONAL ANALYTICS TOGGLE =====
document.getElementById('additionalAnalyticsToggle')?.addEventListener('click', () => {
  const btn = document.getElementById('additionalAnalyticsToggle');
  const body = document.getElementById('additionalAnalyticsBody');
  if (!btn || !body) return;

  const isOpen = body.classList.toggle('open');
  btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  btn.textContent = isOpen ? 'Hide Additional Analytics' : 'Show Additional Analytics';
});

// ===== HEADER SCROLL =====
window.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  if (window.scrollY > 50) header.classList.add('header--scrolled');
  else header.classList.remove('header--scrolled');
});

// ===== SCROLL REVEAL =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ===== HELPERS =====
function getCSS(prop) {
  return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const INSTITUTION_TYPE_NORMALIZATION = {
  'Central Banks & Regulators': 'Regulatory Agencies',
  'Digital Asset Infrastructure': 'Infrastructure & Technology',
  'Exchanges & Trading Venues': 'Exchanges & Central Intermediaries',
  'Financial Infrastructure Operators': 'Infrastructure & Technology',
  'Financial Services & Credit Rating Agencies': 'Infrastructure & Technology',
  'Global Payment Networks': 'Payments Providers',
  'Payment Service Providers': 'Payments Providers'
};

const FMI_AREA_NORMALIZATION = {
  'Payment & Transfers': 'Payments & Transfers',
  'FX Markets & Settlement': 'Settlement & Clearing',
  'Currency & Monetary Policy': 'Regulation & Compliance',
  'Custody & Safekeeping': 'Custody & Asset Management',
  'Asset Custody & Management': 'Custody & Asset Management',
  'Credit Assessment': 'Other Infrastructure',
  'Retail Banking': 'Other Infrastructure'
};

const DEFAULT_INITIATIVE_TAXONOMY = {
  version: '1.0.0',
  canonicalInitiatives: [
    { id: 'init_tokenized_rwa', name: 'Tokenized Securities / RWA', isMatrixCategory: true },
    { id: 'init_dlt_infra', name: 'DLT / Blockchain Infrastructure', isMatrixCategory: true },
    { id: 'init_crypto_assets', name: 'Crypto / Digital Assets', isMatrixCategory: true },
    { id: 'init_payment_infra', name: 'Payment Infrastructure', isMatrixCategory: true },
    { id: 'init_stablecoins', name: 'Stablecoins & Deposit Tokens', isMatrixCategory: true },
    { id: 'init_cbdc', name: 'CBDC', isMatrixCategory: true },
    { id: 'init_defi', name: 'DeFi', isMatrixCategory: true },
    { id: 'init_strategy', name: 'Digital Asset Strategy', isMatrixCategory: true },
    { id: 'init_interop', name: 'Interoperability & Standards', isMatrixCategory: false },
    { id: 'init_settlement', name: 'Settlement Infrastructure', isMatrixCategory: false },
    { id: 'init_reg_compliance', name: 'Regulatory / Compliance', isMatrixCategory: false }
  ],
  aliasMap: [
    { alias: 'Cross-Border Payments', canonicalId: 'init_payment_infra' },
    { alias: 'Stablecoins', canonicalId: 'init_stablecoins' },
    { alias: 'Interoperability & Standards', canonicalId: 'init_interop' },
    { alias: 'Settlement Infrastructure', canonicalId: 'init_settlement' },
    { alias: 'Regulatory / Compliance', canonicalId: 'init_reg_compliance' }
  ]
};

const MATRIX_INITIATIVE_ORDER = [
  'init_tokenized_rwa',
  'init_dlt_infra',
  'init_crypto_assets',
  'init_payment_infra',
  'init_stablecoins',
  'init_cbdc',
  'init_defi',
  'init_strategy'
];

let initiativeTaxonomy = DEFAULT_INITIATIVE_TAXONOMY;
let initiativeAliasMap = new Map();

function buildInitiativeAliasMap(taxonomy) {
  const map = new Map();
  const canonicalById = new Map((taxonomy.canonicalInitiatives || []).map(i => [i.id, i.name]));

  (taxonomy.canonicalInitiatives || []).forEach(i => {
    map.set(i.name.toLowerCase(), i.name);
  });

  (taxonomy.aliasMap || []).forEach(entry => {
    const canonicalName = canonicalById.get(entry.canonicalId);
    if (!canonicalName) return;
    map.set(String(entry.alias || '').toLowerCase(), canonicalName);
  });

  return map;
}

function getMatrixInitiatives() {
  const canonicalById = new Map((initiativeTaxonomy.canonicalInitiatives || []).map(i => [i.id, i.name]));
  return MATRIX_INITIATIVE_ORDER
    .map(id => canonicalById.get(id))
    .filter(Boolean);
}

function normalizeInitiativeTypes(types) {
  if (!Array.isArray(types) || types.length === 0) return [];
  const normalized = types
    .map(t => String(t || '').trim())
    .filter(Boolean)
    .map(t => initiativeAliasMap.get(t.toLowerCase()) || t);
  return [...new Set(normalized)];
}

const FMI_SCHEMA = [
  {
    name: 'Tokenization & Issuance',
    description: 'Creation and lifecycle management of tokenized financial instruments and issuance workflows.'
  },
  {
    name: 'Custody & Asset Management',
    description: 'Safekeeping, asset servicing, and investment operations for digital and tokenized assets.'
  },
  {
    name: 'Trading & Exchange',
    description: 'Primary and secondary market trading venues, liquidity provision, and execution infrastructure.'
  },
  {
    name: 'Settlement & Clearing',
    description: 'Post-trade confirmation, clearing processes, settlement finality, and related risk controls.'
  },
  {
    name: 'Payments & Transfers',
    description: 'Domestic and cross-border value movement, treasury payments, and transaction orchestration rails.'
  },
  {
    name: 'Collateral & Lending',
    description: 'Collateral mobility, secured lending infrastructure, and programmable credit-market workflows.'
  },
  {
    name: 'Interoperability & Standards',
    description: 'Connectivity and standards across messaging, ledgers, networks, and institutional participants.'
  },
  {
    name: 'Digital Currency & Stablecoins',
    description: 'Stablecoin, deposit token, and other digital money instruments used in institutional flows.'
  },
  {
    name: 'Regulation & Compliance',
    description: 'Policy, supervision, and compliance controls governing digital asset market infrastructure.'
  }
];

function normalizeInstitutionType(type) {
  if (!type) return 'Infrastructure & Technology';
  return INSTITUTION_TYPE_NORMALIZATION[type] || type;
}

function normalizeFmiAreas(areas) {
  if (!Array.isArray(areas) || areas.length === 0) return ['General Infrastructure'];
  const normalized = areas.map(a => FMI_AREA_NORMALIZATION[a] || a);
  return [...new Set(normalized)];
}

function normalizeSignal(signal) {
  return {
    ...signal,
    institution_type: normalizeInstitutionType(signal.institution_type),
    fmi_areas: normalizeFmiAreas(signal.fmi_areas),
    initiative_types: normalizeInitiativeTypes(signal.initiative_types)
  };
}

function getCatColors() {
  return {
    'Global Banks': getCSS('--color-banks'),
    'Asset & Investment Management': getCSS('--color-asset-mgmt'),
    'Payments Providers': getCSS('--color-payments'),
    'Exchanges & Central Intermediaries': getCSS('--color-exchanges'),
    'Regulatory Agencies': getCSS('--color-regulators'),
    'Infrastructure & Technology': getCSS('--color-ecosystem'),
    'Intelligence & Research': '#c084fc'
  };
}

// ===== DATA =====
const CATEGORIES = {
  global_banks: { name: 'Global Banks', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l7-3 7 3"/><path d="M4 10v11"/><path d="M20 10v11"/><path d="M8 14v3"/><path d="M12 14v3"/><path d="M16 14v3"/></svg>' },
  asset_management: { name: 'Asset & Investment Management', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>' },
  payments: { name: 'Payments & Stablecoins', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
  exchanges_intermediaries: { name: 'Exchanges & Central Intermediaries', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>' },
  regulators: { name: 'Regulatory Agencies', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
  ecosystem: { name: 'Infrastructure & Ecosystem', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>' }
};
const TAG_LABELS = { global_banks: 'Banks', asset_management: 'Asset Mgmt', payments: 'Payments', exchanges_intermediaries: 'Exchanges', regulators: 'Regulators', ecosystem: 'Ecosystem' };

const INTEL_BRIEFS_DEFAULT = [
  { title: "SWIFT's Shift to Blockchain Infrastructure", desc: "SWIFT's transition from blockchain experimentation to production-ready shared ledger infrastructure marks a structural turning point for global finance.", source: "NextFi Advisors", url: "https://img1.wsimg.com/blobby/go/69c98e24-9280-42db-9e35-615f225a71b3/SwiftShiftToBlockchain_Final_v.2.pdf" },
  { title: "DTCC vs SWIFT: Solving Interoperability", desc: "The world's most systemically important financial market intermediaries have released major reports highlighting network fragmentation as the single greatest barrier to digital asset adoption at scale.", source: "NextFi Advisors", url: "https://img1.wsimg.com/blobby/go/69c98e24-9280-42db-9e35-615f225a71b3/SWIFT%26DTCC_IntelligenceBrief_v.2.pdf" },
  { title: "SEC Provides Clarity on Tokenized Securities", desc: "On January 28, 2026, three SEC divisions issued a joint statement clarifying how federal securities laws apply to tokenized securities — a milestone removing a key barrier to institutional adoption.", source: "NextFi Advisors", url: "https://img1.wsimg.com/blobby/go/69c98e24-9280-42db-9e35-615f225a71b3/SEC-Letter%20on%20Tokenized%20Securities_18F-dc69886.pdf" },
  { title: "Private Credit Tokenization: The Next Frontier in RWA", desc: "The private credit market exceeding $2.5 trillion is rapidly emerging as a credible infrastructure play for tokenization.", source: "NextFi Advisors", url: "https://img1.wsimg.com/blobby/go/69c98e24-9280-42db-9e35-615f225a71b3/BEGA_PrivateCreditRWA_Brief_24Feb26_v2.pdf" },
  { title: "The Convergence Economy", desc: "Two cost inputs — cognitive labor and transaction coordination — are being compressed by AI and programmable settlement infrastructure, generating a structural economic surplus.", source: "NextFi Advisors", url: "https://img1.wsimg.com/blobby/go/69c98e24-9280-42db-9e35-615f225a71b3/ConvergenceEconomy_March2026_Final.pdf" },
  { title: "Strategic Imperative of Stablecoins for Cross-Border Payments", desc: "JPMorgan, Visa, Mastercard, and regional banks are making stablecoin capabilities central to competitive positioning.", source: "NextFi Advisors", url: "https://img1.wsimg.com/blobby/go/69c98e24-9280-42db-9e35-615f225a71b3/BEGA_StablecoinsCross-Border%20Payments_24Feb202.pdf" },
  { title: "Three Trends, One Infrastructure Stack", desc: "The IMF's research confirms stablecoins and tokenization are a transmission channel with measurable effects on traditional finance.", source: "NextFi Advisors", url: "https://img1.wsimg.com/blobby/go/69c98e24-9280-42db-9e35-615f225a71b3/BEGA_Stablecoin_Convergence_Brief_Mar2-33d2759.pdf" },
  { title: "The Hidden Plumbing of Stablecoins", desc: "U.S. dollar stablecoins have crossed into mainstream financial infrastructure, but the GENIUS Act solves only part of the stability problem.", source: "NextFi Advisors", url: "https://img1.wsimg.com/blobby/go/69c98e24-9280-42db-9e35-615f225a71b3/Hidden_Plumbing_Stablecoins_19Feb2026.pdf" },
  { title: "Nine Strategic Imperatives of the Convergence Economy", desc: "Nine strategic imperatives for navigating the convergence of AI, tokenization, and programmable settlement.", source: "NextFi Advisors", url: "https://img1.wsimg.com/blobby/go/69c98e24-9280-42db-9e35-615f225a71b3/convergence_carousel_light.pdf" },
  { title: "x402: The Payment Infrastructure of Agentic AI", desc: "As AI agents execute financial transactions autonomously, the x402 protocol represents a fundamental shift in how value moves across the internet.", source: "NextFi Advisors", url: "https://img1.wsimg.com/blobby/go/69c98e24-9280-42db-9e35-615f225a71b3/x402%20Protocol%20(4).pdf" },
  { title: "Growth in Digital Asset Posts on LinkedIn", desc: "Analysis of growth in digital asset-related LinkedIn posts, decomposed into tokenization/RWA, stablecoins, and FMI disintermediation.", source: "NextFi Advisors", url: "https://img1.wsimg.com/blobby/go/69c98e24-9280-42db-9e35-615f225a71b3/LinkedInAnalysis_19Feb2026_v.02.pdf" }
];

let INTEL_BRIEFS = [...INTEL_BRIEFS_DEFAULT];

// ===== LOAD DATA =====
let allSignals = [];
let activeFilter = 'all';
let searchQuery = '';
let matrixFilter = null;
let chartInstances = {};
let popularitySeed = null;
let sourceCatalog = { byName: {}, byHost: {} };
let selectedPopularitySector = 'All Sectors';
let signalScoringMetricMode = 'strength';
let signalScoringColorMode = 'absolute';

function normalizeSourceKey(value) {
  return String(value || '').trim().toLowerCase();
}

function getSourceTierFromPriority(priority) {
  if (priority <= 1) return { tier: 'Primary', weight: 1.3 };
  if (priority === 2) return { tier: 'Secondary', weight: 1.0 };
  return { tier: 'Tertiary', weight: 0.8 };
}

function buildSourceCatalog(config) {
  const byName = {};
  const byHost = {};
  const rssSources = Array.isArray(config?.rss_sources) ? config.rss_sources : [];

  rssSources
    .filter(source => source && source.enabled !== false)
    .forEach(source => {
      const { tier, weight } = getSourceTierFromPriority(Number(source.priority) || 3);
      const sourceName = normalizeSourceKey(source.name || source.institution);
      if (sourceName && !byName[sourceName]) {
        byName[sourceName] = { tier, weight };
      }
      try {
        const host = normalizeSourceKey(new URL(source.url).hostname.replace(/^www\./, ''));
        if (host && !byHost[host]) {
          byHost[host] = { tier, weight };
        }
      } catch (_) {
        // Ignore malformed source URLs.
      }
    });

  const nextfiEnabled = config?.nextfi_intelligence?.enabled !== false;
  if (nextfiEnabled) {
    byName['nextfi advisors'] = { tier: 'Primary', weight: 1.4 };
    byHost['nextfiadvisors.com'] = { tier: 'Primary', weight: 1.4 };
  }

  return { byName, byHost };
}

function resolveSourceMeta(signal) {
  const sourceName = getSignalSourceName(signal);
  const sourceNameKey = normalizeSourceKey(sourceName);
  let sourceHostKey = '';

  try {
    sourceHostKey = normalizeSourceKey(new URL(String(signal?.source_url || '')).hostname.replace(/^www\./, ''));
  } catch (_) {
    // URL may be missing or malformed.
  }

  return (
    sourceCatalog.byName[sourceNameKey] ||
    sourceCatalog.byHost[sourceNameKey] ||
    sourceCatalog.byHost[sourceHostKey] ||
    { tier: 'Unclassified', weight: 0.9 }
  );
}

function getRecencyWeight(dateValue) {
  const timestamp = new Date(dateValue || '').getTime();
  if (!timestamp) return 0.7;
  const daysOld = Math.max(0, (Date.now() - timestamp) / 86400000);
  const decay = Math.exp(-daysOld / 365);
  return 0.6 + (0.4 * decay);
}

function getSourcePrevalenceWeight(sourceName, sourceCounts, maxSourceCount) {
  if (!sourceName) return 1;
  const count = Math.max(1, sourceCounts[sourceName] || 1);
  const maxCount = Math.max(1, maxSourceCount || 1);
  const normalized = Math.log1p(count) / Math.log1p(maxCount);
  return 1 + (0.35 * normalized);
}

function getSignalStrengthScore(signal, sourceCounts, maxSourceCount) {
  const source = getSignalSourceName(signal);
  const meta = resolveSourceMeta(signal);
  const recencyWeight = getRecencyWeight(signal.date);
  const prevalenceWeight = getSourcePrevalenceWeight(source, sourceCounts, maxSourceCount);
  return (meta.weight || 0.9) * recencyWeight * prevalenceWeight;
}

function setSignalScoringMetricMode(mode) {
  if (!['strength', 'count'].includes(mode)) return;
  signalScoringMetricMode = mode;
  renderPopularityAnalysis();
}

function setSignalScoringColorMode(mode) {
  if (!['absolute', 'percentile'].includes(mode)) return;
  signalScoringColorMode = mode;
  renderPopularityAnalysis();
}

function mapIntelBriefsToSignals(briefs) {
  return briefs.map(b => ({
    institution: 'NextFi Advisors',
    institution_type: 'Intelligence & Research',
    initiative: b.title,
    description: b.desc,
    signal_type: 'Intelligence Brief',
    initiative_types: ['Digital Asset Strategy'],
    fmi_areas: ['General Infrastructure'],
    category: 'intel_briefs',
    source_url: b.url,
    year: '2025',
    date: '2025-01-01',
    _isBrief: true
  }));
}

function loadJsonWithFallback(path, fallback) {
  return fetch(path)
    .then(r => (r.ok ? r.json() : fallback))
    .catch(() => fallback);
}

function getOperationalSignals() {
  return allSignals.filter(s => !s._isBrief);
}

Promise.all([
  loadJsonWithFallback('./data.json', []),
  loadJsonWithFallback('./auto_data.json', []),
  loadJsonWithFallback('./intel_briefs.json', INTEL_BRIEFS_DEFAULT),
  loadJsonWithFallback('./taxonomy/initiative-taxonomy.v1.json', DEFAULT_INITIATIVE_TAXONOMY),
  loadJsonWithFallback('./popularity.json', null),
  loadJsonWithFallback('./sources.json', null)
]).then(([manualData, autoData, intelBriefs, taxonomyData, popularityData, sourcesConfig]) => {
  if (taxonomyData && Array.isArray(taxonomyData.canonicalInitiatives) && Array.isArray(taxonomyData.aliasMap)) {
    initiativeTaxonomy = taxonomyData;
  }
  initiativeAliasMap = buildInitiativeAliasMap(initiativeTaxonomy);
  popularitySeed = popularityData && typeof popularityData === 'object' ? popularityData : null;
  sourceCatalog = buildSourceCatalog(sourcesConfig || {});

  const manualSignals = Array.isArray(manualData) ? manualData : [];
  const generatedSignals = Array.isArray(autoData) ? autoData : [];
  INTEL_BRIEFS = Array.isArray(intelBriefs) && intelBriefs.length ? intelBriefs : [...INTEL_BRIEFS_DEFAULT];

  const intelAsSignals = mapIntelBriefsToSignals(INTEL_BRIEFS);
  const mergedSignals = [...manualSignals, ...generatedSignals, ...intelAsSignals];
  allSignals = mergedSignals
    .map(normalizeSignal)
    .sort((a, b) => new Date(b.date || '2024-01-01') - new Date(a.date || '2024-01-01'));

  renderKPIs();
  renderDirectory();
  buildCharts();
  window._chartsReady = true;
  renderFilterPills();
  renderIntelBriefs();
  renderInitiativeSchema();
  renderFmiSchema();
  renderSignals();
  renderPopularityAnalysis();
  renderSourceQualityDistribution();
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
});

// ===== KPIs =====
let activeKPI = null;

function isMobileKPIViewport() {
  return window.innerWidth <= 768;
}

function positionKPIBreakdownPanel(activeCard) {
  const panel = document.getElementById('kpiBreakdown');
  const strip = document.getElementById('kpiStrip');
  if (!panel || !strip || !strip.parentElement) return;

  const container = strip.parentElement;

  if (isMobileKPIViewport() && activeCard) {
    panel.classList.add('kpi-breakdown-inline');
    activeCard.insertAdjacentElement('afterend', panel);
    return;
  }

  panel.classList.remove('kpi-breakdown-inline');
  if (panel.parentElement !== container) {
    container.appendChild(panel);
  }
}

function getSignalSourceName(signal) {
  const sourceName = String(signal?.source_name || '').trim();
  if (sourceName) return sourceName;

  const sourceUrl = String(signal?.source_url || '').trim();
  if (sourceUrl) {
    try {
      return new URL(sourceUrl).hostname.replace(/^www\./, '');
    } catch (_) {
      // Fall through to institution when URL is malformed.
    }
  }

  return String(signal?.institution || '').trim();
}

function renderKPIs() {
  const el = document.getElementById('kpiStrip');
  const signals = getOperationalSignals();
  const institutions = new Set(signals.map(s => s.institution));
  const uniqueSources = new Set(
    signals
      .map(getSignalSourceName)
      .map(s => s.trim())
      .filter(Boolean)
  );
  const productLaunches = signals.filter(s => s.signal_type === 'Product Launch').length;
  const pctLaunches = signals.length ? Math.round((productLaunches / signals.length) * 100) : 0;

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dailyNewSignals = signals.filter(s => {
    const raw = typeof s.date === 'string' ? s.date.trim() : '';
    if (!raw) return false;
    const isoPrefix = raw.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoPrefix)) return isoPrefix === todayKey;
    const dt = new Date(raw);
    if (isNaN(dt.getTime())) return false;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    return key === todayKey;
  }).length;
  const todayLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const kpis = [
    { id: 'signals', value: signals.length, label: 'Total Signals', color: 'var(--color-primary)' },
    { id: 'daily_new', value: dailyNewSignals, label: 'New Signals', color: 'var(--color-success)', delta: `As of ${todayLabel}` },
    { id: 'sources', value: uniqueSources.size, label: 'Info Sources', color: 'var(--color-primary)' },
    { id: 'institutions', value: institutions.size, label: 'Institutions', color: 'var(--color-primary)' },
    { id: 'sectors', value: '6', label: 'Sector Categories', color: 'var(--color-primary)' },
    { id: 'countries', value: '40+', label: 'Countries', color: 'var(--color-primary)' },
    { id: 'launches', value: productLaunches, label: 'Product Launches', color: 'var(--color-primary)', delta: `${pctLaunches}% of all signals` }
  ];

  el.innerHTML = kpis.map(k => `
    <div class="kpi-card" data-kpi="${k.id}">
      <div class="kpi-value" style="color: ${k.color}">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
      ${k.delta ? `<div class="kpi-delta up">${k.delta}</div>` : ''}
    </div>
  `).join('');

  el.querySelectorAll('.kpi-card').forEach(card => {
    card.addEventListener('click', () => {
      const kpiId = card.dataset.kpi;
      if (activeKPI === kpiId) {
        closeKPIBreakdown();
      } else {
        showKPIBreakdown(kpiId, card);
        el.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      }
    });
  });
}

function closeKPIBreakdown() {
  activeKPI = null;
  const panel = document.getElementById('kpiBreakdown');
  if (panel) panel.style.display = 'none';
  positionKPIBreakdownPanel(null);
  document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('active'));
}

function showKPIBreakdown(kpiId, activeCard) {
  activeKPI = kpiId;
  const panel = document.getElementById('kpiBreakdown');
  const signals = getOperationalSignals();
  let html = '';

  if (kpiId === 'signals') {
    const byType = {};
    signals.forEach(s => { byType[s.institution_type] = (byType[s.institution_type] || 0) + 1; });
    const sorted = Object.entries(byType).sort((a,b) => b[1] - a[1]);
    const max = sorted[0]?.[1] || 1;
    html = `<div class="kpi-breakdown-header"><h3>${signals.length} Signals by Institution Type</h3><button class="kpi-breakdown-close" onclick="closeKPIBreakdown()">Close ✕</button></div>`;
    html += '<div class="kpi-breakdown-grid">';
    sorted.forEach(([type, count]) => {
      html += `<a href="javascript:void(0)" class="kpi-breakdown-item" onclick="navigateToCatalogueByType('${type.replace(/'/g, "\\'")}')"><span class="bd-label">${type.replace('Exchanges & Central Intermediaries','Exchanges').replace('Asset & Investment Management','Asset Mgmt').replace('Infrastructure & Technology','Infra & Tech')}</span><span class="bd-bar"><span class="bd-bar-fill" style="width:${(count/max*100)}%"></span></span><span class="bd-value">${count}</span></a>`;
    });
    html += '</div>';
    html += '<a href="#analytics" class="kpi-breakdown-link">View detailed analytics ↓</a>';

  } else if (kpiId === 'institutions') {
    const instByType = {};
    signals.forEach(s => {
      if (!instByType[s.institution_type]) instByType[s.institution_type] = new Set();
      instByType[s.institution_type].add(s.institution);
    });
    const sorted = Object.entries(instByType).map(([t, s]) => [t, s.size]).sort((a,b) => b[1] - a[1]);
    const max = sorted[0]?.[1] || 1;
    const instCatKeyMap = { 'Global Banks':'global_banks', 'Asset & Investment Management':'asset_management', 'Payments Providers':'payments', 'Exchanges & Central Intermediaries':'exchanges_intermediaries', 'Regulatory Agencies':'regulators', 'Infrastructure & Technology':'ecosystem', 'Intelligence & Research':'intel_briefs' };
    html = `<div class="kpi-breakdown-header"><h3>${new Set(signals.map(s=>s.institution)).size} Institutions by Sector</h3><button class="kpi-breakdown-close" onclick="closeKPIBreakdown()">Close ✕</button></div>`;
    html += '<div class="kpi-breakdown-grid">';
    sorted.forEach(([type, count]) => {
      const ck = instCatKeyMap[type] || 'all';
      html += `<a href="javascript:void(0)" class="kpi-breakdown-item" onclick="navigateToDirectorySection('${ck}')"><span class="bd-label">${type.replace('Exchanges & Central Intermediaries','Exchanges').replace('Asset & Investment Management','Asset Mgmt').replace('Infrastructure & Technology','Infra & Tech')}</span><span class="bd-bar"><span class="bd-bar-fill" style="width:${(count/max*100)}%"></span></span><span class="bd-value">${count}</span></a>`;
    });
    html += '</div>';
    html += '<a href="#directory" class="kpi-breakdown-link">See full Institution Directory ↓</a>';

  } else if (kpiId === 'daily_new') {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayLabel = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const todaysSignals = signals.filter(s => {
      const raw = typeof s.date === 'string' ? s.date.trim() : '';
      if (!raw) return false;
      const isoPrefix = raw.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(isoPrefix)) return isoPrefix === todayKey;
      const dt = new Date(raw);
      if (isNaN(dt.getTime())) return false;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      return key === todayKey;
    });

    html = `<div class="kpi-breakdown-header"><h3>New Signals on ${todayLabel}</h3><button class="kpi-breakdown-close" onclick="closeKPIBreakdown()">Close ✕</button></div>`;

    if (todaysSignals.length === 0) {
      html += '<div style="font-size:var(--text-xs);color:var(--color-text-muted);line-height:1.7;">No operational signals are dated for today yet.</div>';
    } else {
      const byType = {};
      todaysSignals.forEach(s => { byType[s.institution_type] = (byType[s.institution_type] || 0) + 1; });
      const sorted = Object.entries(byType).sort((a,b) => b[1] - a[1]);
      const max = sorted[0]?.[1] || 1;
      html += '<div class="kpi-breakdown-grid">';
      sorted.forEach(([type, count]) => {
        const label = type.replace('Exchanges & Central Intermediaries','Exchanges').replace('Asset & Investment Management','Asset Mgmt').replace('Infrastructure & Technology','Infra & Tech');
        html += `<a href="javascript:void(0)" class="kpi-breakdown-item" onclick="navigateToCatalogueByType('${type.replace(/'/g, "\\'")}')"><span class="bd-label">${label}</span><span class="bd-bar"><span class="bd-bar-fill" style="width:${(count/max*100)}%"></span></span><span class="bd-value">${count}</span></a>`;
      });
      html += '</div>';
    }
    html += '<a href="#signal-library" class="kpi-breakdown-link">Open Signal Catalogue ↓</a>';

  } else if (kpiId === 'sources') {
    const bySource = {};
    signals.forEach(s => {
      const source = getSignalSourceName(s);
      if (!source) return;
      bySource[source] = (bySource[source] || 0) + 1;
    });
    const sorted = Object.entries(bySource).sort((a, b) => b[1] - a[1]);
    const max = sorted[0]?.[1] || 1;

    html = `<div class="kpi-breakdown-header"><h3>${sorted.length} Unique Information Sources</h3><button class="kpi-breakdown-close" onclick="closeKPIBreakdown()">Close ✕</button></div>`;
    html += '<div class="kpi-breakdown-grid">';
    sorted.slice(0, 12).forEach(([source, count]) => {
      html += `<div class="kpi-breakdown-item"><span class="bd-label">${source}</span><span class="bd-bar"><span class="bd-bar-fill" style="width:${(count/max*100)}%"></span></span><span class="bd-value">${count}</span></div>`;
    });
    html += '</div>';
    if (sorted.length > 12) {
      html += `<div style="font-size:11px;color:var(--color-text-muted);margin-top:var(--space-2);">Showing top 12 of ${sorted.length} sources by signal volume.</div>`;
    }
    html += '<a href="#signal-library" class="kpi-breakdown-link">Open Signal Catalogue ↓</a>';

  } else if (kpiId === 'growth') {
    const byYear = {};
    signals.forEach(s => { byYear[s.year] = (byYear[s.year] || 0) + 1; });
    const years = Object.entries(byYear).sort((a,b) => a[0].localeCompare(b[0]));
    const max = Math.max(...years.map(y => y[1]));
    html = `<div class="kpi-breakdown-header"><h3>Signal Growth Over Time</h3><button class="kpi-breakdown-close" onclick="closeKPIBreakdown()">Close ✕</button></div>`;
    html += '<div class="kpi-breakdown-grid">';
    years.forEach(([year, count], i) => {
      const prev = i > 0 ? years[i-1][1] : 0;
      const delta = prev > 0 ? `(${count > prev ? '+' : ''}${Math.round(((count - prev) / prev) * 100)}% YoY)` : '';
      html += `<div class="kpi-breakdown-item"><span class="bd-label">${year} ${delta}</span><span class="bd-bar"><span class="bd-bar-fill" style="width:${(count/max*100)}%"></span></span><span class="bd-value">${count}</span></div>`;
    });
    html += '</div>';
    const note26 = byYear['2026'] ? `<div style="font-size:11px;color:var(--color-text-muted);margin-top:var(--space-2);">2026 data is partial (through Q1) — ${byYear['2026']} signals already tracked</div>` : '';
    html += note26;
    html += '<a href="#analytics" class="kpi-breakdown-link">View timeline chart ↓</a>';

  } else if (kpiId === 'launches') {
    const byType = {};
    signals.forEach(s => { byType[s.signal_type] = (byType[s.signal_type] || 0) + 1; });
    const sorted = Object.entries(byType).sort((a,b) => b[1] - a[1]);
    const max = sorted[0]?.[1] || 1;
    html = `<div class="kpi-breakdown-header"><h3>All Signal Types</h3><button class="kpi-breakdown-close" onclick="closeKPIBreakdown()">Close ✕</button></div>`;
    html += '<div class="kpi-breakdown-grid">';
    sorted.forEach(([type, count]) => {
      html += `<div class="kpi-breakdown-item"><span class="bd-label">${type}</span><span class="bd-bar"><span class="bd-bar-fill" style="width:${(count/max*100)}%"></span></span><span class="bd-value">${count}</span></div>`;
    });
    html += '</div>';
    html += '<a href="#analytics" class="kpi-breakdown-link">View signal type chart ↓</a>';

  } else if (kpiId === 'sectors') {
    const catMap = { 'Global Banks':'global_banks', 'Asset & Investment Management':'asset_management', 'Payments Providers':'payments', 'Exchanges & Central Intermediaries':'exchanges_intermediaries', 'Regulatory Agencies':'regulators', 'Infrastructure & Technology':'ecosystem' };
    const colorMap = { 'Global Banks':'var(--color-banks)', 'Asset & Investment Management':'var(--color-asset-mgmt)', 'Payments Providers':'var(--color-payments)', 'Exchanges & Central Intermediaries':'var(--color-exchanges)', 'Regulatory Agencies':'var(--color-regulators)', 'Infrastructure & Technology':'var(--color-ecosystem)' };
    html = `<div class="kpi-breakdown-header"><h3>6 Sector Categories</h3><button class="kpi-breakdown-close" onclick="closeKPIBreakdown()">Close ✕</button></div>`;
    html += '<div class="kpi-breakdown-grid">';
    Object.entries(catMap).forEach(([type, anchor]) => {
      const count = signals.filter(s => s.institution_type === type).length;
      const instCount = new Set(signals.filter(s => s.institution_type === type).map(s => s.institution)).size;
      html += `<a href="javascript:void(0)" class="kpi-breakdown-item" style="border-left:3px solid ${colorMap[type]}" onclick="navigateToDirectorySection('${anchor}')"><span class="bd-label">${type.replace('Exchanges & Central Intermediaries','Exchanges').replace('Asset & Investment Management','Asset Mgmt').replace('Infrastructure & Technology','Infra & Tech')}</span><span class="bd-value">${count} signals · ${instCount} firms</span></a>`;
    });
    html += '</div>';

  } else if (kpiId === 'countries') {
    // Show top regions/institutions by geography diversity
    html = `<div class="kpi-breakdown-header"><h3>Global Coverage</h3><button class="kpi-breakdown-close" onclick="closeKPIBreakdown()">Close ✕</button></div>`;
    html += '<div style="font-size:var(--text-xs);color:var(--color-text-muted);line-height:1.7;">Institutions tracked span 40+ countries across major financial hubs including the United States, United Kingdom, Switzerland, Germany, France, Singapore, Hong Kong, Japan, Australia, Canada, South Korea, India, Brazil, UAE, and more. The directory covers institutions headquartered across North America, Europe, Asia-Pacific, Middle East, and Latin America.</div>';
    html += '<a href="#directory" class="kpi-breakdown-link">Browse all institutions ↓</a>';
  }

  panel.innerHTML = html;
  positionKPIBreakdownPanel(activeCard);
  panel.style.display = 'block';

  if (isMobileKPIViewport()) {
    setTimeout(() => {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  }
}

window.addEventListener('resize', () => {
  const activeCard = document.querySelector('.kpi-card.active');
  if (!activeKPI || !activeCard) {
    positionKPIBreakdownPanel(null);
    return;
  }
  positionKPIBreakdownPanel(activeCard);
});

// ===== CHARTS =====
function destroyCharts() {
  Object.values(chartInstances).forEach(c => c.destroy());
  chartInstances = {};
}

function buildCharts() {
  destroyCharts();
  const colors = getCatColors();
  const textColor = getCSS('--color-text-muted');
  const gridColor = getCSS('--color-divider');
  const bgColor = getCSS('--color-surface');

  Chart.defaults.color = textColor;
  Chart.defaults.font.family = "'Satoshi', 'Inter', sans-serif";
  Chart.defaults.font.size = 12;

  buildTimelineChart(colors, textColor, gridColor);
  buildInstTypeChart(colors, textColor);
  buildSignalTypeChart(textColor, gridColor);
  buildInitiativeTypeChart(textColor, gridColor);
  buildFMIChart(colors, textColor, gridColor);
  buildHeatmap(colors);
}

// 1. TIMELINE (stacked bar) — all years from data
function buildTimelineChart(colors, textColor, gridColor) {
  const signals = getOperationalSignals();
  // Dynamically collect all years present in data, sorted
  const yearSet = new Set();
  signals.forEach(s => { if (s.year) yearSet.add(s.year); });
  const years = [...yearSet].sort();
  const types = Object.keys(colors).filter(t => t !== 'Intelligence & Research');
  const datasets = types.map(type => ({
    label: type.replace('Asset & Investment Management', 'Asset Mgmt').replace('Exchanges & Central Intermediaries', 'Exchanges').replace('Infrastructure & Technology', 'Infrastructure'),
    data: years.map(y => signals.filter(s => s.year === y && s.institution_type === type).length),
    backgroundColor: colors[type],
    borderRadius: 4,
    borderSkipped: false,
  }));

  chartInstances.timeline = new Chart(document.getElementById('timelineChart'), {
    type: 'bar',
    data: { labels: years, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.raw} signals`,
            afterBody: (items) => {
              const year = items[0]?.label;
              if (year === years[years.length - 1] && parseInt(year) >= 2026) return '(Partial year — data through Q1)';
              return '';
            }
          }
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { weight: 600 } } },
        y: { stacked: true, grid: { color: gridColor }, title: { display: true, text: 'Signals', font: { size: 11 } } }
      }
    }
  });
}

// 2. INSTITUTION TYPE (doughnut)
function buildInstTypeChart(colors, textColor) {
  const signals = getOperationalSignals();
  const counts = {};
  signals.forEach(s => { counts[s.institution_type] = (counts[s.institution_type] || 0) + 1; });
  const labels = Object.keys(counts);
  const data = labels.map(l => counts[l]);
  const bgColors = labels.map(l => colors[l]);

  chartInstances.instType = new Chart(document.getElementById('instTypeChart'), {
    type: 'doughnut',
    data: {
      labels: labels.map(l => l.replace('Asset & Investment Management', 'Asset Mgmt').replace('Exchanges & Central Intermediaries', 'Exchanges').replace('Infrastructure & Technology', 'Infra & Tech')),
      datasets: [{ data, backgroundColor: bgColors, borderWidth: 0, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 10, padding: 8, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw} signals (${Math.round(ctx.raw/signals.length*100)}%)` } }
      }
    }
  });
}

// 3. SIGNAL TYPE (horizontal bar)
function buildSignalTypeChart(textColor, gridColor) {
  const signals = getOperationalSignals();
  const counts = {};
  signals.forEach(s => { counts[s.signal_type] = (counts[s.signal_type] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
  const signalColors = [
    getCSS('--color-primary'), getCSS('--color-regulators'), getCSS('--color-payments'),
    getCSS('--color-asset-mgmt'), getCSS('--color-exchanges'), getCSS('--color-ecosystem'),
    getCSS('--color-banks')
  ];

  chartInstances.signalType = new Chart(document.getElementById('signalTypeChart'), {
    type: 'bar',
    data: {
      labels: sorted.map(s => s[0].replace('Platform / Infrastructure', 'Platform/Infra')),
      datasets: [{
        data: sorted.map(s => s[1]),
        backgroundColor: sorted.map((_, i) => signalColors[i % signalColors.length]),
        borderRadius: 4, borderSkipped: false, barThickness: 24,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { left: 4 } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.raw} signals (${Math.round(ctx.raw/signals.length*100)}%)` } }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { font: { size: 11 } } },
        y: { grid: { display: false }, ticks: { font: { size: 11, weight: 500 }, autoSkip: false, padding: 4 } }
      }
    }
  });
}

// 4. INITIATIVE TYPE (horizontal bar)
function buildInitiativeTypeChart(textColor, gridColor) {
  const signals = getOperationalSignals();
  const counts = {};
  signals.forEach(s => { (s.initiative_types || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }); });
  const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
  const initColors = [
    getCSS('--color-banks'), getCSS('--color-exchanges'), getCSS('--color-asset-mgmt'),
    getCSS('--color-payments'), getCSS('--color-regulators'), getCSS('--color-ecosystem'),
    getCSS('--color-primary'), '#9966cc'
  ];

  chartInstances.initType = new Chart(document.getElementById('initiativeTypeChart'), {
    type: 'bar',
    data: {
      labels: sorted.map(s => s[0].replace('Tokenized Securities / RWA', 'Tokenized Securities/RWA').replace('DLT / Blockchain Infrastructure', 'DLT/Blockchain Infra').replace('Stablecoins & Deposit Tokens', 'Stablecoins').replace('Crypto / Digital Assets', 'Crypto/Digital Assets').replace('Digital Asset Strategy', 'Digital Strategy')),
      datasets: [{
        data: sorted.map(s => s[1]),
        backgroundColor: sorted.map((_, i) => initColors[i % initColors.length]),
        borderRadius: 4, borderSkipped: false, barThickness: 24,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { left: 8 } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.raw} signals` } }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { font: { size: 11 } } },
        y: { grid: { display: false }, ticks: { font: { size: 11, weight: 500 }, autoSkip: false } }
      }
    }
  });
}

function renderInitiativeSchema() {
  const container = document.getElementById('initiativeSchemaContent');
  if (!container) return;

  const initiatives = initiativeTaxonomy.canonicalInitiatives || [];
  const matrixNames = new Set(getMatrixInitiatives());

  container.innerHTML = `
    <div class="initiative-schema-grid">
      ${initiatives.map(item => `
        <article class="initiative-schema-card">
          <div class="initiative-schema-card-top">
            <h3>${item.name}</h3>
            <span class="initiative-schema-pill ${matrixNames.has(item.name) ? 'matrix' : 'analytics'}">${matrixNames.has(item.name) ? 'Matrix + Analytics' : 'Analytics'}</span>
          </div>
          <p>${item.description || 'No definition provided.'}</p>
          <div class="initiative-schema-meta">Group: ${item.group || 'Unspecified'}</div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderFmiSchema() {
  const container = document.getElementById('fmiSchemaContent');
  if (!container) return;

  const decisionLogic = [
    'What FMI function is directly being transformed?',
    'Does the signal primarily impact issuance, trading, settlement, custody, payments, or compliance?',
    'If the signal spans multiple functions, store all applicable FMI areas in order of operational impact.',
    'If no direct FMI function is changed, classify as Other Infrastructure and flag for analyst review.'
  ];

  container.innerHTML = `
    <div class="initiative-schema-grid">
      ${FMI_SCHEMA.map(item => `
        <article class="initiative-schema-card">
          <div class="initiative-schema-card-top">
            <h3>${item.name}</h3>
            <span class="initiative-schema-pill analytics">FMI Domain</span>
          </div>
          <p>${item.description}</p>
        </article>
      `).join('')}
    </div>
    <div class="fmi-decision-logic">
      <h4>Decision Logic</h4>
      <ol>
        ${decisionLogic.map(step => `<li>${step}</li>`).join('')}
      </ol>
    </div>
  `;
}

// 5. FMI AREAS (horizontal bar with drilldown)
function buildFMIChart(colors, textColor, gridColor) {
  const signals = getOperationalSignals();
  const counts = {};
  signals.forEach(s => { (s.fmi_areas || []).forEach(a => { counts[a] = (counts[a] || 0) + 1; }); });
  const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).filter(([k]) => k !== 'General Infrastructure');
  const fmiColors = [
    getCSS('--color-primary'), getCSS('--color-regulators'), getCSS('--color-payments'),
    getCSS('--color-asset-mgmt'), getCSS('--color-banks'), getCSS('--color-exchanges'),
    getCSS('--color-ecosystem'), '#9966cc', '#ff9966', '#66cc99', '#cc6699'
  ];

  chartInstances.fmi = new Chart(document.getElementById('fmiChart'), {
    type: 'bar',
    data: {
      labels: sorted.map(s => s[0]
        .replace('Regulation & Compliance', 'Regulation')
        .replace('Digital Currency & Stablecoins', 'Digital Currency')
        .replace('Interoperability & Standards', 'Interoperability')
        .replace('Collateral & Lending', 'Collateral')
        .replace('Trading & Exchange', 'Trading')
        .replace('Custody & Asset Management', 'Custody & Asset Mgmt')
        .replace('Tokenization & Issuance', 'Tokenization')
        .replace('Other Infrastructure', 'Other Infra')),
      datasets: [{
        data: sorted.map(s => s[1]),
        backgroundColor: sorted.map((_, i) => fmiColors[i % fmiColors.length]),
        borderRadius: 4, borderSkipped: false, barThickness: 22,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { left: 4 } },
      onClick: (e, elements) => {
        if (elements.length > 0) {
          const idx = elements[0].index;
          const fmiArea = sorted[idx][0];
          showFMIDrilldown(fmiArea, colors);
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.raw} signals — click for breakdown` } }
      },
      scales: {
        x: { grid: { color: gridColor } },
        y: { grid: { display: false }, ticks: { font: { size: 11, weight: 500 }, autoSkip: false, padding: 4 } }
      }
    }
  });
}

function showFMIDrilldown(fmiArea, colors) {
  const panel = document.getElementById('fmiDrilldown');
  const relevant = getOperationalSignals().filter(s => (s.fmi_areas || []).includes(fmiArea));
  const byType = {};
  relevant.forEach(s => { byType[s.institution_type] = (byType[s.institution_type] || 0) + 1; });
  const sorted = Object.entries(byType).sort((a,b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;

  // Map institution types to directory category anchors
  const dirCatMap = {
    'Global Banks': 'global_banks',
    'Asset & Investment Management': 'asset_management',
    'Payments Providers': 'payments',
    'Exchanges & Central Intermediaries': 'exchanges_intermediaries',
    'Regulatory Agencies': 'regulators',
    'Infrastructure & Technology': 'ecosystem'
  };

  panel.style.display = 'block';
  panel.innerHTML = `
    <button class="drilldown-close" onclick="this.parentElement.style.display='none'">Close ✕</button>
    <h4>${fmiArea} — by Institution Type (${relevant.length} signals)</h4>
    <p class="drilldown-hint">Click a row to navigate to that section in the directory</p>
    ${sorted.map(([type, count]) => {
      const catKey = dirCatMap[type] || '';
      const shortLabel = type.replace('Exchanges & Central Intermediaries','Exchanges').replace('Asset & Investment Management','Asset Mgmt').replace('Infrastructure & Technology','Infra & Tech');
      return `
      <div class="drilldown-item drilldown-item-link" onclick="navigateToDirectorySection('${catKey}')" title="View ${type} in the directory">
        <span style="min-width:140px">${shortLabel}</span>
        <div class="drilldown-bar"><div class="drilldown-bar-fill" style="width:${(count/max*100)}%; background:${colors[type] || 'var(--color-primary)'}"></div></div>
        <span style="min-width:30px;text-align:right;font-weight:700">${count}</span>
        <svg class="drilldown-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
      </div>
    `}).join('')}
  `;
}

// Navigate to a specific directory section and expand it
function navigateToDirectorySection(catKey) {
  if (!catKey) return;
  const dirSection = document.getElementById('directory');
  if (!dirSection) return;

  // Open the directory section if collapsed
  const dirBody = document.getElementById('directoryBody');
  if (!dirSection.classList.contains('open')) {
    dirSection.classList.add('open');
    if (dirBody) dirBody.style.display = 'block';
  }

  // Find the matching directory category and open it
  const allDirCats = document.querySelectorAll('#directoryContainer .dir-category');
  // Map catKey to the institution type name for matching
  const catNames = {
    'global_banks': 'Global Banks',
    'asset_management': 'Asset & Investment Management',
    'payments': 'Payments Providers',
    'exchanges_intermediaries': 'Exchanges & Central Intermediaries',
    'regulators': 'Regulatory Agencies',
    'ecosystem': 'Infrastructure & Technology',
    'intel_briefs': 'Intelligence & Research'
  };
  const targetName = catNames[catKey];

  allDirCats.forEach(cat => {
    const nameEl = cat.querySelector('.dir-cat-name');
    if (nameEl && nameEl.textContent.trim() === targetName) {
      cat.classList.add('open');
      // Scroll to this category
      setTimeout(() => {
        cat.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  });
}

function navigateToCatalogueByType(institutionType) {
  const catKeyMap = {
    'Global Banks': 'global_banks',
    'Asset & Investment Management': 'asset_management',
    'Payments Providers': 'payments',
    'Exchanges & Central Intermediaries': 'exchanges_intermediaries',
    'Regulatory Agencies': 'regulators',
    'Infrastructure & Technology': 'ecosystem',
    'Intelligence & Research': 'intel_briefs'
  };
  navigateToSignal('', catKeyMap[institutionType] || 'all');
}

// 6. HEATMAP
function buildHeatmap(colors) {
  const container = document.getElementById('heatmapContainer');
  if (!container) return;
  const signals = getOperationalSignals();
  const instTypes = ['Global Banks', 'Asset & Investment Management', 'Payments Providers', 'Exchanges & Central Intermediaries', 'Regulatory Agencies', 'Infrastructure & Technology'];
  const shortNames = ['Banks', 'Asset Mgmt', 'Payments', 'Exchanges', 'Regulators', 'Infra/Tech'];
  const initTypes = getMatrixInitiatives();
  const shortInit = initTypes.map(name => name
    .replace('Tokenized Securities / RWA', 'Tokenized Securities')
    .replace('DLT / Blockchain Infrastructure', 'DLT / Blockchain')
    .replace('Payment Infrastructure', 'Payment Infra')
    .replace('Stablecoins & Deposit Tokens', 'Stablecoins')
    .replace('Digital Asset Strategy', 'Digital Strategy'));

  // Build cross-tab
  const matrix = [];
  let maxVal = 0;
  instTypes.forEach(inst => {
    const row = [];
    initTypes.forEach(init => {
      const count = signals.filter(s => s.institution_type === inst && (s.initiative_types || []).includes(init)).length;
      row.push(count);
      if (count > maxVal) maxVal = count;
    });
    matrix.push(row);
  });

  function cellColor(val) {
    if (val === 0) return 'var(--color-surface-offset)';
    const intensity = val / maxVal;
    const r = document.documentElement.getAttribute('data-theme') === 'light';
    if (intensity < 0.25) return r ? 'rgba(0,136,170,0.1)' : 'rgba(0,212,255,0.08)';
    if (intensity < 0.5) return r ? 'rgba(0,136,170,0.25)' : 'rgba(0,212,255,0.18)';
    if (intensity < 0.75) return r ? 'rgba(0,136,170,0.45)' : 'rgba(0,212,255,0.35)';
    return r ? 'rgba(0,136,170,0.7)' : 'rgba(0,212,255,0.55)';
  }
  function textCol(val) {
    if (val === 0) return 'var(--color-text-faint)';
    const intensity = val / maxVal;
    return intensity > 0.5 ? '#fff' : 'var(--color-text)';
  }

  // Calculate column totals
  const colTotals = initTypes.map((_, ci) => matrix.reduce((sum, row) => sum + row[ci], 0));
  // Use unique signals for grand total to avoid double-counting multi-tagged initiatives.
  const grandTotal = signals.length;

  let html = '<table class="heatmap-table"><thead><tr><th></th>';
  shortInit.forEach(h => { html += `<th class="heatmap-col-header">${h}</th>`; });
  html += '<th class="heatmap-col-header heatmap-total-header">Total</th>';
  html += '</tr></thead><tbody>';
  matrix.forEach((row, i) => {
    const rowTotal = row.reduce((s, v) => s + v, 0);
    html += `<tr><td class="heatmap-row-label">${shortNames[i]}</td>`;
    row.forEach((val, ci) => {
      if (val > 0) {
        html += `<td class="heatmap-cell" style="background:${cellColor(val)};color:${textCol(val)};cursor:pointer" title="${instTypes[i]} × ${initTypes[ci]}: ${val} (click to view signals)" onclick="navigateToMatrixSelection('${instTypes[i]}','${initTypes[ci]}')">${val}</td>`;
      } else {
        html += `<td class="heatmap-cell" style="background:${cellColor(val)};color:${textCol(val)}" title="${instTypes[i]} × ${initTypes[ci]}: 0">–</td>`;
      }
    });
    html += `<td class="heatmap-cell heatmap-total-cell">${rowTotal}</td>`;
    html += '</tr>';
  });
  // Column totals row
  html += '<tr class="heatmap-totals-row"><td class="heatmap-row-label heatmap-total-label">Total</td>';
  colTotals.forEach(val => {
    html += `<td class="heatmap-cell heatmap-total-cell">${val}</td>`;
  });
  html += `<td class="heatmap-cell heatmap-grand-total">${grandTotal}</td>`;
  html += '</tr>';
  html += '</tbody></table>';
  container.innerHTML = html;
}

// ===== SEARCH =====
document.getElementById('searchInput')?.addEventListener('input', (e) => {
  matrixFilter = null;
  searchQuery = e.target.value.toLowerCase().trim();
  if (searchQuery) trackSearch(searchQuery, 'Signal Catalogue');
  renderSignals();
  updateResetBars();
});

// ===== FILTER PILLS =====
function renderFilterPills() {
  const container = document.getElementById('filterPills');
  const nonBriefs = allSignals.filter(s => !s._isBrief);
  const counts = {};
  nonBriefs.forEach(s => { counts[s.category] = (counts[s.category] || 0) + 1; });
  let html = `<button class="filter-pill active" data-filter="all">All<span class="count">${nonBriefs.length}</span></button>`;
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    html += `<button class="filter-pill" data-filter="${key}">${cat.name.split(' ')[0]}<span class="count">${counts[key] || 0}</span></button>`;
  }
  container.innerHTML = html;
  container.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      matrixFilter = null;
      activeFilter = btn.dataset.filter;
      trackFilter('institution_category', btn.dataset.filter);
      renderSignals();
      updateResetBars();
    });
  });
}

// ===== INTEL BRIEFS =====
function renderIntelBriefs() {
  const countEl = document.getElementById('intelBriefCount');
  if (countEl) countEl.textContent = `${INTEL_BRIEFS.length} briefs`;

  document.getElementById('intelBriefs').innerHTML = INTEL_BRIEFS.map(b => `
    <a href="${b.url}" target="_blank" rel="noopener noreferrer" class="intel-brief" style="text-decoration:none;">
      <div class="intel-brief-title">${b.title}</div>
      <div class="intel-brief-desc">${b.desc}</div>
      <div style="font-size:11px;color:var(--color-text-faint);margin-top:var(--space-2);">${b.source}</div>
    </a>
  `).join('');
}

// ===== RENDER SIGNALS =====
function renderSignals() {
  const container = document.getElementById('signalSections');
  const noResults = document.getElementById('noResults');
  renderMatrixFilterChip();
  let filtered = allSignals.filter(s => !s._isBrief);
  if (activeFilter !== 'all') filtered = filtered.filter(s => s.category === activeFilter);
  if (matrixFilter) {
    filtered = filtered.filter(s =>
      s.institution_type === matrixFilter.institutionType &&
      (s.initiative_types || []).includes(matrixFilter.initiativeType)
    );
  }
  if (searchQuery) filtered = filtered.filter(s => `${s.institution} ${s.initiative} ${s.description} ${s.category}`.toLowerCase().includes(searchQuery));

  if (filtered.length === 0) { container.innerHTML = ''; noResults.style.display = 'block'; return; }
  noResults.style.display = 'none';

  const grouped = {};
  for (const [key] of Object.entries(CATEGORIES)) {
    const items = filtered.filter(s => s.category === key);
    if (items.length > 0) grouped[key] = items;
  }

  let html = '';
  for (const [catKey, items] of Object.entries(grouped)) {
    const cat = CATEGORIES[catKey];
    // Auto-open if filter is active for this category, else collapsed
    const isOpen = activeFilter === catKey;
    html += `
      <section class="category-section cat-${catKey}${isOpen ? ' cat-open' : ''}" id="${catKey}">
        <div class="category-header" onclick="this.parentElement.classList.toggle('cat-open')">
          <div class="category-icon">${cat.icon}</div>
          <h2 class="category-title">${cat.name}</h2>
          <span class="category-count">${items.length} signals</span>
          <svg class="cat-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="signals-grid">
          ${items.map((s, i) => renderCard(s, catKey, i)).join('')}
        </div>
      </section>
    `;
  }
  container.innerHTML = html;
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));

  document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.signal-card');
      card.classList.toggle('expanded');
      btn.textContent = card.classList.contains('expanded') ? 'Show less' : 'Read more';
    });
  });
}

function renderCard(signal, catKey) {
  const date = formatDate(signal.date);
  const hasLong = signal.description && signal.description.length > 200;
  const url = signal.source_url || '#';
  const domain = url !== '#' ? new URL(url).hostname.replace('www.','') : '';
  const signalKey = encodeURIComponent(getSignalKey(signal));
  return `
    <div class="signal-card" data-signal-key="${signalKey}">
      <div class="signal-card-top">
        <div class="signal-institution"><span class="dot"></span>${signal.institution}</div>
        <span class="signal-date">${date}</span>
      </div>
      <div class="signal-initiative">${signal.initiative || ''}</div>
      <div class="signal-description">${signal.description || ''}</div>
      ${hasLong ? '<button class="expand-btn">Read more</button>' : ''}
      <div class="signal-footer">
        ${url !== '#' ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="signal-source" data-signal-key="${signalKey}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>${domain}</a>` : '<span></span>'}
        <span class="signal-tag tag-${catKey}">${TAG_LABELS[catKey]}</span>
      </div>
    </div>
  `;
}

function renderPopularityAnalysis() {
  const container = document.getElementById('signalScoringMatrixContainer');
  const legendEl = document.getElementById('signalScoringLegend');
  if (!container) return;

  const formatScore = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0.0';
    return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  const displayVal = (val) => {
    if (signalScoringColorMode === 'percentile') return Math.round(getColorBasis(val) * 100);
    return formatScore(val);
  };

  const displaySuffix = signalScoringColorMode === 'percentile' ? 'th percentile' : ' strength';

  const signals = getOperationalSignals();
  const instTypes = [
    'Global Banks',
    'Asset & Investment Management',
    'Payments Providers',
    'Exchanges & Central Intermediaries',
    'Regulatory Agencies',
    'Infrastructure & Technology'
  ];
  const shortNames = ['Banks', 'Asset Mgmt', 'Payments', 'Exchanges', 'Regulators', 'Infra/Tech'];
  const initTypes = getMatrixInitiatives();
  const shortInit = initTypes.map(name => name
    .replace('Tokenized Securities / RWA', 'Tokenized Securities')
    .replace('DLT / Blockchain Infrastructure', 'DLT / Blockchain')
    .replace('Payment Infrastructure', 'Payment Infra')
    .replace('Stablecoins & Deposit Tokens', 'Stablecoins')
    .replace('Digital Asset Strategy', 'Digital Strategy'));

  const sourceCounts = {};
  signals.forEach(signal => {
    const source = getSignalSourceName(signal);
    if (!source) return;
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });
  const maxSourceCount = Math.max(1, ...Object.values(sourceCounts));
  const cellDetails = {};

  const strengthMatrix = instTypes.map(() => initTypes.map(() => 0));
  const countMatrix = instTypes.map(() => initTypes.map(() => 0));
  let maxVal = 0;

  signals.forEach(signal => {
    const rowIndex = instTypes.indexOf(signal.institution_type);
    if (rowIndex < 0) return;

    const score = getSignalStrengthScore(signal, sourceCounts, maxSourceCount);

    (signal.initiative_types || []).forEach(init => {
      const colIndex = initTypes.indexOf(init);
      if (colIndex < 0) return;
      strengthMatrix[rowIndex][colIndex] += score;
      countMatrix[rowIndex][colIndex] += 1;
      const key = `${signal.institution_type}|||${init}`;
      if (!cellDetails[key]) cellDetails[key] = [];
      cellDetails[key].push({
        institution: signal.institution,
        initiative: signal.initiative,
        source: getSignalSourceName(signal),
        date: signal.date,
        score,
        credibilityWeight: resolveSourceMeta(signal).weight || 0.9,
        recencyWeight: getRecencyWeight(signal.date),
        prevalenceWeight: getSourcePrevalenceWeight(getSignalSourceName(signal), sourceCounts, maxSourceCount)
      });
    });
  });

  const matrix = signalScoringMetricMode === 'count' ? countMatrix : strengthMatrix;
  matrix.forEach(row => row.forEach(val => {
    if (val > maxVal) maxVal = val;
  }));

  window._signalStrengthMatrixDetails = cellDetails;

  if (maxVal <= 0) {
    container.innerHTML = '<div class="pop-empty">No signal strength data available</div>';
    return;
  }

  const nonZeroValues = matrix.flat().filter(val => val > 0).sort((a, b) => a - b);

  function getColorBasis(val) {
    if (val === 0) return 0;
    if (signalScoringColorMode === 'percentile') {
      if (!nonZeroValues.length) return 0;
      const belowOrEqual = nonZeroValues.filter(entry => entry <= val).length;
      return belowOrEqual / nonZeroValues.length;
    }
    return maxVal > 0 ? val / maxVal : 0;
  }

  function cellColor(val) {
    if (val === 0) return 'var(--color-surface-offset)';
    const intensity = getColorBasis(val);
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (intensity < 0.25) return isLight ? 'rgba(0,136,170,0.10)' : 'rgba(0,212,255,0.08)';
    if (intensity < 0.5) return isLight ? 'rgba(0,136,170,0.25)' : 'rgba(0,212,255,0.18)';
    if (intensity < 0.75) return isLight ? 'rgba(0,136,170,0.45)' : 'rgba(0,212,255,0.35)';
    return isLight ? 'rgba(0,136,170,0.7)' : 'rgba(0,212,255,0.55)';
  }

  function textCol(val) {
    if (val === 0) return 'var(--color-text-faint)';
    return getColorBasis(val) > 0.5 ? '#fff' : 'var(--color-text)';
  }

  const rowTotals = matrix.map(row => row.reduce((sum, val) => sum + val, 0));
  const colTotals = initTypes.map((_, ci) => matrix.reduce((sum, row) => sum + row[ci], 0));
  const grandTotal = rowTotals.reduce((sum, val) => sum + val, 0);

  document.getElementById('signalMetricStrengthBtn')?.classList.toggle('is-active', signalScoringMetricMode === 'strength');
  document.getElementById('signalMetricCountBtn')?.classList.toggle('is-active', signalScoringMetricMode === 'count');
  document.getElementById('signalColorAbsoluteBtn')?.classList.toggle('is-active', signalScoringColorMode === 'absolute');
  document.getElementById('signalColorPercentileBtn')?.classList.toggle('is-active', signalScoringColorMode === 'percentile');

  let html = '<table class="heatmap-table"><thead><tr><th></th>';
  shortInit.forEach(h => { html += `<th class="heatmap-col-header">${h}</th>`; });
  html += '<th class="heatmap-col-header heatmap-total-header">Total</th>';
  html += '</tr></thead><tbody>';

  matrix.forEach((row, i) => {
    html += `<tr><td class="heatmap-row-label">${shortNames[i]}</td>`;
    row.forEach((val, ci) => {
      const instArg = JSON.stringify(instTypes[i]);
      const initArg = JSON.stringify(initTypes[ci]);
      if (val > 0) {
        html += `<td class="heatmap-cell" style="background:${cellColor(val)};color:${textCol(val)};cursor:pointer" title="${instTypes[i]} x ${initTypes[ci]}: ${displayVal(val)}${displaySuffix} (click for breakdown)" onclick='showSignalStrengthBreakdown(${instArg},${initArg})'>${displayVal(val)}</td>`;
      } else {
        html += `<td class="heatmap-cell" style="background:${cellColor(val)};color:${textCol(val)}" title="${instTypes[i]} x ${initTypes[ci]}: 0.0">-</td>`;
      }
    });
    html += `<td class="heatmap-cell heatmap-total-cell">${formatScore(rowTotals[i])}</td>`;
    html += '</tr>';
  });

  html += '<tr class="heatmap-totals-row"><td class="heatmap-row-label heatmap-total-label">Total</td>';
  colTotals.forEach(val => {
    html += `<td class="heatmap-cell heatmap-total-cell">${formatScore(val)}</td>`;
  });
  html += `<td class="heatmap-cell heatmap-grand-total">${formatScore(grandTotal)}</td>`;
  html += '</tr>';
  html += '</tbody></table>';

  container.innerHTML = html;

  if (legendEl) {
    const modeLabel = signalScoringMetricMode === 'count' ? 'raw signal count' : 'weighted strength';
    const colorLabel = signalScoringColorMode === 'percentile' ? 'percentile shading' : 'absolute shading';
    legendEl.innerHTML = `
      <div class="signal-strength-legend-scale">
        <div class="signal-strength-legend-title">Strength Scale</div>
        <div class="signal-strength-legend-scale-bar">
          <span class="signal-strength-legend-swatch" style="background:${cellColor(maxVal * 0.12)}"></span>
          <span class="signal-strength-legend-swatch" style="background:${cellColor(maxVal * 0.38)}"></span>
          <span class="signal-strength-legend-swatch" style="background:${cellColor(maxVal * 0.62)}"></span>
          <span class="signal-strength-legend-swatch" style="background:${cellColor(maxVal * 0.9)}"></span>
        </div>
        <div class="signal-strength-legend-labels">
          <span>Low</span><span>Moderate</span><span>High</span><span>Very High</span>
        </div>
      </div>
      <div class="signal-strength-legend-method">
        <div class="signal-strength-legend-title">Method</div>
        <p>Current view shows <strong>${modeLabel}</strong> with <strong>${colorLabel}</strong>. Weighted strength uses source credibility, recency, and a capped prevalence boost. Click a cell for count, average weights, and top contributors.</p>
      </div>
    `;
  }
}

function closeSignalStrengthBreakdown() {
  const panel = document.getElementById('signalScoringBreakdown');
  if (panel) panel.style.display = 'none';
}

function showSignalStrengthBreakdown(institutionType, initiativeType) {
  const panel = document.getElementById('signalScoringBreakdown');
  const key = `${institutionType}|||${initiativeType}`;
  const items = window._signalStrengthMatrixDetails?.[key] || [];
  if (!panel || !items.length) return;

  trackMatrixCellClick(institutionType, initiativeType);

  const totalScore = items.reduce((sum, item) => sum + item.score, 0);
  const rawCount = items.length;
  const avgCredibility = items.reduce((sum, item) => sum + item.credibilityWeight, 0) / items.length;
  const avgRecency = items.reduce((sum, item) => sum + item.recencyWeight, 0) / items.length;
  const avgPrevalence = items.reduce((sum, item) => sum + item.prevalenceWeight, 0) / items.length;

  const sourceAgg = {};
  items.forEach(item => {
    const source = item.source || 'Unknown';
    if (!sourceAgg[source]) sourceAgg[source] = { score: 0, count: 0 };
    sourceAgg[source].score += item.score;
    sourceAgg[source].count += 1;
  });
  const topSources = Object.entries(sourceAgg)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 5);

  const topSignals = [...items]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const navigateInstArg = JSON.stringify(institutionType);
  const navigateInitArg = JSON.stringify(initiativeType);

  const primaryMetricLabel = signalScoringMetricMode === 'count' ? 'Cell Value (Count)' : 'Cell Value (Strength)';
  const primaryMetricValue = signalScoringMetricMode === 'count' ? rawCount : totalScore.toFixed(1);

  panel.innerHTML = `
    <div class="signal-strength-breakdown-header">
      <div class="signal-strength-breakdown-title">
        <h4>${escapeHtml(institutionType)} x ${escapeHtml(initiativeType)}</h4>
        <p>Cell breakdown for ${signalScoringMetricMode === 'count' ? 'raw signal count' : 'aggregate weighted strength'}.</p>
      </div>
      <button type="button" class="signal-strength-breakdown-close" onclick="closeSignalStrengthBreakdown()">Close</button>
    </div>
    <div class="signal-strength-breakdown-stats">
      <div class="signal-strength-stat"><span class="signal-strength-stat-label">${primaryMetricLabel}</span><span class="signal-strength-stat-value">${primaryMetricValue}</span></div>
      <div class="signal-strength-stat"><span class="signal-strength-stat-label">Signals</span><span class="signal-strength-stat-value">${rawCount}</span></div>
      <div class="signal-strength-stat"><span class="signal-strength-stat-label">Weighted Strength</span><span class="signal-strength-stat-value">${totalScore.toFixed(1)}</span></div>
      <div class="signal-strength-stat"><span class="signal-strength-stat-label">Avg Credibility</span><span class="signal-strength-stat-value">${avgCredibility.toFixed(2)}x</span></div>
      <div class="signal-strength-stat"><span class="signal-strength-stat-label">Avg Recency</span><span class="signal-strength-stat-value">${avgRecency.toFixed(2)}x</span></div>
      <div class="signal-strength-stat"><span class="signal-strength-stat-label">Avg Prevalence</span><span class="signal-strength-stat-value">${avgPrevalence.toFixed(2)}x</span></div>
    </div>
    <div class="signal-strength-breakdown-grid">
      <div class="signal-strength-breakdown-card">
        <h5>Top Contributing Sources</h5>
        <ul class="signal-strength-breakdown-list">
          ${topSources.map(([source, data]) => `<li><strong>${escapeHtml(source)}</strong><span>${data.count} signals | ${data.score.toFixed(1)}</span></li>`).join('')}
        </ul>
      </div>
      <div class="signal-strength-breakdown-card">
        <h5>Top Contributing Signals</h5>
        <ul class="signal-strength-breakdown-list">
          ${topSignals.map(item => `<li><strong>${escapeHtml(item.institution)}</strong><span>${escapeHtml(item.initiative)} | ${item.score.toFixed(1)}</span></li>`).join('')}
        </ul>
      </div>
    </div>
    <div class="signal-strength-breakdown-actions">
      <button type="button" onclick='navigateToMatrixSelection(${navigateInstArg},${navigateInitArg})'>View Matching Signals</button>
    </div>
  `;
  panel.style.display = 'block';
}

function formatDate(d) {
  if (!d) return '';
  try { const dt = new Date(d); return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); } catch { return d; }
}

// ===== SIGNAL DETAILS & ANALYSIS =====
function showSignalDetail(signalData) {
  const panel = document.getElementById('signalDetailPanel');
  if (!panel) return;
  
  // Calculate recency information
  const dateObj = new Date(signalData.date || new Date());
  const daysAgo = Math.floor((Date.now() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
  const dateStr = daysAgo < 0 ? 'upcoming' : daysAgo === 0 ? 'today' : daysAgo <= 365 ? `${daysAgo}d ago` : formatDate(signalData.date || new Date());
  const recencyWeight = getRecencyWeight(signalData.date || new Date().toISOString().split('T')[0]);
  
  // Find full signal object for additional metadata
  const fullSignal = getOperationalSignals().find(s => 
    s.institution === signalData.institution && 
    s.initiative === signalData.initiative && 
    s.date === signalData.date
  ) || { description: 'N/A', signal_type: 'Unknown' };
  
  const tierBadge = signalData.tier ? 
    `<span class="tier-badge tier-${signalData.tier.toLowerCase()}">${signalData.tier}</span>` : '';
  
  const formattedDate = formatDate(signalData.date || new Date());
  
  panel.innerHTML = `
    <div class="signal-detail-header">
      <div class="signal-detail-title">
        <h3>${signalData.institution}</h3>
        <p class="signal-detail-initiative">${signalData.initiative}</p>
      </div>
      ${tierBadge}
      <button class="signal-detail-close" onclick="closeSignalDetail()">✕</button>
    </div>
    <div class="signal-detail-content">
      <div class="signal-detail-row">
        <span class="signal-detail-label">Description:</span>
        <span class="signal-detail-value">${fullSignal.description || 'N/A'}</span>
      </div>
      <div class="signal-detail-row">
        <span class="signal-detail-label">Signal Type:</span>
        <span class="signal-detail-value">${fullSignal.signal_type || 'Unknown'}</span>
      </div>
      <div class="signal-detail-row">
        <span class="signal-detail-label">Source:</span>
        <span class="signal-detail-value">${signalData.source || 'Unknown'}</span>
      </div>
      <div class="signal-detail-row">
        <span class="signal-detail-label">Date:</span>
        <span class="signal-detail-value">${formattedDate} (${dateStr})</span>
      </div>
      <div class="signal-detail-row">
        <span class="signal-detail-label">Credibility Weight:</span>
        <span class="signal-detail-value">${recencyWeight.toFixed(3)}x (tier: ${signalData.tier || 'Unclassified'})</span>
      </div>
      <div class="signal-detail-row">
        <span class="signal-detail-label">Score:</span>
        <span class="signal-detail-value">${signalData.score.toFixed(2)}</span>
      </div>
    </div>
  `;
  panel.style.display = 'block';
}

function closeSignalDetail() {
  const panel = document.getElementById('signalDetailPanel');
  if (panel) panel.style.display = 'none';
}

function renderSourceQualityDistribution() {
  const signalsCtx = document.getElementById('sourceQualitySignalsChart');
  const sourcesCtx = document.getElementById('sourceQualitySourcesChart');
  if (!signalsCtx || !sourcesCtx) return;

  if (chartInstances.sourceQualitySignals) chartInstances.sourceQualitySignals.destroy();
  if (chartInstances.sourceQualitySources) chartInstances.sourceQualitySources.destroy();

  const signals = getOperationalSignals();
  const tierSignalCounts = { Primary: 0, Secondary: 0, Tertiary: 0, Unclassified: 0 };
  const tierSourceSets = { Primary: new Set(), Secondary: new Set(), Tertiary: new Set(), Unclassified: new Set() };

  signals.forEach(signal => {
    const source = getSignalSourceName(signal) || 'Unknown';
    const meta = resolveSourceMeta(signal);
    const tier = meta.tier || 'Unclassified';
    tierSignalCounts[tier] = (tierSignalCounts[tier] || 0) + 1;
    if (!tierSourceSets[tier]) tierSourceSets[tier] = new Set();
    tierSourceSets[tier].add(source);
  });

  const labels = ['Primary', 'Secondary', 'Tertiary', 'Unclassified'];
  const tierColors = {
    Primary: '#00d4ff',
    Secondary: '#7c5cff',
    Tertiary: '#00cc88',
    Unclassified: '#888888'
  };
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim();
  const surfaceOffset = getComputedStyle(document.documentElement).getPropertyValue('--color-surface-offset').trim();

  chartInstances.sourceQualitySignals = new Chart(signalsCtx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: labels.map(label => tierSignalCounts[label] || 0),
        backgroundColor: labels.map(label => tierColors[label]),
        borderColor: 'transparent',
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '58%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor,
            font: { family: "'Satoshi', 'Inter', sans-serif", size: 12 },
            boxWidth: 12,
            padding: 10
          }
        }
      }
    }
  });

  chartInstances.sourceQualitySources = new Chart(sourcesCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Unique Sources',
        data: labels.map(label => tierSourceSets[label]?.size || 0),
        backgroundColor: labels.map(label => tierColors[label]),
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: textColor, font: { family: "'Satoshi', 'Inter', sans-serif", size: 12 } },
          grid: { color: surfaceOffset }
        },
        y: {
          ticks: { color: textColor, font: { family: "'Satoshi', 'Inter', sans-serif", size: 12 } },
          grid: { display: false }
        }
      }
    }
  });
}

function renderSignalVelocityChart() {
  const ctx = document.getElementById('velocityChart');
  if (!ctx) return;
  
  // Destroy existing chart if present
  if (chartInstances.velocity) {
    chartInstances.velocity.destroy();
  }
  
  const signals = getOperationalSignals();
  const monthCounts = {};
  const now = new Date();
  const monthsBack = 12;
  
  // Initialize all months
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().substring(0, 7); // YYYY-MM format
    monthCounts[key] = 0;
  }
  
  // Count signals by month
  signals.forEach(signal => {
    if (signal.date) {
      const key = signal.date.substring(0, 7);
      if (key in monthCounts) {
        monthCounts[key]++;
      }
    }
  });
  
  const labels = Object.keys(monthCounts).sort();
  const data = labels.map(label => monthCounts[label]);
  
  const txtColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim();
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
  const surfaceOffset = getComputedStyle(document.documentElement).getPropertyValue('--color-surface-offset').trim();
  
  chartInstances.velocity = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.map(m => {
        const [year, month] = m.split('-');
        return new Date(year, parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }),
      datasets: [{
        label: 'Signals',
        data: data,
        backgroundColor: primaryColor,
        borderColor: primaryColor,
        borderRadius: 4,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: txtColor, font: { family: "'Satoshi', 'Inter', sans-serif", size: 12 } },
          grid: { color: surfaceOffset }
        },
        x: {
          ticks: { color: txtColor, font: { family: "'Satoshi', 'Inter', sans-serif", size: 12 } },
          grid: { display: false }
        }
      }
    }
  });
}

function renderTierBreakdownChart() {
  const ctx = document.getElementById('tierChart');
  if (!ctx) return;
  
  // Destroy existing chart if present
  if (chartInstances.tier) {
    chartInstances.tier.destroy();
  }
  
  const signals = getOperationalSignals();
  const tierCounts = { 'Primary': 0, 'Secondary': 0, 'Tertiary': 0, 'Unclassified': 0 };
  
  signals.forEach(signal => {
    const meta = resolveSourceMeta(signal);
    const tier = meta.tier || 'Unclassified';
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
  });
  
  const labels = Object.keys(tierCounts);
  const data = Object.values(tierCounts);
  
  // Map tiers to colors
  const tierColors = {
    'Primary': '#00d4ff',   // cyan/primary
    'Secondary': '#7c5cff',  // purple
    'Tertiary': '#00cc88',   // green
    'Unclassified': '#888888'  // gray
  };
  
  const txtColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim();
  
  chartInstances.tier = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: labels.map(l => tierColors[l] || '#999999'),
        borderColor: 'transparent',
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: txtColor,
            font: { family: "'Satoshi', 'Inter', sans-serif", size: 12 },
            boxWidth: 12,
            padding: 10
          }
        }
      }
    }
  });
}

// ===== INSTITUTION DIRECTORY =====
let dirSearch = '';
let dirSort = 'signals';

function renderDirectory() {
  const container = document.getElementById('directoryContainer');
  if (!container) return;
  const signals = getOperationalSignals();

  const colorMap = {
    'Global Banks': 'var(--color-banks)',
    'Asset & Investment Management': 'var(--color-asset-mgmt)',
    'Payments Providers': 'var(--color-payments)',
    'Exchanges & Central Intermediaries': 'var(--color-exchanges)',
    'Regulatory Agencies': 'var(--color-regulators)',
    'Infrastructure & Technology': 'var(--color-ecosystem)'
  };
  const catOrder = ['Global Banks', 'Asset & Investment Management', 'Payments Providers', 'Exchanges & Central Intermediaries', 'Regulatory Agencies', 'Infrastructure & Technology'];

  // Build institution data
  const instMap = {};
  signals.forEach(s => {
    const key = s.institution;
    if (!instMap[key]) {
      instMap[key] = {
        name: key,
        type: s.institution_type,
        signals: 0,
        signalTypes: {},
        initiativeTypes: new Set(),
        fmiAreas: new Set()
      };
    }
    const inst = instMap[key];
    inst.signals++;
    inst.signalTypes[s.signal_type] = (inst.signalTypes[s.signal_type] || 0) + 1;
    (s.initiative_types || []).forEach(t => inst.initiativeTypes.add(t));
    (s.fmi_areas || []).forEach(a => inst.fmiAreas.add(a));
  });

  // Group by category
  const grouped = {};
  catOrder.forEach(cat => { grouped[cat] = []; });
  Object.values(instMap).forEach(inst => {
    if (dirSearch && !inst.name.toLowerCase().includes(dirSearch)) return;
    if (grouped[inst.type]) grouped[inst.type].push(inst);
  });

  // Sort within each group
  Object.values(grouped).forEach(arr => {
    if (dirSort === 'signals') arr.sort((a, b) => b.signals - a.signals);
    else arr.sort((a, b) => a.name.localeCompare(b.name));
  });

  // Short labels
  const shortInit = {
    'Tokenized Securities / RWA': 'Tokenized',
    'DLT / Blockchain Infrastructure': 'DLT/Blockchain',
    'Crypto / Digital Assets': 'Crypto',
    'Payment Infrastructure': 'Payments',
    'Stablecoins & Deposit Tokens': 'Stablecoins',
    'CBDC': 'CBDC',
    'DeFi': 'DeFi',
    'Digital Asset Strategy': 'Strategy'
  };
  const shortFMI = {
    'Tokenization & Issuance': 'Tokenization',
    'Regulation & Compliance': 'Regulation',
    'Digital Currency & Stablecoins': 'Digital Currency',
    'Payments & Transfers': 'Payments',
    'Settlement & Clearing': 'Settlement',
    'Interoperability & Standards': 'Interop',
    'Trading & Exchange': 'Trading',
    'Collateral & Lending': 'Collateral',
    'Custody & Safekeeping': 'Custody',
    'Data & Reporting': 'Data',
    'General Infrastructure': 'General'
  };

  let html = '';
  catOrder.forEach(cat => {
    const insts = grouped[cat];
    if (insts.length === 0) return;
    const totalSignals = insts.reduce((s, i) => s + i.signals, 0);
    const color = colorMap[cat];
    const isOpen = false; // collapsed by default

    html += `<div class="dir-category${isOpen ? ' open' : ''}">`;
    html += `<div class="dir-category-header" onclick="this.parentElement.classList.toggle('open')">`;
    html += `<span class="dir-cat-dot" style="background:${color}"></span>`;
    html += `<span class="dir-cat-name">${cat}</span>`;
    html += `<span class="dir-cat-count">${insts.length} institutions · ${totalSignals} signals</span>`;
    html += `<svg class="dir-cat-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;
    html += `</div>`;

    html += `<div class="dir-category-body"><div class="directory-table-wrap">`;
    html += `<table class="dir-table"><thead><tr>`;
    html += `<th>Institution</th><th class="num">Signals</th><th>Signal Types</th><th>Initiative Classification</th><th>FMI Areas</th>`;
    html += `</tr></thead><tbody>`;

    const catKeyMap = { 'Global Banks':'global_banks', 'Asset & Investment Management':'asset_management', 'Payments Providers':'payments', 'Exchanges & Central Intermediaries':'exchanges_intermediaries', 'Regulatory Agencies':'regulators', 'Infrastructure & Technology':'ecosystem' };
    const thisCatKey = catKeyMap[cat] || '';

    insts.forEach(inst => {
      const maxSigType = Math.max(...Object.values(inst.signalTypes));

      // Signal type mini bars — clickable
      const sigTypesHtml = Object.entries(inst.signalTypes)
        .sort((a,b) => b[1] - a[1])
        .map(([type, count]) => {
          const shortLabel = type.replace('Platform / Infrastructure','Platform').replace('Strategic Partnership','Partnership').replace('Strategic Initiative','Initiative').replace('Regulatory Action','Regulatory').replace('Investment / M&A','Investment').replace('Pilot / Trial','Pilot').replace('Product Launch','Launch');
          return `<span class="cell-tag cell-tag-link" title="${type}: ${count} — Click to view signals" onclick="navigateToSignal('${inst.name.replace(/'/g, "\\'")}'${thisCatKey ? ', \'' + thisCatKey + '\'' : ''})">${shortLabel} ${count}</span>`;
        }).join('');

      // Initiative type tags — clickable
      const initHtml = [...inst.initiativeTypes]
        .map(t => `<span class="cell-tag cell-tag-link" title="${t} — Click to view signals" onclick="navigateToSignal('${inst.name.replace(/'/g, "\\'")}'${thisCatKey ? ', \'' + thisCatKey + '\'' : ''})">${shortInit[t] || t}</span>`)
        .join('');

      // FMI area tags — clickable
      const fmiHtml = [...inst.fmiAreas]
        .filter(a => a !== 'General Infrastructure')
        .map(a => `<span class="cell-tag cell-tag-link" title="${a} — Click to view signals" onclick="navigateToSignal('${inst.name.replace(/'/g, "\\'")}'${thisCatKey ? ', \'' + thisCatKey + '\'' : ''})">${shortFMI[a] || a}</span>`)
        .join('');

      html += `<tr>`;
      html += `<td class="inst-name"><a class="inst-name-link" href="javascript:void(0)" onclick="navigateToSignal('${inst.name.replace(/'/g, "\\'")}'${thisCatKey ? ', \'' + thisCatKey + '\'' : ''})">${inst.name}</a></td>`;
      html += `<td class="num" style="color:${color};font-size:13px;"><a class="inst-count-link" href="javascript:void(0)" onclick="navigateToSignal('${inst.name.replace(/'/g, "\\'")}'${thisCatKey ? ', \'' + thisCatKey + '\'' : ''})">${inst.signals}</a></td>`;
      html += `<td><div class="cell-tags">${sigTypesHtml}</div></td>`;
      html += `<td><div class="cell-tags">${initHtml}</div></td>`;
      html += `<td><div class="cell-tags">${fmiHtml}</div></td>`;
      html += `</tr>`;
    });

    html += `</tbody></table></div></div></div>`;
  });

  if (!html) {
    html = '<div style="text-align:center;padding:var(--space-8);color:var(--color-text-muted);">No institutions match your filter.</div>';
  }

  container.innerHTML = html;
}

// Directory search/sort handlers
document.getElementById('directorySearch')?.addEventListener('input', (e) => {
  dirSearch = e.target.value.toLowerCase().trim();
  if (dirSearch) trackSearch(dirSearch, 'Institutional Directory');
  renderDirectory();
  updateResetBars();
});
document.getElementById('directorySort')?.addEventListener('change', (e) => {
  dirSort = e.target.value;
  trackFilter('directory_sort', dirSort);
  renderDirectory();
  updateResetBars();
});

// ===== NAVIGATE TO SIGNAL LIBRARY =====
function navigateToSignal(query, catKey) {
  // 1. Open the signal library if closed
  const libSection = document.querySelector('.signal-library-section');
  const libBody = document.getElementById('libraryBody');
  if (!libSection.classList.contains('open')) {
    libSection.classList.add('open');
    libBody.style.display = 'block';
  }

  // 2. If catKey provided, activate that filter pill
  matrixFilter = null;
  if (catKey) {
    activeFilter = catKey;
    const pills = document.querySelectorAll('.filter-pill');
    pills.forEach(p => {
      p.classList.remove('active');
      if (p.dataset.filter === catKey) p.classList.add('active');
    });
  } else {
    activeFilter = 'all';
    const pills = document.querySelectorAll('.filter-pill');
    pills.forEach(p => {
      p.classList.remove('active');
      if (p.dataset.filter === 'all') p.classList.add('active');
    });
  }

  // 3. Set search query
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = query;
    searchQuery = query.toLowerCase().trim();
  }

  // 4. Re-render signals (categories will auto-open if filter matches)
  renderSignals();

  // 5. Open all matching category sections so results are visible
  setTimeout(() => {
    document.querySelectorAll('.category-section').forEach(s => s.classList.add('cat-open'));
    // Scroll to the signal library
    libSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  // Show reset bars
  updateResetBars();
}

function categoryForInstitutionType(instType) {
  const map = {
    'Global Banks': 'global_banks',
    'Asset & Investment Management': 'asset_management',
    'Payments Providers': 'payments',
    'Exchanges & Central Intermediaries': 'exchanges_intermediaries',
    'Regulatory Agencies': 'regulators',
    'Infrastructure & Technology': 'ecosystem',
    'Intelligence & Research': 'intel_briefs'
  };
  return map[instType] || 'all';
}

function navigateToMatrixSelection(institutionType, initiativeType) {
  // Track matrix cell click
  trackMatrixCellClick(institutionType, initiativeType);
  trackDrillDown('Initiative Matrix', 'Signal Catalogue');

  // 1. Open the signal library if closed
  const libSection = document.querySelector('.signal-library-section');
  const libBody = document.getElementById('libraryBody');
  if (!libSection.classList.contains('open')) {
    libSection.classList.add('open');
    libBody.style.display = 'block';
  }

  // 2. Apply matrix filter and category pill
  matrixFilter = { institutionType, initiativeType };
  const catKey = categoryForInstitutionType(institutionType);
  activeFilter = catKey;

  const pills = document.querySelectorAll('.filter-pill');
  pills.forEach(p => {
    p.classList.remove('active');
    if (p.dataset.filter === catKey) p.classList.add('active');
  });

  // 3. Clear free-text search to avoid accidental over-filtering
  searchQuery = '';
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  // 4. Render and open all visible sections
  renderSignals();
  setTimeout(() => {
    document.querySelectorAll('.category-section').forEach(s => s.classList.add('cat-open'));
    libSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  updateResetBars();
}

function clearMatrixFilter() {
  matrixFilter = null;
  renderSignals();
  updateResetBars();
}

function renderMatrixFilterChip() {
  const chip = document.getElementById('matrixFilterChip');
  const label = document.getElementById('matrixFilterChipLabel');
  if (!chip || !label) return;

  if (!matrixFilter) {
    chip.style.display = 'none';
    return;
  }

  const shortInst = matrixFilter.institutionType
    .replace('Asset & Investment Management', 'Asset Mgmt')
    .replace('Exchanges & Central Intermediaries', 'Exchanges')
    .replace('Infrastructure & Technology', 'Infra & Tech');
  const shortInit = matrixFilter.initiativeType
    .replace('Tokenized Securities / RWA', 'Tokenized Securities/RWA')
    .replace('DLT / Blockchain Infrastructure', 'DLT/Blockchain Infra')
    .replace('Stablecoins & Deposit Tokens', 'Stablecoins');

  label.textContent = `Matrix filter: ${shortInst} x ${shortInit}`;
  chip.style.display = 'inline-flex';
}

// ===== GLOBAL RESET FILTERS =====
function resetAllFilters() {
  // Reset directory search
  dirSearch = '';
  const dirSearchInput = document.getElementById('directorySearch');
  if (dirSearchInput) dirSearchInput.value = '';

  // Reset directory sort
  dirSort = 'signals';
  const dirSortEl = document.getElementById('directorySort');
  if (dirSortEl) dirSortEl.value = 'signals';

  // Reset signal library search
  searchQuery = '';
  matrixFilter = null;
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  // Reset signal library filter
  activeFilter = 'all';
  const pills = document.querySelectorAll('.filter-pill');
  pills.forEach(p => {
    p.classList.remove('active');
    if (p.dataset.filter === 'all') p.classList.add('active');
  });

  // Close KPI breakdown
  closeKPIBreakdown();

  // Close FMI drilldown
  const fmiDrilldown = document.getElementById('fmiDrilldown');
  if (fmiDrilldown) fmiDrilldown.style.display = 'none';

  // Re-render everything
  renderDirectory();
  renderSignals();

  // Collapse all signal library categories back
  document.querySelectorAll('.category-section').forEach(s => s.classList.remove('cat-open'));

  // Hide reset bars
  updateResetBars();
}

function updateResetBars() {
  const hasDirectoryFilter = dirSearch !== '' || dirSort !== 'signals';
  const hasLibraryFilter = searchQuery !== '' || activeFilter !== 'all' || matrixFilter !== null;
  const hasAnyFilter = hasDirectoryFilter || hasLibraryFilter;

  const dirReset = document.getElementById('resetDirectoryFilters');
  const libReset = document.getElementById('resetLibraryFilters');

  if (dirReset) dirReset.classList.toggle('visible', hasAnyFilter);
  if (libReset) libReset.classList.toggle('visible', hasAnyFilter);
}
