'use client'

import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'

const LABEL_CONFIG = {
  smart_money: {
    text: 'SMART MONEY',
    color: 'var(--accent-teal)',
    bg: 'var(--accent-teal-dim)',
    border: 'rgba(0,212,170,0.3)',
  },
  retail: {
    text: 'RETAIL',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.25)',
  },
  unknown: {
    text: 'UNKNOWN',
    color: 'var(--text-muted)',
    bg: 'rgba(74,85,104,0.2)',
    border: 'rgba(74,85,104,0.3)',
  },
}

function fmtDuration(ms: number): string {
  if (ms <= 0) return 'N/A'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

function truncateAddr(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

export default function WalletLookup() {
  const [input, setInput] = useState('')
  const [address, setAddress] = useState<string | null>(null)
  const { data, loading, error } = useWallet(address)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (trimmed) setAddress(trimmed)
  }

  const label = data ? LABEL_CONFIG[data.label] : null

  return (
    <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
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
        Wallet Profiler
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter wallet address..."
          style={{
            flex: 1,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '7px 10px',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            background: 'var(--accent-teal)',
            color: '#000',
            border: 'none',
            borderRadius: 6,
            padding: '7px 12px',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Look up
        </button>
      </form>

      {loading && (
        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 8 }}>Loading...</p>
      )}
      {error && !loading && (
        <p style={{ color: 'var(--danger-red)', fontSize: 11, marginTop: 8 }}>
          Wallet not found or not yet classified.
        </p>
      )}

      {data && !loading && label && (
        <div
          style={{
            marginTop: 12,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {/* Header row */}
          <div
            style={{
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
              {truncateAddr(data.address)}
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 4,
                letterSpacing: '0.5px',
                background: label.bg,
                color: label.color,
                border: `1px solid ${label.border}`,
              }}
            >
              {label.text}
            </span>
          </div>

          {/* Score bar */}
          <div style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 5 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Intelligence Score</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{data.score} / 100</span>
            </div>
            <div
              style={{ height: 4, background: 'var(--bg-hover)', borderRadius: 2, overflow: 'hidden' }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 2,
                  background: 'linear-gradient(90deg, #00d4aa 0%, #4d9de0 100%)',
                  width: `${data.score}%`,
                  transition: 'width 0.8s ease',
                }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div
            style={{ padding: '0 12px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}
          >
            {[
              { label: 'Win Rate', value: `${(data.winRate * 100).toFixed(1)}%`, green: data.winRate > 0.5 },
              { label: 'Avg Hold', value: fmtDuration(data.avgHoldTimeMs), green: false },
              { label: 'Avg Position', value: fmtUsd(data.avgPositionSizeUsd), green: false },
              { label: 'Trades', value: String(data.tradeCount), green: false },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{ background: 'var(--bg-hover)', borderRadius: 5, padding: '7px 8px' }}
              >
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>
                  {stat.label}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: stat.green ? 'var(--green)' : 'var(--text-primary)',
                  }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
