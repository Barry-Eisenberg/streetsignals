// add_auto_wtm_overrides.js — adds why_this_matters_override to high-priority Structural signals in auto_data.json
// Run: node scripts/add_auto_wtm_overrides.js
// Safe to re-run: already-overridden records are skipped unless --force is passed.
// These fields survive update_signals.py runs (reclassify, resummarize, and normal fetch all preserve unknown fields).

const fs = require('fs');
const path = require('path');

const AUTO_DATA_PATH = path.join(__dirname, '../data/auto_data.json');

const OVERRIDES = [
  {
    institution: 'BIS',
    initiativeSubstr: 'anatomy of stablecoin transactions',
    override: {
      default:
        'The BIS moving from position papers to empirical transaction-level analysis of stablecoin activity shifts the regulatory calibration basis from theory to evidence — the next round of reserve and supervision design will cite actual usage patterns, making this paper the input document for rules that will govern the sector for years.',
      policy_risk:
        'Transaction-level BIS evidence on stablecoin usage is the data regulators will cite when calibrating reserve requirements, AML obligations, and oversight perimeters — understanding where the analysis leads is now a regulatory affairs priority, not a research interest.',
      banks_fmis:
        'BIS empirical analysis of how stablecoins actually move — not how they are theoretically held — will directly inform supervisory expectations for banks with stablecoin exposure; knowing the usage patterns precedes knowing the compliance requirements.',
    },
  },
  {
    institution: 'Coinbase',
    initiativeSubstr: 'MassPay joins Coinbase to challenge',
    override: {
      default:
        'A major B2B cross-border payment network integrating USDC settlement across 180 countries converts stablecoins from a retail asset to embedded enterprise payments infrastructure — the question for banks and payment processors is no longer whether stablecoins are a payments alternative, but whether they can remain cost-competitive against a live network at this scale.',
      payments:
        'MassPay routing enterprise cross-border payments through Coinbase/USDC at 180-country reach sets a stablecoin benchmark that correspondent banking networks must now measure themselves against operationally, not just strategically.',
      fintech:
        'A major embedded payments platform choosing stablecoin rails over traditional correspondent banking for its enterprise network validates the B2B stablecoin payments thesis and raises the bar for any competing payment infrastructure provider.',
    },
  },
  {
    institution: 'Coinbase',
    initiativeSubstr: 'Coinbase launches AI agent accounts that can trade and spend',
    override: {
      default:
        'The first major exchange enabling AI agents to autonomously trade and spend without per-transaction human approval creates a new category of financial principal — one that existing custody, compliance, and authorization frameworks were not designed for — making this a live infrastructure question for any institution that will handle AI-adjacent flows.',
      banks_fmis:
        'AI agents operating as autonomous financial principals on a major exchange raises account ownership, KYC, and transaction authorization questions that bank compliance frameworks haven\'t resolved; institutions need a position before these flows arrive via counterparties.',
      fintech:
        'Coinbase for Agents creates a new distribution channel for financial services that bypasses traditional onboarding flows — infrastructure providers that make their APIs agent-accessible will be routed around those that don\'t.',
    },
  },
  {
    institution: 'Coinbase',
    initiativeSubstr: "x402 has processed over 100 million transactions on Base",
    override: {
      default:
        'x402 clearing 100 million machine-to-machine transactions on Base provides the first at-scale evidence that programmatic, agentic payment infrastructure is already live — not a prototype — reshaping what "payment infrastructure" means for any institution building toward an AI-native financial services model.',
      fintech:
        'x402\'s transaction volume on Base proves the agentic payments thesis with live data rather than pilots — the question is no longer whether machine-to-machine payments are viable but whether your platform supports the protocol that\'s already processing them at scale.',
      banks_fmis:
        '100 million machine-to-machine transactions on a public blockchain payment standard is the first evidence that agentic payment flows exist at scale outside the traditional correspondent network — your infrastructure roadmap needs to account for this channel.',
    },
  },
  {
    institution: 'SEC (U.S. Securities and Exchange Commission)',
    initiativeSubstr: 'US regulators clear path for blockchain innovation in TradFi',
    override: {
      default:
        'US regulators approving a blockchain-based clearing house and a BTC-linked futures contract is the most definitive signal yet that regulators are treating blockchain as market infrastructure, not an asset class — institutions waiting for regulatory clarity before building blockchain-based settlement or clearing capabilities no longer have that reason to wait.',
      banks_fmis:
        'A regulated blockchain clearing house approved by the SEC removes the final regulatory barrier for DLT-based post-trade infrastructure in the US — your settlement and clearing technology roadmap now faces a competition timeline, not a permission question.',
      policy_risk:
        'The SEC\'s approval of blockchain-based clearing resets the evidentiary basis for peer regulatory debates globally — regulators in other jurisdictions who have been waiting for US precedent now have it.',
    },
  },
  {
    institution: 'BIS (Bank for International Settlements)',
    initiativeSubstr: 'Rigid stablecoin reserve rules can increase default risk',
    override: {
      default:
        'The BIS finding that overly rigid stablecoin reserve requirements can increase default risk creates a direct counter-argument to the strict liquidity thresholds in GENIUS Act implementation and MiCAR — this paper will shape the calibration debates that determine how expensive regulated stablecoin operations become, and therefore who can compete in the space.',
      policy_risk:
        'A BIS research finding that undermines the empirical case for strict stablecoin reserve rules enters the legislative record at a pivotal moment — it will be cited in GENIUS Act implementation proceedings and by regulators reconsidering MiCAR calibration, potentially softening the compliance cost curve.',
      payments:
        'If BIS reserve research moderates the strictest compliance thresholds, the capital and liquidity costs of operating a regulated stablecoin change materially — your reserve strategy and capital planning should model for this regulatory flexibility scenario.',
    },
  },
  {
    institution: 'Coinbase',
    initiativeSubstr: 'Coinbase makes a quiet bet on ProShares stablecoin',
    override: {
      default:
        'Coinbase investing in the reserve instruments that GENIUS Act legislation will require stablecoin issuers to hold is a vertical integration move that positions it as issuer, exchange, and reserve instrument holder simultaneously — a structure that creates a compliance cost advantage over pure-play stablecoin issuers and signals that the regulated stablecoin business model is being built ahead of the final law.',
      fintech:
        'An exchange investing in its own stablecoin reserve instruments before legislation passes is a compliance cost optimization that creates a structural advantage over issuers who hold reserves at arm\'s length — the economic model of regulated stablecoins is being shaped now, not after the law is finalized.',
      policy_risk:
        'Coinbase acquiring reserve instruments ahead of GENIUS Act finalization signals that large issuers are designing for a post-legislation operating model — firms that haven\'t modeled the reserve cost structure risk being surprised by the capital requirements when the rules land.',
    },
  },
  {
    institution: 'BVNK',
    initiativeSubstr: 'Transfermate moves on stablecoins',
    override: {
      default:
        'TransferMate choosing stablecoin infrastructure over correspondent banking rails for its B2B enterprise payment network signals that the enterprise cross-border payments market is making an infrastructure replacement decision, not a product addition — institutions dependent on correspondent banking revenue from enterprise corridors are now competing against a live stablecoin-native alternative.',
      banks_fmis:
        'An embedded B2B payments platform replacing correspondent banking with stablecoin settlement in its core enterprise network is a direct revenue challenge for banks earning on those flows — the question is whether you have a stablecoin settlement offer competitive with what BVNK provides to enterprise payers.',
      payments:
        'TransferMate\'s stablecoin infrastructure choice via BVNK creates a live reference architecture for stablecoin-native enterprise B2B payments — the competitive question for payment processors is how quickly they can match or build on this model.',
    },
  },
  {
    institution: 'Federal Reserve',
    initiativeSubstr: "Waller makes the case for stablecoins in EU",
    override: {
      default:
        'A Federal Reserve Governor publicly arguing for stablecoins over tokenized deposits at an international central banking forum signals that the US monetary policy establishment has moved from cautious observation to active advocacy — creating a US-EU regulatory divergence on digital money design that will directly shape which products global institutions prioritize in their digital currency roadmaps.',
      policy_risk:
        'Fed Governor Waller\'s public case for stablecoins at an international forum creates a documented US-EU regulatory divergence on digital money — this divergence will shape compliance and product requirements for any institution operating across both regulatory regimes, and is the clearest signal yet of where US legislative support will land.',
      banks_fmis:
        'A Fed Governor publicly preferring stablecoins to tokenized deposits in international forums makes the US regulatory posture on digital money clearer than it has been — banks and FMIs designing their tokenized money strategy should treat this as the strongest available signal about the US legislative environment.',
    },
  },
];

// --- execution ---
const data = JSON.parse(fs.readFileSync(AUTO_DATA_PATH, 'utf8'));
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
    console.log(`SKIP (already has override): ${record.institution} | ${(record.initiative || '').slice(0, 70)}`);
    skipped++;
    return;
  }
  record.why_this_matters_override = o.override;
  console.log(`UPDATED: ${record.institution} | ${(record.initiative || '').slice(0, 70)}`);
  updated++;
});

if (problems.length) {
  console.error('\nPROBLEMS — not writing:');
  problems.forEach(p => console.error(p));
  process.exit(1);
}

fs.writeFileSync(AUTO_DATA_PATH, JSON.stringify(data, null, 2));
console.log(`\nDone: ${updated} updated, ${skipped} skipped. Written to ${AUTO_DATA_PATH}`);
