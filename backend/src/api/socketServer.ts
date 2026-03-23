import { Server as HttpServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { HeatmapUpdate } from '../types'
import { getHeatmapBucketsForMarket, getCurrentPriceForMarket } from '../engine/store'
import { SUPPORTED_MARKETS } from '../engine/liqCalculator'

let io: SocketServer | null = null

export function initSocketServer(httpServer: HttpServer): void {
  io = new SocketServer(httpServer, {
    cors: { origin: '*' },
  })

  io.on('connection', (socket) => {
    const clientCount = io!.engine.clientsCount
    console.log(`[Socket.io] Client connected: ${socket.id} (total: ${clientCount})`)

    // Send snapshot for every supported market on connect
    for (const market of SUPPORTED_MARKETS) {
      socket.emit('heatmap:snapshot', {
        market,
        buckets: getHeatmapBucketsForMarket(market),
        currentPrice: getCurrentPriceForMarket(market),
        timestamp: Date.now(),
      })
    }

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id} (total: ${io!.engine.clientsCount})`)
    })
  })
}

export function emitHeatmapUpdate(update: HeatmapUpdate): void {
  if (!io) return
  io.emit('heatmap:update', update)
}
