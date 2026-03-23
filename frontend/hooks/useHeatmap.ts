'use client'

import { useEffect, useState } from 'react'
import { getSocket } from '../lib/socketClient'

export interface HeatmapBucket {
  priceLevel: number
  totalLiqUsd: number
  longLiqUsd: number
  shortLiqUsd: number
  smartMoneyPct: number
  retailPct: number
  walletCount: number
  isDangerZone: boolean
}

interface HeatmapState {
  buckets: HeatmapBucket[]
  currentPrice: number
  loading: boolean
  dangerZoneBuckets: HeatmapBucket[]
}

interface SocketPayload {
  market?: string
  buckets: HeatmapBucket[]
  currentPrice: number
}

export function useHeatmap(market = 'BTC'): HeatmapState {
  const [buckets, setBuckets] = useState<HeatmapBucket[]>([])
  const [currentPrice, setCurrentPrice] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setBuckets([])
    setCurrentPrice(0)

    // Fetch initial state via REST
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_REST}/heatmap?market=${market}`)
      .then((r) => r.json())
      .then((data) => {
        setBuckets(data.buckets ?? [])
        setCurrentPrice(data.currentPrice ?? 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    const socket = getSocket()

    const applySnapshot = (data: SocketPayload) => {
      if (data.market && data.market !== market) return
      setCurrentPrice(data.currentPrice)
      setBuckets([...(data.buckets ?? [])].sort((a, b) => a.priceLevel - b.priceLevel))
    }

    const applyUpdate = (data: SocketPayload) => {
      if (data.market && data.market !== market) return
      setCurrentPrice(data.currentPrice)
      setBuckets((prev) => {
        const map = new Map(prev.map((b) => [b.priceLevel, b]))
        for (const bucket of data.buckets) {
          map.set(bucket.priceLevel, bucket)
        }
        return Array.from(map.values()).sort((a, b) => a.priceLevel - b.priceLevel)
      })
    }

    socket.on('heatmap:snapshot', applySnapshot)
    socket.on('heatmap:update', applyUpdate)

    return () => {
      socket.off('heatmap:snapshot', applySnapshot)
      socket.off('heatmap:update', applyUpdate)
    }
  }, [market])

  const dangerZoneBuckets = buckets.filter((b) => b.isDangerZone)

  return { buckets, currentPrice, loading, dangerZoneBuckets }
}
