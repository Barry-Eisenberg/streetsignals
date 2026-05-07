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

  // Share-card: native Canvas 2D renderer (no DOM snapshot).
  const _SC_THEME_HEX = { tokenized: '#a78bfa', stablecoins: '#34d399', dlt: '#fb923c' };
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

  const _scFont = 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

  function _buildShareCanvas() {
    const W = 1200;
    const H = 627;
    const SCALE = 2;

    const canvas = document.createElement('canvas');
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    const PAD = 28;
    const GAP = 18;
    const LEFT_W = 760;
    const RIGHT_X = PAD + LEFT_W + GAP;
    const RIGHT_W = W - PAD - RIGHT_X;
    const tc = _scTC;
    const tcRgb = _scHexRgb(tc);
    const themeLabel = theme?.short || 'Cross-theme';
    const playbook = reco ? SftSPlaybooks.PLAYBOOKS[reco.themeId] : null;
    const recommendationTitle = playbook?.label || 'No mapped playbook';
    const initiativeType = (signal.initiative_types && signal.initiative_types[0]) || signal.signal_type || 'Initiative';
    const fmiArea = (signal.fmi_areas && signal.fmi_areas[0]) || 'FMI';
    const categoryLabel = SftSData.CATEGORY_LABELS?.[signal._category]?.label || signal.institution_type || 'Institutional';
    const metaLine = [
      `${signal.institution || 'Signal'} - ${signal.institution_type || categoryLabel}`,
      R.formatDate(signal.date),
      signal.source_name ? `Source: ${signal.source_name}` : null,
      `Score: ${signal._score}/100`
    ].filter(Boolean).join('   ');

    // Background + subtle theme glow.
    ctx.fillStyle = '#05080f';
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.86, 80, 0, W * 0.86, 80, 280);
    glow.addColorStop(0, `rgba(${tcRgb.r},${tcRgb.g},${tcRgb.b},0.18)`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = tc;
    ctx.fillRect(0, 0, 6, H);

    // Header row.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#2ddcff';
    ctx.font = `800 26px ${_scFont}`;
    ctx.fillText('SIGNALS FROM THE STREET', PAD, 20);
    ctx.font = `500 14px ${_scFont}`;
    ctx.fillStyle = '#8f9aaa';
    ctx.fillText('Market intelligence by NextFi Advisors', PAD + 330, 26);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#8f9aaa';
    ctx.font = `600 14px ${_scFont}`;
    ctx.fillText('streetsignals.nextfiadvisors.com', W - PAD, 26);

    // Tag row.
    let chipX = PAD;
    const chipY = 58;
    chipX += _scPill(ctx, (signal._tier || 'Signal').toUpperCase(), chipX, chipY, '#062229', `rgba(${tcRgb.r},${tcRgb.g},${tcRgb.b},0.96)`) + 8;
    chipX += _scPill(ctx, themeLabel, chipX, chipY, '#34d399', 'rgba(52,211,153,0.14)', '600 13px') + 8;
    chipX += _scPill(ctx, initiativeType, chipX, chipY, '#fb923c', 'rgba(251,146,60,0.14)', '600 13px') + 8;
    _scPill(ctx, categoryLabel, chipX, chipY, '#c3ced9', 'rgba(195,206,217,0.10)', '600 13px');

    // Title and metadata — font sizes and line heights are kept compact.
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f4f7fb';
    ctx.font = `800 44px ${_scFont}`;
    const titleLineH = 50;
    const titleLines = _scWrapLimit(ctx, _scTrunc(signal.initiative || 'Untitled signal', 200), LEFT_W - 10, 3);
    const titleY = 96;
    _scDrawLines(ctx, titleLines, PAD, titleY, titleLineH);

    const titleBottom = titleY + titleLines.length * titleLineH;
    ctx.fillStyle = '#a6b1bf';
    ctx.font = `500 17px ${_scFont}`;
    const metaLineH = 22;
    const metaLines = _scWrapLimit(ctx, metaLine, LEFT_W - 10, 2);
    _scDrawLines(ctx, metaLines, PAD, titleBottom + 10, metaLineH);
    const metaBottom = titleBottom + 10 + metaLines.length * metaLineH;

    // Why this matters card — position flows from actual title/meta height.
    const whyY = metaBottom + 16;
    const whyH = 106;
    ctx.fillStyle = 'rgba(45,220,255,0.06)';
    ctx.strokeStyle = 'rgba(45,220,255,0.34)';
    ctx.lineWidth = 1;
    _scRoundRect(ctx, PAD, whyY, LEFT_W, whyH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#41cbe5';
    ctx.font = `700 13px ${_scFont}`;
    ctx.fillText(`WHY THIS MATTERS · ${SftSData.PERSONAS[persona].label.toUpperCase()}`, PAD + 14, whyY + 13);
    ctx.fillStyle = '#b8c3d0';
    ctx.font = `500 21px ${_scFont}`;
    const whyLines = _scWrapLimit(ctx, _scTrunc(why || '', 270), LEFT_W - 28, 2);
    _scDrawLines(ctx, whyLines, PAD + 14, whyY + 38, 28);

    // What happened section — flows from why card.
    const happenedY = whyY + whyH + 14;
    ctx.fillStyle = '#d8e0ea';
    ctx.font = `700 20px ${_scFont}`;
    ctx.fillText('What happened', PAD, happenedY);
    ctx.fillStyle = '#a8b3c1';
    ctx.font = `500 17px ${_scFont}`;
    const happenedLines = _scWrapLimit(ctx, _scTrunc(signal.description || '', 300), LEFT_W - 10, 3);
    _scDrawLines(ctx, happenedLines, PAD, happenedY + 28, 24);
    if (signal.source_name || signal.source_url) {
      const sourceLabel = signal.source_name || 'Source article';
      ctx.fillStyle = 'rgba(220,228,239,0.12)';
      _scRoundRect(ctx, PAD, H - 46, 178, 28, 6);
      ctx.fill();
      ctx.fillStyle = '#dbe4ef';
      ctx.font = `600 13px ${_scFont}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(`Read source: ${_scTrunc(sourceLabel, 20)}`, PAD + 10, H - 32);
      ctx.textBaseline = 'top';
    }

    // Right recommendation block.
    const rightY = 96;
    const rightH = H - rightY - 18;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    _scRoundRect(ctx, RIGHT_X, rightY, RIGHT_W, rightH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#55d3a0';
    ctx.font = `700 12px ${_scFont}`;
    ctx.fillText('WHAT THIS MEANS FOR YOU', RIGHT_X + 14, rightY + 13);

    ctx.fillStyle = '#f1f5fb';
    ctx.font = `800 26px ${_scFont}`;
    const recoHeading = `Recommended play · ${recommendationTitle}`;
    const recoHeadingLines = _scWrapLimit(ctx, recoHeading, RIGHT_W - 28, 2);
    _scDrawLines(ctx, recoHeadingLines, RIGHT_X + 14, rightY + 34, 30);

    ctx.fillStyle = '#b7c2cf';
    ctx.font = `500 14px ${_scFont}`;
    const leadText = reco
      ? `Based on this signal's tier (${signal._tier}) and the ${SftSData.PERSONAS[persona].label} lens.`
      : 'This signal is not directly mapped to a Decision Playbook theme.';
    const leadLines = _scWrapLimit(ctx, leadText, RIGHT_W - 28, 2);
    _scDrawLines(ctx, leadLines, RIGHT_X + 14, rightY + 100, 19);

    const playY = rightY + 148;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    _scRoundRect(ctx, RIGHT_X + 14, playY, RIGHT_W - 28, 188, 8);
    ctx.fill();
    ctx.stroke();

    if (reco) {
      ctx.fillStyle = 'rgba(85,211,160,0.24)';
      _scRoundRect(ctx, RIGHT_X + 24, playY + 14, 26, 26, 6);
      ctx.fill();
      ctx.fillStyle = '#65e3ae';
      ctx.font = `800 15px ${_scFont}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(String(reco.play.n), RIGHT_X + 33, playY + 27);
      ctx.textBaseline = 'top';

      ctx.fillStyle = '#f1f6fc';
      ctx.font = `700 17px ${_scFont}`;
      const playTitleLines = _scWrapLimit(ctx, reco.play.title, RIGHT_W - 88, 2);
      _scDrawLines(ctx, playTitleLines, RIGHT_X + 58, playY + 16, 21);

      ctx.fillStyle = '#b5c0cd';
      ctx.font = `500 14px ${_scFont}`;
      const oneLinerLines = _scWrapLimit(ctx, reco.play.oneliner, RIGHT_W - 40, 2);
      _scDrawLines(ctx, oneLinerLines, RIGHT_X + 24, playY + 62, 19);

      ctx.fillStyle = '#d6dee8';
      ctx.font = `700 13px ${_scFont}`;
      ctx.fillText('Why this is the right move now:', RIGHT_X + 24, playY + 104);
      ctx.fillStyle = '#b5c0cd';
      ctx.font = `500 13px ${_scFont}`;
      const whyNowLines = _scWrapLimit(ctx, reco.play.whyNow, RIGHT_W - 40, 2);
      _scDrawLines(ctx, whyNowLines, RIGHT_X + 24, playY + 122, 18);

      if (audienceLine) {
        ctx.fillStyle = '#d6dee8';
        ctx.font = `700 13px ${_scFont}`;
        ctx.fillText(`${audienceLine.who}:`, RIGHT_X + 24, playY + 162);
      }
    } else {
      ctx.fillStyle = '#d6dee8';
      ctx.font = `600 15px ${_scFont}`;
      const noRecoLines = _scWrapLimit(ctx, 'Use this as strategic context while tracking adjacent institutional moves.', RIGHT_W - 40, 4);
      _scDrawLines(ctx, noRecoLines, RIGHT_X + 24, playY + 26, 20);
    }

    // CTA row — pill-shaped buttons with clear primary/secondary hierarchy.
    const ctaH = 28;
    const ctaGap = 9;
    const ctaTotalH = 3 * ctaH + 2 * ctaGap;
    const ctaY = rightY + rightH - ctaTotalH - 26;
    const ctaW = RIGHT_W - 28;
    const ctaX = RIGHT_X + 14;
    const ctas = reco
      ? [
          `Read the full Playbook: ${playbook?.short || 'Playbook'}`,
          `See all ${playbook?.short || themeLabel} signals`,
          'Discuss with NextFi Advisors'
        ]
      : ['Browse all playbooks', 'Explore related institutional signals', 'Discuss with NextFi Advisors'];

    for (let i = 0; i < ctas.length; i++) {
      const y = ctaY + i * (ctaH + ctaGap);
      ctx.fillStyle = i === 0 ? tc : 'rgba(255,255,255,0.10)';
      _scRoundRect(ctx, ctaX, y, ctaW, ctaH, 6);
      ctx.fill();
      ctx.fillStyle = i === 0 ? '#04131a' : '#d7e0eb';
      ctx.font = `700 13px ${_scFont}`;
      ctx.textBaseline = 'middle';
      const line = _scWrapLimit(ctx, ctas[i], ctaW - 16, 1)[0];
      ctx.fillText(line, ctaX + 10, y + ctaH / 2);
      ctx.textBaseline = 'top';
    }

    ctx.fillStyle = '#7f8d9d';
    ctx.font = `500 12px ${_scFont}`;
    ctx.fillText('streetsignals.nextfiadvisors.com', ctaX, rightY + rightH - 16);

    return canvas;
  }

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
    shareLinkedInBtn.addEventListener('click', () => {
      try {
        shareLinkedInBtn.disabled = true;
        shareLinkedInBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity="0.3"/></svg>Generating...';

        const canvas = _buildShareCanvas();
        canvas.toBlob(b => {
          const url = URL.createObjectURL(b);
          const a = document.createElement('a');
          a.href = url; a.download = `sfts-${params.id}.png`; a.click();
          URL.revokeObjectURL(url);
          setTimeout(() => {
            const signalUrl = encodeURIComponent(window.location.href);
            window.open(
              `https://www.linkedin.com/sharing/share-offsite/?url=${signalUrl}`,
              'linkedin-share', 'width=550,height=680'
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
