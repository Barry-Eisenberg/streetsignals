"""Finalize unmapped-review edits exported from the dashboard.

This command is the bridge between the dashboard export and the source
datasets. It runs the reviewer decision aggregation step followed by the
writeback step so reviewers do not need to invoke multiple scripts manually.

Typical usage:
  python scripts/finalize_unmapped_review.py --input path/to/unmapped_review_first_pass.edited.csv
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
    parser = argparse.ArgumentParser(description="Finalize dashboard-reviewed unmapped signals.")
    parser.add_argument(
        "--input",
        default=str(ROOT / "data" / "unmapped_review_first_pass.csv"),
        help="Path to the reviewed CSV exported from the dashboard.",
    )
    parser.add_argument(
        "--since",
        default=None,
        help="Optional ISO date (YYYY-MM-DD) to window the calibration report.",
    )
    parser.add_argument(
        "--report-unmapped",
        default="",
        help="Optional CSV output path for unresolved high-tier follow-up records.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview the aggregate/writeback chain without writing the source JSON files.",
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="Skip .bak creation before writeback updates.",
    )
    args = parser.parse_args()

    input_path = Path(args.input).resolve()
    if not input_path.exists():
        raise FileNotFoundError(f"Missing reviewed CSV: {input_path}")

    aggregate_args = [sys.executable, "scripts/aggregate_reviewer_decisions.py", "--input", str(input_path)]
    if args.since:
        aggregate_args += ["--since", args.since]

    writeback_args = [
        sys.executable,
        "scripts/writeback_reviewer_decisions.py",
        "--input",
        str(input_path),
    ]
    if args.report_unmapped:
        writeback_args += ["--report-unmapped", args.report_unmapped]
    if args.dry_run:
        writeback_args.append("--dry-run")
    if args.no_backup:
        writeback_args.append("--no-backup")

    run_step("Aggregate reviewer decisions", aggregate_args)
    run_step("Write back mapped decisions", writeback_args)

    print("\nFinalization complete.")


if __name__ == "__main__":
    main()