import axios from 'axios'
import { config } from '../config'
import { PacificaPosition, TradeRecord, WalletScore } from '../types'
import { setWalletScore, getWalletScore, getAllWalletScores, setHeatmapBuckets, setCurrentPrice, getCurrentPrice, setCurrentPriceForMarket } from '../engine/store'
import { SUPPORTED_MARKETS } from '../engine/liqCalculator'
import { classifyWallet } from '../engine/walletClassifier'
import { rebuildHeatmap } from '../engine/liqCalculator'

// GET requests do not require signing per Pacifica API docs.
// Signing (tweetnacl/bs58) is reserved for future POST order endpoints.

// Raw shapes from the Pacifica REST API (snake_case)
interface RawPosition {
  account?: string
  symbol: string
  side: string          // "long" | "short"
  amount: string        // position size
  entry_price: string
  margin: string
  funding: string
  isolated: boolean
  created_at: number
  updated_at: number
  last_order_id: number
}

interface RawTrade {
  history_id: string
  order_id: string
  symbol: string
  amount: string
  price: string
  entry_price: string
  fee: string
  pnl: string
  event_type: string
  side: string          // "open_long" | "open_short" | "close_long" | "close_short"
  cause: string
  created_at: number
}

export class RestPoller {
  private knownAccounts: Set<string> = new Set()
  private positionPollInterval: ReturnType<typeof setInterval> | null = null
  private walletRefreshInterval: ReturnType<typeof setInterval> | null = null

  // Called by WsClient when a new account is discovered from trade stream
  addAccount(address: string): void {
    this.knownAccounts.add(address)
  }

  // Fetch current price from public trades endpoint for a specific market
  async fetchCurrentPriceForMarket(market: string): Promise<void> {
    try {
      const res = await axios.get(`${config.rest.url}/trades`, {
        params: { symbol: market, limit: 1, builder_code: config.builderCode },
        timeout: 5000,
      })
      const trades = res.data?.data ?? []
      if (trades.length > 0) {
        const price = parseFloat(trades[0].price)
        if (price > 0) {
          setCurrentPriceForMarket(market, price)
          if (market === 'BTC') setCurrentPrice(price)
          console.log(`[RestPoller] Price ${market}: ${price}`)
        }
      }
    } catch (err) {
      console.warn(`[RestPoller] fetchCurrentPriceForMarket(${market}) failed:`, (err as Error).message)
    }
  }

  // Fetch current price from public trades endpoint (backward compat)
  async fetchCurrentPrice(): Promise<void> {
    await this.fetchCurrentPriceForMarket(config.symbol)
  }

  // Fetch prices for all supported markets
  async fetchAllMarketPrices(): Promise<void> {
    await Promise.allSettled(
      SUPPORTED_MARKETS.map((m) => this.fetchCurrentPriceForMarket(m))
    )
  }

  // Fetch open positions for a single account
  async fetchPositionsForAccount(account: string): Promise<PacificaPosition[]> {
    try {
      const res = await axios.get(`${config.rest.url}/positions`, {
        params: { account, builder_code: config.builderCode },
        timeout: 10000,
      })

      const raw: RawPosition[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? [])

      return raw.map((p) => ({
        account,
        symbol: p.symbol,
        side: (p.side === 'long' || p.side === 'bid' ? 'long' : 'short') as 'long' | 'short',
        size: parseFloat(p.amount),
        entryPrice: parseFloat(p.entry_price),
        // Calculate leverage from margin and position value; fallback to 10x
        leverage: (() => {
          const posValue = parseFloat(p.amount) * parseFloat(p.entry_price)
          const margin = parseFloat(p.margin)
          if (margin > 0 && posValue > 0) return Math.max(1, Math.round(posValue / margin))
          return 10
        })(),
        margin: parseFloat(p.margin),
        // Liquidation price not provided — calculated in liqCalculator
        liquidationPrice: 0,
        unrealisedPnl: 0,
      }))
    } catch (err) {
      console.error(`[RestPoller] fetchPositionsForAccount failed for ${account}:`, err)
      return []
    }
  }

  // Fetch positions across all known accounts
  async fetchAllPositions(): Promise<PacificaPosition[]> {
    const accounts = Array.from(this.knownAccounts)
    if (accounts.length === 0) return []

    const results = await Promise.allSettled(
      accounts.map((acc) => this.fetchPositionsForAccount(acc))
    )

    return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
  }

  // Fetch trade history for a wallet, map to TradeRecord
  async fetchTradeHistory(account: string, limit: number): Promise<TradeRecord[]> {
    try {
      const res = await axios.get(`${config.rest.url}/trades/history`, {
        params: { account, limit, builder_code: config.builderCode },
        timeout: 10000,
      })

      const raw: RawTrade[] = res.data?.data ?? []

      // Normalize Pacifica timestamps to milliseconds (may be seconds or ms)
      const toMs = (t: number) => (t > 1e12 ? t : t * 1000)

      // Build hold-time map: close trade history_id → holdTimeMs
      // Matches each close trade to its most recent preceding open trade (same symbol+direction)
      const holdTimeMap = new Map<string, number>()
      for (const closeT of raw.filter((t) => t.side.startsWith('close'))) {
        const direction = closeT.side.includes('long') ? 'open_long' : 'open_short'
        const matchingOpen = raw
          .filter((o) => o.side === direction && o.symbol === closeT.symbol && o.created_at < closeT.created_at)
          .sort((a, b) => b.created_at - a.created_at)[0]
        if (matchingOpen) {
          holdTimeMap.set(closeT.history_id, toMs(closeT.created_at) - toMs(matchingOpen.created_at))
        }
      }

      return raw.map((t) => {
        const side = t.side.includes('long') ? 'long' : 'short'
        return {
          account,
          symbol: t.symbol,
          side: side as 'long' | 'short',
          size: parseFloat(t.amount),
          entryPrice: parseFloat(t.entry_price),
          exitPrice: parseFloat(t.price),
          pnl: parseFloat(t.pnl),
          holdTimeMs: holdTimeMap.get(t.history_id) ?? 0,
          timestamp: toMs(t.created_at),
        }
      })
    } catch (err) {
      console.error(`[RestPoller] fetchTradeHistory failed for ${account}:`, err)
      return []
    }
  }

  // Refresh wallet classification for a single account
  private async refreshWalletScore(account: string): Promise<void> {
    const trades = await this.fetchTradeHistory(account, config.walletHistoryLimit)
    const score = classifyWallet(trades)
    score.address = account
    setWalletScore(account, score)
  }

  // Determine if a wallet score needs refreshing
  private needsRefresh(account: string): boolean {
    const existing = getWalletScore(account)
    if (!existing) return true
    return Date.now() - existing.lastUpdated > config.walletRefreshIntervalMs
  }

  start(): void {
    console.log('[RestPoller] Starting...')

    // Seed known accounts from config (e.g. SEED_ACCOUNTS env var)
    for (const acc of config.seedAccounts) {
      this.knownAccounts.add(acc)
      console.log(`[RestPoller] Seeded account: ${acc}`)
    }

    // Fetch prices for all markets immediately on start
    this.fetchAllMarketPrices()

    // Poll positions every 15 seconds
    this.positionPollInterval = setInterval(async () => {
      // Refresh prices for all markets each poll cycle
      await this.fetchAllMarketPrices()

      const positions = await this.fetchAllPositions()
      if (positions.length === 0) return

      // Discover new accounts from positions, refresh stale scores
      const toRefresh: string[] = []
      for (const pos of positions) {
        if (!this.knownAccounts.has(pos.account)) {
          this.knownAccounts.add(pos.account)
        }
        if (this.needsRefresh(pos.account)) {
          toRefresh.push(pos.account)
        }
      }

      // Refresh in background (don't await all — avoid blocking the poll)
      for (const acc of toRefresh) {
        this.refreshWalletScore(acc).catch((e) =>
          console.error(`[RestPoller] wallet refresh error for ${acc}:`, e)
        )
      }

      await rebuildHeatmap()
    }, 15_000)

    // Periodic full wallet refresh
    this.walletRefreshInterval = setInterval(async () => {
      const accounts = Array.from(this.knownAccounts)
      for (const acc of accounts) {
        await this.refreshWalletScore(acc).catch((e) =>
          console.error(`[RestPoller] periodic wallet refresh error for ${acc}:`, e)
        )
      }
    }, config.walletRefreshIntervalMs)
  }

  stop(): void {
    if (this.positionPollInterval) clearInterval(this.positionPollInterval)
    if (this.walletRefreshInterval) clearInterval(this.walletRefreshInterval)
  }
}

export const restPoller = new RestPoller()
