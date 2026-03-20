# Initiative Classification Decision Tree

Use this guide to classify each signal into consistent initiative categories.

## Canonical Initiatives

- Tokenized Securities / RWA
- Crypto / Digital Assets
- DLT / Blockchain Infrastructure
- Payment Infrastructure
- Stablecoins & Deposit Tokens
- CBDC
- DeFi
- Digital Asset Strategy
- Interoperability & Standards
- Settlement Infrastructure
- Regulatory / Compliance

## One-Page Decision Tree

1. Is the core update about rules, supervision, legal clarity, or compliance obligations?
- Yes: Regulatory / Compliance
- No: Continue

2. Is the update explicitly about central bank digital currency issuance, pilots, or policy?
- Yes: CBDC
- No: Continue

3. Is the primary instrument a fiat-referenced digital money instrument (stablecoin or bank deposit token)?
- Yes: Stablecoins & Deposit Tokens
- No: Continue

4. Is this mainly about payment rail execution or cross-border payment flow?
- Yes: Payment Infrastructure
- No: Continue

5. Is this about clearing, collateral, post-trade lifecycle, or settlement finality?
- Yes: Settlement Infrastructure
- No: Continue

6. Is this about connecting networks or enforcing technical/market standards?
- Yes: Interoperability & Standards
- No: Continue

7. Is this decentralized protocol finance (lending pools, AMMs, decentralized derivatives)?
- Yes: DeFi
- No: Continue

8. Is this a tokenized traditional asset or regulated security brought on-chain?
- Yes: Tokenized Securities / RWA
- No: Continue

9. Is this mostly about native digital assets and crypto market activity?
- Yes: Crypto / Digital Assets
- No: Continue

10. Is this enabling technology, shared ledger stack, tokenization platform, or enterprise blockchain build?
- Yes: DLT / Blockchain Infrastructure
- No: Continue

11. Is this mostly strategic positioning, governance, roadmap, or enterprise operating model?
- Yes: Digital Asset Strategy
- No: Flag for taxonomy review

## Tie-Break Rules

- Prefer use-case over technology.
- If a signal clearly spans two areas, store both categories.
- If one category is an instrument and one is infrastructure, keep both.
- If one category is policy and one is implementation, keep both.

## Practical Boundary: Tokenized Securities / RWA vs Crypto / Digital Assets

- Tokenized Securities / RWA: Traditional asset class on new rails.
- Crypto / Digital Assets: Native digital asset class and crypto market activity.

Examples:
- Tokenized treasury fund share: Tokenized Securities / RWA
- BTC custody expansion: Crypto / Digital Assets
- Stablecoin treasury workflow: Stablecoins & Deposit Tokens

## Current Mapping Notes

To align matrix and analytics immediately, map these raw labels as follows:

- Cross-Border Payments -> Payment Infrastructure
- Stablecoins -> Stablecoins & Deposit Tokens
- Interoperability & Standards -> Interoperability & Standards
- Settlement Infrastructure -> Settlement Infrastructure
- Regulatory / Compliance -> Regulatory / Compliance
