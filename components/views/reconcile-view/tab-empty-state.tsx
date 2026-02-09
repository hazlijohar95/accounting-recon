'use client'

import { cn } from '@/lib/utils'

/**
 * Props for the TabEmptyState component.
 */
export interface TabEmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  className?: string
}

/**
 * Empty state displayed when a tab has no items to show.
 *
 * Shows contextual icon, title, and description based on the tab type.
 */
export function TabEmptyState({ icon, title, description, className }: TabEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center h-64 p-6', className)}>
      <div className="mb-4">{icon}</div>
      <h3 className="text-sm font-medium mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground text-center max-w-[240px]">{description}</p>
    </div>
  )
}
