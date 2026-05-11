"""
Stage 4 writeback: persist finalized reviewer decisions into source signal JSON
so runtime theming does not depend on fallback heuristics.

Inputs:
    - data/reviewer_decisions.jsonl (preferred, finalized store)
    - data/unmapped_review_first_pass.csv (supplemental / fallback)

Outputs (in-place):
    - data/data.json
    - data/auto_data.json

Behavior:
    - Applies rows where decision == "map".
    - Matches records by (institution, initiative, date).
    - Uses CSV initiative classifications when available.
    - Derives initiative_types from mapped themes for JSONL decisions.
    - Creates .bak files before overwriting unless --no-backup is set.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
DEFAULT_REVIEW_CSV = DATA_DIR / "unmapped_review_first_pass.csv"
DEFAULT_DECISIONS_JSONL = DATA_DIR / "reviewer_decisions.jsonl"
DEFAULT_MANUAL_JSON = DATA_DIR / "data.json"
DEFAULT_AUTO_JSON = DATA_DIR / "auto_data.json"

THEME_TO_INITIATIVE = {
    "dlt": "General Infrastructure",
    "stablecoins": "Payments / Stablecoins",
    "tokenized": "Tokenization",
    "perimeter": "Regulatory / Compliance",
}
THEME_INITIATIVE_SET = set(THEME_TO_INITIATIVE.values())
HIGH_TIERS = {"Structural", "Material"}


@dataclass
class DecisionRecord:
    institution: str
    initiative: str
    date: str
    initiative_types: List[str]
    signal_id: str


def _norm(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


def _key(institution: str, initiative: str, date: str) -> Tuple[str, str, str]:
    return (_norm(institution), _norm(initiative), (date or "").strip())


def _split_pipe(value: str) -> List[str]:
    return [x.strip() for x in (value or "").split("|") if x.strip()]


def _split_themes(value: str) -> List[str]:
    return [x.strip().lower() for x in re.split(r"[|,;]", value or "") if x.strip()]


def _to_base36(value: int) -> str:
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    if value == 0:
        return "0"
    out = ""
    n = value
    while n:
        n, r = divmod(n, 36)
        out = chars[r] + out
    return out


def make_signal_id(seed: str) -> str:
    h = 5381
    for ch in seed:
        h = ((h << 5) + h) ^ ord(ch)
        h &= 0xFFFFFFFF
    if h >= 0x80000000:
        h -= 0x100000000
    return _to_base36(abs(h))


def load_map_decisions_from_csv(csv_path: Path) -> Dict[Tuple[str, str, str], DecisionRecord]:
    decisions: Dict[Tuple[str, str, str], DecisionRecord] = {}

    with csv_path.open("r", encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))

    for row in rows:
        if (row.get("decision") or "").strip() != "map":
            continue

        initiative_types = _split_pipe(row.get("initiative_classifications", ""))
        if not initiative_types:
            initiative_types = _split_pipe(row.get("suggested_initiative_classifications", ""))
        if not initiative_types:
            continue

        key = _key(row.get("institution", ""), row.get("initiative", ""), row.get("date", ""))
        if not all(key):
            continue

        decisions[key] = DecisionRecord(
            institution=row.get("institution", ""),
            initiative=row.get("initiative", ""),
            date=row.get("date", ""),
            initiative_types=initiative_types,
            signal_id=row.get("signal_id", ""),
        )

    return decisions


def load_map_decisions_from_jsonl(jsonl_path: Path) -> Dict[Tuple[str, str, str], DecisionRecord]:
    decisions: Dict[Tuple[str, str, str], DecisionRecord] = {}

    with jsonl_path.open("r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line:
                continue
            row = json.loads(line)

            if (row.get("decision") or "").strip() != "map":
                continue

            mapped_themes = _split_themes(row.get("mapped_themes", ""))
            initiative_types = [THEME_TO_INITIATIVE[t] for t in mapped_themes if t in THEME_TO_INITIATIVE]
            if not initiative_types:
                continue

            # Keep deterministic ordering and remove duplicates.
            seen = set()
            deduped = []
            for x in initiative_types:
                if x not in seen:
                    deduped.append(x)
                    seen.add(x)

            key = _key(row.get("institution", ""), row.get("initiative", ""), row.get("date", ""))
            if not all(key):
                continue

            decisions[key] = DecisionRecord(
                institution=row.get("institution", ""),
                initiative=row.get("initiative", ""),
                date=row.get("date", ""),
                initiative_types=deduped,
                signal_id=row.get("signal_id", ""),
            )

    return decisions


def load_json(path: Path) -> List[dict]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError(f"Expected list in {path}")
    return data


def write_json(path: Path, data: List[dict], backup: bool) -> None:
    if backup:
        backup_path = path.with_suffix(path.suffix + ".bak")
        shutil.copy2(path, backup_path)
    with path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def apply_writeback(records: List[dict], decisions: Dict[Tuple[str, str, str], DecisionRecord]) -> Tuple[int, int]:
    updated = 0
    matched = 0

    for rec in records:
        key = _key(rec.get("institution", ""), rec.get("initiative", ""), rec.get("date", ""))
        decision = decisions.get(key)
        if not decision:
            continue

        matched += 1
        current = rec.get("initiative_types")
        if current != decision.initiative_types:
            rec["initiative_types"] = decision.initiative_types
            updated += 1

    return matched, updated


def _needs_reviewer_followup(rec: dict) -> bool:
    if (rec.get("tier") or "") not in HIGH_TIERS:
        return False

    initiative_types = rec.get("initiative_types") or []
    if not isinstance(initiative_types, list):
        return True

    # Flag high-tier records that still do not map to any playbook-driving class.
    return not any(item in THEME_INITIATIVE_SET for item in initiative_types)


def build_followup_report_rows(records: List[dict], source: str, id_offset: int) -> List[dict]:
    rows: List[dict] = []
    for idx, rec in enumerate(records):
        if not _needs_reviewer_followup(rec):
            continue
        seed = f"{rec.get('institution', '')}-{rec.get('initiative', '')}-{rec.get('date', '')}-{id_offset + idx}"
        rows.append(
            {
                "source_file": source,
                "signal_id": make_signal_id(seed),
                "tier": rec.get("tier", ""),
                "date": rec.get("date", ""),
                "institution": rec.get("institution", ""),
                "initiative": rec.get("initiative", ""),
                "initiative_types": "|".join(rec.get("initiative_types") or []),
            }
        )
    return rows


def write_followup_report(path: Path, rows: List[dict]) -> None:
    fieldnames = [
        "source_file",
        "signal_id",
        "tier",
        "date",
        "institution",
        "initiative",
        "initiative_types",
    ]
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Stage 4 writeback into source signal JSON files.")
    parser.add_argument("--input", default=str(DEFAULT_REVIEW_CSV), help="Path to review CSV")
    parser.add_argument(
        "--decisions-jsonl",
        default=str(DEFAULT_DECISIONS_JSONL),
        help="Path to finalized reviewer decisions JSONL",
    )
    parser.add_argument("--manual", default=str(DEFAULT_MANUAL_JSON), help="Path to data.json")
    parser.add_argument("--auto", default=str(DEFAULT_AUTO_JSON), help="Path to auto_data.json")
    parser.add_argument(
        "--report-unmapped",
        default="",
        help="Optional CSV output path for unresolved high-tier follow-up records",
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing files")
    parser.add_argument("--no-backup", action="store_true", help="Skip .bak creation before writes")
    args = parser.parse_args()

    input_csv = Path(args.input)
    decisions_jsonl = Path(args.decisions_jsonl)
    manual_json = Path(args.manual)
    auto_json = Path(args.auto)
    report_unmapped = Path(args.report_unmapped) if args.report_unmapped else None

    if not input_csv.exists() and not decisions_jsonl.exists():
        raise FileNotFoundError(
            f"Need at least one decisions input. Missing: {input_csv} and {decisions_jsonl}"
        )
    if not manual_json.exists():
        raise FileNotFoundError(f"Missing manual JSON: {manual_json}")
    if not auto_json.exists():
        raise FileNotFoundError(f"Missing auto JSON: {auto_json}")

    decisions: Dict[Tuple[str, str, str], DecisionRecord] = {}
    csv_count = 0
    jsonl_count = 0

    if input_csv.exists():
        csv_decisions = load_map_decisions_from_csv(input_csv)
        decisions.update(csv_decisions)
        csv_count = len(csv_decisions)

    if decisions_jsonl.exists():
        jsonl_decisions = load_map_decisions_from_jsonl(decisions_jsonl)
        decisions.update(jsonl_decisions)
        jsonl_count = len(jsonl_decisions)

    if not decisions:
        print("No map decisions found; nothing to write back.")
        return

    manual_data = load_json(manual_json)
    auto_data = load_json(auto_json)

    manual_matched, manual_updated = apply_writeback(manual_data, decisions)
    auto_matched, auto_updated = apply_writeback(auto_data, decisions)

    decision_count = len(decisions)
    total_matched = manual_matched + auto_matched
    total_updated = manual_updated + auto_updated

    if input_csv.exists():
        print(f"Loaded CSV map decisions:   {csv_count} from {input_csv.relative_to(ROOT)}")
    if decisions_jsonl.exists():
        print(f"Loaded JSONL map decisions: {jsonl_count} from {decisions_jsonl.relative_to(ROOT)}")
    print(f"Combined unique map decisions: {decision_count}")
    print(f"Manual matches: {manual_matched}, updates: {manual_updated}")
    print(f"Auto matches:   {auto_matched}, updates: {auto_updated}")

    unmatched = max(0, decision_count - total_matched)
    print(f"Unmatched map decisions: {unmatched}")

    if report_unmapped:
        report_rows = []
        report_rows.extend(build_followup_report_rows(manual_data, "data.json", id_offset=0))
        report_rows.extend(build_followup_report_rows(auto_data, "auto_data.json", id_offset=100000))
        report_rows.sort(key=lambda x: (x["date"], x["signal_id"]), reverse=True)
        write_followup_report(report_unmapped, report_rows)
        print(f"Wrote unresolved follow-up report: {report_unmapped} ({len(report_rows)} rows)")

    if args.dry_run:
        print("Dry run complete. No files written.")
        return

    if total_updated == 0:
        print("No initiative_types changes detected; nothing written.")
        return

    write_json(manual_json, manual_data, backup=not args.no_backup)
    write_json(auto_json, auto_data, backup=not args.no_backup)

    print(f"Wrote updates to {manual_json.relative_to(ROOT)} and {auto_json.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
