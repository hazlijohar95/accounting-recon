'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts'
import { cn } from '@/lib/utils'
import { useIntersectionAnimation } from '@/hooks/useIntersectionAnimation'

export interface CashFlowDataPoint {
  month: string // "Jan 25"
  inflow: number
  outflow: number
  net?: number
}

interface CashFlowChartProps {
  data: CashFlowDataPoint[]
  height?: number
  animate?: boolean
  className?: string
  showNet?: boolean // Show net line
}

// Brand colors
const COLORS = {
  inflow: 'hsl(160, 84%, 39%)', // emerald-500
  outflow: 'hsl(0, 0%, 45%)', // muted-foreground
  net: 'hsl(var(--foreground))',
  grid: 'hsl(var(--border))',
  text: 'hsl(var(--muted-foreground))',
}

// Custom tooltip with brand styling (square, no rounded corners)
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string }>
  label?: string
}) {
  if (!active || !payload) return null

  const inflow = payload.find((p) => p.dataKey === 'inflow')?.value ?? 0
  const outflow = payload.find((p) => p.dataKey === 'outflow')?.value ?? 0
  const net = inflow - outflow

  return (
    <div className="bg-background border border-border p-3 shadow-md">
      <div className="text-xs font-medium mb-2">{label}</div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Inflow</span>
          <span className="font-medium text-emerald-500">
            ${inflow.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Outflow</span>
          <span className="font-medium">
            ${outflow.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </span>
        </div>
        <div className="border-t border-border pt-1 mt-1 flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Net</span>
          <span className={cn('font-medium', net >= 0 ? 'text-emerald-500' : 'text-destructive')}>
            {net >= 0 ? '+' : '-'}${Math.abs(net).toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </div>
  )
}

// Square dot for line markers (brand guideline: geometric shapes)
function SquareDot(props: {
  cx?: number
  cy?: number
  stroke?: string
  fill?: string
  value?: number
}) {
  const { cx, cy, fill } = props
  if (cx === undefined || cy === undefined) return null

  return (
    <rect
      x={cx - 3}
      y={cy - 3}
      width={6}
      height={6}
      fill={fill}
      stroke="hsl(var(--background))"
      strokeWidth={2}
    />
  )
}

export function CashFlowChart({
  data,
  height = 300,
  animate = true,
  className,
  showNet = false,
}: CashFlowChartProps) {
  // Use intersection animation hook for scroll-triggered animation
  const { ref: chartRef, isVisible } = useIntersectionAnimation<HTMLDivElement>({
    animate,
    threshold: 0.1,
    triggerOnce: true,
  })
  const shouldAnimate = isVisible && animate

  // Format Y-axis ticks
  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value}`
  }

  // Process data to add net values
  const chartData = data.map((d) => ({
    ...d,
    net: d.net ?? d.inflow - d.outflow,
  }))

  if (data.length === 0) {
    return (
      <div
        className={cn('flex items-center justify-center border border-border', className)}
        style={{ height }}
      >
        <span className="text-sm text-muted-foreground">No cash flow data available</span>
      </div>
    )
  }

  return (
    <div
      ref={chartRef}
      className={cn(
        'transition-opacity duration-500',
        isVisible ? 'opacity-100' : 'opacity-0',
        className
      )}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {/* Subtle area fills */}
          <defs>
            <linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.inflow} stopOpacity={0.15} />
              <stop offset="100%" stopColor={COLORS.inflow} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="outflowGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.outflow} stopOpacity={0.1} />
              <stop offset="100%" stopColor={COLORS.outflow} stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: COLORS.text, fontSize: 11 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: COLORS.text, fontSize: 11 }}
            tickFormatter={formatYAxis}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Area fills */}
          <Area
            type="monotone"
            dataKey="inflow"
            fill="url(#inflowGradient)"
            stroke="none"
            isAnimationActive={shouldAnimate}
            animationDuration={800}
          />
          <Area
            type="monotone"
            dataKey="outflow"
            fill="url(#outflowGradient)"
            stroke="none"
            isAnimationActive={shouldAnimate}
            animationDuration={800}
          />

          {/* Lines */}
          <Line
            type="monotone"
            dataKey="inflow"
            stroke={COLORS.inflow}
            strokeWidth={2}
            dot={<SquareDot fill={COLORS.inflow} />}
            activeDot={<SquareDot fill={COLORS.inflow} />}
            isAnimationActive={shouldAnimate}
            animationDuration={800}
          />
          <Line
            type="monotone"
            dataKey="outflow"
            stroke={COLORS.outflow}
            strokeWidth={2}
            dot={<SquareDot fill={COLORS.outflow} />}
            activeDot={<SquareDot fill={COLORS.outflow} />}
            isAnimationActive={shouldAnimate}
            animationDuration={800}
          />

          {showNet && (
            <Line
              type="monotone"
              dataKey="net"
              stroke={COLORS.net}
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={shouldAnimate}
              animationDuration={800}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// Chart legend component
export function CashFlowLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-6 text-xs', className)}>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-emerald-500" />
        <span className="text-muted-foreground">Cash In</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-muted-foreground" />
        <span className="text-muted-foreground">Cash Out</span>
      </div>
    </div>
  )
}
