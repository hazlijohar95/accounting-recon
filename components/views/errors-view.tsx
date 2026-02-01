'use client'

/**
 * Error Monitor Admin View
 *
 * Dashboard for viewing and managing application errors.
 * Features:
 * - Error list with search and filtering
 * - Error details modal
 * - Statistics overview
 * - Bulk actions (resolve, delete)
 *
 * @module components/views/errors-view
 */

import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { toast } from '@/components/ui/toast'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import {
  IconWarning,
  IconCheckCircle,
  IconClock,
  IconFilter,
  IconLoader,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconX,
  IconXCircle,
  IconBug,
  IconGlobe,
  IconCode,
  IconFileCode,
  IconLightning,
  IconTrendUp,
} from '@/components/brand/icons'

// Error type icons and colors
const errorTypeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  uncaught: { icon: <IconXCircle size={14} />, color: 'text-red-500', label: 'Uncaught' },
  promise: { icon: <IconLightning size={14} />, color: 'text-orange-500', label: 'Promise' },
  boundary: { icon: <IconFileCode size={14} />, color: 'text-purple-500', label: 'Boundary' },
  api: { icon: <IconGlobe size={14} />, color: 'text-blue-500', label: 'API' },
  convex: { icon: <IconCode size={14} />, color: 'text-cyan-500', label: 'Convex' },
  manual: { icon: <IconBug size={14} />, color: 'text-yellow-500', label: 'Manual' },
}

type ErrorType = 'uncaught' | 'promise' | 'boundary' | 'api' | 'convex' | 'manual'

interface ErrorDoc {
  _id: Id<'errors'>
  message: string
  stack?: string
  type: ErrorType
  url: string
  userAgent?: string
  componentName?: string
  metadata?: Record<string, unknown>
  fingerprint: string
  count: number
  firstSeenAt: number
  lastSeenAt: number
  isResolved: boolean
  resolvedAt?: number
}

export function ErrorsView() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ErrorType | 'all'>('all')
  const [showResolved, setShowResolved] = useState(false)
  const [selectedError, setSelectedError] = useState<ErrorDoc | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Queries
  const errorsResult = useQuery(api.errors.listErrors, {
    limit: 100,
    type: typeFilter === 'all' ? undefined : typeFilter,
    showResolved,
    search: search || undefined,
  })
  const stats = useQuery(api.errors.getErrorStats, { days: 7 })

  // Mutations
  const resolveError = useMutation(api.errors.resolveError)
  const unresolveError = useMutation(api.errors.unresolveError)
  const deleteError = useMutation(api.errors.deleteError)
  const clearResolvedErrors = useMutation(api.errors.clearResolvedErrors)

  const errors = errorsResult?.errors ?? []
  const isLoading = errorsResult === undefined

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  // Handle resolve/unresolve
  const handleToggleResolve = async (error: ErrorDoc) => {
    try {
      if (error.isResolved) {
        await unresolveError({ errorId: error._id })
        toast.success('Error reopened')
      } else {
        await resolveError({ errorId: error._id })
        toast.success('Error resolved')
      }
    } catch (err) {
      toast.error('Failed to update error')
    }
  }

  // Handle delete
  const handleDelete = async (errorId: Id<'errors'>) => {
    try {
      await deleteError({ errorId })
      setSelectedError(null)
      toast.success('Error deleted')
    } catch (err) {
      toast.error('Failed to delete error')
    }
  }

  // Handle clear resolved
  const handleClearResolved = async () => {
    if (!confirm('Delete all resolved errors? This cannot be undone.')) return
    try {
      const result = await clearResolvedErrors({})
      toast.success(`Cleared ${result.deleted} resolved errors`)
    } catch (err) {
      toast.error('Failed to clear errors')
    }
  }

  // Simulate refresh (data auto-updates, but good UX)
  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 500)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-border bg-muted/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium">Error Monitor</h1>
            <p className="text-sm text-muted-foreground">
              Track and resolve application errors
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 border border-border hover:bg-muted transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <IconRefresh size={16} className={cn(isRefreshing && 'animate-spin')} />
            </button>
            {showResolved && (
              <button
                onClick={handleClearResolved}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-border hover:bg-muted transition-colors"
              >
                <IconTrash size={14} />
                Clear Resolved
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Stats Bar */}
          {stats && (
            <div className="border-b border-border bg-background px-6 py-3">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <IconWarning size={14} className="text-destructive" />
                  <span className="text-muted-foreground">Unresolved:</span>
                  <span className="font-medium">{stats.unresolvedCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconTrendUp size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Last 7 days:</span>
                  <span className="font-medium">{stats.totalOccurrences} occurrences</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconBug size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Unique errors:</span>
                  <span className="font-medium">{stats.totalErrors}</span>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="border-b border-border bg-background px-6 py-3">
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="flex-1 max-w-sm relative">
                <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search errors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <IconFilter size={14} className="text-muted-foreground" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as ErrorType | 'all')}
                  className="px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-1 focus:ring-foreground"
                >
                  <option value="all">All Types</option>
                  <option value="uncaught">Uncaught</option>
                  <option value="promise">Promise</option>
                  <option value="boundary">Boundary</option>
                  <option value="api">API</option>
                  <option value="convex">Convex</option>
                  <option value="manual">Manual</option>
                </select>
              </div>

              {/* Show Resolved Toggle */}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showResolved}
                  onChange={(e) => setShowResolved(e.target.checked)}
                  className="rounded border-border"
                />
                Show resolved
              </label>
            </div>
          </div>

          {/* Error List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <IconLoader size={24} className="animate-spin text-muted-foreground" />
              </div>
            ) : errors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <IconCheckCircle size={48} className="text-green-500 mb-4" />
                <h3 className="text-sm font-medium mb-1">No errors found</h3>
                <p className="text-xs text-muted-foreground">
                  {showResolved ? 'All clear!' : 'No unresolved errors. Try showing resolved errors.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {errors.map((error: ErrorDoc) => (
                  <ErrorListItem
                    key={error._id}
                    error={error}
                    onClick={() => setSelectedError(error)}
                    onToggleResolve={() => handleToggleResolve(error)}
                    formatRelativeTime={formatRelativeTime}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats Sidebar */}
        {stats && (
          <div className="w-64 border-l border-border bg-muted/30 p-4 hidden lg:block overflow-y-auto">
            <h3 className="text-sm font-medium mb-4">Error Distribution</h3>

            {/* By Type */}
            <div className="space-y-2 mb-6">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">By Type</p>
              {Object.entries(stats.byType).map(([type, count]) => {
                const config = errorTypeConfig[type]
                return (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={config?.color}>{config?.icon}</span>
                      <span>{config?.label || type}</span>
                    </div>
                    <span className="font-medium">{count as number}</span>
                  </div>
                )
              })}
            </div>

            {/* Top Errors */}
            {stats.topErrors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Top Errors</p>
                {stats.topErrors.map((error: { id: Id<'errors'>; message: string; count: number; type: string }) => (
                  <div key={error.id} className="text-xs p-2 bg-background border border-border">
                    <p className="font-medium truncate">{error.message}</p>
                    <p className="text-muted-foreground mt-1">
                      {error.count} occurrences
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Detail Modal */}
      <Modal
        isOpen={!!selectedError}
        onClose={() => setSelectedError(null)}
        title="Error Details"
        size="lg"
      >
        {selectedError && (
          <ErrorDetailContent
            error={selectedError}
            onResolve={() => handleToggleResolve(selectedError)}
            onDelete={() => handleDelete(selectedError._id)}
            formatRelativeTime={formatRelativeTime}
          />
        )}
      </Modal>
    </div>
  )
}

// =============================================================================
// ERROR LIST ITEM
// =============================================================================

interface ErrorListItemProps {
  error: ErrorDoc
  onClick: () => void
  onToggleResolve: () => void
  formatRelativeTime: (timestamp: number) => string
}

function ErrorListItem({ error, onClick, onToggleResolve, formatRelativeTime }: ErrorListItemProps) {
  const config = errorTypeConfig[error.type]

  return (
    <div
      className={cn(
        'px-6 py-4 hover:bg-muted/50 cursor-pointer transition-colors',
        error.isResolved && 'opacity-60'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Type Icon */}
        <div className={cn('mt-0.5', config?.color)}>
          {config?.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{error.message}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <IconClock size={12} />
                  {formatRelativeTime(error.lastSeenAt)}
                </span>
                {error.count > 1 && (
                  <span className="px-1.5 py-0.5 bg-muted rounded text-xs">
                    {error.count}x
                  </span>
                )}
                {error.componentName && (
                  <span className="truncate max-w-32">{error.componentName}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleResolve()
                }}
                className={cn(
                  'p-1.5 transition-colors',
                  error.isResolved
                    ? 'text-green-500 hover:text-green-600'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title={error.isResolved ? 'Reopen' : 'Resolve'}
              >
                <IconCheckCircle size={16} />
              </button>
            </div>
          </div>

          {/* URL */}
          <p className="text-xs text-muted-foreground mt-2 truncate">
            {error.url}
          </p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// ERROR DETAIL CONTENT
// =============================================================================

interface ErrorDetailContentProps {
  error: ErrorDoc
  onResolve: () => void
  onDelete: () => void
  formatRelativeTime: (timestamp: number) => string
}

function ErrorDetailContent({ error, onResolve, onDelete, formatRelativeTime }: ErrorDetailContentProps) {
  const config = errorTypeConfig[error.type]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={config?.color}>{config?.icon}</span>
          <span className="text-sm font-medium">{config?.label}</span>
          {error.isResolved && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              <IconCheckCircle size={12} />
              Resolved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onResolve}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm border transition-colors',
              error.isResolved
                ? 'border-border hover:bg-muted'
                : 'border-green-500 text-green-500 hover:bg-green-500/10'
            )}
          >
            <IconCheckCircle size={14} />
            {error.isResolved ? 'Reopen' : 'Resolve'}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete"
          >
            <IconTrash size={16} />
          </button>
        </div>
      </div>

      {/* Message */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Message</p>
        <p className="text-sm font-mono bg-muted p-3 break-words">{error.message}</p>
      </div>

      {/* Stack Trace */}
      {error.stack && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Stack Trace</p>
          <pre className="text-xs font-mono bg-muted p-3 overflow-x-auto max-h-48 whitespace-pre-wrap break-words">
            {error.stack}
          </pre>
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">URL</p>
          <p className="font-mono text-xs truncate">{error.url}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Occurrences</p>
          <p className="font-medium">{error.count}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">First Seen</p>
          <p>{new Date(error.firstSeenAt).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Last Seen</p>
          <p>{formatRelativeTime(error.lastSeenAt)}</p>
        </div>
        {error.componentName && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Component</p>
            <p className="font-mono">{error.componentName}</p>
          </div>
        )}
      </div>

      {/* Metadata */}
      {error.metadata && Object.keys(error.metadata).length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Metadata</p>
          <pre className="text-xs font-mono bg-muted p-3 overflow-x-auto max-h-32">
            {JSON.stringify(error.metadata, null, 2)}
          </pre>
        </div>
      )}

      {/* User Agent */}
      {error.userAgent && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">User Agent</p>
          <p className="text-xs font-mono text-muted-foreground break-words">{error.userAgent}</p>
        </div>
      )}
    </div>
  )
}
