"""
Auto-accept high-confidence first-pass results.

Operating model:
  1. scripts/generate_unmapped_first_pass.py produces suggestions per signal.
  2. This script reads that CSV and copies the suggestions into the canonical
     reviewer columns (decision, mapped_themes, primary_play_id, etc.) for
     rows above a confidence threshold.
  3. Rows below the threshold are left untouched — those queue for human
     review in the unmapped_review_first_pass.xlsx workbook.

Decision rules implemented here:
  - suggested_decision == "map" AND suggested_confidence == "high"
      -> auto-accept (write decision=map, copy themes/plays/initiatives)
  - suggested_decision == "candidate_new_theme" AND reason == RC09
      -> auto-accept as candidate_new_theme (held for future 4th theme)
  - suggested_decision == "keep_unmapped" AND reason in {RC03, RC08}
      -> auto-accept (these are reliably noise: native crypto + macro)
  - everything else -> leave empty for human review

Idempotent: running this twice on the same input is a no-op for already-
filled rows (skips any row where reviewer 'decision' is non-empty).

Output: overwrites data/unmapped_review_first_pass.csv in place, sets
'reviewer_id' to 'auto_accepter_v1' on accepted rows, and prints a summary
of accept/queue counts.
"""

from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
INPUT_CSV = DATA_DIR / "unmapped_review_first_pass.csv"

REVIEWER_ID = "auto_accepter_v1"

# Reason codes that are reliable noise -- safe to auto-close as keep_unmapped.
AUTO_ACCEPT_KEEP_UNMAPPED_REASONS = {
    "RC03_NATIVE_CRYPTO_ONLY",
    "RC08_MACRO_COMMENTARY",
}

# RC09 is now routed through normal theme mapping via the perimeter theme.
AUTO_ACCEPT_CANDIDATE_REASONS = set()


def should_auto_accept(row: Dict[str, str]) -> str:
    """Return the auto-accept disposition for a row.

    Returns one of:
      'map_high'        -> high-confidence theme map
      'candidate_rc09'  -> RC09 perimeter candidate (held for future theme)
      'keep_noise'      -> reliable-noise keep_unmapped (RC03 / RC08)
      ''                -> do not auto-accept (queue for human)
    """
    suggested_decision = row.get("suggested_decision", "")
    suggested_confidence = row.get("suggested_confidence", "")
    suggested_reason = row.get("suggested_primary_reason_code", "")

    if suggested_decision == "map" and suggested_confidence == "high":
        return "map_high"

    if suggested_decision == "candidate_new_theme" and suggested_reason in AUTO_ACCEPT_CANDIDATE_REASONS:
        return "candidate_rc09"

    if suggested_decision == "keep_unmapped" and suggested_reason in AUTO_ACCEPT_KEEP_UNMAPPED_REASONS:
        return "keep_noise"

    return ""


def apply_auto_accept(row: Dict[str, str], disposition: str, now_utc: str) -> None:
    """Mutate row in place, writing reviewer columns based on disposition."""
    row["decision"] = (
        "map" if disposition == "map_high"
        else "candidate_new_theme" if disposition == "candidate_rc09"
        else "keep_unmapped"
    )
    row["initiative_classifications"] = row.get("suggested_initiative_classifications", "")
    row["mapped_themes"] = row.get("suggested_mapped_themes", "")
    row["mapped_plays"] = row.get("suggested_primary_play_id", "")
    row["primary_play_id"] = row.get("suggested_primary_play_id", "")
    row["play_audience"] = row.get("suggested_play_audience", "")
    row["tie_breaker_used"] = "auto" if disposition == "map_high" else "none"
    row["confidence"] = row.get("suggested_confidence", "")
    row["primary_reason_code"] = row.get("suggested_primary_reason_code", "")

    # Compose a reviewer note that explains the auto-decision so downstream
    # auditors can quickly distinguish auto from human reviews.
    if disposition == "map_high":
        note = "auto-accepted: high-confidence theme + play match"
    elif disposition == "candidate_rc09":
        note = "auto-held: regulatory perimeter signal pending future 4th theme"
    else:
        note = f"auto-closed: reliable-noise classification ({row.get('suggested_primary_reason_code', '')})"
    row["reviewer_notes"] = note
    row["reviewer_id"] = REVIEWER_ID
    row["reviewed_at_utc"] = now_utc


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Auto-accept high-confidence first-pass results into reviewer columns."
    )
    parser.add_argument(
        "--input",
        default=str(INPUT_CSV),
        help="Path to first-pass CSV (default: data/unmapped_review_first_pass.csv)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be auto-accepted without writing to disk.",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        raise FileNotFoundError(f"Missing input CSV: {input_path}")

    with input_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        rows: List[Dict[str, str]] = list(reader)

    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    counts = {"map_high": 0, "candidate_rc09": 0, "keep_noise": 0, "skipped_already_reviewed": 0, "queued_for_human": 0}

    for row in rows:
        # Idempotent: never overwrite a human or prior-auto decision.
        if (row.get("decision") or "").strip():
            counts["skipped_already_reviewed"] += 1
            continue

        disposition = should_auto_accept(row)
        if not disposition:
            counts["queued_for_human"] += 1
            continue

        apply_auto_accept(row, disposition, now_utc)
        counts[disposition] += 1

    if args.dry_run:
        print("DRY RUN — no file written")
    else:
        with input_path.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    total_accepted = counts["map_high"] + counts["candidate_rc09"] + counts["keep_noise"]
    total_rows = len(rows)
    print(f"Read {total_rows} rows from {input_path.relative_to(ROOT)}")
    print(f"Auto-accepted as map (high confidence): {counts['map_high']}")
    print(f"Auto-held as candidate_new_theme (RC09): {counts['candidate_rc09']}")
    print(f"Auto-closed as keep_unmapped (RC03/RC08): {counts['keep_noise']}")
    print(f"Skipped (already had a decision): {counts['skipped_already_reviewed']}")
    print(f"Queued for human review: {counts['queued_for_human']}")
    if total_rows:
        pct = round(100 * total_accepted / total_rows, 1)
        print(f"Auto-accept rate: {pct}% ({total_accepted}/{total_rows})")


if __name__ == "__main__":
    main()
