"""
Generate an interactive unmapped-signal review dashboard from pipeline artifacts.

Outputs a self-contained HTML file with:
- Mapping pressure summary (manual/auto/combined mapped vs unmapped)
- Review queue summary (decision and reason-code distribution)
- Interactive table for triage and reviewer edits
- CSV exports for edited full queue, resolved-only rows, and compact updates

Usage:
  python scripts/unmapped_review_dashboard.py
  python scripts/unmapped_review_dashboard.py --output data/unmapped_review_dashboard.html
"""

from __future__ import annotations

import argparse
import csv
import html
import json
from collections import Counter
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

DEFAULT_REVIEW_CSV = DATA_DIR / "unmapped_review_first_pass.csv"
DEFAULT_MANUAL_JSON = DATA_DIR / "data.json"
DEFAULT_AUTO_JSON = DATA_DIR / "auto_data.json"
DEFAULT_DECISIONS_JSONL = DATA_DIR / "reviewer_decisions.jsonl"
DEFAULT_OUTPUT_HTML = DATA_DIR / "unmapped_review_dashboard.html"

THEME_MAP_INITIATIVE = {
    "Tokenized Securities / RWA": ["tokenized"],
    "Stablecoins & Deposit Tokens": ["stablecoins"],
    "Stablecoins": ["stablecoins"],
    "Cross-Border Payments": ["stablecoins"],
    "Payment Infrastructure": ["stablecoins", "dlt"],
    "CBDC": ["stablecoins"],
    "DLT / Blockchain Infrastructure": ["dlt"],
    "Settlement Infrastructure": ["dlt"],
    "Interoperability & Standards": ["dlt"],
    "DeFi": ["dlt"],
    "Crypto / Digital Assets": [],
    "Digital Asset Strategy": [],
    "Leadership & Governance": [],
    "Regulatory / Compliance": ["perimeter"],
}

EDITABLE_FIELDS = [
    "decision",
    "initiative_classifications",
    "mapped_themes",
    "primary_play_id",
    "play_audience",
    "tie_breaker_used",
    "confidence",
    "primary_reason_code",
    "reviewer_notes",
    "reviewer_id",
]


def _load_json_array(path: Path) -> List[dict]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError(f"Expected JSON array in {path}")
    return data


def _count_mapped(records: List[dict]) -> Tuple[int, int]:
    mapped = 0
    unmapped = 0
    for row in records:
        themes = set()
        for init in (row.get("initiative_types") or []):
            for t in THEME_MAP_INITIATIVE.get(init, []):
                themes.add(t)
        if themes:
            mapped += 1
        else:
            unmapped += 1
    return mapped, unmapped


def _load_review_rows(path: Path) -> Tuple[List[dict], List[str]]:
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        cols = reader.fieldnames or []
    return rows, cols


def _load_jsonl_rows(path: Path) -> List[dict]:
    if not path.exists():
        return []
    out: List[dict] = []
    with path.open("r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line:
                continue
            out.append(json.loads(line))
    return out


def _build_summary(manual: List[dict], auto: List[dict], review_rows: List[dict], jsonl_rows: List[dict]) -> dict:
    m_mapped, m_unmapped = _count_mapped(manual)
    a_mapped, a_unmapped = _count_mapped(auto)
    c_mapped = m_mapped + a_mapped
    c_unmapped = m_unmapped + a_unmapped

    decision_counts = Counter((r.get("decision") or "").strip() or "(blank)" for r in review_rows)
    suggested_counts = Counter((r.get("suggested_decision") or "").strip() or "(blank)" for r in review_rows)
    reason_counts = Counter((r.get("suggested_primary_reason_code") or "").strip() or "(none)" for r in review_rows)

    unresolved = sum(1 for r in review_rows if not (r.get("decision") or "").strip())
    resolved = len(review_rows) - unresolved

    jsonl_decision_counts = Counter((r.get("decision") or "").strip() or "(blank)" for r in jsonl_rows)

    return {
        "source_pressure": {
            "manual": {"total": len(manual), "mapped": m_mapped, "unmapped": m_unmapped},
            "auto": {"total": len(auto), "mapped": a_mapped, "unmapped": a_unmapped},
            "combined": {"total": len(manual) + len(auto), "mapped": c_mapped, "unmapped": c_unmapped},
        },
        "review_queue": {
            "total": len(review_rows),
            "resolved": resolved,
            "unresolved": unresolved,
            "decision_counts": dict(decision_counts),
            "suggested_counts": dict(suggested_counts),
            "reason_counts": dict(reason_counts),
        },
        "decision_store": {
            "total": len(jsonl_rows),
            "decision_counts": dict(jsonl_decision_counts),
        },
    }


def _compact_rows(rows: List[dict], columns: List[str]) -> List[dict]:
    keep = set(columns)
    compact = []
    for r in rows:
        compact.append({k: r.get(k, "") for k in keep})
    return compact


def _html_template(payload_json: str) -> str:
    return f"""<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>Unmapped Signal Review Dashboard</title>
  <style>
    :root {{
      --bg:#f7f8fc;
      --card:#ffffff;
      --ink:#1f2937;
      --muted:#6b7280;
      --line:#e5e7eb;
      --accent:#0f766e;
      --warn:#b45309;
      --danger:#b91c1c;
    }}
    * {{ box-sizing:border-box; }}
    body {{ margin:0; font-family:Segoe UI, Tahoma, sans-serif; background:var(--bg); color:var(--ink); }}
    .wrap {{ max-width:1500px; margin:0 auto; padding:16px; }}
    h1 {{ margin:0 0 8px; font-size:26px; }}
    .sub {{ color:var(--muted); margin-bottom:16px; }}
    .grid {{ display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); margin-bottom:14px; }}
    .card {{ background:var(--card); border:1px solid var(--line); border-radius:12px; padding:12px; }}
    .k {{ color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.04em; }}
    .v {{ font-size:28px; font-weight:700; margin-top:2px; }}
    .row {{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }}
    .row .card {{ padding:8px 10px; }}
    .pill {{ border-radius:999px; padding:4px 10px; font-size:12px; background:#ecfeff; color:#155e75; border:1px solid #bae6fd; }}
    label {{ font-size:12px; color:var(--muted); display:block; margin-bottom:4px; }}
    input[type=search], select {{ width:100%; min-width:180px; border:1px solid var(--line); border-radius:8px; padding:8px 10px; background:#fff; }}
    .filters {{ display:grid; gap:10px; grid-template-columns:2fr 1fr 1fr 1fr; margin-bottom:12px; }}
    .btns {{ display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px; }}
    button {{ border:1px solid var(--line); background:#fff; color:var(--ink); border-radius:8px; padding:8px 12px; cursor:pointer; }}
    button.primary {{ background:var(--accent); border-color:var(--accent); color:#fff; }}
    button.warn {{ background:#fff7ed; border-color:#fed7aa; color:var(--warn); }}
    .table-wrap {{ background:#fff; border:1px solid var(--line); border-radius:12px; overflow:auto; }}
    table {{ width:100%; border-collapse:separate; border-spacing:0; min-width:1450px; }}
    thead th {{ position:sticky; top:0; background:#f9fafb; border-bottom:1px solid var(--line); padding:8px; text-align:left; font-size:12px; color:var(--muted); }}
    tbody td {{ border-bottom:1px solid var(--line); padding:8px; vertical-align:top; font-size:12px; }}
    tbody tr:nth-child(even) {{ background:#fcfcfd; }}
    td .mono {{ font-family:Consolas, monospace; font-size:11px; }}
    td textarea, td input, td select {{ width:100%; border:1px solid #d1d5db; border-radius:6px; padding:6px; font-size:12px; background:#fff; }}
    td textarea {{ min-height:52px; resize:vertical; }}
    .small {{ font-size:11px; color:var(--muted); }}
    .note {{ margin-top:10px; font-size:12px; color:var(--muted); }}
    .right {{ margin-left:auto; }}
  </style>
</head>
<body>
<div class=\"wrap\">
  <h1>Unmapped Signal Review Dashboard</h1>
  <div class=\"sub\">Interactive queue for reviewing and resolving mapping gaps. Edit rows inline, then export CSV for your pipeline.</div>

  <div id=\"summary\" class=\"grid\"></div>

  <div class=\"row\">
    <div class=\"card\"><span class=\"pill\" id=\"queue-meta\"></span></div>
    <div class=\"card\"><span class=\"pill\" id=\"decision-meta\"></span></div>
  </div>

  <div class=\"filters\">
    <div>
      <label>Search (institution, initiative, reason, signal_id)</label>
      <input id=\"q\" type=\"search\" placeholder=\"Search queue...\" />
    </div>
    <div>
      <label>Decision</label>
      <select id=\"decisionFilter\"></select>
    </div>
    <div>
      <label>Suggested Decision</label>
      <select id=\"suggestedFilter\"></select>
    </div>
    <div>
      <label>Reason Code</label>
      <select id=\"reasonFilter\"></select>
    </div>
  </div>

  <div class=\"btns\">
    <button class=\"warn\" id=\"unresolvedOnly\">Show Unresolved Only</button>
    <button id=\"showAll\">Show All</button>
    <button class=\"primary\" id=\"downloadEdited\">Download Edited Full CSV</button>
    <button id=\"downloadResolved\">Download Resolved-Only CSV</button>
    <button id=\"downloadUpdates\">Download Compact Updates CSV</button>
    <span class=\"small right\" id=\"rowsShown\"></span>
  </div>

  <div class=\"table-wrap\">
    <table>
      <thead>
        <tr>
          <th>signal_id</th>
          <th>tier</th>
          <th>date</th>
          <th>institution</th>
          <th>initiative</th>
          <th>suggested_decision</th>
          <th>suggested_reason</th>
          <th>decision (edit)</th>
          <th>initiative_classifications (edit)</th>
          <th>mapped_themes (edit)</th>
          <th>primary_play_id (edit)</th>
          <th>notes (edit)</th>
        </tr>
      </thead>
      <tbody id=\"body\"></tbody>
    </table>
  </div>

  <div class=\"note\">
    Recommended workflow: edit unresolved rows -> download edited CSV -> replace or merge into data/unmapped_review_first_pass.csv -> run Stage 3 + Stage 4 scripts.
  </div>
</div>

<script>
const PAYLOAD = {payload_json};

const rows = PAYLOAD.rows;
const columns = PAYLOAD.columns;
const summary = PAYLOAD.summary;
const editableFields = PAYLOAD.editable_fields;

let unresolvedOnly = false;

function uniqValues(key) {{
  const vals = new Set(['(all)']);
  for (const r of rows) vals.add((r[key] || '').trim() || '(blank)');
  return Array.from(vals);
}}

function setOptions(selectEl, values) {{
  selectEl.innerHTML = values.map(v => `<option value="${{escapeHtml(v)}}">${{escapeHtml(v)}}</option>`).join('');
}}

function escapeHtml(v) {{
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}}

function buildSummaryCards() {{
  const s = summary.source_pressure;
  const q = summary.review_queue;
  const cards = [
    {{ k:'Combined Signals', v:s.combined.total, sub:`Mapped: ${{s.combined.mapped}} | Unmapped: ${{s.combined.unmapped}}` }},
    {{ k:'Auto Signals', v:s.auto.total, sub:`Mapped: ${{s.auto.mapped}} | Unmapped: ${{s.auto.unmapped}}` }},
    {{ k:'Manual Signals', v:s.manual.total, sub:`Mapped: ${{s.manual.mapped}} | Unmapped: ${{s.manual.unmapped}}` }},
    {{ k:'Review Queue Rows', v:q.total, sub:`Resolved: ${{q.resolved}} | Unresolved: ${{q.unresolved}}` }},
  ];
  document.getElementById('summary').innerHTML = cards.map(c => `
    <div class="card">
      <div class="k">${{escapeHtml(c.k)}}</div>
      <div class="v">${{escapeHtml(c.v)}}</div>
      <div class="small">${{escapeHtml(c.sub)}}</div>
    </div>
  `).join('');

  const topDecision = Object.entries(summary.review_queue.decision_counts)
    .sort((a,b) => b[1]-a[1])
    .slice(0, 4)
    .map(([k,v]) => `${{k}}=${{v}}`)
    .join(' | ');
  document.getElementById('queue-meta').textContent = `Queue Decisions: ${{topDecision || 'n/a'}}`;

  const topStore = Object.entries(summary.decision_store.decision_counts)
    .sort((a,b) => b[1]-a[1])
    .slice(0, 4)
    .map(([k,v]) => `${{k}}=${{v}}`)
    .join(' | ');
  document.getElementById('decision-meta').textContent = `JSONL Store: ${{topStore || 'n/a'}}`;
}}

function filteredRows() {{
  const q = document.getElementById('q').value.trim().toLowerCase();
  const decision = document.getElementById('decisionFilter').value;
  const suggested = document.getElementById('suggestedFilter').value;
  const reason = document.getElementById('reasonFilter').value;

  return rows.filter(r => {{
    const d = (r.decision || '').trim() || '(blank)';
    const sd = (r.suggested_decision || '').trim() || '(blank)';
    const rs = (r.suggested_primary_reason_code || '').trim() || '(blank)';

    if (unresolvedOnly && (r.decision || '').trim()) return false;
    if (decision !== '(all)' && d !== decision) return false;
    if (suggested !== '(all)' && sd !== suggested) return false;
    if (reason !== '(all)' && rs !== reason) return false;

    if (!q) return true;
    const hay = [r.signal_id, r.institution, r.initiative, r.suggested_primary_reason_code, r.decision]
      .map(x => String(x || '').toLowerCase())
      .join(' ');
    return hay.includes(q);
  }});
}}

function rowInput(field, value, idx) {{
  if (field === 'decision') {{
    const opts = ['', 'map', 'keep_unmapped', 'candidate_new_theme'];
    return `<select data-idx="${{idx}}" data-field="decision">${{opts.map(o => `<option value="${{o}}" ${{o===value?'selected':''}}>${{o || '(blank)'}}</option>`).join('')}}</select>`;
  }}
  if (field === 'reviewer_notes') {{
    return `<textarea data-idx="${{idx}}" data-field="${{field}}">${{escapeHtml(value || '')}}</textarea>`;
  }}
  return `<input data-idx="${{idx}}" data-field="${{field}}" value="${{escapeHtml(value || '')}}" />`;
}}

function render() {{
  const list = filteredRows();
  const body = document.getElementById('body');
  body.innerHTML = list.map((r, idx) => {{
    const originalIdx = rows.indexOf(r);
    return `
      <tr>
        <td><span class="mono">${{escapeHtml(r.signal_id || '')}}</span></td>
        <td>${{escapeHtml(r.tier || '')}}</td>
        <td>${{escapeHtml(r.date || '')}}</td>
        <td>${{escapeHtml(r.institution || '')}}</td>
        <td>${{escapeHtml(r.initiative || '')}}</td>
        <td>${{escapeHtml(r.suggested_decision || '')}}</td>
        <td>${{escapeHtml(r.suggested_primary_reason_code || '')}}</td>
        <td>${{rowInput('decision', r.decision, originalIdx)}}</td>
        <td>${{rowInput('initiative_classifications', r.initiative_classifications, originalIdx)}}</td>
        <td>${{rowInput('mapped_themes', r.mapped_themes, originalIdx)}}</td>
        <td>${{rowInput('primary_play_id', r.primary_play_id, originalIdx)}}</td>
        <td>${{rowInput('reviewer_notes', r.reviewer_notes, originalIdx)}}</td>
      </tr>
    `;
  }}).join('');

  document.getElementById('rowsShown').textContent = `Rows shown: ${{list.length}} / ${{rows.length}}`;

  body.querySelectorAll('input, textarea, select').forEach(el => {{
    el.addEventListener('input', onEdit);
    el.addEventListener('change', onEdit);
  }});
}}

function onEdit(e) {{
  const idx = Number(e.target.dataset.idx);
  const field = e.target.dataset.field;
  rows[idx][field] = e.target.value;
}}

function csvEscape(v) {{
  const s = String(v == null ? '' : v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replaceAll('"','""') + '"';
  return s;
}}

function toCsv(dataRows, fieldOrder) {{
  const lines = [fieldOrder.join(',')];
  for (const r of dataRows) {{
    lines.push(fieldOrder.map(f => csvEscape(r[f] || '')).join(','));
  }}
  return lines.join('\n');
}}

function downloadText(filename, text) {{
  const blob = new Blob([text], {{ type:'text/csv;charset=utf-8;' }});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}}

function downloadEditedFullCsv() {{
  downloadText('unmapped_review_first_pass.edited.csv', toCsv(rows, columns));
}}

function downloadResolvedCsv() {{
  const resolved = rows.filter(r => (r.decision || '').trim());
  downloadText('unmapped_review_resolved_only.csv', toCsv(resolved, columns));
}}

function downloadCompactUpdates() {{
  const updates = rows
    .filter(r => editableFields.some(f => String(r[f] || '').trim()))
    .map(r => {{
      const out = {{ signal_id: r.signal_id || '', institution: r.institution || '', initiative: r.initiative || '', date: r.date || '' }};
      for (const f of editableFields) out[f] = r[f] || '';
      return out;
    }});
  const fields = ['signal_id', 'institution', 'initiative', 'date', ...editableFields];
  downloadText('unmapped_review_updates.csv', toCsv(updates, fields));
}}

function init() {{
  buildSummaryCards();
  setOptions(document.getElementById('decisionFilter'), uniqValues('decision'));
  setOptions(document.getElementById('suggestedFilter'), uniqValues('suggested_decision'));
  setOptions(document.getElementById('reasonFilter'), uniqValues('suggested_primary_reason_code'));

  document.getElementById('q').addEventListener('input', render);
  document.getElementById('decisionFilter').addEventListener('change', render);
  document.getElementById('suggestedFilter').addEventListener('change', render);
  document.getElementById('reasonFilter').addEventListener('change', render);

  document.getElementById('unresolvedOnly').addEventListener('click', () => {{ unresolvedOnly = true; render(); }});
  document.getElementById('showAll').addEventListener('click', () => {{ unresolvedOnly = false; render(); }});

  document.getElementById('downloadEdited').addEventListener('click', downloadEditedFullCsv);
  document.getElementById('downloadResolved').addEventListener('click', downloadResolvedCsv);
  document.getElementById('downloadUpdates').addEventListener('click', downloadCompactUpdates);

  render();
}}

init();
</script>
</body>
</html>
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate interactive unmapped review dashboard HTML")
    parser.add_argument("--review-csv", default=str(DEFAULT_REVIEW_CSV), help="Path to unmapped review CSV")
    parser.add_argument("--manual-json", default=str(DEFAULT_MANUAL_JSON), help="Path to data.json")
    parser.add_argument("--auto-json", default=str(DEFAULT_AUTO_JSON), help="Path to auto_data.json")
    parser.add_argument("--decisions-jsonl", default=str(DEFAULT_DECISIONS_JSONL), help="Path to reviewer_decisions.jsonl")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT_HTML), help="Output dashboard HTML path")
    args = parser.parse_args()

    review_csv = Path(args.review_csv)
    manual_json = Path(args.manual_json)
    auto_json = Path(args.auto_json)
    decisions_jsonl = Path(args.decisions_jsonl)
    output_html = Path(args.output)

    if not review_csv.exists():
        raise FileNotFoundError(f"Missing review CSV: {review_csv}")
    if not manual_json.exists():
        raise FileNotFoundError(f"Missing manual JSON: {manual_json}")
    if not auto_json.exists():
        raise FileNotFoundError(f"Missing auto JSON: {auto_json}")

    review_rows, columns = _load_review_rows(review_csv)
    manual_rows = _load_json_array(manual_json)
    auto_rows = _load_json_array(auto_json)
    jsonl_rows = _load_jsonl_rows(decisions_jsonl)

    summary = _build_summary(manual_rows, auto_rows, review_rows, jsonl_rows)

    payload = {
        "columns": columns,
        "rows": _compact_rows(review_rows, columns),
        "summary": summary,
        "editable_fields": EDITABLE_FIELDS,
    }

    html_doc = _html_template(json.dumps(payload, ensure_ascii=False))
    output_html.parent.mkdir(parents=True, exist_ok=True)
    output_html.write_text(html_doc, encoding="utf-8", newline="\n")

    print(f"Wrote dashboard: {output_html}")
    print(f"Queue rows: {len(review_rows)}")
    print(f"Combined mapped/unmapped: {summary['source_pressure']['combined']['mapped']}/{summary['source_pressure']['combined']['unmapped']}")


if __name__ == "__main__":
    main()
