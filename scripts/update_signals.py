"""
SftS signals — daily aggregation pipeline.

Strategy:
  - Pull RSS from regulator feeds (priority 1) then fintech/crypto news (priority 2).
  - Sources processed in priority order so the most authoritative source wins
    when the same story appears in multiple feeds.
  - Deduplicate within a run by normalised URL and 8-word title fingerprint.
  - Accumulate into auto_data.json with a 12-month rolling window, capped at
    MAX_AUTO_SIGNALS entries (newest-first). data.json is never modified.
"""

import json
import html
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data.json"
AUTO_DATA_PATH = ROOT / "auto_data.json"
INTEL_BRIEFS_PATH = ROOT / "intel_briefs.json"
SOURCES_PATH = ROOT / "sources.json"

USER_AGENT = "street-signals-updater/1.0"
FETCH_TIMEOUT = 20
MAX_AUTO_SIGNALS = 500   # hard cap on accumulated auto signals
ROLLING_DAYS = 365       # prune entries older than this
MIN_DESC_LENGTH = 40     # reject items with very thin descriptions

# Tracking query params to strip from URLs before dedup
_TRACKING_PARAMS = re.compile(
    r"[?&](utm_[a-z_]+|ref|source|medium|campaign|cid|gclid|fbclid)=[^&]*",
    re.IGNORECASE,
)

_NUMERIC_DATE_RE = re.compile(
    r"^\s*(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?\s*$"
)

# Words ignored when building a title fingerprint
_STOPWORDS = {
    "the", "a", "an", "of", "in", "on", "to", "for", "and", "with",
    "is", "its", "as", "at", "by", "from", "new", "says", "report",
    "how", "why", "what", "this", "that", "are", "has", "have", "been",
    "will", "was", "not", "but", "be", "it", "or", "if", "up",
}

INST_TYPE_MAP = {
    "global_banks": "Global Banks",
    "asset_management": "Asset & Investment Management",
    "payments": "Payments Providers",
    "exchanges_intermediaries": "Exchanges & Central Intermediaries",
    "regulators": "Regulatory Agencies",
    "ecosystem": "Infrastructure & Technology",
    "intel_briefs": "Intelligence & Research",
}

_KNOWN_CATEGORY_KEYS = set(INST_TYPE_MAP.keys())

CATEGORY_ALIASES = {
    "financial_services": "global_banks",
    "global_financial_services": "global_banks",
    "central_banks": "regulators",
    "digital_asset_services": "exchanges_intermediaries",
    "exchanges": "exchanges_intermediaries",
    "financial_infrastructure": "ecosystem",
}

PUBLISHER_INSTITUTIONS = {
    "Chainalysis — Blog",
    "CoinDesk",
    "CoinGeek",
    "Connecting the Dots",
    "Connecting the Dots in Payments",
    "Finextra",
    "Fintech Wrap Up",
    "Ledger Insights",
    "The Block",
    "The Paypers",
    "Unchained",
    "Unchained Crypto",
}

CANONICAL_INSTITUTION_ALIASES = {
    "fed": "Federal Reserve",
    "the fed": "Federal Reserve",
    "federal reserve": "Federal Reserve",
    "federal reserve board": "Federal Reserve",
    "federal reserve board of governors": "Federal Reserve",
    "boe": "Bank of England",
    "bank of england": "Bank of England",
    "bank of korea": "Bank of Korea",
    "ecb": "ECB (European Central Bank)",
    "european central bank": "ECB (European Central Bank)",
    "ecb (european central bank)": "ECB (European Central Bank)",
    "fca": "FCA (Financial Conduct Authority, UK)",
    "uk fca": "FCA (Financial Conduct Authority, UK)",
    "fca (financial conduct authority, uk)": "FCA (Financial Conduct Authority, UK)",
    "financial conduct authority": "FCA (Financial Conduct Authority, UK)",
    "cftc": "CFTC (Commodity Futures Trading Commission)",
    "cftc (commodity futures trading commission)": "CFTC (Commodity Futures Trading Commission)",
    "commodity futures trading commission": "CFTC (Commodity Futures Trading Commission)",
    "sec": "SEC (U.S. Securities and Exchange Commission)",
    "sec (u.s. securities and exchange commission)": "SEC (U.S. Securities and Exchange Commission)",
    "securities and exchange commission": "SEC (U.S. Securities and Exchange Commission)",
    "bis": "BIS (Bank for International Settlements)",
    "bis (bank for international settlements)": "BIS (Bank for International Settlements)",
    "bank for international settlements": "BIS (Bank for International Settlements)",
    "esma": "ESMA (European Securities and Markets Authority)",
    "esma (european securities and markets authority)": "ESMA (European Securities and Markets Authority)",
    "european securities and markets authority": "ESMA (European Securities and Markets Authority)",
    "fsb": "FSB (Financial Stability Board)",
    "fsb (financial stability board)": "FSB (Financial Stability Board)",
    "financial stability board": "FSB (Financial Stability Board)",
    "hkma": "HKMA (Hong Kong Monetary Authority)",
    "hkma (hong kong monetary authority)": "HKMA (Hong Kong Monetary Authority)",
    "hong kong monetary authority": "HKMA (Hong Kong Monetary Authority)",
    "mas": "MAS (Monetary Authority of Singapore)",
    "mas (monetary authority of singapore)": "MAS (Monetary Authority of Singapore)",
    "monetary authority of singapore": "MAS (Monetary Authority of Singapore)",
    "iosco": "IOSCO (International Organization of Securities Commissions)",
    "iosco (international organization of securities commissions)": "IOSCO (International Organization of Securities Commissions)",
    "sebi": "SEBI (Securities and Exchange Board of India)",
    "sebi (securities and exchange board of india)": "SEBI (Securities and Exchange Board of India)",
    "occ": "OCC (Office of the Comptroller of the Currency)",
    "occ (office of the comptroller of the currency)": "OCC (Office of the Comptroller of the Currency)",
}

BAD_INSTITUTION_PREFIXES = (
    "of ",
    "for ",
    "from ",
    "in ",
    "on ",
    "by ",
    "with ",
)

BAD_INSTITUTION_TOKENS = {
    "pick",
    "backs",
    "urges",
    "warns",
    "says",
    "calls",
    "hearing",
    "report",
    "launches",
    "raises",
    "takes",
    "deal",
}

PRIORITY_INSTITUTION_PATTERNS = [
    (re.compile(r"\bsbi holdings?\b", re.IGNORECASE), "SBI Holdings", "global_banks"),
    (re.compile(r"\bcoinshares\b", re.IGNORECASE), "CoinShares", "asset_management"),
    (re.compile(r"\brevolut\b", re.IGNORECASE), "Revolut", "payments"),
    (re.compile(r"\bmoonpay\b", re.IGNORECASE), "MoonPay", "payments"),
    (re.compile(r"\bboe\b|\bbank of england\b", re.IGNORECASE), "Bank of England", "regulators"),
    (re.compile(r"\bfederal reserve\b|\bthe fed\b|\bfed\b", re.IGNORECASE), "Federal Reserve", "regulators"),
]

GENERIC_INSTITUTION_PATTERNS = [
    (re.compile(r"\bbrazil(?:'s)? central bank\b|\bcentral bank of brazil\b", re.IGNORECASE), "Brazil Central Bank", "regulators"),
    (re.compile(r"\baustralian regulator\b|\baustralian securities and investments commission\b|\basic\b", re.IGNORECASE), "Australian Securities and Investments Commission (ASIC)", "regulators"),
    (re.compile(r"\bbank of korea\b", re.IGNORECASE), "Bank of Korea", "regulators"),
    (re.compile(r"\bu\.?s\.? treasury\b|\bunited states treasury\b", re.IGNORECASE), "U.S. Treasury Department", "regulators"),
    (re.compile(r"\bfederal reserve\b|\bthe fed\b|\bfed\b", re.IGNORECASE), "Federal Reserve", "regulators"),
    (re.compile(r"\bboe\b|\bbank of england\b", re.IGNORECASE), "Bank of England", "regulators"),
    (re.compile(r"\becb\b|\beuropean central bank\b", re.IGNORECASE), "ECB (European Central Bank)", "regulators"),
    (re.compile(r"\besma\b", re.IGNORECASE), "ESMA", "regulators"),
    (re.compile(r"\bfca\b|\bfinancial conduct authority\b", re.IGNORECASE), "FCA (Financial Conduct Authority, UK)", "regulators"),
    (re.compile(r"\bsec\b|\bu\.?s\.? securities and exchange commission\b", re.IGNORECASE), "SEC (U.S. Securities and Exchange Commission)", "regulators"),
    (re.compile(r"\bcftc\b|\bcommodity futures trading commission\b", re.IGNORECASE), "CFTC (Commodity Futures Trading Commission)", "regulators"),
    (re.compile(r"\bocc\b|\boffice of the comptroller of the currency\b", re.IGNORECASE), "OCC (Office of the Comptroller of the Currency)", "regulators"),
    (re.compile(r"\bfdic\b", re.IGNORECASE), "FDIC (Federal Deposit Insurance Corporation)", "regulators"),
    (re.compile(r"\bmas\b|\bmonetary authority of singapore\b", re.IGNORECASE), "MAS (Monetary Authority of Singapore)", "regulators"),
    (re.compile(r"\bhkma\b|\bhong kong monetary authority\b", re.IGNORECASE), "HKMA (Hong Kong Monetary Authority)", "regulators"),
    (re.compile(r"\biosco\b", re.IGNORECASE), "IOSCO (International Organization of Securities Commissions)", "regulators"),
    (re.compile(r"\bbis\b|\bbank for international settlements\b", re.IGNORECASE), "BIS", "regulators"),
    (re.compile(r"\bfsb\b|\bfinancial stability board\b", re.IGNORECASE), "FSB", "regulators"),
    (re.compile(r"\bsantander uk\b|\bsantander\b", re.IGNORECASE), "Santander", "global_banks"),
    (re.compile(r"\btsb\b", re.IGNORECASE), "TSB", "global_banks"),
    (re.compile(r"\bcaixabank\b", re.IGNORECASE), "CaixaBank", "global_banks"),
    (re.compile(r"\bcommbank\b|\bcommonwealth bank\b", re.IGNORECASE), "Commonwealth Bank", "global_banks"),
    (re.compile(r"\bmizuho\b", re.IGNORECASE), "Mizuho", "global_banks"),
    (re.compile(r"\bsbi holdings?\b", re.IGNORECASE), "SBI Holdings", "global_banks"),
    (re.compile(r"\bnomura\b", re.IGNORECASE), "Nomura", "asset_management"),
    (re.compile(r"\bcoinshares\b", re.IGNORECASE), "CoinShares", "asset_management"),
    (re.compile(r"\bcoinbase\b", re.IGNORECASE), "Coinbase", "exchanges_intermediaries"),
    (re.compile(r"\bnobitex\b|\bbitbank\b|\bbitget\b|\bbybit\b", re.IGNORECASE), "Digital Asset Exchange", "exchanges_intermediaries"),
    (re.compile(r"\banchorage\b|\bsecuritize\b", re.IGNORECASE), "Digital Asset Platform", "exchanges_intermediaries"),
    (re.compile(r"\brevolut\b|\bmoonpay\b", re.IGNORECASE), "Digital Payments Platform", "payments"),
    (re.compile(r"\btether\b|\bwirex\b|\bvisa\b|\bmastercard\b|\bpaypal\b|\bstripe\b|\bcircle\b", re.IGNORECASE), "Payments Network", "payments"),
]

LOW_SIGNAL_MARKET_PATTERNS = [
    re.compile(r"\bbitcoin\b.*\b(above|below|edges|ticks|surges|falls|drops|rises)\b", re.IGNORECASE),
    re.compile(r"\bethereum\b.*\b(finalizes|sale of|price|rises|drops|gains)\b", re.IGNORECASE),
    re.compile(r"\bshares jump\b|\bbuys the dip\b|\bunrealized gain\b|\bshort bias\b", re.IGNORECASE),
    re.compile(r"\bperformance update\b|\bleading index higher\b|\bmarket cap\b", re.IGNORECASE),
    re.compile(r"\bairdrop\b|\bquantum proposal\b|\bnew narrative for bitcoin\b", re.IGNORECASE),
    re.compile(r"\bprediction markets?\b.*\bcasino\b", re.IGNORECASE),
]

INSTITUTIONAL_FOCUS_PATTERNS = [
    re.compile(r"\b(bank|banks|asset manager|asset management|custodian|custody|exchange|clearing|settlement|fmi|stablecoin issuer|payments provider|payment network)\b", re.IGNORECASE),
    re.compile(r"\b(central bank|regulator|regulatory|treasury department|monetary authority|securities commission)\b", re.IGNORECASE),
    re.compile(r"\b(tokenized fund|money market fund|mmf|treasury operations|cross-border payments?|collateral|post-trade)\b", re.IGNORECASE),
]

TOPIC_KEYWORDS = [
    # Tokenization & Digital Assets
    "token", "tokeniz", "digitalis",
    "blockchain", "distributed ledger", "dlt",
    "digital asset", "digital securities", "digital bond", "digital fund", "digital security",
    "stablecoin", "stable coin", "regulated stablecoin",
    "cbdc", "central bank digital", "digital euro", "digital pound", "digital currency",
    "crypto", "cryptocurrency", "bitcoin", "ethereum",
    "rwa", "real world asset", "real-world asset", "asset tokenization",
    
    # Infrastructure & Settlement
    "on-chain", "onchain", "blockchain settlement",
    "settlement", "clearing", "post-trade",
    "pvp", "payment versus payment",
    "t+0", "atomic settlement",
    "interoperability", "cross-chain", "crosschain", "multi-chain", "bridge",
    
    # Payments & Cross-Border
    "payment", "cross-border", "cross-currency", "remittance",
    "swift", "fast", "fedwire", "sepa", "fx transfer",
    "liquidity", "liquidity pool",
    
    # Finance & Markets
    "defi", "decentralized finance", "lending", "borrowing",
    "deposit token", "tokenized deposit", "secured token",
    "custody", "custodian", "safekeeping", "prime broker",
    "collateral", "repo", "repurchase",
    "trading", "exchange", "marketplace", "otc", "derivatives",
    "securities", "investment", "fund", "etf", "index",
    
    # Regulation & Compliance
    "regulat", "compliance", "kyc", "aml", "governance",
    "framework", "legislation", "act", "supervision",
    "license", "charter", "permit", "authorization",
    "mou", "memorandum of understanding", "agreement",
    
    # Smart Contracts & Tech
    "smart contract", "smart_contract",
    "dapp", "protocol", "web3", "ai agent", "machine payment",
]


# ── I/O helpers ──────────────────────────────────────────────────────────────

def load_json(path, default):
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def fetch_text(url):
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=FETCH_TIMEOUT) as resp:
        return resp.read().decode("utf-8", errors="replace")


def clean_text(value):
    value = html.unescape(value or "")
    value = re.sub(r"<[^>]+>", " ", value or "")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def normalize_url(url):
    """Strip tracking query params; lowercase scheme+host."""
    url = url.strip()
    url = _TRACKING_PARAMS.sub("", url)
    url = url.rstrip("?&")
    m = re.match(r"(https?://[^/?#]+)(.*)", url, re.IGNORECASE)
    if m:
        url = m.group(1).lower() + m.group(2)
    return url


def title_fingerprint(title):
    """8-word normalised fingerprint for cross-source dedup."""
    words = re.sub(r"[^a-z0-9\s]", "", (title or "").lower()).split()
    meaningful = [w for w in words if w not in _STOPWORDS and len(w) > 2]
    return " ".join(meaningful[:8])


def normalize_institution_name(name):
    text = re.sub(r"\s+", " ", str(name or "").strip())
    text = re.sub(r"\([^)]*\)", "", text).strip()
    text = text.strip("-:;,./ ")
    lower_text = text.lower()
    if lower_text in CANONICAL_INSTITUTION_ALIASES:
        return CANONICAL_INSTITUTION_ALIASES[lower_text]
    if re.fullmatch(r"bank of england(?: governor [a-z .'-]+)?", lower_text):
        return "Bank of England"
    if re.fullmatch(r"(?:the fed|federal reserve(?: board(?: of governors)?)?)", lower_text):
        return "Federal Reserve"
    return text


def is_usable_institution_name(name):
    institution = normalize_institution_name(name)
    if len(institution) < 3:
        return False

    lower_institution = institution.lower()
    if lower_institution.startswith(BAD_INSTITUTION_PREFIXES):
        return False

    words = re.findall(r"[a-zA-Z]+", lower_institution)
    if not words:
        return False

    if any(token in BAD_INSTITUTION_TOKENS for token in words):
        return False

    return True


def normalize_category(value):
    category = str(value or "").strip().lower()
    if category in _KNOWN_CATEGORY_KEYS:
        return category
    return CATEGORY_ALIASES.get(category, "ecosystem")


def build_institution_category_lookup(signals):
    """Build canonical institution -> category map from existing records."""
    lookup = {}
    for signal in signals:
        category = normalize_category(signal.get("category", ""))
        institution = normalize_institution_name(signal.get("institution", ""))
        if not is_usable_institution_name(institution):
            continue
        if institution in PUBLISHER_INSTITUTIONS:
            continue
        source_name = normalize_institution_name(signal.get("source_name", ""))
        if source_name and institution == source_name:
            continue
        lookup.setdefault(institution, category)

    # Longest names first to reduce partial-match collisions.
    ordered = sorted(lookup.items(), key=lambda kv: len(kv[0]), reverse=True)
    return ordered


def infer_institution_category_from_text(text, institution_category_pairs):
    haystack = str(text or "").lower()
    if not haystack:
        return None, None

    for pattern, institution, category in PRIORITY_INSTITUTION_PATTERNS:
        if pattern.search(haystack):
            return institution, category

    for institution, category in institution_category_pairs:
        needle = institution.lower()
        if len(needle) < 4:
            continue
        pattern = re.compile(rf"\b{re.escape(needle)}\b", re.IGNORECASE)
        if pattern.search(haystack):
            return institution, category

    for pattern, institution, category in GENERIC_INSTITUTION_PATTERNS:
        if pattern.search(haystack):
            return institution, category

    return None, None


def is_low_signal_market_story(text):
    haystack = str(text or "")
    return any(pattern.search(haystack) for pattern in LOW_SIGNAL_MARKET_PATTERNS)


def has_institutional_focus(text, inferred_institution, inferred_category):
    if inferred_institution and inferred_category:
        return True
    haystack = str(text or "")
    return any(pattern.search(haystack) for pattern in INSTITUTIONAL_FOCUS_PATTERNS)


def sanitize_auto_signal(signal, institution_category_pairs):
    combined = f"{signal.get('initiative', '')} {signal.get('description', '')}"
    source_category = normalize_category(signal.get("category", "ecosystem"))
    inferred_institution, inferred_category = infer_institution_category_from_text(
        combined,
        institution_category_pairs,
    )

    if source_category == "ecosystem":
        if is_low_signal_market_story(combined):
            return None
        if not has_institutional_focus(combined, inferred_institution, inferred_category):
            return None

    updated = dict(signal)
    if inferred_institution and inferred_category:
        if is_usable_institution_name(inferred_institution):
            updated["institution"] = normalize_institution_name(inferred_institution)
        updated["category"] = inferred_category

    enrich(updated)
    return updated


def safe_iso_date(value):
    if not value:
        return datetime.now(timezone.utc).date().isoformat()

    text = str(value).strip()

    try:
        dt = parsedate_to_datetime(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.date().isoformat()
    except Exception:
        pass

    numeric = _NUMERIC_DATE_RE.match(text)
    if numeric:
        first, second, third = int(numeric.group(1)), int(numeric.group(2)), int(numeric.group(3))
        if len(numeric.group(1)) == 4:
            year, month, day = first, second, third
        elif len(numeric.group(3)) == 4:
            year = third
            if first > 12 and second <= 12:
                day, month = first, second
            elif second > 12 and first <= 12:
                month, day = first, second
            else:
                # Ambiguous dd/mm vs mm/dd. Prefer day-first for international feeds.
                day, month = first, second
        else:
            year = month = day = None

        if year and month and day:
            try:
                return datetime(year, month, day, tzinfo=timezone.utc).date().isoformat()
            except Exception:
                pass

    # Try ISO-ish fallback
    m = re.search(r"(20\d{2})[-/](\d{1,2})[-/](\d{1,2})", text)
    if m:
        y, mo, d = m.groups()
        return f"{int(y):04d}-{int(mo):02d}-{int(d):02d}"

    y = re.search(r"20\d{2}", text)
    if y:
        return f"{y.group(0)}-01-01"

    return datetime.now(timezone.utc).date().isoformat()


def parse_iso_date(value):
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except Exception:
        return None


def is_future_iso_date(value):
    parsed = parse_iso_date(value)
    if parsed is None:
        return False
    return parsed > datetime.now(timezone.utc).date()


def is_event_style_url(url):
    u = (url or "").lower()
    return (
        "/event-info/" in u
        or "/events/" in u
        or "/webinar" in u
        or "/conference" in u
    )


def classify_signal_type(signal):
    text = f"{signal.get('initiative', '')} {signal.get('description', '')}".lower()
    source_name = str(signal.get('source_name', '')).lower()
    source_url = str(signal.get('source_url', '')).lower()

    is_speech = (
        'speech' in source_name
        or bool(re.search(r"/review/r\d+", source_url))
        or text.startswith('speech by ')
    )
    has_material_context = bool(re.search(
        r"tokeniz|rwa|stablecoin|deposit token|cbdc|digital (euro|currency|asset)|dlt|blockchain|"
        r"settlement|clearing|collateral|payment|cross-border|regulat|compliance|framework|"
        r"guidance|consultation|stress test|ccp|central counterpart|emir|market infrastructure",
        text,
    ))

    if is_speech and not has_material_context:
        return "Research / Report"

    # Leadership & personnel changes — evaluated first to prevent downstream mismatches.
    # A headline like "appoints new CEO, subject to regulatory approval" must NOT be scored
    # as Regulatory Action; the primary event is a leadership change.
    if any(w in text for w in [
        "appoints ", "appointed ", "names new", "new ceo", "new cfo", "new cto",
        "new coo", "new chairman", "new president", "new head of",
        "chief executive officer", "chief financial officer",
        "chief technology officer", "chief operating officer",
        "steps down", "step down", "resigns", "resigned", "resignation",
        "leadership change", "successor", "succession",
    ]):
        return "Leadership & Governance"

    if any(w in text for w in ["launch", "launched", "live", "went live", "go-live", "operational", "production"]):
        return "Product Launch"
    if any(w in text for w in ["partnership", "partner", "collaborat", "joint", "alliance", "consortium"]):
        return "Strategic Partnership"

    # Regulatory Action: only when regulatory activity is the primary subject.
    # Process phrases like "subject to regulatory approval" must not trigger this — they
    # describe an entity waiting on a regulator, not an act of regulation itself.
    _REGULATORY_PROCESS = (
        "regulatory approval", "subject to regulatory", "pending regulatory",
        "awaiting regulatory", "requires regulatory", "conditional on regulatory",
        "regulatory clearance", "regulatory sign-off",
    )
    if any(w in text for w in ["regulat", "rule", "guidance", "framework", "legislation", "act ", "compliance", "license", "charter", "sandbox"]) \
            and not any(p in text for p in _REGULATORY_PROCESS):
        return "Regulatory Action"

    if any(w in text for w in ["pilot", "trial", "experiment", "proof of concept", "poc", "test"]):
        return "Pilot / Trial"
    if any(w in text for w in ["invest", "funding", "raise", "acquisition", "acquir", "series", "ipo", "spac", "valuation"]):
        return "Investment / M&A"
    if any(w in text for w in ["platform", "infrastructure", "network", "system", "solution", "service", "product"]):
        return "Platform / Infrastructure"
    if any(w in text for w in ["filing", "filed", "application", "applied", "proposal", "proposed", "plan", "announced intent", "exploring"]):
        return "Strategic Filing / Plan"
    if any(w in text for w in ["report", "research", "outlook", "white paper", "study", "review"]):
        return "Research / Report"
    return "Strategic Initiative"


def classify_fmi_areas(signal):
    # Leadership changes don't belong to a specific FMI operational area.
    if signal.get("signal_type") == "Leadership & Governance":
        return []
    text = f"{signal.get('initiative', '')} {signal.get('description', '')}".lower()
    source_name = str(signal.get('source_name', '')).lower()
    source_url = str(signal.get('source_url', '')).lower()
    if ('speech' in source_name or re.search(r"/review/r\d+", source_url) or text.startswith('speech by ')) and not re.search(
        r"tokeniz|rwa|stablecoin|deposit token|cbdc|digital (euro|currency|asset)|dlt|blockchain|"
        r"settlement|clearing|collateral|payment|cross-border|regulat|compliance|framework|"
        r"guidance|consultation|stress test|ccp|central counterpart|emir|market infrastructure",
        text,
    ):
        return []
    areas = []

    if any(w in text for w in ["settlement", "clearing", "post-trade", "post trade", "dvp", "delivery versus", "t+0", "atomic"]):
        areas.append("Settlement & Clearing")
    if any(w in text for w in ["custody", "custod", "safekeep", "digital vault"]):
        areas.append("Custody & Safekeeping")
    if any(w in text for w in ["payment", "cross-border", "cross border", "remittance", "transfer", "fx "]):
        areas.append("Payments & Transfers")
    if any(w in text for w in ["tokeniz", "digital bond", "digital fund", "digital share", "digital secur", "rwa", "real world asset"]):
        areas.append("Tokenization & Issuance")
    if any(w in text for w in ["collateral", "repo", "lending", "margin", "liquidity", "hqla"]):
        areas.append("Collateral & Lending")
    if any(w in text for w in ["trading", "exchange", "marketplace", "listing", "derivatives", "futures", "etf", "etp"]):
        areas.append("Trading & Exchange")
    if any(w in text for w in ["stablecoin", "stable coin", "cbdc", "digital currency", "deposit token", "tokenized deposit", "digital dollar", "digital euro"]):
        areas.append("Digital Currency & Stablecoins")
    if any(w in text for w in ["regulat", "compliance", "kyc", "aml", "governance", "framework", "legislation", "rule", "guidance", "license"]):
        areas.append("Regulation & Compliance")
    if any(w in text for w in ["interoperab", "bridge", "cross-chain", "crosschain", "multi-chain", "multichain", "connect", "integration", "standard"]):
        areas.append("Interoperability & Standards")
    if any(w in text for w in ["data", "reporting", "transparency", "analytics", "record-keep", "recordkeep"]):
        areas.append("Data & Reporting")

    return areas or ["General Infrastructure"]


def classify_initiative_types(signal):
    # Leadership events don't map to a technology/product initiative type.
    if signal.get("signal_type") == "Leadership & Governance":
        return ["Leadership & Governance"]
    text = f"{signal.get('initiative', '')} {signal.get('description', '')}".lower()
    source_name = str(signal.get('source_name', '')).lower()
    source_url = str(signal.get('source_url', '')).lower()
    if ('speech' in source_name or re.search(r"/review/r\d+", source_url) or text.startswith('speech by ')) and not re.search(
        r"tokeniz|rwa|stablecoin|deposit token|cbdc|digital (euro|currency|asset)|dlt|blockchain|"
        r"settlement|clearing|collateral|payment|cross-border|regulat|compliance|framework|"
        r"guidance|consultation|stress test|ccp|central counterpart|emir|market infrastructure",
        text,
    ):
        return []
    kinds = []

    if any(w in text for w in ["tokeniz", "digital bond", "digital fund", "digital share", "digital gilt", "rwa", "real world asset"]):
        kinds.append("Tokenized Securities / RWA")
    if any(w in text for w in ["stablecoin", "stable coin", "deposit token", "tokenized deposit", "digital dollar"]):
        kinds.append("Stablecoins & Deposit Tokens")
    if any(w in text for w in ["cbdc", "central bank digital", "digital euro", "digital pound"]):
        kinds.append("CBDC")
    if any(w in text for w in ["dlt", "distributed ledger", "blockchain", "smart contract", "on-chain", "onchain", "on chain"]):
        kinds.append("DLT / Blockchain Infrastructure")
    if any(w in text for w in ["defi", "decentralized finance", "decentralised finance", "amm"]):
        kinds.append("DeFi")
    if any(w in text for w in ["crypto", "bitcoin", "ethereum", "digital asset"]):
        kinds.append("Crypto / Digital Assets")
    if any(w in text for w in ["payment", "cross-border payment", "settlement", "clearing"]):
        kinds.append("Payment Infrastructure")

    return kinds or []


def enrich(signal):
    signal["category"] = normalize_category(signal.get("category", ""))
    signal["institution_type"] = INST_TYPE_MAP.get(signal.get("category", ""), "Infrastructure & Technology")
    signal["signal_type"] = classify_signal_type(signal)
    signal["fmi_areas"] = classify_fmi_areas(signal)
    signal["initiative_types"] = classify_initiative_types(signal)

    date_value = signal.get("date") or datetime.now(timezone.utc).date().isoformat()
    signal["year"] = re.search(r"20\d{2}", str(date_value)).group(0) if re.search(r"20\d{2}", str(date_value)) else str(datetime.now(timezone.utc).year)
    return signal


def parse_rss_items(xml_text):
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []

    # RSS 2.0
    items = root.findall(".//item")
    if items:
        output = []
        for item in items:
            title = clean_text((item.findtext("title") or "").strip())
            link = normalize_url((item.findtext("link") or "").strip())
            desc = clean_text(item.findtext("description") or "")
            pub_date = item.findtext("pubDate") or ""
            output.append({"title": title, "link": link, "description": desc, "published": safe_iso_date(pub_date)})
        return output

    # Atom
    ns_atom = {"a": "http://www.w3.org/2005/Atom"}
    entries = root.findall(".//a:entry", ns_atom)
    if entries:
        output = []
        for entry in entries:
            title = clean_text(entry.findtext("a:title", default="", namespaces=ns_atom))
            link_el = entry.find("a:link", ns_atom)
            link = normalize_url((link_el.get("href") if link_el is not None else "") or "")
            desc = clean_text(entry.findtext("a:summary", default="", namespaces=ns_atom) or entry.findtext("a:content", default="", namespaces=ns_atom))
            pub_date = entry.findtext("a:updated", default="", namespaces=ns_atom)
            output.append({"title": title, "link": link, "description": desc, "published": safe_iso_date(pub_date)})
        return output

    # RSS 1.0 (RDF)
    ns_rdf = {
        "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        "": "http://purl.org/rss/1.0/",
        "content": "http://purl.org/rss/1.0/modules/content/",
        "dc": "http://purl.org/dc/elements/1.1/",
    }
    items_rdf = root.findall(".//{http://purl.org/rss/1.0/}item")
    if items_rdf:
        output = []
        for item in items_rdf:
            title = clean_text(item.findtext("{http://purl.org/rss/1.0/}title", default=""))
            link = normalize_url(item.findtext("{http://purl.org/rss/1.0/}link", default=""))
            desc = clean_text(item.findtext("{http://purl.org/rss/1.0/modules/content/}encoded", default="") or 
                            item.findtext("{http://purl.org/rss/1.0/}description", default=""))
            pub_date = item.findtext("{http://purl.org/dc/elements/1.1/}date", default="")
            output.append({"title": title, "link": link, "description": desc, "published": safe_iso_date(pub_date)})
        return output

    return []


def relevant_topic(text):
    t = (text or "").lower()
    return any(k in t for k in TOPIC_KEYWORDS)


# ── Signal classification ────────────────────────────────────────────────────


def _build_seen_sets(signals):
    """Return (seen_urls, seen_fingerprints) from a list of signal records."""
    seen_urls = set()
    seen_fps = set()
    for s in signals:
        url = s.get("source_url", "")
        if url:
            seen_urls.add(normalize_url(url))
        fp = title_fingerprint(s.get("initiative", ""))
        if fp:
            seen_fps.add(fp)
    return seen_urls, seen_fps


def fetch_auto_signals(config, manual_data, existing_auto):
    """
    Fetch all enabled RSS sources and return only signals not already in
    manual_data or existing_auto.

    Sources are sorted by 'priority' (ascending) so authoritative feeds
    (regulators, priority 1) are processed before news aggregators (priority 2).
    When the same story appears in multiple feeds, the first (highest-priority)
    version wins and the later duplicate is skipped via title fingerprint.
    """
    seen_urls, seen_fps = _build_seen_sets(manual_data + existing_auto)
    new_signals = []
    institution_category_pairs = build_institution_category_lookup(manual_data + existing_auto)

    sources = sorted(
        [s for s in config.get("rss_sources", []) if s.get("enabled", True)],
        key=lambda s: (s.get("priority", 99), s.get("name", "")),
    )

    for source in sources:
        name = source.get("name", source.get("url", "unknown"))
        try:
            xml_text = fetch_text(source["url"])
            items = parse_rss_items(xml_text)
        except (URLError, HTTPError, TimeoutError, ValueError) as ex:
            print(f"WARN [{name}]: {ex}")
            continue

        max_items = int(source.get("max_items", 25))
        picked = 0
        for item in items:
            if picked >= max_items:
                break

            url = item["link"]
            if is_event_style_url(url):
                continue

            if is_future_iso_date(item["published"]):
                continue

            if not url or url in seen_urls:
                continue

            fp = title_fingerprint(item["title"])
            if fp and fp in seen_fps:
                continue  # duplicate story from lower-priority source

            combined = f"{item['title']} {item['description']}"
            if not relevant_topic(combined):
                continue

            inferred_institution, inferred_category = infer_institution_category_from_text(
                combined,
                institution_category_pairs,
            )

            source_category = normalize_category(source.get("category", "ecosystem"))
            if source_category == "ecosystem":
                if is_low_signal_market_story(combined):
                    continue
                if not has_institutional_focus(combined, inferred_institution, inferred_category):
                    continue

            if len(item["description"]) < MIN_DESC_LENGTH:
                continue

            signal = {
                "institution": source.get("institution", name),
                "initiative": item["title"],
                "description": item["description"],
                "date": item["published"],
                "source_url": url,
                "category": source_category,
                "source_name": name,
                "auto_generated": True,
            }
            if inferred_institution and inferred_category:
                if is_usable_institution_name(inferred_institution):
                    signal["institution"] = normalize_institution_name(inferred_institution)
                signal["category"] = inferred_category

            enrich(signal)
            new_signals.append(signal)
            seen_urls.add(url)
            if fp:
                seen_fps.add(fp)
            picked += 1

        if picked:
            print(f"  [{name}] {picked} new signal(s)")

    return new_signals


def prune_and_cap(signals, rolling_days=ROLLING_DAYS, cap=MAX_AUTO_SIGNALS):
    """Remove signals older than rolling_days and enforce hard cap (newest first)."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=rolling_days)).date().isoformat()
    today = datetime.now(timezone.utc).date().isoformat()
    fresh = [
        s for s in signals
        if cutoff <= s.get("date", "1900-01-01") <= today
        and not is_event_style_url(s.get("source_url", ""))
    ]
    fresh.sort(key=lambda s: s.get("date", "1900-01-01"), reverse=True)
    return fresh[:cap]


def fetch_nextfi_briefs(config, current_briefs):
    nextfi_cfg = config.get("nextfi_intelligence", {})
    if not nextfi_cfg.get("enabled", True):
        return current_briefs

    url = nextfi_cfg.get("url")
    if not url:
        return current_briefs

    try:
        html = fetch_text(url)
    except (URLError, HTTPError, TimeoutError, ValueError) as ex:
        print(f"WARN: failed NextFi intelligence fetch: {ex}")
        return current_briefs

    current_by_url = {}
    for item in current_briefs:
        item_url = normalize_url(str(item.get("url", "")).strip())
        if item_url:
            current_by_url[item_url] = item

    anchor_matches = list(
        re.finditer(
            r"<a[^>]+href=['\"]([^'\"]+)['\"][^>]*>(.*?)</a>",
            html,
            re.IGNORECASE | re.DOTALL,
        )
    )

    if not anchor_matches:
        return current_briefs

    def normalize_brief_url(href):
        href = (href or "").strip()
        if not href:
            return ""
        if href.startswith("//"):
            href = f"https:{href}"
        href = urljoin(url, href)
        return normalize_url(href)

    def fallback_title(link):
        path = urlparse(link).path
        slug = path.rsplit("/", 1)[-1]
        slug = unquote(slug)
        slug = re.sub(r"\.(pdf|docx?)$", "", slug, flags=re.IGNORECASE)
        slug = re.sub(r"[_-]+", " ", slug)
        slug = re.sub(r"\s+", " ", slug).strip()
        return slug or "NextFi Intelligence Brief"

    briefs = []
    seen = set()

    for match in anchor_matches:
        link = normalize_brief_url(match.group(1))
        if not link:
            continue
        if not ("img1.wsimg.com/blobby/go/" in link.lower() or link.lower().endswith(".pdf")):
            continue

        anchor_text = clean_text(match.group(2)).lower()
        if "download" not in anchor_text:
            continue
        if "here" not in anchor_text and "pdf" not in anchor_text:
            continue

        existing = current_by_url.get(link)
        title = clean_text(existing.get("title", "") if existing else "") or fallback_title(link)
        desc = clean_text(existing.get("desc", "") if existing else "")
        if desc.lower() == "research and analysis from nextfi advisors.":
            desc = ""
        if not desc:
            desc = f"Research and analysis from NextFi Advisors on {title}."

        key = link
        if key in seen:
            continue
        seen.add(key)

        briefs.append({
            "title": title,
            "desc": desc,
            "source": "NextFi Advisors",
            "url": link,
        })

    return briefs or current_briefs


def reclassify_auto_data():
    """Re-run classification rules against every record already in auto_data.json.

    Use this after updating classify_signal_type / classify_fmi_areas /
    classify_initiative_types to retroactively fix existing signal tags without
    re-fetching from RSS feeds.

        python -m scripts.update_signals --reclassify
    """
    auto_data = load_json(AUTO_DATA_PATH, [])
    if not auto_data:
        print("No auto signals found — nothing to reclassify.")
        return
    for signal in auto_data:
        # signal_type must be set first; fmi/initiative classifiers may depend on it.
        signal["signal_type"] = classify_signal_type(signal)
        signal["fmi_areas"] = classify_fmi_areas(signal)
        signal["initiative_types"] = classify_initiative_types(signal)
    save_json(AUTO_DATA_PATH, auto_data)
    print(f"Reclassified {len(auto_data)} auto signals in {AUTO_DATA_PATH}.")


def main():
    if "--reclassify" in sys.argv:
        reclassify_auto_data()
        return

    manual_data = load_json(DATA_PATH, [])
    existing_auto = load_json(AUTO_DATA_PATH, [])
    current_briefs = load_json(INTEL_BRIEFS_PATH, [])
    config = load_json(SOURCES_PATH, {})

    print(f"Loaded: {len(manual_data)} manual, {len(existing_auto)} existing auto signals")
    print("Fetching RSS sources...")

    institution_category_pairs = build_institution_category_lookup(manual_data + existing_auto)

    # Fetch new signals — only items not already in manual or existing auto
    new_signals = fetch_auto_signals(config, manual_data, existing_auto)

    # Merge new signals with existing accumulator, prune to rolling window, cap
    merged = new_signals + existing_auto
    sanitized = []
    for signal in merged:
        cleaned = sanitize_auto_signal(signal, institution_category_pairs)
        if cleaned is not None:
            sanitized.append(cleaned)
    merged = sanitized
    merged = prune_and_cap(merged)

    # Update intel briefs
    intel_briefs = fetch_nextfi_briefs(config, current_briefs)

    save_json(AUTO_DATA_PATH, merged)
    save_json(INTEL_BRIEFS_PATH, intel_briefs)

    print(f"\nDone.")
    print(f"  Manual signals : {len(manual_data)}")
    print(f"  Auto signals   : {len(merged)} total ({len(new_signals)} new this run)")
    print(f"  Intel briefs   : {len(intel_briefs)}")


if __name__ == "__main__":
    main()
