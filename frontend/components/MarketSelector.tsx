'use client'

export const MARKETS = ['BTC', 'ETH', 'SOL'] as const
export type Market = typeof MARKETS[number]

interface Props {
  market: Market
  onChange: (m: Market) => void
}

export default function MarketSelector({ market, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {MARKETS.map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
            m === market
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  )
}
