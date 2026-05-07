# Signals from the Street

A live intelligence platform tracking institutional adoption of digital-asset and market-infrastructure initiatives.

Live site: https://streetsignals.nextfiadvisors.com

## Front-End Architecture

The production UI is now a static SPA built with plain HTML/CSS/JS.

- Routing: hash-based client router (`#/`, `#/signals`, `#/signals/:id`, `#/playbooks`, `#/radar`, `#/methodology`, `#/about`)
- Styles: design tokens + app styles in `css/`
- Logic: modular JS in `js/`
- Data: JSON files in `data/` (`data.json`, `auto_data.json`, `intel_briefs.json`, `market_overlay.json`, `sources.json`, `popularity.json`, taxonomy v1 files)

No build step is required.

## Key Directories

- `index.html` - app shell
- `base.css` - global reset and defaults
- `css/` - `tokens.css`, `app.css`
- `js/` - state/data/router/route modules and bootstrap
- `scripts/` - data refresh and utility scripts
- `.github/workflows/` - scheduled data refresh pipeline

## Local Development

```bash
git clone https://github.com/Barry-Eisenberg/streetsignals.git
cd streetsignals
python -m http.server 8000
```

Then open http://localhost:8000.

## Validation

Run static regression checks before pushing front-end changes:

```powershell
./scripts/ui_regression_check.ps1
```

## Data Refresh

Manual refresh:

```bash
python scripts/update_signals.py
```

Dune overlay refresh:

```bash
copy scripts/dune_queries.example.json scripts/dune_queries.json
set DUNE_API_KEY=your_api_key_here
python scripts/update_dune_metrics.py
```

## Deployment Notes

Detailed redesign deployment guidance and follow-up plans are in:

- `Redesign/DEPLOYMENT.md`
- `Redesign/REDESIGN_NOTES.md`
- `Redesign/FUTURE_ENHANCEMENTS.md`

Netlify configuration is defined in `netlify.toml`.

## License

MIT. See `LICENSE`.
