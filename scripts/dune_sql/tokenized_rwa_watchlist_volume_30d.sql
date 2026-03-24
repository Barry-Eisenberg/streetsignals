WITH rwa_watchlist AS (
  SELECT * FROM (
    VALUES
      ('ethereum', 0x1B19C19393e2d034D8Ff31ff34c81252FcBbee92, 'Ondo OUSG'),
      ('ethereum', 0x54043c656F0FAd0652D9Ae2603cDF347c5578d00, 'Ondo rOUSG'),
      ('polygon', 0xbA11C5effA33c4D6F8f593CFA394241CfE925811, 'Ondo OUSG'),
      ('ethereum', 0x96F6eF951840721AdBF46Ac996b59E0235CB985C, 'Ondo USDY'),
      ('ethereum', 0xaf37c1167910ebC994e266949387d2c7C326b879, 'Ondo rUSDY'),
      ('mantle', 0x5bE26527e817998A7206475496fDE1E68957c5A6, 'Ondo USDY'),
      ('mantle', 0xab575258d37EaA5C8956EfABe71F4eE8F6397cF3, 'Ondo mUSD'),
      ('arbitrum', 0x35e050d3C0eC2d29D269a8EcEa763a183bDF9A9D, 'Ondo USDY'),
      ('plume', 0xD2B65e851Be3d80D3c2ce795eB2E78f16cB088b2, 'Ondo USDY'),
      ('sei', 0x54cD901491AeF397084453F4372B93c33260e2A6, 'Ondo USDY')
  ) AS t(blockchain, contract_address, label)
),
configured_watchlist AS (
  SELECT *
  FROM rwa_watchlist
  WHERE label NOT LIKE 'REPLACE_WITH_%'
),
watchlist_flows AS (
  SELECT
    DATE_TRUNC('day', t.block_time) AS day,
    SUM(t.amount_usd) AS daily_volume_usd
  FROM tokens.transfers t
  INNER JOIN configured_watchlist w
    ON t.blockchain = w.blockchain
   AND t.contract_address = w.contract_address
  WHERE t.block_time >= NOW() - INTERVAL '60' DAY
    AND t.amount_usd IS NOT NULL
  GROUP BY 1
),
windowed AS (
  SELECT
    SUM(CASE WHEN day >= DATE_TRUNC('day', NOW() - INTERVAL '30' DAY) THEN daily_volume_usd ELSE 0 END) AS current_volume_usd,
    SUM(CASE WHEN day < DATE_TRUNC('day', NOW() - INTERVAL '30' DAY) THEN daily_volume_usd ELSE 0 END) AS prior_volume_usd
  FROM watchlist_flows
)
SELECT
  COALESCE(current_volume_usd, 0) AS watchlist_volume_usd_30d,
  CASE
    WHEN prior_volume_usd > 0 THEN (current_volume_usd - prior_volume_usd) / prior_volume_usd
    ELSE NULL
  END AS change_30d,
  CASE
    WHEN EXISTS (SELECT 1 FROM configured_watchlist) THEN CONCAT(
      'Tracked Ondo-issued tokenized RWA watchlist volume reached ',
      CAST(CAST(ROUND(COALESCE(current_volume_usd, 0) / 1000000.0, 2) AS DECIMAL(18,2)) AS VARCHAR),
      'M USD over the last 30 days across OUSG, USDY, and related Ondo-issued assets.'
    )
    ELSE 'Tokenized RWA watchlist is not configured yet. Add the EVM token addresses you want tracked in scripts/dune_sql/tokenized_rwa_watchlist_volume_30d.sql.'
  END AS summary
FROM windowed
