// =====================================================================
// routes-analytics.js - Dedicated analytics dashboard (/analytics)
// =====================================================================

function _analyticsLoadChartJs() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (window.__sftsChartLoading) return window.__sftsChartLoading;

  window.__sftsChartLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = './assets/vendor/chart.umd.min.js';
    script.onload = () => resolve(window.Chart);
    script.onerror = () => reject(new Error('Chart.js failed to load'));
    document.head.appendChild(script);
  });

  return window.__sftsChartLoading;
}

function _analyticsWindowFromQuery(query) {
  const u = new URLSearchParams(query || '');
  const raw = u.get('days');
  if (!raw) return 90;
  if (raw === 'all') return 'all';
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return 90;
  return parsed;
}

function _analyticsSyncURL(windowDays) {
  const u = new URLSearchParams();
  if (windowDays !== 90) {
    u.set('days', String(windowDays));
  }
  const qs = u.toString();
  const newHash = `#/analytics${qs ? '?' + qs : ''}`;
  if (window.location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
}

function _analyticsSourceLabel(signal) {
  if (signal.source_name && String(signal.source_name).trim()) {
    return String(signal.source_name).trim();
  }
  if (signal.source_url) {
    try {
      const host = new URL(signal.source_url).hostname || '';
      return host.replace(/^www\./i, '') || 'Web source';
    } catch (e) {
      return 'Web source';
    }
  }
  return signal._source === 'manual' ? 'Manual dataset' : 'Auto-generated feed';
}

SftSRouter.defineRoute('/analytics', async ({ root, query }) => {
  let windowDays = _analyticsWindowFromQuery(query);
  let charts = [];

  function getWindowedSignals() {
    const all = SftSData.signals;
    if (windowDays === 'all') {
      return all.filter(s => s._daysOld !== null && s._daysOld <= 365);
    }
    return all.filter(s => s._daysOld !== null && s._daysOld <= windowDays);
  }

  function getMomentum(windowed) {
    const maxDays = windowDays === 'all' ? 365 : windowDays;
    const bucketCount = Math.min(16, Math.max(4, Math.ceil(maxDays / 7)));
    const buckets = Array.from({ length: bucketCount }, () => ({ Structural: 0, Material: 0, Context: 0, Noise: 0 }));

    windowed.forEach(s => {
      const d = s._daysOld;
      if (d == null) return;
      const bucket = Math.floor(d / 7);
      if (bucket >= 0 && bucket < bucketCount) {
        const idx = bucketCount - 1 - bucket;
        buckets[idx][s._tier] = (buckets[idx][s._tier] || 0) + 1;
      }
    });

    const anchor = SftSData.todayAnchor || new Date();
    const labels = [];
    for (let i = 0; i < bucketCount; i++) {
      const weekStart = new Date(anchor);
      const daysBack = (bucketCount - 1 - i) * 7;
      weekStart.setDate(weekStart.getDate() - daysBack);
      labels.push(`${weekStart.getMonth() + 1}/${weekStart.getDate()}`);
    }

    return {
      labels,
      structural: buckets.map(b => b.Structural),
      material: buckets.map(b => b.Material),
      context: buckets.map(b => b.Context),
      noise: buckets.map(b => b.Noise)
    };
  }

  function getTopFmi(windowed) {
    const counts = new Map();
    windowed.forEach(s => {
      const fmis = Array.isArray(s.fmi_areas) ? s.fmi_areas : [];
      fmis.forEach(f => {
        const key = String(f || '').trim();
        if (!key) return;
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    });

    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return {
      labels: top.map(([k]) => k),
      values: top.map(([, v]) => v)
    };
  }

  function getSourceCoverage(windowed) {
    const counts = new Map();
    windowed.forEach(s => {
      const key = _analyticsSourceLabel(s);
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 6);
    const tailTotal = sorted.slice(6).reduce((sum, [, n]) => sum + n, 0);
    if (tailTotal > 0) top.push(['Other', tailTotal]);

    return {
      labels: top.map(([k]) => k),
      values: top.map(([, v]) => v),
      topTable: sorted.slice(0, 10)
    };
  }

  function destroyCharts() {
    charts.forEach(c => {
      try { c.destroy(); } catch (e) { /* noop */ }
    });
    charts = [];
  }

  async function renderCharts() {
    const Chart = await _analyticsLoadChartJs();
    destroyCharts();

    const windowed = getWindowedSignals();
    const momentum = getMomentum(windowed);
    const fmi = getTopFmi(windowed);
    const source = getSourceCoverage(windowed);

    const total = windowed.length;
    const structural = windowed.filter(s => s._tier === 'Structural').length;
    const material = windowed.filter(s => s._tier === 'Material').length;
    const institutions = new Set(windowed.map(s => s.institution).filter(Boolean)).size;

    const countNode = root.querySelector('#analyticsCount');
    if (countNode) {
      const label = windowDays === 'all' ? 'last 365 days' : `last ${windowDays} days`;
      countNode.textContent = `${total.toLocaleString()} signals in view (${label})`;
    }

    const statTotal = root.querySelector('#analyticsStatTotal');
    const statStructural = root.querySelector('#analyticsStatStructural');
    const statMaterial = root.querySelector('#analyticsStatMaterial');
    const statInstitutions = root.querySelector('#analyticsStatInstitutions');
    if (statTotal) statTotal.textContent = total.toLocaleString();
    if (statStructural) statStructural.textContent = structural.toLocaleString();
    if (statMaterial) statMaterial.textContent = material.toLocaleString();
    if (statInstitutions) statInstitutions.textContent = institutions.toLocaleString();

    const sourceTable = root.querySelector('#analyticsTopSources');
    if (sourceTable) {
      sourceTable.innerHTML = source.topTable.length
        ? source.topTable.map(([name, n], idx) => `
            <div class="analytics-source-row">
              <span class="analytics-source-rank">${idx + 1}</span>
              <span class="analytics-source-name">${R.escapeHTML(name)}</span>
              <span class="analytics-source-count">${n.toLocaleString()}</span>
            </div>
          `).join('')
        : '<p class="analytics-muted">No source data available in this window.</p>';
    }

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#97a3b4',
            boxWidth: 12,
            boxHeight: 12,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          ticks: { color: '#8491a3' },
          grid: { color: 'rgba(132,145,163,0.14)' }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#8491a3', precision: 0 },
          grid: { color: 'rgba(132,145,163,0.14)' }
        }
      }
    };

    const momentumCtx = root.querySelector('#analyticsMomentum');
    const fmiCtx = root.querySelector('#analyticsFmi');
    const sourceCtx = root.querySelector('#analyticsSources');

    if (momentumCtx) {
      charts.push(new Chart(momentumCtx, {
        type: 'line',
        data: {
          labels: momentum.labels,
          datasets: [
            {
              label: 'Structural',
              data: momentum.structural,
              borderColor: '#2ddcff',
              backgroundColor: 'rgba(45,220,255,0.16)',
              tension: 0.3,
              borderWidth: 2,
              pointRadius: 2
            },
            {
              label: 'Material',
              data: momentum.material,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245,158,11,0.16)',
              tension: 0.3,
              borderWidth: 2,
              pointRadius: 2
            },
            {
              label: 'Context',
              data: momentum.context,
              borderColor: '#7f8ca0',
              backgroundColor: 'rgba(127,140,160,0.14)',
              tension: 0.3,
              borderWidth: 2,
              pointRadius: 1.5
            }
          ]
        },
        options: commonOptions
      }));
    }

    if (fmiCtx) {
      charts.push(new Chart(fmiCtx, {
        type: 'bar',
        data: {
          labels: fmi.labels,
          datasets: [{
            label: 'Signal count',
            data: fmi.values,
            backgroundColor: 'rgba(52,211,153,0.55)',
            borderColor: '#34d399',
            borderWidth: 1.2,
            borderRadius: 6
          }]
        },
        options: {
          ...commonOptions,
          indexAxis: 'y',
          plugins: {
            ...commonOptions.plugins,
            legend: { display: false }
          }
        }
      }));
    }

    if (sourceCtx) {
      charts.push(new Chart(sourceCtx, {
        type: 'doughnut',
        data: {
          labels: source.labels,
          datasets: [{
            data: source.values,
            backgroundColor: [
              '#2ddcff',
              '#34d399',
              '#a78bfa',
              '#fb923c',
              '#60a5fa',
              '#f43f5e',
              '#64748b'
            ],
            borderColor: '#0a101a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#97a3b4',
                boxWidth: 10,
                boxHeight: 10,
                padding: 12
              }
            }
          }
        }
      }));
    }
  }

  function renderShell() {
    const active = String(windowDays);

    root.innerHTML = `
      <section class="container container--wide analytics-page">
        <div class="page-hero">
          <div class="page-hero-eyebrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19V5M10 19v-8M16 19v-4M22 19v-9"/></svg>
            Analytics dashboard
          </div>
          <h1>Signal analytics <span class="accent">workspace</span></h1>
          <p class="page-hero-lead">Chart-heavy operational views for signal momentum, FMI concentration, and source coverage. This route keeps analytics separate from the Hub while preserving shareable filtered views.</p>
        </div>

        <div class="analytics-toolbar">
          <div class="analytics-window-toggle" role="group" aria-label="Analytics date window">
            ${[14, 30, 90, 180, 'all'].map(v => `
              <button class="${active === String(v) ? 'is-active' : ''}" data-analytics-days="${v}">${v === 'all' ? '365 days' : `Last ${v}d`}</button>
            `).join('')}
          </div>
          <div class="analytics-count" id="analyticsCount">Loading analytics view...</div>
        </div>

        <div class="analytics-kpis">
          <div class="analytics-kpi-card">
            <div class="analytics-kpi-label">Signals in view</div>
            <div class="analytics-kpi-value" id="analyticsStatTotal">-</div>
          </div>
          <div class="analytics-kpi-card">
            <div class="analytics-kpi-label">Structural</div>
            <div class="analytics-kpi-value" id="analyticsStatStructural">-</div>
          </div>
          <div class="analytics-kpi-card">
            <div class="analytics-kpi-label">Material</div>
            <div class="analytics-kpi-value" id="analyticsStatMaterial">-</div>
          </div>
          <div class="analytics-kpi-card">
            <div class="analytics-kpi-label">Institutions tracked</div>
            <div class="analytics-kpi-value" id="analyticsStatInstitutions">-</div>
          </div>
        </div>

        <div class="analytics-grid">
          <article class="analytics-card analytics-card--wide">
            <header class="analytics-card-head">
              <h3>Signal momentum over time</h3>
              <p>Weekly cadence by tier in the selected window.</p>
            </header>
            <div class="analytics-chart-wrap"><canvas id="analyticsMomentum"></canvas></div>
          </article>

          <article class="analytics-card">
            <header class="analytics-card-head">
              <h3>FMI distribution</h3>
              <p>Top FMI areas by signal count.</p>
            </header>
            <div class="analytics-chart-wrap"><canvas id="analyticsFmi"></canvas></div>
          </article>

          <article class="analytics-card">
            <header class="analytics-card-head">
              <h3>Source coverage mix</h3>
              <p>Share of coverage by source.</p>
            </header>
            <div class="analytics-chart-wrap"><canvas id="analyticsSources"></canvas></div>
          </article>

          <article class="analytics-card analytics-card--wide">
            <header class="analytics-card-head">
              <h3>Top sources</h3>
              <p>Most frequent signal sources in the selected window.</p>
            </header>
            <div id="analyticsTopSources" class="analytics-source-table"></div>
          </article>
        </div>
      </section>
    `;

    root.querySelectorAll('[data-analytics-days]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextRaw = btn.getAttribute('data-analytics-days');
        const next = nextRaw === 'all' ? 'all' : parseInt(nextRaw, 10);
        windowDays = Number.isNaN(next) ? 90 : next;
        _analyticsSyncURL(windowDays);
        renderShell();
        renderCharts().catch((e) => {
          console.error('Analytics render failed:', e);
        });
      });
    });
  }

  renderShell();
  try {
    await renderCharts();
  } catch (e) {
    console.error('Analytics route failed:', e);
    const countNode = root.querySelector('#analyticsCount');
    if (countNode) {
      countNode.textContent = 'Analytics charts failed to load. Please refresh and try again.';
    }
  }
});
