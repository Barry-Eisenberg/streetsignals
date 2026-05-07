// =====================================================================
// routes-radar.js — Institutional Positioning Radar
// =====================================================================

// Helper: compute scores for a given institution across the 3 themes.
// Score is normalized 0–100 from signal-tier-weighted counts within last 12mo.
function computeInstitutionScores(institutionName) {
  const TIER_WEIGHT = { Structural: 3, Material: 1.5, Context: 0.5, Noise: 0.1 };
  const out = { tokenized: 0, stablecoins: 0, dlt: 0, total: 0 };
  const sigs = SftSData.signals.filter(s =>
    (s.institution || '').toLowerCase().includes(institutionName.toLowerCase()) &&
    (s._daysOld === null || s._daysOld <= 365)
  );
  for (const s of sigs) {
    const w = TIER_WEIGHT[s._tier] || 0.5;
    for (const t of (s._themes || [])) {
      out[t] = (out[t] || 0) + w;
    }
    out.total += w;
  }
  // Normalize to 0–100 — anchored so 30 weighted points (= a heavy-presence institution) maps to 90.
  const norm = (v) => Math.min(100, Math.round((v / 30) * 90));
  return {
    tokenized: norm(out.tokenized),
    stablecoins: norm(out.stablecoins),
    dlt: norm(out.dlt),
    sigCount: sigs.length
  };
}

function computePeerGroupScores(peerInstitutions) {
  if (!peerInstitutions.length) return { tokenized: 0, stablecoins: 0, dlt: 0 };
  const all = peerInstitutions.map(name => computeInstitutionScores(name));
  return {
    tokenized: Math.round(all.reduce((a, x) => a + x.tokenized, 0) / all.length),
    stablecoins: Math.round(all.reduce((a, x) => a + x.stablecoins, 0) / all.length),
    dlt: Math.round(all.reduce((a, x) => a + x.dlt, 0) / all.length)
  };
}

// Pre-defined peer groups (built from real institutions in the dataset)
const PEER_GROUPS = {
  global_banks: { label: 'Global Banks', members: ['JPMorgan Chase', 'Goldman Sachs', 'Morgan Stanley', 'BNY Mellon', 'Citigroup', 'HSBC', 'Wells Fargo'] },
  asset_managers: { label: 'Global Asset Managers', members: ['BlackRock', 'Fidelity', 'Franklin Templeton', 'Goldman Sachs', 'Apollo'] },
  exchanges: { label: 'Exchanges & FMIs', members: ['NYSE', 'Nasdaq', 'CME', 'DTCC', 'LSE', 'Deutsche Börse'] },
  payments: { label: 'Payments Providers', members: ['Visa', 'Mastercard', 'Stripe', 'PayPal', 'Swift'] },
  regulators: { label: 'Regulators', members: ['SEC', 'CFTC', 'Federal Reserve', 'FCA', 'ESMA', 'BIS', 'ECB'] }
};

// Featured institutions (those with enough signal volume)
function getFeaturedInstitutions() {
  const counts = new Map();
  for (const s of SftSData.signals) {
    const k = s.institution || '';
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([k, n]) => n >= 4)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}

function radarSVG(youScores, peerScores, color) {
  // Box: 540 x 440 (extra horizontal room for left/right labels)
  const cx = 270, cy = 220, R = 170;
  const angles = [-90, 30, 150]; // top, lower-right, lower-left
  const labels = ['Tokenized', 'Stablecoins', 'DLT & Infra'];
  const keys = ['tokenized', 'stablecoins', 'dlt'];
  const gridLevels = [25, 50, 75, 100];

  const polar = (a, r) => {
    const rad = a * Math.PI / 180;
    return [cx + Math.cos(rad) * r, cy + Math.sin(rad) * r];
  };

  let gridHTML = '';
  for (const lvl of gridLevels) {
    const pts = angles.map(a => polar(a, R * lvl / 100).map(n => n.toFixed(1)).join(',')).join(' ');
    gridHTML += `<polygon points="${pts}" fill="none" stroke="var(--color-divider)" stroke-width="1" stroke-dasharray="${lvl === 100 ? '0' : '3 3'}" opacity="0.6"/>`;
  }

  // axis lines + scale labels (25/50/75/100) on the top axis only
  let axisHTML = '';
  for (let i = 0; i < 3; i++) {
    const [x, y] = polar(angles[i], R);
    axisHTML += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--color-divider)" stroke-width="1" />`;
  }

  const peerPts = angles.map((a, i) => polar(a, R * (peerScores[keys[i]] || 0) / 100).map(n => n.toFixed(1)).join(',')).join(' ');
  const youPts  = angles.map((a, i) => polar(a, R * (youScores[keys[i]]  || 0) / 100).map(n => n.toFixed(1)).join(',')).join(' ');

  let labelHTML = '';
  for (let i = 0; i < 3; i++) {
    const labelR = i === 0 ? R + 26 : R + 36;
    const [x, y] = polar(angles[i], labelR);
    const anchor = i === 0 ? 'middle' : (i === 1 ? 'start' : 'end');
    labelHTML += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" font-size="13" font-family="var(--font-display)" font-weight="700" fill="var(--color-text)">${labels[i]}</text>`;
    // score badge at the institution's polygon vertex
    const [bx, by] = polar(angles[i], R * (youScores[keys[i]] || 0) / 100);
    labelHTML += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="5" fill="${color}" stroke="var(--color-bg)" stroke-width="2"/>`;
  }

  return `<svg viewBox="0 0 540 440" width="100%" style="max-width: 540px; margin: auto; display:block;">
    ${gridHTML}
    ${axisHTML}
    <polygon points="${peerPts}" fill="rgba(138, 156, 196, 0.15)" stroke="var(--color-text-muted)" stroke-width="1.5" stroke-dasharray="6 4" />
    <polygon points="${youPts}" fill="${color.replace('var(', 'color-mix(in oklab, var(').replace(')', ') 25%, transparent)')}" stroke="${color}" stroke-width="2.5" />
    ${labelHTML}
  </svg>`;
}

function statusFromScores(you, peer) {
  const diff = you - peer;
  if (diff >= 8) return { label: 'Ahead', cls: 'status-ahead' };
  if (diff <= -8) return { label: 'Behind', cls: 'status-behind' };
  return { label: 'Aligned', cls: 'status-aligned' };
}

SftSRouter.defineRoute('/radar', async ({ root, query }) => {
  const featured = getFeaturedInstitutions();
  // Pull from query if present
  const q = new URLSearchParams(query);
  let selectedInst = q.get('inst') || featured[0] || 'JPMorgan Chase';
  let selectedPeer = q.get('peer') || 'global_banks';

  function render() {
    const youScores = computeInstitutionScores(selectedInst);
    const peerGroup = PEER_GROUPS[selectedPeer];
    const peerScores = computePeerGroupScores(peerGroup.members.filter(m => m.toLowerCase() !== selectedInst.toLowerCase()));
    const themeColor = 'var(--color-primary)';

    root.innerHTML = `
      <section class="container container--wide">
        <div class="page-hero">
          <div class="page-hero-eyebrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            Competitive Intelligence
          </div>
          <h1>Institutional <span class="accent">Positioning Radar</span></h1>
          <p class="page-hero-lead">Benchmark an institution's digital-asset posture across the three Decision Playbook themes. Scores derive from the importance-weighted signal density over the last 12 months.</p>
        </div>

        <div class="demo-banner">
          <strong>Prototype:</strong> Scores below are computed live from public SftS signal data.
          Private institution-specific radars (with proprietary positioning weights) are available via NextFi engagements.
        </div>

        <div class="radar-shell">
          <div class="radar-controls">
            <label>Select institution</label>
            <select id="instSelect">
              ${featured.slice(0, 30).map(name => `<option value="${R.escapeHTML(name)}" ${name === selectedInst ? 'selected' : ''}>${R.escapeHTML(name)}</option>`).join('')}
            </select>

            <label>Compare against peer group</label>
            <select id="peerSelect">
              ${Object.entries(PEER_GROUPS).map(([k, v]) => `<option value="${k}" ${k === selectedPeer ? 'selected' : ''}>${R.escapeHTML(v.label)}</option>`).join('')}
            </select>

            <div style="margin-top: var(--space-5); padding-top: var(--space-5); border-top: 1px solid var(--color-divider);">
              <div style="display:flex; align-items:center; gap: var(--space-2); margin-bottom: var(--space-2);">
                <span style="width:14px; height:3px; background: var(--color-primary);"></span>
                <span style="font-size:0.86rem; color: var(--color-text);">${R.escapeHTML(selectedInst)}</span>
              </div>
              <div style="display:flex; align-items:center; gap: var(--space-2);">
                <span style="width:14px; height:0; border-top: 2px dashed var(--color-text-muted);"></span>
                <span style="font-size:0.86rem; color: var(--color-text-muted);">${R.escapeHTML(peerGroup.label)} (peer avg)</span>
              </div>
            </div>

            <div style="margin-top: var(--space-5); font-size: 0.84rem; color: var(--color-text-muted);">
              Based on <strong style="color:var(--color-text);">${youScores.sigCount}</strong> signals from ${R.escapeHTML(selectedInst)} in the last 12 months.
            </div>
          </div>

          <div class="radar-canvas">
            ${radarSVG(youScores, peerScores, themeColor)}
            <div class="theme-scores">
              ${[
                { id: 'tokenized', label: 'Tokenized Funds & RWAs' },
                { id: 'stablecoins', label: 'Stablecoins & Settlement' },
                { id: 'dlt', label: 'Market Infra & DLT' }
              ].map(t => {
                const you = youScores[t.id], peer = peerScores[t.id];
                const status = statusFromScores(you, peer);
                const tcolor = SftSData.THEMES[t.id].color;
                return `<div class="theme-score-card" style="--theme-color:${tcolor}">
                  <h5>${R.escapeHTML(t.label)}</h5>
                  <div class="scores">
                    <span class="you tabular-nums">${you}</span>
                    <span class="vs">vs peer</span>
                    <span class="peer tabular-nums">${peer}</span>
                  </div>
                  <span class="theme-score-status ${status.cls}">${status.label}</span>
                  <div style="margin-top: var(--space-3); display:flex; flex-direction:column; gap:6px;">
                    <a href="#/signals?theme=${t.id}" style="font-size:0.84rem; color:${tcolor};">Underlying signals →</a>
                    <a href="#/playbooks/${t.id}" style="font-size:0.84rem; color: var(--color-text-muted);">${R.escapeHTML(SftSPlaybooks.PLAYBOOKS[t.id].label)} playbook →</a>
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>

        <section class="site-section">
          <div class="cta-banner">
            <div class="section-eyebrow">Private radar</div>
            <h3>Get a tailored radar for your institution</h3>
            <p>The public radar uses public-signal density. NextFi delivers private radars that combine internal positioning data, qualitative interviews, and SftS signal density into a single boardroom-ready brief.</p>
            <div class="cluster">
              <a class="btn btn--primary" href="https://nextfiadvisors.com/contact" target="_blank" rel="noopener noreferrer">Request a private radar ${R.extIcon}</a>
              <a class="btn btn--outline" href="#/methodology">How scoring works</a>
            </div>
          </div>
        </section>
      </section>
    `;

    root.querySelector('#instSelect')?.addEventListener('change', e => {
      selectedInst = e.target.value;
      const u = new URLSearchParams(); u.set('inst', selectedInst); u.set('peer', selectedPeer);
      history.replaceState(null, '', `#/radar?${u}`);
      render();
    });
    root.querySelector('#peerSelect')?.addEventListener('change', e => {
      selectedPeer = e.target.value;
      const u = new URLSearchParams(); u.set('inst', selectedInst); u.set('peer', selectedPeer);
      history.replaceState(null, '', `#/radar?${u}`);
      render();
    });
  }

  render();
});
