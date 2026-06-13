"""
Backfill stable `id` fields into auto_data.json and data.json.

Replicates the current JS djb2 hash so every signal's existing URL is
preserved. Once an `id` is written into the JSON, data.js uses it directly
and the ID never changes regardless of array order.

Run once: python scripts/backfill_signal_ids.py
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent


def js_id(institution: str, initiative: str, date: str, idx: int) -> str:
    """Exact replica of the JS makeId function (djb2, 32-bit truncation, base-36)."""
    seed = f"{institution}-{initiative}-{date}-{idx}"
    h = 5381
    for ch in seed:
        h = ((h << 5) + h) ^ ord(ch)
        # Truncate to 32-bit signed integer (matches JS bitwise behaviour)
        h &= 0xFFFFFFFF
        if h >= 0x80000000:
            h -= 0x100000000
    val = abs(h)
    if val == 0:
        return '0'
    chars = '0123456789abcdefghijklmnopqrstuvwxyz'
    digits = []
    while val:
        digits.append(chars[val % 36])
        val //= 36
    return ''.join(reversed(digits))


def backfill(path: pathlib.Path, id_offset: int, label: str) -> int:
    with open(path, encoding='utf-8') as f:
        signals = json.load(f)

    changed = 0
    for i, s in enumerate(signals):
        if s.get('id'):
            continue  # already has a stable id, leave it alone
        s['id'] = js_id(
            s.get('institution', ''),
            s.get('initiative', ''),
            s.get('date', ''),
            i + id_offset,
        )
        changed += 1

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(signals, f, ensure_ascii=False, indent=2)

    print(f"{label}: {changed} ids backfilled ({len(signals) - changed} already had ids)")
    return changed


if __name__ == '__main__':
    backfill(ROOT / 'data' / 'auto_data.json', id_offset=100000, label='auto_data.json')
    backfill(ROOT / 'data' / 'data.json',      id_offset=0,      label='data.json')
    print("Done. Commit both JSON files to lock in the stable IDs.")
