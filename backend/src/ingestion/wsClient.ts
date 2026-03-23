import WebSocket from 'ws'
import { config } from '../config'
import { setCurrentPrice, setCurrentPriceForMarket } from '../engine/store'
import { SUPPORTED_MARKETS } from '../engine/liqCalculator'
import { restPoller } from './restPoller'

// NOTE: Correct WS URLs per Pacifica docs:
//   Mainnet:  wss://ws.pacifica.fi/ws
//   Testnet:  wss://test-ws.pacifica.fi/ws
// Make sure PACIFICA_WS_URL in .env matches your target network.

const RECONNECT_DELAY_MS = 3000
const PING_INTERVAL_MS = 30_000

export class PacificaWsClient {
  private ws: WebSocket | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private stopped = false
  private reconnectAttempts = 0

  private connect(): void {
    if (this.stopped) return

    console.log(
      `[WsClient] Connecting to ${config.ws.url}` +
        (this.reconnectAttempts > 0 ? ` (attempt #${this.reconnectAttempts})` : '')
    )

    this.ws = new WebSocket(config.ws.url)

    this.ws.on('open', () => {
      console.log('[WsClient] Connected.')
      this.reconnectAttempts = 0

      // Subscribe to public market trades and prices
      const subscribeMsg = JSON.stringify({
        method: 'subscribe',
        params: {
          channel: 'trades',
          symbol: config.symbol,
        },
        id: 1,
      })
      this.ws!.send(subscribeMsg)

      // Also subscribe to prices channel for mark price updates
      const priceMsg = JSON.stringify({
        method: 'subscribe',
        params: {
          channel: 'prices',
        },
        id: 2,
      })
      this.ws!.send(priceMsg)

      // Start heartbeat ping
      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ method: 'ping' }))
        }
      }, PING_INTERVAL_MS)
    })

    this.ws.on('message', (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString())
        this.handleMessage(msg)
      } catch {
        // Ignore non-JSON frames
      }
    })

    this.ws.on('close', (code, reason) => {
      console.warn(`[WsClient] Disconnected (code=${code}, reason=${reason.toString()}). Reconnecting...`)
      this.cleanup()
      this.scheduleReconnect()
    })

    this.ws.on('error', (err) => {
      console.error('[WsClient] Error:', err.message)
      this.cleanup()
      this.scheduleReconnect()
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleMessage(msg: any): void {
    const channel: string = msg.channel ?? msg.type ?? ''

    // Heartbeat response
    if (channel === 'pong') return

    // Market trades — extract price and discover accounts
    if (channel === 'trades') {
      const trades = Array.isArray(msg.data) ? msg.data : [msg.data]
      for (const trade of trades) {
        if (!trade) continue

        // Update current price from latest trade
        const price = parseFloat(trade.price ?? trade.mark_price ?? '0')
        if (price > 0) setCurrentPrice(price)

        // Discover accounts from trade data (taker/maker fields vary by API version)
        const taker: string | undefined = trade.taker ?? trade.account ?? trade.wallet
        const maker: string | undefined = trade.maker
        if (taker) restPoller.addAccount(taker)
        if (maker) restPoller.addAccount(maker)
      }
    }

    // Prices channel — mark prices for all supported markets
    if (channel === 'prices') {
      const prices = Array.isArray(msg.data) ? msg.data : [msg.data]
      for (const p of prices) {
        if (!p) continue
        const symbol: string = (p.symbol ?? '').toUpperCase()
        for (const market of SUPPORTED_MARKETS) {
          if (symbol.startsWith(market)) {
            const price = parseFloat(p.mark_price ?? p.price ?? '0')
            if (price > 0) {
              setCurrentPriceForMarket(market, price)
              if (market === 'BTC') setCurrentPrice(price) // backward compat
            }
          }
        }
      }
    }
  }

  private cleanup(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
    if (this.ws) {
      this.ws.removeAllListeners()
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.terminate()
      }
      this.ws = null
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped) return
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY_MS)
  }

  start(): void {
    this.stopped = false
    this.connect()
  }

  stop(): void {
    this.stopped = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.cleanup()
  }
}

export const wsClient = new PacificaWsClient()
