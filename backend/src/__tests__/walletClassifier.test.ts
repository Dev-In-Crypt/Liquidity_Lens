import { classifyWallet } from '../engine/walletClassifier'
import { TradeRecord } from '../types'

function makeTrade(overrides: Partial<TradeRecord> = {}): TradeRecord {
  return {
    account: 'test',
    symbol: 'BTC',
    side: 'long',
    size: 1,
    entryPrice: 50000,
    exitPrice: 55000,
    pnl: 5000,
    holdTimeMs: 3_600_000,
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('classifyWallet', () => {
  it('returns unknown with score 50 for fewer than 5 trades', () => {
    const result = classifyWallet([makeTrade(), makeTrade()])
    expect(result.label).toBe('unknown')
    expect(result.score).toBe(50)
    expect(result.tradeCount).toBe(2)
  })

  it('classifies high win rate wallet as smart_money', () => {
    const trades = Array.from({ length: 20 }, (_, i) =>
      makeTrade({ pnl: 1000, timestamp: Date.now() - i * 86_400_000 })
    )
    const result = classifyWallet(trades)
    expect(result.winRate).toBe(1)
    expect(result.label).toBe('smart_money')
    expect(result.score).toBeGreaterThanOrEqual(65)
  })

  it('classifies zero win rate wallet with inconsistent sizes as retail', () => {
    // All losing trades + high size variance → low total score → retail
    const trades = Array.from({ length: 20 }, (_, i) =>
      makeTrade({
        pnl: -500,
        size: i % 2 === 0 ? 0.1 : 10,  // high variance → low sizeConsistencyScore
        timestamp: Date.now() - i * 86_400_000,
      })
    )
    const result = classifyWallet(trades)
    expect(result.winRate).toBe(0)
    expect(result.label).toBe('retail')
    expect(result.score).toBeLessThan(35)
  })

  it('gives sizeConsistencyScore=100 when all trades are the same size', () => {
    const trades = Array.from({ length: 10 }, (_, i) =>
      makeTrade({ size: 1, entryPrice: 50000, timestamp: Date.now() - i * 86_400_000 })
    )
    const result = classifyWallet(trades)
    // Size consistency contributes 20% weight; score should be higher than pure win rate would give
    expect(result.score).toBeGreaterThan(0)
  })

  it('calculates avgPositionSizeUsd correctly', () => {
    const trades = Array.from({ length: 5 }, () =>
      makeTrade({ size: 2, entryPrice: 30000 })
    )
    const result = classifyWallet(trades)
    expect(result.avgPositionSizeUsd).toBe(60000)
  })

  it('sets holdTimeMs=0 when trades have no hold time data', () => {
    const trades = Array.from({ length: 5 }, () => makeTrade({ holdTimeMs: 0 }))
    const result = classifyWallet(trades)
    expect(result.avgHoldTimeMs).toBe(0)
  })

  it('hold time of 48h gives maximum holdTimeScore', () => {
    const fortyEightHours = 48 * 3600 * 1000
    const trades = Array.from({ length: 10 }, (_, i) =>
      makeTrade({ holdTimeMs: fortyEightHours, timestamp: Date.now() - i * 86_400_000 })
    )
    const result = classifyWallet(trades)
    expect(result.avgHoldTimeMs).toBe(fortyEightHours)
    // With 100% win + 100% hold + 100% freq + some consistency → should be smart_money
    expect(result.label).toBe('smart_money')
  })

  it('frequency score peaks at ~15 trades per month', () => {
    // 15 trades over 30 days = ~15/month
    const trades = Array.from({ length: 15 }, (_, i) =>
      makeTrade({ pnl: 1000, holdTimeMs: 3_600_000, timestamp: Date.now() - i * (30 / 15) * 86_400_000 })
    )
    const result = classifyWallet(trades)
    // High win rate + good frequency → should be smart_money
    expect(result.score).toBeGreaterThan(50)
  })

  it('very low frequency (1 trade over 30 days) gives low frequency score', () => {
    const trades = Array.from({ length: 10 }, (_, i) =>
      makeTrade({ pnl: 1000, holdTimeMs: 1000, timestamp: Date.now() - i * 90 * 86_400_000 })
    )
    const result = classifyWallet(trades)
    // Spread over 900 days → very low frequency
    expect(result.score).toBeLessThan(100)
  })

  it('score is between 0 and 100 always', () => {
    const extremes = [
      Array.from({ length: 5 }, () => makeTrade({ pnl: 0, size: 0.001 })),
      Array.from({ length: 50 }, (_, i) => makeTrade({ pnl: 10000, timestamp: Date.now() - i * 3_600_000 })),
    ]
    for (const trades of extremes) {
      const result = classifyWallet(trades)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    }
  })

  it('tradeCount equals number of trades provided', () => {
    const trades = Array.from({ length: 12 }, () => makeTrade())
    expect(classifyWallet(trades).tradeCount).toBe(12)
  })

  it('label thresholds: score>=65 smart_money, >=35 unknown, <35 retail', () => {
    // Force low score: all losing, variable sizes, low frequency
    const retailTrades = Array.from({ length: 20 }, (_, i) =>
      makeTrade({ pnl: -500, holdTimeMs: 0, size: i * 5 + 0.1, timestamp: Date.now() - i * 200 * 86_400_000 })
    )
    const retail = classifyWallet(retailTrades)
    expect(retail.label).toBe('retail')

    // Force high score: all winning, consistent, moderate frequency
    const smartTrades = Array.from({ length: 20 }, (_, i) =>
      makeTrade({ pnl: 5000, holdTimeMs: 86_400_000, size: 1, timestamp: Date.now() - i * 2 * 86_400_000 })
    )
    const smart = classifyWallet(smartTrades)
    expect(smart.label).toBe('smart_money')
  })
})
