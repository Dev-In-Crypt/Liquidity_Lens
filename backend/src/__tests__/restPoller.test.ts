import axios from 'axios'
import { RestPoller } from '../ingestion/restPoller'

jest.mock('axios')
jest.mock('../engine/store')
jest.mock('../engine/liqCalculator', () => ({
  SUPPORTED_MARKETS: ['BTC', 'ETH', 'SOL'],
  rebuildHeatmap: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../engine/walletClassifier', () => ({
  classifyWallet: jest.fn().mockReturnValue({
    address: '', label: 'retail', score: 30, winRate: 0.3,
    avgHoldTimeMs: 0, avgPositionSizeUsd: 10000, tradeCount: 5, lastUpdated: Date.now(),
  }),
}))

const mockedAxios = axios as jest.Mocked<typeof axios>

function makeRawPosition(overrides: Record<string, unknown> = {}) {
  return {
    symbol: 'BTC',
    side: 'long',
    amount: '0.1',
    entry_price: '50000',
    margin: '500',
    funding: '0',
    isolated: true,
    created_at: 1000000,
    updated_at: 1000000,
    last_order_id: 1,
    ...overrides,
  }
}

function makeRawTrade(overrides: Record<string, unknown> = {}) {
  return {
    history_id: `trade_${Math.random()}`,
    order_id: 'ord1',
    symbol: 'BTC',
    amount: '0.1',
    price: '52000',
    entry_price: '50000',
    fee: '10',
    pnl: '2000',
    event_type: 'trade',
    side: 'close_long',
    cause: 'user',
    created_at: 5000,
    ...overrides,
  }
}

describe('RestPoller.fetchPositionsForAccount — leverage calculation', () => {
  let poller: RestPoller

  beforeEach(() => {
    poller = new RestPoller()
  })

  it('calculates leverage from position value and margin', async () => {
    // amount=0.1, entry_price=50000 → posValue=5000, margin=500 → leverage=10
    mockedAxios.get.mockResolvedValueOnce({ data: [makeRawPosition()] })
    const positions = await poller.fetchPositionsForAccount('addr1')
    expect(positions[0].leverage).toBe(10)
  })

  it('calculates leverage=5 when margin is double the default', async () => {
    // posValue=5000, margin=1000 → leverage=5
    mockedAxios.get.mockResolvedValueOnce({
      data: [makeRawPosition({ margin: '1000' })],
    })
    const positions = await poller.fetchPositionsForAccount('addr1')
    expect(positions[0].leverage).toBe(5)
  })

  it('calculates leverage=20 for high-leverage position', async () => {
    // posValue=5000, margin=250 → leverage=20
    mockedAxios.get.mockResolvedValueOnce({
      data: [makeRawPosition({ margin: '250' })],
    })
    const positions = await poller.fetchPositionsForAccount('addr1')
    expect(positions[0].leverage).toBe(20)
  })

  it('falls back to leverage=10 when margin is 0', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [makeRawPosition({ margin: '0' })],
    })
    const positions = await poller.fetchPositionsForAccount('addr1')
    expect(positions[0].leverage).toBe(10)
  })

  it('never returns leverage < 1', async () => {
    // absurdly large margin
    mockedAxios.get.mockResolvedValueOnce({
      data: [makeRawPosition({ amount: '0.001', entry_price: '1', margin: '100000' })],
    })
    const positions = await poller.fetchPositionsForAccount('addr1')
    expect(positions[0].leverage).toBeGreaterThanOrEqual(1)
  })

  it('maps bid side to long', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [makeRawPosition({ side: 'bid' })],
    })
    const positions = await poller.fetchPositionsForAccount('addr1')
    expect(positions[0].side).toBe('long')
  })

  it('maps ask/other side to short', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [makeRawPosition({ side: 'short' })],
    })
    const positions = await poller.fetchPositionsForAccount('addr1')
    expect(positions[0].side).toBe('short')
  })

  it('returns empty array on API error', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))
    const positions = await poller.fetchPositionsForAccount('addr1')
    expect(positions).toEqual([])
  })

  it('handles data.data nested response format', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { data: [makeRawPosition()] },
    })
    const positions = await poller.fetchPositionsForAccount('addr1')
    expect(positions).toHaveLength(1)
  })
})

describe('RestPoller.fetchTradeHistory — holdTimeMs calculation', () => {
  let poller: RestPoller

  beforeEach(() => {
    jest.clearAllMocks()
    poller = new RestPoller()
  })

  it('calculates holdTimeMs from open/close pair (seconds timestamps)', async () => {
    // Use distinct amounts so we can identify which trade is which in results
    const openTrade  = makeRawTrade({ history_id: 'open1',  side: 'open_long',  amount: '0.2', created_at: 1000 })
    const closeTrade = makeRawTrade({ history_id: 'close1', side: 'close_long', amount: '0.1', created_at: 5000 })
    mockedAxios.get.mockResolvedValueOnce({ data: { data: [openTrade, closeTrade] } })
    const trades = await poller.fetchTradeHistory('addr1', 10)
    // close trade has amount=0.1, holdTimeMap.get('close1') = toMs(5000)-toMs(1000) = 4_000_000
    const close = trades.find((t) => t.size === 0.1)!
    expect(close.holdTimeMs).toBe(4_000_000)
  })

  it('calculates holdTimeMs from open/close pair (milliseconds timestamps)', async () => {
    const openTrade  = makeRawTrade({ history_id: 'open2',  side: 'open_long',  amount: '0.3', created_at: 1_742_600_000_000 })
    const closeTrade = makeRawTrade({ history_id: 'close2', side: 'close_long', amount: '0.15', created_at: 1_742_600_010_000 })
    mockedAxios.get.mockResolvedValueOnce({ data: { data: [openTrade, closeTrade] } })
    const trades = await poller.fetchTradeHistory('addr1', 10)
    // both > 1e12 → stay as ms, diff = 10_000
    const close = trades.find((t) => t.size === 0.15)!
    expect(close.holdTimeMs).toBe(10_000)
  })

  it('sets holdTimeMs=0 when no matching open trade', async () => {
    const closeTrade = makeRawTrade({ history_id: 'close3', side: 'close_long', created_at: 5000 })
    mockedAxios.get.mockResolvedValueOnce({ data: { data: [closeTrade] } })
    const trades = await poller.fetchTradeHistory('addr1', 10)
    expect(trades[0].holdTimeMs).toBe(0)
  })

  it('matches correct open trade by symbol (ignores ETH open for BTC close)', async () => {
    const openBTC  = makeRawTrade({ history_id: 'o_btc', side: 'open_long',  symbol: 'BTC', amount: '0.05', created_at: 1000 })
    const openETH  = makeRawTrade({ history_id: 'o_eth', side: 'open_long',  symbol: 'ETH', amount: '5',    created_at: 1000 })
    const closeBTC = makeRawTrade({ history_id: 'c_btc', side: 'close_long', symbol: 'BTC', amount: '0.05', created_at: 3000 })
    mockedAxios.get.mockResolvedValueOnce({ data: { data: [openBTC, openETH, closeBTC] } })
    const trades = await poller.fetchTradeHistory('addr1', 10)
    // Only BTC close should have holdTimeMs = toMs(3000)-toMs(1000) = 2_000_000
    const closeBTCResult = trades.find((t) => t.symbol === 'BTC' && t.holdTimeMs > 0)
    expect(closeBTCResult?.holdTimeMs).toBe(2_000_000)
    // ETH open should have holdTimeMs=0 (no matching close)
    const ethResult = trades.find((t) => t.symbol === 'ETH')
    expect(ethResult?.holdTimeMs).toBe(0)
  })

  it('returns empty array on API error', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('timeout'))
    const trades = await poller.fetchTradeHistory('addr1', 10)
    expect(trades).toEqual([])
  })

  it('normalizes timestamp to milliseconds in returned TradeRecord', async () => {
    const trade = makeRawTrade({ created_at: 1742600000 }) // seconds
    mockedAxios.get.mockResolvedValueOnce({ data: { data: [trade] } })
    const trades = await poller.fetchTradeHistory('addr1', 10)
    // 1742600000 < 1e12 → * 1000
    expect(trades[0].timestamp).toBe(1_742_600_000_000)
  })
})

describe('RestPoller.addAccount', () => {
  let poller: RestPoller

  beforeEach(() => {
    jest.clearAllMocks()
    poller = new RestPoller()
  })

  it('fetchAllPositions returns empty when no accounts registered', async () => {
    const positions = await poller.fetchAllPositions()
    expect(positions).toEqual([])
  })

  it('fetchAllPositions fetches for registered account', async () => {
    poller.addAccount('myAddr')
    mockedAxios.get.mockResolvedValueOnce({ data: [makeRawPosition()] })
    const positions = await poller.fetchAllPositions()
    expect(positions).toHaveLength(1)
  })

  it('adding the same account twice only fetches once', async () => {
    poller.addAccount('dupAddr')
    poller.addAccount('dupAddr')
    mockedAxios.get.mockResolvedValueOnce({ data: [] })
    await poller.fetchAllPositions()
    expect(mockedAxios.get).toHaveBeenCalledTimes(1)
  })
})
