// =====================================================================
// why-this-matters.js — editorial generation of the "Why this matters"
// signal line.
// =====================================================================

const WTM_TEMPLATES = [

  {
    id: 'tier1_bank_crypto_investment',
    match: (s) =>
      s.signal_type === 'Investment / M&A'
      && (s.institution_type === 'Global Banks'
          || s.institution_type === 'Financial Infrastructure Operators')
      && ((s.initiative_types || []).includes('Crypto / Digital Assets')
          || /bitcoin|crypto|digital asset/i.test((s.initiative || '') + ' ' + (s.description || ''))),
    default:
      "Tier-1 custodian balance sheets are now carrying explicit "
      + "digital-asset exposure — normalizing crypto-linked positions "
      + "inside traditional treasury books over the next {horizon}.",
    personas: {
      banks_fmis:
        "{institution}'s position validates that explicit digital-asset "
        + "exposure can be held inside a conservative bank balance sheet — "
        + "moving the question from 'whether' to 'how much' for peer "
        + "institutions over the next {horizon}.",
      asset_managers:
        "A bellwether custodian putting balance sheet behind digital-asset "
        + "proxies changes what's defensible in your own portfolio "
        + "construction over the next {horizon}.",
      policy_risk:
        "Bank-balance-sheet ownership of crypto-linked equities raises "
        + "fresh capital, custody, and disclosure questions for "
        + "supervisors over the next {horizon}.",
    },
  },

  {
    id: 'tier1_regulator_stablecoin_action',
    match: (s) =>
      (s.signal_type === 'Regulatory Action'
       || s.signal_type === 'Regulatory / Compliance Framework')
      && (s.institution_type === 'Regulatory Agencies'
          || s.institution_type === 'Central Banks & Regulators')
      && (s.initiative_types || []).some(
          (i) => /stablecoin|deposit token|digital currency/i.test(i)),
    default:
      "A jurisdictional split in stablecoin oversight is hardening — "
      + "resetting execution assumptions for {fmi1} and {fmi2} over the "
      + "next {horizon}.",
    personas: {
      banks_fmis:
        "{institution}'s position narrows the operating perimeter for "
        + "stablecoin handling — directly affecting your {fmi1} and {fmi2} "
        + "control standards over the next {horizon}.",
      policy_risk:
        "A regulatory divergence signal that crystallizes the cross-"
        + "jurisdictional framework conflict around stablecoins — likely "
        + "to set the supervisory baseline for {horizon}.",
      asset_managers:
        "Stablecoin distribution and redemption mechanics may differ "
        + "materially by jurisdiction — a material constraint on cash-leg "
        + "design over the next {horizon}.",
      fintech:
        "Compliance surface for stablecoin product design is fragmenting — "
        + "expect to architect for multi-regime support over {horizon}.",
    },
  },

  {
    id: 'fmi_platform_launch',
    match: (s) =>
      (s.signal_type === 'Platform / Infrastructure'
       || s.signal_type === 'Infrastructure Upgrade')
      && (s.institution_type === 'Exchanges & Central Intermediaries'
          || s.institution_type === 'Financial Infrastructure Operators'),
    default:
      "A core piece of market plumbing moved from pilot toward "
      + "production — locking in standards that competing platforms "
      + "will need to interoperate with for {horizon}.",
    personas: {
      banks_fmis:
        "Standards exposure is now real: {institution}'s platform sets "
        + "the integration target for peer FMIs across {fmi1} for {horizon}.",
      fintech:
        "A new institutional integration surface — early connectors gain "
        + "a {horizon} distribution advantage.",
    },
  },

  {
    id: 'tokenization_strategic_filing',
    match: (s) =>
      (s.signal_type === 'Strategic Initiative'
       || s.signal_type === 'Strategic Filing / Plan')
      && (s.initiative_types || []).some(
          (i) => /tokeniz|rwa|deposit token/i.test(i)),
    default:
      "Institutional tokenization is graduating from pilot to operating "
      + "model — execution assumptions for {fmi1} reset over {horizon}.",
    personas: {
      asset_managers:
        "A peer is committing to tokenization as product, not experiment — "
        + "the window for a quiet pilot is narrowing over {horizon}.",
      banks_fmis:
        "Tokenized units are migrating into core custody and collateral "
        + "systems — your integration backlog gets {horizon} to catch up.",
    },
  },

  {
    id: 'asset_manager_product_launch',
    match: (s) =>
      s.signal_type === 'Product Launch'
      && s.institution_type === 'Asset & Investment Management',
    default:
      "{institution} extending its product line into {initiative1} "
      + "sets a distribution benchmark peer firms will need to answer "
      + "within {horizon}.",
    personas: {
      asset_managers:
        "A direct competitive signal — the bar for product breadth in "
        + "{initiative1} just moved over the next {horizon}.",
      fintech:
        "A live channel for tokenized / digital-asset product distribution "
        + "opens up — partner-economics for adjacent infra firms over {horizon}.",
    },
  },

  {
    id: 'strategic_partnership',
    match: (s) => s.signal_type === 'Strategic Partnership',
    default:
      "Cross-firm capability stacking — {institution} and its partner "
      + "compress the time-to-production for {initiative1} over the "
      + "next {horizon}.",
  },

  {
    id: 'pilot_trial',
    match: (s) => s.signal_type === 'Pilot / Trial',
    default:
      "An operational test of {initiative1} in production conditions — "
      + "shortens the learning curve for {fmi1} adoption over {horizon}.",
  },

  {
    id: 'research_report',
    match: (s) =>
      s.signal_type === 'Research / Report'
      && (s.institution_type === 'Regulatory Agencies'
          || s.institution_type === 'Central Banks & Regulators'),
    default:
      "A supervisory thesis on {initiative1} that frames how regulators "
      + "and counterparties will assess your design choices over {horizon}.",
  },

  // ---- FALLBACK ----
  {
    id: '_fallback',
    match: () => true,
    default:
      "A {tierLower} signal that shifts execution assumptions for "
      + "{fmi1} and {fmi2} over the next {horizon}.",
    personas: {
      banks_fmis:
        "Your {fmi1} and {fmi2} operating model gets new constraints "
        + "from this {tierLower} signal over the next {horizon}.",
      asset_managers:
        "A {tierLower} signal that reshapes what's feasible for "
        + "{initiative1} in your portfolio over the next {horizon}.",
      fintech:
        "Institutional demand for {initiative1} is being shaped here — "
        + "a {tierLower} input to your roadmap over {horizon}.",
      policy_risk:
        "A {tierLower} supervisory and control-perimeter signal that "
        + "sets expectations for {initiative1} over {horizon}.",
    },
  },
];

function buildSlots(signal) {
  const horizons = {
    Structural: '12–24 months',
    Material:   '6–18 months',
    Context:    'current market cycle',
    Noise:      'this quarter',
  };
  const initiatives = signal.initiative_types || [];
  const fmis = signal.fmi_areas || [];
  return {
    institution:     signal.institution || '',
    institutionType: signal.institution_type || '',
    initiative1:     initiatives[0] || 'digital asset strategy',
    initiative2:     initiatives[1] || '',
    fmi1:            fmis[0] || 'institutional infrastructure',
    fmi2:            fmis[1] || '',
    tier:            signal._tier || 'Context',
    tierLower:       (signal._tier || 'Context').toLowerCase(),
    horizon:         horizons[signal._tier] || '12 months',
    country:         signal.country || '',
    signalType:      signal.signal_type || '',
  };
}

function fillTemplate(template, slots) {
  let out = template.replace(/\{(\w+)\}/g, (_m, key) =>
    slots[key] != null ? slots[key] : '');
  out = out
    .replace(/\s+and\s*\.\s*/g, '.')
    .replace(/\s+and\s*,\s*/g, ',')
    .replace(/\s+,/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return out;
}

function whyThisMattersV2(signal, persona = 'all') {
  // 1) Manual override wins
  if (signal.why_this_matters_override) {
    const o = signal.why_this_matters_override;
    if (typeof o === 'string') return o;
    if (typeof o === 'object') {
      if (persona !== 'all' && o[persona]) return o[persona];
      if (o.default) return o.default;
      if (o.all)     return o.all;
    }
  }
  // 2) Template match
  const template = WTM_TEMPLATES.find((t) => t.match(signal))
                || WTM_TEMPLATES[WTM_TEMPLATES.length - 1];
  const slots = buildSlots(signal);
  const text = (persona !== 'all' && template.personas?.[persona])
            || template.default;
  return fillTemplate(text, slots);
}

if (typeof window !== 'undefined') {
  window.SftSEditorial = {
    whyThisMatters: whyThisMattersV2,
    _templates: WTM_TEMPLATES,
  };
}
if (typeof module !== 'undefined') {
  module.exports = { whyThisMatters: whyThisMattersV2, WTM_TEMPLATES };
}
