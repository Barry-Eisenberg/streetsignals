// =====================================================================
// routes-hub.js — Intelligence Hub (homepage, route "/")
// =====================================================================

SftSRouter.defineRoute('/', async ({ root }) => {
  const all = SftSData.signals;
  const recent14 = all.filter(s => s._daysOld !== null && s._daysOld <= 14);
  const structural = all.filter(s => s._tier === 'Structural');
  const material = all.filter(s => s._tier === 'Material');

  // Top 4 priority (Structural, most recent)
  const priority = [...structural]
    .sort((a, b) => (a._daysOld || 999) - (b._daysOld || 999))
    .slice(0, 4);

  // Last source date — use the data layer's anchor (latest parsed date)
  const latest = SftSData.todayAnchor;

  root.innerHTML = `
    <section class="hub-hero">
      <div class="container container--wide">
        <div class="hub-hero-content">
          <span class="hub-eyebrow"><span class="pulse"></span> Live Intelligence Feed</span>
          <h1>The institutional migration to <span class="accent">blockchain infrastructure</span>.</h1>
          <p class="hub-hero-lead">
            SftS filters thousands of institutional moves down to the few hundred that
            actually shape market structure. Each signal is scored, contextualized,
            and connected to a credible next step — so you spend time deciding, not searching.
          </p>
          <div class="hub-hero-cta">
            <a class="btn btn--primary" href="#/signals">
              Explore the Signals workspace
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </a>
            <a class="btn btn--outline" href="#/playbooks">View Decision Playbooks</a>
          </div>
        </div>

        <div class="live-strip">
          <div class="live-strip-stat">
            <div class="label">Tracked signals</div>
            <div class="value tabular-nums">${all.length.toLocaleString()}</div>
            <div class="sub">Latest source: ${R.formatDate(latest)}</div>
          </div>
          <div class="live-strip-stat">
            <div class="label">Structural</div>
            <div class="value tabular-nums">${structural.length}<span class="delta">+${recent14.filter(s => s._tier === 'Structural').length} this 14d</span></div>
            <div class="sub">System-shaping moves</div>
          </div>
          <div class="live-strip-stat">
            <div class="label">Material</div>
            <div class="value tabular-nums">${material.length}<span class="delta">+${recent14.filter(s => s._tier === 'Material').length} this 14d</span></div>
            <div class="sub">Directionally important</div>
          </div>
          <div class="live-strip-stat">
            <div class="label">Themes mapped</div>
            <div class="value tabular-nums">3</div>
            <div class="sub">Each backed by a Decision Playbook</div>
          </div>
        </div>
      </div>
    </section>

    <section class="site-section">
      <div class="container container--wide">
        <div class="cluster" style="--align:flex-end; --gap:var(--space-4); justify-content:space-between; margin-bottom: var(--space-6);">
          <div>
            <div class="section-eyebrow">Priority signals</div>
            <h2 class="section-heading">What just shifted</h2>
            <p class="section-lead">Structural-tier signals from the last two weeks. The moves that reset what's possible — and what's expected — across institutional digital-asset infrastructure.</p>
          </div>
          <a class="btn btn--ghost" href="#/signals?tier=Structural">All Structural signals →</a>
        </div>
        <div class="priority-grid">
          ${priority.length > 0
            ? priority.map(s => R.signalRow(s)).join('')
            : R.emptyState({ title: 'No priority signals in this window', body: 'Widen the date window to see structural moves from earlier in the year.', ctaLabel: 'See all signals', ctaHref: '#/signals' })}
        </div>
      </div>
    </section>

    <section class="site-section">
      <div class="container container--wide">
        <div style="margin-bottom: var(--space-8);">
          <div class="section-eyebrow">Three themes, three playbooks</div>
          <h2 class="section-heading">Pick the angle that fits your decision</h2>
          <p class="section-lead">Every signal is mapped to one or more Decision Playbook themes. Each playbook turns the underlying signal flow into 2–3 credible plays you can actually start.</p>
        </div>
        <div class="playbook-themes">
          ${R.themeCard('tokenized')}
          ${R.themeCard('stablecoins')}
          ${R.themeCard('dlt')}
        </div>
      </div>
    </section>

    <section class="site-section">
      <div class="container container--wide">
        <div class="grid-cols-2" style="--gap:var(--space-6); align-items:center;">
          <div>
            <div class="section-eyebrow">For institutional users</div>
            <h2 class="section-heading">Stop reading every announcement. Read the few that matter.</h2>
            <p class="section-lead" style="margin-bottom: var(--space-5);">
              SftS scores every signal on importance, recency, and source credibility, then maps it to the institutions and playbook plays it actually affects. The Positioning Radar then benchmarks how your firm compares to peers across the three themes.
            </p>
            <div class="cluster" style="--gap:var(--space-3);">
              <a class="btn btn--primary" href="#/radar">Open Positioning Radar</a>
              <a class="btn btn--outline" href="#/methodology">How signals are scored</a>
            </div>
          </div>
          <div class="card card--elev" style="padding: var(--space-6);">
            <h4 style="font-family:var(--font-display); font-size:1rem; margin-bottom:var(--space-3); color:var(--color-text-strong);">Latest intelligence briefs</h4>
            <ul class="related-list">
              ${SftSData.briefs.slice(0, 4).map(b => `<a class="related-list-item" href="${b.url}" target="_blank" rel="noopener noreferrer">
                <div class="meta">${R.escapeHTML(b.source || 'NextFi Advisors')}</div>
                <div class="title">${R.escapeHTML(b.title)} ${R.extIcon}</div>
              </a>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    </section>
  `;
});
