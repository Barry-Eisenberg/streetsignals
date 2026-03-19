import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data.json"
AUTO_DATA_PATH = ROOT / "auto_data.json"
INTEL_BRIEFS_PATH = ROOT / "intel_briefs.json"
SOURCES_PATH = ROOT / "sources.json"

USER_AGENT = "street-signals-updater/1.0"
FETCH_TIMEOUT = 20

INST_TYPE_MAP = {
    "global_banks": "Global Banks",
    "asset_management": "Asset & Investment Management",
    "payments": "Payments Providers",
    "exchanges_intermediaries": "Exchanges & Central Intermediaries",
    "regulators": "Regulatory Agencies",
    "ecosystem": "Infrastructure & Technology",
    "intel_briefs": "Intelligence & Research",
}

TOPIC_KEYWORDS = [
    "token",
    "tokeniz",
    "blockchain",
    "distributed ledger",
    "dlt",
    "digital asset",
    "stablecoin",
    "cbdc",
    "crypto",
    "on-chain",
    "onchain",
    "settlement",
    "interoperability",
]


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
    value = re.sub(r"<[^>]+>", " ", value or "")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def safe_iso_date(value):
    if not value:
        return datetime.now(timezone.utc).date().isoformat()

    try:
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.date().isoformat()
    except Exception:
        pass

    # Try ISO-ish fallback
    m = re.search(r"(20\d{2})[-/](\d{1,2})[-/](\d{1,2})", value)
    if m:
        y, mo, d = m.groups()
        return f"{int(y):04d}-{int(mo):02d}-{int(d):02d}"

    y = re.search(r"20\d{2}", value)
    if y:
        return f"{y.group(0)}-01-01"

    return datetime.now(timezone.utc).date().isoformat()


def classify_signal_type(signal):
    text = f"{signal.get('initiative', '')} {signal.get('description', '')}".lower()

    if any(w in text for w in ["launch", "launched", "live", "went live", "go-live", "operational", "production"]):
        return "Product Launch"
    if any(w in text for w in ["partnership", "partner", "collaborat", "joint", "alliance", "consortium"]):
        return "Strategic Partnership"
    if any(w in text for w in ["regulat", "rule", "guidance", "framework", "legislation", "act ", "compliance", "license", "charter", "sandbox"]):
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
    text = f"{signal.get('initiative', '')} {signal.get('description', '')}".lower()
    areas = []

    if any(w in text for w in ["settlement", "clearing", "post-trade", "post trade", "dvp", "delivery versus", "t+0", "atomic"]):
        areas.append("Settlement & Clearing")
    if any(w in text for w in ["custody", "custod", "safekeep", "digital vault"]):
        areas.append("Custody & Safekeeping")
    if any(w in text for w in ["payment", "cross-border", "cross border", "remittance", "transfer", "fx "]):
        areas.append("Payments & Transfers")
    if any(w in text for w in ["token", "tokeniz", "digital bond", "digital fund", "digital share", "digital secur", "rwa", "real world asset"]):
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
    text = f"{signal.get('initiative', '')} {signal.get('description', '')}".lower()
    kinds = []

    if any(w in text for w in ["tokeniz", "token", "digital bond", "digital fund", "digital share", "digital gilt", "rwa", "real world asset"]):
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

    return kinds or ["Digital Asset Strategy"]


def enrich(signal):
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

    # RSS
    items = root.findall(".//item")
    if items:
        output = []
        for item in items:
            title = clean_text((item.findtext("title") or "").strip())
            link = (item.findtext("link") or "").strip()
            desc = clean_text(item.findtext("description") or "")
            pub_date = item.findtext("pubDate") or ""
            output.append({"title": title, "link": link, "description": desc, "published": safe_iso_date(pub_date)})
        return output

    # Atom
    ns = {"a": "http://www.w3.org/2005/Atom"}
    entries = root.findall(".//a:entry", ns)
    output = []
    for entry in entries:
        title = clean_text(entry.findtext("a:title", default="", namespaces=ns))
        link_el = entry.find("a:link", ns)
        link = (link_el.get("href") if link_el is not None else "") or ""
        desc = clean_text(entry.findtext("a:summary", default="", namespaces=ns) or entry.findtext("a:content", default="", namespaces=ns))
        pub_date = entry.findtext("a:updated", default="", namespaces=ns)
        output.append({"title": title, "link": link, "description": desc, "published": safe_iso_date(pub_date)})
    return output


def relevant_topic(text):
    t = (text or "").lower()
    return any(k in t for k in TOPIC_KEYWORDS)


def fetch_auto_signals(config, manual_data):
    seen_urls = {s.get("source_url", "") for s in manual_data if s.get("source_url")}
    signals = []

    for source in config.get("rss_sources", []):
        if not source.get("enabled", True):
            continue

        try:
            xml_text = fetch_text(source["url"])
            items = parse_rss_items(xml_text)
        except (URLError, HTTPError, TimeoutError, ValueError) as ex:
            print(f"WARN: failed RSS source {source.get('name', source.get('url'))}: {ex}")
            continue

        max_items = int(source.get("max_items", 25))
        picked = 0
        for item in items:
            if picked >= max_items:
                break
            if not item["link"] or item["link"] in seen_urls:
                continue

            combined_text = f"{item['title']} {item['description']}"
            if not relevant_topic(combined_text):
                continue

            signal = {
                "institution": source.get("institution", source.get("name", "External Source")),
                "initiative": item["title"],
                "description": item["description"],
                "date": item["published"],
                "source_url": item["link"],
                "category": source.get("category", "ecosystem"),
                "source_name": source.get("name", "RSS"),
                "auto_generated": True,
            }
            enrich(signal)
            signals.append(signal)
            seen_urls.add(item["link"])
            picked += 1

    # Keep stable output order: newest first
    signals.sort(key=lambda s: s.get("date", "1900-01-01"), reverse=True)
    return signals


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

    heading_matches = list(re.finditer(r"<h[1-6][^>]*>(.*?)</h[1-6]>", html, re.IGNORECASE | re.DOTALL))
    download_matches = list(
        re.finditer(
            r"<a[^>]+href=\"([^\"]+)\"[^>]*>\s*(?:Download Here|Download PDF)\s*</a>",
            html,
            re.IGNORECASE | re.DOTALL,
        )
    )

    if not heading_matches or not download_matches:
        return current_briefs

    invalid_titles = {"intelligence & insights", "home", "services", "our work", "why us", "contact"}
    briefs = []
    seen = set()

    for dm in download_matches:
        link = dm.group(1).strip()
        prev_heading = None
        for hm in heading_matches:
            if hm.start() < dm.start():
                prev_heading = hm
            else:
                break
        if not prev_heading:
            continue

        title = clean_text(prev_heading.group(1))
        if not title or title.lower() in invalid_titles or len(title) < 8:
            continue

        # Try to capture short description between heading and download link.
        between = html[prev_heading.end() : dm.start()]
        paragraph_match = re.search(r"<p[^>]*>(.*?)</p>", between, re.IGNORECASE | re.DOTALL)
        desc = clean_text(paragraph_match.group(1) if paragraph_match else "")
        if not desc:
            desc = "Research and analysis from NextFi Advisors."

        key = (title.lower(), link)
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


def main():
    manual_data = load_json(DATA_PATH, [])
    current_briefs = load_json(INTEL_BRIEFS_PATH, [])
    config = load_json(SOURCES_PATH, {})

    auto_signals = fetch_auto_signals(config, manual_data)
    intel_briefs = fetch_nextfi_briefs(config, current_briefs)

    save_json(AUTO_DATA_PATH, auto_signals)
    save_json(INTEL_BRIEFS_PATH, intel_briefs)

    print(f"Manual signals: {len(manual_data)}")
    print(f"Auto signals: {len(auto_signals)}")
    print(f"Intel briefs: {len(intel_briefs)}")


if __name__ == "__main__":
    main()
