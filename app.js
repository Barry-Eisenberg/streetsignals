// ===== THEME TOGGLE =====
(function(){
  const t = document.querySelector('[data-theme-toggle]');
  const r = document.documentElement;
  let d = localStorage.getItem('theme') || 'light';
  r.setAttribute('data-theme', d);
  if (t) {
    updateToggleIcon();
    t.addEventListener('click', () => {
      d = d === 'dark' ? 'light' : 'dark';
      r.setAttribute('data-theme', d);
      localStorage.setItem('theme', d);
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

  function getSignalReferenceDateRaw(signal) {
    return String(getSignalSourceDateRaw(signal) || signal?.date || '').trim();
  }

  function normalizeDetailList(values) {
    if (!Array.isArray(values) || values.length === 0) return [];
    return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
  }

  function getSignalDetailInitiatives(signal) {
    const initiatives = normalizeDetailList(normalizeInitiativeTypes(signal?.initiative_types));
    return initiatives.length ? initiatives : ['Not yet classified'];
  }

  function getSignalDetailFmiAreas(signal) {
    const areas = normalizeDetailList(normalizeFmiAreas(signal?.fmi_areas));
    const specificAreas = areas.filter(area => area !== 'General Infrastructure');
    if (specificAreas.length) return specificAreas;
    return areas.length ? areas : ['Not yet mapped'];
  }

  function getSignalDetailAudience(signal) {
    const audience = normalizeDetailList(inferSignalPersona(signal));
    return audience.length ? audience : ['Institutional infrastructure teams'];
  }

  function findSignalByReference(reference, signals = allSignals) {
    const signalKey = String(reference?.signalKey || '').trim().toLowerCase();
    const signalDate = String(reference?.date || reference?.signalDate || '').trim();
    const sourceUrl = String(reference?.sourceUrl || reference?.signalSource || '').trim();
    if (!signalKey) return null;

    const candidates = (Array.isArray(signals) ? signals : []).filter(signal => getSignalKey(signal) === signalKey);
    if (!candidates.length) return null;

    if (signalDate && sourceUrl) {
      const exactMatch = candidates.find(signal => getSignalReferenceDateRaw(signal) === signalDate && String(signal.source_url || '').trim() === sourceUrl);
      if (exactMatch) return exactMatch;
    }

    if (signalDate) {
      const dateMatch = candidates.find(signal => getSignalReferenceDateRaw(signal) === signalDate);
      if (dateMatch) return dateMatch;
    }

    if (sourceUrl) {
      const sourceMatch = candidates.find(signal => String(signal.source_url || '').trim() === sourceUrl);
      if (sourceMatch) return sourceMatch;
    }

    return candidates[0] || null;
  }

  function buildSignalDetailInsight(signal, importance) {
    return buildSignalDirectionalInsight(signal, importance)
      .replace(/^For [^,]+ teams,\s*/i, '')
      .replace(/\s*Most material audiences:[^.]*\./i, '')
      .replace(/\s*Lens fit:[^.]*\./i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildSignalDetailUrl(reference) {
    const url = new URL(window.location.href);
    const signalKey = String(reference?.signalKey || '').trim().toLowerCase();
    const signalDate = String(reference?.date || reference?.signalDate || '').trim();
    const sourceUrl = String(reference?.sourceUrl || reference?.signalSource || '').trim();

    if (signalKey) url.searchParams.set('signal', signalKey);
    else url.searchParams.delete('signal');

    if (signalDate) url.searchParams.set('signalDate', signalDate);
    else url.searchParams.delete('signalDate');

    if (sourceUrl) url.searchParams.set('signalSource', sourceUrl);
    else url.searchParams.delete('signalSource');

    url.hash = signalKey ? 'signal-library' : '';
    return url.toString();
  }

  function syncSignalDetailUrl(reference) {
    if (!window.history || typeof window.history.replaceState !== 'function') return;
    window.history.replaceState(window.history.state, '', buildSignalDetailUrl(reference));
  }

  function getSignalDetailRequestFromUrl() {
    const url = new URL(window.location.href);
    const signalKey = String(url.searchParams.get('signal') || '').trim().toLowerCase();
    if (!signalKey) return null;
    return {
      signalKey,
      signalDate: String(url.searchParams.get('signalDate') || '').trim(),
      signalSource: String(url.searchParams.get('signalSource') || '').trim()
    };
  }

  function clearSignalDetailUrl() {
    const current = getSignalDetailRequestFromUrl();
    if (!current) return;
    syncSignalDetailUrl({});
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text);
    }

    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (copied) resolve();
        else reject(new Error('Copy command failed'));
      } catch (error) {
        document.body.removeChild(textarea);
        reject(error);
      }
    });
  }

  function updateSignalDetailCopyButton(button, copied) {
    if (!button) return;
    button.textContent = copied ? 'Copied' : 'Copy Link';
    button.classList.toggle('is-copied', copied);
  }

  function copySignalDetailLink(button) {
    const panel = document.getElementById('signalDetailPanel');
    if (!panel) return;

    const signalKey = String(panel.dataset.signalKey || '').trim().toLowerCase();
    if (!signalKey) return;

    const signalDate = String(panel.dataset.signalDate || '').trim();
    const signalSource = String(panel.dataset.signalSource || '').trim();
    const shareUrl = buildSignalDetailUrl({ signalKey, signalDate, signalSource });

    copyTextToClipboard(shareUrl)
      .then(() => {
        updateSignalDetailCopyButton(button, true);
        window.setTimeout(() => updateSignalDetailCopyButton(button, false), 1800);
      })
      .catch(() => {
        updateSignalDetailCopyButton(button, false);
      });
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

document.getElementById('countryDirectoryToggle')?.addEventListener('click', () => {
  const section = document.querySelector('#country-directory');
  const isOpen = !section?.classList.contains('open');
  toggleCollapsible('#country-directory', 'countryDirectoryBody');
  trackSectionToggle('Country Directory', isOpen);
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

document.getElementById('signalTypeSchemaToggle')?.addEventListener('click', () => {
  const section = document.querySelector('.signal-type-schema-section');
  const isOpen = !section?.classList.contains('open');
  toggleCollapsible('.signal-type-schema-section', 'signalTypeSchemaBody');
  trackSectionToggle('Signal Type Schema', isOpen);
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

document.addEventListener('click', (e) => {
  const resetAllTrigger = e.target.closest('[data-reset-all-filters]');
  if (resetAllTrigger) {
    e.preventDefault();
    resetAllFilters();
    return;
  }

  const clearMatrixTrigger = e.target.closest('[data-clear-matrix-filter]');
  if (clearMatrixTrigger) {
    e.preventDefault();
    clearMatrixFilter();
    return;
  }

  const dimInitiativeBtn = e.target.closest('#signalDimInitiativeBtn');
  if (dimInitiativeBtn) {
    e.preventDefault();
    setSignalScoringDimensionMode('initiative');
    return;
  }

  const dimFmiBtn = e.target.closest('#signalDimFmiBtn');
  if (dimFmiBtn) {
    e.preventDefault();
    setSignalScoringDimensionMode('fmi');
    return;
  }

  const metricCountBtn = e.target.closest('#signalMetricCountBtn');
  if (metricCountBtn) {
    e.preventDefault();
    setSignalScoringMetricMode('count');
    return;
  }

  const metricStrengthBtn = e.target.closest('#signalMetricStrengthBtn');
  if (metricStrengthBtn) {
    e.preventDefault();
    setSignalScoringMetricMode('strength');
    return;
  }

  const colorAbsoluteBtn = e.target.closest('#signalColorAbsoluteBtn');
  if (colorAbsoluteBtn) {
    e.preventDefault();
    setSignalScoringColorMode('absolute');
    return;
  }

  const colorPercentileBtn = e.target.closest('#signalColorPercentileBtn');
  if (colorPercentileBtn) {
    e.preventDefault();
    setSignalScoringColorMode('percentile');
    return;
  }

  const clearScoringBtn = e.target.closest('#signalScoringClearFilterBtn');
  if (clearScoringBtn) {
    e.preventDefault();
    clearSignalScoringFilter();
    return;
  }

  const navSignalTarget = e.target.closest('[data-nav-signal-name]');
  if (navSignalTarget) {
    e.preventDefault();
    const encodedName = String(navSignalTarget.getAttribute('data-nav-signal-name') || '');
    const encodedCategory = String(navSignalTarget.getAttribute('data-nav-signal-category') || '');
    if (!encodedName) return;
    const name = decodeURIComponent(encodedName);
    const catKey = encodedCategory ? decodeURIComponent(encodedCategory) : '';
    navigateToSignal(name, catKey || undefined);
    return;
  }

  const kpiCloseBtn = e.target.closest('[data-kpi-close]');
  if (kpiCloseBtn) {
    e.preventDefault();
    closeKPIBreakdown();
    return;
  }

  const kpiDrillItem = e.target.closest('[data-kpi-drill-inst]');
  if (kpiDrillItem) {
    e.preventDefault();
    const encodedInst = String(kpiDrillItem.getAttribute('data-kpi-drill-inst') || '');
    const effectiveDateKey = String(kpiDrillItem.getAttribute('data-kpi-drill-date') || '').trim();
    if (!encodedInst) return;
    const institutionType = decodeURIComponent(encodedInst);
    if (effectiveDateKey) {
      drillDownKPIToSignalMatrixByInstitutionType(institutionType, effectiveDateKey);
    } else {
      drillDownKPIToSignalMatrixByInstitutionType(institutionType);
    }
    return;
  }

  const kpiNavSignalType = e.target.closest('[data-kpi-nav-signal-type]');
  if (kpiNavSignalType) {
    e.preventDefault();
    const encodedType = String(kpiNavSignalType.getAttribute('data-kpi-nav-signal-type') || '');
    if (!encodedType) return;
    navigateToCatalogueBySignalType(decodeURIComponent(encodedType));
    return;
  }

  const kpiNavDirectory = e.target.closest('[data-kpi-nav-directory]');
  if (kpiNavDirectory) {
    e.preventDefault();
    const catKey = String(kpiNavDirectory.getAttribute('data-kpi-nav-directory') || '').trim();
    if (!catKey) return;
    navigateToDirectorySection(catKey);
    return;
  }

  const kpiNavCountry = e.target.closest('[data-kpi-nav-country]');
  if (kpiNavCountry) {
    e.preventDefault();
    const encodedCountry = String(kpiNavCountry.getAttribute('data-kpi-nav-country') || '');
    if (!encodedCountry) return;
    navigateToCatalogueByCountry(decodeURIComponent(encodedCountry));
    return;
  }

  const drilldownClose = e.target.closest('[data-drilldown-close]');
  if (drilldownClose) {
    e.preventDefault();
    const panel = drilldownClose.closest('#signalTypeDrilldown, #fmiDrilldown');
    if (panel) panel.style.display = 'none';
    return;
  }

  const drilldownNavDirectory = e.target.closest('[data-drilldown-nav-directory]');
  if (drilldownNavDirectory) {
    e.preventDefault();
    const catKey = String(drilldownNavDirectory.getAttribute('data-drilldown-nav-directory') || '').trim();
    if (!catKey) return;
    navigateToDirectorySection(catKey);
    return;
  }

  const matrixNavCell = e.target.closest('[data-matrix-nav-inst][data-matrix-nav-init]');
  if (matrixNavCell) {
    e.preventDefault();
    const encodedInst = String(matrixNavCell.getAttribute('data-matrix-nav-inst') || '');
    const encodedInit = String(matrixNavCell.getAttribute('data-matrix-nav-init') || '');
    if (!encodedInst || !encodedInit) return;
    navigateToMatrixSelection(decodeURIComponent(encodedInst), decodeURIComponent(encodedInit));
    return;
  }

  const strengthBreakdownCell = e.target.closest('[data-strength-breakdown-inst][data-strength-breakdown-init]');
  if (strengthBreakdownCell) {
    e.preventDefault();
    const encodedInst = String(strengthBreakdownCell.getAttribute('data-strength-breakdown-inst') || '');
    const encodedInit = String(strengthBreakdownCell.getAttribute('data-strength-breakdown-init') || '');
    if (!encodedInst || !encodedInit) return;
    showSignalStrengthBreakdown(decodeURIComponent(encodedInst), decodeURIComponent(encodedInit));
    return;
  }

  const clearSignalScoringBtn = e.target.closest('[data-clear-signal-scoring]');
  if (clearSignalScoringBtn) {
    e.preventDefault();
    clearSignalScoringFilter();
    return;
  }

  const closeSignalStrengthBreakdownBtn = e.target.closest('[data-close-signal-strength-breakdown]');
  if (closeSignalStrengthBreakdownBtn) {
    e.preventDefault();
    closeSignalStrengthBreakdown();
    return;
  }

  const sbdToggle = e.target.closest('[data-sbd-toggle]');
  if (sbdToggle) {
    e.preventDefault();
    sbdToggle.closest('.signal-strength-breakdown-table-card')?.classList.toggle('sbd-expanded');
    return;
  }

  const signalDetailClose = e.target.closest('[data-signal-detail-close]');
  if (signalDetailClose) {
    e.preventDefault();
    closeSignalDetail();
    return;
  }

  const signalDetailCopy = e.target.closest('[data-copy-signal-detail]');
  if (signalDetailCopy) {
    e.preventDefault();
    copySignalDetailLink(signalDetailCopy);
    return;
  }

  const categoryHeader = e.target.closest('[data-toggle-category-open]');
  if (categoryHeader) {
    categoryHeader.parentElement?.classList.toggle('cat-open');
    return;
  }

  const directoryHeader = e.target.closest('[data-toggle-directory-open]');
  if (directoryHeader) {
    directoryHeader.parentElement?.classList.toggle('open');
    return;
  }

  const intelToggle = e.target.closest('[data-intel-toggle]');
  if (intelToggle) {
    const clickedLink = e.target.closest('a[href]');
    if (clickedLink && intelToggle.contains(clickedLink)) return;
    intelToggle.parentElement?.classList.toggle('intel-open');
  }
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

const SIGNAL_TYPE_GROUPS = [
  {
    name: 'Market Build',
    types: ['Product Launch', 'Platform / Infrastructure', 'Infrastructure Upgrade', 'Pilot / Trial']
  },
  {
    name: 'Strategy & Capital',
    types: ['Strategic Partnership', 'Strategic Initiative', 'Strategic Filing / Plan', 'Investment / M&A']
  },
  {
    name: 'Policy & Compliance',
    types: ['Regulatory Action', 'Regulatory / Compliance Framework']
  },
  {
    name: 'Intelligence',
    types: ['Research / Report']
  }
];

const SIGNAL_TYPE_DESCRIPTIONS = {
  'Product Launch': 'Public launch of a new platform feature, product rail, tokenized offering, or institutional capability.',
  'Platform / Infrastructure': 'Core platform, network, custody, or settlement infrastructure build-out and modernization.',
  'Infrastructure Upgrade': 'Material upgrade to existing infrastructure, controls, interoperability, or operational resiliency.',
  'Pilot / Trial': 'Time-bound pilot, sandbox, or proof-of-concept before full production deployment.',
  'Strategic Partnership': 'Formal partnership or alliance to co-develop, distribute, or operationalize initiatives.',
  'Strategic Initiative': 'Institution-level strategy program, transformation mandate, or operating model shift.',
  'Strategic Filing / Plan': 'Policy filing, formal roadmap, or institutionally disclosed implementation plan.',
  'Investment / M&A': 'Strategic capital deployment, stake acquisition, merger, or acquisition tied to digital asset infrastructure.',
  'Regulatory Action': 'Supervisory, policy, or enforcement action affecting institutional participation and market structure.',
  'Regulatory / Compliance Framework': 'Compliance architecture, standards, or governance framework for regulated adoption.',
  'Research / Report': 'Published research, market analysis, or institutional position paper with strategic implications.'
};

const DEPRECATED_SIGNAL_TYPES = new Set(['Intelligence Brief']);

const COUNTRY_INSTITUTION_HINTS = [
  { needle: 'monetary authority of singapore', country: 'Singapore' },
  { needle: 'mas (monetary authority of singapore)', country: 'Singapore' },
  { needle: 'singapore exchange', country: 'Singapore' },
  { needle: 'sgx', country: 'Singapore' },
  { needle: 'hong kong monetary authority', country: 'Hong Kong' },
  { needle: 'hkma', country: 'Hong Kong' },
  { needle: 'hong kong exchanges and clearing', country: 'Hong Kong' },
  { needle: 'hkex', country: 'Hong Kong' },
  { needle: 'securities and futures commission, hong kong', country: 'Hong Kong' },
  { needle: 'bank of england', country: 'United Kingdom' },
  { needle: 'london stock exchange group', country: 'United Kingdom' },
  { needle: 'lseg', country: 'United Kingdom' },
  { needle: 'barclays', country: 'United Kingdom' },
  { needle: 'hsbc', country: 'United Kingdom' },
  { needle: 'fca', country: 'United Kingdom' },
  { needle: 'deutsche borse', country: 'Germany' },
  { needle: 'deutsche bank', country: 'Germany' },
  { needle: 'clearstream', country: 'Germany' },
  { needle: 'securities and exchange commission', country: 'United States' },
  { needle: 'federal reserve', country: 'United States' },
  { needle: 'commodity futures trading commission', country: 'United States' },
  { needle: 'office of the comptroller of the currency', country: 'United States' },
  { needle: 'dtcc', country: 'United States' },
  { needle: 'nasdaq', country: 'United States' },
  { needle: 'cme group', country: 'United States' },
  { needle: 'intercontinental exchange', country: 'United States' },
  { needle: 'ice ', country: 'United States' },
  { needle: 'jp morgan', country: 'United States' },
  { needle: 'jpmorgan', country: 'United States' },
  { needle: 'j.p. morgan', country: 'United States' },
  { needle: 'goldman sachs', country: 'United States' },
  { needle: 'bank of america', country: 'United States' },
  { needle: 'morgan stanley', country: 'United States' },
  { needle: 'citigroup', country: 'United States' },
  { needle: 'citi ', country: 'United States' },
  { needle: 'bny mellon', country: 'United States' },
  { needle: 'state street', country: 'United States' },
  { needle: 'fidelity', country: 'United States' },
  { needle: 'blackrock', country: 'United States' },
  { needle: 'coinbase', country: 'United States' },
  { needle: 'robinhood', country: 'United States' },
  { needle: 'occ', country: 'United States' },
  { needle: 'australian securities exchange', country: 'Australia' },
  { needle: 'asx', country: 'Australia' },
  { needle: 'european central bank', country: 'European Union' },
  { needle: 'european securities and markets authority', country: 'European Union' },
  { needle: 'esma', country: 'European Union' },
  { needle: 'european banking authority', country: 'European Union' },
  { needle: 'eba', country: 'European Union' }
];

const COUNTRY_TEXT_PATTERNS = [
  { country: 'Hong Kong', pattern: /\bHong Kong\b/i },
  { country: 'Singapore', pattern: /\bSingapore\b/i },
  { country: 'United Kingdom', pattern: /\bUnited Kingdom\b|\bUK\b/i },
  { country: 'United States', pattern: /\bUnited States\b|\bU\.S\.\b|\bUS\b/i },
  { country: 'Switzerland', pattern: /\bSwitzerland\b|\bSwiss\b/i },
  { country: 'Germany', pattern: /\bGermany\b/i },
  { country: 'France', pattern: /\bFrance\b/i },
  { country: 'Japan', pattern: /\bJapan\b/i },
  { country: 'Australia', pattern: /\bAustralia\b/i },
  { country: 'Canada', pattern: /\bCanada\b/i },
  { country: 'South Korea', pattern: /\bSouth Korea\b|\bKorea\b/i },
  { country: 'India', pattern: /\bIndia\b/i },
  { country: 'Brazil', pattern: /\bBrazil\b/i },
  { country: 'UAE', pattern: /\bUAE\b|\bUnited Arab Emirates\b/i },
  { country: 'Ireland', pattern: /\bIreland\b/i },
  { country: 'Netherlands', pattern: /\bNetherlands\b/i },
  { country: 'Thailand', pattern: /\bThailand\b/i },
  { country: 'Turkey', pattern: /\bTurkey\b/i },
  { country: 'China', pattern: /\bChina\b/i },
  { country: 'European Union', pattern: /\bEuropean Union\b|\bEU\b/i }
];

function isVisibleSignalType(type) {
  const normalized = String(type || '').trim();
  return normalized !== '' && !DEPRECATED_SIGNAL_TYPES.has(normalized);
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeCountryName(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const aliasMap = {
    'United States of America': 'United States',
    US: 'United States',
    USA: 'United States',
    'United Arab Emirates': 'UAE',
    UK: 'United Kingdom'
  };
  return aliasMap[raw] || raw;
}

function getSignalCountryValue(signal) {
  return normalizeCountryName(signal?.country) || 'Unmapped';
}

function inferSignalCountry(signal) {
  const explicit = normalizeCountryName(signal?.country || signal?.headquarters_country);
  if (explicit) return explicit;

  const institutionText = normalizeSearchText(signal?.institution || '');
  const initiativeText = normalizeSearchText(signal?.initiative || '');
  const combinedLower = `${institutionText} ${initiativeText}`;
  const hint = COUNTRY_INSTITUTION_HINTS.find(entry => combinedLower.includes(entry.needle));
  if (hint) return hint.country;

  const combinedText = `${String(signal?.institution || '')} ${String(signal?.initiative || '')}`;
  const keywordHit = COUNTRY_TEXT_PATTERNS.find(entry => entry.pattern.test(combinedText));
  if (keywordHit) return keywordHit.country;

  return 'Unmapped';
}

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
  const normalizedType = normalizeInstitutionType(signal.institution_type);
  const rawCategory = String(signal.category || '').trim();
  const categoryAliases = {
    regulatory: 'regulators',
    regulators: 'regulators',
    regulation: 'regulators',
    bank: 'global_banks',
    banks: 'global_banks',
    asset_management: 'asset_management',
    asset_mgmt: 'asset_management',
    payments: 'payments',
    payment: 'payments',
    exchanges: 'exchanges_intermediaries',
    exchanges_intermediaries: 'exchanges_intermediaries',
    infrastructure: 'ecosystem',
    ecosystem: 'ecosystem',
    intel: 'intel_briefs',
    intel_briefs: 'intel_briefs'
  };
  const normalizedCategory = categoryAliases[rawCategory.toLowerCase()] || rawCategory;

  return {
    ...signal,
    institution_type: normalizedType,
    fmi_areas: normalizeFmiAreas(signal.fmi_areas),
    initiative_types: normalizeInitiativeTypes(signal.initiative_types),
    category: CATEGORIES[normalizedCategory] ? normalizedCategory : (CATEGORY_BY_INSTITUTION_TYPE[normalizedType] || 'ecosystem'),
    country: inferSignalCountry(signal)
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
const CATEGORY_BY_INSTITUTION_TYPE = {
  'Global Banks': 'global_banks',
  'Asset & Investment Management': 'asset_management',
  'Payments Providers': 'payments',
  'Exchanges & Central Intermediaries': 'exchanges_intermediaries',
  'Regulatory Agencies': 'regulators',
  'Infrastructure & Technology': 'ecosystem',
  'Intelligence & Research': 'intel_briefs'
};

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
let signalTypeFilter = '';
let countryFilter = '';
let chartInstances = {};
let popularitySeed = null;
let sourceCatalog = { byName: {}, byHost: {} };
let selectedPopularitySector = 'All Sectors';
let signalScoringMetricMode = 'count';
let signalScoringColorMode = 'absolute';
let signalScoringDimensionMode = 'initiative';
let signalScoringFilter = null;
let radarPrefilter = null;
let radarPrefilterAppliedFromUrl = false;
let momentumDebugMode = false;
const DEFAULT_IMPORTANCE_TIER_MODE = 'all';
const DEFAULT_PERSONA = 'all';
const DEFAULT_DATE_WINDOW_DAYS = 30;
const ENABLE_EXTERNAL_CONTEXT_MODIFIER = true;
const EXTERNAL_CONTEXT_MODIFIER_MIN = 0.9;
const EXTERNAL_CONTEXT_MODIFIER_MAX = 1.1;
let selectedDateWindowDays = DEFAULT_DATE_WINDOW_DAYS;
let importanceTierMode = DEFAULT_IMPORTANCE_TIER_MODE;
let selectedPersona = DEFAULT_PERSONA;
let dirCountryFilter = '';
let countryDirSearch = '';
let countryDirSort = 'signals';
let countryDirTypeFilter = '';
let dataRefreshMeta = {
  loadedAt: null,
  latestSourceDate: null,
  totalOperationalSignals: 0
};

const IMPORTANCE_TIER_FILTERS = {
  all: ['Structural', 'Material', 'Context', 'Noise'],
  priority: ['Structural', 'Material'],
  structural: ['Structural'],
  context: ['Context']
};

const IMPORTANCE_TIER_LABELS = {
  Structural: 'System-Shaping',
  Material: 'Directionally Important',
  Context: 'Background Signal',
  Noise: 'Monitor'
};

const IMPORTANCE_TIER_DEFINITIONS = {
  Structural: 'System-shaping signal likely to influence core market structure and long-term institutional operating models.',
  Material: 'Directionally important signal with meaningful implications for strategy, product, or operating design.',
  Context: 'Background signal that provides context but is less likely to drive immediate structural change.',
  Noise: 'Low-signal item to monitor; limited near-term relevance for institutional decision-making.'
};

const PERSONA_OPTIONS = {
  all: {
    label: 'All roles',
    primaryKeywords: [],
    secondaryKeywords: [],
    antiKeywords: [],
    audienceHints: [],
    preferredUseCases: []
  },
  treasury_payments: {
    label: 'Fintech Product & Strategy',
    primaryKeywords: ['payment', 'payments', 'transfer', 'cross-border', 'stablecoin', 'deposit token', 'treasury', 'cash management'],
    secondaryKeywords: ['liquidity', 'settlement', 'rail', 'remittance', 'on-chain cash'],
    antiKeywords: ['enforcement', 'sandbox consultation'],
    audienceHints: ['Payments Providers', 'Global Banks'],
    preferredUseCases: ['stablecoin_rails', 'settlement_flow']
  },
  collateral_markets: {
    label: 'Asset Managers / Institutional Investors',
    primaryKeywords: ['collateral', 'lending', 'repo', 'margin', 'settlement', 'clearing', 'tokenized securities', 'rwa', 'trading'],
    secondaryKeywords: ['custody', 'post-trade', 'liquidity', 'securities financing'],
    antiKeywords: ['retail wallet', 'consumer payment'],
    audienceHints: ['Asset & Investment Management', 'Exchanges & Central Intermediaries'],
    preferredUseCases: ['collateral_mobility', 'settlement_flow', 'tokenized_asset_ops']
  },
  risk_compliance: {
    label: 'Policy / Risk / Regulatory',
    primaryKeywords: ['regulation', 'regulatory', 'compliance', 'supervis', 'policy', 'control', 'kyc', 'aml'],
    secondaryKeywords: ['governance', 'risk framework', 'reporting', 'monitoring', 'oversight'],
    antiKeywords: ['marketing launch', 'consumer campaign'],
    audienceHints: ['Regulatory Agencies', 'Global Banks'],
    preferredUseCases: ['policy_controls']
  },
  infra_product: {
    label: 'Banks & FMIs / Operations & Infra',
    primaryKeywords: ['infrastructure', 'platform', 'interoperability', 'standard', 'network', 'custody', 'tokenization', 'integration'],
    secondaryKeywords: ['api', 'orchestration', 'workflow', 'upgrade', 'scalability'],
    antiKeywords: ['narrow policy statement'],
    audienceHints: ['Infrastructure & Technology', 'Exchanges & Central Intermediaries'],
    preferredUseCases: ['infrastructure_modernization', 'tokenized_asset_ops']
  }
};

function getImportanceTierLabel(tier) {
  return IMPORTANCE_TIER_LABELS[tier] || tier || 'Monitor';
}

function getImportanceTierTooltip(tier) {
  const label = getImportanceTierLabel(tier);
  const definition = IMPORTANCE_TIER_DEFINITIONS[tier] || IMPORTANCE_TIER_DEFINITIONS.Noise;
  return `${label}: ${definition}`;
}

function getPersonaLabel(lens) {
  return (PERSONA_OPTIONS[lens] && PERSONA_OPTIONS[lens].label) || PERSONA_OPTIONS[DEFAULT_PERSONA].label;
}

function setPersona(lens) {
  selectedPersona = PERSONA_OPTIONS[lens] ? lens : DEFAULT_PERSONA;
}

function getSignalSearchCorpus(signal) {
  return [
    signal?.institution,
    signal?.institution_type,
    signal?.initiative,
    signal?.description,
    signal?.signal_type,
    ...(Array.isArray(signal?.initiative_types) ? signal.initiative_types : []),
    ...(Array.isArray(signal?.fmi_areas) ? signal.fmi_areas : [])
  ].join(' ').toLowerCase();
}

function countKeywordHits(corpus, keywords = []) {
  if (!Array.isArray(keywords) || keywords.length === 0) return 0;
  return keywords.reduce((total, keyword) => total + (corpus.includes(String(keyword).toLowerCase()) ? 1 : 0), 0);
}

function getPersonaScoreDetails(signal, lens = selectedPersona) {
  if (lens === DEFAULT_PERSONA || !PERSONA_OPTIONS[lens]) {
    return {
      score: 0,
      preRecencyScore: 0,
      useCase: inferSignalUseCase(signal),
      primaryHits: 0,
      secondaryHits: 0,
      antiHits: 0,
      audienceHintHits: 0,
      useCaseBoost: 0,
      importanceBoost: 0,
      antiPenalty: 0,
      externalModifier: 1,
      externalConfidence: 'Unavailable',
      recencyWeight: 1,
      recencyFreshnessWeight: 1,
      recencyDurabilityFloor: 0,
      ageDays: getSignalAgeDays(signal?.date)
    };
  }

  const corpus = getSignalSearchCorpus(signal);
  const cfg = PERSONA_OPTIONS[lens];
  const audience = inferSignalPersona(signal);
  const useCase = inferSignalUseCase(signal);
  const importance = getSignalImportance(signal);
  const recencyProfile = getPersonaRecencyProfile(signal, importance.stage, importance.materiality);
  const externalContext = getExternalMarketContext(signal, lens);

  const primaryHits = Math.min(4, countKeywordHits(corpus, cfg.primaryKeywords));
  const secondaryHits = Math.min(3, countKeywordHits(corpus, cfg.secondaryKeywords));
  const antiHits = Math.min(2, countKeywordHits(corpus, cfg.antiKeywords));

  const audienceLower = audience.map(v => String(v || '').toLowerCase());
  const audienceHintHits = Math.min(
    2,
    (cfg.audienceHints || []).reduce((total, hint) => {
      const hintLower = String(hint || '').toLowerCase();
      return total + (audienceLower.some(value => value.includes(hintLower)) ? 1 : 0);
    }, 0)
  );

  const useCaseBoost = (cfg.preferredUseCases || []).includes(useCase) ? 1.7 : 0;
  const signalImportance = importance.importanceScore || 0;
  const importanceBoost = Math.min(1.2, signalImportance * 0.18);
  const antiPenalty = antiHits * 1.4;

  let preRecencyScore = 0;
  preRecencyScore += primaryHits * 2.4;
  preRecencyScore += secondaryHits * 1.1;
  preRecencyScore += audienceHintHits * 1.8;
  preRecencyScore += useCaseBoost;
  preRecencyScore += importanceBoost;

  const externalModifier = getExternalScoreModifier(signal, lens, useCase, externalContext);
  const score = ((preRecencyScore * recencyProfile.recencyWeight) - antiPenalty) * externalModifier;

  return {
    score: Math.max(0, Number(score.toFixed(2))),
    preRecencyScore: Number(preRecencyScore.toFixed(2)),
    useCase,
    primaryHits,
    secondaryHits,
    antiHits,
    audienceHintHits,
    useCaseBoost,
    importanceBoost,
    antiPenalty,
    externalModifier,
    externalConfidence: externalContext.confidence || 'Unavailable',
    recencyWeight: recencyProfile.recencyWeight,
    recencyFreshnessWeight: recencyProfile.freshnessWeight,
    recencyDurabilityFloor: recencyProfile.durabilityFloor,
    ageDays: recencyProfile.ageDays
  };
}

function getPersonaRelevance(signal, lens = selectedPersona) {
  return getPersonaScoreDetails(signal, lens).score;
}

function getMarketSignalAssessment(signal) {
  const importance = getSignalImportance(signal);
  return {
    signal: signal,
    marketTier: importance.tier,
    marketScore: importance.importanceScore,
    importance: importance,
    assessmentType: 'market'
  };
}

function getPersonaDisplayTier(marketTier, personaScore) {
  // Structural is universally important — never demoted by persona
  if (marketTier === 'Structural') return 'Structural';
  // Material: elevate to Structural on very high relevance; suppress to Context on low
  if (marketTier === 'Material') {
    if (personaScore >= 7.0) return 'Structural';
    if (personaScore < 0.5)  return 'Context';
    return 'Material';
  }
  // Context: elevate to Material on high relevance; suppress to Noise on negligible
  if (marketTier === 'Context') {
    if (personaScore >= 4.0) return 'Material';
    if (personaScore < 0.2)  return 'Noise';
    return 'Context';
  }
  // Noise: surface to Context only on very high relevance
  if (marketTier === 'Noise') {
    if (personaScore >= 6.0) return 'Context';
    return 'Noise';
  }
  return marketTier;
}

function computePersonaAssessment(signal, personaKey = selectedPersona) {
  const marketAssessment = getMarketSignalAssessment(signal);

  if (personaKey === DEFAULT_PERSONA || !PERSONA_OPTIONS[personaKey]) {
    return {
      ...marketAssessment,
      personaRelevance: 0,
      displayTier: marketAssessment.marketTier,
      tierAdjusted: false,
      isPersonalized: false,
      assessmentType: 'market'
    };
  }

  const personaDetails = getPersonaScoreDetails(signal, personaKey);
  const marketScore = marketAssessment.marketScore || 0.01;
  const personaScore = personaDetails.score || 0;
  const displayTier = getPersonaDisplayTier(marketAssessment.marketTier, personaScore);

  return {
    ...marketAssessment,
    personaRelevance: personaScore,
    personaDetails: personaDetails,
    displayTier,
    tierAdjusted: displayTier !== marketAssessment.marketTier,
    personaWeight: personaScore / (marketScore + personaScore + 0.01),
    isPersonalized: personaScore > 0.1,
    assessmentType: 'persona'
  };
}

function inferSignalUseCase(signal) {
  const text = getSignalSearchCorpus(signal);
  if (text.includes('stablecoin') || text.includes('deposit token') || text.includes('payment') || text.includes('transfer')) {
    return 'stablecoin_rails';
  }
  if (text.includes('collateral') || text.includes('lending') || text.includes('repo') || text.includes('margin')) {
    return 'collateral_mobility';
  }
  if (text.includes('settlement') || text.includes('clearing')) {
    return 'settlement_flow';
  }
  if (text.includes('tokenization') || text.includes('tokenized') || text.includes('rwa') || text.includes('custody')) {
    return 'tokenized_asset_ops';
  }
  if (text.includes('regulation') || text.includes('regulatory') || text.includes('compliance') || text.includes('policy')) {
    return 'policy_controls';
  }
  return 'infrastructure_modernization';
}

function getUseCaseNarrative(useCase) {
  const copy = {
    stablecoin_rails: 'This points to stablecoin and digital money rails moving closer to production payment flows.',
    collateral_mobility: 'This signals faster collateral mobility and balance-sheet efficiency opportunities across funding workflows.',
    settlement_flow: 'This has direct implications for settlement timing, counterparty exposure windows, and post-trade operating design.',
    tokenized_asset_ops: 'This advances tokenized asset issuance, servicing, or custody workflows that can reshape front-to-back operations.',
    policy_controls: 'This changes the policy and control perimeter that determines where institutions can execute and scale.',
    infrastructure_modernization: 'This indicates meaningful modernization of institutional digital infrastructure and integration pathways.'
  };
  return copy[useCase] || copy.infrastructure_modernization;
}

function getPersonaAwareNarrative(signal, useCase, persona, stage) {
  // Extract signal-specific context for interpolation
  const inst = String(signal?.institution || 'this institution').trim();
  const themes = Array.isArray(signal?.initiative_types) && signal.initiative_types.length > 0
    ? signal.initiative_types
    : Array.isArray(signal?.fmi_areas) && signal.fmi_areas.length > 0
      ? signal.fmi_areas
      : [String(signal?.signal_type || 'digital asset infrastructure').trim()];
  const theme = themes[0] || 'digital asset infrastructure';

  const personas = {
    treasury_payments: {
      stablecoin_rails: `${inst}'s real-money stablecoin or digital cash move is directly applicable to fintech payment rails and cross-border liquidity architecture.`,
      collateral_mobility: `${inst}'s ${theme} work signals collateral and funding channels that fintech payment product teams need to evaluate for settlement efficiency.`,
      settlement_flow: `${inst}'s settlement advance directly compresses counterparty exposure windows and optimizes working capital for fintech payment operators.`,
      tokenized_asset_ops: `${inst}'s move into ${theme} creates programmable cash and deposit instrument infrastructure relevant to fintech product and treasury strategy.`,
      policy_controls: `${inst}'s policy signal updates the compliance perimeter that fintech payment products must navigate to scale cross-border operations.`,
      infrastructure_modernization: `${inst}'s ${theme} modernization shapes the integration standards and API infrastructure that fintech products are building on top of.`
    },
    collateral_markets: {
      stablecoin_rails: `${inst}'s digital cash infrastructure unlocks faster collateral settlement and margin funding capacity for asset managers and institutional investors.`,
      collateral_mobility: `${inst}'s ${theme} advance directly expands collateral mobility, repo efficiency, and balance-sheet optimization for institutional portfolios.`,
      settlement_flow: `${inst}'s settlement modernization shortens margin periods of risk and frees capital in institutional trading and asset management workflows.`,
      tokenized_asset_ops: `${inst}'s ${theme} work enables tokenized securities and RWA infrastructure where asset managers can modernize collateral servicing and settlement.`,
      policy_controls: `${inst}'s policy signal expands the framework within which asset managers can deploy and manage digital asset exposures compliantly.`,
      infrastructure_modernization: `${inst}'s infrastructure advance improves the custody, venue, and settlement systems that institutional investors rely on for portfolio operations.`
    },
    risk_compliance: {
      stablecoin_rails: `${inst}'s stablecoin or digital money initiative defines the compliance perimeter and AML/KYC control requirements that risk and policy teams must codify.`,
      collateral_mobility: `${inst}'s ${theme} advance requires governance and control framework updates for collateral workflows and counterparty risk management.`,
      settlement_flow: `${inst}'s settlement change introduces new control and reporting obligations that compliance programs must embed in operational architecture.`,
      tokenized_asset_ops: `${inst}'s ${theme} initiative sets custody, ownership, and compliance control precedents for tokenized asset operations that regulate the whole sector.`,
      policy_controls: `${inst}'s regulatory signal directly updates the rules and oversight standards your compliance framework must align with to remain in scope.`,
      infrastructure_modernization: `${inst}'s infrastructure change introduces new technology risk, audit scope, and resilience obligations for risk and compliance oversight.`
    },
    infra_product: {
      stablecoin_rails: `${inst}'s stablecoin infrastructure establishes the integration patterns and messaging standards for payment rails that banks and FMIs are building.`,
      collateral_mobility: `${inst}'s ${theme} work shapes the interoperability standards and collateral workflow architecture that infrastructure and operations teams must support.`,
      settlement_flow: `${inst}'s settlement infrastructure advance sets new norms for messaging, finality, and operational integration in institutional banking systems.`,
      tokenized_asset_ops: `${inst}'s ${theme} initiative defines tokenization infrastructure standards—custody APIs, ledger integration, and asset servicing—that banks and FMIs are operationalizing.`,
      policy_controls: `${inst}'s policy signal updates the compliance and infrastructure requirements that platform and operations architects must embed in system design.`,
      infrastructure_modernization: `${inst}'s ${theme} advance directly shapes the next-generation integration architecture and interoperability standards that banks and FMIs are building today.`
    }
  };

  const personaCopy = personas[persona];
  if (!personaCopy) return getUseCaseNarrative(useCase);
  return personaCopy[useCase] || personaCopy.infrastructure_modernization;
}

function inferSignalPersona(signal) {
  const audience = new Set();
  const institutionType = String(signal?.institution_type || '').trim();
  const signalType = String(signal?.signal_type || '').toLowerCase();
  const initiativeText = `${(signal?.initiative_types || []).join(' ')} ${(signal?.fmi_areas || []).join(' ')} ${signal?.initiative || ''}`.toLowerCase();

  if (institutionType) audience.add(institutionType);

  if (signalType.includes('regulatory') || initiativeText.includes('compliance') || initiativeText.includes('regulation')) {
    audience.add('Regulatory Agencies');
    audience.add('Global Banks');
  }

  if (initiativeText.includes('stablecoin') || initiativeText.includes('payment') || initiativeText.includes('transfer')) {
    audience.add('Payments Providers');
    audience.add('Global Banks');
  }

  if (initiativeText.includes('collateral') || initiativeText.includes('settlement') || initiativeText.includes('clearing')) {
    audience.add('Asset & Investment Management');
    audience.add('Exchanges & Central Intermediaries');
  }

  if (initiativeText.includes('token') || initiativeText.includes('tokenization') || initiativeText.includes('custody')) {
    audience.add('Asset & Investment Management');
    audience.add('Infrastructure & Technology');
  }

  return Array.from(audience).slice(0, 3);
}

function buildSignalDirectionalInsight(signal, importance) {
  const institution = String(signal?.institution || 'A market participant').trim();
  const themes = Array.isArray(signal?.initiative_types) && signal.initiative_types.length > 0
    ? signal.initiative_types
    : Array.isArray(signal?.fmi_areas) && signal.fmi_areas.length > 0
      ? signal.fmi_areas
      : [String(signal?.signal_type || 'digital asset infrastructure').trim()];
  const leadTheme = themes[0] || 'digital asset infrastructure';
  const audience = inferSignalPersona(signal);
  const audienceText = audience.length > 0
    ? audience.slice(0, 2).join(' and ')
    : 'institutional operators across financial market infrastructure';
  const lensLabel = getPersonaLabel(selectedPersona);
  const lensRelevance = getPersonaRelevance(signal, selectedPersona);
  const useCase = inferSignalUseCase(signal);
  
  // Use persona-specific narrative when a persona is selected
  let narrative;
  if (selectedPersona !== DEFAULT_PERSONA) {
    narrative = getPersonaAwareNarrative(signal, useCase, selectedPersona, importance.stage);
  } else {
    narrative = getUseCaseNarrative(useCase);
  }
  
  const stagePhraseMap = {
    Structural: 'at system scale',
    Production: 'in active deployment',
    Pilot: 'through pilot execution',
    Concept: 'at strategy and design level'
  };
  const stagePhrase = stagePhraseMap[importance.stage] || 'through active development';
  const confidence = lensRelevance >= 7 ? 'high' : lensRelevance >= 3 ? 'medium' : 'baseline';
  return `For ${lensLabel} teams, ${institution} is advancing ${leadTheme} ${stagePhrase}. ${narrative} Most material audiences: ${audienceText}. Lens fit: ${confidence}.`;
}

const EXTERNAL_MARKET_CONTEXT = {
  source: 'RWA.xyz snapshot',
  asOf: '2026-03-21',
  totalRwa30dPct: 6.58,
  useCaseBenchmarks: {
    stablecoin_rails: {
      label: 'Stablecoins and Digital Cash',
      trend30dPct: -2.23,
      confidence: 'Divergent'
    },
    collateral_mobility: {
      label: 'Tokenized Credit and Collateral',
      trend30dPct: 10.09,
      confidence: 'Aligned'
    },
    settlement_flow: {
      label: 'Settlement and Clearing Infrastructure',
      trend30dPct: 6.58,
      confidence: 'Aligned'
    },
    tokenized_asset_ops: {
      label: 'Tokenized Treasuries and Funds',
      trend30dPct: 8.87,
      confidence: 'Strongly Aligned'
    },
    policy_controls: {
      label: 'Regulatory and Policy Readiness',
      trend30dPct: 6.58,
      confidence: 'Contextual'
    },
    infrastructure_modernization: {
      label: 'RWA Infrastructure and Platforms',
      trend30dPct: 6.58,
      confidence: 'Aligned'
    }
  }
};

function getExternalMarketContext(signal, persona = selectedPersona) {
  const useCase = inferSignalUseCase(signal);
  const benchmark = EXTERNAL_MARKET_CONTEXT.useCaseBenchmarks[useCase];
  if (!benchmark) {
    return {
      available: false,
      confidence: 'Unavailable',
      summary: 'External market context is not mapped for this signal yet.'
    };
  }

  const personaLabel = getPersonaLabel(persona);
  const trendAbs = Math.abs(benchmark.trend30dPct || 0).toFixed(2);
  const trendPrefix = benchmark.trend30dPct >= 0 ? '+' : '-';

  return {
    available: true,
    source: EXTERNAL_MARKET_CONTEXT.source,
    asOf: EXTERNAL_MARKET_CONTEXT.asOf,
    useCase,
    segmentLabel: benchmark.label,
    trend30dPct: benchmark.trend30dPct,
    trendLabel: `${trendPrefix}${trendAbs}%`,
    confidence: benchmark.confidence,
    summary: `${benchmark.label} is ${trendPrefix}${trendAbs}% over 30d; ${personaLabel} context confidence: ${benchmark.confidence}.`
  };
}

function getExternalScoreModifier(signal, persona = selectedPersona, useCase = inferSignalUseCase(signal), externalContext = null) {
  if (!ENABLE_EXTERNAL_CONTEXT_MODIFIER) return 1;

  const context = externalContext || getExternalMarketContext(signal, persona);
  if (!context.available) return 1;

  const trendPct = Number(context.trend30dPct || 0);
  const trendAdjustment = Math.max(-0.06, Math.min(0.06, trendPct * 0.006));
  const confidenceAdjustmentMap = {
    'Strongly Aligned': 0.03,
    Aligned: 0.015,
    Contextual: 0,
    Divergent: -0.03,
    Unavailable: 0
  };
  const confidenceAdjustment = confidenceAdjustmentMap[context.confidence] ?? 0;

  let personaUseCaseAdjustment = 0;
  if (persona !== DEFAULT_PERSONA && PERSONA_OPTIONS[persona]) {
    personaUseCaseAdjustment = (PERSONA_OPTIONS[persona].preferredUseCases || []).includes(useCase) ? 0.01 : -0.01;
  }

  const modifier = 1 + trendAdjustment + confidenceAdjustment + personaUseCaseAdjustment;
  return Number(Math.max(EXTERNAL_CONTEXT_MODIFIER_MIN, Math.min(EXTERNAL_CONTEXT_MODIFIER_MAX, modifier)).toFixed(3));
}

function getSignalSourceDateRaw(signal) {
  return String(signal?.source_date || signal?.published_at || signal?.created_at || signal?.date || '').trim();
}

function sourcePrefersMonthFirst(signal) {
  const sourceName = String(signal?.source_name || '').toLowerCase();
  const institution = String(signal?.institution || '').toLowerCase();
  const sourceUrl = String(signal?.source_url || '').toLowerCase();
  const joined = `${sourceName} ${institution} ${sourceUrl}`;

  return [
    'coindesk',
    'the block',
    'chainalysis',
    'fed',
    'sec',
    'finra',
    'cftc',
    'federal reserve',
    '.us/'
  ].some(hint => joined.includes(hint));
}

function parseSignalDate(rawDate, signal = null) {
  const raw = String(rawDate || '').trim();
  if (!raw) return null;

  const dateOnlyIsoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyIsoMatch) {
    const y = Number(dateOnlyIsoMatch[1]);
    const m = Number(dateOnlyIsoMatch[2]);
    const d = Number(dateOnlyIsoMatch[3]);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const numericMatch = raw.match(/^(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (numericMatch) {
    const first = Number(numericMatch[1]);
    const second = Number(numericMatch[2]);
    const third = Number(numericMatch[3]);
    const hour = Number(numericMatch[4] || 12);
    const minute = Number(numericMatch[5] || 0);
    const secondPart = Number(numericMatch[6] || 0);

    let year;
    let month;
    let day;

    if (numericMatch[1].length === 4) {
      year = first;
      month = second;
      day = third;
    } else if (numericMatch[3].length === 4) {
      year = third;
      if (first > 12 && second <= 12) {
        day = first;
        month = second;
      } else if (second > 12 && first <= 12) {
        month = first;
        day = second;
      } else {
        const monthFirst = sourcePrefersMonthFirst(signal);
        month = monthFirst ? first : second;
        day = monthFirst ? second : first;
      }
    }

    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      const dt = new Date(year, month - 1, day, hour, minute, secondPart);
      if (
        !Number.isNaN(dt.getTime()) &&
        dt.getFullYear() === year &&
        dt.getMonth() === (month - 1) &&
        dt.getDate() === day
      ) {
        return dt;
      }
    }
  }

  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) {
    const dt = new Date(parsed);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  return null;
}

function getSignalDateTimestamp(signal) {
  const rawDate = getSignalSourceDateRaw(signal);
  if (!rawDate) return null;
  const parsed = parseSignalDate(rawDate, signal);
  if (!parsed) return null;
  const ts = parsed.getTime();
  return Number.isFinite(ts) ? ts : null;
}

function getLatestNonFutureSignalTimestamp(signals) {
  const nowTs = Date.now();
  return (Array.isArray(signals) ? signals : []).reduce((maxTs, signal) => {
    const ts = getSignalDateTimestamp(signal);
    if (!Number.isFinite(ts) || ts > nowTs) return maxTs;
    return Math.max(maxTs, ts);
  }, 0);
}

function isSignalWithinRecencyWindow(signal, maxAgeDays = selectedDateWindowDays) {
  const timestamp = getSignalDateTimestamp(signal);
  if (!timestamp) return true;
  const ageDays = Math.floor((Date.now() - timestamp) / 86400000);
  if (ageDays < 0) return false;
  if (maxAgeDays === null) return true;
  return ageDays <= maxAgeDays;
}

function formatExactSignalDate(signal) {
  const rawDate = getSignalSourceDateRaw(signal);
  if (!rawDate) return 'Date unavailable';

  const dt = parseSignalDate(rawDate, signal);
  if (!dt) return rawDate;

  const hasTime = /T\d{2}:\d{2}|\d{2}:\d{2}/.test(rawDate);
  if (hasTime) {
    return dt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getSignalThemeKeys(signal) {
  const initiativeTypes = Array.isArray(signal?.initiative_types)
    ? signal.initiative_types.map(v => String(v || '').trim()).filter(Boolean)
    : [];
  if (initiativeTypes.length > 0) return initiativeTypes;

  const fmiAreas = Array.isArray(signal?.fmi_areas)
    ? signal.fmi_areas.map(v => String(v || '').trim()).filter(Boolean)
    : [];
  if (fmiAreas.length > 0) return fmiAreas;

  const fallback = String(signal?.signal_type || '').trim();
  return fallback ? [fallback] : [];
}

function getMomentumSnapshot(signal, candidateSignals) {
  const now = Date.now();
  const windowMs = 45 * 24 * 60 * 60 * 1000;
  const recentBoundary = now - windowMs;
  const priorBoundary = recentBoundary - windowMs;
  const signalThemes = new Set(getSignalThemeKeys(signal));

  let recentCount = 0;
  let priorCount = 0;

  candidateSignals.forEach(item => {
    const itemThemes = getSignalThemeKeys(item);
    const overlaps = itemThemes.some(theme => signalThemes.has(theme));
    if (!overlaps) return;

    const ts = getSignalDateTimestamp(item);
    if (!Number.isFinite(ts)) return;

    if (ts >= recentBoundary) recentCount += 1;
    else if (ts >= priorBoundary) priorCount += 1;
  });

  const delta = recentCount - priorCount;
  let status = 'Stable';
  if ((recentCount >= 4 && delta >= 1) || delta >= 3) status = 'Accelerating';
  else if ((recentCount === 0 && priorCount > 0) || delta <= -2) status = 'Cooling';

  const rawScore = 50 + (delta * 11) + (Math.min(6, recentCount) * 6);
  const score = Math.max(0, Math.min(100, rawScore));

  return {
    status,
    score,
    cssClass: status === 'Accelerating' ? 'accelerating' : status === 'Cooling' ? 'cooling' : 'stable',
    recentCount,
    priorCount,
    delta
  };
}

function renderMomentumDebugToggle() {
  const button = document.getElementById('momentumDebugToggle');
  if (!button) return;
  button.textContent = momentumDebugMode ? 'Hide Momentum Debug' : 'Show Momentum Debug';
  button.classList.toggle('is-active', momentumDebugMode);
}

function toggleMomentumDebugMode() {
  momentumDebugMode = !momentumDebugMode;
  renderMomentumDebugToggle();
  renderSignals();
}

function buildCatalogueSignalMeta(filteredSignals) {
  const initiativeTotals = {};
  const institutionTotals = {};

  filteredSignals.forEach(signal => {
    const importanceScore = getSignalImportance(signal).importanceScore || 0;
    const themes = getSignalThemeKeys(signal);
    themes.forEach(theme => {
      initiativeTotals[theme] = (initiativeTotals[theme] || 0) + importanceScore;
    });

    const institutionType = String(signal?.institution_type || '').trim();
    if (institutionType) {
      institutionTotals[institutionType] = (institutionTotals[institutionType] || 0) + importanceScore;
    }
  });

  const initiativeRank = {};
  Object.entries(initiativeTotals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([theme], idx) => {
      initiativeRank[theme] = idx + 1;
    });

  const institutionRank = {};
  Object.entries(institutionTotals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([institutionType], idx) => {
      institutionRank[institutionType] = idx + 1;
    });

  const bySignalKey = {};
  filteredSignals.forEach(signal => {
    const key = getSignalKey(signal);
    const themes = getSignalThemeKeys(signal);
    const rankedThemes = themes
      .map(theme => ({ theme, rank: initiativeRank[theme] || Number.POSITIVE_INFINITY }))
      .sort((a, b) => a.rank - b.rank);
    const bestTheme = rankedThemes[0] || null;

    const institutionType = String(signal?.institution_type || '').trim();
    const momentum = getMomentumSnapshot(signal, filteredSignals);

    bySignalKey[key] = {
      momentum,
      initiativeTheme: bestTheme ? bestTheme.theme : 'Unclassified Theme',
      initiativeRank: bestTheme && Number.isFinite(bestTheme.rank) ? bestTheme.rank : null,
      institutionType,
      institutionRank: institutionType ? institutionRank[institutionType] || null : null
    };
  });

  return bySignalKey;
}

let importanceTierFilter = [...IMPORTANCE_TIER_FILTERS[importanceTierMode]];

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

const MARKET_WEEKLY_RECENCY_WEIGHTS = [1.0, 0.88, 0.78, 0.7, 0.62, 0.56, 0.5, 0.44, 0.38];
const PERSONA_WEEKLY_RECENCY_WEIGHTS = [1.0, 0.84, 0.7, 0.58, 0.48, 0.4, 0.34, 0.3, 0.26];

const MARKET_DURABILITY_FLOOR_BY_STAGE = {
  Structural: 0.52,
  Production: 0.4,
  Pilot: 0.26,
  Concept: 0.18,
  Unknown: 0.22
};

const PERSONA_DURABILITY_FLOOR_BY_STAGE = {
  Structural: 0.32,
  Production: 0.25,
  Pilot: 0.16,
  Concept: 0.12,
  Unknown: 0.14
};

const DURABILITY_BONUS_BY_MATERIALITY = {
  'Very High': 0.04,
  High: 0.02,
  Medium: 0,
  Low: -0.02,
  Unknown: 0
};

function getSignalAgeDays(dateValue) {
  const parsed = parseSignalDate(dateValue);
  const timestamp = parsed ? parsed.getTime() : NaN;
  if (!timestamp) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
}

function getWeeklyRecencyWeight(daysOld, weeklyWeights, fallbackWeight) {
  if (!Number.isFinite(daysOld) || daysOld < 0) return fallbackWeight;
  const weekIndex = Math.floor(daysOld / 7);
  const boundedIndex = Math.min(weeklyWeights.length - 1, weekIndex);
  return weeklyWeights[boundedIndex];
}

function getDurabilityFloor(stage, materiality, signalType, floorByStage, maxFloor) {
  const baseFloor = floorByStage[stage] ?? floorByStage.Unknown;
  const materialityBonus = DURABILITY_BONUS_BY_MATERIALITY[materiality] ?? 0;
  const regulatoryBonus = signalType === 'Regulatory Action' || signalType === 'Regulatory / Compliance Framework' ? 0.03 : 0;
  return Math.min(maxFloor, Math.max(0.1, baseFloor + materialityBonus + regulatoryBonus));
}

function getMarketRecencyProfile(signal, stage, materiality) {
  const ageDays = getSignalAgeDays(signal?.date);
  const freshnessWeight = getWeeklyRecencyWeight(ageDays, MARKET_WEEKLY_RECENCY_WEIGHTS, 0.44);
  const durabilityFloor = getDurabilityFloor(
    stage,
    materiality,
    String(signal?.signal_type || '').trim(),
    MARKET_DURABILITY_FLOOR_BY_STAGE,
    0.58
  );

  return {
    ageDays,
    freshnessWeight,
    durabilityFloor,
    recencyWeight: Math.max(freshnessWeight, durabilityFloor)
  };
}

function getPersonaRecencyProfile(signal, stage, materiality) {
  const ageDays = getSignalAgeDays(signal?.date);
  const freshnessWeight = getWeeklyRecencyWeight(ageDays, PERSONA_WEEKLY_RECENCY_WEIGHTS, 0.3);
  const durabilityFloor = getDurabilityFloor(
    stage,
    materiality,
    String(signal?.signal_type || '').trim(),
    PERSONA_DURABILITY_FLOOR_BY_STAGE,
    0.38
  );

  return {
    ageDays,
    freshnessWeight,
    durabilityFloor,
    recencyWeight: Math.max(freshnessWeight, durabilityFloor)
  };
}

function getRecencyWeight(signal, stage = 'Unknown', materiality = 'Unknown') {
  return getMarketRecencyProfile(signal, stage, materiality).recencyWeight;
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
  const recencyWeight = getRecencyWeight(signal, getSignalStage(signal), getSignalMateriality(signal));
  const prevalenceWeight = getSourcePrevalenceWeight(source, sourceCounts, maxSourceCount);
  return (meta.weight || 0.9) * recencyWeight * prevalenceWeight;
}

const IMPORTANCE_STAGE_BY_SIGNAL_TYPE = {
  'Strategic Filing / Plan': 'Concept',
  'Strategic Initiative': 'Concept',
  'Research / Report': 'Concept',
  'Pilot / Trial': 'Pilot',
  'Product Launch': 'Production',
  'Platform / Infrastructure': 'Structural',
  'Regulatory Action': 'Structural',
  'Regulatory / Compliance Framework': 'Structural',
  'Strategic Partnership': 'Production',
  'Investment / M&A': 'Production',
  'Leadership & Governance': 'Concept'
};

const IMPORTANCE_MATERIALITY_BY_SIGNAL_TYPE = {
  'Strategic Filing / Plan': 'Medium',
  'Strategic Initiative': 'Medium',
  'Research / Report': 'Low',
  'Pilot / Trial': 'Medium',
  'Product Launch': 'High',
  'Platform / Infrastructure': 'Very High',
  'Regulatory Action': 'Very High',
  'Regulatory / Compliance Framework': 'High',
  'Strategic Partnership': 'Medium',
  'Investment / M&A': 'High',
  'Leadership & Governance': 'Medium'
};

const IMPORTANCE_STAGE_WEIGHTS = {
  Concept: 0.5,
  Pilot: 0.75,
  Production: 1.0,
  Structural: 1.2,
  Unknown: 0.7
};

const IMPORTANCE_MATERIALITY_WEIGHTS = {
  Low: 0.8,
  Medium: 1.0,
  High: 1.15,
  'Very High': 1.3,
  Unknown: 0.85
};

const IMPORTANCE_THRESHOLDS = {
  // Calibrated on 2026-03-21 corpus (497 signals) with weekly recency model:
  // Structural 7.0%, Material 21.0%, Context 14.0%, Noise 58.0%.
  // Prior thresholds (pre-recency): structural 1.62, material 1.26, context 0.86.
  structural: 1.428,
  material: 1.058,
  context: 0.703
};

const IMPORTANCE_STAGE_MATERIALITY_CAP = 1.3;

function getSignalStage(signal) {
  const explicitStage = String(signal?.signal_stage || '').trim();
  if (explicitStage) return explicitStage;

  const type = String(signal?.signal_type || '').trim();
  return IMPORTANCE_STAGE_BY_SIGNAL_TYPE[type] || 'Unknown';
}

function getSignalMateriality(signal) {
  const explicitMateriality = String(signal?.signal_materiality || '').trim();
  if (explicitMateriality) return explicitMateriality;

  const type = String(signal?.signal_type || '').trim();
  return IMPORTANCE_MATERIALITY_BY_SIGNAL_TYPE[type] || 'Unknown';
}

function mapImportanceTier(score) {
  if (score >= IMPORTANCE_THRESHOLDS.structural) return 'Structural';
  if (score >= IMPORTANCE_THRESHOLDS.material) return 'Material';
  if (score >= IMPORTANCE_THRESHOLDS.context) return 'Context';
  return 'Noise';
}

function applyImportanceTierCaps(tier, stage, sourceTier) {
  if ((sourceTier === 'Tertiary' || sourceTier === 'Unclassified') && tier === 'Structural') {
    return 'Material';
  }

  if ((stage === 'Concept' || stage === 'Pilot') && tier === 'Structural') {
    return 'Material';
  }

  return tier;
}

function getImportanceSourcePrevalenceWeight(sourceName, sourceCounts, maxSourceCount) {
  if (!sourceName) return 1;
  const count = Math.max(1, sourceCounts[sourceName] || 1);
  const maxCount = Math.max(1, maxSourceCount || 1);
  const normalized = Math.log1p(count) / Math.log1p(maxCount);
  return 1 + (0.1 * normalized);
}

function computeSignalImportance(signal, sourceCounts, maxSourceCount) {
  const source = getSignalSourceName(signal);
  const sourceMeta = resolveSourceMeta(signal);

  const sourceTier = sourceMeta.tier || 'Unclassified';
  const credibilityWeight = sourceMeta.weight || 0.7;
  const sourcePrevalenceWeight = getImportanceSourcePrevalenceWeight(source, sourceCounts, maxSourceCount);

  const stage = getSignalStage(signal);
  const materiality = getSignalMateriality(signal);
  const recencyProfile = getMarketRecencyProfile(signal, stage, materiality);
  const recencyWeight = recencyProfile.recencyWeight;

  const stageWeight = IMPORTANCE_STAGE_WEIGHTS[stage] || IMPORTANCE_STAGE_WEIGHTS.Unknown;
  const materialityWeight = IMPORTANCE_MATERIALITY_WEIGHTS[materiality] || IMPORTANCE_MATERIALITY_WEIGHTS.Unknown;

  let stageMaterialityWeight = stageWeight * materialityWeight;
  if (stageWeight >= 1.0 && materialityWeight >= 1.15) {
    stageMaterialityWeight = Math.min(stageMaterialityWeight, IMPORTANCE_STAGE_MATERIALITY_CAP);
  }

  const rawImportanceScore = credibilityWeight * recencyWeight * sourcePrevalenceWeight * stageMaterialityWeight;
  const metadataPenaltyApplied = stage === 'Unknown' || materiality === 'Unknown';
  const importanceScore = metadataPenaltyApplied ? rawImportanceScore * 0.9 : rawImportanceScore;
  const mappedTier = mapImportanceTier(importanceScore);
  const tier = applyImportanceTierCaps(mappedTier, stage, sourceTier);

  return {
    importanceScore,
    rawImportanceScore,
    tier,
    stage,
    materiality,
    sourceTier,
    ageDays: recencyProfile.ageDays,
    credibilityWeight,
    recencyWeight,
    freshnessWeight: recencyProfile.freshnessWeight,
    durabilityFloor: recencyProfile.durabilityFloor,
    sourcePrevalenceWeight,
    stageWeight,
    materialityWeight,
    stageMaterialityWeight,
    metadataPenaltyApplied
  };
}

function recomputeSignalImportanceScores() {
  const signals = getOperationalSignals();
  const sourceCounts = {};

  signals.forEach(signal => {
    const source = getSignalSourceName(signal);
    if (!source) return;
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  const maxSourceCount = Math.max(1, ...Object.values(sourceCounts));
  signals.forEach(signal => {
    signal._importance = computeSignalImportance(signal, sourceCounts, maxSourceCount);
  });
}

function getSignalImportance(signal) {
  if (signal && signal._importance) return signal._importance;

  return {
    importanceScore: 0,
    rawImportanceScore: 0,
    tier: 'Noise',
    stage: 'Unknown',
    materiality: 'Unknown',
    sourceTier: 'Unclassified',
    credibilityWeight: 0.7,
    recencyWeight: 0.7,
    sourcePrevalenceWeight: 1,
    stageWeight: IMPORTANCE_STAGE_WEIGHTS.Unknown,
    materialityWeight: IMPORTANCE_MATERIALITY_WEIGHTS.Unknown,
    stageMaterialityWeight: IMPORTANCE_STAGE_WEIGHTS.Unknown * IMPORTANCE_MATERIALITY_WEIGHTS.Unknown,
    metadataPenaltyApplied: true
  };
}

function recalibrateImportanceThresholds(targetDistribution = { structural: 0.07, material: 0.21, context: 0.14, noise: 0.58 }) {
  const signals = getOperationalSignals();
  if (!signals.length) {
    console.warn('No operational signals available for calibration');
    return null;
  }

  const sourceCounts = {};
  signals.forEach(s => {
    const source = getSignalSourceName(s);
    if (source) sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });
  const maxSourceCount = Math.max(1, ...Object.values(sourceCounts));

  const scores = signals.map(s => {
    const imp = computeSignalImportance(s, sourceCounts, maxSourceCount);
    return imp.importanceScore;
  }).sort((a, b) => b - a);

  const total = scores.length;
  const targetStructural = Math.round(total * targetDistribution.structural);
  const targetMaterial = Math.round(total * (targetDistribution.structural + targetDistribution.material));
  const targetContext = Math.round(total * (targetDistribution.structural + targetDistribution.material + targetDistribution.context));

  const newStructuralThreshold = scores[Math.max(0, targetStructural - 1)];
  const newMaterialThreshold = scores[Math.max(0, targetMaterial - 1)];
  const newContextThreshold = scores[Math.max(0, targetContext - 1)];

  const currentDist = { structural: 0, material: 0, context: 0, noise: 0 };
  scores.forEach(score => {
    if (score >= IMPORTANCE_THRESHOLDS.structural) currentDist.structural++;
    else if (score >= IMPORTANCE_THRESHOLDS.material) currentDist.material++;
    else if (score >= IMPORTANCE_THRESHOLDS.context) currentDist.context++;
    else currentDist.noise++;
  });

  const newDist = { structural: 0, material: 0, context: 0, noise: 0 };
  scores.forEach(score => {
    if (score >= newStructuralThreshold) newDist.structural++;
    else if (score >= newMaterialThreshold) newDist.material++;
    else if (score >= newContextThreshold) newDist.context++;
    else newDist.noise++;
  });

  const result = {
    corpusSize: total,
    currentThresholds: {
      structural: IMPORTANCE_THRESHOLDS.structural.toFixed(3),
      material: IMPORTANCE_THRESHOLDS.material.toFixed(3),
      context: IMPORTANCE_THRESHOLDS.context.toFixed(3)
    },
    currentDistribution: {
      structural: { count: currentDist.structural, pct: (currentDist.structural / total * 100).toFixed(1) + '%' },
      material: { count: currentDist.material, pct: (currentDist.material / total * 100).toFixed(1) + '%' },
      context: { count: currentDist.context, pct: (currentDist.context / total * 100).toFixed(1) + '%' },
      noise: { count: currentDist.noise, pct: (currentDist.noise / total * 100).toFixed(1) + '%' }
    },
    recommendedThresholds: {
      structural: newStructuralThreshold.toFixed(3),
      material: newMaterialThreshold.toFixed(3),
      context: newContextThreshold.toFixed(3)
    },
    projectedDistribution: {
      structural: { count: newDist.structural, pct: (newDist.structural / total * 100).toFixed(1) + '%' },
      material: { count: newDist.material, pct: (newDist.material / total * 100).toFixed(1) + '%' },
      context: { count: newDist.context, pct: (newDist.context / total * 100).toFixed(1) + '%' },
      noise: { count: newDist.noise, pct: (newDist.noise / total * 100).toFixed(1) + '%' }
    },
    targetDistribution,
    scoreRange: { min: scores[scores.length - 1].toFixed(3), max: scores[0].toFixed(3), median: scores[Math.floor(scores.length / 2)].toFixed(3) }
  };

  console.table(result);
  return result;
}
window.recalibrateImportanceThresholds = recalibrateImportanceThresholds;

function setImportanceTierMode(mode) {
  if (!IMPORTANCE_TIER_FILTERS[mode]) return;
  importanceTierMode = mode;
  importanceTierFilter = [...IMPORTANCE_TIER_FILTERS[mode]];
  const select = document.getElementById('importanceTierSelect');
  if (select) select.value = mode;
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

function setSignalScoringDimensionMode(mode) {
  if (!['initiative', 'fmi'].includes(mode)) return;
  signalScoringDimensionMode = mode;
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
  const separator = String(path).includes('?') ? '&' : '?';
  const requestUrl = `${path}${separator}_ts=${Date.now()}`;

  return fetch(requestUrl, { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : fallback))
    .catch(() => fallback);
}

function getOperationalSignals() {
  return allSignals.filter(s => !s._isBrief && isSignalWithinRecencyWindow(s));
}

function getCatalogueSignals(options = {}) {
  const { includeCategory = true } = options;
  let filtered = getOperationalSignals();

  if (Array.isArray(importanceTierFilter) && importanceTierFilter.length > 0) {
    filtered = filtered.filter(signal => importanceTierFilter.includes(getSignalImportance(signal).tier));
  }

  if (includeCategory && activeFilter !== 'all') {
    filtered = filtered.filter(signal => signal.category === activeFilter);
  }

  if (matrixFilter) {
    const dimField = matrixFilter.dimension === 'fmi' ? 'fmi_areas' : 'initiative_types';
    filtered = filtered.filter(signal =>
      signal.institution_type === matrixFilter.institutionType &&
      (signal[dimField] || []).includes(matrixFilter.initiativeType)
    );
  }

  if (signalTypeFilter) {
    filtered = filtered.filter(signal => String(signal.signal_type || '').trim() === signalTypeFilter);
  }

  if (countryFilter) {
    filtered = filtered.filter(signal => getSignalCountryValue(signal) === countryFilter);
  }

  if (signalScoringFilter && typeof signalScoringFilter.predicate === 'function') {
    filtered = filtered.filter(signal => {
      try {
        return Boolean(signalScoringFilter.predicate(signal));
      } catch (_) {
        return false;
      }
    });
  }

  if (radarPrefilter) {
    filtered = filtered.filter(signal => {
      const signalInstitution = String(signal?.institution || '').trim().toLowerCase();
      if (radarPrefilter.institution && signalInstitution !== radarPrefilter.institution) {
        return false;
      }

      if (!radarPrefilter.theme) {
        return true;
      }

      const themeText = [
        ...(getSignalThemeKeys(signal) || []),
        signal?.initiative || '',
        signal?.description || '',
        signal?.signal_type || '',
        ...(Array.isArray(signal?.fmi_areas) ? signal.fmi_areas : []),
        ...(Array.isArray(signal?.initiative_types) ? signal.initiative_types : [])
      ].join(' ').toLowerCase();

      if (radarPrefilter.theme === 'tokenized_funds_rwas') {
        return /tokeniz|rwa|real-world asset|real world asset|money market fund|\bmmf\b|treasury/.test(themeText);
      }
      if (radarPrefilter.theme === 'stablecoins_settlement') {
        return /stablecoin|stable coin|deposit token|cbdc|settlement|cross-border|cross border|on-chain cash|on-chain payment/.test(themeText);
      }
      if (radarPrefilter.theme === 'market_infra_dlt') {
        return /\bdlt\b|distributed ledger|market infrastructure|post-trade|post trade|clearing|custody|collateral|blockchain infrastructure/.test(themeText);
      }

      return true;
    });
  }

  if (searchQuery) {
    filtered = filtered.filter(signal => `${signal.institution} ${signal.initiative} ${signal.description} ${signal.category} ${signal.signal_type || ''}`.toLowerCase().includes(searchQuery));
  }

  return filtered;
}

const DIRECTORY_TYPE_COLOR_MAP = {
  'Global Banks': 'var(--color-banks)',
  'Asset & Investment Management': 'var(--color-asset-mgmt)',
  'Payments Providers': 'var(--color-payments)',
  'Exchanges & Central Intermediaries': 'var(--color-exchanges)',
  'Regulatory Agencies': 'var(--color-regulators)',
  'Infrastructure & Technology': 'var(--color-ecosystem)'
};

const DIRECTORY_TYPE_ORDER = [
  'Global Banks',
  'Asset & Investment Management',
  'Payments Providers',
  'Exchanges & Central Intermediaries',
  'Regulatory Agencies',
  'Infrastructure & Technology'
];

const DIRECTORY_TYPE_KEY_MAP = {
  'Global Banks': 'global_banks',
  'Asset & Investment Management': 'asset_management',
  'Payments Providers': 'payments',
  'Exchanges & Central Intermediaries': 'exchanges_intermediaries',
  'Regulatory Agencies': 'regulators',
  'Infrastructure & Technology': 'ecosystem'
};

const DIRECTORY_SHORT_INIT = {
  'Tokenized Securities / RWA': 'Tokenized',
  'DLT / Blockchain Infrastructure': 'DLT/Blockchain',
  'Crypto / Digital Assets': 'Crypto',
  'Payment Infrastructure': 'Payments',
  'Stablecoins & Deposit Tokens': 'Stablecoins',
  'CBDC': 'CBDC',
  'DeFi': 'DeFi',
  'Digital Asset Strategy': 'Strategy',
  'Leadership & Governance': 'Leadership'
};

const DIRECTORY_SHORT_FMI = {
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

function buildInstitutionSummaries(signals) {
  const instMap = {};

  signals.forEach(signal => {
    const key = signal.institution;
    if (!instMap[key]) {
      instMap[key] = {
        name: key,
        type: signal.institution_type,
        signals: 0,
        totalStrength: 0,
        signalTypes: {},
        countries: {},
        initiativeTypes: new Set(),
        fmiAreas: new Set()
      };
    }

    const inst = instMap[key];
    inst.signals++;
    inst.totalStrength += Number(getSignalImportance(signal).importanceScore || 0);
    if (isVisibleSignalType(signal.signal_type)) {
      inst.signalTypes[signal.signal_type] = (inst.signalTypes[signal.signal_type] || 0) + 1;
    }

    const signalCountry = getSignalCountryValue(signal);
    inst.countries[signalCountry] = (inst.countries[signalCountry] || 0) + 1;
    (signal.initiative_types || []).forEach(type => inst.initiativeTypes.add(type));
    (signal.fmi_areas || []).forEach(area => inst.fmiAreas.add(area));
  });

  return Object.values(instMap).map(inst => {
    const countryEntries = Object.entries(inst.countries).sort((a, b) => b[1] - a[1]);
    const primaryCountry = countryEntries[0]?.[0] || 'Unmapped';
    const additionalCountries = Math.max(0, countryEntries.length - 1);
    const strengthScore = Number(inst.totalStrength || 0);
    return {
      ...inst,
      primaryCountry,
      countryLabel: additionalCountries > 0 ? `${primaryCountry} +${additionalCountries}` : primaryCountry,
      strengthScore,
      avgStrengthPerSignal: inst.signals > 0 ? strengthScore / inst.signals : 0
    };
  });
}

function renderInstitutionRows(insts, options = {}) {
  const { showType = false, colorOverride = '' } = options;

  return insts.map(inst => {
    const catKey = DIRECTORY_TYPE_KEY_MAP[inst.type] || '';
    const color = colorOverride || DIRECTORY_TYPE_COLOR_MAP[inst.type] || 'var(--color-primary)';
    const encodedName = encodeURIComponent(String(inst.name || '').trim());
    const encodedCatKey = encodeURIComponent(String(catKey || '').trim());
    const sigTypesHtml = Object.entries(inst.signalTypes)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => {
        const shortLabel = type.replace('Platform / Infrastructure', 'Platform').replace('Strategic Partnership', 'Partnership').replace('Strategic Initiative', 'Initiative').replace('Regulatory Action', 'Regulatory').replace('Investment / M&A', 'Investment').replace('Pilot / Trial', 'Pilot').replace('Product Launch', 'Launch').replace('Leadership & Governance', 'Leadership');
        return `<span class="cell-tag cell-tag-link" title="${type}: ${count} - Click to view signals" data-nav-signal-name="${encodedName}" data-nav-signal-category="${encodedCatKey}">${shortLabel} ${count}</span>`;
      })
      .join('');

    const initHtml = [...inst.initiativeTypes]
      .map(type => `<span class="cell-tag cell-tag-link" title="${type} - Click to view signals" data-nav-signal-name="${encodedName}" data-nav-signal-category="${encodedCatKey}">${DIRECTORY_SHORT_INIT[type] || type}</span>`)
      .join('');

    const fmiHtml = [...inst.fmiAreas]
      .filter(area => area !== 'General Infrastructure')
      .map(area => `<span class="cell-tag cell-tag-link" title="${area} - Click to view signals" data-nav-signal-name="${encodedName}" data-nav-signal-category="${encodedCatKey}">${DIRECTORY_SHORT_FMI[area] || area}</span>`)
      .join('');

    return `
      <tr>
        <td class="inst-name"><a class="inst-name-link" href="#" data-nav-signal-name="${encodedName}" data-nav-signal-category="${encodedCatKey}">${inst.name}</a></td>
        ${showType ? `<td>${inst.type}</td>` : ''}
        <td>${inst.countryLabel}</td>
        <td class="num" style="color:${color};font-size:13px;"><a class="inst-count-link" href="#" data-nav-signal-name="${encodedName}" data-nav-signal-category="${encodedCatKey}">${inst.signals}</a></td>
        <td><div class="cell-tags">${sigTypesHtml}</div></td>
        <td><div class="cell-tags">${initHtml}</div></td>
        <td><div class="cell-tags">${fmiHtml}</div></td>
      </tr>
    `;
  }).join('');
}

// ===== DATA LOADING & REFRESH =====
function loadAndRenderData() {
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
      .sort((a, b) => (getSignalDateTimestamp(b) || 0) - (getSignalDateTimestamp(a) || 0));

    const operationalSignals = allSignals.filter(s => !s._isBrief);
    const latestSourceTimestamp = getLatestNonFutureSignalTimestamp(operationalSignals);

    dataRefreshMeta = {
      loadedAt: new Date(),
      latestSourceDate: latestSourceTimestamp > 0 ? new Date(latestSourceTimestamp) : null,
      totalOperationalSignals: operationalSignals.length
    };

    recomputeSignalImportanceScores();
    renderKPIs();
    renderDirectory();
    renderCountryDirectory();
    buildCharts();
    window._chartsReady = true;
    renderFilterPills();
    renderSignalTypeSelect();
    renderImportanceTierSelect();
    renderPersonaSelect();
    renderGlobalDateFilterSelect();
    renderCountrySelects();
    renderDataFreshnessStamp();
    renderIntelBriefs();
    renderInitiativeSchema();
    renderFmiSchema();
    renderSignalTypeSchema();
    renderSignals();
    renderPopularityAnalysis();
    applyRadarPrefilterFromUrl();
    restoreSignalDetailFromUrl();
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
  }).catch(error => {
    console.error('Error loading and rendering data:', error);
  });
}

// Load data immediately on page load
loadAndRenderData();

// Refresh data every 5 minutes to better surface upstream updates.
setInterval(loadAndRenderData, 300000);

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

function getSignalDateKey(rawDate) {
  const raw = typeof rawDate === 'string' ? rawDate.trim() : '';
  if (!raw) return null;
  const isoPrefix = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoPrefix)) return isoPrefix;
  const dt = parseSignalDate(raw);
  if (!dt) return null;
  if (isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function getDailySignalSnapshot(signals) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const byDate = {};

  signals.forEach(signal => {
    const key = getSignalDateKey(signal.date);
    if (!key) return;
    byDate[key] = (byDate[key] || 0) + 1;
  });

  const availableDates = Object.keys(byDate).sort();
  const latestNonFutureDate = availableDates.filter(dateKey => dateKey <= todayKey).pop() || null;
  const effectiveDateKey = latestNonFutureDate || availableDates.pop() || todayKey;

  return {
    todayKey,
    effectiveDateKey,
    count: byDate[effectiveDateKey] || 0
  };
}

function getSignalScoringSignals() {
  const base = getOperationalSignals();
  if (!signalScoringFilter || typeof signalScoringFilter.predicate !== 'function') return base;
  return base.filter(signal => {
    try {
      return Boolean(signalScoringFilter.predicate(signal));
    } catch (_) {
      return false;
    }
  });
}

function renderSignalScoringFilterChip() {
  const chip = document.getElementById('signalScoringFilterChip');
  const label = document.getElementById('signalScoringFilterChipLabel');
  if (!chip || !label) return;

  if (!signalScoringFilter) {
    chip.style.display = 'none';
    return;
  }

  label.textContent = signalScoringFilter.label || 'KPI filter applied';
  chip.style.display = 'inline-flex';
}

function renderSignalScoringClearFilterButton() {
  const btn = document.getElementById('signalScoringClearFilterBtn');
  if (!btn) return;
  const hasFilters = Boolean(
    signalScoringFilter ||
    matrixFilter ||
    signalTypeFilter ||
    countryFilter ||
    importanceTierMode !== DEFAULT_IMPORTANCE_TIER_MODE ||
    selectedPersona !== DEFAULT_PERSONA ||
    searchQuery !== '' ||
    activeFilter !== 'all' ||
    dirSearch !== '' ||
    dirSort !== 'signals' ||
    dirCountryFilter !== '' ||
    countryDirSearch !== '' ||
    countryDirSort !== 'signals' ||
    countryDirTypeFilter !== ''
  );
  btn.disabled = !hasFilters;
  btn.classList.toggle('is-inactive', !hasFilters);
}

function clearSignalScoringFilter() {
  signalScoringFilter = null;
  radarPrefilter = null;
  matrixFilter = null;
  signalTypeFilter = '';
  countryFilter = '';
  setImportanceTierMode(DEFAULT_IMPORTANCE_TIER_MODE);
  setPersona(DEFAULT_PERSONA);
  selectedDateWindowDays = DEFAULT_DATE_WINDOW_DAYS;
  searchQuery = '';
  activeFilter = 'all';
  dirSearch = '';
  dirSort = 'signals';
  dirCountryFilter = '';
  countryDirSearch = '';
  countryDirSort = 'signals';
  countryDirTypeFilter = '';

  const dirSearchInput = document.getElementById('directorySearch');
  if (dirSearchInput) dirSearchInput.value = '';
  const dirSortEl = document.getElementById('directorySort');
  if (dirSortEl) dirSortEl.value = 'signals';
  const countryDirSearchInput = document.getElementById('countryDirectorySearch');
  if (countryDirSearchInput) countryDirSearchInput.value = '';
  const countryDirSortEl = document.getElementById('countryDirectorySort');
  if (countryDirSortEl) countryDirSortEl.value = 'signals';
  const countryDirTypeEl = document.getElementById('countryDirectoryType');
  if (countryDirTypeEl) countryDirTypeEl.value = '';

  syncSignalTypeSelect();
  syncCountrySelects();
  syncPersonaSelect();
  syncGlobalDateFilterSelect();
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  closeSignalStrengthBreakdown();
  renderSignals();
  updateResetBars();
}

function drillDownKPIToSignalMatrixByInstitutionType(institutionType, dateKey) {
  const selectedType = String(institutionType || '').trim();
  if (!selectedType) return;

  const shortType = selectedType
    .replace('Exchanges & Central Intermediaries', 'Exchanges')
    .replace('Asset & Investment Management', 'Asset Mgmt')
    .replace('Infrastructure & Technology', 'Infra & Tech');

  const selectedDateKey = String(dateKey || '').trim();
  const hasDateFilter = selectedDateKey !== '';
  const label = hasDateFilter
    ? `KPI filter: ${shortType} on ${selectedDateKey}`
    : `KPI filter: ${shortType}`;

  signalScoringFilter = {
    label,
    predicate: signal => {
      if (signal.institution_type !== selectedType) return false;
      if (!hasDateFilter) return true;
      return getSignalDateKey(signal.date) === selectedDateKey;
    }
  };

  closeKPIBreakdown();
  navigateToCatalogueByType(selectedType);
  trackDrillDown('KPI Breakdown', 'Signal Catalogue');
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
  const signalTypeCounts = {};
  signals.forEach(s => {
    const type = String(s.signal_type || '').trim();
    if (!isVisibleSignalType(type)) return;
    signalTypeCounts[type] = (signalTypeCounts[type] || 0) + 1;
  });
  const activeSignalTypes = Object.keys(signalTypeCounts).length;
  const totalSignalTypes = [...new Set(SIGNAL_TYPE_GROUPS.flatMap(group => group.types))].length;

  const snapshot = getDailySignalSnapshot(signals);
  const snapshotDate = new Date(`${snapshot.effectiveDateKey}T00:00:00`);
  const snapshotLabel = snapshotDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const snapshotContext = snapshot.effectiveDateKey === snapshot.todayKey ? `As of ${snapshotLabel}` : `As of ${snapshotLabel} (latest reporting date)`;

  const kpis = [
    { id: 'daily_new', value: snapshot.count, label: 'New Signals', color: 'var(--color-success)', delta: snapshotContext },
    { id: 'signals', value: signals.length, label: 'Total Signals', color: 'var(--color-primary)' },
    { id: 'signal_types', value: activeSignalTypes, label: 'Signal Types', color: 'var(--color-primary)' },
    { id: 'institutions', value: institutions.size, label: 'Institutions', color: 'var(--color-primary)' },
    { id: 'sectors', value: '6', label: 'Sector Categories', color: 'var(--color-primary)' },
    { id: 'sources', value: uniqueSources.size, label: 'Info Sources', color: 'var(--color-primary)' },
    { id: 'countries', value: '40+', label: 'Countries', color: 'var(--color-primary)' }
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
    html = `<div class="kpi-breakdown-header"><h3>${signals.length} Signals by Institution Type</h3><button type="button" class="kpi-breakdown-close" data-kpi-close="true">Close ✕</button></div>`;
    html += '<div class="kpi-breakdown-grid">';
    sorted.forEach(([type, count]) => {
      html += `<a href="#" class="kpi-breakdown-item" data-kpi-drill-inst="${encodeURIComponent(type)}"><span class="bd-label">${type.replace('Exchanges & Central Intermediaries','Exchanges').replace('Asset & Investment Management','Asset Mgmt').replace('Infrastructure & Technology','Infra & Tech')}</span><span class="bd-bar"><span class="bd-bar-fill" style="width:${(count/max*100)}%"></span></span><span class="bd-value">${count}</span></a>`;
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
    html = `<div class="kpi-breakdown-header"><h3>${new Set(signals.map(s=>s.institution)).size} Institutions by Sector</h3><button type="button" class="kpi-breakdown-close" data-kpi-close="true">Close ✕</button></div>`;
    html += '<div class="kpi-breakdown-grid">';
    sorted.forEach(([type, count]) => {
      html += `<a href="#" class="kpi-breakdown-item" data-kpi-drill-inst="${encodeURIComponent(type)}"><span class="bd-label">${type.replace('Exchanges & Central Intermediaries','Exchanges').replace('Asset & Investment Management','Asset Mgmt').replace('Infrastructure & Technology','Infra & Tech')}</span><span class="bd-bar"><span class="bd-bar-fill" style="width:${(count/max*100)}%"></span></span><span class="bd-value">${count}</span></a>`;
    });
    html += '</div>';
    html += '<a href="#directory" class="kpi-breakdown-link">See full Institution Directory ↓</a>';

  } else if (kpiId === 'daily_new') {
    const snapshot = getDailySignalSnapshot(signals);
    const snapshotDate = new Date(`${snapshot.effectiveDateKey}T00:00:00`);
    const snapshotLabel = snapshotDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const snapshotSignals = signals.filter(s => getSignalDateKey(s.date) === snapshot.effectiveDateKey);

    html = `<div class="kpi-breakdown-header"><h3>New Signals on ${snapshotLabel}</h3><button type="button" class="kpi-breakdown-close" data-kpi-close="true">Close ✕</button></div>`;

    if (snapshotSignals.length === 0) {
      html += '<div style="font-size:var(--text-xs);color:var(--color-text-muted);line-height:1.7;">No operational signals are available for the latest reporting date.</div>';
    } else {
      const byType = {};
      snapshotSignals.forEach(s => { byType[s.institution_type] = (byType[s.institution_type] || 0) + 1; });
      const sorted = Object.entries(byType).sort((a,b) => b[1] - a[1]);
      const max = sorted[0]?.[1] || 1;
      html += '<div class="kpi-breakdown-grid">';
      sorted.forEach(([type, count]) => {
        const label = type.replace('Exchanges & Central Intermediaries','Exchanges').replace('Asset & Investment Management','Asset Mgmt').replace('Infrastructure & Technology','Infra & Tech');
        html += `<a href="#" class="kpi-breakdown-item" data-kpi-drill-inst="${encodeURIComponent(type)}" data-kpi-drill-date="${snapshot.effectiveDateKey}"><span class="bd-label">${label}</span><span class="bd-bar"><span class="bd-bar-fill" style="width:${(count/max*100)}%"></span></span><span class="bd-value">${count}</span></a>`;
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

    html = `<div class="kpi-breakdown-header"><h3>${sorted.length} Unique Information Sources</h3><button type="button" class="kpi-breakdown-close" data-kpi-close="true">Close ✕</button></div>`;
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
    html = `<div class="kpi-breakdown-header"><h3>Signal Growth Over Time</h3><button type="button" class="kpi-breakdown-close" data-kpi-close="true">Close ✕</button></div>`;
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

  } else if (kpiId === 'regulatory') {
    const regTypes = ['Regulatory Action', 'Regulatory / Compliance Framework'];
    const regSignals = signals.filter(s => regTypes.includes(s.signal_type));
    const byInst = {};
    regSignals.forEach(s => { byInst[s.institution_type] = (byInst[s.institution_type] || 0) + 1; });
    const sortedInst = Object.entries(byInst).sort((a,b) => b[1]-a[1]);
    const max = sortedInst[0]?.[1] || 1;
    html = `<div class="kpi-breakdown-header"><h3>${regSignals.length} Regulatory Signals</h3><button type="button" class="kpi-breakdown-close" data-kpi-close="true">Close ✕</button></div>`;
    html += '<div class="kpi-breakdown-grid">';
    sortedInst.forEach(([type, count]) => {
      html += `<a href="#" class="kpi-breakdown-item" data-kpi-drill-inst="${encodeURIComponent(type)}"><span class="bd-label">${type.replace('Exchanges & Central Intermediaries','Exchanges').replace('Asset & Investment Management','Asset Mgmt').replace('Infrastructure & Technology','Infra & Tech')}</span><span class="bd-bar"><span class="bd-bar-fill" style="width:${(count/max*100)}%"></span></span><span class="bd-value">${count}</span></a>`;
    });
    html += '</div>';
    html += '<a href="#signal-library" class="kpi-breakdown-link">Open Signal Catalogue ↓</a>';

  } else if (kpiId === 'signal_types') {
    const byType = {};
    signals.forEach(s => {
      const type = String(s.signal_type || '').trim();
      if (!isVisibleSignalType(type)) return;
      byType[type] = (byType[type] || 0) + 1;
    });
    const activeCount = Object.keys(byType).length;
    const grouped = SIGNAL_TYPE_GROUPS.map(group => ({
      name: group.name,
      items: group.types.map(type => ({ type, count: byType[type] || 0 }))
    }));

    html = `<div class="kpi-breakdown-header"><h3>${activeCount} Active Signal Types</h3><button type="button" class="kpi-breakdown-close" data-kpi-close="true">Close ✕</button></div>`;
    grouped.forEach(group => {
      const groupTotal = group.items.reduce((sum, item) => sum + item.count, 0);
      const max = Math.max(1, ...group.items.map(item => item.count));
      html += `<div style="font-size:11px;font-weight:700;color:var(--color-text);margin:var(--space-3) 0 var(--space-2) 0;">${group.name} (${groupTotal})</div>`;
      html += '<div class="kpi-breakdown-grid">';
      group.items
        .sort((a, b) => b.count - a.count)
        .forEach(item => {
          html += `<a href="#" class="kpi-breakdown-item" data-kpi-nav-signal-type="${encodeURIComponent(item.type)}"><span class="bd-label">${item.type}</span><span class="bd-bar"><span class="bd-bar-fill" style="width:${(item.count / max) * 100}%"></span></span><span class="bd-value">${item.count}</span></a>`;
        });
      html += '</div>';
    });
    html += '<a href="#analytics" class="kpi-breakdown-link">View signal type chart ↓</a>';

  } else if (kpiId === 'launches') {
    const byType = {};
    signals.forEach(s => { byType[s.signal_type] = (byType[s.signal_type] || 0) + 1; });
    const sorted = Object.entries(byType).sort((a,b) => b[1] - a[1]);
    const max = sorted[0]?.[1] || 1;
    html = `<div class="kpi-breakdown-header"><h3>All Signal Types</h3><button type="button" class="kpi-breakdown-close" data-kpi-close="true">Close ✕</button></div>`;
    html += '<div class="kpi-breakdown-grid">';
    sorted.forEach(([type, count]) => {
      html += `<div class="kpi-breakdown-item"><span class="bd-label">${type}</span><span class="bd-bar"><span class="bd-bar-fill" style="width:${(count/max*100)}%"></span></span><span class="bd-value">${count}</span></div>`;
    });
    html += '</div>';
    html += '<a href="#analytics" class="kpi-breakdown-link">View signal type chart ↓</a>';

  } else if (kpiId === 'sectors') {
    const catMap = { 'Global Banks':'global_banks', 'Asset & Investment Management':'asset_management', 'Payments Providers':'payments', 'Exchanges & Central Intermediaries':'exchanges_intermediaries', 'Regulatory Agencies':'regulators', 'Infrastructure & Technology':'ecosystem' };
    const colorMap = { 'Global Banks':'var(--color-banks)', 'Asset & Investment Management':'var(--color-asset-mgmt)', 'Payments Providers':'var(--color-payments)', 'Exchanges & Central Intermediaries':'var(--color-exchanges)', 'Regulatory Agencies':'var(--color-regulators)', 'Infrastructure & Technology':'var(--color-ecosystem)' };
    html = `<div class="kpi-breakdown-header"><h3>6 Sector Categories</h3><button type="button" class="kpi-breakdown-close" data-kpi-close="true">Close ✕</button></div>`;
    html += '<div class="kpi-breakdown-grid">';
    Object.entries(catMap).forEach(([type, anchor]) => {
      const count = signals.filter(s => s.institution_type === type).length;
      const instCount = new Set(signals.filter(s => s.institution_type === type).map(s => s.institution)).size;
      html += `<a href="#" class="kpi-breakdown-item" style="border-left:3px solid ${colorMap[type]}" data-kpi-nav-directory="${anchor}"><span class="bd-label">${type.replace('Exchanges & Central Intermediaries','Exchanges').replace('Asset & Investment Management','Asset Mgmt').replace('Infrastructure & Technology','Infra & Tech')}</span><span class="bd-value">${count} signals · ${instCount} firms</span></a>`;
    });
    html += '</div>';

  } else if (kpiId === 'countries') {
    const countryCounts = {};
    signals.forEach(s => {
      const country = normalizeCountryName(s.country) || 'Unmapped';
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });

    const threshold = 3;
    const sorted = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);
    const visible = sorted.filter(([country, count]) => country !== 'Unmapped' && count >= threshold);
    const belowThreshold = sorted.filter(([country, count]) => country !== 'Unmapped' && count < threshold);
    const unmapped = sorted.find(([country]) => country === 'Unmapped');
    const max = Math.max(1, ...visible.map(([, count]) => count));

    html = `<div class="kpi-breakdown-header"><h3>Global Coverage</h3><button type="button" class="kpi-breakdown-close" data-kpi-close="true">Close ✕</button></div>`;
    if (visible.length > 0) {
      html += `<div style="font-size:11px;color:var(--color-text-muted);margin-bottom:var(--space-2);">Showing countries with ${threshold}+ signals. Lower-volume countries are grouped below.</div>`;
      html += '<div class="kpi-breakdown-grid">';
      visible.forEach(([country, count]) => {
        html += `<a href="#" class="kpi-breakdown-item" data-kpi-nav-country="${encodeURIComponent(country)}"><span class="bd-label">${country}</span><span class="bd-bar"><span class="bd-bar-fill" style="width:${(count / max) * 100}%"></span></span><span class="bd-value">${count}</span></a>`;
      });
      html += '</div>';
    }

    if (belowThreshold.length > 0) {
      const otherCount = belowThreshold.reduce((sum, [, count]) => sum + count, 0);
      html += `<div style="font-size:11px;color:var(--color-text-muted);margin-top:var(--space-2);">${belowThreshold.length} countries with fewer than ${threshold} signals are grouped as Other (${otherCount}).</div>`;
    }

    if (unmapped) {
      html += `<div style="font-size:11px;color:var(--color-text-muted);margin-top:var(--space-1);">Unmapped signals: ${unmapped[1]}</div>`;
    }

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
  signals.forEach(s => {
    if (!isVisibleSignalType(s.signal_type)) return;
    counts[s.signal_type] = (counts[s.signal_type] || 0) + 1;
  });
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
      onClick: (e, elements) => {
        if (elements.length > 0) {
          const idx = elements[0].index;
          const signalType = sorted[idx][0];
          showSignalTypeDrilldown(signalType, getCatColors());
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.raw} signals (${Math.round(ctx.raw/signals.length*100)}%) — click for breakdown` } }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { font: { size: 11 } } },
        y: { grid: { display: false }, ticks: { font: { size: 11, weight: 500 }, autoSkip: false, padding: 4 } }
      }
    }
  });
}

function showSignalTypeDrilldown(signalType, colors) {
  const panel = document.getElementById('signalTypeDrilldown');
  if (!panel) return;

  const relevant = getOperationalSignals().filter(s => String(s.signal_type || '').trim() === signalType);
  const byType = {};
  relevant.forEach(s => { byType[s.institution_type] = (byType[s.institution_type] || 0) + 1; });
  const sorted = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;

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
    <button type="button" class="drilldown-close" data-drilldown-close="true">Close ✕</button>
    <h4>${signalType} — by Institution Type (${relevant.length} signals)</h4>
    <p class="drilldown-hint">Click a row to navigate to that section in the directory</p>
    ${sorted.map(([type, count]) => {
      const catKey = dirCatMap[type] || '';
      const shortLabel = type.replace('Exchanges & Central Intermediaries','Exchanges').replace('Asset & Investment Management','Asset Mgmt').replace('Infrastructure & Technology','Infra & Tech');
      return `
      <div class="drilldown-item drilldown-item-link" data-drilldown-nav-directory="${catKey}" title="View ${type} in the directory">
        <span style="min-width:140px">${shortLabel}</span>
        <div class="drilldown-bar"><div class="drilldown-bar-fill" style="width:${(count/max*100)}%; background:${colors[type] || 'var(--color-primary)'}"></div></div>
        <span style="min-width:30px;text-align:right;font-weight:700">${count}</span>
        <svg class="drilldown-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
      </div>
    `}).join('')}
  `;
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

function renderSignalTypeSchema() {
  const container = document.getElementById('signalTypeSchemaContent');
  if (!container) return;

  const cards = SIGNAL_TYPE_GROUPS.flatMap(group =>
    group.types
      .filter(isVisibleSignalType)
      .map(type => ({
        type,
        group: group.name,
        description: SIGNAL_TYPE_DESCRIPTIONS[type] || 'Operational institutional signal classification.'
      }))
  );

  container.innerHTML = `
    <div class="initiative-schema-grid">
      ${cards.map(item => `
        <article class="initiative-schema-card">
          <div class="initiative-schema-card-top">
            <h3>${item.type}</h3>
            <span class="initiative-schema-pill analytics">${item.group}</span>
          </div>
          <p>${item.description}</p>
        </article>
      `).join('')}
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
    <button type="button" class="drilldown-close" data-drilldown-close="true">Close ✕</button>
    <h4>${fmiArea} — by Institution Type (${relevant.length} signals)</h4>
    <p class="drilldown-hint">Click a row to navigate to that section in the directory</p>
    ${sorted.map(([type, count]) => {
      const catKey = dirCatMap[type] || '';
      const shortLabel = type.replace('Exchanges & Central Intermediaries','Exchanges').replace('Asset & Investment Management','Asset Mgmt').replace('Infrastructure & Technology','Infra & Tech');
      return `
      <div class="drilldown-item drilldown-item-link" data-drilldown-nav-directory="${catKey}" title="View ${type} in the directory">
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
        html += `<td class="heatmap-cell" style="background:${cellColor(val)};color:${textCol(val)};cursor:pointer" title="${instTypes[i]} × ${initTypes[ci]}: ${val} (click to view signals)" data-matrix-nav-inst="${encodeURIComponent(instTypes[i])}" data-matrix-nav-init="${encodeURIComponent(initTypes[ci])}">${val}</td>`;
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
  signalScoringFilter = null;
  matrixFilter = null;
  signalTypeFilter = '';
  countryFilter = '';
  syncSignalTypeSelect();
  syncCountrySelects();
  searchQuery = e.target.value.toLowerCase().trim();
  if (searchQuery) trackSearch(searchQuery, 'Signal Catalogue');
  renderSignals();
  updateResetBars();
});

// ===== FILTER PILLS =====
function renderFilterPills() {
  const container = document.getElementById('filterPills');
  if (!container) return;
  const nonBriefs = getCatalogueSignals({ includeCategory: false });
  const personaScoped = selectedPersona !== DEFAULT_PERSONA
    ? nonBriefs.filter(signal => getPersonaRelevance(signal, selectedPersona) >= 0.15)
    : nonBriefs;
  const countSource = personaScoped.length > 0 ? personaScoped : nonBriefs;
  const counts = {};
  countSource.forEach(s => { counts[s.category] = (counts[s.category] || 0) + 1; });
  let html = `<button class="filter-pill${activeFilter === 'all' ? ' active' : ''}" data-filter="all">All<span class="count">${countSource.length}</span></button>`;
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    html += `<button class="filter-pill${activeFilter === key ? ' active' : ''}" data-filter="${key}">${cat.name.split(' ')[0]}<span class="count">${counts[key] || 0}</span></button>`;
  }
  container.innerHTML = html;
  container.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      signalScoringFilter = null;
      matrixFilter = null;
      signalTypeFilter = '';
      countryFilter = '';
      syncSignalTypeSelect();
      syncCountrySelects();
      activeFilter = btn.dataset.filter;
      trackFilter('institution_category', btn.dataset.filter);
      renderSignals();
      updateResetBars();
    });
  });
}

function syncSignalTypeSelect() {
  const select = document.getElementById('signalTypeSelect');
  if (select) select.value = signalTypeFilter;
}

function syncCountrySelects() {
  const catalogueSelect = document.getElementById('countrySelect');
  const directorySelect = document.getElementById('directoryCountry');
  if (catalogueSelect) catalogueSelect.value = countryFilter;
  if (directorySelect) directorySelect.value = dirCountryFilter;
}

function syncGlobalDateFilterSelect() {
  const select = document.getElementById('globalDateFilterSelect');
  if (!select) return;
  select.value = selectedDateWindowDays === null ? 'all' : String(selectedDateWindowDays);
}

function renderGlobalDateFilterSelect() {
  const select = document.getElementById('globalDateFilterSelect');
  if (!select) return;

  syncGlobalDateFilterSelect();

  select.onchange = event => {
    const raw = String(event.target.value || '').trim();
    if (raw === 'all') {
      selectedDateWindowDays = null;
    } else {
      const parsed = Number(raw);
      selectedDateWindowDays = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DATE_WINDOW_DAYS;
    }

    trackFilter('date_window', selectedDateWindowDays === null ? 'all' : String(selectedDateWindowDays));
    renderCatalogueSortNote();
    renderSignals();
    renderDirectory();
    renderCountryDirectory();
    renderPopularityAnalysis();
    renderDataFreshnessStamp();
    updateResetBars();
  };
}

function renderDataFreshnessStamp() {
  const stamp = document.getElementById('dataFreshnessStamp');
  if (!stamp) return;

  if (!dataRefreshMeta.loadedAt && Array.isArray(allSignals) && allSignals.length > 0) {
    const operationalSignals = allSignals.filter(s => !s._isBrief);
    const latestSourceTimestamp = getLatestNonFutureSignalTimestamp(operationalSignals);

    dataRefreshMeta = {
      loadedAt: new Date(),
      latestSourceDate: latestSourceTimestamp > 0 ? new Date(latestSourceTimestamp) : null,
      totalOperationalSignals: operationalSignals.length
    };
  }

  const loadedAtText = dataRefreshMeta.loadedAt
    ? dataRefreshMeta.loadedAt.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit'
      })
    : 'unknown';

  const latestSourceDateText = dataRefreshMeta.latestSourceDate
    ? dataRefreshMeta.latestSourceDate.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      })
    : 'unknown';

  const visibleCount = getOperationalSignals().length;
  const totalCount = dataRefreshMeta.totalOperationalSignals || visibleCount;
  const windowLabel = selectedDateWindowDays === null ? 'all historical' : `last ${selectedDateWindowDays} days`;

  stamp.textContent = `Data refresh: loaded ${loadedAtText} | latest source date ${latestSourceDateText} | showing ${visibleCount} of ${totalCount} signals (${windowLabel}).`;
}

function renderCountrySelects() {
  const counts = {};
  getOperationalSignals().forEach(signal => {
    const country = normalizeCountryName(signal.country) || 'Unmapped';
    counts[country] = (counts[country] || 0) + 1;
  });

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .sort((a, b) => (a[0] === 'Unmapped' ? 1 : b[0] === 'Unmapped' ? -1 : 0));

  const options = sorted
    .map(([country, count]) => `<option value="${country.replace(/"/g, '&quot;')}">${country} (${count})</option>`)
    .join('');

  const catalogueSelect = document.getElementById('countrySelect');
  if (catalogueSelect) {
    catalogueSelect.innerHTML = `<option value="">All Countries</option>${options}`;
    catalogueSelect.onchange = event => {
      signalScoringFilter = null;
      matrixFilter = null;
      countryFilter = String(event.target.value || '').trim();
      dirCountryFilter = countryFilter;
      if (countryFilter) trackFilter('country', countryFilter);
      syncCountrySelects();
      renderSignals();
      renderDirectory();
      updateResetBars();
    };
  }

  const directorySelect = document.getElementById('directoryCountry');
  if (directorySelect) {
    directorySelect.innerHTML = `<option value="">All Countries</option>${options}`;
  }

  syncCountrySelects();
}

function normalizeSignalTypeForMatch(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ');
}

function resolveSignalTypeFilterValue(rawValue) {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) return '';

  const aliasMap = {
    'regulatory/compliance': 'Regulatory / Compliance Framework',
    'regulatory / compliance': 'Regulatory / Compliance Framework'
  };

  const aliasHit = aliasMap[normalizeSignalTypeForMatch(trimmed)];
  if (aliasHit) return aliasHit;

  const visibleTypes = [...new Set(
    getOperationalSignals()
      .map(signal => String(signal.signal_type || '').trim())
      .filter(isVisibleSignalType)
  )];

  const normalizedTarget = normalizeSignalTypeForMatch(trimmed);
  const directMatch = visibleTypes.find(type => normalizeSignalTypeForMatch(type) === normalizedTarget);
  if (directMatch) return directMatch;

  const fuzzyMatch = visibleTypes.find(type => {
    const normalizedType = normalizeSignalTypeForMatch(type);
    return normalizedType.includes(normalizedTarget) || normalizedTarget.includes(normalizedType);
  });

  return fuzzyMatch || trimmed;
}

function setCatalogueCategoryFilter(filterKey) {
  activeFilter = filterKey;
  const pills = document.querySelectorAll('.filter-pill');
  pills.forEach(p => {
    p.classList.remove('active');
    if (p.dataset.filter === filterKey) p.classList.add('active');
  });
}

function renderSignalTypeSelect() {
  const select = document.getElementById('signalTypeSelect');
  if (!select) return;

  const counts = {};
  getOperationalSignals().forEach(signal => {
    const type = String(signal.signal_type || '').trim();
    if (!isVisibleSignalType(type)) return;
    counts[type] = (counts[type] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  let html = '<option value="">All Signal Types</option>';
  sorted.forEach(([type, count]) => {
    const safeType = type.replace(/"/g, '&quot;');
    html += `<option value="${safeType}">${type} (${count})</option>`;
  });
  select.innerHTML = html;
  syncSignalTypeSelect();

  select.onchange = (event) => {
    signalScoringFilter = null;
    matrixFilter = null;
    signalTypeFilter = resolveSignalTypeFilterValue(event.target.value || '');
    setCatalogueCategoryFilter('all');
    if (signalTypeFilter) trackFilter('signal_type', signalTypeFilter);
    renderSignals();
    updateResetBars();
  };
}

function renderImportanceTierSelect() {
  const select = document.getElementById('importanceTierSelect');
  if (!select) return;

  select.value = IMPORTANCE_TIER_FILTERS[importanceTierMode] ? importanceTierMode : DEFAULT_IMPORTANCE_TIER_MODE;

  select.onchange = (event) => {
    const mode = String(event.target.value || DEFAULT_IMPORTANCE_TIER_MODE).trim();
    setImportanceTierMode(mode);
    trackFilter('importance_tier', mode);
    renderSignals();
    renderDirectory();
    renderCountryDirectory();
    renderPopularityAnalysis();
    updateResetBars();
  };
}

function syncPersonaSelect() {
  document.querySelectorAll('#personaSelectorGlobal button[data-persona]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.persona === selectedPersona);
  });
}

function renderCatalogueSortNote() {
  const note = document.getElementById('catalogueSortNote');
  if (!note) return;

  const dateWindowText = selectedDateWindowDays === null
    ? 'Showing all historical signals (future-dated entries hidden).'
    : `Showing last ${selectedDateWindowDays} days only.`;

  const scopeText = importanceTierMode === 'priority'
    ? 'View limited to System-Shaping and Directionally Important signals.'
    : importanceTierMode === 'structural'
      ? 'View limited to System-Shaping signals only.'
      : importanceTierMode === 'context'
        ? 'View limited to Background signals only.'
        : '';

  if (selectedPersona !== DEFAULT_PERSONA) {
    note.textContent = `Sorted by ${getPersonaLabel(selectedPersona)} relevance first, then importance tier, signal strength (importance score), and most recent date. ${dateWindowText}${scopeText ? ` ${scopeText}` : ''}`;
    return;
  }

  note.textContent = `Default catalogue sort order: importance tier first, then signal strength (importance score), then most recent date. ${dateWindowText}${scopeText ? ` ${scopeText}` : ''}`;
}

function getImportanceTierRank(tier) {
  const rank = {
    Structural: 4,
    Material: 3,
    Context: 2,
    Noise: 1
  };
  return rank[String(tier || '').trim()] || 0;
}

function renderPersonaSelect() {
  const container = document.getElementById('personaSelectorGlobal');
  if (!container) return;

  container.querySelectorAll('button[data-persona]').forEach(btn => {
    btn.onclick = () => {
      const mode = btn.dataset.persona || DEFAULT_PERSONA;
      setPersona(mode);
      syncPersonaSelect();
      openCollapsible('.signal-library-section', 'libraryBody');
      trackFilter('audience_lens', selectedPersona);
      renderCatalogueSortNote();
      renderSignals();
      renderDirectory();
      renderCountryDirectory();
      renderPopularityAnalysis();
      updateResetBars();

      const target = document.getElementById('signal-library');
      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
  });
  syncPersonaSelect();
  renderCatalogueSortNote();
}

function focusStructuralSignalsFromPriority() {
  openCollapsible('.signal-library-section', 'libraryBody');
  setImportanceTierMode('structural');
  activeFilter = 'all';
  signalTypeFilter = '';
  countryFilter = '';
  searchQuery = '';
  signalScoringFilter = null;
  matrixFilter = null;
  syncSignalTypeSelect();
  syncCountrySelects();
  syncImportanceTierSelect();
  renderSignals();
  document.querySelectorAll('.category-section').forEach(section => section.classList.add('cat-open'));
  updateResetBars();
  trackFilter('importance_tier', 'structural');

  const target = document.getElementById('signal-library') || document.getElementById('signalSections');
  if (target && typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function setupPrioritySignalsInteractions(container) {
  if (!container || container.dataset.priorityHandlersBound === 'true') return;

  container.addEventListener('click', (event) => {
    const detailBtn = event.target.closest('[data-priority-signal-key]');
    if (detailBtn) {
      event.preventDefault();
      const signalKey = detailBtn.getAttribute('data-priority-signal-key');
      const signalDate = detailBtn.getAttribute('data-priority-signal-date') || '';
      const signalSource = detailBtn.getAttribute('data-priority-signal-source') || '';
      if (signalKey) openSignalDetailByKey(signalKey, { signalDate, sourceUrl: signalSource });
    }
  });

  container.dataset.priorityHandlersBound = 'true';
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
function renderPrioritySignalsStrip() {
  const container = document.getElementById('prioritySignalsStrip');
  if (!container) return;
  setupPrioritySignalsInteractions(container);

  // Get Structural-tier signals only
  const allSignals = getOperationalSignals();
  const structuralSignals = allSignals.filter(s => {
    const importance = getSignalImportance(s);
    return importance.tier === 'Structural';
  });

  if (structuralSignals.length === 0) {
    container.innerHTML = '';
    return;
  }

  // Sort by persona relevance if selected, else by date + importance
  const sortedSignals = [...structuralSignals].sort((a, b) => {
    if (selectedPersona !== DEFAULT_PERSONA) {
      const relevanceA = getPersonaRelevance(a, selectedPersona);
      const relevanceB = getPersonaRelevance(b, selectedPersona);
      if (relevanceB !== relevanceA) return relevanceB - relevanceA;
    }
    
    const tsA = getSignalDateTimestamp(a) || 0;
    const tsB = getSignalDateTimestamp(b) || 0;
    if (tsB !== tsA) return tsB - tsA;

    const scoreA = getSignalImportance(a).importanceScore || 0;
    const scoreB = getSignalImportance(b).importanceScore || 0;
    return scoreB - scoreA;
  });

  // Take top 5 signals
  const topSignals = sortedSignals.slice(0, 5);
  const lensLabel = getPersonaLabel(selectedPersona);

  let html = `
    <div class="priority-signals-section">
      <div class="priority-signals-header">
        <h2>Priority Signals – This Quarter</h2>
        ${selectedPersona !== DEFAULT_PERSONA ? `<p class="priority-signals-persona-note">Ranked for ${lensLabel}</p>` : ''}
      </div>
      <div class="priority-signals-scroll">
  `;

  topSignals.forEach(signal => {
    const importance = getSignalImportance(signal);
    const tierTooltip = escapeHtml(getImportanceTierTooltip('Structural'));
    const date = formatExactSignalDate(signal);
    const insight = buildSignalDirectionalInsight(signal, importance);
    const marketContext = getExternalMarketContext(signal, selectedPersona);
    const initiatives = Array.isArray(signal.initiative_types) ? signal.initiative_types.slice(0, 1) : [];
    const initiativeText = initiatives.length ? initiatives[0] : 'Digital asset infrastructure';
    const signalKey = encodeURIComponent(getSignalKey(signal));
    const signalDate = escapeHtml(getSignalReferenceDateRaw(signal));
    const signalSource = escapeHtml(String(signal.source_url || ''));
    const url = signal.source_url || '#';
    const domain = url !== '#' ? new URL(url).hostname.replace('www.','') : '';
    const textExcerpt = signal.description ? signal.description.substring(0, 100) + (signal.description.length > 100 ? '...' : '') : '';

    html += `
      <div class="priority-signal-card">
        <div class="priority-signal-card-header">
          <div class="priority-signal-card-institution">
            <span class="priority-signal-badge" title="${tierTooltip}">Structural</span>
            <span class="priority-signal-card-institution-name">${signal.institution}</span>
          </div>
          <span class="priority-signal-card-date" title="Source publication date">${escapeHtml(date)}</span>
        </div>
        <div class="priority-signal-card-initiative">${initiativeText}</div>
        <div class="priority-signal-market-context">
          ${marketContext.available
            ? `<span class="priority-signal-market-chip" title="${escapeHtml(marketContext.source)} as of ${escapeHtml(marketContext.asOf)}">${escapeHtml(marketContext.segmentLabel)} ${escapeHtml(marketContext.trendLabel)} 30d</span>
               <span class="priority-signal-market-confidence" title="External context confidence classification">${escapeHtml(marketContext.confidence)}</span>`
            : `<span class="priority-signal-market-unavailable">Market context unavailable</span>`}
        </div>
        <div class="priority-signal-card-insight">${escapeHtml(insight)}</div>
        <div class="priority-signal-card-footer">
          ${url !== '#' ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="priority-signal-card-source"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>${domain}</a>` : '<span></span>'}
          <button type="button" class="priority-signal-card-details-btn" data-priority-signal-key="${signalKey}" data-priority-signal-date="${signalDate}" data-priority-signal-source="${signalSource}">Details</button>
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function getPlaybookThemeFromSignals(signals) {
  const buckets = {
    tokenized: 0,
    stablecoins: 0,
    dlt: 0
  };

  (Array.isArray(signals) ? signals : []).forEach(signal => {
    const combined = [
      signal?.initiative,
      signal?.description,
      ...(Array.isArray(signal?.initiative_types) ? signal.initiative_types : []),
      ...(Array.isArray(signal?.fmi_areas) ? signal.fmi_areas : []),
      signal?.signal_type
    ]
      .map(v => String(v || '').toLowerCase())
      .join(' ');

    if (/token|rwa|fund|treasur/.test(combined)) buckets.tokenized += 1;
    if (/stablecoin|deposit token|settlement|payment|cross-border|fx/.test(combined)) buckets.stablecoins += 1;
    if (/dlt|blockchain|post-trade|custody|collateral|clearing|infrastructure/.test(combined)) buckets.dlt += 1;
  });

  const ordered = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
  const [theme, score] = ordered[0] || [];
  return score > 0 ? theme : null;
}

function renderSignalsPlaybookBanner(filteredSignals) {
  const banner = document.getElementById('signalsPlaybookBanner');
  if (!banner) return;

  const hasFocusedState = Boolean(matrixFilter || signalScoringFilter || searchQuery || activeFilter !== 'all');
  if (!hasFocusedState || !Array.isArray(filteredSignals) || filteredSignals.length === 0) {
    banner.style.display = 'none';
    banner.innerHTML = '';
    return;
  }

  const theme = getPlaybookThemeFromSignals(filteredSignals);
  if (!theme) {
    banner.style.display = 'none';
    banner.innerHTML = '';
    return;
  }

  const playbookMap = {
    tokenized: {
      label: 'Tokenized Funds & RWAs',
      href: '/decision-playbooks/#tokenized-funds'
    },
    stablecoins: {
      label: 'Stablecoins & Settlement',
      href: '/decision-playbooks/#stablecoins'
    },
    dlt: {
      label: 'Market Infrastructure & DLT',
      href: '/decision-playbooks/#dlt-infrastructure'
    }
  };

  const entry = playbookMap[theme];
  if (!entry) {
    banner.style.display = 'none';
    banner.innerHTML = '';
    return;
  }

  banner.innerHTML = `Want to see what credible next steps look like in this area? <a href="${entry.href}">View the ${entry.label} Decision Playbook →</a>`;
  banner.style.display = 'block';
}

function renderSignals() {
  const container = document.getElementById('signalSections');
  const noResults = document.getElementById('noResults');
  renderMomentumDebugToggle();
  renderMatrixFilterChip();
  renderFilterPills();
  renderCatalogueSortNote();
  renderPrioritySignalsStrip();
  const filtered = getCatalogueSignals();
  renderSignalsPlaybookBanner(filtered);
  const signalMeta = buildCatalogueSignalMeta(filtered);

  if (filtered.length === 0) { container.innerHTML = ''; noResults.style.display = 'block'; return; }
  noResults.style.display = 'none';

  const grouped = {};
  for (const [key] of Object.entries(CATEGORIES)) {
    const items = filtered.filter(s => s.category === key);
    if (items.length > 0) {
      // Sort emphasizes signal quality first, then recency.
      items.sort((a, b) => {
        if (selectedPersona !== DEFAULT_PERSONA) {
          const relevanceA = getPersonaRelevance(a, selectedPersona);
          const relevanceB = getPersonaRelevance(b, selectedPersona);
          if (relevanceB !== relevanceA) return relevanceB - relevanceA;
        }

        const importanceA = getSignalImportance(a);
        const importanceB = getSignalImportance(b);
        const tierRankA = getImportanceTierRank(importanceA.tier);
        const tierRankB = getImportanceTierRank(importanceB.tier);
        if (tierRankB !== tierRankA) return tierRankB - tierRankA;

        const scoreA = importanceA.importanceScore || 0;
        const scoreB = importanceB.importanceScore || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;

        const tsA = getSignalDateTimestamp(a) || 0;
        const tsB = getSignalDateTimestamp(b) || 0;
        return tsB - tsA;
      });
      grouped[key] = items;
    }
  }

  let html = '';
  for (const [catKey, items] of Object.entries(grouped)) {
    const cat = CATEGORIES[catKey];
    // Auto-open if filter is active for this category, else collapsed
    const isOpen = activeFilter === catKey || selectedPersona !== DEFAULT_PERSONA;
    html += `
      <section class="category-section cat-${catKey}${isOpen ? ' cat-open' : ''}" id="${catKey}">
        <div class="category-header sector-banner" data-toggle-category-open="true">
          <div class="category-icon">${cat.icon}</div>
          <h2 class="category-title sector-banner-title">${cat.name}</h2>
          <span class="category-count sector-banner-count">${items.length} filtered signals</span>
          <svg class="cat-chevron sector-banner-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="signals-grid">
          ${items.map((s, i) => renderCard(s, catKey, i, signalMeta)).join('')}
        </div>
      </section>
    `;
  }
  container.innerHTML = html;
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));

  document.querySelectorAll('.signal-thermo-fill').forEach(fill => {
    const rawScore = Number(fill.dataset.momentumScore || 0);
    const score = Math.max(0, Math.min(100, rawScore));
    fill.style.width = `${score}%`;
  });

  document.querySelectorAll('.description-expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.signal-card');
      card.classList.toggle('expanded');
      btn.textContent = card.classList.contains('expanded') ? 'Show less' : 'Read more';
    });
  });

  document.querySelectorAll('.signal-details-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.signal-card');
      const willOpen = !card.classList.contains('details-open');
      card.classList.toggle('details-open', willOpen);
      btn.textContent = willOpen ? 'Hide relevance breakdown' : 'Show relevance breakdown';
      btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
  });

  renderDirectory();
  renderCountryDirectory();
  renderPopularityAnalysis();
  renderDataFreshnessStamp();
}

function renderCard(signal, catKey, _index, signalMeta = {}) {
  const date = formatExactSignalDate(signal);
  const hasLong = signal.description && signal.description.length > 200;
  const url = signal.source_url || '#';
  const domain = url !== '#' ? new URL(url).hostname.replace('www.','') : '';
  const signalKey = encodeURIComponent(getSignalKey(signal));
  const importance = getSignalImportance(signal);
  const displayTierLabel = getImportanceTierLabel(importance.tier);
  const displayTierTooltip = escapeHtml(getImportanceTierTooltip(importance.tier));
  const tierClass = String(importance.tier || 'Noise').toLowerCase().replace(/\s+/g, '-');
  const directionalInsight = buildSignalDirectionalInsight(signal, importance);
  const audience = inferSignalPersona(signal);
  const initiatives = Array.isArray(signal.initiative_types) ? signal.initiative_types.slice(0, 3) : [];
  const fmiAreas = Array.isArray(signal.fmi_areas) ? signal.fmi_areas.slice(0, 3) : [];
  const cardMeta = signalMeta[getSignalKey(signal)] || {};
  const momentum = cardMeta.momentum || { status: 'Stable', score: 50, cssClass: 'stable' };
  const initiativeRankText = cardMeta.initiativeRank ? `#${cardMeta.initiativeRank} ${cardMeta.initiativeTheme}` : cardMeta.initiativeTheme || 'Unclassified Theme';
  const institutionRankText = cardMeta.institutionRank ? `#${cardMeta.institutionRank} ${cardMeta.institutionType || ''}`.trim() : cardMeta.institutionType || 'Institution Segment';
  const momentumDebug = momentumDebugMode
    ? `<div class="signal-momentum-debug">Momentum debug: recent=${momentum.recentCount ?? 0} | prior=${momentum.priorCount ?? 0} | delta=${momentum.delta ?? 0}</div>`
    : '';
  const lensLabel = getPersonaLabel(selectedPersona);
  const personaAssessment = computePersonaAssessment(signal, selectedPersona);
  const lensDetails = personaAssessment.personaDetails || getPersonaScoreDetails(signal, selectedPersona);
  const lensRelevance = personaAssessment.personaRelevance || lensDetails.score;
  const marketContext = getExternalMarketContext(signal, selectedPersona);
  const personaDisplayTier = personaAssessment.displayTier;
  const personaDisplayTierLabel = getImportanceTierLabel(personaDisplayTier);
  const tierPriority = { Structural: 0, Material: 1, Context: 2, Noise: 3 };
  const tierAdjustArrow = personaAssessment.tierAdjusted
    ? (tierPriority[personaDisplayTier] < tierPriority[importance.tier] ? ' ↑' : ' ↓')
    : '';
  const personaDebug = momentumDebugMode && selectedPersona !== DEFAULT_PERSONA
    ? `<div class="signal-lens-debug"><span class="signal-lens-debug-label">Lens debug (${escapeHtml(lensLabel)})</span><span class="signal-lens-debug-chip">u:${escapeHtml(lensDetails.useCase)}</span><span class="signal-lens-debug-chip signal-lens-debug-chip-pos">p:${lensDetails.primaryHits}</span><span class="signal-lens-debug-chip signal-lens-debug-chip-pos">s:${lensDetails.secondaryHits}</span><span class="signal-lens-debug-chip signal-lens-debug-chip-pos">a:${lensDetails.audienceHintHits}</span><span class="signal-lens-debug-chip">r:${lensDetails.recencyWeight.toFixed(2)}</span><span class="signal-lens-debug-chip signal-lens-debug-chip-pos">u+${lensDetails.useCaseBoost.toFixed(1)}</span><span class="signal-lens-debug-chip signal-lens-debug-chip-pos">i+${lensDetails.importanceBoost.toFixed(1)}</span><span class="signal-lens-debug-chip signal-lens-debug-chip-neg">x-${lensDetails.antiPenalty.toFixed(1)}</span><span class="signal-lens-debug-chip signal-lens-debug-chip-score">score:${lensRelevance.toFixed(2)}</span></div>`
    : '';
  const lensChip = selectedPersona !== DEFAULT_PERSONA
    ? `<span class="signal-chip signal-chip-lens" title="Relevance for ${escapeHtml(lensLabel)} lens">${escapeHtml(lensLabel)} fit ${lensRelevance.toFixed(1)}</span>`
    : '';
  const tierComparisonRow = selectedPersona !== DEFAULT_PERSONA
    ? `<div class="signal-tier-comparison">
        <div class="signal-tier-comparison-item">
          <span class="signal-tier-label">For ${escapeHtml(lensLabel)}:</span>
          <span class="signal-tier-value">${personaDisplayTierLabel}${tierAdjustArrow}</span>
        </div>
        <div class="signal-tier-comparison-item">
          <span class="signal-tier-label">Market:</span>
          <span class="signal-tier-value">${displayTierLabel}</span>
        </div>
      </div>`
    : '';
  const marketContextRow = marketContext.available
    ? `<div class="signal-market-context" title="${escapeHtml(marketContext.source)} as of ${escapeHtml(marketContext.asOf)}">
        <span class="signal-market-context-label">Market context</span>
        <span class="signal-market-context-chip">${escapeHtml(marketContext.segmentLabel)} ${escapeHtml(marketContext.trendLabel)} 30d</span>
        <span class="signal-market-context-confidence">${escapeHtml(marketContext.confidence)}</span>
      </div>`
    : `<div class="signal-market-context signal-market-context-muted">
        <span class="signal-market-context-label">Market context</span>
        <span class="signal-market-context-summary">Not available</span>
      </div>`;
  return `
    <div class="signal-card" data-signal-key="${signalKey}">
      <div class="signal-card-top">
        <div class="signal-institution"><span class="dot"></span>${signal.institution}</div>
        <span class="signal-date" title="Source publication date">${escapeHtml(date)}</span>
      </div>
      <div class="signal-initiative">${signal.initiative || ''}</div>
      <div class="signal-meta-chips">
        <span class="signal-chip signal-chip-momentum momentum-${momentum.cssClass}" title="Momentum score ${Math.round(momentum.score)}/100">
          <span class="signal-momentum-label">${momentum.status}</span>
          <span class="signal-thermo" aria-hidden="true">
            <span class="signal-thermo-fill momentum-${momentum.cssClass}" data-momentum-score="${Math.round(momentum.score)}"></span>
          </span>
          <span class="signal-momentum-score">${Math.round(momentum.score)}</span>
        </span>
        <span class="signal-chip signal-chip-rank" title="Initiative relevance rank in current catalogue view">Initiative ${initiativeRankText}</span>
        <span class="signal-chip signal-chip-rank" title="Institution segment rank in current catalogue view">Segment ${institutionRankText}</span>
        ${lensChip}
      </div>
      <div class="signal-strength-row">
        <span class="signal-importance-badge importance-${tierClass}" title="${displayTierTooltip}">${displayTierLabel}</span>
        <span class="signal-importance-score">${importance.importanceScore.toFixed(2)}</span>
      </div>
      ${tierComparisonRow}
      ${marketContextRow}
      <div class="signal-why">Global lens: ${importance.stage} stage | ${importance.materiality} materiality | ${importance.sourceTier} source credibility</div>
      <div class="signal-ai-insight">
        <div class="signal-ai-title">AI Why This Matters</div>
        <p>${directionalInsight}</p>
      </div>
      <div class="signal-description">${signal.description || ''}</div>
      ${hasLong ? '<button class="description-expand-btn">Read more</button>' : ''}
      <button class="signal-details-toggle" type="button" aria-expanded="false">Show relevance breakdown</button>
      <div class="signal-details">
        <div class="signal-details-grid">
          <div>
            <div class="signal-details-label">Most Material For</div>
            <div class="signal-details-values">${audience.length ? audience.join(' | ') : 'Institutional infrastructure teams'}</div>
          </div>
          <div>
            <div class="signal-details-label">Top Initiative Relevance</div>
            <div class="signal-details-values">${initiatives.length ? initiatives.join(' | ') : 'Not yet classified'}</div>
          </div>
          <div>
            <div class="signal-details-label">FMI Impact Areas</div>
            <div class="signal-details-values">${fmiAreas.length ? fmiAreas.join(' | ') : 'Not yet mapped'}</div>
          </div>
        </div>
        ${momentumDebug}
        ${personaDebug}
      </div>
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

  const formatAbsoluteValue = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return signalScoringMetricMode === 'count' ? '0' : '0.0';
    if (signalScoringMetricMode === 'count') {
      return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    return formatScore(n);
  };

  const displayVal = (val) => {
    if (signalScoringColorMode === 'percentile') return Math.round(getColorBasis(val) * 100);
    return formatAbsoluteValue(val);
  };

  const displaySuffix = signalScoringColorMode === 'percentile'
    ? 'th percentile'
    : signalScoringMetricMode === 'count'
      ? ' signals'
      : ' strength';

  const signals = getCatalogueSignals();
  const instTypes = [
    'Global Banks',
    'Asset & Investment Management',
    'Payments Providers',
    'Exchanges & Central Intermediaries',
    'Regulatory Agencies',
    'Infrastructure & Technology'
  ];
  const shortNames = ['Banks', 'Asset Mgmt', 'Payments', 'Exchanges', 'Regulators', 'Infra/Tech'];
  const isFmiMode = signalScoringDimensionMode === 'fmi';
  const colTypes = isFmiMode ? FMI_SCHEMA.map(s => s.name) : getMatrixInitiatives();
  const shortColTypes = isFmiMode
    ? colTypes.map(name => name
        .replace('Tokenization & Issuance', 'Tokenization')
        .replace('Custody & Asset Management', 'Custody')
        .replace('Trading & Exchange', 'Trading')
        .replace('Settlement & Clearing', 'Settlement')
        .replace('Payments & Transfers', 'Payments')
        .replace('Collateral & Lending', 'Collateral')
        .replace('Interoperability & Standards', 'Interop.')
        .replace('Digital Currency & Stablecoins', 'Dig. Currency')
        .replace('Regulation & Compliance', 'Regulation'))
    : colTypes.map(name => name
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

  const strengthMatrix = instTypes.map(() => colTypes.map(() => 0));
  const countMatrix = instTypes.map(() => colTypes.map(() => 0));
  let maxVal = 0;

  signals.forEach(signal => {
    const rowIndex = instTypes.indexOf(signal.institution_type);
    if (rowIndex < 0) return;

    const score = getSignalStrengthScore(signal, sourceCounts, maxSourceCount);

    const colField = isFmiMode ? (signal.fmi_areas || []) : (signal.initiative_types || []);
    colField.forEach(col => {
      const colIndex = colTypes.indexOf(col);
      if (colIndex < 0) return;
      strengthMatrix[rowIndex][colIndex] += score;
      countMatrix[rowIndex][colIndex] += 1;
      const key = `${signal.institution_type}|||${col}`;
      if (!cellDetails[key]) cellDetails[key] = [];
      cellDetails[key].push({
        institution: signal.institution,
        initiative: signal.initiative,
        signalType: signal.signal_type,
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
  renderSignalScoringFilterChip();
  renderSignalScoringClearFilterButton();

  if (maxVal <= 0) {
    container.innerHTML = '<div class="pop-empty">No signal strength data available for this filter. <button type="button" class="matrix-filter-chip-clear" data-clear-signal-scoring="true">Clear filter</button></div>';
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
  const colTotals = colTypes.map((_, ci) => matrix.reduce((sum, row) => sum + row[ci], 0));
  const grandTotal = rowTotals.reduce((sum, val) => sum + val, 0);
  const showTotals = signalScoringColorMode !== 'percentile';

  document.getElementById('signalMetricStrengthBtn')?.classList.toggle('is-active', signalScoringMetricMode === 'strength');
  document.getElementById('signalMetricCountBtn')?.classList.toggle('is-active', signalScoringMetricMode === 'count');
  document.getElementById('signalColorAbsoluteBtn')?.classList.toggle('is-active', signalScoringColorMode === 'absolute');
  document.getElementById('signalColorPercentileBtn')?.classList.toggle('is-active', signalScoringColorMode === 'percentile');
  document.getElementById('signalDimInitiativeBtn')?.classList.toggle('is-active', signalScoringDimensionMode === 'initiative');
  document.getElementById('signalDimFmiBtn')?.classList.toggle('is-active', signalScoringDimensionMode === 'fmi');

  let html = '<table class="heatmap-table"><thead><tr><th></th>';
  shortColTypes.forEach(h => { html += `<th class="heatmap-col-header">${h}</th>`; });
  if (showTotals) html += '<th class="heatmap-col-header heatmap-total-header">Total Contributions</th>';
  html += '</tr></thead><tbody>';

  matrix.forEach((row, i) => {
    html += `<tr><td class="heatmap-row-label">${shortNames[i]}</td>`;
    row.forEach((val, ci) => {
      const instArg = JSON.stringify(instTypes[i]);
      const initArg = JSON.stringify(colTypes[ci]);
      if (val > 0) {
        html += `<td class="heatmap-cell" style="background:${cellColor(val)};color:${textCol(val)};cursor:pointer" title="${instTypes[i]} x ${colTypes[ci]}: ${displayVal(val)}${displaySuffix} (click for breakdown)" data-strength-breakdown-inst="${encodeURIComponent(instTypes[i])}" data-strength-breakdown-init="${encodeURIComponent(colTypes[ci])}">${displayVal(val)}</td>`;
      } else {
        html += `<td class="heatmap-cell" style="background:${cellColor(val)};color:${textCol(val)}" title="${instTypes[i]} x ${colTypes[ci]}: 0">-</td>`;
      }
    });
    if (showTotals) html += `<td class="heatmap-cell heatmap-total-cell">${formatAbsoluteValue(rowTotals[i])}</td>`;
    html += '</tr>';
  });

  if (showTotals) {
    html += '<tr class="heatmap-totals-row"><td class="heatmap-row-label heatmap-total-label">Total Contributions</td>';
    colTotals.forEach(val => {
      html += `<td class="heatmap-cell heatmap-total-cell">${formatAbsoluteValue(val)}</td>`;
    });
    html += `<td class="heatmap-cell heatmap-grand-total">${formatAbsoluteValue(grandTotal)}</td>`;
    html += '</tr>';
  }
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
  const signalTypeAgg = {};
  const allInstitutions = new Set();
  items.forEach(item => {
    const type = String(item.signalType || '').trim() || 'Unknown';
    const subtype = String(item.initiative || '').trim() || 'Unspecified';
    if (!signalTypeAgg[type]) {
      signalTypeAgg[type] = {
        count: 0,
        score: 0,
        institutions: new Set(),
        subtypes: {}
      };
    }
    signalTypeAgg[type].count += 1;
    signalTypeAgg[type].score += item.score;
    signalTypeAgg[type].institutions.add(item.institution || 'Unknown');
    signalTypeAgg[type].subtypes[subtype] = (signalTypeAgg[type].subtypes[subtype] || 0) + 1;
    allInstitutions.add(item.institution || 'Unknown');
  });
  const signalTypeRows = Object.entries(signalTypeAgg)
    .map(([type, data]) => {
      const topSubtype = Object.entries(data.subtypes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unspecified';
      return {
        type,
        subtype: topSubtype,
        count: data.count,
        score: data.score,
        institutions: data.institutions.size
      };
    })
    .sort((a, b) => b.score - a.score);
  const avgCredibility = items.reduce((sum, item) => sum + item.credibilityWeight, 0) / items.length;
  const avgRecency = items.reduce((sum, item) => sum + item.recencyWeight, 0) / items.length;
  const avgPrevalence = items.reduce((sum, item) => sum + item.prevalenceWeight, 0) / items.length;

  const sourceAgg = {};
  items.forEach(item => {
    const source = item.source || 'Unknown';
    if (!sourceAgg[source]) {
      sourceAgg[source] = {
        score: 0,
        count: 0,
        institutions: new Set(),
        latestDate: item.date || ''
      };
    }
    sourceAgg[source].score += item.score;
    sourceAgg[source].count += 1;
    sourceAgg[source].institutions.add(item.institution || 'Unknown');
    const currentLatest = new Date(sourceAgg[source].latestDate || '1970-01-01');
    const candidate = new Date(item.date || '1970-01-01');
    if (candidate > currentLatest) sourceAgg[source].latestDate = item.date || sourceAgg[source].latestDate;
  });
  const sourceRows = Object.entries(sourceAgg)
    .map(([source, data]) => ({
      source,
      count: data.count,
      score: data.score,
      avgScore: data.count ? data.score / data.count : 0,
      institutions: data.institutions.size,
      latestDate: data.latestDate
    }))
    .sort((a, b) => b.score - a.score);

  const primaryMetricLabel = signalScoringMetricMode === 'count' ? 'Cell Value (Count)' : 'Cell Value (Strength)';
  const primaryMetricValue = signalScoringMetricMode === 'count' ? rawCount : totalScore.toFixed(1);

  panel.innerHTML = `
    <div class="signal-strength-breakdown-header">
      <div class="signal-strength-breakdown-title">
        <h4>${escapeHtml(institutionType)} x ${escapeHtml(initiativeType)}</h4>
        <p>Cell breakdown for ${signalScoringMetricMode === 'count' ? 'raw signal count' : 'aggregate weighted strength'}.</p>
      </div>
      <button type="button" class="signal-strength-breakdown-close" data-close-signal-strength-breakdown="true">Close</button>
    </div>
    <div class="signal-strength-breakdown-actions">
      <button type="button" data-matrix-nav-inst="${encodeURIComponent(institutionType)}" data-matrix-nav-init="${encodeURIComponent(initiativeType)}">View Matching Signals</button>
    </div>
    <div class="signal-strength-breakdown-card signal-strength-breakdown-table-card">
      <h5>Top Contributing Signal Types</h5>
      <div class="sbd-table-toggle" data-sbd-toggle="true">
        <div class="signal-strength-breakdown-table-summary">Totals: ${rawCount} signals · ${totalScore.toFixed(1)} score · ${allInstitutions.size} institutions</div>
        <svg class="sbd-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      <div class="sbd-table-body">
        <table class="signal-strength-breakdown-table">
          <thead><tr><th>Signal Type</th><th>Sub-Type</th><th>Count</th><th>Score</th><th>Institutions</th></tr></thead>
          <tbody>
            ${signalTypeRows.map(row => `<tr><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.subtype)}</td><td>${row.count}</td><td>${row.score.toFixed(1)}</td><td>${row.institutions}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="signal-strength-breakdown-card signal-strength-breakdown-table-card">
      <h5>Top Contributing Sources</h5>
      <div class="sbd-table-toggle" data-sbd-toggle="true">
        <div class="signal-strength-breakdown-table-summary">Totals: ${sourceRows.length} sources · ${rawCount} signals</div>
        <svg class="sbd-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      <div class="sbd-table-body">
        <table class="signal-strength-breakdown-table">
          <thead><tr><th>Source</th><th>Count</th><th>Score</th><th>Avg Score</th><th>Institutions</th><th>Latest</th></tr></thead>
          <tbody>
            ${sourceRows.map(row => `<tr><td>${escapeHtml(row.source)}</td><td>${row.count}</td><td>${row.score.toFixed(1)}</td><td>${row.avgScore.toFixed(2)}</td><td>${row.institutions}</td><td>${escapeHtml(formatDate(row.latestDate || ''))}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="signal-strength-breakdown-stats compact">
      <div class="signal-strength-stat compact"><span class="signal-strength-stat-label">${primaryMetricLabel}</span><span class="signal-strength-stat-value">${primaryMetricValue}</span></div>
      <div class="signal-strength-stat compact"><span class="signal-strength-stat-label">Signals</span><span class="signal-strength-stat-value">${rawCount}</span></div>
      <div class="signal-strength-stat compact"><span class="signal-strength-stat-label">Weighted Strength</span><span class="signal-strength-stat-value">${totalScore.toFixed(1)}</span></div>
      <div class="signal-strength-stat compact"><span class="signal-strength-stat-label">Avg Credibility</span><span class="signal-strength-stat-value">${avgCredibility.toFixed(2)}x</span></div>
      <div class="signal-strength-stat compact"><span class="signal-strength-stat-label">Avg Recency</span><span class="signal-strength-stat-value">${avgRecency.toFixed(2)}x</span></div>
      <div class="signal-strength-stat compact"><span class="signal-strength-stat-label">Avg Prevalence</span><span class="signal-strength-stat-value">${avgPrevalence.toFixed(2)}x</span></div>
    </div>
  `;
  panel.style.display = 'block';
}

function formatDate(d) {
  if (!d) return '';
  try { const dt = new Date(d); return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); } catch { return d; }
}

// ===== SIGNAL DETAILS & ANALYSIS =====
function ensureSignalDetailPanel() {
  let panel = document.getElementById('signalDetailPanel');
  if (panel) return panel;

  panel = document.createElement('div');
  panel.id = 'signalDetailPanel';
  panel.className = 'signal-detail-panel';
  panel.style.display = 'none';

  const mountPoint = document.querySelector('.signal-library-section .container') || document.body;
  mountPoint.appendChild(panel);
  return panel;
}

function showSignalDetail(signalData) {
  const panel = ensureSignalDetailPanel();
  if (!panel) return;

  const signalKey = String(signalData.signalKey || '').trim().toLowerCase();
  const fullSignal = signalData.fullSignal || findSignalByReference(signalData, allSignals) || findSignalByReference(signalData, getOperationalSignals());

  const normalizedSignal = fullSignal || {
    institution: signalData.institution,
    initiative: signalData.initiative,
    description: signalData.description || 'N/A',
    signal_type: signalData.signalType || 'Unknown',
    signal_stage: signalData.stage || 'Unknown',
    signal_materiality: signalData.materiality || 'Unknown',
    date: signalData.date,
    source_url: signalData.sourceUrl || '',
    institution_type: signalData.institutionType || '',
    initiative_types: normalizeDetailList(signalData.initiativeTypes || []),
    fmi_areas: normalizeDetailList(signalData.fmiAreas || [])
  };
  
  // Calculate recency information
  const dateObj = new Date(signalData.date || normalizedSignal.date || new Date());
  const daysAgo = Math.floor((Date.now() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
  const dateStr = daysAgo < 0 ? 'upcoming' : daysAgo === 0 ? 'today' : daysAgo <= 365 ? `${daysAgo}d ago` : formatDate(signalData.date || normalizedSignal.date || new Date());
  const recencyWeight = getRecencyWeight(normalizedSignal, getSignalStage(normalizedSignal), getSignalMateriality(normalizedSignal));
  const detailImportance = fullSignal ? getSignalImportance(fullSignal) : { stage: 'Unknown', materiality: 'Unknown', sourceTier: 'Unknown' };
  const detailInsight = fullSignal ? buildSignalDetailInsight(fullSignal, detailImportance) : 'No directional insight available.';
  const marketContext = fullSignal ? getExternalMarketContext(fullSignal, selectedPersona) : { available: false };
  const initiatives = getSignalDetailInitiatives(normalizedSignal).slice(0, 4);
  const fmiAreas = getSignalDetailFmiAreas(normalizedSignal).slice(0, 4);
  const audience = getSignalDetailAudience(normalizedSignal).slice(0, 4);
  const sourceUrl = String(fullSignal?.source_url || signalData.sourceUrl || '').trim();
  const effectiveSignalKey = signalKey || getSignalKey(normalizedSignal);
  const effectiveSignalDate = getSignalReferenceDateRaw(normalizedSignal);
  
  const tierBadge = signalData.tier ? 
    `<span class="tier-badge tier-${signalData.tier.toLowerCase()}">${signalData.tier}</span>` : '';
  
  const formattedDate = formatExactSignalDate(normalizedSignal);
  
  panel.innerHTML = `
    <div class="signal-detail-header">
      <div class="signal-detail-title">
        <h3>${escapeHtml(signalData.institution)}</h3>
        <p class="signal-detail-initiative">${escapeHtml(signalData.initiative)}</p>
      </div>
      <div class="signal-detail-actions">
        ${tierBadge}
        <button type="button" class="signal-detail-copy" data-copy-signal-detail="true">Copy Link</button>
        <button type="button" class="signal-detail-close" data-signal-detail-close="true">✕</button>
      </div>
    </div>
    <div class="signal-detail-insight">
      <div class="signal-detail-label">Why This Matters</div>
      <div class="signal-detail-value">${escapeHtml(detailInsight)}</div>
    </div>
    <div class="signal-detail-content">
      <div class="signal-detail-row">
        <span class="signal-detail-label">Signal Type:</span>
        <span class="signal-detail-value">${escapeHtml(normalizedSignal.signal_type || 'Unknown')}</span>
      </div>
      <div class="signal-detail-row">
        <span class="signal-detail-label">Description:</span>
        <span class="signal-detail-value">${escapeHtml(normalizedSignal.description || 'N/A')}</span>
      </div>
      <div class="signal-detail-row">
        <span class="signal-detail-label">Source:</span>
        <span class="signal-detail-value">${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(signalData.source || 'Unknown source')}</a>` : escapeHtml(signalData.source || 'Unknown')}</span>
      </div>
      <div class="signal-detail-row">
        <span class="signal-detail-label">Date:</span>
        <span class="signal-detail-value">${escapeHtml(formattedDate)} (${escapeHtml(dateStr)})</span>
      </div>
      <div class="signal-detail-row">
        <span class="signal-detail-label">Global Lens:</span>
        <span class="signal-detail-value">${escapeHtml(detailImportance.stage || 'Unknown')} stage | ${escapeHtml(detailImportance.materiality || 'Unknown')} materiality | ${escapeHtml(detailImportance.sourceTier || 'Unknown')} source credibility</span>
      </div>
      <div class="signal-detail-row">
        <span class="signal-detail-label">Most Material For:</span>
        <span class="signal-detail-value">${escapeHtml(audience.length ? audience.join(' | ') : 'Institutional infrastructure teams')}</span>
      </div>
      <div class="signal-detail-row">
        <span class="signal-detail-label">Top Initiative Relevance:</span>
        <span class="signal-detail-value">${escapeHtml(initiatives.length ? initiatives.join(' | ') : 'Not yet classified')}</span>
      </div>
      <div class="signal-detail-row">
        <span class="signal-detail-label">FMI Impact Areas:</span>
        <span class="signal-detail-value">${escapeHtml(fmiAreas.length ? fmiAreas.join(' | ') : 'Not yet mapped')}</span>
      </div>
      <div class="signal-detail-row">
        <span class="signal-detail-label">Market Context:</span>
        <span class="signal-detail-value">${marketContext.available ? `${escapeHtml(marketContext.segmentLabel)} ${escapeHtml(marketContext.trendLabel)} 30d | ${escapeHtml(marketContext.confidence)} (source: ${escapeHtml(marketContext.source)} as of ${escapeHtml(marketContext.asOf)})` : 'Not available'}</span>
      </div>
      <div class="signal-detail-row">
        <span class="signal-detail-label">Recency Weight:</span>
        <span class="signal-detail-value">${recencyWeight.toFixed(3)}x (tier: ${escapeHtml(signalData.tier || 'Unclassified')})</span>
      </div>
      <div class="signal-detail-row">
        <span class="signal-detail-label">Score:</span>
        <span class="signal-detail-value">${signalData.score.toFixed(2)}</span>
      </div>
    </div>
  `;
  panel.style.display = 'block';
  panel.setAttribute('tabindex', '-1');
  panel.dataset.signalKey = effectiveSignalKey;
  panel.dataset.signalDate = effectiveSignalDate;
  panel.dataset.signalSource = sourceUrl;
  syncSignalDetailUrl({ signalKey: effectiveSignalKey, signalDate: effectiveSignalDate, signalSource: sourceUrl });
  const panelTop = panel.getBoundingClientRect().top + window.scrollY;
  const scrollTarget = Math.max(0, panelTop - 88);
  window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
  setTimeout(() => {
    panel.focus({ preventScroll: true });
  }, 120);
}

function buildSignalDetailPayload(signal) {
  const importance = getSignalImportance(signal);
  let sourceLabel = String(signal?.source_name || '').trim();
  if (!sourceLabel) {
    const sourceUrl = String(signal?.source_url || '').trim();
    if (sourceUrl) {
      try {
        sourceLabel = new URL(sourceUrl).hostname.replace(/^www\./, '');
      } catch (_) {
        sourceLabel = sourceUrl;
      }
    }
  }

  return {
    fullSignal: signal,
    signalKey: getSignalKey(signal),
    institution: signal.institution || 'Unknown institution',
    initiative: signal.initiative || 'Unknown initiative',
    source: sourceLabel || 'Unknown source',
    sourceUrl: signal.source_url || '',
    description: signal.description || 'N/A',
    signalType: signal.signal_type || 'Unknown',
    institutionType: signal.institution_type || '',
    initiativeTypes: getSignalDetailInitiatives(signal),
    fmiAreas: getSignalDetailFmiAreas(signal),
    stage: getSignalStage(signal),
    materiality: getSignalMateriality(signal),
    date: getSignalReferenceDateRaw(signal),
    tier: importance.tier || 'Noise',
    score: Number(importance.importanceScore || 0)
  };
}

function openSignalDetailForSignal(signal) {
  if (!signal) return;
  showSignalDetail(buildSignalDetailPayload(signal));
}

function openSignalDetailByKey(encodedSignalKey, options = {}) {
  const decodedKey = decodeURIComponent(String(encodedSignalKey || '')).toLowerCase();
  if (!decodedKey) return;

  const signal = findSignalByReference({
    signalKey: decodedKey,
    signalDate: options.signalDate || '',
    sourceUrl: options.sourceUrl || ''
  }, getOperationalSignals()) || findSignalByReference({
    signalKey: decodedKey,
    signalDate: options.signalDate || '',
    sourceUrl: options.sourceUrl || ''
  }, allSignals);
  if (!signal) return;

  openSignalDetailForSignal(signal);
}

function restoreSignalDetailFromUrl() {
  const request = getSignalDetailRequestFromUrl();
  if (!request) return;

  const existingPanel = document.getElementById('signalDetailPanel');
  if (
    existingPanel &&
    existingPanel.style.display !== 'none' &&
    String(existingPanel.dataset.signalKey || '').trim().toLowerCase() === request.signalKey &&
    String(existingPanel.dataset.signalDate || '').trim() === request.signalDate &&
    String(existingPanel.dataset.signalSource || '').trim() === request.signalSource
  ) {
    return;
  }

  const signal = findSignalByReference(request, allSignals) || findSignalByReference(request, getOperationalSignals());
  if (!signal) return;

  openCollapsible('.signal-library-section', 'libraryBody');
  openSignalDetailForSignal(signal);
}

function getRadarPrefilterRequestFromUrl() {
  const url = new URL(window.location.href);
  const institution = String(url.searchParams.get('radarInstitution') || url.searchParams.get('institution') || '').trim();
  const theme = String(url.searchParams.get('radarTheme') || url.searchParams.get('theme') || '').trim();
  const tierRaw = String(url.searchParams.get('radarTier') || url.searchParams.get('tier') || '').trim().toLowerCase();

  if (!institution && !theme && !tierRaw) return null;

  return {
    institution,
    theme,
    tierRaw
  };
}

function normalizeRadarTheme(themeValue) {
  const raw = String(themeValue || '').trim().toLowerCase();
  if (!raw) return '';

  if (raw.includes('tokenized funds') || raw.includes('rwa')) return 'tokenized_funds_rwas';
  if (raw.includes('stablecoins') || raw.includes('settlement')) return 'stablecoins_settlement';
  if (raw.includes('market infrastructure') || raw.includes('dlt')) return 'market_infra_dlt';

  return '';
}

function applyRadarPrefilterFromUrl() {
  if (radarPrefilterAppliedFromUrl) return;

  const request = getRadarPrefilterRequestFromUrl();
  if (!request) return;

  const normalizedTier = request.tierRaw.replace(/\s+/g, '');
  const normalizedInstitution = String(request.institution || '').trim().toLowerCase();
  const normalizedTheme = normalizeRadarTheme(request.theme);

  signalScoringFilter = null;
  matrixFilter = null;
  signalTypeFilter = '';
  countryFilter = '';
  activeFilter = 'all';
  radarPrefilter = {
    institution: normalizedInstitution,
    theme: normalizedTheme
  };

  searchQuery = '';
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  if (normalizedTier === 'structural,material' || normalizedTier === 'material,structural') {
    setImportanceTierMode('priority');
  } else if (normalizedTier === 'structural') {
    setImportanceTierMode('structural');
  }

  radarPrefilterAppliedFromUrl = true;

  renderFilterPills();
  syncSignalTypeSelect();
  syncCountrySelects();
  syncImportanceTierSelect();
  renderSignals();
  openCollapsible('.signal-library-section', 'libraryBody');
}

function closeSignalDetail() {
  const panel = document.getElementById('signalDetailPanel');
  if (!panel) return;
  panel.style.display = 'none';
  panel.dataset.signalKey = '';
  panel.dataset.signalDate = '';
  panel.dataset.signalSource = '';
  clearSignalDetailUrl();
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

function sortInstitutions(insts, sortMode) {
  if (sortMode === 'name') {
    insts.sort((a, b) => a.name.localeCompare(b.name));
    return;
  }

  if (sortMode === 'strength') {
    insts.sort((a, b) => (b.strengthScore || 0) - (a.strengthScore || 0) || b.signals - a.signals || a.name.localeCompare(b.name));
    return;
  }

  insts.sort((a, b) => b.signals - a.signals || a.name.localeCompare(b.name));
}

function renderDirectory() {
  const container = document.getElementById('directoryContainer');
  if (!container) return;
  const signals = getCatalogueSignals().filter(signal => !dirCountryFilter || getSignalCountryValue(signal) === dirCountryFilter);
  const institutions = buildInstitutionSummaries(signals);

  const grouped = {};
  DIRECTORY_TYPE_ORDER.forEach(type => { grouped[type] = []; });
  institutions.forEach(inst => {
    if (dirSearch && !inst.name.toLowerCase().includes(dirSearch)) return;
    if (grouped[inst.type]) grouped[inst.type].push(inst);
  });

  Object.values(grouped).forEach(insts => sortInstitutions(insts, dirSort));

  let html = '';
  DIRECTORY_TYPE_ORDER.forEach(cat => {
    const insts = grouped[cat];
    if (insts.length === 0) return;
    const totalSignals = insts.reduce((s, i) => s + i.signals, 0);
    const color = DIRECTORY_TYPE_COLOR_MAP[cat];
    const isOpen = !!(dirSearch || dirCountryFilter);

    html += `<div class="dir-category${isOpen ? ' open' : ''}">`;
    html += `<div class="dir-category-header sector-banner" data-toggle-directory-open="true">`;
    html += `<span class="dir-cat-dot sector-banner-dot" style="background:${color}"></span>`;
    html += `<span class="dir-cat-name sector-banner-title">${cat}</span>`;
    html += `<span class="dir-cat-count sector-banner-count">${insts.length} institutions · ${totalSignals} filtered signals</span>`;
    html += `<svg class="dir-cat-chevron sector-banner-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;
    html += `</div>`;

    html += `<div class="dir-category-body"><div class="directory-table-wrap">`;
    html += `<table class="dir-table"><thead><tr>`;
    html += `<th>Institution</th><th>Country</th><th class="num">Signals</th><th>Signal Types</th><th>Initiative Classification</th><th>FMI Areas</th>`;
    html += `</tr></thead><tbody>`;
    html += renderInstitutionRows(insts, { colorOverride: color });
    html += `</tbody></table></div></div></div>`;
  });

  if (!html) {
    html = '<div style="text-align:center;padding:var(--space-8);color:var(--color-text-muted);">No institutions match your filter.</div>';
  }

  container.innerHTML = html;
}

function renderCountryDirectory() {
  const container = document.getElementById('countryDirectoryContainer');
  if (!container) return;

  const signals = getCatalogueSignals().filter(signal => !countryDirTypeFilter || signal.institution_type === countryDirTypeFilter);
  const institutions = buildInstitutionSummaries(signals).filter(inst => !countryDirSearch || inst.name.toLowerCase().includes(countryDirSearch));
  const grouped = {};

  institutions.forEach(inst => {
    const country = inst.primaryCountry || 'Unmapped';
    if (!grouped[country]) grouped[country] = [];
    grouped[country].push(inst);
  });

  Object.values(grouped).forEach(insts => sortInstitutions(insts, countryDirSort));

  const countries = Object.keys(grouped).sort((a, b) => {
    if (a === 'Unmapped') return 1;
    if (b === 'Unmapped') return -1;
    const signalDelta = grouped[b].reduce((sum, inst) => sum + inst.signals, 0) - grouped[a].reduce((sum, inst) => sum + inst.signals, 0);
    return signalDelta || a.localeCompare(b);
  });

  let html = '';
  countries.forEach(country => {
    const insts = grouped[country];
    if (!insts || insts.length === 0) return;
    const totalSignals = insts.reduce((sum, inst) => sum + inst.signals, 0);
    const isOpen = !!(countryDirSearch || countryDirTypeFilter);

    html += `<div class="dir-category${isOpen ? ' open' : ''}">`;
    html += `<div class="dir-category-header sector-banner" data-toggle-directory-open="true">`;
    html += `<span class="dir-cat-dot sector-banner-dot" style="background:var(--color-primary)"></span>`;
    html += `<span class="dir-cat-name sector-banner-title">${country}</span>`;
    html += `<span class="dir-cat-count sector-banner-count">${insts.length} institutions · ${totalSignals} filtered signals</span>`;
    html += `<svg class="dir-cat-chevron sector-banner-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;
    html += `</div>`;

    html += `<div class="dir-category-body"><div class="directory-table-wrap">`;
    html += `<table class="dir-table"><thead><tr>`;
    html += `<th>Institution</th><th>Institution Type</th><th>Country</th><th class="num">Signals</th><th>Signal Types</th><th>Initiative Classification</th><th>FMI Areas</th>`;
    html += `</tr></thead><tbody>`;
    html += renderInstitutionRows(insts, { showType: true });
    html += `</tbody></table></div></div></div>`;
  });

  if (!html) {
    html = '<div style="text-align:center;padding:var(--space-8);color:var(--color-text-muted);">No countries match your filter.</div>';
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

document.getElementById('directoryCountry')?.addEventListener('change', (e) => {
  dirCountryFilter = String(e.target.value || '').trim();
  countryFilter = dirCountryFilter;
  if (dirCountryFilter) trackFilter('directory_country', dirCountryFilter);
  syncCountrySelects();
  renderSignals();
  renderDirectory();
  updateResetBars();
});

document.getElementById('countryDirectorySearch')?.addEventListener('input', (e) => {
  countryDirSearch = e.target.value.toLowerCase().trim();
  if (countryDirSearch) trackSearch(countryDirSearch, 'Country Directory');
  renderCountryDirectory();
  updateResetBars();
});

document.getElementById('countryDirectorySort')?.addEventListener('change', (e) => {
  countryDirSort = String(e.target.value || 'signals');
  trackFilter('country_directory_sort', countryDirSort);
  renderCountryDirectory();
  updateResetBars();
});

document.getElementById('countryDirectoryType')?.addEventListener('change', (e) => {
  countryDirTypeFilter = String(e.target.value || '').trim();
  if (countryDirTypeFilter) trackFilter('country_directory_type', countryDirTypeFilter);
  renderCountryDirectory();
  updateResetBars();
});

function navigateToCatalogueByCountry(country) {
  const selectedCountry = normalizeCountryName(country || '');
  if (!selectedCountry) return;

  const libSection = document.querySelector('.signal-library-section');
  const libBody = document.getElementById('libraryBody');
  if (libSection && libBody && !libSection.classList.contains('open')) {
    libSection.classList.add('open');
    libBody.style.display = 'block';
  }

  signalScoringFilter = null;
  matrixFilter = null;
  signalTypeFilter = '';
  countryFilter = selectedCountry;
  syncSignalTypeSelect();
  syncCountrySelects();
  searchQuery = '';
  setCatalogueCategoryFilter('all');
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  closeKPIBreakdown();
  renderSignals();

  setTimeout(() => {
    document.querySelectorAll('.category-section').forEach(s => s.classList.add('cat-open'));
    if (libSection) libSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  updateResetBars();
}

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
  signalScoringFilter = null;
  matrixFilter = null;
  signalTypeFilter = '';
  countryFilter = '';
  syncSignalTypeSelect();
  syncCountrySelects();
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
  signalScoringFilter = null;
  matrixFilter = { institutionType, initiativeType, dimension: signalScoringDimensionMode };
  signalTypeFilter = '';
  countryFilter = '';
  syncSignalTypeSelect();
  syncCountrySelects();
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

function navigateToCatalogueBySignalType(signalType) {
  const selectedType = resolveSignalTypeFilterValue(signalType || '');
  if (!selectedType) return;

  const libSection = document.querySelector('.signal-library-section');
  const libBody = document.getElementById('libraryBody');
  if (libSection && libBody && !libSection.classList.contains('open')) {
    libSection.classList.add('open');
    libBody.style.display = 'block';
  }

  signalScoringFilter = null;
  matrixFilter = null;
  signalTypeFilter = selectedType;
  countryFilter = '';
  syncSignalTypeSelect();
  syncCountrySelects();
  searchQuery = '';
  setCatalogueCategoryFilter('all');
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  closeKPIBreakdown();
  renderSignals();

  setTimeout(() => {
    document.querySelectorAll('.category-section').forEach(s => s.classList.add('cat-open'));
    if (libSection) libSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  updateResetBars();
}

function clearMatrixFilter() {
  signalScoringFilter = null;
  radarPrefilter = null;
  matrixFilter = null;
  signalTypeFilter = '';
  countryFilter = '';
  setImportanceTierMode(DEFAULT_IMPORTANCE_TIER_MODE);
  syncSignalTypeSelect();
  syncCountrySelects();
  renderSignals();
  updateResetBars();
}

function renderMatrixFilterChip() {
  const chip = document.getElementById('matrixFilterChip');
  const label = document.getElementById('matrixFilterChipLabel');
  if (!chip || !label) return;

  const parts = [];

  if (matrixFilter) {
    const shortInst = matrixFilter.institutionType
      .replace('Asset & Investment Management', 'Asset Mgmt')
      .replace('Exchanges & Central Intermediaries', 'Exchanges')
      .replace('Infrastructure & Technology', 'Infra & Tech');
    const shortInit = matrixFilter.initiativeType
      .replace('Tokenized Securities / RWA', 'Tokenized Securities/RWA')
      .replace('DLT / Blockchain Infrastructure', 'DLT/Blockchain Infra')
      .replace('Stablecoins & Deposit Tokens', 'Stablecoins');
    parts.push(`matrix: ${shortInst} x ${shortInit}`);
  }

  if (signalTypeFilter) {
    parts.push(`signal type: ${signalTypeFilter}`);
  }

  if (countryFilter) {
    parts.push(`country: ${countryFilter}`);
  }

  if (activeFilter !== 'all') {
    const categoryLabel = CATEGORIES[activeFilter]?.name || activeFilter;
    parts.push(`category: ${categoryLabel}`);
  }

  if (searchQuery) {
    parts.push(`search: "${searchQuery}"`);
  }

  if (radarPrefilter && (radarPrefilter.institution || radarPrefilter.theme)) {
    const themeLabelMap = {
      tokenized_funds_rwas: 'Tokenized Funds & RWAs',
      stablecoins_settlement: 'Stablecoins & Settlement',
      market_infra_dlt: 'Market Infrastructure & DLT'
    };
    const radarParts = [];
    if (radarPrefilter.institution) radarParts.push(`institution ${radarPrefilter.institution}`);
    if (radarPrefilter.theme) radarParts.push(`theme ${themeLabelMap[radarPrefilter.theme] || radarPrefilter.theme}`);
    parts.push(`radar: ${radarParts.join(' | ')}`);
  }

  if (parts.length === 0) {
    chip.style.display = 'none';
    return;
  }

  label.textContent = `Filtered by ${parts.join(' | ')}`;
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

  // Reset directory country
  dirCountryFilter = '';

  // Reset signal library search
  searchQuery = '';
  matrixFilter = null;
  signalTypeFilter = '';
  countryFilter = '';
  radarPrefilter = null;
  setImportanceTierMode(DEFAULT_IMPORTANCE_TIER_MODE);
  setPersona(DEFAULT_PERSONA);
  selectedDateWindowDays = DEFAULT_DATE_WINDOW_DAYS;
  syncSignalTypeSelect();
  syncCountrySelects();
  syncPersonaSelect();
  syncGlobalDateFilterSelect();
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  // Reset Signal Intelligence matrix drilldown filter
  signalScoringFilter = null;

  // Reset country directory filters
  countryDirSearch = '';
  countryDirSort = 'signals';
  countryDirTypeFilter = '';
  const countryDirSearchInput = document.getElementById('countryDirectorySearch');
  if (countryDirSearchInput) countryDirSearchInput.value = '';
  const countryDirSortEl = document.getElementById('countryDirectorySort');
  if (countryDirSortEl) countryDirSortEl.value = 'signals';
  const countryDirTypeEl = document.getElementById('countryDirectoryType');
  if (countryDirTypeEl) countryDirTypeEl.value = '';

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
  const signalTypeDrilldown = document.getElementById('signalTypeDrilldown');
  if (signalTypeDrilldown) signalTypeDrilldown.style.display = 'none';

  // Re-render everything
  renderDirectory();
  renderCountryDirectory();
  renderSignals();
  renderPopularityAnalysis();

  // Collapse all signal library categories back
  document.querySelectorAll('.category-section').forEach(s => s.classList.remove('cat-open'));

  // Hide reset bars
  updateResetBars();
}

function updateResetBars() {
  const hasDirectoryFilter = dirSearch !== '' || dirSort !== 'signals' || dirCountryFilter !== '';
  const hasCountryDirectoryFilter = countryDirSearch !== '' || countryDirSort !== 'signals' || countryDirTypeFilter !== '';
  const hasLibraryFilter = searchQuery !== '' || activeFilter !== 'all' || matrixFilter !== null || signalTypeFilter !== '' || countryFilter !== '' || importanceTierMode !== DEFAULT_IMPORTANCE_TIER_MODE || selectedPersona !== DEFAULT_PERSONA || selectedDateWindowDays !== DEFAULT_DATE_WINDOW_DAYS;
  const hasAnyFilter = hasDirectoryFilter || hasCountryDirectoryFilter || hasLibraryFilter;

  const dirReset = document.getElementById('resetDirectoryFilters');
  const countryDirReset = document.getElementById('resetCountryDirectoryFilters');
  const libReset = document.getElementById('resetLibraryFilters');

  if (dirReset) dirReset.classList.toggle('visible', hasAnyFilter);
  if (countryDirReset) countryDirReset.classList.toggle('visible', hasAnyFilter);
  if (libReset) libReset.classList.toggle('visible', hasAnyFilter);
}
