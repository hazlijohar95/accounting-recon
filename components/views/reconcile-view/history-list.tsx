'use client'

import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { confidenceToPercent } from '@/lib/matching-utils'
import { formatCurrency } from '@/lib/format'
import { MatchLayerBadge } from '@/components/brand'
import { StatCardMini } from '@/components/brand'
import { IconCheckCircle } from '@/components/brand/icons'
import type { MatchPair } from '@/lib/store'
import type { MatchLayer } from '@/components/brand'

// =============================================================================
// DATE GROUPING HELPERS
// =============================================================================

type DateGroup = 'Today' | 'Yesterday' | 'This Week' | 'Earlier'

function getDateGroup(timestamp: number | undefined): DateGroup {
  if (!timestamp) return 'Earlier'

  const now = new Date()
  const date = new Date(timestamp)

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 86_400_000
  const startOfWeek = startOfToday - now.getDay() * 86_400_000

  if (timestamp >= startOfToday) return 'Today'
  if (timestamp >= startOfYesterday) return 'Yesterday'
  if (timestamp >= startOfWeek) return 'This Week'
  return 'Earlier'
}

function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return ''

  const now = Date.now()
  const diff = now - timestamp

  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(diff / 3_600_000)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(diff / 86_400_000)
  if (days < 7) return `${days}d ago`

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatAbsoluteTime(timestamp: number | undefined): string {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// =============================================================================
// SUMMARY STRIP
// =============================================================================

interface HistorySummaryStripProps {
  matches: MatchPair[]
}

function HistorySummaryStrip({ matches }: HistorySummaryStripProps) {
  const totalValue = useMemo(
    () => matches.reduce((sum, m) => sum + Math.abs(m.cashTransaction.amount), 0),
    [matches]
  )

  const todayCount = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    return matches.filter((m) => m.reviewedAt && m.reviewedAt >= startOfToday.getTime()).length
  }, [matches])

  return (
    <div className="grid grid-cols-3 gap-px bg-border border-b border-border">
      <StatCardMini label="Approved" value={matches.length} />
      <StatCardMini label="Total Value" value={totalValue} prefix="$" />
      <StatCardMini label="Today" value={todayCount} />
    </div>
  )
}

// =============================================================================
// DATE GROUP HEADER
// =============================================================================

interface DateGroupHeaderProps {
  group: DateGroup
  count: number
}

function DateGroupHeader({ group, count }: DateGroupHeaderProps) {
  return (
    <div className="px-4 py-2 bg-secondary/20 border-b border-border flex items-center justify-between">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {group}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
    </div>
  )
}

// =============================================================================
// HISTORY ROW
// =============================================================================

interface HistoryRowProps {
  match: MatchPair
  selected: boolean
  onClick: () => void
}

const HistoryRow = React.memo(function HistoryRow({
  match,
  selected,
  onClick,
}: HistoryRowProps) {
  const confidencePercent = match.confidenceScore
    ? Math.round(match.confidenceScore)
    : confidenceToPercent(match.confidence)

  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'w-full px-4 py-3 border-b border-border text-left transition-all duration-150',
        'hover:bg-secondary/50',
        selected && 'row-selected',
        !selected && 'row-approved'
      )}
    >
      {/* Top line: badge + relative time + amount + confidence + check */}
      <div className="flex items-center gap-3">
        <MatchLayerBadge layer={match.matchLayer as MatchLayer} size="sm" />

        <span
          className="text-xs text-muted-foreground tabular-nums shrink-0"
          title={match.reviewedAt ? formatAbsoluteTime(match.reviewedAt) : 'Approval time not recorded'}
        >
          {match.reviewedAt ? formatRelativeTime(match.reviewedAt) : 'approved'}
        </span>

        <div className="flex-1 min-w-0">
          <span className="text-sm truncate block">
            {match.cashTransaction.description}
          </span>
        </div>

        <span className="text-amount-sm shrink-0">
          {formatCurrency(match.cashTransaction.amount)}
        </span>

        <span className="text-xs font-mono text-muted-foreground w-10 text-right shrink-0">
          {confidencePercent}%
        </span>

        <IconCheckCircle
          size={14}
          className="text-success shrink-0"
          aria-label="Approved"
        />
      </div>

      {/* Bottom line: accrual description */}
      <div className="mt-1.5 pl-14">
        <span className="text-xs text-muted-foreground truncate block">
          {match.accrualTransaction.description}
        </span>
      </div>
    </button>
  )
})

// =============================================================================
// HISTORY LIST (main export)
// =============================================================================

interface HistoryListProps {
  matches: MatchPair[]
  onSelectMatch: (match: MatchPair | null) => void
  selectedMatchId?: string
}

const DATE_GROUP_ORDER: DateGroup[] = ['Today', 'Yesterday', 'This Week', 'Earlier']

export function HistoryList({ matches, onSelectMatch, selectedMatchId }: HistoryListProps) {
  // Group matches by reviewedAt date bucket, sorted newest first within each group
  const groupedMatches = useMemo(() => {
    const groups = new Map<DateGroup, MatchPair[]>()

    // Initialize groups in display order
    for (const g of DATE_GROUP_ORDER) {
      groups.set(g, [])
    }

    // Sort all matches by reviewedAt descending (newest first), with missing timestamps last
    const sorted = [...matches].sort((a, b) => {
      const aTime = a.reviewedAt ?? 0
      const bTime = b.reviewedAt ?? 0
      return bTime - aTime
    })

    for (const match of sorted) {
      const group = getDateGroup(match.reviewedAt)
      groups.get(group)!.push(match)
    }

    // Filter out empty groups
    return DATE_GROUP_ORDER
      .filter((g) => groups.get(g)!.length > 0)
      .map((g) => ({ group: g, matches: groups.get(g)! }))
  }, [matches])

  return (
    <div>
      <HistorySummaryStrip matches={matches} />

      {groupedMatches.map(({ group, matches: groupMatches }) => (
        <div key={group}>
          <DateGroupHeader group={group} count={groupMatches.length} />
          {groupMatches.map((match) => (
            <HistoryRow
              key={match.id}
              match={match}
              selected={selectedMatchId === match.id}
              onClick={() => onSelectMatch(match)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
