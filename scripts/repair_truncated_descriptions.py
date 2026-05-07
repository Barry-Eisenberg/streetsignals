"""
repair_truncated_descriptions.py
---------------------------------
One-shot script to find all signals in auto_data.json whose description ends with
an ellipsis (…) — indicating the RSS feed truncated the text — then attempt to
fetch the source article and extract a fuller description.

Strategy:
  1. For each truncated signal, fetch the source_url.
  2. Extract the first substantial paragraph(s) from the article body that
     contain the lead sentence already in our description (so we anchor to the
     right section), up to ~800 chars.
  3. If the fetched text is clearly longer and doesn't end truncated, replace the
     description.  Otherwise keep the original and mark it `description_truncated: true`
     so the UI can render a fallback note.

Run from the streetsignals root:
    python scripts/repair_truncated_descriptions.py [--dry-run]
"""

import json
import re
import sys
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
AUTO_DATA_PATH = ROOT / "data" / "auto_data.json"
USER_AGENT = "street-signals-updater/1.0"
FETCH_TIMEOUT = 20
MAX_DESCRIPTION_LENGTH = 800
DRY_RUN = "--dry-run" in sys.argv


# ---------------------------------------------------------------------------
# HTML stripping
# ---------------------------------------------------------------------------

class _TextExtractor(HTMLParser):
    """Minimal HTMLParser that pulls visible text, skipping scripts/styles."""
    _SKIP_TAGS = {"script", "style", "nav", "footer", "header", "aside", "form",
                  "button", "figcaption", "figure", "noscript", "iframe"}

    def __init__(self):
        super().__init__()
        self._skip_depth = 0
        self.chunks: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() in self._SKIP_TAGS:
            self._skip_depth += 1

    def handle_endtag(self, tag):
        if tag.lower() in self._SKIP_TAGS and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data):
        if self._skip_depth == 0:
            cleaned = data.strip()
            if cleaned:
                self.chunks.append(cleaned)


def _extract_text(html_bytes: bytes) -> str:
    try:
        html_str = html_bytes.decode("utf-8", errors="replace")
    except Exception:
        return ""
    parser = _TextExtractor()
    parser.feed(html_str)
    return " ".join(parser.chunks)


# ---------------------------------------------------------------------------
# Article fetching
# ---------------------------------------------------------------------------

def fetch_article_text(url: str) -> str | None:
    """Fetch the article at url; return visible text or None on failure."""
    try:
        req = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
        with urlopen(req, timeout=FETCH_TIMEOUT) as resp:
            if resp.status != 200:
                return None
            raw = resp.read(200_000)  # cap at 200 KB
        return _extract_text(raw)
    except (URLError, HTTPError, Exception):
        return None


# ---------------------------------------------------------------------------
# Description extraction from raw article text
# ---------------------------------------------------------------------------

def _clean(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    # Remove unicode replacement chars
    text = text.replace("\ufffd", "")
    return text


def extract_description(current_desc: str, article_text: str, max_chars: int = MAX_DESCRIPTION_LENGTH) -> str | None:
    """
    Given the (truncated) current description and the full article text,
    find the passage in the article that starts with the same content and
    return a fuller version up to max_chars.

    Returns None if we can't find a good anchor or don't improve on what we have.
    """
    if not article_text:
        return None

    article = _clean(article_text)

    # Build an anchor: first ~60 chars of the current description (strip the trailing …)
    anchor_source = _clean(current_desc.rstrip("… "))
    anchor = anchor_source[:60].strip()
    if len(anchor) < 20:
        return None

    idx = article.find(anchor)
    if idx == -1:
        # Try a shorter anchor
        anchor = anchor_source[:40].strip()
        idx = article.find(anchor)
    if idx == -1:
        return None

    # Extract from the anchor position
    passage = article[idx: idx + max_chars * 3]  # grab a generous window

    # Split into sentences and accumulate up to max_chars
    sentences = re.split(r"(?<=[.!?])\s+", passage)
    result = ""
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        candidate = (result + " " + s).strip() if result else s
        if len(candidate) <= max_chars:
            result = candidate
        else:
            break

    if not result:
        return None

    # Only use if it's clearly better: longer, and doesn't end with ellipsis
    stripped_current = current_desc.rstrip("… ").strip()
    if len(result) > len(stripped_current) + 30 and not result.rstrip().endswith("…"):
        return result

    return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    data = json.loads(AUTO_DATA_PATH.read_text(encoding="utf-8"))

    truncated_indices = [
        i for i, entry in enumerate(data)
        if isinstance(entry.get("description"), str)
        and entry["description"].rstrip().endswith("…")
    ]

    print(f"Found {len(truncated_indices)} truncated descriptions in auto_data.json")
    if DRY_RUN:
        print("DRY RUN — no changes will be written\n")

    improved = 0
    failed = 0

    for i, idx in enumerate(truncated_indices):
        entry = data[idx]
        title = entry.get("initiative") or entry.get("title", "")
        url = entry.get("source_url", "")
        current_desc = entry["description"]

        print(f"[{i+1}/{len(truncated_indices)}] {title[:80]}")
        print(f"  URL: {url}")

        if not url:
            print("  SKIP — no source_url\n")
            failed += 1
            if not DRY_RUN:
                entry["description_truncated"] = True
            continue

        article_text = fetch_article_text(url)
        if not article_text:
            print("  FAIL — could not fetch article\n")
            failed += 1
            if not DRY_RUN:
                entry["description_truncated"] = True
            continue

        new_desc = extract_description(current_desc, article_text)
        if new_desc:
            print(f"  OK   — improved ({len(current_desc)} → {len(new_desc)} chars)")
            print(f"  NEW: {new_desc[:120]}…\n")
            improved += 1
            if not DRY_RUN:
                entry["description"] = new_desc
                entry.pop("description_truncated", None)
        else:
            print(f"  WARN — no improvement found, marking as truncated\n")
            failed += 1
            if not DRY_RUN:
                entry["description_truncated"] = True

        # Be polite to servers
        time.sleep(1.5)

    print(f"\nResults: {improved} improved, {failed} unchanged/failed")

    if not DRY_RUN and (improved > 0 or failed > 0):
        AUTO_DATA_PATH.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        print(f"Saved {AUTO_DATA_PATH}")
    elif DRY_RUN:
        print("Dry run complete — no file written.")


if __name__ == "__main__":
    main()
