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
