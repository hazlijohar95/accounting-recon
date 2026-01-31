'use client'

import React, { useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'

interface Tab<T extends string> {
  /** Unique tab identifier */
  id: T
  /** Tab label */
  label: string
  /** Optional badge count */
  count?: number
  /** Optional icon */
  icon?: React.ReactNode
}

interface TabNavProps<T extends string> {
  /** Array of tab definitions */
  tabs: Tab<T>[]
  /** Currently active tab ID */
  activeTab: T
  /** Callback when tab changes */
  onTabChange: (tab: T) => void
  /** ARIA label for the tab list */
  ariaLabel?: string
  /** Custom class name */
  className?: string
  /** Variant style */
  variant?: 'underline' | 'pill' | 'bordered'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-3 text-sm',
  lg: 'px-5 py-4 text-base',
}

/**
 * Accessible Tab Navigation Component
 *
 * Features:
 * - Full keyboard navigation (arrow keys, Home, End)
 * - ARIA attributes for screen readers
 * - Multiple style variants
 * - Optional counts/badges
 *
 * @example
 * ```tsx
 * <TabNav
 *   tabs={[
 *     { id: 'pending', label: 'Pending', count: 5 },
 *     { id: 'matched', label: 'Matched', count: 12 },
 *   ]}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 *   ariaLabel="Transaction tabs"
 * />
 * ```
 */
export function TabNav<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel = 'Tabs',
  className,
  variant = 'underline',
  size = 'md',
}: TabNavProps<T>) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      const tabCount = tabs.length
      let newIndex = currentIndex

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          newIndex = currentIndex === 0 ? tabCount - 1 : currentIndex - 1
          break
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          newIndex = currentIndex === tabCount - 1 ? 0 : currentIndex + 1
          break
        case 'Home':
          e.preventDefault()
          newIndex = 0
          break
        case 'End':
          e.preventDefault()
          newIndex = tabCount - 1
          break
        default:
          return
      }

      // Focus and activate new tab
      tabRefs.current[newIndex]?.focus()
      onTabChange(tabs[newIndex].id)
    },
    [tabs, onTabChange]
  )

  const getTabClasses = (isActive: boolean) => {
    const base = cn(
      'relative capitalize transition-colors font-medium focus-ring',
      sizeClasses[size]
    )

    switch (variant) {
      case 'underline':
        return cn(
          base,
          isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        )
      case 'pill':
        return cn(
          base,
          isActive
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:bg-secondary'
        )
      case 'bordered':
        return cn(
          base,
          'border',
          isActive
            ? 'bg-background border-border border-b-background'
            : 'border-transparent hover:bg-secondary/50'
        )
      default:
        return base
    }
  }

  const getBadgeClasses = (isActive: boolean) => {
    return cn(
      'ml-1.5 px-1.5 py-0.5 text-xs',
      isActive ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'
    )
  }

  return (
    <div
      className={cn(
        'flex',
        variant === 'underline' && 'border-b border-border',
        variant === 'pill' && 'gap-1 bg-secondary/30 p-1',
        variant === 'bordered' && '-mb-px',
        className
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el
            }}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={getTabClasses(isActive)}
          >
            {tab.icon && (
              <span className="mr-2" aria-hidden="true">
                {tab.icon}
              </span>
            )}
            {tab.label}
            {tab.count !== undefined && (
              <span className={getBadgeClasses(isActive)} aria-label={`${tab.count} items`}>
                {tab.count}
              </span>
            )}
            {variant === 'underline' && isActive && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground"
                aria-hidden="true"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Tab Panel Component
 *
 * Container for tab content with proper ARIA attributes.
 */
interface TabPanelProps<T extends string> {
  /** Tab ID this panel belongs to */
  tabId: T
  /** Currently active tab */
  activeTab: T
  /** Panel content */
  children: React.ReactNode
  /** Custom class name */
  className?: string
}

export function TabPanel<T extends string>({
  tabId,
  activeTab,
  children,
  className,
}: TabPanelProps<T>) {
  if (tabId !== activeTab) return null

  return (
    <div
      id={`tabpanel-${tabId}`}
      role="tabpanel"
      aria-labelledby={`tab-${tabId}`}
      className={className}
    >
      {children}
    </div>
  )
}
