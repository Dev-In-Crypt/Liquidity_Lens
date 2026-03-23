import {
  setWalletScore,
  getWalletScore,
  getAllWalletScores,
  setHeatmapBuckets,
  getHeatmapBuckets,
  setCurrentPrice,
  getCurrentPrice,
  setHeatmapBucketsForMarket,
  getHeatmapBucketsForMarket,
  setCurrentPriceForMarket,
  getCurrentPriceForMarket,
} from '../engine/store'
import { WalletScore, HeatmapBucket } from '../types'

function makeScore(address: string, label: WalletScore['label'] = 'retail'): WalletScore {
  return {
    address,
    label,
    score: 40,
    winRate: 0.4,
    avgHoldTimeMs: 0,
    avgPositionSizeUsd: 1000,
    tradeCount: 10,
    lastUpdated: Date.now(),
  }
}

function makeBucket(priceLevel: number): HeatmapBucket {
  return {
    priceLevel,
    totalLiqUsd: 100000,
    longLiqUsd: 60000,
    shortLiqUsd: 40000,
    smartMoneyPct: 30,
    retailPct: 70,
    walletCount: 5,
    isDangerZone: false,
  }
}

describe('store', () => {
  it('sets and gets a wallet score', () => {
    const score = makeScore('addr1', 'smart_money')
    setWalletScore('addr1', score)
    expect(getWalletScore('addr1')).toEqual(score)
  })

  it('returns undefined for unknown wallet', () => {
    expect(getWalletScore('nonexistent_xyz')).toBeUndefined()
  })

  it('overwrites existing wallet score', () => {
    setWalletScore('addr2', makeScore('addr2', 'retail'))
    const updated = makeScore('addr2', 'smart_money')
    setWalletScore('addr2', updated)
    expect(getWalletScore('addr2')?.label).toBe('smart_money')
  })

  it('getAllWalletScores returns all stored scores', () => {
    setWalletScore('bulk1', makeScore('bulk1'))
    setWalletScore('bulk2', makeScore('bulk2'))
    const all = getAllWalletScores()
    const addresses = all.map((s) => s.address)
    expect(addresses).toContain('bulk1')
    expect(addresses).toContain('bulk2')
  })

  it('sets and gets heatmap buckets', () => {
    const buckets = [makeBucket(45000), makeBucket(50000)]
    setHeatmapBuckets(buckets)
    expect(getHeatmapBuckets()).toEqual(buckets)
  })

  it('overwrites heatmap buckets', () => {
    setHeatmapBuckets([makeBucket(45000)])
    setHeatmapBuckets([makeBucket(60000)])
    expect(getHeatmapBuckets()).toHaveLength(1)
    expect(getHeatmapBuckets()[0].priceLevel).toBe(60000)
  })

  it('returns empty array when no heatmap set', () => {
    setHeatmapBuckets([])
    expect(getHeatmapBuckets()).toEqual([])
  })

  it('sets and gets current price', () => {
    setCurrentPrice(42000)
    expect(getCurrentPrice()).toBe(42000)
  })

  it('returns 0 for current price when not set', () => {
    setCurrentPrice(0)
    expect(getCurrentPrice()).toBe(0)
  })
})

describe('store — per-market functions', () => {
  it('sets and gets price per market independently', () => {
    setCurrentPriceForMarket('BTC', 68000)
    setCurrentPriceForMarket('ETH', 2100)
    setCurrentPriceForMarket('SOL', 85)
    expect(getCurrentPriceForMarket('BTC')).toBe(68000)
    expect(getCurrentPriceForMarket('ETH')).toBe(2100)
    expect(getCurrentPriceForMarket('SOL')).toBe(85)
  })

  it('returns 0 for market with no price set', () => {
    expect(getCurrentPriceForMarket('DOGE')).toBe(0)
  })

  it('setCurrentPrice (BTC alias) is reflected in getCurrentPriceForMarket(BTC)', () => {
    setCurrentPrice(70000)
    expect(getCurrentPriceForMarket('BTC')).toBe(70000)
  })

  it('sets and gets heatmap buckets per market independently', () => {
    const btcBuckets = [makeBucket(68000)]
    const ethBuckets = [makeBucket(2100)]
    setHeatmapBucketsForMarket('BTC', btcBuckets)
    setHeatmapBucketsForMarket('ETH', ethBuckets)
    expect(getHeatmapBucketsForMarket('BTC')).toEqual(btcBuckets)
    expect(getHeatmapBucketsForMarket('ETH')).toEqual(ethBuckets)
  })

  it('returns empty array for market with no buckets set', () => {
    expect(getHeatmapBucketsForMarket('SHIB')).toEqual([])
  })

  it('setHeatmapBuckets (BTC alias) is reflected in getHeatmapBucketsForMarket(BTC)', () => {
    const buckets = [makeBucket(65000)]
    setHeatmapBuckets(buckets)
    expect(getHeatmapBucketsForMarket('BTC')).toEqual(buckets)
  })

  it('market keys are case-insensitive (uppercase normalised)', () => {
    setCurrentPriceForMarket('eth', 2200)
    expect(getCurrentPriceForMarket('ETH')).toBe(2200)
  })
})
