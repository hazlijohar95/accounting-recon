'use client'

import { cn } from '@/lib/utils'

interface ChartSectionProps {
  /** Section title */
  title: string
  /** Optional subtitle/description */
  subtitle?: string
  /** Optional right-aligned content (e.g., legend, percentage) */
  headerRight?: React.ReactNode
  /** Chart or content to render */
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * Consistent chart section wrapper with brand styling.
 * Features: subtle hover border, standardized header typography.
 */
export function ChartSection({
  title,
  subtitle,
  headerRight,
  children,
  className,
}: ChartSectionProps) {
  return (
    <div
      className={cn(
        'relative border border-border p-4 transition-colors duration-200',
        'hover:border-foreground/20',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-sm font-medium">{title}</span>
          {subtitle && (
            <span className="text-xs text-muted-foreground ml-2">{subtitle}</span>
          )}
        </div>
        {headerRight && (
          <div className="shrink-0">{headerRight}</div>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  )
}

/**
 * Section header component for consistent typography.
 * Use outside of ChartSection when needed standalone.
 */
export function SectionHeader({
  title,
  subtitle,
  rightContent,
  className,
}: {
  title: string
  subtitle?: string
  rightContent?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium">{title}</span>
        {subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
      </div>
      {rightContent && <div className="shrink-0">{rightContent}</div>}
    </div>
  )
}
