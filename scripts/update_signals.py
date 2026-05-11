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
import csv
import html
import re
import os
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
DATA_PATH = DATA_DIR / "data.json"
AUTO_DATA_PATH = DATA_DIR / "auto_data.json"
INTEL_BRIEFS_PATH = DATA_DIR / "intel_briefs.json"
SOURCES_PATH = DATA_DIR / "sources.json"
UNMAPPED_REVIEW_PATH = DATA_DIR / "unmapped_review_first_pass.csv"

USER_AGENT = "street-signals-updater/1.0"
FETCH_TIMEOUT = 20
MAX_AUTO_SIGNALS = 500   # hard cap on accumulated auto signals
ROLLING_DAYS = 365       # prune entries older than this
MIN_DESC_LENGTH = 40     # reject items with very thin descriptions
TARGET_SUMMARY_LENGTH = 800

NEXTFI_CB_BASE_URL = os.environ.get("NEXTFI_CB_BASE_URL", "").strip().rstrip("/")
NEXTFI_CB_TIMEOUT = max(5, int(os.environ.get("NEXTFI_CB_TIMEOUT", "20")))
NEXTFI_CB_USE_PROXY = os.environ.get("NEXTFI_CB_USE_PROXY", "0").strip().lower() in {"1", "true", "yes", "on"}
NEXTFI_CB_PROXY_MODEL = os.environ.get("NEXTFI_CB_PROXY_MODEL", "claude-sonnet-4-6").strip() or "claude-sonnet-4-6"

_MOJIBAKE_FIXES = {
    "ΓÇª": "…",
    "ΓÇô": "-",
    "ΓÇö": "-",
    "ΓÇ£": '"',
    "ΓÇ¥": '"',
    "ΓÇÿ": "'",
    "ΓÇÖ": "'",
}

_DESC_BOILERPLATE_PATTERNS = [
    re.compile(r"^\s*tl;dr[:\s-]*", re.IGNORECASE),
    re.compile(r"\bthe post\b.*?\bappeared first on\b.*?(?:[.!?]|$)", re.IGNORECASE),
    re.compile(r"\bappeared first on\b.*?(?:[.!?]|$)", re.IGNORECASE),
    re.compile(r"\bthe post\b[^.]{0,220}$", re.IGNORECASE),
    re.compile(r"\bthe post\b\s+[A-Z0-9].*?(?=\s+\bthe post\b|$)", re.IGNORECASE),
    re.compile(r"\bdata-tooltip-[a-z0-9_-]+\b[^.]*", re.IGNORECASE),
    re.compile(r"\bdata-tooltip-data\b\s*=\s*\"[^\"]+\"", re.IGNORECASE),
    re.compile(r"\bthe registration link will be available shortly\b.*?(?:[.!?]|$)", re.IGNORECASE),
    re.compile(r"\[\s*…\s*\]|\[\s*\.\.\.\s*\]", re.IGNORECASE),
]

_SOURCE_EXTRACT_BAD_FRAGMENTS = (
    "coindesk is part of bullish",
    "you may also like",
    "related articles",
    "image copyright",
    "deposit photos",
    "facebook x reddit",
    "linkedin whatsapp",
    "about us",
    "masthead",
    "careers",
    "investor relations",
    "advertise",
    "media kit",
    "sitemap",
    "system status",
    "newsletters",
    "editor's picks",
    "podcasts",
    "coindesk podcast network",
    "cryptocurrencies prices",
    "research insights",
    "documentation and governance",
    "consensus miami",
)

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
    (re.compile(r"\bgomining\b", re.IGNORECASE), "GoMining", "exchanges_intermediaries"),
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


def post_json(url, payload, timeout=FETCH_TIMEOUT):
    body = json.dumps(payload).encode("utf-8")
    req = Request(
        url,
        data=body,
        method="POST",
        headers={
            "User-Agent": USER_AGENT,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    with urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    return json.loads(raw)


def clean_text(value):
    value = html.unescape(value or "")
    for bad, good in _MOJIBAKE_FIXES.items():
        value = value.replace(bad, good)
    value = re.sub(r"<[^>]+>", " ", value or "")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def strip_description_boilerplate(value):
    text = clean_text(value)
    if not text:
        return ""
    for pattern in _DESC_BOILERPLATE_PATTERNS:
        text = pattern.sub(" ", text)
    text = re.sub(r"\s+", " ", text).strip(" -|,;:")
    return text


def _extract_meta_description_from_html(raw_html):
    if not raw_html:
        return ""

    patterns = [
        r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+name=["\']twitter:description["\'][^>]+content=["\']([^"\']+)["\']',
    ]
    for pattern in patterns:
        match = re.search(pattern, raw_html, re.IGNORECASE | re.DOTALL)
        if match:
            text = strip_description_boilerplate(html.unescape(match.group(1)))
            if text:
                return text
    return ""


def _fetch_meta_description(url):
    try:
        return _extract_meta_description_from_html(fetch_text(url))
    except Exception:
        return ""


def _normalize_source_extract(source_title, source_text):
    """Trim repeated headline/navigation text from fetched article bodies."""
    text = clean_text(source_text)
    title = clean_text(source_title)
    if not text or not title:
        return text

    lower_text = text.lower()
    lower_title = title.lower()
    first = lower_text.find(lower_title)
    second = lower_text.find(lower_title, first + len(lower_title)) if first != -1 else -1
    if first == 0 and second != -1 and second < 500:
        text = text[second + len(title):].lstrip(" |-:/")

    text = re.sub(r"^Search\s*/\s*(?:News|Video|Prices|Research|Consensus\s+\d{4}|Data\s*&\s*Indices|Sponsored|en)\b", "", text, flags=re.IGNORECASE)
    return clean_text(text)


def _split_sentences(text):
    text = clean_text(text)
    if not text:
        return []
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def _token_set(text):
    words = re.findall(r"[a-z0-9]+", clean_text(text).lower())
    return {w for w in words if len(w) > 2 and w not in _STOPWORDS}


def _overlap_ratio(a, b):
    if not a or not b:
        return 0.0
    inter = len(a & b)
    return inter / max(1, min(len(a), len(b)))


def _is_redundant_sentence(sentence, title_text, chosen_sentences):
    s_tokens = _token_set(sentence)
    if not s_tokens:
        return True

    # Skip lines that are mostly the headline repeated back.
    title_tokens = _token_set(title_text)
    if _overlap_ratio(s_tokens, title_tokens) >= 0.75:
        return True

    # Skip near-duplicates of already chosen lines.
    for chosen in chosen_sentences:
        if _overlap_ratio(s_tokens, _token_set(chosen)) >= 0.75:
            return True

    return False


def _is_bad_source_extract(source_title, source_text, fallback_title=""):
    """Detect fetch-source payloads that are mostly site chrome, not article text."""
    title_tokens = _token_set(source_title or fallback_title)
    snippet = clean_text(source_text)[:1600]
    if not snippet:
        return True

    lower = snippet.lower()
    chrome_hits = sum(1 for frag in _SOURCE_EXTRACT_BAD_FRAGMENTS if frag in lower)
    if chrome_hits >= 4:
        return True

    if snippet.startswith("Exclusive Election") and chrome_hits >= 2:
        return True

    snippet_tokens = _token_set(snippet)
    if chrome_hits >= 2 and title_tokens and _overlap_ratio(title_tokens, snippet_tokens) < 0.12:
        return True

    # Detect navigation menus: many short category/menu words (Energy, Health, Capital, etc)
    words = snippet.split()
    if len(words) > 30:
        short_words = [w.lower() for w in words[:80] if 3 <= len(w) < 25]
        category_words = {"news", "advertising", "auto", "blockchain", "banking", "capital", "markets", "energy", "government", "health", "identity", "insurance", "legal", "estate", "retail", "supply", "chain", "tech", "media", "telecom", "travel", "mobility", "digital", "currency", "cbdc", "stablecoin", "assets", "tokenization", "subscribe", "industry"}
        category_hits = sum(1 for w in short_words if w in category_words)
        if len(short_words) > 12 and category_hits / max(1, len(short_words)) > 0.35:
            return True

    return False


def _is_source_chrome_text(text):
    lower = clean_text(text).lower()
    if not lower:
        return False
    if "coindesk is part of bullish" in lower:
        return True
    chrome_hits = sum(1 for frag in _SOURCE_EXTRACT_BAD_FRAGMENTS if frag in lower)
    if chrome_hits >= 2:
        return True
    if lower.startswith("exclusive election") and "about us" in lower:
        return True
    return False


def _compress_to_length(text, max_chars=TARGET_SUMMARY_LENGTH):
    text = clean_text(text)
    if len(text) <= max_chars:
        return text
    # Prefer cutting at a sentence boundary so we never truncate mid-sentence
    sentences = re.split(r"(?<=[.!?])\s+", text)
    result = ""
    for s in sentences:
        candidate = (result + " " + s).strip() if result else s
        if len(candidate) <= max_chars:
            result = candidate
        else:
            break
    # Fall back to word boundary only if we couldn't fit even one sentence
    if not result:
        cut = text[: max_chars + 1]
        result = re.sub(r"\s+\S*$", "", cut).rstrip(" ,;:-")
    return result


def _polish_generated_summary(text):
    """Normalize generated copy to plain prose for signal cards."""
    t = clean_text(text)
    # Remove markdown heading markers and bullet prefixes if a model emits them.
    t = re.sub(r"(?:^|\s)#{1,6}\s*", " ", t)
    t = re.sub(r"(?:^|\s)[*-]\s+", " ", t)
    t = t.replace("**", "").replace("__", "")
    t = re.sub(r"^\s*what happened\s*[:.-]?\s*", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _is_high_quality_summary(text):
    """Basic quality gate to avoid storing page chrome or malformed copy."""
    t = (text or "").strip()
    if len(t) < 90 or len(t) > TARGET_SUMMARY_LENGTH:
        return False

    lower = t.lower()
    bad_fragments = (
        "subscribe",
        "sign in",
        "cookie",
        "related articles",
        "all rights reserved",
        "privacy policy",
        "newsletter",
        "menu",
    )
    if any(bad in lower for bad in bad_fragments):
        return False
    if _is_source_chrome_text(t):
        return False

    sentence_count = len([s for s in re.split(r"(?<=[.!?])\s+", t) if len(s.strip()) > 20])
    return sentence_count >= 2


def summarize_signal_description(title, description):
    """Build a concise, insight-led card description from RSS title + summary text."""
    title_text = clean_text(title)
    desc_text = strip_description_boilerplate(description)
    if not desc_text:
        return title_text

    # If the feed gives us a complete enough short paragraph, keep it.
    if len(desc_text) <= TARGET_SUMMARY_LENGTH and not re.search(r"(?:\.\.\.|…)\s*$", desc_text):
        return desc_text

    sentences = _split_sentences(desc_text)
    sentences = [s for s in sentences if not _is_source_chrome_text(s)]
    if not sentences:
        return _compress_to_length(desc_text)

    key_terms = [
        "regulat", "compliance", "approval", "launch", "settlement", "custody",
        "token", "stablecoin", "exchange", "clearing", "payments", "adoption",
        "infrastructure", "framework", "institution", "bank", "market",
    ]

    def score_sentence(s):
        lower = s.lower()
        score = 0
        if re.search(r"\d", lower):
            score += 1
        score += sum(1 for term in key_terms if term in lower)
        if len(s) > 240:
            score -= 1
        return score

    ranked = sorted(sentences, key=score_sentence, reverse=True)
    chosen = []
    used = set()
    for sentence in ranked:
        norm = sentence.lower()
        if norm in used:
            continue
        if _is_redundant_sentence(sentence, title_text, chosen):
            continue
        chosen.append(sentence)
        used.add(norm)
        combined = " ".join(chosen)
        if len(combined) >= TARGET_SUMMARY_LENGTH * 0.8 or len(chosen) >= 2:
            break

    # If filtering was too aggressive, retain the top sentence.
    if not chosen and ranked:
        chosen = [ranked[0]]

    summary = strip_description_boilerplate(" ".join(chosen))
    if title_text and title_text.lower() not in summary.lower() and len(summary) < TARGET_SUMMARY_LENGTH * 0.6:
        summary = strip_description_boilerplate(f"{summary} {title_text}")

    return _compress_to_length(summary)


def _extract_proxy_text(response_payload):
    """Extract Anthropic text output from a proxy response payload."""
    if not isinstance(response_payload, dict):
        return ""
    blocks = response_payload.get("content")
    if not isinstance(blocks, list):
        return ""
    parts = []
    for block in blocks:
        if isinstance(block, dict) and block.get("type") == "text":
            txt = clean_text(block.get("text", ""))
            if txt:
                parts.append(txt)
    return "\n".join(parts).strip()


def summarize_with_nextfi_content_builder(url, fallback_title, fallback_text, cache):
    """Use Content Builder URL ingestion (+ optional proxy synthesis) to improve summary quality.

    Falls back to local summarizer on any error.
    """
    if not NEXTFI_CB_BASE_URL or not url:
        return summarize_signal_description(fallback_title, fallback_text)

    cache_key = normalize_url(url)
    if cache_key in cache:
        return cache[cache_key]

    try:
        source_payload = post_json(
            f"{NEXTFI_CB_BASE_URL}/fetch-source",
            {"url": url},
            timeout=NEXTFI_CB_TIMEOUT,
        )
        source_title = clean_text(source_payload.get("title", "")) or fallback_title
        source_text = clean_text(source_payload.get("text", "")) or fallback_text
        source_text = _normalize_source_extract(source_title, source_text)

        if _is_bad_source_extract(source_title, source_text, fallback_title):
            source_title = fallback_title
            source_text = _fetch_meta_description(url) or fallback_text

        summary = ""
        if NEXTFI_CB_USE_PROXY and source_text:
            prompt = (
                "Write a detailed but concise 'What happened' summary for an institutional finance signal. "
                "Avoid repeating the headline text. Use 2-4 sentences, plain prose, no bullets, no hype. "
                "Focus on the concrete development, counterparties, regulatory context, and why it matters operationally.\n\n"
                f"Headline: {source_title}\n"
                f"Source URL: {url}\n"
                f"Source Text: {source_text[:12000]}"
            )
            proxy_payload = {
                "model": NEXTFI_CB_PROXY_MODEL,
                "max_tokens": 350,
                "messages": [{"role": "user", "content": prompt}],
            }
            proxy_response = post_json(
                f"{NEXTFI_CB_BASE_URL}/proxy",
                proxy_payload,
                timeout=max(NEXTFI_CB_TIMEOUT, 45),
            )
            summary = _extract_proxy_text(proxy_response)

        if not summary:
            summary = summarize_signal_description(source_title, source_text)

        summary = _polish_generated_summary(summary)
        summary = _compress_to_length(summary)
        if not _is_high_quality_summary(summary):
            summary = summarize_signal_description(source_title, source_text)
            summary = _polish_generated_summary(summary)
            summary = _compress_to_length(summary)

        cache[cache_key] = summary
        return summary
    except Exception as ex:
        print(f"WARN [content-builder]: falling back for {url}: {ex}")
        summary = summarize_signal_description(fallback_title, fallback_text)
        cache[cache_key] = summary
        return summary


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


def infer_institution_category_from_title_then_body(title, body, institution_category_pairs):
    """Prefer explicit title matches over body-only mentions for attribution."""
    title_institution, title_category = infer_institution_category_from_text(
        title, institution_category_pairs
    )
    if title_institution and title_category:
        return title_institution, title_category

    body_institution, body_category = infer_institution_category_from_text(
        f"{title} {body}", institution_category_pairs
    )
    return body_institution, body_category


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
    inferred_institution, inferred_category = infer_institution_category_from_title_then_body(
        signal.get("initiative", ""),
        signal.get("description", ""),
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


_MATERIAL_CONTEXT_RE = re.compile(
    r"tokeniz|\brwa\b|stablecoin|deposit token|\bcbdc\b|digital\s+(?:euro|currency|asset)|"
    r"\bdlt\b|blockchain|settlement|clearing|collateral|payment|cross-border|stress\s*test|"
    r"\bccp\b|central\s*counterpart|\bemir\b|margin|\brepo\b|post-trade|"
    r"default\s+waterfall|recovery\s+and\s+resolution",
    re.IGNORECASE,
)


def has_material_context(text):
    return bool(_MATERIAL_CONTEXT_RE.search(str(text or "")))


def classify_signal_type(signal):
    text = f"{signal.get('initiative', '')} {signal.get('description', '')}".lower()
    source_name = str(signal.get('source_name', '')).lower()
    source_url = str(signal.get('source_url', '')).lower()

    is_speech = (
        'speech' in source_name
        or bool(re.search(r"/review/r\d+", source_url))
        or text.startswith('speech by ')
    )
    material_context = has_material_context(text)

    if is_speech and not material_context:
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

    # Regulatory Action: require explicit regulator actor/action cues so generic
    # "regulatory context" prose in richer summaries doesn't over-trigger this class.
    _REGULATORY_PROCESS = (
        "regulatory approval", "subject to regulatory", "pending regulatory",
        "awaiting regulatory", "requires regulatory", "conditional on regulatory",
        "regulatory clearance", "regulatory sign-off",
    )
    _REGULATORY_TERMS = (
        "regulat", "rule", "guidance", "framework", "legislation", "act ",
        "compliance", "license", "charter", "sandbox",
    )
    _REGULATOR_ACTORS = (
        "sec", "securities and exchange commission", "cftc",
        "commodity futures trading commission", "occ",
        "office of the comptroller of the currency", "federal reserve",
        "bank of england", "ecb", "european central bank", "fca",
        "financial conduct authority", "esma", "iosco", "bis", "fsb",
        "regulator", "regulatory agency", "central bank",
    )
    _REGULATORY_ACTION_CUES = (
        "rulemaking", "consultation", "guidance issued", "issued guidance",
        "proposed rule", "final rule", "enforcement", "cease and desist",
        "consent order", "licensing", "charter application", "approved",
        "approval", "authorized", "authorization", "supervision",
    )
    _INVESTMENT_TERMS = (
        "invest", "funding", "raise", "acquisition", "acquir", "series",
        "ipo", "spac", "valuation",
    )

    regulatory_hit = any(w in text for w in _REGULATORY_TERMS)
    process_hit = any(p in text for p in _REGULATORY_PROCESS)
    actor_hit = any(w in text for w in _REGULATOR_ACTORS)
    action_hit = any(w in text for w in _REGULATORY_ACTION_CUES)
    investment_hit = any(w in text for w in _INVESTMENT_TERMS)

    if regulatory_hit and not process_hit:
        # If this reads primarily like a capital-raising/investment event, avoid
        # overriding it to Regulatory Action unless regulator-action evidence is strong.
        if investment_hit and not (actor_hit and action_hit):
            pass
        elif actor_hit or action_hit:
            return "Regulatory Action"

    if any(w in text for w in ["invest", "funding", "raise", "acquisition", "acquir", "series", "ipo", "spac", "valuation"]):
        return "Investment / M&A"
    if any(w in text for w in ["pilot", "trial", "experiment", "proof of concept", "poc", "test"]):
        return "Pilot / Trial"
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
    if ('speech' in source_name or re.search(r"/review/r\d+", source_url) or text.startswith('speech by ')) and not has_material_context(text):
        return []
    areas = []

    if any(w in text for w in ["settlement", "clearing", "post-trade", "post trade", "dvp", "delivery versus", "t+0", "atomic"]):
        areas.append("Settlement & Clearing")
    if any(w in text for w in ["custody", "custod", "safekeep", "digital vault"]):
        areas.append("Custody & Safekeeping")
    if any(w in text for w in ["payment", "cross-border", "cross border", "remittance", "transfer", "fx "]):
        areas.append("Payments & Transfers")
    if re.search(r'\btokeniz\b|digital bond|digital fund|digital share|\brwa\b|real world asset', text):
        areas.append("Tokenization & Issuance")
    if any(w in text for w in ["collateral", "repo", "lending", "margin", "liquidity", "hqla"]):
        areas.append("Collateral & Lending")
    # etf/etp removed — investment products, not trading infrastructure
    if any(w in text for w in ["trading", "exchange", "marketplace", "listing", "derivatives", "futures"]):
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
    if ('speech' in source_name or re.search(r"/review/r\d+", source_url) or text.startswith('speech by ')) and not has_material_context(text):
        return []
    kinds = []

    if re.search(r'\btokeniz\b|digital bond|digital fund|digital share|digital gilt|\brwa\b|real world asset', text):
        kinds.append("Tokenized Securities / RWA")
    if any(w in text for w in ["stablecoin", "stable coin", "deposit token", "tokenized deposit", "digital dollar"]):
        kinds.append("Stablecoins & Deposit Tokens")
    if any(w in text for w in ["cbdc", "central bank digital", "digital euro", "digital pound"]):
        kinds.append("CBDC")
    if any(w in text for w in ["dlt", "distributed ledger", "blockchain", "smart contract", "on-chain", "onchain", "on chain"]):
        kinds.append("DLT / Blockchain Infrastructure")
    if re.search(r'\bdefi\b', text) or any(w in text for w in ["decentralized finance", "decentralised finance", "amm"]):
        kinds.append("DeFi")
    if any(w in text for w in ["crypto", "bitcoin", "ethereum", "digital asset"]):
        kinds.append("Crypto / Digital Assets")
    # bare "payment" removed — too broad (fires on AI fraud detection, financial inclusion papers, etc.)
    if any(w in text for w in ["cross-border payment", "settlement", "clearing"]):
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


def parse_html_items(source, html_text):
    parser_name = (source.get("parser") or "").strip().lower()
    if parser_name not in {"ondo_blog", "centrifuge_blog"}:
        return []

    base_url = source.get("url", "https://ondo.finance/blog")
    output = []
    seen_links = set()

    def decode_embedded_json_string(value):
        try:
            return json.loads(f'"{value}"')
        except Exception:
            return value

    if parser_name == "ondo_blog":
        patterns = [
            re.compile(
                r'\\"publishedAt\\":\\"([^\\"]+)\\".*?\\"title\\":\\"([^\\"]+)\\".*?\\"routeName\\":\\"([^\\"]+)\\"',
                re.DOTALL,
            ),
            re.compile(
                r'"publishedAt":"([^"]+)".*?"title":"([^"]+)".*?"routeName":"([^"]+)"',
                re.DOTALL,
            ),
        ]

        for pattern in patterns:
            for match in pattern.finditer(html_text):
                published_at, raw_title, raw_route_name = match.groups()
                route_name = clean_text(decode_embedded_json_string(raw_route_name))
                if not route_name:
                    continue

                title = clean_text(decode_embedded_json_string(raw_title))
                if not title:
                    continue

                link = normalize_url(urljoin(base_url, f"/blog/{route_name}"))
                if not link or link in seen_links:
                    continue

                output.append(
                    {
                        "title": title,
                        "link": link,
                        "description": title,
                        "published": safe_iso_date(published_at),
                    }
                )
                seen_links.add(link)

        return output

    month_names = (
        "January|February|March|April|May|June|July|August|September|October|November|December"
    )
    date_re = re.compile(rf"({month_names})\s+\d{{1,2}},\s+\d{{4}}")
    def slug_to_title(value):
        value = (value or "").strip().strip("/")
        value = value.replace("-", " ")
        value = re.sub(r"\s+", " ", value).strip()
        if not value:
            return ""
        return value.title()
    anchor_re = re.compile(
        r'<a[^>]+href=["\']([^"\'>]+)["\'][^>]*>(.*?)</a>',
        re.IGNORECASE | re.DOTALL,
    )

    for match in anchor_re.finditer(html_text):
        href = clean_text(match.group(1))
        if not href:
            continue
        if href.startswith("/"):
            href = urljoin(base_url, href)
        link = normalize_url(href)
        if not link:
            continue

        host = urlparse(link).netloc.lower()
        if "centrifuge.io" not in host:
            continue

        path = urlparse(link).path.strip("/")
        if not path.startswith("blog/"):
            continue
        slug = path.split("/", 1)[1] if "/" in path else ""
        if not slug or slug in {"blog", "category"} or "/" in slug:
            continue

        raw_anchor_text = clean_text(match.group(2))
        title = raw_anchor_text
        title_from_slug = slug_to_title(slug)
        if not title:
            title = title_from_slug
        if re.search(date_re, title) or len(title) > 140:
            title = title_from_slug
        if not title or len(title) < 8:
            continue
        description = raw_anchor_text if raw_anchor_text else title

        snippet_start = max(0, match.start() - 900)
        snippet_end = min(len(html_text), match.end() + 900)
        snippet = html_text[snippet_start:snippet_end]
        date_match = date_re.search(snippet)
        if not date_match:
            continue

        try:
            published = datetime.strptime(date_match.group(0), "%B %d, %Y").date().isoformat()
        except ValueError:
            published = safe_iso_date(date_match.group(0))
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", published):
            continue

        if link in seen_links:
            continue

        output.append(
            {
                "title": title,
                "link": link,
                "description": description,
                "published": published,
            }
        )
        seen_links.add(link)

    return output


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
    Fetch all enabled configured sources and return only signals not already in
    manual_data or existing_auto.

    Sources are sorted by 'priority' (ascending) so authoritative feeds
    (regulators, priority 1) are processed before news aggregators (priority 2).
    When the same story appears in multiple feeds, the first (highest-priority)
    version wins and the later duplicate is skipped via title fingerprint.
    """
    seen_urls, seen_fps = _build_seen_sets(manual_data + existing_auto)
    new_signals = []
    institution_category_pairs = build_institution_category_lookup(manual_data + existing_auto)
    cb_summary_cache = {}

    sources = []
    for source in config.get("rss_sources", []):
        if source.get("enabled", True):
            sources.append({**source, "_source_type": "rss"})
    for source in config.get("html_sources", []):
        if source.get("enabled", True):
            sources.append({**source, "_source_type": "html"})
    sources.sort(key=lambda s: (s.get("priority", 99), s.get("name", "")))

    for source in sources:
        name = source.get("name", source.get("url", "unknown"))
        source_type = source.get("_source_type", "rss")
        try:
            raw_text = fetch_text(source["url"])
            if source_type == "html":
                items = parse_html_items(source, raw_text)
            else:
                items = parse_rss_items(raw_text)
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

            inferred_institution, inferred_category = infer_institution_category_from_title_then_body(
                item["title"],
                item["description"],
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
                "description": summarize_with_nextfi_content_builder(
                    item["link"],
                    item["title"],
                    item["description"],
                    cb_summary_cache,
                ),
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


def _arg_value(flag):
    """Return the CLI value immediately after a flag, if present."""
    if flag not in sys.argv:
        return None
    i = sys.argv.index(flag)
    if i + 1 >= len(sys.argv):
        return None
    return sys.argv[i + 1]


def resummarize_auto_data_with_content_builder():
    """Re-generate existing auto signal descriptions via Content Builder integration.

    Usage examples:
        python scripts/update_signals.py --resummarize-auto
        python scripts/update_signals.py --resummarize-auto --limit 50 --dry-run
        python scripts/update_signals.py --resummarize-auto --past-days 10

    Notes:
        - Requires NEXTFI_CB_BASE_URL to be set.
        - Uses existing NEXTFI_CB_* env flags for timeout/proxy/model behavior.
    """
    if not NEXTFI_CB_BASE_URL:
        print("NEXTFI_CB_BASE_URL is not set. Nothing to do.")
        return

    auto_data = load_json(AUTO_DATA_PATH, [])
    if not auto_data:
        print("No auto signals found — nothing to re-summarize.")
        return

    limit = None
    raw_limit = _arg_value("--limit")
    if raw_limit:
        try:
            limit = max(1, int(raw_limit))
        except ValueError:
            print(f"WARN: ignoring invalid --limit value: {raw_limit}")

    dry_run = "--dry-run" in sys.argv

    past_days = None
    raw_past_days = _arg_value("--past-days")
    if raw_past_days:
        try:
            past_days = max(1, int(raw_past_days))
        except ValueError:
            print(f"WARN: ignoring invalid --past-days value: {raw_past_days}")

    cutoff_date = None
    today = datetime.now(timezone.utc).date()
    if past_days is not None:
        cutoff_date = today - timedelta(days=past_days)

    cb_summary_cache = {}
    processed = 0
    changed = 0
    skipped_no_url = 0
    skipped_date_window = 0

    for signal in auto_data:
        if limit is not None and processed >= limit:
            break

        url = (signal.get("source_url") or "").strip()
        if not url:
            skipped_no_url += 1
            continue

        if cutoff_date is not None:
            signal_date = parse_iso_date(signal.get("date") or "")
            if signal_date is None or signal_date < cutoff_date or signal_date > today:
                skipped_date_window += 1
                continue

        processed += 1
        old_desc = (signal.get("description") or "").strip()
        new_desc = summarize_with_nextfi_content_builder(
            url,
            signal.get("initiative", ""),
            old_desc,
            cb_summary_cache,
        ).strip()

        if new_desc and new_desc != old_desc:
            changed += 1
            if not dry_run:
                signal["description"] = new_desc
                # Recompute derived fields so better copy can influence scoring/classification.
                enrich(signal)

    if changed and not dry_run:
        save_json(AUTO_DATA_PATH, auto_data)

    print("Re-summarize complete.")
    print(f"  Signals examined : {processed}")
    print(f"  Updated copy     : {changed}")
    print(f"  Missing URL      : {skipped_no_url}")
    print(f"  Outside window   : {skipped_date_window}")
    print(f"  Dry run          : {'yes' if dry_run else 'no'}")


def _load_unmapped_review_targets(include_reviewed=False):
    """Load unresolved unmapped-review rows as identity tuples."""
    if not UNMAPPED_REVIEW_PATH.exists():
        return set(), 0

    targets = set()
    total_rows = 0
    with UNMAPPED_REVIEW_PATH.open("r", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            total_rows += 1
            if not include_reviewed and (row.get("decision") or "").strip():
                continue

            key = (
                (row.get("institution") or "").strip(),
                (row.get("initiative") or "").strip(),
                (row.get("date") or "").strip(),
            )
            if any(key):
                targets.add(key)
    return targets, total_rows


def resummarize_unmapped_review_with_content_builder():
    """Re-summarize unresolved unmapped-review population with Content Builder.

    Usage examples:
        python scripts/update_signals.py --resummarize-unmapped-review
        python scripts/update_signals.py --resummarize-unmapped-review --dry-run
        python scripts/update_signals.py --resummarize-unmapped-review --limit 100

    Notes:
        - Targets rows in data/unmapped_review_first_pass.csv with empty decision.
        - Updates both data.json and auto_data.json where identity tuple matches.
    """
    if not NEXTFI_CB_BASE_URL:
        print("NEXTFI_CB_BASE_URL is not set. Nothing to do.")
        return

    manual_data = load_json(DATA_PATH, [])
    auto_data = load_json(AUTO_DATA_PATH, [])
    if not manual_data and not auto_data:
        print("No signals found — nothing to re-summarize.")
        return

    include_reviewed = "--include-reviewed" in sys.argv
    target_keys, total_rows = _load_unmapped_review_targets(include_reviewed=include_reviewed)
    if not target_keys:
        print("No matching unmapped-review targets found — nothing to re-summarize.")
        return

    limit = None
    raw_limit = _arg_value("--limit")
    if raw_limit:
        try:
            limit = max(1, int(raw_limit))
        except ValueError:
            print(f"WARN: ignoring invalid --limit value: {raw_limit}")

    dry_run = "--dry-run" in sys.argv
    cb_summary_cache = {}

    processed = 0
    changed = 0
    matched = 0
    skipped_no_url = 0
    changed_manual = 0
    changed_auto = 0

    for bucket_name, records in (("manual", manual_data), ("auto", auto_data)):
        for signal in records:
            if limit is not None and processed >= limit:
                break

            key = (
                (signal.get("institution") or "").strip(),
                (signal.get("initiative") or "").strip(),
                (signal.get("date") or "").strip(),
            )
            if key not in target_keys:
                continue

            matched += 1
            url = (signal.get("source_url") or "").strip()
            if not url:
                skipped_no_url += 1
                continue

            processed += 1
            old_desc = (signal.get("description") or "").strip()
            new_desc = summarize_with_nextfi_content_builder(
                url,
                signal.get("initiative", ""),
                old_desc,
                cb_summary_cache,
            ).strip()

            if new_desc and new_desc != old_desc:
                changed += 1
                if not dry_run:
                    signal["description"] = new_desc
                    enrich(signal)
                if bucket_name == "manual":
                    changed_manual += 1
                else:
                    changed_auto += 1

        if limit is not None and processed >= limit:
            break

    if changed and not dry_run:
        save_json(DATA_PATH, manual_data)
        save_json(AUTO_DATA_PATH, auto_data)

    print("Unmapped-review re-summarize complete.")
    print(f"  Review rows total : {total_rows}")
    print(f"  Targets selected  : {len(target_keys)}")
    print(f"  Records matched   : {matched}")
    print(f"  Signals examined  : {processed}")
    print(f"  Updated copy      : {changed}")
    print(f"  Updated manual    : {changed_manual}")
    print(f"  Updated auto      : {changed_auto}")
    print(f"  Missing URL       : {skipped_no_url}")
    print(f"  Dry run           : {'yes' if dry_run else 'no'}")


def main():
    if "--reclassify" in sys.argv:
        reclassify_auto_data()
        return

    if "--resummarize-auto" in sys.argv:
        resummarize_auto_data_with_content_builder()
        return

    if "--resummarize-unmapped-review" in sys.argv:
        resummarize_unmapped_review_with_content_builder()
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
