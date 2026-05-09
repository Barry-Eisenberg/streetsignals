WITH bridge_daily AS (
  SELECT
    DATE_TRUNC('day', deposit_block_time) AS day,
    withdrawal_chain,
    SUM(amount_usd) AS bridge_volume_usd
  FROM bridges_evms.flows
  WHERE deposit_block_time >= NOW() - INTERVAL '60' DAY
    AND amount_usd IS NOT NULL
  GROUP BY 1, 2
),
current_window AS (
  SELECT
    withdrawal_chain,
    SUM(bridge_volume_usd) AS current_volume_usd,
    COUNT(DISTINCT day) AS current_active_days
  FROM bridge_daily
  WHERE day >= DATE_TRUNC('day', NOW() - INTERVAL '30' DAY)
  GROUP BY 1
),
prior_window AS (
  SELECT
    withdrawal_chain,
    SUM(bridge_volume_usd) AS prior_volume_usd,
    COUNT(DISTINCT day) AS prior_active_days
  FROM bridge_daily
  WHERE day < DATE_TRUNC('day', NOW() - INTERVAL '30' DAY)
  GROUP BY 1
),
ranked AS (
  SELECT
    c.withdrawal_chain,
    c.current_volume_usd,
    c.current_active_days,
    p.prior_volume_usd,
    p.prior_active_days,
    ROW_NUMBER() OVER (ORDER BY c.current_volume_usd DESC) AS volume_rank
  FROM current_window c
  LEFT JOIN prior_window p
    ON c.withdrawal_chain = p.withdrawal_chain
)
SELECT
  withdrawal_chain AS chain,
  current_volume_usd AS bridge_volume_usd,
  CASE
    -- Require both a meaningful baseline and enough active daily observations to avoid
    -- runaway percentages from tiny/irregular prior windows.
    WHEN prior_volume_usd >= 10000000
      AND prior_active_days >= 7
      AND current_active_days >= 7
      AND current_volume_usd / NULLIF(prior_volume_usd, 0) BETWEEN 0.01 AND 100
      THEN (current_volume_usd - prior_volume_usd) / prior_volume_usd
    ELSE NULL
  END AS change_30d,
  CONCAT(
    'Bridge flow into ',
    withdrawal_chain,
    ' reached ',
    CAST(CAST(ROUND(current_volume_usd / 1000000000000.0, 2) AS DECIMAL(18,2)) AS VARCHAR),
    'T USD over the last 30 days.'
  ) AS summary
FROM ranked
WHERE volume_rank = 1
