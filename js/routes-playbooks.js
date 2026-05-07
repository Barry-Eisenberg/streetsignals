// =====================================================================
// routes-playbooks.js — playbook index and detail pages
// =====================================================================

// /playbooks — index
SftSRouter.defineRoute('/playbooks', async ({ root }) => {
  root.innerHTML = `
    <section class="container container--wide">
      <div class="page-hero">
        <div class="page-hero-eyebrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          Action-oriented intelligence
        </div>
        <h1>Decision <span class="accent">Playbooks</span></h1>
        <p class="page-hero-lead">Each playbook turns the institutional signals on this site into 2–3 credible plays for a specific theme. Read the playbook, then drop into the live signals that support each play.</p>
      </div>

      <section class="site-section site-section--top">
        <div class="grid-cols-3">
          ${['tokenized', 'stablecoins', 'dlt'].map(t => {
            const pb = SftSPlaybooks.PLAYBOOKS[t];
            const stats = SftSData.themeStats(t);
            return `<a class="theme-card" href="#/playbooks/${t}" style="--theme-color:${pb.color}">
              <div class="theme-card-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${pb.icon}</svg></div>
              <h3>${R.escapeHTML(pb.label)}</h3>
              <p>${R.escapeHTML(pb.audience)}</p>
              <div class="theme-card-stats">
                <div><span class="num tabular-nums">${pb.plays.length}</span><span class="lbl">Plays</span></div>
                <div><span class="num tabular-nums">${stats.structural}</span><span class="lbl">Structural</span></div>
                <div><span class="num tabular-nums">${stats.recent14}</span><span class="lbl">Last 14d</span></div>
              </div>
              <span class="theme-card-link">Open playbook
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </span>
            </a>`;
          }).join('')}
        </div>
      </section>

      <section class="site-section">
        <div class="section-eyebrow">Who they're for</div>
        <h2 class="section-heading">Built for institutions making real decisions</h2>
        <div class="grid-cols-3" style="margin-top: var(--space-6);">
          <div class="card">
            <h3 style="font-family: var(--font-display); font-size: 1.05rem; margin-bottom: var(--space-2); color: var(--color-text-strong);">Asset managers & institutional investors</h3>
            <p style="color: var(--color-text-muted); font-size: 0.92rem;">Design tokenized products and operating models that your CIO, board, and regulators can actually approve.</p>
          </div>
          <div class="card">
            <h3 style="font-family: var(--font-display); font-size: 1.05rem; margin-bottom: var(--space-2); color: var(--color-text-strong);">Banks, custodians & FMIs</h3>
            <p style="color: var(--color-text-muted); font-size: 0.92rem;">Decide where to modernize payments, collateral, and post-trade infrastructure without chasing every hype cycle.</p>
          </div>
          <div class="card">
            <h3 style="font-family: var(--font-display); font-size: 1.05rem; margin-bottom: var(--space-2); color: var(--color-text-strong);">Fintech & infrastructure providers</h3>
            <p style="color: var(--color-text-muted); font-size: 0.92rem;">Align your roadmap and BD focus with where institutional budgets and mandates are actually landing — not just where the noise is.</p>
          </div>
        </div>
      </section>
    </section>
  `;
});

// /playbooks/:themeId — detail
SftSRouter.defineRoute('/playbooks/:themeId', async ({ params, root }) => {
  const themeId = params.themeId;
  const pb = SftSPlaybooks.PLAYBOOKS[themeId];
  if (!pb) {
    root.innerHTML = `<div class="container site-section">${R.emptyState({
      title: 'Playbook not found', body: 'That theme isn\'t available.', ctaLabel: 'See all playbooks', ctaHref: '#/playbooks'
    })}</div>`;
    return;
  }
  const themeColor = pb.color;
  const stats = SftSData.themeStats(themeId);
  const themeSignals = SftSData.byTheme(themeId);
  const overlays = SftSData.overlayForTheme(themeId);

  // Top signals supporting each play (use audienceMatch + tier alignment)
  function signalsForPlay(play) {
    return themeSignals
      .map(s => {
        let aff = 0;
        if (play.n === 1 && (s.institution_type === 'Asset & Investment Management')) aff += 3;
        if (play.n === 2 && (s.institution_type === 'Global Banks' || s.institution_type === 'Payments Providers')) aff += 3;
        if (play.n === 3 && (s.institution_type === 'Exchanges & Central Intermediaries' || s.institution_type === 'Financial Infrastructure Operators')) aff += 3;
        if (s._tier === 'Structural') aff += 2;
        if (s._tier === 'Material') aff += 1;
        const recency = s._daysOld != null ? Math.max(0, 60 - s._daysOld) / 60 : 0;
        aff += recency * 2;
        return { s, aff };
      })
      .sort((a, b) => b.aff - a.aff)
      .slice(0, 3)
      .map(x => x.s);
  }

  // Live signals for the theme banner (top 3 most recent Structural+Material)
  const featured = themeSignals
    .filter(s => s._tier === 'Structural' || s._tier === 'Material')
    .sort((a, b) => (a._daysOld ?? 999) - (b._daysOld ?? 999))
    .slice(0, 3);

  root.innerHTML = `
    <div class="container container--wide" style="--theme-color:${themeColor}">
      <nav class="detail-breadcrumb">
        <a href="#/playbooks">Decision Playbooks</a>
        <span class="detail-breadcrumb-sep">→</span>
        <span>${R.escapeHTML(pb.label)}</span>
      </nav>

      <section class="playbook-detail-hero" style="--theme-color:${themeColor}">
        <div class="page-hero-eyebrow" style="color:${themeColor};">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${pb.icon}</svg>
          Decision Playbook
        </div>
        <h1>${R.escapeHTML(pb.label)}</h1>
        <p class="page-hero-lead">${R.escapeHTML(pb.audience)}</p>
        <div style="display:flex; flex-wrap:wrap; gap: var(--space-3); margin-top: var(--space-5);">
          <span class="pill"><span class="tabular-nums">${stats.total}</span> total signals</span>
          <span class="pill"><span class="tabular-nums">${stats.structural}</span> Structural</span>
          <span class="pill"><span class="tabular-nums">${stats.material}</span> Material</span>
          <span class="pill"><span class="tabular-nums">${stats.recent14}</span> in last 14d</span>
        </div>
      </section>

      <section class="site-section site-section--top">
        <div class="section-eyebrow">Current market picture</div>
        <h2 class="section-heading">${R.escapeHTML(pb.snapshot.summary)}</h2>

        <div class="snapshot-grid">
          <div class="snapshot-col" style="--theme-color:${themeColor}">
            <h4>Institutional signals (SftS)</h4>
            <ul>${pb.snapshot.sftsBullets.map(b => `<li>${R.escapeHTML(b)}</li>`).join('')}</ul>
          </div>
          <div class="snapshot-col" style="--theme-color:${themeColor}">
            <h4>On-chain flows (Dune / rwa.xyz)</h4>
            <ul>${pb.snapshot.onchainBullets.map(b => `<li>${R.escapeHTML(b)}</li>`).join('')}</ul>
            ${overlays.length ? `<div style="display:grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px dashed var(--color-divider);">
              ${overlays.slice(0, 2).map(o => `<div>
                <div style="font-size: 0.74rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">${R.escapeHTML(o.metric_label || '')}</div>
                <div style="font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; color: var(--color-text-strong); font-variant-numeric: tabular-nums;">${typeof o.value === 'number' ? '$' + R.fmtCompact(o.value) : '—'}</div>
                ${o.change_30d != null ? `<div class="${o.change_30d > 0 ? 'delta-up' : 'delta-down'}" style="font-size:0.82rem; font-weight: 600;">${R.fmtPct(o.change_30d)} 30d</div>` : ''}
              </div>`).join('')}
            </div>` : ''}
          </div>
        </div>

        ${featured.length ? `<div style="margin-top: var(--space-6);">
          <h4 style="font-size: 0.78rem; letter-spacing: 0.10em; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: var(--space-3);">Live structural & material signals in this theme</h4>
          <div class="workspace-list">${featured.map(s => R.signalRow(s, { compact: true })).join('')}</div>
          <div style="text-align: right; margin-top: var(--space-3);">
            <a class="btn btn--ghost btn--sm" href="#/signals?theme=${themeId}">All ${themeSignals.length} signals in this theme →</a>
          </div>
        </div>` : ''}
      </section>

      <section class="site-section">
        <div class="section-eyebrow">Three credible plays · 2026–2028</div>
        <h2 class="section-heading">Pick the play that matches your starting point</h2>

        <div class="play-list" style="margin-top: var(--space-6);">
          ${pb.plays.map(play => {
            const supporting = signalsForPlay(play);
            return `<div class="play-card" style="--theme-color:${themeColor}">
              <div class="play-card-head">
                <div class="play-card-num">${play.n}</div>
                <div class="play-card-title">
                  <h3>${R.escapeHTML(play.title)}</h3>
                  <p class="play-card-oneliner">${R.escapeHTML(play.oneliner)}</p>
                </div>
              </div>
              <div class="play-body">
                <div>
                  <h5>What it is</h5>
                  <p>${R.escapeHTML(play.what)}</p>
                  <h5 style="margin-top: var(--space-4);">Why it's credible now</h5>
                  <p>${R.escapeHTML(play.whyNow)}</p>
                </div>
                <div>
                  <h5>Best fit if you are</h5>
                  <ul class="play-best-fit">
                    ${play.bestFit.map(b => `<li><strong>${R.escapeHTML(b.who)}</strong>${R.escapeHTML(b.why)}</li>`).join('')}
                  </ul>
                </div>
              </div>
              ${supporting.length ? `<div class="play-supporting-signals">
                <h5>Supporting signals from this play's audience</h5>
                <div class="workspace-list">${supporting.map(s => R.signalRow(s, { compact: true })).join('')}</div>
              </div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </section>

      <section class="site-section">
        <div class="section-eyebrow">Before you pick a play</div>
        <h2 class="section-heading">Common pitfalls & prerequisites</h2>
        <ul class="pitfalls">
          ${pb.pitfalls.map(p => `<li>${R.escapeHTML(p)}</li>`).join('')}
        </ul>
      </section>

      <section class="site-section">
        <div class="cta-banner" style="--theme-color:${themeColor}">
          <div class="section-eyebrow" style="color:${themeColor};">How NextFi can help</div>
          <h3>Turning this playbook into your roadmap</h3>
          <p>${R.escapeHTML(pb.nextfi.lead)}</p>
          <ul style="margin: var(--space-4) 0; padding-left: var(--space-5); color: var(--color-text-muted);">
            ${pb.nextfi.bullets.map(b => `<li style="margin-bottom: var(--space-2);">${R.escapeHTML(b)}</li>`).join('')}
          </ul>
          <div class="cluster">
            ${pb.nextfi.ctas.map(c => `<a class="btn ${c.primary ? 'btn--primary' : 'btn--outline'}" href="https://nextfiadvisors.com/contact" target="_blank" rel="noopener noreferrer">${R.escapeHTML(c.label)} ${R.extIcon}</a>`).join('')}
          </div>
        </div>
      </section>
    </div>
  `;
});
