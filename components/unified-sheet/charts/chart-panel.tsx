'use client'

import { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/cn'
import { useCharts } from './use-charts'
import { ChartBuilderDialog } from './chart-builder-dialog'
import { BarChartRenderer, LineChartRenderer, PieChartRenderer, AreaChartRenderer } from './chart-types'
import type { ChartPanelProps, WorksheetChart, ChartDataPoint, ChartType } from './types'

/**
 * Chart Panel
 *
 * Collapsible side panel for displaying and managing charts.
 */
export function ChartPanel({
  worksheetId,
  workosUserId,
  open,
  onOpenChange,
  getColumnData,
  columns,
}: ChartPanelProps) {
  const { charts, isLoading, deleteChart } = useCharts({
    worksheetId,
    workosUserId,
  })

  const [showBuilder, setShowBuilder] = useState(false)
  const [editingChart, setEditingChart] = useState<WorksheetChart | undefined>()

  // Handle new chart
  const handleNewChart = useCallback(() => {
    setEditingChart(undefined)
    setShowBuilder(true)
  }, [])

  // Handle edit chart
  const handleEdit = useCallback((chart: WorksheetChart) => {
    setEditingChart(chart)
    setShowBuilder(true)
  }, [])

  // Handle delete chart
  const handleDelete = useCallback(
    async (chartId: WorksheetChart['_id']) => {
      if (window.confirm('Delete this chart?')) {
        try {
          await deleteChart(chartId)
        } catch (err) {
          console.error('Failed to delete chart:', err)
        }
      }
    },
    [deleteChart]
  )

  if (!open) return null

  return (
    <>
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-96 bg-background border-l border-border shadow-lg z-40',
          'transform transition-transform duration-200 overflow-hidden flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <h2 className="text-sm font-medium">Charts</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewChart}
              className="px-2 py-1 text-xs bg-foreground text-background hover:bg-foreground/90"
            >
              + New Chart
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 text-muted-foreground hover:text-foreground"
              aria-label="Close panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Charts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Loading charts...
            </div>
          ) : charts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No charts yet.<br />
              Click &quot;New Chart&quot; to create one.
            </div>
          ) : (
            charts.map((chart) => (
              <ChartCard
                key={chart._id}
                chart={chart}
                getColumnData={getColumnData}
                columns={columns}
                onEdit={() => handleEdit(chart)}
                onDelete={() => handleDelete(chart._id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Chart Builder Dialog */}
      <ChartBuilderDialog
        worksheetId={worksheetId}
        workosUserId={workosUserId}
        open={showBuilder}
        onOpenChange={setShowBuilder}
        columns={columns}
        getColumnData={getColumnData}
        editingChart={editingChart}
      />
    </>
  )
}

/**
 * Single chart card
 */
function ChartCard({
  chart,
  getColumnData,
  columns,
  onEdit,
  onDelete,
}: {
  chart: WorksheetChart
  getColumnData: (columnIndex: number) => (string | number)[]
  columns: Array<{ index: number; name: string }>
  onEdit: () => void
  onDelete: () => void
}) {
  // Build chart data from column data
  const data = useMemo((): ChartDataPoint[] => {
    if (chart.labelColumn === undefined) return []

    const labels = getColumnData(chart.labelColumn)
    const result: ChartDataPoint[] = []

    for (let i = 0; i < labels.length; i++) {
      const point: ChartDataPoint = { label: String(labels[i]) }

      for (const colIndex of chart.valueColumns) {
        const colValues = getColumnData(colIndex)
        const colName = columns.find(c => c.index === colIndex)?.name ?? `Column ${colIndex}`
        const value = colValues[i]
        point[colName] = typeof value === 'number' ? value : parseFloat(String(value)) || 0
      }

      result.push(point)
    }

    return result
  }, [chart.labelColumn, chart.valueColumns, getColumnData, columns])

  // Render chart based on type
  const ChartRenderer = getChartRenderer(chart.chartType)

  return (
    <div className="border border-border bg-background">
      {/* Chart Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs px-1.5 py-0.5 bg-secondary text-secondary-foreground uppercase">
            {chart.chartType}
          </span>
          <span className="text-sm font-medium truncate">{chart.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1 text-muted-foreground hover:text-foreground"
            title="Edit chart"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-muted-foreground hover:text-red-600"
            title="Delete chart"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="p-2">
        {data.length > 0 ? (
          <ChartRenderer
            chart={chart}
            data={data}
            height={chart.options.height ?? 200}
          />
        ) : (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            No data available
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Get chart renderer component by type
 */
function getChartRenderer(type: ChartType) {
  switch (type) {
    case 'bar':
      return BarChartRenderer
    case 'line':
      return LineChartRenderer
    case 'pie':
      return PieChartRenderer
    case 'area':
      return AreaChartRenderer
    default:
      return BarChartRenderer
  }
}

/**
 * Toolbar button for opening the chart panel
 */
export function ChartToolbarButton({
  onClick,
  chartCount,
}: {
  onClick: () => void
  chartCount?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 text-xs border border-border hover:bg-secondary/50 transition-colors',
        chartCount && chartCount > 0 && 'border-green-300 bg-green-50'
      )}
      title="Charts"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <span>Charts</span>
      {chartCount && chartCount > 0 && (
        <span className="px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded-full">
          {chartCount}
        </span>
      )}
    </button>
  )
}
