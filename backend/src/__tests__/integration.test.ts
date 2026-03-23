import { buildHeatmap } from '../engine/liqCalculator'
import {
  setHeatmapBucketsForMarket,
  getHeatmapBucketsForMarket,
  setCurrentPriceForMarket,
} from '../engine/store'
import { PacificaPosition } from '../types'

const btcPos: PacificaPosition = {
  account: 'addr_btc', symbol: 'BTC', side: 'long',
  size: 0.1, entryPrice: 68000, leverage: 10, margin: 680,
  liquidationPrice: 0, unrealisedPnl: 0,
}
const ethPos: PacificaPosition = {
  account: 'addr_eth', symbol: 'ETH', side: 'long',
  size: 5, entryPrice: 2100, leverage: 10, margin: 1050,
  liquidationPrice: 0, unrealisedPnl: 0,
}
const solPos: PacificaPosition = {
  account: 'addr_sol', symbol: 'SOL', side: 'long',
  size: 100, entryPrice: 85, leverage: 10, margin: 850,
  liquidationPrice: 0, unrealisedPnl: 0,
}

describe('Multi-market heatmap integration', () => {
  it('BTC buckets are in BTC price range', () => {
    const buckets = buildHeatmap([btcPos], [], 68000, 'BTC')
    expect(buckets.length).toBe(1)
    expect(buckets[0].priceLevel).toBeGreaterThan(60000)
    expect(buckets[0].priceLevel).toBeLessThan(70000)
  })

  it('ETH buckets are in ETH price range', () => {
    const buckets = buildHeatmap([ethPos], [], 2100, 'ETH')
    expect(buckets.length).toBe(1)
    expect(buckets[0].priceLevel).toBeGreaterThan(1000)
    expect(buckets[0].priceLevel).toBeLessThan(3000)
  })

  it('SOL buckets are in SOL price range', () => {
    const buckets = buildHeatmap([solPos], [], 85, 'SOL')
    expect(buckets.length).toBe(1)
    expect(buckets[0].priceLevel).toBeGreaterThan(0)
    expect(buckets[0].priceLevel).toBeLessThan(100)
  })

  it('BTC and ETH buckets do not overlap in price', () => {
    const btc = buildHeatmap([btcPos], [], 68000, 'BTC')
    const eth = buildHeatmap([ethPos], [], 2100, 'ETH')
    expect(btc[0].priceLevel).not.toEqual(eth[0].priceLevel)
    expect(btc[0].priceLevel).toBeGreaterThan(eth[0].priceLevel)
  })

  it('store isolates per-market buckets', () => {
    const btcBuckets = buildHeatmap([btcPos], [], 68000, 'BTC')
    const ethBuckets = buildHeatmap([ethPos], [], 2100, 'ETH')

    setHeatmapBucketsForMarket('BTC', btcBuckets)
    setHeatmapBucketsForMarket('ETH', ethBuckets)

    expect(getHeatmapBucketsForMarket('BTC')[0].priceLevel).toBeGreaterThan(60000)
    expect(getHeatmapBucketsForMarket('ETH')[0].priceLevel).toBeLessThan(3000)
    expect(getHeatmapBucketsForMarket('SOL')).toHaveLength(0)
  })

  it('danger zone fires only for buckets within 2% of current price', () => {
    // Long SOL at $85 with 10x lev → liq ~$76.5, bucketSize=1 → bucket $76
    const buckets = buildHeatmap([solPos], [], 85, 'SOL')
    // liq = 85 * (1 - 1/10 + 0.005) = 85 * 0.905 = 76.925 → bucket 76
    // |76 - 85| / 85 * 100 = 10.6% → NOT danger zone
    expect(buckets[0].isDangerZone).toBe(false)
  })

  it('per-market prices stored independently', () => {
    setCurrentPriceForMarket('BTC', 68000)
    setCurrentPriceForMarket('ETH', 2100)
    setCurrentPriceForMarket('SOL', 85)

    // Re-import to check isolation
    const { getCurrentPriceForMarket } = require('../engine/store')
    expect(getCurrentPriceForMarket('BTC')).toBe(68000)
    expect(getCurrentPriceForMarket('ETH')).toBe(2100)
    expect(getCurrentPriceForMarket('SOL')).toBe(85)
  })
})
