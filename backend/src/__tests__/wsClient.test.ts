import { PacificaWsClient } from '../ingestion/wsClient'
import * as store from '../engine/store'
import * as restPollerModule from '../ingestion/restPoller'

jest.mock('../engine/store')
jest.mock('../engine/liqCalculator', () => ({
  SUPPORTED_MARKETS: ['BTC', 'ETH', 'SOL'],
}))
jest.mock('../ingestion/restPoller', () => ({
  restPoller: { addAccount: jest.fn() },
}))

const mockedStore = store as jest.Mocked<typeof store>
const mockedRestPoller = restPollerModule.restPoller as jest.Mocked<typeof restPollerModule.restPoller>

describe('PacificaWsClient.handleMessage', () => {
  let client: PacificaWsClient

  beforeEach(() => {
    jest.clearAllMocks()
    client = new PacificaWsClient()
  })

  // Access private method via any cast
  const handle = (c: PacificaWsClient, msg: unknown) => (c as any).handleMessage(msg)

  it('ignores pong messages', () => {
    handle(client, { channel: 'pong' })
    expect(mockedStore.setCurrentPrice).not.toHaveBeenCalled()
    expect(mockedStore.setCurrentPriceForMarket).not.toHaveBeenCalled()
  })

  describe('trades channel', () => {
    it('updates current price from trade price field', () => {
      handle(client, { channel: 'trades', data: [{ price: '68500' }] })
      expect(mockedStore.setCurrentPrice).toHaveBeenCalledWith(68500)
    })

    it('updates current price from mark_price field as fallback', () => {
      handle(client, { channel: 'trades', data: [{ mark_price: '67000' }] })
      expect(mockedStore.setCurrentPrice).toHaveBeenCalledWith(67000)
    })

    it('does not update price when price is 0', () => {
      handle(client, { channel: 'trades', data: [{ price: '0' }] })
      expect(mockedStore.setCurrentPrice).not.toHaveBeenCalled()
    })

    it('discovers taker account from trade', () => {
      handle(client, { channel: 'trades', data: [{ price: '68000', taker: 'takerAddr' }] })
      expect(mockedRestPoller.addAccount).toHaveBeenCalledWith('takerAddr')
    })

    it('discovers maker account from trade', () => {
      handle(client, { channel: 'trades', data: [{ price: '68000', maker: 'makerAddr' }] })
      expect(mockedRestPoller.addAccount).toHaveBeenCalledWith('makerAddr')
    })

    it('discovers account from account field', () => {
      handle(client, { channel: 'trades', data: [{ price: '68000', account: 'accAddr' }] })
      expect(mockedRestPoller.addAccount).toHaveBeenCalledWith('accAddr')
    })

    it('handles single trade object (not array)', () => {
      handle(client, { channel: 'trades', data: { price: '69000' } })
      expect(mockedStore.setCurrentPrice).toHaveBeenCalledWith(69000)
    })

    it('skips null trade in array', () => {
      handle(client, { channel: 'trades', data: [null, { price: '70000' }] })
      expect(mockedStore.setCurrentPrice).toHaveBeenCalledWith(70000)
    })
  })

  describe('prices channel', () => {
    it('updates BTC price from mark_price', () => {
      handle(client, { channel: 'prices', data: [{ symbol: 'BTC', mark_price: '68000' }] })
      expect(mockedStore.setCurrentPriceForMarket).toHaveBeenCalledWith('BTC', 68000)
      expect(mockedStore.setCurrentPrice).toHaveBeenCalledWith(68000)
    })

    it('updates ETH price from mark_price', () => {
      handle(client, { channel: 'prices', data: [{ symbol: 'ETH', mark_price: '2100' }] })
      expect(mockedStore.setCurrentPriceForMarket).toHaveBeenCalledWith('ETH', 2100)
    })

    it('updates SOL price from mark_price', () => {
      handle(client, { channel: 'prices', data: [{ symbol: 'SOL', mark_price: '85' }] })
      expect(mockedStore.setCurrentPriceForMarket).toHaveBeenCalledWith('SOL', 85)
    })

    it('updates price using price field as fallback', () => {
      handle(client, { channel: 'prices', data: [{ symbol: 'BTC', price: '67500' }] })
      expect(mockedStore.setCurrentPriceForMarket).toHaveBeenCalledWith('BTC', 67500)
    })

    it('ignores price when value is 0', () => {
      handle(client, { channel: 'prices', data: [{ symbol: 'BTC', mark_price: '0' }] })
      expect(mockedStore.setCurrentPriceForMarket).not.toHaveBeenCalled()
    })

    it('handles BTCUSDT symbol (startsWith BTC)', () => {
      handle(client, { channel: 'prices', data: [{ symbol: 'BTCUSDT', mark_price: '68500' }] })
      expect(mockedStore.setCurrentPriceForMarket).toHaveBeenCalledWith('BTC', 68500)
    })

    it('does not update backward-compat BTC price for ETH', () => {
      handle(client, { channel: 'prices', data: [{ symbol: 'ETH', mark_price: '2100' }] })
      expect(mockedStore.setCurrentPrice).not.toHaveBeenCalled()
    })

    it('handles single price object (not array)', () => {
      handle(client, { channel: 'prices', data: { symbol: 'BTC', mark_price: '68000' } })
      expect(mockedStore.setCurrentPriceForMarket).toHaveBeenCalledWith('BTC', 68000)
    })
  })

  describe('unknown channels', () => {
    it('handles unknown channel gracefully', () => {
      expect(() => handle(client, { channel: 'unknown', data: {} })).not.toThrow()
    })

    it('extracts channel from type field if channel missing', () => {
      handle(client, { type: 'trades', data: [{ price: '68000' }] })
      expect(mockedStore.setCurrentPrice).toHaveBeenCalledWith(68000)
    })
  })
})
