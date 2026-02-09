'use client'

/**
 * Status legend items for the footer
 */
const STATUS_LEGEND = [
  { label: 'Matched (90%+)', colorClass: 'bg-green-200 dark:bg-green-900' },
  { label: 'Suggested (70-89%)', colorClass: 'bg-yellow-200 dark:bg-yellow-900' },
  { label: 'Pending', colorClass: 'bg-gray-200 dark:bg-gray-700' },
  { label: 'Suspense (<70%)', colorClass: 'bg-red-200 dark:bg-red-900' },
] as const

/**
 * Reusable footer component with status legend for spreadsheet views
 */
export function SpreadsheetFooter() {
  return (
    <div className="flex items-center gap-6 px-4 py-2 border-t border-border text-xs text-muted-foreground">
      {STATUS_LEGEND.map(({ label, colorClass }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
          {label}
        </span>
      ))}
    </div>
  )
}
