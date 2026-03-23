import dotenv from 'dotenv'
dotenv.config()

export const config = {
  ws: {
    url: process.env.PACIFICA_WS_URL!,
  },
  rest: {
    url: process.env.PACIFICA_REST_URL!,
    privateKey: process.env.PACIFICA_PRIVATE_KEY!,
  },
  builderCode: process.env.BUILDER_CODE!,
  port: parseInt(process.env.PORT || '4000'),
  symbol: process.env.SYMBOL || 'BTC',
  priceBucketSize: parseInt(process.env.PRICE_BUCKET_SIZE || '50'),
  dangerZonePct: parseFloat(process.env.DANGER_ZONE_PCT || '2'),
  walletHistoryLimit: parseInt(process.env.WALLET_HISTORY_LIMIT || '200'),
  walletRefreshIntervalMs: parseInt(process.env.WALLET_REFRESH_INTERVAL_MS || '300000'),
  useMockData: process.env.USE_MOCK_DATA === 'true',
  seedAccounts: process.env.SEED_ACCOUNTS ? process.env.SEED_ACCOUNTS.split(',').map(s => s.trim()).filter(Boolean) : [],
}
