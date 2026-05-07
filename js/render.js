// =====================================================================
// render.js — shared HTML rendering helpers.
// All public API is on window.R.
// =====================================================================

const escapeHTML = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatDate = (s) => {
  if (!s) return '—';
  // ISO-style first
  if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.slice(0, 10));
    return isNaN(d) ? s : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  if (s instanceof Date) {
    return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const d = new Date(s);
  if (!isNaN(d.getTime()) && d.getFullYear() > 2015) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return String(s);
};

const relativeDate = (iso) => {
  const days = SftSData.daysSince(iso);
  if (days == null) return '';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7)   return `${days}d ago`;
  if (days < 30)  return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const fmtCompact = (n) => {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9)  return (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6)  return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3)  return (n / 1e3).toFixed(1) + 'k';
  return String(Math.round(n));
};

const fmtPct = (decimal) => {
  if (decimal == null) return '—';
  // Sanity cap — source data sometimes contains absurd ratios from buggy queries
  if (Math.abs(decimal) > 50) return '>+5,000%'; // cap display, exact value omitted
  const pct = decimal * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
};

// ---- Tier pill ----
function tierPill(tier) {
  const cls = `tier-pill tier-pill--${tier ? tier.toLowerCase() : 'context'}`;
  return `<span class="${cls}">${escapeHTML(tier || 'Context')}</span>`;
}

// ---- Theme tag ----
// Pass { asLink: false } to render as <span> instead of <a> — needed when the
// theme-tag is rendered inside another <a> (e.g., a clickable signal-row).
function themeTag(themeId, opts = {}) {
  const t = SftSData.THEMES[themeId];
  if (!t) return '';
  const asLink = opts.asLink !== false;
  const tagName = asLink ? 'a' : 'span';
  const href = asLink ? `href="${t.href}"` : '';
  return `<${tagName} class="theme-tag ${t.cssClass}" ${href}>${escapeHTML(t.short)}</${tagName}>`;
}

function themeTagsFor(signal, opts = {}) {
  if (!signal._themes || signal._themes.length === 0) {
    return `<span class="theme-tag theme-tag--mixed">No theme tag</span>`;
  }
  return signal._themes.map(t => themeTag(t, opts)).join('');
}

// ---- Category tag ----
function catTag(categoryId) {
  const c = SftSData.CATEGORY_LABELS[categoryId];
  if (!c) return '';
  return `<span class="cat-tag" style="--cat-color:${c.color}">${escapeHTML(c.label)}</span>`;
}

// ---- Signal row (used in workspace, related lists, embedded feeds) ----
function signalRow(s, opts = {}) {
  const compact = opts.compact ? ' signal-row--compact' : '';
  const themeColor = (s._themes && s._themes[0])
    ? SftSData.THEMES[s._themes[0]].color
    : 'var(--color-divider)';
  return `
    <a class="signal-row tier--${(s._tier || 'context').toLowerCase()}${compact}"
       href="#/signals/${s._id}"
       style="--theme-color:${themeColor}">
      <div class="signal-row-tier">
        ${tierPill(s._tier)}
        <span class="signal-row-date tabular-nums">${escapeHTML(relativeDate(s.date))}</span>
      </div>
      <div class="signal-row-body">
        <div class="signal-row-meta">
          <span class="institution">${escapeHTML(s.institution || '—')}</span>
          <span class="dot">·</span>
          <span>${escapeHTML(s.signal_type || '')}</span>
          ${s._themes && s._themes.length ? `<span class="dot">·</span>${themeTagsFor(s, { asLink: false })}` : ''}
        </div>
        <h3>${escapeHTML(s.initiative || s.description?.slice(0, 90) || 'Untitled signal')}</h3>
        ${!opts.compact && s.description ? `<p class="signal-row-summary">${escapeHTML(s.description)}</p>` : ''}
        ${!opts.compact ? `<div class="signal-row-tags">
          ${(s.initiative_types || []).slice(0, 3).map(it => `<span class="pill pill--soft">${escapeHTML(it)}</span>`).join('')}
        </div>` : ''}
      </div>
      <svg class="signal-row-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
    </a>`;
}

// ---- Theme card (used on Hub) ----
function themeCard(themeId) {
  const t = SftSData.THEMES[themeId];
  const stats = SftSData.themeStats(themeId);
  const overlays = SftSData.overlayForTheme(themeId);
  const overlayLine = overlays.length ? `<div class="theme-card-stats">
      ${overlays.slice(0, 2).map(o => `<div>
        <span class="num">${typeof o.value === 'number' ? '$' + fmtCompact(o.value) : '—'}</span>
        <span class="lbl">${escapeHTML(o.metric_label || '').slice(0, 36)}</span>
      </div>`).join('')}
    </div>` : '';
  return `<a class="theme-card" href="${t.href}" style="--theme-color:${t.color}">
    <div class="theme-card-icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${(window.SftSPlaybooks?.PLAYBOOKS[themeId]?.icon) || ''}</svg>
    </div>
    <h3>${escapeHTML(t.label)}</h3>
    <p>${escapeHTML(t.description)}</p>
    <div class="theme-card-stats">
      <div><span class="num tabular-nums">${stats.structural}</span><span class="lbl">Structural</span></div>
      <div><span class="num tabular-nums">${stats.material}</span><span class="lbl">Material</span></div>
      <div><span class="num tabular-nums">${stats.recent14}</span><span class="lbl">Last 14d</span></div>
    </div>
    ${overlayLine}
    <span class="theme-card-link">View Playbook
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
    </span>
  </a>`;
}

// ---- Skeleton list ----
function skeletonRows(n = 4) {
  return Array(n).fill(0).map(() => '<div class="skeleton skel-row"></div>').join('');
}

// ---- Empty state ----
function emptyState({ title, body, ctaLabel, ctaHref, icon } = {}) {
  return `<div class="empty-state">
    ${icon || `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>`}
    <h3>${escapeHTML(title || 'Nothing here yet')}</h3>
    <p>${escapeHTML(body || 'Try widening your filters or coming back later.')}</p>
    ${ctaLabel ? `<a class="btn btn--outline" href="${ctaHref || '#/signals'}">${escapeHTML(ctaLabel)}</a>` : ''}
  </div>`;
}

// ---- External-link icon ----
const extIcon = `<svg class="ext-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 5h5v5M19 5l-9 9M19 12v6a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1h6"/></svg>`;

window.R = {
  escapeHTML, formatDate, relativeDate, fmtCompact, fmtPct,
  tierPill, themeTag, themeTagsFor, catTag,
  signalRow, themeCard, skeletonRows, emptyState, extIcon
};
