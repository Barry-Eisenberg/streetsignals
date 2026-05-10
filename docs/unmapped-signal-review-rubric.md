# Enhancement #1 Reviewer Rubric and Reason Codes

Purpose: Standardize human review for unmapped signals so every Signal from the Street can be intelligently and accurately mapped to a Decision Playbook — at both the theme level (tokenized | stablecoins | dlt) and the specific Play level (1 of 9). This rubric also defines how cross-theme signals are adjudicated, how reviewer decisions feed back into the auto-recommender, and how ambiguous "crypto-adjacent" signals are handled without polluting institutional infrastructure themes.

## Source-of-Truth Anchors

This rubric is bound to the live artifacts in the repo. Reviewers and adjudicators must defer to these when language conflicts:

- Playbook content and persona-aware scoring: `js/playbooks.js` (`PLAYBOOKS`, `recommendPlayForSignal`)
- Initiative taxonomy and aliases: `data/initiative-taxonomy.v1.json`
- Signal strength weighting (credibility × recency × prevalence): `data/signal-strength-methodology.v1.json`
- Persona definitions and "Why this matters" lens: `js/data.js` (`PERSONAS`, `whyThisMatters`)
- Tier and theme heuristics used by the auto first-pass: `scripts/generate_unmapped_first_pass.py`

If any rule below appears to drift from these files, the code wins and this rubric must be updated in the same review cycle.

## Kickoff Baseline (2026-05-10)

- Total signals reviewed in baseline: 717
- Unmapped signals: 216 (30.1%)
- Unmapped by tier: Structural 26, Material 87, Context 100, Noise 3
- Unmapped in last 90 days: 211

## Decision Playbook Architecture (3 themes × 3 plays = 9 plays)

Every mappable signal must land on at least one **theme**, and where evidence supports it, on a **specific Play** within that theme. This is what powers `recommendPlayForSignal` on every signal detail page.

| Theme         | Play 1 (pilot)                                  | Play 2 (expansion)                                                | Play 3 (platform/partnership)                            |
| ------------- | ----------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------- |
| `tokenized`   | `tokenized-1` Quiet pilot in an existing fund   | `tokenized-2` Tokenized cash + funds for treasury / collateral    | `tokenized-3` Market infrastructure partnerships         |
| `stablecoins` | `stablecoins-1` Controlled treasury / B2B pilot | `stablecoins-2` Client-facing settlement enhancement              | `stablecoins-3` Infrastructure partnership / network     |
| `dlt`         | `dlt-1` Targeted post-trade / collateral case   | `dlt-2` Tokenized assets + DLT post-trade integration             | `dlt-3` Strategic DLT platform participation or build    |

Tier-to-play prior (matches `recommendPlayForSignal`): Structural → Play 3, Material → Play 2, Context → Play 1. Reviewers may override this prior with evidence; document the override in `reviewer_notes`.

## Automated Pipeline (3 stages)

The full pipeline runs three scripts in order. Stage 2 is what makes this self-driving — it auto-accepts the rows the recommender is confident about, leaving only the genuinely ambiguous rows for human attention.

```bash
python scripts/generate_unmapped_first_pass.py     # Stage 1: suggest
python scripts/auto_accept_first_pass.py           # Stage 2: auto-accept
python scripts/aggregate_reviewer_decisions.py     # Stage 3: persist + calibrate
```

### Stage 1: Generate first-pass suggestions

Output file:

- `data/unmapped_review_first_pass.csv`

Optional workbook export with tabs:

```bash
c:/Users/bmeis/Projects/streetsignals/streetsignals/.venv-1/Scripts/python.exe scripts/build_unmapped_review_workbook.py
```

Workbook output:

- `data/unmapped_review_first_pass.xlsx`
	- `review_queue` tab (full queue)
	- `quick_pick` tab (initiative selection guide)

What the first pass adds:

- Prioritized queue order (`review_priority`, `queue_order`)
- Suggested decision (`map`, `keep_unmapped`, `candidate_new_theme`)
- Suggested initiative classifications (supports multi-label)
- Suggested mapped themes (if any)
- Suggested **primary play** (e.g., `dlt-2`) and runner-up play with score gap
- Suggested reason code, confidence, and evidence trace

Manual reviewers should use this as a draft, not as a final verdict.

### Stage 2: Auto-accept high-confidence rows

```bash
python scripts/auto_accept_first_pass.py
```

Auto-accept rules (idempotent — never overwrites a human decision):

- `suggested_decision == "map"` AND `suggested_confidence == "high"` → write `decision=map` with the suggested theme + primary play. `tie_breaker_used=auto`.
- `suggested_decision == "candidate_new_theme"` AND reason is `RC09_REGULATORY_PERIMETER` → write `decision=candidate_new_theme`, hold for the future 4th 'perimeter' theme.
- `suggested_decision == "keep_unmapped"` AND reason is `RC03_NATIVE_CRYPTO_ONLY` or `RC08_MACRO_COMMENTARY` → write `decision=keep_unmapped` (these are reliable noise).
- Everything else → leave reviewer columns empty for human attention.

Accepted rows are stamped `reviewer_id=auto_accepter_v1` and a `reviewer_notes` field that distinguishes them from human reviews. Run with `--dry-run` to preview without writing.

Kickoff baseline result: 51.4% of unmapped signals auto-accept (111/216), leaving 105 for human review.

### Stage 3: Aggregate decisions and emit calibration report

```bash
python scripts/aggregate_reviewer_decisions.py
python scripts/aggregate_reviewer_decisions.py --since 2026-04-01   # windowed view
```

What it does:

- Upserts every finalized row (auto or human) into `data/reviewer_decisions.jsonl` keyed by `signal_id`.
- Computes decision / theme / play deltas between auto suggestions and final decisions.
- Surfaces dominant patterns in deltas so weights in `generate_unmapped_first_pass.py` can be tuned.
- Writes a markdown calibration report to `data/reviewer_calibration_report.md` with reason-code distribution, RC09 share, play-agreement %, and top delta-contributing patterns.

The rubric's tuning rule still applies: only adjust pattern weights when a pattern is responsible for >=3 disagreements in a batch.

## Review Queue Priority

1. Structural unmapped
2. Material unmapped
3. Context unmapped in last 90 days
4. Remaining Context and Noise

## Required Decision Per Signal

Pick exactly one:

- Map to existing playbook theme (and where evidence supports it, a specific Play)
- Keep unmapped with reason code
- Escalate as candidate for new theme

## Mapping Decision Rules (apply in order)

1. **Tokenized assets** — references to tokenized fund shares, MMFs, treasuries, bonds, RWAs, or issuance of traditional assets on chain → map to `tokenized`.
2. **Stablecoin / deposit-token / cash rails** — institutional payment, FX, treasury, or cross-border settlement using stablecoins, deposit tokens, or on-chain cash → map to `stablecoins`.
3. **Market plumbing** — clearing, settlement finality, custody, collateral mobility, post-trade workflow, interoperability rails, or DLT-based FMI infrastructure → map to `dlt`.
4. If evidence supports two themes, assign both — but still pick a **single primary play** using the tie-breaker ladder below.
5. If the signal is purely strategy commentary, native crypto market chatter, or price/regulatory commentary without clear institutional implementation, keep unmapped (RC02 or RC03) unless evidence justifies mapping.
6. Signals can map to more than one initiative classification when evidence supports multiple dimensions (for example, instrument plus infrastructure).

## Cross-Theme Tie-Breaker Ladder

When a signal scores within 1 point of the top theme on two or more themes, walk these steps in order until exactly one primary theme and one primary play are chosen:

1. **Workflow specificity beats narrative.** If one theme is named through a concrete workflow (e.g., "DvP collateral mobility") and the other only through a generic noun (e.g., "stablecoin-friendly"), the workflow theme wins.
2. **Asset side vs. money side.** If the signal describes the asset being tokenized, prefer `tokenized`. If it describes the cash leg, prefer `stablecoins`. If it describes the rail or post-trade plumbing the two settle across, prefer `dlt`.
3. **Institution type prior** (matches `recommendPlayForSignal`):
   - Asset & Investment Management → `tokenized`
   - Global Banks, Payments Providers, Global Payment Networks → `stablecoins`
   - Exchanges & Central Intermediaries, Financial Infrastructure Operators → `dlt`
4. **Tier-to-play index.** Within the chosen theme, Structural → Play 3, Material → Play 2, Context → Play 1.
5. **Persona alignment.** If the signal is being adjudicated under an active persona view, break remaining ties using `audienceMatch`: `asset_managers` → `tokenized-1`, `dlt-2`; `banks_fmis` → `stablecoins-1/2/3`, `tokenized-2/3`, `dlt-1/3`; `fintech` → `tokenized-1`, `stablecoins-1/2`.
6. **Recency and credibility.** If still tied, use the live signal-strength inputs in this order: source priority (Primary > Secondary > Tertiary), recency weight, then bounded source prevalence.
7. **Adjudicator call.** If steps 1-6 do not break the tie, the adjudicator records the final play with a one-line rationale in `reviewer_notes` and flags `tie_broken_by=adjudicator` for calibration.

When two themes are assigned, the **secondary** play does not need to be the same play index as the primary — record both with their own `mapped_play_id`. The first listed play in `mapped_plays` is the primary surfaced to readers.

## Reviewer Quick-Pick Cue Card

Use this as a fast first decision aid before deeper adjudication.

### Primary cue → initiative classification

- Tokenized fund shares, treasuries, bonds, RWAs, issuance of traditional assets → Tokenized Securities / RWA
- Stablecoin, deposit token, on-chain cash, treasury cash movement, payment rail → Stablecoins & Deposit Tokens
- Clearing, settlement finality, custody, collateral, post-trade workflow → Settlement Infrastructure
- Ledger build, enterprise blockchain platform, DLT network participation → DLT / Blockchain Infrastructure
- Cross-border payments execution, payment orchestration, remittance rails → Payment Infrastructure
- CBDC pilot or policy implementation → CBDC
- Protocol-native lending, AMM, decentralized derivatives → DeFi
- Standards, interoperability, network connectivity, messaging bridges → Interoperability & Standards
- Regulation, supervision, compliance obligations, consultations, enforcement → Regulatory / Compliance
- Enterprise positioning, operating model, governance roadmap → Digital Asset Strategy
- Native crypto market activity without clear institutional workflow implementation → Crypto / Digital Assets

### Primary cue → specific Play (use after theme is chosen)

- Single fund / single counterparty / "small pilot" / "share class" wording → Play 1
- Adding a second leg (cash + asset, or client-facing rollout, or two integrated workflows) → Play 2
- Multi-bank / multi-FMI network, platform participation, co-build, "standards" framing → Play 3

### Common multi-label combinations

- Tokenized Securities / RWA + Settlement Infrastructure → primary `tokenized`, secondary `dlt`, default play `dlt-2`
- Stablecoins & Deposit Tokens + Payment Infrastructure → primary `stablecoins`, default play matches tier
- DLT / Blockchain Infrastructure + Interoperability & Standards → primary `dlt`, default play `dlt-3`
- Regulatory / Compliance + Stablecoins & Deposit Tokens → keep `stablecoins` if signal describes a regulated issuance or supervised pilot; otherwise RC04 candidate
- Regulatory / Compliance + Crypto / Digital Assets → almost always `keep_unmapped` with RC03 unless the signal contains explicit institutional implementation language
- Digital Asset Strategy + DLT / Blockchain Infrastructure → primary `dlt`, but only if implementation specifics are present; otherwise RC02

### Theme projection reminder

- `tokenized` ← Tokenized Securities / RWA
- `stablecoins` ← Stablecoins & Deposit Tokens, CBDC, Cross-Border Payments, Payment Infrastructure
- `dlt` ← DLT / Blockchain Infrastructure, Settlement Infrastructure, Interoperability & Standards, DeFi, Payment Infrastructure

If no theme fits but the signal is still material to institutional decision-making, use `candidate_new_theme` with `RC04_TAXONOMY_GAP`.

## Evidence Threshold

Map only if at least one is true:

- Explicit instrument or workflow language in initiative or description.
- FMI area alignment in source fields.
- Institutional implementation details (launch, pilot, deployment, integration, participation).
- Named institutional counterparty pair where one is a regulated asset manager, bank, custodian, FMI, or central bank, AND the action is operational (not commentary).

If none are true, keep unmapped and assign reason code.

## Crypto-Native vs. Institutional Boundary (RC03 Decision Tree)

A large share of the current unmapped queue (Morgan Stanley E*Trade fees, Kraken/Bitnomial, FCA P2P enforcement, Bitcoin price-action commentary) sits in the "Crypto / Digital Assets" initiative bucket. Use this tree before mapping any such signal:

1. Does the signal describe an **institutional workflow** that uses or settles tokenized RWAs, stablecoins, or DLT plumbing? If yes → map normally and ignore the rest of this tree.
2. Is it **regulatory or supervisory action** that shapes how institutions can custody, list, or settle digital assets at scale? If yes → consider `candidate_new_theme` (`RC04_TAXONOMY_GAP`) for Structural and Material tiers; otherwise `keep_unmapped` with `RC02_STRATEGY_ONLY`.
3. Is it **trading-venue, ETF flow, retail price, exchange listing, or M&A inside the crypto-native stack** (e.g., a crypto exchange buying a derivatives venue)? → `keep_unmapped` with `RC03_NATIVE_CRYPTO_ONLY`. Do not map even when the institution is a Tier 1 bank.
4. Is it **macroeconomic / monetary-policy commentary** that mentions crypto only as a market reaction (jobless claims, Fed rate cuts, inflation)? → `keep_unmapped` with `RC03_NATIVE_CRYPTO_ONLY` and add `reviewer_notes: macro_commentary`. These should never reach Structural and should be queued for re-tiering.
5. Is the institution a **traditional bank or asset manager** announcing a digital-asset strategy, hire, or board statement with no implementation detail? → `keep_unmapped` with `RC02_STRATEGY_ONLY`.

If a signal repeatedly trips this tree because the institution is genuinely operating both an institutional infrastructure agenda and a crypto-native venue (e.g., a Tier 1 bank buying a crypto exchange), split the underlying news into two signals during ingest — one mapped, one unmapped — rather than forcing a single record into both lanes.

## Reason Codes (Use One Primary)

- `RC01_INSUFFICIENT_EVIDENCE`: Text too vague to map confidently.
- `RC02_STRATEGY_ONLY`: Strategic positioning without implementation details.
- `RC03_NATIVE_CRYPTO_ONLY`: Crypto market activity without institutional infrastructure relevance.
- `RC04_TAXONOMY_GAP`: Signal appears valid but does not fit existing themes.
- `RC05_SOURCE_QUALITY`: Source too weak, low confidence, or duplicative reporting.
- `RC06_DUPLICATE_OR_NEAR_DUPLICATE`: Same event already represented by another signal.
- `RC07_DATA_QUALITY`: Bad institution/date/category fields block confident mapping.
- `RC08_MACRO_COMMENTARY` *(new)*: Macro/monetary policy item where crypto is only a market reaction; should be re-tiered out of Structural.
- `RC09_REGULATORY_PERIMETER` *(new)*: Regulatory action shaping institutional digital-asset perimeter that does not yet fit a play; candidate for a future "Regulation & Perimeter" theme. Pair with `decision=candidate_new_theme` for Structural and Material tiers.

## Reviewer Output Schema

Use this schema per reviewed signal. New fields are marked `(new)` and should be added to `scripts/generate_unmapped_first_pass.py`, `scripts/build_unmapped_review_workbook.py`, and the reviewer template before the next batch.

- `signal_id`
- `tier`
- `date`
- `institution`
- `initiative`
- `initiative_classifications` (pipe-separated for multi-label)
- `current_theme_count`
- `decision` (`map` | `keep_unmapped` | `candidate_new_theme`)
- `mapped_themes` (comma-separated, primary first)
- `mapped_plays` *(new)* — comma-separated play ids, primary first; e.g. `dlt-2,tokenized-3`
- `primary_play_id` *(new)* — single play id surfaced on the signal page
- `play_audience` *(new)* — `asset_managers` | `banks_fmis` | `fintech` | `policy_risk` | `all`; defaults to play's `audienceMatch[0]`
- `tie_breaker_used` *(new)* — `none` | `workflow` | `asset_vs_money` | `institution_type` | `tier_index` | `persona` | `strength` | `adjudicator`
- `primary_reason_code`
- `confidence` *(new)* — `high` | `medium` | `low`; reviewers should agree with or override the auto first-pass value
- `reviewer_notes`
- `reviewer_id`
- `reviewed_at_utc`

## Adjudication Rules

- Dual-review required for Structural and Material tiers. Both reviewers must agree on (1) decision, (2) primary theme, and (3) `primary_play_id` for the signal to clear without adjudication.
- If reviewers disagree on theme, adjudicator decides and records final reason code.
- If reviewers agree on theme but disagree on play, adjudicator runs the Cross-Theme Tie-Breaker Ladder and records `tie_broken_by`.
- Weekly spot-check 10% sample for Context tier to monitor drift.
- Weekly spot-check 5% sample of `keep_unmapped` rows tagged `RC03_NATIVE_CRYPTO_ONLY` to detect drift caused by Tier 1 banks crossing into crypto-native venues.

## Acceptance Targets

- Structural and Material unmapped queue fully reviewed.
- At least 90% agreement on dual-reviewed records (theme **and** primary play).
- Unmapped rate reduced below 15% in first pass.
- RC04 share quantified to support any future 4th theme decision.
- RC09 share quantified to support a future "Regulation & Perimeter" theme decision.
- Auto first-pass play recommendation matches reviewer `primary_play_id` ≥75% of the time after the first calibration cycle.

## Reviewer-to-Recommender Feedback Loop

The point of this rubric is not just to clean up today's unmapped queue — it is to retrain the auto first-pass and `recommendPlayForSignal` so future signals route correctly without manual review.

After every review batch:

1. Append finalized rows from `data/unmapped_review_first_pass.csv` (and the workbook's `review_queue` tab) to `data/reviewer_decisions.jsonl` *(new file)* keyed by `signal_id`.
2. Compute three deltas:
   - **Theme delta**: where reviewer `mapped_themes` ≠ `suggested_mapped_themes`.
   - **Play delta**: where reviewer `primary_play_id` ≠ first-pass top play.
   - **Decision delta**: where reviewer `decision` ≠ `suggested_decision`.
3. For each delta, record which Mapping Decision Rule, Tie-Breaker step, or Reason Code drove the change. Adjust pattern weights in `scripts/generate_unmapped_first_pass.py` only when a pattern is responsible for ≥3 disagreements in a batch — never on a single override.
4. Promote any reason code reaching ≥10% of unmapped volume in two consecutive batches to a candidate new theme for review against `data/initiative-taxonomy.v1.json`.
5. Calibration owner re-runs the first pass on the previously labeled batch as a regression check; the new logic must not regress on signals already adjudicated as correctly mapped.

This loop is what makes the rubric self-improving: reviewer time becomes training data, not just throughput.

## Operating Model Summary

| Stage | Script | Output | Human required? |
| --- | --- | --- | --- |
| 1. Suggest | `generate_unmapped_first_pass.py` | `data/unmapped_review_first_pass.csv` (and `.xlsx` via builder) | No |
| 2. Auto-accept | `auto_accept_first_pass.py` | Same CSV with reviewer columns filled on high-confidence rows | No |
| 3. Aggregate | `aggregate_reviewer_decisions.py` | `data/reviewer_decisions.jsonl` + `data/reviewer_calibration_report.md` | No |
| 4. Human review | (workbook) | Reviewer columns filled on remaining rows | Yes — only for medium/low confidence |

The loop is self-driving end-to-end. Humans only touch the queued residual (~50% of unmapped today) and that residual shrinks over time as the recommender learns from the calibration report.
