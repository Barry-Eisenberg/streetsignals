WITH stablecoin_flows AS (
  SELECT
    DATE_TRUNC('day', block_time) AS day,
    SUM(amount_usd) AS daily_volume_usd,
    SUM(CASE WHEN amount_usd >= 100000 THEN amount_usd ELSE 0 END) AS daily_large_transfer_volume_usd
  FROM tokens.transfers
  WHERE block_time >= NOW() - INTERVAL '60' DAY
    AND amount_usd IS NOT NULL
    AND symbol IN ('USDC', 'USDT', 'USDS', 'DAI', 'PYUSD', 'FDUSD', 'USDE')
  GROUP BY 1
),
windowed AS (
  SELECT
    SUM(CASE WHEN day >= DATE_TRUNC('day', NOW() - INTERVAL '30' DAY) THEN daily_volume_usd ELSE 0 END) AS current_volume_usd,
    SUM(CASE WHEN day >= DATE_TRUNC('day', NOW() - INTERVAL '30' DAY) THEN daily_large_transfer_volume_usd ELSE 0 END) AS current_large_volume_usd,
    SUM(CASE WHEN day < DATE_TRUNC('day', NOW() - INTERVAL '30' DAY) THEN daily_volume_usd ELSE 0 END) AS prior_volume_usd
  FROM stablecoin_flows
)
SELECT
  current_volume_usd AS transfer_volume_usd,
  current_large_volume_usd,
  CASE
    WHEN current_volume_usd > 0 THEN current_large_volume_usd / current_volume_usd
    ELSE NULL
  END AS large_transfer_share,
  CASE
    WHEN prior_volume_usd > 0 THEN (current_volume_usd - prior_volume_usd) / prior_volume_usd
    ELSE NULL
  END AS change_30d,
  CONCAT(
    'Stablecoin transfer volume across tracked majors reached ',
    CAST(CAST(ROUND(current_volume_usd / 1000000000000.0, 2) AS DECIMAL(18,2)) AS VARCHAR),
    'T USD over the last 30 days; large transfers accounted for ',
    CAST(CAST(ROUND(
      CASE WHEN current_volume_usd > 0 THEN (current_large_volume_usd / current_volume_usd) * 100 ELSE 0 END,
      1
    ) AS DECIMAL(10,1)) AS VARCHAR),
    '% of that flow.'
  ) AS summary
FROM windowed
