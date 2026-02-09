'use client'

import dynamic from 'next/dynamic'
import SpreadsheetLoading from './loading'

const SpreadsheetView = dynamic(
  () => import('@/components/views/spreadsheet-view').then(mod => ({ default: mod.SpreadsheetView })),
  { loading: () => <SpreadsheetLoading />, ssr: false }
)

export default function SpreadsheetPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold">Spreadsheet</h1>
        <p className="text-muted-foreground">
          View and export reconciliation data in Excel format
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <SpreadsheetView />
      </div>
    </div>
  )
}
