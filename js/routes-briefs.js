// =====================================================================
// routes-briefs.js — Intelligence Briefs library (/briefs)
// =====================================================================

SftSRouter.defineRoute('/briefs', async ({ root }) => {
  const briefs = (SftSData.briefs || [])
    .slice()
    .sort((a, b) => {
      // Newest first by date, undated fall to bottom
      if (a.date && b.date) return a.date < b.date ? 1 : -1;
      if (a.date) return -1;
      if (b.date) return 1;
      return 0;
    });

  const briefCard = (b) => {
    const dateStr = b.date ? R.formatDate(b.date) : null;
    const rel = b.date ? R.relativeDate(b.date) : null;
    return `
      <a class="brief-card" href="${R.escapeHTML(b.url)}" target="_blank" rel="noopener noreferrer">
        <div class="brief-card-body">
          <h3 class="brief-card-title">${R.escapeHTML(b.title)}</h3>
          ${b.desc ? `<p class="brief-card-desc">${R.escapeHTML(b.desc)}</p>` : ''}
        </div>
        <div class="brief-card-footer">
          <span class="brief-card-source">${R.escapeHTML(b.source || 'NextFi Advisors')}</span>
          ${dateStr ? `<span class="brief-card-date" title="${dateStr}">${rel || dateStr}</span>` : ''}
          <span class="brief-card-cta">Read brief ${R.extIcon}</span>
        </div>
      </a>`;
  };

  root.innerHTML = `
    <section class="container container--wide">
      <div class="page-hero">
        <div class="page-hero-eyebrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
          Intelligence Briefs
        </div>
        <h1>Research &amp; <span class="accent">Analysis</span></h1>
        <p class="page-hero-lead">
          Structured research briefs from NextFi Advisors — each one translating market signals into actionable intelligence for institutional leaders navigating digital-asset infrastructure decisions.
        </p>
        <div class="cluster" style="--gap:var(--space-3); margin-top: var(--space-5);">
          <a class="btn btn--primary" href="${R.nextFiContactUrl({ context: 'briefs_page', sourceUrl: window.location.href })}">
            Work with NextFi
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </a>
          <a class="btn btn--outline" href="#/signals">Explore Signals</a>
        </div>
      </div>
    </section>

    <section class="site-section site-section--compact-top">
      <div class="container container--wide">
        <div class="cluster" style="--align:flex-end; --gap:var(--space-4); justify-content:space-between; margin-bottom: var(--space-6);">
          <div>
            <div class="section-eyebrow section-eyebrow--lg">${briefs.length} briefs published</div>
            <p class="section-lead">Sorted newest first. Each brief is available as a PDF.</p>
          </div>
        </div>
        <div class="briefs-grid">
          ${briefs.map(briefCard).join('')}
        </div>
      </div>
    </section>

    <section class="site-section">
      <div class="container container--narrow" style="text-align:center;">
        <div class="section-eyebrow">Want the full picture?</div>
        <h2 class="section-heading">Get bespoke intelligence from NextFi</h2>
        <p class="section-lead" style="margin-bottom: var(--space-6);">
          These briefs are the public layer. NextFi Advisors produces custom research, decision-support analysis, and strategic advisory for institutional clients who need more than a signal feed.
        </p>
        <a class="btn btn--primary btn--lg" href="${R.nextFiContactUrl({ context: 'briefs_page_cta', sourceUrl: window.location.href })}">
          Talk to the NextFi team
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </a>
      </div>
    </section>
  `;
});
