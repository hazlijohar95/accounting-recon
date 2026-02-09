'use client'

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { ChartRendererProps } from '../types'
import { FALLBACK_CHART_COLORS } from '../types'

/**
 * Bar Chart Component
 */
export function BarChartRenderer({
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
        <RechartsBarChart
          data={data}
          layout={options.orientation === 'horizontal' ? 'vertical' : 'horizontal'}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          {options.showGrid && <CartesianGrid strokeDasharray="3 3" />}
          {options.orientation === 'horizontal' ? (
            <>
              <YAxis dataKey="label" type="category" width={80} />
              <XAxis type="number" />
            </>
          ) : (
            <>
              <XAxis dataKey="label" />
              <YAxis />
            </>
          )}
          <Tooltip />
          {options.showLegend && <Legend />}
          {valueKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[index % colors.length]}
              animationDuration={options.animate ? 800 : 0}
            >
              {options.showLabels && data.map((_, i) => (
                <Cell key={`cell-${i}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
