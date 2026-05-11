"""Run the daily unmapped-review prefill pipeline.

This command prepares the review artifacts without applying human decisions:
  1. Generate the first-pass unmapped review queue.
  2. Auto-accept the high-confidence rows in that queue.
  3. Rebuild the workbook and dashboard artifacts from the refreshed queue.

The script is intended to be run by a scheduled job so reviewers start each day
with the latest prefilled queue, workbook, and dashboard.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run_step(label: str, args: list[str]) -> None:
    print(f"\n==> {label}")
    print(" ".join(args))
    subprocess.run(args, cwd=ROOT, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Prefill the unmapped review workflow artifacts.")
    parser.add_argument(
        "--scope",
        choices=["strict", "expanded", "all"],
        default="strict",
        help="Queue scope to generate before auto-accept and workbook/dashboard rebuild.",
    )
    parser.add_argument(
        "--map-min-confidence",
        choices=["high", "medium", "low"],
        default="high",
        help="Minimum confidence used by the auto-accept step for map decisions.",
    )
    parser.add_argument(
        "--skip-workbook",
        action="store_true",
        help="Skip rebuilding the Excel workbook artifact.",
    )
    parser.add_argument(
        "--skip-dashboard",
        action="store_true",
        help="Skip rebuilding the HTML dashboard artifact.",
    )
    args = parser.parse_args()

    python = sys.executable

    run_step(
        "Generate first-pass queue",
        [python, "scripts/generate_unmapped_first_pass.py", "--scope", args.scope],
    )
    run_step(
        "Auto-accept high-confidence rows",
        [python, "scripts/auto_accept_first_pass.py", "--map-min-confidence", args.map_min_confidence],
    )

    if not args.skip_workbook:
        run_step("Rebuild review workbook", [python, "scripts/build_unmapped_review_workbook.py"])

    if not args.skip_dashboard:
        run_step("Rebuild review dashboard", [python, "scripts/unmapped_review_dashboard.py"])

    print("\nReview prefill pipeline complete.")


if __name__ == "__main__":
    main()