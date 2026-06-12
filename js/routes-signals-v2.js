// =====================================================================
// routes-signals.js — Signals workspace (/signals) and detail (/signals/:id)
// =====================================================================

// Apply current State.filters to a signal list and return filtered+sorted.
// When a non-'all' persona is selected, signals are additionally re-ranked so
// the highest persona-relevance ones float to the top within each tier band.
const COUNTRY_OPTIONS = [
  { id: 'united_states', label: 'United States', patterns: [/\bU\.S\.\b/i, /\bU\.S\.?\b/i, /\bUnited States\b/i, /\bAmerica\b/i] },
  { id: 'united_kingdom', label: 'United Kingdom', patterns: [/\bU\.K\.\b/i, /\bU\.K\.?\b/i, /\bUnited Kingdom\b/i, /\bBritain\b/i, /\bLondon\b/i, /\bEngland\b/i] },
  { id: 'europe', label: 'Europe / EU', patterns: [/\bEurope\b/i, /\bEuropean\b/i, /\bEU\b/i, /\bEurozone\b/i, /\bEMEA\b/i] },
  { id: 'uae', label: 'UAE', patterns: [/\bUAE\b/i, /\bUnited Arab Emirates\b/i, /\bDubai\b/i, /\bAbu Dhabi\b/i, /\bDIFC\b/i, /\bADGM\b/i] },
  { id: 'brazil', label: 'Brazil', patterns: [/\bBrazil\b/i, /\bBras(?:i|í)l\b/i, /\bPix\b/i] },
  { id: 'india', label: 'India', patterns: [/\bIndia\b/i, /\bRBI\b/i, /\bReserve Bank of India\b/i] },
  { id: 'singapore', label: 'Singapore', patterns: [/\bSingapore\b/i, /\bMAS\b/i, /\bMonetary Authority of Singapore\b/i] },
  { id: 'hong_kong', label: 'Hong Kong', patterns: [/\bHong Kong\b/i, /\bHKMA\b/i] },
  { id: 'switzerland', label: 'Switzerland', patterns: [/\bSwitzerland\b/i, /\bSwiss\b/i, /\bZurich\b/i, /\bBasel\b/i] },
  { id: 'japan', label: 'Japan', patterns: [/\bJapan\b/i, /\bTokyo\b/i, /\bFSA\b/i] },
  { id: 'south_korea', label: 'South Korea', patterns: [/\bSouth Korea\b/i, /\bKorea\b/i, /\bSeoul\b/i, /\bFIU\b/i] },
  { id: 'canada', label: 'Canada', patterns: [/\bCanada\b/i, /\bCanadian\b/i, /\bToronto\b/i] },
  { id: 'australia', label: 'Australia', patterns: [/\bAustralia\b/i, /\bAustralian\b/i, /\bSydney\b/i, /\bMelbourne\b/i] },
  { id: 'global', label: 'Global / Multi-region', patterns: [/\bGlobal\b/i, /\bWorldwide\b/i, /\bCross-border\b/i, /\bMulti-region\b/i] }
];

function inferCountryRegion(signal) {
  const text = [signal.country, signal.institution, signal.initiative, signal.description, signal.source_url]
    .filter(Boolean)
    .join(' ');
  for (const option of COUNTRY_OPTIONS) {
    if (option.patterns.some(rx => rx.test(text))) return option.id;
  }
  return null;
}

function normalizeSearchQuery(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

function signalMatchesQuery(signal, query) {
  if (!query) return true;
  const terms = query.split(/\s+/).filter(Boolean);
  if (!terms.length) return true;

  const haystack = [
    signal.institution,
    signal.initiative,
    signal.description,
    signal.signal_type,
    signal.institution_type,
    signal.country,
    ...(signal.fmi_areas || []),
    ...(signal.initiative_types || [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return terms.every(term => haystack.includes(term));
}

function applyFiltersAndSort(list) {
  const f = SftSState.filters;
  const persona = SftSState.persona || 'all';
  let out = list;
  if (f.theme) out = out.filter(s => (s._themes || []).includes(f.theme));
  if (f.tier) out = out.filter(s => s._tier === f.tier);
  if (f.category && f.category !== 'all') out = out.filter(s => s._category === f.category);
  if (f.country) out = out.filter(s => inferCountryRegion(s) === f.country);
  if (f.dateWindow !== 'all' && f.dateWindow != null) {
    const cutoff = parseInt(f.dateWindow, 10);
    out = out.filter(s => s._daysOld !== null && s._daysOld <= cutoff);
  }
  const searchQuery = normalizeSearchQuery(f.search);
  if (searchQuery) {
    out = out.filter(s => signalMatchesQuery(s, searchQuery));
  }

  // Persona filter: when a specific persona is active, drop signals with the
  // lowest relevance (score 1 = baseline), keeping signals scoring >= 2.
  if (persona !== 'all') {
    out = out.filter(s => SftSData.getPersonaRelevance(s, persona) >= 2);
  }

  const tierOrder = { Structural: 0, Material: 1, Context: 2, Noise: 3 };
  const personaScore = (s) => persona === 'all' ? 0 : SftSData.getPersonaRelevance(s, persona);

  if (f.sort === 'recency') {
    // True recency sort: newest first, then persona relevance, then tier.
    out = [...out].sort((a, b) => {
      const recency = (a._daysOld ?? 999) - (b._daysOld ?? 999);
      if (recency !== 0) return recency;
      const p = personaScore(b) - personaScore(a);
      if (p !== 0) return p;
      return tierOrder[a._tier] - tierOrder[b._tier];
    });
  } else if (f.sort === 'importance') {
    // Score (with persona boost when active) then recency
    out = [...out].sort((a, b) => {
      const aS = (a._score || 0) + personaScore(a) * 4;
      const bS = (b._score || 0) + personaScore(b) * 4;
      if (bS !== aS) return bS - aS;
      return (a._daysOld ?? 999) - (b._daysOld ?? 999);
    });
  } else if (f.sort === 'institution') {
    out = [...out].sort((a, b) => (a.institution || '').localeCompare(b.institution || ''));
  }
  return out;
}

function syncFiltersToURL() {
  const f = SftSState.filters;
  const u = new URLSearchParams();
  if (f.theme) u.set('theme', f.theme);
  if (f.tier) u.set('tier', f.tier);
  if (f.category && f.category !== 'all') u.set('cat', f.category);
  if (f.country) u.set('country', f.country);
  if (f.dateWindow !== 7) u.set('days', f.dateWindow);
  if (f.search) u.set('q', f.search);
  if (f.sort && f.sort !== 'importance') u.set('sort', f.sort);
  if (SftSState.persona && SftSState.persona !== 'all') u.set('persona', SftSState.persona);
  const qs = u.toString();
  const newHash = `#/signals${qs ? '?' + qs : ''}`;
  if (window.location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
}

function trackSignalEvent(eventName, payload) {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, payload || {});
      return;
    }
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push(Object.assign({ event: eventName }, payload || {}));
    }
  } catch (e) {
    // Non-blocking analytics hook.
  }
}

function normalizeWhatHappenedText(rawText, headline) {
  let text = String(rawText || '')
    .replace(/\s+/g, ' ')
    .replace(/[\u2026]$/, '')
    .replace(/\.\.\.\s*$/, '')
    .trim();

  // Strip leading author bylines from research paper descriptions, e.g. BIS papers that
  // start with "by Author1, Author2, Author3 The actual abstract...". [^.]+ limits the
  // match to before the first sentence period so it stays within the author list.
  text = text.replace(/^by\s+[^.]+[a-z\u00e0-\u00ff]\s+(?=[A-Z])/, '').trimStart();

  const cleanHeadline = String(headline || '').replace(/\s+/g, ' ').trim();
  if (cleanHeadline) {
    const escapedHeadline = cleanHeadline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const trailingHeadline = new RegExp(`(?:\\s|[.:-])*(?:${escapedHeadline})\\s*$`, 'i');
    text = text.replace(trailingHeadline, '').trim();

    // If the final short sentence repeats the same opening subject as the
    // headline, it is often a broken tail from auto-ingest. Drop it.
    const sentenceParts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentenceParts.length >= 2) {
      const last = sentenceParts[sentenceParts.length - 1].trim();
      const firstWordHeadline = cleanHeadline.split(/\s+/)[0] || '';
      const firstWordLast = last.split(/\s+/)[0] || '';
      if (
        last.length <= 48 &&
        firstWordHeadline &&
        firstWordLast &&
        firstWordHeadline.toLowerCase() === firstWordLast.toLowerCase()
      ) {
        sentenceParts.pop();
        text = sentenceParts.join(' ').trim();
      }
    }
  }

  // Auto-ingested excerpts sometimes carry a truncated tail (ellipsis) and an
  // incomplete subordinate clause. Prefer the last complete primary clause.
  if (/\u2026|\.\.\./.test(text)) {
    const clauseCut = text.search(/,\s*(warning|saying|adding|noting|arguing|claiming)\b/i);
    if (clauseCut > 40) {
      text = text.slice(0, clauseCut).trim();
    } else {
      const markerIdx = text.search(/\u2026|\.\.\./);
      if (markerIdx > 0) text = text.slice(0, markerIdx).trim();
    }
    text = text.replace(/[,:;\-–—]\s*$/, '').trim();
  }

  // Ensure first alphabetical character starts uppercase.
  text = text.replace(/^([^A-Za-z]*)([a-z])/, (_, lead, c) => `${lead}${c.toUpperCase()}`);

  if (text && !/[.!?]$/.test(text)) text += '.';
  return text;
}

function buildWhatHappenedContext(signal) {
  const signalType = (signal.signal_type || '').trim();
  const fmi = (signal.fmi_areas || []).slice(0, 2);
  const initiatives = (signal.initiative_types || []).slice(0, 2);
  const parts = [];

  if (signalType) parts.push(`classified as ${signalType}`);
  if (fmi.length) parts.push(`touching ${fmi.join(' and ')}`);
  if (initiatives.length) parts.push(`mapped to ${initiatives.join(' and ')}`);

  if (!parts.length) return '';
  return `This signal is ${parts.join(', ')}.`;
}

function getWhatHappenedText(signal) {
  const headline = signal.initiative || '';
  let text = normalizeWhatHappenedText(signal.description || '', headline);

  if (!text && headline) text = normalizeWhatHappenedText(headline, '');

  const sentenceCount = (text.match(/[.!?](\s|$)/g) || []).length;
  const lowDetail = text.length < 180 || sentenceCount < 2;
  const contextLine = buildWhatHappenedContext(signal);

  if (lowDetail && contextLine && !text.toLowerCase().includes(contextLine.toLowerCase())) {
    text = `${text} ${contextLine}`.trim();
  }

  return text;
}

// =====================================================================
// /signals — workspace
// =====================================================================
SftSRouter.defineRoute('/signals', async ({ root, query }) => {
  // Apply incoming query (deep-link)
  SftSState.resetFilters();
  if (query) SftSState.applyFromQuery(query);

  const allSignals = SftSData.signals.filter(s => SftSData.isMappedSignal(s));

  // category counts (apply other filters except category for accurate counts)
  function categoryCounts() {
    const sansCat = Object.assign({}, SftSState.filters, { category: 'all' });
    const original = SftSState.filters;
    SftSState.filters = sansCat;
    const filtered = applyFiltersAndSort(allSignals);
    SftSState.filters = original;
    const counts = { all: filtered.length };
    for (const k of Object.keys(SftSData.CATEGORY_LABELS)) counts[k] = 0;
    filtered.forEach(s => { if (counts[s._category] != null) counts[s._category]++; });
    return counts;
  }

  function countryCounts() {
    const sansCountry = Object.assign({}, SftSState.filters, { country: null });
    const original = SftSState.filters;
    SftSState.filters = sansCountry;
    const filtered = applyFiltersAndSort(allSignals);
    SftSState.filters = original;
    const counts = { all: filtered.length };
    COUNTRY_OPTIONS.forEach(opt => { counts[opt.id] = 0; });
    filtered.forEach(s => {
      const countryId = inferCountryRegion(s);
      if (countryId && counts[countryId] != null) counts[countryId]++;
    });
    return counts;
  }

  function tierCounts() {
    const sansTier = Object.assign({}, SftSState.filters, { tier: null });
    const original = SftSState.filters;
    SftSState.filters = sansTier;
    const filtered = applyFiltersAndSort(allSignals);
    SftSState.filters = original;
    const counts = { all: filtered.length, Structural: 0, Material: 0, Context: 0, Noise: 0 };
    filtered.forEach(s => { counts[s._tier] = (counts[s._tier] || 0) + 1; });
    return counts;
  }

  function themeCounts() {
    const sansTheme = Object.assign({}, SftSState.filters, { theme: null });
    const original = SftSState.filters;
    SftSState.filters = sansTheme;
    const filtered = applyFiltersAndSort(allSignals);
    SftSState.filters = original;
    const counts = { all: filtered.length, tokenized: 0, stablecoins: 0, dlt: 0, perimeter: 0 };
    filtered.forEach(s => (s._themes || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return counts;
  }

  let filtersOpen = window.innerWidth > 980;

  function render() {
    const f = SftSState.filters;
    const filtered = applyFiltersAndSort(allSignals);
    const cc = categoryCounts();
    const rc = countryCounts();
    const tc = tierCounts();
    const thc = themeCounts();

    const hasDeepLink = f.theme || f.tier;
    const deeplinkBanner = hasDeepLink ? `<div class="filter-deeplink-banner">
      <strong>Filtered to:</strong>
      ${f.theme ? `<span>${R.escapeHTML(SftSData.THEMES[f.theme]?.label || f.theme)}</span>` : ''}
      ${f.tier ? `<span>${f.tier}</span>` : ''}
      <button class="active-filter-clear" data-act="clearAll">Clear filters</button>
    </div>` : '';

    root.innerHTML = `
      <section class="container container--wide">
        <div class="page-hero">
          <div class="page-hero-eyebrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>
            Signals workspace
          </div>
          <h1>Signal <span class="accent">feed</span></h1>
          <p class="page-hero-lead">Every institutional signal we've ingested, scored, and mapped to a Decision Playbook theme. Filter by tier, theme, institution category, and date window — every view is a shareable URL.</p>
        </div>

        <div class="persona-bar">
          <span class="persona-bar-label">Read every signal as:</span>
          <div class="persona-options">
            ${Object.values(SftSData.PERSONAS).map(p => `<button class="persona-pill ${SftSState.persona === p.id ? 'is-active' : ''}" data-persona="${p.id}">${R.escapeHTML(p.label)}</button>`).join('')}
          </div>
          ${SftSState.persona && SftSState.persona !== 'all' ? `<span class="persona-bar-hint">Filtered to signals relevant for this lens · “Why this matters” copy adapts on every detail page</span>` : ''}
        </div>

        ${deeplinkBanner}

        <div class="workspace">
          <aside class="workspace-rail${filtersOpen ? ' is-open' : ''}">
            ${(() => {
              const activeCount = [
                f.search,
                String(f.dateWindow) !== '7',
                f.tier,
                f.theme,
                f.category && f.category !== 'all',
                f.country,
              ].filter(Boolean).length;
              return `<button class="filter-toggle-btn" data-act="toggleFilters" aria-expanded="${filtersOpen}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
                Filters${activeCount > 0 ? ` <span class="filter-toggle-count">${activeCount}</span>` : ''}
                <svg class="filter-toggle-chevron${filtersOpen ? ' is-open' : ''}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>`;
            })()}
            <div class="workspace-rail-body">
            <h4>Search</h4>
            <input type="search" id="searchBox" class="filter-search" placeholder="Institution, keyword…" value="${R.escapeHTML(f.search || '')}" />

            <h4>Date window</h4>
            <div class="filter-options">
              ${[7, 14, 30, 'all'].map(d => `
                <button class="filter-option ${String(f.dateWindow) === String(d) ? 'is-active' : ''}" data-days="${d}">${d === 'all' ? 'All historical' : `Last ${d} days`}</button>
              `).join('')}
            </div>

            <h4>Importance tier</h4>
            <div class="filter-options">
              <button class="filter-option ${!f.tier ? 'is-active' : ''}" data-tier="">All tiers <span class="count">${tc.all || 0}</span></button>
              <button class="filter-option ${f.tier === 'Structural' ? 'is-active' : ''}" data-tier="Structural">Structural <span class="count">${tc.Structural || 0}</span></button>
              <button class="filter-option ${f.tier === 'Material' ? 'is-active' : ''}" data-tier="Material">Material <span class="count">${tc.Material || 0}</span></button>
              <button class="filter-option ${f.tier === 'Context' ? 'is-active' : ''}" data-tier="Context">Context <span class="count">${tc.Context || 0}</span></button>
            </div>

            <h4>Playbook theme</h4>
            <div class="filter-options">
              <button class="filter-option ${!f.theme ? 'is-active' : ''}" data-theme="">All themes <span class="count">${thc.all || 0}</span></button>
              <button class="filter-option ${f.theme === 'tokenized' ? 'is-active' : ''}" data-theme="tokenized">Tokenized Funds & RWAs <span class="count">${thc.tokenized || 0}</span></button>
              <button class="filter-option ${f.theme === 'stablecoins' ? 'is-active' : ''}" data-theme="stablecoins">Stablecoins & Settlement <span class="count">${thc.stablecoins || 0}</span></button>
              <button class="filter-option ${f.theme === 'dlt' ? 'is-active' : ''}" data-theme="dlt">Market Infra & DLT <span class="count">${thc.dlt || 0}</span></button>
              <button class="filter-option ${f.theme === 'perimeter' ? 'is-active' : ''}" data-theme="perimeter">Regulation & Perimeter <span class="count">${thc.perimeter || 0}</span></button>
            </div>

            <h4>Institution category</h4>
            <div class="filter-options">
              <button class="filter-option ${f.category === 'all' ? 'is-active' : ''}" data-cat="all">All categories <span class="count">${cc.all || 0}</span></button>
              ${Object.entries(SftSData.CATEGORY_LABELS).filter(([k]) => k !== 'intel_briefs').map(([k, v]) => `
                <button class="filter-option ${f.category === k ? 'is-active' : ''}" data-cat="${k}">${R.escapeHTML(v.label)} <span class="count">${cc[k] || 0}</span></button>
              `).join('')}
            </div>

            <h4>Country / region</h4>
            <div class="filter-options">
              <button class="filter-option ${!f.country ? 'is-active' : ''}" data-country="">All regions <span class="count">${rc.all || 0}</span></button>
              ${COUNTRY_OPTIONS.map(opt => `
                <button class="filter-option ${f.country === opt.id ? 'is-active' : ''}" data-country="${opt.id}">${R.escapeHTML(opt.label)} <span class="count">${rc[opt.id] || 0}</span></button>
              `).join('')}
            </div>

            <button class="btn btn--ghost btn--sm" style="margin-top:var(--space-5); width:100%;" data-act="clearAll">Reset all filters</button>
            </div>
          </aside>

          <div class="workspace-results">
            <div class="workspace-toolbar">
              <div class="workspace-count"><strong>${filtered.length.toLocaleString()}</strong> signal${filtered.length === 1 ? '' : 's'} match your view</div>
              <div class="workspace-sort">
                <button class="${f.sort === 'recency' ? 'is-active' : ''}" data-sort="recency">Most recent</button>
                <button class="${f.sort === 'importance' ? 'is-active' : ''}" data-sort="importance">Most important</button>
                <button class="${f.sort === 'institution' ? 'is-active' : ''}" data-sort="institution">Institution A→Z</button>
              </div>
            </div>

            <div class="workspace-list">
              ${filtered.length === 0
                ? R.emptyState({ title: 'No matching signals', body: 'Try widening the date window or clearing a filter.', ctaLabel: 'Reset filters', ctaHref: '#/signals' })
                : filtered.slice(0, 60).map(s => R.signalRow(s)).join('')}
            </div>

            ${filtered.length > 60 ? `<div style="text-align:center; padding: var(--space-6); color: var(--color-text-muted); font-size: 0.92rem;">
              Showing 60 of ${filtered.length.toLocaleString()}. Refine your filters to surface more relevant signals.
            </div>` : ''}
          </div>
        </div>
      </section>
    `;

    // Wire up events (event delegation on root)
    root.addEventListener('click', onClick, { once: true });
    const search = root.querySelector('#searchBox');
    if (search) {
      let t;
      search.addEventListener('input', e => {
        clearTimeout(t);
        t = setTimeout(() => {
          SftSState.filters.search = normalizeSearchQuery(e.target.value);
          syncFiltersToURL();
          render();
        }, 250);
      });
      // Re-focus
      const len = search.value.length;
      search.focus();
      search.setSelectionRange(len, len);
    }
  }

  function onClick(e) {
    const t = e.target.closest('button[data-tier], button[data-theme], button[data-cat], button[data-country], button[data-days], button[data-sort], button[data-act], button[data-persona]');
    if (!t) return;
    if (t.dataset.act === 'toggleFilters') { filtersOpen = !filtersOpen; render(); return; }
    if (t.dataset.tier !== undefined) SftSState.filters.tier = t.dataset.tier || null;
    else if (t.dataset.theme !== undefined) SftSState.filters.theme = t.dataset.theme || null;
    else if (t.dataset.cat !== undefined) SftSState.filters.category = t.dataset.cat;
    else if (t.dataset.country !== undefined) SftSState.filters.country = t.dataset.country || null;
    else if (t.dataset.days !== undefined) SftSState.filters.dateWindow = (t.dataset.days === 'all') ? 'all' : parseInt(t.dataset.days, 10);
    else if (t.dataset.sort !== undefined) SftSState.filters.sort = t.dataset.sort;
    else if (t.dataset.persona !== undefined) SftSState.persona = t.dataset.persona;
    else if (t.dataset.act === 'clearAll') { SftSState.resetFilters(); }
    syncFiltersToURL();
    render();
  }

  render();
});

// =====================================================================
// /signals/:id — detail page
// =====================================================================
SftSRouter.defineRoute('/signals/:id', async ({ params, root }) => {
  const signal = SftSData.byId.get(params.id);
  if (!signal) {
    root.innerHTML = `<div class="container site-section">${R.emptyState({
      title: 'Signal not found',
      body: 'That signal id doesn\'t match anything in the current dataset.',
      ctaLabel: 'Browse all signals',
      ctaHref: '#/signals'
    })}</div>`;
    return;
  }

  const persona = SftSState.persona || 'all';
  const why = SftSData.whyThisMatters(signal, persona);
  const reco = SftSPlaybooks.recommendPlayForSignal(signal, persona);
  const themeId = reco?.themeId || (signal._themes && signal._themes[0]) || null;
  const theme = themeId ? SftSData.THEMES[themeId] : null;
  const themeColor = theme?.color || 'var(--color-primary)';
  const overlays = themeId ? SftSData.overlayForTheme(themeId) : [];
  const related = SftSData.related(signal, 5);
  const discussNextFiHref = R.nextFiContactUrl({
    context: 'signal_detail',
    signalId: params.id,
    signalTitle: signal.initiative || '',
    institution: signal.institution || '',
    themeId: themeId || '',
    play: reco?.play?.n || '',
    sourceUrl: window.location.href
  });

  trackSignalEvent('sfts_signal_open', {
    signal_id: params.id,
    theme: themeId || 'unmapped',
    tier: signal._tier || 'unknown',
    institution: signal.institution || 'unknown',
    persona
  });

  // Persona-aware audience match for play
  const audienceLine = reco?.play.bestFit?.find(b => {
    if (persona === 'asset_managers') return /asset manager/i.test(b.who);
    if (persona === 'banks_fmis')     return /bank|custodian|fmi/i.test(b.who);
    if (persona === 'fintech')        return /fintech|infrastructure/i.test(b.who);
    return false;
  }) || reco?.play.bestFit?.[0];

  const themeCrumb = theme
    ? `<a href="${theme.href}">${R.escapeHTML(theme.label)}</a> <span class="detail-breadcrumb-sep">→</span>`
    : '';
  const whatHappenedText = getWhatHappenedText(signal);

  root.innerHTML = `
    <div class="container container--wide">
      <nav class="detail-breadcrumb" aria-label="Breadcrumb">
        <a href="#/signals">Signals</a>
        <span class="detail-breadcrumb-sep">→</span>
        ${themeCrumb}
        <span>${R.escapeHTML(signal.institution || 'Signal')}</span>
      </nav>

      <div class="detail-grid">
        <article class="detail-main">
          <header class="detail-hero">
            <div class="detail-hero-tags">
              ${R.tierPill(signal._tier)}
              ${R.themeTagsFor(signal)}
              <span class="pill pill--soft">${R.escapeHTML(signal.signal_type || '')}</span>
            </div>
            <h1>${R.escapeHTML(signal.initiative || 'Untitled signal')}</h1>
            <div class="detail-institution"><strong>${R.escapeHTML(signal.institution || '')}</strong> · ${R.escapeHTML(signal.institution_type || '')}</div>
            <div class="detail-meta">
              <span>${R.formatDate(signal.date)}${signal._daysOld !== null ? ` · ${R.relativeDate(signal.date)}` : ''}</span>
              ${signal.source_name ? `<span>Source: ${R.escapeHTML(signal.source_name)}</span>` : ''}
              <span>Score: <span class="tabular-nums">${signal._score}/100</span></span>
            </div>
          </header>

          <div class="detail-section">
            <h3>What happened</h3>
            <p class="detail-description">${R.escapeHTML(whatHappenedText)}</p>
            ${signal.description_truncated ? `<p class="detail-truncation-note">Full article available at source — preview only.</p>` : ''}
            ${signal.source_url ? `<p style="margin-top: var(--space-4);">
              <a class="btn btn--outline btn--sm" id="readSourceBtn" href="${signal.source_url}" target="_blank" rel="noopener noreferrer">
                Read source ${R.extIcon}
              </a>
            </p>` : ''}
          </div>

          <div class="why-block">
            <div class="why-block-eyebrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/></svg>
              Why this matters · ${R.escapeHTML(SftSData.PERSONAS[persona].label)}
            </div>
            <p>${R.escapeHTML(why)}</p>
          </div>

          ${reco ? `
          <div class="action-block" style="--theme-color:${themeColor}">
            <div class="action-block-eyebrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              What this means for you
            </div>
            <h2>Recommended play · ${R.escapeHTML(SftSPlaybooks.PLAYBOOKS[reco.themeId].label)}</h2>
            <p class="action-block-lead">Based on this signal's tier (${R.escapeHTML(signal._tier)}) and the ${R.escapeHTML(SftSData.PERSONAS[persona].label)} lens, the most relevant Decision Playbook play is:</p>

            <div class="recommended-play">
              <div class="recommended-play-head">
                <div class="play-number">${reco.play.n}</div>
                <div>
                  <h4>${R.escapeHTML(reco.play.title)}</h4>
                  <p class="oneliner">${R.escapeHTML(reco.play.oneliner)}</p>
                </div>
              </div>
              <div class="why-now">
                <strong>Why this is the right move now:</strong> ${R.escapeHTML(reco.play.whyNow)}
              </div>
              ${audienceLine ? `<div class="why-now"><strong>${R.escapeHTML(audienceLine.who)}:</strong> ${R.escapeHTML(audienceLine.why)}</div>` : ''}
            </div>

            <div class="action-actions">
              <a class="btn btn--primary" id="readPlaybookBtn" href="${SftSPlaybooks.PLAYBOOKS[reco.themeId] ? '#/playbooks/' + reco.themeId + '?play=' + reco.play.n : '#/playbooks'}">
                Read the full Playbook
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </a>
              <a class="btn btn--outline" href="#/signals?theme=${reco.themeId}">See all ${R.escapeHTML(SftSPlaybooks.PLAYBOOKS[reco.themeId].short)} signals</a>
              <a class="btn btn--ghost" id="discussNextFiBtn" href="${discussNextFiHref}" target="_blank" rel="noopener noreferrer">Discuss with NextFi ${R.extIcon}</a>
            </div>
          </div>
          ` : `
          <div class="action-block">
            <div class="action-block-eyebrow">What this means for you</div>
            <p class="action-block-lead">This signal isn't directly mapped to a Decision Playbook theme. It still provides background context for tracking institutional positioning.</p>
            <a class="btn btn--outline" href="#/playbooks">Browse all playbooks</a>
          </div>
          `}

        </article>

        <aside class="detail-sidebar">
          ${overlays.length ? `
          <div class="sidebar-card market-context">
            <h4>Live market context</h4>
            ${overlays.slice(0, 4).map(o => `
              <div class="market-context-row">
                <span class="market-context-label">${R.escapeHTML(o.metric_label)}</span>
                <span class="market-context-value">${typeof o.value === 'number' ? '$' + R.fmtCompact(o.value) : R.escapeHTML(String(o.value || '—'))}</span>
              </div>
              ${o.change_30d != null ? `<div class="market-context-row" style="border:0; padding-top:0;"><span class="market-context-label" style="font-size:0.74rem;">vs 30d ago</span><span class="market-context-value ${o.change_30d > 0 ? 'delta-up' : 'delta-down'}" style="font-size:0.82rem;">${R.fmtPct(o.change_30d)}</span></div>` : ''}
            `).join('')}
          </div>
          ` : ''}

          ${related.length ? `
          <div class="sidebar-card">
            <h4>Related signals</h4>
            <ul class="related-list">
              ${related.map(r => `<a class="related-list-item" href="#/signals/${r._id}">
                <div class="meta">${R.escapeHTML(r.institution || '')} · ${R.escapeHTML(r._tier || '')}</div>
                <div class="title">${R.escapeHTML(r.initiative || r.description?.slice(0, 70) || '')}</div>
              </a>`).join('')}
            </ul>
          </div>
          ` : ''}

          <div class="sidebar-card sidebar-card--share">
            <h4>Share</h4>
            <button type="button" class="btn btn--outline btn--sm" id="copyLinkBtn" style="width:100%; margin-bottom: var(--space-2);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007 0l4-4a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-4 4a5 5 0 007 7l1-1"/></svg>
              Copy link to this signal
            </button>
            <button type="button" class="btn btn--outline btn--sm" id="shareLinkedInBtn" style="width:100%;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download share card (PNG)
            </button>
          </div>
        </aside>

        <div class="detail-section detail-section--classification">
          <h3>Classification</h3>
          <dl class="fact-grid">
            <dt>Initiative type</dt>
            <dd>${(signal.initiative_types || []).map(it => `<span class="pill pill--soft">${R.escapeHTML(it)}</span>`).join('') || '<span class="pill pill--soft">Unclassified</span>'}</dd>
            <dt>FMI areas</dt>
            <dd>${(signal.fmi_areas || []).map(f => `<span class="pill pill--soft">${R.escapeHTML(f)}</span>`).join('') || '—'}</dd>
            <dt>Institution category</dt>
            <dd>${R.catTag(signal._category)}</dd>
            <dt>Playbook themes</dt>
            <dd>${R.themeTagsFor(signal)}</dd>
          </dl>
        </div>
      </div>
    </div>
  `;

  // Share-card: native Canvas 2D renderer (no DOM snapshot).
  const _SC_THEME_HEX = { tokenized: '#a78bfa', stablecoins: '#34d399', dlt: '#fb923c', perimeter: '#14b8a6' };
  const _scTC = (themeId && _SC_THEME_HEX[themeId]) || '#2ddcff';

  function _scHexRgb(hex) {
    return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) };
  }

  function _scRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function _scWrap(ctx, text, maxWidth) {
    const words = String(text || '').trim().split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const candidate = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(candidate).width > maxWidth && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = candidate;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function _scWrapLimit(ctx, text, maxWidth, maxLines) {
    const raw = _scWrap(ctx, text, maxWidth);
    if (raw.length <= maxLines) return raw;
    const out = raw.slice(0, maxLines);
    let last = out[maxLines - 1] || '';
    while (last && ctx.measureText(`${last}...`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    out[maxLines - 1] = `${last}...`;
    return out;
  }

  function _scDrawLines(ctx, lines, x, y, lineHeight) {
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, y + i * lineHeight);
    }
  }

  function _scTrunc(text, max) {
    const s = String(text || '').replace(/\s+/g, ' ').trim();
    return s.length <= max ? s : `${s.slice(0, max - 3).trimEnd()}...`;
  }

  function _scPill(ctx, label, x, y, fg, bg, font = '700 14px') {
    ctx.font = `${font} ${_scFont}`;
    const padX = 10;
    const h = 24;
    const w = Math.ceil(ctx.measureText(label).width + padX * 2);
    ctx.fillStyle = bg;
    _scRoundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + padX, y + h / 2 + 0.5);
    return w;
  }

  function _scDrawSftsMark(ctx, x, y, size = 28) {
    const r = 6;
    ctx.save();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = 'rgba(215,226,238,0.66)';
    _scRoundRect(ctx, x, y, size, size, r);
    ctx.stroke();

    const ox = x;
    const oy = y;
    const sx = size / 32;
    const bars = [
      { x: 8, y0: 22, y1: 17, c: '#f59e0b' },
      { x: 13, y0: 22, y1: 13, c: '#34d399' },
      { x: 18, y0: 22, y1: 15, c: '#60a5fa' },
      { x: 23, y0: 22, y1: 9, c: '#c084fc' }
    ];
    for (const b of bars) {
      ctx.strokeStyle = b.c;
      ctx.lineWidth = 2.4 * sx;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ox + b.x * sx, oy + b.y0 * sx);
      ctx.lineTo(ox + b.x * sx, oy + b.y1 * sx);
      ctx.stroke();

      ctx.fillStyle = b.c;
      ctx.beginPath();
      ctx.arc(ox + b.x * sx, oy + b.y1 * sx, 1.8 * sx, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function _scDrawInvertedLogo(ctx, img, x, y, w, h) {
    ctx.save();
    try {
      // Mirror the site's dark-theme treatment for the brand lockup.
      ctx.filter = 'invert(1) brightness(1.4) contrast(1.08)';
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, x, y, w, h);
    } catch (e) {
      ctx.drawImage(img, x, y, w, h);
    }
    ctx.restore();
  }

  const _scFont = 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif';
  const _scNextFiLogo = new Image();
  let _scNextFiLogoReady = false;
  _scNextFiLogo.onload = () => { _scNextFiLogoReady = true; };
  _scNextFiLogo.src = './nextfi-logo.png';

  function _buildShareCanvas() {
    const W = 1200, H = 627, SCALE = 2;
    const canvas = document.createElement('canvas');
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    // ── Layout constants ──────────────────────────────────────────────────
    const HPAD     = 36;
    const HEAD_H   = 56;
    const FOOT_H   = 48;
    const BODY_Y   = HEAD_H + 14;   // 14px top padding inside body
    const BODY_BOT = H - FOOT_H;
    const BODY_GAP = 28;
    const LEFT_X   = HPAD;
    const LEFT_W   = 660;
    const RIGHT_X  = LEFT_X + LEFT_W + BODY_GAP;  // 724
    const RIGHT_W  = W - HPAD - RIGHT_X;           // 440

    // ── Colour tokens ─────────────────────────────────────────────────────
    const C_BG      = '#07090f';
    const C_TEXT    = '#e8eaf2';
    const C_STRONG  = '#ffffff';
    const C_MUTED   = '#97a0b8';
    const C_FAINT   = '#5d6680';
    const C_DIVIDER = '#232a3e';
    const C_PRIMARY = '#2ddcff';   // cyan – tier / WHY THIS MATTERS
    const C_THEME   = _scTC;       // playbook theme colour
    const tcRgb     = _scHexRgb(_scTC);
    const themeRgbStr = `${tcRgb.r},${tcRgb.g},${tcRgb.b}`;

    const playbook  = reco ? SftSPlaybooks.PLAYBOOKS[reco.themeId] : null;

    // ── Background ────────────────────────────────────────────────────────
    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid overlay (top-left quadrant only)
    const GRID = 48;
    ctx.save();
    const gridMask = ctx.createRadialGradient(LEFT_W * 0.4, 0, 0, LEFT_W * 0.4, 0, LEFT_W * 0.8);
    gridMask.addColorStop(0, 'rgba(0,0,0,1)');
    gridMask.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.025;
    ctx.strokeStyle = C_PRIMARY;
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Theme glow – top-right corner
    const glow = ctx.createRadialGradient(W * 0.85, 70, 0, W * 0.85, 70, 260);
    glow.addColorStop(0, `rgba(${themeRgbStr},0.14)`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Left tier → theme gradient rail (5 px)
    const railGrad = ctx.createLinearGradient(0, 0, 0, H);
    railGrad.addColorStop(0, C_PRIMARY);
    railGrad.addColorStop(1, C_THEME);
    ctx.fillStyle = railGrad;
    ctx.fillRect(0, 0, 5, H);

    // ── Header ────────────────────────────────────────────────────────────
    const headMidY = HEAD_H / 2 + 1;
    const MARK_SZ  = 28;
    _scDrawSftsMark(ctx, HPAD, headMidY - MARK_SZ / 2, MARK_SZ);

    ctx.textBaseline = 'middle';
    ctx.textAlign    = 'left';
    const WM_X = HPAD + MARK_SZ + 10;
    ctx.fillStyle = C_STRONG;
    ctx.font = `800 15px ${_scFont}`;
    ctx.fillText('Signals', WM_X, headMidY);
    const wSig = ctx.measureText('Signals').width;
    ctx.fillStyle = C_MUTED;
    ctx.font = `400 15px ${_scFont}`;
    ctx.fillText(' from the Street', WM_X + wSig, headMidY);

    // "Market intelligence by NextFi" on right
    const byline  = 'Market intelligence by';
    ctx.fillStyle = C_FAINT;
    ctx.font      = `400 11px ${_scFont}`;
    const bylineW = ctx.measureText(byline).width;
    const logoH   = 20;
    const natR    = _scNextFiLogoReady && _scNextFiLogo.height ? (_scNextFiLogo.width / _scNextFiLogo.height) : 4.9;
    const logoW   = Math.round(logoH * natR);
    const byX     = W - HPAD - bylineW - 6 - logoW;
    ctx.fillText(byline, byX, headMidY);
    if (_scNextFiLogoReady) {
      _scDrawInvertedLogo(ctx, _scNextFiLogo, byX + bylineW + 6, headMidY - logoH / 2, logoW, logoH);
    } else {
      ctx.fillStyle = C_TEXT;
      ctx.font = `700 11px ${_scFont}`;
      ctx.fillText('NextFi Advisors', byX + bylineW + 6, headMidY);
    }
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'left';

    // ─── Pre-measure WTM box + headline to size What Happened dynamically ──
    const wtmText  = why || '';
    const fmiText  = (signal.fmi_areas || []).slice(0, 5).join(' · ') || 'Institutional infrastructure';
    const instType = signal.institution_type || '';
    const initStr  = (signal.initiative_types || []).join(' ');
    const audList  = [];
    if (/global bank|major bank/i.test(instType))          audList.push('Global Banks');
    else if (/bank|custodian/i.test(instType))              audList.push('Banks & Custodians');
    if (/asset|investment management/i.test(instType))     audList.push('Asset Managers');
    if (/fintech/i.test(instType))                         audList.push('Fintech Providers');
    if (/exchange|intermediar/i.test(instType))            audList.push('Exchange Operators');
    if (/regulator|central bank/i.test(instType))          audList.push('Regulators');
    if (/stablecoin/i.test(initStr) && audList.length < 4) audList.push('Stablecoin Issuers');
    if (audList.length === 0) audList.push('Institutional Operators');
    const audText  = audList.slice(0, 4).join(' · ');
    // WHY THIS MATTERS — sized differently depending on whether a hand-authored override exists
    const _hasOvr  = !!signal.why_this_matters_override;
    const implColW = Math.floor((LEFT_W - 31 - 12) / 2);  // consistent for both paths
    ctx.font = `400 11px ${_scFont}`;
    const fmiLines = _scWrapLimit(ctx, fmiText, implColW, 2);
    const audLines = _scWrapLimit(ctx, audText, implColW, 2);
    const implH    = Math.max(fmiLines.length, audLines.length) * Math.ceil(11 * 1.4);

    // Pre-compute 30-day related cap; convert freed space into bonus WTM lines
    const cardRelated  = (related || []).filter(s => s._daysOld != null && s._daysOld <= 30);
    const _oldRelCount = Math.min(3, (related || []).length);
    const _newRelCount = Math.min(3, cardRelated.length);
    // freed px = removed signals × row height + section header if section disappears entirely
    const _relFreedH   = (_oldRelCount - _newRelCount) * 17
                       + (_oldRelCount > 0 && _newRelCount === 0 ? 21 : 0);

    let   wtmLineH, wtmLines, boxH;
    if (_hasOvr) {
      // Styled box: 13px semi-bold, dashed separator, more padding
      wtmLineH = Math.ceil(13 * 1.40);
      ctx.font  = `600 13px ${_scFont}`;
      wtmLines  = _scWrapLimit(ctx, wtmText, LEFT_W - 31, 5 + Math.floor(_relFreedH / wtmLineH));
      // top(12) + eyebrow(12) + gap(4) + text + gap(8) + sep(1) + sep-gap(10) + implHead(15) + implH + bot(12)
      boxH = 12 + 12 + 4 + wtmLines.length * wtmLineH + 8 + 1 + 10 + 12 + 3 + implH + 12;
    } else {
      // Plain muted metadata: 11px, no separator, less padding
      wtmLineH = Math.ceil(11 * 1.4);
      ctx.font  = `400 11px ${_scFont}`;
      wtmLines  = _scWrapLimit(ctx, wtmText, LEFT_W - 20, 2 + Math.floor(_relFreedH / wtmLineH));
      // top(10) + eyebrow(12) + gap(4) + text + gap(8) + implHead(12) + gap(3) + implH + bot(8)
      boxH = 10 + 12 + 4 + wtmLines.length * wtmLineH + 8 + 12 + 3 + implH + 8;
    }
    ctx.font = `800 22px ${_scFont}`;
    const _preHead  = _scWrapLimit(ctx, signal.initiative || 'Untitled signal', LEFT_W - 10, 2);
    const _preHeadH = _preHead.length * Math.ceil(22 * 1.18) + 8;
    const _lYAtSum  = BODY_Y + (22 + 12) + (12 + 5) + _preHeadH;  // pill+gap, eyebrow+gap, head+gap
    const sumLineH  = Math.ceil(12.5 * 1.5);
    const maxSumLines = Math.max(3, Math.floor((BODY_BOT - _lYAtSum - 14 - boxH - 10 - 10 - 36) / sumLineH));

    // ── LEFT COLUMN ───────────────────────────────────────────────────────
    let lY = BODY_Y;

    // Tags row
    const PILL_H = 22, PILL_PX = 9;
    ctx.font = `700 9.5px ${_scFont}`;
    const drawTagPill = (text, x, y, fg, bg) => {
      const tw = ctx.measureText(text).width;
      const pw = tw + PILL_PX * 2;
      ctx.fillStyle = bg; _scRoundRect(ctx, x, y, pw, PILL_H, 5); ctx.fill();
      ctx.fillStyle = fg; ctx.textBaseline = 'middle';
      ctx.fillText(text, x + PILL_PX, y + PILL_H / 2);
      ctx.textBaseline = 'top';
      return pw;
    };
    const tierLabel  = (signal._tier || 'Signal').toUpperCase();
    const themeLabel = theme?.short || 'Cross-theme';
    const sigType    = _scTrunc(signal.signal_type || 'Signal', 28);
    let px = LEFT_X;
    px += drawTagPill(tierLabel, px, lY, C_PRIMARY, 'rgba(45,220,255,0.10)') + 8;
    px += drawTagPill(themeLabel, px, lY, C_THEME, `rgba(${themeRgbStr},0.10)`) + 8;
    drawTagPill(sigType, px, lY, C_TEXT, 'rgba(255,255,255,0.05)');
    lY += PILL_H + 12;

    // ACT 1 — The Signal
    const EYEBROW_H = 12;
    ctx.fillStyle = C_FAINT;
    ctx.font = `700 9.5px ${_scFont}`;
    ctx.fillText('THE SIGNAL', LEFT_X, lY);
    const eyeW = ctx.measureText('THE SIGNAL').width;
    ctx.fillStyle = C_DIVIDER;
    ctx.fillRect(LEFT_X + eyeW + 8, lY + 5, 24, 1);
    lY += EYEBROW_H + 5;

    ctx.fillStyle = C_STRONG;
    ctx.font = `800 22px ${_scFont}`;
    const headLineH = Math.ceil(22 * 1.18);
    const headLines = _scWrapLimit(ctx, signal.initiative || 'Untitled signal', LEFT_W - 10, 2);
    _scDrawLines(ctx, headLines, LEFT_X, lY, headLineH);
    lY += headLines.length * headLineH + 8;

    // What Happened — dynamic line count; Related Signals get whatever remains
    ctx.fillStyle = C_MUTED;
    ctx.font = `400 12.5px ${_scFont}`;
    const sumLines  = _scWrapLimit(ctx, getWhatHappenedText(signal), LEFT_W - 10, maxSumLines);
    _scDrawLines(ctx, sumLines, LEFT_X, lY, sumLineH);
    lY += sumLines.length * sumLineH + 14;

    // ACT 2 — Why This Matters
    // Styled cyan box when a hand-authored override exists; plain muted metadata otherwise.
    const implLineH = Math.ceil(11 * 1.4);

    if (_hasOvr) {
      // ── Styled box (editorial copy) ──────────────────────────────────
      ctx.fillStyle = 'rgba(45,220,255,0.06)';
      _scRoundRect(ctx, LEFT_X, lY, LEFT_W, boxH, 8); ctx.fill();
      const pBorderGrad = ctx.createLinearGradient(LEFT_X, lY, LEFT_X, lY + boxH);
      pBorderGrad.addColorStop(0, C_PRIMARY);
      pBorderGrad.addColorStop(1, C_THEME);
      ctx.strokeStyle = pBorderGrad; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(LEFT_X + 1.5, lY + 8); ctx.lineTo(LEFT_X + 1.5, lY + boxH - 8); ctx.stroke();
      ctx.lineWidth = 1;

      let bY = lY + 12;
      const bX = LEFT_X + 14;
      ctx.fillStyle = C_PRIMARY;
      ctx.font = `700 9.5px ${_scFont}`;
      ctx.fillText('WHY THIS MATTERS', bX, bY);
      const wtmEyeW2 = ctx.measureText('WHY THIS MATTERS').width;
      ctx.fillStyle = 'rgba(45,220,255,0.4)';
      ctx.fillRect(bX + wtmEyeW2 + 8, bY + 5, 24, 1);
      bY += EYEBROW_H + 4;

      ctx.fillStyle = C_STRONG;
      ctx.font = `600 13px ${_scFont}`;
      _scDrawLines(ctx, wtmLines, bX, bY, wtmLineH);
      bY += wtmLines.length * wtmLineH + 8;

      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(45,220,255,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bX, bY); ctx.lineTo(LEFT_X + LEFT_W - 14, bY); ctx.stroke();
      ctx.setLineDash([]); bY += 10;

      const col2X = bX + implColW + 12;
      ctx.fillStyle = C_PRIMARY; ctx.font = `700 9px ${_scFont}`;
      ctx.fillText('FMI AREAS AFFECTED', bX, bY);
      ctx.fillText('AUDIENCES MOST EXPOSED', col2X, bY);
      bY += 12 + 3;
      ctx.fillStyle = C_TEXT; ctx.font = `400 11px ${_scFont}`;
      _scDrawLines(ctx, fmiLines, bX, bY, implLineH);
      _scDrawLines(ctx, audLines, col2X, bY, implLineH);
    } else {
      // ── Plain muted metadata (template-generated boilerplate) ────────
      const bX = LEFT_X + 6;
      let bY = lY + 10;
      ctx.fillStyle = C_FAINT; ctx.font = `700 9px ${_scFont}`;
      ctx.fillText('WHY THIS MATTERS', bX, bY);
      const wtmEyeW = ctx.measureText('WHY THIS MATTERS').width;
      ctx.fillStyle = C_DIVIDER;
      ctx.fillRect(bX + wtmEyeW + 8, bY + 4, 24, 1);
      bY += 12 + 4;
      ctx.fillStyle = C_MUTED; ctx.font = `400 11px ${_scFont}`;
      _scDrawLines(ctx, wtmLines, bX, bY, wtmLineH);
      bY += wtmLines.length * wtmLineH + 8;
      const col2X = bX + implColW + 12;
      ctx.fillStyle = C_FAINT; ctx.font = `700 9px ${_scFont}`;
      ctx.fillText('FMI AREAS AFFECTED', bX, bY);
      ctx.fillText('AUDIENCES MOST EXPOSED', col2X, bY);
      bY += 12 + 3;
      ctx.fillStyle = C_MUTED; ctx.font = `400 11px ${_scFont}`;
      _scDrawLines(ctx, fmiLines, bX, bY, implLineH);
      _scDrawLines(ctx, audLines, col2X, bY, implLineH);
    }

    lY += boxH + 6;

    // Meta strip — divider + institution · category · date + score badge
    ctx.strokeStyle = C_DIVIDER;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(LEFT_X, lY); ctx.lineTo(LEFT_X + LEFT_W, lY); ctx.stroke();
    lY += 10;

    const metaInst = signal.institution || 'Institution';
    const metaCat  = SftSData.CATEGORY_LABELS?.[signal._category]?.label || signal.institution_type || 'Institutional';
    ctx.fillStyle = C_STRONG;
    ctx.font = `700 12.5px ${_scFont}`;
    ctx.textBaseline = 'top';
    ctx.fillText(metaInst, LEFT_X, lY);
    const instW = ctx.measureText(metaInst).width;
    ctx.fillStyle = C_MUTED;
    ctx.font = `400 11.5px ${_scFont}`;
    ctx.fillText(` · ${metaCat} · ${R.formatDate(signal.date)}`, LEFT_X + instW, lY + 1);

    // Score block — right-aligned: "70 /100" on one row, label below
    const scoreNum = String(signal._score || 0);
    ctx.font = `800 20px ${_scFont}`;
    const snW = ctx.measureText(scoreNum).width;
    ctx.font = `600 11px ${_scFont}`;
    const sfxW = ctx.measureText('/100').width;
    const blockRight = LEFT_X + LEFT_W;
    const scoreStartX = blockRight - snW - 4 - sfxW;

    ctx.textAlign = 'left';
    ctx.fillStyle = C_PRIMARY;
    ctx.font = `800 20px ${_scFont}`;
    ctx.fillText(scoreNum, scoreStartX, lY);

    ctx.fillStyle = C_MUTED;
    ctx.font = `600 11px ${_scFont}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('/100', scoreStartX + snW + 4, lY + 10);
    ctx.textBaseline = 'top';

    ctx.fillStyle = C_FAINT;
    ctx.font = `700 8px ${_scFont}`;
    ctx.textAlign = 'right';
    ctx.fillText('IMPORTANCE SCORE', blockRight, lY + 24);
    ctx.textAlign = 'left';
    lY += 36;

    // Related signals — fill remaining left-column height (30-day recency cap, see pre-measure above)
    const relAvailH = BODY_BOT - lY - 4;
    if (cardRelated.length > 0 && relAvailH > 40) {
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = C_DIVIDER;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(LEFT_X, lY); ctx.lineTo(LEFT_X + LEFT_W, lY); ctx.stroke();
      ctx.setLineDash([]);
      lY += 8;
      ctx.fillStyle = C_FAINT;
      ctx.font = `700 9px ${_scFont}`;
      ctx.fillText('RELATED SIGNALS IN THIS THEME', LEFT_X, lY);
      lY += 13;

      const tierC = { Structural: C_PRIMARY, Material: '#ffb547', Context: '#8f9aaa' };
      const relItemH = 17;
      const maxRel = Math.min(3, cardRelated.length, Math.floor((BODY_BOT - lY) / relItemH));
      for (let i = 0; i < maxRel; i++) {
        const rel = cardRelated[i];
        const rc  = tierC[rel._tier] || C_FAINT;
        const rLabel = (rel._tier || '').toUpperCase();

        // Tier badge
        ctx.font = `700 8.5px ${_scFont}`;
        const rbW = ctx.measureText(rLabel).width + 10;
        const rcArr = rc === C_PRIMARY ? '45,220,255' : rc === '#ffb547' ? '255,181,71' : '143,154,170';
        ctx.fillStyle = `rgba(${rcArr},0.15)`;
        _scRoundRect(ctx, LEFT_X, lY, rbW, 14, 3); ctx.fill();
        ctx.fillStyle = rc;
        ctx.fillText(rLabel, LEFT_X + 5, lY + 3);

        // Title
        const relMaxW = LEFT_W - rbW - 10 - 38;
        ctx.fillStyle = C_MUTED;
        ctx.font = `400 11px ${_scFont}`;
        const relTitle = rel.initiative || (rel.description || '').slice(0, 80);
        let relT = String(relTitle);
        while (relT.length > 4 && ctx.measureText(relT + '…').width > relMaxW) {
          relT = relT.slice(0, -1).trimEnd();
        }
        if (relT.length < relTitle.length) relT += '…';
        ctx.fillText(relT, LEFT_X + rbW + 8, lY + 2);

        // Days-ago
        if (rel._daysOld != null) {
          ctx.fillStyle = C_FAINT;
          ctx.font = `400 10px ${_scFont}`;
          ctx.textAlign = 'right';
          ctx.fillText(`${rel._daysOld}d ago`, LEFT_X + LEFT_W, lY + 2);
          ctx.textAlign = 'left';
        }
        lY += relItemH;
      }
    }

    // ── RIGHT COLUMN — Recommended Play card ──────────────────────────────
    const PLAY_H = BODY_BOT - BODY_Y;
    const P = 16;  // inner padding
    const pW = RIGHT_W - P * 2;

    // Card background + border
    const playBg = ctx.createLinearGradient(RIGHT_X, BODY_Y, RIGHT_X, BODY_Y + PLAY_H);
    playBg.addColorStop(0, `rgba(${themeRgbStr},0.07)`);
    playBg.addColorStop(1, 'rgba(15,20,34,0.4)');
    ctx.fillStyle = playBg;
    ctx.strokeStyle = `rgba(${themeRgbStr},0.25)`;
    ctx.lineWidth = 1;
    _scRoundRect(ctx, RIGHT_X, BODY_Y, RIGHT_W, PLAY_H, 10);
    ctx.fill(); ctx.stroke();

    let pY = BODY_Y + P;

    if (reco) {
      // Eyebrow: RECOMMENDED PLAY · Theme
      ctx.font = `700 9.5px ${_scFont}`;
      ctx.fillStyle = C_THEME;
      ctx.fillText('RECOMMENDED PLAY', RIGHT_X + P, pY);
      const rpW = ctx.measureText('RECOMMENDED PLAY').width;
      ctx.fillStyle = C_FAINT;
      ctx.fillText(' · ', RIGHT_X + P + rpW, pY);
      const sepW2 = ctx.measureText(' · ').width;
      ctx.fillStyle = C_TEXT;
      ctx.font = `600 9.5px ${_scFont}`;
      ctx.fillText(_scTrunc(theme?.short || 'Playbook', 30), RIGHT_X + P + rpW + sepW2, pY);
      pY += 14 + 10;

      // Play number badge + title
      const BADGE = 32;
      ctx.fillStyle = `rgba(${themeRgbStr},0.15)`;
      _scRoundRect(ctx, RIGHT_X + P, pY, BADGE, BADGE, 7); ctx.fill();
      ctx.fillStyle = C_THEME;
      ctx.font = `800 18px ${_scFont}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(reco.play.n), RIGHT_X + P + BADGE / 2, pY + BADGE / 2 + 1);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';

      const titleX2 = RIGHT_X + P + BADGE + 10;
      ctx.fillStyle = C_STRONG;
      ctx.font = `700 14px ${_scFont}`;
      const pTitleLines = _scWrapLimit(ctx, reco.play.title, RIGHT_W - P - BADGE - 10 - P, 2);
      if (pTitleLines.length === 1) {
        ctx.textBaseline = 'middle';
        ctx.fillText(pTitleLines[0], titleX2, pY + BADGE / 2 + 1);
        ctx.textBaseline = 'top';
      } else {
        _scDrawLines(ctx, pTitleLines, titleX2, pY + (BADGE - 2 * 18) / 2, 18);
      }
      pY += BADGE + 10;

      // One-liner
      ctx.fillStyle = C_MUTED;
      ctx.font = `400 11.5px ${_scFont}`;
      const oneH = Math.ceil(11.5 * 1.5);
      const oneLines = _scWrapLimit(ctx, reco.play.oneliner, pW, 3);
      _scDrawLines(ctx, oneLines, RIGHT_X + P, pY, oneH);
      pY += oneLines.length * oneH + 10;

      // Dashed separator
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = C_DIVIDER; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(RIGHT_X + P, pY); ctx.lineTo(RIGHT_X + RIGHT_W - P, pY); ctx.stroke();
      ctx.setLineDash([]);
      pY += 10;

      // WHAT IT IS block
      if (reco.play.what) {
        ctx.fillStyle = C_THEME;
        ctx.font = `700 9px ${_scFont}`;
        ctx.fillText('WHAT IT IS', RIGHT_X + P, pY);
        pY += 12;
        ctx.fillStyle = C_TEXT;
        ctx.font = `400 11.5px ${_scFont}`;
        const whatH = Math.ceil(11.5 * 1.5);
        const whatLines = _scWrapLimit(ctx, reco.play.what, pW, 5);
        _scDrawLines(ctx, whatLines, RIGHT_X + P, pY, whatH);
        pY += whatLines.length * whatH + 12;
      }

      // WHY NOW block
      if (reco.play.whyNow) {
        ctx.fillStyle = C_THEME;
        ctx.font = `700 9px ${_scFont}`;
        ctx.fillText('WHY NOW', RIGHT_X + P, pY);
        pY += 12;
        ctx.fillStyle = C_TEXT;
        ctx.font = `400 11.5px ${_scFont}`;
        const wnH = Math.ceil(11.5 * 1.5);
        const wnLines = _scWrapLimit(ctx, reco.play.whyNow, pW, 5);
        _scDrawLines(ctx, wnLines, RIGHT_X + P, pY, wnH);
        pY += wnLines.length * wnH + 12;
      }

      // BEST FIT — each item: who label + why description
      if (reco.play.bestFit && reco.play.bestFit.length > 0) {
        const fitItems = reco.play.bestFit.slice(0, 3);
        pY += 4;
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = C_DIVIDER; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(RIGHT_X + P, pY); ctx.lineTo(RIGHT_X + RIGHT_W - P, pY); ctx.stroke();
        ctx.setLineDash([]);
        pY += 10;

        ctx.fillStyle = C_THEME;
        ctx.font = `700 9px ${_scFont}`;
        ctx.fillText('BEST FIT', RIGHT_X + P, pY);
        pY += 13;

        const fitItemH = Math.ceil(11 * 1.35);
        for (const fit of fitItems) {
          if (pY + fitItemH > BODY_BOT - P) break;
          ctx.fillStyle = C_STRONG;
          ctx.font = `600 11px ${_scFont}`;
          const whoLine = _scWrapLimit(ctx, fit.who, pW, 1);
          _scDrawLines(ctx, whoLine, RIGHT_X + P, pY, fitItemH);
          pY += fitItemH + 1;
          if (fit.why && pY + fitItemH <= BODY_BOT - P) {
            ctx.fillStyle = C_MUTED;
            ctx.font = `400 11px ${_scFont}`;
            const maxWhy = Math.max(1, Math.min(2, Math.floor((BODY_BOT - P - pY - 4) / fitItemH)));
            const whyLine = _scWrapLimit(ctx, fit.why, pW, maxWhy);
            _scDrawLines(ctx, whyLine, RIGHT_X + P, pY, fitItemH);
            pY += whyLine.length * fitItemH + 7;
          }
        }
      }

      // NEXT ACTIONS — will become "MOVE THIS QUARTER" once actions[] is added to each play
      if (playbook) {
        const moveItems = [
          `Read the full Playbook: ${playbook.label}`,
          `See all ${theme?.short || playbook.short} signals on SftS`,
          'Discuss with NextFi Advisors',
        ];
        const moveH = Math.ceil(11 * 1.4);
        if (pY + 8 + 10 + 12 + moveItems.length * moveH <= BODY_BOT - P) {
          pY += 8;
          ctx.setLineDash([2, 3]);
          ctx.strokeStyle = C_DIVIDER; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(RIGHT_X + P, pY); ctx.lineTo(RIGHT_X + RIGHT_W - P, pY); ctx.stroke();
          ctx.setLineDash([]);
          pY += 10;
          ctx.fillStyle = C_THEME;
          ctx.font = `700 9px ${_scFont}`;
          ctx.fillText('NEXT ACTIONS', RIGHT_X + P, pY);
          pY += 12;
          for (let mi = 0; mi < moveItems.length; mi++) {
            if (pY + moveH > BODY_BOT - P) break;
            ctx.fillStyle = C_THEME;
            ctx.font = `700 11px ${_scFont}`;
            ctx.fillText(`${mi + 1}`, RIGHT_X + P, pY);
            ctx.fillStyle = C_TEXT;
            ctx.font = `400 11px ${_scFont}`;
            let t = moveItems[mi];
            while (t.length > 4 && ctx.measureText(t + '…').width > pW - 18) t = t.slice(0, -1).trimEnd();
            if (t.length < moveItems[mi].length) t += '…';
            ctx.fillText(t, RIGHT_X + P + 18, pY);
            pY += moveH;
          }
        }
      }
    } else {
      // No playbook recommendation
      pY += 10;
      ctx.fillStyle = C_MUTED;
      ctx.font = `600 13px ${_scFont}`;
      const noRecoLines = _scWrapLimit(ctx, 'This signal provides strategic context. Browse related playbooks for actionable frameworks.', pW, 4);
      _scDrawLines(ctx, noRecoLines, RIGHT_X + P, pY, 20);
    }

    // Playbook URL — pinned to bottom of right column
    if (theme) {
      const pbUrl = `streetsignals.nextfiadvisors.com/playbooks/${theme.id}`;
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'left';
      ctx.fillStyle = `rgba(${themeRgbStr},0.55)`;
      ctx.font = `400 9.5px ${_scFont}`;
      ctx.fillText('→  ' + pbUrl, RIGHT_X + P, BODY_BOT - P + 2);
      ctx.textBaseline = 'top';
    }

    // ── Footer ────────────────────────────────────────────────────────────
    const FOOT_Y = H - FOOT_H;
    const footBg = ctx.createLinearGradient(0, FOOT_Y, 0, H);
    footBg.addColorStop(0, 'rgba(0,0,0,0)');
    footBg.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = footBg;
    ctx.fillRect(0, FOOT_Y, W, FOOT_H);

    ctx.strokeStyle = C_DIVIDER; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, FOOT_Y); ctx.lineTo(W, FOOT_Y); ctx.stroke();

    const footMidY = FOOT_Y + FOOT_H / 2;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillStyle = C_STRONG;
    ctx.font = `700 11px ${_scFont}`;
    ctx.fillText('streetsignals.nextfiadvisors.com', HPAD, footMidY);
    const baseW = ctx.measureText('streetsignals.nextfiadvisors.com').width;
    if (signal._id) {
      ctx.fillStyle = C_FAINT;
      ctx.font = `400 11px ${_scFont}`;
      ctx.fillText(`/signals/${signal._id}`, HPAD + baseW, footMidY);
    }

    // Market context metrics on right
    const footOverlays = overlays.slice(0, 2);
    if (footOverlays.length > 0) {
      ctx.textAlign = 'right';
      let fx = W - HPAD;
      for (const o of footOverlays.slice().reverse()) {
        const val = typeof o.value === 'number' ? '$' + R.fmtCompact(o.value) : String(o.value || '—');
        if (o.change_30d != null) {
          const chg = R.fmtPct(o.change_30d);
          // Draw percentage (colored) then "30d" label (muted) — right-to-left
          ctx.fillStyle = o.change_30d > 0 ? C_THEME : '#f87171';
          ctx.font = `700 10.5px ${_scFont}`;
          ctx.fillText(chg, fx, footMidY);
          fx -= ctx.measureText(chg).width + 3;
          ctx.fillStyle = C_MUTED;
          ctx.font = `400 10.5px ${_scFont}`;
          ctx.fillText('30d', fx, footMidY);
          fx -= ctx.measureText('30d').width + 5;
        }
        ctx.fillStyle = C_TEXT;
        ctx.font = `600 10.5px ${_scFont}`;
        ctx.fillText(val, fx, footMidY);
        fx -= ctx.measureText(val).width + 6;
        ctx.fillStyle = C_FAINT;
        ctx.font = `400 10.5px ${_scFont}`;
        const lbl = _scTrunc(o.metric_label, 28) + '  ';
        ctx.fillText(lbl, fx, footMidY);
        fx -= ctx.measureText(lbl).width + 14;
      }
    }
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';

    return canvas;
  }

  const copyBtn = root.querySelector('#copyLinkBtn');
  const sourceBtn = root.querySelector('#readSourceBtn');
  const playbookBtn = root.querySelector('#readPlaybookBtn');
  const discussBtn = root.querySelector('#discussNextFiBtn');

  if (sourceBtn) {
    sourceBtn.addEventListener('click', () => {
      trackSignalEvent('sfts_read_source_click', {
        signal_id: params.id,
        theme: themeId || 'unmapped',
        tier: signal._tier || 'unknown',
        institution: signal.institution || 'unknown',
        persona
      });
    });
  }

  if (playbookBtn) {
    playbookBtn.addEventListener('click', () => {
      trackSignalEvent('sfts_read_playbook_click', {
        signal_id: params.id,
        theme: themeId || 'unmapped',
        recommended_play: String(reco?.play?.n || ''),
        tier: signal._tier || 'unknown',
        institution: signal.institution || 'unknown',
        persona
      });
    });
  }

  if (discussBtn) {
    discussBtn.addEventListener('click', () => {
      trackSignalEvent('sfts_discuss_nextfi_click', {
        signal_id: params.id,
        theme: themeId || 'unmapped',
        recommended_play: String(reco?.play?.n || ''),
        tier: signal._tier || 'unknown',
        institution: signal.institution || 'unknown',
        persona
      });
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(window.location.href);
        copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>Copied to clipboard';
        setTimeout(() => {
          copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007 0l4-4a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-4 4a5 5 0 007 7l1-1"/></svg>Copy link to this signal';
        }, 2000);
      } catch (e) {
        copyBtn.textContent = 'Copy failed — use browser bar';
      }
    });
  }

  const shareLinkedInBtn = root.querySelector('#shareLinkedInBtn');
  if (shareLinkedInBtn) {
    shareLinkedInBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const _DL_BTN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download share card (PNG)';
        shareLinkedInBtn.disabled = true;
        shareLinkedInBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity="0.4"/></svg>Generating…';

        const canvas = _buildShareCanvas();
        canvas.toBlob(b => {
          if (!b) {
            shareLinkedInBtn.disabled = false;
            shareLinkedInBtn.innerHTML = _DL_BTN;
            return;
          }
          const url = URL.createObjectURL(b);
          const a = document.createElement('a');
          a.href = url;
          a.download = `sfts-${params.id}.png`;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          shareLinkedInBtn.disabled = false;
          shareLinkedInBtn.innerHTML = _DL_BTN;
        });
      } catch (e) {
        console.error('Signal image download failed:', e);
        shareLinkedInBtn.disabled = false;
        shareLinkedInBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download share card (PNG)';
      }
    });
  }
});
