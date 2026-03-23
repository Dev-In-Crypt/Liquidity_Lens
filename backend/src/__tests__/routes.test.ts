import request from 'supertest'
import express from 'express'
import router from '../api/routes'
import * as store from '../engine/store'
import { HeatmapBucket, WalletScore } from '../types'

// Mock store and liqCalculator
jest.mock('../engine/store')
jest.mock('../engine/liqCalculator', () => ({
  SUPPORTED_MARKETS: ['BTC', 'ETH', 'SOL'],
}))

const mockedStore = store as jest.Mocked<typeof store>

const app = express()
app.use(express.json())
app.use('/api', router)

function makeBucket(priceLevel: number, isDangerZone = false): HeatmapBucket {
  return { priceLevel, totalLiqUsd: 100000, longLiqUsd: 60000, shortLiqUsd: 40000, smartMoneyPct: 40, retailPct: 60, walletCount: 3, isDangerZone }
}

function makeScore(address: string): WalletScore {
  return { address, label: 'smart_money', score: 75, winRate: 0.7, avgHoldTimeMs: 86_400_000, avgPositionSizeUsd: 50000, tradeCount: 20, lastUpdated: Date.now() }
}

describe('GET /api/heatmap', () => {
  beforeEach(() => {
    mockedStore.getHeatmapBucketsForMarket.mockReturnValue([makeBucket(68000)])
    mockedStore.getCurrentPriceForMarket.mockReturnValue(68500)
    mockedStore.getAllWalletScores.mockReturnValue([])
  })

  it('returns BTC heatmap by default', async () => {
    const res = await request(app).get('/api/heatmap')
    expect(res.status).toBe(200)
    expect(res.body.market).toBe('BTC')
    expect(res.body.buckets).toHaveLength(1)
    expect(res.body.currentPrice).toBe(68500)
    expect(res.body.timestamp).toBeDefined()
    expect(mockedStore.getHeatmapBucketsForMarket).toHaveBeenCalledWith('BTC')
  })

  it('returns ETH heatmap when market=ETH', async () => {
    mockedStore.getHeatmapBucketsForMarket.mockReturnValue([makeBucket(2100)])
    mockedStore.getCurrentPriceForMarket.mockReturnValue(2100)
    const res = await request(app).get('/api/heatmap?market=ETH')
    expect(res.status).toBe(200)
    expect(res.body.market).toBe('ETH')
    expect(mockedStore.getHeatmapBucketsForMarket).toHaveBeenCalledWith('ETH')
  })

  it('returns SOL heatmap when market=SOL', async () => {
    const res = await request(app).get('/api/heatmap?market=SOL')
    expect(res.status).toBe(200)
    expect(res.body.market).toBe('SOL')
    expect(mockedStore.getHeatmapBucketsForMarket).toHaveBeenCalledWith('SOL')
  })

  it('falls back to BTC for invalid market', async () => {
    const res = await request(app).get('/api/heatmap?market=DOGE')
    expect(res.status).toBe(200)
    expect(res.body.market).toBe('BTC')
    expect(mockedStore.getHeatmapBucketsForMarket).toHaveBeenCalledWith('BTC')
  })

  it('is case-insensitive for market param', async () => {
    const res = await request(app).get('/api/heatmap?market=eth')
    expect(res.status).toBe(200)
    expect(res.body.market).toBe('ETH')
  })

  it('sets CORS header', async () => {
    const res = await request(app).get('/api/heatmap')
    expect(res.headers['access-control-allow-origin']).toBe('*')
  })
})

describe('GET /api/wallet/:address', () => {
  it('returns wallet score for known address', async () => {
    const score = makeScore('knownAddr')
    mockedStore.getWalletScore.mockReturnValue(score)
    const res = await request(app).get('/api/wallet/knownAddr')
    expect(res.status).toBe(200)
    expect(res.body.address).toBe('knownAddr')
    expect(res.body.label).toBe('smart_money')
    expect(res.body.score).toBe(75)
  })

  it('returns 404 for unknown address', async () => {
    mockedStore.getWalletScore.mockReturnValue(undefined)
    const res = await request(app).get('/api/wallet/unknownAddr')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('not_found')
  })

  it('passes the address to getWalletScore', async () => {
    mockedStore.getWalletScore.mockReturnValue(undefined)
    await request(app).get('/api/wallet/SomeAddress123')
    expect(mockedStore.getWalletScore).toHaveBeenCalledWith('SomeAddress123')
  })
})

describe('GET /api/health', () => {
  beforeEach(() => {
    mockedStore.getCurrentPriceForMarket.mockImplementation((m) => ({ BTC: 68000, ETH: 2100, SOL: 85 }[m] ?? 0))
    mockedStore.getHeatmapBucketsForMarket.mockImplementation((m) => m === 'BTC' ? [makeBucket(65000)] : [])
    mockedStore.getAllWalletScores.mockReturnValue([makeScore('a'), makeScore('b')])
  })

  it('returns status ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('includes per-market prices', async () => {
    const res = await request(app).get('/api/health')
    expect(res.body.priceBTC).toBe(68000)
    expect(res.body.priceETH).toBe(2100)
    expect(res.body.priceSOL).toBe(85)
  })

  it('includes per-market bucket counts', async () => {
    const res = await request(app).get('/api/health')
    expect(res.body.bucketsBTC).toBe(1)
    expect(res.body.bucketsETH).toBe(0)
  })

  it('includes wallet count', async () => {
    const res = await request(app).get('/api/health')
    expect(res.body.walletCount).toBe(2)
  })
})
