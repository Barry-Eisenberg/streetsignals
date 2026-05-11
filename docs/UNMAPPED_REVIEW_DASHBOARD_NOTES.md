# Unmapped Review Dashboard: Quick Ops Notes

## Regression Checklist

Run these checks after changing `scripts/unmapped_review_dashboard.py`:

1. Python syntax check
   - Command: `python -m py_compile scripts/unmapped_review_dashboard.py`
   - Expected: no output / zero exit code
2. Regenerate dashboard
   - Command: `python scripts/unmapped_review_dashboard.py`
   - Expected: writes `data/unmapped_review_dashboard.html`
3. Embedded JS parse check
   - Command:
     `node -e "const fs=require('fs');const vm=require('vm');const t=fs.readFileSync('data/unmapped_review_dashboard.html','utf8');const s=t.match(/<script>([\\s\\S]*?)<\\/script>/)[1]; new vm.Script(s,{filename:'dash.js'}); console.log('parse ok')"`
   - Expected: `parse ok`

### Validation Snapshot (2026-05-11)

- `python -m py_compile scripts/unmapped_review_dashboard.py`: pass
- `python scripts/unmapped_review_dashboard.py`: pass (218 queue rows)
- Node parse check: pass (`parse ok`)

## Known Limitations (Lightweight)

1. Large inlined payload
   - The dashboard embeds all rows in one `<script>` payload, so HTML diffs are noisy and marker searches can match huge lines.
2. Source URL strategy for unmapped queue
   - `source_url` is backfilled from `data/data.json` and `data/auto_data.json` by `(institution, initiative, date)` match; the queue CSV itself does not carry canonical URLs.
3. Historical decision counts
   - `summary.decision_store` may still show historical `candidate_new_theme` values from prior decision logs, even though active edit options now use `map`, `keep_unmapped`, `remove`.
4. Table width/scroll complexity
   - Horizontal navigation is intentionally supported by both top and bottom scrollbars; styling tweaks can easily regress edit-column reachability.
5. Generated artifact discipline
   - Any template edit should be followed by regeneration and parse checks to avoid silent breakage.
