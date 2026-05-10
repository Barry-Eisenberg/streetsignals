"""
Aggregate reviewer decisions into a persistent training-data store and emit
a calibration report.

Inputs:
  - data/unmapped_review_first_pass.csv (post-auto-accept and/or human review)

Outputs:
  - data/reviewer_decisions.jsonl (append-only, deduplicated by signal_id)
  - data/reviewer_calibration_report.md (overwritten each run)

What the report covers:
  1. Auto-accept agreement: when a human reviewed an auto-accepted row,
     did they agree with the auto disposition?
  2. Theme deltas: where human mapped_themes disagreed with suggested_mapped_themes.
  3. Play deltas: where human primary_play_id disagreed with suggested_primary_play_id.
  4. Decision deltas: where human decision disagreed with suggested_decision.
  5. Reason-code distribution (especially RC04, RC08, RC09 trend).
  6. RC09 share over time (informs whether a 4th theme is justified).

Idempotent: existing entries in reviewer_decisions.jsonl are upserted by signal_id.
The report is regenerated from the full JSONL store on every run.

Usage:
  python scripts/aggregate_reviewer_decisions.py
  python scripts/aggregate_reviewer_decisions.py --since 2026-04-01
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
INPUT_CSV = DATA_DIR / "unmapped_review_first_pass.csv"
JSONL_STORE = DATA_DIR / "reviewer_decisions.jsonl"
REPORT_PATH = DATA_DIR / "reviewer_calibration_report.md"

AUTO_REVIEWER_PREFIX = "auto_accepter"


def load_existing_store() -> Dict[str, Dict]:
    """Load existing JSONL store keyed by signal_id."""
    if not JSONL_STORE.exists():
        return {}
    store: Dict[str, Dict] = {}
    with JSONL_STORE.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entry = json.loads(line)
            sig_id = entry.get("signal_id")
            if sig_id:
                store[sig_id] = entry
    return store


def collect_finalized_rows(rows: List[Dict[str, str]]) -> List[Dict]:
    """Pull rows that have a non-empty decision (auto or human)."""
    finalized = []
    for row in rows:
        if not (row.get("decision") or "").strip():
            continue
        finalized.append({
            "signal_id": row.get("signal_id", ""),
            "tier": row.get("tier", ""),
            "date": row.get("date", ""),
            "institution": row.get("institution", ""),
            "institution_type": row.get("institution_type", ""),
            "initiative": row.get("initiative", ""),
            "signal_type": row.get("signal_type", ""),
            "suggested_decision": row.get("suggested_decision", ""),
            "suggested_mapped_themes": row.get("suggested_mapped_themes", ""),
            "suggested_primary_play_id": row.get("suggested_primary_play_id", ""),
            "suggested_primary_reason_code": row.get("suggested_primary_reason_code", ""),
            "suggested_confidence": row.get("suggested_confidence", ""),
            "decision": row.get("decision", ""),
            "mapped_themes": row.get("mapped_themes", ""),
            "primary_play_id": row.get("primary_play_id", ""),
            "play_audience": row.get("play_audience", ""),
            "tie_breaker_used": row.get("tie_breaker_used", ""),
            "confidence": row.get("confidence", ""),
            "primary_reason_code": row.get("primary_reason_code", ""),
            "reviewer_notes": row.get("reviewer_notes", ""),
            "reviewer_id": row.get("reviewer_id", ""),
            "reviewed_at_utc": row.get("reviewed_at_utc", ""),
            "aggregated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        })
    return finalized


def write_jsonl_store(store: Dict[str, Dict]) -> None:
    """Persist the store, sorted by reviewed_at_utc descending then signal_id."""
    JSONL_STORE.parent.mkdir(parents=True, exist_ok=True)
    sorted_entries = sorted(
        store.values(),
        key=lambda e: (e.get("reviewed_at_utc", ""), e.get("signal_id", "")),
        reverse=True,
    )
    with JSONL_STORE.open("w", encoding="utf-8") as f:
        for entry in sorted_entries:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def is_auto_review(entry: Dict) -> bool:
    return entry.get("reviewer_id", "").startswith(AUTO_REVIEWER_PREFIX)


def themes_set(value: str) -> set:
    return set(t.strip() for t in (value or "").split(",") if t.strip())


def filter_since(store: Dict[str, Dict], since_iso: Optional[str]) -> List[Dict]:
    if not since_iso:
        return list(store.values())
    return [
        e for e in store.values()
        if e.get("reviewed_at_utc", "") >= since_iso
    ]


def compute_deltas(entries: List[Dict]) -> Dict:
    decision_deltas = []
    theme_deltas = []
    play_deltas = []
    auto_human_disagreements = []

    for e in entries:
        if e["decision"] != e["suggested_decision"] and e["suggested_decision"]:
            decision_deltas.append(e)

        if themes_set(e["mapped_themes"]) != themes_set(e["suggested_mapped_themes"]) and e["suggested_mapped_themes"]:
            theme_deltas.append(e)

        if e["primary_play_id"] and e["suggested_primary_play_id"] and e["primary_play_id"] != e["suggested_primary_play_id"]:
            play_deltas.append(e)

        # Auto-review disagreement signal: if the same signal_id appears later
        # with a different decision and a non-auto reviewer_id, that's a
        # human override of an auto-accepted row. We detect this only within
        # the current snapshot (via reviewer_notes pattern).
        if not is_auto_review(e) and "auto-accepted" in (e.get("reviewer_notes") or "").lower():
            # Edge case: the row was auto-accepted then a human edited it
            # without clearing the auto note. Flag for visibility.
            auto_human_disagreements.append(e)

    return {
        "decision_deltas": decision_deltas,
        "theme_deltas": theme_deltas,
        "play_deltas": play_deltas,
        "auto_human_disagreements": auto_human_disagreements,
    }


def render_report(entries: List[Dict], deltas: Dict, since_iso: Optional[str]) -> str:
    total = len(entries)
    auto_count = sum(1 for e in entries if is_auto_review(e))
    human_count = total - auto_count

    reason_counts = Counter(e.get("primary_reason_code", "") for e in entries)
    decision_counts = Counter(e.get("decision", "") for e in entries)
    theme_counts = Counter()
    for e in entries:
        for t in themes_set(e.get("mapped_themes", "")):
            theme_counts[t] += 1
    play_counts = Counter(e.get("primary_play_id", "") for e in entries if e.get("primary_play_id"))

    rc09_share = round(100 * reason_counts.get("RC09_REGULATORY_PERIMETER", 0) / total, 1) if total else 0.0
    rc04_share = round(100 * reason_counts.get("RC04_TAXONOMY_GAP", 0) / total, 1) if total else 0.0

    play_agreement = 0
    play_total = 0
    for e in entries:
        if e.get("primary_play_id") and e.get("suggested_primary_play_id"):
            play_total += 1
            if e["primary_play_id"] == e["suggested_primary_play_id"]:
                play_agreement += 1
    play_agreement_pct = round(100 * play_agreement / play_total, 1) if play_total else 0.0

    lines = []
    lines.append("# Reviewer Calibration Report")
    lines.append("")
    lines.append(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}")
    if since_iso:
        lines.append(f"Window: reviewed_at_utc >= {since_iso}")
    else:
        lines.append("Window: full history")
    lines.append("")
    lines.append("## Snapshot")
    lines.append("")
    lines.append(f"- Total finalized rows: {total}")
    lines.append(f"- Auto-accepted: {auto_count}")
    lines.append(f"- Human-reviewed: {human_count}")
    if total:
        lines.append(f"- Auto-accept rate: {round(100 * auto_count / total, 1)}%")
    lines.append("")
    lines.append("## Decision distribution")
    lines.append("")
    for decision, count in decision_counts.most_common():
        lines.append(f"- `{decision or '(empty)'}`: {count}")
    lines.append("")
    lines.append("## Theme distribution")
    lines.append("")
    if theme_counts:
        for theme, count in theme_counts.most_common():
            lines.append(f"- `{theme}`: {count}")
    else:
        lines.append("- (none mapped)")
    lines.append("")
    lines.append("## Play distribution (primary_play_id)")
    lines.append("")
    if play_counts:
        for play, count in play_counts.most_common():
            lines.append(f"- `{play}`: {count}")
    else:
        lines.append("- (none assigned)")
    lines.append("")
    lines.append("## Reason-code distribution")
    lines.append("")
    for code, count in reason_counts.most_common():
        if not code:
            continue
        lines.append(f"- `{code}`: {count}")
    lines.append("")
    lines.append("## Calibration metrics")
    lines.append("")
    lines.append(f"- Auto first-pass play agreement: {play_agreement_pct}% ({play_agreement}/{play_total})")
    lines.append(f"  - Acceptance target: >=75% (rubric)")
    lines.append(f"- RC09 share: {rc09_share}%")
    lines.append(f"  - 4th-theme threshold: >=10% in two consecutive batches (rubric)")
    lines.append(f"- RC04 share: {rc04_share}%")
    lines.append("")
    lines.append("## Deltas (auto suggestion vs. final decision)")
    lines.append("")
    lines.append(f"- Decision deltas: {len(deltas['decision_deltas'])}")
    lines.append(f"- Theme deltas: {len(deltas['theme_deltas'])}")
    lines.append(f"- Play deltas: {len(deltas['play_deltas'])}")
    lines.append("")
    lines.append("Top contributors to deltas (pattern attribution):")
    lines.append("")

    # Surface dominant patterns in deltas so weights can be tuned.
    delta_patterns = defaultdict(int)
    for e in deltas["theme_deltas"]:
        delta_patterns[f"theme: {e.get('institution_type', '?')} | {e.get('signal_type', '?')}"] += 1
    for e in deltas["play_deltas"]:
        delta_patterns[f"play: {e.get('institution_type', '?')} | tier={e.get('tier', '?')}"] += 1

    if delta_patterns:
        for pattern, count in sorted(delta_patterns.items(), key=lambda kv: kv[1], reverse=True)[:10]:
            lines.append(f"- {pattern}: {count}")
        lines.append("")
        lines.append("(Adjust pattern weights in `scripts/generate_unmapped_first_pass.py` only when a pattern is responsible for >=3 disagreements in a batch — per rubric.)")
    else:
        lines.append("- (none yet; queue more reviewed rows to build calibration signal)")
    lines.append("")

    if deltas["auto_human_disagreements"]:
        lines.append("## Auto-accepted rows that received human edits")
        lines.append("")
        lines.append(f"Found {len(deltas['auto_human_disagreements'])} auto-accepted rows with human notes — review these to recalibrate auto-accept thresholds.")
        lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Aggregate reviewer decisions and emit calibration report.")
    parser.add_argument(
        "--input",
        default=str(INPUT_CSV),
        help="Path to first-pass CSV (default: data/unmapped_review_first_pass.csv)",
    )
    parser.add_argument(
        "--since",
        default=None,
        help="ISO date (YYYY-MM-DD) to filter the calibration window. Defaults to full history.",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        raise FileNotFoundError(f"Missing input CSV: {input_path}")

    with input_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    finalized = collect_finalized_rows(rows)

    store = load_existing_store()
    upserts = 0
    for entry in finalized:
        sig_id = entry["signal_id"]
        if not sig_id:
            continue
        store[sig_id] = entry
        upserts += 1

    write_jsonl_store(store)

    since_iso = None
    if args.since:
        # Normalize to a UTC ISO prefix that compares lexically with reviewed_at_utc.
        since_iso = f"{args.since}T00:00:00Z"

    window_entries = filter_since(store, since_iso)
    deltas = compute_deltas(window_entries)
    report = render_report(window_entries, deltas, since_iso)
    REPORT_PATH.write_text(report, encoding="utf-8")

    print(f"Upserted {upserts} entries into {JSONL_STORE.relative_to(ROOT)} (store size: {len(store)})")
    print(f"Wrote calibration report to {REPORT_PATH.relative_to(ROOT)}")
    print(f"  Decision deltas: {len(deltas['decision_deltas'])}")
    print(f"  Theme deltas:    {len(deltas['theme_deltas'])}")
    print(f"  Play deltas:     {len(deltas['play_deltas'])}")


if __name__ == "__main__":
    main()
