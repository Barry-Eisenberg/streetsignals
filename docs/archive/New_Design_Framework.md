# Street Signals – Product & UI Design Framework
*Version 1.1 – March 2026*

This document turns the updated scoring and content model into concrete UI and UX patterns for the Street Signals site (streetsignals.nextfiadvisors.com). It focuses on:

- Page-level layout for the Signals experience  
- Signal card design and behavior  
- Priority Signals strip  
- Persona-aware “Why this matters” content  
- Content templates and concrete examples

It assumes the scoring backend follows the v3 Importance Methodology (importanceScore + trendContextScore, tiers Structural / Material / Context / Noise).

---

## 1. Design Goals

- **Filter, not feed**  
  Street Signals should feel like a *filter* on institutional noise, not another stream of headlines. Only the most consequential signals should stand out.

- **Importance first, trend second**  
  Visually separate *signal importance* (Structural / Material / Context) from *trend context* (Narrow / Emerging / Broad).

- **Serve busy execs and deep-dive analysts with one layout**  
  Show a concise summary (who, what, why it matters) by default; reveal detailed narrative and impact breakdown on demand.

- **Role-aware relevance without branching layouts**  
  Allow users to view signals “as a fintech PM”, “as an asset manager”, “as a bank/FMI operator”, or “as policy/risk” by swapping the “Why this matters” copy, not the card structure.

---

## 2. Page-Level Layout – Signals Experience

### 2.1 Hero Section

**Objective:** Make the filter/value proposition explicit and aligned with the v3 scoring.

**Suggested structure:**

- Small label above H1  
  `Signal Strength: Structural · Material · Context`

- H1 (keep existing title)  
  `The Institutional Migration to Blockchain Infrastructure`

- Subhead (2–3 lines)  
  > Street Signals filters hundreds of institutional digital‑asset initiatives to highlight only the most consequential moves from global banks, asset managers, FMIs, and regulators.  
  >  
  > Signals are scored for importance and trend context so you can see what’s real, what’s material, and what’s likely durable over the next 3–5 years.

- Audience line (small text under subhead)  
  > For fintech product & strategy leaders, asset managers, banks, FMIs, and policy / risk stakeholders.

---

### 2.2 Global Persona Selector

Place immediately below the hero, above the Priority Signals strip and Signals list.

**Label:**  
`View signals from the perspective of:`

**Control (segmented control or radio group):**

- `All roles` (default)  
- `Fintech Product & Strategy`  
- `Asset Managers / Institutional Investors`  
- `Banks & FMIs / Operations & Infra`  
- `Policy / Risk / Regulatory`

**Behavior:**

- When `All roles` is selected:  
  - All cards show the **generic** `whyItMatters.generic` text.
- When a persona is selected:  
  - Cards show the corresponding persona variant if present:  
    - `whyItMatters.fintech`  
    - `whyItMatters.assetManagers`  
    - `whyItMatters.banksFMI`  
    - `whyItMatters.policyRisk`  
  - If that variant is missing, fall back to `whyItMatters.generic`.

Optional helper text (tooltip):  
> Changes only the “Why this matters” lens; importance and trend scores remain the same.

---

### 2.3 Priority Signals Strip

Place below the persona selector, above the main list.

**Title:**  
`Priority Signals – This Quarter`

**Content:**  
- 3–5 mini-cards, **Structural** tier only by default.
- Horizontal scroll on desktop; vertical stack on mobile.

**Mini-card layout (wireframe):**

```text
---------------------------------------------------------------
| Priority Signals – This Quarter                             |
---------------------------------------------------------------
| [Structural signal]  Global Custodian Bank    Jan 2026      |
| Production tokenized collateral platform                     |
| Why it matters: Redefines how collateral moves between      |
| banks, CCPs, and FMIs in Europe.           [Trend: Broad]   |
---------------------------------------------------------------
| [Structural signal]  Top-3 EU Asset Manager  Mar 2026       |
| MiCA-aligned tokenized MMF for institutions                 |
| Why it matters: Gives EU managers and regulators a          |
| repeatable onchain cash structure.       [Trend: Emerging]  |
---------------------------------------------------------------
| [Structural signal]  Global Bank (Kinexys)   Nov 2025       |
| $2B+ daily DLT-based settlement flows                       |
| Why it matters: Proves DLT can handle sustained             |
| institutional volumes in production.        [Trend: Broad]  |
---------------------------------------------------------------
[ View all Structural signals → ]

