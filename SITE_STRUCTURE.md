# SftS signals – Site Structure & UX Specification
*Draft v1 – March 2026*

This document defines the information architecture and key UI/content patterns for the SftS signals website.

It preserves the existing **Signals** experience and adds:

- A new **Decision Playbooks** section (with three core themes)  
- A new **Institutional Positioning Radar** section  
- Hooks between these sections and the existing Signals views

---

## 1. Top-Level Navigation

### 1.1 Primary nav items

1. **Signals**
   - Existing main page: institutional signal catalogue, directories, charts, and methodology.

2. **Decision Playbooks**
   - New section focused on “what should we do next?” for specific roles.
   - Thematic subsections:
     - Tokenized Funds & RWAs
     - Stablecoins & Settlement
     - Market Infrastructure & DLT

3. **Institutional Positioning Radar**
   - New section that benchmarks institutions across the three themes.

4. **About / Methodology** (optional consolidation)
   - Existing methodology content + brief about NextFi Advisors and SftS signals.

5. **Contact / Work with NextFi**
   - Primary conversion route for advisory and BD.

---

## 2. Signals – Existing Section (Preserved)

The current **Signals** page remains a primary pillar.

Key blocks (as implemented today):

- Hero: “The Institutional Migration to Blockchain Infrastructure”
- Persona selector: “View signals from the perspective of: …”
- Signal Catalogue / Institutional Initiative Directory
- Country Directory / Signal Intelligence / Signal Charts
- Methodology / Notes

### 2.1 New cross-links from Signals

Add subtle hooks from **Signals** into the new sections:

- When users filter to a theme (e.g., tokenized funds, stablecoins, DLT infra), show a small banner:
  - “Want to see what credible next steps look like in this area? → View the [Tokenized Funds / Stablecoins / Market Infrastructure] Decision Playbook.”

- Near the top of the Signals page, add a brief strip:
  - “Use Decision Playbooks to turn Signals into strategic options. → Explore playbooks.”

---

## 3. Decision Playbooks – New Section

**Route:** `/decision-playbooks`

### 3.1 Decision Playbooks – Landing

**Title:**  
`Decision Playbooks`

**Intro:**

> Decision Playbooks turn institutional signals and live on‑chain data into 2–3 credible strategic paths for specific roles. Each playbook combines SftS signals with external market data (including rwa.xyz) to answer a simple question:
>
> **Given where the market is today, what should we do next?**

**Who this is for (bullets):**

- **Asset managers & institutional investors**  
  “Design tokenized products and operating models that your CIO, board, and regulators can actually approve.”

- **Banks, custodians & FMIs**  
  “Decide where to modernize payments, collateral, and post‑trade infrastructure without chasing every hype cycle.”

- **Fintech & infrastructure providers**  
  “Align your roadmap and BD focus with where institutional budgets and mandates are actually landing, not just where the noise is.”

**Theme cards (3 tiles):**

Each tile: title, short description, “View playbook →”.

1. **Tokenized Funds & RWAs**  
   “Tokenized money market funds, Treasuries, and credit – where institutions are moving and how to enter without overextending.”

2. **Stablecoins & Settlement**  
   “On‑chain cash, deposit tokens, and settlement rails – from pilots to production‑grade institutional flows.”

3. **Market Infrastructure & DLT**  
   “DLT in clearing, settlement, custody, and collateral – how FMIs and large banks are modernizing the plumbing.”

Clicking a tile scrolls or navigates to the corresponding subsection.

---

### 3.2 Playbook – Tokenized Funds & RWAs

**Route:** `/decision-playbooks/tokenized-funds` (or anchor on main Decision Playbooks page)

**Header:**  
`Decision Playbook – Tokenized Funds & RWAs`

**Who this is for (short paragraph):**

> For asset managers, banks, custodians, FMIs, and fintech/infrastructure providers evaluating tokenized money market funds, Treasuries, and other real‑world asset vehicles.

#### 3.2.1 Signals & Flows snapshot (compact)

**Subheading:** `Current market picture`

- **Institutional signals (SftS):**
  - “Dozens of Structural and Material initiatives from global asset managers, custodians, and banks focused on tokenized MMFs, Treasuries, and short-duration credit.”
  - “Signal strength is highest in US and EU, with increasing activity in select APAC hubs.”

- **On‑chain flows (from rwa.xyz):**
  - “Tokenized Treasuries and MMF AUM (rwa.xyz) have grown from niche to multi‑billion‑dollar scale over the last 18–24 months, concentrated on a handful of platforms and chains.”
  - “Value is clustered in conservative, short-duration instruments – not exotic or illiquid assets.”

**Summary line:**

> Institutions are signaling commitment to tokenized funds faster than actual on‑chain value has diversified – especially in Europe – creating a window for well‑timed, focused moves.

#### 3.2.2 Three credible plays (2026–2028)

**Subheading:**  
`Three credible paths into tokenized funds (2026–2028)`

**Play 1 – Quiet pilot anchored in an existing fund**

- *One‑liner:*  
  “Extend one existing, well‑understood fund onto tokenized rails for a tightly defined institutional segment.”

- *What it is:*  
  “Create a tokenized share class for a government MMF or short-duration bond fund under a clear regulatory framework (e.g., MiCA‑aligned or equivalent).”

- *Why it’s credible now:*  
  “Peers have already taken this route, creating Structural and Material signals without needing to re‑architect their full product stack.”

- *Best fit if you are:*
  - Asset manager / institutional investor – “You want operational learning and signaling to clients/board, but are not ready for a broad product‑line overhaul.”
  - Bank / custodian / FMI – “You want to ensure your custody and collateral frameworks can accept and service tokenized fund units from leading managers.”
  - Fintech / infrastructure provider – “You can reduce friction for onboarding, on‑chain record‑keeping, and integration with existing custodians and fund administrators.”

**Play 2 – Tokenized cash + tokenized funds for treasury and collateral**

- *One‑liner:*  
  “Combine tokenized funds with on‑chain cash or deposit tokens to solve specific treasury and collateral problems.”

- *What it is:*  
  “Design offerings where tokenized MMFs and short-duration funds sit alongside tokenized cash or stablecoins for intraday liquidity, collateral posting, or treasury operations.”

- *Why it’s credible now:*  
  “Signals show institutions increasingly framing tokenized funds and on‑chain cash as adjacent building blocks, not separate experiments.”

- *Best fit if you are:*  
  - Asset manager / institutional investor – “You see client demand around liquidity and collateral efficiency, not just ‘digital distribution’.”  
  - Bank / custodian / FMI – “You are already exploring stablecoin or deposit-token rails and want a clear asset side that matches those rails.”  
  - Fintech / infrastructure provider – “Your strength is orchestrating movement and reporting between tokenized funds, tokenized cash, and traditional accounts.”

**Play 3 – Market infrastructure partnerships**

- *One‑liner:*  
  “Embed tokenized funds into custody, distribution, and post‑trade infrastructure through targeted partnerships.”

- *What it is:*  
  “Work with custodians, exchanges, or FMIs to make tokenized funds ‘first‑class citizens’ in custody, collateral, and trading workflows.”

- *Why it’s credible now:*  
  “Structural signals show custodians and FMIs migrating tokenized units into core systems (not side pilots), especially in post‑trade and collateral services.”

- *Best fit if you are:*  
  - Asset manager / institutional investor – “You want your tokenized products to appear seamless to distributors and platforms, not as bolt‑on experiments.”  
  - Bank / custodian / FMI – “You are modernizing post‑trade and collateral processes and want tokenized funds to fit naturally into those new rails.”  
  - Fintech / infrastructure provider – “You can make it easier for large institutions to integrate tokenized funds into existing infra (custody, TA, clearing) without a big‑bang replacement.”

#### 3.2.3 Common pitfalls & prerequisites

**Subheading:** `Before you pick a play`

Bullets:

- “Regulatory clarity in your jurisdiction is necessary but rarely sufficient; internal risk and operations buy‑in typically take longer than legal sign‑off.”
- “Most failed tokenization pilots underestimated integration with existing custody, transfer agency, and fund‑accounting systems.”
- “Client demand is often diffuse; start with specific anchor clients or segments (HNW/family office, corporate treasury, or a particular region).”
- “Without a clear narrative for boards and investment committees, tokenized funds risk being seen as ‘nice to have’ rather than strategic.”

#### 3.2.4 How NextFi can help

**Subheading:** `Turning this playbook into your roadmap`

Short paragraph + bullets:

> SftS shows where institutions are actually moving. NextFi Advisors helps you decide which of these plays fits your institution or platform – and what that means for sequencing, partners, and internal approvals.

- “Board and ExCo briefings on tokenized funds and RWAs grounded in real institutional signals and live on‑chain data.”
- “Playbook-to-roadmap workshops: selecting and tailoring the right play(s) for your institution, with clear 12–24 month milestones.”
- “Vendor and partner landscape mapping based on who is actually live in your segment, not just who is loudest.”

CTAs:

- “→ Discuss which play fits your institution”
- “→ Request a 2‑page tokenized funds positioning brief”

---

### 3.3 Playbook – Stablecoins & Settlement

**Header:**  
`Decision Playbook – Stablecoins & Settlement`

**Who this is for:**

> For banks, payments providers, asset managers, FMIs, and fintech/infrastructure teams evaluating stablecoins, tokenized deposits, and on‑chain settlement rails for institutional flows.

#### 3.3.1 Signals & Flows snapshot

- **Institutional signals (SftS):**
  - “Structural and Material signals from global banks, payments providers, and infra platforms exploring on‑chain settlement for cross‑border B2B payments, FX, and treasury flows.”
  - “Shift from ‘crypto-native stablecoins’ to bank‑issued or tightly regulated stablecoins and deposit tokens.”

- **On‑chain flows (from rwa.xyz):**
  - “Stablecoin transfer volumes (rwa.xyz) have reached multi‑trillion‑dollar scale annually, with a growing share in B2B and institutional contexts rather than retail speculation.”
  - “Flows remain concentrated in a small number of major stablecoins and chains, but experiments are broadening across regions and regulatory frameworks.”

Summary:

> On‑chain money is already doing real economic work, but institutional settlement rails are still unevenly distributed across regions, products, and counterparties.

#### 3.3.2 Three credible plays

**Play 1 – Controlled treasury / B2B pilot**

- “Use regulated stablecoins or deposit tokens in narrow B2B or treasury flows where you control both ends of the relationship.”
- Best for:
  - Banks/treasuries wanting low‑headline learning.
  - Corporates and asset managers moving cash between entities.
  - Fintechs providing rails that sit inside existing controls.

**Play 2 – Client-facing settlement enhancement**

- “Offer clients faster, more transparent settlement for specific flows, using stablecoins/deposit tokens as an optional rail.”
- Best for:
  - Banks/payments providers competing on service levels.
  - Asset managers where timing of cash flows matters.
  - Fintechs abstracting rail complexity behind a simple API.

**Play 3 – Infrastructure partnership or network participation**

- “Join or co‑build an institutional settlement network where on‑chain money is embedded into existing systems.”
- Best for:
  - Banks/custodians/FMIs wanting scale and shared governance.
  - Asset managers seeking multi‑counterparty connectivity.
  - Infra providers playing a neutral rails/orchestration role.

#### 3.3.3 Common pitfalls & prerequisites

- “Regulators and internal risk teams focus heavily on governance, controls, and resolvability.”
- “Public-chain pilots without clear legal/operational frameworks can create more risk than insight.”
- “New rails require new processes: wallets/keys, reconciliation, accounting, and incident response.”
- “Start with a small number of assets and rails with strong institutional support; avoid multi‑asset, multi‑chain overload at the start.”

#### 3.3.4 How NextFi can help

- “Regulator‑ready briefings distinguishing speculative stablecoin use from prudentially sound applications.”
- “Pilot design for treasury/B2B flows: flows, counterparties, and rails for your first 12–18 months.”
- “Network and partner strategy: mapping which infra providers and counterparties matter most for your segment and region.”

CTAs:

- “→ Explore which stablecoin & settlement play fits your institution”
- “→ Request a settlement pilot blueprint”

---

### 3.4 Playbook – Market Infrastructure & DLT

**Header:**  
`Decision Playbook – Market Infrastructure & DLT`

**Who this is for:**

> For FMIs, global and regional banks, asset managers, custodians, and infra providers considering how DLT fits into post‑trade, custody, collateral management, and related market infrastructure.

#### 3.4.1 Signals & Flows snapshot

- **Institutional signals (SftS):**
  - “Structural and Material signals from CSDs, CCPs, global custodians, and large banks piloting or deploying DLT in clearing, settlement, and collateral workflows.”
  - “Narrative shift from ‘disrupt FMIs’ to ‘FMIs deploying DLT to modernize efficiency, risk, and ownership transparency’.”

- **Market flows / usage (from SftS signals + rwa.xyz and other public data):**
  - “DLT-based platforms and networks now process sustained daily transaction volumes for institutional flows (payments, collateral, tokenized assets), not just small pilots.”
  - “We see clustering around specific FMI domains: collateral mobility, intraday liquidity, and same‑ or T+0 settlement in selected products.”

Summary:

> DLT is being adopted as infrastructure *inside* institutions, and its footprint is uneven across market segments and regions.

#### 3.4.2 Three credible plays

**Play 1 – Targeted post‑trade / collateral use case**

- “Apply DLT to a specific post‑trade or collateral workflow where pain and risk are high and market structure is contained.”
- Best for:
  - FMIs/banks/custodians seeking tangible reductions in fails, breaks, and capital/liquidity costs.
  - Asset managers willing to participate where settlement certainty or collateral efficiency improves.
  - Fintechs providing orchestration for a narrow but high‑value workflow.

**Play 2 – Tokenized assets + DLT post‑trade integration**

- “Align tokenization initiatives with DLT post‑trade so issuance, settlement, and servicing evolve together.”
- Best for:
  - Asset managers/issuers already exploring tokenized funds/bonds.
  - FMIs/custodians/banks treating tokenization and DLT post‑trade as one modernization portfolio.
  - Infra providers aligning issuance platforms, DLT systems, and legacy custody.

**Play 3 – Strategic DLT platform participation or build**

- “Decide whether to participate in, co‑own, or build a DLT platform that aims to become core infra in your segment.”
- Best for:
  - FMIs/banks/custodians deciding if they will be users, co‑owners, or competitors of emerging platforms.
  - Asset managers wanting a voice in platform governance and priorities.
  - Infra providers contributing components (interoperability, risk/analytics, connectivity).

#### 3.4.3 Common pitfalls & prerequisites

- “Trying to ‘blockchain everything’ without a clear high‑pain workflow leads to stalled pilots.”
- “Regulators expect DLT not to degrade controls, audit, or resilience.”
- “Integration with legacy systems dominates timelines; design for coexistence, not sudden replacement.”
- “Governance (who runs the platform, who has a vote, data sharing) is often harder than the tech.”

#### 3.4.4 How NextFi can help

- “Use-case prioritization: identifying which post‑trade, collateral, or custody workflows are best suited for DLT at your institution.”
- “Roadmap and architecture: designing a phased approach that ties tokenization, DLT post‑trade, and stablecoin/settlement efforts together.”
- “Partner and platform strategy: deciding when to join, co‑create, or compete with emerging DLT-based infrastructure platforms.”

CTAs:

- “→ Explore which DLT plays fit your institution or platform”
- “→ Request a DLT & market infrastructure positioning workshop”

---

## 4. Institutional Positioning Radar – New Section

**Route:** `/institutional-radar`

### 4.1 Overview

**Title:**  
`Institutional Positioning Radar`

**Intro:**

> Positioning Radar benchmarks an institution’s digital‑asset posture against peers across three themes:
> - Tokenized Funds & RWAs
> - Stablecoins & Settlement
> - Market Infrastructure & DLT
>
> It uses SftS signals importance scores and trend context to show where you are leading, matching, or lagging.

### 4.2 Radar UI

- Dropdown: “Select institution” (from your catalogue)  
- Dropdown: “Select peer group” (e.g., Global Asset Managers, Regional Banks, Global Custodians, FMIs)

**Radar axes:**

- Tokenized Funds & RWAs  
- Stablecoins & Settlement  
- Market Infrastructure & DLT  

Display:

- One line: selected institution.  
- One line: peer group average.

### 4.3 Theme detail tabs

Tabs under the radar:

- `Tokenized Funds & RWAs`
- `Stablecoins & Settlement`
- `Market Infrastructure & DLT`

Each tab shows:

- 3–4 bullets explaining the institution’s relative position in that theme.
- 2–3 recommended moves (linking back to the relevant Decision Playbook).
- CTA:

  - “→ Get a private positioning report for your institution (PDF)”
  - “→ Combine this radar with a Decision Playbook workshop”

---

## 5. Cross-linking and Conversion

- From **Signals** theme filters → links to the relevant Decision Playbook sections.  
- From **Decision Playbooks** → links back to Signals slices (“See the underlying signals in SftS →”).  
- From **Institutional Positioning Radar** → links to Decision Playbooks (“View detailed plays for this theme →”) and Contact/Work-with-NextFi.

This structure keeps **Signals** as the core data product while elevating **Decision Playbooks** and **Positioning Radar** as the higher-value, action-oriented layers on top.
