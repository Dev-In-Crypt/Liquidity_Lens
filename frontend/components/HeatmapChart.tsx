'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { HeatmapBucket } from '../hooks/useHeatmap'

interface Props {
  buckets: HeatmapBucket[]
  currentPrice: number
  visiblePriceMin: number
  visiblePriceMax: number
  height: number
}

const MAX_BAR_WIDTH = 120

function bucketColor(b: HeatmapBucket): string {
  if (b.isDangerZone && b.smartMoneyPct > 60) return '#ff4560'
  if (b.isDangerZone && b.retailPct > 60) return '#ff8c42'
  if (b.isDangerZone) return '#ffd166'
  return 'rgba(74,85,104,0.5)'
}

export default function HeatmapChart({
  buckets,
  currentPrice,
  visiblePriceMin,
  visiblePriceMax,
  height,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const WIDTH = MAX_BAR_WIDTH + 4

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const visible = buckets.filter(
      (b) => b.priceLevel >= visiblePriceMin && b.priceLevel <= visiblePriceMax
    )
    if (visible.length === 0) return

    const yScale = d3
      .scaleLinear()
      .domain([visiblePriceMin, visiblePriceMax])
      .range([height, 0])

    const maxLiq = d3.max(visible, (b) => b.totalLiqUsd) ?? 1
    const xScale = d3.scaleLinear().domain([0, maxLiq]).range([0, MAX_BAR_WIDTH])

    const priceBucketSize = visible[1]
      ? Math.abs(visible[1].priceLevel - visible[0].priceLevel)
      : 50
    const barHeight = Math.max(Math.abs(yScale(0) - yScale(priceBucketSize)) - 1, 1)

    // Tooltip
    const tooltip = d3
      .select('body')
      .selectAll<HTMLDivElement, unknown>('.heatmap-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'heatmap-tooltip')
      .style('position', 'fixed')
      .style('background', '#1e293b')
      .style('border', '1px solid #334155')
      .style('border-radius', '6px')
      .style('padding', '8px 10px')
      .style('font-size', '12px')
      .style('color', '#e2e8f0')
      .style('pointer-events', 'none')
      .style('z-index', '9999')
      .style('display', 'none')

    const fmtUsd = (n: number) =>
      n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1_000).toFixed(0)}K`

    const groups = svg
      .selectAll<SVGGElement, HeatmapBucket>('g.bucket')
      .data(visible, (d) => d.priceLevel)
      .join('g')
      .attr('class', 'bucket')
      .attr('transform', (d) => `translate(0,${yScale(d.priceLevel) - barHeight})`)

    // Background bar (total)
    groups
      .append('rect')
      .attr('width', (d) => xScale(d.totalLiqUsd))
      .attr('height', barHeight)
      .attr('fill', bucketColor)
      .attr('rx', 2)

    // Smart money sub-bar (blue)
    groups
      .append('rect')
      .attr('width', (d) => xScale(d.totalLiqUsd) * (d.smartMoneyPct / 100))
      .attr('height', barHeight)
      .attr('fill', '#4d9de0')
      .attr('opacity', 0.75)
      .attr('rx', 2)

    // Hover target (full-width transparent)
    groups
      .append('rect')
      .attr('width', WIDTH)
      .attr('height', barHeight)
      .attr('fill', 'transparent')
      .on('mousemove', (event, d) => {
        tooltip
          .style('display', 'block')
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY - 10}px`)
          .html(
            `<div><strong>$${d.priceLevel.toLocaleString()}</strong></div>` +
              `<div>Total: ${fmtUsd(d.totalLiqUsd)}</div>` +
              `<div>Smart: ${d.smartMoneyPct.toFixed(0)}%</div>` +
              `<div>Retail: ${d.retailPct.toFixed(0)}%</div>` +
              `<div>Wallets: ${d.walletCount}</div>`
          )
      })
      .on('mouseleave', () => tooltip.style('display', 'none'))

    // Current price line
    if (currentPrice > 0) {
      const y = yScale(currentPrice)
      svg
        .append('line')
        .attr('x1', 0)
        .attr('x2', WIDTH)
        .attr('y1', y)
        .attr('y2', y)
        .attr('stroke', 'rgba(232,237,245,0.35)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4 3')
    }
  }, [buckets, currentPrice, visiblePriceMin, visiblePriceMax, height])

  return (
    <svg
      ref={svgRef}
      width={WIDTH}
      height={height}
      style={{ display: 'block' }}
    />
  )
}
