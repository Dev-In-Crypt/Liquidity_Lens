export interface WalletScore {
  address: string
  label: 'smart_money' | 'retail' | 'unknown'
  score: number          // 0–100, higher = smarter
  winRate: number        // % of profitable closed trades
  avgHoldTimeMs: number
  avgPositionSizeUsd: number
  tradeCount: number
  lastUpdated: number    // unix ms
}

export interface HeatmapBucket {
  priceLevel: number          // lower bound of bucket
  totalLiqUsd: number
  longLiqUsd: number
  shortLiqUsd: number
  smartMoneyPct: number       // % of total that is smart money
  retailPct: number
  walletCount: number
  isDangerZone: boolean       // true if within 2% of current price
}

export interface PacificaPosition {
  account: string
  symbol: string
  side: 'long' | 'short'
  size: number
  entryPrice: number
  leverage: number
  margin: number
  liquidationPrice: number
  unrealisedPnl: number
}

export interface HeatmapUpdate {
  market: string
  buckets: HeatmapBucket[]
  currentPrice: number
  timestamp: number
}

export interface TradeRecord {
  account: string
  symbol: string
  side: 'long' | 'short'
  size: number
  entryPrice: number
  exitPrice: number
  pnl: number
  holdTimeMs: number
  timestamp: number
}
