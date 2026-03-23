import { PacificaPosition, TradeRecord, WalletScore } from '../types'

// Realistic mock BTC price cluster around $95,000
const BASE_PRICE = 95_000

// 30 mock positions spread across realistic liquidation levels
export const MOCK_POSITIONS: PacificaPosition[] = [
  // Heavy long cluster below — retail longs with 10–20x leverage
  { account: 'retail1', symbol: 'BTC', side: 'long', size: 2.5, entryPrice: 98000, leverage: 20, margin: 12250, liquidationPrice: 93150, unrealisedPnl: -7500 },
  { account: 'retail2', symbol: 'BTC', side: 'long', size: 1.8, entryPrice: 97500, leverage: 15, margin: 11700, liquidationPrice: 91100, unrealisedPnl: -4500 },
  { account: 'retail3', symbol: 'BTC', side: 'long', size: 3.0, entryPrice: 96000, leverage: 10, margin: 28800, liquidationPrice: 86850, unrealisedPnl: -3000 },
  { account: 'retail4', symbol: 'BTC', side: 'long', size: 0.5, entryPrice: 97000, leverage: 25, margin: 1940, liquidationPrice: 93250, unrealisedPnl: -1000 },
  { account: 'retail5', symbol: 'BTC', side: 'long', size: 4.0, entryPrice: 98500, leverage: 20, margin: 19700, liquidationPrice: 93650, unrealisedPnl: -14000 },
  { account: 'retail6', symbol: 'BTC', side: 'long', size: 1.2, entryPrice: 96500, leverage: 10, margin: 11580, liquidationPrice: 87300, unrealisedPnl: -1800 },
  { account: 'retail7', symbol: 'BTC', side: 'long', size: 2.0, entryPrice: 97200, leverage: 15, margin: 12960, liquidationPrice: 91000, unrealisedPnl: -4400 },
  { account: 'retail8', symbol: 'BTC', side: 'long', size: 0.8, entryPrice: 98200, leverage: 20, margin: 3928, liquidationPrice: 93350, unrealisedPnl: -2560 },

  // Smart money longs — lower leverage, wider stop
  { account: 'smart1', symbol: 'BTC', side: 'long', size: 5.0, entryPrice: 94000, leverage: 3, margin: 156667, liquidationPrice: 63500, unrealisedPnl: 5000 },
  { account: 'smart2', symbol: 'BTC', side: 'long', size: 3.5, entryPrice: 92000, leverage: 2, margin: 161000, liquidationPrice: 47500, unrealisedPnl: 10500 },
  { account: 'smart3', symbol: 'BTC', side: 'long', size: 2.0, entryPrice: 90000, leverage: 2, margin: 90000, liquidationPrice: 46000, unrealisedPnl: 10000 },

  // Short cluster above — retail shorts with high leverage (likely to get squeezed)
  { account: 'retail9',  symbol: 'BTC', side: 'short', size: 1.5, entryPrice: 94500, leverage: 15, margin: 9450, liquidationPrice: 100750, unrealisedPnl: -750 },
  { account: 'retail10', symbol: 'BTC', side: 'short', size: 2.0, entryPrice: 93000, leverage: 10, margin: 18600, liquidationPrice: 102300, unrealisedPnl: 4000 },
  { account: 'retail11', symbol: 'BTC', side: 'short', size: 0.9, entryPrice: 95500, leverage: 20, margin: 4298, liquidationPrice: 100250, unrealisedPnl: -450 },
  { account: 'retail12', symbol: 'BTC', side: 'short', size: 3.0, entryPrice: 94000, leverage: 15, margin: 18800, liquidationPrice: 100250, unrealisedPnl: -3000 },
  { account: 'retail13', symbol: 'BTC', side: 'short', size: 1.0, entryPrice: 96000, leverage: 25, margin: 3840, liquidationPrice: 99900, unrealisedPnl: -1000 },

  // Smart money shorts — hedges or strategic
  { account: 'smart4', symbol: 'BTC', side: 'short', size: 4.0, entryPrice: 98000, leverage: 3, margin: 130667, liquidationPrice: 130500, unrealisedPnl: 12000 },
  { account: 'smart5', symbol: 'BTC', side: 'short', size: 2.5, entryPrice: 100000, leverage: 2, margin: 125000, liquidationPrice: 149500, unrealisedPnl: 12500 },

  // Danger zone — very close to current price (within 2%)
  { account: 'retail14', symbol: 'BTC', side: 'long',  size: 1.0, entryPrice: 97000, leverage: 50, margin:  1940, liquidationPrice: 95100, unrealisedPnl: -2000 },
  { account: 'retail15', symbol: 'BTC', side: 'long',  size: 2.0, entryPrice: 97500, leverage: 50, margin:  3900, liquidationPrice: 96100, unrealisedPnl: -5000 },
  { account: 'retail16', symbol: 'BTC', side: 'short', size: 1.5, entryPrice: 93000, leverage: 50, margin:  2790, liquidationPrice: 93950, unrealisedPnl: -3000 },
  { account: 'retail17', symbol: 'BTC', side: 'long',  size: 0.5, entryPrice: 96800, leverage: 50, margin:   968, liquidationPrice: 95150, unrealisedPnl: -900 },
  { account: 'smart6',   symbol: 'BTC', side: 'short', size: 3.0, entryPrice: 97000, leverage: 5, margin:  58200, liquidationPrice: 116000, unrealisedPnl: 6000 },

  // Medium leverage mixed
  { account: 'retail18', symbol: 'BTC', side: 'long',  size: 1.0, entryPrice: 96000, leverage: 8, margin: 12000, liquidationPrice: 84600, unrealisedPnl: -1000 },
  { account: 'retail19', symbol: 'BTC', side: 'long',  size: 2.5, entryPrice: 95500, leverage: 7, margin: 34107, liquidationPrice: 82300, unrealisedPnl:  1250 },
  { account: 'retail20', symbol: 'BTC', side: 'short', size: 1.0, entryPrice: 94000, leverage: 8, margin: 11750, liquidationPrice: 104800, unrealisedPnl:  1000 },
  { account: 'smart7',   symbol: 'BTC', side: 'long',  size: 6.0, entryPrice: 88000, leverage: 2, margin: 264000, liquidationPrice: 45000, unrealisedPnl: 42000 },
  { account: 'smart8',   symbol: 'BTC', side: 'long',  size: 4.0, entryPrice: 85000, leverage: 2, margin: 170000, liquidationPrice: 43500, unrealisedPnl: 40000 },

  // --- ETH positions (entry ~$2100) ---
  { account: 'eth_retail1',  symbol: 'ETH', side: 'long',  size: 8.0,  entryPrice: 2120, leverage: 15, margin:  1131, liquidationPrice: 1980, unrealisedPnl:  -560 },
  { account: 'eth_retail2',  symbol: 'ETH', side: 'long',  size: 12.0, entryPrice: 2090, leverage: 20, margin:  1254, liquidationPrice: 1990, unrealisedPnl:  -240 },
  { account: 'eth_retail3',  symbol: 'ETH', side: 'long',  size: 5.0,  entryPrice: 2150, leverage: 10, margin:  1075, liquidationPrice: 1940, unrealisedPnl:   250 },
  { account: 'eth_retail4',  symbol: 'ETH', side: 'long',  size: 20.0, entryPrice: 2100, leverage: 25, margin:  1680, liquidationPrice: 2020, unrealisedPnl: -1000 },
  { account: 'eth_retail5',  symbol: 'ETH', side: 'short', size: 10.0, entryPrice: 2080, leverage: 15, margin:  1387, liquidationPrice: 2220, unrealisedPnl:   400 },
  { account: 'eth_retail6',  symbol: 'ETH', side: 'short', size: 7.0,  entryPrice: 2060, leverage: 20, margin:   721, liquidationPrice: 2165, unrealisedPnl:   700 },
  { account: 'eth_smart1',   symbol: 'ETH', side: 'long',  size: 50.0, entryPrice: 1980, leverage: 3,  margin: 33000, liquidationPrice: 1330, unrealisedPnl:  6000 },
  { account: 'eth_smart2',   symbol: 'ETH', side: 'short', size: 30.0, entryPrice: 2200, leverage: 4,  margin: 16500, liquidationPrice: 2740, unrealisedPnl:  3000 },
  // Danger zone ETH (within 2% of $2100)
  { account: 'eth_retail7',  symbol: 'ETH', side: 'long',  size: 15.0, entryPrice: 2180, leverage: 50, margin:   654, liquidationPrice: 2140, unrealisedPnl: -1200 },
  { account: 'eth_retail8',  symbol: 'ETH', side: 'long',  size: 9.0,  entryPrice: 2160, leverage: 50, margin:   389, liquidationPrice: 2118, unrealisedPnl:  -540 },

  // --- SOL positions (entry ~$85) ---
  { account: 'sol_retail1',  symbol: 'SOL', side: 'long',  size: 200,  entryPrice: 87,   leverage: 15, margin:  1160, liquidationPrice: 81,   unrealisedPnl:  -400 },
  { account: 'sol_retail2',  symbol: 'SOL', side: 'long',  size: 350,  entryPrice: 86,   leverage: 20, margin:  1505, liquidationPrice: 82,   unrealisedPnl:  -350 },
  { account: 'sol_retail3',  symbol: 'SOL', side: 'long',  size: 150,  entryPrice: 88,   leverage: 10, margin:  1320, liquidationPrice: 79,   unrealisedPnl:   450 },
  { account: 'sol_retail4',  symbol: 'SOL', side: 'long',  size: 500,  entryPrice: 85,   leverage: 25, margin:  1700, liquidationPrice: 81,   unrealisedPnl: -2500 },
  { account: 'sol_retail5',  symbol: 'SOL', side: 'short', size: 300,  entryPrice: 84,   leverage: 15, margin:  1680, liquidationPrice: 90,   unrealisedPnl:   300 },
  { account: 'sol_retail6',  symbol: 'SOL', side: 'short', size: 220,  entryPrice: 83,   leverage: 20, margin:   913, liquidationPrice: 87,   unrealisedPnl:   440 },
  { account: 'sol_smart1',   symbol: 'SOL', side: 'long',  size: 2000, entryPrice: 78,   leverage: 3,  margin: 52000, liquidationPrice: 53,   unrealisedPnl: 14000 },
  { account: 'sol_smart2',   symbol: 'SOL', side: 'short', size: 1500, entryPrice: 92,   leverage: 4,  margin: 34500, liquidationPrice: 114,  unrealisedPnl:  10500 },
  // Danger zone SOL (within 2% of $85)
  { account: 'sol_retail7',  symbol: 'SOL', side: 'long',  size: 400,  entryPrice: 88,   leverage: 50, margin:   704, liquidationPrice: 86,   unrealisedPnl: -1200 },
  { account: 'sol_retail8',  symbol: 'SOL', side: 'long',  size: 280,  entryPrice: 87,   leverage: 50, margin:   487, liquidationPrice: 85,   unrealisedPnl:  -560 },
]

// Mock wallet scores matching the positions above
export const MOCK_WALLET_SCORES: WalletScore[] = [
  { address: 'retail1',  label: 'retail',      score: 22, winRate: 0.32, avgHoldTimeMs: 0, avgPositionSizeUsd: 60000,  tradeCount: 45,  lastUpdated: Date.now() },
  { address: 'retail2',  label: 'retail',      score: 28, winRate: 0.38, avgHoldTimeMs: 0, avgPositionSizeUsd: 45000,  tradeCount: 38,  lastUpdated: Date.now() },
  { address: 'retail3',  label: 'retail',      score: 18, winRate: 0.29, avgHoldTimeMs: 0, avgPositionSizeUsd: 80000,  tradeCount: 52,  lastUpdated: Date.now() },
  { address: 'retail4',  label: 'retail',      score: 25, winRate: 0.35, avgHoldTimeMs: 0, avgPositionSizeUsd: 15000,  tradeCount: 30,  lastUpdated: Date.now() },
  { address: 'retail5',  label: 'retail',      score: 20, winRate: 0.30, avgHoldTimeMs: 0, avgPositionSizeUsd: 120000, tradeCount: 67,  lastUpdated: Date.now() },
  { address: 'retail6',  label: 'retail',      score: 24, winRate: 0.33, avgHoldTimeMs: 0, avgPositionSizeUsd: 38000,  tradeCount: 41,  lastUpdated: Date.now() },
  { address: 'retail7',  label: 'retail',      score: 27, winRate: 0.37, avgHoldTimeMs: 0, avgPositionSizeUsd: 55000,  tradeCount: 35,  lastUpdated: Date.now() },
  { address: 'retail8',  label: 'retail',      score: 21, winRate: 0.31, avgHoldTimeMs: 0, avgPositionSizeUsd: 25000,  tradeCount: 28,  lastUpdated: Date.now() },
  { address: 'retail9',  label: 'retail',      score: 26, winRate: 0.36, avgHoldTimeMs: 0, avgPositionSizeUsd: 42000,  tradeCount: 33,  lastUpdated: Date.now() },
  { address: 'retail10', label: 'retail',      score: 23, winRate: 0.34, avgHoldTimeMs: 0, avgPositionSizeUsd: 62000,  tradeCount: 48,  lastUpdated: Date.now() },
  { address: 'retail11', label: 'retail',      score: 19, winRate: 0.28, avgHoldTimeMs: 0, avgPositionSizeUsd: 28000,  tradeCount: 22,  lastUpdated: Date.now() },
  { address: 'retail12', label: 'retail',      score: 22, winRate: 0.32, avgHoldTimeMs: 0, avgPositionSizeUsd: 75000,  tradeCount: 55,  lastUpdated: Date.now() },
  { address: 'retail13', label: 'retail',      score: 20, winRate: 0.30, avgHoldTimeMs: 0, avgPositionSizeUsd: 32000,  tradeCount: 19,  lastUpdated: Date.now() },
  { address: 'retail14', label: 'retail',      score: 15, winRate: 0.22, avgHoldTimeMs: 0, avgPositionSizeUsd: 65000,  tradeCount: 88,  lastUpdated: Date.now() },
  { address: 'retail15', label: 'retail',      score: 17, winRate: 0.25, avgHoldTimeMs: 0, avgPositionSizeUsd: 95000,  tradeCount: 72,  lastUpdated: Date.now() },
  { address: 'retail16', label: 'retail',      score: 16, winRate: 0.24, avgHoldTimeMs: 0, avgPositionSizeUsd: 44000,  tradeCount: 61,  lastUpdated: Date.now() },
  { address: 'retail17', label: 'retail',      score: 14, winRate: 0.21, avgHoldTimeMs: 0, avgPositionSizeUsd: 20000,  tradeCount: 95,  lastUpdated: Date.now() },
  { address: 'retail18', label: 'retail',      score: 29, winRate: 0.39, avgHoldTimeMs: 0, avgPositionSizeUsd: 48000,  tradeCount: 26,  lastUpdated: Date.now() },
  { address: 'retail19', label: 'retail',      score: 30, winRate: 0.40, avgHoldTimeMs: 0, avgPositionSizeUsd: 72000,  tradeCount: 18,  lastUpdated: Date.now() },
  { address: 'retail20', label: 'retail',      score: 28, winRate: 0.38, avgHoldTimeMs: 0, avgPositionSizeUsd: 58000,  tradeCount: 32,  lastUpdated: Date.now() },
  { address: 'smart1',   label: 'smart_money', score: 78, winRate: 0.71, avgHoldTimeMs: 0, avgPositionSizeUsd: 320000, tradeCount: 142, lastUpdated: Date.now() },
  { address: 'smart2',   label: 'smart_money', score: 82, winRate: 0.75, avgHoldTimeMs: 0, avgPositionSizeUsd: 480000, tradeCount: 98,  lastUpdated: Date.now() },
  { address: 'smart3',   label: 'smart_money', score: 76, winRate: 0.69, avgHoldTimeMs: 0, avgPositionSizeUsd: 250000, tradeCount: 115, lastUpdated: Date.now() },
  { address: 'smart4',   label: 'smart_money', score: 80, winRate: 0.73, avgHoldTimeMs: 0, avgPositionSizeUsd: 550000, tradeCount: 87,  lastUpdated: Date.now() },
  { address: 'smart5',   label: 'smart_money', score: 85, winRate: 0.78, avgHoldTimeMs: 0, avgPositionSizeUsd: 680000, tradeCount: 73,  lastUpdated: Date.now() },
  { address: 'smart6',   label: 'smart_money', score: 71, winRate: 0.65, avgHoldTimeMs: 0, avgPositionSizeUsd: 190000, tradeCount: 201, lastUpdated: Date.now() },
  { address: 'smart7',   label: 'smart_money', score: 88, winRate: 0.81, avgHoldTimeMs: 0, avgPositionSizeUsd: 900000, tradeCount: 64,  lastUpdated: Date.now() },
  { address: 'smart8',   label: 'smart_money', score: 83, winRate: 0.76, avgHoldTimeMs: 0, avgPositionSizeUsd: 720000, tradeCount: 55,  lastUpdated: Date.now() },

  // ETH wallets
  { address: 'eth_retail1', label: 'retail',      score: 24, winRate: 0.34, avgHoldTimeMs: 7_200_000,   avgPositionSizeUsd: 16960,  tradeCount: 28, lastUpdated: Date.now() },
  { address: 'eth_retail2', label: 'retail',      score: 21, winRate: 0.30, avgHoldTimeMs: 3_600_000,   avgPositionSizeUsd: 25080,  tradeCount: 41, lastUpdated: Date.now() },
  { address: 'eth_retail3', label: 'retail',      score: 26, winRate: 0.36, avgHoldTimeMs: 9_000_000,   avgPositionSizeUsd: 10750,  tradeCount: 19, lastUpdated: Date.now() },
  { address: 'eth_retail4', label: 'retail',      score: 18, winRate: 0.27, avgHoldTimeMs: 1_800_000,   avgPositionSizeUsd: 42000,  tradeCount: 63, lastUpdated: Date.now() },
  { address: 'eth_retail5', label: 'retail',      score: 22, winRate: 0.32, avgHoldTimeMs: 5_400_000,   avgPositionSizeUsd: 20800,  tradeCount: 35, lastUpdated: Date.now() },
  { address: 'eth_retail6', label: 'retail',      score: 20, winRate: 0.29, avgHoldTimeMs: 4_500_000,   avgPositionSizeUsd: 14420,  tradeCount: 22, lastUpdated: Date.now() },
  { address: 'eth_smart1',  label: 'smart_money', score: 79, winRate: 0.72, avgHoldTimeMs: 86_400_000,  avgPositionSizeUsd: 99000,  tradeCount: 88, lastUpdated: Date.now() },
  { address: 'eth_smart2',  label: 'smart_money', score: 84, winRate: 0.77, avgHoldTimeMs: 172_800_000, avgPositionSizeUsd: 66000,  tradeCount: 61, lastUpdated: Date.now() },
  { address: 'eth_retail7', label: 'retail',      score: 16, winRate: 0.24, avgHoldTimeMs: 900_000,     avgPositionSizeUsd: 32700,  tradeCount: 79, lastUpdated: Date.now() },
  { address: 'eth_retail8', label: 'retail',      score: 14, winRate: 0.21, avgHoldTimeMs: 600_000,     avgPositionSizeUsd: 19440,  tradeCount: 94, lastUpdated: Date.now() },

  // SOL wallets
  { address: 'sol_retail1', label: 'retail',      score: 23, winRate: 0.33, avgHoldTimeMs: 5_400_000,   avgPositionSizeUsd: 17400,  tradeCount: 31, lastUpdated: Date.now() },
  { address: 'sol_retail2', label: 'retail',      score: 25, winRate: 0.35, avgHoldTimeMs: 3_600_000,   avgPositionSizeUsd: 30100,  tradeCount: 44, lastUpdated: Date.now() },
  { address: 'sol_retail3', label: 'retail',      score: 27, winRate: 0.37, avgHoldTimeMs: 10_800_000,  avgPositionSizeUsd: 13200,  tradeCount: 17, lastUpdated: Date.now() },
  { address: 'sol_retail4', label: 'retail',      score: 17, winRate: 0.25, avgHoldTimeMs: 1_200_000,   avgPositionSizeUsd: 42500,  tradeCount: 72, lastUpdated: Date.now() },
  { address: 'sol_retail5', label: 'retail',      score: 22, winRate: 0.32, avgHoldTimeMs: 7_200_000,   avgPositionSizeUsd: 25200,  tradeCount: 38, lastUpdated: Date.now() },
  { address: 'sol_retail6', label: 'retail',      score: 19, winRate: 0.28, avgHoldTimeMs: 4_200_000,   avgPositionSizeUsd: 18260,  tradeCount: 26, lastUpdated: Date.now() },
  { address: 'sol_smart1',  label: 'smart_money', score: 81, winRate: 0.74, avgHoldTimeMs: 259_200_000, avgPositionSizeUsd: 156000, tradeCount: 74, lastUpdated: Date.now() },
  { address: 'sol_smart2',  label: 'smart_money', score: 77, winRate: 0.70, avgHoldTimeMs: 129_600_000, avgPositionSizeUsd: 138000, tradeCount: 59, lastUpdated: Date.now() },
  { address: 'sol_retail7', label: 'retail',      score: 15, winRate: 0.23, avgHoldTimeMs: 600_000,     avgPositionSizeUsd: 34800,  tradeCount: 82, lastUpdated: Date.now() },
  { address: 'sol_retail8', label: 'retail',      score: 13, winRate: 0.20, avgHoldTimeMs: 300_000,     avgPositionSizeUsd: 24360,  tradeCount: 98, lastUpdated: Date.now() },
]

export const MOCK_CURRENT_PRICE = BASE_PRICE

// Mock trade history for wallet lookup demo
export function getMockTradeHistory(account: string): TradeRecord[] {
  const score = MOCK_WALLET_SCORES.find((s) => s.address === account)
  if (!score) return []

  const isSmart = score.label === 'smart_money'
  const count = score.tradeCount
  const now = Date.now()

  const symbol = account.startsWith('eth_') ? 'ETH' : account.startsWith('sol_') ? 'SOL' : 'BTC'
  const basePrice = symbol === 'ETH' ? 2100 : symbol === 'SOL' ? 85 : BASE_PRICE
  const baseHold = isSmart ? 86_400_000 : 7_200_000 // smart: 24h avg, retail: 2h avg

  return Array.from({ length: Math.min(count, 10) }, (_, i) => {
    const holdMs = baseHold * (0.5 + Math.random())
    return {
      account,
      symbol,
      side: (i % 3 === 0 ? 'short' : 'long') as 'long' | 'short',
      size: isSmart ? 3 + Math.random() * 2 : 0.5 + Math.random() * 2,
      entryPrice: basePrice * (0.97 + Math.random() * 0.06),
      exitPrice: basePrice * (0.98 + Math.random() * 0.05),
      pnl: isSmart ? 1000 + Math.random() * 5000 : -500 + Math.random() * 800,
      holdTimeMs: holdMs,
      timestamp: now - i * 3_600_000,
    }
  })
}
