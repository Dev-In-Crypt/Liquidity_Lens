import { config } from '../config'
import { HeatmapBucket, PacificaPosition, WalletScore } from '../types'
import {
  getAllWalletScores,
  getCurrentPriceForMarket,
  getHeatmapBucketsForMarket,
  setHeatmapBucketsForMarket,
} from './store'
import { emitHeatmapUpdate } from '../api/socketServer'

const MAINTENANCE_MARGIN_RATE = 0.005 // 0.5% — Pacifica default

const SUPPORTED_MARKETS = ['BTC', 'ETH', 'SOL']

// Sensible bucket sizes per market (USD per bucket)
const MARKET_BUCKET_SIZES: Record<string, number> = {
  BTC: 500,
  ETH: 10,
  SOL: 1,
}

function getBucketSize(market: string): number {
  return MARKET_BUCKET_SIZES[market.toUpperCase()] ?? config.priceBucketSize
}

function calcLiquidationPrice(pos: PacificaPosition): number {
  if (pos.liquidationPrice > 0) return pos.liquidationPrice

  if (pos.side === 'long') {
    return pos.entryPrice * (1 - 1 / pos.leverage + MAINTENANCE_MARGIN_RATE)
  } else {
    return pos.entryPrice * (1 + 1 / pos.leverage - MAINTENANCE_MARGIN_RATE)
  }
}

export function buildHeatmap(
  positions: PacificaPosition[],
  walletScores: WalletScore[],
  currentPrice: number,
  market = 'BTC'
): HeatmapBucket[] {
  const bucketSize = getBucketSize(market)
  const dangerZonePct = config.dangerZonePct

  const scoreMap = new Map<string, WalletScore>()
  for (const s of walletScores) {
    scoreMap.set(s.address, s)
  }

  const buckets = new Map<
    number,
    {
      totalLiqUsd: number
      longLiqUsd: number
      shortLiqUsd: number
      smartLiqUsd: number
      retailLiqUsd: number
      walletCount: number
      wallets: Set<string>
    }
  >()

  for (const pos of positions) {
    const liqPrice = calcLiquidationPrice(pos)
    if (liqPrice <= 0) continue

    const bucketKey = Math.floor(liqPrice / bucketSize) * bucketSize
    const posUsd = pos.size * pos.entryPrice

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, {
        totalLiqUsd: 0,
        longLiqUsd: 0,
        shortLiqUsd: 0,
        smartLiqUsd: 0,
        retailLiqUsd: 0,
        walletCount: 0,
        wallets: new Set(),
      })
    }

    const bucket = buckets.get(bucketKey)!
    bucket.totalLiqUsd += posUsd

    if (pos.side === 'long') {
      bucket.longLiqUsd += posUsd
    } else {
      bucket.shortLiqUsd += posUsd
    }

    const walletScore = scoreMap.get(pos.account)
    if (walletScore?.label === 'smart_money') {
      bucket.smartLiqUsd += posUsd
    } else {
      bucket.retailLiqUsd += posUsd
    }

    if (!bucket.wallets.has(pos.account)) {
      bucket.wallets.add(pos.account)
      bucket.walletCount++
    }
  }

  const result: HeatmapBucket[] = []

  for (const [priceLevel, b] of buckets) {
    if (b.totalLiqUsd === 0) continue

    const smartMoneyPct = b.totalLiqUsd > 0 ? (b.smartLiqUsd / b.totalLiqUsd) * 100 : 0
    const retailPct = b.totalLiqUsd > 0 ? (b.retailLiqUsd / b.totalLiqUsd) * 100 : 0

    const isDangerZone =
      currentPrice > 0
        ? (Math.abs(priceLevel - currentPrice) / currentPrice) * 100 <= dangerZonePct
        : false

    result.push({
      priceLevel,
      totalLiqUsd: b.totalLiqUsd,
      longLiqUsd: b.longLiqUsd,
      shortLiqUsd: b.shortLiqUsd,
      smartMoneyPct,
      retailPct,
      walletCount: b.walletCount,
      isDangerZone,
    })
  }

  return result.sort((a, b) => a.priceLevel - b.priceLevel)
}

export async function rebuildHeatmap(): Promise<void> {
  const { restPoller } = await import('../ingestion/restPoller')
  const allPositions = await restPoller.fetchAllPositions()
  const walletScores = getAllWalletScores()

  for (const market of SUPPORTED_MARKETS) {
    const positions = allPositions.filter((p) =>
      p.symbol.toUpperCase().startsWith(market)
    )
    const currentPrice = getCurrentPriceForMarket(market)
    const buckets = buildHeatmap(positions, walletScores, currentPrice, market)
    setHeatmapBucketsForMarket(market, buckets)

    emitHeatmapUpdate({ market, buckets, currentPrice, timestamp: Date.now() })
  }
}

export { SUPPORTED_MARKETS }
