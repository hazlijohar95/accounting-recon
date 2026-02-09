'use client'

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ChartRendererProps } from '../types'
import { FALLBACK_CHART_COLORS } from '../types'

/**
 * Pie Chart Component
 */
export function PieChartRenderer({
  chart,
  data,
  height = 300,
  className,
}: ChartRendererProps) {
  const { options } = chart
  const colors = options.colors ?? FALLBACK_CHART_COLORS

  // For pie charts, use the first value column
  const valueKey = Object.keys(data[0] ?? {}).find(k => k !== 'label') ?? 'value'

  // Transform data for pie chart
  const pieData = data.map((item, index) => ({
    name: item.label,
    value: typeof item[valueKey] === 'number' ? item[valueKey] : parseFloat(String(item[valueKey])) || 0,
    fill: colors[index % colors.length],
  }))

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={options.showLabels}
            label={options.showLabels ? ({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%` : false}
            outerRadius={80}
            dataKey="value"
            animationDuration={options.animate ? 800 : 0}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => typeof value === 'number' ? value.toLocaleString() : value} />
          {options.showLegend && <Legend />}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}
