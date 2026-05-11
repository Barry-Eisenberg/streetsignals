"""
Inspect signal description quality for a rolling time window.

This script audits auto_data.json and emits CSV/TXT reports with heuristic flags
for likely contamination or low-quality summaries.

Notable checks:
- Chrome/navigation leakage (e.g., "Read more", "Load more")
- "You might also like" leakage
- ESMA contact/document boilerplate
- Truncated tails
- NEW: low title/description overlap detector
    - title_overlap_too_low: description has very low lexical overlap with title,
        indicating potential content mismatch

Usage:
  python scripts/inspect_signal_content.py --past-days 10 --today 2026-05-11
  python scripts/inspect_signal_content.py --past-days 10 --focus-domain crypto.news
"""

from __future__ import annotations

import argparse
import csv
import json
import ctypes
import re
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
AUTO_DATA_PATH = ROOT / "data" / "auto_data.json"
SCRIPTS_DIR = ROOT / "scripts"

# Keep short/common terms out of overlap scoring.
STOPWORDS = {
    "a", "an", "the", "and", "or", "of", "for", "to", "in", "on", "at", "by", "with",
    "from", "into", "over", "under", "new", "says", "say", "is", "are", "as", "be",
    "after", "before", "amid", "via", "about", "that", "this", "these", "those", "it",
}

PATTERNS: Dict[str, re.Pattern[str]] = {
    "you_might_also_like": re.compile(r"\byou might also like\b", re.I),
    "read_more": re.compile(r"\bread more\b", re.I),
    "load_more": re.compile(r"\bload more\b", re.I),
    "site_nav": re.compile(r"best crypto platforms|explore deep dives|opinion|markets|interviews", re.I),
    "esma_press_contact": re.compile(r"press@esma\.europa\.eu|communications officer|further information\s*:", re.I),
    "esma_doc_download": re.compile(r"download all files|download selected files|related documents|\bESMA\d{2}-\d+\b", re.I),
    "skip_to_main": re.compile(r"skip to main content", re.I),
    "cookie_privacy": re.compile(r"cookie|privacy policy|terms of use", re.I),
    "truncated_tail": re.compile(r"\b(the|and|with|to|for|on|of|in|at)\s*$", re.I),
}

WEIGHTS = {
    "you_might_also_like": 6,
    "read_more": 4,
    "load_more": 4,
    "site_nav": 4,
    "esma_press_contact": 6,
    "esma_doc_download": 5,
    "skip_to_main": 4,
    "cookie_privacy": 3,
    "truncated_tail": 2,
    "too_short_180": 1,
    "title_overlap_too_low": 5,
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Inspect signal content quality")
    p.add_argument("--past-days", type=int, default=10, help="Inclusive rolling window size (default 10)")
    p.add_argument(
        "--today",
        type=str,
        default=datetime.now().strftime("%Y-%m-%d"),
        help="Anchor date YYYY-MM-DD (default: system date)",
    )
    p.add_argument("--focus-domain", type=str, default="", help="Optional domain focus (e.g., crypto.news)")
    return p.parse_args()


def parse_date(value: str) -> datetime | None:
    try:
        return datetime.strptime((value or "").strip(), "%Y-%m-%d")
    except Exception:
        return None


def to_base36(n: int) -> str:
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    if n == 0:
        return "0"
    out = ""
    while n:
        n, r = divmod(n, 36)
        out = chars[r] + out
    return out


def make_id_js(signal: Dict[str, str], idx: int) -> str:
    seed = (
        (signal.get("institution") or "")
        + "-"
        + (signal.get("initiative") or "")
        + "-"
        + (signal.get("date") or "")
        + "-"
        + str(idx)
    )
    h = 5381
    for ch in seed:
        h = ctypes.c_int32(((h << 5) + h) ^ ord(ch)).value
    return to_base36(abs(h))


def token_set(value: str) -> set[str]:
    tokens = re.findall(r"[a-z0-9]+", (value or "").lower())
    return {t for t in tokens if len(t) >= 3 and t not in STOPWORDS}


def title_overlap_flags(title: str, desc: str) -> List[str]:
    flags: List[str] = []
    tt = token_set(title)
    dt = token_set(desc)

    # Low-overlap detector: if title and description barely intersect,
    # treat as potential content mismatch.
    if len(tt) >= 4:
        overlap = len(tt & dt) / len(tt)
        if overlap <= 0.18:
            flags.append("title_overlap_too_low")

    return flags


def score_and_confidence(reasons: List[str]) -> tuple[int, str]:
    score = sum(WEIGHTS.get(r, 0) for r in reasons)
    if score >= 8:
        return score, "high"
    if score >= 4:
        return score, "medium"
    if reasons:
        return score, "low"
    return score, "clean"


def main() -> None:
    args = parse_args()

    today = parse_date(args.today)
    if not today:
        raise ValueError("--today must be YYYY-MM-DD")
    start = today - timedelta(days=max(args.past_days - 1, 0))

    rows = json.loads(AUTO_DATA_PATH.read_text(encoding="utf-8"))

    audited: List[Dict[str, str]] = []
    for idx, row in enumerate(rows):
        d = parse_date(row.get("date", ""))
        if not d or not (start.date() <= d.date() <= today.date()):
            continue

        url = (row.get("source_url") or "").strip()
        domain = urlparse(url).netloc.lower()
        if args.focus_domain and domain != args.focus_domain.lower():
            continue

        desc = (row.get("description") or "").strip()
        title = (row.get("initiative") or row.get("title") or "").strip()
        signal_id = make_id_js(row, idx + 100000)

        reasons = [name for name, rx in PATTERNS.items() if rx.search(desc)]
        reasons.extend(title_overlap_flags(title, desc))
        if len(desc) <= 180:
            reasons.append("too_short_180")

        # Deduplicate while preserving order.
        deduped = list(dict.fromkeys(reasons))
        score, confidence = score_and_confidence(deduped)

        audited.append(
            {
                "id": signal_id,
                "idx": str(idx),
                "date": row.get("date", ""),
                "domain": domain,
                "confidence": confidence,
                "score": str(score),
                "reasons": "|".join(deduped),
                "desc_len": str(len(desc)),
                "url": url,
                "initiative": title[:180],
                "description_head": desc[:300].replace("\n", " "),
            }
        )

    flagged = [r for r in audited if r["confidence"] != "clean"]
    flagged.sort(key=lambda r: (-int(r["score"]), r["date"], r["url"]))

    stamp = today.strftime("%Y-%m-%d")
    domain_suffix = f"_{args.focus_domain.replace('.', '_')}" if args.focus_domain else ""
    csv_path = SCRIPTS_DIR / f"past{args.past_days}_content_audit{domain_suffix}_{stamp}.csv"
    txt_path = SCRIPTS_DIR / f"past{args.past_days}_content_audit{domain_suffix}_{stamp}.txt"

    fields = [
        "id",
        "idx",
        "date",
        "domain",
        "confidence",
        "score",
        "reasons",
        "desc_len",
        "url",
        "initiative",
        "description_head",
    ]

    with csv_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(audited)

    by_domain = Counter(r["domain"] for r in flagged)
    by_conf = Counter(r["confidence"] for r in flagged)
    by_reason = Counter()
    for r in flagged:
        for reason in r["reasons"].split("|") if r["reasons"] else []:
            if reason:
                by_reason[reason] += 1

    lines: List[str] = []
    lines.append("SIGNAL_CONTENT_AUDIT")
    lines.append(f"WINDOW {start.date()} to {today.date()}")
    lines.append(f"TOTAL_IN_WINDOW {len(audited)}")
    lines.append(f"FLAGGED {len(flagged)}")
    lines.append(f"FLAGGED_BY_CONFIDENCE {dict(by_conf)}")
    lines.append("")
    lines.append("FLAGGED_BY_REASON")
    for reason, count in by_reason.most_common():
        lines.append(f"{reason}\t{count}")
    lines.append("")
    lines.append("FLAGGED_BY_DOMAIN")
    for domain, count in by_domain.most_common():
        lines.append(f"{domain}\t{count}")
    lines.append("")
    lines.append("TOP_60_FLAGGED")
    for r in flagged[:60]:
        lines.append(
            f"{r['id']}\t{r['date']}\t{r['domain']}\t{r['confidence']}\t{r['score']}\t{r['reasons']}"
        )
        lines.append(f"  {r['url']}")
        lines.append(f"  {r['description_head']}")

    txt_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"WROTE {csv_path.relative_to(ROOT)}")
    print(f"WROTE {txt_path.relative_to(ROOT)}")
    print(f"TOTAL_IN_WINDOW {len(audited)}")
    print(f"FLAGGED {len(flagged)}")
    print(f"TITLE_OVERLAP_TOO_LOW {by_reason.get('title_overlap_too_low', 0)}")


if __name__ == "__main__":
    main()
