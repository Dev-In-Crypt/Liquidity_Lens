import { TradeRecord, WalletScore } from '../types'

function stddev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  return Math.sqrt(variance)
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function classifyWallet(trades: TradeRecord[]): WalletScore {
  // Edge case: too few trades
  if (trades.length < 5) {
    return {
      address: '',
      label: 'unknown',
      score: 50,
      winRate: 0,
      avgHoldTimeMs: 0,
      avgPositionSizeUsd: 0,
      tradeCount: trades.length,
      lastUpdated: Date.now(),
    }
  }

  // Only consider close trades for win rate
  const closeTrades = trades.filter((t) => t.pnl !== 0)
  const winningTrades = closeTrades.filter((t) => t.pnl > 0)
  const winRate = closeTrades.length > 0 ? winningTrades.length / closeTrades.length : 0

  const avgHoldTimeMs = mean(trades.map((t) => t.holdTimeMs))
  const avgPositionSizeUsd = mean(trades.map((t) => t.size * t.entryPrice))

  // --- Sub-scores (each 0–100) ---

  // Win rate score (40%)
  const winRateScore = winRate * 100

  // Hold time score (20%) — cap at 48h
  // TODO: improve holdTimeMs when API provides open timestamps
  const holdTimeScore = Math.min(avgHoldTimeMs / (48 * 3600 * 1000), 1) * 100

  // Size consistency score (20%)
  const sizes = trades.map((t) => t.size * t.entryPrice)
  const sizeMean = mean(sizes)
  const sizeStddev = stddev(sizes)
  let sizeConsistencyScore: number
  if (sizeMean === 0) {
    sizeConsistencyScore = 0
  } else if (sizeStddev === 0) {
    // All trades same size → perfect consistency
    sizeConsistencyScore = 100
  } else {
    sizeConsistencyScore = Math.max(0, 100 - (sizeStddev / sizeMean) * 100)
  }

  // Trade frequency score (20%) — peak at 15 trades/month
  const firstTs = Math.min(...trades.map((t) => t.timestamp))
  const lastTs = Math.max(...trades.map((t) => t.timestamp))
  const monthsSpan = Math.max((lastTs - firstTs) / (30 * 24 * 3600 * 1000), 1)
  const tradesPerMonth = trades.length / monthsSpan
  // Linear ramp 0→15 (0–100), then linear decay 15→30 (100–0), below 0 or above 30 → 0
  let frequencyScore: number
  if (tradesPerMonth <= 0) {
    frequencyScore = 0
  } else if (tradesPerMonth <= 15) {
    frequencyScore = (tradesPerMonth / 15) * 100
  } else if (tradesPerMonth <= 30) {
    frequencyScore = ((30 - tradesPerMonth) / 15) * 100
  } else {
    frequencyScore = 0
  }

  const totalScore =
    winRateScore * 0.4 +
    holdTimeScore * 0.2 +
    sizeConsistencyScore * 0.2 +
    frequencyScore * 0.2

  const label =
    totalScore >= 65 ? 'smart_money' : totalScore >= 35 ? 'unknown' : 'retail'

  return {
    address: '',
    label,
    score: Math.round(totalScore),
    winRate,
    avgHoldTimeMs,
    avgPositionSizeUsd,
    tradeCount: trades.length,
    lastUpdated: Date.now(),
  }
}
