// =====================================================================
// routes-meta.js — Methodology & About pages
// =====================================================================

SftSRouter.defineRoute('/methodology', async ({ root }) => {
  root.innerHTML = `
    <section class="container container--wide">
      <div class="page-hero">
        <div class="page-hero-eyebrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
          Methodology
        </div>
        <h1>How <span class="accent">signals</span> are scored</h1>
        <p class="page-hero-lead">Every signal is classified, scored, and mapped to a Decision Playbook theme using a transparent, version-controlled methodology. Below is the full process from ingestion to importance tier.</p>
      </div>

      <section class="site-section site-section--top">
        <div class="grid-cols-3" style="--gap: var(--space-5);">
          <div class="card">
            <div class="section-eyebrow">Step 1</div>
            <h3 style="font-family:var(--font-display); margin-bottom:var(--space-3); color:var(--color-text-strong);">Ingest & filter</h3>
            <p style="color:var(--color-text-muted); font-size:0.92rem;">Auto-ingest from primary regulatory sources (BIS, Federal Reserve, ECB, FCA, ESMA, SEC, CFTC), institutional press, and trade publications. The ingestion layer rejects fragmentary labels and headline-token leakage; canonical institution aliases normalize names.</p>
          </div>
          <div class="card">
            <div class="section-eyebrow">Step 2</div>
            <h3 style="font-family:var(--font-display); margin-bottom:var(--space-3); color:var(--color-text-strong);">Classify</h3>
            <p style="color:var(--color-text-muted); font-size:0.92rem;">Each signal is tagged with a signal_type, institution_type, FMI areas, initiative_types, and category — using the canonical taxonomy. The decision tree resolves overlap (e.g., Tokenized Securities vs. Crypto / Digital Assets) before scoring.</p>
          </div>
          <div class="card">
            <div class="section-eyebrow">Step 3</div>
            <h3 style="font-family:var(--font-display); margin-bottom:var(--space-3); color:var(--color-text-strong);">Score & tier</h3>
            <p style="color:var(--color-text-muted); font-size:0.92rem;">Importance score combines signal-type weight, institution gravity, FMI breadth, recency decay, and source credibility. Scores bucket into four tiers: Structural · Material · Context · Noise.</p>
          </div>
        </div>
      </section>

      <section class="site-section">
        <div class="section-eyebrow">Importance tiers</div>
        <h2 class="section-heading">What the four tiers mean</h2>
        <div class="grid-cols-2" style="margin-top: var(--space-5); --gap: var(--space-4);">
          <div class="card" style="border-left: 3px solid var(--color-tier-structural); padding-left: var(--space-5);">
            <div style="display:flex; align-items:center; gap: var(--space-3); margin-bottom: var(--space-3);">
              ${R.tierPill('Structural')}
              <span style="font-size: 0.84rem; color: var(--color-text-muted); letter-spacing: 0.04em;">System-shaping</span>
            </div>
            <p style="color: var(--color-text);">Likely to influence core market structure and long-term institutional operating models. Resets execution assumptions over the next 12–24 months.</p>
          </div>
          <div class="card" style="border-left: 3px solid var(--color-tier-material); padding-left: var(--space-5);">
            <div style="display:flex; align-items:center; gap: var(--space-3); margin-bottom: var(--space-3);">
              ${R.tierPill('Material')}
              <span style="font-size: 0.84rem; color: var(--color-text-muted); letter-spacing: 0.04em;">Directionally important</span>
            </div>
            <p style="color: var(--color-text);">Meaningful implications for strategy, product, or operating design. Worth tracking and likely to affect roadmaps over 6–18 months.</p>
          </div>
          <div class="card" style="border-left: 3px solid var(--color-tier-context); padding-left: var(--space-5);">
            <div style="display:flex; align-items:center; gap: var(--space-3); margin-bottom: var(--space-3);">
              ${R.tierPill('Context')}
              <span style="font-size: 0.84rem; color: var(--color-text-muted); letter-spacing: 0.04em;">Background signal</span>
            </div>
            <p style="color: var(--color-text);">Provides context but unlikely to drive immediate structural change. Useful for narrative tracking and pattern recognition.</p>
          </div>
          <div class="card" style="border-left: 3px solid var(--color-tier-noise); padding-left: var(--space-5);">
            <div style="display:flex; align-items:center; gap: var(--space-3); margin-bottom: var(--space-3);">
              ${R.tierPill('Noise')}
              <span style="font-size: 0.84rem; color: var(--color-text-muted); letter-spacing: 0.04em;">Filtered out</span>
            </div>
            <p style="color: var(--color-text);">Below the threshold. Stored for completeness but not surfaced in default views — the noise that SftS exists to filter.</p>
          </div>
        </div>
      </section>

      <section class="site-section">
        <div class="section-eyebrow">Score formula</div>
        <h2 class="section-heading">What goes into the score</h2>
        <p class="section-lead" style="margin-bottom: var(--space-5);">The aggregate score is a bounded function of five inputs, designed so that prolific sources can't dominate matrix totals.</p>

        <div class="card card--elev" style="padding: var(--space-7);">
          <pre style="font-family: var(--font-mono); font-size: 0.92rem; color: var(--color-text); white-space: pre-wrap; line-height: 1.7;">
score(signal) =
    baseWeight(signal_type)
  + institutionGravity(institution_type, name)
  + fmiBreadth(fmi_areas)
  + recencyBoost(daysSince(date))
  + sourceCredibility(source_priority)
  − unclassifiedPenalty(initiative_types == [])
  
tier =
    score ≥ 70  →  Structural
    score ≥ 50  →  Material
    score ≥ 25  →  Context
    score < 25  →  Noise</pre>
        </div>

        <p style="margin-top: var(--space-5); color: var(--color-text-muted); font-size: 0.92rem;">When a persona lens is selected, a second pass adjusts the tier per signal: Structural is never demoted, but Material can elevate to Structural for a high-relevance persona, and Context can elevate to Material when persona-relevance is high.</p>
      </section>

      <section class="site-section">
        <div class="section-eyebrow">Theme mapping</div>
        <h2 class="section-heading">Signals → playbook themes</h2>
        <p class="section-lead" style="margin-bottom: var(--space-5);">Every signal maps to zero or more of the three Decision Playbook themes, based on its initiative_types — with FMI-area and description fallbacks for signals with empty initiative_types.</p>
        <div class="grid-cols-3" style="--gap: var(--space-4);">
          ${['tokenized', 'stablecoins', 'dlt'].map(t => {
            const theme = SftSData.THEMES[t];
            const count = SftSData.byTheme(t).length;
            return `<div class="card" style="border-left: 3px solid ${theme.color};">
              <h3 style="font-family: var(--font-display); margin-bottom: var(--space-2); color: var(--color-text-strong);">${R.escapeHTML(theme.label)}</h3>
              <p style="color: var(--color-text-muted); font-size: 0.92rem; margin-bottom: var(--space-3);">${R.escapeHTML(theme.description)}</p>
              <div style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: ${theme.color};" class="tabular-nums">${count}</div>
              <div style="font-size: 0.78rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em;">signals mapped</div>
            </div>`;
          }).join('')}
        </div>
      </section>

      <section class="site-section">
        <div class="cta-banner">
          <div class="section-eyebrow">Open methodology</div>
          <h3>The full taxonomy and schemas are public</h3>
          <p>Every classification rule, alias map, and importance weight lives in version-controlled JSON Schema files. The scoring is not a black box.</p>
          <div class="cluster">
            <a class="btn btn--outline" href="https://github.com/Barry-Eisenberg/streetsignals/tree/main/taxonomy" target="_blank" rel="noopener noreferrer">View taxonomy on GitHub ${R.extIcon}</a>
            <a class="btn btn--ghost" href="#/about">About the team</a>
          </div>
        </div>
      </section>
    </section>
  `;
});

SftSRouter.defineRoute('/about', async ({ root }) => {
  root.innerHTML = `
    <section class="container container--wide">
      <div class="page-hero">
        <div class="page-hero-eyebrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          About SftS
        </div>
        <h1>An <span class="accent">institutional filter</span> for blockchain infrastructure.</h1>
        <p class="page-hero-lead">Signals from the Street is a market-intelligence product from NextFi Advisors. We track how the world's leading financial institutions, exchanges, central intermediaries, and regulators are building the next generation of financial market infrastructure — and we filter out the noise so you don't have to.</p>
      </div>

      <section class="site-section site-section--top">
        <div class="grid-cols-2" style="--gap: var(--space-8); align-items: start;">
          <div>
            <div class="section-eyebrow">What we do</div>
            <h2 class="section-heading">Filter, score, and connect to action</h2>
            <p style="color: var(--color-text-muted); margin-bottom: var(--space-4);">The signal landscape is overwhelming. Hundreds of announcements, papers, pilots, and partnerships hit the wire every week. Most of them are noise. SftS exists to surface the few that actually shape institutional digital-asset market structure — and to make sure you can act on them.</p>
            <p style="color: var(--color-text-muted);">Three surfaces, one workflow:</p>
            <ul style="color: var(--color-text); margin-top: var(--space-3); padding-left: var(--space-5);">
              <li style="margin-bottom: var(--space-2);"><strong>Signals</strong> — every move scored, classified, and mapped to a playbook theme.</li>
              <li style="margin-bottom: var(--space-2);"><strong>Decision Playbooks</strong> — three credible plays per theme, grounded in real signals.</li>
              <li><strong>Positioning Radar</strong> — see how your firm compares to peers across the three themes.</li>
            </ul>
          </div>
          <div>
            <div class="section-eyebrow">Who we are</div>
            <h2 class="section-heading">NextFi Advisors</h2>
            <p style="color: var(--color-text-muted); margin-bottom: var(--space-4);">NextFi Advisors is a boutique advisory firm focused on the institutional adoption of blockchain-based financial market infrastructure. We work with banks, asset managers, custodians, FMIs, and fintech infrastructure providers on strategy, product, and partnership decisions in tokenized funds, stablecoins, and DLT-based market infrastructure.</p>
            <p style="color: var(--color-text-muted);">SftS is the public artifact of our private research. The methodology, taxonomy, and signal data are open. The strategic interpretation is what we sell.</p>
            <div style="margin-top: var(--space-5);">
              <a class="btn btn--primary" href="https://nextfiadvisors.com/contact" target="_blank" rel="noopener noreferrer">Work with NextFi ${R.extIcon}</a>
              <a class="btn btn--ghost" href="https://nextfiadvisors.com" target="_blank" rel="noopener noreferrer" style="margin-left: var(--space-3);">nextfiadvisors.com ${R.extIcon}</a>
            </div>
          </div>
        </div>
      </section>

      <section class="site-section">
        <div class="section-eyebrow">Data sources</div>
        <h2 class="section-heading">Where signals come from</h2>
        <div class="grid-cols-3" style="--gap: var(--space-4); margin-top: var(--space-5);">
          <div class="card">
            <h4 style="font-family:var(--font-display); margin-bottom:var(--space-2); color: var(--color-text-strong);">Primary regulators</h4>
            <p style="color:var(--color-text-muted); font-size:0.9rem;">BIS, Federal Reserve, ECB, FCA, ESMA, SEC, CFTC, Bank of England — official press releases, research papers, and central-banker speeches.</p>
          </div>
          <div class="card">
            <h4 style="font-family:var(--font-display); margin-bottom:var(--space-2); color: var(--color-text-strong);">Institutional press</h4>
            <p style="color:var(--color-text-muted); font-size:0.9rem;">Major bank, asset manager, FMI, and payments-provider announcements — filed through the same scoring rubric as primary sources.</p>
          </div>
          <div class="card">
            <h4 style="font-family:var(--font-display); margin-bottom:var(--space-2); color: var(--color-text-strong);">On-chain context</h4>
            <p style="color:var(--color-text-muted); font-size:0.9rem;">Dune Analytics queries and rwa.xyz market data provide live on-chain context for each playbook theme — without affecting core signal scoring.</p>
          </div>
        </div>
      </section>

      <section class="site-section">
        <div class="cta-banner">
          <h3>Want a private positioning brief?</h3>
          <p>NextFi delivers boardroom-ready positioning briefs that combine SftS signal density with private institutional context, qualitative interviews, and our in-house playbook recommendations.</p>
          <div class="cluster">
            <a class="btn btn--primary" href="https://nextfiadvisors.com/contact" target="_blank" rel="noopener noreferrer">Get in touch ${R.extIcon}</a>
            <a class="btn btn--outline" href="#/methodology">Methodology</a>
          </div>
        </div>
      </section>
    </section>
  `;
});
