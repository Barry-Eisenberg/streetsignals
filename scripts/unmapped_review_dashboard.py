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


def _norm(v: str) -> str:
    return (v or "").strip().lower()


def _build_source_url_lookup(records: List[dict]) -> Dict[Tuple[str, str, str], str]:
    lookup: Dict[Tuple[str, str, str], str] = {}
    for r in records:
        key = (_norm(r.get("institution", "")), _norm(r.get("initiative", "")), _norm(r.get("date", "")))
        if not all(key):
            continue
        url = (r.get("source_url") or r.get("url") or "").strip()
        if not url:
            continue
        if key not in lookup:
            lookup[key] = url
    return lookup


def _attach_source_urls(review_rows: List[dict], columns: List[str], source_lookup: Dict[Tuple[str, str, str], str]) -> None:
  if "source_url" not in columns:
    columns.insert(3, "source_url")

  for r in review_rows:
    existing = (r.get("source_url") or r.get("url") or "").strip()
    if existing:
      r["source_url"] = existing
      continue

    key = (
      _norm(r.get("institution", "")),
      _norm(r.get("initiative", "")),
      _norm(r.get("date", "")),
    )
    matched = source_lookup.get(key, "")
    if matched:
      r["source_url"] = matched
      continue
    r["source_url"] = ""


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
    button.active {{ background:#ecfeff; border-color:#99f6e4; color:#0f766e; }}
    .hint {{ display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:999px; border:1px solid #cbd5e1; color:#475569; font-size:11px; line-height:1; background:#fff; cursor:help; }}
    .hint.label {{ width:auto; padding:0 8px; border-radius:999px; font-size:11px; font-weight:600; }}
    .scroll-hint {{ margin:6px 0 8px; color:var(--muted); font-size:12px; }}
    .top-scroll {{ height:14px; overflow-x:auto; overflow-y:hidden; border:1px solid var(--line); border-radius:8px; background:#fff; margin-bottom:6px; }}
    .top-scroll-inner {{ height:1px; }}
    .table-wrap {{ background:#fff; border:1px solid var(--line); border-radius:12px; overflow-x:auto; overflow-y:auto; max-width:100%; }}
    table {{ width:max-content; min-width:100%; border-collapse:separate; border-spacing:0; }}
    thead th {{ position:sticky; top:0; background:#f9fafb; border-bottom:1px solid var(--line); padding:8px; text-align:left; font-size:12px; color:var(--muted); white-space:normal; overflow-wrap:anywhere; word-break:break-word; line-height:1.2; }}
    tbody td {{ border-bottom:1px solid var(--line); padding:8px; vertical-align:top; font-size:12px; white-space:normal; overflow-wrap:anywhere; word-break:break-word; }}
    tbody tr:nth-child(even) {{ background:#fcfcfd; }}
    td .mono {{ font-family:Consolas, monospace; font-size:11px; }}
    td textarea, td input, td select {{ width:100%; border:1px solid #d1d5db; border-radius:6px; padding:6px; font-size:12px; background:#fff; }}
    td textarea {{ min-height:52px; resize:vertical; }}
    table th:nth-child(1), table td:nth-child(1) {{ min-width:88px; }}
    table th:nth-child(2), table td:nth-child(2) {{ min-width:74px; }}
    table th:nth-child(3), table td:nth-child(3) {{ min-width:76px; }}
    table th:nth-child(4), table td:nth-child(4) {{ min-width:92px; }}
    table th:nth-child(5), table td:nth-child(5) {{ min-width:100px; max-width:170px; }}
    table th:nth-child(6), table td:nth-child(6) {{ min-width:150px; max-width:280px; }}
    table th:nth-child(7), table td:nth-child(7) {{ min-width:105px; }}
    table th:nth-child(8), table td:nth-child(8) {{ min-width:100px; max-width:160px; }}
    table th:nth-child(9), table td:nth-child(9) {{ min-width:150px; }}
    table th:nth-child(10), table td:nth-child(10) {{ min-width:150px; max-width:170px; width:1%; }}
    table th:nth-child(11), table td:nth-child(11) {{ min-width:170px; }}
    table th:nth-child(12), table td:nth-child(12) {{ min-width:170px; }}
    table th:nth-child(13), table td:nth-child(13) {{ min-width:380px; width:380px; }}
    table td:nth-child(13) textarea {{ min-height:86px; }}
    body.compact thead th, body.compact tbody td {{ padding:6px; font-size:11px; }}
    body.compact td .mono {{ font-size:10px; }}
    body.compact td textarea, body.compact td input, body.compact td select {{ padding:4px; font-size:11px; }}
    body.compact table th:nth-child(1), body.compact table td:nth-child(1) {{ min-width:78px; }}
    body.compact table th:nth-child(2), body.compact table td:nth-child(2) {{ min-width:64px; }}
    body.compact table th:nth-child(3), body.compact table td:nth-child(3) {{ min-width:64px; }}
    body.compact table th:nth-child(4), body.compact table td:nth-child(4) {{ min-width:84px; }}
    body.compact table th:nth-child(5), body.compact table td:nth-child(5) {{ min-width:88px; max-width:140px; }}
    body.compact table th:nth-child(6), body.compact table td:nth-child(6) {{ min-width:120px; max-width:220px; }}
    body.compact table th:nth-child(7), body.compact table td:nth-child(7) {{ min-width:90px; }}
    body.compact table th:nth-child(8), body.compact table td:nth-child(8) {{ min-width:90px; max-width:130px; }}
    body.compact table th:nth-child(9), body.compact table td:nth-child(9) {{ min-width:130px; }}
    body.compact table th:nth-child(10), body.compact table td:nth-child(10) {{ min-width:135px; max-width:150px; width:1%; }}
    body.compact table th:nth-child(11), body.compact table td:nth-child(11) {{ min-width:150px; }}
    body.compact table th:nth-child(12), body.compact table td:nth-child(12) {{ min-width:150px; }}
    body.compact table th:nth-child(13), body.compact table td:nth-child(13) {{ min-width:300px; width:300px; }}
    body.compact table td:nth-child(13) textarea {{ min-height:74px; }}
    body.hide-leading-cols table th:nth-child(1),
    body.hide-leading-cols table td:nth-child(1),
    body.hide-leading-cols table th:nth-child(2),
    body.hide-leading-cols table td:nth-child(2),
    body.hide-leading-cols table th:nth-child(3),
    body.hide-leading-cols table td:nth-child(3),
    body.hide-leading-cols table th:nth-child(4),
    body.hide-leading-cols table td:nth-child(4) {{ display:none; }}
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
    <button id=\"showPriority\">Priority View (Unresolved + Highest Impact)</button>
    <span class=\"hint label\" title=\"Priority score = tier weight + recency score + institution weight. Tier weights: Structural 100, Material 70, Context 40, Noise 10. Recency score decreases with days_since_anchor. Institution weights are higher for Regulatory Agencies and Global Banks.\">Score Info</span>
    <button class=\"warn\" id=\"unresolvedOnly\">Show Unresolved Only</button>
    <button id="showAll">Show All</button>
    <button id="jumpToEdits">Jump to Edit Columns</button>
    <button id="toggleCompact">Compact Mode: Off</button>
    <button id="toggleLeadingCols">First 4 Columns: Shown</button>
    <button class=\"primary\" id=\"downloadEdited\">Download Edited Full CSV</button>
    <button id=\"downloadResolved\">Download Resolved-Only CSV</button>
    <button id=\"downloadUpdates\">Download Compact Updates CSV</button>
    <span class=\"small right\" id=\"rowsShown\"></span>
  </div>

  <div class="scroll-hint">Use the top scrollbar (or bottom table scrollbar) to reveal editable columns on the right.</div>
  <div id="topScroll" class="top-scroll"><div id="topScrollInner" class="top-scroll-inner"></div></div>

  <div class=\"table-wrap\">
    <table>
      <thead>
        <tr>
          <th>signal_id</th>
          <th>signal_url</th>
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

const THEME_OPTIONS = ['', 'tokenized', 'stablecoins', 'dlt', 'perimeter'];
const INITIATIVE_CLASSIFICATION_OPTIONS = [
  '',
  'Tokenized Securities / RWA',
  'Stablecoins & Deposit Tokens',
  'Stablecoins',
  'Cross-Border Payments',
  'Payment Infrastructure',
  'CBDC',
  'DLT / Blockchain Infrastructure',
  'Settlement Infrastructure',
  'Interoperability & Standards',
  'DeFi',
  'Crypto / Digital Assets',
  'Digital Asset Strategy',
  'Leadership & Governance',
  'Regulatory / Compliance',
];
const PLAY_IDS_BY_THEME = {{
  tokenized: ['tokenized-1', 'tokenized-2', 'tokenized-3'],
  stablecoins: ['stablecoins-1', 'stablecoins-2', 'stablecoins-3'],
  dlt: ['dlt-1', 'dlt-2', 'dlt-3'],
  perimeter: ['perimeter-1', 'perimeter-2', 'perimeter-3'],
}};
const TIER_WEIGHT = {{ Structural: 100, Material: 70, Context: 40, Noise: 10 }};
const INSTITUTION_WEIGHT = {{
  'Regulatory Agencies': 35,
  'Global Banks': 30,
  'Payments Providers': 24,
  'Exchanges & Central Intermediaries': 24,
  'Asset & Investment Management': 20,
  'Infrastructure & Technology': 16,
}};

let unresolvedOnly = false;
let sortMode = 'default';
let compactMode = false;
let leadingColsCollapsed = false;

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

  const list = rows.filter(r => {{
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

  if (sortMode === 'priority') {{
    list.sort((a, b) => priorityScore(b) - priorityScore(a));
  }}

  return list;
}}

function getThemeFromRow(row) {{
  const raw = String(row.mapped_themes || '').trim();
  if (!raw) return '';
  const first = raw.split(/[|,]/)[0].trim();
  return THEME_OPTIONS.includes(first) ? first : '';
}}

function getPlayOptionsForTheme(theme) {{
  if (!theme) return [''];
  return ['', ...(PLAY_IDS_BY_THEME[theme] || [])];
}}

function priorityScore(row) {{
  const tier = String(row.tier || '').trim();
  const tierScore = TIER_WEIGHT[tier] || 0;

  const daysRaw = Number(row.days_since_anchor);
  const days = Number.isFinite(daysRaw) ? Math.max(0, Math.min(365, daysRaw)) : 365;
  const recencyScore = Math.max(0, 40 - Math.floor(days / 2));

  const instType = String(row.institution_type || '').trim();
  const instScore = INSTITUTION_WEIGHT[instType] || 0;

  return tierScore + recencyScore + instScore;
}}

function rowInput(field, value, idx) {{
  if (field === 'decision') {{
    const opts = ['', 'map', 'keep_unmapped', 'remove'];
    return `<select data-idx="${{idx}}" data-field="decision">${{opts.map(o => `<option value="${{o}}" ${{o===value?'selected':''}}>${{o || '(blank)'}}</option>`).join('')}}</select>`;
  }}
  if (field === 'initiative_classifications') {{
    const normalized = String(value || '').trim();
    const opts = INITIATIVE_CLASSIFICATION_OPTIONS.includes(normalized)
      ? INITIATIVE_CLASSIFICATION_OPTIONS
      : [...INITIATIVE_CLASSIFICATION_OPTIONS, normalized].filter(Boolean);
    const withBlank = opts.includes('') ? opts : ['', ...opts];
    return `<select data-idx="${{idx}}" data-field="initiative_classifications">${{withBlank.map(o => `<option value="${{o}}" ${{o===normalized?'selected':''}}>${{o || '(blank)'}}</option>`).join('')}}</select>`;
  }}
  if (field === 'mapped_themes') {{
    const normalized = String(value || '').trim();
    const opts = THEME_OPTIONS.includes(normalized) ? THEME_OPTIONS : [...THEME_OPTIONS, normalized];
    return `<select data-idx="${{idx}}" data-field="mapped_themes">${{opts.map(o => `<option value="${{o}}" ${{o===normalized?'selected':''}}>${{o || '(blank)'}}</option>`).join('')}}</select>`;
  }}
  if (field === 'primary_play_id') {{
    const theme = getThemeFromRow(rows[idx]);
    const normalized = String(value || '').trim();
    const opts = getPlayOptionsForTheme(theme);
    const finalOpts = opts.includes(normalized) ? opts : [...opts, normalized].filter(Boolean);
    const withBlank = finalOpts.includes('') ? finalOpts : ['', ...finalOpts];
    return `<select data-idx="${{idx}}" data-field="primary_play_id">${{withBlank.map(o => `<option value="${{o}}" ${{o===normalized?'selected':''}}>${{o || '(blank)'}}</option>`).join('')}}</select>`;
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
        <td>${{r.source_url ? `<a href="${{escapeHtml(r.source_url)}}" target="_blank" rel="noopener noreferrer">open</a>` : ''}}</td>
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

  syncTopScrollWidth();
}}

function onEdit(e) {{
  const idx = Number(e.target.dataset.idx);
  const field = e.target.dataset.field;
  rows[idx][field] = e.target.value;

  if (field === 'mapped_themes') {{
    const selectedTheme = getThemeFromRow(rows[idx]);
    const validPlays = new Set(getPlayOptionsForTheme(selectedTheme));
    const currentPlay = String(rows[idx].primary_play_id || '').trim();
    if (!validPlays.has(currentPlay)) rows[idx].primary_play_id = '';
    render();
  }}
}}

function csvEscape(v) {{
  const s = String(v == null ? '' : v);
  if (s.includes(',') || s.includes('"') || s.includes('\\n')) return '"' + s.replaceAll('"','""') + '"';
  return s;
}}

function toCsv(dataRows, fieldOrder) {{
  const lines = [fieldOrder.join(',')];
  for (const r of dataRows) {{
    lines.push(fieldOrder.map(f => csvEscape(r[f] || '')).join(','));
  }}
  return lines.join('\\n');
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

function syncTopScrollWidth() {{
  const wrap = document.querySelector('.table-wrap');
  const table = document.querySelector('.table-wrap table');
  const inner = document.getElementById('topScrollInner');
  if (!wrap || !table || !inner) return;
  inner.style.width = `${{table.scrollWidth}}px`;
}}

function applyCompactMode() {{
  document.body.classList.toggle('compact', compactMode);
  const btn = document.getElementById('toggleCompact');
  if (btn) btn.textContent = `Compact Mode: ${{compactMode ? 'On' : 'Off'}}`;
  try {{ localStorage.setItem('unmappedDashboardCompactMode', compactMode ? '1' : '0'); }} catch (_) {{}}
  requestAnimationFrame(syncTopScrollWidth);
}}

function applyLeadingColsMode() {{
  document.body.classList.toggle('hide-leading-cols', leadingColsCollapsed);
  const btn = document.getElementById('toggleLeadingCols');
  if (btn) btn.textContent = `First 4 Columns: ${{leadingColsCollapsed ? 'Hidden' : 'Shown'}}`;
  try {{ localStorage.setItem('unmappedDashboardHideLeadingCols', leadingColsCollapsed ? '1' : '0'); }} catch (_) {{}}
  requestAnimationFrame(syncTopScrollWidth);
}}

function init() {{
  try {{
    const rawCompact = localStorage.getItem('unmappedDashboardCompactMode');
    compactMode = rawCompact == null ? true : rawCompact === '1';
  }} catch (_) {{
    compactMode = true;
  }}
  try {{
    leadingColsCollapsed = localStorage.getItem('unmappedDashboardHideLeadingCols') === '1';
  }} catch (_) {{
    leadingColsCollapsed = false;
  }}
  applyCompactMode();
  applyLeadingColsMode();

  buildSummaryCards();
  setOptions(document.getElementById('decisionFilter'), uniqValues('decision'));
  setOptions(document.getElementById('suggestedFilter'), uniqValues('suggested_decision'));
  setOptions(document.getElementById('reasonFilter'), uniqValues('suggested_primary_reason_code'));

  document.getElementById('q').addEventListener('input', render);
  document.getElementById('decisionFilter').addEventListener('change', render);
  document.getElementById('suggestedFilter').addEventListener('change', render);
  document.getElementById('reasonFilter').addEventListener('change', render);

  document.getElementById('showPriority').addEventListener('click', () => {{
    unresolvedOnly = true;
    sortMode = 'priority';
    document.getElementById('showPriority').classList.add('active');
    render();
  }});

  document.getElementById('unresolvedOnly').addEventListener('click', () => {{
    unresolvedOnly = true;
    sortMode = 'default';
    document.getElementById('showPriority').classList.remove('active');
    render();
  }});

  document.getElementById('showAll').addEventListener('click', () => {{
    unresolvedOnly = false;
    sortMode = 'default';
    document.getElementById('showPriority').classList.remove('active');
    render();
  }});

  document.getElementById('jumpToEdits').addEventListener('click', () => {{
    const wrap = document.querySelector('.table-wrap');
    if (!wrap) return;
    wrap.scrollTo({{ left: Math.max(0, wrap.scrollWidth - wrap.clientWidth), behavior: 'smooth' }});
  }});

  document.getElementById('toggleCompact').addEventListener('click', () => {{
    compactMode = !compactMode;
    applyCompactMode();
  }});

  document.getElementById('toggleLeadingCols').addEventListener('click', () => {{
    leadingColsCollapsed = !leadingColsCollapsed;
    applyLeadingColsMode();
  }});

  const wrap = document.querySelector('.table-wrap');
  const topScroll = document.getElementById('topScroll');
  let syncing = false;
  if (wrap && topScroll) {{
    wrap.addEventListener('scroll', () => {{
      if (syncing) return;
      syncing = true;
      topScroll.scrollLeft = wrap.scrollLeft;
      syncing = false;
    }});
    topScroll.addEventListener('scroll', () => {{
      if (syncing) return;
      syncing = true;
      wrap.scrollLeft = topScroll.scrollLeft;
      syncing = false;
    }});
  }}

  window.addEventListener('resize', syncTopScrollWidth);

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

    source_lookup = _build_source_url_lookup(manual_rows + auto_rows)
    _attach_source_urls(review_rows, columns, source_lookup)

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
