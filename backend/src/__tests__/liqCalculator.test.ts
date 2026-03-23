import { buildHeatmap } from '../engine/liqCalculator'
import { PacificaPosition, WalletScore } from '../types'

function makePosition(overrides: Partial<PacificaPosition> = {}): PacificaPosition {
  return {
    account: 'wallet1',
    symbol: 'BTC',
    side: 'long',
    size: 1,
    entryPrice: 50000,
    leverage: 10,
    margin: 5000,
    liquidationPrice: 0,    // trigger calculation
    unrealisedPnl: 0,
    ...overrides,
  }
}

function makeScore(overrides: Partial<WalletScore> = {}): WalletScore {
  return {
    address: 'wallet1',
    label: 'retail',
    score: 30,
    winRate: 0.3,
    avgHoldTimeMs: 0,
    avgPositionSizeUsd: 50000,
    tradeCount: 10,
    lastUpdated: Date.now(),
    ...overrides,
  }
}

describe('buildHeatmap', () => {
  it('returns empty array when no positions', () => {
    expect(buildHeatmap([], [], 50000)).toEqual([])
  })

  it('assigns position to correct bucket', () => {
    // Long, leverage=10, entry=50000 → liqPrice ≈ 50000*(1 - 0.1 + 0.005) = 45250
    // BTC bucket size = 500 → Math.floor(45250/500)*500 = 45000
    const pos = makePosition({ entryPrice: 50000, leverage: 10 })
    const buckets = buildHeatmap([pos], [], 60000)
    expect(buckets.length).toBe(1)
    expect(buckets[0].priceLevel).toBe(45000)
    expect(buckets[0].longLiqUsd).toBe(50000)
    expect(buckets[0].shortLiqUsd).toBe(0)
  })

  it('detects danger zone when price is within 2%', () => {
    const pos = makePosition({ liquidationPrice: 50000 })
    const currentPrice = 50500  // 50000 is 0.99% away → danger
    const buckets = buildHeatmap([pos], [], currentPrice)
    expect(buckets[0].isDangerZone).toBe(true)
  })

  it('does not flag danger zone when price is far away', () => {
    const pos = makePosition({ liquidationPrice: 40000 })
    const currentPrice = 60000  // 33% away
    const buckets = buildHeatmap([pos], [], currentPrice)
    expect(buckets[0].isDangerZone).toBe(false)
  })

  it('calculates smart money percentage correctly', () => {
    const pos1 = makePosition({ account: 'smart1', size: 2, entryPrice: 50000, liquidationPrice: 45000 })
    const pos2 = makePosition({ account: 'retail1', size: 2, entryPrice: 50000, liquidationPrice: 45000 })

    const scores: WalletScore[] = [
      makeScore({ address: 'smart1', label: 'smart_money' }),
      makeScore({ address: 'retail1', label: 'retail' }),
    ]

    const buckets = buildHeatmap([pos1, pos2], scores, 60000)
    expect(buckets.length).toBe(1)
    expect(buckets[0].smartMoneyPct).toBeCloseTo(50, 0)
    expect(buckets[0].retailPct).toBeCloseTo(50, 0)
    expect(buckets[0].walletCount).toBe(2)
  })

  it('sorts buckets by priceLevel ascending', () => {
    const positions = [
      makePosition({ liquidationPrice: 60000 }),
      makePosition({ liquidationPrice: 40000 }),
      makePosition({ liquidationPrice: 50000 }),
    ]
    const buckets = buildHeatmap(positions, [], 70000)
    const levels = buckets.map((b) => b.priceLevel)
    expect(levels).toEqual([...levels].sort((a, b) => a - b))
  })

  it('uses pre-provided liquidationPrice when > 0', () => {
    const pos = makePosition({ liquidationPrice: 62000, leverage: 10 })
    const buckets = buildHeatmap([pos], [], 70000)
    // BTC bucket size=500 → Math.floor(62000/500)*500 = 62000
    expect(buckets[0].priceLevel).toBe(62000)
  })

  it('calculates short liquidation price above entry', () => {
    // Short: entryPrice*(1 + 1/leverage - 0.005) = 50000*(1 + 0.1 - 0.005) = 54750
    const pos = makePosition({ side: 'short', entryPrice: 50000, leverage: 10, liquidationPrice: 0 })
    const buckets = buildHeatmap([pos], [], 45000)
    // 54750, BTC bucket=500 → 54500
    expect(buckets[0].priceLevel).toBe(54500)
    expect(buckets[0].shortLiqUsd).toBeGreaterThan(0)
    expect(buckets[0].longLiqUsd).toBe(0)
  })

  it('skips positions with liqPrice <= 0 (entryPrice=0 forces calculated price to 0)', () => {
    const pos = makePosition({ entryPrice: 0, liquidationPrice: 0 })
    const buckets = buildHeatmap([pos], [], 60000)
    expect(buckets).toHaveLength(0)
  })

  it('uses ETH bucket size of 10', () => {
    const ethPos = { account: 'w1', symbol: 'ETH', side: 'long' as const, size: 5, entryPrice: 2100, leverage: 10, margin: 1050, liquidationPrice: 1890, unrealisedPnl: 0 }
    const buckets = buildHeatmap([ethPos], [], 2100, 'ETH')
    // 1890 / 10 = 189 → 189 * 10 = 1890
    expect(buckets[0].priceLevel).toBe(1890)
  })

  it('uses SOL bucket size of 1', () => {
    const solPos = { account: 'w1', symbol: 'SOL', side: 'long' as const, size: 100, entryPrice: 85, leverage: 10, margin: 850, liquidationPrice: 76.5, unrealisedPnl: 0 }
    const buckets = buildHeatmap([solPos], [], 85, 'SOL')
    // 76.5 / 1 = 76.5 → floor = 76
    expect(buckets[0].priceLevel).toBe(76)
  })

  it('aggregates multiple positions into same bucket', () => {
    const p1 = makePosition({ account: 'a1', liquidationPrice: 45000, size: 1 })
    const p2 = makePosition({ account: 'a2', liquidationPrice: 45200, size: 2 })
    // Both map to BTC bucket 45000 (floor(45000/500)*500 and floor(45200/500)*500)
    const buckets = buildHeatmap([p1, p2], [], 70000)
    expect(buckets.length).toBe(1)
    expect(buckets[0].walletCount).toBe(2)
  })
})
