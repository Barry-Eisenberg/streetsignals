# SftS signals — Digital Asset Intelligence Dashboard

A live intelligence platform tracking institutional adoption of blockchain-based financial market infrastructure. Aggregates 580+ signals from banks, asset managers, exchanges, payment providers, regulators, and ecosystem projects across digital assets and distributed ledger technology.

**Live:** [streetsignals.nextfiadvisors.com](https://streetsignals.nextfiadvisors.com)

## Features

- **580+ Real-Time Signals** — Curated from multiple authoritative sources
- **Advanced Matrix Filtering** — Search across institution, sector, signal type, and FMI areas
- **Institutional Initiative Directory** — Named institutions and their DLT initiatives, quantified across dimensions
- **Analytics Dashboard** — FMI categorization, signal momentum over time, initiative classification
- **Live Signal Library** — Browse all signals with full context and citations
- **Universal Signal Controls** — Persona, institution category, date window, and country controls at the top of the Signals page

## Data

- **Auto-updated every 30 minutes** via GitHub Actions
- **Three signal types:**
  - Manual curated (`data.json`) — 217 signals
  - Auto-detected (`auto_data.json`) — 363 signals  
  - Intelligence Briefs (`intel_briefs.json`) — 11 briefs
- **Total:** 580 signals + 11 briefs

## Technology

- **Frontend:** HTML5 + vanilla JavaScript + Chart.js
- **Hosting:** GitHub Pages
- **Data Format:** JSON
- **Deployment:** Auto-deploy on push to `main`

## Usage

1. Visit [streetsignals.nextfiadvisors.com](https://streetsignals.nextfiadvisors.com)
2. Use the **Institutional Initiative Directory** to search by institution, sector, or signal type
3. Explore **Analytics Dashboard** for trend analysis
4. Browse **Signal Library** for detailed signal context

## Development

The dashboard is a static site with no build step. To run locally:

```bash
# Clone the repo
git clone https://github.com/Barry-Eisenberg/streetsignals.git
cd streetsignals

# Serve locally (Python 3)
python -m http.server 8000
# Then visit http://localhost:8000
```

### Pre-push Validation

Run this before opening a PR or pushing UI interaction changes:

```powershell
./scripts/ui_regression_check.ps1
```

This validates:
- No inline `onclick` handlers in `app.js` or `index.html`
- No `javascript:void(0)` links in `app.js` or `index.html`
- Freshness-date guard excludes future-dated source timestamps
- Key delegated interaction hooks are present

## Data Updates

To refresh signal data manually:

```bash
python scripts/update_signals.py
```

This script:
- Fetches auto-detected signals from configured sources
- Processes intelligence briefs
- Merges with manual curated signals
- Outputs to `auto_data.json` and `intel_briefs.json`

To refresh external Dune-based market overlays:

```bash
copy scripts/dune_queries.example.json scripts/dune_queries.json
set DUNE_API_KEY=your_api_key_here
python scripts/update_dune_metrics.py
```

This script:
- Executes saved Dune queries or raw SQL via API
- Polls until execution completes
- Normalizes results into `market_overlay.json`
- Keeps external market metrics separate from core SftS signal records

The example config now points to local SQL templates in [scripts/dune_sql](scripts/dune_sql). You can either:
- keep using local SQL files and edit them directly, or
- replace a SQL-file definition with a saved `query_id` later if you prefer to manage queries in Dune

The current frontend uses these overlays as contextual analytics only. They do not change the core signal scoring or radar score.

## Project Structure

```
.
├── index.html              # Main page
├── app.js                  # Application logic
├── style.css               # Styling
├── data.json               # Manual curated signals (217)
├── auto_data.json          # Auto-detected signals (363)
├── market_overlay.json     # External market metrics from Dune / public overlays
├── intel_briefs.json       # Intelligence briefs (11)
├── sources.json            # Signal source definitions
├── scripts/
│   ├── update_signals.py   # Signal refresh script
│   ├── update_dune_metrics.py # Dune overlay refresh script
│   └── dune_queries.example.json # Example Dune query config
├── taxonomy/
│   ├── signal-record.schema.json
│   └── market-overlay.schema.json
└── .github/
    └── workflows/
        └── update-signals.yml  # Scheduled auto-update job (every 30 minutes)
```

## License

MIT License — See [LICENSE](LICENSE) for details.

## Author

NextFi Advisors — [nextfiadvisors.com](https://nextfiadvisors.com)

## Support

For questions or feedback, please open an [issue](https://github.com/Barry-Eisenberg/streetsignals/issues) on GitHub.
