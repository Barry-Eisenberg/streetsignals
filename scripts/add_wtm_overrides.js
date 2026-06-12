// add_wtm_overrides.js — adds why_this_matters_override to high-priority Structural signals in data.json
// Run: node scripts/add_wtm_overrides.js
// Safe to re-run: already-overridden records are skipped unless --force is passed.

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/data.json');

const OVERRIDES = [
  {
    institution: 'JPMorgan Chase',
    initiativeSubstr: 'JPM Coin / Kinexys Digital Payments on Canton',
    override: {
      default:
        'The first bank-issued USD deposit token moving to a shared institutional network locks in Canton as the interoperability standard — banks and FMIs without a connection strategy face counterparty exclusion, not just a capability gap, over the next 12-24 months.',
      banks_fmis:
        'JPM Coin on Canton Network sets the integration target for institutional deposit tokens — your FX settlement, collateral, and treasury rails need a connection decision before the network is fully subscribed.',
      asset_managers:
        'A live multi-institution deposit-token network changes what execution and collateral counterparties will expect from you — not just what you can expect from them — over the next 12-24 months.',
      fintech:
        'Canton expanding to the world\'s largest institutional payment bank creates a connectivity layer that infrastructure providers can build on and a routing dependency others will need to navigate.',
      policy_risk:
        'A bank-issued deposit token migrating to a shared institutional ledger raises settlement finality, concentration risk, and interoperability governance questions that supervisors have not yet fully framed.',
    },
  },
  {
    institution: 'JPMorgan Chase',
    initiativeSubstr: 'Kinexys Digital Assets – Scale & Transaction Volume',
    override: {
      default:
        'Kinexys crossing $3 trillion in total volume with 10x payment growth removes the "just a pilot" objection — institutional tokenized deposit rails are now a proven commercial alternative to correspondent banking, shifting the question for every peer from evaluation to replication.',
      banks_fmis:
        'A peer bank\'s tokenized payment infrastructure at $7B+ daily volume and 400+ institutional participants sets a scale benchmark that directly pressures your correspondent banking and tokenized deposit roadmap.',
      asset_managers:
        'Proven scale on tokenized deposit rails changes what you can expect from treasury and collateral counterparties — and what they will start expecting from you.',
    },
  },
  {
    institution: 'Citigroup',
    initiativeSubstr: 'Citi Token Services – Euro Integration',
    override: {
      default:
        'Citi Token Services going live in EUR across a second financial center converts tokenized deposits from a USD-only product to a multi-currency institutional standard — reframing the competitive baseline for transaction banks without a live cross-currency tokenized deposit program.',
      banks_fmis:
        'Multi-currency 24/7 tokenized deposits in USD and EUR are now a live competitive offer from a tier-1 transaction bank — the window for a "wait and see" posture in your treasury and custody product stack is closing.',
      asset_managers:
        'Cross-currency tokenized settlement infrastructure at institutional scale changes what you can demand from your banking counterparties — and what clients will expect you to support.',
      fintech:
        'Citi\'s live EUR integration creates a multi-currency tokenized settlement reference architecture that fintech infrastructure providers can connect to or be displaced by.',
    },
  },
  {
    institution: 'Citigroup',
    initiativeSubstr: 'Citi Crypto Custody Launch',
    override: {
      default:
        'A top-5 global transaction bank entering institutional crypto custody normalizes digital asset safekeeping as a standard bank product — narrowing the specialist window and accelerating counterparty expectations across the market over the next 12-24 months.',
      banks_fmis:
        'Citi building an enterprise bridge between traditional and blockchain infrastructure sets a capability bar your clients will increasingly reference when selecting custody and settlement counterparties.',
      asset_managers:
        'A tier-1 bank offering crypto custody changes what "adequate" looks like in your digital asset operations and counterparty due diligence reviews over the next 12-24 months.',
      fintech:
        'Bank-grade crypto custody entering the mainstream compresses margins for specialist custodians and raises the infrastructure bar for any platform competing in digital asset custody and prime services.',
    },
  },
  {
    institution: 'BNY Mellon',
    initiativeSubstr: 'BNY Tokenized Deposits Launch',
    override: {
      default:
        'The world\'s largest custodian bringing tokenized deposits into production for collateral and margin workflows signals that on-chain deposit representations are graduating from innovation to core infrastructure — institutions without a compatible tokenized money approach face growing operational friction.',
      banks_fmis:
        'BNY\'s tokenized deposit infrastructure for collateral and margin sets a new connectivity baseline for post-trade workflows — your settlement, collateral, and custody processes need a response before network effects lock the standard in.',
      asset_managers:
        'Collateral and margin workflows moving to tokenized deposit rails at the world\'s largest custodian creates a near-term integration requirement for any asset manager active in those markets.',
    },
  },
  {
    institution: 'UBS',
    initiativeSubstr: 'UBS Tokenize – Full-Service Digital Asset Platform',
    override: {
      default:
        'UBS combining origination, distribution, and custody of tokenized bonds, funds, and structured products into one platform converts what peers have built as internal R&D into a production infrastructure offer — compressing the time-to-product for institutions waiting for the full stack to converge.',
      banks_fmis:
        'A tier-1 bank offering end-to-end tokenization as a service establishes the distribution and custody standard your clients will compare against — and accelerates the infrastructure decision your platform team needs to make.',
      asset_managers:
        'A live full-stack tokenization platform from a major bank shifts the question on your own product roadmap from "can we build this?" to "should we use or compete with this?" over the next 12-24 months.',
    },
  },
  {
    institution: 'UBS',
    initiativeSubstr: 'UBS uMINT',
    override: {
      default:
        'The first in-production end-to-end tokenized fund subscription and redemption using Chainlink\'s Digital Transfer Agent standard converts a workflow others have prototyped into a repeatable template — DTA becoming the reference architecture compresses implementation choices for every peer firm.',
      banks_fmis:
        'A live standard for tokenized fund transfers across blockchain networks removes the final "no interoperability standard" objection — your custody and fund administration roadmap now has a concrete integration target.',
      fintech:
        'Chainlink DTA establishing the in-production transfer standard for tokenized funds creates a connectivity layer that infrastructure providers can implement against — or be excluded from.',
    },
  },
  {
    institution: 'Standard Chartered',
    initiativeSubstr: 'Tokenized Deposit Solution in Hong Kong (HKD, CNH, USD)',
    override: {
      default:
        'A tier-1 global bank delivering live 24/7 tokenized deposits in HKD, CNH, and USD for institutional treasury under HKMA supervision locks in the APAC multi-currency tokenized deposit template — raising the baseline for cross-border settlement that banks in the region are expected to match.',
      banks_fmis:
        'Multi-currency tokenized deposits going live under HKMA\'s Project Ensemble creates the regulatory and technical reference for APAC on-chain money — banks in the region need a position on this model, not a watch brief.',
      policy_risk:
        'A live multi-currency tokenized deposit facility under HKMA\'s Project Ensemble sets the supervisory reference standard for on-chain money in APAC — other jurisdictions will benchmark against this when designing their own frameworks.',
    },
  },
  {
    institution: 'BNP Paribas',
    initiativeSubstr: 'BNP Paribas DLT-Based Digital Bond Tokenization Programme',
    override: {
      default:
        'BNP Paribas opening its DLT bond tokenization platform to external issuers and investors converts three years of internal R&D into a market infrastructure play — resetting distribution and settlement expectations for European fixed income over the next 12-24 months.',
      banks_fmis:
        'A major European bank offering tokenized bond issuance to external counterparties establishes the distribution and settlement standard your fixed income desk will be measured against.',
      asset_managers:
        'An institutional-grade tokenized bond platform open to external investors changes the execution and collateral options available for your fixed income allocations over the next 12-24 months.',
    },
  },
  {
    institution: 'Barclays',
    initiativeSubstr: 'Barclays Investment in Ubyx',
    override: {
      default:
        'A major UK clearing bank backing infrastructure to unify stablecoin and tokenized deposit redemption signals that fragmented digital money settlement is becoming a commercial problem — and that the clearing layer for institutional stablecoins is being built by the banks, not the fintechs.',
      banks_fmis:
        'Barclays anchoring stablecoin clearing through Ubyx positions it as the settlement intermediary for regulated digital money — a role that will determine who controls the operational interface between banks and stablecoin ecosystems.',
      fintech:
        'Ubyx\'s many-to-many clearing model attracting major bank backing raises the institutional connectivity bar for stablecoin rails — infrastructure that doesn\'t clear through a bank-connected network faces growing counterparty friction.',
    },
  },
  {
    institution: 'BlackRock',
    initiativeSubstr: 'BlackRock USD Institutional Digital Liquidity Fund (BUIDL)',
    override: {
      default:
        'BUIDL reaching institutional scale on public blockchain with a SEC-registered structure converts the tokenized fund concept from experimental to benchmark — setting the standard against which every subsequent tokenized money market product will be evaluated and every institutional allocation decision justified.',
      asset_managers:
        'BUIDL at scale gives every peer firm a fully evidenced precedent for a tokenized fund roadmap — the "we\'re watching" window has closed; the question is now sequencing your own launch.',
      banks_fmis:
        'BlackRock\'s tokenized fund at production scale creates a distribution and custody reference architecture that custodians and FMIs must connect to or risk being bypassed.',
    },
  },
  {
    institution: 'BlackRock',
    initiativeSubstr: '2026 Thematic Outlook: Crypto and Tokenization',
    override: {
      default:
        'BlackRock\'s CEO framing tokenization as "the next generation of financial markets" — not a product category — resets the credibility cost of institutional non-participation: firms without a public tokenization strategy now face a board-level legitimacy question, not just a product gap.',
      asset_managers:
        'The world\'s largest asset manager anchoring its thematic outlook on tokenization removes the cover for peer firms still deferring a public position — clients and boards will now ask directly.',
      policy_risk:
        'BlackRock framing tokenization as foundational market structure signals that the institutional capital formation case is closed — regulatory frameworks that haven\'t calibrated for tokenized asset scale are behind the curve.',
    },
  },
  {
    institution: 'Franklin Templeton',
    initiativeSubstr: 'Franklin OnChain U.S. Government Money Fund (FOBXX',
    override: {
      default:
        'FOBXX establishing that a US-registered mutual fund can use a public blockchain as its system of record — with SEC acceptance and five years of operational track record — converts regulatory uncertainty into a solved problem: the compliance path exists, and peer firms without a tokenized fund strategy are behind a verified benchmark.',
      asset_managers:
        'A US-registered tokenized money market fund with five years of live operation removes the "regulatory uncertainty" objection from your tokenized fund roadmap — the question is now execution sequencing, not permission.',
      policy_risk:
        'FOBXX\'s operational track record under SEC oversight provides the clearest US evidentiary basis for tokenized mutual fund regulation — regulators designing frameworks elsewhere have a fully audited reference case.',
    },
  },
  {
    institution: 'Franklin Templeton',
    initiativeSubstr: 'First Fully Tokenized UCITS Fund in Luxembourg',
    override: {
      default:
        'Franklin Templeton\'s fully tokenized UCITS in Luxembourg provides the European regulatory template for on-chain fund structures — removing the ambiguity that has stalled peer institutions and accelerating the timeline for any asset manager with a European distribution base.',
      asset_managers:
        'A live UCITS tokenized fund under Luxembourg regulation removes the European compliance ambiguity that has stalled peer roadmaps — the framework exists, and first-movers are already operating inside it.',
      policy_risk:
        'A live UCITS tokenized fund in Luxembourg establishes the regulatory reference architecture for European digital fund structures — national competent authorities will benchmark peer applications against this precedent.',
    },
  },
];

// --- execution ---
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const force = process.argv.includes('--force');
let updated = 0;
let skipped = 0;
let problems = [];

OVERRIDES.forEach(o => {
  const matches = data.filter(s =>
    s.institution === o.institution &&
    (s.initiative || '').includes(o.initiativeSubstr)
  );
  if (matches.length !== 1) {
    problems.push(`PROBLEM: ${o.institution} | "${o.initiativeSubstr}" -> ${matches.length} matches`);
    return;
  }
  const record = matches[0];
  if (record.why_this_matters_override && !force) {
    console.log(`SKIP (already has override): ${record.institution} | ${(record.initiative||'').slice(0,60)}`);
    skipped++;
    return;
  }
  record.why_this_matters_override = o.override;
  console.log(`UPDATED: ${record.institution} | ${(record.initiative||'').slice(0,60)}`);
  updated++;
});

if (problems.length) {
  console.error('\nPROBLEMS — not writing:');
  problems.forEach(p => console.error(p));
  process.exit(1);
}

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
console.log(`\nDone: ${updated} updated, ${skipped} skipped. Written to ${DATA_PATH}`);
