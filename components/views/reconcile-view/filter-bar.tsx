'use client'

/**
 * Filter Bar Component for Reconcile View.
 *
 * Provides search and filtering UI for match transactions.
 * Supports filtering by match layer, confidence, amount range, and date range.
 *
 * @module components/views/reconcile-view/filter-bar
 */

import React from 'react'
import type { MatchConfidence } from '@/lib/store'
import {
  IconSearch,
  IconFilter,
  IconCaretDown,
  IconDollarSign,
} from '@/components/brand/icons'
import { cn } from '@/lib/utils'
import type { FilterState, Tab } from './types'

// =============================================================================
// TYPES
// =============================================================================

export interface ReconcileFilterBarProps {
  /** Current filter state */
  filters: FilterState
  /** Whether the filter panel is expanded */
  showFilters: boolean
  /** Whether any filters are active */
  hasActiveFilters: boolean
  /** Current active tab */
  activeTab: Tab
  /** Count of pending matches (for results display) */
  pendingMatchCount: number
  /** Count of approved matches (for results display) */
  approvedMatchCount: number
  /** Count of review matches (for results display) */
  reviewMatchCount: number
  /** Count of partial match groups (for results display) */
  partialGroupCount: number
  /** Count of suspense items (for results display) */
  suspenseCount: number
  /** Callback to update filter state */
  onUpdateFilters: (update: Partial<FilterState>) => void
  /** Callback to toggle filter panel */
  onToggleFilters: () => void
  /** Callback to clear all filters */
  onClearFilters: () => void
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Search and filter bar for the reconcile view.
 *
 * Features:
 * - Search input for text search
 * - Collapsible filter panel
 * - Match layer filter (L1-L6)
 * - Confidence level filter (high/medium/low)
 * - Amount range filter
 * - Date range filter
 * - Results count display
 */
export function ReconcileFilterBar({
  filters,
  showFilters,
  hasActiveFilters,
  activeTab,
  pendingMatchCount,
  approvedMatchCount,
  reviewMatchCount,
  partialGroupCount,
  suspenseCount,
  onUpdateFilters,
  onToggleFilters,
  onClearFilters,
}: ReconcileFilterBarProps) {
  const activeFilterCount = filters.matchLayers.length + filters.confidenceLevels.length

  return (
    <div className="px-4 py-3 border-b border-border bg-secondary/30">
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search transactions... (/)"
            value={filters.searchQuery}
            onChange={(e) => onUpdateFilters({ searchQuery: e.target.value })}
            aria-label="Search transactions"
            className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border focus:outline-none focus:border-foreground transition-colors"
          />
        </div>

        {/* Filter Toggle */}
        <button
          onClick={onToggleFilters}
          aria-expanded={showFilters}
          aria-controls="filter-panel"
          aria-label={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm border transition-colors',
            showFilters
              ? 'bg-foreground text-background border-foreground'
              : 'border-border hover:bg-secondary/50',
            (filters.matchLayers.length > 0 ||
              filters.confidenceLevels.length > 0 ||
              filters.minAmount !== null ||
              filters.maxAmount !== null) &&
              'border-foreground'
          )}
        >
          <IconFilter size={16} aria-hidden="true" />
          Filters
          {activeFilterCount > 0 && (
            <span
              className="px-1.5 py-0.5 text-[10px] bg-foreground text-background rounded-full"
              aria-hidden="true"
            >
              {activeFilterCount}
            </span>
          )}
          <IconCaretDown
            size={12}
            className={cn('transition-transform', showFilters && 'rotate-180')}
            aria-hidden="true"
          />
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}

        {/* Results count */}
        <span className="text-xs text-muted-foreground ml-auto">
          {activeTab === 'pending' ? pendingMatchCount
            : activeTab === 'review' ? reviewMatchCount
            : activeTab === 'partial' ? partialGroupCount
            : activeTab === 'matched' ? approvedMatchCount
            : suspenseCount} {activeTab === 'suspense' ? 'items' : 'matches'}
        </span>
      </div>

      {/* Expanded Filters Panel */}
      {showFilters && (
        <div
          id="filter-panel"
          className="mt-3 pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Match Layer Filter */}
          <fieldset>
            <legend className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              Match Layer
            </legend>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by match layer">
              {([1, 2, 3, 4, 5, 6] as const).map((layer) => (
                <button
                  key={layer}
                  aria-pressed={filters.matchLayers.includes(layer)}
                  onClick={() => {
                    onUpdateFilters({
                      matchLayers: filters.matchLayers.includes(layer)
                        ? filters.matchLayers.filter((l) => l !== layer)
                        : [...filters.matchLayers, layer],
                    })
                  }}
                  className={cn(
                    'px-2 py-1 text-xs border transition-colors',
                    filters.matchLayers.includes(layer)
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border hover:bg-secondary/50'
                  )}
                >
                  L{layer}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Confidence Filter */}
          <fieldset>
            <legend className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              Confidence
            </legend>
            <div
              className="flex flex-wrap gap-1"
              role="group"
              aria-label="Filter by confidence level"
            >
              {(['high', 'medium', 'low'] as const).map((level) => (
                <button
                  key={level}
                  aria-pressed={filters.confidenceLevels.includes(level)}
                  onClick={() => {
                    onUpdateFilters({
                      confidenceLevels: filters.confidenceLevels.includes(level)
                        ? filters.confidenceLevels.filter((l) => l !== level)
                        : [...filters.confidenceLevels, level],
                    })
                  }}
                  className={cn(
                    'px-2 py-1 text-xs border transition-colors capitalize',
                    filters.confidenceLevels.includes(level)
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border hover:bg-secondary/50'
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Amount Range Filter */}
          <fieldset>
            <legend className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              Amount Range
            </legend>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <IconDollarSign
                  size={12}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="number"
                  placeholder="Min"
                  aria-label="Minimum amount"
                  value={filters.minAmount ?? ''}
                  onChange={(e) =>
                    onUpdateFilters({
                      minAmount: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-background border border-border focus:outline-none focus:border-foreground"
                />
              </div>
              <span className="text-muted-foreground" aria-hidden="true">
                -
              </span>
              <div className="relative flex-1">
                <IconDollarSign
                  size={12}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="number"
                  placeholder="Max"
                  aria-label="Maximum amount"
                  value={filters.maxAmount ?? ''}
                  onChange={(e) =>
                    onUpdateFilters({
                      maxAmount: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-background border border-border focus:outline-none focus:border-foreground"
                />
              </div>
            </div>
          </fieldset>

          {/* Date Range Filter */}
          <fieldset>
            <legend className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              Date Range
            </legend>
            <div className="flex items-center gap-2">
              <input
                type="date"
                aria-label="Start date"
                value={filters.dateFrom ?? ''}
                onChange={(e) =>
                  onUpdateFilters({ dateFrom: e.target.value || null })
                }
                className="flex-1 px-2 py-1.5 text-xs bg-background border border-border focus:outline-none focus:border-foreground"
              />
              <span className="text-muted-foreground" aria-hidden="true">
                -
              </span>
              <input
                type="date"
                aria-label="End date"
                value={filters.dateTo ?? ''}
                onChange={(e) =>
                  onUpdateFilters({ dateTo: e.target.value || null })
                }
                className="flex-1 px-2 py-1.5 text-xs bg-background border border-border focus:outline-none focus:border-foreground"
              />
            </div>
          </fieldset>
        </div>
      )}
    </div>
  )
}
