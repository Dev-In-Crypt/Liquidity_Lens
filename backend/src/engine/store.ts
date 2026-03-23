import NodeCache from 'node-cache'
import { HeatmapBucket, WalletScore } from '../types'

const cache = new NodeCache({ stdTTL: 0 })

// Wallet scores

export function setWalletScore(address: string, score: WalletScore): void {
  cache.set(`wallet:${address}`, score)
}

export function getWalletScore(address: string): WalletScore | undefined {
  return cache.get<WalletScore>(`wallet:${address}`)
}

export function getAllWalletScores(): WalletScore[] {
  const keys = cache.keys().filter((k) => k.startsWith('wallet:'))
  return keys.map((k) => cache.get<WalletScore>(k)).filter((s): s is WalletScore => s !== undefined)
}

// Per-market heatmap

export function setHeatmapBucketsForMarket(market: string, buckets: HeatmapBucket[]): void {
  cache.set(`heatmap:buckets:${market.toUpperCase()}`, buckets)
}

export function getHeatmapBucketsForMarket(market: string): HeatmapBucket[] {
  return cache.get<HeatmapBucket[]>(`heatmap:buckets:${market.toUpperCase()}`) ?? []
}

// Backward-compat aliases (BTC)
export function setHeatmapBuckets(buckets: HeatmapBucket[]): void {
  setHeatmapBucketsForMarket('BTC', buckets)
}

export function getHeatmapBuckets(): HeatmapBucket[] {
  return getHeatmapBucketsForMarket('BTC')
}

// Per-market current price

export function setCurrentPriceForMarket(market: string, price: number): void {
  cache.set(`market:price:${market.toUpperCase()}`, price)
}

export function getCurrentPriceForMarket(market: string): number {
  return cache.get<number>(`market:price:${market.toUpperCase()}`) ?? 0
}

// Backward-compat aliases (BTC)
export function setCurrentPrice(price: number): void {
  setCurrentPriceForMarket('BTC', price)
}

export function getCurrentPrice(): number {
  return getCurrentPriceForMarket('BTC')
}
