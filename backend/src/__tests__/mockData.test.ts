import {
  MOCK_POSITIONS,
  MOCK_WALLET_SCORES,
  MOCK_CURRENT_PRICE,
  getMockTradeHistory,
} from '../mock/mockData'

describe('MOCK_POSITIONS', () => {
  it('contains BTC, ETH and SOL positions', () => {
    const symbols = new Set(MOCK_POSITIONS.map((p) => p.symbol))
    expect(symbols).toContain('BTC')
    expect(symbols).toContain('ETH')
    expect(symbols).toContain('SOL')
  })

  it('all positions have positive entryPrice and size', () => {
    for (const p of MOCK_POSITIONS) {
      expect(p.entryPrice).toBeGreaterThan(0)
      expect(p.size).toBeGreaterThan(0)
    }
  })

  it('all positions have valid side', () => {
    for (const p of MOCK_POSITIONS) {
      expect(['long', 'short']).toContain(p.side)
    }
  })

  it('all positions have positive leverage', () => {
    for (const p of MOCK_POSITIONS) {
      expect(p.leverage).toBeGreaterThan(0)
    }
  })

  it('all positions have a non-empty account address', () => {
    for (const p of MOCK_POSITIONS) {
      expect(p.account).toBeTruthy()
    }
  })

  it('ETH prices are in realistic range', () => {
    const ethPositions = MOCK_POSITIONS.filter((p) => p.symbol === 'ETH')
    expect(ethPositions.length).toBeGreaterThan(0)
    for (const p of ethPositions) {
      expect(p.entryPrice).toBeGreaterThan(500)
      expect(p.entryPrice).toBeLessThan(10000)
    }
  })

  it('SOL prices are in realistic range', () => {
    const solPositions = MOCK_POSITIONS.filter((p) => p.symbol === 'SOL')
    expect(solPositions.length).toBeGreaterThan(0)
    for (const p of solPositions) {
      expect(p.entryPrice).toBeGreaterThan(1)
      expect(p.entryPrice).toBeLessThan(1000)
    }
  })
})

describe('MOCK_WALLET_SCORES', () => {
  it('covers all accounts used in MOCK_POSITIONS', () => {
    const scoreAddresses = new Set(MOCK_WALLET_SCORES.map((s) => s.address))
    for (const p of MOCK_POSITIONS) {
      expect(scoreAddresses.has(p.account)).toBe(true)
    }
  })

  it('all scores have valid labels', () => {
    for (const s of MOCK_WALLET_SCORES) {
      expect(['smart_money', 'retail', 'unknown']).toContain(s.label)
    }
  })

  it('score values are in 0-100 range', () => {
    for (const s of MOCK_WALLET_SCORES) {
      expect(s.score).toBeGreaterThanOrEqual(0)
      expect(s.score).toBeLessThanOrEqual(100)
    }
  })

  it('smart_money wallets have higher scores than retail on average', () => {
    const smartAvg = MOCK_WALLET_SCORES
      .filter((s) => s.label === 'smart_money')
      .reduce((sum, s) => sum + s.score, 0) / MOCK_WALLET_SCORES.filter((s) => s.label === 'smart_money').length
    const retailAvg = MOCK_WALLET_SCORES
      .filter((s) => s.label === 'retail')
      .reduce((sum, s) => sum + s.score, 0) / MOCK_WALLET_SCORES.filter((s) => s.label === 'retail').length
    expect(smartAvg).toBeGreaterThan(retailAvg)
  })

  it('contains both ETH and SOL wallet entries', () => {
    const ethWallets = MOCK_WALLET_SCORES.filter((s) => s.address.startsWith('eth_'))
    const solWallets = MOCK_WALLET_SCORES.filter((s) => s.address.startsWith('sol_'))
    expect(ethWallets.length).toBeGreaterThan(0)
    expect(solWallets.length).toBeGreaterThan(0)
  })
})

describe('MOCK_CURRENT_PRICE', () => {
  it('is a positive number in BTC range', () => {
    expect(MOCK_CURRENT_PRICE).toBeGreaterThan(10000)
  })
})

describe('getMockTradeHistory', () => {
  it('returns empty array for unknown account', () => {
    expect(getMockTradeHistory('totally_unknown')).toHaveLength(0)
  })

  it('returns trades for known retail account', () => {
    const trades = getMockTradeHistory('retail1')
    expect(trades.length).toBeGreaterThan(0)
  })

  it('returns trades for known smart money account', () => {
    const trades = getMockTradeHistory('smart1')
    expect(trades.length).toBeGreaterThan(0)
  })

  it('BTC account trades have BTC symbol', () => {
    const trades = getMockTradeHistory('retail1')
    for (const t of trades) {
      expect(t.symbol).toBe('BTC')
    }
  })

  it('ETH account trades have ETH symbol', () => {
    const trades = getMockTradeHistory('eth_retail1')
    expect(trades.length).toBeGreaterThan(0)
    for (const t of trades) {
      expect(t.symbol).toBe('ETH')
    }
  })

  it('SOL account trades have SOL symbol', () => {
    const trades = getMockTradeHistory('sol_retail1')
    expect(trades.length).toBeGreaterThan(0)
    for (const t of trades) {
      expect(t.symbol).toBe('SOL')
    }
  })

  it('smart money trades have holdTimeMs > 0', () => {
    const trades = getMockTradeHistory('smart1')
    const totalHold = trades.reduce((s, t) => s + t.holdTimeMs, 0)
    expect(totalHold).toBeGreaterThan(0)
  })

  it('all trades have valid side', () => {
    const trades = getMockTradeHistory('retail1')
    for (const t of trades) {
      expect(['long', 'short']).toContain(t.side)
    }
  })

  it('trade count does not exceed score tradeCount', () => {
    const trades = getMockTradeHistory('retail1')
    expect(trades.length).toBeLessThanOrEqual(10)
  })
})
