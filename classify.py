import json, re

with open('/home/user/workspace/signals-from-the-street/data.json') as f:
    signals = json.load(f)

# ===== CLASSIFICATION RULES =====

# 1. INSTITUTION TYPE (already have category, but let's make it cleaner)
inst_type_map = {
    'global_banks': 'Global Banks',
    'asset_management': 'Asset & Investment Management',
    'payments': 'Payments Providers',
    'exchanges_intermediaries': 'Exchanges & Central Intermediaries',
    'regulators': 'Regulatory Agencies',
    'ecosystem': 'Infrastructure & Technology'
}

# 2. SIGNAL TYPE - classify by the nature of the announcement
def classify_signal_type(s):
    text = f"{s.get('initiative','')} {s.get('description','')}".lower()
    
    if any(w in text for w in ['launch', 'launched', 'live', 'went live', 'go-live', 'operational', 'production']):
        return 'Product Launch'
    if any(w in text for w in ['partnership', 'partner', 'collaborat', 'joint', 'alliance', 'consortium']):
        return 'Strategic Partnership'
    if any(w in text for w in ['regulat', 'rule', 'guidance', 'framework', 'legislation', 'act ', 'compliance', 'license', 'charter', 'no-action', 'interpretive letter', 'sandbox']):
        return 'Regulatory Action'
    if any(w in text for w in ['pilot', 'trial', 'experiment', 'proof of concept', 'poc', 'test']):
        return 'Pilot / Trial'
    if any(w in text for w in ['invest', 'funding', 'raise', 'acquisition', 'acquir', 'series', 'ipo', 'spac', 'valuation']):
        return 'Investment / M&A'
    if any(w in text for w in ['platform', 'infrastructure', 'network', 'system', 'solution', 'service', 'product']):
        return 'Platform / Infrastructure'
    if any(w in text for w in ['filing', 'filed', 'application', 'applied', 'proposal', 'proposed', 'plan', 'announced intent', 'exploring']):
        return 'Strategic Filing / Plan'
    if any(w in text for w in ['report', 'research', 'outlook', 'white paper', 'study', 'review']):
        return 'Research / Report'
    return 'Strategic Initiative'

# 3. FMI AREA - what part of financial market infrastructure
def classify_fmi_area(s):
    text = f"{s.get('initiative','')} {s.get('description','')}".lower()
    areas = []
    
    if any(w in text for w in ['settlement', 'clearing', 'post-trade', 'post trade', 'dvp', 'delivery versus', 't+0', 'atomic']):
        areas.append('Settlement & Clearing')
    if any(w in text for w in ['custody', 'custod', 'safekeep', 'digital vault']):
        areas.append('Custody & Safekeeping')
    if any(w in text for w in ['payment', 'cross-border', 'cross border', 'remittance', 'transfer', 'fx ', 'foreign exchange']):
        areas.append('Payments & Transfers')
    if any(w in text for w in ['token', 'tokeniz', 'digital bond', 'digital fund', 'digital share', 'digital secur', 'rwa', 'real world asset', 'real-world asset']):
        areas.append('Tokenization & Issuance')
    if any(w in text for w in ['collateral', 'repo', 'lending', 'margin', 'liquidity', 'hqla']):
        areas.append('Collateral & Lending')
    if any(w in text for w in ['trading', 'exchange', 'marketplace', 'listing', 'derivatives', 'futures', 'etf', 'etp']):
        areas.append('Trading & Exchange')
    if any(w in text for w in ['stablecoin', 'stable coin', 'cbdc', 'digital currency', 'deposit token', 'tokenized deposit', 'digital dollar', 'digital euro', 'pyusd', 'usdc', 'rlusd', 'eurcv']):
        areas.append('Digital Currency & Stablecoins')
    if any(w in text for w in ['regulat', 'compliance', 'kyc', 'aml', 'governance', 'framework', 'legislation', 'rule', 'guidance', 'license']):
        areas.append('Regulation & Compliance')
    if any(w in text for w in ['interoperab', 'bridge', 'cross-chain', 'crosschain', 'multi-chain', 'multichain', 'connect', 'integration', 'standard']):
        areas.append('Interoperability & Standards')
    if any(w in text for w in ['data', 'reporting', 'transparency', 'analytics', 'nav', 'record-keep', 'recordkeep']):
        areas.append('Data & Reporting')
    
    if not areas:
        areas.append('General Infrastructure')
    return areas

# 4. DIGITAL ASSET INITIATIVE TYPE
def classify_initiative_type(s):
    text = f"{s.get('initiative','')} {s.get('description','')}".lower()
    types = []
    
    if any(w in text for w in ['tokeniz', 'token', 'digital bond', 'digital fund', 'digital share', 'digital gilt', 'rwa', 'real world asset']):
        types.append('Tokenized Securities / RWA')
    if any(w in text for w in ['stablecoin', 'stable coin', 'pyusd', 'usdc', 'rlusd', 'eurcv', 'deposit token', 'tokenized deposit', 'digital dollar']):
        types.append('Stablecoins & Deposit Tokens')
    if any(w in text for w in ['cbdc', 'central bank digital', 'digital euro', 'digital pound', 'e-hkd', 'digital yen']):
        types.append('CBDC')
    if any(w in text for w in ['dlt', 'distributed ledger', 'blockchain', 'smart contract', 'on-chain', 'onchain', 'on chain']):
        types.append('DLT / Blockchain Infrastructure')
    if any(w in text for w in ['defi', 'decentralized finance', 'decentralised finance', 'amm', 'liquidity pool']):
        types.append('DeFi')
    if any(w in text for w in ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'digital asset custody', 'digital asset']):
        types.append('Crypto / Digital Assets')
    if any(w in text for w in ['nft', 'non-fungible']):
        types.append('NFT')
    if any(w in text for w in ['payment', 'cross-border payment', 'settlement', 'clearing']):
        types.append('Payment Infrastructure')
    
    if not types:
        types.append('Digital Asset Strategy')
    return types

# 5. TIMELINE - extract year
def get_year(s):
    date = s.get('date', '')
    if date:
        match = re.search(r'20\d{2}', str(date))
        if match:
            return match.group(0)
    return '2025'

# ===== CLASSIFY ALL SIGNALS =====
for s in signals:
    s['institution_type'] = inst_type_map.get(s.get('category', ''), 'Other')
    s['signal_type'] = classify_signal_type(s)
    s['fmi_areas'] = classify_fmi_area(s)
    s['initiative_types'] = classify_initiative_type(s)
    s['year'] = get_year(s)

# ===== AGGREGATE STATS =====
from collections import Counter

# By institution type
inst_counts = Counter(s['institution_type'] for s in signals)
print("=== BY INSTITUTION TYPE ===")
for k, v in inst_counts.most_common():
    print(f"  {k}: {v}")

# By signal type
signal_counts = Counter(s['signal_type'] for s in signals)
print("\n=== BY SIGNAL TYPE ===")
for k, v in signal_counts.most_common():
    print(f"  {k}: {v}")

# By FMI area (multi-label)
fmi_counts = Counter()
for s in signals:
    for a in s['fmi_areas']:
        fmi_counts[a] += 1
print("\n=== BY FMI AREA ===")
for k, v in fmi_counts.most_common():
    print(f"  {k}: {v}")

# By initiative type (multi-label)
init_counts = Counter()
for s in signals:
    for t in s['initiative_types']:
        init_counts[t] += 1
print("\n=== BY INITIATIVE TYPE ===")
for k, v in init_counts.most_common():
    print(f"  {k}: {v}")

# By year
year_counts = Counter(s['year'] for s in signals)
print("\n=== BY YEAR ===")
for k, v in sorted(year_counts.items()):
    print(f"  {k}: {v}")

# By year x institution type
print("\n=== TIMELINE BY INSTITUTION TYPE ===")
for year in sorted(set(s['year'] for s in signals)):
    year_signals = [s for s in signals if s['year'] == year]
    year_inst = Counter(s['institution_type'] for s in year_signals)
    print(f"  {year}: {dict(year_inst)}")

# Save enriched data
with open('/home/user/workspace/signals-from-the-street/data.json', 'w') as f:
    json.dump(signals, f, indent=2)

print("\nDone! Enriched data saved.")
