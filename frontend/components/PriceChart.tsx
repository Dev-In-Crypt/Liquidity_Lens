'use client'

import { useEffect, useRef, useCallback } from 'react'
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  CandlestickSeries,
  IPriceLine,
  Time,
  LogicalRangeChangeEventHandler,
  LineStyle,
} from 'lightweight-charts'
import { HeatmapBucket } from '../hooks/useHeatmap'

const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
}

interface Props {
  market?: string
  height?: number
  onPriceRangeChange?: (min: number, max: number) => void
  buckets?: HeatmapBucket[]
}

interface BinanceKline {
  time: number
  open: string
  high: string
  low: string
  close: string
}

function bucketLineColor(b: HeatmapBucket): string {
  if (b.isDangerZone && b.smartMoneyPct > 60) return 'rgba(239,68,68,0.65)'
  if (b.isDangerZone && b.retailPct > 60) return 'rgba(249,115,22,0.6)'
  if (b.isDangerZone) return 'rgba(251,191,36,0.55)'
  return 'rgba(148,163,184,0.25)'
}

export default function PriceChart({ market = 'BTC', height = 500, onPriceRangeChange, buckets = [] }: Props) {
  const symbol = BINANCE_SYMBOLS[market.toUpperCase()] ?? 'BTCUSDT'
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const priceLinesRef = useRef<IPriceLine[]>([])
  const candleRangeRef = useRef<{ min: number; max: number } | null>(null)
  const relevantBucketsRef = useRef<HeatmapBucket[]>([])

  const applyAutoscale = useCallback((series: ISeriesApi<'Candlestick'>) => {
    series.applyOptions({
      autoscaleInfoProvider: () => {
        const cr = candleRangeRef.current
        if (!cr) return null
        // Only expand Y-axis for liq prices within 30% of the visible candle range
        const rangeSize = cr.max - cr.min
        const expandMargin = rangeSize * 0.3
        const nearbyLiqPrices = relevantBucketsRef.current
          .map((b) => b.priceLevel)
          .filter((p) => p >= cr.min - expandMargin && p <= cr.max + expandMargin)
        const allPrices = [cr.min, cr.max, ...nearbyLiqPrices]
        return {
          priceRange: { minValue: Math.min(...allPrices), maxValue: Math.max(...allPrices) },
          margins: { above: 0.05, below: 0.1 },
        }
      },
    })
  }, [])

  const notifyRange = useCallback(
    (chart: IChartApi, series: ISeriesApi<'Candlestick'>) => {
      if (!onPriceRangeChange) return
      try {
        const logicalRange = chart.timeScale().getVisibleLogicalRange()
        if (!logicalRange) return

        const barsInfo = series.barsInLogicalRange(logicalRange)
        if (!barsInfo) return

        // Use from/to bar coordinates to approximate price range
        // lightweight-charts v5 exposes coordinateToPrice
        const timeScale = chart.timeScale()
        const from = timeScale.logicalToCoordinate(logicalRange.from)
        const to = timeScale.logicalToCoordinate(logicalRange.to)

        if (from === null || to === null) return

        const priceScale = series.priceToCoordinate
        // Use the series coordinate-to-price conversion instead
        const coordMin = Math.max(0, containerRef.current?.clientHeight ?? height)
        const coordMax = 0

        const priceMin = series.coordinateToPrice(coordMin)
        const priceMax = series.coordinateToPrice(coordMax)

        if (priceMin !== null && priceMax !== null && priceMax > priceMin) {
          onPriceRangeChange(priceMin, priceMax)
        }
      } catch {
        // Ignore range calculation errors
      }
    },
    [onPriceRangeChange, height]
  )

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: { background: { color: '#0f172a' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      crosshair: { mode: 1 },
      timeScale: { timeVisible: true, secondsVisible: false },
    })
    chartRef.current = chart

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })
    seriesRef.current = series

    // Fetch historical candles from Binance public API
    const abortController = new AbortController()

    fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=200`,
      { signal: abortController.signal }
    )
      .then((r) => r.json())
      .then((raw: unknown[][]) => {
        if (abortController.signal.aborted) return
        const candles: CandlestickData[] = raw.map((k) => ({
          time: (k[0] as number) / 1000 as Time,
          open: parseFloat(k[1] as string),
          high: parseFloat(k[2] as string),
          low: parseFloat(k[3] as string),
          close: parseFloat(k[4] as string),
        }))
        series.setData(candles)
        chart.timeScale().fitContent()

        // Store candle price range for combined autoscale
        candleRangeRef.current = {
          min: Math.min(...candles.map((c) => c.low)),
          max: Math.max(...candles.map((c) => c.high)),
        }
        applyAutoscale(series)

        // Initial range notification
        notifyRange(chart, series)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err)
      })

    // Notify on visible range change
    const handleVisibleRangeChange: LogicalRangeChangeEventHandler = () => {
      notifyRange(chart, series)
    }
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange)

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      abortController.abort()
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange)
      ro.disconnect()
      chart.remove()
    }
  }, [symbol, market, height, notifyRange])

  // Update price lines when buckets change
  useEffect(() => {
    const series = seriesRef.current
    const chart = chartRef.current
    if (!series || !chart) return

    // Remove old lines
    for (const line of priceLinesRef.current) {
      try { series.removePriceLine(line) } catch { /* ignore */ }
    }
    priceLinesRef.current = []

    // Show all buckets (already filtered per-market by backend)
    const relevant = buckets.filter((b) => b.priceLevel > 0)
    relevantBucketsRef.current = relevant
    applyAutoscale(series)
    if (relevant.length === 0) return

    // Add new lines
    for (const b of relevant) {
      const line = series.createPriceLine({
        price: b.priceLevel,
        color: bucketLineColor(b),
        lineWidth: 1,
        lineStyle: b.isDangerZone ? LineStyle.Solid : LineStyle.Dashed,
        axisLabelVisible: b.isDangerZone,
        title: b.isDangerZone ? `LIQ $${(b.totalLiqUsd / 1000).toFixed(0)}K` : '',
      })
      priceLinesRef.current.push(line)
    }

  }, [buckets, applyAutoscale])

  return <div ref={containerRef} style={{ width: '100%', height }} />
}
