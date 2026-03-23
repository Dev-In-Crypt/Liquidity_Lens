'use client'

import { useEffect, useState } from 'react'

export interface WalletScore {
  address: string
  label: 'smart_money' | 'retail' | 'unknown'
  score: number
  winRate: number
  avgHoldTimeMs: number
  avgPositionSizeUsd: number
  tradeCount: number
  lastUpdated: number
}

interface WalletState {
  data: WalletScore | null
  loading: boolean
  error: string | null
}

export function useWallet(address: string | null): WalletState {
  const [data, setData] = useState<WalletScore | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address) {
      setData(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    fetch(`${process.env.NEXT_PUBLIC_BACKEND_REST}/wallet/${address}`)
      .then((r) => {
        if (!r.ok) throw new Error('not_found')
        return r.json()
      })
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setData(null)
        setLoading(false)
      })
  }, [address])

  return { data, loading, error }
}
