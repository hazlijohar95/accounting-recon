'use client'

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ChartRendererProps } from '../types'
import { FALLBACK_CHART_COLORS } from '../types'

/**
 * Area Chart Component
 */
export function AreaChartRenderer({
  chart,
  data,
  height = 300,
  className,
}: ChartRendererProps) {
  const { options } = chart
  const colors = options.colors ?? FALLBACK_CHART_COLORS

  // Get value column keys (excluding 'label')
  const valueKeys = Object.keys(data[0] ?? {}).filter(k => k !== 'label')

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          {options.showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          {options.showLegend && <Legend />}
          {valueKeys.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index % colors.length]}
              fill={colors[index % colors.length]}
              fillOpacity={0.3}
              animationDuration={options.animate ? 800 : 0}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  )
}
