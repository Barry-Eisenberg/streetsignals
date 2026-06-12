# Dynamic Editorial "Why This Matters" — Implementation Guide

How to upgrade the generic auto-generated "Why this matters" copy on
signal detail pages with a smarter, content-aware editorial layer.

## Problem

The current implementation (`js/data.js` → `whyThisMatters()`) returns a
single templated sentence with three slot fills (initiative types, FMI
areas, time horizon). The result reads as canned filler — especially on
Structural-tier signals where the substance of the story rarely fits the
template shape. Example from `/signals/1k0kzd`:

> "For institutions tracking Crypto / Digital Assets, this is a
> structural signal that resets execution assumptions for Regulation &
> Compliance over the next 12–24 months."

vs. what the signal actually warrants:

> "Tier-1 custodian balance sheets are now carrying explicit digital-
> asset exposure — normalizing crypto-linked equities inside traditional
> treasury books over the next 12–24 months."

## Solution: two-layer editorial system

1. **A bank of templates** selected by `(signal_type × institution_type
   × tier × persona)`, with slot-fills drawn from real signal fields.
   Replaces the one-template-fits-all approach. Zero runtime cost.

2. **An optional `why_this_matters_override` field** on each signal that
   wins over the generated copy when present. Lets you hand-author the
   line for any Structural-tier signal worth the effort, while
   everything else falls back to the template bank.

Both layers respect the active persona lens.

---

## Code changes

### 1. New module: `js/why-this-matters.js`

```js
// =====================================================================
// why-this-matters.js — editorial generation of the "Why this matters"
// signal line. Two-layer system:
//   1) If the signal has a `why_this_matters_override` (or a persona-
//      specific override), use it verbatim.
//   2) Otherwise, pick the most specific template matching the
//      signal's shape and fill its slots from the signal's real fields.
// =====================================================================

// ---------- TEMPLATE BANK ----------
// Templates are matched in order. The first whose `match` predicate
// returns true wins. Each template can override per persona via the
// `personas` map; otherwise the `default` text is used.
//
// Slot syntax: {institutionType}, {institution}, {fmi1}, {fmi2},
//              {initiative1}, {initiative2}, {tier}, {horizon},
//              {country}, {signalType}.
// Slots silently degrade when the field is missing (rendered as empty;
// surrounding punctuation collapses).
//
// Authoring guidance:
//   - Lead with the *implication*, not the institution. The reader
//     already knows the institution from the headline.
//   - Use verbs that describe a market-structure change ("normalizes",
//     "resets", "shifts", "locks in", "fragments", "consolidates").
//   - Avoid "tracking X" / "watching X" — the reader is past that.
//   - Time horizon belongs in the template, not as a separate clause.

const WTM_TEMPLATES = [

  // ---- M&A / INVESTMENT by tier-1 custodians or banks ----
  {
    id: 'tier1_bank_crypto_investment',
    match: (s) =>
      s.signal_type === 'Investment / M&A'
      && (s.institution_type === 'Global Banks'
          || s.institution_type === 'Financial Infrastructure Operators')
      && ((s.initiative_types || []).includes('Crypto / Digital Assets')
          || /bitcoin|crypto|digital asset/i.test(s.initiative + ' ' + s.description)),
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

  // ---- REGULATORY ACTION by a major central bank or regulator ----
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

  // ---- PLATFORM / INFRASTRUCTURE launches by FMIs or exchanges ----
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

  // ---- STRATEGIC INITIATIVE / FILING by tokenization-focused players ----
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

  // ---- PRODUCT LAUNCH by global asset managers ----
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

  // ---- STRATEGIC PARTNERSHIP signals ----
  {
    id: 'strategic_partnership',
    match: (s) => s.signal_type === 'Strategic Partnership',
    default:
      "Cross-firm capability stacking — {institution} and its partner "
      + "compress the time-to-production for {initiative1} over the "
      + "next {horizon}.",
  },

  // ---- PILOT / TRIAL signals ----
  {
    id: 'pilot_trial',
    match: (s) => s.signal_type === 'Pilot / Trial',
    default:
      "An operational test of {initiative1} in production conditions — "
      + "shortens the learning curve for {fmi1} adoption over {horizon}.",
  },

  // ---- RESEARCH / REPORT signals from tier-1 sources ----
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

  // ---------------------------------------------------------------
  // ---- FALLBACK: improved version of the original generic line ----
  // ---------------------------------------------------------------
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

// ---------- SLOT FILL ----------
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
    tierLower:       (signal._tier || 'context').toLowerCase(),
    horizon:         horizons[signal._tier] || 'next 12 months',
    country:         signal.country || '',
    signalType:      signal.signal_type || '',
  };
}

function fillTemplate(template, slots) {
  // Replace {slot} tokens
  let out = template.replace(/\{(\w+)\}/g, (_m, key) =>
    slots[key] != null ? slots[key] : '');
  // Collapse double-spaces and stray punctuation from missing slots:
  //   "for {fmi1} and " → "for {fmi1}" when fmi2 empty
  out = out
    .replace(/\s+and\s*\.\s*/g, '.')      // "and ." → "."
    .replace(/\s+and\s*,\s*/g, ',')       // "and ," → ","
    .replace(/\s+,/g, ',')                // " ," → ","
    .replace(/,\s*\./g, '.')              // ", ." → "."
    .replace(/\s{2,}/g, ' ')              // collapse spaces
    .trim();
  return out;
}

// ---------- PUBLIC API ----------
function whyThisMattersV2(signal, persona = 'all') {

  // 1) Manual editorial override wins
  if (signal.why_this_matters_override) {
    const o = signal.why_this_matters_override;
    if (typeof o === 'string') return o;
    if (typeof o === 'object') {
      if (persona !== 'all' && o[persona]) return o[persona];
      if (o.default) return o.default;
      if (o.all)     return o.all;
    }
  }

  // 2) Find the most specific template that matches this signal
  const template = WTM_TEMPLATES.find((t) => t.match(signal))
                || WTM_TEMPLATES[WTM_TEMPLATES.length - 1]; // _fallback

  const slots = buildSlots(signal);

  // Persona-specific template text wins over default
  const text = (persona !== 'all' && template.personas?.[persona])
            || template.default;

  return fillTemplate(text, slots);
}

// Expose for app.js + share-card generator
window.SftSEditorial = {
  whyThisMatters: whyThisMattersV2,
  _templates: WTM_TEMPLATES,      // exposed for diagnostics, not for direct use
};
```

### 2. Wire it in: `js/data.js` (one-line change)

Replace the existing `whyThisMatters` function in `js/data.js` with a
thin wrapper that delegates to the new module. This preserves the
public API everywhere else in the app:

```js
// js/data.js — replace the existing whyThisMatters function with:

function whyThisMatters(signal, persona = 'all') {
  // Delegate to the editorial module if loaded; otherwise fall back to
  // the legacy template (preserves existing behavior if the new module
  // hasn't loaded yet for any reason).
  if (window.SftSEditorial?.whyThisMatters) {
    return window.SftSEditorial.whyThisMatters(signal, persona);
  }
  // ---- legacy fallback ----
  const inst = signal.institution || 'This institution';
  const types = (signal.initiative_types || []).slice(0, 2).join(', ')
              || 'digital asset strategy';
  const fmis  = (signal.fmi_areas || []).slice(0, 2).join(' and ')
              || 'institutional infrastructure';
  return `For institutions tracking ${types}, this is a `
       + `${(signal._tier || 'context').toLowerCase()} signal that resets `
       + `execution assumptions for ${fmis} in the current market cycle.`;
}
```

### 3. Load the module: `index.html`

Add the new script tag **before** `data.js` so the editorial module is
available when `whyThisMatters` is called:

```html
<!-- Scripts: load order matters -->
<script src="./js/state.js?v=5"></script>
<script src="./js/why-this-matters.js?v=5"></script>   <!-- ADD THIS -->
<script src="./js/data.js?v=5"></script>
<script src="./js/playbooks.js?v=5"></script>
... etc. (bump all v=4 to v=5 for cache busting)
```

### 4. Optional override field in data

For Structural signals you want to hand-tune, add this field to
`auto_data.json` or `data.json`:

```json
{
  "institution": "BNY Mellon",
  "initiative": "BNY Mellon lifts Strategy stake to 1 million shares...",
  "...": "...",
  "why_this_matters_override": "Tier-1 custodian balance sheets are now carrying explicit digital-asset exposure — normalizing crypto-linked equities inside traditional treasury books over the next 12–24 months."
}
```

Persona-specific overrides:

```json
"why_this_matters_override": {
  "default": "Tier-1 custodian balance sheets are now carrying...",
  "banks_fmis": "Your peers are putting bank balance sheet behind crypto proxies — the question moves from 'whether' to 'how much'.",
  "policy_risk": "Bank-balance-sheet ownership of crypto-linked equities raises fresh capital, custody, and disclosure questions for supervisors."
}
```

### 5. Update `update_signals.py` (optional, for the editorial queue)

Add a post-processing step that flags Structural-tier signals without
an override for editorial review:

```python
# In scripts/update_signals.py, after enrichment:

EDITORIAL_QUEUE_PATH = "data/editorial_queue.json"

def flag_for_review(signals):
    """Identify Structural-tier signals lacking a hand-tuned override."""
    needs_review = []
    for s in signals:
        if s.get("_tier") != "Structural":
            continue
        if s.get("why_this_matters_override"):
            continue
        needs_review.append({
            "id": s["_id"],
            "institution": s.get("institution"),
            "initiative": s.get("initiative"),
            "date": s.get("date"),
            "score": s.get("_score"),
            "current_generated": render_template_preview(s),  # optional
        })
    with open(EDITORIAL_QUEUE_PATH, "w") as f:
        json.dump(needs_review, f, indent=2)
    print(f"Editorial queue: {len(needs_review)} Structural signals "
          f"awaiting a 'why_this_matters_override'.")
```

You can then review the queue manually (or via a small admin page) and
write overrides back into the source data. The hourly cron preserves
overrides across refreshes.

---

## Template authoring guide

When you add new templates, follow these rules:

1. **More-specific templates go first** in the `WTM_TEMPLATES` array.
   The first matching template wins.
2. **Match on stable fields only** — `signal_type`,
   `institution_type`, `initiative_types`. Avoid string-matching the
   description because it changes between data refreshes.
3. **Always provide a `default`** even when defining persona variants.
4. **Slots that may be empty** (`fmi2`, `initiative2`, `country`)
   should be placed at the end of clauses, not the middle, so the
   slot-collapse regex can clean up gracefully.
5. **Keep templates to 1–2 sentences.** The WHY-THIS-MATTERS box is a
   summary, not the full analysis.

---

## Rollout plan

1. **Ship the templates** (steps 1–3). Every existing signal gets a
   more specific WHY line on next page load. Zero data changes.
2. **Add a `why_this_matters_override` field** to 5–10 Structural
   signals as a test (steps 4). Verify the override path renders.
3. **Wire the editorial queue** in `update_signals.py` (step 5). Use
   it to write 1–2 hand-tuned overrides per week.
4. **(Optional) v2 — LLM-generated drafts.** When the editorial voice
   is well-established in the templates, switch to an LLM that drafts
   the override line for every Structural signal (against a SftS
   voice prompt that references this guide). You review and approve;
   the system stores the approved text in the same
   `why_this_matters_override` field.

## Where this lives in the share card

The share-card generator already consumes `whyThisMatters(signal,
persona)`. No changes needed there — once the new template bank is
shipped, the share card automatically picks up the improved copy too.
