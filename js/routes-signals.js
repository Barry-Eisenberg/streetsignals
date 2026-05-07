// =====================================================================
// routes-signals.js — Signals workspace (/signals) and detail (/signals/:id)
// =====================================================================

// Apply current State.filters to a signal list and return filtered+sorted.
// When a non-'all' persona is selected, signals are additionally re-ranked so
// the highest persona-relevance ones float to the top within each tier band.
function applyFiltersAndSort(list) {
  const f = SftSState.filters;
  const persona = SftSState.persona || 'all';
  let out = list;
  if (f.theme) out = out.filter(s => (s._themes || []).includes(f.theme));
  if (f.tier) out = out.filter(s => s._tier === f.tier);
  if (f.category && f.category !== 'all') out = out.filter(s => s._category === f.category);
  if (f.dateWindow !== 'all' && f.dateWindow != null) {
    const cutoff = parseInt(f.dateWindow, 10);
    out = out.filter(s => s._daysOld !== null && s._daysOld <= cutoff);
  }
  if (f.search) {
    const q = f.search.toLowerCase();
    out = out.filter(s =>
      (s.institution || '').toLowerCase().includes(q) ||
      (s.initiative || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q));
  }

  // Persona filter: when a specific persona is active, drop signals with the
  // lowest relevance (score 1 = baseline), keeping signals scoring >= 2.
  if (persona !== 'all') {
    out = out.filter(s => SftSData.getPersonaRelevance(s, persona) >= 2);
  }

  const tierOrder = { Structural: 0, Material: 1, Context: 2, Noise: 3 };
  const personaScore = (s) => persona === 'all' ? 0 : SftSData.getPersonaRelevance(s, persona);

  if (f.sort === 'recency') {
    // Tier first, then persona-relevance (when active), then recency
    out = [...out].sort((a, b) => {
      const t = tierOrder[a._tier] - tierOrder[b._tier];
      if (t !== 0) return t;
      const p = personaScore(b) - personaScore(a);
      if (p !== 0) return p;
      return (a._daysOld ?? 999) - (b._daysOld ?? 999);
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
  if (f.dateWindow !== 30) u.set('days', f.dateWindow);
  if (f.search) u.set('q', f.search);
  if (f.sort && f.sort !== 'recency') u.set('sort', f.sort);
  if (SftSState.persona && SftSState.persona !== 'all') u.set('persona', SftSState.persona);
  const qs = u.toString();
  const newHash = `#/signals${qs ? '?' + qs : ''}`;
  if (window.location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
}

// =====================================================================
// /signals — workspace
// =====================================================================
SftSRouter.defineRoute('/signals', async ({ root, query }) => {
  // Apply incoming query (deep-link)
  SftSState.resetFilters();
  if (query) SftSState.applyFromQuery(query);

  const allSignals = SftSData.signals;

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
    const counts = { all: filtered.length, tokenized: 0, stablecoins: 0, dlt: 0 };
    filtered.forEach(s => (s._themes || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return counts;
  }

  function render() {
    const f = SftSState.filters;
    const filtered = applyFiltersAndSort(allSignals);
    const cc = categoryCounts();
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
          <aside class="workspace-rail">
            <h4>Search</h4>
            <input type="search" id="searchBox" class="filter-search" placeholder="Institution, keyword…" value="${R.escapeHTML(f.search || '')}" />

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
            </div>

            <h4>Institution category</h4>
            <div class="filter-options">
              <button class="filter-option ${f.category === 'all' ? 'is-active' : ''}" data-cat="all">All categories <span class="count">${cc.all || 0}</span></button>
              ${Object.entries(SftSData.CATEGORY_LABELS).filter(([k]) => k !== 'intel_briefs').map(([k, v]) => `
                <button class="filter-option ${f.category === k ? 'is-active' : ''}" data-cat="${k}">${R.escapeHTML(v.label)} <span class="count">${cc[k] || 0}</span></button>
              `).join('')}
            </div>

            <h4>Date window</h4>
            <div class="filter-options">
              ${[14, 30, 60, 90, 'all'].map(d => `
                <button class="filter-option ${String(f.dateWindow) === String(d) ? 'is-active' : ''}" data-days="${d}">${d === 'all' ? 'All historical' : `Last ${d} days`}</button>
              `).join('')}
            </div>

            <button class="btn btn--ghost btn--sm" style="margin-top:var(--space-5); width:100%;" data-act="clearAll">Reset all filters</button>
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
          SftSState.filters.search = e.target.value;
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
    const t = e.target.closest('[data-tier], [data-theme], [data-cat], [data-days], [data-sort], [data-act], [data-persona]');
    if (!t) return;
    if (t.dataset.tier !== undefined) SftSState.filters.tier = t.dataset.tier || null;
    else if (t.dataset.theme !== undefined) SftSState.filters.theme = t.dataset.theme || null;
    else if (t.dataset.cat !== undefined) SftSState.filters.category = t.dataset.cat;
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

          <div class="why-block">
            <div class="why-block-eyebrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/></svg>
              Why this matters · ${R.escapeHTML(SftSData.PERSONAS[persona].label)}
            </div>
            <p>${R.escapeHTML(why)}</p>
          </div>

          <div class="detail-section">
            <h3>What happened</h3>
            <p class="detail-description">${R.escapeHTML(signal.description || '')}</p>
            ${signal.source_url ? `<p style="margin-top: var(--space-4);">
              <a class="btn btn--outline btn--sm" href="${signal.source_url}" target="_blank" rel="noopener noreferrer">
                Read source ${R.extIcon}
              </a>
            </p>` : ''}
          </div>

          <div class="detail-section">
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
              <a class="btn btn--primary" href="${SftSPlaybooks.PLAYBOOKS[reco.themeId] ? '#/playbooks/' + reco.themeId : '#/playbooks'}">
                Read the full Playbook
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </a>
              <a class="btn btn--outline" href="#/signals?theme=${reco.themeId}">See all ${R.escapeHTML(SftSPlaybooks.PLAYBOOKS[reco.themeId].short)} signals</a>
              <a class="btn btn--ghost" href="https://nextfiadvisors.com/contact?signal_id=${params.id}&theme=${themeId || ''}&play=${reco?.play.n || ''}" target="_blank" rel="noopener noreferrer">Discuss with NextFi ${R.extIcon}</a>
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

          <div class="sidebar-card">
            <h4>Share</h4>
            <button class="btn btn--outline btn--sm" id="copyLinkBtn" style="width:100%; margin-bottom: var(--space-2);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007 0l4-4a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-4 4a5 5 0 007 7l1-1"/></svg>
              Copy link to this signal
            </button>
            <button class="btn btn--outline btn--sm" id="shareLinkedInBtn" style="width:100%;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              Share to LinkedIn
            </button>
          </div>
        </aside>
      </div>
    </div>
  `;

  // Create hidden share-card div for LinkedIn image generation
  const existingShareCard = document.getElementById('share-card');
  if (existingShareCard) existingShareCard.remove();

  const truncateShareText = (text, maxChars) => {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= maxChars) return clean;
    return `${clean.slice(0, maxChars - 1).trimEnd()}...`;
  };
  const headlineText = truncateShareText(signal.initiative || 'Untitled signal', 165);
  const whyText = truncateShareText(why || '', 190);
  const titleLen = headlineText.length;
  const titleFontSize = titleLen > 140 ? 58 : titleLen > 115 ? 64 : titleLen > 90 ? 70 : 76;

  const shareCardDiv = document.createElement('div');
  shareCardDiv.id = 'share-card';
  shareCardDiv.style.cssText = 'display:none; position:fixed; width:1200px; height:627px; background:#0a0b0f; color:#fff; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; overflow:hidden; left:0; top:0; z-index:-1;';
  shareCardDiv.innerHTML = `
    <div style="position:relative; width:100%; height:100%; display:flex; flex-direction:column; padding:42px 52px 36px 52px; box-sizing:border-box; background:radial-gradient(circle at 85% 15%, rgba(6,220,255,0.08) 0%, rgba(6,220,255,0) 35%);">
      <div style="position:absolute; left:0; top:0; bottom:0; width:8px; background:${themeColor || '#06dcff'}; z-index:10;"></div>
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px;">
        <div style="font-size:36px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; color:#06dcff;">Signals from the Street</div>
        <div style="display:flex; gap:8px; align-items:center; font-size:11px; font-weight:700;">
          <span style="background:${themeColor || '#06dcff'}; color:#0a0b0f; padding:8px 14px; border-radius:7px; text-transform:uppercase; font-size:30px;">${signal._tier || 'SIGNAL'}</span>
          ${theme ? `<span style="background:rgba(${themeColor === '#a78bfa' ? '167,139,250' : themeColor === '#34d399' ? '52,211,153' : '251,146,60'},0.2); color:${themeColor}; padding:8px 14px; border-radius:7px; font-size:26px;">${theme.short}</span>` : ''}
        </div>
      </div>
      <div style="flex-grow:1; display:flex; flex-direction:column; justify-content:flex-start; margin:10px 6px 0 6px;">
        <h1 style="font-size:${titleFontSize}px; font-weight:800; line-height:1.06; margin:0; max-height:350px; overflow:hidden; word-break:break-word; letter-spacing:-0.02em;">${R.escapeHTML(headlineText)}</h1>
        <div style="font-size:43px; color:#9ba6b2; margin-top:22px;">${R.escapeHTML(signal.institution || '')} · ${R.formatDate(signal.date)}</div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:flex-end; padding-top:26px; border-top:1px solid rgba(255,255,255,0.14);">
        <div style="color:#8b96a3; max-width:73%; font-size:26px; line-height:1.3; max-height:72px; overflow:hidden;">${R.escapeHTML(whyText)}</div>
        <div style="text-align:right; white-space:nowrap; font-weight:700; color:#06dcff; font-size:34px;">streetsignals.nextfiadvisors.com</div>
      </div>
    </div>
  `;
  document.body.appendChild(shareCardDiv);

  const copyBtn = root.querySelector('#copyLinkBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
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
    shareLinkedInBtn.addEventListener('click', async () => {
      try {
        shareLinkedInBtn.disabled = true;
        shareLinkedInBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity="0.3"/></svg>Generating...';
        
        // Get or create share-card element
        let cardEl = document.querySelector('#share-card');
        if (!cardEl) throw new Error('Share card element not found');
        
        // Make card visible temporarily for capture
        cardEl.style.display = 'block';
        cardEl.style.position = 'fixed';
        cardEl.style.left = '-9999px';
        
        // Use html2canvas to capture the share-card
        const canvas = await html2canvas(cardEl, { scale: 2, backgroundColor: '#0a0b0f', useCORS: true, allowTaint: true });
        cardEl.style.display = 'none';
        
        // Convert canvas to blob and download
        canvas.toBlob(b => {
          const url = URL.createObjectURL(b);
          const a = document.createElement('a');
          a.href = url;
          a.download = `sfts-${params.id}.png`;
          a.click();
          URL.revokeObjectURL(url);
          
          // Open LinkedIn share dialog with the signal URL
          setTimeout(() => {
            const signalUrl = encodeURIComponent(window.location.href);
            window.open(
              `https://www.linkedin.com/sharing/share-offsite/?url=${signalUrl}`,
              'linkedin-share',
              'width=550,height=680'
            );
            
            shareLinkedInBtn.disabled = false;
            shareLinkedInBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>Share to LinkedIn';
          }, 500);
        });
      } catch (e) {
        console.error('LinkedIn share failed:', e);
        shareLinkedInBtn.disabled = false;
        shareLinkedInBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>Share to LinkedIn';
      }
    });
  }
});
