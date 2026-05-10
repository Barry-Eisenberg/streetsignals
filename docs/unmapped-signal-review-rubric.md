# Enhancement #1 Reviewer Rubric and Reason Codes

Purpose: Standardize human review for unmapped signals so classification quality improves quickly and consistently.

## Kickoff Baseline (2026-05-10)

- Total signals reviewed in baseline: 717
- Unmapped signals: 216 (30.1%)
- Unmapped by tier: Structural 26, Material 87, Context 100, Noise 3
- Unmapped in last 90 days: 211

## Review Queue Priority

1. Structural unmapped
2. Material unmapped
3. Context unmapped in last 90 days
4. Remaining Context and Noise

## Required Decision Per Signal

Pick exactly one:

- Map to existing playbook theme
- Keep unmapped with reason code
- Escalate as candidate for new theme

## Mapping Decision Rules

Apply in this order:

1. If the signal clearly references tokenized traditional assets (fund shares, treasuries, bonds, RWAs), map to tokenized.
2. If the signal clearly references stablecoin or deposit-token payment and settlement rails, map to stablecoins.
3. If the signal clearly references market plumbing (clearing, settlement, custody, collateral, post-trade, interoperability rails), map to dlt.
4. If evidence supports two themes, assign both.
5. If signal is purely strategy commentary or native crypto market chatter without clear institutional implementation, keep unmapped unless evidence justifies mapping.

## Evidence Threshold

Map only if at least one is true:

- Explicit instrument or workflow language in initiative or description.
- FMI area alignment in source fields.
- Institutional implementation details (launch, pilot, deployment, integration, participation).

If none are true, keep unmapped and assign reason code.

## Reason Codes (Use One Primary)

- RC01_INSUFFICIENT_EVIDENCE: Text too vague to map confidently.
- RC02_STRATEGY_ONLY: Strategic positioning without implementation details.
- RC03_NATIVE_CRYPTO_ONLY: Crypto market activity without institutional infrastructure relevance.
- RC04_TAXONOMY_GAP: Signal appears valid but does not fit existing themes.
- RC05_SOURCE_QUALITY: Source too weak, low confidence, or duplicative reporting.
- RC06_DUPLICATE_OR_NEAR_DUPLICATE: Same event already represented by another signal.
- RC07_DATA_QUALITY: Bad institution/date/category fields block confident mapping.

## Reviewer Output Schema

Use this schema per reviewed signal:

- signal_id
- tier
- date
- institution
- initiative
- current_theme_count
- decision (map|keep_unmapped|candidate_new_theme)
- mapped_themes (comma-separated)
- primary_reason_code
- reviewer_notes
- reviewer_id
- reviewed_at_utc

## Adjudication Rules

- Dual-review required for Structural and Material tiers.
- If reviewers disagree, adjudicator decides and records final reason code.
- Weekly spot-check 10% sample for Context tier to monitor drift.

## Acceptance Targets

- Structural and Material unmapped queue fully reviewed.
- At least 90% agreement on dual-reviewed records.
- Unmapped rate reduced below 15% in first pass.
- RC04 share quantified to support any future 4th theme decision.
