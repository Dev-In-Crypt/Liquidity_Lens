import { Router, Request, Response } from 'express'
import {
  getHeatmapBucketsForMarket,
  getCurrentPriceForMarket,
  getWalletScore,
  getAllWalletScores,
} from '../engine/store'
import { SUPPORTED_MARKETS } from '../engine/liqCalculator'

const router = Router()

router.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json')
  next()
})

router.get('/heatmap', (req: Request, res: Response) => {
  const market = (
    typeof req.query.market === 'string' ? req.query.market : 'BTC'
  ).toUpperCase()

  const validMarket = SUPPORTED_MARKETS.includes(market) ? market : 'BTC'

  res.json({
    market: validMarket,
    buckets: getHeatmapBucketsForMarket(validMarket),
    currentPrice: getCurrentPriceForMarket(validMarket),
    timestamp: Date.now(),
  })
})

router.get('/wallet/:address', (req: Request, res: Response) => {
  const address = Array.isArray(req.params.address) ? req.params.address[0] : req.params.address
  const score = getWalletScore(address)
  if (!score) {
    res.status(404).json({ error: 'not_found' })
    return
  }
  res.json(score)
})

router.get('/health', (_req: Request, res: Response) => {
  const health: Record<string, unknown> = { status: 'ok' }
  for (const market of SUPPORTED_MARKETS) {
    health[`price${market}`] = getCurrentPriceForMarket(market)
    health[`buckets${market}`] = getHeatmapBucketsForMarket(market).length
  }
  health.walletCount = getAllWalletScores().length
  res.json(health)
})

export default router
