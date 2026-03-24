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
