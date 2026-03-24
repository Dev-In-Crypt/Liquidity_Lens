import http from 'http'
import express from 'express'
import axios from 'axios'
import { config } from './config'
import routes from './api/routes'
import { initSocketServer } from './api/socketServer'
import { wsClient } from './ingestion/wsClient'
import { restPoller } from './ingestion/restPoller'
import { setCurrentPrice, setCurrentPriceForMarket, setHeatmapBucketsForMarket, setWalletScore } from './engine/store'
import { buildHeatmap, SUPPORTED_MARKETS } from './engine/liqCalculator'
import { MOCK_POSITIONS, MOCK_WALLET_SCORES, MOCK_CURRENT_PRICE } from './mock/mockData'

// Mock prices per market (match current real market prices for chart alignment)
const MOCK_PRICES: Record<string, number> = {
  BTC: MOCK_CURRENT_PRICE, // ~$71,000
  ETH: 2100,
  SOL: 85,
}

async function verifyBuilderCode(): Promise<void> {
  if (!config.builderCode || config.builderCode === 'your_builder_code_here') {
    console.warn('[Builder] BUILDER_CODE not set — skipping verification')
    return
  }
  try {
    const res = await axios.get(`${config.rest.url}/builder/overview`, {
      params: { builder_code: config.builderCode },
      timeout: 5000,
    })
    console.log('[Builder] Builder code verified:', JSON.stringify(res.data))
  } catch (err) {
    console.warn('[Builder] Could not verify builder code:', (err as Error).message)
  }
}

async function main(): Promise<void> {
  const app = express()
  app.use(express.json())

  const httpServer = http.createServer(app)

  // 1. Init Socket.io
  initSocketServer(httpServer)

  // 2. Register API routes
  app.use('/api', routes)

  // 3. Verify builder code (Phase 9)
  await verifyBuilderCode()

  if (config.useMockData) {
    // Mock mode: bypass WS and REST, seed store with static data
    console.log('[Server] USE_MOCK_DATA=true — running with mock data')

    // Set prices for all markets
    for (const market of SUPPORTED_MARKETS) {
      setCurrentPriceForMarket(market, MOCK_PRICES[market] ?? 0)
    }
    // backward-compat
    setCurrentPrice(MOCK_CURRENT_PRICE)

    // Set wallet scores
    for (const score of MOCK_WALLET_SCORES) {
      setWalletScore(score.address, score)
    }

    // Build per-market heatmaps from filtered positions
    for (const market of SUPPORTED_MARKETS) {
      const marketPositions = MOCK_POSITIONS.filter(
        (p) => p.symbol.toUpperCase() === market
      )
      const marketPrice = MOCK_PRICES[market] ?? 0
      const buckets = buildHeatmap(marketPositions, MOCK_WALLET_SCORES, marketPrice, market)
      setHeatmapBucketsForMarket(market, buckets)
      console.log(`[Mock] ${market}: ${marketPositions.length} positions → ${buckets.length} buckets @ $${marketPrice}`)
    }
  } else {
    // 4. Start WebSocket client
    wsClient.start()

    // 5. Start REST poller
    restPoller.start()
  }

  // 6. Listen
  httpServer.listen(config.port, () => {
    console.log(`[Server] LiquidityLens backend running on port ${config.port}`)
  })
}

main().catch((err) => {
  console.error('[Server] Fatal error:', err)
  process.exit(1)
})
