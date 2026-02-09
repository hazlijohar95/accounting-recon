'use client'

/**
 * Token Usage Section for Settings
 *
 * Displays aggregated token usage statistics for the selected company's
 * agent sessions, including:
 * - Summary stat cards (total tokens, sessions, avg per session, cost)
 * - Token breakdown bar chart (prompt vs completion over time)
 * - Per-session breakdown table
 *
 * Uses the brand's geometric design language: no rounded corners,
 * uppercase tracking-wider labels, tabular-nums for values.
 *
 * @module components/views/settings-view/usage-section
 */

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useSelectedCompanyId } from '@/lib/store'
import { useTokenUsage } from '@/hooks/useTokenUsage'
import { StatCard, StatCardMini } from '@/components/brand/stat-card'
import { ChartSection } from '@/components/brand/chart-section'
import { IconChartBar, IconClock } from '@/components/brand/icons'
import { cn } from '@/lib/utils'

// Brand color constants (matching cash-flow-chart.tsx)
const COLORS = {
  prompt: 'hsl(160, 84%, 39%)', // emerald-500 (input)
  completion: 'hsl(var(--foreground))', // foreground (output)
  grid: 'hsl(var(--border))',
  text: 'hsl(var(--muted-foreground))',
}

// ============================================================================
// Main Section
// ============================================================================

interface UsageSectionProps {
  isDemo: boolean
}

export function UsageSection({ isDemo }: UsageSectionProps) {
  const companyId = useSelectedCompanyId()

  const { stats, isLoading, hasData, dailyUsage, promptRatio } = useTokenUsage({
    companyId,
    enabled: !isDemo,
  })

  if (isDemo) {
    return (
      <div className="space-y-6">
        <SectionHeader />
        <EmptyState message="Sign in to view token usage" />
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="space-y-6">
        <SectionHeader />
        <EmptyState message="Select a company to view token usage" />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SectionHeader />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (!hasData || !stats) {
    return (
      <div className="space-y-6">
        <SectionHeader />
        <EmptyState message="No agent sessions with token usage yet. Token data appears after the LLM layer runs during document analysis." />
        {stats && (
          <StatCardMini
            label="Total Sessions"
            value={stats.totalSessions}
            className="max-w-xs"
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="usage-section">
      <SectionHeader />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Tokens"
          value={stats.totalTokens}
          icon={<IconChartBar size={12} className="text-muted-foreground" />}
          secondaryText={`${stats.sessionsWithTokens} session${stats.sessionsWithTokens !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="Avg / Session"
          value={stats.avgTokensPerSession}
          icon={<IconClock size={12} className="text-muted-foreground" />}
          secondaryText="tokens per analysis"
        />
        <StatCard
          label="Prompt Tokens"
          value={stats.totalPromptTokens}
          secondaryText={`${Math.round(promptRatio * 100)}% of total`}
        />
        <StatCard
          label="Est. Cost"
          value={stats.estimatedCostUsd}
          prefix="$"
          decimals={4}
          secondaryText="Claude Sonnet 4 pricing"
        />
      </div>

      {/* Token Usage Over Time Chart */}
      {dailyUsage.length > 1 && (
        <ChartSection
          title="Token Usage Over Time"
          subtitle="By day"
          headerRight={
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-2" style={{ background: COLORS.prompt }} />
                Prompt
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-2 bg-foreground" />
                Completion
              </span>
            </div>
          }
        >
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyUsage} barCategoryGap="20%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={COLORS.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: COLORS.text }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatDateShort}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: COLORS.text }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatTokenCount}
                  width={48}
                />
                <Tooltip content={<UsageTooltip />} />
                <Bar
                  dataKey="promptTokens"
                  stackId="tokens"
                  fill={COLORS.prompt}
                  name="Prompt"
                  radius={0}
                />
                <Bar
                  dataKey="completionTokens"
                  stackId="tokens"
                  fill="hsl(var(--foreground))"
                  name="Completion"
                  radius={0}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartSection>
      )}

      {/* Token Ratio Bar */}
      <div className="border border-border p-4 transition-colors hover:border-foreground/20">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Token Distribution
        </div>
        <div className="flex h-3 overflow-hidden">
          <div
            className="transition-all duration-500"
            style={{
              width: `${promptRatio * 100}%`,
              background: COLORS.prompt,
            }}
          />
          <div
            className="bg-foreground transition-all duration-500"
            style={{ width: `${(1 - promptRatio) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Prompt: {stats.totalPromptTokens.toLocaleString()}</span>
          <span>Completion: {stats.totalCompletionTokens.toLocaleString()}</span>
        </div>
      </div>

      {/* Per-Session Breakdown Table */}
      <ChartSection title="Session Breakdown" subtitle={`${stats.sessionBreakdown.length} sessions`}>
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                <th className="text-left py-2 px-4 font-medium">Date</th>
                <th className="text-right py-2 px-4 font-medium">Docs</th>
                <th className="text-right py-2 px-4 font-medium">Prompt</th>
                <th className="text-right py-2 px-4 font-medium">Completion</th>
                <th className="text-right py-2 px-4 font-medium">Total</th>
                <th className="text-left py-2 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.sessionBreakdown.map((session) => (
                <tr
                  key={session.sessionId}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/30"
                >
                  <td className="py-2 px-4 text-muted-foreground tabular-nums">
                    {formatDate(session.createdAt)}
                  </td>
                  <td className="py-2 px-4 text-right tabular-nums">
                    {session.documentCount}
                  </td>
                  <td className="py-2 px-4 text-right tabular-nums">
                    {session.promptTokens.toLocaleString()}
                  </td>
                  <td className="py-2 px-4 text-right tabular-nums">
                    {session.completionTokens.toLocaleString()}
                  </td>
                  <td className="py-2 px-4 text-right tabular-nums font-medium">
                    {session.totalTokens.toLocaleString()}
                  </td>
                  <td className="py-2 px-4">
                    <StatusBadge status={session.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartSection>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function SectionHeader() {
  return (
    <div>
      <h2 className="text-base font-medium mb-1">Usage</h2>
      <p className="text-sm text-muted-foreground">
        Token usage from the AI analysis engine
      </p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center border border-border">
      <IconChartBar size={32} className="mx-auto text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        {message}
      </p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="border border-border p-4 animate-pulse">
      <div className="h-3 w-20 bg-muted mb-3" />
      <div className="h-6 w-16 bg-muted" />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    ready: { label: 'Ready', className: 'text-emerald-600 bg-emerald-500/10' },
    proceeded: { label: 'Proceeded', className: 'text-foreground bg-muted' },
    dismissed: { label: 'Dismissed', className: 'text-muted-foreground bg-muted/50' },
    expired: { label: 'Expired', className: 'text-muted-foreground bg-muted/50' },
    analyzing: { label: 'Analyzing', className: 'text-amber-600 bg-amber-500/10' },
    active: { label: 'Active', className: 'text-blue-600 bg-blue-500/10' },
  }

  const { label, className } = config[status] ?? {
    label: status,
    className: 'text-muted-foreground bg-muted/50',
  }

  return (
    <span className={cn('inline-block px-1.5 py-0.5 text-xs', className)}>
      {label}
    </span>
  )
}

// ============================================================================
// Chart Tooltip
// ============================================================================

function UsageTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; name: string }>
  label?: string
}) {
  if (!active || !payload) return null

  const prompt = payload.find((p) => p.dataKey === 'promptTokens')?.value ?? 0
  const completion = payload.find((p) => p.dataKey === 'completionTokens')?.value ?? 0
  const total = prompt + completion

  return (
    <div className="border border-border bg-background p-3 shadow-sm text-sm">
      <div className="text-xs text-muted-foreground mb-2">{label}</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2" style={{ background: COLORS.prompt }} />
            Prompt
          </span>
          <span className="tabular-nums">{prompt.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 bg-foreground" />
            Completion
          </span>
          <span className="tabular-nums">{completion.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-6 border-t border-border pt-1 font-medium">
          <span>Total</span>
          <span className="tabular-nums">{total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Formatters
// ============================================================================

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTokenCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}
