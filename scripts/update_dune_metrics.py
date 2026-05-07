"""
SftS market overlay updater for Dune-backed analytics.

This script executes Dune queries or raw SQL, polls until completion,
normalizes the results into market_overlay.json, and keeps external market
context separate from the core SftS signal records.

Setup:
  1. Copy scripts/dune_queries.example.json to scripts/dune_queries.json
    2. Replace placeholder query IDs or SQL file references with your chosen Dune queries
  3. Set DUNE_API_KEY in the environment

Usage:
  python -m scripts.update_dune_metrics
  python -m scripts.update_dune_metrics --config scripts/dune_queries.json --output market_overlay.json
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG_PATH = ROOT / "scripts" / "dune_queries.json"
DEFAULT_OUTPUT_PATH = ROOT / "data" / "market_overlay.json"
API_BASE_URL = "https://api.dune.com/api/v1"
USER_AGENT = "sfts-dune-updater/1.0"
POLL_INTERVAL_SECONDS = 2.0
POLL_TIMEOUT_SECONDS = 120.0

TERMINAL_STATES = {
    "QUERY_STATE_COMPLETED",
    "QUERY_STATE_COMPLETED_PARTIAL",
    "QUERY_STATE_FAILED",
    "QUERY_STATE_CANCELED",
    "QUERY_STATE_EXPIRED",
}
SUCCESS_STATES = {"QUERY_STATE_COMPLETED", "QUERY_STATE_COMPLETED_PARTIAL"}


class DuneApiError(RuntimeError):
    """Raised when Dune returns an API or execution error."""


def load_json(path, default=None):
    if not path.exists():
        if default is None:
            raise FileNotFoundError(path)
        return default
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path, data):
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)
        handle.write("\n")


def request_json(method, url, api_key, payload=None):
    headers = {
        "X-Dune-API-Key": api_key,
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    }
    body = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(payload).encode("utf-8")

    request = Request(url, data=body, headers=headers, method=method)
    try:
        with urlopen(request, timeout=60) as response:
            return json.load(response)
    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(error_body)
        except json.JSONDecodeError:
            parsed = {"message": error_body or str(exc)}
        raise DuneApiError(f"HTTP {exc.code} for {url}: {parsed}") from exc
    except URLError as exc:
        raise DuneApiError(f"Request failed for {url}: {exc}") from exc


def execute_query(api_key, query_id, parameters=None, performance="medium"):
    payload = {"performance": performance or "medium"}
    if parameters:
        payload["query_parameters"] = parameters
    data = request_json("POST", f"{API_BASE_URL}/query/{int(query_id)}/execute", api_key, payload)
    execution_id = data.get("execution_id")
    if not execution_id:
        raise DuneApiError(f"No execution_id returned for query {query_id}: {data}")
    return execution_id


def execute_sql(api_key, sql, performance="medium"):
    payload = {
        "sql": sql,
        "performance": performance or "medium",
    }
    data = request_json("POST", f"{API_BASE_URL}/sql/execute", api_key, payload)
    execution_id = data.get("execution_id")
    if not execution_id:
        raise DuneApiError(f"No execution_id returned for SQL execution: {data}")
    return execution_id


def get_execution_status(api_key, execution_id):
    return request_json("GET", f"{API_BASE_URL}/execution/{execution_id}/status", api_key)


def get_execution_results(api_key, execution_id, limit=1000):
    next_url = f"{API_BASE_URL}/execution/{execution_id}/results?limit={int(limit)}&allow_partial_results=true"
    all_rows = []
    result_metadata = None
    final_payload = None

    while next_url:
      payload = request_json("GET", next_url, api_key)
      final_payload = payload
      result = payload.get("result") or {}
      if result_metadata is None:
          result_metadata = result.get("metadata") or {}
      rows = result.get("rows") or []
      all_rows.extend(rows)
      next_url = payload.get("next_uri")

    return final_payload or {}, result_metadata or {}, all_rows


def wait_for_execution(api_key, execution_id, poll_interval=POLL_INTERVAL_SECONDS, timeout=POLL_TIMEOUT_SECONDS):
    started = time.time()
    while True:
        payload = get_execution_status(api_key, execution_id)
        state = payload.get("state")
        if state in TERMINAL_STATES or payload.get("is_execution_finished"):
            return payload
        if (time.time() - started) >= timeout:
            raise DuneApiError(f"Timed out waiting for execution {execution_id}")
        time.sleep(poll_interval)


def coerce_number(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return value
    try:
        return float(str(value).replace(",", ""))
    except (TypeError, ValueError):
        return None


def humanize_value(value, unit):
    numeric = coerce_number(value)
    if numeric is None:
        return str(value)

    suffix = ""
    scaled = abs(numeric)
    if scaled >= 1_000_000_000_000:
        numeric /= 1_000_000_000_000
        suffix = "T"
    elif scaled >= 1_000_000_000:
        numeric /= 1_000_000_000
        suffix = "B"
    elif scaled >= 1_000_000:
        numeric /= 1_000_000
        suffix = "M"
    elif scaled >= 1_000:
        numeric /= 1_000
        suffix = "K"

    if unit == "usd":
        return f"${numeric:,.2f}{suffix}" if suffix else f"${numeric:,.0f}"
    if unit == "pct":
        return f"{numeric:.1f}%"
    return f"{numeric:,.2f}{suffix}" if suffix else f"{numeric:,.0f}"


def build_summary(query_def, row, value, change_30d, change_90d):
    summary_field = query_def.get("summary_field")
    if summary_field and row.get(summary_field):
        return str(row.get(summary_field)).strip()

    template = query_def.get("summary_template")
    if not template:
        return None

    return template.format(
        value=value,
        value_human=humanize_value(value, query_def.get("unit")),
        change_30d=change_30d,
        change_90d=change_90d,
    ).strip()


def load_sql_text(query_def, config_path):
    if query_def.get("sql"):
        return str(query_def["sql"])
    sql_file = query_def.get("sql_file")
    if not sql_file:
        return None
    file_path = Path(sql_file)
    if not file_path.is_absolute():
        file_path = config_path.parent / file_path
    if not file_path.exists():
        raise DuneApiError(f"SQL file not found: {file_path}")
    return file_path.read_text(encoding="utf-8")


def normalize_overlay_row(query_def, row, execution_id, fetched_at):
    value = row.get(query_def["value_field"])
    change_30d = coerce_number(row.get(query_def.get("change_30d_field", ""))) if query_def.get("change_30d_field") else None
    change_90d = coerce_number(row.get(query_def.get("change_90d_field", ""))) if query_def.get("change_90d_field") else None
    metadata = {
        "query_name": query_def.get("name"),
        "execution_id": execution_id,
    }
    if query_def.get("dataset"):
        metadata["dataset"] = query_def["dataset"]

    extra_fields = query_def.get("metadata_fields") or []
    for field_name in extra_fields:
        if field_name in row:
            metadata[field_name] = row[field_name]

    return {
        "source": "dune",
        "query_id": int(query_def.get("query_id", 0) or 0),
        "metric_key": query_def["metric_key"],
        "metric_label": query_def.get("metric_label") or query_def["metric_key"],
        "theme": query_def["theme"],
        "scope": query_def.get("scope", "market"),
        "entity": row.get(query_def.get("entity_field")) if query_def.get("entity_field") else query_def.get("entity"),
        "peer_group": row.get(query_def.get("peer_group_field")) if query_def.get("peer_group_field") else query_def.get("peer_group"),
        "chain": row.get(query_def.get("chain_field")) if query_def.get("chain_field") else query_def.get("chain"),
        "protocol": row.get(query_def.get("protocol_field")) if query_def.get("protocol_field") else query_def.get("protocol"),
        "window": query_def.get("window"),
        "as_of": row.get(query_def.get("as_of_field")) if query_def.get("as_of_field") else fetched_at,
        "value": coerce_number(value) if coerce_number(value) is not None else value,
        "unit": query_def.get("unit"),
        "change_30d": change_30d,
        "change_90d": change_90d,
        "summary": build_summary(query_def, row, value, change_30d, change_90d),
        "metadata": metadata,
    }


def run_query(api_key, query_def, config_path, poll_interval, timeout):
    sql_text = load_sql_text(query_def, config_path)
    if sql_text:
        execution_id = execute_sql(
            api_key,
            sql_text,
            performance=query_def.get("performance", "medium"),
        )
    else:
        execution_id = execute_query(
            api_key,
            query_def["query_id"],
            parameters=query_def.get("parameters") or {},
            performance=query_def.get("performance", "medium"),
        )
    status_payload = wait_for_execution(api_key, execution_id, poll_interval=poll_interval, timeout=timeout)
    state = status_payload.get("state")
    if state not in SUCCESS_STATES:
        query_ref = query_def.get("name") or query_def.get("query_id") or query_def.get("metric_key")
        raise DuneApiError(f"Query {query_ref} finished in state {state}: {status_payload.get('error')}")
    _, _, rows = get_execution_results(api_key, execution_id, limit=query_def.get("limit", 1000))
    fetched_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    return [normalize_overlay_row(query_def, row, execution_id, fetched_at) for row in rows]


def parse_args(argv):
    parser = argparse.ArgumentParser(description="Fetch Dune overlays for SftS analytics.")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH), help="Path to Dune query config JSON.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT_PATH), help="Path to output market overlay JSON.")
    parser.add_argument("--poll-interval", type=float, default=POLL_INTERVAL_SECONDS, help="Seconds between status polls.")
    parser.add_argument("--timeout", type=float, default=POLL_TIMEOUT_SECONDS, help="Maximum seconds to wait for each query.")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv or sys.argv[1:])
    api_key = os.environ.get("DUNE_API_KEY", "").strip()
    if not api_key:
        print("ERROR: DUNE_API_KEY is not set.")
        return 1

    config_path = Path(args.config)
    if not config_path.exists():
        print(f"ERROR: config file not found: {config_path}")
        print("Copy scripts/dune_queries.example.json to scripts/dune_queries.json and fill in your query IDs or SQL file references first.")
        return 1

    config = load_json(config_path, default={})
    queries = config.get("queries") or []
    if not queries:
        print(f"ERROR: no queries defined in {config_path}")
        return 1

    overlays = []
    failed = False
    for query_def in queries:
        try:
            rows = run_query(api_key, query_def, config_path, poll_interval=args.poll_interval, timeout=args.timeout)
            overlays.extend(rows)
            print(f"[{query_def.get('name', query_def['metric_key'])}] captured {len(rows)} overlay row(s)")
        except DuneApiError as exc:
            failed = True
            print(f"WARN: {exc}")

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "overlays": overlays,
    }
    save_json(Path(args.output), payload)
    print(f"Wrote {len(overlays)} overlay record(s) to {args.output}")
    return 1 if failed and not overlays else 0


if __name__ == "__main__":
    raise SystemExit(main())