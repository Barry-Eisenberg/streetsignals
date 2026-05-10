"""Build a multi-tab Excel workbook for unmapped signal review.

Tabs:
- review_queue: data/unmapped_review_first_pass.csv
- quick_pick: concise initiative classification cue card
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
INPUT_CSV = DATA_DIR / "unmapped_review_first_pass.csv"
OUTPUT_XLSX = DATA_DIR / "unmapped_review_first_pass.xlsx"
INITIATIVE_TAXONOMY_PATH = DATA_DIR / "initiative-taxonomy.v1.json"


def autofit_columns(ws) -> None:
    max_lens = {}
    for row in ws.iter_rows(values_only=True):
        for idx, value in enumerate(row, start=1):
            text = "" if value is None else str(value)
            max_lens[idx] = max(max_lens.get(idx, 0), len(text))

    for idx, length in max_lens.items():
        ws.column_dimensions[get_column_letter(idx)].width = min(max(12, length + 2), 60)


def add_csv_sheet(wb: Workbook) -> None:
    ws = wb.active
    ws.title = "review_queue"

    with INPUT_CSV.open("r", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        for row in reader:
            ws.append(row)

    header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)

    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font

    ws.freeze_panes = "A2"
    autofit_columns(ws)


def add_quick_pick_sheet(wb: Workbook) -> None:
    ws = wb.create_sheet(title="quick_pick")

    rows = [
        ["Cue", "Recommended initiative classification(s)", "Notes"],
        ["Tokenized fund shares, treasuries, bonds, RWAs", "Tokenized Securities / RWA", "Assets on-chain"],
        ["Stablecoin, deposit token, on-chain cash", "Stablecoins & Deposit Tokens", "Digital money instrument"],
        ["Cross-border payment execution, payment rails", "Payment Infrastructure", "Flow execution and orchestration"],
        ["Clearing, settlement finality, custody, collateral, post-trade", "Settlement Infrastructure", "Market plumbing"],
        ["Enterprise blockchain platform, DLT network participation", "DLT / Blockchain Infrastructure", "Core infra build/participation"],
        ["Standards, interoperability, messaging bridges", "Interoperability & Standards", "Cross-system connectivity"],
        ["CBDC pilot/policy implementation", "CBDC", "Public money"],
        ["Protocol-native lending, AMM, decentralized derivatives", "DeFi", "Protocol finance"],
        ["Regulation, supervision, compliance obligations", "Regulatory / Compliance", "Policy and controls"],
        ["Enterprise roadmap, governance, strategic posture", "Digital Asset Strategy", "Operating model and governance"],
        ["Native crypto market activity (no institutional workflow)", "Crypto / Digital Assets", "Crypto-market specific"],
        ["", "", ""],
        ["Common multi-label combinations", "", ""],
        ["Tokenized issuance + post-trade servicing", "Tokenized Securities / RWA | Settlement Infrastructure", "Instrument + plumbing"],
        ["Stablecoin cash movement + rail execution", "Stablecoins & Deposit Tokens | Payment Infrastructure", "Instrument + payments"],
        ["DLT platform + connectivity standards", "DLT / Blockchain Infrastructure | Interoperability & Standards", "Core infra + standards"],
        ["Regulatory perimeter + stablecoin implementation", "Regulatory / Compliance | Stablecoins & Deposit Tokens", "Policy + implementation"],
        ["Strategy-driven platform build", "Digital Asset Strategy | DLT / Blockchain Infrastructure", "Roadmap + execution"],
        ["", "", ""],
        ["Theme projection", "", ""],
        ["tokenized theme", "Tokenized Securities / RWA", ""],
        ["stablecoins theme", "Stablecoins & Deposit Tokens | CBDC | Payment Infrastructure", ""],
        ["dlt theme", "DLT / Blockchain Infrastructure | Settlement Infrastructure | Interoperability & Standards | DeFi | Payment Infrastructure", ""],
    ]

    for row in rows:
        ws.append(row)

    header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
    section_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)

    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font

    for row_idx in (14, 21):
        for col_idx in range(1, 4):
            cell = ws.cell(row=row_idx, column=col_idx)
            cell.fill = section_fill
            cell.font = Font(bold=True)

    ws.freeze_panes = "A2"
    autofit_columns(ws)


def add_initiative_options_sheet(wb: Workbook) -> None:
    ws = wb.create_sheet(title="initiative_options")

    taxonomy = json.loads(INITIATIVE_TAXONOMY_PATH.read_text(encoding="utf-8"))
    initiatives = [
        i
        for i in taxonomy.get("canonicalInitiatives", [])
        if i.get("active", True)
    ]

    # Keep one commonly used mapped label as a supplemental choice so the tab
    # reflects the working 12-option reviewer set.
    if len(initiatives) == 11:
        initiatives.append(
            {
                "name": "Cross-Border Payments",
                "group": "Payments",
                "description": "Alias mapped to Payment Infrastructure for matrix consistency.",
                "isMatrixCategory": True,
            }
        )

    ws.append(["Initiative Selection Options", "", "", ""])
    ws.append([
        "Initiative Classification",
        "Group",
        "Description",
        "Matrix Category",
    ])

    for item in initiatives:
        ws.append(
            [
                item.get("name", ""),
                item.get("group", ""),
                item.get("description", ""),
                "Yes" if item.get("isMatrixCategory") else "No",
            ]
        )

    ws.merge_cells("A1:D1")
    ws["A1"].font = Font(bold=True, size=12)

    header_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    for cell in ws[2]:
        cell.font = Font(bold=True)
        cell.fill = header_fill

    ws.freeze_panes = "A3"
    autofit_columns(ws)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build multi-tab workbook for unmapped review")
    parser.add_argument(
        "--output",
        default=str(OUTPUT_XLSX),
        help="Output workbook path",
    )
    args = parser.parse_args()

    if not INPUT_CSV.exists():
        raise FileNotFoundError(f"Missing input CSV: {INPUT_CSV}")

    output_path = Path(args.output)

    wb = Workbook()
    add_csv_sheet(wb)
    add_quick_pick_sheet(wb)
    add_initiative_options_sheet(wb)
    wb.save(output_path)

    try:
        display_path = output_path.relative_to(ROOT)
    except ValueError:
        display_path = output_path
    print(f"Workbook created: {display_path}")


if __name__ == "__main__":
    main()
