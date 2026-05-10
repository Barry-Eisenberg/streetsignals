# Live Updates

This project now supports scheduled content refresh for signals and intelligence briefs.

## What updates automatically

- `auto_data.json`
  - Generated from RSS sources in `sources.json`
  - Classified into signal type, FMI area, initiative type, and year
- `intel_briefs.json`
  - Refreshed from the NextFi Intelligence page download links

The site loads these files at runtime and merges them with manual `data.json`.
All KPIs, metrics, tables, and charts recalculate automatically from the merged dataset.

## Configure sources

Edit `sources.json`:

- `nextfi_intelligence.url`: source page for intelligence briefs
- `rss_sources[]`: add/remove feed sources and map each feed to a category

Category values should match one of:

- `global_banks`
- `asset_management`
- `payments`
- `exchanges_intermediaries`
- `regulators`
- `ecosystem`

## Run update locally

```bash
python scripts/update_signals.py
```

This writes:

- `auto_data.json`
- `intel_briefs.json`

## Scheduled updates (GitHub Actions)

Workflow file: `.github/workflows/update-signals.yml`

- Runs every 30 minutes (`*/30 * * * *`)
- Can also be run manually (`workflow_dispatch`)
- Commits and pushes changes only when outputs changed

## Notes

- `data.json` remains your curated manual dataset.
- Keep high-confidence institutional records in `data.json`.
- Use `rss_sources` for broad monitoring and regular refresh.

## 2026-05-02 remediation summary

This release cycle resolved production data freshness, UI regressions, and institution-label quality issues.

### Completed fixes

- Restored missing weekly priority strip behavior above the signal catalogue with fallback rendering.
- Set default date window to 14 days for top-level signal views.
- Fixed analytics CSP allowances and favicon/secondary-page consistency issues.
- Hardened scheduled refresh workflow to avoid secret-dependent failures by adding token fallback behavior.
- Improved institution inference in `scripts/update_signals.py` with:
  - canonical institution aliases (for example, Fed/BoE normalization)
  - priority institution pattern matching before generic matching
  - quality gates to reject fragmentary labels and headline-token leakage
  - stronger regulator/global-bank/payments/exchange pattern coverage

### Data quality outcome

Post-rebuild verification confirms that fragmentary regulator labels such as "of Korea", "of England", and "Fed pick Warsh" are not present as institution values in current generated data.

Current regulator institution set is normalized to canonical labels (for example: Federal Reserve, Bank of Korea, Bank of England, CFTC, SEC, FCA, ECB).

### Operational verification

- Manual workflow dispatch executed successfully (`update-signals.yml`, run `25260781058`).
- Latest production data refresh completed and integrity checks passed locally.
- UI regression checks previously executed and passing after the main fix set.

### Follow-up guidance

If stale labels still appear in-browser after deployment, force-refresh and clear browser cache for the site origin to bypass client/CDN cache artifacts.

## 2026-05-07 routing and cache remediation summary

This release cycle resolved a production routing failure caused by a stale cached
JavaScript module at the CDN edge.

### Completed fixes

- Fixed a template-literal syntax error in the signals route module that blocked
  route registration and produced "Route not found" on `#/signals` URLs.
- Confirmed local syntax validity after the fix (`node --check` clean).
- Deployed a cache-safe route module path in `index.html` by switching the load
  target to `./js/routes-signals-v2.js`, bypassing stale CDN copies.
- Shipped signal description cleanup in detail and share-card rendering to remove
  trailing ellipsis artifacts (`…` and `...`).
- Added a detail-page preview-only note when `description_truncated: true`.

### Operational outcome

- Live signal routes are now resolving correctly.
- The share-card/detail text presentation is cleaner and transparent about
  truncated source previews.

### Follow-up recommendation

- Normalize JS cache strategy in `netlify.toml` (for example, lower `/js/*` TTL
  and require revalidation) before reverting temporary filename-based cache
  bypass patterns.

## 2026-05-09 analytics route enhancement summary

This release adds a dedicated analytics surface so chart-heavy signal analysis
is no longer buried in other pages.

### Completed fixes

- Added a new `#/analytics` SPA route (`js/routes-analytics.js`) with a
  dedicated dashboard for:
  - signal momentum over time (tiered weekly trend lines)
  - FMI distribution (top FMI areas by signal count)
  - source coverage mix and top-source table
- Added date-window controls (`14d`, `30d`, `90d`, `180d`, `365 days`) with
  shareable query-state URLs (`#/analytics?days=...`).
- Added analytics navigation links in header and footer (`index.html`).
- Added analytics-specific layout and component styling in `css/app.css`.

### Operational outcome

- `/analytics` now exists as a first-class route in the production SPA
  structure and can be linked directly for review and stakeholder sharing.

### Remaining related follow-ups

- Country/region facet in Signals workspace remains pending until country data
  fields are available in source JSON files.

## 2026-05-09 signal engagement tracking summary

This release adds lightweight GA4-ready engagement tracking on signal detail pages.

### Completed fixes

- Added safe analytics event hooks in `js/routes-signals-v2.js` that emit to
  `window.gtag` when available, and fall back to `window.dataLayer` push when
  present.
- Added signal-detail open event: `sfts_signal_open`.
- Added click events with signal context payloads for:
  - `sfts_read_source_click`
  - `sfts_read_playbook_click`
  - `sfts_discuss_nextfi_click`
- Included event payload fields for signal-level attribution:
  `signal_id`, `theme`, `tier`, `institution`, `persona`, and
  `recommended_play` where applicable.

### Operational outcome

- Signal-level engagement instrumentation is now in place for core conversion
  interactions from detail pages.

## 2026-05-10 unmapped-signals review kickoff summary

This kickoff starts execution of Enhancement #1 from
`Redesign/FUTURE_ENHANCEMENTS.md` to reduce unmapped signal coverage.

### Completed kickoff items

- Captured baseline unmapped metrics from current merged signal data:
  - total signals: 717
  - unmapped signals: 216 (30.1%)
  - unmapped by tier: Structural 26, Material 87, Context 100, Noise 3
  - unmapped in last 90 days: 211
- Published reviewer rubric and reason-code catalog:
  `docs/unmapped-signal-review-rubric.md`.
- Added review intake CSV template:
  `data/unmapped_review_template.csv`.

### Next execution items

- Run dual-review pass on all Structural and Material unmapped signals.
- Adjudicate disagreements and quantify `RC04_TAXONOMY_GAP` candidates to
  evaluate whether a 4th playbook theme is justified.
