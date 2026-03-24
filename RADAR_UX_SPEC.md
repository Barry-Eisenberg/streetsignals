# Institutional Positioning Radar – UX & Content Specification
*Draft v1 – March 2026*

The Institutional Positioning Radar is a new section that benchmarks an institution’s digital‑asset posture against peers across three themes:

- Tokenized Funds & RWAs  
- Stablecoins & Settlement  
- Market Infrastructure & DLT  

It uses SftS signals’ importance scores and trend context to show **where an institution is leading, matching, or lagging**, and then links directly into the relevant Decision Playbooks.

---

## 1. Page overview

**Route:** `/institutional-radar`

### 1.1 Hero

**Title**

`Institutional Positioning Radar`

**Subhead**

> Benchmark your institution’s digital‑asset posture across tokenized funds, stablecoins & settlement, and DLT‑based market infrastructure – and see how you compare to peers.

**Who this is for**

Short bullets:

- “Boards, CIOs, and strategy leaders at asset managers, banks, custodians, and FMIs.”  
- “Fintech and infrastructure providers wanting a clear view of target institutions’ adoption profiles.”  

**Note**

> Radar views are based on SftS signal importance scores (Structural / Material / Context) and trend context across the last 18–24 months. Optional on‑chain context from rwa.xyz (e.g., AUM or volumes in each theme) can be shown in the theme tabs but does not affect the radar scores.

---

## 2. Core radar component

### 2.1 Inputs

Place a simple control bar above the chart:

- Dropdown: **Select institution**  
  - Values: list of institutions in your catalogue (or a subset you support initially).  
  - Include an option like “Example Institution (demo)” for first‑time visitors.

- Dropdown: **Select peer group**  
  - Examples:  
    - `Global Asset Managers`  
    - `Regional Banks`  
    - `Global Custodians`  
    - `FMIs`  
    - `Payments Providers`

- Button: `Generate radar`

### 2.2 Radar axes

Three axes (keep them consistent with Decision Playbooks):

1. Tokenized Funds & RWAs  
2. Stablecoins & Settlement  
3. Market Infrastructure & DLT  

Each axis is a normalized score (0–100 or 0–1) derived from:

- The density and tier of Structural + Material signals for that institution in that theme over the last 18–24 months.  
- Optionally weighted by trendContextScore.

### 2.3 Visual treatment

- Radar (spider) chart with two polygons:

  - **Institution** (highlight color)  
  - **Peer group average** (neutral color)

- Legend:

  - “Selected institution”  
  - “Peer group average”

- Small text under chart:

  > Scores reflect the relative strength of Structural and Material signals in each theme over the last 18–24 months, normalized against the selected peer group.

---

## 3. Theme detail tabs

Under the radar, show three tabs that align with your Decision Playbooks:

- `Tokenized Funds & RWAs`  
- `Stablecoins & Settlement`  
- `Market Infrastructure & DLT`

### 3.1 Theme tab layout (shared pattern)

For each tab:

1. **Theme summary**

   - One or two lines describing the institution’s relative position:

     - “Compared to [peer group], [Institution] is AHEAD / IN LINE / BEHIND in this theme.”

   - Determined by comparing the institution’s score vs peer average with simple thresholds (e.g., ±10–15%).

2. **Three–four diagnostic bullets**

   Examples:

   - Tokenized Funds tab:  
     - “You have X Structural/Material signals in tokenized funds vs a peer average of Y.”  
     - “Most of your activity is in [MMFs / Treasuries / other] and concentrated in [region].”  
     - “Peers are more active in [custody integration / distribution partnerships / regulatory filings].”

   - Stablecoins tab:  
     - “Your signals cluster in internal treasury pilots rather than client-facing settlement upgrades.”  
     - “Peers in your segment have more Structural signals in cross‑border B2B flows and FX settlement.”

   - Market Infrastructure tab:  
     - “Your DLT activity is focused on proofs‑of‑concept, while peer FMIs have at least one live production or high‑commitment pilot.”

   Where helpful, you may add one bullet per theme summarizing on‑chain AUM/volume from rwa.xyz for that theme (e.g., tokenized Treasuries AUM, stablecoin transfer volumes) to contextualize the SftS signals‑based score.

3. **Suggested moves (link to Decision Playbooks)**

   2–3 bullets that mirror your Decision Playbooks, but tailored by relative position:

   Example for Tokenized Funds tab:

   - If ahead:  
     - “Consolidate your lead by:  
       - Formalizing a MiCA‑ or equivalent‑aligned framework for additional tokenized funds,  
       - Partnering with custodians to make tokenized units first‑class citizens in collateral and distribution workflows.”  

   - If behind:  
     - “To close the gap, consider:  
       - A quiet pilot anchored in a single MMF or short-duration fund,  
       - Aligning with at least one custodian’s tokenization roadmap.”

   Add a short link:

   - “→ View the full Tokenized Funds & RWAs Decision Playbook for detailed plays.”

4. **CTA for NextFi engagement**

   At the bottom of each tab:

   - “→ Request a private radar and playbook session for [Institution] in this theme.”  

---

## 4. Example content – Tokenized Funds tab

Assume:

- Institution: “Example Global Asset Manager”  
- Peer group: “Global Asset Managers”  
- Radar: Tokenized Funds score somewhat below peer average.

### 4.1 Summary line

> Compared to Global Asset Managers, Example Global Asset Manager is **slightly behind** peers on Tokenized Funds & RWAs.

### 4.2 Diagnostic bullets

- “SftS shows 2 Material tokenized fund initiatives for your firm vs a peer average of 4–5 in the last 18–24 months.”  
- “Your activity is concentrated in exploratory research and limited‑scope pilots; peers have moved at least one MMF or short-duration fund into live tokenized share classes.”  
- “You have fewer visible partnerships with custodians or platforms integrating tokenized fund units into collateral, distribution, or post‑trade workflows.”

### 4.3 Suggested moves

- “Select one existing government MMF or short-duration fund and design a tokenized share class pilot for a narrow segment of institutional clients under your most permissive regulatory regime.”  
- “Engage your primary custodians on their tokenization roadmap and ensure your pilot aligns with at least one of their supported approaches.”  
- “Define 1–2 treasury or collateral scenarios where tokenized fund units deliver clear operational or liquidity benefits, even at small scale.”

Link:

> → View the full **Tokenized Funds & RWAs Decision Playbook** to see three detailed plays and common pitfalls.

CTA:

> → Request an **Example Global Asset Manager – Tokenized Funds Radar & Playbook** session.

---

## 5. Interaction with Signals and Playbooks

### 5.1 From Radar to Decision Playbooks

- Each theme tab includes at least one link:

  - “View full Decision Playbook for this theme → /decision-playbooks/tokenized-funds` (or stablecoins, DLT).”

### 5.2 From Radar to Signals

- Under the radar, a small link:

  - “See all Structural and Material signals for [Institution] → (pre‑filtered view in the Signals Institutional Directory).”

- Within each theme tab:

  - “View underlying signals in this theme → (pre‑filtered to institution + theme).”

---

## 6. Initial / demo state

Because interactive institution selection may take time to implement, a v1 “demo” state can be:

- Default institution: “Example Global Institution (Demo)”  
- Default peer group: “Global Asset Managers”  
- Radar plotted with anonymized or synthetic scores representative of a real profile.  
- Static theme summaries and suggested moves.

This allows you to:

- Show the value of the Radar in screenshots, sales calls, and on the site.  
- Later wire it up to live data and institution selection when ready.

---

## 7. Future enhancements (optional)

Once the core UX is in place, consider:

- Export: “Download radar as PDF/PNG” with a short one‑page summary.  
- Multi‑institution comparison: allow comparing up to 3 institutions at once (e.g., “us vs two peers”).  
- “Send me this” form: users can enter their email to receive the radar and a brief, feeding your BD funnel.