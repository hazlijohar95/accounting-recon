import { Id } from "@/convex/_generated/dataModel"

/**
 * Chart Types
 *
 * Types for spreadsheet chart visualization.
 */

// =============================================================================
// Core Types
// =============================================================================

export type ChartType = "bar" | "line" | "pie" | "area" | "scatter"

export interface ChartOptions {
  showLegend: boolean
  showLabels: boolean
  showGrid?: boolean
  animate: boolean
  colors?: string[]
  orientation?: "horizontal" | "vertical"
  showDots?: boolean
  height?: number
}

export interface WorksheetChart {
  _id: Id<"worksheetCharts">
  worksheetId: Id<"worksheets">
  title: string
  chartType: ChartType
  dataRange: string
  labelColumn?: number
  valueColumns: number[]
  options: ChartOptions
  position: number
  createdAt: number
  updatedAt: number
}

/**
 * Data point for chart rendering
 */
export interface ChartDataPoint {
  label: string
  [key: string]: string | number
}

// =============================================================================
// Default Chart Colors (from design system)
// =============================================================================

export const DEFAULT_CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

/**
 * Fallback colors when CSS variables aren't available
 */
export const FALLBACK_CHART_COLORS = [
  "#2563eb", // blue-600
  "#dc2626", // red-600
  "#16a34a", // green-600
  "#ca8a04", // yellow-600
  "#9333ea", // purple-600
]

// =============================================================================
// UI Component Props
// =============================================================================

export interface ChartPanelProps {
  worksheetId: Id<"worksheets">
  workosUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Function to get data from spreadsheet by column index */
  getColumnData: (columnIndex: number) => (string | number)[]
  /** Column headers for selection */
  columns: Array<{ index: number; name: string }>
}

export interface ChartBuilderDialogProps {
  worksheetId: Id<"worksheets">
  workosUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: Array<{ index: number; name: string }>
  getColumnData: (columnIndex: number) => (string | number)[]
  /** Existing chart to edit */
  editingChart?: WorksheetChart
  onSave?: (chartId: Id<"worksheetCharts">) => void
}

export interface ChartRendererProps {
  chart: WorksheetChart
  data: ChartDataPoint[]
  width?: number
  height?: number
  className?: string
}

// =============================================================================
// Hook Types
// =============================================================================

export interface UseChartsOptions {
  worksheetId: Id<"worksheets">
  workosUserId: string
}

export interface UseChartsReturn {
  charts: WorksheetChart[]
  isLoading: boolean
  error: Error | null
  createChart: (chart: Omit<WorksheetChart, "_id" | "worksheetId" | "position" | "createdAt" | "updatedAt">) => Promise<Id<"worksheetCharts">>
  updateChart: (id: Id<"worksheetCharts">, updates: Partial<WorksheetChart>) => Promise<void>
  deleteChart: (id: Id<"worksheetCharts">) => Promise<void>
  reorderCharts: (chartIds: Id<"worksheetCharts">[]) => Promise<void>
}
