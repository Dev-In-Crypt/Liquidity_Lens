'use client'

import { useEffect, useRef, useState } from 'react'
import { HeatmapBucket } from '../hooks/useHeatmap'

interface Props {
  dangerZoneBuckets: HeatmapBucket[]
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export default function DangerZoneBanner({ dangerZoneBuckets }: Props) {
  const [visible, setVisible] = useState(false)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevKey = useRef('')

  useEffect(() => {
    if (dangerZoneBuckets.length === 0) return
    const key = dangerZoneBuckets.map((b) => b.priceLevel).join(',')
    if (key === prevKey.current) return
    prevKey.current = key
    setVisible(true)
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    dismissTimer.current = setTimeout(() => setVisible(false), 10_000)
    return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current) }
  }, [dangerZoneBuckets])

  if (!visible || dangerZoneBuckets.length === 0) return null

  const totalLiq = dangerZoneBuckets.reduce((s, b) => s + b.totalLiqUsd, 0)
  const smartPct = dangerZoneBuckets.reduce((s, b) => s + b.smartMoneyPct * b.totalLiqUsd, 0) / totalLiq
  const retailPct = dangerZoneBuckets.reduce((s, b) => s + b.retailPct * b.totalLiqUsd, 0) / totalLiq

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, rgba(255,69,96,0.12) 0%, rgba(255,140,66,0.08) 100%)',
        borderBottom: '1px solid rgba(255,69,96,0.25)',
        padding: '7px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
        animation: 'bannerIn 0.4s ease',
      }}
    >
      <span style={{ color: 'var(--danger-red)', fontSize: 13 }}>⚠</span>
      <span style={{ color: 'var(--text-primary)', fontSize: 11 }}>
        <strong style={{ color: 'var(--danger-red)' }}>Danger Zone Active</strong>{' '}
        — {fmt(totalLiq)} in liquidations within 2% of current price
      </span>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger-red)' }} />
          Smart money: {smartPct.toFixed(0)}%
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--retail-gray)' }} />
          Retail: {retailPct.toFixed(0)}%
        </div>
      </div>
      <button
        onClick={() => setVisible(false)}
        style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 6px', borderRadius: 3, fontSize: 16, lineHeight: 1, background: 'transparent', border: 'none', marginLeft: 8 }}
      >
        ×
      </button>
    </div>
  )
}
