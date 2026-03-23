# LiquidityLens

Real-time liquidation heatmap and wallet profiler for the Pacifica DeFi protocol on Solana.

Visualizes where liquidations are clustered across BTC, ETH, and SOL markets, and classifies wallets as smart money or retail based on on-chain trading behaviour.

---

## What it does

- **Liquidation Heatmap** — live price buckets showing total USD at risk per level, coloured by smart money vs retail dominance
- **Danger Zone detection** — highlights buckets within 2% of current price
- **Wallet Profiler** — score 0–100 based on win rate, hold time, position size consistency, and trading frequency
- **Multi-market** — BTC / ETH / SOL toggle with independent heatmaps and price feeds
- **Real-time** — WebSocket price feed from Pacifica + Socket.io push to frontend

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Node.js, Express, Socket.io, TypeScript |
| Frontend | Next.js 15, TradingView Lightweight Charts, Tailwind CSS |
| Data | Pacifica DEX REST API + WebSocket (Solana devnet) |
| Price feed | Binance candle API (BTCUSDT / ETHUSDT / SOLUSDT) |
| Cache | node-cache (in-memory, per-market) |
| Tests | Jest + Supertest (119 tests) |

---

## Getting started

### Requirements

- Node.js 18+
- A Solana wallet private key (devnet)
- Pacifica devnet access at [test-app.pacifica.fi](https://test-app.pacifica.fi)

### Backend

```bash
cd backend
cp .env.example .env
# fill in PRIVATE_KEY and other vars in .env
npm install
npm run dev
```

Runs on `http://localhost:4000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3000`

---

## Environment variables

See `backend/.env.example` for all required variables:

```
PRIVATE_KEY=          # Solana wallet private key (base58)
RPC_URL=              # Solana RPC endpoint
PACIFICA_API_URL=     # Pacifica REST API base URL
PACIFICA_WS_URL=      # Pacifica WebSocket URL
PORT=4000
USE_MOCK_DATA=false   # set true to run without real positions
```

---

## API

| Endpoint | Description |
|---|---|
| `GET /api/heatmap?market=BTC` | Liquidation buckets for a market |
| `GET /api/wallet/:address` | Wallet score and classification |
| `GET /api/health` | Server status and per-market stats |
| `WS heatmap:snapshot` | Full heatmap on connect (all markets) |
| `WS heatmap:update` | Incremental update after each rebuild |

---

## Tests

```bash
cd backend
npm test
```

119 tests covering the engine, ingestion layer, API routes, and integration scenarios.

---

## Project structure

```
LiquidityLens/
├── backend/
│   ├── src/
│   │   ├── engine/        # heatmap calculator, wallet classifier, store
│   │   ├── ingestion/     # REST poller, WebSocket client
│   │   ├── api/           # Express routes, Socket.io server
│   │   ├── mock/          # mock positions and wallet scores
│   │   └── __tests__/
│   └── .env.example
└── frontend/
    ├── app/
    ├── components/        # PriceChart, HeatmapChart, WalletLookup, MarketSelector
    └── hooks/             # useHeatmap, useWallet
```
