"""
Generate an intelligent first-pass review queue for currently unmapped signals.

Output:
  data/unmapped_review_first_pass.csv

This script mirrors the current client-side tier/theme logic, then adds a
heuristic recommender to prefill review decisions before manual adjudication.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
INPUT_FILES = [DATA_DIR / "data.json", DATA_DIR / "auto_data.json"]
OUTPUT_FILE = DATA_DIR / "unmapped_review_first_pass.csv"

THEME_MAP_INITIATIVE: Dict[str, List[str]] = {
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

STRUCTURAL_SIGNAL_TYPES = {
    "Platform / Infrastructure",
    "Strategic Initiative",
    "Investment / M&A",
    "Strategic Filing / Plan",
    "Regulatory / Compliance Framework",
    "Regulatory Action",
    "Infrastructure Upgrade",
}

MATERIAL_SIGNAL_TYPES = {
    "Product Launch",
    "Strategic Partnership",
    "Pilot / Trial",
    "Leadership & Governance",
    "Intelligence Brief",
}

# Macro / monetary-policy commentary that mentions crypto only as a market
# reaction. These should not stay in the Structural unmapped queue.
MACRO_COMMENTARY_PATTERN = re.compile(
    r"\b(jobless claims|rate cut(?:s)?|fed (?:cut|hold|pivot|chair|policy)|inflation|cpi|ppi|nonfarm payrolls?|unemployment|monetary policy|hawkish|dovish|higher[-\s]for[-\s]longer|ecb stays on alert|bundesbank|nagel|powell|fed pick|bitcoin slide(?:s|d)?|btc slide(?:s|d)?|spot bitcoin etf|etf inflows?|etf outflows?)\b",
    re.IGNORECASE,
)

# Crypto-native venue / M&A inside the crypto stack. Even Tier 1 banks doing
# this should not map to institutional infrastructure themes.
CRYPTO_NATIVE_VENUE_PATTERN = re.compile(
    r"\b(coinbase|kraken|bitnomial|gsr|payward|robinhood|crypto exchange|crypto trading firm|crypto derivatives|exchange listing|p2p crypto|peer[-\s]to[-\s]peer crypto|memecoin|altcoin|mining)\b",
    re.IGNORECASE,
)

STRUCTURAL_INSTITUTION_TYPES = {
    "Regulatory Agencies",
    "Central Banks & Regulators",
    "Global Banks",
    "Financial Infrastructure Operators",
    "Exchanges & Central Intermediaries",
}

# =====================================================================
# Play-level recommender. Mirrors recommendPlayForSignal() in playbooks.js
# so the first-pass suggestion matches what the UI surfaces on the signal
# detail page. Plays are theme + index; index 1 = pilot, 2 = expansion,
# 3 = platform / partnership.
# =====================================================================

PLAY_AUDIENCE_MATCH = {
    "tokenized-1": ["asset_managers"],
    "tokenized-2": ["banks_fmis", "fintech"],
    "tokenized-3": ["banks_fmis"],
    "stablecoins-1": ["banks_fmis", "fintech"],
    "stablecoins-2": ["banks_fmis"],
    "stablecoins-3": ["banks_fmis"],
    "dlt-1": ["banks_fmis"],
    "dlt-2": ["asset_managers", "banks_fmis"],
    "dlt-3": ["banks_fmis"],
    "perimeter-1": ["banks_fmis", "fintech", "policy_risk"],
    "perimeter-2": ["banks_fmis", "asset_managers", "fintech", "policy_risk"],
    "perimeter-3": ["banks_fmis", "policy_risk"],
}

PLAY_LABELS = {
    "tokenized-1": "Quiet pilot anchored in an existing fund",
    "tokenized-2": "Tokenized cash + tokenized funds for treasury and collateral",
    "tokenized-3": "Market infrastructure partnerships",
    "stablecoins-1": "Controlled treasury / B2B pilot",
    "stablecoins-2": "Client-facing settlement enhancement",
    "stablecoins-3": "Infrastructure partnership or network participation",
    "dlt-1": "Targeted post-trade / collateral use case",
    "dlt-2": "Tokenized assets + DLT post-trade integration",
    "dlt-3": "Strategic DLT platform participation or build",
    "perimeter-1": "Targeted supervisory clarity",
    "perimeter-2": "Jurisdiction-wide regulatory framework",
    "perimeter-3": "International regulatory coordination",
}


def recommend_play(
    mapped_themes: List[str],
    tier: str,
    institution_type: str,
    persona: str = "all",
) -> Tuple[Optional[str], Optional[str], int]:
    """Return (primary_play_id, runner_up_play_id, score_gap).

    Scoring mirrors js/playbooks.js::recommendPlayForSignal:
      +6 persona match, +4 tier->play index match, +3 institution-type
      alignment, +2 baseline theme match.
    """
    if not mapped_themes:
        return None, None, 0

    scored: List[Tuple[str, int]] = []
    for theme_id in mapped_themes:
        for n in (1, 2, 3):
            play_id = f"{theme_id}-{n}"
            score = 2  # baseline theme match

            if persona and persona != "all" and persona in PLAY_AUDIENCE_MATCH.get(play_id, []):
                score += 6

            if tier == "Structural" and n == 3:
                score += 4
            elif tier == "Material" and n == 2:
                score += 4
            elif (tier == "Context" or not tier) and n == 1:
                score += 4

            it = institution_type or ""
            if n == 1 and it == "Asset & Investment Management":
                score += 3
            if n == 2 and it in {"Global Banks", "Payments Providers"}:
                score += 3
            if n == 2 and it in {"Regulatory Agencies", "Central Banks & Regulators"}:
                score += 3
            if n == 3 and it in {
                "Exchanges & Central Intermediaries",
                "Financial Infrastructure Operators",
                "Global Banks",
            }:
                score += 3

            scored.append((play_id, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    primary = scored[0][0]
    runner_up = scored[1][0] if len(scored) > 1 else None
    gap = scored[0][1] - (scored[1][1] if len(scored) > 1 else 0)
    return primary, runner_up, gap


def default_play_audience(play_id: Optional[str]) -> str:
    if not play_id:
        return ""
    matches = PLAY_AUDIENCE_MATCH.get(play_id, [])
    return matches[0] if matches else "all"

TIER1_INSTITUTIONS = [
    "bis",
    "federal reserve",
    "ecb",
    "sec",
    "cftc",
    "bank of england",
    "fca",
    "esma",
    "jpmorgan",
    "blackrock",
    "fidelity",
    "goldman sachs",
    "bny mellon",
    "state street",
    "visa",
    "mastercard",
    "swift",
    "dtcc",
    "nyse",
    "nasdaq",
    "morgan stanley",
    "citigroup",
    "hsbc",
]

TOKENIZED_PATTERNS = [
    (re.compile(r"\btokeniz(?:e|ed|ation|ing)?\b", re.IGNORECASE), 3),
    (re.compile(r"\brwa\b|real[-\s]?world asset", re.IGNORECASE), 4),
    (re.compile(r"\btokenized (?:fund|treasury|bond|share|security)", re.IGNORECASE), 5),
    (re.compile(r"\bmoney market fund\b|\bmmf\b", re.IGNORECASE), 2),
    (re.compile(r"\btreasur(?:y|ies)\b|\bbond(?:s)?\b", re.IGNORECASE), 2),
]

STABLECOIN_PATTERNS = [
    (re.compile(r"\bstablecoin(?:s)?\b", re.IGNORECASE), 4),
    (re.compile(r"\bdeposit token(?:s)?\b", re.IGNORECASE), 4),
    (re.compile(r"\bcbdc\b|central bank digital currency", re.IGNORECASE), 3),
    (re.compile(r"\bcross[-\s]?border\b|\bfx settlement\b", re.IGNORECASE), 2),
    (re.compile(r"\bpayments?\b|\bsettlement rail(?:s)?\b", re.IGNORECASE), 2),
]

DLT_PATTERNS = [
    (re.compile(r"\bdlt\b|distributed ledger|blockchain", re.IGNORECASE), 3),
    (re.compile(r"\bpost[-\s]?trade\b|clearing|custody|collateral", re.IGNORECASE), 4),
    (re.compile(r"\binteroperabil(?:ity|e)\b|standards?", re.IGNORECASE), 3),
    (re.compile(r"\bmarket infrastructure\b|\bfmi\b", re.IGNORECASE), 2),
]

PERIMETER_PATTERNS = [
    (re.compile(r"\b(cftc|sec|occ|fca|finma|mas|hkma|bafin|esma|finra)\b", re.IGNORECASE), 2),
    (re.compile(r"\b(regulator|regulatory|compliance|framework|guidance|consultation|policy|supervision|rule|rules|legislation|legislative)\b", re.IGNORECASE), 2),
    (re.compile(r"\b(licens(?:e|ing|ed)|charter|trust company|registration|no[- ]action|approval letter|consent order)\b", re.IGNORECASE), 2),
    (re.compile(r"\b(clarity act|genius act|mica|markup|enforcement|cease[- ]and[- ]desist)\b", re.IGNORECASE), 3),
    (re.compile(r"\b(jurisdiction|cross[- ]agency|inter[- ]agency|coordination|mou|memorandum of understanding)\b", re.IGNORECASE), 2),
    (re.compile(r"\b(bis|basel|fatf|iosco|fsb|g7|g20)\b", re.IGNORECASE), 3),
    (re.compile(r"\b(supervisory (?:guidance|expectations|priorities)|prudential|perimeter|guardrails?)\b", re.IGNORECASE), 2),
]

CRYPTO_NATIVE_PATTERN = re.compile(
    r"\b(bitcoin|btc|ether|eth|altcoin|exchange listing|memecoin|mining|wallet adoption)\b",
    re.IGNORECASE,
)

STRATEGY_PATTERN = re.compile(
    r"\b(strategy|roadmap|governance|positioning|vision|executive|board|committee)\b",
    re.IGNORECASE,
)

REGULATORY_PATTERN = re.compile(
    r"\b(regulator|regulatory|compliance|framework|guidance|consultation|policy|supervision|rule)\b",
    re.IGNORECASE,
)


@dataclass
class FirstPassResult:
    decision: str
    mapped_themes: List[str]
    initiative_classifications: List[str]
    reason_code: str
    confidence: str
    confidence_score: int
    evidence: str
    primary_play_id: Optional[str] = None
    runner_up_play_id: Optional[str] = None
    play_score_gap: int = 0
    play_audience: str = ""


def parse_flexible_date(value: str) -> Optional[date]:
    if not value or not isinstance(value, str):
        return None

    if re.match(r"^\d{4}-\d{2}-\d{2}", value):
        try:
            return datetime.fromisoformat(value[:10]).date()
        except ValueError:
            pass

    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if 2015 < dt.year < 2040:
            return dt.date()
    except ValueError:
        pass

    q_match = re.match(r"^Q([1-4])\s+(\d{4})", value)
    if q_match:
        q = int(q_match.group(1))
        y = int(q_match.group(2))
        month = (q - 1) * 3 + 2
        return date(y, month, 15)

    ym_match = re.match(r"^([A-Za-z]+)\s+(\d{4})", value)
    if ym_match:
        try:
            return datetime.strptime(f"{ym_match.group(1)} 15, {ym_match.group(2)}", "%B %d, %Y").date()
        except ValueError:
            pass

    year_match = re.search(r"\b(19|20)\d{2}\b", value)
    if year_match:
        return date(int(year_match.group(0)), 7, 1)

    return None


def days_since(value: str, anchor: date) -> Optional[int]:
    dt = parse_flexible_date(value)
    if not dt:
        return None
    return (anchor - dt).days


def compute_score_and_tier(signal: dict, anchor: date) -> Tuple[int, str]:
    score = 22
    signal_type = signal.get("signal_type") or ""

    if signal_type in STRUCTURAL_SIGNAL_TYPES:
        score = 42
    elif signal_type in MATERIAL_SIGNAL_TYPES:
        score = 30
    elif signal_type == "Research / Report":
        score = 26

    if signal.get("institution_type") in STRUCTURAL_INSTITUTION_TYPES:
        score += 6

    if signal.get("institution_type") in {
        "Infrastructure & Technology",
        "Digital Asset Infrastructure",
    }:
        score -= 4

    if len(signal.get("fmi_areas") or []) >= 2:
        score += 4

    institution = (signal.get("institution") or "").lower()
    if any(term in institution for term in TIER1_INSTITUTIONS):
        score += 6

    initiative_count = len(signal.get("initiative_types") or [])
    if initiative_count == 0:
        score -= 12
    elif initiative_count >= 3:
        score += 4
    elif initiative_count >= 2:
        score += 2

    d = days_since(signal.get("date") or "", anchor)
    if d is not None:
        if d <= 14:
            score += 8
        elif d <= 30:
            score += 4
        elif d <= 90:
            score += 0
        elif d <= 180:
            score -= 3
        elif d <= 365:
            score -= 6
        else:
            score -= 12
    else:
        score -= 6

    if (
        signal.get("auto_generated")
        and len(signal.get("description") or "") < 250
        and signal.get("institution_type") not in STRUCTURAL_INSTITUTION_TYPES
    ):
        score -= 4

    importance = signal.get("importance_score")
    if isinstance(importance, (int, float)) and importance > 0:
        score = round(importance)

    score = max(0, min(100, score))

    if score >= 58:
        return score, "Structural"
    if score >= 44:
        return score, "Material"
    if score >= 22:
        return score, "Context"
    return score, "Noise"


def summarize_what_happened(signal: dict) -> str:
    """Create a clean, reviewer-friendly context string from source fields."""
    text = (signal.get("description") or "").strip()
    if not text:
        text = (signal.get("initiative") or "").strip()
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text)
    return text


def resolve_themes(signal: dict) -> List[str]:
    seen = set()

    for init in signal.get("initiative_types") or []:
        for theme in THEME_MAP_INITIATIVE.get(init, []):
            seen.add(theme)

    if not seen:
        fmis = " ".join(signal.get("fmi_areas") or []).lower()
        if any(k in fmis for k in ["settlement", "clearing", "custody", "collateral"]):
            seen.add("dlt")
        if any(k in fmis for k in ["payment", "stablecoin", "digital currency"]):
            seen.add("stablecoins")
        if any(k in fmis for k in ["tokeniz", "rwa"]):
            seen.add("tokenized")

    if not seen:
        text = ((signal.get("description") or "") + " " + (signal.get("initiative") or "")).lower()
        if any(k in text for k in ["tokeniz", "rwa", "treasur"]):
            seen.add("tokenized")
        if any(k in text for k in ["stablecoin", "deposit token", "settlement"]):
            seen.add("stablecoins")
        if any(k in text for k in ["blockchain", "dlt", "distributed ledger", "post-trade"]):
            seen.add("dlt")

    return sorted(seen)


def make_signal_id(signal: dict, idx: int) -> str:
    existing = signal.get("_id")
    if existing:
        return str(existing)
    seed = f"{signal.get('institution','')}-{signal.get('initiative','')}-{signal.get('date','')}-{idx}"
    return hashlib.sha1(seed.encode("utf-8")).hexdigest()[:10]


def accumulate_score(text: str, patterns: List[Tuple[re.Pattern, int]]) -> Tuple[int, List[str]]:
    score = 0
    evidence = []
    for pattern, weight in patterns:
        if pattern.search(text):
            score += weight
            evidence.append(pattern.pattern)
    return score, evidence


def suggest_initiative_classifications(signal: dict, text: str) -> Tuple[List[str], Dict[str, int]]:
    """Suggest 1..N initiative classifications using weighted evidence rules."""
    scores: Dict[str, int] = {
        "Tokenized Securities / RWA": 0,
        "Stablecoins & Deposit Tokens": 0,
        "DLT / Blockchain Infrastructure": 0,
        "Payment Infrastructure": 0,
        "Settlement Infrastructure": 0,
        "Interoperability & Standards": 0,
        "CBDC": 0,
        "DeFi": 0,
        "Crypto / Digital Assets": 0,
        "Digital Asset Strategy": 0,
        "Regulatory / Compliance": 0,
    }

    lower_text = text.lower()

    # Existing initiative labels get a mild prior (do not hard-lock output).
    for existing in signal.get("initiative_types") or []:
        if existing in scores:
            scores[existing] += 2

    # Theme-adjacent pattern sets
    for pattern, weight in TOKENIZED_PATTERNS:
        if pattern.search(lower_text):
            scores["Tokenized Securities / RWA"] += weight
    for pattern, weight in STABLECOIN_PATTERNS:
        if pattern.search(lower_text):
            scores["Stablecoins & Deposit Tokens"] += weight
    for pattern, weight in DLT_PATTERNS:
        if pattern.search(lower_text):
            scores["DLT / Blockchain Infrastructure"] += weight

    # Orthogonal initiatives
    if re.search(r"\bpayments?\b|cross[-\s]?border|remittance|treasury workflow", lower_text):
        scores["Payment Infrastructure"] += 3
    if re.search(r"clearing|settlement|custody|collateral|post[-\s]?trade", lower_text):
        scores["Settlement Infrastructure"] += 4
    if re.search(r"interoperabil(?:ity|e)|standard(?:s)?|messaging", lower_text):
        scores["Interoperability & Standards"] += 4
    if re.search(r"\bcbdc\b|central bank digital currency", lower_text):
        scores["CBDC"] += 5
    if re.search(r"\bdefi\b|automated market maker|amm|lending pool", lower_text):
        scores["DeFi"] += 5
    if CRYPTO_NATIVE_PATTERN.search(lower_text):
        scores["Crypto / Digital Assets"] += 4
    if STRATEGY_PATTERN.search(lower_text):
        scores["Digital Asset Strategy"] += 3
    if REGULATORY_PATTERN.search(lower_text):
        scores["Regulatory / Compliance"] += 4

    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    top_score = ranked[0][1]
    if top_score < 3:
        return [], scores

    # Multi-label: include strong co-signals close to the top score.
    selected: List[str] = []
    for label, score in ranked:
        if score < 3:
            continue
        if score >= top_score - 1:
            selected.append(label)
        if len(selected) >= 3:
            break

    return selected, scores


def intelligent_first_pass(signal: dict, tier: str) -> FirstPassResult:
    text = " ".join(
        [
            signal.get("initiative") or "",
            signal.get("description") or "",
            " ".join(signal.get("initiative_types") or []),
            " ".join(signal.get("fmi_areas") or []),
            signal.get("signal_type") or "",
        ]
    )

    suggested_initiatives, initiative_scores = suggest_initiative_classifications(signal, text)

    theme_scores = {"tokenized": 0, "stablecoins": 0, "dlt": 0, "perimeter": 0}
    evidence_by_theme = {"tokenized": [], "stablecoins": [], "dlt": [], "perimeter": []}

    for theme, patterns in [
        ("tokenized", TOKENIZED_PATTERNS),
        ("stablecoins", STABLECOIN_PATTERNS),
        ("dlt", DLT_PATTERNS),
        ("perimeter", PERIMETER_PATTERNS),
    ]:
        score, ev = accumulate_score(text, patterns)
        theme_scores[theme] += score
        evidence_by_theme[theme].extend(ev)

    # Institution and signal-type priors
    inst_type = signal.get("institution_type") or ""
    signal_type = signal.get("signal_type") or ""

    if inst_type in {"Global Banks", "Financial Infrastructure Operators", "Exchanges & Central Intermediaries"}:
        theme_scores["dlt"] += 1
    if inst_type in {"Payments Providers", "Global Payment Networks"}:
        theme_scores["stablecoins"] += 1
    if inst_type == "Asset & Investment Management":
        theme_scores["tokenized"] += 1
    if inst_type in {"Regulatory Agencies", "Central Banks & Regulators"}:
        theme_scores["perimeter"] += 2

    if signal_type in {"Platform / Infrastructure", "Infrastructure Upgrade"}:
        theme_scores["dlt"] += 1
    if signal_type in {"Product Launch", "Pilot / Trial"}:
        theme_scores["stablecoins"] += 1
    if signal_type in {"Regulatory Action", "Regulatory / Compliance Framework", "Strategic Filing / Plan"}:
        theme_scores["perimeter"] += 2

    # Initiative-to-theme projection can yield multi-theme suggestions.
    for initiative in suggested_initiatives:
        for projected_theme in THEME_MAP_INITIATIVE.get(initiative, []):
            theme_scores[projected_theme] += 2

    sorted_themes = sorted(theme_scores.items(), key=lambda kv: kv[1], reverse=True)
    top_theme, top_score = sorted_themes[0]
    second_theme, second_score = sorted_themes[1]

    mapped_themes: List[str] = []
    confidence = "low"

    if top_score >= 7:
        mapped_themes = [top_theme]
        confidence = "high"
        if second_score >= 6 and abs(top_score - second_score) <= 1:
            mapped_themes = sorted([top_theme, second_theme])
            confidence = "medium"
    elif top_score >= 5:
        mapped_themes = [top_theme]
        confidence = "medium"
    elif top_score >= 3:
        mapped_themes = [top_theme]
        confidence = "low"

    lower_text = text.lower()
    is_reg = bool(REGULATORY_PATTERN.search(lower_text))
    is_strategy = bool(STRATEGY_PATTERN.search(lower_text))
    is_native_crypto = bool(CRYPTO_NATIVE_PATTERN.search(lower_text))
    is_macro = bool(MACRO_COMMENTARY_PATTERN.search(lower_text))
    is_crypto_venue = bool(CRYPTO_NATIVE_VENUE_PATTERN.search(lower_text))

    if mapped_themes:
        confidence_score = min(95, 30 + top_score * 9)
        evidence = "; ".join(
            sorted(set(evidence_by_theme[mapped_themes[0]]))[:3]
            + ([f"secondary={second_theme}:{second_score}"] if len(mapped_themes) > 1 else [])
        )
        reason_code = ""
        if "perimeter" in mapped_themes and is_reg and tier in {"Structural", "Material"}:
            reason_code = "RC09_REGULATORY_PERIMETER"
        primary_play, runner_up, gap = recommend_play(
            mapped_themes, tier, signal.get("institution_type") or ""
        )
        return FirstPassResult(
            decision="map",
            mapped_themes=mapped_themes,
            initiative_classifications=suggested_initiatives,
            reason_code=reason_code,
            confidence=confidence,
            confidence_score=confidence_score,
            evidence=evidence,
            primary_play_id=primary_play,
            runner_up_play_id=runner_up,
            play_score_gap=gap,
            play_audience=default_play_audience(primary_play),
        )

    # No confident map: classify reason and candidate status.
    # Macro / monetary-policy commentary trumps everything else: these signals
    # were never institutional infrastructure activity, regardless of tier.
    if is_macro and not is_crypto_venue:
        return FirstPassResult(
            decision="keep_unmapped",
            mapped_themes=[],
            initiative_classifications=suggested_initiatives,
            reason_code="RC08_MACRO_COMMENTARY",
            confidence="high",
            confidence_score=80,
            evidence="macro/monetary-policy commentary; recommend re-tier out of Structural",
        )

    # Regulatory-perimeter signal at high tier with insufficient evidence to map
    # remains RC09 for auditability, but no longer uses candidate_new_theme.
    if is_reg and tier in {"Structural", "Material"} and not is_strategy:
        return FirstPassResult(
            decision="keep_unmapped",
            mapped_themes=[],
            initiative_classifications=suggested_initiatives,
            reason_code="RC09_REGULATORY_PERIMETER",
            confidence="medium",
            confidence_score=50,
            evidence="regulatory/perimeter signal below mapping threshold; review pattern evidence",
        )

    if is_native_crypto or is_crypto_venue:
        reason = "RC03_NATIVE_CRYPTO_ONLY"
    elif is_strategy and not is_reg:
        reason = "RC02_STRATEGY_ONLY"
    elif tier in {"Structural", "Material"} and (is_strategy or is_native_crypto):
        return FirstPassResult(
            decision="candidate_new_theme",
            mapped_themes=[],
            initiative_classifications=suggested_initiatives,
            reason_code="RC04_TAXONOMY_GAP",
            confidence="medium",
            confidence_score=58,
            evidence="high-tier institutional signal without clear current-theme mapping",
        )
    else:
        reason = "RC01_INSUFFICIENT_EVIDENCE"

    return FirstPassResult(
        decision="keep_unmapped",
        mapped_themes=[],
        initiative_classifications=suggested_initiatives,
        reason_code=reason,
        confidence="low",
        confidence_score=35,
        evidence=(
            "insufficient keyword or workflow evidence"
            if not suggested_initiatives
            else "weak theme fit; review initiative-level multi-label suggestion"
        ),
    )


def review_priority(tier: str, d: Optional[int]) -> int:
    if tier == "Structural":
        return 1
    if tier == "Material":
        return 2
    if tier == "Context" and d is not None and d <= 90:
        return 3
    return 4


def load_signals() -> List[dict]:
    rows: List[dict] = []
    for path in INPUT_FILES:
        rows.extend(json.loads(path.read_text(encoding="utf-8")))
    return rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate first-pass queue for unmapped (or expanded) signal review."
    )
    parser.add_argument(
        "--scope",
        choices=["strict", "expanded", "all"],
        default="strict",
        help=(
            "strict: only signals with no resolved themes; "
            "expanded: strict + weakly mapped structural/material signals; "
            "all: include all signals"
        ),
    )
    return parser.parse_args()


def _include_in_scope(signal: dict, tier: str, resolved_themes: List[str], scope: str) -> Tuple[bool, str]:
    if scope == "all":
        return True, "all_signals" if resolved_themes else "unmapped"

    if not resolved_themes:
        return True, "unmapped"

    if scope == "strict":
        return False, ""

    initiative_types = set(signal.get("initiative_types") or [])
    weak_initiative_types = {
        "Crypto / Digital Assets",
        "Digital Asset Strategy",
        "Leadership & Governance",
    }
    weakly_mapped = (
        len(resolved_themes) == 1
        and tier in {"Structural", "Material"}
        and (not initiative_types or initiative_types.issubset(weak_initiative_types))
    )
    if weakly_mapped:
        return True, "weak_mapped_single_theme"

    if (
        "perimeter" in resolved_themes
        and tier in {"Structural", "Material"}
        and signal.get("signal_type") in {"Regulatory Action", "Strategic Filing / Plan"}
    ):
        return True, "perimeter_regulatory_review"

    return False, ""


def main() -> None:
    args = parse_args()
    rows = load_signals()

    parsed_dates = [parse_flexible_date(r.get("date") or "") for r in rows]
    anchor = max((d for d in parsed_dates if d is not None), default=date.today())

    output_rows = []
    in_scope_counts: Dict[str, int] = {}
    for idx, signal in enumerate(rows):
        score, tier = compute_score_and_tier(signal, anchor)
        themes = resolve_themes(signal)
        include, inclusion_reason = _include_in_scope(signal, tier, themes, args.scope)
        if not include:
            continue

        sig_id = make_signal_id(signal, idx)
        d = days_since(signal.get("date") or "", anchor)
        suggestion = intelligent_first_pass(signal, tier)
        what_happened = summarize_what_happened(signal)
        in_scope_counts[inclusion_reason] = in_scope_counts.get(inclusion_reason, 0) + 1

        output_rows.append(
            {
                "queue_order": 0,
                "review_priority": review_priority(tier, d),
                "inclusion_reason": inclusion_reason,
                "signal_id": sig_id,
                "tier": tier,
                "signal_score": f"{score}/100",
                "days_since_anchor": "" if d is None else d,
                "date": signal.get("date") or "",
                "institution": signal.get("institution") or "",
                "initiative": signal.get("initiative") or "",
                "what_happened": what_happened,
                "signal_type": signal.get("signal_type") or "",
                "institution_type": signal.get("institution_type") or "",
                "initiative_types": "|".join(signal.get("initiative_types") or []),
                "fmi_areas": "|".join(signal.get("fmi_areas") or []),
                "suggested_decision": suggestion.decision,
                "suggested_initiative_classifications": "|".join(suggestion.initiative_classifications),
                "suggested_mapped_themes": "|".join(suggestion.mapped_themes),
                "suggested_primary_play_id": suggestion.primary_play_id or "",
                "suggested_runner_up_play_id": suggestion.runner_up_play_id or "",
                "suggested_play_score_gap": suggestion.play_score_gap,
                "suggested_play_audience": suggestion.play_audience,
                "suggested_primary_reason_code": suggestion.reason_code,
                "suggested_confidence": suggestion.confidence,
                "suggested_confidence_score": suggestion.confidence_score,
                "suggested_evidence": suggestion.evidence,
                "decision": "",
                "initiative_classifications": "",
                "mapped_themes": "",
                "mapped_plays": "",
                "primary_play_id": "",
                "play_audience": "",
                "tie_breaker_used": "",
                "confidence": "",
                "primary_reason_code": "",
                "reviewer_notes": "",
                "reviewer_id": "",
                "reviewed_at_utc": "",
            }
        )

    output_rows.sort(
        key=lambda r: (
            r["review_priority"],
            10_000 if r["days_since_anchor"] == "" else r["days_since_anchor"],
            r["institution"],
        )
    )

    for i, row in enumerate(output_rows, 1):
        row["queue_order"] = i

    fieldnames = [
        "queue_order",
        "review_priority",
        "inclusion_reason",
        "signal_id",
        "tier",
        "signal_score",
        "days_since_anchor",
        "date",
        "institution",
        "institution_type",
        "initiative",
        "what_happened",
        "signal_type",
        "initiative_types",
        "fmi_areas",
        "suggested_decision",
        "suggested_initiative_classifications",
        "suggested_mapped_themes",
        "suggested_primary_play_id",
        "suggested_runner_up_play_id",
        "suggested_play_score_gap",
        "suggested_play_audience",
        "suggested_primary_reason_code",
        "suggested_confidence",
        "suggested_confidence_score",
        "suggested_evidence",
        "decision",
        "initiative_classifications",
        "mapped_themes",
        "mapped_plays",
        "primary_play_id",
        "play_audience",
        "tie_breaker_used",
        "confidence",
        "primary_reason_code",
        "reviewer_notes",
        "reviewer_id",
        "reviewed_at_utc",
    ]

    with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(output_rows)

    high_conf_maps = sum(1 for r in output_rows if r["suggested_decision"] == "map" and r["suggested_confidence"] == "high")
    med_conf_maps = sum(1 for r in output_rows if r["suggested_decision"] == "map" and r["suggested_confidence"] == "medium")
    low_conf_maps = sum(1 for r in output_rows if r["suggested_decision"] == "map" and r["suggested_confidence"] == "low")
    candidates = sum(1 for r in output_rows if r["suggested_decision"] == "candidate_new_theme")
    macro = sum(1 for r in output_rows if r["suggested_primary_reason_code"] == "RC08_MACRO_COMMENTARY")
    reg_perimeter = sum(1 for r in output_rows if r["suggested_primary_reason_code"] == "RC09_REGULATORY_PERIMETER")
    plays_assigned = sum(1 for r in output_rows if r["suggested_primary_play_id"])

    print(f"Wrote {len(output_rows)} rows to {OUTPUT_FILE.relative_to(ROOT)}")
    print(f"Scope used: {args.scope}")
    for reason, count in sorted(in_scope_counts.items(), key=lambda kv: kv[0]):
        print(f"Included via {reason}: {count}")
    print(f"Suggested map (high confidence): {high_conf_maps}")
    print(f"Suggested map (medium confidence): {med_conf_maps}")
    print(f"Suggested map (low confidence): {low_conf_maps}")
    print(f"Suggested new-theme candidates: {candidates}")
    print(f"Suggested primary plays assigned: {plays_assigned}")
    print(f"RC08 macro commentary: {macro}")
    print(f"RC09 regulatory perimeter: {reg_perimeter}")


if __name__ == "__main__":
    main()
