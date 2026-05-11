// =====================================================================
// playbooks.js — structured playbook content (3 themes × 3 plays each).
// Lifted directly from the existing repo's SITE_STRUCTURE.md.
// =====================================================================

const PLAYBOOKS = {
  tokenized: {
    id: 'tokenized',
    label: 'Tokenized Funds & RWAs',
    short: 'Tokenized',
    color: 'var(--color-theme-tokenized)',
    cssClass: 'theme-tag--tokenized',
    icon: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
    audience: 'For asset managers, banks, custodians, FMIs, and fintech/infrastructure providers evaluating tokenized money market funds, Treasuries, and other real‑world asset vehicles.',
    snapshot: {
      sftsBullets: [
        'Dozens of Structural and Material initiatives from global asset managers, custodians, and banks focused on tokenized MMFs, Treasuries, and short-duration credit.',
        'Signal strength is highest in US and EU, with increasing activity in select APAC hubs.'
      ],
      onchainBullets: [
        'Tokenized Treasuries and MMF AUM (rwa.xyz) have grown from niche to multi-billion-dollar scale over the last 18-24 months, concentrated on a handful of platforms and chains.',
        'Value is clustered in conservative, short-duration instruments – not exotic or illiquid assets.'
      ],
      summary: 'Institutions are signaling commitment to tokenized funds faster than actual on-chain value has diversified — especially in Europe — creating a window for well-timed, focused moves.'
    },
    plays: [
      {
        id: 'tokenized-1',
        n: 1,
        title: 'Quiet pilot anchored in an existing fund',
        oneliner: 'Extend one existing, well-understood fund onto tokenized rails for a tightly defined institutional segment.',
        what: 'Create a tokenized share class for a government MMF or short-duration bond fund under a clear regulatory framework (e.g., MiCA-aligned or equivalent).',
        whyNow: 'Peers have already taken this route, creating Structural and Material signals without needing to re-architect their full product stack.',
        bestFit: [
          { who: 'Asset manager / institutional investor', why: 'You want operational learning and signaling to clients/board, but are not ready for a broad product-line overhaul.' },
          { who: 'Bank / custodian / FMI', why: 'You want to ensure your custody and collateral frameworks can accept and service tokenized fund units from leading managers.' },
          { who: 'Fintech / infrastructure provider', why: 'You can reduce friction for onboarding, on-chain record-keeping, and integration with existing custodians and fund administrators.' }
        ],
        // Audience match for auto-recommendation
        audienceMatch: ['asset_managers']
      },
      {
        id: 'tokenized-2',
        n: 2,
        title: 'Tokenized cash + tokenized funds for treasury and collateral',
        oneliner: 'Combine tokenized funds with on-chain cash or deposit tokens to solve specific treasury and collateral problems.',
        what: 'Design offerings where tokenized MMFs and short-duration funds sit alongside tokenized cash or stablecoins for intraday liquidity, collateral posting, or treasury operations.',
        whyNow: 'Signals show institutions increasingly framing tokenized funds and on-chain cash as adjacent building blocks, not separate experiments.',
        bestFit: [
          { who: 'Asset manager / institutional investor', why: 'You see client demand around liquidity and collateral efficiency, not just "digital distribution".' },
          { who: 'Bank / custodian / FMI', why: 'You are already exploring stablecoin or deposit-token rails and want a clear asset side that matches those rails.' },
          { who: 'Fintech / infrastructure provider', why: 'Your strength is orchestrating movement and reporting between tokenized funds, tokenized cash, and traditional accounts.' }
        ],
        audienceMatch: ['banks_fmis', 'fintech']
      },
      {
        id: 'tokenized-3',
        n: 3,
        title: 'Market infrastructure partnerships',
        oneliner: 'Embed tokenized funds into custody, distribution, and post-trade infrastructure through targeted partnerships.',
        what: 'Work with custodians, exchanges, or FMIs to make tokenized funds "first-class citizens" in custody, collateral, and trading workflows.',
        whyNow: 'Structural signals show custodians and FMIs migrating tokenized units into core systems (not side pilots), especially in post-trade and collateral services.',
        bestFit: [
          { who: 'Asset manager / institutional investor', why: 'You want your tokenized products to appear seamless to distributors and platforms, not as bolt-on experiments.' },
          { who: 'Bank / custodian / FMI', why: 'You are modernizing post-trade and collateral processes and want tokenized funds to fit naturally into those new rails.' },
          { who: 'Fintech / infrastructure provider', why: 'You can make it easier for large institutions to integrate tokenized funds into existing infra (custody, TA, clearing) without a big-bang replacement.' }
        ],
        audienceMatch: ['banks_fmis']
      }
    ],
    pitfalls: [
      'Regulatory clarity in your jurisdiction is necessary but rarely sufficient; internal risk and operations buy-in typically take longer than legal sign-off.',
      'Most failed tokenization pilots underestimated integration with existing custody, transfer agency, and fund-accounting systems.',
      'Client demand is often diffuse; start with specific anchor clients or segments (HNW/family office, corporate treasury, or a particular region).',
      'Without a clear narrative for boards and investment committees, tokenized funds risk being seen as "nice to have" rather than strategic.'
    ],
    nextfi: {
      lead: 'SftS shows where institutions are actually moving. NextFi Advisors helps you decide which of these plays fits your institution or platform — and what that means for sequencing, partners, and internal approvals.',
      bullets: [
        'Board and ExCo briefings on tokenized funds and RWAs grounded in real institutional signals and live on-chain data.',
        'Playbook-to-roadmap workshops: selecting and tailoring the right play(s) for your institution, with clear 12–24 month milestones.',
        'Vendor and partner landscape mapping based on who is actually live in your segment, not just who is loudest.'
      ],
      ctas: [
        { label: 'Discuss which play fits your institution', primary: true },
        { label: 'Request a 2-page tokenized funds positioning brief', primary: false }
      ]
    }
  },

  stablecoins: {
    id: 'stablecoins',
    label: 'Stablecoins & Settlement',
    short: 'Stablecoins',
    color: 'var(--color-theme-stablecoins)',
    cssClass: 'theme-tag--stablecoins',
    icon: '<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8"/><path d="M12 6v2m0 8v2"/>',
    audience: 'For banks, payments providers, asset managers, FMIs, and fintech/infrastructure teams evaluating stablecoins, tokenized deposits, and on-chain settlement rails for institutional flows.',
    snapshot: {
      sftsBullets: [
        'Structural and Material signals from global banks, payments providers, and infra platforms exploring on-chain settlement for cross-border B2B payments, FX, and treasury flows.',
        'Shift from "crypto-native stablecoins" to bank-issued or tightly regulated stablecoins and deposit tokens.'
      ],
      onchainBullets: [
        'Stablecoin transfer volumes (rwa.xyz) have reached multi-trillion-dollar scale annually, with a growing share in B2B and institutional contexts rather than retail speculation.',
        'Flows remain concentrated in a small number of major stablecoins and chains, but experiments are broadening across regions and regulatory frameworks.'
      ],
      summary: 'On-chain money is already doing real economic work, but institutional settlement rails are still unevenly distributed across regions, products, and counterparties.'
    },
    plays: [
      {
        id: 'stablecoins-1', n: 1,
        title: 'Controlled treasury / B2B pilot',
        oneliner: 'Use regulated stablecoins or deposit tokens in narrow B2B or treasury flows where you control both ends of the relationship.',
        what: 'Run a tightly scoped pilot using a regulated stablecoin or deposit token for a specific intra-group or bilateral counterparty flow — cash concentration, FX settlement, or intercompany transfers — with full audit trail and governance controls in place.',
        whyNow: 'Bank-grade and regulated stablecoin frameworks are maturing. Regulators are more familiar with well-governed pilots, and peers are building internal capability with low-headline approaches.',
        bestFit: [
          { who: 'Bank / payments provider', why: 'You want low-headline learning and internal capability-building before client-facing deployment.' },
          { who: 'Corporate treasurer / asset manager', why: 'Moving cash between entities or across time zones with controlled risk and efficiency gains.' },
          { who: 'Fintech / infrastructure provider', why: 'You provide rails that sit inside existing treasury and payments controls and can add on-chain settlement as an option.' }
        ],
        audienceMatch: ['banks_fmis', 'fintech']
      },
      {
        id: 'stablecoins-2', n: 2,
        title: 'Client-facing settlement enhancement',
        oneliner: 'Offer clients faster, more transparent settlement for specific flows, using stablecoins/deposit tokens as an optional rail.',
        what: 'Wrap a stablecoin or deposit-token rail behind a familiar interface so corporate or institutional clients see faster settlement, better visibility, and lower frictions on a defined set of flows.',
        whyNow: 'Service-level differentiation is the front-line battleground; early movers are signaling that they can compete on settlement quality, not just price.',
        bestFit: [
          { who: 'Bank / payments provider', why: 'You compete on service levels and want to upgrade existing client flows without rebuilding everything at once.' },
          { who: 'Asset manager', why: 'Timing of cash flows matters to your clients; a faster settlement option changes operational efficiency.' },
          { who: 'Fintech', why: 'You can abstract rail complexity behind a clean API and meet clients where they already are.' }
        ],
        audienceMatch: ['banks_fmis']
      },
      {
        id: 'stablecoins-3', n: 3,
        title: 'Infrastructure partnership or network participation',
        oneliner: 'Join or co-build an institutional settlement network where on-chain money is embedded into existing systems.',
        what: 'Become a founding or early participant in a multi-party institutional settlement network, contributing governance, liquidity, or technology — not a single-product launch.',
        whyNow: 'Multi-bank and multi-FMI settlement networks are graduating from pilot to production and are looking for credible early participants to lock in shared standards.',
        bestFit: [
          { who: 'Bank / custodian / FMI', why: 'You want scale and shared governance — and a vote on the standards that emerge.' },
          { who: 'Asset manager', why: 'Multi-counterparty connectivity matters more than any single rail.' },
          { who: 'Infra provider', why: 'You can play a neutral rails or orchestration role across multiple networks.' }
        ],
        audienceMatch: ['banks_fmis']
      }
    ],
    pitfalls: [
      'Regulators and internal risk teams focus heavily on governance, controls, and resolvability.',
      'Public-chain pilots without clear legal/operational frameworks can create more risk than insight.',
      'New rails require new processes: wallets/keys, reconciliation, accounting, and incident response.',
      'Start with a small number of assets and rails with strong institutional support; avoid multi-asset, multi-chain overload at the start.'
    ],
    nextfi: {
      lead: 'NextFi helps you tell the difference between speculative stablecoin use and prudentially sound institutional applications — and design pilots regulators can engage with.',
      bullets: [
        'Regulator-ready briefings distinguishing speculative stablecoin use from prudentially sound applications.',
        'Pilot design for treasury/B2B flows: flows, counterparties, and rails for your first 12–18 months.',
        'Network and partner strategy: mapping which infra providers and counterparties matter most for your segment and region.'
      ],
      ctas: [
        { label: 'Explore which stablecoin & settlement play fits your institution', primary: true },
        { label: 'Request a settlement pilot blueprint', primary: false }
      ]
    }
  },

  dlt: {
    id: 'dlt',
    label: 'Market Infrastructure & DLT',
    short: 'DLT & Infra',
    color: 'var(--color-theme-dlt)',
    cssClass: 'theme-tag--dlt',
    icon: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4"/>',
    audience: 'For FMIs, global and regional banks, asset managers, custodians, and infra providers considering how DLT fits into post-trade, custody, collateral management, and related market infrastructure.',
    snapshot: {
      sftsBullets: [
        'Structural and Material signals from CSDs, CCPs, global custodians, and large banks piloting or deploying DLT in clearing, settlement, and collateral workflows.',
        'Narrative shift from "disrupt FMIs" to "FMIs deploying DLT to modernize efficiency, risk, and ownership transparency".'
      ],
      onchainBullets: [
        'DLT-based platforms and networks now process sustained daily transaction volumes for institutional flows (payments, collateral, tokenized assets), not just small pilots.',
        'Activity clusters around specific FMI domains: collateral mobility, intraday liquidity, and same- or T+0 settlement in selected products.'
      ],
      summary: 'DLT is being adopted as infrastructure inside institutions, and its footprint is uneven across market segments and regions.'
    },
    plays: [
      {
        id: 'dlt-1', n: 1,
        title: 'Targeted post-trade / collateral use case',
        oneliner: 'Apply DLT to a specific post-trade or collateral workflow where pain and risk are high and market structure is contained.',
        what: 'Pick one workflow — repo collateral mobility, FX settlement, securities lifecycle events — and apply DLT only to that step, with measurable reductions in fails, breaks, and capital cost.',
        whyNow: 'Boards and regulators want to see specific, defensible wins from DLT; broad-strokes "blockchain everywhere" pilots are losing political support.',
        bestFit: [
          { who: 'FMI / bank / custodian', why: 'Tangible reductions in fails, breaks, and capital/liquidity costs.' },
          { who: 'Asset manager', why: 'You participate where settlement certainty or collateral efficiency improves measurably.' },
          { who: 'Fintech', why: 'You provide orchestration for a narrow but high-value workflow.' }
        ],
        audienceMatch: ['banks_fmis']
      },
      {
        id: 'dlt-2', n: 2,
        title: 'Tokenized assets + DLT post-trade integration',
        oneliner: 'Align tokenization initiatives with DLT post-trade so issuance, settlement, and servicing evolve together.',
        what: 'Treat tokenization and DLT post-trade as one modernization portfolio, so each issuance pilot directly informs the post-trade roadmap rather than running parallel.',
        whyNow: 'Splitting tokenization and post-trade modernization creates duplicate vendors, controls, and governance — peers integrating them are pulling ahead.',
        bestFit: [
          { who: 'Asset manager / issuer', why: 'Already exploring tokenized funds/bonds; integration with post-trade is the next blocker.' },
          { who: 'FMI / custodian / bank', why: 'Tokenization and DLT post-trade as one modernization portfolio.' },
          { who: 'Infra provider', why: 'Aligning issuance platforms, DLT systems, and legacy custody.' }
        ],
        audienceMatch: ['asset_managers', 'banks_fmis']
      },
      {
        id: 'dlt-3', n: 3,
        title: 'Strategic DLT platform participation or build',
        oneliner: 'Decide whether to participate in, co-own, or build a DLT platform that aims to become core infra in your segment.',
        what: 'Make the explicit "user / co-owner / competitor" decision about emerging DLT platforms, and align governance, capital, and engineering accordingly.',
        whyNow: 'Several DLT platforms are crossing the threshold from experiments to candidate core infrastructure; the participation window is narrowing.',
        bestFit: [
          { who: 'FMI / bank / custodian', why: 'Decide if you will be a user, co-owner, or competitor of emerging platforms.' },
          { who: 'Asset manager', why: 'You want a voice in platform governance and priorities.' },
          { who: 'Infra provider', why: 'You contribute components — interoperability, risk/analytics, connectivity.' }
        ],
        audienceMatch: ['banks_fmis']
      }
    ],
    pitfalls: [
      'Trying to "blockchain everything" without a clear high-pain workflow leads to stalled pilots.',
      'Regulators expect DLT not to degrade controls, audit, or resilience.',
      'Integration with legacy systems dominates timelines; design for coexistence, not sudden replacement.',
      'Governance — who runs the platform, who has a vote, data sharing — is often harder than the tech.'
    ],
    nextfi: {
      lead: 'NextFi helps FMIs and large banks decide where DLT actually pays — and how to align tokenization, settlement, and platform participation as a single modernization portfolio.',
      bullets: [
        'Use-case prioritization: identifying which post-trade, collateral, or custody workflows are best suited for DLT at your institution.',
        'Roadmap and architecture: designing a phased approach that ties tokenization, DLT post-trade, and stablecoin/settlement efforts together.',
        'Partner and platform strategy: deciding when to join, co-create, or compete with emerging DLT-based infrastructure platforms.'
      ],
      ctas: [
        { label: 'Explore which DLT plays fit your institution or platform', primary: true },
        { label: 'Request a DLT & market infrastructure positioning workshop', primary: false }
      ]
    }
  },

  perimeter: {
    id: 'perimeter',
    label: 'Regulation & Perimeter',
    short: 'Perimeter',
    color: 'var(--color-theme-perimeter)',
    cssClass: 'theme-tag--perimeter',
    icon: '<path d="M12 2l9 4v6c0 5-3.5 9-9 10-5.5-1-9-5-9-10V6l9-4z"/><path d="M9 12l2 2 4-4"/>',
    audience: 'For banks, FMIs, asset managers, fintech and infrastructure providers, and policy/risk/compliance functions tracking how regulatory clarity, licensing pathways, and cross-border coordination expand or constrain institutional digital-asset operations.',
    snapshot: {
      sftsBullets: [
        'Structural and Material signals from regulators, central banks, and standard-setters reshaping the institutional perimeter for tokenized assets, stablecoins, and DLT infrastructure.',
        'Activity is concentrated in three lanes today: single-agency licensing precedents (CFTC, OCC, FCA), jurisdiction-wide frameworks (GENIUS Act, MiCA, CLARITY Act markup), and international standard-setting (BIS, Basel, FATF).'
      ],
      onchainBullets: [
        'Regulatory clarity is the precondition layer beneath every other theme - tokenized fund issuance, stablecoin settlement, and DLT post-trade build-out all gate on perimeter moves.',
        'Across the 70+ jurisdictions with stablecoin or digital-asset frameworks active or pending, institutional deployment velocity tracks regulatory clarity more closely than technology readiness.'
      ],
      summary: 'Perimeter signals tell you when the regulatory ceiling lifts. Institutional capital deployment in tokenized, stablecoin, and DLT plays follows perimeter changes by 6-18 months - sometimes within weeks for large incumbents that pre-staged operating models against expected clarity.'
    },
    plays: [
      {
        id: 'perimeter-1', n: 1,
        title: 'Targeted supervisory clarity',
        oneliner: 'A single regulator opens or clarifies a licensing pathway, clearing a specific institutional route without resolving the broader perimeter.',
        what: 'A regulatory agency (CFTC, OCC, SEC, FCA, MAS) opens or clarifies a licensing pathway for a specific crypto-adjacent activity - a derivatives venue, trust charter, custody framework, or product approval. Scope is limited to one jurisdiction and one activity, but the move establishes precedent and removes ambiguity for first-mover institutions.',
        whyNow: 'Institutions planning crypto infrastructure moves need regulatory home-ness. A single agency\'s pilot licensing clears the path for early adopters - internal compliance friction drops from "is this legal?" to "which template do we follow?" Recent CFTC and OCC actions show this pattern playing out in real time.',
        bestFit: [
          { who: 'Bank / FMI', why: 'You have a specific activity gated on a specific regulator; a targeted licensing precedent removes the single biggest friction.' },
          { who: 'Asset manager / institutional investor', why: 'Single-agency clarity lets you sponsor or use newly-licensed venues without unresolved jurisdictional risk.' },
          { who: 'Fintech / infrastructure provider', why: 'Your product roadmap is gated on the same regulator; a licensing template tells you what the build needs to look like.' },
          { who: 'Policy / risk / compliance', why: 'A licensing precedent is a usable artifact - you can map your internal controls against the agency\'s published framework rather than improvising.' }
        ],
        audienceMatch: ['banks_fmis', 'fintech', 'policy_risk']
      },
      {
        id: 'perimeter-2', n: 2,
        title: 'Jurisdiction-wide regulatory framework',
        oneliner: 'A jurisdiction-wide policy move or cross-agency coordination removes ambiguity across an entire institutional perimeter.',
        what: 'A legislative move, multi-agency coordination, or jurisdiction-wide regulatory framework sets the institutional perimeter across a full jurisdiction - covering multiple activities, instruments, or regulator turf lines. Examples include GENIUS Act stablecoin rules, MiCA implementation, CLARITY Act SEC/CFTC jurisdiction splits, and nationwide compliance regimes like FCA\'s 24-hour rule rollout.',
        whyNow: 'When regulatory ambiguity lifts across a full jurisdiction, institutional deployment accelerates non-linearly. CFOs who previously approved exploratory budgets release infrastructure budgets because compliance can point to a settled framework rather than evolving guidance. The velocity is highest where multiple agencies had been in conflict.',
        bestFit: [
          { who: 'Bank / FMI', why: 'You operate at jurisdictional scale; cross-activity clarity lets you build unified compliance infrastructure instead of parallel tracks.' },
          { who: 'Asset manager / institutional investor', why: 'Product launch decisions that were blocked by jurisdictional ambiguity become approvable; sequencing of tokenized and stablecoin offerings unlocks.' },
          { who: 'Fintech / infrastructure provider', why: 'A jurisdiction-wide framework defines your addressable market; product pricing, licensing strategy, and distribution all reset.' },
          { who: 'Policy / risk / compliance', why: 'You shift from interpreting evolving guidance to operationalizing a settled framework - and from defensive risk posture to enabling activity within clear bounds.' }
        ],
        audienceMatch: ['banks_fmis', 'asset_managers', 'fintech', 'policy_risk']
      },
      {
        id: 'perimeter-3', n: 3,
        title: 'International regulatory coordination',
        oneliner: 'Multi-country regulators or international standard-setters establish a common institutional perimeter that spans jurisdictions.',
        what: 'BIS handbook updates, FATF guidance adoption across G7 central banks, international MOUs on crypto custody, or Basel Committee standards set a perimeter that spans jurisdictions. Outcome: firms operating in multiple markets can use a single compliance template instead of maintaining bespoke frameworks per jurisdiction.',
        whyNow: 'Institutions operating across jurisdictions pay a compliance variance tax that scales with their footprint. A single international standard cuts that tax materially. As institutions move from pilot to production scale, maintaining jurisdiction-specific variants becomes the binding operational constraint - moving to a common standard is a cost-of-scale unlock.',
        bestFit: [
          { who: 'Bank / FMI', why: 'You operate in multiple jurisdictions; an international standard collapses parallel compliance frameworks into one.' },
          { who: 'Asset manager / institutional investor', why: 'Cross-border product distribution gets cheaper and faster when the underlying regulatory expectations converge.' },
          { who: 'Infrastructure provider', why: 'Your platform serves clients across jurisdictions; a converged standard removes the per-market customization burden.' },
          { who: 'Policy / risk / compliance', why: 'You can move from country-by-country interpretation to a single framework with documented local deltas - a fundamental shift in how the function operates.' }
        ],
        audienceMatch: ['banks_fmis', 'policy_risk']
      }
    ],
    pitfalls: [
      'Regulatory clarity is necessary but not sufficient. A perimeter unlock removes veto power; it does not create demand. Treat perimeter signals as preconditions for, not substitutes for, tokenized/stablecoin/DLT execution.',
      'Single-agency licensing does not guarantee market depth. A licensed venue still needs liquidity, counterparties, and operational flow before institutional infrastructure spend follows.',
      'Jurisdiction-wide frameworks are often compromise language that resolves some turf wars while leaving others open (e.g., derivatives clarity without stablecoin clarity). Read the framework for what it does and does not settle before reallocating budget.',
      'International coordination is slow (BIS guidance cycles run 18-24 months) and frequently produces "common standard + local variations" rather than true convergence. Bet on the direction, not the timing.',
      'Regulatory action and enforcement live on the same axis. A perimeter move that clarifies for one institution can constrain another - always read who the precedent enables and who it pins down.'
    ],
    nextfi: {
      lead: 'NextFi helps institutions read perimeter signals as actionable inputs - distinguishing precedent-setting moves from rhetorical ones, and translating regulatory clarity into sequencing decisions for tokenized, stablecoin, and DLT execution.',
      bullets: [
        'Perimeter monitoring: Structural and Material signal briefs tracking CFTC, SEC, OCC, FCA, MAS, BIS, and FATF moves with institutional implications.',
        'Compliance template analysis: how a single-agency licensing precedent translates into internal controls, board materials, and external counsel scope.',
        'Cross-jurisdictional sequencing: which markets clear first, what that means for product launch order, and where compliance variance tax is highest.',
        'Pre-positioning playbooks for institutions building operating models against expected clarity ahead of legislative or supervisory milestones.'
      ],
      ctas: [
        { label: 'See which perimeter moves matter for your institution', primary: true },
        { label: 'Request a regulatory perimeter brief', primary: false }
      ]
    }
  }
};

// =====================================================================
// recommendPlayForSignal — given a signal + current persona,
// pick THE single most relevant play across the matched themes.
// =====================================================================
function recommendPlayForSignal(signal, persona = 'all') {
  const themes = signal._themes || [];
  if (themes.length === 0) return null;

  // For each theme, score each play
  let best = null;
  for (const themeId of themes) {
    const playbook = PLAYBOOKS[themeId];
    if (!playbook) continue;
    for (const play of playbook.plays) {
      let score = 0;

      // 1. Persona alignment
      if (persona && persona !== 'all' && play.audienceMatch.includes(persona)) score += 6;

      // 2. Tier matching: Structural signals favor "platform / partnership" plays (n=3),
      //    Material favors "expansion" plays (n=2), Context/early favors "pilot" plays (n=1)
      if (signal._tier === 'Structural' && play.n === 3) score += 4;
      else if (signal._tier === 'Material' && play.n === 2) score += 4;
      else if ((signal._tier === 'Context' || !signal._tier) && play.n === 1) score += 4;

      // 3. Institution-type alignment with play's typical actor set
      const it = signal.institution_type || '';
      if (play.n === 1 && it === 'Asset & Investment Management') score += 3;
      if (play.n === 2 && (it === 'Global Banks' || it === 'Payments Providers')) score += 3;
      if (play.n === 2 && (it === 'Regulatory Agencies' || it === 'Central Banks & Regulators')) score += 3;
      if (play.n === 3 && (it === 'Exchanges & Central Intermediaries' || it === 'Financial Infrastructure Operators' || it === 'Global Banks')) score += 3;

      // 4. If signal's theme matches the playbook theme exactly, baseline +2
      score += 2;

      if (!best || score > best.score) best = { themeId, play, score };
    }
  }
  return best;
}

window.SftSPlaybooks = { PLAYBOOKS, recommendPlayForSignal };
