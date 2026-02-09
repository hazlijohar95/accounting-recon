'use client'

import { useState, useCallback, useMemo } from 'react'
import { Modal } from '@/components/ui/modal'
import { useCharts } from './use-charts'
import { BarChartRenderer, LineChartRenderer, PieChartRenderer, AreaChartRenderer } from './chart-types'
import type {
  ChartBuilderDialogProps,
  ChartType,
  ChartOptions,
  ChartDataPoint,
} from './types'

const CHART_TYPE_OPTIONS: { value: ChartType; label: string; icon: string }[] = [
  { value: 'bar', label: 'Bar Chart', icon: '📊' },
  { value: 'line', label: 'Line Chart', icon: '📈' },
  { value: 'pie', label: 'Pie Chart', icon: '🥧' },
  { value: 'area', label: 'Area Chart', icon: '📉' },
]

/**
 * Chart Builder Dialog
 *
 * Modal for creating and editing charts.
 */
export function ChartBuilderDialog({
  worksheetId,
  workosUserId,
  open,
  onOpenChange,
  columns,
  getColumnData,
  editingChart,
  onSave,
}: ChartBuilderDialogProps) {
  const { createChart, updateChart } = useCharts({ worksheetId, workosUserId })

  // Form state
  const [title, setTitle] = useState(editingChart?.title ?? '')
  const [chartType, setChartType] = useState<ChartType>(editingChart?.chartType ?? 'bar')
  const [labelColumn, setLabelColumn] = useState<number>(editingChart?.labelColumn ?? 0)
  const [valueColumns, setValueColumns] = useState<number[]>(editingChart?.valueColumns ?? [1])
  const [options, setOptions] = useState<ChartOptions>(
    editingChart?.options ?? {
      showLegend: true,
      showLabels: true,
      showGrid: true,
      animate: true,
      showDots: true,
      height: 300,
    }
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens with different chart
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setTitle('')
      setChartType('bar')
      setLabelColumn(0)
      setValueColumns([1])
      setOptions({
        showLegend: true,
        showLabels: true,
        showGrid: true,
        animate: true,
        showDots: true,
        height: 300,
      })
      setError(null)
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

  // Toggle value column selection
  const toggleValueColumn = useCallback((colIndex: number) => {
    setValueColumns((prev) => {
      if (prev.includes(colIndex)) {
        return prev.filter((c) => c !== colIndex)
      }
      return [...prev, colIndex]
    })
  }, [])

  // Build preview data
  const previewData = useMemo((): ChartDataPoint[] => {
    if (labelColumn === undefined) return []

    const labels = getColumnData(labelColumn)
    const result: ChartDataPoint[] = []

    // Limit preview to 10 rows
    const rowCount = Math.min(labels.length, 10)

    for (let i = 0; i < rowCount; i++) {
      const point: ChartDataPoint = { label: String(labels[i]) }

      for (const colIndex of valueColumns) {
        const colValues = getColumnData(colIndex)
        const colName = columns.find(c => c.index === colIndex)?.name ?? `Column ${colIndex}`
        const value = colValues[i]
        point[colName] = typeof value === 'number' ? value : parseFloat(String(value)) || 0
      }

      result.push(point)
    }

    return result
  }, [labelColumn, valueColumns, getColumnData, columns])

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Please enter a chart title')
      return
    }
    if (valueColumns.length === 0) {
      setError('Please select at least one value column')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (editingChart) {
        await updateChart(editingChart._id, {
          title,
          chartType,
          labelColumn,
          valueColumns,
          options,
        })
        onSave?.(editingChart._id)
      } else {
        const chartId = await createChart({
          title,
          chartType,
          dataRange: '', // Not used currently
          labelColumn,
          valueColumns,
          options,
        })
        onSave?.(chartId)
      }

      handleOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save chart')
    } finally {
      setIsSubmitting(false)
    }
  }, [
    title,
    chartType,
    labelColumn,
    valueColumns,
    options,
    editingChart,
    createChart,
    updateChart,
    onSave,
    handleOpenChange,
  ])

  // Get chart renderer for preview
  const ChartRenderer = useMemo(() => {
    switch (chartType) {
      case 'bar': return BarChartRenderer
      case 'line': return LineChartRenderer
      case 'pie': return PieChartRenderer
      case 'area': return AreaChartRenderer
      default: return BarChartRenderer
    }
  }, [chartType])

  return (
    <Modal
      isOpen={open}
      onClose={() => handleOpenChange(false)}
      title={editingChart ? 'Edit Chart' : 'Create Chart'}
      size="xl"
      footer={
        <div className="flex justify-end gap-3">
          <button
            onClick={() => handleOpenChange(false)}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : editingChart ? 'Update' : 'Create'}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Configuration */}
        <div className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200">
              {error}
            </div>
          )}

          {/* Chart Title */}
          <div>
            <label className="block text-sm font-medium mb-1">Chart Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Monthly Revenue"
              className="w-full px-3 py-2 text-sm border border-border bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          {/* Chart Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Chart Type</label>
            <div className="grid grid-cols-2 gap-2">
              {CHART_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setChartType(opt.value)}
                  className={`px-3 py-2 text-sm border transition-colors ${
                    chartType === opt.value
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border hover:bg-secondary'
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Label Column */}
          <div>
            <label className="block text-sm font-medium mb-1">Label Column (X-Axis)</label>
            <select
              value={labelColumn}
              onChange={(e) => setLabelColumn(parseInt(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-border bg-background"
            >
              {columns.map((col) => (
                <option key={col.index} value={col.index}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>

          {/* Value Columns */}
          <div>
            <label className="block text-sm font-medium mb-1">Value Columns (Y-Axis)</label>
            <div className="space-y-1 max-h-32 overflow-y-auto border border-border p-2">
              {columns
                .filter((col) => col.index !== labelColumn)
                .map((col) => (
                  <label
                    key={col.index}
                    className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-1"
                  >
                    <input
                      type="checkbox"
                      checked={valueColumns.includes(col.index)}
                      onChange={() => toggleValueColumn(col.index)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{col.name}</span>
                  </label>
                ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium mb-1">Display Options</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.showLegend}
                  onChange={(e) => setOptions({ ...options, showLegend: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Show Legend</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.showLabels}
                  onChange={(e) => setOptions({ ...options, showLabels: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Show Labels</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.showGrid ?? true}
                  onChange={(e) => setOptions({ ...options, showGrid: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Show Grid</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.animate}
                  onChange={(e) => setOptions({ ...options, animate: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Animate</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="border border-border bg-secondary/20">
          <div className="px-3 py-2 border-b border-border text-xs font-medium text-muted-foreground">
            PREVIEW
          </div>
          <div className="p-4">
            {previewData.length > 0 ? (
              <ChartRenderer
                chart={{
                  _id: 'preview' as never,
                  worksheetId,
                  title,
                  chartType,
                  dataRange: '',
                  labelColumn,
                  valueColumns,
                  options,
                  position: 0,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                }}
                data={previewData}
                height={250}
              />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                Select columns to see preview
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
