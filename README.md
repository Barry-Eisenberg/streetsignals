# Street Signals — Digital Asset Intelligence Dashboard

A live intelligence platform tracking institutional adoption of blockchain-based financial market infrastructure. Aggregates 455+ signals from banks, asset managers, exchanges, payment providers, regulators, and ecosystem projects across digital assets and distributed ledger technology.

**Live:** [streetsignals.nextfiadvisors.com](https://streetsignals.nextfiadvisors.com)

## Features

- **455+ Real-Time Signals** — Curated from multiple authoritative sources
- **Advanced Matrix Filtering** — Search across institution, sector, signal type, and FMI areas
- **Institutional Initiative Directory** — Named institutions and their DLT initiatives, quantified across dimensions
- **Analytics Dashboard** — FMI categorization, signal momentum over time, initiative classification
- **Live Signal Library** — Browse all signals with full context and citations

## Data

- **Auto-updated daily** — 11:15 UTC via GitHub Actions
- **Three signal types:**
  - Manual curated (`data.json`) — 217 signals
  - Auto-detected (`auto_data.json`) — 227 signals  
  - Intelligence Briefs (`intel_briefs.json`) — 11 briefs
- **Total:** 455 signals + 11 briefs

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

## Project Structure

```
.
├── index.html              # Main page
├── app.js                  # Application logic
├── style.css               # Styling
├── data.json               # Manual curated signals (217)
├── auto_data.json          # Auto-detected signals (227)
├── intel_briefs.json       # Intelligence briefs (11)
├── sources.json            # Signal source definitions
├── scripts/
│   └── update_signals.py   # Data refresh script
└── .github/
    └── workflows/
        └── update-signals.yml  # Daily auto-update job
```

## License

MIT License — See [LICENSE](LICENSE) for details.

## Author

NextFi Advisors — [nextfiadvisors.com](https://nextfiadvisors.com)

## Support

For questions or feedback, please open an [issue](https://github.com/Barry-Eisenberg/streetsignals/issues) on GitHub.
