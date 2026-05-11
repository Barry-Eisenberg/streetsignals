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

### Auto-accept results (Stage 2 validation)

- Stage 2 auto-accepted 111/216 unmapped signals (51.4%):
  - 11 high-confidence mapped to `dlt` theme (plays: dlt-1, dlt-2, dlt-3)
  - 27 held as RC09 regulatory perimeter candidates (pending 4th theme)
  - 73 reliable-noise closes (RC03_NATIVE_CRYPTO_ONLY + RC08_MACRO_COMMENTARY)
- RC09 share: 24.3% — well above the 10% threshold for future 4th theme promotion
- Calibration report: `data/reviewer_calibration_report.md`
- Training data store: `data/reviewer_decisions.jsonl` (111 entries, keyed by signal_id)

### Stage 4 writeback blocker (Stage 3 complete, Stage 4 pending)

Stage 3 (`aggregate_reviewer_decisions.py`) successfully produces training data and calibration reports. However, **Stage 4 (enriching source signals with decisions) is blocked pending the definition of the 4th "perimeter" theme** as a first-class playbook object.

**Why the blockage**: 27 of the 111 auto-accepted signals are RC09 candidates that should map to a "Regulatory & Perimeter" playbook theme. This theme does not yet exist in the system. Until it is defined across 6 files and ~150 lines of content, the Stage 4 writeback script cannot safely propagate decisions to `data.json` and `auto_data.json`.

**Next execution items**

1. Define the "perimeter" theme playbook (see design guidance below).
2. Stub the perimeter theme across 6 codebase locations (see roadmap below).
3. Run Stage 4 writeback script to enrich all 111 auto-accepted decisions into the source signal files.
4. Validate frontend shows 11 new `dlt`-themed signals + 27 new `perimeter`-themed signals on the Signals page.
5. Run dual-review pass on remaining 105 medium/low-confidence unmapped signals.

---

## Perimeter Theme Design & Stub Roadmap

### Theme Definition

**Perimeter** is a 4th playbook theme focused on regulatory policy, supervisory action, and institutional boundary-setting around digital assets. It complements the three existing themes:

| Theme | Focus | Type |
| --- | --- | --- |
| **tokenized** | Tokenization of traditional assets (RWA, funds, private markets) | *Product & Issuance* |
| **stablecoins** | Stablecoins, deposit tokens, and CB-issued CBDC | *Currency & Settlement* |
| **dlt** | DLT infrastructure, interoperability, and post-trade settlement | *Infrastructure* |
| **perimeter** | Regulatory policy, licensing, and institutional perimeter-setting | *Policy & Governance* |

**Perimeter signals**: supervisory moves, regulatory frameworks, licensing decisions, and policy announcements that establish the guardrails within which the other three themes operate. Examples from the current unmapped queue:

- CLARITY Act roundtable and Senate markup (SEC/CFTC jurisdiction clarity)
- UK FCA new crypto rules and 24-hour compliance trap warnings
- CFTC derivatives licensing for Bitnomial / Kraken
- SEC Chair Atkins "ACT" mission for crypto clarity

### The 3 Perimeter Plays (WIP — guidance below)

| Play | Level | Definition | Best Fit |
| --- | --- | --- | --- |
| **perimeter-1** | Pilot / Trial | Targeted supervisory outreach or pilot licensing scheme (e.g., BitLicense expansion pilot, MAS Digital Bank framework) | Regulators clarifying intent via limited-scope frameworks |
| **perimeter-2** | Expansion | Jurisdiction-wide regulatory clarity, cross-agency coordination, or market infrastructure upgrade (e.g., CLARITY Act clarity on SEC/CFTC jurisdiction split) | Cross-agency policy moves that expand institutional access |
| **perimeter-3** | Platform / Partnership | Industry-wide standards, interagency MOU, or international regulatory coordination (e.g., FATF guidance adoption by G7, BIS handbook updates) | Coordination among regulators to establish common perimeter |

### 6-File Stub Checklist

#### 1. `js/playbooks.js` — Add perimeter to PLAYBOOKS

```javascript
// Insert in PLAYBOOKS object after the dlt entry:
perimeter: {
  id: 'perimeter',
  title: 'Regulatory & Perimeter',
  subtitle: 'Policy clarity, licensing, and institutional guardrails',
  audience: ['banks_fmis', 'asset_managers'],  // Regulators not self-referential; target is Tier 1 institutions
  snapshot: '…governing body approval or regulatory clarity that expands institutional access…',
  plays: [
    {
      id: 'perimeter-1',
      title: 'Targeted Supervisory Clarity',
      oneLiner: 'Agency pilot or limited-scope framework testing',
      what: '…',
      whyNow: '…',
      bestFit: { banks_fmis: 3, asset_managers: 2, … },
      pitfalls: '…',
      nextFiBrief: { url: '…', headline: '…' }
    },
    // perimeter-2 and perimeter-3 follow same structure
  ]
}
```

**Guidance**: 
- **Audience**: Target Tier 1 banks and asset managers who *benefit* from clarity, not the regulators who *make* it.
- **Snapshot**: Lead with the institutional outcome (access, burden reduction, operating clarity).
- **Play 1 guidance**: Pilot/trial moves by a *single* regulator (e.g., SEC, FCA, MAS) testing new rules in a limited jurisdiction or cohort.
- **Play 2 guidance**: *Cross-agency or jurisdiction-wide* moves (e.g., CLARITY Act Senate markup, UK regulatory framework nationwide rollout) that expand access across markets.
- **Play 3 guidance**: *International coordination* or *industry standard-setting* (e.g., FATF adopts new AML/CFT guidance, BIS publishes handbook update adopted by G7).

#### 2. `js/data.js` — Add perimeter to THEMES and whyThisMatters

```javascript
// Insert in THEMES object:
perimeter: {
  id: 'perimeter',
  label: 'Regulatory & Perimeter',
  color: 'var(--color-theme-perimeter)',  // see CSS below
}

// Insert in THEME_MAP_INITIATIVE (in resolveThemes function):
"Regulatory / Compliance": ["perimeter"],
"Regulatory / Compliance Framework": ["perimeter"],

// Insert in whyThisMatters object:
perimeter: {
  banks_fmis: '…institutional clarity on which regulators have jurisdiction…',
  asset_managers: '…guardrails and compliance templates reduce onboarding friction…',
  fintechs: '…perimeter clarity is risk management; know your regulatory home…',
}
```

**Guidance**:
- **whyThisMatters**: Frame from each persona's operational POV (for banks: jurisdiction clarity; for asset managers: compliance burden; for fintechs: risk management).

#### 3. `data/initiative-taxonomy.v1.json` — No change required

- `Regulatory / Compliance` initiative type already exists
- Maps to perimeter theme via THEME_MAP_INITIATIVE in scripts/generate_unmapped_first_pass.py

#### 4. `scripts/generate_unmapped_first_pass.py` — Add perimeter mapping

```python
# In THEME_MAP_INITIATIVE dict, update or add:
"Regulatory / Compliance": ["perimeter"],
```

**Guidance**:
- This single-line change causes all RC09 rows (tagged `Regulatory / Compliance` in initiative_types) to auto-map to perimeter.
- The recommendPlayForSignal logic in playbooks.js then automatically assigns the right play (perimeter-1/2/3) based on tier and signal strength.

#### 5. `data/signal-strength-methodology.v1.json` — Add perimeter to matrix (optional)

```json
// In matrixColumns array, add:
{
  "initiative": "Regulatory / Compliance",
  "theme": "perimeter",
  "weight": 1.0
}
```

**Guidance**:
- This allows the signal strength heatmap to show perimeter coverage per initiative.
- If you want perimeter signals to have equal weight with tokenized/stablecoins/dlt in strength scoring, use weight 1.0.
- If perimeter is supportive but less direct, use weight 0.8.

#### 6. `index.html` + `css/app.css` — Add color token and theme class

```html
<!-- In index.html, in :root CSS var declarations: -->
--color-theme-perimeter: #6B5B95;  /* Example: deep purple — separate from the other 3 themes */
```

```css
/* In css/app.css, add theme class: */
.theme-tag--perimeter {
  background: var(--color-theme-perimeter);
  color: #fff;
}
```

**Guidance**:
- Choose a color that visually distinguishes perimeter from tokenized (blue), stablecoins (green), dlt (amber).
- Purple, violet, or slate work well for "governance/policy" semantic.
- Ensure contrast ratio is ≥4.5:1 for WCAG AA compliance against white text.

---

### Perimeter Theme Copy Templates

Use these templates to draft the ~150 lines of perimeter content:

**Snapshot**: "A [governing body | multi-agency working group | regulatory framework] [approval | decision | guidance] that expands institutional [access | operating clarity | compliance certainty] within [jurisdiction | asset class | settlement layer]."

**Play 1 (Pilot)**: "[Agency] pilots [regulatory concept] with [cohort size] institutions in [region/market] starting [timeline]."

**Play 2 (Expansion)**: "[Jurisdiction | Agency coordination] moves to [clarity level] on [regulatory topic], enabling [outcome]."

**Play 3 (Platform)**: "[International body | Multi-regulator working group] establishes [standard | guidance] adopted by [jurisdiction set]."

Examples from current RC09 queue:
- **CLARITY Act Senate markup** → Play 2 (jurisdiction-wide clarity on SEC/CFTC split)
- **UK FCA crypto rules nationwide rollout** → Play 2 (jurisdiction-wide compliance template)
- **Bitnomial CFTC licensing** → Play 1 (targeted agency framework; CFTC already had derivatives licensing, this is licensing a new venue)
- **SEC Chair Atkins "ACT" mission** → Play 3 potential (if it leads to SEC/CFTC/CBOT coordination)

---

### Acceptance Criteria

Once the 6 files are stubbed:
- [ ] `js/playbooks.js` compiles without error; recommendPlayForSignal returns perimeter plays for test signals
- [ ] `js/data.js` compiles; "Regulatory & Perimeter" appears in theme filter dropdown
- [ ] `scripts/generate_unmapped_first_pass.py` runs and auto-maps Regulatory/Compliance initiatives to perimeter
- [ ] Perimeter theme displays with correct color in signal cards and playbook matrix
- [ ] CSS contrast passes WCAG AA (4.5:1 for text)

---

Once this stub is complete and merged, Stage 4 writeback can proceed and the 27 RC09 signals will enrich into the frontend as "perimeter"-themed playbook candidates.


