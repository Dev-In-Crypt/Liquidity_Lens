import type { Metadata } from 'next'
import { JetBrains_Mono, Syne } from 'next/font/google'
import './globals.css'

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

const syne = Syne({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'LiquidityLens',
  description: 'Real-time liquidation heatmap and wallet profiler for Pacifica',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${syne.variable}`}>
      <body style={{ fontFamily: 'var(--font-mono)', height: '100vh', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}
