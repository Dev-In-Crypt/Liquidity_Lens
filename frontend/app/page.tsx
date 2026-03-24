'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useHeatmap } from '../hooks/useHeatmap'
import HeatmapChart from '../components/HeatmapChart'
import PriceChart from '../components/PriceChart'
import DangerZoneBanner from '../components/DangerZoneBanner'
import WalletLookup from '../components/WalletLookup'
import { MARKETS, Market } from '../components/MarketSelector'

const PRICE_DECIMALS: Record<string, number> = { BTC: 0, ETH: 2, SOL: 2 }

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function dangerColor(smartPct: number): string {
  if (smartPct >= 60) return 'var(--danger-red)'
  if (smartPct <= 40) return 'var(--danger-orange)'
  return 'var(--danger-yellow)'
}

export default function Dashboard() {
  const [market, setMarket] = useState<Market>('BTC')
  const { buckets, currentPrice, loading, dangerZoneBuckets } = useHeatmap(market)
  const [priceMin, setPriceMin] = useState(0)
  const [priceMax, setPriceMax] = useState(0)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartHeight, setChartHeight] = useState(500)

  useEffect(() => {
    const el = chartContainerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      setChartHeight(entries[0].contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handlePriceRangeChange = useCallback((min: number, max: number) => {
    setPriceMin(min)
    setPriceMax(max)
  }, [])

  const handleMarketChange = useCallback((m: Market) => {
    setMarket(m)
    setPriceMin(0)
    setPriceMax(0)
  }, [])

  const decimals = PRICE_DECIMALS[market] ?? 2
  const totalAtRisk = buckets.reduce((s, b) => s + b.totalLiqUsd, 0)
  const topDangerLevels = [...dangerZoneBuckets]
    .sort((a, b) => b.totalLiqUsd - a.totalLiqUsd)
    .slice(0, 5)

  return (
    <main
      style={{
        background: 'var(--bg-deep)',
        color: 'var(--text-primary)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* ── TOPBAR ── */}
      <header
        style={{
          height: 44,
          background: 'var(--bg-base)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 24 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--accent-teal)',
              boxShadow: '0 0 8px var(--accent-teal-glow)',
              animation: 'logoPulse 2s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '-0.3px',
            }}
          >
            Liquidity Lens
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              background: 'var(--accent-teal-dim)',
              color: 'var(--accent-teal)',
              border: '1px solid rgba(0,212,170,0.3)',
              borderRadius: 3,
              padding: '1px 5px',
              letterSpacing: '0.5px',
            }}
          >
            BETA
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 16px' }} />

        {/* Market tabs */}
        <div style={{ display: 'flex', gap: 2 }}>
          {MARKETS.map((m) => (
            <button
              key={m}
              onClick={() => handleMarketChange(m)}
              style={{
                padding: '5px 14px',
                borderRadius: 5,
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                background: m === market ? 'var(--bg-card)' : 'transparent',
                color: m === market ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: m === market ? '1px solid var(--border-bright)' : '1px solid transparent',
                fontFamily: 'var(--font-mono)',
                transition: 'all 0.15s',
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Right: price + live */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
          {currentPrice > 0 && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{market}/USD</span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: '-0.5px',
                }}
              >
                ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: decimals })}
              </span>
            </div>
          )}
          <div
            title={loading ? 'Connecting...' : 'Live'}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: loading ? 'var(--danger-yellow)' : 'var(--green)',
              animation: 'livePulse 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </header>

      {/* ── DANGER BANNER ── */}
      <DangerZoneBanner dangerZoneBuckets={dangerZoneBuckets} />

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Chart Area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          {/* Chart header */}
          <div
            style={{
              height: 38,
              background: 'var(--bg-panel)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 14px',
              gap: 10,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '1px',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
              }}
            >
              {market}/USD — Liquidation Heatmap
            </span>
            {[
              { label: 'Price Levels', value: String(buckets.length), color: 'var(--text-primary)' },
              { label: 'Danger Zones', value: String(dangerZoneBuckets.length), color: dangerZoneBuckets.length > 0 ? 'var(--danger-red)' : 'var(--text-primary)' },
              { label: 'Total at Risk', value: fmtUsd(totalAtRisk), color: 'var(--text-primary)' },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 10,
                  color: 'var(--text-secondary)',
                  padding: '3px 8px',
                  background: 'var(--bg-card)',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                }}
              >
                {s.label}&nbsp;<span style={{ color: s.color, fontWeight: 500 }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Chart container — heatmap sidebar + price chart */}
          <div ref={chartContainerRef} style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {chartHeight > 0 && (
              <>
                <HeatmapChart
                  buckets={buckets}
                  currentPrice={currentPrice}
                  visiblePriceMin={priceMin}
                  visiblePriceMax={priceMax}
                  height={chartHeight}
                />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <PriceChart
                    market={market}
                    height={chartHeight}
                    onPriceRangeChange={handlePriceRangeChange}
                    buckets={buckets}
                  />
                </div>
              </>
            )}
          </div>

          {/* Legend bar */}
          <div
            style={{
              height: 32,
              background: 'var(--bg-panel)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              gap: 18,
              flexShrink: 0,
            }}
          >
            {[
              { color: 'var(--danger-red)', label: 'Danger — Smart money dominant' },
              { color: 'var(--danger-orange)', label: 'Danger — Retail dominant' },
              { color: 'var(--danger-yellow)', label: 'Danger — Mixed' },
              { color: 'rgba(74,85,104,0.6)', label: 'Out of danger zone' },
            ].map((item) => (
              <div
                key={item.label}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-secondary)' }}
              >
                <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                {item.label}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-secondary)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--smart-blue)', flexShrink: 0 }} />
              Smart money portion
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div
          style={{
            width: 280,
            background: 'var(--bg-panel)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {/* Wallet Profiler */}
          <WalletLookup />

          {/* Heatmap Stats */}
          <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              Heatmap Stats
              <span
                style={{
                  fontSize: 9,
                  background: 'var(--accent-teal-dim)',
                  color: 'var(--accent-teal)',
                  borderRadius: 3,
                  padding: '1px 5px',
                  fontWeight: 500,
                  letterSpacing: 0,
                }}
              >
                LIVE
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <StatCard label="PRICE LEVELS" value={String(buckets.length)} sub="active buckets" valueColor="var(--accent-teal)" />
              <StatCard label="DANGER ZONES" value={String(dangerZoneBuckets.length)} sub="within 2% price" valueColor={dangerZoneBuckets.length > 0 ? 'var(--danger-red)' : 'var(--text-primary)'} />
              <div style={{ gridColumn: '1 / -1' }}>
                <StatCard label="TOTAL AT RISK" value={fmtUsd(totalAtRisk)} sub="" valueColor="var(--text-primary)" />
              </div>
            </div>
          </div>

          {/* Top Danger Levels */}
          {topDangerLevels.length > 0 && (
            <div style={{ padding: 14 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  marginBottom: 12,
                }}
              >
                Top Danger Levels
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {topDangerLevels.map((b) => {
                  const color = dangerColor(b.smartMoneyPct)
                  const dist =
                    currentPrice > 0
                      ? ((Math.abs(b.priceLevel - currentPrice) / currentPrice) * 100).toFixed(1)
                      : '—'
                  return (
                    <div
                      key={b.priceLevel}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 3,
                          borderRadius: 2,
                          alignSelf: 'stretch',
                          background: color,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                            ${b.priceLevel.toLocaleString()}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                            {fmtUsd(b.totalLiqUsd)}
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9 }}>
                            <span style={{ color: 'var(--accent-teal)' }}>
                              S:{b.smartMoneyPct.toFixed(0)}%
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>/</span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              R:{b.retailPct.toFixed(0)}%
                            </span>
                          </div>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                            {dist}% away
                          </span>
                        </div>
                        <div
                          style={{
                            height: 3,
                            borderRadius: 2,
                            background: 'var(--bg-hover)',
                            marginTop: 4,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              background: color,
                              borderRadius: 2,
                              width: `${b.smartMoneyPct}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function StatCard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string
  value: string
  sub: string
  valueColor: string
}) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 7,
        padding: '10px 12px',
      }}
    >
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 600,
          color: valueColor,
          letterSpacing: '-0.5px',
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>
      )}
    </div>
  )
}
